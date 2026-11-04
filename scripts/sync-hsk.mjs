// Compatibility entry point: official PDF extraction now owns vocabulary synchronization.
import { spawnSync } from 'node:child_process';
const result = spawnSync('python3', ['scripts/sync-official-hsk.py', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
