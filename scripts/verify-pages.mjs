import crypto from 'node:crypto';

const base = 'https://russelldudek.github.io/CapitalizeAnalytics/';
const routes = [
  { path: '', kind: 'html', contains: ['data-brand-fidelity="cap-v1"', 'assets/brand/capitalize-official-logo.png', 'Independent candidate campaign', 'CONTINUITY ACTIVE', 'Follow the proof chain'] },
  { path: 'resume.html', kind: 'html', contains: ['assets/brand/capitalize-official-logo.png', 'Independent candidate résumé', 'View Cover Letter', 'Download PDF'] },
  { path: 'cover-letter.html', kind: 'html', contains: ['assets/brand/capitalize-official-logo.png', 'Independent candidate cover letter', 'View Resume', 'Download PDF'] },
  { path: 'interview-brief.html', kind: 'html', contains: ['assets/brand/capitalize-official-logo-white.png', 'View 90-Day Plan', 'Download PDF'] },
  { path: '90-day-plan.html', kind: 'html', contains: ['assets/brand/capitalize-official-logo-white.png', 'Earn context.', 'Download PDF'] },
  { path: 'engagement-canvas.html', kind: 'html', contains: ['assets/brand/capitalize-official-logo.png', 'AI Engagement Canvas', 'Download PDF'] },
  { path: 'styles.css', kind: 'text', contains: ['brand-tokens.css'] },
  { path: 'brand-tokens.css', kind: 'text', contains: ['--brand-primary: #012571', '--brand-blue: #0E41B8', '--font-heading: "Lora"', '--font-body: "Open Sans"'] },
  { path: 'brand-intelligence.md', kind: 'text', contains: ['Official identity assets', 'Color-token provenance', 'Typography evidence and implementation'] },
  { path: 'campaign-metadata.json', kind: 'json', contains: ['Capitalize Analytics', 'Independent candidate work product'] },
  { path: 'artifact-manifest.json', kind: 'json', contains: ['assets/brand/capitalize-official-logo.png', 'docs/Russell-Dudek-Resume-Capitalize.pdf'] },
  { path: 'assets/brand/capitalize-official-logo.png', kind: 'png', minBytes: 3000 },
  { path: 'assets/brand/capitalize-official-logo-white.png', kind: 'png', minBytes: 1000 },
  { path: 'assets/brand/capitalize-official-favicon.png', kind: 'png', minBytes: 500 },
  { path: 'docs/pdf-audit.json', kind: 'json', contains: ['"status": "passed"'] },
  { path: 'docs/Russell-Dudek-Resume-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/AI-Engagement-Canvas-Capitalize.pdf', kind: 'pdf' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

async function fetchBytes(path) {
  const url = new URL(path, base).href;
  const response = await fetch(url, { cache: 'no-store', redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
  if (!response.ok) throw new Error(`${path || 'index'} returned ${response.status}`);
  return { response, bytes: new Uint8Array(await response.arrayBuffer()) };
}

async function checkRoute(route) {
  const { response, bytes } = await fetchBytes(route.path);
  const signature = new TextDecoder().decode(bytes.slice(0, 8));
  if (route.kind === 'pdf') {
    if (!signature.startsWith('%PDF')) throw new Error(`${route.path} did not return a PDF`);
    if (bytes.length < 10000) throw new Error(`${route.path} is unexpectedly small (${bytes.length} bytes)`);
  } else if (route.kind === 'png') {
    if (![137, 80, 78, 71].every((value, index) => bytes[index] === value)) throw new Error(`${route.path} did not return a PNG`);
    if (bytes.length < (route.minBytes || 1)) throw new Error(`${route.path} is unexpectedly small (${bytes.length} bytes)`);
  } else {
    const text = new TextDecoder().decode(bytes);
    for (const marker of route.contains ?? []) {
      if (!text.includes(marker)) throw new Error(`${route.path || 'index'} missing marker: ${marker}`);
    }
    if (route.kind === 'json') JSON.parse(text);
  }
  return { route: route.path || 'index.html', status: response.status, bytes: bytes.length, sha256: hash(bytes), finalUrl: response.url };
}

async function verifyPdfHashes(results) {
  const auditResult = results.find((result) => result.route === 'docs/pdf-audit.json');
  if (!auditResult) throw new Error('Live PDF audit route missing');
  const { bytes } = await fetchBytes('docs/pdf-audit.json');
  const audit = JSON.parse(new TextDecoder().decode(bytes));
  if (audit.status !== 'passed') throw new Error(`Live PDF audit status is ${audit.status}`);
  for (const file of audit.files) {
    const routeResult = results.find((result) => result.route === file.file);
    if (!routeResult) throw new Error(`Live PDF missing from route verification: ${file.file}`);
    if (routeResult.sha256 !== file.sha256) throw new Error(`${file.file} hash does not match live pdf-audit.json`);
  }
}

let lastError;
for (let attempt = 1; attempt <= 36; attempt += 1) {
  try {
    const results = [];
    for (const route of routes) results.push(await checkRoute(route));
    await verifyPdfHashes(results);
    console.log(JSON.stringify({ status: 'passed', sourceHead: process.env.GITHUB_SHA, base, brandFidelity: 'passed', results }, null, 2));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Attempt ${attempt}/36: ${error.message}`);
    if (attempt < 36) await sleep(10000);
  }
}
throw lastError;
