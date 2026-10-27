// Put a split index.html (scripts/split.mjs) back together as the one-file build, and say whether it is byte-identical to
// the file the split was made from (backlog D.75; ported from The Old Gates' scripts/join.py).
//
//   node scripts/join.mjs                     join the repo's index.html + js/, compare with the hash js/manifest.json recorded
//   node scripts/join.mjs --against FILE      compare with FILE instead (the pre-split index.html)
//   node scripts/join.mjs --out FILE          also write the joined file (to node --check it, or to port an old branch)
//   [--src PATH]                              the split index.html to join (default: the repo's)
//
// It reads the <script src="js/…"> tags in order, checks them against js/manifest.json and the files on disk, and puts the
// pieces between a <script> and </script> in place of the tags. Exit 1 when the tags and the manifest disagree, or when the
// join is not identical to what --against names. Without --against, a join that differs from the recorded hash only says so
// (the js/ files have been edited since the split, which is normal); with --strict it fails.
//
// Porting a branch made before the split (CLAUDE.md, "The split layout"): join main into one file, patch the old branch's
// index.html diff onto it, and split that again with `node scripts/split.mjs --src <joined> --out . --force`.
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, '..');
const TAG = /<script src="(js\/[^"]+)"><\/script>/g;
const fail = msg => { console.error('join.mjs: ' + msg); process.exit(1); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// a Windows checkout with autocrlf shows CRLF; the repository holds LF
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

export function join(indexPath) {
  const html = read(indexPath), base = path.dirname(path.resolve(indexPath));
  const tags = [...html.matchAll(TAG)];
  if (!tags.length) fail(`${indexPath} has no <script src="js/…"> tags; is it already the one-file build?`);
  if (/<script(?![^>]*\ssrc)[^>]*>/.test(html)) fail(`${indexPath} still has an inline <script> block beside its js/ tags`);
  const mpath = path.join(base, 'js', 'manifest.json');
  if (!fs.existsSync(mpath)) fail('no js/manifest.json beside ' + indexPath);
  const manifest = JSON.parse(fs.readFileSync(mpath, 'utf8'));
  const names = tags.map(m => m[1].slice(3)), listed = manifest.files.map(f => f.name);
  if (names.join() !== listed.join()) fail(`the tag order [${names.join(', ')}] is not the manifest's [${listed.join(', ')}]`);
  for (let i = 1; i < tags.length; i++) {
    const between = html.slice(tags[i - 1].index + tags[i - 1][0].length, tags[i].index);
    if (between !== '\n') fail(`unexpected text between the ${names[i - 1]} and ${names[i]} tags: ${JSON.stringify(between)}`);
  }
  const onDisk = fs.readdirSync(path.join(base, 'js')).filter(f => f.endsWith('.js')).sort();
  if (onDisk.join() !== [...names].sort().join()) fail(`js/ holds [${onDisk.join(', ')}], the tags name [${[...names].sort().join(', ')}]`);
  const body = names.map(n => read(path.join(base, 'js', n))).join('');
  const first = tags[0], last = tags[tags.length - 1];
  return { text: html.slice(0, first.index) + manifest.script_open + body + manifest.script_close + html.slice(last.index + last[0].length), manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const src = path.resolve(opt('--src') || path.join(ROOT, 'index.html'));
  const { text, manifest } = join(src), data = Buffer.from(text, 'utf8'), got = sha(data);
  const against = opt('--against'), want = against ? sha(fs.readFileSync(against)) : manifest.source_sha256;
  console.log(`joined   ${got}  (${data.length.toLocaleString('en')} bytes, ${(text.split('\n').length - 1).toLocaleString('en')} lines)`);
  console.log(`${against ? 'against ' : 'recorded'} ${want}${against ? '' : `  (${manifest.source}, at the split)`}`);
  if (opt('--out')) { fs.writeFileSync(opt('--out'), data); console.log('wrote ' + opt('--out')); }
  if (got === want) console.log('byte-identical');
  else if (against || args.includes('--strict')) fail('the joined file is NOT identical');
  else console.log('differs: the js/ files or the markup have changed since the split');
}
