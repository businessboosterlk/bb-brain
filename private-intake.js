#!/usr/bin/env node
'use strict';

/* BB PRIVATE INTAKE, Tier B, local only.
   It finds messages that may contain a decision, result, price or correction.
   A person can classify them. Nothing is promoted automatically and only counts
   enter brain-data.js. The review file is mode 600 and gitignored. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const { listRollouts, userAuthoredPart } = require('./codex-ingest.js');

const ACTIONS = new Set(['pending', 'not-a-fact', 'send-to-claude', 'lesson']);
const RULES = [
  ['correction', /\b(?:correction|that is wrong|was wrong|not correct|should be|instead of|actually|no longer|changed from|do not say|never say|never mention)\b/i],
  ['price', /(?:\b(?:price|priced|fee|charge|budget|cost|quote|retainer|per month)\b|\b(?:LKR|USD|GBP|EUR|Rs\.?)\s*[\d,]+|[$£€]\s*[\d,]+)/i],
  ['result', /\b(?:result|outcome|worked|failed|won|lost|lead|sale|revenue|conversion|CTR|ROAS|CPL|CPA|increased?|decreased?|grew|dropped)\b/i],
  ['decision', /\b(?:decide|decided|decision|approved|locked|final|confirmed|agreed|go with|use this|do this|must|do not|never|the plan is|next step)\b/i],
];
const PRIVATE = /(?:\b(?:password|passcode|passwd|pwd|credential|login details?|otp|pin)\b|\bsk-[A-Za-z0-9_-]{10,}|\bgh[pousr]_[A-Za-z0-9_]{20,}|\bBearer\s+[A-Za-z0-9._~-]{10,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|\b(?:api[_ -]?key|secret|token)\s*[:=]\s*\S{6,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|data:[^;,\s]+(?:;base64)?,|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i;

function phoneLike(text) {
  const hit = String(text).match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  if (!hit) return false;
  const digits = hit[0].replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}
function containsPrivate(text) { return PRIVATE.test(String(text)) || phoneLike(text); }
function classifyCandidate(text) { for (const [kind, rule] of RULES) if (rule.test(String(text))) return kind; return null; }
function hash(value) { return crypto.createHash('sha256').update('bb-private-intake:' + String(value)).digest('hex').slice(0, 24); }
function preview(text) { return String(text).replace(/\s+/g, ' ').trim().slice(0, 600); }

function discoverClients(home) {
  const root = path.join(home, 'bb-consultancy'), clients = [];
  let names = []; try { names = fs.readdirSync(root); } catch (e) { return clients; }
  for (const slug of names) {
    const file = path.join(root, slug, 'brain.json');
    if (!fs.existsSync(file)) continue;
    let brain; try { brain = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { continue; }
    const display = (brain.meta && brain.meta.display_name) || slug.replace(/-/g, ' ');
    clients.push({ display, needles: [display.toLowerCase(), slug.toLowerCase(), slug.replace(/-/g, ' ').toLowerCase()] });
  }
  return clients;
}
function clientFor(text, clients) {
  const low = String(text).toLowerCase();
  const hits = clients.filter(client => client.needles.some(needle => needle && low.includes(needle))).map(client => client.display);
  return hits.length === 1 ? hits[0] : hits.length > 1 ? 'Multiple clients' : null;
}
function item(source, id, date, text, clients) {
  const kind = classifyCandidate(text); if (!kind) return null;
  return { id: hash(source + ':' + id), source, date: String(date || '').slice(0, 10) || null, kind, client: clientFor(text, clients), preview: preview(text), status: 'pending', reviewedAt: null };
}

async function eachLine(file, fn) {
  const stream = fs.createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try { for await (const line of lines) await fn(line); }
  finally { lines.close(); stream.destroy(); }
}

async function collectCodex(home, clients, counters, cutoff) {
  const root = path.join(home, '.codex', 'sessions'), items = [], seen = new Set();
  for (const file of listRollouts(root)) {
    let stat; try { stat = fs.statSync(file); } catch (e) { continue; }
    if (stat.mtimeMs < cutoff) continue;
    let first = true, eligible = false;
    await eachLine(file, line => {
      if (first) { first = false; try { const meta = JSON.parse(line); eligible = meta.type === 'session_meta' && meta.payload && meta.payload.thread_source === 'user'; } catch (e) {} return; }
      if (!eligible || !line.includes('"type":"response_item"') || !line.includes('"role":"user"') || line.length > 1024 * 1024) return;
      let row; try { row = JSON.parse(line); } catch (e) { return; }
      const p = row.payload; if (!p || p.type !== 'message' || p.role !== 'user' || !p.id || seen.has(p.id)) return; seen.add(p.id);
      if (!Number.isFinite(Date.parse(row.timestamp)) || Date.parse(row.timestamp) < cutoff) return;
      const text = (Array.isArray(p.content) ? p.content : []).filter(x => x && x.type === 'input_text').map(x => userAuthoredPart(x.text)).filter(Boolean).join('\n');
      if (!text) return; if (containsPrivate(text)) { counters.redacted++; return; }
      const found = item('Codex', p.id, row.timestamp, text, clients); if (found) items.push(found);
    });
  }
  return items;
}

async function collectClaude(home, clients, counters, cutoff) {
  const root = path.join(home, '.claude', 'projects'), files = [], items = [], seen = new Set();
  let dirs = []; try { dirs = fs.readdirSync(root); } catch (e) { return items; }
  for (const dir of dirs) {
    const full = path.join(root, dir); let names = [];
    try { if (!fs.statSync(full).isDirectory()) continue; names = fs.readdirSync(full); } catch (e) { continue; }
    for (const name of names) if (name.endsWith('.jsonl')) {
      const file = path.join(full, name); try { if (fs.statSync(file).mtimeMs >= cutoff) files.push(file); } catch (e) {}
    }
  }
  for (const file of files) await eachLine(file, line => {
    if (line.length < 30 || line.length > 20000 || !line.includes('"type":"user"')) return;
    let row; try { row = JSON.parse(line); } catch (e) { return; }
    if (row.type !== 'user' || row.isMeta || row.isSidechain || row.toolUseResult || row.sourceToolUseID || row.sourceToolAssistantUUID || !row.origin || row.origin.kind !== 'human' || !row.uuid || seen.has(row.uuid)) return;
    seen.add(row.uuid);
    if (!Number.isFinite(Date.parse(row.timestamp)) || Date.parse(row.timestamp) < cutoff) return;
    const content = row.message && row.message.content;
    let text = typeof content === 'string' ? content : Array.isArray(content) ? content.filter(x => x && x.type === 'text').map(x => x.text).join(' ') : '';
    text = text.trim();
    if (!text || text.startsWith('<') || /^(This session is being continued|The user|Analysis:|Summary:|\[Request interrupted|Result of|Contents of|Command|Tool ran)/.test(text) || text.includes('system-reminder')) return;
    if (containsPrivate(text)) { counters.redacted++; return; }
    const found = item('Claude', row.uuid, row.timestamp, text, clients); if (found) items.push(found);
  });
  return items;
}

function summaryOf(state) {
  const items = state.items || [];
  const count = status => items.filter(x => x.status === status).length;
  return {
    available: true, updated: state.updated, total: items.length,
    pending: count('pending'), notAFact: count('not-a-fact'), sendToClaude: count('send-to-claude'), lesson: count('lesson'),
    claude: items.filter(x => x.source === 'Claude').length, codex: items.filter(x => x.source === 'Codex').length, redacted: state.redacted || 0,
  };
}

async function refreshPrivateIntake(options) {
  const opts = options || {}, home = opts.home || process.env.BB_HOME || os.homedir();
  const file = opts.file || path.join(__dirname, '.private-intake.json');
  /* A review queue is for the next decision, not an archive. Two weeks keeps the
     first run useful while reviewed older items remain preserved below. */
  const days = Number.isFinite(opts.days) ? opts.days : 14, cutoff = Date.now() - days * 86400000;
  const clients = opts.clients || discoverClients(home), counters = { redacted: 0 };
  let old = { items: [] }; try { old = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
  const previous = new Map((old.items || []).map(x => [x.id, x]));
  const found = (await Promise.all([collectClaude(home, clients, counters, cutoff), collectCodex(home, clients, counters, cutoff)])).flat();
  const deduped = new Map();
  for (const candidate of found) {
    const prior = previous.get(candidate.id);
    if (prior && ACTIONS.has(prior.status)) { candidate.status = prior.status; candidate.reviewedAt = prior.reviewedAt || null; }
    deduped.set(candidate.id, candidate);
  }
  for (const prior of previous.values()) if (prior.status !== 'pending' && !deduped.has(prior.id)) deduped.set(prior.id, prior);
  const state = { version: 1, tier: 'B', updated: new Date().toISOString(), redacted: counters.redacted, items: [...deduped.values()].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 1200) };
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch (e) {}
  return summaryOf(state);
}

function mark(file, id, status) {
  if (!ACTIONS.has(status) || status === 'pending') throw new Error('action must be not-a-fact, send-to-claude or lesson');
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const found = (state.items || []).find(x => x.id === id); if (!found) throw new Error('intake item not found');
  found.status = status; found.reviewedAt = new Date().toISOString();
  state.updated = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  return found;
}

module.exports = { refreshPrivateIntake, classifyCandidate, containsPrivate, summaryOf, mark };

if (require.main === module) (async () => {
  const file = path.join(__dirname, '.private-intake.json'), [cmd = 'list', a, b] = process.argv.slice(2);
  if (cmd === 'refresh') { const s = await refreshPrivateIntake({ file }); console.log('private intake: ' + s.pending + ' pending of ' + s.total + ', ' + s.redacted + ' private messages omitted'); return; }
  if (cmd === 'mark') { const changed = mark(file, a, b); console.log(changed.id + ' marked ' + changed.status); return; }
  const state = JSON.parse(fs.readFileSync(file, 'utf8')), wanted = a || 'pending';
  for (const x of state.items.filter(x => wanted === 'all' || x.status === wanted)) console.log('[' + x.id + '] ' + x.date + ' · ' + x.source + ' · ' + x.kind + (x.client ? ' · ' + x.client : '') + '\n  ' + x.preview + '\n');
})().catch(error => { console.error('private intake failed: ' + error.message); process.exitCode = 1; });
