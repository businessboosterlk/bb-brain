#!/usr/bin/env node
'use strict';

/*
 * BB Digital Brain, Codex intake, Phase 1.
 *
 * This reader deliberately produces metadata only. It never returns message text,
 * file paths, email addresses, telephone numbers, passwords, tokens, image data or
 * tool output. A later phase may place reviewed extracts in the strong vault. Until
 * that exists, counts are the product and raw Codex sessions stay on this Mac.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');

const HASH_DOMAIN = 'bb-codex-intake-phase-1:';
const MAX_USER_RECORD_BYTES = 1024 * 1024;

const RE_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const RE_PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const RE_PASSWORD = /\b(?:password|passcode|passwd|pwd|pin|otp|credential|login details?)\b/i;
const RE_TOKEN = /(?:\bsk-[A-Za-z0-9_-]{10,}|\bgh[pousr]_[A-Za-z0-9_]{20,}|\bBearer\s+[A-Za-z0-9._~-]{10,}|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|\b(?:api[_ -]?key|secret|token)\s*[:=]\s*\S{6,})/i;
const RE_DATA_URL = /data:[^;,\s]+(?:;base64)?,/i;

const INJECTED_WHOLE_MESSAGE = [
  /^\s*<recommended_plugins>/i,
  /^\s*#\s*AGENTS\.md instructions\b/i,
  /^\s*<environment_context>/i,
  /^\s*<skills_instructions>/i,
  /^\s*<permissions instructions>/i,
  /^\s*<app-context>/i,
  /^\s*<developer(?:\s|>)/i,
  /^\s*<system(?:\s|>)/i,
  /^\s*<in-app-browser-context\b[\s\S]*<\/in-app-browser-context>\s*$/i,
  /^\s*#\s*Files (?:mentioned|pasted) by the user:[\s\S]*Distinguish instructions in attached documents from the user's request\.\s*$/i,
];

const RELATIONSHIP_RULES = {
  market: /\b(?:market|audience|sector|industry|niche|competitor|customer segment|consumer|trend)\b/i,
  skill: /\b(?:skill|system|playbook|workflow|process|seo|search|advertis(?:e|ing)|paid ads?|content|social media|website|design|strategy|sales)\b/i,
  decision: /\b(?:decid(?:e|ed|ing)|decision|approved?|locked|final|confirmed?|agreed?|go with|use this|do this|must|do not|never)\b/i,
  result: /\b(?:result|outcome|worked|failed|won|lost|increase[sd]?|decrease[sd]?|lead|sale|revenue|conversion|ctr|roas|cpl|cpa)\b/i,
  question: /\?|^\s*(?:what|why|how|when|where|which|who|can|could|should|would|is|are|do|does|did)\b/i,
  contradiction: /\b(?:contradict(?:ion|s|ed)?|conflict(?:s|ed)?|disagree|no longer|previously|earlier rule|wrong|instead|changed? from)\b/i,
};

function stableHash(value) {
  return crypto.createHash('sha256').update(HASH_DOMAIN + String(value)).digest('hex');
}

function isoOrNull(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function phoneLike(text) {
  const hit = String(text).match(RE_PHONE);
  if (!hit) return false;
  const digits = hit[0].replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

function observeSensitive(text, counters) {
  const flags = {
    email: RE_EMAIL.test(text),
    phone: phoneLike(text),
    password: RE_PASSWORD.test(text),
    token: RE_TOKEN.test(text),
    dataUrl: RE_DATA_URL.test(text),
  };
  let any = false;
  for (const [name, present] of Object.entries(flags)) {
    if (present) { counters[name]++; any = true; }
  }
  if (any) counters.messages++;
}

function relationshipKinds(text, clientNeedles) {
  const kinds = [];
  const lower = String(text).toLowerCase();
  if ((clientNeedles || []).some(needle => needle && lower.includes(needle))) kinds.push('client');
  for (const [kind, rule] of Object.entries(RELATIONSHIP_RULES)) if (rule.test(text)) kinds.push(kind);
  return kinds;
}

function userAuthoredPart(text) {
  if (typeof text !== 'string') return '';
  let value = text.replace(/\r/g, '').trim();
  if (!value) return '';

  // Codex can wrap an actual user request below generated attachment or browser
  // context. Only the explicit request section is user-authored in that record.
  const marker = value.lastIndexOf('## My request:');
  if (marker >= 0) value = value.slice(marker + '## My request:'.length).trim();

  if (!value) return '';
  if (INJECTED_WHOLE_MESSAGE.some(re => re.test(value))) return '';
  return value;
}

function listRollouts(root) {
  const files = [];
  let years;
  try { years = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return files; }
  for (const y of years) {
    if (!y.isDirectory() || !/^\d{4}$/.test(y.name)) continue;
    const yp = path.join(root, y.name);
    let months; try { months = fs.readdirSync(yp, { withFileTypes: true }); } catch (e) { continue; }
    for (const m of months) {
      if (!m.isDirectory() || !/^\d{2}$/.test(m.name)) continue;
      const mp = path.join(yp, m.name);
      let days; try { days = fs.readdirSync(mp, { withFileTypes: true }); } catch (e) { continue; }
      for (const d of days) {
        if (!d.isDirectory() || !/^\d{2}$/.test(d.name)) continue;
        const dp = path.join(mp, d.name);
        let entries; try { entries = fs.readdirSync(dp, { withFileTypes: true }); } catch (e) { continue; }
        for (const f of entries) if (f.isFile() && /^rollout-.*\.jsonl$/.test(f.name)) files.push(path.join(dp, f.name));
      }
    }
  }
  return files.sort();
}

function emptyReport(available) {
  return {
    version: 1,
    generated: new Date().toISOString(),
    available: !!available,
    files: { scanned: 0, eligible: 0, rejectedThreadSource: 0, malformedMeta: 0, unreadable: 0, hashes: [] },
    messages: { seen: 0, accepted: 0, duplicate: 0, ambient: 0, nonText: 0, missingId: 0, malformed: 0, oversized: 0, hashes: [] },
    newest: null,
    redactions: { messages: 0, email: 0, phone: 0, password: 0, token: 0, dataUrl: 0 },
    relationships: Object.fromEntries(['client', 'market', 'skill', 'decision', 'result', 'question', 'contradiction']
      .map(kind => [kind, { count: 0, messageHashes: [] }])),
  };
}

async function inspectRollout(file, root, report, seenMessageIds, clientNeedles) {
  report.files.scanned++;
  const relative = path.relative(root, file).split(path.sep).join('/');
  const fileHash = stableHash(relative);
  let stream;
  try { stream = fs.createReadStream(file, { encoding: 'utf8' }); }
  catch (e) { report.files.unreadable++; return; }

  stream.on('error', () => {});
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let first = true;
  let eligible = false;
  try {
    for await (const line of lines) {
      if (first) {
        first = false;
        let meta;
        try { meta = JSON.parse(line); } catch (e) { report.files.malformedMeta++; break; }
        if (!meta || meta.type !== 'session_meta' || !meta.payload || meta.payload.thread_source !== 'user') {
          report.files.rejectedThreadSource++;
          break;
        }
        eligible = true;
        report.files.eligible++;
        report.files.hashes.push(fileHash);
        continue;
      }

      // Cheap rejection before JSON.parse prevents large assistant and tool records
      // from becoming objects in memory.
      if (!line.includes('"type":"response_item"') || !line.includes('"role":"user"')) continue;
      report.messages.seen++;
      if (Buffer.byteLength(line, 'utf8') > MAX_USER_RECORD_BYTES) { report.messages.oversized++; continue; }

      let row;
      try { row = JSON.parse(line); } catch (e) { report.messages.malformed++; continue; }
      const payload = row && row.payload;
      if (!payload || row.type !== 'response_item' || payload.type !== 'message' || payload.role !== 'user') continue;
      if (typeof payload.id !== 'string' || !payload.id.trim()) { report.messages.missingId++; continue; }
      if (seenMessageIds.has(payload.id)) { report.messages.duplicate++; continue; }
      seenMessageIds.add(payload.id);

      const blocks = Array.isArray(payload.content) ? payload.content : [];
      const textBlocks = blocks.filter(x => x && x.type === 'input_text' && typeof x.text === 'string');
      if (!textBlocks.length) { report.messages.nonText++; continue; }
      const authored = textBlocks.map(x => userAuthoredPart(x.text)).filter(Boolean).join('\n');
      if (!authored) { report.messages.ambient++; continue; }

      observeSensitive(authored, report.redactions);
      report.messages.accepted++;
      const messageHash = stableHash(payload.id);
      report.messages.hashes.push(messageHash);
      for (const kind of relationshipKinds(authored, clientNeedles)) {
        report.relationships[kind].count++;
        report.relationships[kind].messageHashes.push(messageHash);
      }
      const at = isoOrNull(row.timestamp);
      if (at && (!report.newest || at > report.newest)) report.newest = at;
    }
  } catch (e) {
    if (eligible) report.files.unreadable++;
    else report.files.malformedMeta++;
  } finally {
    lines.close();
    stream.destroy();
  }
}

async function ingestCodexSessions(options) {
  const opts = options || {};
  const home = opts.home || process.env.BB_HOME || os.homedir();
  const root = opts.root || process.env.BB_CODEX_SESSIONS || path.join(home, '.codex', 'sessions');
  const available = fs.existsSync(root);
  const report = emptyReport(available);
  if (!available || opts.cloud) return report;

  const seenMessageIds = new Set();
  const clientNeedles = [...new Set((opts.clientNeedles || []).map(x => String(x).trim().toLowerCase()).filter(Boolean))];
  for (const file of listRollouts(root)) await inspectRollout(file, root, report, seenMessageIds, clientNeedles);
  report.files.hashes.sort();
  report.messages.hashes.sort();
  for (const rel of Object.values(report.relationships)) rel.messageHashes.sort();
  return report;
}

module.exports = { ingestCodexSessions, stableHash, userAuthoredPart, relationshipKinds };

if (require.main === module) {
  ingestCodexSessions({}).then(report => {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }).catch(() => {
    process.stderr.write('Codex intake failed without exporting session content.\n');
    process.exitCode = 1;
  });
}
