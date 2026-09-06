#!/bin/bash
# launchd runs with a bare PATH and cannot see node: the 07:20 run on 2026-09-06 died with
# "node: command not found" while the 21:30 run (via bb-end.sh, a login shell) passed. Own the PATH
# here. node on this Mac lives in ~/.local/node/bin, NOT Homebrew: the first fix pinned the wrong
# folder and only passed because the interactive shell already had the right one. Proven under
# env -i (a bare PATH) before this line was trusted.
export PATH="$HOME/.local/node/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
# brain-agent.sh (2026-08-31): the Digital Brain feeds itself, checks itself,
# publishes itself and leaves a trace. Build, then verify, then publish. Any
# red STOPS the publish and SHOUTS. Runs at 07:15 via launchd and from bb-end.sh
# at 21:30, so every path to the public goes through the same gate (L-BRAIN-008).
set -u
DIR="$HOME/bb-brain"; LOG="$DIR/agent.log"; FLAG="$DIR/BRAIN-AGENT-FAILING.txt"
STAMP="$(date '+%Y-%m-%d %H:%M')"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$DIR" || { echo "[$STAMP] XX cannot reach $DIR" >> "$LOG"; exit 1; }
shout(){
  {
    echo "BRAIN AGENT FAILED - $STAMP"
    echo "$1"
    echo "The live brain was NOT updated. Yesterday's brain stays live."
    echo "Fix: open the BB Brain chat and say: brain agent failed"
  } > "$FLAG"
  osascript -e "display notification \"$1\" with title \"BB BRAIN AGENT FAILED\"" 2>/dev/null
  echo "[$STAMP] XX $1" >> "$LOG"; echo "[$STAMP] XX $1"; exit 1
}
# 1. build. A failed build never reaches the public.
if ! BUILD_OUT="$(node build-brain-data.js 2>&1)"; then
  shout "build failed: $(printf '%s' "$BUILD_OUT" | tail -1 | cut -c1-160)"
fi
# 2. verify. Every invariant, with its denominator. Red means stop.
if ! VERIFY_OUT="$(node verify-brain.js 2>&1)"; then
  shout "$(printf '%s' "$VERIFY_OUT" | grep VERIFY-BRAIN | cut -c1-220)"
fi
# 3. publish. Only green builds get here.
git add -A 2>/dev/null
if ! git diff --cached --quiet; then git commit -q -m "brain agent $STAMP" || true; fi
git pull --rebase --autostash -q origin main 2>/dev/null || true
if git push -q 2>/dev/null; then
  PUB="pushed"
else
  RESCUE="rescue-brain-$(date +%F-%H%M)"
  if git branch "$RESCUE" 2>/dev/null && git push -q origin "$RESCUE" 2>/dev/null; then
    PUB="main blocked, work saved on branch $RESCUE"
  else
    shout "publish failed and the rescue branch failed too"
  fi
fi
rm -f "$FLAG"
SUMMARY="$(printf '%s' "$VERIFY_OUT" | grep VERIFY-BRAIN)"
echo "[$STAMP] ok $SUMMARY · $PUB" >> "$LOG"
# 3b. heartbeat (2026-09-06). A green publish tells the database it happened, so a pg_cron
#     watcher can shout to a PHONE when a morning feed dies (a file and a Mac notification went
#     unread for thirteen hours on 2026-09-06, L-BRAIN-014). Installed by migrations/
#     bb_brain_feed_watch.sql, gated on Thulaib's go. Until then this is a silent no-op.
SB_KEY_HB="$(grep -o "SB_KEY *= *'[^']*'" build-brain-data.js | head -1 | sed "s/.*'\(.*\)'/\1/")"
if [ -n "$SB_KEY_HB" ]; then
  HB="$(curl -s --max-time 12 -o /dev/null -w '%{http_code}' -X POST \
    -H "apikey: $SB_KEY_HB" -H "Authorization: Bearer $SB_KEY_HB" -H "Content-Type: application/json" \
    -d "{\"p_commit\":\"$(git rev-parse --short HEAD 2>/dev/null)\"}" \
    https://yyviiwnqgphyklcoijyd.supabase.co/rest/v1/rpc/bb_brain_heartbeat 2>/dev/null || echo 000)"
  case "$HB" in 200|204) echo "[$STAMP] ok heartbeat recorded" >> "$LOG";; 404) : ;; *) echo "[$STAMP] note heartbeat not recorded (http $HB), the watcher will assume a missed feed only once installed" >> "$LOG";; esac
fi
# 4. chat-to-task bridge (2026-09-05). After publish so a bridge fault never blocks the
#    brain. Its own flag file so the fault SHOUTS the same way the brain does.
BFLAG="$HOME/bb-brain/BRIDGE-FAILING.txt"
if BRIDGE_OUT="$(node bridge-chat-asks.js 2>&1)"; then rm -f "$BFLAG"; echo "[$STAMP] ok $BRIDGE_OUT" >> "$LOG"
else printf '%s\n%s\n' "[$STAMP] chat-ask bridge FAILED" "$BRIDGE_OUT" > "$BFLAG"; echo "[$STAMP] XX bridge failed: $(printf '%s' "$BRIDGE_OUT" | tail -1)" >> "$LOG"; fi
echo "[$STAMP] ok $SUMMARY · $PUB"
