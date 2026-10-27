
// ---------------------------------------------------------------------
// SIMPLE AUDIO (procedural SFX via Web Audio)
// ---------------------------------------------------------------------
function initAudio() {
  if (Game.audio) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    Game.audio = { ctx };
  } catch (e) {
    Game.audio = { ctx: null };
  }
  // v1.21: warm up speechSynthesis voices. Some browsers populate the list
  // asynchronously; subscribe to onvoiceschanged so we pick them up when ready.
  if (typeof speechSynthesis !== 'undefined') {
    try {
      VOICE.voicesCache = speechSynthesis.getVoices() || [];
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          VOICE.voicesCache = speechSynthesis.getVoices() || [];
        };
      }
    } catch (e) { /* TTS unavailable — ignore */ }
  }
  // If we're already in the bedroom, kick off the music now that audio is unlocked.
  if (Game.mode === 'bedroom') {
    startMusic('bedroom');
  }
}

// === v1.192 (D.17 "A better game" 5, Michael: C — settings first): SETTINGS ===
// Mouse and aim sensitivity, music and effects volume, field of view and invert look. They belong to the browser,
// not to a save: their own localStorage key, so NEW GAME and CONTINUE both keep them.
const SETTINGS_KEY = 'neighborhoodAirsoft.settings.v1';
const SETTINGS_DEFAULTS = { mouseSens: 1, aimSens: 1, music: 1, effects: 1, fov: 75, invertY: false };
const SETTINGS_RANGES = {
  mouseSens: [0.25, 3, 0.05], aimSens: [0.25, 2, 0.05], music: [0, 1, 0.05], effects: [0, 1, 0.05], fov: [60, 100, 1],
};
const Settings = Object.assign({}, SETTINGS_DEFAULTS);
function sanitizeSettings(raw) {
  const out = Object.assign({}, SETTINGS_DEFAULTS);
  if (raw && typeof raw === 'object') {
    for (const k in SETTINGS_RANGES) {
      const v = Number(raw[k]), r = SETTINGS_RANGES[k];
      if (Number.isFinite(v)) out[k] = Math.max(r[0], Math.min(r[1], v));
    }
    if (typeof raw.invertY === 'boolean') out.invertY = raw.invertY;
  }
  return out;
}
function loadSettings() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { raw = null; }
  Object.assign(Settings, sanitizeSettings(raw));
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); } catch (e) { /* storage blocked: kept for this visit */ }
}
// Every sound effect goes through one gain (the effects volume); the music has its own master (Music.masterGain).
function sfxOut() {
  const a = Game.audio;
  if (!a.sfx) {
    a.sfx = a.ctx.createGain();
    a.sfx.gain.value = Settings.effects;
    a.sfx.connect(a.ctx.destination);
  }
  return a.sfx;
}
function applySettings() {
  const a = Game.audio;
  if (a && a.ctx && a.sfx) a.sfx.gain.setValueAtTime(Settings.effects, a.ctx.currentTime);
  if (a && a.ctx && Music.playing && Music.masterGain) {
    const g = Music.masterGain.gain;
    g.cancelScheduledValues(a.ctx.currentTime);
    g.setValueAtTime(Music.volume * Settings.music, a.ctx.currentTime);
  }
}
loadSettings();

// =====================================================================
// PROCEDURAL MUSIC — bedroom theme (Toontown-Central-flavored, suburban-cheery)
// =====================================================================
// Architecture: a lookahead scheduler ticks ~every 80ms and queues notes
// in the next ~250ms via the Web Audio scheduler (osc.start(time)).
// All voices are synthesized from oscillators + filters + envelopes.
const Music = {
  enabled: true,
  playing: false,
  bpm: 116,
  startTime: 0,        // ctx time when "beat 0" begins
  currentBeat: 0,      // last scheduled beat (integer)
  schedulerHandle: null,
  masterGain: null,
  volume: 0.18,
  // Theme: 'bedroom' | null
  theme: null,
  // C major / A minor pentatonic-leaning. Key root C4 = MIDI 60.
  // Frequencies for the notes we use (Hz):
  notes: {
    // octave 2 (bass)
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    // octave 3 (bass / low harmony)
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    // octave 4 (chords / mid)
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    // octave 5 (lead)
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    // octave 6 (high accents)
    C6: 1046.50, D6: 1174.66, E6: 1318.51,
  },
};

function startMusic(themeName) {
  if (!Game.audio?.ctx) return;
  if (!Music.enabled) return;
  if (Music.playing && Music.theme === themeName) return;
  // Stop any current theme first
  if (Music.playing) stopMusic();
  Music.theme = themeName;
  Music.playing = true;
  const ctx = Game.audio.ctx;
  // Master gain (so we can mute / fade)
  Music.masterGain = ctx.createGain();
  Music.masterGain.gain.value = 0;
  Music.masterGain.connect(ctx.destination);
  // Quick fade-in
  Music.masterGain.gain.setValueAtTime(0, ctx.currentTime);
  Music.masterGain.gain.linearRampToValueAtTime(Music.volume * Settings.music, ctx.currentTime + 0.6);   // v1.192: the music volume
  // Initialize beat clock
  Music.startTime = ctx.currentTime + 0.08;
  Music.currentBeat = -1;
  // Run the scheduler periodically
  Music.schedulerHandle = setInterval(musicScheduler, 80);
}

function stopMusic() {
  if (!Music.playing) return;
  if (Music.schedulerHandle) { clearInterval(Music.schedulerHandle); Music.schedulerHandle = null; }
  // Fade out the master gain
  if (Music.masterGain && Game.audio?.ctx) {
    const ctx = Game.audio.ctx;
    const g = Music.masterGain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    // Disconnect later
    // v1.96 fix-up: only the gain faded out here. A startMusic inside the 400 ms (a theme
    // switch, or bedroom -> scenario -> bedroom in quick succession) makes a new
    // master gain, and this timer used to disconnect and null THAT one: the new
    // theme went silent and its notes threw on connect(null).
    const faded = Music.masterGain;
    setTimeout(() => {
      try { faded.disconnect(); } catch(e) {}
      if (Music.masterGain === faded) Music.masterGain = null;
    }, 400);
  }
  Music.playing = false;
  Music.theme = null;
}

// Scheduler tick — looks ahead ~250ms and queues any notes whose start time
// falls within that window. Tracks the last-scheduled beat to avoid duplicates.
function musicScheduler() {
  if (!Game.audio?.ctx || !Music.playing) return;
  const ctx = Game.audio.ctx;
  const beatDur = 60 / Music.bpm;
  const lookahead = 0.30;
  const horizonTime = ctx.currentTime + lookahead;
  // Schedule integer beats up to the horizon.
  while (true) {
    const nextBeat = Music.currentBeat + 1;
    const nextBeatTime = Music.startTime + nextBeat * beatDur;
    if (nextBeatTime > horizonTime) break;
    scheduleBeat(nextBeat, nextBeatTime);
    Music.currentBeat = nextBeat;
  }
}

// === BEDROOM THEME COMPOSITION ===
// 4-bar chord progression in C major, looped: C - Am - F - G (I-vi-IV-V "doo-wop" feel)
// Bar = 4 beats. Loop = 16 beats per progression cycle.
// Lead melody has its own 16-beat phrase; loops with a couple variations.

// Chord definitions — root + 3rd + 5th (and sometimes 6th/9th for color)
const CHORDS = [
  { root: 'C',  notes: ['C3', 'E3', 'G3'], bassNotes: ['C2', 'G2', 'C3', 'E3'] },   // I  (C major)
  { root: 'Am', notes: ['A2', 'C3', 'E3'], bassNotes: ['A2', 'E3', 'A2', 'C3'] },   // vi (A minor)
  { root: 'F',  notes: ['F2', 'A2', 'C3'], bassNotes: ['F2', 'C3', 'F2', 'A2'] },   // IV (F major)
  { root: 'G',  notes: ['G2', 'B2', 'D3'], bassNotes: ['G2', 'D3', 'G2', 'B2'] },   // V  (G major)
];

// Lead phrases — each phrase is 16 beats (one progression cycle).
// Notes: { beat: offset-in-cycle (0..16), note: 'C5', dur: beats, accent: 0..1 }
const LEAD_PHRASES = [
  // Phrase A — bouncy, ascending arpeggios over each chord
  [
    { beat: 0,    note: 'C5', dur: 0.5, accent: 1 },
    { beat: 0.5,  note: 'E5', dur: 0.5 },
    { beat: 1,    note: 'G5', dur: 0.5 },
    { beat: 1.5,  note: 'E5', dur: 0.5 },
    { beat: 2,    note: 'G5', dur: 1,   accent: 1 },
    { beat: 3,    note: 'E5', dur: 1 },
    { beat: 4,    note: 'A4', dur: 0.5, accent: 1 },
    { beat: 4.5,  note: 'C5', dur: 0.5 },
    { beat: 5,    note: 'E5', dur: 0.5 },
    { beat: 5.5,  note: 'C5', dur: 0.5 },
    { beat: 6,    note: 'E5', dur: 1.5, accent: 1 },
    { beat: 7.5,  note: 'A4', dur: 0.5 },
    { beat: 8,    note: 'F4', dur: 0.5, accent: 1 },
    { beat: 8.5,  note: 'A4', dur: 0.5 },
    { beat: 9,    note: 'C5', dur: 0.5 },
    { beat: 9.5,  note: 'A4', dur: 0.5 },
    { beat: 10,   note: 'C5', dur: 1.5, accent: 1 },
    { beat: 11.5, note: 'F4', dur: 0.5 },
    { beat: 12,   note: 'G4', dur: 0.5, accent: 1 },
    { beat: 12.5, note: 'B4', dur: 0.5 },
    { beat: 13,   note: 'D5', dur: 0.5 },
    { beat: 13.5, note: 'B4', dur: 0.5 },
    { beat: 14,   note: 'G4', dur: 1 },
    { beat: 15,   note: 'D5', dur: 0.75, accent: 1 },
    { beat: 15.75, note: 'B4', dur: 0.25 },
  ],
  // Phrase B — playful, lots of skips and a high accent at the end
  [
    { beat: 0,    note: 'G4', dur: 0.5, accent: 1 },
    { beat: 0.5,  note: 'C5', dur: 0.5 },
    { beat: 1,    note: 'E5', dur: 0.5 },
    { beat: 1.5,  note: 'D5', dur: 0.5 },
    { beat: 2,    note: 'C5', dur: 0.5, accent: 1 },
    { beat: 2.5,  note: 'D5', dur: 0.5 },
    { beat: 3,    note: 'E5', dur: 1 },
    { beat: 4,    note: 'E5', dur: 0.5, accent: 1 },
    { beat: 4.5,  note: 'C5', dur: 0.5 },
    { beat: 5,    note: 'A4', dur: 0.5 },
    { beat: 5.5,  note: 'C5', dur: 0.5 },
    { beat: 6,    note: 'A4', dur: 1.5, accent: 1 },
    { beat: 7.5,  note: 'G4', dur: 0.5 },
    { beat: 8,    note: 'A4', dur: 0.5, accent: 1 },
    { beat: 8.5,  note: 'C5', dur: 0.5 },
    { beat: 9,    note: 'F5', dur: 0.5 },
    { beat: 9.5,  note: 'C5', dur: 0.5 },
    { beat: 10,   note: 'A4', dur: 1, accent: 1 },
    { beat: 11,   note: 'F5', dur: 0.5 },
    { beat: 11.5, note: 'E5', dur: 0.5 },
    { beat: 12,   note: 'D5', dur: 0.5, accent: 1 },
    { beat: 12.5, note: 'G5', dur: 0.5 },
    { beat: 13,   note: 'E5', dur: 0.5 },
    { beat: 13.5, note: 'D5', dur: 0.5 },
    { beat: 14,   note: 'C5', dur: 1.5, accent: 1 },
    { beat: 15.5, note: 'D5', dur: 0.5 },
  ],
];

function scheduleBeat(beat, time) {
  if (Music.theme !== 'bedroom') return;
  // Determine where we are in the 16-beat cycle (and which chord)
  const cycleBeat = ((beat % 16) + 16) % 16;
  const chordIdx = Math.floor(cycleBeat / 4) % 4;
  const chord = CHORDS[chordIdx];
  const beatInBar = cycleBeat % 4;

  // Which lead phrase to play this cycle (alternates every cycle)
  const cycleIdx = Math.floor(beat / 16);
  const phrase = LEAD_PHRASES[cycleIdx % LEAD_PHRASES.length];

  // === BASS (walking, on every beat) ===
  // Bass note for this beat in the cycle (each chord has 4 bass notes for its 4 beats)
  const bassNoteName = chord.bassNotes[beatInBar];
  playBassNote(time, bassNoteName, 60 / Music.bpm * 0.9);

  // === HI-HAT (every beat — adds the "tick" pulse) ===
  playHiHat(time, beatInBar % 2 === 0 ? 0.7 : 1.0);

  // === SNARE/KICK pattern (kick on 1+3, snare on 2+4) ===
  if (beatInBar === 0 || beatInBar === 2) {
    playKick(time);
  }
  if (beatInBar === 1 || beatInBar === 3) {
    playSnare(time);
  }

  // === CHORD STAB on beats 2 and 4 (the "wah" / oompah accent) ===
  if (beatInBar === 1 || beatInBar === 3) {
    playChordStab(time, chord.notes, 60 / Music.bpm * 0.4);
  }

  // === LEAD MELODY ===
  // Find any phrase notes that fall on or between this beat and the next
  const beatDur = 60 / Music.bpm;
  for (const n of phrase) {
    // Check if note starts in [cycleBeat, cycleBeat + 1)
    if (n.beat >= cycleBeat && n.beat < cycleBeat + 1) {
      const offset = (n.beat - cycleBeat) * beatDur;
      playLeadNote(time + offset, n.note, n.dur * beatDur, n.accent || 0);
    }
  }
}

// === VOICE: BASS (walking, brass-like) ===
function playBassNote(time, noteName, duration) {
  const ctx = Game.audio.ctx;
  const freq = Music.notes[noteName];
  if (!freq) return;
  // Two oscillators for fatness
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 0.5, time);     // octave down for weight
  // Low-pass to mellow the saw
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(900, time);
  filt.Q.value = 0.6;
  // Envelope
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.18, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.06, time + duration * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc1.connect(filt);
  osc2.connect(filt);
  filt.connect(g);
  g.connect(Music.masterGain);
  osc1.start(time); osc1.stop(time + duration + 0.05);
  osc2.start(time); osc2.stop(time + duration + 0.05);
}

// === VOICE: LEAD (brassy, vaguely kazoo-ish) ===
function playLeadNote(time, noteName, duration, accent) {
  const ctx = Game.audio.ctx;
  const freq = Music.notes[noteName];
  if (!freq) return;
  // Square wave is the punchy "brass-toon" sound
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  // Optional pitch wobble on accent notes (vibrato-lite)
  if (accent > 0) {
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.linearRampToValueAtTime(freq * 1.005, time + 0.05);
    osc.frequency.linearRampToValueAtTime(freq, time + duration * 0.7);
  }
  // Slight resonant filter for character
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(2400, time);
  filt.Q.value = 1.2;
  // Envelope
  const peak = accent > 0 ? 0.11 : 0.07;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.015);
  g.gain.exponentialRampToValueAtTime(peak * 0.4, time + duration * 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(filt).connect(g).connect(Music.masterGain);
  osc.start(time); osc.stop(time + duration + 0.05);
}

// === VOICE: CHORD STAB (oompah, on beats 2 & 4) ===
function playChordStab(time, chordNoteNames, duration) {
  const ctx = Game.audio.ctx;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.045, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, time + duration);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 1800;
  filt.Q.value = 0.5;
  for (const name of chordNoteNames) {
    const freq = Music.notes[name];
    if (!freq) continue;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 2, time);   // up an octave for brightness
    osc.connect(filt);
    osc.start(time); osc.stop(time + duration + 0.05);
  }
  filt.connect(g).connect(Music.masterGain);
}

// === VOICE: HI-HAT (filtered noise, short) ===
function playHiHat(time, vol) {
  const ctx = Game.audio.ctx;
  vol = vol || 1;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i/d.length, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.value = 0.05 * vol;
  src.connect(filt).connect(g).connect(Music.masterGain);
  src.start(time);
}

// === VOICE: KICK (low thump on 1 & 3) ===
function playKick(time) {
  const ctx = Game.audio.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.10);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0, time);
  g.gain.linearRampToValueAtTime(0.22, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.20);
  osc.connect(g).connect(Music.masterGain);
  osc.start(time); osc.stop(time + 0.22);
}

// === VOICE: SNARE (noise burst on 2 & 4) ===
function playSnare(time) {
  const ctx = Game.audio.ctx;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.10, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i/d.length, 1.8);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 1800;
  filt.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.10;
  src.connect(filt).connect(g).connect(Music.masterGain);
  src.start(time);
  // Plus a tonal "tick" component for body
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, time);
  osc.frequency.exponentialRampToValueAtTime(130, time + 0.05);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.06, time);
  og.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.connect(og).connect(Music.masterGain);
  osc.start(time); osc.stop(time + 0.08);
}

// === PLAYER FOOTSTEP (v1.63) ===
// A soft, short scuff: filtered noise burst (the "shh" of a foot on ground)
// plus a low tonal thump for body. Centered (it's the player's own feet) and
// jittered per step (pitch + level + filter) so a run doesn't sound like a
// metronome. `heavy` (sprint) makes it a touch louder and lower. Routed direct
// to ctx.destination so the music master mute (M) doesn't silence footsteps.
// NOTE: distinct from playFootstep(srcX,srcZ) below, which is the POSITIONAL
// footstep used for other characters; this one is the local player's own steps.
function playPlayerFootstep(heavy) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const jitter = 0.85 + gameRandom() * 0.3;     // 0.85..1.15 per-step variation
  const baseVol = (heavy ? 0.075 : 0.045) * jitter;
  // Noise scuff — short, low-passed so it's a muffled "thud/scuff" not a hiss.
  const dur = heavy ? 0.13 : 0.10;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    // fast attack, quick decay envelope baked into the buffer
    d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = (heavy ? 520 : 700) * jitter;
  filt.Q.value = 0.7;
  const ng = ctx.createGain();
  ng.gain.value = baseVol;
  src.connect(filt).connect(ng).connect(sfxOut());
  src.start(t);
  // Low tonal thump — gives the step weight (heel contact).
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const f0 = (heavy ? 95 : 120) * jitter;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.07);
  const og = ctx.createGain();
  og.gain.setValueAtTime(baseVol * 1.1, t);
  og.gain.exponentialRampToValueAtTime(0.0008, t + 0.10);
  osc.connect(og).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.12);
}

function playShot(srcX, srcZ) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  // v1.21: positional audio. If src coords given, compute pan (stereo) + volume
  // attenuation by distance from player. Otherwise it's a player-fired shot —
  // full volume, centered.
  const { pan, vol } = (srcX !== undefined && srcZ !== undefined)
    ? positionalAudio(srcX, srcZ, 30) // shot is loud — heard out to ~30m
    : { pan: null, vol: 1 };
  // Sharp transient (the spring "thwip")
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.05);
  gain.gain.setValueAtTime(0.18 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  if (pan !== null) {
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; osc.connect(gain).connect(p).connect(sfxOut()); }
    else   { osc.connect(gain).connect(sfxOut()); }
  } else { osc.connect(gain).connect(sfxOut()); }
  osc.start(t); osc.stop(t + 0.1);
  // Noise burst
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.12 * vol;
  src.buffer = buf;
  if (pan !== null && ctx.createStereoPanner) {
    const p2 = ctx.createStereoPanner(); p2.pan.value = pan;
    src.connect(ng).connect(p2).connect(sfxOut());
  } else {
    src.connect(ng).connect(sfxOut());
  }
  src.start(t);
}

// v1.21: positional-audio helper. Given a source world position (x, z) and a
// "max audible range" R, returns { pan: -1..+1 stereo pan, vol: 0..1 }. The pan
// reflects whether the source is left or right of the player based on player yaw;
// the volume attenuates with distance (inverse-square clamped at R).
// Returns pan=null if source is at the listener (no stereo cue → safe default).
function positionalAudio(srcX, srcZ, maxRange) {
  const dx = srcX - Game.player.pos.x;
  const dz = srcZ - Game.player.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  // Volume: 1.0 right at player, dropping toward 0 at maxRange. Use a gentle
  // 1/(1+d/8) curve so things stay audible at moderate distances and only fall
  // away sharply past the threshold.
  let vol = 1 / (1 + dist / 8);
  if (dist > maxRange) vol *= Math.max(0, 1 - (dist - maxRange) / (maxRange * 0.5));
  // Pan: project the source vector into player-local space using player yaw.
  // Player yaw is the camera yaw; right-hand vector in world is (cos(yaw), sin(yaw))
  // for our convention (yaw=0 looks down -Z). Right-component = dx*cos - dz*sin? Actually:
  // Camera looks toward -Z when yaw=0. Right is +X. Yaw rotates around Y.
  // Local right component of (dx,dz): rightX = cos(yaw), rightZ = -sin(yaw); but we want
  // sign of the source's horizontal offset relative to facing. Easiest: rotate (dx,dz)
  // by -yaw and look at the X component.
  const cosY = Math.cos(-Game.player.yaw), sinY = Math.sin(-Game.player.yaw);
  const localX = dx * cosY - dz * sinY; // positive = source is to player's RIGHT
  // Normalize pan: full -1/+1 at the sides, soft falloff with distance so faraway
  // sources don't hard-pan.
  let pan = dist > 0.01 ? Math.max(-1, Math.min(1, localX / Math.max(1.0, dist))) : 0;
  // Subtle: pan saturation eases with proximity (close sounds feel more "around" you).
  pan *= Math.min(1, dist / 3);
  return { pan, vol: Math.max(0, Math.min(1, vol)) };
}

// v1.21: footstep tick. Soft thump + a brief noise scrape. Positional.
function playFootstep(srcX, srcZ) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const { pan, vol } = positionalAudio(srcX, srcZ, 18); // footsteps heard out to ~18m
  if (vol < 0.02) return; // not audible from here — don't waste audio nodes
  // Low thump (the heel)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.06);
  gain.gain.setValueAtTime(0.08 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    osc.connect(gain).connect(p).connect(sfxOut());
  } else { osc.connect(gain).connect(sfxOut()); }
  osc.start(t); osc.stop(t + 0.1);
  // Scrape (the sole)
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * (1 - i / d.length) * 0.4;
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.04 * vol;
  src.buffer = buf;
  if (ctx.createStereoPanner) {
    const p2 = ctx.createStereoPanner(); p2.pan.value = pan;
    src.connect(ng).connect(p2).connect(sfxOut());
  } else {
    src.connect(ng).connect(sfxOut());
  }
  src.start(t);
}

// === BB WHISTLE (v1.67; hardened v1.68) ===
// A faint airy "hiss/whistle" for a BB passing near the listener (the player).
// v1.68 freeze fix: the original allocated a fresh ~22k-sample noise buffer AND
// a new oscillator + bufferSource for EVERY BB that came within earshot. Every
// player shot spawns a BB right at the muzzle (<7m), so each shot ran a 22k-iter
// fill and spun up looping nodes; rapid fire (auto guns, NPC bursts, the new
// suppressing fire) piled up nodes fast and could exhaust/stall Web Audio mid-
// frame — and since updateBBs runs inside the tick sub-step loop, a throw there
// killed the rAF loop = freeze. Hardened: ONE shared noise buffer reused by all
// whistles, a hard cap on concurrent whistles, and try/catch around all node
// work so audio can never crash the game loop.
const BB_WHISTLE_RANGE = 2;     // v1.72: metres — BBs passing within ~2m of the player whistle
const BB_WHISTLE_VOL = 0.075;   // v1.72: peak gain (1m/0.05 was barely noticeable; bumped back up)
const BB_WHISTLE_MAX = 6;       // hard cap on simultaneous whistle voices
let _bbWhistleCount = 0;
let _bbNoiseBuf = null;
function _bbNoiseBuffer(ctx) {
  // Built once, reused by every whistle (it's just white noise; sharing is fine).
  if (_bbNoiseBuf && _bbNoiseBuf.sampleRate === ctx.sampleRate) return _bbNoiseBuf;
  const len = Math.ceil(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (gameRandom() * 2 - 1);
  _bbNoiseBuf = buf;
  return buf;
}
function bbWhistleStart(bb) {
  if (!Game.audio?.ctx || bb._whistle) return;
  if (_bbWhistleCount >= BB_WHISTLE_MAX) return;   // cap reached — stay silent, never allocate
  const ctx = Game.audio.ctx;
  try {
    const src = ctx.createBufferSource();
    src.buffer = _bbNoiseBuffer(ctx); src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 1.4;
    const tone = ctx.createOscillator();
    tone.type = 'sine'; tone.frequency.value = 3400;
    const toneGain = ctx.createGain(); toneGain.gain.value = 0.18;
    const gain = ctx.createGain(); gain.gain.value = 0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(bp).connect(gain);
    tone.connect(toneGain).connect(gain);
    if (pan) gain.connect(pan).connect(sfxOut());
    else     gain.connect(sfxOut());
    const t = ctx.currentTime;
    src.start(t); tone.start(t);
    bb._whistle = { src, tone, gain, pan, bp };
    _bbWhistleCount++;
  } catch (e) { bb._whistle = null; /* audio under pressure — skip silently */ }
}
function bbWhistleUpdate(bb, pan, vol) {
  const w = bb._whistle; if (!w || !Game.audio?.ctx) return;
  try {
    const ctx = Game.audio.ctx, t = ctx.currentTime;
    w.gain.gain.setTargetAtTime(Math.max(0, Math.min(BB_WHISTLE_VOL, vol)), t, 0.04);
    if (w.pan) w.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.04);
    const closeFrac = Math.max(0, Math.min(1, vol / BB_WHISTLE_VOL));
    w.tone.frequency.setTargetAtTime(3400 + closeFrac * 700, t, 0.05);
    w.bp.frequency.setTargetAtTime(4200 + closeFrac * 800, t, 0.05);
  } catch (e) { /* ignore */ }
}
function bbWhistleStop(bb) {
  const w = bb._whistle; if (!w) return;
  bb._whistle = null;
  _bbWhistleCount = Math.max(0, _bbWhistleCount - 1);
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx, t = ctx.currentTime;
  // v1.72: stop the SOUND SOURCES first, in their own guarded calls, BEFORE the
  // gain fade. The old order ramped the gain first and stopped sources in the
  // same try-block — so if a gain call threw (which can happen if the scenario
  // ends mid-buzz and the audio param scheduling collides), the catch swallowed
  // it and src.stop()/tone.stop() never ran, leaving a looping oscillator droning
  // forever (the "whistle locks on when the final life is taken" bug). Each stop
  // is now independent; nothing can prevent the sources from being stopped.
  try { w.src.stop(t); } catch (e) { /* already stopped */ }
  try { w.tone.stop(t); } catch (e) { /* already stopped */ }
  try {
    w.gain.gain.cancelScheduledValues(t);
    w.gain.gain.setValueAtTime(0, t);   // hard silence now (sources are already stopping)
  } catch (e) { /* ignore */ }
  // Belt-and-suspenders: re-issue stop + disconnect shortly after, each guarded.
  setTimeout(() => {
    try { w.src.stop(); } catch (e) {}
    try { w.tone.stop(); } catch (e) {}
    try { w.gain.disconnect(); w.src.disconnect(); w.tone.disconnect(); if (w.pan) w.pan.disconnect(); if (w.bp) w.bp.disconnect(); } catch (e) {}
  }, 60);
}

function playReloadClick() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, t);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.05);
}

// Slide pulled fully back — a sharp metallic CLICK as it locks at apex
function playCockBack() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  // Sharp high-frequency click
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2200, t);
  osc.frequency.exponentialRampToValueAtTime(1000, t + 0.03);
  gain.gain.setValueAtTime(0.16, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.05);
  // Brief noise tail (metal-on-metal)
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.08;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 1500;
  src.buffer = buf;
  src.connect(filt).connect(ng).connect(sfxOut());
  src.start(t);
}

// Slide snapping forward — deeper, satisfying mechanical CLACK
function playCockForward() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  // Lower-frequency thunk
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(gain).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.1);
  // Noise burst for the metal slam
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.045, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.14;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 800;
  filt.Q.value = 0.7;
  src.buffer = buf;
  src.connect(filt).connect(ng).connect(sfxOut());
  src.start(t);
}

// Jam — ugly grinding noise
function playJam() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const env = Math.pow(1 - i / d.length, 1.3);
    d[i] = (gameRandom() * 2 - 1) * env * 0.8;
  }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = 0.22;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 350;
  filt.Q.value = 1.5;
  src.buffer = buf;
  src.connect(filt).connect(g).connect(sfxOut());
  src.start(t);
  // Plus a downward whine
  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.25);
  og.gain.setValueAtTime(0.08, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.27);
  osc.connect(og).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.28);
}

function playUnjam() {
  // Use the cock-forward sound but a hair deeper
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.14);
}

// Quick click when switching slots
function playSlotSwap() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(700, t);
  gain.gain.setValueAtTime(0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.05);
}
function playHitOnEnemy() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.2);
}
function playHitOnPlayer() {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = 0.25;
  src.buffer = buf;
  src.connect(g).connect(sfxOut());
  src.start(t);
}

// ---------------------------------------------------------------------
// SURFACE IMPACT SFX
// ---------------------------------------------------------------------
// Distance-based volume attenuation. Closer hits are louder.
function impactVolume(impactPos) {
  if (!impactPos) return 1.0;
  const dx = impactPos.x - Game.player.pos.x;
  const dz = impactPos.z - Game.player.pos.z;
  const dy = impactPos.y - (Game.player.pos.y + Game.player.eyeOffset);
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  // Falls off with distance; full volume within 3m, ~30% at 20m
  return Math.max(0.1, Math.min(1.0, 3 / Math.max(3, dist)));
}

// Metal ping — high frequency tink with quick decay and slight pitch glide
function playImpactMetal(impactPos) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const vol = impactVolume(impactPos);
  // Two stacked oscillators for a richer "ping"
  const baseFreq = 2400 + (gameRandom() - 0.5) * 400;
  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(baseFreq, t);
  osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.12);
  g1.gain.setValueAtTime(0.18 * vol, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc1.connect(g1).connect(sfxOut());
  osc1.start(t); osc1.stop(t + 0.2);
  // Harmonic overlay for shimmer
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
  g2.gain.setValueAtTime(0.07 * vol, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc2.connect(g2).connect(sfxOut());
  osc2.start(t); osc2.stop(t + 0.12);
  // Tiny noise click at attack
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.008, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.08 * vol;
  src.buffer = buf;
  src.connect(ng).connect(sfxOut());
  src.start(t);
}

// Cardboard thump — soft low-mid noise burst, very short, dull
function playImpactCardboard(impactPos) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const vol = impactVolume(impactPos);
  // Filtered noise burst — pre-baked into a small buffer
  const dur = 0.06;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Lowpass-ish noise via simple smoothing
  let prev = 0;
  for (let i = 0; i < d.length; i++) {
    const n = (gameRandom() * 2 - 1);
    prev = prev * 0.7 + n * 0.3;
    d[i] = prev * Math.pow(1 - i / d.length, 1.6);
  }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = 0.22 * vol;
  src.buffer = buf;
  // Apply a biquad lowpass for that muffled cardboard feel
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600 + (gameRandom() - 0.5) * 200;
  filter.Q.value = 0.5;
  src.connect(filter).connect(g).connect(sfxOut());
  src.start(t);
  // Subtle low body thump
  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140 + (gameRandom() - 0.5) * 30, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.05);
  og.gain.setValueAtTime(0.12 * vol, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(og).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.08);
}

// Wood thud — sharper attack than cardboard, mid frequency, "thock"
function playImpactWood(impactPos) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const vol = impactVolume(impactPos);
  // Body resonance
  const freq = 320 + (gameRandom() - 0.5) * 80;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.06);
  g.gain.setValueAtTime(0.2 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.12);
  // Sharper attack click — short filtered noise burst
  const dur = 0.025;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i / d.length, 0.8);
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.18 * vol;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 1.2;
  src.buffer = buf;
  src.connect(filter).connect(ng).connect(sfxOut());
  src.start(t);
}

// Shatter — quick high-frequency snap + tiny tinkle, for BBs breaking on hard surfaces
function playImpactShatter(impactPos) {
  if (!Game.audio?.ctx) return;
  const ctx = Game.audio.ctx;
  const t = ctx.currentTime;
  const vol = impactVolume(impactPos);
  // Sharp transient
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(3200, t);
  osc.frequency.exponentialRampToValueAtTime(1400, t + 0.04);
  g.gain.setValueAtTime(0.12 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(g).connect(sfxOut());
  osc.start(t); osc.stop(t + 0.06);
  // Brief noise tail (the scattering shards)
  const dur = 0.08;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = (gameRandom() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  }
  const src = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.value = 0.14 * vol;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  src.buffer = buf;
  src.connect(filter).connect(ng).connect(sfxOut());
  src.start(t);
}
