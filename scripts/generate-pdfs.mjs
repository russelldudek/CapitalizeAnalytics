import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
await mkdir(path.join(root, 'docs'), { recursive: true });
const jobs = [
  ['resume.html', 'Russell-Dudek-Resume-Capitalize.pdf', {}],
  ['cover-letter.html', 'Russell-Dudek-Cover-Letter-Capitalize.pdf', {}],
  ['interview-brief.html', 'Russell-Dudek-Interview-Brief-Capitalize.pdf', {}],
  ['90-day-plan.html', 'Russell-Dudek-90-Day-Plan-Capitalize.pdf', {}],
  ['engagement-canvas.html', 'AI-Engagement-Canvas-Capitalize.pdf', { landscape: true }]
];
const browser = await chromium.launch({ headless: true });
for (const [html, pdf, options] of jobs) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, html)).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: path.join(root, 'docs', pdf),
    format: 'Letter',
    landscape: options.landscape ?? false,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await page.close();
}
await browser.close();
