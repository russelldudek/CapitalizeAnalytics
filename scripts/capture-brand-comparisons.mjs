import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const localBase = process.env.LOCAL_BASE || 'http://127.0.0.1:4173/';
const officialUrl = 'https://capitalizeconsulting.com/';
const shotDir = path.join(root, 'audit', 'brand-fidelity', 'screenshots');
await mkdir(shotDir, { recursive: true });
const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'laptop', width: 1280, height: 800 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'mobile', width: 390, height: 844 }
];

async function sheet(officialPng, campaignPng, output, viewport) {
  const width = 1440, half = 720, height = 900;
  const left = await sharp(officialPng).resize({ width: half, height, fit: 'contain', background: '#fff' }).png().toBuffer();
  const right = await sharp(campaignPng).resize({ width: half, height, fit: 'contain', background: '#fff' }).png().toBuffer();
  const label = Buffer.from(`<svg width="1440" height="52"><rect width="1440" height="52" fill="#012571"/><text x="20" y="34" fill="#fff" font-family="Arial" font-size="18" font-weight="700">Official Capitalize homepage · ${viewport.width}×${viewport.height}</text><text x="740" y="34" fill="#fff" font-family="Arial" font-size="18" font-weight="700">Independent candidate campaign · above fold</text></svg>`);
  await sharp({ create: { width, height: height + 52, channels: 4, background: '#fff' } })
    .composite([{ input: label, left: 0, top: 0 }, { input: left, left: 0, top: 52 }, { input: right, left: half, top: 52 }])
    .webp({ quality: 86 })
    .toFile(output);
}

const browser = await chromium.launch({ headless: true });
for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const campaign = await context.newPage();
  await campaign.goto(new URL('index.html', localBase).href, { waitUntil: 'networkidle' });
  await campaign.waitForTimeout(400);
  const campaignPng = path.join(shotDir, `${viewport.key}-campaign-above-fold.png`);
  await campaign.screenshot({ path: campaignPng, fullPage: false });
  const official = await context.newPage();
  await official.goto(officialUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await official.waitForTimeout(2500);
  const officialPng = path.join(shotDir, `${viewport.key}-official-above-fold.png`);
  await official.screenshot({ path: officialPng, fullPage: false });
  await sheet(officialPng, campaignPng, path.join(shotDir, `${viewport.key}-brand-comparison-above-fold.webp`), viewport);
  await context.close();
}
await browser.close();
