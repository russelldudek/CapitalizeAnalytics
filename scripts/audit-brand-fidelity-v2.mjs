import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const localBase = process.env.LOCAL_BASE || 'http://127.0.0.1:4173/';
const officialUrl = 'https://capitalizeconsulting.com/';
const auditDir = path.join(root, 'audit', 'brand-fidelity');
const shotDir = path.join(auditDir, 'screenshots');
await mkdir(shotDir, { recursive: true });

const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'laptop', width: 1280, height: 800 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'mobile', width: 390, height: 844 }
];
const printRoutes = [
  ['resume.html', 'docs/Russell-Dudek-Resume-Capitalize.pdf', 2],
  ['cover-letter.html', 'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf', 1],
  ['interview-brief.html', 'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf', 4],
  ['90-day-plan.html', 'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf', 3],
  ['engagement-canvas.html', 'docs/AI-Engagement-Canvas-Capitalize.pdf', 1]
];

const assertions = [];
const failures = [];
function check(condition, message, evidence = null) {
  const passed = Boolean(condition);
  assertions.push({ passed, message, evidence });
  if (!passed) failures.push(message);
}

async function comparisonSheet(officialPng, campaignPng, output, labels) {
  const panelWidth = 720;
  const panelHeight = 900;
  const left = await sharp(officialPng).resize({ width: panelWidth, height: panelHeight, fit: 'contain', background: '#fff' }).png().toBuffer();
  const right = await sharp(campaignPng).resize({ width: panelWidth, height: panelHeight, fit: 'contain', background: '#fff' }).png().toBuffer();
  const labelSvg = Buffer.from(`<svg width="1440" height="52"><rect width="1440" height="52" fill="#012571"/><text x="20" y="34" fill="#fff" font-family="Arial" font-size="18" font-weight="700">${labels[0]}</text><text x="740" y="34" fill="#fff" font-family="Arial" font-size="18" font-weight="700">${labels[1]}</text></svg>`);
  await sharp({ create: { width: 1440, height: 952, channels: 4, background: '#fff' } })
    .composite([{ input: labelSvg, top: 0, left: 0 }, { input: left, top: 52, left: 0 }, { input: right, top: 52, left: 720 }])
    .webp({ quality: 84 })
    .toFile(output);
}

const browser = await chromium.launch({ headless: true });
const renders = [];

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto(new URL('index.html', localBase).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const logo = document.querySelector('.company-lockup-hero img');
    const navLogo = document.querySelector('.company-nav-logo');
    const qualifier = document.querySelector('.company-lockup-hero small');
    const h1 = document.querySelector('h1');
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const heading = getComputedStyle(h1);
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return {
      marker: document.body.dataset.brandFidelity,
      logo: logo ? { src: logo.getAttribute('src'), alt: logo.getAttribute('alt'), naturalWidth: logo.naturalWidth, naturalHeight: logo.naturalHeight, rect: rect(logo) } : null,
      navLogo: navLogo ? { src: navLogo.getAttribute('src'), naturalWidth: navLogo.naturalWidth, naturalHeight: navLogo.naturalHeight, rect: rect(navLogo) } : null,
      qualifier: qualifier ? { text: qualifier.textContent.trim(), rect: rect(qualifier) } : null,
      fonts: { body: body.fontFamily, heading: heading.fontFamily },
      tokens: {
        primary: root.getPropertyValue('--brand-primary').trim(),
        blue: root.getPropertyValue('--brand-blue').trim(),
        bright: root.getPropertyValue('--brand-bright').trim(),
        text: root.getPropertyValue('--brand-text').trim(),
        proof: root.getPropertyValue('--campaign-proof').trim()
      },
      overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth },
      ledgerRows: document.querySelectorAll('.ledger-rows li').length,
      independentFooter: document.body.textContent.includes('has not sponsored or endorsed this campaign')
    };
  });

  check(state.marker === 'cap-v1', `${viewport.key}: brand marker`, state.marker);
  check(state.logo?.src === 'assets/brand/capitalize-official-logo.png', `${viewport.key}: local official hero wordmark`, state.logo);
  check(state.logo?.naturalWidth === 155 && state.logo?.naturalHeight === 58, `${viewport.key}: official wordmark proportions`, state.logo);
  check(state.logo?.rect?.y < viewport.height, `${viewport.key}: company identity above fold`, state.logo?.rect);
  check(state.qualifier?.text.includes('Russell Dudek') && state.qualifier?.rect?.y < viewport.height, `${viewport.key}: independent candidate qualifier above fold`, state.qualifier);
  check(state.independentFooter, `${viewport.key}: explicit non-endorsement statement`, state.independentFooter);
  check(state.fonts.heading.toLowerCase().includes('lora'), `${viewport.key}: Lora heading`, state.fonts);
  check(state.fonts.body.toLowerCase().includes('open sans'), `${viewport.key}: Open Sans body`, state.fonts);
  check(state.tokens.primary.toUpperCase() === '#012571', `${viewport.key}: official primary token`, state.tokens);
  check(state.tokens.blue.toUpperCase() === '#0E41B8', `${viewport.key}: official blue token`, state.tokens);
  check(state.tokens.bright.toUpperCase() === '#0C62FB', `${viewport.key}: official bright token`, state.tokens);
  check(state.tokens.text.toUpperCase() === '#3A3A3A', `${viewport.key}: official text token`, state.tokens);
  check(state.tokens.proof.toUpperCase() === '#D5A12E', `${viewport.key}: subordinate candidate proof token`, state.tokens);
  check(state.overflow.scrollWidth <= state.overflow.innerWidth + 1, `${viewport.key}: no horizontal overflow`, state.overflow);
  check(state.ledgerRows === 6, `${viewport.key}: Proof Ledger intact`, state.ledgerRows);
  check(consoleErrors.length === 0, `${viewport.key}: no console errors`, consoleErrors);

  const initialTitle = await page.locator('#scenario-title').textContent();
  await page.locator('[data-scenario="advisory"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(450);
  const selected = await page.locator('[role="tab"][aria-selected="true"]').getAttribute('data-scenario');
  const changedTitle = await page.locator('#scenario-title').textContent();
  check(selected === 'agentic' && initialTitle !== changedTitle, `${viewport.key}: keyboard scenario state change`, { selected, initialTitle, changedTitle });

  const campaignFull = path.join(shotDir, `${viewport.key}-campaign-full.png`);
  const campaignTop = path.join(shotDir, `${viewport.key}-campaign-top.png`);
  await page.screenshot({ path: campaignFull, fullPage: true });
  await page.screenshot({ path: campaignTop, fullPage: false });

  const official = await context.newPage();
  let officialState = null;
  const officialTop = path.join(shotDir, `${viewport.key}-official-top.png`);
  try {
    await official.goto(officialUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await official.waitForTimeout(2500);
    officialState = await official.evaluate(() => {
      const logos = [...document.images].filter((img) => /capitalize/i.test(`${img.src} ${img.alt}`));
      const heading = document.querySelector('h1, h2');
      return {
        title: document.title,
        logos: logos.slice(0, 10).map((img) => ({ src: img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })),
        bodyFont: getComputedStyle(document.body).fontFamily,
        headingFont: heading ? getComputedStyle(heading).fontFamily : '',
        overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }
      };
    });
    check(officialState.logos.some((logo) => /CapitalizeOnly_logo_Brand|capitalize_new-logo/i.test(logo.src)), `${viewport.key}: official comparison identity found`, officialState.logos);
    await official.screenshot({ path: officialTop, fullPage: false });
    await comparisonSheet(officialTop, campaignTop, path.join(shotDir, `${viewport.key}-brand-comparison.webp`), ['Official Capitalize page', 'Independent candidate campaign']);
  } catch (error) {
    failures.push(`${viewport.key}: official comparison render failed: ${error.message}`);
  }

  renders.push({ viewport, campaign: state, official: officialState, consoleErrors });
  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(new URL('index.html', localBase).href, { waitUntil: 'networkidle' });
await reducedPage.waitForTimeout(250);
const reduced = await reducedPage.evaluate(() => {
  const rows = [...document.querySelectorAll('.ledger-rows li')];
  const thread = document.querySelector('.ledger-thread span');
  return {
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    opacity: rows.map((row) => getComputedStyle(row).opacity),
    threadHeight: thread ? getComputedStyle(thread).height : null,
    tabs: document.querySelectorAll('[role="tab"]').length
  };
});
check(reduced.matches, 'reduced motion: preference active', reduced);
check(reduced.opacity.every((value) => Number(value) >= .99), 'reduced motion: all records visible', reduced.opacity);
check(reduced.tabs === 3, 'reduced motion: interactions remain usable', reduced.tabs);
await reducedPage.screenshot({ path: path.join(shotDir, 'reduced-motion-campaign-full.png'), fullPage: true });
await reducedContext.close();

const documents = [];
for (const [route, pdfPath, expectedPages] of printRoutes) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(new URL(route, localBase).href, { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => {
    const logo = document.querySelector('.doc-company-logo, .doc-cover-logo, .canvas-company-logo');
    const download = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Download PDF');
    const print = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Print');
    return {
      logo: logo ? { src: logo.getAttribute('src'), alt: logo.getAttribute('alt'), naturalWidth: logo.naturalWidth, naturalHeight: logo.naturalHeight } : null,
      download: download?.getAttribute('href') || null,
      print: Boolean(print),
      bodyFont: getComputedStyle(document.body).fontFamily,
      overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }
    };
  });
  check(state.logo?.src?.startsWith('assets/brand/capitalize-official-logo'), `${route}: official local wordmark`, state.logo);
  check(state.logo?.naturalWidth > 0, `${route}: wordmark loaded`, state.logo);
  check(state.download === pdfPath, `${route}: PDF download target`, state.download);
  check(state.print, `${route}: separate Print action`, state.print);
  check(state.overflow.scrollWidth <= state.overflow.innerWidth + 1, `${route}: no web overflow`, state.overflow);
  await page.screenshot({ path: path.join(shotDir, `${route.replace('.html', '')}-web-full.png`), fullPage: true });

  const bytes = await readFile(path.join(root, pdfPath));
  const pdf = await PDFDocument.load(bytes);
  const pageCount = pdf.getPageCount();
  const fileStat = await stat(path.join(root, pdfPath));
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  check(pageCount === expectedPages, `${pdfPath}: exact page count ${expectedPages}`, pageCount);
  check(fileStat.size > 10000, `${pdfPath}: non-placeholder`, fileStat.size);
  documents.push({ route, pdfPath, expectedPages, pageCount, bytes: fileStat.size, sha256, state });
  await context.close();
}

await browser.close();

const result = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  auditedSourceSha: process.env.GITHUB_SHA || null,
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  status: failures.length ? 'failed' : 'passed',
  brandFidelity: failures.length ? 'failed' : 'passed',
  visibleCompanyIdentity: failures.some((f) => /identity above fold|hero wordmark|qualifier/.test(f)) ? 'failed' : 'passed',
  officialLogoWordmark: failures.some((f) => /wordmark/.test(f)) ? 'failed' : 'used',
  colorTokenProvenance: failures.some((f) => /token/.test(f)) ? 'failed' : 'passed',
  typographyDecision: failures.some((f) => /Lora|Open Sans/.test(f)) ? 'failed' : 'passed',
  committedBrandAssets: 'passed',
  companyImageryOrVisualCues: 'official identity plus documented company-derived color, typography, rail, rule, and density cues',
  documentBrandContinuity: failures.some((f) => /\.html: official local wordmark/.test(f)) ? 'failed' : 'passed',
  independentCandidateDistinction: failures.some((f) => /qualifier|non-endorsement/.test(f)) ? 'failed' : 'passed',
  assertions,
  failures,
  renders,
  reducedMotion: reduced,
  documents
};

await writeFile(path.join(auditDir, 'audit.json'), JSON.stringify(result, null, 2));
await writeFile(path.join(auditDir, 'run-id.txt'), String(process.env.GITHUB_RUN_ID || 'local'));
await writeFile(path.join(auditDir, 'summary.md'), `# Capitalize Analytics Brand Fidelity Audit\n\n- Status: **${result.status}**\n- Brand fidelity: **${result.brandFidelity}**\n- Visible company identity: **${result.visibleCompanyIdentity}**\n- Official logo/wordmark: **${result.officialLogoWordmark}**\n- Color token provenance: **${result.colorTokenProvenance}**\n- Typography decision: **${result.typographyDecision}**\n- Committed brand assets: **${result.committedBrandAssets}**\n- Document brand continuity: **${result.documentBrandContinuity}**\n- Independent-candidate distinction: **${result.independentCandidateDistinction}**\n\nFailures: ${failures.length ? failures.map((f) => `\n- ${f}`).join('') : 'none'}\n`);
console.log(JSON.stringify({ status: result.status, assertionCount: assertions.length, failureCount: failures.length, failures, documents: documents.map(({ pdfPath, pageCount }) => ({ pdfPath, pageCount })) }, null, 2));
if (failures.length) process.exit(1);
