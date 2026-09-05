#!/usr/bin/env node
/* BB CHAT-TO-TASK BRIDGE (2026-09-05). Reads the open client asks the brain computed
   (systems.crosscheck.perClient[*].openAll in brain-data.js) and proposes them to
   bb_chat_asks through bb_chat_ask_propose, which dedupes on the fingerprint. Nothing is
   written to tasks here: a person accepts or dismisses each one. Writes bridge-last.json
   so verify-brain.js can prove it ran. Exit 1 on any failure so brain-agent.sh shouts. */
const fs = require('fs'), path = require('path');
const HERE = __dirname;
const gen = fs.readFileSync(path.join(HERE, 'build-brain-data.js'), 'utf8');
const SB_URL = (gen.match(/const SB_URL = '([^']+)'/) || [])[1];
const SB_KEY = (gen.match(/const SB_KEY = '([^']+)'/) || [])[1];
if (!SB_URL || !SB_KEY) { console.error('bridge: SB_URL/SB_KEY not found in build-brain-data.js'); process.exit(1); }
const raw = fs.readFileSync(path.join(HERE, 'brain-data.js'), 'utf8');
const d = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf(';')));
const per = ((d.systems || {}).crosscheck || {}).perClient || {};
const rows = []; for (const cc of Object.values(per)) for (const o of (cc.openAll || [])) rows.push(o);
const rest = SB_URL.replace(/\/rest\/v1\/?$/, '') + '/rest/v1';
(async () => {
  const out = { at: new Date().toISOString(), ok: false, sent: rows.length, inserted: 0, skipped: 0, rejected: 0, clients: Object.keys(per).length };
  try {
    for (let i = 0; i < rows.length; i += 400) {
      const r = await fetch(rest + '/rpc/bb_chat_ask_propose', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_rows: rows.slice(i, i + 400) }), signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('rpc ' + r.status + ' ' + (await r.text()).slice(0, 200));
      const j = (await r.json())[0] || {}; out.inserted += j.inserted || 0; out.skipped += j.skipped || 0; out.rejected += j.rejected || 0;
    }
    out.ok = rows.length === 0 || (out.inserted + out.skipped + out.rejected) === rows.length;
  } catch (e) { out.error = String(e.message || e); }
  fs.writeFileSync(path.join(HERE, 'bridge-last.json'), JSON.stringify(out, null, 2));
  console.log('chat-ask bridge:', out.sent, 'open asks from', out.clients, 'clients ->', out.inserted, 'new,', out.skipped, 'already there,', out.rejected, 'rejected' + (out.error ? ' · ERROR ' + out.error : ''));
  process.exit(out.ok ? 0 : 1);
})();
