#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { ingestCodexSessions, stableHash, userAuthoredPart, relationshipKinds } = require('../codex-ingest.js');

(async () => {
  const root = path.join(__dirname, 'fixtures', 'sessions');
  const report = await ingestCodexSessions({ root, clientNeedles: ['home depot'] });

  assert.strictEqual(report.version, 1);
  assert.strictEqual(report.available, true);
  assert.strictEqual(report.files.scanned, 3);
  assert.strictEqual(report.files.eligible, 1);
  assert.strictEqual(report.files.rejectedThreadSource, 2);
  assert.strictEqual(report.files.malformedMeta, 0);
  assert.strictEqual(report.files.unreadable, 0);
  assert.strictEqual(report.files.hashes.length, 1);

  assert.strictEqual(report.messages.seen, 6);
  assert.strictEqual(report.messages.accepted, 2);
  assert.strictEqual(report.messages.duplicate, 1);
  assert.strictEqual(report.messages.ambient, 1);
  assert.strictEqual(report.messages.nonText, 1);
  assert.strictEqual(report.messages.missingId, 1);
  assert.strictEqual(report.messages.malformed, 0);
  assert.strictEqual(report.messages.hashes.length, 2);
  assert.strictEqual(report.newest, '2026-10-02T08:03:00.000Z');

  assert.deepStrictEqual(report.redactions, { messages: 1, email: 1, phone: 1, password: 1, token: 1, dataUrl: 1 });
  for (const kind of ['client', 'market', 'skill', 'decision', 'question']) {
    assert.strictEqual(report.relationships[kind].count, 1, kind + ' relationship count');
    assert.deepStrictEqual(report.relationships[kind].messageHashes, [stableHash('msg-1')]);
  }
  assert.strictEqual(report.relationships.result.count, 0);
  assert.strictEqual(report.relationships.contradiction.count, 0);

  const serialised = JSON.stringify(report);
  for (const forbidden of [
    'Home Depot', 'alice@example.invalid', '+94 77 123 4567', 'TEST-ONLY',
    'sk-FAKEFAKEFAKEFAKE', 'SHOULDNEVERLEAVE', 'generated context only',
    'Developer content', 'Assistant content', 'sub-agent instruction',
  ]) assert.ok(!serialised.includes(forbidden), 'report leaked: ' + forbidden);
  assert.ok(report.files.hashes.every(x => /^[a-f0-9]{64}$/.test(x)));
  assert.ok(report.messages.hashes.every(x => /^[a-f0-9]{64}$/.test(x)));

  assert.strictEqual(userAuthoredPart('<in-app-browser-context source="ambient">x</in-app-browser-context>'), '');
  assert.strictEqual(userAuthoredPart('generated\n## My request:\nMake the decision'), 'Make the decision');
  assert.deepStrictEqual(relationshipKinds('A result failed and contradicts the earlier rule. Why?', []), ['result', 'question', 'contradiction']);

  const unavailable = await ingestCodexSessions({ root: path.join(root, 'does-not-exist') });
  assert.strictEqual(unavailable.available, false);
  assert.strictEqual(unavailable.files.scanned, 0);
  assert.strictEqual(unavailable.messages.accepted, 0);

  process.stdout.write('codex-ingest: all tests passed\n');
})().catch(error => {
  process.stderr.write('codex-ingest: test failed: ' + error.message + '\n');
  process.exitCode = 1;
});
