import { access, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'resume.html',
  'cover-letter.html',
  'interview-brief.html',
  '90-day-plan.html',
  'engagement-canvas.html',
  'styles.css',
  'brand-tokens.css',
  'app.js',
  'brand-intelligence.md',
  'campaign-metadata.json',
  'artifact-manifest.json',
  'assets/brand/capitalize-official-logo.png',
  'assets/brand/capitalize-official-logo-white.png',
  'assets/brand/capitalize-official-favicon.png',
  'assets/brand/provenance.json',
  'assets/proof-ledger-mark.svg',
  'assets/css/base.css',
  'assets/css/site.css',
  'assets/css/documents.css',
  'assets/css/responsive.css',
  'docs/Russell-Dudek-Resume-Capitalize.pdf',
  'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf',
  'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf',
  'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf',
  'docs/AI-Engagement-Canvas-Capitalize.pdf',
  'docs/pdf-audit.json',
  'README.md',
  'ROLE-INTELLIGENCE.md',
  'BRAND-INTELLIGENCE.md',
  'CAMPAIGN-AUDIT.md',
  'audit/brand-fidelity/audit.json',
  'audit/brand-fidelity/summary.md',
  'audit/brand-fidelity/run-id.txt',
  'scripts/generate-pdfs.mjs',
  'scripts/verify-pages.mjs',
  'scripts/discover-brand.mjs',
  'scripts/apply-brand-fidelity.mjs',
  'scripts/audit-brand-fidelity-v2.mjs',
  'scripts/capture-brand-comparisons.mjs',
  'scripts/audit-pdf-brand-renders.mjs',
  '.github/workflows/build-pdfs.yml',
  '.github/workflows/verify-pages.yml',
  '.github/workflows/discover-brand.yml',
  '.github/workflows/apply-brand-fidelity.yml',
  '.github/workflows/brand-fidelity-audit.yml'
];

const records = [];
for (const relative of required) {
  const absolute = path.join(root, relative);
  await access(absolute);
  const info = await stat(absolute);
  if (!info.isFile() || info.size === 0) throw new Error(`${relative} is missing, not a file, or empty`);
  records.push({ path: relative, bytes: info.size });
}

const manifest = JSON.parse(await readFile(path.join(root, 'artifact-manifest.json'), 'utf8'));
if (manifest.status !== 'passed' || manifest.campaignState !== 'complete') {
  throw new Error(`artifact-manifest.json is not passed/complete`);
}
const metadata = JSON.parse(await readFile(path.join(root, 'campaign-metadata.json'), 'utf8'));
if (metadata.repository !== 'russelldudek/CapitalizeAnalytics' || metadata.branch !== 'main') {
  throw new Error('campaign metadata does not identify the canonical main branch');
}
const pdfAudit = JSON.parse(await readFile(path.join(root, 'docs/pdf-audit.json'), 'utf8'));
if (pdfAudit.status !== 'passed') throw new Error('PDF audit is not passed');
const brandAudit = JSON.parse(await readFile(path.join(root, 'audit/brand-fidelity/audit.json'), 'utf8'));
if (brandAudit.status !== 'passed' || brandAudit.brandFidelity !== 'passed') {
  throw new Error('Committed Brand Fidelity Audit is not passed');
}

console.log(JSON.stringify({
  status: 'passed',
  sourceSha: process.env.GITHUB_SHA || null,
  filesVerified: records.length,
  files: records,
  manifestState: manifest.campaignState,
  pdfAuditStatus: pdfAudit.status,
  brandAuditStatus: brandAudit.status
}, null, 2));
