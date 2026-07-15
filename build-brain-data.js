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
  'puwakaramba': ['puwakaramba'], 'seekers': ['seekers'],
};
const DISPLAY_OVERRIDES = {
  'bswl': 'BSWL (Leon)', 'lgl': 'LGL', 'tt-mobile': 'TT Mobile', 'square-1-ai': 'Square 1 AI',
  'sastho-lk': 'Sastho', 'home-depot-lk': 'Home Depot', 'ceylon-carriers-travels': 'Ceylon Carriers',
  'show-car-detailers': 'Show Car Detailers', 'clove-beach-wadduwa': 'Clove Beach',
  'excellent-mobile': 'Excellent Mobile',
};
function buildRoster() {
  const roster = {}; // key -> display name
  const cdir = path.join(HOME, 'bb-consultancy');
  const skipFolders = ['design-test'];
  if (fs.existsSync(cdir)) for (const d of fs.readdirSync(cdir)) {
    try {
      if (d.startsWith('.') || skipFolders.includes(d) || !fs.statSync(path.join(cdir, d)).isDirectory()) continue;
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
    if (t === null) continue;
    const dm = t.match(/^(\d{4}-\d{2}-\d{2})\s*[-–—:·]?\s*(.*)/);
    if (dm) entries.push({ date: dm[1], summary: (dm[2] || t).slice(0, 140) });
    else if (!requireDate) { undated++; entries.push({ date: null, summary: t.slice(0, 140) }); }
  }
  return { entries, undated };
}

/* ── CHAT MEMORY: what Thulaib and Claude talk about distills into the auto-memory
   folder (one fact per file, saved during real chat sessions). Each file becomes a
   brain entry under bb-brain (Intelligence cluster): date = the file's real mtime,
   summary = its description, clients extracted from the FULL body text. ── */
const MEMORY_DIR = path.join(HOME, '.claude/projects/-Users-thulaibhassen-learn-claude-code/memory');
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
for (const { file, skill } of allFiles) {
  const { entries, undated } = parseLearnings(file);
  if (!entries.length) continue;
  totalUndated += undated;
  (learningsBySkill[skill] = learningsBySkill[skill] || []).push(...entries);
}
const chatMem = chatMemoryEntries();
if (chatMem.length) (learningsBySkill['bb-brain'] = learningsBySkill['bb-brain'] || []).push(...chatMem);

/* ── assemble ── */
const DAY = 86400000;
const now = new Date();
const out = { generated: now.toISOString(), clusters: CLUSTERS, skills: [], timeline: [], undatedCount: totalUndated };

for (const s of skills) {
  const cluster = clusterFor(s.name, s.desc);
  const entries = learningsBySkill[s.name] || [];
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
  });
  for (const e of dated) out.timeline.push({ date: e.date, skill: s.name, cluster, summary: e.summary, clients: clientsIn(e.body || e.summary), via: e.via || 'file' });
}
out.timeline.sort((a, b) => b.date.localeCompare(a.date));

/* totals + gap signal */
const depthByCluster = {};
for (const c of CLUSTERS) depthByCluster[c.id] = 0;
for (const s of out.skills) depthByCluster[s.cluster] += s.depth;
const clientTotals = {};
for (const s of out.skills) for (const { c, n } of s.clients) clientTotals[c] = (clientTotals[c] || 0) + n;
out.totals = {
  chatEntries: chatMem.length,
  skills: out.skills.length,
  entries: out.skills.reduce((n, s) => n + s.depth, 0),
  datedEntries: out.timeline.length,
  clusters: CLUSTERS.length,
  depthByCluster,
  clients: Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ c, n })),
};

fs.writeFileSync(path.join(__dirname, 'brain-data.js'),
  '/* AUTO-GENERATED by build-brain-data.js on ' + now.toISOString() + ' - never hand-edit */\n' +
  'window.BRAIN_DATA = ' + JSON.stringify(out, null, 1) + ';\n');

console.log('brain-data.js written:', out.totals.skills, 'skills,', out.totals.entries,
  'learning entries (' + out.totals.datedEntries, 'dated,', totalUndated, 'undated),',
  CLUSTERS.length, 'clusters');
const ranked = CLUSTERS.map(c => c.name + '=' + depthByCluster[c.id]).join('  ');
console.log('depth by cluster:', ranked);
