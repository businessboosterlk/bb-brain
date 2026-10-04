#!/usr/bin/env node
'use strict';

/* Read-only freshness scan for Claude-owned client brains. It never hides or
   rewrites a fact. It only marks a dated fact for a person to re-check. */
const fs = require('fs');
const path = require('path');
const os = require('os');

function parseDate(value) {
  let text = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) text += '-01';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(text + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) ? date : null;
}

function short(value) {
  if (value === null || value === undefined) return 'UNKNOWN';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 320);
}

function labelPath(value) {
  return String(value).replace(/^\$\./, '').replace(/\.\d+(?=\.|$)/g, '').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function scanBrain(brain, now) {
  const facts = [], results = [];
  const ageDays = value => {
    const date = parseDate(value);
    return date ? Math.floor((now.getTime() - date.getTime()) / 86400000) : null;
  };
  function walk(node, loc) {
    if (Array.isArray(node)) { node.forEach((value, index) => walk(value, loc + '.' + index)); return; }
    if (!node || typeof node !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(node, 'source') && Object.prototype.hasOwnProperty.call(node, 'value') && node.date) {
      const age = ageDays(node.date);
      if (age !== null && age > 90) facts.push({
        kind: 'fact', path: loc, label: labelPath(loc), date: String(node.date), ageDays: age,
        value: short(node.value), source: String(node.source || 'UNKNOWN').slice(0, 120),
      });
    }
    for (const [key, value] of Object.entries(node)) {
      if (loc === '$' && key === 'measurement') continue;
      walk(value, loc + '.' + key);
    }
  }
  walk(brain, '$');
  for (const row of (brain.measurement && brain.measurement.results) || []) {
    const date = (row.source && row.source.read) || (row.period && row.period.to) || null;
    const age = ageDays(date);
    if (age !== null && age > 45) results.push({
      kind: 'result', path: 'measurement.results.' + String(row.id || ''),
      label: [row.platform, row.metric].filter(Boolean).join(' · ') || String(row.id || 'result'),
      date: String(date), ageDays: age, value: row.status === 'unknown' ? 'UNKNOWN' : short(row.display),
      source: String((row.source && row.source.kind) || 'UNKNOWN').slice(0, 120),
    });
  }
  return { facts, results, items: facts.concat(results).sort((a, b) => b.ageDays - a.ageDays) };
}

function scanClientFreshness(options) {
  const opts = options || {};
  const home = opts.home || process.env.BB_HOME || os.homedir();
  const now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
  const root = path.join(home, 'bb-consultancy');
  const clients = [];
  let folders = [];
  try { folders = fs.readdirSync(root); } catch (e) { return { clients, totals: { clients: 0, facts: 0, results: 0 }, error: e.message }; }
  for (const slug of folders.sort()) {
    const file = path.join(root, slug, 'brain.json');
    if (!fs.existsSync(file)) continue;
    let brain;
    try { brain = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { continue; }
    const found = scanBrain(brain, now);
    clients.push({
      key: slug,
      name: (brain.meta && brain.meta.display_name) || slug,
      facts: found.facts.length,
      results: found.results.length,
      total: found.items.length,
      items: found.items,
    });
  }
  return {
    clients,
    totals: clients.reduce((sum, client) => ({ clients: sum.clients + (client.total ? 1 : 0), facts: sum.facts + client.facts, results: sum.results + client.results }), { clients: 0, facts: 0, results: 0 }),
    error: null,
  };
}

module.exports = { parseDate, scanBrain, scanClientFreshness };

if (require.main === module) {
  const report = scanClientFreshness({});
  for (const client of report.clients) console.log(client.name + ': ' + client.facts + ' client facts, ' + client.results + ' result rows may be out of date');
  console.log('CLIENT FRESHNESS: ' + report.totals.facts + ' facts and ' + report.totals.results + ' result rows may be out of date across ' + report.totals.clients + ' clients');
}
