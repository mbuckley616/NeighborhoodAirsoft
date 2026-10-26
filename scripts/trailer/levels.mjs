// Loudness of out/sound.wav per half second: a check that the mix has what it should, where it should.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const b = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', 'sound.wav'));
const sr = b.readUInt32LE(24), n = (b.length - 44) / 4, step = sr / 2;
for (let i = 0; i < n; i += step) {
  let s = 0, pk = 0;
  for (let j = i; j < Math.min(n, i + step); j++) { const v = b.readInt16LE(44 + j * 4) / 32768; s += v * v; pk = Math.max(pk, Math.abs(v)); }
  const rms = Math.sqrt(s / step);
  console.log((i / sr).toFixed(1).padStart(5), rms.toFixed(3), pk.toFixed(2), '#'.repeat(Math.round(rms * 300)));
}
