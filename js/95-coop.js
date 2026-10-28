// =====================================================================
// v1.380 (backlog D.73, card fable/d73-coop; Michael, 23 Oct: "have another player join your bedroom and join in all
// of your campaign matches ... they came over to 'hang out'"; his answer on 28 Oct, B: 1B 2A 3A 4A): CO-OP. A friend
// comes over by a four-letter code from the CO-OP button on your phone, the way a Pickup Game room is joined (the same
// link, Net, with `Net.coop` set). In your room he walks around as his own kid (his look from his save) and you see
// him; he can't start a match, shop, use the workbench or sleep (2A): only you can, and he is told so. Each game sends
// where its own person is about 15 times a second (`b`), and moves the other's kid from that word. The host's game
// says who is over (`coop`); either of you can end it from the phone, and a link that closes ends it too.
// v1.381 takes him into your matches (3A, 4A), with his share of the money (1B).
const COOP_SEND_SEC = 1 / 15;
const Coop = {
  other: null,    // the other person: { id, name, look, gun } (the host's: his friend; the guest's: the host)
  kid: null,      // the other's kid in your room: { mesh, pos, yaw, ... }
  T: null,        // where the other's game last said he is
  bAge: 0,        // v1.381: how long since it did
  match: null,    // v1.381: the match you are in together, { id, sc }
  friendArmor: 0, // v1.381: the host's: the friend's eyewear's extra hits
  sendT: 0,
};
function coopIsGuest() { return Net.active && Net.coop && Net.role === 'guest'; }
function coopTogether() { return Net.active && Net.coop && !!Coop.other; }

// --- the phone's CO-OP screen ---
function openCoopPanel() {
  try { const n = localStorage.getItem('na_online_name'); if (n) Net.name = netCleanName(n); } catch (e) {}
  Net.panel = 'coop';
  if (!Net.active) Net.error = null;
  document.getElementById('modalTitle').textContent = 'Co-op';
  renderCoopPanel(true);
}
function coopPanelHTML() {
  const busy = Net.active && Net.coop, other = Coop.other ? Coop.other.name : '';
  const err = Net.error ? `<div class="ph-coop-err" id="coopStatus">${NET_ERRORS[Net.error] || NET_ERRORS.net}</div>` : '';
  const back = `<div class="ph-ask"><button id="coopBackBtn" data-yes="0">◀ TEXTS</button></div>`;
  const privacy = `<div class="ph-coop-small">Co-op connects your computer straight to your friend’s, so each of you can see the other’s internet address, as in any voice chat. A free public service (PeerJS) passes on the code. Play with friends you know.</div>`;
  let html;
  if (Net.active && !Net.coop) {
    html = `<div class="ph-text">You’re in an online room. Leave it on the Pickup Game board first.</div>`;
  } else if (!busy) {
    html = `<div class="ph-text">Have a friend over: they hang out in your room and play at your side in your matches. Your summer is the one that moves on.</div>
      <div class="ph-coop-row">Your name <input class="ph-coop-in" id="coopName" maxlength="14" value="${netCleanName(Net.name)}"></div>
      <div class="ph-ask"><button id="coopHostBtn">HAVE A FRIEND OVER</button></div>
      <div class="ph-coop-row">Go to a friend’s <input class="ph-coop-in ph-coop-code" id="coopJoinCode" maxlength="4" placeholder="CODE" autocomplete="off">
        <span class="ph-ask"><button id="coopJoinBtn">GO OVER</button></span></div>${err}${privacy}`;
  } else if (Net.role === 'host' && !other) {
    html = Net.code ? `<div class="ph-coop-code-big" id="coopCode">${Net.code}</div>
      <div class="ph-text" id="coopNote">Your friend presses CO-OP on their phone, types this code and presses GO OVER.</div>`
      : `<div class="ph-text" id="coopNote">Opening your door…</div>`;
    html += `<div class="ph-ask"><button id="coopLeaveBtn" data-yes="0">NEVER MIND</button></div>`;
  } else if (Net.role === 'host') {
    html = `<div class="ph-text" id="coopNote"><b>${other}</b> is over. They come along to your matches; only you start them, shop, use the workbench or sleep.</div>
      <div class="ph-ask"><button id="coopLeaveBtn" data-yes="0">SEND ${other.toUpperCase()} HOME</button></div>`;
  } else if (!other) {
    html = `<div class="ph-text" id="coopNote">Knocking on the door…</div><div class="ph-ask"><button id="coopLeaveBtn" data-yes="0">NEVER MIND</button></div>`;
  } else {
    html = `<div class="ph-text" id="coopNote">You’re at <b>${other}</b>’s. You go along to their matches; they start them.</div>
      <div class="ph-ask"><button id="coopLeaveBtn" data-yes="0">GO HOME</button></div>`;
  }
  return `<div class="ph-screen ph-coop">${html}${back}</div>`;
}
// Redrawn as the link changes, but only over itself (`first`: opening it)
function renderCoopPanel(first) {
  const body = document.getElementById('modalBody');
  if (!body || !document.getElementById('modalScreen').classList.contains('active') || Game.mode !== 'modal' || Net.panel !== 'coop') return;
  if (!first && !body.querySelector('.ph-coop')) return;
  body.innerHTML = coopPanelHTML();
  const $ = id => body.querySelector('#' + id);
  if ($('coopName')) {
    $('coopName').addEventListener('input', () => { Net.name = netCleanName($('coopName').value); try { localStorage.setItem('na_online_name', Net.name); } catch (e) {} });
    $('coopName').addEventListener('keydown', ev => ev.stopPropagation());   // typing a name is not walking
    $('coopHostBtn').addEventListener('click', () => coopHost());
    $('coopJoinBtn').addEventListener('click', () => coopJoin($('coopJoinCode').value));
    $('coopJoinCode').addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') coopJoin(ev.target.value); });
  }
  if ($('coopLeaveBtn')) $('coopLeaveBtn').addEventListener('click', () => coopLeave());
  $('coopBackBtn').addEventListener('click', () => { const pm = Game.prevMode; Net.panel = null; Net.error = null; openPhone(); Game.prevMode = pm; });   // back to the texts, and closing them goes where the phone came from
}
function coopHost() { Net._tries = 0; netOpen('host', netNewCode(), true); }
function coopJoin(code) {
  code = netCleanCode(code);
  if (code.length !== 4) { Net.error = 'noroom'; renderCoopPanel(); return; }
  netOpen('guest', code, true);
}
// Ends it from your side: the link closes, and the other game hears it as a drop
function coopLeave() {
  if (Net.active && Net.coop) netClose();
  Net.error = null;
  renderCoopPanel();
}

// --- the messages (from netReceive while Net.coop): true when one was co-op's ---
function coopReceive(m, pid) {
  const host = Net.role === 'host';
  switch (m.t) {
    case 'coop': {   // you're in: who the host is (guest)
      if (host || Net.phase !== 'coop') return true;
      Net.me = netCleanId(m.you);
      Coop.other = { id: NET_HOST_ID, name: netCleanName(m.name), look: netCleanLook(m.look), gun: netCleanGun(m.gun) };
      Net.people = [{ id: NET_HOST_ID, name: Coop.other.name, side: 'A' }, { id: Net.me, name: netCleanName(Net.name), side: 'A' }];
      coopArrived();
      return true;
    }
    case 'b': {   // where the other is in the room
      if (Net.phase !== 'coop' || !Coop.other) return true;
      if (host && !Net.people.some(p => p.pid === pid && !p.gone)) return true;
      const p = netVec(m.p);
      if (p) { Coop.T = { x: p[0], y: p[1], z: p[2], yaw: +m.y || 0, c: m.c ? 1 : 0, g: 0, here: m.h ? 1 : 0 }; Coop.bAge = 0; }
      return true;
    }
    // v1.381 (step 2): the host's match (cm), one he plays alone (cwait), and his going home from the result (home)
    case 'cm': if (!host) coopMatchIn(m); return true;
    case 'cwait': if (!host && Coop.other && Net.phase === 'coop') netHud(`${Coop.other.name.toUpperCase()} PLAYS THIS ONE ALONE · YOU WAIT HERE`, 6); return true;
    case 'home': if (!host && Net.phase === 'coop') coopHostHome(); return true;
  }
  return false;
}
// The host: a friend knocked (his 'hello' said co-op). One friend at a time, and only while you are home.
function coopHello(m, pid) {
  const nope = why => { netSend({ t: 'nope', why }, pid); if (Net.tx && Net.tx.drop) Net.tx.drop(pid); };
  if (!m.coop) return nope('kind');
  if (m.ver !== netVersion()) return nope('ver');
  if (Coop.other) return nope('full');
  if (Net.phase !== 'coop' || (Game.mode !== 'bedroom' && Game.mode !== 'modal')) return nope('busy');
  const p = { id: 'net_p' + (Net.nextSlot++), pid, name: netCleanName(m.name), look: netCleanLook(m.look), gun: netCleanGun(m.gun), side: 'A' };
  Net.people.push(p);
  Coop.other = { id: p.id, name: p.name, look: p.look, gun: p.gun };
  const me = Net.people.find(x => x.id === NET_HOST_ID);
  netSend({ t: 'coop', you: p.id, name: me.name, look: me.look, gun: me.gun }, pid);
  coopArrived();
}
function coopArrived() {
  Coop.T = null;
  coopAttachKid();
  netHud(Net.role === 'host' ? `${Coop.other.name.toUpperCase()} CAME OVER` : `YOU’RE AT ${Coop.other.name.toUpperCase()}’S`);
  renderCoopPanel();
}
// The other one went (his link closed, or he pressed GO HOME / SEND HOME)
function coopGone(name) {
  coopReset();
  netHud(Net.role === 'host' ? `${String(name || 'Your friend').toUpperCase()} WENT HOME` : '');
  renderCoopPanel();
}
// The guest: the host's link closed. You are in your own room as it was; your save never moved.
function coopHostLeft(name) {
  const who = netCleanName(name || 'Your friend');
  const pm = Game.mode === 'modal' ? Game.prevMode : null;   // a menu was open: OK goes where it would have
  showModal(`${who} ended co-op`, `The link to ${who}’s game closed, so you’re back in your own room. Nothing was lost.`);
  if (pm) Game.prevMode = pm;
  document.querySelector('#modalScreen .modal-card').classList.remove('phone');
  document.querySelector('#modalScreen .modal-card').classList.add('nb-paper');
}
// Forgets the other one and takes his kid out of the room (from netClose too)
function coopReset() {
  if (Coop.kid && Coop.kid.mesh.group.parent) Coop.kid.mesh.group.parent.remove(Coop.kid.mesh.group);
  Coop.kid = null; Coop.other = null; Coop.T = null; Coop.sendT = 0; Coop.match = null;
}

// --- the other one's kid in your room ---
// (enterBedroom builds a new room each time: this puts him back in it)
function coopAttachKid() {
  if (Coop.kid && Coop.kid.mesh.group.parent) Coop.kid.mesh.group.parent.remove(Coop.kid.mesh.group);
  Coop.kid = null;
  if (!coopTogether() || !Scenes.bedroom || Game.scene !== Scenes.bedroom.scene) return;
  const mesh = createKid(Object.assign({}, CHARACTERS.seth, Coop.other.look), Coop.other.gun);
  mesh.gunGroup.visible = false;   // no guns in the house
  mesh.group.visible = false;      // till his game says where he is
  Scenes.bedroom.scene.add(mesh.group);
  Coop.kid = { mesh, pos: new THREE.Vector3(), yaw: 0, seen: false, walkPhase: 0, walkInt: 0, crouch: 0, vf: 0, vs: 0, step: 0 };
}
// Once a step in your room (and with a menu open over it): your own place to the other game, his kid to his
function coopStep(dt) {
  if (Net.hudT > 0 && (Net.hudT -= dt) <= 0) netHud('');
  if (!coopTogether() || Net.phase !== 'coop') return;
  const room = Scenes.bedroom && Scenes.bedroom.scene, home = !!room && Game.scene === room && (Game.mode === 'bedroom' || Game.mode === 'modal');
  if (home && (!Coop.kid || Coop.kid.mesh.group.parent !== room)) coopAttachKid();
  const P = Game.player;
  if ((Coop.sendT -= dt) <= 0) {
    Coop.sendT = Math.max(0, Coop.sendT + COOP_SEND_SEC);
    if (home) netSend({ t: 'b', p: [netR(P.pos.x), netR(P.pos.y), netR(P.pos.z)], y: netR(P.yaw), c: P.crouching ? 1 : 0, h: 1 });
  }
  coopDriveKid(dt);
}
// Walks, turns and crouches as his game says; hidden while he is out of the room
function coopDriveKid(dt) {
  const K = Coop.kid, T = Coop.T;
  if (!K) return;
  Coop.bAge = (Coop.bAge || 0) + dt;
  if (!T || !T.here || Coop.bAge > 1) { K.mesh.group.visible = false; return; }   // v1.381: gone quiet, he is out of the room
  K.mesh.group.visible = true;
  const px = K.pos.x, pz = K.pos.z, far = Math.hypot(T.x - K.pos.x, T.z - K.pos.z) > 2.5;
  if (far || !K.seen) K.pos.set(T.x, T.y, T.z);
  else { const a = Math.min(1, dt * 15); K.pos.x += (T.x - K.pos.x) * a; K.pos.y += (T.y - K.pos.y) * a; K.pos.z += (T.z - K.pos.z) * a; }
  K.seen = true;
  const want = T.yaw + Math.PI, d = Math.atan2(Math.sin(want - K.yaw), Math.cos(want - K.yaw));   // the camera looks down -z, a kid's face is +z
  K.yaw += d * Math.min(1, dt * 15);
  K.mesh.group.position.copy(K.pos);
  K.mesh.group.rotation.set(0, K.yaw, 0);
  K.crouch += (T.c - K.crouch) * Math.min(1, dt * 10);
  setKidCrouch(K.mesh, K.crouch);
  const fdx = far ? 0 : K.pos.x - px, fdz = far ? 0 : K.pos.z - pz, vx = fdx / Math.max(dt, 1e-3), vz = fdz / Math.max(dt, 1e-3);
  const cy = Math.cos(K.yaw), sy = Math.sin(K.yaw), ease = Math.min(1, dt * 8);
  K.vf += ((vx * sy + vz * cy) - K.vf) * ease;
  K.vs += ((vx * cy - vz * sy) - K.vs) * ease;
  const v = Math.hypot(K.vf, K.vs);
  K.walkInt += (Math.min(1, v / 3) - K.walkInt) * Math.min(1, dt * 6);
  if (v > 0.05) K.walkPhase += 2 * Math.PI * kidGaitCadence(v, K.mesh.scaleXZ || 1) * dt;
  setKidWalk(K.mesh, K.walkPhase, K.walkInt, K.vf, K.vs);
  K.step += Math.hypot(fdx, fdz);
  if (K.step >= 0.6) { K.step = 0; playFootstep(K.pos.x, K.pos.z); }
}

// --- 2A: in the host's room the guest looks round, but only the host starts matches, shops, uses the workbench or sleeps ---
const COOP_GUEST_USES = ['phone', 'crew_kid'];   // his own phone (to go home), and a word with the kids on the landing
function coopBlocks(it) {
  if (!coopIsGuest() || !Coop.other || !it || COOP_GUEST_USES.includes(it.type)) return false;
  netHud(`${Coop.other.name.toUpperCase()}’S ROOM · ONLY ${Coop.other.name.toUpperCase()} CAN DO THAT`);
  return true;
}

// =====================================================================
// v1.381 (D.73 step 2; Michael: 3A, 4A): YOUR FRIEND IN YOUR MATCHES. When the host starts a match with a friend over,
// his game sends it (`cm`: the match's id and its kids, as his game will build them) and the friend's game builds the
// same match, past its own locks, with the host as an ally kid. 3A: in a match with teammates the friend takes the last
// kid's place on your side; in one where you are alone he stands beside you and the other side is one kid bigger. 4A:
// he plays with his own look and gun, with a full bag of BBs, and his own eyewear's extra hits. From there it is online
// play's referee model (Net, v1.366): the host's game runs every kid and decides every tag, the friend's game sends only
// where he is. A tag works as in your matches (you come back only where the match says so); with no lives left you
// watch your side play on, and the match is lost when both of you are out. The result is the host's, and both games go
// back to the room when the host does. A race, the ride-along, capture the flag, a VIP match, the zombie tag, a
// free-for-all, the tutorial and the range are one player's: the friend waits at home through those, and is told so.
function coopFits(id) {
  const sc = SCENARIOS[id];
  return !!sc && !sc.tutorial && !sc.range && !sc.race && !sc.ride && !sc.ctf && !sc.vip && !sc.ffa && !sc.pickup && !sc.online
    && ['kill_all', 'last_team_standing', 'survive_timer'].includes(sc.winCondition || 'kill_all') && Array.isArray(sc.enemySetup) && sc.enemySetup.length > 0;
}
// A setup entry as it goes over the wire: plain values only, nothing that is the host's own (his loans)
function coopCleanEntry(e) {
  const out = {};
  if (!e || typeof e !== 'object') return null;
  for (const [k, v] of Object.entries(e)) {
    if (!/^[A-Za-z]{1,24}$/.test(k) || k === 'crewLoan') continue;
    if ((typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 40)) out[k] = v;
  }
  if (!netCleanId(out.charId)) return null;
  out.weapon = netCleanGun(out.weapon);
  return out;
}
// 3A: the other side's extra kid, when you were alone: a kid of the same street not in this match
function coopExtraFoe(sc, setup) {
  const used = new Set(setup.map(e => e.charId)), foe = setup.find(e => !e.team);
  if (!foe) return null;
  for (const other of Object.values(SCENARIOS)) {
    if (other.builderFn !== sc.builderFn || !Array.isArray(other.enemySetup)) continue;
    for (const e of other.enemySetup) if (!e.team && CHARACTERS[e.charId] && !used.has(e.charId) && !/^net_p/.test(e.charId))
      return Object.assign({}, foe, { charId: e.charId, weapon: e.weapon || foe.weapon });
  }
  return null;
}
function coopCharacter(id, who) { CHARACTERS[id] = Object.assign({}, CHARACTERS.seth, who.look, { name: who.name, flavor: { hit: '', win: '' } }); }
// Who is who in the match, as Net's match code reads it: the two people on Blue (the player's side), the kids by side
function coopRoster(setup) {
  const me = Net.people.find(p => p.id === Net.me) || { name: Net.name };
  const roster = setup.map(e => ({ id: e.charId, side: e.team === 'player' ? 'A' : 'B', human: /^net_p\d+$/.test(e.charId),
    name: CHARACTERS[e.charId] ? CHARACTERS[e.charId].name : e.charId, gun: e.weapon, anchor: e.anchor || null }));
  roster.push({ id: Net.me, side: 'A', human: true, name: netCleanName(me.name || Net.name), gun: Game.persist.equipped.gun, anchor: null });
  return roster;
}
// From enterScenario: the match with your friend in it (the host), or the host's match (the friend); null for a match
// co-op leaves alone (the friend waits at home)
function coopScenario(id) {
  if (!coopTogether()) return null;
  if (Net.role === 'guest') return Coop.match && Coop.match.id === id ? Coop.match.sc : null;
  if (Net.phase !== 'coop') return null;
  if (!coopFits(id)) {
    netSend({ t: 'cwait', id });
    return null;
  }
  netResetMatch();   // the last match's people and kids forgotten, before this one's are set
  const base = crewScenario(id), fid = Coop.other.id;
  const setup = base.enemySetup.map(e => Object.assign({}, e));
  coopCharacter(fid, Coop.other);
  const friend = { charId: fid, weapon: Coop.other.gun, team: 'player' };
  const allies = setup.filter(e => e.team === 'player');
  if (allies.length) {   // he takes the last kid's place on your side
    const last = allies[allies.length - 1];
    friend.anchor = last.anchor;
    setup.splice(setup.indexOf(last), 1, friend);
  } else {               // he stands beside you, and the other side is one bigger
    friend.anchor = (setup.find(e => !e.team) || {}).anchor;
    setup.push(friend);
    const extra = coopExtraFoe(base, setup);
    if (extra) setup.push(extra);
  }
  const sc = Object.assign({}, base, { enemySetup: setup, coop: true });
  Coop.match = { id, sc };
  Net.roster = coopRoster(setup);
  const me = Net.people.find(p => p.id === NET_HOST_ID);
  netSend({ t: 'cm', id, ver: netVersion(), setup: setup.map(coopCleanEntry).filter(Boolean), host: { name: me.name, look: me.look, gun: me.gun } });
  return sc;
}
// The friend: the host is starting a match. From the room (or the last result) into its briefing.
function coopMatchIn(m) {
  if (Net.phase !== 'coop' || !Coop.other || m.ver !== netVersion() || !SCENARIOS[m.id] || !coopFits(m.id) || !Array.isArray(m.setup)) return;
  if (Game.mode === 'scenario' || Game.mode === 'scenario_intro') return;
  const setup = m.setup.slice(0, 24).map(coopCleanEntry).filter(Boolean);
  const mine = setup.findIndex(e => e.charId === Net.me);
  if (mine < 0) return;
  const h = m.host || {};
  netResetMatch();
  Coop.other.look = netCleanLook(h.look); Coop.other.gun = netCleanGun(h.gun);
  coopCharacter(NET_HOST_ID, Coop.other);
  setup.splice(mine, 1, { charId: NET_HOST_ID, weapon: Coop.other.gun, team: 'player', anchor: setup[mine].anchor });
  Coop.match = { id: m.id, sc: Object.assign({}, SCENARIOS[m.id], { enemySetup: setup, coop: true }) };
  Net.roster = coopRoster(setup);
  coopLeaveScreens();
  enterScenario(m.id);
  if (Game.mode !== 'scenario_intro') { Coop.match = null; return; }
}
// Whatever the friend had open (a menu, the phone, the last result) gives way to the host's match or the room
function coopLeaveScreens() {
  if (document.getElementById('modalScreen').classList.contains('active')) closeModal();
  if (typeof hideAllMenus === 'function') hideAllMenus();
  if (Game.mode === 'result' || document.getElementById('resultScreen').classList.contains('active')) {
    document.getElementById('resultScreen').classList.remove('active');
    cleanupScenarioScene();
  }
  coopResetResultCard();
}
// From the end of enterScenario: the kids in the scene are matched to the roster; the friend's are all the host's
// to move, and the host's game moves only the friend
function coopEntered() {
  const host = Net.role === 'host';
  Net.phase = 'begin';
  for (const e of Game.scenario.enemies) {
    const r = Net.roster.find(x => x.id === e.charId);
    if (!r || Net.ents.has(r.id)) continue;
    Net.ents.set(r.id, e);
    if (host && !r.human) continue;
    e.remote = true;
    e.mesh.group.visible = false;   // till his game says where he is
    if (host) e._netPid = (Net.people.find(p => p.id === r.id) || {}).pid;
  }
  if (host) Coop.friendArmor = 0;
}
// From netAfterStart: the friend's lives in the host's game are the match's, with his own eyewear's extra hits
function coopAfterStart() {
  const P = Game.player, host = Net.role === 'host';
  for (const [id, e] of Net.ents) {
    const r = Net.roster.find(x => x.id === id);
    if (!r || !r.human || !e.remote) continue;
    e._netMax = host ? Math.max(1, P.maxHits - getArmorBonusHits() + (Coop.friendArmor || 0)) : (e.lives || 1);
    e.lives = e._netMax;
  }
}
// A tag sends you back to your start only where the match says so (The Last Saturday), as in your own matches
function coopWalksHome() { const sc = SCENARIOS[Game.scenario.active]; return !!(sc && sc.tagSendsHome); }
// One of you is out of lives: the match is lost when both are (a friend who dropped is a kid now, and doesn't count)
function coopCheckOut() {
  if (Net.role !== 'host' || Game.mode !== 'scenario') return;
  const f = Coop.other && Net.ents.get(Coop.other.id);
  const friendIn = !!(f && f.remote && f.lives > 0);
  if (Game.player._netOut && !friendIn) endScenarioLater('lose', 600);
  else checkWinCondition();
}
// The friend's result card: the money is his (1B), the next match is the host's call
function coopGuestMatch() { return coopIsGuest() && !!Coop.match && Game.scenario.active === Coop.match.id; }
function coopResultCard() {
  const again = document.getElementById('navAgainBtn');
  if (again.dataset.netLabel == null) again.dataset.netLabel = again.textContent;
  again.textContent = `NEXT: ${(Coop.other ? Coop.other.name : 'THE HOST').toUpperCase()}’S CALL`;
  again.disabled = true;
  for (const id of ['navPrevBtn', 'navNextBtn']) document.getElementById(id).disabled = true;
  const note = document.getElementById('reloadNote');
  if (note) note.textContent = `At ${Coop.other ? Coop.other.name : 'your friend'}’s: the pay is yours; the win goes on their summer.`;
}
function coopResetResultCard() {
  const again = document.getElementById('navAgainBtn');
  if (again && again.dataset.netLabel != null) { again.textContent = again.dataset.netLabel; delete again.dataset.netLabel; }
}
// The match is over: both games are back to hanging out (the friend's result card waits for the host's next call)
function coopMatchOver() {
  Net.phase = 'coop';
  netResetMatch();
  netHud('');
}
// The host went home from the result (or the friend's game hears that he did)
function coopHostHome() {
  if (Net.role === 'host') { if (coopTogether()) netSend({ t: 'home' }); return; }
  if (Game.mode === 'result' || Game.mode === 'scenario_intro') {
    coopLeaveScreens();
    const intro = document.getElementById('scenarioIntro'); if (intro) intro.style.display = 'none';
    if (Game.scenario.active) cleanupScenarioScene();
    enterBedroom();
  }
  Coop.match = null;
}
// The host: the friend pressed F. He sits the rest of this match out; his kid plays on, and he is still over.
function coopFriendQuit(p) {
  const e = Net.ents.get(p.id);
  if (e && e.remote) netBotTakeover(e);
  netVoiceGone(p.id);
  netHud(`${p.name.toUpperCase()} SAT THIS ONE OUT · A KID PLAYS THE SPOT`);
  coopCheckOut();
}
