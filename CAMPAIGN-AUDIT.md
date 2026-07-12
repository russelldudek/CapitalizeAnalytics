# Capitalize Analytics — Campaign Audit Record

Audit date: 2026-07-12  
Campaign state before Brand Fidelity repair: `building`  
Campaign state after all current gates: `complete`  
Canonical repository: `russelldudek/CapitalizeAnalytics`  
Audited branch: `main`  
Job posting: https://ats.rippling.com/capitalize-data-analytics-llc/jobs/014035f0-0e5f-47f8-970c-53906fa7d152  
Live site: https://russelldudek.github.io/CapitalizeAnalytics/

## Why the campaign was reclassified

The earlier campaign met the prior content, motion, document, and publication contracts but failed the new Brand Fidelity Contract. It omitted a usable official company wordmark, used an invented plum/lime recognition layer, relied on generic Arial typography, and lacked the required local brand package. Those conditions made the campaign `building`, not `complete`, under the latest RoleForge source of truth.

## Brand Fidelity repair

- Added the locally committed, unmodified official Capitalize primary wordmark, white alternate wordmark, and favicon under `assets/brand/`.
- Added exact asset provenance and SHA-256 records.
- Added `brand-intelligence.md`, `brand-tokens.css`, `campaign-metadata.json`, and `artifact-manifest.json`.
- Replaced the old recognition palette with public Elementor tokens: `#012571`, `#0E41B8`, `#0C62FB`, `#3A3A3A`, `#EBEBEB`, and white.
- Added source-sampled official-logo colors: `#0B45BB` and `#272927`.
- Restricted candidate-original gold to proof-state and focus details rather than employer recognition.
- Replaced generic typography with Lora headings and Open Sans body copy based on the official website's declared public font system.
- Added visible official company identity above the fold with `Candidate vision for AI Senior Consultant`, `by Russell Dudek`, and an immediate independent-candidate qualifier.
- Added an explicit non-endorsement statement.
- Extended the same restrained company-specific grammar to the résumé, cover letter, interview brief, 90-day plan, Engagement Canvas, and generated PDFs.
- Retained the AI Proof Ledger as Russell's role-specific argument rather than copying the company's website.

## Full-site clipping and responsive repair

A later user visual review correctly identified that the campaign was not visually complete despite earlier passing checks.

The pre-fix full-site audit run `29205598510` failed 13 of 365 assertions:

- the AI Engagement Canvas grid required 880 px inside an 816 px fixed landscape canvas, while `overflow:hidden` concealed the final 64 px;
- the second row of the canvas extended below the page in desktop, laptop, tablet, mobile, and print-equivalent layouts;
- fixed 8.5-inch document canvases overflowed the 768 px tablet viewport;
- mobile résumé, cover-letter, interview-brief, entry-plan, and canvas previews were visually sliced to the right even where the root element did not report overflow.

Repairs:

- changed the landscape canvas to a flex column so its grid consumes the actual remaining sheet height;
- retained the exact 11 × 8.5-inch print canvas and one-page PDF contract;
- added screen-only document reflow below 900 px while leaving print media unchanged;
- changed résumé, cover-letter, brief, plan, and canvas previews to fluid-width, auto-height reading layouts on tablet and mobile;
- recomposed canvas cells to two columns on tablet and one column on mobile;
- moved document footers into normal flow for responsive screen views while preserving fixed print furniture;
- added route-level checks for root and document-body overflow, hidden fixed-canvas overflow, descendants beyond page boundaries, image loading, alt attributes, duplicate IDs, keyboard interaction, mobile navigation, print layouts, reduced motion, and PDF page counts.

Passing full-site audit run `29205744818` completed 533 assertions with zero failures across:

- `index.html`;
- `resume.html`;
- `cover-letter.html`;
- `interview-brief.html`;
- `90-day-plan.html`;
- `engagement-canvas.html`;
- 1440 × 900 desktop;
- 1280 × 800 laptop;
- 768 × 1024 tablet;
- 390 × 844 mobile;
- print media for every document route;
- reduced-motion mode;
- all generated PDF page counts.

The exact-head completion workflow now runs `scripts/audit-entire-site.mjs` and publishes the permanent `roleforge/entire-site-qa` commit status. A campaign cannot pass exact-head attestation if any route hides or clips content again.

## Functional manifest

- `index.html`
- `resume.html`
- `cover-letter.html`
- `interview-brief.html`
- `90-day-plan.html`
- `engagement-canvas.html`
- `styles.css`
- `brand-tokens.css`
- `app.js`
- `brand-intelligence.md`
- `campaign-metadata.json`
- `artifact-manifest.json`
- `assets/brand/capitalize-official-logo.png`
- `assets/brand/capitalize-official-logo-white.png`
- `assets/brand/capitalize-official-favicon.png`
- `assets/brand/provenance.json`
- modular site/document/responsive CSS
- five generated PDFs and `docs/pdf-audit.json`
- `scripts/audit-entire-site.mjs`
- `.github/workflows/entire-site-qa.yml`
- exact-head completion workflow with full-site QA
- `ROLE-INTELLIGENCE.md`
- `README.md`
- `CAMPAIGN-AUDIT.md`
- `audit/brand-fidelity/audit.json`

## Rendered Brand Fidelity and campaign QA

Verified:

- official company wordmark and independent-candidate qualifier above the fold;
- official marks loaded locally at their native proportions;
- official/source-sampled colors visibly establish the company-recognition layer;
- Lora/Open Sans implementation matches the documented typography decision;
- complete-page renders at 1440 × 900, 1280 × 800, 768 × 1024, and 390 × 844;
- side-by-side rendered comparisons with the current official Capitalize homepage;
- no root, document-body, fixed-canvas, or print-canvas clipping;
- readable reflowed document previews at tablet and mobile widths;
- six-record role-derived Ledger motion;
- keyboard-operable scenario state changes;
- complete reduced-motion treatment with all records and controls available;
- official company identity across every printable HTML route;
- real PDF downloads and separately labeled Print actions;
- reciprocal résumé/cover-letter navigation;
- rasterized review of every PDF page;
- embedded official brand imagery in every PDF;
- Capitalize blue/navy rendering and appropriate white-on-navy or charcoal-on-light contrast;
- résumé exactly two pages, cover letter one, interview brief four, 90-day plan three, and Engagement Canvas one complete landscape page.

## Evidence integrity

Candidate claims remain bounded by the canonical RoleForge candidate-evidence file. Concepts remain labeled as concepts, the platform-production-depth objection remains explicit, and company-specific recommendations remain hypotheses for discovery unless publicly supported.

## Completion evidence

The final `main` head is captured after the final manifest and audit commit, re-fetched path by path, verified through the exact-SHA live Pages workflow, and recorded in the final handoff and RoleForge portfolio index.
