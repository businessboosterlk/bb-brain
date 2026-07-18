#!/usr/bin/env node
/* BB BRAIN WEEKLY DIGEST - the week's delta as a Gmail DRAFT (never sends).
   Run weekly (bb-end.sh fires it on Sundays, after build-brain-data.js).
   Compares the fresh brain-data.js against the last stored snapshot:
     - new learning entries this cycle
     - level moves (skills that crossed a depth bucket)
     - new contradiction flags
     - quiet skills that woke up
   Draft is created via IMAP APPEND to [Gmail]/Drafts (the BB cloud-agent pattern). */
const fs = require('fs');
const path = require('path');


global.window = {};
require(path.join(__dirname, 'brain-data.js'));
const D = window.BRAIN_DATA;
const STATE = path.join(__dirname, '.digest-state.json');
const BUCKETS = [[11, 'Battle-hardened'], [6, 'Sharp'], [3, 'Practiced'], [1, 'Tested'], [0, 'New capability']];
const bucket = d => BUCKETS.find(([min]) => d >= min)[1];
const confKey = c => c.skillA + '|' + c.skillB + '|' + (c.topic || []).join(',');

let prev = null;
try { prev = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { /* first run */ }

const nowSnap = {
  date: D.generated.slice(0, 10),
  entries: D.totals.entries,
  depthBySkill: Object.fromEntries(D.skills.map(s => [s.name, s.depth])),
  quiet: D.skills.filter(s => s.quiet).map(s => s.name),
  conflicts: (D.conflicts || []).map(confKey),
};

let lines = [];
if (!prev) {
  lines.push('First digest run - baseline stored, deltas start next week.');
  lines.push(`Right now: ${D.totals.skills} skills, ${D.totals.entries} lessons, ${(D.clients || []).length} clients on record.`);
} else {
  const newEntries = nowSnap.entries - prev.entries;
  lines.push(`NEW LEARNINGS since ${prev.date}: ${newEntries >= 0 ? newEntries : 0} entries (${prev.entries} -> ${nowSnap.entries}).`);
  const moves = D.skills
    .filter(s => prev.depthBySkill[s.name] !== undefined && bucket(prev.depthBySkill[s.name]) !== bucket(s.depth))
    .map(s => `  · ${s.name}: ${bucket(prev.depthBySkill[s.name])} -> ${bucket(s.depth)} (depth ${prev.depthBySkill[s.name]} -> ${s.depth})`);
  lines.push('', 'LEVEL MOVES: ' + (moves.length ? '' : 'none this week'));
  lines.push(...moves);
  const newConf = nowSnap.conflicts.filter(k => !prev.conflicts.includes(k));
  lines.push('', `NEW CONTRADICTION FLAGS: ${newConf.length}` + (newConf.length ? ' (open the Gap radar tab to review)' : ''));
  const woke = (prev.quiet || []).filter(n => !nowSnap.quiet.includes(n) && (nowSnap.depthBySkill[n] || 0) > (prev.depthBySkill[n] || 0));
  lines.push('', 'QUIET SKILLS THAT WOKE UP: ' + (woke.length ? woke.join(', ') : 'none'));
  const stillQuiet = nowSnap.quiet.length;
  lines.push('', `Still quiet 60+ days: ${stillQuiet} skills. Agent feed: ${D.agentFeed ? (D.agentFeed.online ? D.agentFeed.entries.length + ' machine learnings' : 'OFFLINE') : 'not wired'}.`);
}
/* decay + gaps: the two questions the digest must always ask */
const stale = D.timeline.filter(e => e.stale);
lines.push('', `STALE RULES TO CONFIRM: ${stale.length}` + (stale.length ? ' - open the Timeline and tap "still true" or "retire" on each:' : ''));
lines.push(...stale.slice(0, 5).map(e => `  · [${e.skill}] ${e.summary.slice(0, 90)}`));
if (D.gaps === null) lines.push('', 'OPEN QUESTIONS: gaps feed was OFFLINE at build time - unknown, not zero.');
else {
  lines.push('', `OPEN QUESTIONS THE BRAIN COULD NOT ANSWER: ${(D.gaps || []).length}` + ((D.gaps || []).length ? ' - each is an instruction on what to learn next:' : ''));
  lines.push(...(D.gaps || []).slice(0, 5).map(g => `  · ${g.created_at.slice(0, 10)} ${g.question.slice(0, 100)}`));
}
if (D.reviews && !D.reviews.offline && (D.reviews.kept || D.reviews.retired))
  lines.push('', `DECAY LOOP: ${D.reviews.kept} rules re-confirmed, ${D.reviews.retired} retired this cycle.`);
lines.push('', 'Full brain: https://businessboosterlk.github.io/bb-brain/');
const body = `BB DIGITAL BRAIN - WEEKLY DELTA (${nowSnap.date})\n\n` + lines.join('\n') + '\n';

fs.writeFileSync(STATE, JSON.stringify(nowSnap, null, 1));
console.log(body);

/* ── Gmail DRAFT via the bb-brain-digest edge function (cloud IMAP APPEND - the proven
   BB pattern; local IMAP logins are refused by Gmail). Drafts only, never sends. ── */
fetch('https://yyviiwnqgphyklcoijyd.supabase.co/functions/v1/bb-brain-digest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-BB-Key': 'brain-digest-2026' },
  body: JSON.stringify({ subject: '🧠 BB Brain weekly delta - ' + nowSnap.date, body }),
  signal: AbortSignal.timeout(20000),
}).then(r => r.json()).then(async j => {
  if (j.draft === 'created') { console.log('Gmail draft created (never sent).'); return; }
  console.log('DRAFT FAILED: ' + (j.message || JSON.stringify(j)));
  // fallback: CC bell notification so the digest still reaches Thulaib
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dmlpd25xZ3BoeWtsY29panlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjE5OTEsImV4cCI6MjA5MTI5Nzk5MX0.I8YiBr-rfLVcc6DE8Z1PxEP2oxXCelv6mxqAY_wY7lc';
  const r2 = await fetch('https://yyviiwnqgphyklcoijyd.supabase.co/rest/v1/cc_notifications', {
    method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'general', title: '🧠 BB Brain weekly delta - ' + nowSnap.date, body: body.slice(0, 1500), for_role: 'th', is_read: false }),
  });
  console.log(r2.ok ? 'Delivered to the CC bell instead.' : 'CC bell fallback also failed: HTTP ' + r2.status);
}).catch(e => console.log('DRAFT FAILED (delta still printed above): ' + String(e.message).slice(0, 160)));
