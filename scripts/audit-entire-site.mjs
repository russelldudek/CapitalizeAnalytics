import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const base = process.env.LOCAL_BASE || 'http://127.0.0.1:4173/';
const out = path.join(root, 'audit', 'entire-site');
const shots = path.join(out, 'screenshots');
await mkdir(shots, { recursive: true });

const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'laptop', width: 1280, height: 800 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'mobile', width: 390, height: 844 }
];

const routes = [
  { path: 'index.html', kind: 'site', minText: 2500 },
  { path: 'resume.html', kind: 'document', pageSelector: '.resume-page', pages: 2, pdf: 'docs/Russell-Dudek-Resume-Capitalize.pdf' },
  { path: 'cover-letter.html', kind: 'document', pageSelector: '.cover-page', pages: 1, pdf: 'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf' },
  { path: 'interview-brief.html', kind: 'document', pageSelector: '.brief-page', pages: 4, pdf: 'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf' },
  { path: '90-day-plan.html', kind: 'document', pageSelector: '.plan-page', pages: 3, pdf: 'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf' },
  { path: 'engagement-canvas.html', kind: 'document', pageSelector: '.canvas-paper', pages: 1, pdf: 'docs/AI-Engagement-Canvas-Capitalize.pdf' }
];

const results = [];
const failures = [];
const check = (condition, message, evidence = null) => {
  const passed = Boolean(condition);
  results.push({ passed, message, evidence });
  if (!passed) failures.push(message);
};

const safeName = (value) => value.replace('.html', '').replace(/[^a-z0-9-]/gi, '-');

async function inspect(page, route) {
  return page.evaluate(({ route }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const title = document.title;
    const text = document.body.innerText.replace(/\s+/g, ' ').trim();
    const root = document.documentElement;
    const docBody = document.querySelector('.doc-body');
    const download = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Download PDF');
    const print = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Print');
    const toolbar = document.querySelector('.doc-toolbar');
    const images = [...document.images].map((image) => ({
      src: image.getAttribute('src'),
      alt: image.getAttribute('alt'),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight
    }));
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

    const pageData = route.pageSelector ? [...document.querySelectorAll(route.pageSelector)].map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const style = getComputedStyle(canvas);
      const descendants = [...canvas.querySelectorAll('*')].filter(visible).map((element) => {
        const childRect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || ''),
          text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
          top: childRect.top,
          bottom: childRect.bottom,
          left: childRect.left,
          right: childRect.right
        };
      });
      return {
        page: index + 1,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
        overflow: style.overflow,
        clientHeight: canvas.clientHeight,
        scrollHeight: canvas.scrollHeight,
        clientWidth: canvas.clientWidth,
        scrollWidth: canvas.scrollWidth,
        clippedBottom: descendants.filter((item) => item.bottom > rect.bottom + 1).slice(0, 12),
        clippedRight: descendants.filter((item) => item.right > rect.right + 1).slice(0, 12)
      };
    }) : [];

    return {
      title,
      textLength: text.length,
      rootOverflow: { scrollWidth: root.scrollWidth, innerWidth: window.innerWidth, scrollHeight: root.scrollHeight },
      docBodyOverflow: docBody ? { scrollWidth: docBody.scrollWidth, clientWidth: docBody.clientWidth, scrollHeight: docBody.scrollHeight, clientHeight: docBody.clientHeight } : null,
      downloadHref: download?.getAttribute('href') || null,
      hasPrint: Boolean(print),
      toolbarVisible: toolbar ? visible(toolbar) : null,
      images,
      duplicateIds,
      pageData
    };
  }, { route });
}

function assertDocumentLayout(state, route, label, viewportWidth = null) {
  check(state.pageData.length === route.pages, `${label}: expected page canvas count`, state.pageData.length);
  if (state.docBodyOverflow) {
    check(state.docBodyOverflow.scrollWidth <= state.docBodyOverflow.clientWidth + 1, `${label}: document viewport does not hide horizontal content`, state.docBodyOverflow);
  }
  for (const pageCanvas of state.pageData) {
    check(pageCanvas.scrollHeight <= pageCanvas.clientHeight + 1, `${label} page ${pageCanvas.page}: no hidden vertical canvas overflow`, pageCanvas);
    check(pageCanvas.scrollWidth <= pageCanvas.clientWidth + 1, `${label} page ${pageCanvas.page}: no hidden horizontal canvas overflow`, pageCanvas);
    check(pageCanvas.clippedBottom.length === 0, `${label} page ${pageCanvas.page}: no visible descendant extends below canvas`, pageCanvas.clippedBottom);
    check(pageCanvas.clippedRight.length === 0, `${label} page ${pageCanvas.page}: no visible descendant extends right of canvas`, pageCanvas.clippedRight);
    if (viewportWidth && viewportWidth <= 900) {
      check(pageCanvas.rect.width <= viewportWidth - 8, `${label} page ${pageCanvas.page}: responsive canvas fits the viewport`, pageCanvas.rect);
    }
  }
}

const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });

  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto(new URL(route.path, base).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const state = await inspect(page, route);
    const label = `${viewport.key} ${route.path}`;

    check(state.title.length > 3, `${label}: page title present`, state.title);
    check(state.textLength > (route.minText || 200), `${label}: substantive content present`, state.textLength);
    check(consoleErrors.length === 0, `${label}: no console or page errors`, consoleErrors);
    check(state.rootOverflow.scrollWidth <= state.rootOverflow.innerWidth + 1, `${label}: no root horizontal overflow`, state.rootOverflow);
    check(state.images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), `${label}: all images load`, state.images);
    check(state.images.every((image) => image.alt !== null), `${label}: images have alt attributes`, state.images);
    check(state.duplicateIds.length === 0, `${label}: no duplicate element IDs`, state.duplicateIds);

    if (route.kind === 'document') {
      check(state.toolbarVisible, `${label}: document toolbar visible`, state.toolbarVisible);
      check(state.downloadHref === route.pdf, `${label}: PDF download target`, state.downloadHref);
      check(state.hasPrint, `${label}: separate Print action`, state.hasPrint);
      assertDocumentLayout(state, route, label, viewport.width);
    }

    if (route.path === 'index.html') {
      const scenarioBefore = await page.locator('#scenario-title').textContent();
      await page.locator('[data-scenario="advisory"]').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);
      const scenarioAfter = await page.locator('#scenario-title').textContent();
      check(scenarioBefore !== scenarioAfter, `${label}: keyboard scenario interaction changes state`, { scenarioBefore, scenarioAfter });

      if (viewport.width <= 760) {
        await page.locator('.nav-toggle').click();
        const open = await page.locator('.nav-links').evaluate((element) => getComputedStyle(element).display !== 'none');
        check(open, `${label}: mobile navigation opens`, open);
      }
    }

    await page.screenshot({ path: path.join(shots, `${viewport.key}-${safeName(route.path)}.png`), fullPage: true });

    if (route.kind === 'document' && viewport.key === 'desktop') {
      await page.emulateMedia({ media: 'print' });
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const printState = await inspect(page, route);
      assertDocumentLayout(printState, route, `print ${route.path}`);
      await page.screenshot({ path: path.join(shots, `print-${safeName(route.path)}.png`), fullPage: true });
    }

    await page.close();
  }

  await context.close();
}

for (const route of routes.filter((item) => item.pdf)) {
  const bytes = await readFile(path.join(root, route.pdf));
  const pdf = await PDFDocument.load(bytes);
  check(pdf.getPageCount() === route.pages, `${route.pdf}: exact PDF page count`, pdf.getPageCount());
}

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(new URL('index.html', base).href, { waitUntil: 'networkidle' });
const reduced = await reducedPage.evaluate(() => ({
  active: matchMedia('(prefers-reduced-motion: reduce)').matches,
  rowOpacities: [...document.querySelectorAll('.ledger-rows li')].map((row) => getComputedStyle(row).opacity),
  tabs: document.querySelectorAll('[role="tab"]').length
}));
check(reduced.active, 'reduced motion: media query active', reduced);
check(reduced.rowOpacities.every((value) => Number(value) >= 0.99), 'reduced motion: all ledger rows visible', reduced.rowOpacities);
check(reduced.tabs === 3, 'reduced motion: scenario controls remain present', reduced.tabs);
await reducedPage.screenshot({ path: path.join(shots, 'reduced-motion-index.png'), fullPage: true });
await reducedContext.close();
await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  sourceSha: process.env.GITHUB_SHA || null,
  status: failures.length ? 'failed' : 'passed',
  assertionCount: results.length,
  failures,
  results
};
await writeFile(path.join(out, 'audit.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(out, 'summary.md'), `# Entire Site QA\n\n- Status: **${report.status}**\n- Assertions: **${report.assertionCount}**\n- Failures: **${failures.length}**\n\n${failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : 'All routes, viewports, document canvases, print layouts, interactions, images, and PDF page counts passed.'}\n`);
console.log(JSON.stringify({ status: report.status, assertionCount: report.assertionCount, failureCount: failures.length, failures }, null, 2));
if (failures.length) process.exit(1);
