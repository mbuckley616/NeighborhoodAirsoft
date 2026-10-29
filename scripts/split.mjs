// Cut index.html's one inline script into plain <script src="js/NN-name.js"> files (backlog D.75, card fable/d75-split;
// ported from The Old Gates' scripts/split.py, docs/design/split-plan.md there).
//
//   node scripts/split.mjs --dry-run      the table of files, line ranges, sizes and lanes; the load-order check; writes nothing
//   node scripts/split.mjs --check        split into a temp folder, join it back, prove the sha256 equals the source, parsecheck it
//   node scripts/split.mjs --out DIR      write DIR/index.html and DIR/js/ (a copy to test against; --force over an old split)
//   node scripts/split.mjs                the real thing: write js/ next to index.html and rewrite index.html
//   [--src PATH]                          the index.html to split (default: the repo's)
//
// The cut points are PATTERNS, not marker comments: each entry in CUTS is the start of the first line of the region's first
// statement, so main can keep moving until the cut. Each anchor is checked against the code as it is on the day: it must
// match exactly one line, that line must begin a Program-level statement in column 0 (acorn says so), and no statement or
// comment may straddle the cut. Any failure stops the script and names the anchor. The cut then moves up over the blank and
// comment-only lines directly above the anchor (never past the end of the previous statement), so a region's banner comment
// travels with it.
//
// The load-order check: a classic script cannot call a function declared in a later file while it loads. From every
// top-level statement the script follows what runs at load (the statement itself, the bodies of the top-level functions it
// calls, transitively, and timers it starts; not event handlers, which fire after the page has loaded) and fails if that
// reaches a name declared in a later file.
//
// Each piece is the exact byte range of the source (the CSS and markup stay in index.html). js/manifest.json records what was
// done; scripts/join.mjs reverses it.
import fs from 'fs'; import os from 'os'; import path from 'path'; import crypto from 'crypto';
import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';

const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, '..');
const JS_DIR = 'js';

// [file name, anchor, lane]. The anchor is matched against the start of a line (top-level statements start in column 0).
// The first file has no anchor: it starts where the script starts. The two-digit prefix is the load order and nothing else.
// Lanes (CLAUDE.md, ## Lanes; Michael, decisions D.75, answer 2): maps, play, or core (shared by both).
export const CUTS = [
  ['10-game.js',          null,                                  'core'],  // the changelog header, VERSION, the Game object
  ['12-saves.js',         'const SAVE_KEY',                      'play'],  // SAVE_KEY, DEFAULT_PERSIST, saveGame/loadGame
  ['14-gear.js',          'const MAG_GUN_FIT',                   'play'],  // inventory, equipment, accessories, mags, buy/sell, the noodle, weight, GUN_SPECS, SHOP_CATALOG
  ['18-renderer.js',      'Game.renderer = new THREE.WebGLRenderer(', 'core'],  // renderer, camera, Scenes
  ['20-characters.js',    'const CHARACTERS = {',                'play'],  // CHARACTERS, voice lines, TTS
  ['24-scenarios.js',     'const REGIONS = {',                   'maps'],  // REGIONS, the briefing helpers, SCENARIOS
  ['26-audio.js',         'function initAudio(',                 'play'],  // audio, Settings, music, sound effects
  ['30-bedroom.js',       'const MAP_TABLE_PX',                  'maps'],  // the map table's paper, buildBedroomScene
  ['32-street-kit.js',    'function buildSethBackyardScene(',    'maps'],  // Seth's backyard; houses, trees, props, cars, forts
  ['34-scene-kit.js',     'function _hashStringToSeed(',         'maps'],  // seeded layouts, day/night, streetlamps, kids' lights and lasers, buildStreetRoad
  ['36-winnmark.js',      'const WM_REAL',                       'maps'],  // Winnmark Court
  ['38-bunratty.js',      'const BR_REAL',                       'maps'],  // Bunratty Court
  ['40-hollow.js',        'const HW = {',                        'maps'],  // the Hollow
  ['42-market-lot.js',    'function fitSignText(',               'maps'],  // the Riverside Market lot
  ['44-northcliff.js',    'function buildNorthcliffScene(',      'maps'],  // Northcliff Trace, the treehouse yard, the twins' course, the pool
  ['46-range.js',         'const RANGE_RINGS',                   'maps'],  // the backyard range
  ['48-other-maps.js',    'function buildBellfieldCourtScene(',  'maps'],  // Bellfield, Hollins Ridge High, Willow Bend, the store
  ['50-kids.js',          'function addVipCap(',                 'play'],  // the enemy factory, kids' gun meshes, createKid, poses, gait
  ['52-fp-guns.js',       'let fpGun = null',                    'play'],  // first-person gun models and hands
  ['54-fp-gear.js',       'const FP_GUN_MOUNT',                  'play'],  // first-person accessories, the workbench, shop pictures, loader/mag/walkie, pause and forfeit
  ['60-scene-entry.js',   'function enterBedroom(',              'core'],  // enterBedroom, crew starts, findClearSpawn, base markers
  ['62-backdrops.js',     'const EDGE_BACKDROPS',                'maps'],  // EDGE_BACKDROPS, holiday decor, costumes, addEdgeBackdrop
  ['64-scenario-flow.js', 'function enterScenario(',             'core'],  // enterScenario, the intro map, startScenario, match stats, endScenario
  ['66-menus-shop.js',    'function hideAllMenus(',              'play'],  // menus, the save menu, open/close map, the shop, the mirror, the loadout
  ['70-input.js',         'function requestPointerLock(',        'core'],  // pointer lock, keyboard and mouse, the gamepad
  ['72-player.js',        'const MOUSE_SENS',                    'play'],  // movement, stance, ladders, collisions, bedroom labels
  ['74-gun-hud.js',       'const COCK_FULL_TIME',                'play'],  // firing, updateGun, the held mesh, the HUD, reticle, eyewear
  ['76-bbs.js',           'function fireBB(',                    'play'],  // fireBB, spawnEnemyBB, hit routing, out kids, VIP, capture the flag, squad orders
  ['78-bb-flight.js',     'function updateBBs(',                 'play'],  // updateBBs, bounces, stuck BBs, hits, eliminateEnemy, the win check, the timer
  ['80-ai.js',            'function hasLineOfSight(',            'play'],  // cover, targeting, ladders for kids, updateEnemies
  ['84-main.js',          'const Tutorial = {',                  'core'],  // Tutorial, stepGame, tick, the settings screen, the title buttons
  ['90-progression.js',   'const PIN_SCENARIO_GROUPS',           'maps'],  // PIN_SCENARIO_GROUPS, ZONE_LADDER, isScenarioUnlocked
  ['92-summer-crew.js',   'const SUMMER_YEAR',                   'play'],  // the summer calendar and texts, the crew
  ['94-pickup-online.js', 'const PICKUP_MAPS',                   'play'],  // the Pickup Game board, online play
  ['95-coop.js',          'const COOP_SEND_SEC',                 'play'],  // v1.380 (D.73): co-op, a friend in your room and your matches
  ['96-phone.js',         'function isRivalMatch(',              'play'],  // the rival's score, the phone, teammates' cards
  ['97-map-screen.js',    'function scenarioLockReason(',        'maps'],  // the map screen's cards, briefs and pins
  ['98-boot.js',          'function cleanupScenarioScene(',      'core'],  // the result screen's buttons, closing buttons, the first tick()
];

const fail = msg => { console.error('split.mjs: ' + msg); process.exit(1); };
export const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// acorn is loaded only when a split is planned, so parsecheck can import CUTS without node_modules (CI's parse job has none)
let acorn = null;
const loadAcorn = () => { try { return acorn = acorn || createRequire(path.join(ROOT, 'package.json'))('acorn'); } catch (e) { fail('acorn is missing: run `npm install` (it is a devDependency)'); } };

// the one inline block: [openStart, bodyStart, bodyEnd, closeEnd] as string offsets, or null when there is none
export function findScript(html) {
  const opens = [...html.matchAll(/<script(?![^>]*\ssrc)[^>]*>/g)];
  if (!opens.length) return null;
  if (opens.length !== 1) fail(`expected one inline <script> block, found ${opens.length}`);
  const m = opens[0], end = m.index + m[0].length;
  if (m[0] !== '<script>' || html[end] !== '\n') fail('the inline block must open with a bare <script> tag followed by a newline');
  const close = html.indexOf('</script>', end);
  if (close < 0) fail('the inline block has no </script>');
  if (html[close - 1] !== '\n') fail('the inline block must end with a newline before </script>');
  return [m.index, end + 1, close, close + '</script>'.length];
}
export const localTags = html => [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
const lineOf = (s, off) => s.slice(0, off).split('\n').length;

function parse(body) {
  const comments = [];
  const ast = loadAcorn().parse(body, { ecmaVersion: 'latest', sourceType: 'script', locations: true,
    onComment: (block, text, start, end, sl, el) => comments.push({ sl, el }) });
  return { ast, comments };
}

// the cut lines: [{name, lane, a, b}] with 1-based inclusive script lines
export function plan(body) {
  for (const [ch, what] of [['\r', 'a carriage return'], [' ', 'U+2028'], [' ', 'U+2029']])
    if (body.includes(ch)) fail(`the script holds ${what}; acorn and this script would count lines differently`);
  const lines = body.split('\n');
  if (lines[lines.length - 1] !== '') fail('the script must end with a newline');
  lines.pop();
  const n = lines.length, { ast, comments } = parse(body);
  const stmts = ast.body.map(s => ({ type: s.type, line: s.loc.start.line, col: s.loc.start.column, endLine: s.loc.end.line }));
  // lines that are blank or hold nothing but comment
  const covered = new Array(n + 2).fill(false);
  lines.forEach((ln, i) => { if (ln.trim() === '') covered[i + 1] = true; });
  for (const c of comments) {
    const a = c.sl.line, b = c.el.line;
    const leadBlank = lines[a - 1].slice(0, c.sl.column).trim() === '', trailBlank = lines[b - 1].slice(c.el.column).trim() === '';
    for (let i = a + 1; i < b; i++) covered[i] = true;
    if (a === b) { if (leadBlank && trailBlank) covered[a] = true; }
    else { if (leadBlank) covered[a] = true; if (trailBlank) covered[b] = true; }
  }
  const cuts = [];
  for (const [name, anchor, lane] of CUTS) {
    if (anchor === null) { cuts.push({ name, lane, c: 1 }); continue; }
    const hits = []; lines.forEach((ln, i) => { if (ln.startsWith(anchor)) hits.push(i + 1); });
    if (hits.length !== 1) fail(`${name}: anchor ${JSON.stringify(anchor)} matches ${hits.length} lines${hits.length ? ` (${hits.join(', ')})` : ''}, not one`);
    const L = hits[0];
    const starts = stmts.find(s => s.line === L);
    if (!starts || starts.col !== 0) {
      const inside = stmts.find(s => s.line < L && L <= s.endLine);
      fail(`${name}: line ${L} (${JSON.stringify(anchor)}) does not begin a top-level statement${inside ? `; it sits inside the ${inside.type} that starts at line ${inside.line}` : ''}`);
    }
    const straddle = stmts.find(s => s.line < L && L <= s.endLine);
    if (straddle) fail(`${name}: a statement starting at line ${straddle.line} runs across line ${L}`);
    const prevEnd = Math.max(0, ...stmts.filter(s => s.endLine < L).map(s => s.endLine));
    let C = L;
    while (C - 1 > prevEnd && covered[C - 1]) C--;
    const cross = comments.find(c => c.sl.line < C && C <= c.el.line);
    if (cross) fail(`${name}: a comment starting at line ${cross.sl.line} runs across the cut at line ${C}`);
    if (cuts.length && C <= cuts[cuts.length - 1].c) fail(`${name}: its cut at line ${C} is not after ${cuts[cuts.length - 1].name}'s at line ${cuts[cuts.length - 1].c}`);
    cuts.push({ name, lane, c: C });
  }
  return { layout: cuts.map((x, i) => ({ name: x.name, lane: x.lane, a: x.c, b: i + 1 < cuts.length ? cuts[i + 1].c - 1 : n })), ast };
}

export function pieces(body, layout) {
  const lines = body.split('\n'); lines.pop();
  const out = layout.map(({ name, a, b }) => ({ name, text: lines.slice(a - 1, b).join('\n') + '\n' }));
  if (out.map(p => p.text).join('') !== body) fail('internal: the pieces do not concatenate back to the script');
  return out;
}

// --- the load-order check ---------------------------------------------------------------------------------------------
const isFn = n => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration');
// callbacks that run later than the page's own loading: DOM and window events (a 'load' handler runs after every file)
const DEFERRED = new Set(['addEventListener']);
// names a node evaluates, and (in `calls`) the ones it calls or hands to a call (a callback can run at once, as forEach's
// does). deep=false skips the bodies of functions that are only defined, not called, here
function namesIn(node, deep, out = new Set(), calls = new Set()) {
  const visit = (n, parent, key) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier') {
      if (parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return;
      if (parent && (parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && key === 'key' && !parent.computed) return;
      out.add(n.name);
      if (parent && (parent.type === 'CallExpression' || parent.type === 'NewExpression') && (key === 'callee' || key === 'arguments')) calls.add(n.name);
      return;
    }
    if (isFn(n) && !deep && !(parent && (parent.type === 'CallExpression' || parent.type === 'NewExpression') && key === 'callee')) return;
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && DEFERRED.has(n.callee.property.name)) {
      visit(n.callee, n, 'callee'); n.arguments.forEach(a => { if (!isFn(a)) visit(a, n, 'arguments'); }); return;
    }
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(x => visit(x, n, k)); else if (v && typeof v.type === 'string') visit(v, n, k);
    }
  };
  visit(node, null, null);
  out.calls = calls;
  return out;
}
export function loadOrderCheck(ast, layout, base = 0) {
  const fileOfLine = line => layout.findIndex(f => f.a <= line && line <= f.b);
  const decl = new Map(), fnBody = new Map();
  for (const s of ast.body) {
    const fi = fileOfLine(s.loc.start.line);
    if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') { decl.set(s.id.name, fi); if (s.type === 'FunctionDeclaration') fnBody.set(s.id.name, s); }
    else if (s.type === 'VariableDeclaration') for (const d of s.declarations) for (const nm of namesIn(d.id, true)) decl.set(nm, fi);
  }
  const reachCache = new Map();
  const reachOf = fname => {   // everything a top-level function's body names, following its calls into other top-level functions
    if (reachCache.has(fname)) return reachCache.get(fname);
    const seen = new Set(), todo = [fname];
    reachCache.set(fname, seen);
    while (todo.length) {
      const f = todo.pop(), names = namesIn(fnBody.get(f).body, true);
      for (const nm of names) if (!seen.has(nm)) { seen.add(nm); if (fnBody.has(nm) && names.calls.has(nm)) todo.push(nm); }
    }
    return seen;
  };
  const problems = [];
  for (const s of ast.body) {
    if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') continue;
    const fi = fileOfLine(s.loc.start.line), direct = namesIn(s, false), all = new Set(direct);
    for (const nm of direct.calls) if (fnBody.has(nm)) for (const x of reachOf(nm)) all.add(x);
    for (const nm of all) if (decl.has(nm) && decl.get(nm) > fi)
      problems.push(`index.html line ${s.loc.start.line + base} (${layout[fi].name}) reaches ${nm}, declared in the later ${layout[decl.get(nm)].name}`);
  }
  return problems;
}

// --- writing ------------------------------------------------------------------------------------------------------------
export function splitHtml(html, names) {
  const [o, , , c] = findScript(html);
  return html.slice(0, o) + names.map(n => `<script src="${JS_DIR}/${n}"></script>`).join('\n') + html.slice(c);
}

export function writeSplit(html, outDir, srcPath) {
  const [, bs, be] = findScript(html), body = html.slice(bs, be), base = lineOf(html, bs) - 1;
  const { layout } = plan(body), ps = pieces(body, layout);
  const jsdir = path.join(outDir, JS_DIR);
  fs.mkdirSync(jsdir, { recursive: true });
  const stale = fs.readdirSync(jsdir).filter(f => f.endsWith('.js') && !ps.some(p => p.name === f));
  if (stale.length) fail(`${jsdir} already holds files not in the layout: ${stale.sort().join(', ')}`);
  const files = ps.map((p, i) => {
    const data = Buffer.from(p.text, 'utf8');
    fs.writeFileSync(path.join(jsdir, p.name), data);
    return { name: p.name, lane: layout[i].lane, lines: [layout[i].a + base, layout[i].b + base], bytes: data.length, sha256: sha(data) };
  });
  const head = { what: "index.html's inline script cut into these files, in load order; scripts/join.mjs reverses it",
    source: path.relative(ROOT, srcPath).split(path.sep).join('/'), source_sha256: sha(Buffer.from(html, 'utf8')),
    source_lines: html.split('\n').length - 1, script_open: '<script>\n', script_close: '</script>' };
  const headJson = JSON.stringify(head, null, 1);
  fs.writeFileSync(path.join(jsdir, 'manifest.json'),
    headJson.slice(0, -2) + ',\n "files": [\n  ' + files.map(f => JSON.stringify(f)).join(',\n  ') + '\n ]\n}\n');
  fs.writeFileSync(path.join(outDir, 'index.html'), splitHtml(html, ps.map(p => p.name)));
  return { layout, ps, base };
}

function table(html, layout, ps, base) {
  const [o, , , c] = findScript(html);
  let total = 0;
  console.log(`${'file'.padEnd(24)} ${'lane'.padEnd(5)} ${'index.html lines'.padStart(17)} ${'n'.padStart(6)} ${'bytes'.padStart(10)}  first line`);
  layout.forEach((f, i) => {
    const nb = Buffer.byteLength(ps[i].text); total += nb;
    const first = (ps[i].text.split('\n').find(l => l.trim() && !l.trimStart().startsWith('//')) || '').slice(0, 52);
    console.log(`${(JS_DIR + '/' + f.name).padEnd(24)} ${f.lane.padEnd(5)} ${`${f.a + base}–${f.b + base}`.padStart(17)} ${String(f.b - f.a + 1).padStart(6)} ${nb.toLocaleString('en').padStart(10)}  ${first}`);
  });
  console.log(`${layout.length} files, ${total.toLocaleString('en')} bytes of script; index.html keeps ${(o + html.length - c).toLocaleString('en')} bytes of markup and CSS`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const src = path.resolve(opt('--src') || path.join(ROOT, 'index.html'));
  const html = fs.readFileSync(src, 'utf8');
  if (!findScript(html)) {
    if (localTags(html).length) { console.log(`${path.relative(ROOT, src)} is already split (${localTags(html).length} <script src> tags, no inline block); nothing to do`); process.exit(0); }
    fail('no inline <script> block and no js/ tags in ' + src);
  }
  const [, bs, be] = findScript(html), body = html.slice(bs, be), base = lineOf(html, bs) - 1;
  const { layout, ast } = plan(body);
  const problems = loadOrderCheck(ast, layout, base);
  if (args.includes('--dry-run')) {
    table(html, layout, pieces(body, layout), base);
    console.log(problems.length ? `load order: ${problems.length} problem(s)\n  ${problems.join('\n  ')}` : 'load order: no load-time code reaches a later file');
    process.exit(problems.length ? 1 : 0);
  }
  if (problems.length) fail(`load order: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  if (args.includes('--check')) {
    const { join } = await import('./join.mjs');
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'na-split-'));
    try {
      const w = writeSplit(html, d, src);
      table(html, w.layout, w.ps, w.base);
      const joined = join(path.join(d, 'index.html')).text;
      const h0 = sha(Buffer.from(html, 'utf8')), h1 = sha(Buffer.from(joined, 'utf8'));
      console.log(`source sha256 ${h0}\njoined sha256 ${h1}`);
      if (h0 !== h1) fail('the joined copy differs from the source');
      console.log('join: byte-identical');
      const r = spawnSync(process.execPath, [path.join(here, 'parsecheck.mjs'), path.join(d, 'index.html')], { encoding: 'utf8' });
      console.log(r.stdout.trim().split('\n').pop());
      if (r.status !== 0) fail('parsecheck failed on the split copy:\n' + r.stdout + r.stderr);
    } finally { fs.rmSync(d, { recursive: true, force: true }); }
    process.exit(0);
  }
  const outDir = opt('--out') ? path.resolve(opt('--out')) : path.dirname(src);
  if (fs.existsSync(path.join(outDir, JS_DIR, 'manifest.json')) && !args.includes('--force')) fail(`${outDir}/${JS_DIR}/ already holds a split; --force writes over it (porting an old branch: scripts/join.mjs)`);
  const w = writeSplit(html, outDir, src);
  table(html, w.layout, w.ps, w.base);
  console.log(`wrote ${outDir}/index.html and ${outDir}/${JS_DIR}/ (${w.ps.length} files + manifest.json)`);
}
