import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const origin = 'https://capitalizeconsulting.com';
const homeUrl = `${origin}/`;
const outDir = path.join(root, 'assets', 'brand');
await mkdir(outDir, { recursive: true });

const decode = (value = '') => value
  .replaceAll('&amp;', '&')
  .replaceAll('&#038;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#039;', "'");

const absolute = (value) => {
  try { return new URL(decode(value), homeUrl).href; } catch { return null; }
};

const getAttr = (tag, name) => {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decode(match[1]) : '';
};

const response = await fetch(homeUrl, { redirect: 'follow', headers: { 'user-agent': 'RoleForgeBrandAudit/1.0' } });
if (!response.ok) throw new Error(`Homepage fetch failed: ${response.status}`);
const html = await response.text();

const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
const imageCandidates = imgTags.map((tag) => {
  const src = getAttr(tag, 'src') || getAttr(tag, 'data-src') || getAttr(tag, 'data-lazy-src');
  const srcset = getAttr(tag, 'srcset');
  const firstSrcset = srcset ? srcset.split(',')[0]?.trim().split(/\s+/)[0] : '';
  const url = absolute(src || firstSrcset);
  return {
    url,
    alt: getAttr(tag, 'alt'),
    className: getAttr(tag, 'class'),
    id: getAttr(tag, 'id'),
    width: getAttr(tag, 'width'),
    height: getAttr(tag, 'height'),
    raw: tag.slice(0, 500)
  };
}).filter((item) => item.url);

const scoreLogo = (item) => {
  const haystack = `${item.url} ${item.alt} ${item.className} ${item.id}`.toLowerCase();
  let score = 0;
  if (haystack.includes('custom-logo')) score += 100;
  if (haystack.includes('site-logo')) score += 90;
  if (haystack.includes('header-logo')) score += 80;
  if (haystack.includes('logo')) score += 50;
  if (haystack.includes('capitalize')) score += 20;
  if (/\.(svg)(\?|$)/i.test(item.url)) score += 20;
  if (/\.(png|webp)(\?|$)/i.test(item.url)) score += 10;
  if (haystack.includes('client') || haystack.includes('partner') || haystack.includes('carousel')) score -= 60;
  return score;
};

const rankedLogos = imageCandidates
  .map((item) => ({ ...item, score: scoreLogo(item) }))
  .filter((item) => item.score > 0)
  .sort((a, b) => b.score - a.score);

const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
const stylesheetUrls = linkTags
  .filter((tag) => /rel\s*=\s*["'][^"']*stylesheet/i.test(tag))
  .map((tag) => absolute(getAttr(tag, 'href')))
  .filter(Boolean)
  .filter((url, index, array) => array.indexOf(url) === index);
const iconUrls = linkTags
  .filter((tag) => /rel\s*=\s*["'][^"']*(icon|apple-touch-icon)/i.test(tag))
  .map((tag) => absolute(getAttr(tag, 'href')))
  .filter(Boolean)
  .filter((url, index, array) => array.indexOf(url) === index);

async function downloadAsset(url, baseName) {
  if (!url) return null;
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'RoleForgeBrandAudit/1.0' } });
  if (!res.ok) throw new Error(`Asset fetch failed ${res.status}: ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const type = (res.headers.get('content-type') || '').toLowerCase();
  let ext = path.extname(new URL(res.url).pathname).toLowerCase();
  if (!['.svg', '.png', '.webp', '.jpg', '.jpeg', '.ico'].includes(ext)) {
    if (type.includes('svg')) ext = '.svg';
    else if (type.includes('png')) ext = '.png';
    else if (type.includes('webp')) ext = '.webp';
    else if (type.includes('jpeg')) ext = '.jpg';
    else if (type.includes('icon')) ext = '.ico';
    else ext = '.bin';
  }
  const filename = `${baseName}${ext}`;
  await writeFile(path.join(outDir, filename), bytes);
  return {
    sourceUrl: url,
    resolvedUrl: res.url,
    localPath: `assets/brand/${filename}`,
    contentType: type,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
}

const primaryLogo = await downloadAsset(rankedLogos[0]?.url, 'capitalize-official-logo');
const compactMark = await downloadAsset(iconUrls[0], 'capitalize-official-favicon');

const cssSources = [];
let combinedCss = '';
for (const url of stylesheetUrls.slice(0, 30)) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'RoleForgeBrandAudit/1.0' } });
    if (!res.ok) continue;
    const css = await res.text();
    combinedCss += `\n/* SOURCE: ${res.url} */\n${css}`;
    cssSources.push({ sourceUrl: url, resolvedUrl: res.url, bytes: Buffer.byteLength(css) });
  } catch (error) {
    cssSources.push({ sourceUrl: url, error: String(error) });
  }
}

const countMatches = (regex) => {
  const counts = new Map();
  for (const match of combinedCss.matchAll(regex)) {
    const value = match[1].trim().replace(/^['"]|['"]$/g, '');
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
};

const fontFamilies = countMatches(/font-family\s*:\s*([^;}{]+)/gi)
  .filter(({ value }) => !value.startsWith('var('))
  .slice(0, 30);
const fontFaces = countMatches(/@font-face[\s\S]*?font-family\s*:\s*([^;}{]+)/gi).slice(0, 20);
const hexColors = countMatches(/(#[0-9a-fA-F]{3,8})\b/g).slice(0, 60);
const rgbColors = countMatches(/((?:rgb|rgba)\([^)]*\))/gi).slice(0, 40);

const discovery = {
  generatedAt: new Date().toISOString(),
  officialHomepage: homeUrl,
  homepageStatus: response.status,
  primaryLogo,
  compactMark,
  rankedLogoCandidates: rankedLogos.slice(0, 15),
  iconCandidates: iconUrls,
  stylesheetSources: cssSources,
  typographyEvidence: { fontFamilies, fontFaces },
  colorEvidence: { hexColors, rgbColors },
  notes: [
    'Assets were fetched from the official Capitalize Analytics website for nominative employer identification.',
    'No font files are downloaded or committed by this process.',
    'Color frequencies are evidence for review, not automatic claims of official brand tokens.'
  ]
};

await writeFile(path.join(outDir, 'provenance.json'), JSON.stringify(discovery, null, 2));
await writeFile(path.join(root, 'brand-discovery.json'), JSON.stringify(discovery, null, 2));
console.log(JSON.stringify({ primaryLogo, compactMark, topFonts: fontFamilies.slice(0, 10), topColors: hexColors.slice(0, 20) }, null, 2));
