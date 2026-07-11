const scenarios = {
  operations: {
    title: "Operations exception triage",
    decision: "Which exception deserves human attention now, and what context should arrive with it?",
    ai: "Summarize signals, retrieve relevant history, rank urgency, and draft an action recommendation.",
    human: "A named operator owns the decision, can override the recommendation, and records the reason when consequence is high.",
    proof: "Measure triage time, escalation quality, repeat issue rate, and user override patterns before scaling.",
    handoff: "Instrument the workflow, define evaluation cases, document failure modes, train users, and establish a review cadence."
  },
  advisory: {
    title: "Executive AI ideation",
    decision: "Where can AI change the economics, speed, quality, or risk profile of an existing business decision?",
    ai: "Use structured discovery to move from broad AI interest to a narrow decision, workflow, evidence source, and owner.",
    human: "Executives choose the business priority; domain owners define acceptable failure; technical teams validate feasibility and controls.",
    proof: "Score expected value, data readiness, adoption burden, consequence of error, reuse potential, and time to evidence.",
    handoff: "Produce a short decision brief, scope range, proof plan, governance assumptions, and an explicit stop condition."
  },
  agentic: {
    title: "Agentic workflow proof",
    decision: "Which bounded sequence of work can an agent assist without obscuring accountability or creating uncontrolled action?",
    ai: "Retrieve context, propose steps, call approved tools, maintain a decision record, and escalate outside defined authority.",
    human: "People retain authority over policy, material commitments, high-consequence exceptions, and changes to the agent's permissions.",
    proof: "Evaluate task completion, groundedness, tool-call success, escalation quality, cycle time, and cost per completed workflow.",
    handoff: "Harden permissions, observability, rollback, evaluation sets, owner training, and an operating review before production expansion."
  }
};

const buttons = document.querySelectorAll('[data-scenario]');
const target = document.querySelector('#canvas-detail');

function renderScenario(key) {
  const s = scenarios[key];
  if (!s || !target) return;
  target.innerHTML = `
    <h3>${s.title}</h3>
    <div class="canvas-lines">
      <div class="canvas-line"><b>Business decision</b><span>${s.decision}</span></div>
      <div class="canvas-line"><b>AI role</b><span>${s.ai}</span></div>
      <div class="canvas-line"><b>Human authority</b><span>${s.human}</span></div>
      <div class="canvas-line"><b>Evidence</b><span>${s.proof}</span></div>
      <div class="canvas-line"><b>Handoff</b><span>${s.handoff}</span></div>
    </div>
    <p class="hypothesis-note">Illustrative operating hypothesis for discovery—not a claim about a Capitalize client engagement.</p>`;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    buttons.forEach((b) => b.setAttribute('aria-selected', 'false'));
    button.setAttribute('aria-selected', 'true');
    renderScenario(button.dataset.scenario);
  });
});

renderScenario('operations');
