// =====================================================================
// v1.380 (backlog D.73, card fable/d73-coop; Michael, 23 Oct: "have another player join your bedroom and join in all
// of your campaign matches ... they came over to 'hang out'"; his answer on 28 Oct, B: 1B 2A 3A 4A): CO-OP. A friend
// comes over by a four-letter code from the CO-OP button on your phone, the way a Pickup Game room is joined (the same
// link, Net, with `Net.coop` set). In your room he walks around as his own kid (his look from his save) and you see
// him; he can't start a match, shop, use the workbench or sleep (2A): only you can, and he is told so. Each game sends
// where its own person is about 15 times a second (`b`), and moves the other's kid from that word. The host's game
// says who is over (`coop`); either of you can end it from the phone, and a link that closes ends it too.
// Step 2 takes him into your matches (3A, 4A), step 3 his share of the money (1B).
const COOP_SEND_SEC = 1 / 15;
const Coop = {
  other: null,    // the other person: { id, name, look, gun } (the host's: his friend; the guest's: the host)
  kid: null,      // the other's kid in your room: { mesh, pos, yaw, ... }
  T: null,        // where the other's game last said he is
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
      if (p) Coop.T = { x: p[0], y: p[1], z: p[2], yaw: +m.y || 0, c: m.c ? 1 : 0, g: 0, here: m.h ? 1 : 0 };
      return true;
    }
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
  Coop.kid = null; Coop.other = null; Coop.T = null; Coop.sendT = 0;
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
  if (!T || !T.here) { K.mesh.group.visible = false; return; }
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
