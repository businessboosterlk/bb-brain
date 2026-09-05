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
origin, and sector boxes included the spinal cord.
**Block:** normalise after scale in root space; centres are outlier-filtered
means. The self-test CENTRES check asserts every sector centre sits inside the
core radius.

## L-BRAIN-008 | The nightly push had no gate
**Symptom:** whatever sat in the worktree at 21:30 published itself, half-edited
or not.
**Root cause:** push_repo did `git add -A` with no verification.
**Block:** brain-agent.sh runs build, then verify-brain.js, then publishes only
on green, and SHOUTS (flag file plus notification) on red. bb-end.sh calls the
agent instead of pushing the brain itself.

## L-BRAIN-009 | Test bench mistaken for the live site
**Symptom:** "still the same thing shows" on a localhost preview.
**Block:** manual. Never leave a preview server running past a session, and any
bench copy carries a visible TEST BENCH banner if it is ever shown to Thulaib.
