// ============================================================
// TARTARUS — Entities
// Rig, Enemy, Projectile, Particle classes + Object Pools
// ============================================================

// --- Rig ---

export class Rig {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 48;
    this.height = 56;
    this.color = '#e0e0e0';
    this.turretLength = 18;
    this.turretColor = '#ffffff';

    // Turret state — 4 turrets at the corners
    // Each has an independent cooldown timer
    this.turrets = [
      { cooldown: 0, fireRate: 0.5, damage: 5, dx: -1, dy: -1 },  // top-left
      { cooldown: 0, fireRate: 0.5, damage: 5, dx:  1, dy: -1 },  // top-right
      { cooldown: 0, fireRate: 0.5, damage: 5, dx: -1, dy:  1 },  // bottom-left
      { cooldown: 0, fireRate: 0.5, damage: 5, dx:  1, dy:  1 },  // bottom-right
    ];
  }

  /** Position the rig at the center of the canvas */
  setPosition(canvasW, canvasH) {
    this.x = canvasW / 2;
    this.y = canvasH / 2;
  }

  /** Get the world position of a turret barrel tip */
  getTurretPosition(turret) {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const normLen = Math.sqrt(turret.dx * turret.dx + turret.dy * turret.dy);
    return {
      x: this.x + turret.dx * hw + (turret.dx / normLen) * this.turretLength,
      y: this.y + turret.dy * hh + (turret.dy / normLen) * this.turretLength,
    };
  }

  /**
   * Update turrets: decrement cooldowns, fire at nearest enemy
   * @param {number} dt
   * @param {ObjectPool} enemyPool
   * @param {ObjectPool} projectilePool
   */
  updateTurrets(dt, enemyPool, projectilePool) {
    // Find nearest active enemy
    const nearest = this.findNearestEnemy(enemyPool);
    if (!nearest) return;

    for (const turret of this.turrets) {
      turret.cooldown -= dt;
      if (turret.cooldown <= 0 && nearest) {
        turret.cooldown = turret.fireRate;

        // Fire a projectile from this turret's barrel tip
        const pos = this.getTurretPosition(turret);
        const proj = projectilePool.acquire();
        if (proj) {
          proj.fire(pos.x, pos.y, nearest.x, nearest.y, 400, turret.damage);
        }
      }
    }
  }

  /** Find the nearest active enemy to the rig center */
  findNearestEnemy(enemyPool) {
    let nearest = null;
    let nearestDist = Infinity;
    enemyPool.forEachActive(enemy => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = dx * dx + dy * dy; // squared — no sqrt needed for comparison
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    });
    return nearest;
  }

  draw(ctx) {
    const hw = this.width / 2;
    const hh = this.height / 2;

    // Body rectangle
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - hw, this.y - hh, this.width, this.height);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x - hw, this.y - hh, this.width, this.height);

    // Turret barrels — 4 lines extending from corners
    ctx.strokeStyle = this.turretColor;
    ctx.lineWidth = 2;
    for (const turret of this.turrets) {
      const cornerX = this.x + turret.dx * hw;
      const cornerY = this.y + turret.dy * hh;
      const pos = this.getTurretPosition(turret);
      ctx.beginPath();
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Small muzzle dot
      ctx.fillStyle = turret.cooldown > turret.fireRate * 0.7 ? '#ffee00' : '#666666';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


// --- Enemy ---

export const EnemyType = {
  SCOUT:        'SCOUT',
  SWARMER:      'SWARMER',
  GEODE_BEETLE: 'GEODE_BEETLE',
  HARVESTER:    'HARVESTER',
  ELITE:        'ELITE',
  WORM_SEGMENT: 'WORM_SEGMENT',
};

export class Enemy {
  constructor() {
    this.active = false;
    this.type = EnemyType.SCOUT;
    this.x = 0;
    this.y = 0;
    this.hp = 10;
    this.maxHp = 10;
    this.speed = 60;          // pixels per second
    this.radius = 8;
    this.scrapValue = 5;
    this.color = '#ff4444';
    this.angle = 0;
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.hp = 10;
    this.maxHp = 10;
    this.speed = 60;
    this.radius = 8;
    this.scrapValue = 5;
    this.type = EnemyType.SCOUT;
    this.color = '#ff4444';
    this.angle = 0;
  }

  /** Configure this enemy for a spawn */
  spawn(type, x, y, hp, speed, radius, scrapValue, color) {
    this.active = true;
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.radius = radius;
    this.scrapValue = scrapValue;
    this.color = color;
  }

  update(dt, targetX, targetY) {
    if (!this.active) return;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    // Store angle toward target for oriented drawing
    this.angle = Math.atan2(dy, dx);
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    switch (this.type) {
      case EnemyType.SCOUT:
        this._drawTriangle(ctx);
        break;
      case EnemyType.SWARMER:
        this._drawCircle(ctx);
        break;
      case EnemyType.GEODE_BEETLE:
        this._drawHexagon(ctx);
        break;
      case EnemyType.ELITE:
        this._drawElite(ctx);
        break;
      case EnemyType.WORM_SEGMENT:
        this._drawCircle(ctx);
        break;
      default:
        this._drawCircle(ctx);
    }
  }

  _drawTriangle(ctx) {
    // Apex points toward the rig (rotated by this.angle)
    const r = this.radius;
    const a = this.angle;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(r, 0);                       // apex (leading edge)
    ctx.lineTo(-r * 0.7, -r * 0.8);         // rear left
    ctx.lineTo(-r * 0.7,  r * 0.8);         // rear right
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawCircle(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawHexagon(ctx) {
    const r = this.radius;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = this.x + r * Math.cos(angle);
      const py = this.y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _drawElite(ctx) {
    // Large circle with inner ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
}


// --- Projectile ---

export class Projectile {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 400;
    this.damage = 5;
    this.color = '#ffee00';
    this.length = 8;
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }

  fire(x, y, targetX, targetY, speed, damage) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = speed || 400;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    }
  }

  update(dt, canvasW, canvasH) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Off-screen check
    const margin = 20;
    if (this.x < -margin || this.x > canvasW + margin ||
        this.y < -margin || this.y > canvasH + margin) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const dist = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (dist === 0) return;
    const nx = this.vx / dist;
    const ny = this.vy / dist;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - nx * this.length, this.y - ny * this.length);
    ctx.stroke();
  }
}


// --- Particle ---

export class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.radius = 2;
    this.color = '#ffffff';
  }

  reset() {
    this.active = false;
  }

  spawn(x, y, vx, vy, life, radius, color) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.radius = radius;
    this.color = color;
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}


// --- Object Pools ---

export class ObjectPool {
  constructor(ClassRef, size) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      this.pool.push(new ClassRef());
    }
  }

  /** Get an inactive entity from the pool */
  acquire() {
    for (const obj of this.pool) {
      if (!obj.active) return obj;
    }
    return null;  // Pool exhausted
  }

  /** Iterate over all active entities */
  forEachActive(fn) {
    for (const obj of this.pool) {
      if (obj.active) fn(obj);
    }
  }

  /** Count active entities */
  activeCount() {
    let count = 0;
    for (const obj of this.pool) {
      if (obj.active) count++;
    }
    return count;
  }

  /** Return all active entities as array (use sparingly) */
  getActive() {
    return this.pool.filter(e => e.active);
  }
}
