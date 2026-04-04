/* ============================================
   Tower Surge — Entity Classes
   ============================================ */
window.TS = window.TS || {};

(function () {
  'use strict';

  var CELL = TS.Map.CELL_SIZE;

  /* ---------- Tower type definitions ---------- */
  var TOWER_TYPES = {
    pulse: {
      name: 'Pulse', cost: 50,
      color: '#06d6a0', glowColor: 'rgba(6,214,160,0.6)',
      range: 3.0, damage: 18, fireRate: 1.2,
      projectileSpeed: 360, splash: 0,
      desc: 'Balanced single-target'
    },
    spark: {
      name: 'Spark', cost: 30,
      color: '#facc15', glowColor: 'rgba(250,204,21,0.6)',
      range: 2.2, damage: 7, fireRate: 3.5,
      projectileSpeed: 480, splash: 0,
      desc: 'Fast attack, low damage'
    },
    nova: {
      name: 'Nova', cost: 100,
      color: '#f472b6', glowColor: 'rgba(244,114,182,0.6)',
      range: 3.5, damage: 45, fireRate: 0.45,
      projectileSpeed: 240, splash: 1.2,
      desc: 'Slow AoE splash'
    }
  };

  var UPG_COST = [0, 0.6, 1.2];   // fraction of base cost for each upgrade
  var UPG_DMG = [1, 1.6, 2.4];
  var UPG_RNG = [1, 1.15, 1.35];

  /* ---------- Tower ---------- */
  function Tower(col, row, type) {
    var def = TOWER_TYPES[type];
    var pos = TS.Map.gridToPixel(col, row);
    this.col = col; this.row = row;
    this.type = type; this.level = 1;
    this.x = pos.x; this.y = pos.y;
    this.damage = def.damage;
    this.range = def.range * CELL;
    this.fireRate = def.fireRate;
    this.splash = def.splash * CELL;
    this.projSpeed = def.projectileSpeed;
    this.cooldown = 0; this.target = null; this.angle = 0;
  }
  Tower.prototype.upgrade = function () {
    if (this.level >= 3) return false;
    this.level++;
    var def = TOWER_TYPES[this.type], li = this.level - 1;
    this.damage = def.damage * UPG_DMG[li];
    this.range = def.range * CELL * UPG_RNG[li];
    return true;
  };
  Tower.prototype.getUpgradeCost = function () {
    if (this.level >= 3) return Infinity;
    return Math.floor(TOWER_TYPES[this.type].cost * UPG_COST[this.level]);
  };
  Tower.prototype.getSellValue = function () {
    var def = TOWER_TYPES[this.type], total = def.cost;
    for (var i = 1; i < this.level; i++) total += Math.floor(def.cost * UPG_COST[i]);
    return Math.floor(total * 0.6);
  };
  Tower.prototype.findTarget = function (enemies) {
    var best = null, bestProg = -1;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var dx = e.x - this.x, dy = e.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.range && e.pathProgress > bestProg) { best = e; bestProg = e.pathProgress; }
    }
    this.target = best; return best;
  };
  Tower.prototype.update = function (dt, enemies, projectiles) {
    this.cooldown -= dt;
    this.findTarget(enemies);
    if (this.target) {
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      if (this.cooldown <= 0) {
        this.cooldown = 1 / this.fireRate;
        projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.projSpeed, this.splash, this.type));
      }
    }
  };

  /* ---------- Enemy ---------- */
  function Enemy(hp, speed, reward, type) {
    this.maxHp = hp; this.hp = hp;
    this.speed = speed; this.reward = reward;
    this.type = type || 'glitch';
    this.alive = true; this.reachedEnd = false;
    this.segmentIndex = 0; this.segmentProgress = 0; this.pathProgress = 0;
    this.x = 0; this.y = 0;
    this.size = 10; this.flashTimer = 0;
    this.color = '#ef4444';
  }
  Enemy.prototype.takeDamage = function (amount) {
    this.hp -= amount; this.flashTimer = 0.1;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  };
  Enemy.prototype.update = function (dt, pathSegments) {
    if (!this.alive) return;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.segmentIndex >= pathSegments.length) { this.reachedEnd = true; this.alive = false; return; }
    var seg = pathSegments[this.segmentIndex];
    var pd = (this.speed * dt) / seg.length;
    this.segmentProgress += pd; this.pathProgress += pd;
    while (this.segmentProgress >= 1 && this.segmentIndex < pathSegments.length) {
      this.segmentProgress -= 1; this.segmentIndex++;
      if (this.segmentIndex >= pathSegments.length) { this.reachedEnd = true; this.alive = false; return; }
    }
    if (this.segmentIndex < pathSegments.length) {
      var s = pathSegments[this.segmentIndex];
      this.x = s.ax + (s.bx - s.ax) * this.segmentProgress;
      this.y = s.ay + (s.by - s.ay) * this.segmentProgress;
    }
  };

  /* ---------- Projectile ---------- */
  function Projectile(x, y, target, damage, speed, splash, towerType) {
    this.x = x; this.y = y; this.target = target;
    this.damage = damage; this.speed = speed;
    this.splash = splash; this.towerType = towerType;
    this.alive = true; this.color = TOWER_TYPES[towerType].color;
  }
  Projectile.prototype.update = function (dt, enemies, particles) {
    if (!this.alive) return;
    if (!this.target.alive && this.splash === 0) { this.alive = false; return; }
    var tx = this.target.x, ty = this.target.y;
    var dx = tx - this.x, dy = ty - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.speed * dt + 6) {
      this.alive = false;
      if (this.splash > 0) {
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i]; if (!e.alive) continue;
          var ed = Math.sqrt((e.x - tx) * (e.x - tx) + (e.y - ty) * (e.y - ty));
          if (ed <= this.splash) e.takeDamage(this.damage * (1 - ed / this.splash * 0.5));
        }
        for (var j = 0; j < 8; j++) {
          var a = (Math.PI * 2 * j) / 8 + Math.random() * 0.3;
          particles.push(new Particle(tx, ty, a, 40 + Math.random() * 60, this.color, 0.4));
        }
      } else {
        if (this.target.alive) this.target.takeDamage(this.damage);
        for (var k = 0; k < 4; k++) {
          particles.push(new Particle(tx, ty, Math.random() * Math.PI * 2, 30 + Math.random() * 50, this.color, 0.3));
        }
      }
    } else {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  };

  /* ---------- Particle ---------- */
  function Particle(x, y, angle, speed, color, life) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
    this.color = color; this.life = life; this.maxLife = life;
    this.alive = true; this.size = 2 + Math.random() * 2;
  }
  Particle.prototype.update = function (dt) {
    if (!this.alive) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.94; this.vy *= 0.94;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  };

  /* ---------- Export ---------- */
  TS.Entities = {
    TOWER_TYPES: TOWER_TYPES,
    UPG_COST: UPG_COST, UPG_DMG: UPG_DMG, UPG_RNG: UPG_RNG,
    Tower: Tower, Enemy: Enemy, Projectile: Projectile, Particle: Particle
  };
})();
