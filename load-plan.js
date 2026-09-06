#!/usr/bin/env node
/* LOAD THE 2027 PLAN INTO THE EXECUTION SYSTEM (2026-09-05). Reads the repaired plan
   JSON (default ~/bb-consultancy/growth-plan.json), sends its moves to bb_plan_load,
   which upserts by move id and only overwrites rows still in 'planned'. Prints the
   counts. Exit 1 on any failure. Same anon key posture as the chat-ask bridge. */
const fs = require('fs'), path = require('path'), os = require('os');
const gen = fs.readFileSync(path.join(__dirname, 'build-brain-data.js'), 'utf8');
const SB_URL = (gen.match(/const SB_URL = '([^']+)'/) || [])[1];
const SB_KEY = (gen.match(/const SB_KEY = '([^']+)'/) || [])[1];
const src = process.argv[2] || path.join(os.homedir(), 'bb-consultancy', 'growth-plan.json');
const plan = JSON.parse(fs.readFileSync(src, 'utf8'));
const moves = (plan.moves || []).map(m => ({ id: m.id, segment: m.segment, title: m.title, what: m.what, owner: m.owner, start_month: m.start_month, done_when: m.done_when, evidence: m.evidence, revenue_effect_lkr_month: m.revenue_effect_lkr_month || 0 }));
if (!moves.length) { console.error('no moves in ' + src); process.exit(1); }
const rest = SB_URL.replace(/\/rest\/v1\/?$/, '') + '/rest/v1';
(async () => {
  const r = await fetch(rest + '/rpc/bb_plan_load', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_rows: moves }), signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  if (!r.ok) { console.error('bb_plan_load ' + r.status + ' ' + t.slice(0, 300)); process.exit(1); }
  const j = JSON.parse(t)[0] || {};
  console.log('plan loaded from', src + ':', moves.length, 'moves sent,', j.inserted, 'new,', j.updated, 'updated,', j.rejected, 'rejected');
  if ((j.inserted + j.updated + j.rejected) !== moves.length) process.exit(1);
})();
