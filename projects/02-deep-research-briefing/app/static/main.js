const form = document.querySelector('#form');
const sourcesEl = document.querySelector('#sources');
const resultEl = document.querySelector('#result');
const errorEl = document.querySelector('#error');
let current = null;

function addSource(data = {}) {
  if (sourcesEl.children.length >= 6) return;
  const el = document.querySelector('#source-template').content.firstElementChild.cloneNode(true);
  el.querySelector('.title').value = data.title || '';
  el.querySelector('.url').value = data.url || '';
  el.querySelector('.note').value = data.note || '';
  el.querySelector('.remove').addEventListener('click', () => { if (sourcesEl.children.length > 1) { el.remove(); renumber(); } });
  sourcesEl.append(el);
  renumber();
}
function renumber() { [...sourcesEl.children].forEach((el, i) => { el.querySelector('.source-number').textContent = `S${i + 1}`; }); }
document.querySelector('#add-source').addEventListener('click', () => addSource());
document.querySelector('#example').addEventListener('click', () => {
  document.querySelector('#question').value = 'Should I build an AI portfolio project with a narrow use case or a general assistant?';
  sourcesEl.replaceChildren();
  addSource({ title: 'Interview notes from three hiring managers', note: 'All three hiring managers said a specific user problem made demos easier to assess. Two asked for a clear explanation of evaluation and failure handling.' });
  addSource({ title: 'Portfolio retrospective', note: 'A broad assistant prototype took four weekends and was difficult to demo. A narrow document question-answering prototype took one weekend and prompted concrete follow-up questions.' });
  addSource({ title: 'Personal time budget', note: 'I can spend at most six hours on the first version. I want to demonstrate a modern AI technique and show a useful result in under two minutes.' });
  errorEl.hidden = true;
});
addSource();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.hidden = true;
  const button = document.querySelector('#run');
  button.disabled = true; button.textContent = 'Researching...';
  const sources = [...sourcesEl.children].map(el => ({ title: el.querySelector('.title').value.trim(), url: el.querySelector('.url').value.trim(), note: el.querySelector('.note').value.trim() }));
  try {
    const response = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: document.querySelector('#question').value, provider: document.querySelector('#provider').value, sources }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    current = data.result;
    render(data.result, data.provider);
  } catch (error) { errorEl.textContent = error.message; errorEl.hidden = false; }
  finally { button.disabled = false; button.textContent = 'Generate briefing'; }
});

function node(tag, text, className) { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el; }
function section(title) { const el = document.createElement('section'); el.append(node('h3', title)); return el; }
function list(items) { const ul = document.createElement('ul'); items.forEach(item => ul.append(node('li', item))); return ul; }
function render(brief, provider) {
  document.querySelector('#output-title').textContent = provider === 'mock' ? 'Draft brief · Mock' : 'Research brief';
  document.querySelector('#export').hidden = false;
  resultEl.className = 'brief'; resultEl.replaceChildren();
  const answer = section('Answer'); answer.append(node('p', brief.answer)); resultEl.append(answer);
  const plan = section('Research plan'); plan.append(list(brief.plan)); resultEl.append(plan);
  const findings = section('Findings');
  brief.findings.forEach(finding => { const card = node('div', '', 'finding'); card.append(node('p', finding.claim), node('span', finding.source_ids.map(id => `[${id}]`).join(' '), 'cite')); findings.append(card); });
  resultEl.append(findings);
  if (brief.counterpoints.length) { const s = section('Counterpoints'); s.append(list(brief.counterpoints)); resultEl.append(s); }
  const next = section('Next steps'); next.append(list(brief.next_steps)); resultEl.append(next);
  const critique = section('Critique'); critique.append(node('span', `Confidence: ${brief.critique.confidence}`, 'badge'), node('p', `Sources: ${brief.source_audit.source_count}; linked domains: ${brief.source_audit.linked_domains}. ${brief.source_audit.note}`, 'muted'));
  critique.append(list(brief.critique.limitations.concat(brief.critique.follow_up_questions.map(q => `Open question: ${q}`)))); resultEl.append(critique);
  const sources = section('Sources'); const ul = document.createElement('ul'); ul.className = 'source-list';
  brief.sources.forEach(source => { const li = document.createElement('li'); li.append(node('span', `[${source.id}] ${source.title} `)); if (source.url) { const a = node('a', 'Open source'); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); } ul.append(li); });
  sources.append(ul); resultEl.append(sources);
}

document.querySelector('#export').addEventListener('click', () => {
  if (!current) return;
  const b = current;
  const lines = [`# Research brief`, '', `**Question:** ${b.question}`, '', '## Answer', b.answer, '', '## Plan', ...b.plan.map(x => `- ${x}`), '', '## Findings', ...b.findings.map(x => `- ${x.claim} ${x.source_ids.map(id => `[${id}]`).join(' ')}`), '', '## Counterpoints', ...b.counterpoints.map(x => `- ${x}`), '', '## Next steps', ...b.next_steps.map(x => `- ${x}`), '', `## Critique (${b.critique.confidence} confidence)`, ...b.critique.limitations.map(x => `- ${x}`), ...b.critique.follow_up_questions.map(x => `- Open question: ${x}`), '', '## Sources', ...b.sources.map(x => `- [${x.id}] ${x.title}${x.url ? ` — ${x.url}` : ''}`)];
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' })); link.download = 'research-brief.md'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
