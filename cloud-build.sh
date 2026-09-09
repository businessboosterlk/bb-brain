#!/bin/bash
# cloud-build.sh (2026-09-09): feed the Digital Brain from somewhere that has no Mac.
#
# WHY. Thulaib: "even if I close my laptop would work happen?" The 07:15 and 21:30 feeds
# run on the laptop, so a closed lid means the brain does not learn that day. Everything
# the generator reads lives in two PRIVATE repositories that are already backed up
# nightly, so a cloud run can rebuild the brain from those instead.
#
# HOW. The generator reads every path off one constant, HOME. This assembles a folder
# that LOOKS like Thulaib's home out of the two repos and points BB_HOME at it. One
# override rather than a dozen, so a path added later cannot forget to be redirected.
#
# WHAT A CLOUD BRAIN CANNOT KNOW, and it says so on its own face rather than pretending:
#   - the Claude session transcripts. 1.4GB, laptop only, never backed up. The source
#     row reads "not reachable from the cloud" and stays QUIET, never red.
#   - anything written on the Mac since the last backup. A cloud brain is as fresh as
#     last night's backup, never as fresh as the Mac.
# It is therefore a FALLBACK, not a replacement. When the Mac feeds, the Mac wins.
#
# THE SECRET. Encrypting the payload needs the team passcode. On the Mac it is read
# from ~/.bb-brain-pass. Here it must arrive as BB_PASS and it is never written to disk.
#
# Usage (in the cloud, with the two repos checked out beside each other):
#   BB_PASS=... ./cloud-build.sh <path-to-bb-intelligence-backup> <path-to-consultancy>
set -uo pipefail
export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

BACKUP="${1:?path to bb-intelligence-backup required}"
CONSULT="${2:?path to bb-consultancy-engine required}"
BRAIN="$(cd "$(dirname "$0")" && pwd)"
STAGE="${BB_STAGE:-$(mktemp -d)}"

fail(){ echo "XX cloud-build: $1" >&2; exit 1; }

[ -d "$BACKUP/memory" ] || fail "no memory/ in $BACKUP, the backup is not what it claims"
[ -d "$BACKUP/skills" ] || fail "no skills/ in $BACKUP"
[ -f "$CONSULT/LEARNINGS.md" ] || fail "no LEARNINGS.md in $CONSULT"
[ -n "${BB_PASS:-}" ] || fail "BB_PASS is not set, and a brain nobody can unlock is not worth publishing"

# ── THE MAC WINS. This is a fallback, never a replacement. ───────────────────
# A cloud brain is as fresh as last night's backup, so publishing one over a brain
# the Mac fed this morning would make the machine go BACKWARDS. The run therefore
# asks one question: has the brain already been fed today? The cloud fires at 04:00
# UTC and the Mac's morning feed lands at 01:45 UTC, so a same-day stamp means the
# laptop was awake and there is nothing to do.
cd "$BRAIN" || fail "cannot reach $BRAIN"
git fetch -q origin main 2>/dev/null || true
LAST_DAY="$(git log -1 --format=%cd --date=format:%Y-%m-%d origin/main -- brain-data.enc.js 2>/dev/null)"
TODAY="$(date -u +%Y-%m-%d)"
if [ "${BB_FORCE:-0}" != "1" ] && [ "$LAST_DAY" = "$TODAY" ]; then
  echo "ok nothing to do: the Mac already fed the brain today ($LAST_DAY). The laptop wins when it is awake."
  exit 0
fi
echo "the brain was last fed $LAST_DAY, today is $TODAY, so the laptop missed its run. Feeding from the cloud."

# ── assemble a home ──────────────────────────────────────────────────────────
mkdir -p "$STAGE/.claude/projects/-Users-thulaibhassen"
ln -sfn "$BACKUP/skills"  "$STAGE/.claude/skills"
ln -sfn "$BACKUP/memory"  "$STAGE/.claude/projects/-Users-thulaibhassen/memory"
ln -sfn "$CONSULT"        "$STAGE/bb-consultancy"
[ -d "$BACKUP/systems" ]     && ln -sfn "$BACKUP/systems"     "$STAGE/bb-systems"
[ -d "$BACKUP/brain-inbox" ] && ln -sfn "$BACKUP/brain-inbox" "$STAGE/bb-brain-inbox"
# the plugin skills sit in a UUID path under Library. 70 of the 145 skills live there
# and the first cloud test found only 75, so the gate refused to publish. That refusal
# is what found them being backed up nowhere at all.
if [ -d "$BACKUP/skills-plugin" ]; then
  mkdir -p "$STAGE/Library/Application Support/Claude/local-agent-mode-sessions"
  ln -sfn "$BACKUP/skills-plugin" "$STAGE/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin"
fi
# the learnings files live at the top of home, because that is where the auto-glob looks
for f in "$BACKUP"/home-docs/bb-*-learnings.md; do
  [ -e "$f" ] && ln -sfn "$f" "$STAGE/$(basename "$f")"
done
PLUG=$(find -L "$STAGE/Library" -name SKILL.md 2>/dev/null | wc -l | tr -d ' ')   # -L: the stage is symlinks, and find does not follow them by default
LEARN=$(ls -1 "$STAGE"/bb-*-learnings.md 2>/dev/null | wc -l | tr -d ' ')
MEM=$(ls -1 "$BACKUP/memory" 2>/dev/null | wc -l | tr -d ' ')
echo "staged: $MEM memory files, $LEARN learnings files, $(ls -1 "$BACKUP/skills" | wc -l | tr -d ' ') own skills, $PLUG plugin skills"
[ "$PLUG" -ge 60 ] || fail "only $PLUG plugin skills reached the stage, expected at least 60. Run sync.sh on the Mac."
[ "$LEARN" -ge 20 ] || fail "only $LEARN learnings files reached the stage, expected at least 20"
[ "$MEM" -ge 100 ]  || fail "only $MEM memory files reached the stage, expected at least 100"

# ── build, then the SAME gate the Mac uses. A cloud build gets no easier ride. ──
cd "$BRAIN" || fail "cannot reach $BRAIN"
BB_HOME="$STAGE" BB_CLOUD=1 BB_PASS="$BB_PASS" node build-brain-data.js || fail "build failed"
node verify-brain.js || fail "the gate refused this build, nothing was published"

if [ "${BB_PUBLISH:-1}" = "1" ]; then
  git add -A
  git diff --cached --quiet || git commit -q -m "brain fed in the cloud $(date -u '+%Y-%m-%d %H:%M') UTC"
  git pull --rebase --autostash -q origin main 2>/dev/null || true
  git push -q || fail "publish failed"
  echo "ok cloud build published $(git rev-parse --short HEAD)"
else
  echo "ok cloud build verified, publish skipped (BB_PUBLISH=0)"
fi
