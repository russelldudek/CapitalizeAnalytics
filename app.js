const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ledgerRows = [...document.querySelectorAll('[data-ledger-sequence] [data-stage]')];
let ledgerIndex = 0;
let ledgerTimer;

function showLedgerStage(index) {
  ledgerRows.forEach((row, i) => row.classList.toggle('is-active', i === index));
}
function startLedgerSequence() {
  clearInterval(ledgerTimer);
  if (!ledgerRows.length) return;
  if (prefersReducedMotion.matches) {
    ledgerRows.forEach(row => row.classList.add('is-active'));
    return;
  }
  showLedgerStage(0);
  ledgerTimer = setInterval(() => {
    ledgerIndex = (ledgerIndex + 1) % ledgerRows.length;
    showLedgerStage(ledgerIndex);
  }, 1400);
}
startLedgerSequence();
prefersReducedMotion.addEventListener?.('change', startLedgerSequence);

const scenarios = {
  operations: {
    kicker: 'OPERATIONS TRIAGE',
    title: 'Route the right exception to the right human with the right context.',
    decision: 'Which exception deserves human attention now, and what context should arrive with it?',
    ai: 'Summarize signals, retrieve relevant history, rank urgency, and draft an action recommendation.',
    human: 'A named operator owns the decision, can override the recommendation, and records the reason when consequence is high.',
    proof: 'Measure triage time, escalation quality, repeat issue rate, and user override patterns before scaling.',
    handoff: 'Instrument the workflow, define evaluation cases, document failure modes, train users, and establish a review cadence.',
    meters: [88, 72, 66]
  },
  advisory: {
    kicker: 'EXECUTIVE IDEATION',
    title: 'Turn broad AI interest into a decision brief that delivery can honor.',
    decision: 'Where can AI change the economics, speed, quality, or risk profile of an existing business decision?',
    ai: 'Use structured discovery to narrow the problem, identify evidence, test feasibility, and expose assumptions.',
    human: 'Executives choose the priority; domain owners define acceptable failure; technical teams validate feasibility and controls.',
    proof: 'Score expected value, data readiness, adoption burden, consequence of error, reuse potential, and time to evidence.',
    handoff: 'Produce a decision brief, scope range, proof plan, governance assumptions, and an explicit stop condition.',
    meters: [58, 74, 48]
  },
  agentic: {
    kicker: 'AGENTIC WORKFLOW',
    title: 'Bound the work an agent may perform without obscuring accountability.',
    decision: 'Which sequence of work can an agent assist, and where must escalation remain explicit?',
    ai: 'Retrieve context, propose steps, call approved tools, maintain a decision record, and escalate outside defined authority.',
    human: 'People retain authority over policy, material commitments, high-consequence exceptions, and permission changes.',
    proof: 'Evaluate task completion, groundedness, tool-call success, escalation quality, cycle time, and cost per completed workflow.',
    handoff: 'Harden permissions, observability, rollback, evaluation sets, owner training, and an operating review before expansion.',
    meters: [92, 94, 82]
  }
};

const panel = document.querySelector('#scenario-panel');
const scenarioButtons = [...document.querySelectorAll('[data-scenario]')];
const fieldMap = {
  kicker: document.querySelector('#scenario-kicker'),
  title: document.querySelector('#scenario-title'),
  decision: document.querySelector('#field-decision'),
  ai: document.querySelector('#field-ai'),
  human: document.querySelector('#field-human'),
  proof: document.querySelector('#field-proof'),
  handoff: document.querySelector('#field-handoff')
};
const meterEls = [document.querySelector('#meter-workflow'), document.querySelector('#meter-governance'), document.querySelector('#meter-adoption')];

function renderScenario(key, focusPanel = false) {
  const scenario = scenarios[key];
  if (!scenario || !panel) return;
  panel.classList.remove('is-changing');
  void panel.offsetWidth;
  panel.classList.add('is-changing');
  Object.entries(fieldMap).forEach(([field, el]) => { if (el) el.textContent = scenario[field]; });
  meterEls.forEach((el, i) => { if (el) el.style.width = `${scenario.meters[i]}%`; });
  scenarioButtons.forEach(button => {
    const selected = button.dataset.scenario === key;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  if (focusPanel) panel.focus();
}
scenarioButtons.forEach((button, index) => {
  button.addEventListener('click', () => renderScenario(button.dataset.scenario));
  button.addEventListener('keydown', event => {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % scenarioButtons.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + scenarioButtons.length) % scenarioButtons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = scenarioButtons.length - 1;
    scenarioButtons[next].focus();
    renderScenario(scenarioButtons[next].dataset.scenario);
  });
});
renderScenario('operations');

const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('#nav-links');
navToggle?.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!open));
  navLinks?.classList.toggle('is-open', !open);
});
navLinks?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navToggle?.setAttribute('aria-expanded', 'false');
  navLinks.classList.remove('is-open');
}));
