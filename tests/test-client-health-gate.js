#!/usr/bin/env node
'use strict';

/* Exact sabotage proof from the Phase 2 brief. A copied client brain is broken
   under a temporary BB_HOME. The live client files and live Brain are untouched. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const liveHome = process.env.BB_HOME || os.homedir();
const sourceRepo = path.resolve(__dirname, '..');
const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-health-home-'));
const bench = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-health-gate-'));

function link(name) {
  const source = path.join(liveHome, name), target = path.join(fakeHome, name);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(source, target);
}

try {
  for (const name of ['.claude', '.codex', 'Library', 'bb-brain-inbox', 'bb-brain-visuals', 'bb-intelligence-backup', 'bb-systems', 'bb-workflows', '.bb-brain-pass', '.bb-brain-vault-pass']) link(name);
  const liveConsultancy = path.join(liveHome, 'bb-consultancy');
  const fakeConsultancy = path.join(fakeHome, 'bb-consultancy');
  fs.mkdirSync(fakeConsultancy, { recursive: true });
  for (const name of fs.readdirSync(liveConsultancy)) {
    const source = path.join(liveConsultancy, name), target = path.join(fakeConsultancy, name);
    if (name === 'sapphire-trails') fs.cpSync(source, target, { recursive: true });
    else fs.symlinkSync(source, target);
  }
  fs.writeFileSync(path.join(fakeConsultancy, 'sapphire-trails', 'brain.json'), '{ broken sabotage copy only');

  fs.cpSync(sourceRepo, bench, { recursive: true, filter: source => !source.includes(path.sep + '.git' + path.sep) && path.basename(source) !== '.git' });
  const env = { ...process.env, BB_HOME: fakeHome };
  const built = cp.spawnSync(process.execPath, ['build-brain-data.js'], { cwd: bench, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  assert.strictEqual(built.status, 0, built.stderr || built.stdout);
  assert.match(built.stdout, /XX Client brains: 19 of 20 valid, 1 failed/);
  const gated = cp.spawnSync(process.execPath, ['verify-brain.js'], { cwd: bench, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  assert.notStrictEqual(gated.status, 0, 'the publish gate must refuse a red Client brains row');
  assert.match(gated.stdout, /XX client brains pass Claude's validator/);
  console.log('client-health gate sabotage: broken copy red, publish refused, live files untouched');
} finally {
  fs.rmSync(fakeHome, { recursive: true, force: true });
  fs.rmSync(bench, { recursive: true, force: true });
}
