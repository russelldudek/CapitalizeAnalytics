import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
await mkdir(path.join(root, 'docs'), { recursive: true });
const jobs = [
  { html: 'resume.html', pdf: 'Russell-Dudek-Resume-Capitalize.pdf', pages: 2 },
  { html: 'cover-letter.html', pdf: 'Russell-Dudek-Cover-Letter-Capitalize.pdf', pages: 1 },
  { html: 'interview-brief.html', pdf: 'Russell-Dudek-Interview-Brief-Capitalize.pdf', pages: 4 },
  { html: '90-day-plan.html', pdf: 'Russell-Dudek-90-Day-Plan-Capitalize.pdf', pages: 3 },
  { html: 'engagement-canvas.html', pdf: 'AI-Engagement-Canvas-Capitalize.pdf', pages: 1, landscape: true }
];

const browser = await chromium.launch({ headless: true });
for (const job of jobs) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, job.html)).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: path.join(root, 'docs', job.pdf),
    format: 'Letter',
    landscape: job.landscape ?? false,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await page.close();
}
await browser.close();

const audit = {
  generatedAt: new Date().toISOString(),
  generatedFrom: process.env.GITHUB_SHA ?? 'local',
  status: 'passed',
  files: []
};
for (const job of jobs) {
  const filePath = path.join(root, 'docs', job.pdf);
  const bytes = await readFile(filePath);
  const document = await PDFDocument.load(bytes);
  const pageCount = document.getPageCount();
  if (pageCount !== job.pages) {
    throw new Error(`${job.pdf}: expected ${job.pages} pages, generated ${pageCount}`);
  }
  audit.files.push({
    file: `docs/${job.pdf}`,
    source: job.html,
    expectedPages: job.pages,
    pageCount,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}
await writeFile(path.join(root, 'docs', 'pdf-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
