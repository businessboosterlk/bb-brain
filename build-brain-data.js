#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   BB DIGITAL BRAIN - data generator
   Scans the REAL skill files and learning files and emits brain-data.js.
   Never hand-edit brain-data.js: it is overwritten on every run.
   Auto-runs from ~/bb-intelligence-backup/bb-end.sh every evening.
   Manual refresh: node build-brain-data.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const os = require('os');
const HOME = os.homedir();

/* ── data sources ── */
const LOCAL_SKILLS = path.join(HOME, '.claude/skills');
const PLUGIN_ROOT = path.join(HOME, 'Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin');

/* learnings file -> skill it levels up (explicit map, per the brief) */
const LEARNINGS_MAP = {
  'bb-web-learnings.md': 'bb-web-master',
  'bb-deck-learnings.md': 'bb-deck-builder',
  'bb-sales-learnings.md': 'bb-growth-sales',
  'bb-content-plan-learnings.md': 'bb-content-plan-builder',
  'bb-blog-pack-learnings.md': 'bb-blog-pack-builder',
  'bb-motion-learnings.md': 'bb-motion-master',
  'bb-ditto-learnings.md': 'bb-ditto',
  'bb-vertical-learnings.md': 'bb-vertical-blueprint',
  'bb-quality-gate-learnings.md': 'bb-quality-gate',
  'bb-say-it-out-loud-learnings.md': 'bb-say-it-out-loud',
  'bb-content-pipeline-learnings.md': 'bb-content-pipeline',
};
const EXTRA_LEARNINGS = [
  { file: path.join(HOME, 'bb-systems/FORGE-LEARNINGS.md'), skill: 'bb-system-forge' },
  /* the cross-client Mother Brain: every consultancy engagement's lessons */
  { file: path.join(HOME, 'bb-consultancy/LEARNINGS.md'), skill: 'bb-mother-brain' },
];

/* ── CLIENT ATTRIBUTION ──
   Roster = real client folders in ~/bb-consultancy (a new folder auto-joins the roster)
   + alias variants for how names actually appear inside learning entries.
   Attribution is EXTRACTED from entry text - nothing is typed here except spelling variants. */
const CLIENT_ALIASES = {
  'auto-museum': ['auto museum'], 'ceylon-carriers-travels': ['ceylon carrier', 'cct'],
  'clove-beach-wadduwa': ['clove'], 'fusion-media': ['fusion'],
  'home-depot-lk': ['home depot', 'homedepot', 'hd quote'], 'lgl': ['lgl'],
  'macson': ['macson'], 'playzone': ['playzone'], 'sapphire-trails': ['sapphire', 'saphire'],
  'sastho-lk': ['sastho'], 'show-car-detailers': ['show car', 'scd', 'hussain'],
  'waterman': ['waterman'], 'waverley': ['waverley'],
  /* system/retainer clients without consultancy folders */
  'bswl': ['bswl', 'leon'], 'tt-mobile': ['tt mobile'], 'ummat': ['ummat'],
  'bellvantage': ['bellvantage'], 'cherry-fish': ['cherry fish'],
  'cherry-kitchen': ['cherry kitchen'], 'excellent-mobile': ['excellent mobile'],
  'square-1-ai': ['square 1'], 'crab-island': ['crab island'],
  'guiding-steps': ['guiding steps'], 'hire-panther': ['hire panther'],
  'puwakaramba': ['puwakaramba'], 'seekers': ['seekers'], 'seven-summits-rwanda': ['seven summits'],
};
const DISPLAY_OVERRIDES = {
  'bswl': 'BSWL (Leon)', 'lgl': 'LGL', 'tt-mobile': 'TT Mobile', 'square-1-ai': 'Square 1 AI',
  'sastho-lk': 'Sastho', 'home-depot-lk': 'Home Depot', 'ceylon-carriers-travels': 'Ceylon Carriers',
  'show-car-detailers': 'Show Car Detailers', 'clove-beach-wadduwa': 'Clove Beach',
  'excellent-mobile': 'Excellent Mobile', 'potbiriyani': 'Pot Biriyani', 'beys-international': 'Beys International',
};
function buildRoster() {
  const roster = {}; // key -> display name
  const cdir = path.join(HOME, 'bb-consultancy');
  /* WORKING FOLDERS ARE NOT CLIENTS (2026-08-31): the auto-join rule turned
     cards, contracts and the mold folders into client rows, and BB sat in its
     own client table. A folder here is tooling or BB itself, never a client. */
  const skipFolders = ['design-test', '__pycache__', 'business-booster'];
  /* EVIDENCE RULE (2026-09-05, after "Questionnaire" and "Fable Upgrade" became
     clients five days after the last name list was written): a folder is a client
     only if it carries client knowledge, a BRAIN.md or an ADS.md, or is registered
     by alias below. Tooling folders carry neither, so a list of their names is
     never needed again. business-booster carries an ADS.md and is still BB itself. */
  const hasEvidence = d => fs.existsSync(path.join(cdir, d, 'BRAIN.md')) || fs.existsSync(path.join(cdir, d, 'ADS.md')) || Object.prototype.hasOwnProperty.call(CLIENT_ALIASES, d);
  if (fs.existsSync(cdir)) for (const d of fs.readdirSync(cdir)) {
    try {
      if (d.startsWith('.') || skipFolders.includes(d) || !fs.statSync(path.join(cdir, d)).isDirectory()) continue;
      if (!hasEvidence(d)) continue;
      roster[d] = DISPLAY_OVERRIDES[d] || d.replace(/-lk$/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    } catch (e) {}
  }
  for (const k of Object.keys(CLIENT_ALIASES)) if (!roster[k])
    roster[k] = DISPLAY_OVERRIDES[k] || k.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return roster;
}
const ROSTER = buildRoster();
function clientsIn(text) {
  const t = (text || '').toLowerCase(); const hits = [];
  for (const [key, display] of Object.entries(ROSTER)) {
    const names = [display.toLowerCase(), ...(CLIENT_ALIASES[key] || [])];
    if (names.some(n => t.includes(n))) hits.push(display);
  }
  return hits;
}

/* ── the 8 clusters ── */
const CLUSTERS = [
  { id: 'web', name: 'Web / Build', color: '#5B9DFF' },
  { id: 'seo', name: 'SEO & AI visibility', color: '#2DD4BF' },
  { id: 'sales', name: 'Sales / Growth', color: '#F5A623' },
  { id: 'strategy', name: 'Strategy / Consultancy', color: '#A78BFA' },
  { id: 'content', name: 'Content / Creative', color: '#F472B6' },
  { id: 'ads', name: 'Paid ads', color: '#F06A6A' },
  { id: 'systems', name: 'Systems / Ops', color: '#4ADE80' },
  { id: 'intel', name: 'Intelligence / Memory', color: '#C9D4E8' },
];

/* explicit skill -> cluster overrides (name wins over keyword rules) */
const CLUSTER_OVERRIDES = {
  // web / build
  'bb-web-master': 'web', 'bb-motion-master': 'web', 'bb-motion': 'web',
  'webdev-master': 'web', 'webdev-animation': 'web', 'webdev-cms': 'web',
  'webdev-database': 'web', 'webdev-mobile': 'web', 'webdev-nextjs': 'web',
  'webdev-performance': 'web', 'webdev-react': 'web', 'webdev-rbac-permission-fix': 'web',
  'webdev-wordpress-handoff': 'web', 'bb-cro-strategy': 'web', 'ui-styling': 'web',
  'ui-ux-pro-max': 'web',
  // seo & ai visibility
  'bb-seo-master': 'seo', 'bb-seo-knowledge': 'seo', 'bb-seo-geo-blog': 'seo',
  'bb-seo-geo-blog-plus': 'seo', 'bb-geo-master': 'seo', 'bb-blog-engine': 'seo',
  'bb-backlink-engine': 'seo', 'bb-web-seo-foundation': 'seo', 'webdev-seo': 'seo',
  // sales / growth
  'bb-growth-sales': 'sales', 'bb-sales-strategy': 'sales', 'bb-sales-playbook': 'sales',
  'bb-prospecting': 'sales', 'bb-pitch-deck-builder': 'sales', 'bb-client-retention': 'sales',
  'bb-customer-retention': 'sales', 'bb-lifecycle-crm': 'sales', 'bb-onboarding': 'sales',
  // strategy / consultancy
  'bb-consultancy-master': 'strategy', 'bb-strategy-synthesizer': 'strategy',
  'bb-competitor-analysis': 'strategy', 'bb-icp-builder': 'strategy',
  'bb-digital-marketing-strategy': 'strategy', 'bb-digital-marketing-fundamentals': 'strategy',
  'bb-content-strategy': 'strategy', 'bb-systemization': 'strategy',
  'bb-measurement-analytics': 'strategy', 'bb-analytics-reporting': 'strategy',
  'bb-reporting-accuracy': 'strategy', 'bb-psychology': 'strategy', 'deep-research': 'strategy',
  // content / creative
  'bb-content-plan-builder': 'content', 'bb-content-planning': 'content',
  'bb-caption-writer': 'content', 'bb-post-formulas': 'content',
  'bb-script-system': 'content', 'bb-script-intelligence': 'content',
  'bb-video-formulas': 'content', 'bb-video-viral-expert': 'content',
  'bb-say-it-out-loud': 'content', 'bb-blog-pack-builder': 'content',
  'bb-deck-builder': 'content', 'bb-deck-review': 'content', 'bb-canva-edits': 'content',
  'bb-graphic-brief': 'content', 'bb-editor-brief': 'content',
  'bb-ghostwriter-personal': 'content', 'bb-typography': 'content', 'bb-writing-style': 'content',
  'bb-slide-presenter': 'content', 'banner-design': 'content', 'design': 'content',
  'design-system': 'content', 'slides': 'content', 'brand': 'content',
  'pptx': 'content', 'docx': 'content', 'pdf': 'content', 'pdf-reading': 'content', 'xlsx': 'content',
  'dataviz': 'content', 'artifact-design': 'content', 'bb-visual-qa': 'content', 'bb-polish': 'content',
  // paid ads
  'bb-ads-strategy': 'ads', 'bb-meta-ads-expert': 'ads', 'bb-meta-ads-expert-plus': 'ads',
  'bb-meta-ads-copilot': 'ads', 'bb-google-ads-expert': 'ads', 'bb-tiktok-ads-expert': 'ads',
  // systems / ops
  'bb-systems-master': 'systems', 'bb-system-forge': 'systems', 'bb-system-debug': 'systems',
  'bb-systems-architect': 'systems', 'bb-vertical-blueprint': 'systems',
  'bb-feature-scoper': 'systems', 'bb-quality-gate': 'systems', 'bb-quality-standards': 'systems',
  'bb-code-review': 'systems', 'bb-smm-agent': 'systems', 'bb-trainer': 'systems',
  'schedule': 'systems', 'skill-creator': 'systems', 'setup-cowork': 'systems',
  'video-project-manager-template': 'systems', 'bb-ditto': 'systems', 'bb-elevate': 'systems',
  // intelligence / memory
  'bb-brain': 'intel', 'bb-client-brain': 'intel', 'bb-mother-brain': 'intel',
  'bb-fable-mind': 'intel', 'bb-ai-prompt-master': 'intel', 'bb-token-saver': 'intel',
  'consolidate-memory': 'intel', 'bb-anti-ai-tells': 'systems',
};

/* keyword fallback when a skill is not in the override map */
function clusterFor(name, desc) {
  if (CLUSTER_OVERRIDES[name]) return CLUSTER_OVERRIDES[name];
  const d = (name + ' ' + desc).toLowerCase();
  if (/(seo|geo|aeo|backlink|search visib)/.test(d)) return 'seo';
  if (/(website|web app|landing|frontend|html|css)/.test(d)) return 'web';
  if (/(ads|meta|tiktok ad|google ad|campaign)/.test(d)) return 'ads';
  if (/(sell|sales|pitch|proposal|prospect|retention|crm)/.test(d)) return 'sales';
  if (/(strategy|consultanc|audit|icp|competitor|analytics)/.test(d)) return 'strategy';
  if (/(caption|script|video|deck|design|content|blog|graphic|writ)/.test(d)) return 'content';
  if (/(memory|brain|knowledge|prompt)/.test(d)) return 'intel';
  return 'systems';
}

/* ── parse a SKILL.md frontmatter ── */
function parseSkill(file, src) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const nameM = fm[1].match(/^name:\s*(.+)$/m);
  if (!nameM) return null;
  const name = nameM[1].trim().replace(/^["']|["']$/g, '');
  // description: quoted single-line, or plain possibly wrapping until the next key
  let desc = '';
  const dM = fm[1].match(/(?:^|\n)description:\s*([\s\S]*?)(?=\n[a-zA-Z_-]+:\s|$)/);
  if (dM) desc = dM[1].replace(/^\s*[>|][-+]?\s*/, '').replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '');
  return { name, desc, src };
}

/* ── extract a short "say this to use it" hint from the description ── */
function triggerFor(name, desc) {
  // 1. first quoted phrase after the word Trigger/Activates
  let m = desc.match(/[Tt]rigger[^"']*["']([^"']{4,70})["']/);
  if (!m) m = desc.match(/[Aa]ctivat\w+[^"']*["']([^"']{4,70})["']/);
  if (!m) m = desc.match(/["']([^"']{6,60})["']/); // any early quoted phrase
  if (m) return m[1].trim();
  // 2. "Activates when asked to X" style clause
  m = desc.match(/[Aa]ctivates? when(?: asked to| anyone| someone)?\s+([^.]{8,80})/);
  if (m) return m[1].trim();
  m = desc.match(/[Uu]se (?:this skill |it )?(?:when|for)\s+([^.]{8,80})/);
  if (m) return m[1].trim();
  return '';
}

/* ── scan skills ── */
const skills = [];
const seen = new Set();
function scanDir(dir, src) {
  if (!fs.existsSync(dir)) return;
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    const s = parseSkill(f, src);
    if (!s || seen.has(s.name)) continue;
    seen.add(s.name);
    s.mtime = fs.statSync(f).mtime.toISOString().slice(0, 10); // real file date = when this capability landed/last changed
    skills.push(s);
  }
}
scanDir(LOCAL_SKILLS, 'local');
if (fs.existsSync(PLUGIN_ROOT)) {
  for (const a of fs.readdirSync(PLUGIN_ROOT)) {
    const lvl = path.join(PLUGIN_ROOT, a);
    if (!fs.statSync(lvl).isDirectory()) continue;
    for (const b of fs.readdirSync(lvl)) {
      const sk = path.join(lvl, b, 'skills');
      if (fs.existsSync(sk)) scanDir(sk, 'plugin');
    }
  }
}

/* ── scan learnings ── */
function parseLearnings(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { entries: [], undated: 0 }; }
  /* An entry = one battle-tested iteration. Three real formats exist across the files:
     1. "### Title" or "### YYYY-MM-DD Title"   (web, deck, sales, forge style)
     2. "## YYYY-MM-DD Title"                   (motion, content-plan, blog-pack style)
     3. "- YYYY-MM-DD Title" dated log bullets  (ditto style)
     Undated bullets ("(seed)" notes) are notes, NOT iterations - never counted. */
  const entries = []; let undated = 0;
  for (const line of raw.split('\n')) {
    let t = null, requireDate = false;
    let m = line.match(/^###\s+(.*)/);
    if (m) t = m[1].trim();
    else if ((m = line.match(/^##\s+(\d{4}-\d{2}-\d{2}.*)/))) t = m[1].trim();
    else if ((m = line.match(/^\s*[-*]\s+(\d{4}-\d{2}-\d{2}.*)/))) { t = m[1].trim(); requireDate = true; }
    if (t === null) {
      // first non-empty body line after a header = the entry's one-line hint (for before-you-start cards)
      const last = entries[entries.length - 1];
      const tl = line.trim();
      if (last && !last.hint && tl && !tl.startsWith('#')) last.hint = tl.replace(/^[-*>]\s*/, '').slice(0, 160);
      continue;
    }
    const dm = t.match(/^(\d{4}-\d{2}-\d{2})\s*[-–—:·]?\s*(.*)/);
    // explicit outcome tags only - [worked] / [failed] in the title. Never inferred.
    const om = t.match(/\[(worked|failed)\]/i);
    const outcome = om ? om[1].toLowerCase() : null;
    const bm = t.match(/\(by ([^)]{2,30})\)/i);      // "(by Name)" = who taught the brain this
    const by = bm ? bm[1].trim() : null;
    if (dm) entries.push({ date: dm[1], summary: (dm[2] || t).slice(0, 140), outcome, by });
    else if (!requireDate) { undated++; entries.push({ date: null, summary: t.slice(0, 140), outcome, by }); }
  }
  return { entries, undated };
}

/* ── CHAT MEMORY: what Thulaib and Claude talk about distills into the auto-memory
   folder (one fact per file, saved during real chat sessions). Each file becomes a
   brain entry under bb-brain (Intelligence cluster): date = the file's real mtime,
   summary = its description, clients extracted from the FULL body text. ── */
/* FIXED 2026-08-30: this pointed at -Users-thulaibhassen-learn-claude-code, the stale
   98-file snapshot frozen 30 July, while live sessions write to -Users-thulaibhassen.
   Third copy of the same wrong path (CLAUDE.md and sync.sh were fixed 31 July): when a
   path is found wrong, grep the whole machine for the string. BB_MEMORY_DIR override
   exists ONLY so the freshness guard below can be proven against the stale dir. */
const MEMORY_DIR = process.env.BB_MEMORY_DIR || path.join(HOME, '.claude/projects/-Users-thulaibhassen/memory');
function chatMemoryEntries() {
  const entries = [];
  if (!fs.existsSync(MEMORY_DIR)) return entries;
  for (const f of fs.readdirSync(MEMORY_DIR)) {
    if (!f.endsWith('.md') || f === 'MEMORY.md') continue;
    try {
      const full = path.join(MEMORY_DIR, f);
      const raw = fs.readFileSync(full, 'utf8');
      const dm = raw.match(/(?:^|\n)description:\s*([\s\S]*?)(?=\n[a-zA-Z_-]+:\s|\n---)/);
      const summary = (dm ? dm[1] : f.replace('.md', '')).replace(/^\s*[>|][-+]?\s*/, '').replace(/\s+/g, ' ').trim().replace(/^["']|["']$/g, '').slice(0, 140);
      entries.push({ date: fs.statSync(full).mtime.toISOString().slice(0, 10), summary, body: raw, via: 'chat' });
    } catch (e) {}
  }
  return entries;
}

const learningsBySkill = {};
let totalUndated = 0;
const allFiles = [];
for (const [fname, skill] of Object.entries(LEARNINGS_MAP))
  allFiles.push({ file: path.join(HOME, fname), skill });
allFiles.push(...EXTRA_LEARNINGS);
/* ── AUTO-GLOB (2026-08-30): every ~/bb-*-learnings.md joins the brain automatically.
   The hand map above had 11 files while 25 sat on disk, so 14 whole domains (voice,
   board, scout, prompt-forge and the rest) never reached the brain. A NEW learnings
   file now needs no registration. Irregular names map here; a name that derives to a
   skill the scan does not know still ingests and prints a warning below. ── */
const LEARNINGS_IRREGULAR = {
  'bb-number-learnings.md': 'bb-number-lock',
  'bb-migration-learnings.md': 'bb-machine-migration',
  'bb-screening-learnings.md': 'bb-system-scan',
};
{
  const mapped = new Set(Object.keys(LEARNINGS_MAP));
  for (const f of fs.readdirSync(HOME).filter(f => /^bb-.+-learnings\.md$/.test(f)))
    if (!mapped.has(f)) allFiles.push({ file: path.join(HOME, f), skill: LEARNINGS_IRREGULAR[f] || f.replace(/-learnings\.md$/, '') });
}
for (const { file, skill } of allFiles) {
  const { entries, undated } = parseLearnings(file);
  if (!entries.length) continue;
  totalUndated += undated;
  (learningsBySkill[skill] = learningsBySkill[skill] || []).push(...entries);
}
const chatMem = chatMemoryEntries();
if (chatMem.length) (learningsBySkill['bb-brain'] = learningsBySkill['bb-brain'] || []).push(...chatMem);

/* ── MEMORY FRESHNESS GUARD (2026-08-30). Memories are written most working days,
   so a newest-file older than 21 days means the build is reading a dead folder,
   which is exactly the fault that just cost a month of learning. Per the
   encryption lesson below: a build that cannot do its job must FAIL, not shrug. ── */
{
  const newest = chatMem.map(e => e.date).sort().pop() || 'none';
  const ageDays = newest === 'none' ? Infinity : Math.round((Date.now() - new Date(newest)) / 86400000);
  if (ageDays > 21) {
    console.error('MEMORY SOURCE STALE - newest memory is ' + newest + ' (' + ageDays + ' days old). ' +
      'The build is almost certainly reading a dead folder (' + MEMORY_DIR + '). Refusing to publish a frozen brain.');
    process.exit(1);
  }
  console.log('chat memories:', chatMem.length, 'facts, newest', newest);
}

/* ── THE PATTERN BANKS (2026-08-30): PATTERNS.md and AD-PATTERNS.md, the distilled
   layer the whole consultancy reasons from, never reached the brain before. Each
   graded entry becomes a brain entry under its owning skill with the TIER stated in
   the summary, so search and dossiers can quote what BB has actually proven. ── */
function marketPatternEntries(fileName, via) {
  /* 2026-09-06: the same parser reads synthesis/PATTERNS-cloud.md, written by the Sunday cloud routine */
  const file = path.join(HOME, 'bb-consultancy', fileName || 'PATTERNS.md');
  let raw; try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const mtime = fs.statSync(file).mtime.toISOString().slice(0, 10);
  const entries = [];
  for (const block of raw.split(/\n(?=### )/)) {
    const h = block.match(/^### (P-\d+[^\n]*)/); if (!h) continue;
    const tier = (block.match(/\*\*Tier:\*\*\s*(HYPOTHESIS|PATTERN|PRINCIPLE)[^\n]*/) || [])[0] || '';
    const sentence = (block.match(/\*\*Pattern:\*\*\s*([^\n]+)/) || [])[1] || '';
    const date = (block.match(/\*\*Last strengthened:\*\*\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || mtime;
    const retired = /RETIRED/.test(block.slice(0, 200));
    if (retired || !sentence) continue;
    entries.push({ date, summary: (h[1].trim() + '. ' + sentence.trim()).slice(0, 220) + (tier ? ' [' + tier.replace(/\*\*/g, '').replace('Tier: ', '') + ']' : ''), body: block, via: via || 'file' });
  }
  return entries;
}
function adPatternEntries() {
  const file = path.join(HOME, 'bb-consultancy/AD-PATTERNS.md');
  let raw; try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const mtime = fs.statSync(file).mtime.toISOString().slice(0, 10);
  const entries = [];
  for (const ln of raw.split('\n')) {
    const t = ln.replace(/^[`\-\*\s]+/, '').trim();
    if (!/^AP-\d+/.test(t) || /^AP-###/.test(t)) continue;
    entries.push({ date: mtime, summary: t.replace(/`/g, '').slice(0, 220), body: t, via: 'file' });
  }
  return entries;
}
{
  const mp = marketPatternEntries().concat(marketPatternEntries('synthesis/PATTERNS-cloud.md', 'cloud'));
  if (mp.length) (learningsBySkill['bb-mother-brain'] = learningsBySkill['bb-mother-brain'] || []).push(...mp);
  const ap = adPatternEntries();
  if (ap.length) (learningsBySkill['bb-meta-ads-expert-plus'] = learningsBySkill['bb-meta-ads-expert-plus'] || []).push(...ap);
  console.log('pattern banks:', mp.length, 'market patterns,', ap.length, 'ad patterns');
}

/* ── assemble ── */
const DAY = 86400000;
const now = new Date();
const out = { generated: now.toISOString(), clusters: CLUSTERS, skills: [], timeline: [], undatedCount: totalUndated };

/* ── STEP 2: confidence + decay, computed honestly from the entries themselves ──
   confirmed = explicit repetition marker in the text, OR 2+ sibling entries on the same topic.
   emerging  = exactly one sibling entry on the same topic.
   single    = seen once, never re-encountered.
   stale     = dated entry older than 90 days with NO newer same-topic entry re-confirming it. */
const STOPWORDS = new Set(['the','this','that','with','from','have','when','what','client','skill','never','always','every','their','them','into','over','only','after','before','more','than','then','they','were','been','made','make','need','needs','also','because','which','would','should','could','about','does','done','some','same','just','like','very','each','must','uses','used','using','work','works','page','build','built']);
const kwOf = t => { const set = new Set(); for (const w of (String(t).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])) if (!STOPWORDS.has(w)) set.add(w); return set; };
const kwOverlap = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) { n++; if (n >= 2) return true; } return false; };
const CONF_MARK = /\b(again|always|every time|keeps? (happening|working)|confirmed|re-?tested|second time|twice|proven|standing rule|rule now)\b/i;
const STALE_DAYS = 90;
function scoreConfidence(entries, nowDate) {
  const kws = entries.map(e => kwOf(e.summary));
  entries.forEach((e, i) => {
    let siblings = 0;
    for (let j = 0; j < entries.length; j++) if (j !== i && kwOverlap(kws[i], kws[j])) siblings++;
    e.conf = (CONF_MARK.test(e.summary) || siblings >= 2) ? 'confirmed' : siblings === 1 ? 'emerging' : 'single';
    if (e.date && (nowDate - new Date(e.date)) / 86400000 > STALE_DAYS) {
      let reconfirmed = false;
      for (let j = 0; j < entries.length; j++)
        if (j !== i && entries[j].date && entries[j].date > e.date && kwOverlap(kws[i], kws[j])) { reconfirmed = true; break; }
      e.stale = !reconfirmed;
    } else e.stale = false;
  });
}

for (const s of skills) {
  const cluster = clusterFor(s.name, s.desc);
  const entries = learningsBySkill[s.name] || [];
  scoreConfidence(entries, now);
  const dated = entries.filter(e => e.date).sort((a, b) => b.date.localeCompare(a.date));
  const latest = dated[0] || null;
  const clientCount = {};
  for (const e of entries) for (const c of clientsIn(e.body || e.summary)) clientCount[c] = (clientCount[c] || 0) + 1;
  out.skills.push({
    name: s.name, desc: s.desc.slice(0, 320), cluster, src: s.src, mtime: s.mtime,
    hasLoop: !!learningsBySkill[s.name],
    depth: entries.length,
    latest: latest ? { date: latest.date, summary: latest.summary } : null,
    trigger: triggerFor(s.name, s.desc),
    quiet: latest ? (now - new Date(latest.date)) / DAY > 60 : false,
    clients: Object.entries(clientCount).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ c, n })),
    /* STEP 6: entry headers (dated first, undated seeds after) for before-you-start cards */
    notes: entries.length ? [...dated, ...entries.filter(e => !e.date)].slice(0, 40).map(e => ({ d: e.date, t: e.summary, h: e.hint })) : undefined,
    conf: {
      single: entries.filter(e => e.conf === 'single').length,
      emerging: entries.filter(e => e.conf === 'emerging').length,
      confirmed: entries.filter(e => e.conf === 'confirmed').length,
      stale: entries.filter(e => e.stale).length,
    },
  });
  for (const e of dated) out.timeline.push({ date: e.date, skill: s.name, cluster, summary: e.summary, clients: clientsIn(e.body || e.summary), via: e.via || 'file', conf: e.conf, stale: e.stale, outcome: e.outcome || null, by: e.by || null });
}
out.timeline.sort((a, b) => b.date.localeCompare(a.date));

/* ══ CHAT HARVEST: read the raw Claude session transcripts and pull, per client,
   what was actually discussed and when. Efficient: a cheap substring test before
   any JSON.parse, only Thulaib's (user) messages, skips skill/command injections,
   caps + dedupes per client. This is the "everything spoken on Claude feeds the
   brain" pipeline - runs in the nightly regenerate, no LLM needed. ══ */
function harvestChat() {
  /* 2026-08-30: was ONE project folder (and the stale one at that). Claude Code and
     the desktop cowork sessions each write transcripts under their own folder in
     ~/.claude/projects, so the harvest now sweeps them ALL. The 120-day window and
     the cheap prefilter below keep the cost bounded as history grows. */
  const projectsRoot = path.join(HOME, '.claude/projects');
  const perClient = {};
  const aliasIndex = []; // [display, [lc needles]]
  const allNeedles = [];
  for (const [key, display] of Object.entries(ROSTER)) {
    const needles = [display.toLowerCase(), ...(CLIENT_ALIASES[key] || [])];
    aliasIndex.push([display, needles]); allNeedles.push(...needles);
  }
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ANY = new RegExp(allNeedles.map(esc).join('|'), 'i'); // one case-insensitive prefilter
  // a line is a DECISION/FACT (not just a name-drop) when it carries commitment/number/constraint language
  const DECISION = /\b(decided|decision|we('| a)?re going|let'?s go with|final|locked|confirm(ed)?|agreed|the price is|priced at|charge|charging|budget is|deadline|due (on|by)|launch(es|ing)? on|the problem is|the issue is|the goal is|must not|never (say|mention|do)|always|do not|the plan is|next step|rule:|note that|remember (that|to)|the fee is|rev.?share|per month|\/month|lkr\s?[\d,]|rs\.?\s?[\d,]|\$[\d,]|\b\d+%)/i;
  let files = [];
  try {
    const cutoff = Date.now() - 120 * 86400000; // last ~120 days, newest first (bounds cost as history grows)
    const dirs = fs.readdirSync(projectsRoot).map(d => path.join(projectsRoot, d))
      .filter(d => { try { return fs.statSync(d).isDirectory(); } catch (e) { return false; } });
    files = dirs.flatMap(d => { try { return fs.readdirSync(d).filter(f => f.endsWith('.jsonl')).map(f => path.join(d, f)); } catch (e) { return []; } })
      .map(p => ({ p, m: fs.statSync(p).mtimeMs })).filter(x => x.m >= cutoff)
      .sort((a, b) => b.m - a.m).map(x => x.p);
  } catch (e) { return { perClient, discussed: 0, decisions: [], filesScanned: 0 }; }
  const seen = new Set();
  let discussed = 0;
  for (const f of files) {
    let raw; try { raw = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    if (!ANY.test(raw)) continue;                            // whole-file skip: no client mentioned at all
    for (const ln of raw.split('\n')) {
      // only tiny USER lines that mention a client ever get parsed (assistant lines are the huge ones)
      if (ln.length < 30 || ln.length > 20000) continue;
      if (ln.indexOf('"type":"user"') === -1) continue;
      if (!ANY.test(ln)) continue;
      let o; try { o = JSON.parse(ln); } catch (e) { continue; }
      if (o.type !== 'user') continue;
      const m = o.message || {}; const c = m.content;
      let txt = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join(' ') : '';
      txt = txt.trim();
      if (!txt || txt.length < 12) continue;
      if (txt.startsWith('<') || txt.startsWith('Base directory') || txt.startsWith('Caveat:')) continue;
      // skip harness-injected messages (session summaries, tool results, command output) - not real user speech
      if (/^(This session is being continued|The user|Analysis:|Summary:|\[Request interrupted|Result of|Contents of|Command|Tool ran)/.test(txt)) continue;
      if (txt.indexOf('"tool_use_id"') !== -1 || txt.indexOf('system-reminder') !== -1) continue;
      const date = (o.timestamp || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const low = txt.toLowerCase();
      const hitClients = aliasIndex.filter(([d, needles]) => needles.some(n => low.includes(n))).map(a => a[0]);
      const snippet = txt.replace(/\s+/g, ' ').slice(0, 150);
      const kind = DECISION.test(txt) ? 'decision' : 'mention';   // item 1: is this a real fact/decision?
      const cluster = clusterFor('', snippet);                     // item 3: auto-tag topic even without a client title
      for (const cl of hitClients) {
        const k = cl + '|' + date + '|' + snippet.slice(0, 40).toLowerCase();
        if (seen.has(k)) continue; seen.add(k);
        (perClient[cl] = perClient[cl] || []).push({ date, snippet, kind, cluster });
        if (kind === 'decision') decisions.push({ date, client: cl, cluster, snippet });
        discussed++;
      }
    }
  }
  for (const cl of Object.keys(perClient)) {
    // decisions first, then most-recent mentions; keeps the signal when we cap
    perClient[cl].sort((a, b) => (a.kind === b.kind ? b.date.localeCompare(a.date) : a.kind === 'decision' ? -1 : 1));
    perClient[cl] = perClient[cl].slice(0, 25);
  }
  decisions.sort((a, b) => b.date.localeCompare(a.date));
  return { perClient, discussed, decisions: decisions.slice(0, 60), filesScanned: files.length };
}
const decisions = [];
const { perClient: chatByClient, discussed: chatDiscussed, decisions: chatDecisions, filesScanned: chatFilesScanned } = harvestChat();
console.log('chat harvest:', chatFilesScanned || 0, 'transcript files swept,', chatDiscussed, 'client mentions kept');

/* ══ WHATSAPP PIPE (v1, text only): ~/bb-brain-inbox/<client-slug>/ holds WhatsApp
   chat exports (.txt, or .zip containing one). Folder name = the client. Nightly,
   every export is parsed; only MEANINGFUL lines survive (decision language, prices,
   dates, length) - "ok" and "good morning" never reach the brain. Deduped by
   date+text so re-dropping a newer export of the same chat is safe. ══ */
const WA_INBOX = process.env.BB_INBOX || path.join(HOME, 'bb-brain-inbox');
const slugify = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const WA_LINE = /^\[?(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),? \d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?\]?\s(?:- )?([^:]{1,40}):\s(.*)$/;
const WA_JUNK = /^(ok|okay|k|yes|no|good morning|good night|gm|gn|thanks|thank you|hi|hello|noted|sure|👍|❤️|🙏|<media omitted>|image omitted|video omitted|audio omitted|sticker omitted|this message was deleted|you deleted this message|missed voice call|missed video call|null)\.?$/i;
/* stem-based (no trailing word boundary) so approved/boosting/verification all match */
/* SECRET RULE (2026-09-05): a client pasted a Facebook password into a group chat on
   2026-05-15 and another sent 'Password = ...' three times. Any message that carries a
   credential word is dropped WHOLE before the meaning test, so no password, PIN or OTP
   can reach brain-data.js even in its local plaintext form. Counted as res.wa.redacted. */
const WA_SECRET = /(password|passcode|passwd|pwd|credential|login details|\botp\b|\bpin\s*[:=]|\b\d{6}\b)/i;
const WA_MEANING = /(lkr|rs\.?\s?\d|price|quote|invoice|pay\b|paid|budget|deadline|due (on|by|date)|launch|deliver|confirm|agree|decid|final|contract|meeting|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|problem|issue|complain|not happy|urgent|cancel|approv|chang|revis|script|shoot|schedul|verif|boost|campaign|\bads?\b|follower|lead\b|order|product|offer|instagram|facebook|tiktok|login|password|account|start post|content plan|stories|story)/i;
const WA_DECISION = /\b(decided|confirm(ed)?|agreed|final|deadline|due (on|by)|launch|the price is|charge|budget|pay (on|by|half)|advance|contract|approve[d]?|cancel(led)?|lkr\s?[\d,]|rs\.?\s?[\d,]|\b\d+%)\b/i;
function ingestWhatsApp() {
  const perClient = {}; let files = 0, kept = 0, redacted = 0;
  let dirs = [];
  try { dirs = fs.readdirSync(WA_INBOX).filter(d => { try { return fs.statSync(path.join(WA_INBOX, d)).isDirectory(); } catch (e) { return false; } }); } catch (e) { return { perClient, files, kept }; }
  // folder slug -> roster display name, else title-cased folder (new clients allowed)
  const bySlug = {}; for (const disp of Object.values(ROSTER)) bySlug[slugify(disp)] = disp;
  for (const dir of dirs) {
    const display = bySlug[dir] || dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    let names = [];
    try { names = fs.readdirSync(path.join(WA_INBOX, dir)); } catch (e) { continue; }
    for (const fn of names) {
      const full = path.join(WA_INBOX, dir, fn);
      let raw = null;
      try {
        if (fn.endsWith('.txt')) raw = fs.readFileSync(full, 'utf8');
        else if (fn.endsWith('.zip')) raw = require('child_process').execSync(`unzip -p ${JSON.stringify(full)} '*.txt'`, { maxBuffer: 32 * 1024 * 1024 }).toString();
        else continue;
      } catch (e) { continue; }
      files++;
      const seen = new Set();
      const WA_LINE_ISO = /^\[?(\d{4})-(\d{2})-(\d{2}),? \d{1,2}:\d{2}(?::\d{2})?\]?\s(?:- )?([^:]{1,40}):\s(.*)$/;
      /* pass 1: rebuild whole messages - continuation lines (no timestamp) belong to the previous message */
      const msgs = [];
      for (const line of raw.split('\n')) {
        const clean = line.replace(/[‎‏]/g, '').trim();
        let m = clean.match(WA_LINE_ISO);                            // [2026-04-01, 09:01:02] Name: msg
        if (m) { msgs.push({ date: `${m[1]}-${m[2]}-${m[3]}`, sender: m[4], text: m[5] }); continue; }
        if ((m = clean.match(WA_LINE))) {                            // DD/MM formats (iOS + Android)
          const [, d1, d2, yy, s, t] = m;
          const year = yy.length === 2 ? '20' + yy : yy;
          msgs.push({ date: `${year}-${String(d2).padStart(2, '0')}-${String(d1).padStart(2, '0')}`, sender: s, text: t });
          continue;
        }
        if (clean && msgs.length && msgs[msgs.length - 1].text.length < 600)
          msgs[msgs.length - 1].text += ' ' + clean;                 // continuation line
      }
      /* pass 2: filter to the meaningful */
      for (const msg of msgs) {
        const { sender } = msg; const date = msg.date;
        const text = msg.text.trim();
        if (WA_SECRET.test(text)) { redacted++; continue; }              // never store a credential
        if (text.length < 20 || WA_JUNK.test(text)) continue;
        if (/\b(omitted|deleted|this message|created this group|added you|end-to-end encrypted|changed the (subject|group))\b/i.test(text)) continue;  // attachment stubs + system lines
        if (!WA_MEANING.test(text)) continue;                       // meaningful lines only
        if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) continue;
        const snippet = text.replace(/\s+/g, ' ').slice(0, 160);
        const k = date + '|' + snippet.slice(0, 40).toLowerCase();
        if (seen.has(k)) continue; seen.add(k);
        const kind = WA_DECISION.test(text) ? 'decision' : 'mention';
        (perClient[display] = perClient[display] || []).push({ date, snippet, sender: sender.trim().slice(0, 30), kind });
        kept++;
      }
    }
  }
  for (const c of Object.keys(perClient)) {
    perClient[c].sort((a, b) => (a.kind === b.kind ? b.date.localeCompare(a.date) : a.kind === 'decision' ? -1 : 1));
    perClient[c] = perClient[c].slice(0, 100);
  }
  return { perClient, files, kept, redacted };
}
const wa = ingestWhatsApp();
console.log('whatsapp pipe:', wa.files ? wa.files + ' exports, ' + wa.kept + ' meaningful lines kept' : 'inbox empty');

/* ── CLIENT FOLDER DOCS (2026-08-30): each client's own knowledge files (BRAIN.md,
   ADS.md and any sibling .md) join the dossier. What gets pulled is deliberately
   thin and high-value: the section map, and the WARNING / landmine / UNKNOWN lines,
   because those are the lines a person about to act on a client must see. Every doc
   carries its file name and real mtime, so a stale dossier says so. ── */
function ingestClientDocs() {
  const perClient = {}; let filesRead = 0;
  const cdir = path.join(HOME, 'bb-consultancy');
  for (const [key, display] of Object.entries(ROSTER)) {
    const folder = path.join(cdir, key);
    let names = []; try { names = fs.readdirSync(folder).filter(f => f.endsWith('.md')); } catch (e) { continue; }
    const docs = [];
    for (const fn of names) {
      const full = path.join(folder, fn);
      let raw; try { raw = fs.readFileSync(full, 'utf8'); } catch (e) { continue; }
      filesRead++;
      const heads = [], flags = [];
      for (const ln of raw.split('\n')) {
        const t = ln.trim();
        if (/^##\s/.test(t) && heads.length < 14) heads.push(t.replace(/^#+\s*/, '').slice(0, 80));
        else if (/(⚠️|🔴|MUST NOT|UNKNOWN|NEVER |never mention|never say|never merge|never name)/.test(t) && t.length > 25 && flags.length < 10)
          flags.push(t.replace(/^[>\-*\s]+/, '').replace(/\*\*/g, '').slice(0, 170));
      }
      docs.push({ file: fn, date: fs.statSync(full).mtime.toISOString().slice(0, 10), lines: raw.split('\n').length, sections: heads, flags });
    }
    if (docs.length) perClient[display] = docs.sort((a, b) => b.date.localeCompare(a.date));
  }
  return { perClient, filesRead };
}
const clientDocs = ingestClientDocs();
console.log('client folders:', Object.keys(clientDocs.perClient).length, 'clients,', clientDocs.filesRead, 'docs read');

/* ── THE NUMBERS CANON (2026-08-30): BB-METRICS.md is the one definition of every BB
   number and the brain could not quote a line of it. Each metric ships with its VALUE
   and STATUS so the app can show which numbers are VERIFIED and which are UNKNOWN,
   and the standing rule (read the file before quoting) travels with the data. ── */
function ingestMetrics() {
  const file = path.join(HOME, 'bb-consultancy/BB-METRICS.md');
  let raw; try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
  const updated = fs.statSync(file).mtime.toISOString().slice(0, 10);
  const entries = [];
  for (const block of raw.split(/\n(?=### )/)) {
    const h = block.match(/^### (.+)/); if (!h) continue;
    const value = ((block.match(/\*\*Values?\.?\*\*\s*([^\n]+)/) || [])[1] || '').replace(/\*\*/g, '').trim().slice(0, 100) || null;
    const status = (block.match(/\*\*Status\.?\*\*\s*\**([A-Z][A-Z-]+)/) || block.match(/Status\.\s*\**([A-Z][A-Z-]+)/) || [])[1] || null;
    entries.push({ name: h[1].replace(/[#*]/g, '').trim().slice(0, 70), value, status });
  }
  return { file: '~/bb-consultancy/BB-METRICS.md', updated, count: entries.length, entries: entries.slice(0, 80) };
}
const metricsCanon = ingestMetrics();
console.log('numbers canon:', metricsCanon ? metricsCanon.count + ' metrics, updated ' + metricsCanon.updated : 'BB-METRICS.md NOT FOUND');

/* ══ RICH PER-CLIENT DATASET: everything the brain knows about each client,
   from skill attribution (what we did) + chat harvest (what we discussed). ══ */
function buildClients() {
  const map = {}; // display -> record
  const ensure = c => (map[c] = map[c] || { name: c, lessons: [], discussed: [], skills: {}, clusters: {} });
  for (const s of out.skills) for (const { c, n } of (s.clients || [])) {
    const r = ensure(c); r.skills[s.name] = (r.skills[s.name] || 0) + n; r.clusters[s.cluster] = (r.clusters[s.cluster] || 0) + n;
  }
  for (const e of out.timeline) for (const c of (e.clients || [])) ensure(c).lessons.push({ date: e.date, skill: e.skill, cluster: e.cluster, summary: e.summary, outcome: e.outcome || null });
  for (const [c, arr] of Object.entries(chatByClient)) { const r = ensure(c); r.discussed = arr; }
  for (const [c, arr] of Object.entries(wa.perClient)) { const r = ensure(c); r.whatsapp = arr; }
  out.wa = { files: wa.files, kept: wa.kept, redacted: wa.redacted || 0, clients: Object.keys(wa.perClient).length };
  for (const [c, docs] of Object.entries(clientDocs.perClient)) { const r = ensure(c); r.docs = docs; }
  const list = Object.values(map).map(r => {
    const lessons = r.lessons.sort((a, b) => b.date.localeCompare(a.date));
    r.whatsapp = r.whatsapp || [];
    const dates = [...lessons.map(l => l.date), ...r.discussed.map(d => d.date), ...r.whatsapp.map(w => w.date)].sort();
    const domCluster = Object.entries(r.clusters).sort((a, b) => b[1] - a[1])[0];
    return {
      name: r.name,
      lessons: lessons.slice(0, 40),
      discussed: r.discussed,
      skills: Object.entries(r.skills).sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ s, n, cluster: (out.skills.find(x => x.name === s) || {}).cluster || 'intel' })),
      clusters: r.clusters,
      domCluster: domCluster ? domCluster[0] : 'intel',
      whatsapp: r.whatsapp,
      docs: r.docs || [],
      docCount: (r.docs || []).length,
      lessonCount: r.lessons.length,
      chatCount: r.discussed.length,
      waCount: r.whatsapp.length,
      total: r.lessons.length + r.discussed.length + r.whatsapp.length,
      firstSeen: dates[0] || null,
      lastActive: dates[dates.length - 1] || null,
    };
  }).sort((a, b) => b.total - a.total);
  return list;
}
out.clients = buildClients();
out.decisions = chatDecisions;   // recent decisions/facts pulled from chat (item 1)
out.metrics = metricsCanon;      // the numbers canon, with per-metric status

/* ── SOURCE HEALTH (2026-08-30): every feeding mouth reports what it read and how
   fresh it is, so a frozen channel is VISIBLE in the app instead of silently green.
   A single "refreshed" date cannot reveal that a source went dark; this can. ── */
{
  const newestOf = arr => arr.map(e => e.date).filter(Boolean).sort().pop() || null;
  const learnDates = []; for (const es of Object.values(learningsBySkill)) for (const e of es) if (e.date && e.via !== 'chat') learnDates.push(e.date);
  out.sources = [
    { name: 'Skill rulebooks', detail: skills.length + ' skills scanned', newest: null, ok: skills.length > 50 },
    { name: 'Learnings files', detail: allFiles.length + ' files feeding ' + Object.keys(learningsBySkill).length + ' skills', newest: learnDates.sort().pop() || null, ok: allFiles.length >= 25 },
    { name: 'Chat memories', detail: chatMem.length + ' facts', newest: newestOf(chatMem), ok: chatMem.length > 0 },
    { name: 'Chat transcripts', detail: (chatFilesScanned || 0) + ' sessions swept, ' + chatDiscussed + ' client mentions', newest: newestOf(chatDecisions), ok: (chatFilesScanned || 0) > 0 },
    { name: 'WhatsApp inbox', detail: wa.files ? wa.files + ' exports, ' + wa.kept + ' lines kept' : 'no exports yet - a habit, not a fault', newest: null, ok: null },
    { name: 'Pattern banks', detail: (learningsBySkill['bb-mother-brain'] || []).filter(e => /^P-\d/.test(e.summary)).length + ' market + ' + (learningsBySkill['bb-meta-ads-expert-plus'] || []).filter(e => /^AP-\d/.test(e.summary)).length + ' ad patterns', newest: null, ok: true },
    { name: 'Client folders', detail: Object.keys(clientDocs.perClient).length + ' clients, ' + clientDocs.filesRead + ' docs', newest: null, ok: clientDocs.filesRead > 0 },
    { name: 'Numbers canon', detail: metricsCanon ? metricsCanon.count + ' metrics' : 'BB-METRICS.md missing', newest: metricsCanon ? metricsCanon.updated : null, ok: !!metricsCanon },
  ];
  console.log('source health:'); for (const s of out.sources) console.log(' ', (s.ok === false ? 'XX' : s.ok === null ? '--' : 'ok'), s.name + ':', s.detail + (s.newest ? ', newest ' + s.newest : ''));
  const unknownSkills = Object.keys(learningsBySkill).filter(k => !skills.some(s => s.name === k));
  for (const k of unknownSkills) console.log('WARNING: learnings ingested for a skill the scan does not know (entries dropped from the UI):', k);
}

/* ── STEP 3: contradiction detection - same-topic entries with opposing guidance.
   Heuristic only (keyword overlap >= 3 significant tokens + one side carries negation
   language the other lacks). NEVER auto-resolved - flagged for human review. ── */
const NEG = /\b(never|not|don'?t|do not|avoid|stop|no longer|instead of|wrong|remove|kill|ban)\b/i;
function detectConflicts() {
  const all = [];
  for (const [skill, entries] of Object.entries(learningsBySkill))
    for (const e of entries) all.push({ skill, date: e.date, summary: e.summary, hint: e.hint || '', kw: kwOf(e.summary + ' ' + (e.hint || '')) });
  // which keywords does a text NEGATE? (a negation word with the keyword in its next ~45 chars)
  const negatedKws = (text, kws) => {
    const t = text.toLowerCase(); const hit = new Set();
    let m; const re = new RegExp(NEG.source, 'gi');
    while ((m = re.exec(t))) { const win = t.slice(m.index, m.index + 50); for (const w of kws) if (win.includes(w)) hit.add(w); }
    return hit;
  };
  const conflicts = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    const shared = []; for (const w of a.kw) if (b.kw.has(w)) shared.push(w);
    if (shared.length < 3) continue;
    if (a.summary.slice(0, 60) === b.summary.slice(0, 60)) continue;   // same entry echoed across files
    if (shared.length >= 0.65 * Math.min(a.kw.size, b.kw.size)) continue; // near-duplicate = same lesson twice, not a conflict
    const ta = a.summary + ' ' + a.hint, tb = b.summary + ' ' + b.hint;
    const negA = negatedKws(ta, shared), negB = negatedKws(tb, shared);
    // conflict = a shared keyword one entry negates and the other states plainly
    const flip = [...negA].filter(w => !negB.has(w)).concat([...negB].filter(w => !negA.has(w)));
    if (!flip.length) continue;
    conflicts.push({
      skillA: a.skill, dateA: a.date, textA: a.summary,
      skillB: b.skill, dateB: b.date, textB: b.summary,
      shared: shared.length, topic: flip.slice(0, 3),
      key: (a.skill + '|' + (a.date || '') + '|' + a.summary.slice(0, 40) + '||' + b.skill + '|' + (b.date || '') + '|' + b.summary.slice(0, 40)).toLowerCase(),
    });
  }
  conflicts.sort((x, y) => y.shared - x.shared);
  return conflicts.slice(0, 30);
}
out.conflicts = detectConflicts();

/* ── STEP 7: agent learnings intake - what the MACHINE agents learned, from Supabase.
   Read-only at build time. If the fetch fails, the brain says "agent feed offline"
   honestly - it never fakes or silently drops the section. ── */
const SB_URL = 'https://yyviiwnqgphyklcoijyd.supabase.co/rest/v1';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dmlpd25xZ3BoeWtsY29panlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjE5OTEsImV4cCI6MjA5MTI5Nzk5MX0.I8YiBr-rfLVcc6DE8Z1PxEP2oxXCelv6mxqAY_wY7lc';
async function fetchAgentLearnings() {
  try {
    const r = await fetch(SB_URL + '/bb_agent_learnings?select=agent_name,client_name,category,insight,confidence,created_at&order=created_at.desc&limit=200', { headers: { apikey: SB_KEY }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    return {
      online: true,
      entries: rows.map(x => ({
        date: String(x.created_at || '').slice(0, 10), agent: x.agent_name || 'unknown agent',
        client: x.client_name || null, category: x.category || null,
        insight: String(x.insight || '').slice(0, 200), confidence: x.confidence || null,
      })),
    };
  } catch (e) {
    return { online: false, error: String(e.message || e).slice(0, 120), entries: [] };
  }
}

/* totals + gap signal */
const depthByCluster = {};
for (const c of CLUSTERS) depthByCluster[c.id] = 0;
for (const s of out.skills) depthByCluster[s.cluster] += s.depth;
const clientTotals = {};
for (const s of out.skills) for (const { c, n } of s.clients) clientTotals[c] = (clientTotals[c] || 0) + n;
out.totals = {
  chatEntries: chatMem.length,
  chatDiscussed,
  chatDecisions: chatDecisions.length,
  waFiles: wa.files, waFacts: wa.kept,
  clientsFull: out.clients.length,
  skills: out.skills.length,
  entries: out.skills.reduce((n, s) => n + s.depth, 0),
  datedEntries: out.timeline.length,
  clusters: CLUSTERS.length,
  depthByCluster,
  clients: Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ c, n })),
};

/* ── decay-loop verdicts + answer gaps (fetched at build time, applied to the dataset) ── */
async function sbGet(pathq) {
  /* a transient blip must not cost a whole feed: 2026-09-06 20:28 one "fetch failed" turned
     three checks red and the agent refused to publish while the endpoint answered in 300ms a
     minute later. Three tries, four seconds apart, then the honest OFFLINE. */
  let r = null, lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { r = await fetch(SB_URL + pathq, { headers: { apikey: SB_KEY }, signal: AbortSignal.timeout(15000) }); break; }
    catch (e) { lastErr = e; if (attempt < 3) await new Promise(res => setTimeout(res, 4000)); }
  }
  if (!r) throw lastErr;
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
const entryKey = e => (e.skill + '|' + e.date + '|' + String(e.summary).slice(0, 40)).toLowerCase();
function applyReviews(reviews) {
  const byKey = {};
  for (const r of reviews) byKey[String(r.entry_key).toLowerCase()] = r.verdict; // latest wins (ordered asc)
  let kept = 0, retired = 0;
  out.timeline = out.timeline.filter(e => {
    const v = byKey[entryKey(e)];
    if (!v) return true;
    if (v === 'keep') { if (e.stale) { e.stale = false; const s = out.skills.find(x => x.name === e.skill); if (s && s.conf.stale > 0) s.conf.stale--; } kept++; return true; }
    // retire: remove from the record everywhere it counts
    retired++;
    const s = out.skills.find(x => x.name === e.skill);
    if (s) { s.depth = Math.max(0, s.depth - 1); if (s.conf[e.conf] > 0) s.conf[e.conf]--; if (e.stale && s.conf.stale > 0) s.conf.stale--; }
    out.totals.entries = Math.max(0, out.totals.entries - 1);
    out.totals.datedEntries = Math.max(0, out.totals.datedEntries - 1);
    if (out.totals.depthByCluster[e.cluster] > 0) out.totals.depthByCluster[e.cluster]--;
    for (const cl of out.clients) cl.lessons = cl.lessons.filter(l => (e.skill + '|' + l.date + '|' + String(l.summary).slice(0, 40)).toLowerCase() !== entryKey(e) || l.skill !== e.skill);
    return false;
  });
  return { kept, retired };
}

/* ── SYSTEM EXHAUST (2026-08-30, the ninth mouth, on Thulaib's ask: "the brain must
   know if I made a new login or an SMM asked for captions"): what the team DOES
   inside the five systems. Read-only on the anon posture, same as the Command
   Centre. EXPLICIT column lists only, never select=*, so a credential column added
   to any table later can never leak into the brain. OFFLINE is a visible state in
   the health strip, never a build failure: a network flake must not kill the feed. ── */
async function ingestSystems() {
  const res = { events: [], online: false, error: null, counts: {} };
  try {
    /* graphic_projects: NEVER select image_url or thumb_url, that is the 92MB base64
       landmine. Named light columns only, here and everywhere. */
    const [members, tasks, shoots, clientRows, videos, graphics] = await Promise.all([
      sbGet('/team_members?select=id,name,role,active,created_at&order=created_at.desc&limit=40'),
      sbGet('/tasks?select=title,category,client_id,done,due,assign,created_at,updated_at&order=created_at.desc&limit=400'),
      sbGet('/smm_shoots?select=title,client_id,shoot_date,status,video_count,created_at&order=created_at.desc&limit=40'),
      sbGet('/clients?select=id,name&limit=120'),
      sbGet('/video_projects?select=title,client_id,current_stage,deadline,assigned_editor_id,created_at,updated_at&order=updated_at.desc&limit=120'),
      sbGet('/graphic_projects?select=title,client_name,client_id,current_stage,type,assigned_designer,assigned_designer_id,created_at,updated_at&order=updated_at.desc&limit=120'),
    ]);
    const cname = {}; for (const c of clientRows) cname[c.id] = c.name;
    /* WHO DID IT (2026-09-05, Thulaib: "is what my designer, my editor, my SMM does going to the
       brain?"). Yes, and now with the person on it. Names only, from the live roster. */
    const mname = {}; for (const m of members) if (m.id != null) mname[m.id] = String(m.name || '').trim();
    const who = (id, fallback) => { const nm = (id != null && mname[id]) || (fallback ? String(fallback).trim() : ''); return nm ? ' by ' + nm : ''; };
    const moved = (r, days) => r.updated_at && r.created_at && (new Date(r.updated_at) - new Date(r.created_at) > 60000) && (Date.now() - new Date(r.updated_at) < days * 86400000);
    const people = {};
    /* task assignees arrive as CODES (th, sh, both, nv, ti, smm, gd, video), the same ones the
       database's bb_assign_to_members resolves. Same map here so a code and a name are one person. */
    const CODE = { th: 'THULAIB', thulaib: 'THULAIB', sh: 'SHIARA', shiara: 'SHIARA', nv: 'NIRVANA', nirvana: 'NIRVANA', ti: 'TIANA', tiana: 'TIANA' };
    const person = raw => { const k = String(raw || '').trim().toLowerCase(); if (!k) return null; if (CODE[k]) return CODE[k]; if (['both','smm','gd','video','all','team'].includes(k)) return null; return k.toUpperCase(); };
    const tally = (nm, kind) => { const k = person(nm); if (!k) return; const d = k.charAt(0) + k.slice(1).toLowerCase(); people[d] = people[d] || { graphics: 0, videos: 0, tasks: 0, moves: 0 }; people[d][kind]++; };
    /* live client names are ALL CAPS; route them through the alias matcher so the
       dossier they land in is the same record every other source feeds */
    const display = raw => { const hits = clientsIn(String(raw || '')); return hits[0] || (raw ? String(raw).toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase()) : null); };
    const cutoff = Date.now() - 60 * 86400000;
    const ev = [];
    for (const m of members) {
      if (new Date(m.created_at) < cutoff) continue;
      ev.push({ date: m.created_at.slice(0, 10), sys: 'team', client: null, text: 'New team login: ' + m.name + (m.role ? ' (' + m.role + ')' : '') });
    }
    for (const t of tasks) {
      if (new Date(t.created_at) < cutoff) continue;
      const cl = t.client_id != null ? display(cname[t.client_id]) : null;
      ev.push({ date: t.created_at.slice(0, 10), sys: 'tasks', client: cl, text: 'Task' + (cl ? ' for ' + cl : '') + (t.assign ? ' for ' + String(t.assign).slice(0, 24) : '') + ': ' + String(t.title || '').slice(0, 90) + (t.done ? ' (done)' : t.due ? ', due ' + String(t.due).slice(0, 10) : '') });
      if (t.assign) { if (String(t.assign).trim().toLowerCase() === 'both') { tally('th', 'tasks'); tally('sh', 'tasks'); } else for (const part of String(t.assign).split(/[,+&]/)) tally(part, 'tasks'); }
    }
    const soon = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    for (const s of shoots) {
      if (new Date(s.created_at) < cutoff && !(s.shoot_date && s.shoot_date >= soon)) continue;
      const cl = s.client_id != null ? display(cname[s.client_id]) : null;
      ev.push({ date: s.shoot_date || s.created_at.slice(0, 10), sys: 'shoots', client: cl, text: 'Shoot' + (cl ? ' for ' + cl : '') + ': ' + String(s.title || '').slice(0, 60) + (s.status ? ' (' + s.status + ')' : '') + (s.shoot_date ? ', ' + s.shoot_date : '') });
    }
    for (const v of videos) {
      if (new Date(v.created_at) < cutoff) continue;
      const cl = v.client_id != null ? display(cname[v.client_id]) : null;
      const vw = who(v.assigned_editor_id, null);
      ev.push({ date: v.created_at.slice(0, 10), sys: 'video', client: cl, text: 'Video' + (cl ? ' for ' + cl : '') + vw + ': ' + String(v.title || '').slice(0, 80) + (v.current_stage ? ' (' + v.current_stage + ')' : '') });
      if (vw) tally(vw.slice(4), 'videos');
      if (moved(v, 14)) { ev.push({ date: v.updated_at.slice(0, 10), sys: 'video', client: cl, text: 'Video' + (cl ? ' for ' + cl : '') + vw + ' moved to ' + (v.current_stage || 'a new stage') + ': ' + String(v.title || '').slice(0, 70) }); if (vw) tally(vw.slice(4), 'moves'); }
    }
    for (const g of graphics) {
      if (new Date(g.created_at) < cutoff) continue;
      const cl = display(g.client_name || (g.client_id != null ? cname[g.client_id] : null));
      const gw = who(g.assigned_designer_id, g.assigned_designer);
      ev.push({ date: g.created_at.slice(0, 10), sys: 'graphic', client: cl, text: 'Design' + (cl ? ' for ' + cl : '') + gw + ': ' + String(g.title || '').slice(0, 80) + (g.current_stage ? ' (' + g.current_stage + ')' : '') });
      if (gw) tally(gw.slice(4), 'graphics');
      if (moved(g, 14)) { ev.push({ date: g.updated_at.slice(0, 10), sys: 'graphic', client: cl, text: 'Design' + (cl ? ' for ' + cl : '') + gw + ' moved to ' + (g.current_stage || 'a new stage') + ': ' + String(g.title || '').slice(0, 70) }); if (gw) tally(gw.slice(4), 'moves'); }
    }
    ev.sort((a, b) => b.date.localeCompare(a.date));
    res.events = ev.slice(0, 200);
    res.people = Object.entries(people).map(([name, c]) => ({ name, ...c })).sort((a, b) => (b.graphics + b.videos + b.tasks + b.moves) - (a.graphics + a.videos + a.tasks + a.moves));
    res.online = true;
    res.counts = { team: members.length, activeTeam: members.filter(m => m.active).length, tasks: tasks.length, shoots: shoots.length, videos: videos.length, graphics: graphics.length };
    /* the live roster feeds the person picker (2026-08-31): names and roles only,
       never anything credential-shaped */
    res.team = members.filter(m => m.active).map(m => ({ name: String(m.name || '').trim(), role: m.role || '' })).filter(m => m.name);

    /* ── WHATSAPP ASKS vs THE TASK BOOK (2026-08-30, Thulaib's cross-check: "if we
       share the WhatsApp stuff you can cross check with the task book"). Every
       meaningful WhatsApp line that reads like an ASK is checked for a task row on
       the same client, created from 2 days before to 7 days after, sharing a real
       keyword. What survives is the list that matters: ASKED IN THE CHAT, ABSENT
       FROM THE BOOK. Empty inbox = the check sleeps, it never invents. ── */
    /* ASK RULE v2 (2026-09-05): v1 counted BB's own replies ('will make these changes')
       as asks, so 513 'asks' was noise. An ask is now: sent by the CLIENT side (not a
       BB name), carrying a request verb, and not a reply opener. */
    const WA_ASK = /(can you|could you|can we|could we|please|pls\b|kindly|need (a|an|the|to|you)|want (a|an|the|to|you)|make (a|an|the|it|sure)|create |send (me|us|the|a)|share (the|a|me|us)|post (this|the|it|these)|boost|design |edit |change (this|the|it|that)|fix |update (the|this)|schedule|upload|remove |add |include |replace )/i;
    const WA_REPLY = /^(will|sure|noted|ok|okay|done|yes|yep|got it|thanks|thank you|great|good morning|good afternoon|good evening|hi |hello)/i;
    const BB_SENDER = /\bBB\b|thulaib|shiara|ushane|rukshan|nirvana|tiana|kenuli|gayani|suhana|farhath|rajeewa|thulka|kaneesha|umanda/i;
    const idOf = {}; for (const [id, nm] of Object.entries(cname)) { const dn = display(nm); if (dn && idOf[dn] == null) idOf[dn] = +id; }
    const fp = (c, d, t) => require('crypto').createHash('sha1').update(c + '|' + d + '|' + String(t).slice(0, 80).toLowerCase()).digest('hex');
    const crosscheck = { perClient: {}, totalAsks: 0, totalMatched: 0, totalMatchedDone: 0, totalOpen: 0 };
    for (const [clName, lines] of Object.entries(wa.perClient)) {
      const cc = { asks: 0, matched: 0, matchedDone: 0, open: [], openAll: [] };
      for (const ln of lines) {
        if (BB_SENDER.test(ln.sender || '')) continue;                 // only the client's asks
        if (WA_REPLY.test(ln.snippet) || !WA_ASK.test(ln.snippet)) continue;
        cc.asks++; crosscheck.totalAsks++;
        const askKw = kwOf(ln.snippet);
        const lo = new Date(+new Date(ln.date) - 2 * 86400000).toISOString().slice(0, 10);
        const hi = new Date(+new Date(ln.date) + 7 * 86400000).toISOString().slice(0, 10);
        const hit = tasks.find(t => {
          if (t.client_id == null || display(cname[t.client_id]) !== clName) return false;
          const td = t.created_at.slice(0, 10);
          if (td < lo || td > hi) return false;
          const tkw = kwOf(String(t.title || '') + ' ' + String(t.category || ''));
          for (const w of askKw) if (tkw.has(w)) return true;
          return false;
        });
        if (hit) { cc.matched++; crosscheck.totalMatched++; if (hit.done) { cc.matchedDone++; crosscheck.totalMatchedDone++; } }
        else {
          if (cc.open.length < 10) cc.open.push({ date: ln.date, sender: (ln.sender || '').slice(0, 24), snippet: ln.snippet.slice(0, 140) });
          cc.openAll.push({ hash: fp(clName, ln.date, ln.snippet), client_id: idOf[clName] == null ? null : idOf[clName], client_name: clName, asked_on: ln.date, sender: (ln.sender || '').slice(0, 40), snippet: ln.snippet.slice(0, 200) });
        }
      }
      crosscheck.totalOpen += cc.open.length;
      if (cc.asks) crosscheck.perClient[clName] = cc;
    }
    res.crosscheck = crosscheck;
    if (crosscheck.totalAsks) console.log('wa crosscheck:', crosscheck.totalAsks, 'asks,', crosscheck.totalMatched, 'in the task book (' + crosscheck.totalMatchedDone + ' done),', crosscheck.totalOpen, 'open');
  } catch (e) { res.error = String(e.message); }
  return res;
}

Promise.all([
  fetchAgentLearnings(),
  sbGet('/brain_reviews?select=entry_key,verdict&order=created_at.asc').catch(e => ({ err: String(e.message) })),
  sbGet('/brain_gaps?select=id,question,asked_by,status,created_at&status=eq.open&order=created_at.desc&limit=50').catch(e => ({ err: String(e.message) })),
  ingestSystems(),
]).then(([feed, reviews, gaps, systems]) => {
  out.systems = systems;
  console.log('system exhaust:', systems.online ? systems.events.length + ' events (' + JSON.stringify(systems.counts) + ')' : 'OFFLINE (' + systems.error + ')');
  out.sources.push({ name: 'System exhaust', detail: systems.online ? systems.events.length + ' events from team, tasks and shoots' : 'OFFLINE: ' + systems.error, newest: systems.events[0] ? systems.events[0].date : null, ok: systems.online });
  for (const e of systems.events) if (e.client) {
    const rec = out.clients.find(c => c.name === e.client);
    if (rec) { (rec.systems = rec.systems || []).push(e); if (rec.systems.length > 12) rec.systems.length = 12; }
  }
  out.waCrosscheck = systems.crosscheck || null;
  if (systems.crosscheck) for (const [n, cc] of Object.entries(systems.crosscheck.perClient)) {
    const rec = out.clients.find(c => c.name === n);
    if (rec) rec.waCheck = cc;
  }
  out.agentFeed = feed;
  console.log('agent feed:', feed.online ? feed.entries.length + ' machine learnings' : 'OFFLINE (' + feed.error + ')');
  if (Array.isArray(reviews)) {
    out.reviews = applyReviews(reviews.filter(r => r.verdict !== 'dismiss-conflict'));
    const dismissed = new Set(reviews.filter(r => r.verdict === 'dismiss-conflict').map(r => String(r.entry_key).toLowerCase()));
    const before = out.conflicts.length;
    out.conflicts = out.conflicts.filter(c => !dismissed.has(c.key));
    out.reviews.conflictsDismissed = before - out.conflicts.length;
    console.log('reviews applied:', JSON.stringify(out.reviews));
  }
  else { out.reviews = { offline: true }; console.log('reviews OFFLINE:', reviews.err); }
  if (Array.isArray(gaps)) { out.gaps = gaps; console.log('open gaps:', gaps.length); }
  else { out.gaps = null; console.log('gaps OFFLINE:', gaps.err); }   // null = feed offline, [] = genuinely none

/* ── THE AGENT'S TRACE (2026-08-31): what changed since the last run, so Today can
   say it without anyone thinking about it. State lives locally and holds counts
   only. The daily push pick rotates through the unused skills by day of year. ── */
{
  const statePath = path.join(__dirname, '.agent-state.json');
  let prev = null; try { prev = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) {}
  const unused = out.skills.filter(s => s.depth === 0);
  const dayPick = unused.length ? unused[Math.floor(Date.now() / 86400000) % unused.length] : null;
  const cur = { generated: out.generated, entries: out.totals.entries, memories: chatMem.length, clients: out.clients.length, unused: unused.length, systemsEvents: (out.systems && out.systems.events) ? out.systems.events.length : 0 };
  out.agent = {
    lastRun: prev ? prev.generated : null,
    delta: prev ? { entries: cur.entries - prev.entries, memories: cur.memories - prev.memories, clients: cur.clients - prev.clients, unused: cur.unused - prev.unused, systemsEvents: cur.systemsEvents - prev.systemsEvents } : null,
    pushToday: dayPick ? dayPick.name : null,
    sourcesRed: (out.sources || []).filter(s => s.ok === false).map(s => s.name),
  };
  fs.writeFileSync(statePath, JSON.stringify(cur));
  console.log('agent trace:', out.agent.delta ? JSON.stringify(out.agent.delta) : 'first run', '· push today:', out.agent.pushToday);
}

/* ── THE GROWTH LEDGER (2026-09-06, Thulaib: "end of each week I want the brain to feel
   upgraded, a bar for how far we have come and how much is left"). The Brain Index is a
   ladder with a DENOMINATOR: five rungs per skill, cumulative, each rung a thing that
   happened on real work. The ledger is the brain's history of itself, counts only, no
   client name and no text, committed in plaintext so the timeline survives in git. ── */
{
  const clientsUsing = name => out.clients.filter(c => (c.skills || []).some(x => x.s === name)).length;
  const level = s => { if (!s.depth) return 1; if (!(s.conf && s.conf.confirmed)) return 2; if (!s.hasLoop) return 3; if (clientsUsing(s.name) < 3) return 4; return 5; };
  const LADDER = ['exists', 'used on real work', 'lessons confirmed', 'learning loop on', 'proven on three clients'];
  const per = {}; let rungs = 0; const counts = [0, 0, 0, 0, 0, 0];
  out.skills.forEach(s => { const l = level(s); s.level = l; rungs += l; counts[l]++; const p = per[s.cluster] = per[s.cluster] || { rungs: 0, total: 0 }; p.rungs += l; p.total += 5; });
  const total = out.skills.length * 5;
  const today = out.generated.slice(0, 10);
  let cloudReview = null;
  /* the cloud routine's weekly review and its source row (part 3 of the growth build) */
  try {
    const dir = path.join(HOME, 'bb-consultancy/synthesis');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^review-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort() : [];
    const cloudPatterns = (learningsBySkill['bb-mother-brain'] || []).filter(e => e.via === 'cloud').length;
    if (files.length) { const f = files[files.length - 1]; cloudReview = { date: f.slice(7, 17), text: fs.readFileSync(path.join(dir, f), 'utf8').replace(/^#[^\n]*\n/, '').trim().slice(0, 4200) }; }   /* a 450-word note fits in ~3000; the cap only stops a runaway file bloating the encrypted payload */
    out.sources.push({ name: 'Cloud synthesis', detail: files.length ? files.length + ' weekly review' + (files.length === 1 ? '' : 's') + ', ' + cloudPatterns + ' cross-client patterns' : 'waiting for the first Sunday run, not a fault', newest: files.length ? files[files.length - 1].slice(7, 17) : null, ok: files.length ? true : null });
  } catch (e) { out.sources.push({ name: 'Cloud synthesis', detail: 'unreadable: ' + e.message, newest: null, ok: false }); }
  const row = { date: today, rungs, total, pct: Math.round(rungs / total * 100), levels: counts.slice(1),
    perSector: Object.fromEntries(Object.entries(per).map(([k, p]) => [k, Math.round(p.rungs / p.total * 100)])),
    entries: out.totals.entries, dated: out.totals.datedEntries, skills: out.skills.length,
    used: out.skills.filter(s => s.depth > 0).length, confirmed: out.skills.filter(s => s.conf && s.conf.confirmed).length,
    loops: out.skills.filter(s => s.hasLoop).length, proven: counts[5], clients: out.clients.length,
    taughtBy5: out.clients.filter(c => (c.lessonCount || 0) >= 5).length,
    sourcesOk: (out.sources || []).filter(s => s.ok !== false).length, sources: (out.sources || []).length };
  const ledgerPath = path.join(__dirname, 'growth-ledger.json');
  let ledger = []; try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); if (!Array.isArray(ledger)) ledger = []; } catch (e) {}
  ledger = ledger.filter(r => r.date !== today); ledger.push(row); ledger.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger).replace(/\},\{/g, '},\n{'));   // one row per line so a git diff reads as a day
  /* the week's note, computed, never written by hand: what climbed, who taught it, what to try */
  const nowD = new Date(); const monday = new Date(nowD); monday.setDate(nowD.getDate() - ((nowD.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const mondayIso = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');
  const before = ledger.filter(r => r.date < mondayIso).slice(-1)[0] || null;
  const wkEntries = out.timeline.filter(e => e.date && e.date >= mondayIso);
  const firstUse = {}; out.timeline.forEach(e => { if (!e.date || !e.skill) return; if (!firstUse[e.skill] || e.date < firstUse[e.skill]) firstUse[e.skill] = e.date; });
  const firstUses = out.skills.filter(s => s.depth > 0 && firstUse[s.name] && firstUse[s.name] >= mondayIso).map(s => s.name);
  const taughtBy = out.clients.map(c => ({ name: c.name, n: (c.lessons || []).filter(l => l.date && l.date >= mondayIso).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  const busy = Object.entries(wkEntries.reduce((a, e) => { a[e.cluster] = (a[e.cluster] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1])[0];
  const tryNext = out.skills.filter(s => s.depth === 0 && (!busy || s.cluster === busy[0])).slice(0, 3).map(s => s.name);
  out.skills.filter(s => s.depth === 0 && !tryNext.includes(s.name)).slice(0, Math.max(0, 3 - tryNext.length)).forEach(s => tryNext.push(s.name));
  const askClient = out.clients.filter(c => c.waCheck && c.waCheck.open && c.waCheck.open.length && (c.lessonCount || 0) < 5).sort((a, b) => b.waCheck.open.length - a.waCheck.open.length)[0];
  out.growth = { ladder: LADDER, today: row, history: ledger.slice(-120),
    week: { monday: mondayIso, firstWeek: !before, rungsClimbed: before ? rungs - before.rungs : null, entriesAdded: wkEntries.length,
      firstUses, confirmedEntries: wkEntries.filter(e => e.conf === 'confirmed').length, taughtBy: taughtBy.slice(0, 8),
      loopsOn: before ? row.loops - before.loops : null, staleRules: out.timeline.filter(e => e.stale).length,
      busySector: busy ? busy[0] : null, tryNext,
      askClient: askClient ? { name: askClient.name, open: askClient.waCheck.open.length, lessons: askClient.lessonCount || 0 } : null } };
  if (cloudReview) out.growth.review = cloudReview;
  console.log('growth ledger:', row.rungs + ' of ' + row.total + ' rungs (' + row.pct + '%)', '· levels', counts.slice(1).join('/'), '· ' + ledger.length + ' day' + (ledger.length === 1 ? '' : 's') + ' kept', '· this week', out.growth.week.rungsClimbed == null ? 'first week' : (out.growth.week.rungsClimbed >= 0 ? '+' : '') + out.growth.week.rungsClimbed + ' rungs');
}

/* plaintext stays LOCAL ONLY (gitignored) - the published artifact is encrypted */
fs.writeFileSync(path.join(__dirname, 'brain-data.js'),
  '/* AUTO-GENERATED by build-brain-data.js on ' + now.toISOString() + ' - never hand-edit. LOCAL ONLY - never commit. */\n' +
  'window.BRAIN_DATA = ' + JSON.stringify(out, null, 1) + ';\n');

/* ── FULL PROTECTION: AES-256-GCM, key from ~/.bb-brain-pass via PBKDF2 (310k, SHA-256).
   The public site ships ONLY brain-data.enc.js; without the passcode it is noise. ── */
try {
  const crypto = require('crypto');
  const pass = fs.readFileSync(path.join(HOME, '.bb-brain-pass'), 'utf8').trim();
  if (pass.length < 8) throw new Error('passcode too short');
  // salt is DERIVED from the passcode, not random: stable across nightly rebuilds so
  // remembered device keys keep working. IV stays random per build (GCM requirement).
  const salt = crypto.createHash('sha256').update('bb-brain-salt:' + pass).digest().subarray(0, 16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, 310000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(out), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  fs.writeFileSync(path.join(__dirname, 'brain-data.enc.js'),
    '/* AUTO-GENERATED encrypted brain data - useless without the team passcode */\n' +
    'window.BRAIN_ENC=' + JSON.stringify({ v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), iter: 310000 }) + ';\n');
  console.log('encrypted artifact written (brain-data.enc.js,', Math.round(ct.length / 1024) + 'KB)');
  /* CACHE-BUST (2026-08-31): GitHub Pages caches files for 10 minutes and a
     browser can hold them longer, which is how a fresh deploy kept showing old
     data. Every build stamps the data reference, so a fresh document always
     pulls the data built with it. */
  const ihPath = path.join(__dirname, 'index.html');
  let ih = fs.readFileSync(ihPath, 'utf8');
  ih = ih.replace(/brain-data\.enc\.js(\?v=\d+)?/, 'brain-data.enc.js?v=' + Date.now());
  fs.writeFileSync(ihPath, ih);
  console.log('data reference stamped in index.html');
} catch (e) {
  // Found 2026-08-23: a missing ~/.bb-brain-pass made this catch print a
  // quiet 'skipped' while the nightly job reported success, so the live
  // encrypted brain silently froze for 23 days. A build that cannot encrypt
  // must FAIL, not shrug, or a dead brain looks alive.
  console.error('ENCRYPTION FAILED (' + e.message + ') - refusing to finish. The live brain is NOT updated. Fix ~/.bb-brain-pass and rebuild.');
  process.exit(1);
}

console.log('brain-data.js written:', out.totals.skills, 'skills,', out.totals.entries,
  'learning entries (' + out.totals.datedEntries, 'dated,', totalUndated, 'undated),',
  CLUSTERS.length, 'clusters');
const ranked = CLUSTERS.map(c => c.name + '=' + depthByCluster[c.id]).join('  ');
console.log('depth by cluster:', ranked);
});
