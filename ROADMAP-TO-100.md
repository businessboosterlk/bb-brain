# The Brain, from 76 to 100 on one press planning

Written 18 September 2026. Scale and readings: memory file brain-one-button-planning-score.

## What was measured today
- A plan cast needs 251 fields filled by a person in `q4-2026/CLIENT-DATA-TEMPLATE.json`.
- Across the 7 real casts (7,090 values), 26 percent of the values already sit word for word in that client's folder or memory. Exact match, so a floor.
- By block: Q3 numbers 75, locks 57, owner sheet 53, goals 49, paid 41, platforms 34, question map 31, month content 16, year ahead 3, cards 2.
- Reading: facts are mostly on file, judgement is not. One press means facts filled with a source, judgement drafted, a person approving.
- Usage is unknown. Gym log has one entry in September. 118 of 153 skills have never touched a client. 147 client asks have no task. Payload 2.7 MB.
- Security: 32 client chats now sit inside the public file behind a short digits passcode.

## The four steps
1. PREFILL (76 to 84). `prefill.py` beside fit, build and verify. Reads the Brain data, the client folder, WhatsApp lines and BB-METRICS. Writes `data.draft.json` with a source on every field. Unknown stays UNKNOWN, never guessed.
2. BACKTEST AND REVIEW SCREEN (84 to 92). The 7 approved casts are the answer key. Score the draft against them per block, fail the build under the bar. The Brain gets a Draft plan button on the client dossier that queues a job, and a review screen in three colours: filled from a source, drafted, needs you.
3. FINISH THE FEEDING (92 to 97). 15 clients with no chat export, 8 with no industry, Cherry Fish and Cherry Kitchen with no BRAIN.md, three client types each with a mould.
4. CLOSE THE LOOP (97 to 100). In January grade every Q4 plan against what happened and write the grade into the pillars. Log every human edit to a draft: the edit rate is the one number that says whether the Brain is getting smarter.

## Rules for the build
- No generation inside the public page. A front end cannot hold a secret. The button queues a row, a runner does the work, same shape as the cloud feed.
- Prior art: fit.py, build_plan.py, verify_plan.py, cloud-build.sh, bridge-chat-asks.js.
- Decide first: long passphrase or move the data behind a login.

## Visual memory, images and videos (scoped 18 September 2026, not built)
Saving and learning are two jobs. The Brain is made of words, so a picture only teaches it something once it carries a card of facts.

Measured: the 20 client chat exports left out 530 images, 61 videos and 313 documents, because they were exported without media. Each of those sits next to the client's own yes, no or change request. Re-exported with media, that is a labelled record of what every client approves and rejects.

Proved on `LGL-MAY-T7-V1_14-05-2026.mp4`: 34 MB, 51 seconds, vertical. ffmpeg cut it to a six frame sheet of 59 KB, about 600 times smaller. From the sheet alone the card can say: Sinhala presenter in the shop's own polo, filmed on the shop floor with staff at the till, a Lights By LGL badge, large green Sinhala captions on the two year warranty, a whip transition, the 3D logo to close.

The card, one JSON beside each file: client, date, kind (post, story, reel, deck page, site screen), what it shows, words on it, language, format and length, the hook in the first three seconds, brand rules kept or broken, the client's verdict and their reason in their own words, result if known, where the original lives.

Shape of the lane: drop zone `~/bb-brain-inbox/<client>/visuals/`, a bb-visual-intake skill where Claude looks at each file and writes the card, the Brain builder reads cards only, a Visuals shelf on the client dossier with the small sheet, a check that fails on a card with no client or no verdict field.

Rules: originals never go in the public Brain file or a git repo. They stay in Google Drive where the team already shares them. The Brain holds the card, a small sheet and the link. No speech to text tool is installed, so spoken words come from the script until one is added. Settle the passcode before any client creative goes in.
