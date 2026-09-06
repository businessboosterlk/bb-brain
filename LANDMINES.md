# BB DIGITAL BRAIN LANDMINES

Every bug fixed here becomes a named block so its class cannot return. Owned by
bb-rock-solid. Automated blocks live in verify-brain.js (the pipeline gate) and
the in-page self-test (`?selftest`). Manual ones say so.

## L-BRAIN-001 | The generator read a dead memory folder for a month
**Symptom:** 98 memory files parsed fine, site refreshed nightly, every check
green, 68 live files invisible. Found 2026-08-23, fixed 2026-08-30.
**Root cause:** a stale path corrected in two sibling files was never grepped
for a third copy.
**Block:** build EXITS 1 when the newest memory is over 21 days old. Proven both
ways. verify-brain.js also fails when the memory source is over 7 days old.

## L-BRAIN-002 | The landing state showed the old brain
**Symptom:** live site opened on the constellation while every test passed.
**Root cause:** tests drove the app through setView; a plain load calls nothing.
**Block:** boot routes the default view through setView; verify-brain.js asserts
the boot line exists; the self-test has a PLAIN LOAD check that touches nothing.

## L-BRAIN-003 | Phantom clients from working folders
**Symptom:** "Cards" listed as a top client with 40 facts, count read 37.
**Root cause:** every consultancy folder auto-joined the roster, including
tooling folders and BB itself.
**Block:** meaning-stated skip list in buildRoster; verify-brain.js fails on any
phantom name; self-test repeats the check on the loaded data.

## L-BRAIN-004 | Fresh page, stale data
**Symptom:** a deploy showed old data for minutes on the live page and twice on
the test bench.
**Root cause:** browsers and GitHub Pages cache the data file for ten minutes.
**Block:** every build stamps the data reference with a version; verify-brain.js
fails without the stamp.

## L-BRAIN-005 | Present hid the 3D view
**Symptom:** Present mode blanked the 3D and fell back to the constellation.
**Root cause:** `body.present .tl{display:none}` hides every .tl container and
the 3D view is one.
**Block:** `body.present #explore-view{display:block!important}`; the self-test
enters Present and asserts the show runs on the 3D.

## L-BRAIN-006 | Loader hung at 96 percent
**Root cause:** the draco wasm wrapper never shipped locally.
**Block:** the js decoder is forced against the two files that do ship;
verify-brain.js asserts the decoder files and the config line exist. Manual
check: any decoder path change must be exercised in a sabotage copy.

## L-BRAIN-007 | Every camera tween flew into empty space
**Root cause:** the model was recentred before scaling, leaving it 19 units off
origin and sector boxes included the spinal cord.
**Block:** normalise after scale in root space; centres are outlier-filtered
means. The self-test CENTRES check asserts every sector centre sits inside the
core radius.

## L-BRAIN-008 | The nightly push had no gate
**Symptom:** whatever sat in the worktree at 21:30 published itself, half-edited
or not.
**Root cause:** push_repo did `git add -A` with no verification.
**Block:** brain-agent.sh runs build, then verify-brain.js, then publishes only
on green and SHOUTS (flag file plus notification) on red. bb-end.sh calls the
agent instead of pushing the brain itself.

## L-BRAIN-009 | Test bench mistaken for the live site
**Symptom:** "still the same thing shows" on a localhost preview.
**Block:** manual. Never leave a preview server running past a session and any
bench copy carries a visible TEST BENCH banner if it is ever shown to Thulaib.

## L-BRAIN-010 | A check that scans the page found itself
**Symptom:** the agent's very first real run refused to publish: "no secret
literals in index" and the rock-solid guard both went red the moment the
in-page self-test was added.
**Root cause:** the self-test carried the secret PATTERNS as literal text and
both the page verifier and guard.py scan the page for those patterns. The check
matched its own source. Same class as the registry's "a check must not search
a document that CONTAINS the check".
**Block:** every scanner that reads the page assembles its patterns from pieces
at runtime, never as literals. Proven: the agent went red on the literal form
and green once assembled. Manual rule for future checks: if a check scans a
surface, its own text must not be able to satisfy it.

## L-BRAIN-011 | The lit sector was a white blob while every check was green
**Symptom:** 37 then 38 of 38 in-page checks and the captured picture failed the brief three ways.
**Root cause:** r137 treats a hex as linear light; emissive .3 plus bloom at threshold .62 whited
out the region and thirty additive client nodes on one spot summed to white.
**Block:** data colours converted once, emissive .09, bloom .8/.45/.3, client nodes blend normally.
Manual rule: every 3D change ships with captures of whole, lit, child, client and fallback at 390
and 1440. The harness proves state, never colour.

## L-BRAIN-012 | Another session's agent published the half-built engine three times
**Symptom:** live served a mid-build cinematic brain at 20:02, 20:05 and 20:16 on 2026-09-05.
**Root cause:** brain-agent.sh commits the whole worktree on green; the tree is shared.
**Block:** manual. Long builds land on a branch or a copy and merge once. See rock-solid L-031.

## L-BRAIN-013 | Harness checks that sleep flip red in a hidden pane
**Symptom:** the FALLBACK check went red three times on timing alone.
**Root cause:** a hidden Browser pane throttles timers to one-second ticks.
**Block:** the harness polls for the state it wants with a hard cap (until()), never a fixed sleep.

## L-BRAIN-014 | The morning run died on a bare PATH and the first fix pinned the wrong folder
**Symptom:** 07:20 on 2026-09-06, "node: command not found", yesterday's brain stayed live all day;
the flag file and notification fired but nobody read them until the evening.
**Root cause:** launchd runs with a bare PATH. The 21:30 run passes because bb-end.sh is a login
shell. The first fix pinned Homebrew's folder; node on this Mac lives in ~/.local/node/bin, so the fix
only passed in the interactive shell that already had it.
**Block:** brain-agent.sh exports its own PATH with the real node folder first, proven by running the
agent under `env -i` with a bare PATH before trusting it. Rule for every launchd job: prove it under a
bare PATH, never in a login shell. Open: the shout reaches a file and a Mac notification, not a phone.

## L-BRAIN-015 | One transient fetch failure turned a whole feed red
**Symptom:** 20:28 on 2026-09-06, "systems feed online: OFFLINE fetch failed", three dependent
checks red, publish refused, while the same endpoint answered 200 in 300ms a minute later.
**Root cause:** the system fetch tried once. A one-second blip read as an outage.
**Block:** three tries four seconds apart in the generator, then the honest OFFLINE. The agent's
refusal was correct behaviour and stays.
