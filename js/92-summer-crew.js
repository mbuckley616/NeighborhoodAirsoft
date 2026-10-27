// =====================================================================
// v1.194 (D.20 step 1, Michael: A on "A better game" 1 — a light summer story told in the bedroom): the summer of
// 2003 on a wall calendar. Day 0 is Sunday 1 June; each zone of the ladder is a few weeks of it, and the date inside a
// zone moves with the share of its matches you have won. The last Saturday, 30 August, is circled for the big match
// on your own street (a later step). The calendar hangs on the bedroom's north wall and opens a three-month view.
// =====================================================================
const SUMMER_YEAR = 2003;
const SUMMER_BIG_DAY = 90;                     // Saturday 30 August 2003
const SUMMER_FINALE = 'last_saturday';         // v1.205: the big day's match, on your street (Bunratty Court)
const SUMMER_SPANS = {                         // zone key → [first day, last day], days since 1 June
  winnmark_court: [0, 20],     // 1–21 June
  bunratty_court: [21, 41],    // 22 June – 12 July
  hollow:         [42, 55],    // 13–26 July
  market_lot:     [56, 62],    // 27 July – 2 August
  northcliff:     [63, 76],    // 3–16 August
  high_school:    [77, 80],    // 17–20 August
  country_club:   [81, 84],    // 21–24 August
  grocery_store:  [85, 89],    // 25–29 August
};
const SUMMER_PENCIL = { winnmark_court: 'Winnmark', bunratty_court: 'Bunratty', hollow: 'The Hollow', market_lot: 'Market lot',
  northcliff: 'Northcliff', high_school: 'Hollins HS', country_club: 'Willow Bend', grocery_store: 'The store' };
const SUMMER_MONTHS = [{ name: 'June', m: 5, first: 0, days: 30 }, { name: 'July', m: 6, first: 30, days: 31 },
  { name: 'August', m: 7, first: 61, days: 31 }];
const SUMMER_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// The zone you are in: the furthest one the ladder has opened.
function summerZoneKey() {
  let key = ZONE_LADDER[0].key;
  for (const z of ZONE_LADDER) if (isZoneUnlocked(z.key)) key = z.key;
  return key;
}
// Today, as days since 1 June: the zone's first day plus its share of the span for the matches won there.
function summerDayIndex() {
  if (Game.persist.completed[SUMMER_FINALE]) return SUMMER_BIG_DAY;   // v1.205: the last Saturday is won
  const key = summerZoneKey();
  const span = SUMMER_SPANS[key] || [0, 0];
  const ids = PIN_SCENARIO_GROUPS[key] || [];
  const done = ids.filter(id => Game.persist.completed[id]).length;
  const len = span[1] - span[0] + 1;
  return Math.min(span[1], span[0] + Math.floor(len * done / Math.max(1, ids.length)));
}
// { month: 0..2, date: 1..31, weekday, label: 'Tuesday 10 June' } for a day index.
function summerDate(day) {
  let mi = 0;
  while (mi < 2 && day >= SUMMER_MONTHS[mi + 1].first) mi++;
  const date = day - SUMMER_MONTHS[mi].first + 1;
  const weekday = SUMMER_WEEKDAYS[day % 7];    // 1 June 2003 was a Sunday
  return { month: mi, date, weekday, label: weekday + ' ' + date + ' ' + SUMMER_MONTHS[mi].name };
}
// The zone whose span holds a day (or null for the big day).
function summerZoneOfDay(day) {
  for (const k in SUMMER_SPANS) if (day >= SUMMER_SPANS[k][0] && day <= SUMMER_SPANS[k][1]) return k;
  return null;
}
function summerZoneName(key) {
  const z = ZONE_LADDER.find(z => z.key === key);
  return z ? z.name.split(' · ')[0].split(' /')[0] : '';
}
// The bedroom calendar's page: a picture on top, this month's grid below, past days crossed out, today ringed.
function drawSummerCalendar(canvas, today) {
  const W = canvas.width, H = canvas.height, c = canvas.getContext('2d');
  const t = summerDate(today), mo = SUMMER_MONTHS[t.month];
  c.fillStyle = '#f7f2e6'; c.fillRect(0, 0, W, H);
  // the picture: a creek under pines in the summer sun
  const ph = H * 0.38;
  const sky = c.createLinearGradient(0, 0, 0, ph);
  sky.addColorStop(0, '#5aa0d8'); sky.addColorStop(1, '#bfe0f0');
  c.fillStyle = sky; c.fillRect(0, 0, W, ph);
  c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(W * 0.8, ph * 0.28, ph * 0.13, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4f8a3a'; c.fillRect(0, ph * 0.72, W, ph * 0.28);
  c.fillStyle = '#3d7fb0'; c.beginPath(); c.moveTo(W * 0.35, ph); c.quadraticCurveTo(W * 0.55, ph * 0.8, W * 0.6, ph * 0.72);
  c.lineTo(W * 0.66, ph * 0.72); c.quadraticCurveTo(W * 0.66, ph * 0.86, W * 0.55, ph); c.fill();
  c.fillStyle = '#2b5a2a';
  for (const [x, s] of [[0.08, 1], [0.18, 1.3], [0.29, 0.9], [0.74, 1.2], [0.88, 1], [0.96, 1.4]]) {
    c.beginPath(); c.moveTo(W * x, ph * (0.78 - 0.45 * s)); c.lineTo(W * x - 26 * s, ph * 0.8); c.lineTo(W * x + 26 * s, ph * 0.8); c.fill();
  }
  c.fillStyle = '#fff'; c.font = 'bold 34px Impact, sans-serif'; c.textAlign = 'center';
  c.fillText('SUMMER ' + SUMMER_YEAR, W / 2, ph * 0.2);
  // the month's name and the grid
  c.fillStyle = '#b02a24'; c.font = 'bold 40px Georgia, serif';
  c.fillText(mo.name.toUpperCase(), W / 2, ph + 50);
  const gx = 16, gy = ph + 72, cw = (W - 32) / 7, rows = 6, ch = (H - gy - 12) / rows;
  c.font = 'bold 15px Arial, sans-serif'; c.fillStyle = '#555';
  'SMTWTFS'.split('').forEach((d, i) => c.fillText(d, gx + cw * (i + 0.5), gy - 6));
  const firstDow = mo.first % 7;
  for (let d = 1; d <= mo.days; d++) {
    const day = mo.first + d - 1, slot = firstDow + d - 1;
    const x = gx + cw * (slot % 7), y = gy + ch * Math.floor(slot / 7);
    c.strokeStyle = '#c9c0ae'; c.lineWidth = 1; c.strokeRect(x, y, cw, ch);
    c.fillStyle = '#333'; c.font = '18px Arial, sans-serif'; c.textAlign = 'left';
    c.fillText(String(d), x + 5, y + 19);
    const zk = summerZoneOfDay(day);
    if (zk && SUMMER_SPANS[zk][0] === day) {          // a zone's first day carries its name in pencil
      c.fillStyle = '#4a5a8a'; c.font = 'italic 11px Arial, sans-serif';
      c.fillText(SUMMER_PENCIL[zk] || '', x + 3, y + ch - 6);
    }
    if (day < today) {                                 // crossed off
      c.strokeStyle = '#c0302a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x + 6, y + 6); c.lineTo(x + cw - 6, y + ch - 6);
      c.moveTo(x + cw - 6, y + 6); c.lineTo(x + 6, y + ch - 6); c.stroke();
    }
    if (day === today || day === SUMMER_BIG_DAY) {     // today ringed; the last Saturday ringed twice
      c.strokeStyle = day === SUMMER_BIG_DAY ? '#c0302a' : '#1f5fb0'; c.lineWidth = 3;
      for (let r = 0; r < (day === SUMMER_BIG_DAY ? 2 : 1); r++) {
        c.beginPath(); c.ellipse(x + cw / 2, y + ch / 2, cw / 2 - 3 - r * 4, ch / 2 - 3 - r * 4, 0, 0, Math.PI * 2); c.stroke();
      }
    }
  }
  c.textAlign = 'left';
}
// The three-month view the calendar opens (in the modal shell).
function summerCalendarHTML(today) {
  const t = summerDate(today);
  const zone = summerZoneKey();
  const left = SUMMER_BIG_DAY - today;
  const rivalDays = new Set(rivalWinDays());   // v1.196: the days you beat Seth's crew
  const months = SUMMER_MONTHS.map(mo => {
    let cells = '';
    for (let i = 0; i < mo.first % 7; i++) cells += '<span class="sm-day blank"></span>';
    for (let d = 1; d <= mo.days; d++) {
      const day = mo.first + d - 1, zk = summerZoneOfDay(day);
      const cls = ['sm-day', day < today ? 'past' : '', day === today ? 'today' : '', day === SUMMER_BIG_DAY ? 'big' : '',
        zk === zone ? 'here' : '', rivalDays.has(day) ? 'rival' : ''].filter(Boolean).join(' ');
      // v1.205: the big day is on your street, Bunratty Court
      const tip = (zk ? summerZoneName(zk) : day === SUMMER_BIG_DAY ? 'The last Saturday of summer · Bunratty Court' : 'Labor Day weekend') + (rivalDays.has(day) ? ` · you beat ${RIVAL_CREW}` : '');
      cells += `<span class="${cls}" data-day="${day}" title="${tip}">${d}</span>`;
    }
    return `<div class="sm-month"><div class="sm-name">${mo.name}</div>
      <div class="sm-grid">${'SMTWTFS'.split('').map(w => `<span class="sm-dow">${w}</span>`).join('')}${cells}</div></div>`;
  }).join('');
  const span = SUMMER_SPANS[zone];
  return `<div class="sm-today">Today is <b>${t.label}</b>.</div>
    <div class="sm-months">${months}</div>
    <div class="sm-note">${summerZoneName(zone)}: ${summerDate(span[0]).label.replace(/^\w+ /, '')} to ${summerDate(span[1]).label.replace(/^\w+ /, '')}.
      Saturday 30 August is ringed twice: the last Saturday of summer, ${left > 0 ? `${left} day${left === 1 ? '' : 's'} away` : 'won on your street'}.</div>
    <div class="sm-note sm-rival">${rivalDays.size ? `A red dot is a day you beat ${RIVAL_CREW}: ${rivalDays.size} so far` : `No wins over ${RIVAL_CREW} yet`}; ${rivalScoreText(rivalScore())}.</div>`;
}
function openSummerCalendar() {
  Game.prevMode = Game.mode;
  Game.mode = 'modal';
  exitPointerLock();
  document.getElementById('modalTitle').textContent = 'Summer ' + SUMMER_YEAR;
  const body = document.getElementById('modalBody');
  body.style.whiteSpace = 'normal';
  body.innerHTML = summerCalendarHTML(summerDayIndex());
  document.querySelector('#modalScreen .modal-card').classList.add('wide');
  document.getElementById('modalScreen').classList.add('active');
}

// v1.195 (D.20 step 2, Michael: A on "A better game" 1): your friends text your flip phone between matches. Each text
// arrives with a win (`after`, a scenario id; none for the first), dated on the calendar by the day that win brings
// (summerDayAfter), so an old save gets the summer's texts on the right days. Read ones are kept in the save.
const SUMMER_TEXTS = [
  { id: 'start',      from: 'Eric',    after: null,
    text: "SUMMER!!! 13 weeks no school. seth set up targets at the end of winnmark so u can try the new gun. go" },
  { id: 'tutorial',   from: 'Seth',    after: 'winnmark_tutorial',
    text: "ok ur not terrible. my backyard tmrw. just u and me" },
  { id: 'seth1',      from: 'Seth',    after: 'winnmark_seth_house',
    text: "lucky shot. my dad is getting me a shotgun this week. then well see" },
  { id: 'culdesac',   from: 'Brooke',  after: 'winnmark_cul_de_sac',
    text: "ok that was kind of sick. trey is still mad u got past the plank fort" },
  { id: 'squad',      from: 'Rebecca', after: 'winnmark_team_3v3',
    text: "everybody on winnmark is talking about squad up. eric says u carried. eric says that about everyone tho" },
  // v1.273 (D.28 step 1, Michael's design): Sean is your brother, so he calls you home himself; Eric asks to join
  { id: 'seanHome',   from: 'Sean',    after: 'winnmark_night_team_2v2',
    text: "u been at seths all week. come home. 1v1 me on bunratty tmrw, nick gets winner. bring eric" },
  { id: 'askEric',    from: 'Eric',    after: 'winnmark_night_team_2v2', ask: 'eric',
    text: "sean texted me lol. im coming to bunratty either way. also. can i be in ur crew? for real" },
  { id: 'brothers',   from: 'Sean',    after: 'bunratty_brothers',
    text: "ryan and mitchell are SO mad. mitchell already wants a rematch at the cul de sac" },
  { id: 'infection',  from: 'Rebecca', after: 'bunratty_infection',
    text: "infection at the cul de sac is the best game ever invented and i will not hear otherwise" },
  { id: 'hollow',     from: 'Eric',    after: 'bunratty_night_team_2v2',
    text: "everybody is going to the hollow this week. the woods past the river, forts at both ends. seth is bringing his whole crew. bring BBs" },
  // v1.273: Bunratty done, your brother and your best friend ask
  { id: 'askSean',    from: 'Sean',    after: 'bunratty_night_team_2v2', ask: 'sean',
    text: "ok fine. ur crew is the real one. can i be in it? dont tell mom i said that" },
  { id: 'askNick',    from: 'Nick',    after: 'bunratty_night_team_2v2', ask: 'nick',
    text: "if seans in ur crew im in ur crew. right? im in right?" },
  { id: 'bigGame',    from: 'Seth',    after: 'hollow_big_battle',
    text: "the big game was close and u know it. my crew wants the north fort back" },
  { id: 'lot',        from: 'Brooke',  after: 'hollow_full_auto_mayhem',
    text: "marcus's mom does the big shop at riverside market saturday mornings. he'll be in the lot w his pistol lol" },
  { id: 'northcliff', from: 'Eric',    after: 'lot_night_4v4',
    text: "seths old friend evan lives up in northcliff now. seth says evan is better than all of us. hills and a creek. august is gonna be crazy" },
  { id: 'treehouse',  from: 'Rebecca', after: 'stoneglen_treehouse',
    text: "the twins built a whole COURSE?? with sandbags?? not fair" },   // v1.316: was the treehouse
  // v1.273: the twins split, Andrew to Seth and Alex to you
  { id: 'askAlex',    from: 'Alex',    after: 'stoneglen_hold_treehouse', ask: 'alex',
    text: "andrews going with seth. evan talked him into it. im not. can i run with ur crew?" },
  // v1.273: Diego, met only across the street, gets a text before he asks
  { id: 'diego',      from: 'Diego',   after: 'bellfield_night_4v4',
    text: "colin says ur crew is soft. i told him u beat us on our own street. hes so mad lol" },
  { id: 'flags',      from: 'Sean',    after: 'bellfield_ctf',
    text: "capture the flag on bellfield. my legs still hurt" },
  // v1.273: Seth's crew fills up; Diego asks
  { id: 'sethCrew',   from: 'Seth',    after: 'bellfield_ctf',
    text: "andrew and colin are with us now. and garrett. u havent met garrett. u will" },
  { id: 'askDiego',   from: 'Diego',   after: 'bellfield_ctf', ask: 'diego',
    text: "colin went to seths. id rather run with u. u got room in ur crew?" },
  { id: 'school',     from: 'Seth',    after: 'northcliff_night_4v4',
    text: "school starts tmrw ugh. hollins ridge kids say the portables are theirs after the last bell. lets go see" },
  { id: 'pool',       from: 'Brooke',  after: 'school_night_4v4',
    text: "the club shut the pool for the season. i know a gap in the hedge. bring a pistol" },
  { id: 'store',      from: 'Eric',    after: 'club_night_4v4',
    text: "tylers dad is night manager at riverside market. tyler says we can get in before it opens. FOR REAL" },
  { id: 'last',       from: 'Seth',    after: 'store_night_4v4',
    text: "tmrw. last saturday of the summer. ur street, everybody. my crew vs yours. dont chicken out" },
  // v1.205 (D.20 step 4): after the last Saturday on your street
  { id: 'summerEnd',  from: 'Eric',    after: 'last_saturday',
    text: "SETH SHOOK UR HAND. i saw it. everybody saw it. school tuesday ugh. best summer ever. same time next year" },
];
// The calendar day a win brings: a zone's last match opens the next zone (its first day); any other moves the date
// along its zone's span by one match's share, as summerDayIndex does.
function summerDayAfter(scenarioId) {
  if (!scenarioId) return 0;
  if (scenarioId === SUMMER_FINALE) return SUMMER_BIG_DAY;   // v1.205
  const ctx = findScenarioListContext(scenarioId);
  if (!ctx || !SUMMER_SPANS[ctx.group]) return 0;
  const span = SUMMER_SPANS[ctx.group], n = ctx.ids.length;
  if (ctx.idx === n - 1) {
    const next = ZONE_LADDER[zoneLadderIndex(ctx.group) + 1];
    return next && SUMMER_SPANS[next.key] ? SUMMER_SPANS[next.key][0] : span[1];
  }
  return Math.min(span[1], span[0] + Math.floor((span[1] - span[0] + 1) * (ctx.idx + 1) / n));
}
// v1.196 (D.20 step 3, Michael: A on "A better game" 1): Seth's crew is the summer's rival. A rival match is any match
// on the ladder with Seth on the other side, but for the tutorial, the free-for-alls and Infection, where nobody is
// anybody's crew. The briefing names them, the result card keeps the summer's score against them (read from
// `completed`, so an old save has its score too), and the calendar marks the days you beat them.
const RIVAL_CREW = "Seth's crew";
// v1.273 (D.28 step 1, Michael's design in decisions "Build your crew"): both crews are fixed. Yours is five kids who
// each ask to join by text at a story moment (SUMMER_TEXTS with `ask`); nobody else can join, and Seth never does.
// Seth's is eight. Step 1 is the rosters and the asking; the crew takes the field in step 2 (v1.274, crewSetup below).
const CREW_ROSTER = ['eric', 'sean', 'nick', 'alex', 'diego'];   // the order they ask
const CREW_MAX = 5;
const SETH_CREW_ROSTER = ['seth', 'trey', 'brooke', 'tyler', 'evan', 'andrew', 'garrett', 'colin'];
// Who has said yes and you took, in the order they joined
function crewMembers() {
  const c = Array.isArray(Game.persist.crew) ? Game.persist.crew : [];
  return c.filter((id, i) => CREW_ROSTER.includes(id) && c.indexOf(id) === i).slice(0, CREW_MAX);
}
// A kid's ask is open once its text has come and he is not in yet; "Not yet" leaves it open
function crewAskOpen(id) {
  const t = SUMMER_TEXTS.find(t => t.ask === id);
  return !!t && !!Game.persist.completed[t.after] && !crewMembers().includes(id);
}
function crewTakeIn(id) {
  if (!crewAskOpen(id) || crewMembers().length >= CREW_MAX) return false;
  Game.persist.crew = crewMembers().concat(id);
  return true;
}
// v1.274 (D.28 step 2, Michael's design; C on "which two-against-more matches stay": none): your crew takes the field.
// A team match (one that gives you allies today, the tutorial and the pickup games aside) takes your whole crew, each
// kid on his own gun, plus the kids the match keeps: a VIP, Seth while he is on your side, and the kid a match is named
// after (You and Nick, Sean Has Your Back) until he is in your crew. Places left on your side go to the match's own
// allies, then to kids from the street; a benched kid's place stays empty. A crew kid the match puts on the other side
// is swapped for a kid from the street at his spot, and with Seth on the other side his crew kids on yours cross over
// to him. Solo matches never take the crew. With nobody in the crew every match is exactly as before. The crew sizes
// and the odds are step 3's (rebalancing); the bench is the briefing's and is not saved.
const CREW_GUNS = { eric: 'mp5', sean: 'ak47', nick: 'ar', alex: 'ak47', diego: 'mp5' };   // each kid's own gun
// v1.337 (D.28 step 4, Michael: A on "Hand-me-downs and the BB rule"): a loan at the loadout. You lend a crew kid a
// gun you own, or eyewear or shoes; you own one of each, so what a kid has is not yours to carry or wear until you take
// it back (free). A kid on his own gun brings his own BBs; a kid on a gun you lent him loads from your bag at BEGIN the
// way you do (the gun's mag, with your mag upgrades, and one more), and what he hasn't fired goes back in the bag at the
// end. When it runs out he goes back to his own gun; with an empty bag he starts on it. Eyewear gives +0.05 aim and
// shoes +5% speed; no armor (a kid takes one hit a life). The gun you carry and what you wear can't be lent.
const CREW_LOAN_AIM = 0.05, CREW_LOAN_SPEED = 1.05, CREW_LOAN_MAGS = 2;
function crewGearOf(kid) { const g = (Game.persist.crewGear || {})[kid]; return g && typeof g === 'object' ? g : {}; }
function crewLoanOwned(kind, id) {
  if (kind === 'gun') return !!GUN_MAGS[id] && (id === 'pistol' || !!Game.persist.owned[GUN_MAGS[id].ownFlag]);
  if (kind === 'eyewear') return !!EYEWEAR[id] && id !== 'none' && !!(Game.persist.ownedEquipment.eyewear || {})[id];
  if (kind === 'shoes') return !!SHOES[id] && id !== 'none' && !!(Game.persist.ownedEquipment.shoes || {})[id];
  return false;
}
// What you have lent this kid of this kind ('gun' | 'eyewear' | 'shoes'), or null
function crewLent(kid, kind) {
  const id = crewGearOf(kid)[kind];
  return id && crewMembers().includes(kid) && crewLoanOwned(kind, id) ? id : null;
}
// The crew kid who has this of yours, or null
function crewLoanHolder(kind, id) {
  if (!id) return null;
  return crewMembers().find(kid => crewLent(kid, kind) === id) || null;
}
function crewYours(kind) {
  const e = Game.persist.equipped;
  return kind === 'gun' ? e.gun : (e[kind] || 'none');
}
// Lend it (id) or take his back (id null). Something another kid has passes from him; what you carry can't be lent.
function crewLend(kid, kind, id) {
  if (!crewMembers().includes(kid)) return false;
  if (!Game.persist.crewGear || typeof Game.persist.crewGear !== 'object') Game.persist.crewGear = {};
  const g = Object.assign({}, crewGearOf(kid));
  if (id == null) delete g[kind];
  else {
    if (!crewLoanOwned(kind, id) || crewYours(kind) === id) return false;
    const holder = crewLoanHolder(kind, id);
    if (holder && holder !== kid) crewLend(holder, kind, null);
    g[kind] = id;
  }
  Game.persist.crewGear[kid] = g;
  return true;
}
// Take it back from whoever has it; returns the kid who had it, or null
function crewTakeBack(kind, id) {
  const kid = crewLoanHolder(kind, id);
  if (kid) crewLend(kid, kind, null);
  return kid;
}
// The gun a crew kid takes into a match: yours when you lent him one and the bag has BBs for it, else his own
function crewGun(kid) {
  const g = crewLent(kid, 'gun');
  return g && Game.persist.bag > 0 ? g : CREW_GUNS[kid];
}
// The small gains of what you lent him, as a statsOverride on his profile (or null)
function crewGearStats(kid) {
  const ch = CHARACTERS[kid]; if (!ch) return null;
  const o = {};
  if (crewLent(kid, 'eyewear')) o.accuracy = Math.min(1, (ch.accuracy ?? 0.5) + CREW_LOAN_AIM);
  if (crewLent(kid, 'shoes')) o.moveSpeed = (ch.moveSpeed ?? 1.0) * CREW_LOAN_SPEED;
  return Object.keys(o).length ? o : null;
}
// At BEGIN, after your own gun, mags and loaders: each kid on a gun of yours loads from what the bag has left
function crewLoadLoans() {
  for (const e of Game.scenario.enemies || []) {
    const L = e.crewLoan;
    if (!L || L.loaded != null) continue;
    const take = Math.max(0, Math.min(CREW_LOAN_MAGS * getMaxAmmoForGun(L.gun), Game.persist.bag));
    Game.persist.bag -= take;
    L.bbs = take; L.loaded = take;
    if (take > 0) { const gm = Game.persist.gunMatches; if (gm && typeof gm[L.gun] === 'number') gm[L.gun]++; }   // (it counts as a match for selling it back)
    else crewKidOwnGun(e);
  }
}
// At the end: what they haven't fired goes back in the bag
function crewReturnLoans() {
  for (const e of Game.scenario.enemies || []) {
    const L = e.crewLoan;
    if (!L || !L.bbs) continue;
    Game.persist.bag += L.bbs; L.bbs = 0;
  }
}
// Out of your BBs (or none to start with): back to his own gun and his own BBs for the rest of the match
function crewKidOwnGun(e) {
  const L = e.crewLoan;
  if (!L || e.weapon === L.own) return;
  e.weapon = L.own; L.dry = true;
  if (e.pendingBurst) e.pendingBurst.length = 0;
  const gg = e.mesh && e.mesh.gunGroup;
  if (!gg) return;
  for (const c of gg.userData.gunParts || []) gg.remove(c);
  const fresh = buildEnemyGunMesh(L.own), parts = fresh.children.slice();
  for (const c of parts) gg.add(c);
  gg.userData.gunParts = parts;
}
const CREW_NAMED_ALLY = { bunratty_team_2v1: 'nick', bunratty_team_2v2: 'sean', bunratty_night_team_2v2: 'sean' };
const crewBench = new Set();
function crewFielded() { return crewMembers().filter(id => !crewBench.has(id)); }
function crewTeamMatch(id) {
  const sc = SCENARIOS[id];
  if (!sc || sc.tutorial || sc.ffa || sc.pickup || sc.net || id === 'pickup_game') return false;
  return (sc.enemySetup || []).some(es => es.team === 'player');
}
// The kids who play on this street with a gun of their own, in the order the matches list them
// (v1.275: the kids who play against you there first, then the ones who stand with you)
function crewStreetPool(sc) {
  const seen = new Map();
  for (const ours of [false, true]) for (const [id, s] of Object.entries(SCENARIOS)) {
    if (id === 'pickup_game' || s.tutorial || s.street !== sc.street) continue;
    for (const es of s.enemySetup || []) {
      if ((es.team === 'player') !== ours) continue;
      if (es.charId && es.weapon && !es.behavior && !es.statsOverride && !seen.has(es.charId) && CHARACTERS[es.charId]) seen.set(es.charId, es.weapon);
    }
  }
  return [...seen].map(([charId, weapon]) => ({ charId, weapon }));
}
// v1.275 (D.28 step 3, Michael: A on "other side fixed or growing with your crew"): each team match is tuned for the
// crew you would have the first time you reach it (every kid whose ask comes before it on the ladder, taken in). That
// first-time crew sets the match's sides once: your side never smaller than it, theirs fixed. An ordinary match keeps
// its own margin (their side grows by as many as the first-time crew adds to yours); a zone's finale has their side one
// more than yours, the Last Saturday two more, Seth and his seven. Winnmark's finale stays 2 v 2, with Seth beside you.
// A replay with a bigger crew is meant to be easy; a benched kid's place stays empty. Extra kids on their side come
// from the street, Seth's crew first when Seth plays (Garrett and Colin with him once Bellfield's flags are done). On a
// replay of Winnmark's team matches once its finale is done, Seth plays for the other side.
const CREW_KID_GUNS = { garrett: 'ar', colin: 'mac10' };   // the two new kids' own guns (the spec: mid-high tier, cheap)
const CREW_FOE_SIDES = { last_saturday: SETH_CREW_ROSTER };   // a side the spec names outright
function crewLadderPos(id) {
  const ctx = findScenarioListContext(id);
  return ctx ? zoneLadderIndex(ctx.group) * 1000 + ctx.idx : -1;
}
function crewFinale(id) {
  const ctx = findScenarioListContext(id);
  return !!ctx && ctx.idx === ctx.ids.length - 1;
}
const WINNMARK_FINALE = 'winnmark_night_team_2v2';   // Lights Out: Seth beside you, the last time
// v1.356 (D.28 step 5, Michael: C on "Seth in every zone", control room, 27 Oct): Seth turns up once in each zone as
// the rival, on a better gun with better aim each time, at his best in the Last Saturday. One match per zone, mostly its
// finale; where he was not in it he takes one kid's place (his spot, not his role), so every count stays the same. At
// Winnmark it is the shotgun duel, as it was (the Spring Shotgun, his own 0.55). His other matches stay as they were.
// Applied to the campaign's sides only: the Pickup Game, which builds its sides from these matches, keeps them as they are.
const SETH_ZONE_MATCHES = {
  bunratty_night_team_2v2: { weapon: 'ar',    aim: 0.60, takes: 'mitchell' },   // Night Game: Sean Has Your Back
  hollow_big_battle:       { weapon: 'ump',   aim: 0.63 },                      // The Big Game
  lot_night_4v4:           { weapon: 'mp5',   aim: 0.66 },                      // After Close
  northcliff_night_4v4:    { weapon: 'burst', aim: 0.69, takes: 'fernando' },   // Bellfield After Dark
  school_night_4v4:        { weapon: 'p90',   aim: 0.72, takes: 'nathan' },     // Friday Night Lights
  club_night_4v4:          { weapon: 'ak47',  aim: 0.75 },                      // Night Swim
  last_saturday:           { weapon: 'm249',  aim: 0.80 },                      // the Last Saturday
};
const sethSetupCache = {};
// The match's own sides with Seth's zone match in them (the scenario's own enemySetup for any other match)
function sethSetup(id) {
  const sc = SCENARIOS[id], z = SETH_ZONE_MATCHES[id];
  if (!sc || !z || !sc.enemySetup) return sc ? sc.enemySetup : undefined;
  if (sethSetupCache[id] && sethSetupCache[id].src === sc.enemySetup) return sethSetupCache[id].setup;
  const him = { weapon: z.weapon, statsOverride: { accuracy: z.aim } };
  const setup = sc.enemySetup.map(es => {
    if (es.charId === 'seth' && es.team !== 'player') return Object.assign({}, es, him);
    if (z.takes && es.charId === z.takes && es.team !== 'player') return Object.assign({ charId: 'seth', anchor: es.anchor }, es.spawnAt ? { spawnAt: es.spawnAt } : {}, him);
    return es;
  });
  sethSetupCache[id] = { src: sc.enemySetup, setup };
  return setup;
}
// The crew you'd have the first time you play this match: each kid whose ask comes before it on the ladder
function crewFirstTime(id) {
  const pos = crewLadderPos(id);
  return CREW_ROSTER.filter(kid => { const t = SUMMER_TEXTS.find(t => t.ask === kid); return t && crewLadderPos(t.after) < pos; });
}
// Seth has turned rival: a Winnmark team match with him on your side, replayed once Lights Out is done
function crewSethTurned(id) {
  const ctx = findScenarioListContext(id);
  return !!ctx && ctx.group === 'winnmark_court' && !!Game.persist.completed[WINNMARK_FINALE] &&
    (SCENARIOS[id].enemySetup || []).some(es => es.charId === 'seth' && es.team === 'player');
}
// The gun a kid carries most across the summer (the two new kids carry their own)
// (not a sniper rifle: a kid brought in to make up the numbers has no nest to shoot it from)
function crewKidGun(charId) {
  if (CREW_KID_GUNS[charId]) return CREW_KID_GUNS[charId];
  const n = {};
  for (const [id, s] of Object.entries(SCENARIOS)) {
    if (id === 'pickup_game' || s.tutorial) continue;
    for (const es of s.enemySetup || []) if (es.charId === charId && es.weapon && es.weapon !== 'sniper') n[es.weapon] = (n[es.weapon] || 0) + 1;
  }
  return Object.keys(n).sort((x, y) => n[y] - n[x])[0] || 'pistol';
}
// v1.275: when the street runs out of kids, the rest of the zone's, then anybody's, each on the gun he carries most
function crewWiderPool(id) {
  const ctx = findScenarioListContext(id), seen = new Set();
  const ids = (ctx ? ctx.ids : []).concat(Object.keys(SCENARIOS));
  for (const sid of ids) {
    const s = SCENARIOS[sid];
    if (!s || sid === 'pickup_game' || s.tutorial) continue;
    for (const es of s.enemySetup || []) if (es.charId && es.weapon && !es.behavior && !es.statsOverride && CHARACTERS[es.charId]) seen.add(es.charId);
  }
  return [...seen].filter(k => !CREW_KID_GUNS[k]).map(charId => ({ charId, weapon: crewKidGun(charId) }));
}
// The match's sides with your crew in it: the scenario's own enemySetup when nothing changes
function crewSetup(id) {
  const sc = SCENARIOS[id];
  if (!sc || !crewTeamMatch(id)) return sethSetup(id);   // v1.356: Seth's zone match
  const crew = crewMembers(), first = crewFirstTime(id), turned = crewSethTurned(id);
  if (!crew.length && !first.length && !turned) return sethSetup(id);
  const allies = sc.enemySetup.filter(es => es.team === 'player'), foes = sc.enemySetup.length - allies.length;
  // v1.275: the first-time sides fix the match; then your crew as it is now plays it
  const base = crewSides(id, first, first, allies.length, null, false);
  const ours1 = base.filter(es => es.team === 'player').length + 1;
  const theirs = id === SUMMER_FINALE ? ours1 + 2 : crewFinale(id) && id !== WINNMARK_FINALE ? ours1 + 1 : foes + ours1 - (allies.length + 1);
  return crewSides(id, crew, crewFielded(), ours1 - 1, Math.max(1, theirs), turned);
}
// v1.274's sides, with your side filled to `alliesN` and (v1.275) their side fitted to `foeN` when it is given
function crewSides(id, crew, fielded, alliesN, foeN, turned) {
  const sc = Object.assign({}, SCENARIOS[id], { enemySetup: sethSetup(id) });   // v1.356: Seth's zone match
  // v1.275: Seth turned rival leaves your side for theirs
  const setup = turned ? sc.enemySetup.filter(es => !(es.charId === 'seth' && es.team === 'player')) : sc.enemySetup;
  const sethFoe = turned || setup.some(es => es.charId === 'seth' && es.team !== 'player');
  const named = CREW_NAMED_ALLY[id];
  const allies = setup.filter(es => es.team === 'player'), foes = setup.filter(es => es.team !== 'player');
  const keep = es => es.vip || es.charId === 'seth' || (es.charId === named && !crew.includes(named));
  const kept = allies.filter(keep), slots = allies.filter(es => !keep(es));
  // Seth's crew on your side crosses over to him; the rest of the match's own allies wait to fill places
  const crossing = sethFoe ? slots.filter(es => SETH_CREW_ROSTER.includes(es.charId)) : [];
  const own = slots.filter(es => !crew.includes(es.charId) && !crossing.includes(es));
  const strip = (es, fields) => { const o = Object.assign({}, es); for (const f of fields) delete o[f]; return o; };
  // v1.314 (critic, 22 Oct): with Seth turned and no other ally, slots and kept are empty, and a kid put in a spare place
  // got no anchor, so the scene dropped him (Lights Out replayed played 1 v 2): the place Seth left is the spare one then
  const left0 = turned ? sc.enemySetup.find(es => es.charId === 'seth' && es.team === 'player') : null;
  const spare = () => (slots[0] || kept[0] || !left0) ? strip(slots[0] || kept[0], ['vip', 'role', 'spawnAt', 'perch', 'ctf', 'lives'])   // a place past the match's own (v1.275: not its flag run or lives)
    : strip(left0, ['vip', 'role', 'spawnAt', 'perch', 'ctf', 'lives', 'behavior', 'statsOverride', 'team']);
  // v1.275: a kid of the match's own who is not playing (your crew took his place) is free for the street to use
  const taken = new Set([...kept, ...foes, ...crossing].map(es => es.charId).concat(crew, 'seth'));
  // v1.275: the street's kids, then Garrett and Colin, who play with Seth once Bellfield's flags are done ("u havent met
  // garrett. u will"), then the rest of the zone's and anybody's
  const newKids = sethFoe && crewLadderPos(id) > crewLadderPos('bellfield_ctf') ? ['garrett', 'colin'].map(k => ({ charId: k, weapon: crewKidGun(k) })) : [];
  const pool = crewStreetPool(sc).concat(newKids, crewWiderPool(id)).filter((k, i, a) => !CREW_ROSTER.includes(k.charId) && k.charId !== 'seth' &&
    a.findIndex(o => o.charId === k.charId) === i);
  const fromStreet = (preferSeth) => {
    const list = preferSeth ? pool.filter(k => SETH_CREW_ROSTER.includes(k.charId)).concat(pool) : pool.filter(k => !(sethFoe && SETH_CREW_ROSTER.includes(k.charId)));
    const k = list.find(k => !taken.has(k.charId));
    if (!k) return k;
    taken.add(k.charId);
    return k.weapon === 'sniper' ? { charId: k.charId, weapon: crewKidGun(k.charId) } : k;   // v1.275: no nest, no rifle
  };
  // Your side: the kept kids, then the crew (a kid on his own spot when the match has one for him), then the places left
  const out = kept.map(es => Object.assign({}, es));
  const free = slots.map((es, i) => i), at = new Map();
  for (const kid of fielded) { const i = slots.findIndex(es => es.charId === kid); if (i >= 0) { at.set(kid, i); free.splice(free.indexOf(i), 1); } }
  for (const kid of fielded) {
    const i = at.has(kid) ? at.get(kid) : free.length ? free.shift() : -1;
    const es = Object.assign(i >= 0 ? Object.assign({}, slots[i]) : spare(), { charId: kid, weapon: crewGun(kid), team: 'player' });
    if (es.weapon !== CREW_GUNS[kid]) es.crewLoan = true;   // v1.337: on a gun you lent him
    const gs = crewGearStats(kid); if (gs) es.statsOverride = Object.assign({}, es.statsOverride || {}, gs);   // v1.337: his eyes and feet
    out.push(es);
  }
  let left = alliesN - kept.length - crew.length;   // a benched kid's place stays empty
  for (const es of own) { if (left <= 0) break; out.push(Object.assign({}, es)); taken.add(es.charId); left--; }
  // Their side: a crew kid there is swapped for a kid from the street at his spot; Seth's crew crosses over
  const them = [];
  for (const es of foes) {
    if (!crew.includes(es.charId)) { them.push(Object.assign({}, es)); continue; }
    const k = fromStreet(sethFoe);
    if (k) them.push(Object.assign({}, es, { charId: k.charId, weapon: k.weapon }));
  }
  const spots = foes.filter(es => es.role !== 'defender');
  const foeSpot = foes.find(es => es.role !== 'defender' && !es.spawnAt) || foes[0];
  const over = [...(turned ? sc.enemySetup.filter(es => es.charId === 'seth') : []), ...crossing];
  const crossed = over.map(es => Object.assign(strip(es, ['team', 'vip', 'role', 'spawnAt', 'perch', 'behavior', 'ctf', 'lives']), { anchor: foeSpot.anchor }));
  them.unshift(...crossed.filter(es => es.charId === 'seth')); them.push(...crossed.filter(es => es.charId !== 'seth'));
  if (foeN != null) {
    // v1.275: fit their side to the match's number: the match's own kids go from the end (never Seth, a crosser or a
    // defender), extra kids come from the street at the match's own spots in turn
    for (let i = them.length - 1; them.length > foeN && i >= 0; i--) {
      const es = them[i];
      if (es.charId !== 'seth' && !crossed.includes(es) && es.role !== 'defender' && !es.vip) them.splice(i, 1);
    }
    let n = 0;
    while (them.length < foeN) {
      const k = fromStreet(sethFoe); if (!k) break;
      const spot = (spots.length ? spots : foes)[n++ % (spots.length || foes.length)];
      // (a spot's own start is kept: Lamplight's yard starts have no line to your entry, v1.178)
      const kid = Object.assign(strip(spot, ['role', 'perch', 'vip', 'behavior', 'statsOverride', 'ctf', 'lives']), { charId: k.charId, weapon: k.weapon });
      if (sc.ctf) kid.ctf = 'push';   // the flags keep a thin defence (Michael: C, v1.191): only their own keeper keeps it
      kid.crewFill = true;   // v1.278: a kid the crew's numbers added comes looking when he has hidden too long (updateKidBoredom)
      them.push(kid);
    }
    // A side the spec names outright (the Last Saturday: Seth and his seven) takes those kids at its places
    const named = CREW_FOE_SIDES[id];
    if (named) {
      const rest = named.filter(k => !them.some(es => es.charId === k));
      for (const es of them) if (!named.includes(es.charId) && rest.length) { const k = rest.shift(); es.charId = k; es.weapon = crewKidGun(k); }
    }
  }
  // v1.275: places left on your side come after theirs, so the street's own kids stand on their side first
  while (left-- > 0) { const k = fromStreet(false); if (!k) break; out.push(Object.assign(spare(), { charId: k.charId, weapon: k.weapon, team: 'player' })); }
  return out.concat(them);
}
// A scenario as it will be played: the same object when the crew changes nothing, else a copy with the crew's sides
function crewScenario(id) {
  const sc = SCENARIOS[id];
  const setup = crewSetup(id);
  return !sc || setup === sc.enemySetup ? sc : Object.assign({}, sc, { enemySetup: setup });   // (v1.356: a copy in Seth's zone matches too)
}
