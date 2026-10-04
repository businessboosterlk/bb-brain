#!/usr/bin/env node
'use strict';

const assert = require('assert');
const os = require('os');
const { scanClientFreshness } = require('../client-freshness.js');

const report = scanClientFreshness({ home: process.env.BB_HOME || os.homedir(), now: new Date('2026-10-04T00:00:00Z') });
assert.strictEqual(report.error, null);
const homeDepot = report.clients.find(client => client.key === 'home-depot-lk');
assert.ok(homeDepot, 'Home Depot client brain was not found');
assert.ok(homeDepot.items.some(item => item.date === '2026-06-29' && item.ageDays === 97), 'the 29 June Home Depot fact should be 97 days old');
assert.ok(report.clients.every(client => client.items.every(item => item.kind === 'result' ? item.ageDays > 45 : item.ageDays > 90)));
console.log('client-freshness: ' + report.totals.facts + ' stale facts, ' + report.totals.results + ' stale results, Home Depot 29 June spot check green');
