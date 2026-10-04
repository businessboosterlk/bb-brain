#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runClientHealth } = require('../client-health.js');

const liveHome = process.env.BB_HOME || os.homedir();
const source = path.join(liveHome, 'bb-consultancy', 'sapphire-trails', 'brain.json');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-client-health-'));
const clientDir = path.join(testHome, 'bb-consultancy', 'sapphire-trails');
fs.mkdirSync(clientDir, { recursive: true });
const copy = path.join(clientDir, 'brain.json');
fs.copyFileSync(source, copy);

const green = runClientHealth({ home: testHome, scriptsHome: liveHome, files: [copy] });
assert.strictEqual(green.brains.ok, true, green.raw.brains.output || green.raw.brains.error);

fs.writeFileSync(copy, '{ broken copy only');
const red = runClientHealth({ home: testHome, scriptsHome: liveHome, files: [copy] });
assert.strictEqual(red.brains.ok, false, 'a broken brain copy must turn the Client brains row red');
assert.match(red.brains.detail, /1 failed/);

fs.rmSync(testHome, { recursive: true, force: true });
console.log('client-health sabotage: valid copy green, broken copy red');
