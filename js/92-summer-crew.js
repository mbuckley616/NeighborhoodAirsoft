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
  // v1.273: Bunratty done, your brother and your best friend ask. v1.408 (D.57 step 4, the plan's "Sean and Nick ask after
  // You and Nick"): they ask after You and Nick, so the crew forms at home and holds Bunratty all zone
  { id: 'askSean',    from: 'Sean',    after: 'bunratty_team_2v1', ask: 'sean',
    text: "ok fine. ur crew is the real one. can i be in it? dont tell mom i said that" },
  { id: 'askNick',    from: 'Nick',    after: 'bunratty_team_2v1', ask: 'nick',   // v1.408
    text: "if seans in ur crew im in ur crew. right? im in right?" },
  { id: 'brothers',   from: 'Sean',    after: 'bunratty_brothers',
    text: "ryan and mitchell are SO mad. mitchell already wants a rematch at the cul de sac" },
  { id: 'infection',  from: 'Rebecca', after: 'bunratty_infection',
    text: "infection at the cul de sac is the best game ever invented and i will not hear otherwise" },
  // v1.363 (D.28 step 5, Michael: C): a text from Seth the night before each of his zone matches (SETH_ZONE_MATCHES)
  { id: 'sethBunratty', from: 'Seth',  after: 'bunratty_vip',
    text: "heard ur playing night games on bunratty now. save me a spot. on the other team. mitchell says i can be his plus one" },
  { id: 'hollow',     from: 'Eric',    after: 'bunratty_night_team_2v2',
    text: "everybody is going to the hollow this week. the woods past the river, forts at both ends. seth is bringing his whole crew. bring BBs" },
  { id: 'sethHollow', from: 'Seth',    after: 'hollow_infection_night',   // v1.363; v1.402: the night before the finale, now last
    text: "big game tmrw. whole neighborhood. im on red and i got the ump. dont cry when u lose" },
  { id: 'bigGame',    from: 'Seth',    after: 'hollow_big_battle',
    text: "the big game was close and u know it. my crew wants the north fort back" },
  { id: 'lot',        from: 'Brooke',  after: 'hollow_big_battle',   // v1.402: the Hollow's finale opens the lot (was its last match)
    text: "marcus's mom does the big shop at riverside market saturday mornings. he'll be in the lot w his pistol lol" },
  { id: 'sethLot',    from: 'Seth',    after: 'lot_vip_night',   // v1.363
    text: "after close tmrw. the lot. i got an mp5 now. u wont hear me coming" },
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
  { id: 'sethNorthcliff', from: 'Seth', after: 'northcliff_defend_creek',   // v1.363
    text: "bellfield kids asked me to play w them tmrw night. got a burst rifle. three at a time. good luck" },
  { id: 'school',     from: 'Seth',    after: 'northcliff_night_4v4',
    text: "school starts tmrw ugh. hollins ridge kids say the portables are theirs after the last bell. friday night im playing for them. bet ur crew cant take em" },   // v1.363: he's the other side now (was "lets go see")
  { id: 'pool',       from: 'Brooke',  after: 'school_night_4v4',
    text: "the club shut the pool for the season. i know a gap in the hedge. bring a pistol" },
  { id: 'sethClub',   from: 'Seth',    after: 'club_defend_gazebo',   // v1.363
    text: "night swim at the club tmrw. me marcus jamie and devon on the veranda. i got the ak. wear something dark" },
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
const CREW_NAMED_ALLY = { bunratty_team_2v1: 'nick', bunratty_team_2v2: 'sean', bunratty_night_team_2v2: 'sean',
  winnmark_night_team_2v2: 'eric' };   // v1.407 (D.57 step 4): Seth Picks Teams, Eric beside you until he is in your crew
const crewBench = new Set();
function crewFielded() { return crewMembers().filter(id => !crewBench.has(id)); }
function crewTeamMatch(id) {
  const sc = SCENARIOS[id];
  if (!sc || sc.tutorial || sc.ffa || sc.pickup || sc.net || id === 'pickup_game') return false;
  if (sc.crewPosts) return true;   // v1.393 (D.57 step 1): a solo match your crew now plays (or a CLUTCH, out already)
  return (sc.enemySetup || []).some(es => es.team === 'player');
}
// v1.393 (D.57 step 1, Michael: "All of it", decisions "The crew-first ladder and Crew Captains", 22 Oct; the plan is
// docs/crew_ladder.md): your crew plays every match unless the match says why not. Each ladder match has one of five
// types, a chip on its map card and one line on its briefing: CREW, 1V1 CALLOUT, FREE-FOR-ALL, CLUTCH (your crew starts
// tagged out on the sideline: `crewPosts` with the type here) and NO CREW YET (Winnmark, until a replay with your crew).
// The night solo on Bunratty's lane says why outright (SNUCK OUT), and the two rides have their own lines. A solo match
// with no reason takes the crew: it has `crewPosts`, the anchors on your side your crew holds.
const MATCH_TYPE_CHIPS = { crew: 'CREW', callout: '1V1 CALLOUT', ffa: 'FREE-FOR-ALL', clutch: 'CLUTCH', nocrew: 'NO CREW YET', solo: 'SNUCK OUT' };
const MATCH_TYPES = {
  bunratty_brothers: 'callout',                  // 1 v 2: the brothers call you out
  stoneglen_treehouse: 'callout',                // the twins' rule, one at a time on their course
  bunratty_night_lane: 'solo',                   // you snuck out alone
  bunratty_go_cart: 'ffa',                       // the whole street shoots at the cart
  club_cart_ride: 'crew',                        // Eric drives
  hollow_defend_south_fort_night: 'clutch',
  store_defend_desk: 'clutch',
};
const MATCH_TYPE_LINES = {
  stoneglen_treehouse: "The twins' rule: one at a time on their course. Your crew watches from the fence.",
  bunratty_go_cart: "The whole street shoots at the cart. Crews don't count on the hill.",
  club_cart_ride: "Eric's driving. You shoot.",
};
// The match's type ('crew' | 'callout' | 'ffa' | 'clutch' | 'nocrew' | 'solo'), or null (the tutorials, the Pickup Game)
function matchType(id) {
  const sc = SCENARIOS[id];
  if (!sc || sc.tutorial || sc.pickup || sc.net || id === 'pickup_game') return null;
  if (MATCH_TYPES[id]) return MATCH_TYPES[id];
  if (sc.ffa || sc.winCondition === 'survive_untagged') return 'ffa';
  const ctx = findScenarioListContext(id);
  if (ctx && ctx.group === 'winnmark_court') return crewTeamMatch(id) && crewFielded().length ? 'crew' : 'nocrew';
  if (crewTeamMatch(id)) return 'crew';
  return 'callout';
}
// The briefing's line for it, naming who is in from the sides as built
function matchTypeLine(id, setup) {
  const type = matchType(id);
  if (!type) return '';
  if (MATCH_TYPE_LINES[id]) return MATCH_TYPE_LINES[id];
  const crew = crewMembers();
  const name = k => (CHARACTERS[k] && CHARACTERS[k].name) || k;
  const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
  if (type === 'crew') {
    const ours = (setup || crewSetup(id) || []).filter(es => es.team === 'player' && !es.clutchOut);
    const inCrew = ours.filter(es => crew.includes(es.charId)).map(es => name(es.charId));
    if (inCrew.length) return `Your crew's in: ${list(inCrew)}.`;
    const others = ours.filter(es => !es.vip).map(es => name(es.charId));
    return others.length ? `No crew yet: ${list(others)} ${others.length > 1 ? 'play' : 'plays'} with you today.` : "It's just you today.";
  }
  // v1.401 (D.57 step 3): a captain's callout says whose
  const ctx = findScenarioListContext(id), cap = ctx && ZONE_CAPTAIN_KID[ctx.group];
  const capIn = type === 'callout' && cap && cap !== 'seth' && (setup || crewSetup(id) || []).some(es => es.charId === cap && es.team !== 'player');
  if (capIn) return `${captainName(cap)} calls you out. ${crew.length ? 'Your crew watches from the curb.' : 'Just you and them.'}`;
  if (type === 'callout') return crew.length ? 'A callout. Your crew watches from the curb.' : 'A callout. Just you and them.';
  if (type === 'ffa') return "Everybody for themselves. Crews don't count today.";
  if (type === 'clutch') return crewFielded().length ? "Your crew's already out. It's on you." : "It's on you.";
  if (type === 'nocrew') return id === WINNMARK_FINALE ? "Seth picked his team, and it isn't you. Eric's with you." : "You're the new kid on Seth's street.";   // v1.407: Seth Picks Teams
  if (type === 'solo') return crew.length ? "You snuck out alone. Your crew's asleep." : 'You snuck out alone.';
  return '';
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
const WINNMARK_FINALE = 'winnmark_night_team_2v2';   // v1.407: Seth Picks Teams, where Seth turns (was Seth beside you, the last time)
// v1.362 (D.28 step 5, Michael: C on "Seth in every zone", control room, 27 Oct): Seth turns up once in each zone as
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
// v1.400 (D.57 step 2, the plan's side consistency; Michael: B on "Who is in Marcus's crew", control room, 31 Oct): each
// captain's crew. Seth's and Marcus's are cousins' crews and may stand together (B); Devon is Marcus's.
const CAPTAIN_CREWS = {
  seth:     SETH_CREW_ROSTER,
  marcus:   ['marcus', 'jamie', 'devon'],
  mitchell: ['mitchell', 'ryan', 'owen', 'joe', 'chris'],
  mason:    ['mason', 'christian', 'fernando', 'haden', 'connor'],
  jordan:   ['jordan', 'caleb', 'nathan', 'sophie', 'grant', 'malik'],
};
// The crew each zone plays against (the store's captain is Tyler, Seth's lieutenant: Seth's crew)
const ZONE_CAPTAINS = { winnmark_court: 'seth', bunratty_court: 'mitchell', hollow: 'seth', market_lot: 'marcus', northcliff: 'mason',
  high_school: 'jordan', country_club: 'seth', grocery_store: 'seth' };
// A kid of Seth's crew the street can bring in only once you know he's with Seth (Evan "lives up in northcliff now",
// Andrew goes with Seth after the twins' treehouse, Garrett and Colin after Bellfield's flags)
const SETH_CREW_KNOWN = { evan: 'lot_night_4v4', andrew: 'stoneglen_hold_treehouse', garrett: 'bellfield_ctf', colin: 'bellfield_ctf' };
function captainOf(kid) {
  for (const c in CAPTAIN_CREWS) if (CAPTAIN_CREWS[c].includes(kid)) return c;
  return null;
}
// May this kid play against you in this zone? Your crew and Rebecca never; Seth's crew anywhere (Seth is the rival who
// turns up everywhere, and his crew with him); Marcus's where Seth or Marcus captains; Mitchell's, Mason's and Jordan's
// only on their own captain's street
function sideFoeOk(kid, zoneCap, crew) {
  if (crew.includes(kid) || kid === 'rebecca') return false;
  const c = captainOf(kid);
  if (!c || c === 'seth') return true;
  if (c === 'marcus') return zoneCap === 'seth' || zoneCap === 'marcus';
  return c === zoneCap;
}
// May this kid stand with you? Never one of Seth's crew or his cousin's, nor a kid against his own captain; a kid of
// another street's crew may make up your numbers (every kid in the game is in some crew)
function sideAllyOk(kid, zoneCap) {
  const c = captainOf(kid);
  return !c || (c !== 'seth' && c !== 'marcus' && c !== zoneCap);
}
// The plan's side rule on a match's sides: a kid on the wrong side is swapped at his spot (his gun, role and place kept,
// so every count stays the same) for one who may play there, the zone's own crew first; an ally with nobody to take his
// place is dropped (as a benched kid's place stays empty). Free-for-alls and callouts keep their kids; so does Winnmark,
// your tryouts on Seth's street (a turned replay's crossing is crewSides' own). Your VIP is the match's (step 4 renames
// Protect Ryan as Cover Nick).
function crewSideRule(id, setup) {
  const ctx = findScenarioListContext(id), type = matchType(id);
  if (!setup || !ctx || !type || type === 'ffa' || type === 'callout' || ctx.group === 'winnmark_court') return setup;
  const zoneCap = ZONE_CAPTAINS[ctx.group], crew = crewMembers(), pos = crewLadderPos(id);
  const known = k => !SETH_CREW_KNOWN[k] || pos > crewLadderPos(SETH_CREW_KNOWN[k]);
  const bad = setup.filter(es => !es.vip && es.charId && (es.team === 'player' ? !sideAllyOk(es.charId, zoneCap) : !sideFoeOk(es.charId, zoneCap, crew)));
  if (!bad.length) return setup;
  const used = new Set(setup.map(es => es.charId));
  // A kid of the zone's own crew on your side (the street making up your numbers) goes over to his captain's side, in
  // place of a kid there from outside it (one the street added first), so the school's kids play for the school
  const homeBound = bad.filter(es => es.team === 'player' && captainOf(es.charId) === zoneCap);
  const swapIn = new Map();
  for (const es of homeBound) {
    const there = setup.filter(f => f.team !== 'player' && !f.vip && f.charId !== 'seth' && captainOf(f.charId) !== zoneCap && !swapIn.has(f))
      .sort((a, b) => (b.crewFill ? 1 : 0) - (a.crewFill ? 1 : 0))[0];
    if (there) { swapIn.set(there, es.charId); used.delete(there.charId); }
  }
  const order = [zoneCap, zoneCap === 'marcus' ? 'seth' : zoneCap === 'seth' ? 'marcus' : 'seth', 'marcus']
    .filter((c, i, a) => a.indexOf(c) === i).flatMap(c => CAPTAIN_CREWS[c]);
  const out = [];
  for (const es of setup) {
    if (swapIn.has(es)) { out.push(Object.assign({}, es, { charId: swapIn.get(es), sideSwap: es.charId })); continue; }
    if (!bad.includes(es)) { out.push(es); continue; }
    // an ally from another street's crew (never a captain), the streets in ladder order; nobody left, his place stays empty
    const k = es.team === 'player'
      ? ['mitchell', 'mason', 'jordan'].flatMap(c => CAPTAIN_CREWS[c].slice(1)).find(k => !used.has(k) && sideAllyOk(k, zoneCap))
      : order.find(k => k !== 'seth' && !used.has(k) && known(k) && sideFoeOk(k, zoneCap, crew));
    if (!k && es.team === 'player') continue;
    if (!k) { out.push(es); continue; }   // nobody left who may play here: the match keeps its kid (the suite names any)
    used.add(k);
    out.push(Object.assign({}, es, { charId: k, sideSwap: es.charId }));
  }
  return out;
}
// v1.401 (D.57 step 3, the plan's Crew Captains): each captain's crew wears its own colour (a bandana, as yours does;
// colours none of the mirror's six, so yours never matches theirs), has a heading and a score line on the briefing,
// calls you out with its captain's name, and plays its finale whole, the captain in it. Beating a captain's finale pins
// his crew's bandana over the Pickup board in your room. Tyler captains the store for Seth: Seth's crew and colour.
const CAPTAIN_COLORS = { seth: 0xc0282a, marcus: 0x1f8a8a, mitchell: 0xe8e6dc, mason: 0x6e7468, jordan: 0xd0508a };
const ZONE_CAPTAIN_KID = { winnmark_court: 'seth', bunratty_court: 'mitchell', hollow: 'seth', market_lot: 'marcus', northcliff: 'mason',
  high_school: 'jordan', country_club: 'seth', grocery_store: 'tyler' };
// Each captain's finale (the plan's: the Hollow's is the Big Game, the store's Graveyard Shift); any one of Seth's pins his
const CAPTAIN_FINALES = { mitchell: ['bunratty_night_team_2v2'], seth: ['hollow_big_battle', 'club_night_4v4', 'last_saturday'],
  marcus: ['lot_night_4v4'], mason: ['northcliff_night_4v4'], jordan: ['school_night_4v4'], tyler: ['store_night_4v4'] };
const CAPTAIN_ORDER = ['mitchell', 'seth', 'marcus', 'mason', 'jordan', 'tyler'];
const CAPTAIN_EDGE = 0.05, CAPTAIN_AIM_MAX = 0.8;   // a notch better than his crew, never past Seth's best (the Last Saturday)
function captainCrewOf(cap) { return cap === 'tyler' ? 'seth' : cap; }
function captainColorOf(kid) { const c = captainOf(kid); return c ? CAPTAIN_COLORS[c] : null; }
function captainName(cap) { return (CHARACTERS[cap] && CHARACTERS[cap].name) || cap; }
// The captain whose crew this match is against: its zone's, when his crew is on their side (null for Seth: RIVALS)
function captainOfMatch(id) {
  const ctx = findScenarioListContext(id), type = matchType(id);
  if (!ctx || !type || type === 'ffa' || type === 'nocrew') return null;
  const cap = ZONE_CAPTAIN_KID[ctx.group];
  if (!cap || cap === 'seth') return null;
  if (cap === 'tyler' && isRivalMatch(id)) return null;   // Seth there himself (the Last Saturday): his crew, RIVALS
  const crew = CAPTAIN_CREWS[captainCrewOf(cap)];
  return (sethSetup(id) || []).some(es => es.team !== 'player' && crew.includes(es.charId)) ? cap : null;
}
function captainMatchIds(cap) { return Object.keys(SCENARIOS).filter(id => captainOfMatch(id) === cap); }
function captainScore(cap) {
  const ids = captainMatchIds(cap);
  return { beaten: ids.filter(id => Game.persist.completed[id]).length, total: ids.length };
}
function captainCrewName(cap) { return `${captainName(cap)}'s crew`; }
function captainFinaleOf(id) { return CAPTAIN_ORDER.find(c => CAPTAIN_FINALES[c].includes(id)) || null; }
function captainBandanaWon(cap) { return CAPTAIN_FINALES[cap].some(id => Game.persist.completed[id]); }
function captainBandanasWon() { return CAPTAIN_ORDER.filter(captainBandanaWon); }
// A captain's finale is his whole crew: anyone else on their side but Seth (his zone match) gives way to the captain's
// kids while there are any, and the captain himself plays it
function crewCaptainFinale(id, setup) {
  const cap = captainFinaleOf(id);
  if (!setup || !cap || cap === 'seth') return setup;
  // (the cousins' crews stand together, Michael's B: Seth's at Marcus's finale, Marcus's at Tyler's)
  const cousins = cap === 'marcus' || cap === 'tyler';
  const crew = CAPTAIN_CREWS[captainCrewOf(cap)], ok = k => k === 'seth' || crew.includes(k) || (cousins && ['seth', 'marcus'].includes(captainOf(k)));
  const out = setup.map(es => Object.assign({}, es)), used = new Set(out.map(es => es.charId));
  const spare = () => crew.find(k => !used.has(k) && k !== 'seth');
  for (const es of out) {
    if (es.team === 'player' || es.vip || ok(es.charId)) continue;
    const k = spare(); if (!k) break;
    used.add(k); es.sideSwap = es.sideSwap || es.charId; es.charId = k;
  }
  if (!used.has(cap)) {
    const es = [...out].reverse().find(es => es.team !== 'player' && !es.vip && es.charId !== 'seth');
    if (es) { es.sideSwap = es.sideSwap || es.charId; es.charId = cap; }
  }
  return out;
}
// The captain a notch better than his crew in his own zone's matches (his aim), never past Seth's best
function crewCaptainEdge(id, setup) {
  const ctx = findScenarioListContext(id), cap = ctx && ZONE_CAPTAIN_KID[ctx.group];
  if (!setup || !cap || cap === 'seth' || !setup.some(es => es.charId === cap && es.team !== 'player')) return setup;
  return setup.map(es => {
    if (es.charId !== cap || es.team === 'player' || (es.statsOverride && es.statsOverride.accuracy != null)) return es;
    const aim = Math.min(CAPTAIN_AIM_MAX, ((CHARACTERS[cap] || {}).accuracy || 0.5) + CAPTAIN_EDGE);
    return Object.assign({}, es, { statsOverride: Object.assign({}, es.statsOverride || {}, { accuracy: +aim.toFixed(2) }), captain: true });
  });
}
// The match's sides with your crew in it: the scenario's own enemySetup when nothing changes
// (v1.400: and the plan's side rule; v1.401: a captain's finale whole, the captain a notch better)
function crewSetup(id) { return crewCaptainEdge(id, crewCaptainFinale(id, crewSideRule(id, crewSetupSides(id)))); }
function crewSetupSides(id) {
  const sc = SCENARIOS[id];
  if (!sc || !crewTeamMatch(id)) return sethSetup(id);   // v1.362: Seth's zone match
  const crew = crewMembers(), first = crewFirstTime(id), turned = crewSethTurned(id);
  if (!crew.length && !first.length && !turned) return sethSetup(id);
  const allies = sc.enemySetup.filter(es => es.team === 'player'), foes = sc.enemySetup.length - allies.length;
  // v1.393 (D.57 step 1): a CLUTCH match keeps its own sides; your crew is there, out already, and nobody fills a place
  if (MATCH_TYPES[id] === 'clutch') return crewSides(id, crew, crewFielded(), 0, foes, false);
  // v1.275: the first-time sides fix the match; then your crew as it is now plays it
  const base = crewSides(id, first, first, allies.length, null, false);
  const ours1 = base.filter(es => es.team === 'player').length + 1;
  // v1.393: a solo match your crew now plays keeps its own kids, and the street makes them at least as many as you
  // (their side growing by your whole first-time crew would put eight kids in the Hollow's forts)
  // v1.406 (D.57 step 4): a captain's finale that is not his zone's last (the store's Graveyard Shift) is at plus one too
  const theirs = id === SUMMER_FINALE ? ours1 + 2 : (crewFinale(id) || captainFinaleOf(id)) && id !== WINNMARK_FINALE ? ours1 + 1
    : sc.crewPosts && !allies.length ? Math.max(foes, ours1) : foes + ours1 - (allies.length + 1);
  const out = crewSides(id, crew, crewFielded(), ours1 - 1, Math.max(1, theirs), turned);
  if (!DOWN_TWO.has(id)) return out;
  // v1.406: Down Two is always two short, at any crew size: their side is fitted to yours as it takes the field
  const oursNow = out.filter(es => es.team === 'player').length + 1;
  return oursNow + 2 === out.length - oursNow + 1 ? out : crewSides(id, crew, crewFielded(), ours1 - 1, oursNow + 2, turned);
}
// v1.406 (D.57 step 4, the plan's "Down Two" and "Down Two in the Dark"): their side is always two more than yours
const DOWN_TWO = new Set(['bunratty_team_2v4', 'hollow_2v4_night']);
// v1.274's sides, with your side filled to `alliesN` and (v1.275) their side fitted to `foeN` when it is given
function crewSides(id, crew, fielded, alliesN, foeN, turned) {
  const sc = Object.assign({}, SCENARIOS[id], { enemySetup: sethSetup(id) });   // v1.362: Seth's zone match
  // v1.275: Seth turned rival leaves your side for theirs
  const setup = turned ? sc.enemySetup.filter(es => !(es.charId === 'seth' && es.team === 'player')) : sc.enemySetup;
  const sethFoe = turned || setup.some(es => es.charId === 'seth' && es.team !== 'player');
  const named = CREW_NAMED_ALLY[id];
  const allies = setup.filter(es => es.team === 'player'), foes = setup.filter(es => es.team !== 'player');
  const keep = es => es.vip || es.charId === 'seth' || (es.charId === named && !crew.includes(named));
  const kept = allies.filter(keep), slots = allies.filter(es => !keep(es));
  // v1.406 (D.57 step 4): a crew kid who is your VIP (Cover Nick, the lot's Night Shift) plays in his cap, not twice
  const keptCrew = kept.filter(es => crew.includes(es.charId)).map(es => es.charId);
  if (keptCrew.length) fielded = fielded.filter(k => !keptCrew.includes(k));
  // Seth's crew on your side crosses over to him; the rest of the match's own allies wait to fill places
  const crossing = sethFoe ? slots.filter(es => SETH_CREW_ROSTER.includes(es.charId)) : [];
  const own = slots.filter(es => !crew.includes(es.charId) && !crossing.includes(es));
  const strip = (es, fields) => { const o = Object.assign({}, es); for (const f of fields) delete o[f]; return o; };
  // v1.314 (critic, 22 Oct): with Seth turned and no other ally, slots and kept are empty, and a kid put in a spare place
  // got no anchor, so the scene dropped him (Lights Out replayed played 1 v 2): the place Seth left is the spare one then
  const left0 = turned ? sc.enemySetup.find(es => es.charId === 'seth' && es.team === 'player') : null;
  // v1.393 (D.57 step 1): a solo match your crew plays has no place of its own on your side: its `crewPosts` are the
  // places, in turn; in a CLUTCH match they are the sideline, where each kid stands out from the start
  let postN = 0;
  const clutch = MATCH_TYPES[id] === 'clutch';
  const spare = () => sc.crewPosts && !slots.length && !kept.length && !left0
    ? Object.assign({ anchor: sc.crewPosts[postN++ % sc.crewPosts.length] }, clutch ? { role: 'defender', clutchOut: true } : {})
    : (slots[0] || kept[0] || !left0) ? strip(slots[0] || kept[0], ['vip', 'role', 'spawnAt', 'perch', 'ctf', 'lives'])   // a place past the match's own (v1.275: not its flag run or lives)
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
  let left = alliesN - kept.length - crew.filter(k => !keptCrew.includes(k)).length;   // a benched kid's place stays empty (v1.406: a VIP of your crew counted once)
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
      // v1.393: in a solo match your crew now plays, a kid the street adds to a hold's attackers attacks with them (made a
      // skirmisher, he waited at the huddle all of Hold the Portables, 120 s)
      const keepRole = sc.crewPosts && spot.role === 'attacker';
      const kid = Object.assign(strip(spot, (keepRole ? [] : ['role']).concat(['perch', 'vip', 'behavior', 'statsOverride', 'ctf', 'lives'])), { charId: k.charId, weapon: k.weapon });
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
  return !sc || setup === sc.enemySetup ? sc : Object.assign({}, sc, { enemySetup: setup });   // (v1.362: a copy in Seth's zone matches too)
}
