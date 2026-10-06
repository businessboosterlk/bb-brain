#!/usr/bin/env node
/* THE THINKING SESSION, part one: findings from data (roadmap step 4). No model. Every finding names the
   clients, the result rows and the numbers behind it, carries a grade by how many clients it rests on,
   and proposes the bet that would test it. Part two (think/THINK-PROMPT.md, a daily cloud routine) turns
   findings into worded ideas and still cannot change a fact.

   Usage: node think.js [--write]      prints the findings; --write also writes
          ~/bb-consultancy/brain-exports/ideas.json (candidates, status "new") and
          ~/Downloads/BB-BRAIN-THINKING-<date>.md for Thulaib.

   What it reads: every brain.json (results, bets, contradictions, industry, engagement status), the
   Brain's 12-industry map in build-brain-data.js (Thulaib's own placings, never guessed here).

   Honesty rules
   - A movement needs two measured rows, same client, platform, metric, counts, comparable period length.
     Campaign rows never count. reach moves are reported period to period, never added.
   - A cross-client idea needs the same metric and counts in two or more clients of ONE industry.
     Grade: 1 client HYPOTHESIS, 2 or 3 PATTERN, 4 or more PRINCIPLE (the Mother Brain's tiers).
   - Where the data is thin the finding says so and names the read that would fill it. */
const fs = require('fs'), path = require('path'), os = require('os');
const HOME = process.env.BB_HOME || os.homedir();
const ROOT = path.join(HOME, 'bb-consultancy');
const TODAY = process.env.BB_TODAY || new Date().toISOString().slice(0, 10);
const days = p => (Date.parse(p.to) - Date.parse(p.from)) / 864e5 + 1;
const pct = (a, b) => b === 0 ? null : Math.round((a - b) / b * 1000) / 10;
const grade = n => n >= 4 ? 'PRINCIPLE' : n >= 2 ? 'PATTERN' : 'HYPOTHESIS';

/* Thulaib's industry map, read from the Brain generator so there is one definition */
function industryMap() {
  try {
    const src = fs.readFileSync(path.join(HOME, 'bb-brain', 'build-brain-data.js'), 'utf8');
    const m = src.match(/const INDUSTRY = (\{[\s\S]*?\n\});/);
    return m ? Function('return ' + m[1])() : {};
  } catch { return {}; }
}
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function industryOf(b, map) {
  const names = [b.meta.display_name, b.meta.client.replace(/-/g, ' ')].map(norm);
  for (const [k, v] of Object.entries(map)) {
    const nk = norm(k).replace(/\(.*?\)/g, '').trim();
    if (names.some(n => n === nk || n.startsWith(nk) || nk.startsWith(n.split(' ').slice(0, 2).join(' ')))) return v;
  }
  return null;
}

function load() {
  const map = industryMap(), clients = [];
  for (const d of fs.readdirSync(ROOT)) {
    const f = path.join(ROOT, d, 'brain.json'); if (!fs.existsSync(f)) continue;
    const b = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (b.meta.status !== 'active') continue;
    const bf = path.join(ROOT, d, 'bets.json');
    clients.push({ slug: d, name: b.meta.display_name, industry: industryOf(b, map), b,
      rows: (b.measurement.results || []).filter(r => !r.campaign), bets: fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, 'utf8')).bets : [] });
  }
  return clients;
}

function think(clients) {
  const F = []; let n = 0;
  const id = () => `I-${TODAY}-${++n}`;
  /* 1. movements inside one client */
  for (const c of clients) {
    const g = {};
    c.rows.filter(r => r.status === 'measured').forEach(r => (g[`${r.platform}|${r.metric}|${r.counts}`] ||= []).push(r));
    for (const [k, rows] of Object.entries(g)) {
      const s = rows.sort((a, b) => a.period.to.localeCompare(b.period.to));
      const a = s[s.length - 2], z = s[s.length - 1];
      if (!a || !z || z.period.from <= a.period.to) continue;
      if (z.counts !== 'total-at-date' && Math.abs(days(z.period) - days(a.period)) / days(a.period) > 0.2) continue;
      const change = pct(z.value, a.value); if (change === null || Math.abs(change) < 15) continue;
      const [platform, metric, counts] = k.split('|');
      const how = Math.abs(change) >= 300 ? `${change > 0 ? 'up' : 'down'} to ${Math.round(z.value / a.value * 10) / 10} times` : `${change > 0 ? 'up' : 'down'} ${Math.abs(change)}%`;
      F.push({ id: id(), kind: 'movement', grade: 'HYPOTHESIS', clients: [c.slug], size: Math.abs(change),
        idea: `${c.name}: ${platform} ${metric} ${how}, ${a.display} (${a.period.label || a.period.from}) to ${z.display} (${z.period.label || z.period.to})${counts === 'credits' ? '. Meta credits, not people' : counts === 'people' ? '. People, period to period, never added' : ''}.`,
        evidence: [a, z].map(r => ({ client: c.slug, result_id: r.id, display: r.display, period: `${r.period.from} to ${r.period.to}` })),
        test: { client: c.slug, metric: { platform, metric, counts }, baseline_result_id: z.id, direction: change > 0 ? 'up' : 'down', question: `Does the next comparable period hold or beat ${z.display}?` },
        status: 'new' });
    }
  }
  /* 2. the same metric across clients of one industry */
  const byInd = {};
  clients.forEach(c => { if (c.industry) (byInd[c.industry] ||= []).push(c); });
  for (const [ind, cs] of Object.entries(byInd)) {
    if (cs.length < 2) continue;
    const latest = {};
    for (const c of cs) {
      const g = {};
      c.rows.filter(r => r.status === 'measured' && r.counts !== 'money').forEach(r => { const k = `${r.platform}|${r.metric}|${r.counts}`; if (!g[k] || r.period.to > g[k].period.to) g[k] = r; });
      for (const [k, r] of Object.entries(g)) (latest[k] ||= []).push({ c, r });
    }
    for (const [k, list] of Object.entries(latest)) {
      if (list.length < 2) continue;
      const [platform, metric, counts] = k.split('|');
      const sorted = list.sort((x, y) => y.r.value - x.r.value);
      F.push({ id: id(), kind: 'industry-compare', grade: grade(list.length), clients: sorted.map(x => x.c.slug), industry: ind,
        idea: `${ind}: on ${platform} ${metric}, ${sorted.map(x => `${x.c.name} ${x.r.display} (${x.r.period.label || x.r.period.to})`).join(', ')}. Periods differ, so this is a shape, not a league table.`,
        evidence: sorted.map(x => ({ client: x.c.slug, result_id: x.r.id, display: x.r.display, period: `${x.r.period.from} to ${x.r.period.to}` })),
        test: { question: `Read ${metric} for the same month on every ${ind} client, then ask what the top one does that the others do not.` }, status: 'new' });
    }
  }
  /* 3. what the Brain cannot think about yet */
  for (const c of clients) {
    const measured = c.rows.filter(r => r.status === 'measured').length, unknown = c.rows.filter(r => r.status === 'unknown');
    if (measured === 0) F.push({ id: id(), kind: 'blind-spot', grade: 'UNKNOWN', clients: [c.slug], idea: `${c.name}: no measured number on file, so nothing can be compared yet.`,
      evidence: [], test: { question: unknown[0] ? unknown[0].unblock.action : 'Record one measured number for this client.' }, status: 'new' });
  }
  const waiting = clients.flatMap(c => c.bets.filter(b => b.status === 'proposed').map(b => ({ c, b })));
  if (waiting.length) F.push({ id: id(), kind: 'decision-waiting', grade: 'UNKNOWN', clients: [...new Set(waiting.map(w => w.c.slug))],
    idea: `${waiting.length} bets are written and none has a target, so nothing can be scored: ${waiting.map(w => `${w.c.name} (${w.b.metric.metric})`).join(', ')}.`,
    evidence: waiting.map(w => ({ client: w.c.slug, bet_id: w.b.id })), test: { question: 'Thulaib sets each target; then the verdict computes itself.' }, status: 'new' });
  return F;
}

function note(F, clients) {
  const L = [`# The Brain's thinking session, ${TODAY}`, '',
    `Read ${clients.length} active client files. ${F.filter(f => f.kind === 'movement').length} movements inside a client, ${F.filter(f => f.kind === 'industry-compare').length} same-industry comparisons, ${F.filter(f => f.kind === 'blind-spot').length} clients with nothing to compare. Every line names its rows; nothing here changes a fact. A HYPOTHESIS rests on one client and is worth testing, never a rule.`, ''];
  for (const kind of ['movement', 'industry-compare', 'blind-spot', 'decision-waiting']) {
    const all = F.filter(f => f.kind === kind).sort((x, y) => (y.size || 0) - (x.size || 0)); if (!all.length) continue;
    const items = all.slice(0, kind === 'movement' || kind === 'industry-compare' ? 5 : 20);
    L.push(`## ${{ movement: 'What moved most', 'industry-compare': 'Same industry, side by side', 'blind-spot': 'Where the Brain is blind', 'decision-waiting': 'Waiting on a decision' }[kind]}${all.length > items.length ? ` (${items.length} of ${all.length}, the rest are in ideas.json)` : ''}`, '');
    for (const f of items) {
      L.push(`**${f.id}** (${f.grade}) ${f.idea}`);
      if (f.evidence.length && f.evidence[0].result_id) L.push(`Evidence: ${f.evidence.map(e => `${e.result_id} = ${e.display}`).join('; ')}`);
      L.push(`Test: ${f.test.question}`, '');
    }
  }
  return L.join('\n');
}

if (require.main === module) {
  const clients = load(), F = think(clients);
  const byGrade = F.reduce((t, f) => (t[f.grade] = (t[f.grade] || 0) + 1, t), {});
  console.log(note(F, clients));
  console.log(`THINK: ${F.length} findings from ${clients.length} clients · ${JSON.stringify(byGrade)} · industries placed ${clients.filter(c => c.industry).length} of ${clients.length}`);
  if (process.argv.includes('--write')) {
    const p = path.join(ROOT, 'brain-exports', 'ideas.json');
    const prev = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
    const kept = (prev.items || []).filter(i => i.status !== 'new');
    fs.writeFileSync(p, JSON.stringify({ version: '1.1.0', built: TODAY, tier: 'B', note: 'Candidates from think.js, worded by the daily thinking routine when it runs. A person accepts or rejects; nothing here rewrites a fact.', item_shape: prev.item_shape, items: [...kept, ...F] }, null, 1));
    const md = path.join(HOME, 'Downloads', `BB-BRAIN-THINKING-${TODAY}.md`);
    fs.writeFileSync(md, note(F, clients));
    console.log(`wrote ${p} (${F.length} new, ${kept.length} kept) and ${md}`);
  }
}
module.exports = { load, think };
