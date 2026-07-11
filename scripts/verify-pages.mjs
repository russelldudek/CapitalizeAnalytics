const base = 'https://russelldudek.github.io/CapitalizeAnalytics/';
const routes = [
  { path: '', kind: 'html', contains: ['CONTINUITY ACTIVE', 'Follow the proof chain'] },
  { path: 'resume.html', kind: 'html', contains: ['View Cover Letter', 'Download PDF'] },
  { path: 'cover-letter.html', kind: 'html', contains: ['View Resume', 'Download PDF'] },
  { path: 'interview-brief.html', kind: 'html', contains: ['View 90-Day Plan', 'Download PDF'] },
  { path: '90-day-plan.html', kind: 'html', contains: ['Earn context.', 'Download PDF'] },
  { path: 'engagement-canvas.html', kind: 'html', contains: ['AI Engagement Canvas', 'Download PDF'] },
  { path: 'docs/Russell-Dudek-Resume-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/Russell-Dudek-Cover-Letter-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/Russell-Dudek-Interview-Brief-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf', kind: 'pdf' },
  { path: 'docs/AI-Engagement-Canvas-Capitalize.pdf', kind: 'pdf' }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function checkRoute(route) {
  const url = new URL(route.path, base).href;
  const response = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  if (!response.ok) throw new Error(`${route.path || 'index'} returned ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (route.kind === 'pdf') {
    const signature = new TextDecoder().decode(bytes.slice(0, 4));
    if (signature !== '%PDF') throw new Error(`${route.path} did not return a PDF`);
    if (bytes.length < 10000) throw new Error(`${route.path} is unexpectedly small (${bytes.length} bytes)`);
  } else {
    const text = new TextDecoder().decode(bytes);
    for (const marker of route.contains ?? []) {
      if (!text.includes(marker)) throw new Error(`${route.path || 'index'} missing marker: ${marker}`);
    }
  }
  return { route: route.path || 'index.html', status: response.status, bytes: bytes.length, finalUrl: response.url };
}

let lastError;
for (let attempt = 1; attempt <= 36; attempt += 1) {
  try {
    const results = [];
    for (const route of routes) results.push(await checkRoute(route));
    console.log(JSON.stringify({ status: 'passed', sourceHead: process.env.GITHUB_SHA, base, results }, null, 2));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Attempt ${attempt}/36: ${error.message}`);
    if (attempt < 36) await sleep(10000);
  }
}
throw lastError;
