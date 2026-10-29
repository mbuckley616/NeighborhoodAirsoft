function isRivalMatch(id) {
  const sc = SCENARIOS[id];
  if (!sc || sc.tutorial || sc.ffa || sc.winCondition === 'survive_untagged' || !findScenarioListContext(id)) return false;
  return (sethSetup(id) || []).some(es => es.charId === 'seth' && es.team !== 'player');   // v1.362: his zone matches too
}
function rivalMatchIds() { return Object.keys(SCENARIOS).filter(isRivalMatch); }
// { beaten, total } over the whole summer
function rivalScore() {
  const ids = rivalMatchIds();
  return { beaten: ids.filter(id => Game.persist.completed[id]).length, total: ids.length };
}
// The calendar days you beat them: the day each rival win brings (summerDayAfter), once each.
function rivalWinDays() {
  return [...new Set(rivalMatchIds().filter(id => Game.persist.completed[id]).map(summerDayAfter))].sort((a, b) => a - b);
}
function rivalScoreText(s) { return `beaten in ${s.beaten} of their ${s.total} matches this summer`; }
// The result card's line: who they are this match (Seth alone in a duel), how it went, and the summer's score.
function rivalResultLine(id, outcome, firstWin) {
  const sc = SCENARIOS[id];
  const foes = (crewSetup(id) || []).filter(es => es.team !== 'player').length;   // v1.274
  const who = foes > 1 ? RIVAL_CREW : 'Seth';
  const s = rivalScore();
  let head;
  if (outcome === 'win') head = firstWin ? `${who} goes home beaten.` : `${who} loses again.`;
  else head = `${who} takes this one.`;
  return `${head} You've beaten ${foes > 1 ? 'them' : 'his crew'} in ${s.beaten} of their ${s.total} matches this summer.`;
}
// The texts that have arrived, newest first: { id, from, text, day, read }.
function summerTexts() {
  const read = Game.persist.textsRead || {};
  return SUMMER_TEXTS.map((t, i) => ({ t, i }))
    .filter(({ t }) => !t.after || Game.persist.completed[t.after])
    .map(({ t, i }) => ({ id: t.id, from: t.from, text: t.text, day: summerDayAfter(t.after), read: !!read[t.id], i, ask: t.ask || null }))
    .sort((a, b) => (b.day - a.day) || (b.i - a.i));
}
function summerUnreadCount() { return summerTexts().filter(t => !t.read).length; }
function phonePromptText(n) { return 'Check your phone' + (n ? ` (${n} new)` : ''); }
function phoneLabelText(n) { return n ? `Phone · ${n} new` : 'Phone'; }
function openPhone() {
  const texts = summerTexts();
  Game.prevMode = Game.mode;
  Game.mode = 'modal';
  exitPointerLock();
  document.getElementById('modalTitle').textContent = 'Texts';
  const body = document.getElementById('modalBody');
  body.style.whiteSpace = 'normal';
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // v1.380 (D.73): CO-OP, a friend over (95-coop), above the texts
  const coopLbl = Net.active && Net.coop ? (Coop.other ? (Net.role === 'host' ? `CO-OP · ${Coop.other.name} is over` : `CO-OP · at ${Coop.other.name}’s`) : 'CO-OP · waiting…') : 'CO-OP · have a friend over';
  body.innerHTML = `<div class="ph-ask ph-coop-btn"><button id="phCoopBtn">${esc(coopLbl)}</button></div><div class="ph-screen">${texts.map(t => {
    const d = summerDate(t.day);
    return `<div class="ph-msg${t.read ? '' : ' new'}" data-id="${t.id}">
      <div class="ph-head"><span class="ph-from">${t.from.toUpperCase()}</span>${t.read ? '' : '<span class="ph-new">NEW</span>'}
        <span class="ph-date">${d.weekday.slice(0, 3)} ${d.date} ${SUMMER_MONTHS[d.month].name.slice(0, 3)}</span></div>
      <div class="ph-text">${esc(t.text)}</div>${phoneAskHTML(t)}</div>`;
  }).join('')}</div>`;
  body.querySelectorAll('.ph-msg .ph-ask button').forEach(b => b.addEventListener('click', () => phoneAnswer(b.dataset.kid, b.dataset.yes === '1', b)));
  body.querySelector('#phCoopBtn').addEventListener('click', () => openCoopPanel());   // v1.380
  document.querySelector('#modalScreen .modal-card').classList.add('phone');
  document.querySelector('#modalScreen .modal-card').classList.remove('nb-paper');   // v1.285 (D.46): the phone is a phone, not paper
  document.getElementById('modalScreen').classList.add('active');
  // opening them reads them all; the nightstand phone stops blinking and its label and prompt catch up
  Game.persist.textsRead = Game.persist.textsRead || {};
  for (const t of texts) Game.persist.textsRead[t.id] = true;
  const it = Game.interactables.find(i => i.type === 'phone');
  if (it) {
    it.prompt = phonePromptText(0); it.label = phoneLabelText(0);
    const nm = it._labelEl && it._labelEl.querySelector('.br-name'); if (nm) nm.textContent = it.label;
    if (it._led) it._led.visible = false;
  }
  autoSave();
}

// v1.273 (D.28 step 1): a kid asking to join gets two buttons under his text. YES takes him in for good; NOT YET
// leaves the ask open for the next time you look. Once he's in, the text says so.
function phoneAskHTML(t) {
  if (!t.ask) return '';
  const name = CHARACTERS[t.ask].name;
  if (crewMembers().includes(t.ask)) return `<div class="ph-ask ph-in">${name} is in your crew</div>`;
  return `<div class="ph-ask"><button data-kid="${t.ask}" data-yes="1">Yes, you're in</button><button data-kid="${t.ask}" data-yes="0">Not yet</button></div>`;
}
function phoneAnswer(id, yes, btn) {
  const box = btn && btn.closest('.ph-ask');
  if (yes && crewTakeIn(id)) {
    if (box) { box.className = 'ph-ask ph-in'; box.textContent = `${CHARACTERS[id].name} is in your crew`; }
    autoSave();
  } else if (!yes && box) {
    box.className = 'ph-ask ph-later'; box.textContent = 'Not yet. You can still say yes here.';
  }
}

// v1.297 (backlog D.53, Michael: A, 21 Oct): the win that brings a kid's ask puts a "New teammate!" card on the result
// screen: the kid in 3D with his own gun, a few lines on who he is and why he wants in, and YES / NOT YET right there.
// YES takes him in and reads his text; NOT YET leaves the text on the phone, unread, as it was. Only the first win of
// that match brings the card (Bunratty's last match brings two kids, one after the other); the phone still asks too.
const CREW_INTROS = {
  eric:  "From Ridgestone Court. Short, quick and loud. He has texted you every morning since school let out and played for whichever side was a kid short. Now he wants to be on yours.",
  sean:  "Your brother. Curly hair, an AK and a finger that never leaves the trigger. All week he said your crew wasn't a real one. He has changed his mind. Don't tell Mom.",
  nick:  "From Bunratty Court. Big, calm and patient: he waits for you to stop moving. Where Sean goes, Nick goes, so he's asking too.",
  alex:  "One of the twins from Northcliff Trace. Andrew went over to Seth's crew. Alex didn't, and he'd like Andrew to watch him win.",
  diego: "From Bellfield Court. He fought you on his own street and hasn't stopped talking about it. Colin went to Seth's. Diego would rather run with you.",
};
// A kid drawn in 3D onto a 2D canvas, three-quarter on, through the damage report's renderer (its shaders are warm
// from the title, and no new WebGL context is made). The canvas may be up to DAMAGE_W x DAMAGE_H.
const KID_PORTRAIT = { scene: null, camera: null, kid: null, sig: '', cache: new Map() };
function drawKidPortrait(canvas, look, gun, yaw = -0.5, gear = null) {
  initDamageReport();
  const K = KID_PORTRAIT, r = DAMAGE_REPORT.renderer;
  const w = Math.min(DAMAGE_W, canvas.width), h = Math.min(DAMAGE_H, canvas.height);
  if (!K.scene) {
    K.scene = new THREE.Scene();
    K.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 0.95));
    const l = new THREE.DirectionalLight(0xffffff, 0.7); l.position.set(1.5, 3, 3); K.scene.add(l);
    K.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  }
  const sig = JSON.stringify([look, gun, gear, yaw, w, h]);
  // v1.298: a lineup draws a dozen kids each time it opens, so each drawing is kept and a kid is built once
  const ctx = canvas.getContext('2d');
  const hit = K.cache.get(sig);
  if (hit) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(hit, (canvas.width - w) / 2, (canvas.height - h) / 2);
    return;
  }
  if (K.sig !== sig) {
    if (K.kid) K.scene.remove(K.kid.group);
    K.kid = createKid(Object.assign({}, look), gun);
    if (gear) buildKidGear(K.kid, gear);
    K.scene.add(K.kid.group); K.sig = sig;
  }
  const kid = K.kid.group;
  kid.rotation.set(0, 0, 0); kid.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(kid), tall = box.max.y - box.min.y;
  const cy = box.min.y + tall / 2, dist = tall / 2 / Math.tan(15 * Math.PI / 180) * 1.1;
  kid.rotation.y = yaw; kid.updateMatrixWorld(true);
  K.camera.aspect = w / h; K.camera.updateProjectionMatrix();
  K.camera.position.set(0, cy, dist); K.camera.lookAt(0, cy, 0); K.camera.updateMatrixWorld(true);
  r.setScissorTest(true); r.setClearColor(0xf3eedd, 1);
  r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h);
  r.render(K.scene, K.camera);
  r.setScissorTest(false);
  const keep = document.createElement('canvas'); keep.width = w; keep.height = h;
  keep.getContext('2d').drawImage(r.domElement, 0, DAMAGE_H - h, w, h, 0, 0, w, h);
  if (K.cache.size >= 96) K.cache.delete(K.cache.keys().next().value);
  K.cache.set(sig, keep);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(keep, (canvas.width - w) / 2, (canvas.height - h) / 2);
}
// The kids whose asks this result brings: the match's first win, his text due after it, and he is not in yet
function teammateAsksFor(scenarioId, outcome, wonBefore) {
  if (outcome !== 'win' || wonBefore) return [];
  return SUMMER_TEXTS.filter(t => t.ask && t.after === scenarioId && crewAskOpen(t.ask)).map(t => t.ask);
}
function renderTeammateCard(queue, said) {
  const el = document.getElementById('resultTeammate');
  if (!el) return;
  Game.scenario.teammateQueue = queue;
  if (!queue.length && !said) { el.classList.remove('on'); el.innerHTML = ''; return; }
  el.classList.add('on');
  const id = queue[0];
  if (!id) {   // the last answer stays up in place of the buttons
    el.innerHTML = `<div class="rt-fig"><canvas width="120" height="150"></canvas></div><div class="rt-text">` +
      `<div class="rt-head">NEW TEAMMATE!</div><div class="rt-done">${said.text}</div></div>`;
    try { drawKidPortrait(el.querySelector('canvas'), CHARACTERS[said.id], CREW_GUNS[said.id]); } catch (e) { console.warn('teammate card', e); }
    return;
  }
  const ch = CHARACTERS[id];
  el.innerHTML = `<div class="rt-fig"><canvas width="120" height="150"></canvas></div><div class="rt-text">` +
    `<div class="rt-head">${said ? 'AND ANOTHER ONE!' : 'NEW TEAMMATE!'}</div>` +
    `<div class="rt-name"><b>${ch.name.toUpperCase()}</b> wants in your crew <span class="rt-gun">· ${getGunDisplayName(CREW_GUNS[id])}</span></div>` +
    `<div class="rt-intro">${CREW_INTROS[id] || ''}</div>` +
    `<div class="rt-btns"><button class="nb-btn" data-yes="1">Yes, you're in</button><button class="nb-btn" data-yes="0">Not yet</button></div></div>`;
  try { drawKidPortrait(el.querySelector('canvas'), ch, CREW_GUNS[id]); } catch (e) { console.warn('teammate card', e); }
  el.querySelectorAll('.rt-btns button').forEach(b => b.addEventListener('click', () => teammateAnswer(id, b.dataset.yes === '1')));
}
function teammateAnswer(id, yes) {
  const q = (Game.scenario.teammateQueue || []).filter(k => k !== id);
  const name = CHARACTERS[id].name;
  let text;
  if (yes && crewTakeIn(id)) {
    const t = SUMMER_TEXTS.find(t => t.ask === id);
    Game.persist.textsRead = Game.persist.textsRead || {};
    Game.persist.textsRead[t.id] = true;
    text = `${name} is in your crew.`;
  } else {
    text = `Not yet. ${name}'s text is on your phone.`;
  }
  (Game.scenario.teammateAnswers = Game.scenario.teammateAnswers || []).push({ id, yes: !!yes });
  autoSave();
  renderTeammateCard(q, { id, text });
}
