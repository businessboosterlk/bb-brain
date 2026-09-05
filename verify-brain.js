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
  { const SEC = /(password|passcode|passwd|pwd|credential|login details|\botp\b|\bpin\s*[:=]|\b\d{6}\b)/i;
    const snips = []; for (const c of d.clients || []) for (const w of (c.whatsapp || [])) snips.push(w.snippet || '');
    for (const cc of Object.values((d.crosscheck || {}).perClient || {})) for (const o of (cc.open || [])) snips.push(o.snippet || '');
    const leaks = snips.filter(x => SEC.test(x));
    ok('no credential in WhatsApp lines', snips.length > 0 && !leaks.length, snips.length + ' lines scanned, ' + leaks.length + ' credential-like');
    const wa = d.wa || {}; ok('WhatsApp inbox fed', (wa.files || 0) >= 12 && (wa.kept || 0) > 100, (wa.files || 0) + ' files, ' + (wa.kept || 0) + ' lines kept, ' + (wa.redacted || 0) + ' redacted, ' + (wa.clients || 0) + ' clients'); }
  { const BBS = /\bBB\b|thulaib|shiara|ushane|rukshan|nirvana|tiana|kenuli|gayani|suhana/i; let opens = 0, bb = 0;
    for (const cc of Object.values(((d.systems || {}).crosscheck || {}).perClient || {})) for (const o of (cc.open || [])) { opens++; if (BBS.test(o.sender || '')) bb++; }
    ok('open asks are the client\'s, not BB\'s', opens > 0 && bb === 0, opens + ' open asks, ' + bb + ' from a BB sender'); }
  { let b = null; try { b = JSON.parse(fs.readFileSync(path.join(HERE, 'bridge-last.json'), 'utf8')); } catch (e) {}
    const age = b ? (Date.now() - Date.parse(b.at)) / 36e5 : 999;
    ok('chat-ask bridge ran', !!b && b.ok && age < 26, b ? (b.sent + ' asks sent, ' + b.inserted + ' new, ' + b.skipped + ' known, ' + b.rejected + ' rejected, ' + age.toFixed(1) + 'h ago' + (b.error ? ', ' + b.error : '')) : 'bridge-last.json missing'); }
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
/* the cinematic layer (2026-09-05): static invariants the page must keep */
const bbx = html.slice(html.indexOf('const BBX=(function(){'), html.indexOf('/* ═══ THE LANDING STATE IS A ROUTE TOO'));
ok('3D: engine block present', bbx.length > 20000, bbx.length + ' chars');
ok('3D: cinematic entrance present', /function beginEntrance\(/.test(bbx) && /bb_x3d_entered/.test(bbx), 'beginEntrance + session flag');
ok('3D: reduced motion skips the journey', /if\(reduced&&!force\)\{ settleHome\(\); return; \}/.test(bbx), 'guard present');
ok('3D: replay control present', /id="x3d-replay"/.test(html) && /function replay\(/.test(bbx), 'button + function');
ok('3D: one animation loop', (bbx.match(/requestAnimationFrame\(tick\)/g) || []).length === 2 && !/setInterval\(/.test(bbx), (bbx.match(/requestAnimationFrame\(/g) || []).length + ' rAF calls, 2 drive the loop');
const vers = [...new Set(html.match(/three@[\d.]+/g) || [])];
ok('3D: one Three.js version', vers.length <= 1 && /THREE_VER='0\.137\.0'/.test(bbx), vers.join(', ') || 'every URL built from THREE_VER');
ok('3D: glow stack lazy and optional', /UnrealBloomPass\.js/.test(bbx) && /Q\.bloom=false/.test(bbx), 'bloom loads with the engine, fails soft');
ok('3D: adaptive quality tiers', /high:\{bloom:true/.test(bbx) && /low:\{bloom:false/.test(bbx) && /function demote\(/.test(bbx), 'three tiers plus the frame watchdog');
ok('3D: fallback untouched', /window\.X3D_FALLBACK=true/.test(bbx) && /x3d-fellback/.test(html), 'fail() plus the one-shot notice');
ok('3D: no emoji in stage copy', !/[\u{1F300}-\u{1FAFF}]/u.test(html.slice(html.indexOf('id="explore-view"'), html.indexOf('id="report-ov"'))), 'stage markup scanned');
const fails = R.filter(r => !r.p);
for (const r of R) console.log((r.p ? 'ok ' : 'XX ') + r.n + ' · ' + r.d);
console.log('VERIFY-BRAIN: ' + (R.length - fails.length) + ' of ' + R.length + ' green' + (fails.length ? ' · FAILED: ' + fails.map(f => f.n).join(', ') : ''));
process.exit(fails.length ? 1 : 0);
