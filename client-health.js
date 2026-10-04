#!/usr/bin/env node
'use strict';

/* Read-only bridge to Claude's two client-brain validators. The scripts and
   every brain.json remain owned by ~/bb-consultancy. This module passes an
   explicit file list, so BB_HOME can point at a sabotage copy without changing
   Node's HOME or touching the live client files. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

function brainFiles(home) {
  const root = path.join(home, 'bb-consultancy');
  let names = [];
  try { names = fs.readdirSync(root); } catch (e) { return []; }
  return names.map(name => path.join(root, name, 'brain.json')).filter(file => fs.existsSync(file)).sort();
}

function run(script, files, env) {
  if (!fs.existsSync(script)) return { ok: false, output: '', error: 'validator not found: ' + script };
  if (!files.length) return { ok: false, output: '', error: 'no client brain files found' };
  try {
    const output = cp.execFileSync(process.execPath, [script, ...files], {
      encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, BB_HOME: env.home },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output, error: null };
  } catch (error) {
    return { ok: false, output: String(error.stdout || ''), error: String(error.message || 'validator failed') };
  }
}

function runClientHealth(options) {
  const opts = options || {};
  const home = opts.home || process.env.BB_HOME || os.homedir();
  const scriptsHome = opts.scriptsHome || home;
  const files = opts.files || brainFiles(home);
  const schemaRoot = path.join(scriptsHome, 'bb-consultancy', 'client-brain-schema');

  const brainsRun = run(path.join(schemaRoot, 'validate.js'), files, { home });
  const valid = (brainsRun.output.match(/^✓ /gm) || []).length;
  const invalid = (brainsRun.output.match(/^✗ /gm) || []).length;
  const brains = {
    name: 'Client brains',
    ok: brainsRun.ok && valid === files.length && invalid === 0,
    detail: valid + ' of ' + files.length + ' valid' + (invalid ? ', ' + invalid + ' failed' : ''),
    newest: null,
  };

  const resultsRun = run(path.join(schemaRoot, 'results', 'verify_results.js'), files, { home });
  const last = resultsRun.output.trim().split('\n').filter(Boolean).pop() || resultsRun.error || 'results validator returned no summary';
  const m = last.match(/RESULTS TRACE:\s*(\d+) of (\d+) measured rows found in their source · (\d+) unknown rows · (\d+) of (\d+) clients carry results/);
  const results = {
    name: 'Client results',
    ok: !!(resultsRun.ok && m && m[1] === m[2]),
    detail: m ? m[1] + ' of ' + m[2] + ' measured rows traced, ' + m[3] + ' unknown rows, ' + m[4] + ' of ' + m[5] + ' clients carry results' : last.slice(0, 300),
    newest: null,
  };
  return { files: files.length, brains, results, raw: { brains: brainsRun, results: resultsRun } };
}

module.exports = { brainFiles, runClientHealth };

if (require.main === module) {
  const report = runClientHealth({});
  console.log((report.brains.ok ? 'ok ' : 'XX ') + report.brains.name + ': ' + report.brains.detail);
  console.log((report.results.ok ? 'ok ' : 'XX ') + report.results.name + ': ' + report.results.detail);
  process.exit(report.brains.ok && report.results.ok ? 0 : 1);
}
