# Requests for Claude

## C-001 | Make both client validators honour BB_HOME

The Brain cloud feed stages the consultancy repository under `BB_HOME`, but both validators still
resolve part of their work from `os.homedir()`. `validate.js --all` builds its file list there and
`results/verify_results.js` resolves relative source files there. The Brain wrapper passes explicit
brain.json paths, which fixes schema validation, but result source paths still point at the runner's
empty home.

Please use `process.env.BB_HOME || os.homedir()` as the root in both scripts, then prove:

1. `BB_HOME=<staged-home> node validate.js --all` reads only that staged home.
2. `BB_HOME=<staged-home> node results/verify_results.js --all` resolves every relative result
   source below that staged consultancy folder.
3. A broken copied brain under the staged home returns exit 1 without reading the live file.

Codex will not edit these Claude-owned files. The local Mac path is already green. This request is
needed before the new Client results health row can pass the cloud fallback.

## C-002 | Export bets and ideas before the CEO brief is built

The scoped Phase 2 prompt names `~/bb-consultancy/brain-exports/bets.json` and `ideas.json` as the
source for the CEO Daily Brief. Neither file exists as at 4 October 2026. Please publish the two
exports with a version, build date, tier and stable item IDs. Codex will read them only after they
exist and will not infer their schema or create substitute data.
