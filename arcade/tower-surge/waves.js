/* ============================================
   Tower Surge — Wave Definitions & Spawner
   ============================================ */
window.TS = window.TS || {};

(function () {
  'use strict';

  var ENEMY_TEMPLATES = {
    glitch:  { hp: 40,  speed: 80,  reward: 10, size: 10, color: '#ef4444' },
    swarm:   { hp: 20,  speed: 120, reward: 5,  size: 7,  color: '#fb923c' },
    titan:   { hp: 160, speed: 45,  reward: 30, size: 14, color: '#d946ef' },
    phantom: { hp: 55,  speed: 130, reward: 15, size: 9,  color: '#a855f7' }
  };

  /** Procedurally generate a wave definition for the given wave number. */
  function getWaveDefinition(n) {
    var groups = [];
    if (n <= 3) {
      groups.push({ type: 'glitch', count: 4 + n * 2, interval: 1.0 - n * 0.05, hpMult: 1 + (n - 1) * 0.15, speedMult: 1 });
    } else if (n <= 6) {
      groups.push({ type: 'glitch', count: 3 + n, interval: 0.8, hpMult: 1 + (n - 1) * 0.2, speedMult: 1 + (n - 3) * 0.05 });
      groups.push({ type: 'swarm', count: n * 2, interval: 0.4, hpMult: 1 + (n - 1) * 0.15, speedMult: 1 });
    } else if (n <= 10) {
      groups.push({ type: 'glitch', count: 5 + n, interval: 0.7, hpMult: 1 + (n - 1) * 0.25, speedMult: 1.1 });
      if (n >= 8) groups.push({ type: 'phantom', count: 2 + Math.floor((n - 7) * 1.5), interval: 1.2, hpMult: 1 + (n - 1) * 0.2, speedMult: 1 });
      if (n % 5 === 0) groups.push({ type: 'titan', count: 1, interval: 2, hpMult: 1 + (n - 1) * 0.3, speedMult: 1 });
    } else {
      var s = n - 10;
      groups.push({ type: 'glitch', count: 8 + n, interval: 0.5, hpMult: 1.5 + s * 0.3, speedMult: Math.min(1.15 + s * 0.02, 1.6) });
      groups.push({ type: 'swarm', count: 6 + s * 2, interval: 0.3, hpMult: 1.2 + s * 0.2, speedMult: Math.min(1.1 + s * 0.03, 1.5) });
      if (n % 3 === 0) groups.push({ type: 'phantom', count: 3 + Math.floor(s * 0.8), interval: 0.9, hpMult: 1.3 + s * 0.25, speedMult: 1.1 });
      if (n % 5 === 0) groups.push({ type: 'titan', count: 1 + Math.floor(s / 5), interval: 2.5, hpMult: 1.5 + s * 0.4, speedMult: 1 + s * 0.02 });
    }
    return { waveNum: n, groups: groups };
  }

  /** Manages spawning enemies for the current wave. */
  function WaveManager() {
    this.currentWave = 0;
    this.spawning = false;
    this.groupIdx = 0;
    this.spawnedInGroup = 0;
    this.spawnTimer = 0;
    this.waveDef = null;
    this.waveActive = false;
  }

  WaveManager.prototype.startNextWave = function () {
    this.currentWave++;
    this.waveDef = getWaveDefinition(this.currentWave);
    this.groupIdx = 0;
    this.spawnedInGroup = 0;
    this.spawnTimer = 0.6;
    this.spawning = true;
    this.waveActive = true;
  };

  WaveManager.prototype.update = function (dt, enemies, pathSegments) {
    if (!this.spawning) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.groupIdx < this.waveDef.groups.length) {
      var g = this.waveDef.groups[this.groupIdx];
      var t = ENEMY_TEMPLATES[g.type];
      var enemy = new TS.Entities.Enemy(
        Math.floor(t.hp * g.hpMult),
        t.speed * g.speedMult,
        t.reward, g.type
      );
      enemy.size = t.size;
      enemy.color = t.color;
      var seg = pathSegments[0];
      enemy.x = seg.ax; enemy.y = seg.ay;
      enemies.push(enemy);
      this.spawnedInGroup++;
      if (this.spawnedInGroup >= g.count) {
        this.groupIdx++;
        this.spawnedInGroup = 0;
        this.spawnTimer = this.groupIdx < this.waveDef.groups.length ? 1.0 : 0;
      } else {
        this.spawnTimer = g.interval;
      }
      if (this.groupIdx >= this.waveDef.groups.length) this.spawning = false;
    }
  };

  WaveManager.prototype.isWaveComplete = function (enemies) {
    if (this.spawning) return false;
    for (var i = 0; i < enemies.length; i++) { if (enemies[i].alive) return false; }
    return true;
  };

  TS.Waves = {
    ENEMY_TEMPLATES: ENEMY_TEMPLATES,
    getWaveDefinition: getWaveDefinition,
    WaveManager: WaveManager
  };
})();
