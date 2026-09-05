#!/usr/bin/env node
/* verify-brain.js: the gate between a build and the public (2026-08-31).
   Exit 1 on any red. Every check prints its denominator, because "0 problems"
   and "0 things examined" look identical in green. Run by brain-agent.sh after
   every build and BEFORE any publish, so a broken brain can never publish itself. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const HERE = __dirname, R = [];
const ok = (n, p, d) => R.push({ n, p: !!p, d: String(d == null ? '' : d).slice(0, 200) });
let d = null;
try { const raw = fs.readFileSync(path.join(HERE, 'brain-data.js'), 'utf8'); d = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf(';'))); ok('brain-data.js parses', true, 'ok'); }
catch (e) { ok('brain-data.js parses', false, e.message); }
if (d) {
  const ageH = (Date.now() - new Date(d.generated)) / 36e5;
  ok('build is fresh', ageH < 2, ageH.toFixed(1) + ' hours old');
  ok('skills scanned', d.skills.length > 100, d.skills.length + ' skills');
  ok('learning entries', d.totals.entries > 500, d.totals.entries + ' entries');
  const src = d.sources || [], bad = src.filter(s => s.ok === false);
  ok('sources feeding', src.length >= 9 && !bad.length, src.length + ' sources, ' + bad.length + ' red' + (bad.length ? ': ' + bad.map(s => s.name).join(', ') : ''));
  const mem = src.find(s => s.name === 'Chat memories');
  const memAge = mem && mem.newest ? (Date.now() - new Date(mem.newest)) / 864e5 : 99;
  ok('memory source alive', memAge <= 7, mem ? mem.detail + ', newest ' + mem.newest : 'missing');
  const PHANTOMS = ['Cards', 'Contracts', 'Proof Spine', 'Client Brain Schema', 'Video Plan', 'Bb Growth Plan', 'Business Booster', 'Pycache', 'Design Test', 'Questionnaire', 'Fable Upgrade', 'Beacon Backups', 'Sun Zapper'];
  const names = (d.clients || []).map(c => c.name), hit = PHANTOMS.filter(p => names.includes(p));
  ok('no phantom clients', !hit.length, names.length + ' clients, phantoms: ' + (hit.join(', ') || 'none'));
  ok('client count sane', names.length >= 15 && names.length <= 60, names.length + ' records');
  ok('systems feed online', d.systems && d.systems.online, d.systems ? (d.systems.online ? d.systems.events.length + ' events' : 'OFFLINE ' + d.systems.error) : 'missing');
  ok('team roster present', d.systems && d.systems.team && d.systems.team.length >= 5, d.systems && d.systems.team ? d.systems.team.length + ' people' : 'none');
  ok('metrics canon present', d.metrics && d.metrics.count > 20, d.metrics ? d.metrics.count + ' metrics' : 'none');
  ok('agent trace present', !!d.agent, d.agent ? (d.agent.delta ? 'deltas computed' : 'first run') : 'none');
}
const html = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
const encPath = path.join(HERE, 'brain-data.enc.js'), enc = fs.existsSync(encPath);
ok('encrypted artifact exists', enc, enc ? fs.statSync(encPath).size + ' bytes' : 'missing');
const stamp = html.match(/brain-data\.enc\.js\?v=(\d+)/);
ok('data reference stamped', !!stamp, stamp ? 'v=' + stamp[1] : 'no stamp');
ok('no plaintext data in index', !/<script src="brain-data\.js"/.test(html), 'guarded');
ok('no Explore tab', !/id="v-explore"/.test(html), 'nav clean');
ok('landing routes through setView', html.includes("VIEW==='brain'&&!document.body.classList.contains('present')){ setView('today'); }"), 'boot route present');
ok('decoder ships locally', fs.existsSync(path.join(HERE, 'assets/brain/draco/draco_decoder.js')) && /setDecoderConfig\(\{type:'js'\}\)/.test(html), 'js decoder forced');
ok('no secret literals in index', !new RegExp(['sb_', 'secret_'].join('') + '|' + ['GOC', 'SPX-'].join('') + '|' + ['service', '_role'].join('')).test(html), 'L-015 scan, patterns assembled so the check cannot match itself');
try {
  const blocks = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const tmp = path.join(require('os').tmpdir(), 'bb-brain-cat.js'); fs.writeFileSync(tmp, blocks.join('\n;\n'));
  cp.execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); ok('concatenated JS syntax', true, blocks.length + ' blocks');
} catch (e) { ok('concatenated JS syntax', false, String(e.stderr || e.message).split('\n')[0]); }
try {
  const out = cp.execFileSync('python3', [path.join(process.env.HOME, '.claude/skills/bb-rock-solid/guard.py'), path.join(HERE, 'index.html')], { stdio: 'pipe' }).toString();
  ok('rock-solid guard', /PASS/.test(out), out.trim().split('\n').pop());
} catch (e) { ok('rock-solid guard', false, String(e.stdout || e.message).trim().split('\n').pop()); }
const fails = R.filter(r => !r.p);
for (const r of R) console.log((r.p ? 'ok ' : 'XX ') + r.n + ' · ' + r.d);
console.log('VERIFY-BRAIN: ' + (R.length - fails.length) + ' of ' + R.length + ' green' + (fails.length ? ' · FAILED: ' + fails.map(f => f.n).join(', ') : ''));
process.exit(fails.length ? 1 : 0);
