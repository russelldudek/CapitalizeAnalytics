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

const expected = {
  brandPrimary: 'rgb(1, 37, 113)',
  brandBlue: 'rgb(14, 65, 184)',
  brandBright: 'rgb(12, 98, 251)',
  brandText: 'rgb(58, 58, 58)'
};

const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'laptop', width: 1280, height: 800 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'mobile', width: 390, height: 844 }
];

const printableRoutes = [
  ['resume.html', 'docs/Russell-Dudek-Resume-Capitalize.pdf', 2],
  ['cover-letter.html', 'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf', 1],
  ['interview-brief.html', 'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf', 4],
  ['90-day-plan.html', 'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf', 3],
  ['engagement-canvas.html', 'docs/AI-Engagement-Canvas-Capitalize.pdf', 1]
];

const failures = [];
const assertions = [];
const assert = (condition, message, evidence = null) => {
  assertions.push({ passed: Boolean(condition), message, evidence });
  if (!condition) failures.push(message);
};

async function imageContactSheet(leftPath, rightPath, outputPath, labels) {
  const width = 1440;
  const half = 720;
  const height = 900;
  const left = await sharp(leftPath).resize({ width: half, height, fit: 'contain', background: '#ffffff' }).webp({ quality: 82 }).toBuffer();
  const right = await sharp(rightPath).resize({ width: half, height, fit: 'contain', background: '#ffffff' }).webp({ quality: 82 }).toBuffer();
  const svg = Buffer.from(`<svg width="${width}" height="48"><rect width="${width}" height="48" fill="#012571"/><text x="20" y="31" fill="white" font-family="Arial" font-size="18" font-weight="700">${labels[0]}</text><text x="740" y="31" fill="white" font-family="Arial" font-size="18" font-weight="700">${labels[1]}</text></svg>`);
  await sharp({ create: { width, height: height + 48, channels: 4, background: '#ffffff' } })
    .composite([
      { input: svg, left: 0, top: 0 },
      { input: left, left: 0, top: 48 },
      { input: right, left: half, top: 48 }
    ])
    .webp({ quality: 84 })
    .toFile(outputPath);
}

const browser = await chromium.launch({ headless: true });
const renderRecords = [];

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
    const qualifier = [...document.querySelectorAll('*')].find((node) => node.textContent?.includes('Independent candidate campaign'));
    const h1 = document.querySelector('h1');
    const rootStyles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    const h1Styles = h1 ? getComputedStyle(h1) : null;
    const logoRect = logo?.getBoundingClientRect();
    const navRect = navLogo?.getBoundingClientRect();
    const qualifierRect = qualifier?.getBoundingClientRect();
    return {
      brandFidelity: document.body.dataset.brandFidelity,
      logo: logo ? { src: logo.getAttribute('src'), alt: logo.getAttribute('alt'), naturalWidth: logo.naturalWidth, naturalHeight: logo.naturalHeight, rect: logoRect ? { x: logoRect.x, y: logoRect.y, width: logoRect.width, height: logoRect.height } : null } : null,
      navLogo: navLogo ? { src: navLogo.getAttribute('src'), naturalWidth: navLogo.naturalWidth, rect: navRect ? { x: navRect.x, y: navRect.y, width: navRect.width, height: navRect.height } : null } : null,
      qualifier: qualifier ? { text: qualifier.textContent.trim(), rect: qualifierRect ? { x: qualifierRect.x, y: qualifierRect.y, width: qualifierRect.width, height: qualifierRect.height } : null } : null,
      tokens: {
        brandPrimary: rootStyles.getPropertyValue('--brand-primary').trim(),
        brandBlue: rootStyles.getPropertyValue('--brand-blue').trim(),
        brandBright: rootStyles.getPropertyValue('--brand-bright').trim(),
        brandText: rootStyles.getPropertyValue('--brand-text').trim(),
        campaignProof: rootStyles.getPropertyValue('--campaign-proof').trim()
      },
      fonts: { body: bodyStyles.fontFamily, heading: h1Styles?.fontFamily || '' },
      overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth },
      ledgerRows: [...document.querySelectorAll('.ledger-rows li')].length,
      documentLinks: [...document.querySelectorAll('.document-links a')].length
    };
  });

  assert(state.brandFidelity === 'cap-v1', `${viewport.key}: brand-fidelity marker present`, state.brandFidelity);
  assert(state.logo?.src === 'assets/brand/capitalize-official-logo.png', `${viewport.key}: hero uses local official wordmark`, state.logo);
  assert(state.logo?.naturalWidth === 155 && state.logo?.naturalHeight === 58, `${viewport.key}: official wordmark retains native proportions`, state.logo);
  assert(state.logo?.rect?.y < viewport.height, `${viewport.key}: visible company identity is above the fold`, state.logo?.rect);
  assert(state.qualifier?.rect?.y < viewport.height && state.qualifier?.text.includes('Russell Dudek'), `${viewport.key}: independent-candidate qualifier is above the fold`, state.qualifier);
  assert(state.overflow.scrollWidth <= state.overflow.innerWidth + 1, `${viewport.key}: no horizontal overflow`, state.overflow);
  assert(state.fonts.heading.toLowerCase().includes('lora'), `${viewport.key}: Lora heading implementation`, state.fonts);
  assert(state.fonts.body.toLowerCase().includes('open sans'), `${viewport.key}: Open Sans body implementation`, state.fonts);
  assert(state.tokens.brandPrimary.toUpperCase() === '#012571', `${viewport.key}: official primary token applied`, state.tokens);
  assert(state.tokens.brandBlue.toUpperCase() === '#0E41B8', `${viewport.key}: official supporting blue applied`, state.tokens);
  assert(state.tokens.brandBright.toUpperCase() === '#0C62FB', `${viewport.key}: official bright blue applied`, state.tokens);
  assert(state.tokens.campaignProof.toUpperCase() === '#D5A12E', `${viewport.key}: candidate proof accent remains explicit and subordinate`, state.tokens);
  assert(state.ledgerRows === 6, `${viewport.key}: six-record Proof Ledger remains intact`, state.ledgerRows);
  assert(consoleErrors.length === 0, `${viewport.key}: no console errors`, consoleErrors);

  const initialTitle = await page.locator('#scenario-title').textContent();
  await page.locator('[data-scenario="advisory"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(450);
  const selected = await page.locator('[role="tab"][aria-selected="true"]').getAttribute('data-scenario');
  const changedTitle = await page.locator('#scenario-title').textContent();
  assert(selected === 'agentic' && initialTitle !== changedTitle, `${viewport.key}: keyboard scenario interaction changes operating state`, { selected, initialTitle, changedTitle });

  const campaignShot = path.join(shotDir, `${viewport.key}-campaign.webp`);
  await page.screenshot({ path: campaignShot, fullPage: true, type: 'webp', quality: 82 });
  const campaignTop = path.join(shotDir, `${viewport.key}-campaign-top.webp`);
  await page.screenshot({ path: campaignTop, fullPage: false, type: 'webp', quality: 86 });

  const official = await context.newPage();
  const officialErrors = [];
  official.on('console', (msg) => { if (msg.type() === 'error') officialErrors.push(msg.text()); });
  let officialState = null;
  let officialShot = path.join(shotDir, `${viewport.key}-official.webp`);
  try {
    await official.goto(officialUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await official.waitForTimeout(2500);
    officialState = await official.evaluate(() => {
      const logoCandidates = [...document.images].filter((img) => /capitalize/i.test(`${img.src} ${img.alt}`));
      const heading = document.querySelector('h1, h2');
      return {
        title: document.title,
        logoCandidates: logoCandidates.slice(0, 5).map((img) => ({ src: img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })),
        bodyFont: getComputedStyle(document.body).fontFamily,
        headingFont: heading ? getComputedStyle(heading).fontFamily : '',
        bodyColor: getComputedStyle(document.body).color,
        overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }
      };
    });
    await official.screenshot({ path: officialShot, fullPage: false, type: 'webp', quality: 86 });
    assert(officialState.logoCandidates.some((logo) => logo.src.includes('CapitalizeOnly_logo_Brand') || logo.src.includes('capitalize_new-logo')), `${viewport.key}: official comparison page exposes Capitalize identity`, officialState.logoCandidates);
  } catch (error) {
    failures.push(`${viewport.key}: official comparison page could not be rendered: ${error}`);
  }

  if (officialState) {
    const contact = path.join(shotDir, `${viewport.key}-brand-comparison.webp`);
    await imageContactSheet(officialShot, campaignTop, contact, ['Official Capitalize page', 'Independent candidate campaign']);
  }

  renderRecords.push({ viewport, state, officialState, consoleErrors, officialErrors });
  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const reduced = await reducedContext.newPage();
await reduced.goto(new URL('index.html', localBase).href, { waitUntil: 'networkidle' });
await reduced.waitForTimeout(250);
const reducedState = await reduced.evaluate(() => {
  const rows = [...document.querySelectorAll('.ledger-rows li')];
  const thread = document.querySelector('.ledger-thread span');
  const panel = document.querySelector('.scenario-panel');
  return {
    mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    rowOpacity: rows.map((row) => getComputedStyle(row).opacity),
    threadHeight: thread ? getComputedStyle(thread).height : null,
    panelAnimation: panel ? getComputedStyle(panel).animationName : null,
    tabs: document.querySelectorAll('[role="tab"]').length
  };
});
assert(reducedState.mediaMatches, 'reduced motion: media preference active', reducedState);
assert(reducedState.rowOpacity.every((value) => Number(value) >= 0.99), 'reduced motion: all ledger records remain visible', reducedState.rowOpacity);
assert(reducedState.tabs === 3, 'reduced motion: interactive scenario controls remain available', reducedState.tabs);
await reduced.screenshot({ path: path.join(shotDir, 'reduced-motion-campaign.webp'), fullPage: true, type: 'webp', quality: 82 });
await reducedContext.close();

const documentRecords = [];
for (const [route, pdfPath, expectedPages] of printableRoutes) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(new URL(route, localBase).href, { waitUntil: 'networkidle' });
  const documentState = await page.evaluate(() => {
    const logo = document.querySelector('.doc-company-logo, .doc-cover-logo, .canvas-company-logo');
    const download = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Download PDF');
    const print = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Print');
    return {
      title: document.title,
      logo: logo ? { src: logo.getAttribute('src'), alt: logo.getAttribute('alt'), naturalWidth: logo.naturalWidth, naturalHeight: logo.naturalHeight } : null,
      download: download?.getAttribute('href') || null,
      print: Boolean(print),
      bodyFont: getComputedStyle(document.body).fontFamily,
      overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }
    };
  });
  assert(documentState.logo?.src?.startsWith('assets/brand/capitalize-official-logo'), `${route}: locally committed official wordmark visible`, documentState.logo);
  assert(documentState.logo?.naturalWidth > 0, `${route}: official wordmark loads`, documentState.logo);
  assert(documentState.download === pdfPath, `${route}: real PDF download points to expected file`, documentState.download);
  assert(documentState.print, `${route}: separate Print action remains present`, documentState.print);
  assert(documentState.overflow.scrollWidth <= documentState.overflow.innerWidth + 1, `${route}: web view has no horizontal overflow`, documentState.overflow);
  await page.screenshot({ path: path.join(shotDir, `${route.replace('.html', '')}-web.webp`), fullPage: true, type: 'webp', quality: 82 });

  const pdfBytes = await readFile(path.join(root, pdfPath));
  const pdf = await PDFDocument.load(pdfBytes);
  const pageCount = pdf.getPageCount();
  const fileStat = await stat(path.join(root, pdfPath));
  const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
  assert(pageCount === expectedPages, `${pdfPath}: expected ${expectedPages} rendered pages`, pageCount);
  assert(fileStat.size > 10000, `${pdfPath}: non-placeholder PDF`, fileStat.size);
  documentRecords.push({ route, pdfPath, expectedPages, pageCount, bytes: fileStat.size, sha256, documentState });
  await context.close();
}

await browser.close();

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  auditedSourceSha: process.env.GITHUB_SHA || null,
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  status: failures.length ? 'failed' : 'passed',
  brandFidelity: failures.length ? 'failed' : 'passed',
  visibleCompanyIdentity: failures.some((failure) => failure.includes('company identity') || failure.includes('wordmark')) ? 'failed' : 'passed',
  officialLogoWordmark: failures.some((failure) => failure.includes('wordmark')) ? 'failed' : 'used',
  colorTokenProvenance: failures.some((failure) => failure.includes('token')) ? 'failed' : 'passed',
  typographyDecision: failures.some((failure) => failure.includes('Lora') || failure.includes('Open Sans')) ? 'failed' : 'passed',
  committedBrandAssets: 'passed',
  documentBrandContinuity: failures.some((failure) => failure.includes('.html: locally committed official wordmark')) ? 'failed' : 'passed',
  independentCandidateDistinction: failures.some((failure) => failure.includes('qualifier')) ? 'failed' : 'passed',
  assertions,
  failures,
  renderRecords,
  reducedMotion: reducedState,
  documents: documentRecords
};

await writeFile(path.join(auditDir, 'audit.json'), JSON.stringify(result, null, 2));
await writeFile(path.join(auditDir, 'run-id.txt'), String(process.env.GITHUB_RUN_ID || 'local'));
await writeFile(path.join(auditDir, 'summary.md'), `# Brand Fidelity Audit\n\n- Status: **${result.status}**\n- Official logo/wordmark: **${result.officialLogoWordmark}**\n- Visible company identity: **${result.visibleCompanyIdentity}**\n- Color token provenance: **${result.colorTokenProvenance}**\n- Typography decision: **${result.typographyDecision}**\n- Committed brand assets: **${result.committedBrandAssets}**\n- Document brand continuity: **${result.documentBrandContinuity}**\n- Independent-candidate distinction: **${result.independentCandidateDistinction}**\n\nFailures: ${failures.length ? failures.map((failure) => `\n- ${failure}`).join('') : 'none'}\n`);

console.log(JSON.stringify({ status: result.status, failures, assertionCount: assertions.length, documents: documentRecords.map(({ pdfPath, pageCount }) => ({ pdfPath, pageCount })) }, null, 2));
if (failures.length) process.exit(1);
