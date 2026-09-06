# The Sunday synthesis, the cloud half of the Digital Brain

Created 2026-09-06 under Thulaib's "all three, start at the top". This folder is the map and
the prompt for the one piece of the Brain that runs off the Mac.

## What it is

A Claude Code cloud routine, id `trig_01VxpMAuq2pJQYJ4vqdQFuiZ`, named "BB Mother Brain Sunday
synthesis". Every Sunday at 20:00 Colombo (14:30 UTC) it checks out two private repositories,
`bb-consultancy-engine` (client folders, PATTERNS.md, LEARNINGS.md) and `bb-intelligence-backup`
(memory, skills), reads every client record and writes two files into
`bb-consultancy-engine/synthesis/`: `PATTERNS-cloud.md` (cross-client patterns in the
PATTERNS.md format, IDs P-901 upward) and `review-YYYY-MM-DD.md` (a plain-English note for
Thulaib, under 450 words). It commits to main and pushes. Model Opus 5, the casting model.
Tools Bash, Read, Write, Edit, Glob, Grep. No connectors: the create attached every claude.ai
connector by default and they were cleared the same minute, because the job needs git only.

The prompt it runs is `ROUTINE-PROMPT.md` in this folder. Change the prompt there first, then
update the routine, never the other way round.

## How the result reaches the Brain

1. Sunday 21:30 Colombo: `bb-end.sh` pushes `~/bb-consultancy` with `git pull --rebase` first,
   which brings `synthesis/` onto the Mac. A rebase conflict goes to a rescue branch and the
   backup log says so.
2. Monday 07:15: `build-brain-data.js` reads `synthesis/PATTERNS-cloud.md` with the same parser
   as PATTERNS.md (entries carry `via: cloud`, filed under bb-mother-brain) and the newest
   `synthesis/review-*.md` into `growth.review`. The source row "Cloud synthesis" turns from
   quiet to green.
3. The Growth page shows the review under "The brain's own review". Today's status line
   carries the Brain Index.

## How to check it ran

From a Claude Code session: `RemoteTrigger list_runs` with the routine id, then `get_run_log`
on the newest run. A run that never created a session (paused, cap, clone refused before start)
leaves no row, so also `get` the routine and read `enabled` and `next_run_at`. On the Mac:
`ls ~/bb-consultancy/synthesis/` on Monday morning should show a new review file, and the
Brain's Today line should say ten sources fed with none red.

Manage, pause or delete it at https://claude.ai/code/routines/trig_01VxpMAuq2pJQYJ4vqdQFuiZ

## What is not known yet

Whether the cloud environment can clone and push the two private repositories. The first run
tells. If it cannot, the run writes `synthesis/FAILED-<date>.md` in whichever repo it reached,
or the run log shows the clone refusal, and the fix is granting the environment access to the
two repositories on GitHub.
