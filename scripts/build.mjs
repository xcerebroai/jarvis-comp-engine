/**
 * Build wrapper.
 *
 * Normal build (`npm run build`): just runs `next build`.
 *
 * GitHub Pages static export (`NEXT_PUBLIC_GITHUB_PAGES=true npm run build`):
 * temporarily excludes `src/app/api` (static export has no server runtime — the
 * browser runs analysis client-side via runClientMockAnalysis), runs the export,
 * then adds `.nojekyll` so GitHub Pages serves the `_next/` assets untouched.
 * The api directory is always restored, even if the build fails.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const isPages = process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true';
const API_DIR = join('src', 'app', 'api');
const API_HIDDEN = join('src', 'app', '_api.disabled');
const nextBin = join('node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');

function runNextBuild() {
  const res = spawnSync(nextBin, ['build'], { stdio: 'inherit', env: process.env });
  return res.status ?? 1;
}

let moved = false;
try {
  if (isPages && existsSync(API_DIR)) {
    if (existsSync(API_HIDDEN)) rmSync(API_HIDDEN, { recursive: true, force: true });
    renameSync(API_DIR, API_HIDDEN);
    moved = true;
    console.log('[build] GitHub Pages export: temporarily excluding src/app/api');
  }

  const code = runNextBuild();
  if (code !== 0) process.exit(code);

  if (isPages) {
    writeFileSync(join('out', '.nojekyll'), '');
    console.log('[build] Static export ready in out/ (.nojekyll added).');
  }
} finally {
  if (moved && existsSync(API_HIDDEN)) renameSync(API_HIDDEN, API_DIR);
}
