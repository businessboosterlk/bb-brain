#!/usr/bin/env node
/* THE BRAIN REPORT CARD (2026-09-11). Thulaib: "what would you rate the quality in every way
   of the BB brain?" The first answer was given by hand, 6.5 of 10, and a hand rating cannot
   be repeated next month or compared with this one. So every score below is a RULE written
   in code, applied to what the brain actually holds, and every gap names the kind of close
   it needs (BUILD, DECIDE, HUMAN) and the check that would stop it coming back.

   Where the machine cannot measure, it says UNKNOWN and scores nothing. An audit that
   pretends to measure what it cannot is worse than none (bb-skill-forge learnings).

   Usage: node audit-brain.js            print the card, append audit-log.json, write AUDIT.md
          node audit-brain.js --quiet    one line
   Reads only. Never publishes. brain-agent.sh publishes the Growth page that shows it. */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const HOME = process.env.BB_HOME || os.homedir(), HERE = __dirname;
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return ''; } };
const d = JSON.parse(read(path.join(HERE, 'brain-data.js')).replace(/^[^{]*/, '').replace(/;\s*$/, ''));
const today = new Date().toISOString().slice(0, 10), H = 36e5;
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

/* ── the evidence ─────────────────────────────────────────────────────────── */
const S = d.skills || [], C = d.clients || [], T = d.timeline || [], SRC = d.sources || [];
const agent = read(path.join(HERE, 'agent.log')).split('\n').filter(l => l.slice(1, 11) >= daysAgo(7));
const feedsGreen = agent.filter(l => /ok VERIFY-BRAIN/.test(l)).length;
const feedsBad = agent.filter(l => /XX|FAIL|could not|unreachable|command not found/i.test(l)).length;
const heartbeat = agent.filter(l => /heartbeat recorded/.test(l)).length > 0;
const cloudFeed = fs.existsSync(path.join(HOME, 'bb-intelligence-backup/.github/workflows/brain-cloud-feed.yml'));
let cov = null; try { cov = JSON.parse(read(path.join(HOME, 'bb-intelligence-backup/coverage.json'))); } catch (e) {}
const covAge = cov ? (Date.now() - new Date(cov.generated).getTime()) / H : Infinity;
const gym = read(path.join(HOME, 'bb-brain-gym/gym-log.md')).split('\n').filter(l => /^20\d\d-\d\d-\d\d/.test(l) && l.slice(0, 10) >= daysAgo(14)).length;
const html = read(path.join(HERE, 'index.html'));
const encBytes = (() => { try { return fs.statSync(path.join(HERE, 'brain-data.enc.js')).size; } catch (e) { return 0; } })();
const tracking = /bb_brain_views|trackView|logView|brainBeacon/.test(html);
let gate = { green: 0, total: 0 }; try { const out = cp.execFileSync(process.execPath, [path.join(HERE, 'verify-brain.js')], { stdio: 'pipe' }).toString(); const m = out.match(/VERIFY-BRAIN: (\d+) of (\d+)/); if (m) gate = { green: +m[1], total: +m[2] }; } catch (e) { const m = String(e.stdout || '').match(/VERIFY-BRAIN: (\d+) of (\d+)/); if (m) gate = { green: +m[1], total: +m[2] }; }
const pass = read(path.join(HOME, '.bb-brain-pass')).trim();
const passClass = !pass ? 'missing' : /^\d+$/.test(pass) ? (pass.length < 10 ? 'short digits' : 'long digits') : (pass.length >= 16 || pass.split(/\s+/).length >= 4) ? 'passphrase' : 'mixed';
const growth = d.growth || {}, idx = (growth.today || {}).pct || 0, ledgerDays = (growth.history || []).length;
const used = S.filter(s => s.depth > 0).length, confirmed = S.filter(s => s.conf && s.conf.confirmed).length;
const conflicts = (d.conflicts || []).length, red = SRC.filter(s => s.ok === false).length;
const lib = (d.library || []).length, cloudReviews = ((SRC.find(s => s.name === 'Cloud synthesis') || {}).detail.match(/(\d+) weekly/) || [0, 0])[1] | 0;
const learnFiles = ((SRC.find(s => s.name === 'Learnings files') || {}).detail.match(/(\d+) files/) || [0, 0])[1] | 0;
const placed = C.length - ((d.industries || {}).unclassified || []).length, indList = (d.industries || {}).list || [];
const avgPerInd = indList.length ? placed / indList.length : 0;

/* ── the rules. Each returns {score|null, why, gap, close, prevent} ──────── */
const cap = n => Math.max(0, Math.min(10, Math.round(n)));
const A = [];
A.push({ area: 'Reliability', score: cap(5 + (feedsGreen >= 10 ? 2 : feedsGreen >= 5 ? 1 : 0) + (cloudFeed ? 1 : 0) + (heartbeat ? 1 : 0) + (feedsBad === 0 ? 1 : feedsBad <= 3 ? 0 : -2)),
  why: `${feedsGreen} green feeds and ${feedsBad} failure lines in 7 days, cloud fallback ${cloudFeed ? 'present' : 'absent'}, heartbeat ${heartbeat ? 'recorded' : 'never seen'}`,
  gap: feedsBad > 3 ? 'feeds failing often' : null, close: 'BUILD', prevent: 'agent.log failure lines counted here every audit' });
A.push({ area: 'Backup', score: cov ? cap(cov.ok && covAge < 26 ? 9 : cov.ok ? 6 : 3) : null,
  why: cov ? `${cov.checked} places, ${cov.uncovered} uncovered, ${(cov.mismatches || []).length} mismatches, audited ${Math.round(covAge)}h ago` : 'no coverage.json',
  gap: !cov ? 'coverage audit never ran' : cov.uncovered ? 'something on the laptop is backed up nowhere' : covAge >= 26 ? 'coverage audit is stale' : null, close: 'BUILD', prevent: 'coverage.py nightly, Laptop safety source row' });
A.push({ area: 'Breadth', score: cap(4 + (T.length >= 500 ? 1 : 0) + (T.length >= 1000 ? 1 : 0) + (C.length >= 30 ? 1 : 0) + (C.length >= 50 ? 1 : 0) + (red === 0 && SRC.length >= 10 ? 1 : 0) + (lib >= 300 ? 1 : 0)),
  why: `${S.length} skills, ${T.length} lessons, ${C.length} clients, ${SRC.length} sources (${red} red), ${lib} documents`, gap: null, close: 'HUMAN', prevent: 'real work is the only source of breadth' });
A.push({ area: 'Honesty', score: cap(10 - Math.ceil(conflicts / 10) - (red ? 2 : 0)),
  why: `${conflicts} open contradictions, ${red} red sources, every lesson dated`, gap: conflicts >= 10 ? `${conflicts} contradictions waiting for a ruling` : null, close: 'DECIDE', prevent: 'conflicts count shown on Today; a ruling closes each one' });
A.push({ area: 'The app', score: cap(4 + (gate.total && gate.green === gate.total ? 2 : 0) + (encBytes < 1.5e6 ? 2 : encBytes < 2.5e6 ? 1 : 0) + (/Safe area:/.test(html) ? 1 : 0) + (/enterkeyhint/.test(html) ? 1 : 0)),
  why: `gate ${gate.green} of ${gate.total}, payload ${(encBytes / 1e6).toFixed(1)}MB, safe-area and phone checks ${/Safe area:/.test(html) ? 'present' : 'absent'}`,
  gap: encBytes >= 2.5e6 ? 'payload too heavy for mobile data' : encBytes >= 1.5e6 ? 'payload heavy for mobile data' : null, close: 'BUILD', prevent: 'payload bytes scored here every audit' });
A.push({ area: 'Self-improvement', score: cap(2 + (gym >= 10 ? 3 : gym >= 5 ? 2 : gym >= 1 ? 1 : 0) + (cloudReviews >= 2 ? 2 : cloudReviews ? 1 : 0) + (learnFiles >= 25 ? 1 : 0) + (ledgerDays >= 14 ? 1 : 0) + (idx >= 40 ? 1 : 0)),
  why: `${gym} gym entries in 14 days, ${cloudReviews} cloud reviews, ${learnFiles} learnings files, ${ledgerDays} ledger days, index ${idx}%`,
  gap: gym < 5 ? 'the daily gym prompt is not being used' : null, close: 'HUMAN', prevent: 'gym-log entries in the last 14 days counted here' });
A.push({ area: 'Security', score: pass ? cap({ 'short digits': 4, 'long digits': 5, mixed: 6, passphrase: 8 }[passClass] + (/no secret literals/.test(read(path.join(HERE, 'verify-brain.js'))) ? 1 : 0)) : null,
  why: `passcode class: ${passClass}; the locked file is public and can be guessed offline without limit`, gap: passClass !== 'passphrase' ? 'the lock is a ' + passClass + ' passcode on a public file' : null, close: 'DECIDE', prevent: 'passcode class scored here; never the value' });
A.push({ area: 'Depth', score: cap(idx / 10), why: `Brain Index ${idx}%: ${used} of ${S.length} skills used on real work, ${confirmed} with confirmed lessons`,
  gap: used / (S.length || 1) < 0.5 ? `${S.length - used} skills have never touched a client` : null, close: 'HUMAN', prevent: 'growth-ledger.json daily, Brain Index on Today' });
A.push({ area: 'Industry knowledge', score: cap(10 * (placed / (C.length || 1)) * (avgPerInd >= 3 ? 1 : 0.7)),
  why: `${placed} of ${C.length} clients placed in ${indList.length} industries, ${avgPerInd.toFixed(1)} clients per industry`,
  gap: placed < C.length ? `${C.length - placed} clients not placed in an industry` : avgPerInd < 3 ? 'most industries have one or two clients' : null, close: placed < C.length ? 'HUMAN' : 'HUMAN', prevent: 'Industries tab names the unplaced' });
A.push({ area: 'Is it used', score: tracking ? cap(5) : null, why: tracking ? 'usage is recorded, read the rows for the score' : 'the app records nothing about who opens it',
  gap: tracking ? null : 'no idea whether anyone reads the brain', close: 'BUILD', prevent: 'a usage count read here every audit' });

const scored = A.filter(a => a.score !== null), overall = +(scored.reduce((n, a) => n + a.score, 0) / scored.length).toFixed(1);
const gaps = A.filter(a => a.gap).sort((x, y) => (x.score === null ? -1 : x.score) - (y.score === null ? -1 : y.score));

/* ── remember, compare, write ─────────────────────────────────────────────── */
const logF = path.join(HERE, 'audit-log.json');
let log = []; try { log = JSON.parse(read(logF)); } catch (e) {}
const prev = log.length ? log[log.length - 1] : null;
const row = { date: today, overall, unknown: A.filter(a => a.score === null).map(a => a.area), areas: Object.fromEntries(A.map(a => [a.area, a.score])), gaps: gaps.map(g => ({ area: g.area, gap: g.gap, close: g.close })) };
if (!prev || prev.date !== today) log.push(row); else log[log.length - 1] = row;
fs.writeFileSync(logF, JSON.stringify(log, null, 1) + '\n');
const delta = prev && prev.date !== today ? (overall - prev.overall).toFixed(1) : null;
const md = [`# Brain report card, ${today}`, '', `**${overall} of 10** across ${scored.length} measured areas${row.unknown.length ? `, ${row.unknown.length} unknown (${row.unknown.join(', ')})` : ''}.${delta !== null ? ` Last audit ${prev.date}: ${prev.overall}, change ${delta > 0 ? '+' : ''}${delta}.` : ''}`, '',
  '| area | score | why |', '|---|---|---|', ...A.map(a => `| ${a.area} | ${a.score === null ? 'UNKNOWN' : a.score} | ${a.why} |`), '',
  '## Gaps, weakest first', '', ...gaps.map((g, i) => `${i + 1}. **${g.area}** (${g.score === null ? 'unknown' : g.score}): ${g.gap}. Close: ${g.close}. Prevented by: ${g.prevent}.`), '',
  'BUILD means a machine can close it. DECIDE means only Thulaib can. HUMAN means only real work closes it.'].join('\n');
fs.writeFileSync(path.join(HERE, 'AUDIT.md'), md + '\n');
if (process.argv.includes('--quiet')) console.log(`brain audit: ${overall}/10, ${gaps.length} gaps, ${row.unknown.length} unknown${delta !== null ? ', change ' + delta : ''}`);
else console.log(md);
