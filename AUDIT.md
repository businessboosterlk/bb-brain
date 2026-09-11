# Brain report card, 2026-09-11

**6.6 of 10** across 9 measured areas, 1 unknown (Is it used).

| area | score | why |
|---|---|---|
| Reliability | 7 | 60 green feeds and 13 failure lines in 7 days, cloud fallback present, heartbeat recorded |
| Backup | 9 | 130 places, 0 uncovered, 0 mismatches, audited 12h ago |
| Breadth | 8 | 149 skills, 887 lessons, 34 clients, 12 sources (0 red), 322 documents |
| Honesty | 7 | 28 open contradictions, 0 red sources, every lesson dated |
| The app | 9 | gate 46 of 46, payload 2.4MB, safe-area and phone checks present |
| Self-improvement | 6 | 1 gym entries in 14 days, 2 cloud reviews, 32 learnings files, 6 ledger days, index 30% |
| Security | 5 | passcode class: short digits; the locked file is public and can be guessed offline without limit |
| Depth | 3 | Brain Index 30%: 33 of 149 skills used on real work, 17 with confirmed lessons |
| Industry knowledge | 5 | 22 of 34 clients placed in 12 industries, 1.8 clients per industry |
| Is it used | UNKNOWN | the app records nothing about who opens it |

## Gaps, weakest first

1. **Is it used** (unknown): no idea whether anyone reads the brain. Close: BUILD. Prevented by: a usage count read here every audit.
2. **Depth** (3): 116 skills have never touched a client. Close: HUMAN. Prevented by: growth-ledger.json daily, Brain Index on Today.
3. **Security** (5): the lock is a short digits passcode on a public file. Close: DECIDE. Prevented by: passcode class scored here; never the value.
4. **Industry knowledge** (5): 12 clients not placed in an industry. Close: HUMAN. Prevented by: Industries tab names the unplaced.
5. **Self-improvement** (6): the daily gym prompt is not being used. Close: HUMAN. Prevented by: gym-log entries in the last 14 days counted here.
6. **Reliability** (7): feeds failing often. Close: BUILD. Prevented by: agent.log failure lines counted here every audit.
7. **Honesty** (7): 28 contradictions waiting for a ruling. Close: DECIDE. Prevented by: conflicts count shown on Today; a ruling closes each one.
8. **The app** (9): payload heavy for mobile data. Close: BUILD. Prevented by: payload bytes scored here every audit.

BUILD means a machine can close it. DECIDE means only Thulaib can. HUMAN means only real work closes it.
