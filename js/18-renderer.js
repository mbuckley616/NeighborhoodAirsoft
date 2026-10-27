
// ---------------------------------------------------------------------
// RENDERER + CAMERA (shared across scenes)
// ---------------------------------------------------------------------
Game.renderer = new THREE.WebGLRenderer({ antialias: true });
Game.renderer.setSize(window.innerWidth, window.innerHeight);
Game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
Game.renderer.shadowMap.enabled = true;
Game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(Game.renderer.domElement);

Game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 200);
Game.clock = new THREE.Clock();

window.addEventListener('resize', () => {
  Game.camera.aspect = window.innerWidth / window.innerHeight;
  Game.camera.updateProjectionMatrix();
  Game.renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------
// SCENES — built lazily on demand
// ---------------------------------------------------------------------
const Scenes = {
  bedroom: null,
  scenarios: {}, // keyed by scenario id
};
