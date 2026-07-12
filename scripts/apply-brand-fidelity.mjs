import { readFile, writeFile, mkdir } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');
const write = (file, content) => writeFile(path.join(root, file), content);
const officialLogo = 'assets/brand/capitalize-official-logo.png';
const officialWhiteLogo = 'assets/brand/capitalize-official-logo-white.png';
const officialFavicon = 'assets/brand/capitalize-official-favicon.png';

await mkdir(path.join(root, 'assets', 'brand'), { recursive: true });

const whiteLogoUrl = 'https://capitalizeconsulting.com/wp-content/uploads/2024/08/Capitalize-Only-Logo-Website-White.png';
const whiteRes = await fetch(whiteLogoUrl, { redirect: 'follow', headers: { 'user-agent': 'RoleForgeBrandAudit/2.0' } });
if (!whiteRes.ok) throw new Error(`White logo fetch failed: ${whiteRes.status}`);
const whiteLogoBytes = Buffer.from(await whiteRes.arrayBuffer());
await writeFile(path.join(root, officialWhiteLogo), whiteLogoBytes);
const whiteLogoSha = crypto.createHash('sha256').update(whiteLogoBytes).digest('hex');

const htmlFiles = ['index.html', 'resume.html', 'cover-letter.html', 'interview-brief.html', '90-day-plan.html', 'engagement-canvas.html'];
for (const file of htmlFiles) {
  let html = await read(file);
  html = html
    .replaceAll('assets/proof-ledger-mark.svg" type="image/svg+xml"', `${officialFavicon}" type="image/png"`)
    .replace('<body>', '<body data-brand-fidelity="cap-v1">');

  if (file === 'index.html') {
    html = html.replace(
      /<a class="brand" href="index\.html" aria-label="Russell Dudek candidate vision home">[\s\S]*?<\/a><button class="nav-toggle"/,
      `<a class="brand company-nav-lockup" href="index.html" aria-label="Capitalize Analytics AI Senior Consultant candidate vision by Russell Dudek"><img class="company-nav-logo" src="${officialLogo}" alt="Capitalize Analytics"><span><strong>Candidate vision</strong><small>AI Senior Consultant · by Russell Dudek</small></span></a><button class="nav-toggle"`
    );
    if (!html.includes('class="company-lockup-hero"')) {
      html = html.replace(
        '<div class="hero-copy"><p class="role-line">',
        `<div class="hero-copy"><div class="company-lockup-hero"><img src="${officialLogo}" alt="Capitalize Analytics"><div><span>Candidate vision for</span><b>AI Senior Consultant</b><small>by Russell Dudek · Independent candidate campaign</small></div></div><p class="role-line">`
      );
    }
    html = html.replace('Candidate vision · AI Senior Consultant', 'The operating thesis');
    if (!html.includes('Independent candidate work product. Capitalize Analytics has not sponsored or endorsed this campaign.')) {
      html = html.replace(
        '</footer>',
        '<p class="independent-note">Independent candidate work product by Russell Dudek. Capitalize Analytics has not sponsored or endorsed this campaign.</p></footer>'
      );
    }
  }

  if (file === 'resume.html' && !html.includes('doc-company-context')) {
    html = html.replaceAll(
      '<div class="resume-contact">',
      `<div class="resume-contact"><img class="doc-company-logo" src="${officialLogo}" alt="Capitalize Analytics"><span class="doc-company-context">Independent candidate résumé · AI Senior Consultant</span>`
    );
  }

  if (file === 'cover-letter.html' && !html.includes('doc-company-context')) {
    html = html.replace(
      '<div class="cover-meta">',
      `<div class="cover-meta"><img class="doc-company-logo cover-logo" src="${officialLogo}" alt="Capitalize Analytics"><span class="doc-company-context">Independent candidate cover letter</span>`
    );
  }

  if ((file === 'interview-brief.html' || file === '90-day-plan.html') && !html.includes('doc-cover-logo')) {
    html = html.replace(
      '<div class="cover-label">',
      `<img class="doc-cover-logo" src="${officialWhiteLogo}" alt="Capitalize Analytics"><div class="cover-label">`
    );
  }

  if (file === 'engagement-canvas.html' && !html.includes('canvas-company-logo')) {
    html = html.replace(
      '<header class="canvas-head"><div><h1>',
      `<header class="canvas-head"><div><img class="canvas-company-logo" src="${officialLogo}" alt="Capitalize Analytics"><h1>`
    );
  }

  await write(file, html);
}

let styles = await read('styles.css');
if (!styles.includes('brand-tokens.css')) styles += '\n@import url("brand-tokens.css");\n';
await write('styles.css', styles);

const brandTokens = `@import url("https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700;800&display=swap");

:root {
  /* Official Elementor global tokens from capitalizeconsulting.com */
  --brand-primary: #012571;
  --brand-secondary: #EBEBEB;
  --brand-text: #3A3A3A;
  --brand-light: #FFFFFF;
  --brand-blue: #0E41B8;
  --brand-bright: #0C62FB;

  /* Source-sampled from the official locally committed logo */
  --brand-logo-blue: #0B45BB;
  --brand-logo-charcoal: #272927;

  /* Candidate-original, subordinate proof-state marker */
  --campaign-proof: #D5A12E;
  --campaign-proof-soft: #FFF3CF;

  --font-heading: "Lora", Georgia, "Times New Roman", serif;
  --font-body: "Open Sans", "Segoe UI", Arial, sans-serif;

  /* Legacy campaign aliases, now grounded in the Capitalize system */
  --ink: var(--brand-logo-charcoal);
  --night: var(--brand-primary);
  --plum: var(--brand-blue);
  --violet: var(--brand-bright);
  --rose: #DCE6FB;
  --acid: var(--campaign-proof);
  --paper: var(--brand-light);
  --fog: #F5F7FB;
  --line: #D4DBE8;
  --muted: #626A78;
  --shadow: 0 24px 70px rgba(1, 37, 113, .16);
}

body { font-family: var(--font-body); color: var(--brand-text); }
h1, h2, h3, .doc-cover h1, .brief-head h1, .plan-head h1, .canvas-head h1 { font-family: var(--font-heading); font-weight: 500; letter-spacing: -.035em; }
button, .btn, .nav, .eyebrow, .role-line, .ledger-topline, .ledger-num, .ledger-state, .doc-toolbar, .resume-page, .cover-page, .brief-page, .plan-page, .canvas-paper { font-family: var(--font-body); }

.site-header { border-bottom-color: rgba(1, 37, 113, .16); }
.company-nav-lockup { gap: 15px; }
.company-nav-logo { width: 116px !important; height: auto !important; object-fit: contain; flex: 0 0 auto; }
.company-nav-lockup strong { color: var(--brand-primary); font-size: .82rem; text-transform: uppercase; letter-spacing: .08em; }
.company-nav-lockup small { text-transform: none; letter-spacing: .015em; font-size: .7rem; color: var(--muted); }

.hero { background: linear-gradient(90deg, rgba(14, 65, 184, .045) 1px, transparent 1px), linear-gradient(rgba(14, 65, 184, .045) 1px, transparent 1px), #fff; background-size: 48px 48px; }
.company-lockup-hero { display: flex; align-items: center; gap: 22px; padding: 18px 20px; border-left: 5px solid var(--brand-bright); background: rgba(235, 235, 235, .68); max-width: 610px; margin: 0 0 28px; }
.company-lockup-hero img { width: 155px; height: auto; flex: 0 0 auto; }
.company-lockup-hero div { display: grid; gap: 2px; }
.company-lockup-hero span, .company-lockup-hero small { color: var(--muted); font-size: .72rem; }
.company-lockup-hero span { text-transform: uppercase; letter-spacing: .12em; font-weight: 800; }
.company-lockup-hero b { color: var(--brand-primary); font-size: 1rem; }
.hero h1 { font-weight: 500; line-height: .94; letter-spacing: -.055em; font-size: clamp(3.7rem, 7vw, 6.9rem); }
.hero h1 em { color: var(--brand-blue); }
.lede { color: #505660; }

.ledger-hero { background: linear-gradient(145deg, var(--brand-primary), #021A4D); transform: rotate(.35deg); }
.ledger-hero:before { background: rgba(12, 98, 251, .65); }
.ledger-thread span { background: linear-gradient(var(--brand-bright), var(--campaign-proof)); box-shadow: 0 0 16px rgba(12, 98, 251, .42); }
.ledger-rows li.is-active { background: linear-gradient(90deg, rgba(12, 98, 251, .14), transparent); }
.ledger-status, .ledger-rows li.is-active .ledger-state, .ledger-footer strong { color: var(--campaign-proof); }
.ledger-num { color: #AFC8FF; }
.ledger-status i { background: var(--campaign-proof); box-shadow: 0 0 0 7px rgba(213, 161, 46, .1); }

.ledger-section, .objection-section { background: #F7F9FD; border-color: #DCE4F2; }
.ledger-sheet { box-shadow: 18px 18px 0 #DCE6FB; }
.ledger-margin { background: var(--brand-primary); }
.scenario-tabs button[aria-selected="true"] { background: var(--brand-light); color: var(--brand-primary); box-shadow: inset 5px 0 0 var(--campaign-proof); }
.scenario-panel header span, .scenario-ledger dt { color: #B9CFFF; }
.scenario-meter b { background: linear-gradient(90deg, var(--brand-bright), var(--campaign-proof)); }
.tension-axis i { background: linear-gradient(90deg, var(--brand-logo-charcoal), var(--brand-bright), var(--campaign-proof)); }
.tension-axis i:after { background: var(--brand-bright); border-color: var(--brand-primary); }
.objection-memo { box-shadow: 14px 14px 0 #DCE6FB; }
.final-cta { background: var(--brand-bright); color: #fff; }
.final-cta .eyebrow, .final-cta h2, .final-cta .document-links a { color: #fff; }
.final-cta .document-links { border-top-color: #fff; }
.final-cta .document-links a { border-bottom-color: rgba(255,255,255,.34); }

.independent-note { width: min(var(--max), calc(100% - 40px)); margin: 12px auto 0; color: var(--muted); font-size: .74rem; }

.doc-company-logo { display: block; width: 102px; height: auto; margin: 0 0 5px auto; }
.doc-company-context { display: block; color: var(--brand-blue); font-size: 7pt; font-weight: 800; line-height: 1.25; margin-bottom: 4px; }
.doc-cover-logo { width: 146px; height: auto; margin: 0 0 .34in; }
.canvas-company-logo { width: 112px; height: auto; margin-bottom: .08in; }
.resume-top, .cover-head, .brief-head, .plan-head, .canvas-head { border-color: var(--brand-primary); }
.resume-title, .resume-side h2, .resume-main h2, .role-sub, .cover-role, .cover-thesis, .brief-section h2, .plan-section h2, .plan-band .days, .canvas-cell h2 { color: var(--brand-blue); }
.resume-callout, .cover-thesis { border-left-color: var(--brand-bright); }
.doc-cover { background: linear-gradient(150deg, var(--brand-primary), #041A49); }
.doc-cover:after { background: var(--brand-bright); }
.plan-band { border-left-color: var(--brand-blue); }
.resume-fit-row span { background: var(--brand-primary); }
.resume-fit-row span:nth-child(odd) { border-bottom-color: var(--campaign-proof); }
.doc-toolbar .download { background: var(--brand-bright); border-color: var(--brand-bright); color: #fff; }

@media (max-width: 760px) {
  .company-nav-logo { width: 96px !important; }
  .company-nav-lockup span { display: none; }
  .company-lockup-hero { align-items: flex-start; flex-direction: column; gap: 10px; }
  .company-lockup-hero img { width: 132px; }
}
`;
await write('brand-tokens.css', brandTokens);

const brandIntelligence = `# Capitalize Analytics Brand Intelligence

Research refreshed: 2026-07-12

## Official company sources

- Official homepage: https://capitalizeconsulting.com/
- AI & Advanced Analytics: https://capitalizeconsulting.com/ai-and-advanced-analytics/
- Who We Are: https://capitalizeconsulting.com/who-we-are/
- Official Elementor CSS and Google-font declarations captured in \`brand-discovery.json\` and \`assets/brand/provenance.json\`.

## Official identity assets

### Primary wordmark

- Source: https://capitalizeconsulting.com/wp-content/uploads/2024/08/CapitalizeOnly_logo_Brand_WEBSITE-OP-155-x-58.png
- Local path: \`${officialLogo}\`
- Dimensions: 155 × 58 pixels
- SHA-256: \`3629f4721fd515db0b929ee2dd3c541d062e02aa3e34b6599934252e5ddf1fbe\`
- Use: visible employer identity in the navigation, hero lockup, resume, cover letter, and AI Engagement Canvas.

### White alternate wordmark

- Source: ${whiteLogoUrl}
- Local path: \`${officialWhiteLogo}\`
- SHA-256: \`${whiteLogoSha}\`
- Use: restrained identifier on dark interview-brief and 90-day-plan covers.

### Compact mark

- Source: https://capitalizeconsulting.com/wp-content/uploads/2018/09/favicon.png
- Local path: \`${officialFavicon}\`
- SHA-256: \`cbdb6d7626b43e1b10c9957559faf31891c9923a2fa6c3f022b5bb19ba29e95e\`
- Use: browser favicon only.

All official marks are locally stored, unmodified, unanimated, uncropped, and used only for nominative employer identification. The original Proof Ledger mark remains a role-artifact asset and does not replace company identity.

## Color-token provenance

### Official — declared in Capitalize's public Elementor global CSS

- \`--brand-primary: #012571\`
- \`--brand-secondary: #EBEBEB\`
- \`--brand-text: #3A3A3A\`
- \`--brand-light: #FFFFFF\`
- \`--brand-blue: #0E41B8\`
- \`--brand-bright: #0C62FB\`

### Source-sampled — measured from the official wordmark

- \`--brand-logo-blue: #0B45BB\`
- \`--brand-logo-charcoal: #272927\`

### Candidate-original — subordinate to employer identity

- \`--campaign-proof: #D5A12E\`
- \`--campaign-proof-soft: #FFF3CF\`

The candidate-original gold is restricted to continuity status, focus, and proof-state details. It is not used as the company-recognition layer.

## Typography evidence and implementation

The official site CSS declares:

- Lora for primary and secondary typography, including 57px/500 and 48px/500 headline systems.
- Open Sans for body text at 16px/400 with a 24px line height.
- Roboto for an accent typography slot.

Implementation decision:

- Use Lora for campaign headings and thesis typography.
- Use Open Sans for body copy, controls, metadata, and application documents.
- Load both through Google Fonts, where they are distributed under open-source licenses.
- Do not copy or commit the official site's webfont binaries.
- Retain Georgia/Times and Segoe UI/Arial only as fallbacks; they are not represented as official fonts.

## Photography, illustration, product, and interface cues

Official homepage imagery was reviewed, including the published \`home-what-we-do.jpg\` and \`home-who-we-are.jpg\` assets. Those images do not materially improve this role-specific argument and could be misread as candidate-owned work or relationships, so they are not used.

The campaign instead translates documented Capitalize cues into original composition:

- navy/cobalt/white recognition layer;
- Lora editorial headlines with Open Sans operational detail;
- horizontal service rails and outcome sequences;
- spacious white fields, pale-grey support surfaces, strong blue rules, and direct business-first language;
- calm, precise transitions rather than decorative spectacle.

## Visible company identity

Above the fold, the official wordmark is paired with:

- \`Candidate vision for AI Senior Consultant\`
- \`by Russell Dudek · Independent candidate campaign\`

The official company identity is recognizable immediately but remains secondary to the candidate thesis. The site footer states that Capitalize Analytics has not sponsored or endorsed the work.

## Document brand continuity

- Resume: small official wordmark in the contact area, official blue rules and headings, Open Sans body, Lora only where appropriate, and an independent-candidate label.
- Cover letter: restrained wordmark and candidate qualifier, official blue rule, conservative application layout.
- Interview brief and 90-day plan: white official wordmark on navy covers; Lora headlines; blue report furniture.
- Engagement Canvas: primary official wordmark, blue rules, and the same Proof Ledger record system.
- PDFs: generated from the same HTML/CSS and validated after every brand-affecting change.

## Usage constraints and independence

- The campaign is an independent candidate work product by Russell Dudek.
- Official marks are used for nominative identification only.
- No endorsement, sponsorship, employment, or official authorship is implied.
- No official logo is recolored, distorted, animated, combined into a new mark, or placed into fake corporate navigation or legal furniture.
- No proprietary font files are copied or committed.
`;
await write('brand-intelligence.md', brandIntelligence);

const metadata = {
  schemaVersion: 1,
  suggestedChatName: 'Capitalize Analytics – AI Senior Consultant',
  company: 'Capitalize Analytics',
  canonicalRole: 'AI Senior Consultant',
  candidate: 'Russell Dudek',
  repository: 'russelldudek/CapitalizeAnalytics',
  branch: 'main',
  jobPosting: 'https://ats.rippling.com/capitalize-data-analytics-llc/jobs/014035f0-0e5f-47f8-970c-53906fa7d152',
  liveSite: 'https://russelldudek.github.io/CapitalizeAnalytics/',
  printStandard: 'US Letter; AI Engagement Canvas uses US Letter landscape',
  independentCandidateStatement: 'Independent candidate work product by Russell Dudek. Capitalize Analytics has not sponsored or endorsed this campaign.',
  brandPackage: {
    intelligence: 'brand-intelligence.md',
    tokens: 'brand-tokens.css',
    assetsDirectory: 'assets/brand/',
    officialLogo: officialLogo,
    officialWhiteLogo,
    officialFavicon
  }
};
await write('campaign-metadata.json', JSON.stringify(metadata, null, 2));

const expectedPaths = [
  'index.html','resume.html','cover-letter.html','interview-brief.html','90-day-plan.html','engagement-canvas.html',
  'styles.css','brand-tokens.css','app.js','brand-intelligence.md','campaign-metadata.json','artifact-manifest.json',
  'assets/brand/capitalize-official-logo.png','assets/brand/capitalize-official-logo-white.png','assets/brand/capitalize-official-favicon.png','assets/brand/provenance.json',
  'assets/proof-ledger-mark.svg','assets/css/base.css','assets/css/site.css','assets/css/documents.css','assets/css/responsive.css',
  'docs/Russell-Dudek-Resume-Capitalize.pdf','docs/Russell-Dudek-Cover-Letter-Capitalize.pdf','docs/Russell-Dudek-Interview-Brief-Capitalize.pdf','docs/Russell-Dudek-90-Day-Plan-Capitalize.pdf','docs/AI-Engagement-Canvas-Capitalize.pdf','docs/pdf-audit.json',
  'README.md','ROLE-INTELLIGENCE.md','CAMPAIGN-AUDIT.md'
];
await write('artifact-manifest.json', JSON.stringify({ schemaVersion: 1, status: 'pending-final-audit', expectedPaths }, null, 2));

let readme = await read('README.md');
if (!readme.includes('## Brand fidelity')) {
  readme += `\n\n## Brand fidelity\n\nThe campaign uses the locally committed official Capitalize wordmark and favicon, official/source-derived blue and charcoal tokens, Lora/Open Sans typography evidence, and an explicit independent-candidate qualifier. See \`brand-intelligence.md\`, \`brand-tokens.css\`, and \`assets/brand/\`.\n`;
}
await write('README.md', readme);

console.log(JSON.stringify({ status: 'brand-fidelity-applied', officialLogo, officialWhiteLogo, officialFavicon, whiteLogoSha }, null, 2));
