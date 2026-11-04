import { spawnSync } from 'node:child_process';
if (process.env.EAS_BUILD_PROFILE === 'production') {
  const result = spawnSync('npm',['run','release:check'],{ stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(result.status ?? 1);
}
