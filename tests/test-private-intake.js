#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { refreshPrivateIntake, mark } = require('../private-intake.js');

(async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-private-intake-'));
  const codex = path.join(home, '.codex', 'sessions');
  fs.mkdirSync(path.dirname(codex), { recursive: true });
  fs.cpSync(path.join(__dirname, 'fixtures', 'sessions'), codex, { recursive: true });
  const claudeDir = path.join(home, '.claude', 'projects', 'fixture');
  fs.mkdirSync(claudeDir, { recursive: true });
  const rows = [
    { type: 'user', uuid: 'claude-1', timestamp: '2026-10-03T08:00:00Z', origin: { kind: 'human' }, message: { role: 'user', content: 'The final Home Depot retainer price is LKR 100,000 per month.' } },
    { type: 'user', uuid: 'claude-2', timestamp: '2026-10-03T08:01:00Z', origin: { kind: 'human' }, message: { role: 'user', content: 'The password is TEST-ONLY and this decision must never leave.' } },
  ];
  fs.writeFileSync(path.join(claudeDir, 'fixture.jsonl'), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
  const file = path.join(home, '.private-intake.json');
  const opts = { home, file, days: 5000, clients: [{ display: 'Home Depot', needles: ['home depot'] }] };
  const first = await refreshPrivateIntake(opts);
  assert.strictEqual(first.total, 2);
  assert.strictEqual(first.claude, 1);
  assert.strictEqual(first.codex, 1);
  assert.strictEqual(first.redacted, 2);
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const price = state.items.find(x => x.source === 'Claude');
  assert.strictEqual(price.kind, 'price');
  assert.strictEqual(price.client, 'Home Depot');
  mark(file, price.id, 'send-to-claude');
  const second = await refreshPrivateIntake(opts);
  assert.strictEqual(second.sendToClaude, 1);
  assert.ok(!JSON.stringify(second).includes('100,000'));
  assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600);
  fs.rmSync(home, { recursive: true, force: true });
  console.log('private-intake: 2 candidates, 2 private messages omitted, action preserved, counts only');
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
