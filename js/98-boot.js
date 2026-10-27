
// v1.39: shared teardown of the just-finished scenario scene. Used by the
// result-screen "back to room", "play again", and "previous/next" buttons.
function cleanupScenarioScene() {
  if (Game.scenario.active) {
    delete Scenes.scenarios[Game.scenario.active];
    Game.scenario.active = null;
    Game.scenario.bbs = [];
    Game.scenario.stuckBBs = [];
    Game.scenario.fragments = [];
    Game.scenario.enemies = [];
  }
}

document.getElementById('returnBtn').addEventListener('click', () => {
  document.getElementById('resultScreen').classList.remove('active');
  if (Net.active) netClose();   // v1.230 (D.2)
  cleanupScenarioScene();
  enterBedroom();
});

// v1.39: result-screen navigation — replay / previous / next without first
// detouring through the bedroom. Each tears down the finished scene, then
// (re)enters the chosen scenario through the normal loading screen.
function resultNavTo(scenarioId) {
  if (!scenarioId) return;
  // v1.48: never enter a locked scenario, even via a stale path.
  if (!isScenarioUnlocked(scenarioId)) return;
  document.getElementById('resultScreen').classList.remove('active');
  cleanupScenarioScene();
  enterScenario(scenarioId);
}
document.getElementById('navAgainBtn').addEventListener('click', () => {
  if (Net.active) { netRematch(); return; }   // v1.364 (D.67): online, REMATCH takes the room back to the board
  resultNavTo(Game._lastScenarioId);
});
document.getElementById('navPrevBtn').addEventListener('click', () => {
  // Prev is always a backward (already-cleared) step; use the resolved id.
  const id = document.getElementById('navPrevBtn').dataset.go;
  if (id) resultNavTo(id);
});
document.getElementById('navNextBtn').addEventListener('click', () => {
  // v1.48: only the gated next id (set when the result screen rendered).
  const id = document.getElementById('navNextBtn').dataset.go;
  if (id) resultNavTo(id);
});

document.getElementById('briefCancelBtn').addEventListener('click', () => {
  document.getElementById('scenarioBriefModal').classList.remove('active');
  Game.mode = 'map';
});

document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('shopCloseBtn').addEventListener('click', closeShop);
document.getElementById('loadoutCloseBtn').addEventListener('click', closeLoadout);
document.getElementById('wbCloseBtn').addEventListener('click', closeWorkbench);

// v1.245: the damage report's renderer and shaders, ready before the first loss. Made just after the page has loaded,
// while the title sits idle, not during the load (it is most of a second on a software GPU).
window.addEventListener('load', () => setTimeout(() => {
  try { warmDamageReport(); } catch (e) { console.warn('damage report warm-up', e); }
}, 500));
// Start render loop immediately (title screen renders nothing but stays warm)
Game.clock.start();
tick();

