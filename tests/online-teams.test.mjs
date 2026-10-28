// v1.366 (backlog D.2 step 2, card fable/d2-online-teams; Michael: A on "go on to teams", 21 Oct, with D.67 and D.68):
// a room of three through a stub transport (no network in CI; tests/online.test.mjs keeps the 1v1 and the PeerJS
// adapter). Two are headless games, the host and Reddy; the third, Bluey, is played from here as messages, because a
// third game in software GL ran this machine out of memory (three games in a plain pickup match reached 13.7 GB of
// 16 and a renderer crashed; two take 4.7). The host sets a 3v3 on Winnmark; Reddy and Bluey land on Red as they come
// and Bluey moves himself to Blue; Reddy picks one of Red's kids; START. Checked: both games build the same six, each
// from its own side; each sees everyone where they are, kids and Bluey included; tags in either game, and on Bluey,
// are the host's, and every count agrees; a dropped friend's spot is taken by his kid on the host's AI and the match
// ends normally; REMATCH takes the room back to the board with whoever is still in it.
// v1.367 (D.10's push-to-talk): the walkie on a stub mic (no real one headless): the host and Bluey are Blue, Reddy is
// Red with kids. The host is told Bluey's link and Bluey the host's, Reddy nobody's; holding T asks for the mic, calls
// Bluey and nobody else, and opens the track only while it is held; a call from Reddy is turned away; Bluey's key
// shows on the host's screen, Reddy's does not and goes to nobody on Blue; the settings' mute hangs up; Bluey's drop ends his call.
import { boot, check } from './lib/game.mjs';

const G = [await boot(), await boot()];   // G[0] hosts, G[1] (Reddy) joins
for (const g of G) await g.bedroom();
const [H, R] = G.map(g => g.page);
for (const p of [H, R]) await p.evaluate(() => {
  Net.makeTransport = (role, code, h) => {
    window.__h = h; window.__out = [];
    Promise.resolve().then(() => h.ready(code));
    return { send: (m, to) => window.__out.push({ m: JSON.stringify(m), to: to || null }), drop: id => { (window.__dropped = window.__dropped || []).push(id); },
      voice: (st, pids) => { window.__voice = { on: !!st, pids: pids.slice() }; window.__voiceCalls = (window.__voiceCalls || 0) + 1; },   // v1.367
      close: () => { window.__closedTx = (window.__closedTx || 0) + 1; } };
  };
  // v1.367: the mic is a silent stream from Web Audio, counted each time it is asked for
  NetVoice.getMic = () => { window.__micAsked = (window.__micAsked || 0) + 1; const c = new AudioContext(); return Promise.resolve(c.createMediaStreamDestination().stream); };
});
// One evaluate a game: what reached it, two steps, what it sends. The host's go to the guest they name, or to all;
// Bluey's ('g2') are kept here in `toBluey`, and what he says goes in `fromBluey`.
const stepIn = (p, inbox, frames = 2) => p.evaluate(([inbox, frames]) => {
  inbox.forEach(([m, from]) => window.__h && window.__h.data(JSON.parse(m), from));
  for (let i = 0; i < frames && Game.mode !== 'title'; i++) if (Game.mode === 'scenario') stepGame(1 / 60);
  return (window.__out || []).splice(0);
}, [inbox, frames]);
let toHost = [], toReddy = [], toBluey = [], fromBluey = [], hostSent = [];
const bluey = m => fromBluey.push([JSON.stringify(m), 'g2']);
let blueyState = null;   // where Bluey is, sent with each tick once the match is on
async function tick(frames = 2) {
  if (blueyState) bluey(Object.assign({ t: 's' }, blueyState));
  const out = await stepIn(H, toHost.splice(0).concat(fromBluey.splice(0)), frames);
  hostSent.push(...out.map(o => Object.assign(JSON.parse(o.m), { to: o.to })));
  for (const o of out) {
    if (!o.to || o.to === 'g1') toReddy.push([o.m, 'host']);
    if (!o.to || o.to === 'g2') toBluey.push(JSON.parse(o.m));
  }
  const rout = await stepIn(R, toReddy.splice(0), frames);
  for (const o of rout) toHost.push([o.m, 'g1']);
}
const run = async n => { for (let i = 0; i < n; i += 2) await tick(); await tick(0); };
const lastTo = t => toBluey.filter(m => m.t === t).pop();

// The room
await H.evaluate(() => { openPickupBoard(); Object.assign(pickupState, { map: 'winnmark', size: 3, lives: 3, clock: 0, tod: 'day' }); renderPickupBoard();
  document.getElementById('pickupOnlineBtn').click(); document.getElementById('netName').value = 'Hosty';
  document.getElementById('netName').dispatchEvent(new Event('input')); document.getElementById('netHostBtn').click(); });
await H.waitForFunction(() => document.getElementById('netCode'));
const code = await H.evaluate(() => document.getElementById('netCode').textContent);
await R.evaluate(code => { openPickupBoard(); document.getElementById('pickupOnlineBtn').click();
  document.getElementById('netName').value = 'Reddy'; document.getElementById('netName').dispatchEvent(new Event('input'));
  document.getElementById('netJoinCode').value = code; document.getElementById('netJoinBtn').click(); }, code);
await R.waitForFunction(() => (window.__out || []).length > 0);
await tick(0); await tick(0);
const ver = await H.evaluate(() => netVersion());
const look = await H.evaluate(() => Game.persist.look);
bluey({ t: 'hello', ver, name: 'Bluey', look, gun: 'pistol' });
await tick(0); await tick(0);
const room = p => p.evaluate(() => ({ me: Net.me, people: Net.people.map(x => x.name + ':' + x.side).join(','), kids: JSON.stringify(Net.kids),
  a: (document.getElementById('netSideA') || {}).textContent, b: (document.getElementById('netSideB') || {}).textContent,
  start: (document.getElementById('netStartBtn') || {}).textContent, move: !!document.querySelector('[data-grp="side"]'), picks: document.querySelectorAll('#netKids .pk-kid').length }));
const r1 = await room(H), r2 = await room(R), bl = lastTo('lobby');
console.log('   room', JSON.stringify(r1), JSON.stringify(r2));
check('the host’s room: both friends in, on Red as they come; each side’s other slots are kids; START is open; each guest is told the room',
  r1.people === 'Hosty:A,Reddy:B,Bluey:B' && r2.people === r1.people && r2.me === 'net_p1' && bl && bl.you === 'net_p2' && /START/.test(r1.start)
  && r2.move && /Reddy, Bluey/.test(r2.b) && JSON.parse(r1.kids).A.length === 2 && JSON.parse(r1.kids).B.length === 1, { r1, r2, bl });
// Bluey moves himself to Blue, and Reddy picks one of Red's kids (one off, another on, from his own board)
bluey({ t: 'side', side: 'A' });
await tick(0); await tick(0);
const pick = await R.evaluate(() => { const on = document.querySelector('#netKids .pk-kid.on'); const off = on.dataset.val; on.click(); return off; });
await tick(0); await tick(0);
const short = await room(H);
const id = await R.evaluate(() => [...document.querySelectorAll('#netKids .pk-kid')].find(x => !x.classList.contains('on') && !x.disabled).dataset.val);
await R.evaluate(id => document.querySelector(`#netKids .pk-kid[data-val="${id}"]`).click(), id);
await tick(0); await tick(0);
const r3 = await room(H), r4 = await room(R), kidsNow = JSON.parse(r3.kids);
console.log('   room', JSON.stringify(short), JSON.stringify(r3), JSON.stringify(r4));
check('a friend moves himself to Blue, and Red’s friend picks his side’s kids: START waits while Red is a kid short; both boards show the same room',
  /PICK THE KIDS/.test(short.start) && r3.people === 'Hosty:A,Reddy:B,Bluey:A' && r4.people === r3.people && kidsNow.A.length === 1 && kidsNow.B.length === 2
  && kidsNow.B.includes(id) && !kidsNow.B.includes(pick) && r4.kids === r3.kids && /START/.test(r3.start) && r4.picks > 0, { short, r3, r4, pick, id });

// START, the briefings, BEGIN everywhere (Bluey says he is ready)
await H.evaluate(() => document.getElementById('netStartBtn').click());
await tick(0);
const match = lastTo('match');
const intro = [await G[0].mode(), await G[1].mode()];
for (const p of [H, R]) await p.evaluate(() => document.getElementById('introBeginBtn').click());
const waitTxt = await H.evaluate(() => document.getElementById('introBeginBtn').textContent);
bluey({ t: 'ready' });
await tick(0); await tick(0); await tick(0);
for (const p of [H, R]) await p.waitForFunction(() => Game.mode === 'scenario', null, { timeout: 90000, polling: 250 });
for (const p of [H, R]) await p.evaluate(() => { Game.mouse.locked = true; });
const go = lastTo('go');
check('START: both get the briefing, BEGIN waits for everyone, and each guest gets the roster and everyone’s start',
  intro.every(m => m === 'scenario_intro') && /WAITING FOR YOUR FRIENDS/.test(waitTxt) && match && match.roster.length === 6 && go && go.starts.net_p2 && go.starts.net_p0, { intro, waitTxt, go });
const setup = p => p.evaluate(() => ({ me: Net.me, name: SCENARIOS.pickup_game.scenarioName, hits: Game.player.maxHits,
  others: Game.scenario.enemies.map(e => `${e.charId}:${e.team === 'player' ? 'ally' : 'foe'}:${e.remote ? 'r' : 'ai'}`).sort().join(',') }));
const sH = await setup(H), sR = await setup(R);
console.log('   host', JSON.stringify(sH), '\n   red ', JSON.stringify(sR));
const blueKid = kidsNow.A[0], redKids = kidsNow.B;
check('both games build the same 3v3 from their own side: the host runs the kids, a guest moves all five from the host’s word',
  sH.name === 'Online: 3v3' && sH.hits === 3 && sR.hits === 3
  && sH.others === [`${blueKid}:ally:ai`, 'net_p1:foe:r', 'net_p2:ally:r', ...redKids.map(k => `${k}:foe:ai`)].sort().join(',')
  && sR.others === [`${blueKid}:foe:r`, 'net_p0:foe:r', 'net_p2:foe:r', ...redKids.map(k => `${k}:ally:r`)].sort().join(','), { sH, sR });

// Everyone walks (Bluey from his start, east); each game sees everyone where the game that moves him has him
const bs = go.starts.net_p2;
const groundY = (x, z) => H.evaluate(([x, z]) => scenarioGroundY(x, z), [x, z]);   // a start is sent on the ground plane; his own game stands him on the grass
bs[1] = await groundY(bs[0], bs[2]);
blueyState = { p: bs.slice(), y: 0, c: 0, r: 0, g: 0 };
await run(30);
await H.evaluate(() => { Game.keys['KeyW'] = true; }); await R.evaluate(() => { Game.keys['KeyA'] = true; });
for (let i = 0; i < 30; i++) { blueyState.p[0] += 0.05; if (i % 10 === 9) blueyState.p[1] = await groundY(blueyState.p[0], blueyState.p[2]); await tick(); }
for (const p of [H, R]) await p.evaluate(() => { Game.keys['KeyW'] = Game.keys['KeyA'] = false; });
await run(20);
const where = p => p.evaluate(() => { const o = { [Net.me]: Game.player.pos.toArray() }; for (const [id, e] of Net.ents) o[id] = e.pos.toArray(); return o; });
const wH = await where(H), wR = await where(R);
const d = (u, v) => Math.hypot(u[0] - v[0], u[2] - v[2]);
const err = { redSeesHost: d(wR.net_p0, wH.net_p0), hostSeesRed: d(wH.net_p1, wR.net_p1), hostSeesBluey: d(wH.net_p2, blueyState.p), redSeesBluey: d(wR.net_p2, blueyState.p),
  blueyMoved: d(blueyState.p, bs), kids: Math.max(...[blueKid, ...redKids].map(k => d(wR[k], wH[k]))) };
for (const k in err) err[k] = +err[k].toFixed(3);
console.log('   where', JSON.stringify(err));
check('everyone sees everyone where he is: people within 10 cm (Bluey reaches Reddy through the host), kids within 40 cm',
  err.blueyMoved > 1 && Object.entries(err).every(([k, v]) => k === 'blueyMoved' || (k === 'kids' ? v < 0.4 : v < 0.1)), err);

// v1.367 (D.10): the walkie to your own side
const talk = p => p.evaluate(() => ({ hud: document.getElementById('netTalkHud').textContent, shown: document.getElementById('netTalkHud').style.display,
  on: document.getElementById('netTalkHud').classList.contains('on'), mates: JSON.stringify(NetVoice.mates), voice: window.__voice || null,
  asked: window.__micAsked || 0, talking: NetVoice.talking, track: NetVoice.mic ? NetVoice.mic.getAudioTracks().map(t => t.enabled).join() : '' }));
const pttTo = () => hostSent.splice(0).filter(m => m.t === 'ptt').map(m => `${m.to}:${m.id}:${m.on}`).join(',');
const tm0 = await talk(H), tr0 = await talk(R), blMates = lastTo('mates');
console.log('   walkie', JSON.stringify(tm0), JSON.stringify(tr0), JSON.stringify(blMates));
check('the walkie: the host is told Bluey’s link and Bluey the host’s, Reddy (alone on Red) nobody’s; the hint shows on Blue only, and no mic is asked for',
  tm0.mates === '{"net_p2":"g2"}' && blMates && JSON.stringify(blMates.m) === '{"net_p0":"host"}' && tr0.mates === '{}'
  && /hold T to talk to your side/.test(tm0.hud) && tm0.shown === 'block' && tr0.shown === 'none' && tm0.asked === 0 && tr0.asked === 0, { tm0, tr0, blMates });
hostSent.length = 0;
await H.evaluate(() => { Game.keys.KeyT = true; });
await run(6);
const tm1 = await talk(H), sent1 = pttTo();
await H.evaluate(() => { Game.keys.KeyT = false; });
await run(4);
const tm2 = await talk(H), sent2 = pttTo();
console.log('   T held', JSON.stringify(tm1), sent1, '\n   let go', JSON.stringify(tm2), sent2);
check('holding T asks for the mic once, calls Bluey and nobody else, and opens the track only while held; Bluey is told each way, Reddy never',
  tm1.asked === 1 && tm1.voice && tm1.voice.on && tm1.voice.pids.join() === 'g2' && tm1.talking && tm1.track === 'true' && /TALKING TO YOUR SIDE/.test(tm1.hud) && tm1.on
  && sent1 === 'g2:net_p0:1' && !tm2.talking && tm2.track === 'false' && tm2.voice.on && sent2 === 'g2:net_p0:0' && tm2.asked === 1, { tm1, tm2, sent1, sent2 });
// Calls coming in: Bluey's is taken and played through the walkie's band; Reddy's is turned away
const inc = await H.evaluate(() => { const st = new AudioContext().createMediaStreamDestination().stream;
  const ok = [window.__h.voiceOk('g2'), window.__h.voiceOk('g1')]; window.__h.voiceIn('g2', st); window.__h.voiceIn('g1', st);
  const v = NetVoice.heard.get('g2'); return { ok, heard: [...NetVoice.heard.keys()].join(), gain: v && v.gain ? v.gain.gain.value : null }; });
// Bluey keys his walkie: the host sees it; Reddy's key reaches nobody on Blue
bluey({ t: 'ptt', on: 1 });
await run(2);
const tm3 = await talk(H);
bluey({ t: 'ptt', on: 0 });
toHost.push([JSON.stringify({ t: 'ptt', on: 1 }), 'g1']);
await run(2);
const tm4 = await talk(H), sent4 = pttTo();
await R.evaluate(() => { Game.keys.KeyT = true; });
await run(4);
await R.evaluate(() => { Game.keys.KeyT = false; });
await run(2);
const tr1 = await talk(R);
console.log('   calls in', JSON.stringify(inc), '\n   Bluey talks', JSON.stringify(tm3), '\n   Reddy keys', JSON.stringify(tm4), sent4, JSON.stringify(tr1));
check('a call from Bluey is played (through the band, at full), Reddy’s turned away; Bluey’s key shows on the host’s screen; Reddy’s shows nowhere on Blue, and his T asks for no mic',
  inc.ok[0] && !inc.ok[1] && inc.heard === 'g2' && inc.gain > 1 && /Bluey/.test(tm3.hud) && tm3.on && !/Reddy|Bluey/.test(tm4.hud) && !tm4.on && sent4 === ''
  && tr1.asked === 0 && !tr1.talking && tr1.shown === 'none', { inc, tm3, tm4, sent4, tr1 });
// The settings' mute: the calls hang up, a call in goes quiet, and T does nothing
await H.evaluate(() => { Settings.voiceChat = false; applySettings(); Game.keys.KeyT = true; });
await run(4);
const tm5 = await talk(H), mutedGain = await H.evaluate(() => NetVoice.heard.get('g2').gain.gain.value), sent5 = pttTo();
await H.evaluate(() => { Game.keys.KeyT = false; Settings.voiceChat = true; applySettings(); });
await run(2);
const tm6 = await talk(H);
console.log('   muted', JSON.stringify(tm5), mutedGain, sent5, JSON.stringify(tm6.voice));
check('“Walkie online” off: the calls hang up, Bluey goes quiet, T sends nothing; back on, Bluey is called again',
  !tm5.voice.on && mutedGain === 0 && !tm5.talking && sent5 === '' && /muted/.test(tm5.hud) && tm6.voice.on && tm6.voice.pids.join() === 'g2', { tm5, mutedGain, sent5, tm6 });

// The kids' shots fly in the guest's game
await R.evaluate(() => { window.__kidShots = 0; const f = window.netSpawnShot; window.netSpawnShot = (m, k) => { if (!/^net_p/.test(m.id || '')) window.__kidShots++; return f(m, k); }; });
let ks = 0;
for (let i = 0; i < 30 && !ks; i++) { await run(30); ks = await R.evaluate(() => window.__kidShots); }
check('a kid’s shots in the host’s game fly in the guest’s too', ks > 0, ks);
// from here the kids hold fire and the counts start fresh, so the tags below are the people's
await H.evaluate(() => { for (const e of Game.scenario.enemies) if (!e.remote) e.noFire = true; });
for (const p of [H, R]) await p.evaluate(() => { Game.player.hitsTaken = 0; Game.player._goingHome = false; Game.player._graceT = 0; Game.scenario.playerRespawns = 0; });
await H.evaluate(() => { for (const e of Net.ents.values()) if (e.remote) { e.lives = 3; e.health = e.maxHealth || 1; e._graceT = 0; e._netResp = 0; } });
await run(10);

const lives = async () => ({
  host: await H.evaluate(() => ({ me: Game.player.maxHits - Game.player.hitsTaken, red: Net.ents.get('net_p1').lives, bluey: Net.ents.get('net_p2').lives, left: pickupLivesLeft() })),
  red: await R.evaluate(() => ({ me: Game.player.maxHits - Game.player.hitsTaken, host: Net.ents.get('net_p0').lives, bluey: Net.ents.get('net_p2').lives, left: pickupLivesLeft() })),
});
const shoot = (p, id) => p.evaluate(id => { const k = Net.ents.get(id), P = Game.player;
  P.pitch = Math.atan2(k.pos.y + 0.85 - (P.pos.y + P.eyeOffset), Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z));
  P.yaw = Math.atan2(-(k.pos.x - P.pos.x), -(k.pos.z - P.pos.z)); stepGame(1 / 60); Game.gun.ammo = Math.max(Game.gun.ammo, 5); return fireBB(); }, id);
const nextTo = (p, id, dist) => p.evaluate(([id, dist]) => { const k = Net.ents.get(id), P = Game.player;
  P.pos.set(k.pos.x + dist, scenarioGroundY(k.pos.x + dist, k.pos.z), k.pos.z); P.vel.set(0, 0, 0); }, [id, dist]);

// Reddy shoots Bluey at 3.5 m: the tag is the host's; Bluey is told, and both games count it
await nextTo(R, 'net_p2', 3.5);
await run(10);
let L, tries = 0;
do { await shoot(R, 'net_p2'); await run(30); L = await lives(); tries++; } while (L.host.bluey === 3 && tries < 8);
const told = lastTo('tag'), marker = await R.evaluate(() => Game.scenario.stats.tags.length);
console.log('   after Reddy shoots Bluey', tries, 'times:', JSON.stringify(L), JSON.stringify(told));
check('a friend’s tag on a friend goes through the host: Bluey is told (one gone), both games give him two, and Reddy sees his tag',
  L.host.bluey === 2 && L.red.bluey === 2 && told && told.n === 1 && told.r === 1 && marker >= 1
  && L.host.left.ours === L.red.left.theirs && L.host.left.theirs === L.red.left.ours, { L, told, marker });
blueyState.g = 2; blueyState.r = 1;   // he walks home, gun up
await run(10);
blueyState.p = bs.slice(); blueyState.g = 0;
await run(150);

// The host shoots Reddy
await nextTo(H, 'net_p1', 3.5);
await run(10);
tries = 0;
do { await shoot(H, 'net_p1'); await run(30); L = await lives(); tries++; } while (L.red.me === 3 && tries < 8);
const redHome = await R.evaluate(() => Game.player._goingHome);
console.log('   after the host shoots Reddy', tries, 'times:', JSON.stringify(L));
check('the host’s tag on Reddy: two left in both games, he walks home, and the lives left agree side for side',
  L.red.me === 2 && L.host.red === 2 && L.host.left.ours === L.red.left.theirs && L.host.left.theirs === L.red.left.ours && redHome, { L, redHome });

// Bluey drops: his kid plays on in the host's game, Reddy is told, and the match ends normally
await H.evaluate(() => window.__h.closed('g2'));
blueyState = null;
await H.evaluate(() => { for (const e of Game.scenario.enemies) if (!e.remote) e.noFire = false; });
await run(120);
const dropH = await H.evaluate(() => { const k = Net.ents.get('net_p2'); return { mode: Game.mode, remote: k.remote, bot: k.netBot, state: k.state, lives: k.lives, team: k.team }; });
const dropR = await R.evaluate(() => ({ mode: Game.mode, hud: document.getElementById('netHud').textContent, remote: Net.ents.get('net_p2').remote }));
const dropV = await H.evaluate(() => ({ voice: window.__voice, mates: JSON.stringify(NetVoice.mates), heard: NetVoice.heard.size, hud: document.getElementById('netTalkHud').style.display }));
console.log('   drop', JSON.stringify(dropH), JSON.stringify(dropR), JSON.stringify(dropV));
check('v1.367: Bluey’s drop ends the walkie with him: no calls out, his call in gone, the hint hidden', dropV.voice.pids.length === 0 && dropV.mates === '{}' && dropV.heard === 0 && dropV.hud === 'none', dropV);
check('a dropped friend’s spot is taken by a kid: Blue’s, on the host’s AI with his lives left, and Reddy is told',
  dropH.mode === 'scenario' && !dropH.remote && dropH.bot && dropH.state !== 'online' && dropH.lives >= 1 && dropH.team === 'player'
  && dropR.mode === 'scenario' && /BLUEY LEFT · A KID PLAYS THE SPOT/.test(dropR.hud) && dropR.remote, { dropH, dropR });
// Red runs out: each of its kids takes his last tag in the host's game, then Reddy his
await H.evaluate(() => { for (const e of Game.scenario.enemies) if (e.team !== 'player' && !e.remote) { e.lives = 1; e._graceT = 0; e.health = Math.max(1, e.health); e.state = 'hiding'; eliminateEnemy(e); } });
await run(10);
const out1 = await H.evaluate(() => Game.mode);
await H.evaluate(() => { const k = Net.ents.get('net_p1'); k.lives = 1; k._graceT = 0; if (k._netT) k._netT.g = 0;
  netTagRemote({ owner: 'enemy', enemyRef: null, pos: Game.player.pos.clone(), spawnPos: Game.player.pos.clone() }, k); });
await run(60);
await H.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 250 }).catch(() => {});
await tick(0);
await R.waitForFunction(() => Game.mode === 'result', null, { timeout: 30000, polling: 250 }).catch(() => {});
const res = p => p.evaluate(() => ({ mode: Game.mode, out: document.getElementById('outcomeText').className, again: document.getElementById('navAgainBtn').textContent,
  dis: document.getElementById('navAgainBtn').disabled, flavor: document.getElementById('flavorText').textContent, out2: Game.player._netOut }));
const eH = await res(H), eR = await res(R);
console.log('   end', out1, JSON.stringify(eH), JSON.stringify(eR));
check('Red’s kids out, the match waits on Reddy; his last life ends it: Blue won in the host’s game, Red lost in Reddy’s, and REMATCH is the host’s',
  out1 === 'scenario' && eH.mode === 'result' && eR.mode === 'result' && /win/.test(eH.out) && /lose|out/.test(eR.out) && eR.out2
  && eH.again === 'REMATCH' && !eH.dis && eR.dis, { out1, eH, eR });

// REMATCH: back to the room, Bluey gone, Reddy still on Red
await H.evaluate(() => document.getElementById('navAgainBtn').click());
await tick(0); await tick(0); await tick(0);
const rH = await room(H), rR = await room(R), mH = await G[0].mode(), mR = await G[1].mode();
console.log('   rematch', mH, mR, JSON.stringify(rH), JSON.stringify(rR));
check('REMATCH takes the room back to the board: the host and Reddy there, Bluey gone, the code the same',
  mH === 'modal' && mR === 'modal' && rH.people === 'Hosty:A,Reddy:B' && rR.people === rH.people
  && await H.evaluate(c => Net.code === c && Net.phase === 'lobby', code) && await R.evaluate(() => Net.phase === 'lobby'), { rH, rR });

const errs = G.flatMap(g => g.errs);
check('no page errors in either game', errs.length === 0, errs);
for (const g of G) await g.close();
