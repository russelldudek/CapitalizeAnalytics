import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const localBase = process.env.LOCAL_BASE || 'http://127.0.0.1:4173/';
const outputDir = path.join(root, 'audit', 'resume-pagination');
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.goto(new URL('resume.html', localBase).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

async function inspectLayout(media) {
  await page.emulateMedia({ media });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const result = await page.evaluate(() => {
    const selectors = [
      '.resume-main > h2',
      '.resume-main > article',
      '.resume-main > .resume-callout',
      '.resume-main > .resume-lower-grid',
      '.resume-main > .resume-fit-row',
      '.resume-side > h2',
      '.resume-side > ul'
    ].join(',');

    return [...document.querySelectorAll('.resume-page')].map((resumePage, index) => {
      const pageRect = resumePage.getBoundingClientRect();
      const footer = resumePage.querySelector('.resume-footer');
      const footerRect = footer?.getBoundingClientRect() || null;
      const modules = [...resumePage.querySelectorAll(selectors)].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className,
          text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 100),
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height
        };
      });

      const substantiveBottom = Math.max(...modules.map((module) => module.bottom), pageRect.top);
      const footerTop = footerRect?.top ?? pageRect.bottom;
      const overlaps = modules.filter((module) => module.bottom > footerTop - 6);
      const gapToFooter = footerTop - substantiveBottom;

      return {
        page: index + 1,
        pageTop: pageRect.top,
        pageBottom: pageRect.bottom,
        clientHeight: resumePage.clientHeight,
        scrollHeight: resumePage.scrollHeight,
        footerTop,
        substantiveBottom,
        gapToFooter,
        overlaps,
        moduleCount: modules.length
      };
    });
  });

  await page.screenshot({
    path: path.join(outputDir, `resume-${media}.png`),
    fullPage: true
  });

  return result;
}

const screen = await inspectLayout('screen');
const print = await inspectLayout('print');

const pdfBytes = await readFile(path.join(root, 'docs', 'Russell-Dudek-Resume-Capitalize.pdf'));
const pdf = await PDFDocument.load(pdfBytes);
const pdfPageCount = pdf.getPageCount();

const failures = [];
for (const [media, pages] of [['screen', screen], ['print', print]]) {
  if (pages.length !== 2) failures.push(`${media}: expected 2 resume-page canvases, found ${pages.length}`);
  for (const pageResult of pages) {
    if (pageResult.scrollHeight > pageResult.clientHeight + 1) {
      failures.push(`${media} page ${pageResult.page}: content overflows fixed page canvas (${pageResult.scrollHeight}px > ${pageResult.clientHeight}px)`);
    }
    if (pageResult.overlaps.length) {
      failures.push(`${media} page ${pageResult.page}: ${pageResult.overlaps.length} substantive module(s) overlap the footer`);
    }
    if (pageResult.gapToFooter > 72) {
      failures.push(`${media} page ${pageResult.page}: last substantive content ends ${pageResult.gapToFooter.toFixed(1)}px above footer; exceeds 0.75in balance limit`);
    }
  }
}
if (pdfPageCount !== 2) failures.push(`PDF: expected 2 pages, found ${pdfPageCount}`);
if (consoleErrors.length) failures.push(`Browser console errors: ${consoleErrors.join(' | ')}`);

const report = {
  generatedAt: new Date().toISOString(),
  sourceSha: process.env.GITHUB_SHA || null,
  status: failures.length ? 'failed' : 'passed',
  screen,
  print,
  pdfPageCount,
  consoleErrors,
  failures
};

await writeFile(path.join(outputDir, 'audit.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(outputDir, 'summary.md'), `# Resume Pagination Audit\n\n- Status: **${report.status}**\n- HTML page canvases: **${screen.length}**\n- PDF pages: **${pdfPageCount}**\n- Footer overlap: **${[...screen, ...print].some((entry) => entry.overlaps.length) ? 'detected' : 'none'}**\n- Fixed-canvas overflow: **${[...screen, ...print].some((entry) => entry.scrollHeight > entry.clientHeight + 1) ? 'detected' : 'none'}**\n\n${failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : 'All pagination and page-balance checks passed.'}\n`);

await browser.close();
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
