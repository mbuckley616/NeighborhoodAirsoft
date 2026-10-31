
// Human-readable reason a scenario is locked (for greyed rows / pickers).
function scenarioLockReason(scenarioId) {
  const ctx = findScenarioListContext(scenarioId);
  if (!ctx) return '';
  if (!isZoneUnlocked(ctx.group)) {
    const i = zoneLadderIndex(ctx.group);
    const prevZone = ZONE_LADDER[i - 1];
    const prevCap  = zoneCapstoneId(prevZone.key);
    const capName  = (prevCap && SCENARIOS[prevCap]?.scenarioName) || (prevZone.name + ' finale');
    return `Clear ${prevZone.name} (beat “${capName}”) to unlock this area.`;
  }
  const prevId = prevMainMatchId(ctx.ids, ctx.idx);   // v1.402: the main match that opens it
  const prevName = SCENARIOS[prevId]?.scenarioName || 'the previous scenario';
  return `Beat “${prevName}” to unlock.`;
}

// v1.147 (D.8 step 2, Michael: A): each scenario is a card in the map's right column, two or three across: its place
// in the zone, the matchup, the badges (attack, defend, night, timer), the name, where it is, your lives, the pay, and
// whether it is done, next or locked (a locked card says which card opens it, "Win #3 to unlock", and has no button). The whole card opens the
// briefing; START is kept for the eye and the keyboard.
function scenarioMatchup(sc) {
  // Legacy scenarios use `enemies`; new ones use `enemySetup` with team tags (allies / teams / FFA).
  if (sc.tutorial) return 'TUTORIAL';                                  // v1.57: not a real matchup
  if (sc.ffa && sc.enemySetup) return (sc.enemySetup.length + 1) + '-WAY FFA';   // +1 for the player
  if (sc.enemySetup) {
    const allies = sc.enemySetup.filter(es => es.team === 'player' && !es.clutchOut).length;   // v1.393: a CLUTCH crew is out
    const foes   = sc.enemySetup.filter(es => (es.team || 'enemy') !== 'player').length;
    return (allies + 1) + 'V' + foes;                                  // +1 for the player
  }
  return ((sc.enemies && sc.enemies.length) || 1) + 'V1';
}
// v1.402: the number of the card that opens this one (the main match before it; side matches open nothing)
function scenarioOpenerNum(scenarioId, num) {
  const ctx = findScenarioListContext(scenarioId), prev = ctx && prevMainMatchId(ctx.ids, ctx.idx);
  return prev ? ctx.ids.indexOf(prev) + 1 : num - 1;
}
function renderScenarioCard(scenarioId, num, isNext) {
  const sc = SCENARIOS[scenarioId];
  if (!sc) return '';
  const completed = !!Game.persist.completed[scenarioId];
  const locked = !isScenarioUnlocked(scenarioId);               // v1.48: progression gating
  const badges = [];
  if (sc.scenarioType === 'attack') badges.push('⚔ ATTACK');
  if (sc.scenarioType === 'defend') badges.push('🛡 DEFEND');
  if (sc.timeOfDay === 'night') badges.push('🌙 NIGHT');          // v1.35
  if (sc.vip) badges.push('★ VIP');                               // v1.170
  if (sc.ctf) badges.push('⚑ FLAGS');                             // v1.189
  if (sc.timerSec && /survive/.test(sc.winCondition || '')) badges.push('⏱ ' + sc.timerSec + 's');
  if (isSideMatch(scenarioId)) badges.push('SIDE');             // v1.402 (D.57 step 4): pays, doesn't gate
  const brief = getScenarioBriefing(scenarioId);
  const lives = brief ? brief.player.lives : 1;
  const stamp = locked ? '' : completed ? '<span class="sc-card-stamp done">✓ DONE</span>'
              : isNext ? '<span class="sc-card-stamp next">NEXT</span>' : '';
  const cls = 'sc-card' + (locked ? ' locked' : '') + (completed ? ' done' : '') + (isNext && !locked ? ' next' : '');
  const foot = locked
    ? `<div class="sc-card-lock">${num > 1 ? 'Win #' + scenarioOpenerNum(scenarioId, num) + ' to unlock' : scenarioLockReason(scenarioId)}</div>`
    : `<div class="sc-card-foot">
        <span class="sc-card-pay">WIN +$${scaledReward(sc.rewards.win)} · LOSE +$${scaledReward(sc.rewards.lose)}${sc.tutorial || sc.pickup ? '' : ' · +50¢ A HIT'}</span>
        <button class="sc-go" data-launch="${scenarioId}">START</button>
      </div>`;
  return `
    <div class="${cls}" data-id="${scenarioId}">
      <div class="sc-card-top">
        <span class="sc-card-num">${num}</span>
        <span class="sc-card-match">${scenarioMatchup(crewScenario(scenarioId))}</span>
        ${brief && brief.matchType ? `<span class="sc-card-type sc-type-${brief.matchType}">${MATCH_TYPE_CHIPS[brief.matchType]}</span>` : ''}
        ${badges.map(t => `<span class="sc-card-badge">${t}</span>`).join('')}
        ${stamp}
      </div>
      <div class="sc-card-title">${locked ? '🔒 ' : ''}${sc.scenarioName}</div>
      <div class="sc-card-meta">${sc.name} · ♥ ${(sc.vip || sc.ctf) ? '∞' : lives + ' ' + (lives === 1 ? 'life' : 'lives')}</div>
      ${foot}
    </div>
  `;
}

// ---------------------------------------------------------------------
// v1.39: Scenario list lookup — which ordered group does a scenario belong
// to, and at what index? Used for the result-screen Previous / Next buttons.
// ---------------------------------------------------------------------
function findScenarioListContext(scenarioId) {
  for (const key in PIN_SCENARIO_GROUPS) {
    const ids = PIN_SCENARIO_GROUPS[key];
    const idx = ids.indexOf(scenarioId);
    if (idx !== -1) return { group: key, ids, idx };
  }
  return null;
}

// ---------------------------------------------------------------------
// v1.39: Pre-start scenario briefing popup. Shows allies/enemies, their
// gear, and life counts before committing to the match. Confirm → enter.
// ---------------------------------------------------------------------
function openScenarioBrief(scenarioId) {
  const brief = getScenarioBriefing(scenarioId);
  if (!brief) { enterScenario(scenarioId); return; }
  const locParts = [];
  if (brief.name) locParts.push(brief.name.toUpperCase());
  if (brief.timeOfDay === 'night') locParts.push('🌙 NIGHT');
  document.getElementById('briefLoc').textContent = locParts.join(' · ');
  document.getElementById('briefTitle').textContent = brief.scenarioName || brief.name;
  document.getElementById('briefDesc').textContent = brief.desc || '';
  renderBriefRoster(scenarioId);   // v1.274: with Bench and Bring for your crew
  const modal = document.getElementById('scenarioBriefModal');
  modal.classList.add('active');
  Game.mode = 'modal';
  const startBtn = document.getElementById('briefStartBtn');
  // Replace listeners cleanly by cloning (avoids stacking on repeat opens).
  const freshStart = startBtn.cloneNode(true);
  startBtn.parentNode.replaceChild(freshStart, startBtn);
  freshStart.addEventListener('click', () => {
    modal.classList.remove('active');
    document.getElementById('worldMap').classList.remove('active');
    enterScenario(scenarioId);
  });
}

// v1.274 (D.28 step 2): the briefing's roster, where a crew kid can be benched or brought back
function renderBriefRoster(scenarioId) {
  const el = document.getElementById('briefRoster');
  el.innerHTML = renderBriefingRosterHTML(getScenarioBriefing(scenarioId), { bench: true, lineup: true });   // v1.298 (D.54): as a lineup
  el.closest('.brief-card').classList.add('lineup');
  drawBriefingLineup(el);
  el.querySelectorAll('[data-bench],[data-unbench]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.dataset.bench) crewBench.add(b.dataset.bench); else crewBench.delete(b.dataset.unbench);
    renderBriefRoster(scenarioId);
  }));
}

// v1.286 (D.46): on the paper map every card in a zone is the same whole number of rules tall: three, or four when
// one card's words need it (a long name or a wrapped row of badges), so the cards and the lines round them stay on the rules.
function fitScenarioCards(info) {
  const list = info.querySelector('.sc-list');
  if (!list || !list.closest('.nb-paper')) return;
  list.style.removeProperty('--sc-rows');
  const rule = parseFloat(getComputedStyle(list).getPropertyValue('--nb-rule')) || 26;
  let h = 0;
  list.querySelectorAll('.sc-card').forEach(c => { h = Math.max(h, c.scrollHeight); });
  if (h) list.style.setProperty('--sc-rows', Math.max(3, Math.ceil((h + 4) / rule)));
}
// v1.146 (D.8 step 1): a pin click and openMap both show a zone through here; the chosen pin is marked
// `.selected` and the right column scrolls back to its top.
function selectMapZone(sc) {
    document.querySelectorAll('#worldMap .pin').forEach(p => p.classList.toggle('selected', p.dataset.scenario === sc));
    const info = document.getElementById('scenarioInfo');
    info.scrollTop = 0;
    if (PIN_SCENARIO_GROUPS[sc]) Game._mapZone = sc;
    if (sc === 'locked') {
      // v1.48: the locked pin is Northcliff — show its teaser blurb.
      const nc = ZONE_LADDER.find(z => z.pin === 'locked');
      info.className = 'scenario-info';
      info.innerHTML = `
        <div class="sc-name">🔒 ${nc ? nc.name : 'Locked'}</div>
        ${nc ? nc.teaser : 'This area is coming in a future version.'}
        <div class="sc-row-lock" style="margin-top:8px;">Coming soon — not yet playable.</div>
      `;
      return;
    }
    // Region group? Show multi-scenario picker.
    if (PIN_SCENARIO_GROUPS[sc]) {
      const ids = PIN_SCENARIO_GROUPS[sc];
      const regionName = REGIONS[SCENARIOS[ids[0]]?.region]?.name || '';
      const streetName = REGIONS[SCENARIOS[ids[0]]?.region]?.streets?.[SCENARIOS[ids[0]]?.street] || '';
      // The river battleground is its own named place, not a street in a
      // residential region — show its label alone, without the region suffix.
      const headerName = /^Battleground/.test(streetName) ? streetName : `${streetName} · ${regionName}`;
      info.className = 'scenario-info';
      // v1.48: a locked ZONE shows a greyed header + the unlock requirement
      // instead of its scenario list (which would all be locked anyway).
      if (!isZoneUnlocked(sc)) {
        const reason = scenarioLockReason(ids[0]);
        info.innerHTML = `
          <div class="sc-name">🔒 ${headerName}</div>
          <div class="sc-row-lock" style="margin-top:6px;">${reason}</div>
        `;
        return;
      }
      // v1.147 (D.8 step 2): cards, with a count of the zone's done matches; the first one not yet won is NEXT
      const open = id => isScenarioUnlocked(id) && !Game.persist.completed[id];
      const nextId = ids.find(id => open(id) && !isSideMatch(id)) || ids.find(open);   // v1.402: the main line first
      const doneN = ids.filter(id => Game.persist.completed[id]).length;
      info.innerHTML = `
        <div class="sc-name">${headerName}</div>
        <div class="sc-zone-count">${doneN} of ${ids.length} won</div>
        <div class="sc-list">${ids.map((id, i) => renderScenarioCard(id, i + 1, id === nextId)).join('')}</div>
      `;
      info.querySelectorAll('.sc-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => openScenarioBrief(card.dataset.id));
      });
      fitScenarioCards(info);   // v1.286
      return;
    }
    // Single-scenario pin (legacy path — kept for forward compatibility).
    if (SCENARIOS[sc]) {
      const def = SCENARIOS[sc];
      info.className = 'scenario-info';
      info.innerHTML = `
        <div class="sc-name">${def.name} · ${def.scenarioName}</div>
        ${def.desc}
        <br><button class="sc-launch" id="launchScenarioBtn">▶ START</button>
      `;
      document.getElementById('launchScenarioBtn').addEventListener('click', () => {
        openScenarioBrief(sc);
      });
    }
}
document.querySelectorAll('#worldMap .pin').forEach(pin => {
  pin.addEventListener('click', () => selectMapZone(pin.dataset.scenario));
});
