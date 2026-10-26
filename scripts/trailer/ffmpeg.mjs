// The ffmpeg Playwright installs for its own video recording (VP8/WebM only, no audio encoders), so the trailer needs
// nothing else installed.
import fs from 'fs';
import path from 'path';

export function ffmpegPath() {
  const base = path.join(process.env.LOCALAPPDATA || path.join(process.env.HOME || '', '.cache'), 'ms-playwright');
  const dir = fs.readdirSync(base).filter(d => d.startsWith('ffmpeg-')).sort().pop();
  const exe = fs.readdirSync(path.join(base, dir)).find(f => f.startsWith('ffmpeg'));
  return path.join(base, dir, exe);
}
