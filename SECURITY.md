# BB Brain security design

Fable mould, 18 September 2026. The one place the Brain's lock is defined. Code: `lock-policy.js`,
the vault block in `build-brain-data.js`, THE LOCK in `index.html`, the vault gate in `verify-brain.js`.

## The threat, stated plainly
The Brain ships on a public web address. Anyone can download the encrypted file and guess at it
offline, for ever, with no lockout. The lock is only as strong as the phrase.

| Lock | Guesses needed | One gaming card |
|---|---|---|
| 8 digits | 100 million | about an afternoon |
| 5 random words | beyond counting | not in a lifetime |

The realistic attacker is not a hacker. It is a former team member, a rival agency or a curious
client who finds the address. The realistic loss is a client reading what another client said.

## Three tiers of data
| Tier | What | Rule |
|---|---|---|
| A, BB know-how | skills, lessons, pillars, rules, scores | public file, team lock |
| B, client words | Claude chat lines and decisions, asks, later reviewed Codex extracts, visuals and plan drafts | the VAULT, strong phrase or it stays on the Mac |
| C, originals | videos, images, contracts, anything with money | never in the Brain file or a git repo, a link only |

## The rules the code enforces
1. `lock-policy.js` is the only definition of strong: 20 characters or more, not digits only, and
   four words or three kinds of character. 12 fixed cases prove it on every gate run.
2. Tier B leaves this machine only under a strong phrase. Weak lock means the vault file is null,
   the public file carries counts and never quotes, and the app says where the lines are.
3. The gate opens the PUBLISHED files, not the local one, and fails if one client quote is inside.
4. One strong phrase in `~/.bb-brain-pass` opens both files. A separate `~/.bb-brain-vault-pass`
   exists only for the transition.
5. The derived key is remembered per device, never the phrase. Changing the phrase signs every
   device out, which is the off switch when someone leaves.
6. Nothing prints, logs or commits a phrase. Claude never types one. Thulaib sets it himself.
7. Claude `discussed` lines and extracted decisions are Tier B. The public Brain carries their counts only. The lines live in `brain-vault.enc.js` only when a strong phrase is active, otherwise they remain in the local ignored build.
8. Codex Phase 1 is metadata only. It accepts only a session whose `session_meta.thread_source` is `user`, then only `response_item` records whose role is `user`. Developer, system, ambient, tool, guardian and sub-agent traffic is rejected.
9. Codex message text, file paths, email addresses, telephone numbers, passwords, tokens, data URLs and attachment content never enter either Brain artifact in Phase 1. Only counts, timestamps and one-way hashes of rollout and message identifiers leave the reader.
10. A question is not a fact. Codex relationship flags show that a user message may concern a client, market, skill, decision, result, question or contradiction. They do not promote the message into BB knowledge. Promotion requires a reviewed Tier B intake in a later phase.

## Codex Phase 1 gate
`codex-ingest.js` reads `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` locally. The live session files remain Tier C and are never copied into this repository. `tests/test-codex-ingest.js` proves the following before the Brain builds:

1. Only top-level user threads are eligible.
2. Duplicate `payload.id` values count once.
3. Ambient context, developer and assistant records, non-text attachments and sub-agent threads are rejected.
4. Synthetic email, telephone, password, token and data URL values increase redaction counters but never appear in the report.
5. Relationship links contain hashed message identifiers only.

The verifier opens the published Brain and requires the Codex object to match this counts-only schema. An unexpected field, non-hash identifier or raw value blocks publication.

## How Thulaib switches to the long phrase (5 minutes, his hands only)
1. Pick five random words. Write them on paper first.
2. In Terminal: `printf '%s' 'your five words here' > ~/.bb-brain-pass && chmod 600 ~/.bb-brain-pass`
3. Same phrase into the GitHub secret: `gh secret set BB_PASS --repo businessboosterlk/bb-intelligence-backup`
4. Run `bash ~/bb-brain/brain-agent.sh`. The gate must say the vault is sealed and exit with no
   blocking failure. Any upstream warning, including Laptop safety, must still be shown and dealt with.
5. Tell the team the phrase by voice or in person, never in a chat group.

## Known and not yet fixed
- The public repository's HISTORY still holds older copies of the file under the 8 digit lock,
  including two from 18 September that carry client chat lines. A new phrase does not reach back.
  The fix is a one time history clean of that file, which rewrites public history and needs
  Thulaib's explicit go.
- Tier A still includes memory excerpts and client folder warnings that name clients and, in
  places, money. The long phrase covers them. Until then they sit behind the 8 digit lock.
- Identity is a picker, not a login. Real per person access means Supabase Auth, the posture the
  Dev System already uses. That is the next mould, not this one.
