/* ============================================
   Tower Surge — Main Game Controller
   ============================================ */
window.TS = window.TS || {};

(function () {
  'use strict';

  var Map = TS.Map, Ent = TS.Entities, Wav = TS.Waves, Ren = TS.Renderer;
  var TYPES = Ent.TOWER_TYPES;

  /* ---- state ---- */
  var S = {
    phase: 'title', // title | playing | gameover
    grid: null, pathCells: [], pathSegments: [],
    towers: [], enemies: [], projectiles: [], particles: [],
    credits: 150, coreHp: 20, maxCoreHp: 20,
    score: 0, kills: 0,
    placingType: null, selectedTower: null, hoverCell: null,
    waveManager: null,
    waveActive: false,
    best: parseInt(localStorage.getItem('ts_best') || '0')
  };

  /* ---- DOM refs ---- */
  var $canvas, $hudWave, $hudCredits, $hudHp, $hudScore, $hudBest;
  var $btnWave, $towerInfo, $screenTitle, $screenGO;
  var $infoName, $infoLevel, $infoDmg, $infoRange, $infoRate;
  var $btnUpgrade, $btnSell, $upgradeLabel, $sellLabel;
  var $waveBanner, $infoActions, $infoLevelWrap;
  var lastTime = 0;

  /* ============ INIT ============ */
  function init() {
    $canvas       = document.getElementById('game-canvas');
    $hudWave      = document.getElementById('hud-wave');
    $hudCredits   = document.getElementById('hud-credits');
    $hudHp        = document.getElementById('hud-hp');
    $hudScore     = document.getElementById('hud-score');
    $hudBest      = document.getElementById('hud-best');
    $btnWave      = document.getElementById('btn-next-wave');
    $towerInfo    = document.getElementById('tower-info');
    $screenTitle  = document.getElementById('screen-title');
    $screenGO     = document.getElementById('screen-gameover');
    $infoName     = document.getElementById('info-name');
    $infoLevel    = document.getElementById('info-level');
    $infoDmg      = document.getElementById('info-dmg');
    $infoRange    = document.getElementById('info-range');
    $infoRate     = document.getElementById('info-rate');
    $btnUpgrade   = document.getElementById('btn-upgrade');
    $btnSell      = document.getElementById('btn-sell');
    $upgradeLabel = document.getElementById('upgrade-cost');
    $sellLabel    = document.getElementById('sell-value');
    $waveBanner   = document.getElementById('wave-banner');
    $infoActions  = document.getElementById('info-actions');
    $infoLevelWrap = document.getElementById('info-level-wrap');

    Ren.init($canvas);
    resetState();
    if (loadProgress()) {
      document.getElementById('btn-start').textContent = 'Resume Campaign';
    }
    setupInput();
    updateHUD();
    requestAnimationFrame(loop);
  }

  function resetState() {
    S.grid = Map.createGrid();
    S.pathCells = Map.generatePathCells(Map.PATH_WAYPOINTS);
    S.pathSegments = Map.buildPathSegments(Map.PATH_WAYPOINTS);
    S.towers = []; S.enemies = []; S.projectiles = []; S.particles = [];
    S.credits = 150; S.coreHp = 20; S.score = 0; S.kills = 0;
    S.placingType = null; S.selectedTower = null; S.hoverCell = null;
    S.waveManager = new Wav.WaveManager();
    S.waveActive = false;
  }

  /* ============ SAVE/LOAD ============ */
  function saveProgress() {
    var saveObj = {
      credits: S.credits, coreHp: S.coreHp, score: S.score, kills: S.kills, wave: S.waveManager.currentWave,
      towers: S.towers.map(function(t) { return {col: t.col, row: t.row, type: t.type, level: t.level}; })
    };
    localStorage.setItem('ts_save', JSON.stringify(saveObj));
  }

  function loadProgress() {
    var saveStr = localStorage.getItem('ts_save');
    if (!saveStr) return false;
    try {
      var save = JSON.parse(saveStr);
      if (!save || !save.wave) return false;
      S.credits = save.credits; S.coreHp = save.coreHp; S.score = save.score; S.kills = save.kills;
      S.waveManager.currentWave = save.wave;
      S.towers = []; S.grid = Map.createGrid();
      for (var i = 0; i < save.towers.length; i++) {
        var ts = save.towers[i]; var tw = new Ent.Tower(ts.col, ts.row, ts.type);
        while(tw.level < ts.level) tw.upgrade();
        S.towers.push(tw);
        S.grid[ts.row][ts.col] = Map.TILE_TOWER;
      }
      return true;
    } catch(e) { return false; }
  }

  function clearSave() { localStorage.removeItem('ts_save'); }
  function trySave() { if (!S.waveActive && S.phase === 'playing') saveProgress(); }

  /* ============ INPUT ============ */
  function setupInput() {
    $canvas.addEventListener('click', onCanvasClick);
    $canvas.addEventListener('mousemove', onCanvasMove);
    $canvas.addEventListener('mouseleave', function () { S.hoverCell = null; });
    $canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); deselect(); });

    document.querySelectorAll('.tower-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { selectType(btn.dataset.type); });
    });

    $btnWave.addEventListener('click', sendWave);
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-retry').addEventListener('click', retryGame);
    $btnUpgrade.addEventListener('click', upgradeTower);
    $btnSell.addEventListener('click', sellTower);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') deselect();
      if (e.key === '1') selectType('pulse');
      if (e.key === '2') selectType('spark');
      if (e.key === '3') selectType('nova');
    });
  }

  function getCoords(e) {
    var r = $canvas.getBoundingClientRect();
    var sx = $canvas.width / r.width, sy = $canvas.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  function onCanvasMove(e) {
    if (S.phase !== 'playing') return;
    var c = getCoords(e);
    S.hoverCell = Map.pixelToGrid(c.x, c.y);
  }

  function onCanvasClick(e) {
    if (S.phase !== 'playing') return;
    var c = getCoords(e);
    var g = Map.pixelToGrid(c.x, c.y);

    // Placing a tower?
    if (S.placingType) {
      if (Map.canPlaceTower(S.grid, g.x, g.y)) {
        var cost = TYPES[S.placingType].cost;
        if (S.credits >= cost) {
          S.credits -= cost;
          var tw = new Ent.Tower(g.x, g.y, S.placingType);
          S.towers.push(tw);
          S.grid[g.y][g.x] = Map.TILE_TOWER;
          S.placingType = null;
          updateTowerBar(); updateTowerInfo(); updateHUD();
          trySave();
        }
      }
      return;
    }

    // Click a placed tower?
    for (var i = 0; i < S.towers.length; i++) {
      var t = S.towers[i];
      if (t.col === g.x && t.row === g.y) {
        S.selectedTower = t;
        updateTowerInfo();
        return;
      }
    }

    // Click empty — deselect
    deselect();
  }

  function selectType(type) {
    if (S.phase !== 'playing') return;
    S.selectedTower = null;
    S.placingType = S.placingType === type ? null : type;
    updateTowerBar(); updateTowerInfo();
  }

  function deselect() {
    S.placingType = null; S.selectedTower = null;
    updateTowerBar(); updateTowerInfo();
  }

  /* ============ ACTIONS ============ */
  function startGame() {
    $screenTitle.classList.remove('screen--active');
    S.phase = 'playing';
    $btnWave.disabled = false;
    updateHUD();
  }

  function retryGame() {
    $screenGO.classList.remove('screen--active');
    resetState();
    S.phase = 'playing';
    $btnWave.disabled = false;
    updateHUD(); updateTowerBar(); updateTowerInfo();
  }

  function sendWave() {
    if (S.waveActive || S.phase !== 'playing') return;
    S.waveManager.startNextWave();
    S.waveActive = true;
    $btnWave.disabled = true;
    showWaveBanner('Wave ' + S.waveManager.currentWave);
    updateHUD();
  }

  function upgradeTower() {
    if (!S.selectedTower || S.selectedTower.level >= 3) return;
    var cost = S.selectedTower.getUpgradeCost();
    if (S.credits >= cost) {
      S.credits -= cost;
      S.selectedTower.upgrade();
      updateTowerInfo(); updateHUD();
      trySave();
    }
  }

  function sellTower() {
    if (!S.selectedTower) return;
    var tw = S.selectedTower;
    S.credits += tw.getSellValue();
    S.grid[tw.row][tw.col] = Map.TILE_EMPTY;
    S.towers.splice(S.towers.indexOf(tw), 1);
    S.selectedTower = null;
    updateTowerInfo(); updateHUD();
    trySave();
  }

  /* ============ UI UPDATES ============ */
  function updateHUD() {
    $hudWave.textContent = S.waveManager.currentWave;
    $hudCredits.textContent = S.credits;
    $hudHp.textContent = S.coreHp;
    $hudScore.textContent = S.score;
    $hudBest.textContent = S.best;
    // Disable tower buttons if can't afford
    document.querySelectorAll('.tower-btn').forEach(function (btn) {
      var cost = TYPES[btn.dataset.type].cost;
      btn.classList.toggle('tower-btn--disabled', S.credits < cost);
    });
  }

  function updateTowerBar() {
    document.querySelectorAll('.tower-btn').forEach(function (btn) {
      btn.classList.toggle('tower-btn--active', btn.dataset.type === S.placingType);
    });
  }

  function updateTowerInfo() {
    if (S.selectedTower) {
      // Placed tower selected — show full stats + upgrade/sell
      var tw = S.selectedTower, def = TYPES[tw.type];
      $towerInfo.hidden = false;
      $infoName.textContent = def.name + ' Tower';
      $infoName.style.color = def.color;
      $infoLevelWrap.hidden = false;
      $infoLevel.textContent = tw.level;
      $infoDmg.textContent = Math.round(tw.damage);
      $infoRange.textContent = (tw.range / Map.CELL_SIZE).toFixed(1);
      $infoRate.textContent = tw.fireRate.toFixed(1) + '/s';
      $infoActions.hidden = false;
      if (tw.level < 3) {
        $btnUpgrade.hidden = false;
        $upgradeLabel.textContent = tw.getUpgradeCost();
        $btnUpgrade.disabled = S.credits < tw.getUpgradeCost();
      } else {
        $btnUpgrade.hidden = true;
      }
      $sellLabel.textContent = tw.getSellValue();
    } else if (S.placingType) {
      // Placement mode — show type preview stats (no upgrade/sell)
      var def2 = TYPES[S.placingType];
      $towerInfo.hidden = false;
      $infoName.textContent = def2.name + ' Tower';
      $infoName.style.color = def2.color;
      $infoLevelWrap.hidden = true;
      $infoDmg.textContent = def2.damage;
      $infoRange.textContent = def2.range.toFixed(1);
      $infoRate.textContent = def2.fireRate.toFixed(1) + '/s';
      $infoActions.hidden = true;
    } else {
      $towerInfo.hidden = true;
    }
  }

  function showWaveBanner(text) {
    $waveBanner.textContent = text;
    $waveBanner.classList.add('wave-banner--show');
    setTimeout(function () { $waveBanner.classList.remove('wave-banner--show'); }, 1800);
  }

  /* ============ GAME LOOP ============ */
  function loop(time) {
    var dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    if (S.phase === 'playing') update(dt);
    Ren.render(S, time / 1000);
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Spawn enemies
    S.waveManager.update(dt, S.enemies, S.pathSegments);

    // Update enemies
    for (var i = S.enemies.length - 1; i >= 0; i--) {
      var e = S.enemies[i];
      e.update(dt, S.pathSegments);
      if (e.reachedEnd) {
        S.coreHp--;
        S.enemies.splice(i, 1);
        updateHUD();
        if (S.coreHp <= 0) { gameOver(); return; }
      } else if (!e.alive) {
        S.credits += e.reward;
        S.score += e.reward * 2;
        S.kills++;
        // Death particles
        for (var p = 0; p < 6; p++) {
          S.particles.push(new Ent.Particle(
            e.x, e.y, Math.random() * Math.PI * 2,
            30 + Math.random() * 50, e.color, 0.35
          ));
        }
        S.enemies.splice(i, 1);
        updateHUD();
      }
    }

    // Update towers
    for (var t = 0; t < S.towers.length; t++) {
      S.towers[t].update(dt, S.enemies, S.projectiles);
    }

    // Update projectiles
    for (var j = S.projectiles.length - 1; j >= 0; j--) {
      S.projectiles[j].update(dt, S.enemies, S.particles);
      if (!S.projectiles[j].alive) S.projectiles.splice(j, 1);
    }

    // Update particles
    for (var k = S.particles.length - 1; k >= 0; k--) {
      S.particles[k].update(dt);
      if (!S.particles[k].alive) S.particles.splice(k, 1);
    }

    // Wave completion check
    if (S.waveActive && S.waveManager.isWaveComplete(S.enemies)) {
      S.waveActive = false;
      $btnWave.disabled = false;
      // Bonus credits between waves
      S.credits += 10 + S.waveManager.currentWave * 2;
      S.score += 50;
      updateHUD();
      trySave();
    }

    updateTowerInfo();
  }

  function gameOver() {
    clearSave();
    S.phase = 'gameover';
    if (S.score > S.best) { S.best = S.score; localStorage.setItem('ts_best', S.best); }
    document.getElementById('go-score').textContent = S.score;
    document.getElementById('go-wave').textContent = S.waveManager.currentWave;
    document.getElementById('go-kills').textContent = S.kills;
    document.getElementById('go-best').textContent = S.best;
    $screenGO.classList.add('screen--active');
  }

  /* ============ BOOTSTRAP ============ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
