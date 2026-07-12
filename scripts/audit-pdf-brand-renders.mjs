import sharp from 'sharp';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const auditDir = path.join(root, 'audit', 'brand-fidelity');
const pageDir = path.join(auditDir, 'pdf-pages');
const contactDir = path.join(auditDir, 'pdf-contact-sheets');
await import('node:fs/promises').then(({ mkdir }) => Promise.all([mkdir(pageDir, { recursive: true }), mkdir(contactDir, { recursive: true })]));

const pdfs = [
  ['resume', 'docs/Russell-Dudek-Resume-Capitalize.pdf', 2],
  ['cover-letter', 'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf', 1],
  ['interview-brief', 'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf', 4],
  ['90-day-plan', 'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf', 3],
  ['engagement-canvas', 'docs/AI-Engagement-Canvas-Capitalize.pdf', 1]
];
const failures = [];
const records = [];

function isBrandBlue(r, g, b) {
  const primary = Math.abs(r - 1) < 32 && Math.abs(g - 37) < 42 && Math.abs(b - 113) < 65;
  const cobalt = Math.abs(r - 14) < 38 && Math.abs(g - 65) < 50 && Math.abs(b - 184) < 55;
  const bright = Math.abs(r - 12) < 42 && Math.abs(g - 98) < 55 && Math.abs(b - 251) < 35;
  return primary || cobalt || bright;
}
function isCharcoal(r, g, b) {
  return r < 75 && g < 80 && b < 90 && Math.max(r, g, b) - Math.min(r, g, b) < 38;
}
function isWhite(r, g, b) {
  return r > 225 && g > 225 && b > 225;
}

for (const [key, pdfPath, expectedPages] of pdfs) {
  const prefix = path.join(pageDir, key);
  execFileSync('pdftoppm', ['-png', '-r', '110', path.join(root, pdfPath), prefix], { stdio: 'inherit' });
  const pageFiles = (await readdir(pageDir)).filter((file) => file.startsWith(`${key}-`) && file.endsWith('.png')).sort();
  if (pageFiles.length !== expectedPages) failures.push(`${pdfPath}: rasterized ${pageFiles.length} pages, expected ${expectedPages}`);

  const pageRecords = [];
  const thumbs = [];
  for (const file of pageFiles) {
    const filePath = path.join(pageDir, file);
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let blue = 0;
    let charcoal = 0;
    let white = 0;
    let visible = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 32) continue;
      visible += 1;
      if (isBrandBlue(r, g, b)) blue += 1;
      if (isCharcoal(r, g, b)) charcoal += 1;
      if (isWhite(r, g, b)) white += 1;
    }
    const blueShare = blue / Math.max(visible, 1);
    const charcoalShare = charcoal / Math.max(visible, 1);
    const whiteShare = white / Math.max(visible, 1);
    const isNavyCover = blueShare > 0.5;
    if (blueShare < 0.0004) failures.push(`${pdfPath} ${file}: insufficient Capitalize blue/navy rendering (${blueShare.toFixed(6)})`);
    if (isNavyCover) {
      if (whiteShare < 0.003) failures.push(`${pdfPath} ${file}: navy cover lacks sufficient white typography/identity contrast (${whiteShare.toFixed(6)})`);
    } else if (charcoalShare < 0.001) {
      failures.push(`${pdfPath} ${file}: light page lacks sufficient charcoal text/identity rendering (${charcoalShare.toFixed(6)})`);
    }
    pageRecords.push({ file, width: metadata.width, height: metadata.height, isNavyCover, blueShare, charcoalShare, whiteShare, bytes: (await stat(filePath)).size });
    thumbs.push(await sharp(filePath).resize({ width: 430, height: 556, fit: 'contain', background: '#fff' }).png().toBuffer());
  }

  const columns = Math.min(2, Math.max(1, thumbs.length));
  const rows = Math.ceil(thumbs.length / columns);
  const labelHeight = 52;
  const cellWidth = 450;
  const cellHeight = 576;
  const canvasWidth = columns * cellWidth;
  const canvasHeight = labelHeight + rows * cellHeight;
  const label = Buffer.from(`<svg width="${canvasWidth}" height="${labelHeight}"><rect width="${canvasWidth}" height="${labelHeight}" fill="#012571"/><text x="20" y="34" fill="#fff" font-family="Arial" font-size="18" font-weight="700">${pdfPath} · ${pageFiles.length} pages</text></svg>`);
  const composites = [{ input: label, left: 0, top: 0 }];
  thumbs.forEach((thumb, index) => composites.push({ input: thumb, left: (index % columns) * cellWidth + 10, top: labelHeight + Math.floor(index / columns) * cellHeight + 10 }));
  const contactPath = path.join(contactDir, `${key}.webp`);
  await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: '#edf1f8' } }).composite(composites).webp({ quality: 86 }).toFile(contactPath);

  let imageCount = null;
  try {
    const output = execFileSync('pdfimages', ['-list', path.join(root, pdfPath)], { encoding: 'utf8' });
    imageCount = output.split('\n').filter((line) => /^\s*\d+\s+\d+\s+/.test(line)).length;
    if (imageCount < 1) failures.push(`${pdfPath}: no embedded image assets detected; official wordmark may be missing`);
  } catch (error) {
    failures.push(`${pdfPath}: pdfimages inspection failed: ${error.message}`);
  }
  records.push({ key, pdfPath, expectedPages, rasterPages: pageFiles.length, embeddedImages: imageCount, contactSheet: `audit/brand-fidelity/pdf-contact-sheets/${key}.webp`, pages: pageRecords });
}

const auditPath = path.join(auditDir, 'audit.json');
const audit = JSON.parse(await readFile(auditPath, 'utf8'));
audit.pdfRenderAudit = { status: failures.length ? 'failed' : 'passed', records, failures };
if (failures.length) {
  audit.status = 'failed';
  audit.brandFidelity = 'failed';
  audit.documentBrandContinuity = 'failed';
  audit.failures = [...(audit.failures || []), ...failures];
}
await writeFile(auditPath, JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', failures, records: records.map(({ pdfPath, rasterPages, embeddedImages }) => ({ pdfPath, rasterPages, embeddedImages })) }, null, 2));
if (failures.length) process.exit(1);
