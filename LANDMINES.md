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

## L-BRAIN-016 | A new mouth was counted after the ledger had already counted the mouths
**Symptom:** the growth ledger recorded 9 of 9 sources on the day a tenth source went live.
**Root cause:** the cloud source row was pushed AFTER the ledger row was built, so the count was
one short before anyone could see it.
**Block:** the source row is registered before the ledger row is computed. Rule for every new
mouth: register the source, then count. A count taken mid-registration is a count of the past.

## L-BRAIN-017 | The cloud wrote markdown and the page printed the asterisks
**Symptom:** the first cloud review reached the Growth page as raw text, "**bold**" and "##"
visible, wrapped bullets run together into one sentence.
**Root cause:** the review was rendered with pre-wrap and escaping, no formatter.
**Block:** gMarkdown() renders heading, bold, bullet and numbered lines, escaping FIRST so the
routine's text can never become markup and folding wrapped lines into their item. The harness
fails if a double asterisk or a hash heading is visible on the page.

## L-BRAIN-018 | A text cap cut the brain's own review mid-sentence
**Symptom:** the review ended at "read a client's pub" on the page while the file was complete.
**Root cause:** a 1600-character slice sized before anyone had seen a real review.
**Block:** 4200 characters, which holds the 450-word note the prompt asks for with room to spare.
The cap exists only to stop a runaway file bloating the encrypted payload, never to trim content.

## L-BRAIN-019 | The morning feed failed because the Mac woke faster than its Wi-Fi
**Symptom:** 07:15 on 2026-09-07, "fetch failed" on the live tables, four checks red, no
publish. Supabase answered in 236ms two hours later from the same machine.
**Root cause:** the generator's three retries over eight seconds are right for a network blip
and far too short for a Mac that has just woken. This is not L-BRAIN-015 returning: that was a
blip mid-session, this is a wake race at the scheduled hour.
**Block:** brain-agent.sh waits up to two minutes for the Supabase host to answer BEFORE it
builds, then proceeds anyway so it can never hang. The agent owns "am I ready to run", the
generator owns "read the data". The refusal to publish was correct behaviour and stays.

## L-BRAIN-020 | The home-screen icon was the wordmark cropped to "USINESS OOSTER"
**Symptom:** Thulaib: "the app cover is so ugly". The icon was the full BUSINESS BOOSTER
wordmark squeezed into a square, so both words were cut off at both edges and read as an
illegible white smear at 60px. Four other BB apps had been fixed on 4 September. The Brain was
never included.
**Root cause:** a wordmark is not an icon and an estate-wide fix was applied per app by hand
with no list of which apps still carried the old one.
**Block:** build-icons.py generates every size from one canonical icon.svg and verify-brain.js
now proves each file exists, is the size it claims, is not a byte-for-byte copy of its
neighbour (eight identical files is how a dead render hides) and that the manifest declares
only files that exist. Manual rule: when a fix is applied per app, write down which apps were
done, because the one that was missed is invisible until somebody complains.

## L-BRAIN-021 | A local named "out" shadowed the global and emptied the client roster
**Symptom:** every pillar's evidence list came back with zero recognised clients, silently.
**Root cause:** the pattern parser used `const out = []` for its own rows, shadowing the global
`out` object the whole build writes to, so `out.clients` inside it was undefined.
**Block:** the local is `rows`. What CAUGHT it was the count printed beside the list ("named
clients recognised: 0 of 33"). Rule: every list the generator builds prints its denominator,
because a silently empty list looks exactly like a list with nothing to say.

## L-BRAIN-022 | A free-text evidence line turned prose into client names
**Symptom:** the Pillars page said "32 pillars from 48 clients". BB has 33.
**Root cause:** a pattern's Tier line carries prose after the count ("n=4: Mold 1 gaps derived,
... not clients. It is a build principle") and splitting it on commas made sentence fragments
into client names.
**Block:** every parsed name is matched against the real client roster and anything unrecognised
is dropped, so a count on that page can only ever be clients the brain knows. A pillar with no
recognised names says "cases", never "clients". Same family as the estate's number rules: a
figure a reader can check is the only kind worth printing.

## L-BRAIN-023 | The safe-area variables were declared and applied nowhere
**Symptom:** on a notched iPhone the BUSINESS BOOSTER wordmark sat 10px from the top of
the screen, under the clock and the Dynamic Island and the last row of every page sat
under the home indicator. Measured 2026-09-09 with the inset forced to 59px.
**Root cause:** `--sat` and `--sab` were declared in `:root` and `viewport-fit=cover` was
present, so every grep for "safe-area-inset" said yes. `--sat` was used once, by a
`.statusfill` that had no background and therefore painted nothing. `--sab` was used zero
times. The knob existed and was never turned.
**Block:** the insets are applied to the header, the body, the toast, the bottom sheet,
both full-screen overlays, the report bar and the 3D stage and repeated inside the phone
breakpoint that resets the header, which is the one screen that has a notch. The self-test
forces a 59px island and asserts the chrome moved, forces zero and asserts no dead gap
and asserts the strip paints. **Rule for every audit: count USES, never declarations. A
grep for the knob's name passes on an app where the knob does nothing.**

### L-BRAIN-024 (2026-09-09): a relative path makes every symlink dangle, and only find -L notices
The cloud feed staged a fake home out of symlinks to the two repos. GitHub Actions passed the
repos as `../bb-intelligence-backup`, and `ln -s ../x target` points at `../x` relative to the
LINK, not the shell. Every link dangled. `ls` counted the dead names as present. `find -L` did
not, and the gate refused. Fix: `BACKUP="$(cd "$1" && pwd)"` once at the top; every count is
`find -L ... -type f`. Sibling: verify-brain.js reached guard.py via process.env.HOME, a
stranger's home in the cloud; it honours BB_HOME now. Proof runs 34320497086 (0 plugin skills),
34320823573 (guard not found), 34321070119 (43 of 43).

### L-BRAIN-025 (2026-09-09): a backup that copies a list can never find what is off the list
Seventy of 145 skills lived in a UUID folder under Library that no sync line named. The
backup said ok nightly. Only a RESTORE elsewhere (the cloud feed) found the gap. Fix:
coverage.py walks the laptop and fails the night on anything that is not git, synced,
a named secret or excluded with a written reason. Sibling: the Mac's rsync is openrsync,
which does not know --max-depth and exits 0 having copied one file; never silence its
stderr, and print the count of what was written.

### L-BRAIN-026 (2026-09-11): a page is five places, and a check that reads a hidden box passes
The Library renderer, route, menu item and container were all in, the harness passed seven
checks, and the page was invisible: applyView shows containers by an EXPLICIT list of
getElementById lines and the new one was not on it. The harness read textContent and
innerHTML, which a display:none box returns happily. Rule: adding a page to this app is
FIVE places (container, VIEW_EL, the applyView display line, the applyView render branch,
the menu) and every page check must first assert display block and offsetHeight over 200.
Sibling: a switch within 200ms of a switch left the old box with 'vout' for ever, because
clearTimeout skipped the removal; applyView now strips 'vout' from every box on entry.
