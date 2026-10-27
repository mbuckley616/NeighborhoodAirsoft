
// =====================================================================
// SAVE SYSTEM (v1.37) — persist progress to localStorage
// =====================================================================
// The entire player profile lives in Game.persist (cash, BBs, owned guns/mags,
// speed loaders, consumables, equipped gear, owned equipment, accessory
// instances, BB colors, loadout slots, completed scenarios). It was designed
// to be plain serializable data, so a save is just JSON.stringify(persist)
// plus the accessory-instance id counter (so new buys after a load don't
// collide with loaded instance ids). Loading deep-merges the saved data onto a
// FRESH default profile, so a save written by an older build that's missing
// newer fields still boots with sane defaults for those fields.
const SAVE_KEY = 'neighborhood_airsoft_save_v1';
const SAVE_VERSION = 1;

// A pristine copy of the starting profile, captured ONCE at load time before
// the player touches anything. Used as the merge base on load and by New Game.
const DEFAULT_PERSIST = JSON.parse(JSON.stringify(Game.persist));

// Deep-merge `src` onto a deep clone of `base`. Plain objects merge key-by-key;
// arrays and primitives from src REPLACE the base value wholesale (we don't try
// to merge array contents — loadoutSlots/accessories/speedLoaders are saved and
// restored as complete arrays). Keys present in base but absent in src keep the
// default (forward-compat for older saves); keys in src but not base are still
// copied (so nothing the player owned is silently dropped).
function _deepMergePersist(base, src) {
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const out = Array.isArray(base) ? base.slice() : (isObj(base) ? { ...base } : base);
  if (!isObj(src)) return src;
  if (!isObj(out)) return src;
  for (const k in src) {
    if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
    if (isObj(src[k]) && isObj(out[k])) out[k] = _deepMergePersist(out[k], src[k]);
    else out[k] = src[k];   // arrays + primitives replace
  }
  return out;
}

function hasSaveGame() {
  try { return !!localStorage.getItem(SAVE_KEY); }
  catch (e) { return false; }   // localStorage blocked (private mode / file://)
}

// Serialize the current profile to localStorage. Returns {ok, reason?}.
function saveGame() {
  try {
    const payload = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      accSeq: _accInstanceSeq,            // restore the instance-id counter
      persist: Game.persist,              // the whole profile
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    Game._saveEnabled = true;   // player has opted into persistence this session
    return { ok: true };
  } catch (e) {
    // QuotaExceeded, disabled storage, etc. — surface a reason, never throw.
    return { ok: false, reason: (e && e.name) || 'unknown' };
  }
}

// Load the saved profile into Game.persist. Returns {ok, reason?}.
function loadGame() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); }
  catch (e) { return { ok: false, reason: 'storage-blocked' }; }
  if (!raw) return { ok: false, reason: 'no-save' };
  let payload;
  try { payload = JSON.parse(raw); }
  catch (e) { return { ok: false, reason: 'corrupt' }; }
  if (!payload || !payload.persist) return { ok: false, reason: 'corrupt' };

  // Merge saved profile onto a pristine default so missing/newer fields are sane.
  const fresh = JSON.parse(JSON.stringify(DEFAULT_PERSIST));
  Game.persist = _deepMergePersist(fresh, payload.persist);

  // Restore the accessory-instance id counter. If the save predates it (or it's
  // bogus), recompute a safe value from the highest id actually present so new
  // buys never collide with loaded instances.
  let seq = (typeof payload.accSeq === 'number' && payload.accSeq > 0) ? payload.accSeq : 1;
  if (Array.isArray(Game.persist.accessories)) {
    for (const a of Game.persist.accessories) {
      const m = a && typeof a.id === 'string' && a.id.match(/^acc_(\d+)_/);
      if (m) seq = Math.max(seq, parseInt(m[1], 10) + 1);
    }
  }
  _accInstanceSeq = seq;
  Game._saveEnabled = true;   // loading a save opts into auto-save this session
  return { ok: true };
}

// Auto-save, but ONLY once the player has opted into persistence this session (by loading a save, starting a NEW
// GAME, or sleeping in the bed). A NEW GAME over an existing save asks first (v1.218), so it never silently clobbers
// a save the player might still want.
// v1.218 (backlog D.29, Michael 13 Oct: "We need an autosave function - I don't remember to go back to the bed every
// time and I doubt most players will either"): a NEW GAME is opted in from the start (asking first when it would
// replace a save on disk), so the game saves itself when you come home, after every match, and after every buy or
// change at the shop, the loadout, the workbench and the mirror. A small "Saved" shows in the corner when it does.
function autoSave() {
  if (!Game._saveEnabled) return { ok: false, reason: 'not-enabled' };
  const r = saveGame();
  if (r.ok) {
    const n = document.getElementById('autosaveNote');
    if (n) {
      n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
      clearTimeout(autoSave._t); autoSave._t = setTimeout(() => n.classList.remove('show'), 1600);
    }
  }
  return r;
}

// Wipe the save and reset the in-memory profile to a fresh start.
function deleteSaveAndReset() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  Game.persist = JSON.parse(JSON.stringify(DEFAULT_PERSIST));
  _accInstanceSeq = 1;
  Game._saveEnabled = false;   // back to "haven't opted in" until next deliberate save
}
