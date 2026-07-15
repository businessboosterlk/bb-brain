# BB Digital Brain
A living map of every skill in the Business Booster Claude setup and every logged learning.
- The page never holds data: `build-brain-data.js` scans the real skill + learnings files and emits `brain-data.js`.
- Auto-refreshes every evening via `~/bb-intelligence-backup/bb-end.sh`. Manual: `node build-brain-data.js` then push.
- Depth = logged learning iterations (battle-testing), never a quality score.
