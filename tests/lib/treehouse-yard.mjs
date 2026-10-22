// v1.316 (D.55 step 6, Michael: A): the twins' yard is their course and no match uses the treehouse any more, but it
// is still the game's only ladder and perch. The climbing suites play the two v1.138/v1.144 matches on the kept yard
// (buildTreehouseYardScene) as test-only scenarios: `await treehouseYard(page)`, then g.scenario(TH_KING) or TH_HOLD.
export const TH_KING = 'test_treehouse_king', TH_HOLD = 'test_treehouse_hold';
export const treehouseYard = (page) => page.evaluate(([king, hold]) => {
  SCENARIOS[king] = {
    region: 'northcliff', street: 'stoneglen_close', name: 'Stoneglen Close', scenarioName: 'King of the Treehouse',
    desc: 'The treehouse yard (test).', builderFn: 'buildTreehouseYardScene', builderArg: 'default', scenarioType: 'skirmish',
    playerSpawn: 'behind_shed',
    enemySetup: [
      { charId: 'connor', weapon: 'mp5',    anchor: 'treehouse', perch: 'treehouse', role: 'defender' },
      { charId: 'haden',  weapon: 'pistol', anchor: 'fort', role: 'skirmisher' },
    ],
    winCondition: 'kill_all', rewards: { win: 70, lose: 16 }, playerLives: 1, armorMult: 1,
  };
  SCENARIOS[hold] = {
    region: 'northcliff', street: 'stoneglen_close', name: 'Stoneglen Close', scenarioName: 'Hold the Treehouse',
    desc: 'The treehouse yard (test).', builderFn: 'buildTreehouseYardScene', builderArg: 'default', scenarioType: 'defend',
    resultHold: 'the treehouse', playerSpawn: 'treehouse', enemySpawnCluster: 'cluster_patio',
    enemySetup: [
      { charId: 'haden',  weapon: 'ump',     anchor: 'boxes_w', role: 'attacker', flank: 'L' },
      { charId: 'connor', weapon: 'shotgun', anchor: 'boxes_e', role: 'attacker', flank: 'R' },
      { charId: 'evan',   weapon: 'mp5',     anchor: 'shed',    role: 'defender', climb: false, holdUntilLadder: true },
    ],
    winCondition: 'survive_timer', timerSec: 90, rewards: { win: 80, lose: 20 }, playerLives: 1, armorMult: 1,
  };
}, [TH_KING, TH_HOLD]);
