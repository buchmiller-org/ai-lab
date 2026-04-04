/* ============================================
   Starfield Survivor — Entity Definitions
   ============================================ */

// ── Player ──────────────────────────────────
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;          // visual radius
    this.hitRadius = 5;        // bullet-hell hitbox (tiny)
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.speed = 6;
    this.trail = [];
    this.maxTrail = 12;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 1.2; // seconds of i-frames after hit
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldDuration = 6;   // seconds
    this.shieldRadius = 28;
    this.damageFlash = 0;
    this.alive = true;
  }

  takeDamage(amount) {
    if (this.invincible) return false;
    if (this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = 0;
      this.invincible = true;
      this.invincibleTimer = 0.5;
      return false; // shield absorbed
    }
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlash = 0.3;
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;
    if (this.hp <= 0) {
      this.alive = false;
    }
    return true; // damage dealt
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  activateShield() {
    this.shieldActive = true;
    this.shieldTimer = this.shieldDuration;
  }

  update(dt, targetX, targetY, canvasW, canvasH) {
    // Smooth follow toward target
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const moveSpeed = Math.min(dist, this.speed * 60 * dt);
      this.x += (dx / dist) * moveSpeed;
      this.y += (dy / dist) * moveSpeed;
    }

    // Clamp to canvas
    this.x = Math.max(this.radius, Math.min(canvasW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasH - this.radius, this.y));

    // Trail
    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > this.maxTrail) this.trail.pop();
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - i / this.maxTrail;
    }

    // Timers
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.invincibleTimer = 0;
      }
    }
    if (this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
        this.shieldTimer = 0;
      }
    }
    if (this.damageFlash > 0) {
      this.damageFlash -= dt;
    }
  }
}

// ── Debris Types ────────────────────────────

const DEBRIS_TYPES = {
  ASTEROID: 'asteroid',
  SHARD: 'shard',
  PULSE_RING: 'pulse_ring',
  LASER_BEAM: 'laser_beam',
  COMET: 'comet',
};

class Asteroid {
  constructor(x, y, vx, vy, size) {
    this.type = DEBRIS_TYPES.ASTEROID;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = size || 18 + Math.random() * 18;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 2;
    this.damage = 15;
    this.dead = false;
    this.vertices = this._generateShape();
    this.hue = 20 + Math.random() * 30; // orange-red
  }

  _generateShape() {
    const points = 7 + Math.floor(Math.random() * 4);
    const verts = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = this.radius * (0.7 + Math.random() * 0.3);
      verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return verts;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
  }

  isOffScreen(w, h) {
    const margin = this.radius + 60;
    return this.x < -margin || this.x > w + margin || this.y < -margin || this.y > h + margin;
  }
}

class Shard {
  constructor(x, y, vx, vy) {
    this.type = DEBRIS_TYPES.SHARD;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 5;
    this.damage = 8;
    this.dead = false;
    this.life = 0;
    this.hue = 280 + Math.random() * 60; // purple-pink
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life += dt;
  }

  isOffScreen(w, h) {
    const margin = 40;
    return this.x < -margin || this.x > w + margin || this.y < -margin || this.y > h + margin;
  }
}

class PulseRing {
  constructor(cx, cy, maxRadius, gapAngle, gapSize, speed) {
    this.type = DEBRIS_TYPES.PULSE_RING;
    this.cx = cx;
    this.cy = cy;
    this.radius = 0;
    this.maxRadius = maxRadius || 500;
    this.thickness = 8;
    this.gapAngle = gapAngle;        // where the gap is (radians)
    this.gapSize = gapSize || 0.6;   // gap arc size (radians)
    this.speed = speed || 180;
    this.damage = 12;
    this.dead = false;
    this.hue = 180 + Math.random() * 30; // cyan
  }

  update(dt) {
    this.radius += this.speed * dt;
    if (this.radius > this.maxRadius) {
      this.dead = true;
    }
  }

  // Check if a point collides with the ring (excluding gap)
  collidesWithPoint(px, py, pointRadius) {
    const dx = px - this.cx;
    const dy = py - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Check if within ring thickness
    const innerR = this.radius - this.thickness / 2;
    const outerR = this.radius + this.thickness / 2;
    if (dist + pointRadius < innerR || dist - pointRadius > outerR) return false;
    // Check if in the gap
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;
    let gStart = this.gapAngle - this.gapSize / 2;
    let gEnd = this.gapAngle + this.gapSize / 2;
    // Normalize
    if (gStart < 0) gStart += Math.PI * 2;
    if (gEnd < 0) gEnd += Math.PI * 2;
    if (gStart < gEnd) {
      if (angle >= gStart && angle <= gEnd) return false;
    } else {
      if (angle >= gStart || angle <= gEnd) return false;
    }
    return true;
  }

  isOffScreen() {
    return this.dead;
  }
}

class LaserBeam {
  constructor(originX, originY, angle, canvasW, canvasH) {
    this.type = DEBRIS_TYPES.LASER_BEAM;
    this.originX = originX;
    this.originY = originY;
    this.angle = angle;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.telegraphDuration = 1.2;   // seconds of warning line
    this.fireDuration = 0.4;        // seconds beam is active
    this.timer = 0;
    this.width = 6;
    this.damage = 20;
    this.dead = false;
    this.phase = 'telegraph'; // 'telegraph' → 'fire' → dead
    this.hue = 0; // red
    // Calculate end point (extends across screen)
    const len = Math.sqrt(canvasW * canvasW + canvasH * canvasH);
    this.endX = originX + Math.cos(angle) * len;
    this.endY = originY + Math.sin(angle) * len;
  }

  update(dt) {
    this.timer += dt;
    if (this.phase === 'telegraph' && this.timer >= this.telegraphDuration) {
      this.phase = 'fire';
      this.timer = 0;
    } else if (this.phase === 'fire' && this.timer >= this.fireDuration) {
      this.dead = true;
    }
  }

  // Point-to-line-segment distance
  collidesWithPoint(px, py, pointRadius) {
    if (this.phase !== 'fire') return false;
    const halfW = this.width / 2 + pointRadius;
    // Distance from point to line
    const A = this.endY - this.originY;
    const B = this.originX - this.endX;
    const C = this.endX * this.originY - this.originX * this.endY;
    const dist = Math.abs(A * px + B * py + C) / Math.sqrt(A * A + B * B);
    return dist < halfW;
  }

  isOffScreen() {
    return this.dead;
  }
}

class Comet {
  constructor(x, y, vx, vy) {
    this.type = DEBRIS_TYPES.COMET;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 10;
    this.damage = 18;
    this.dead = false;
    this.trail = [];
    this.maxTrail = 20;
    this.hue = 40 + Math.random() * 20; // golden
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > this.maxTrail) this.trail.pop();
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - i / this.maxTrail;
    }
  }

  isOffScreen(w, h) {
    const margin = 60;
    return this.x < -margin || this.x > w + margin || this.y < -margin || this.y > h + margin;
  }
}

// ── Particles ───────────────────────────────

class Particle {
  constructor(x, y, vx, vy, life, size, hue, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.hue = hue;
    this.type = type || 'spark'; // 'spark', 'graze', 'heal', 'shield'
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, opts = {}) {
    const {
      hue = 180,
      speed = 100,
      life = 0.6,
      size = 3,
      type = 'spark',
      spread = Math.PI * 2,
      direction = 0,
    } = opts;
    for (let i = 0; i < count; i++) {
      const angle = direction - spread / 2 + Math.random() * spread;
      const spd = speed * (0.3 + Math.random() * 0.7);
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        life * (0.5 + Math.random() * 0.5),
        size * (0.5 + Math.random() * 0.5),
        hue + (Math.random() - 0.5) * 30,
        type,
      ));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) {
        this.particles.splice(i, 1);
      }
    }
  }
}

// ── Power-Ups ───────────────────────────────

const POWERUP_TYPES = {
  SHIELD: 'shield',
  HEALTH: 'health',
  SLOW_MO: 'slow_mo',
};

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 14;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.dead = false;
    this.life = 8; // despawn after 8 seconds if not collected
    this.spawnY = y;
    this.pulse = 0;
  }

  update(dt) {
    this.pulse += dt * 3;
    this.y = this.spawnY + Math.sin(this.pulse + this.bobOffset) * 6;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  get hue() {
    switch (this.type) {
      case POWERUP_TYPES.SHIELD: return 200;   // blue
      case POWERUP_TYPES.HEALTH: return 120;    // green
      case POWERUP_TYPES.SLOW_MO: return 280;  // purple
      default: return 60;
    }
  }

  get symbol() {
    switch (this.type) {
      case POWERUP_TYPES.SHIELD: return '◇';
      case POWERUP_TYPES.HEALTH: return '+';
      case POWERUP_TYPES.SLOW_MO: return '◎';
      default: return '?';
    }
  }
}

// ── Background Stars ────────────────────────

class StarField {
  constructor(canvasW, canvasH, layers) {
    this.layers = [];
    const layerDefs = layers || [
      { count: 60, speed: 15, size: 1, alpha: 0.3 },
      { count: 35, speed: 35, size: 1.5, alpha: 0.5 },
      { count: 15, speed: 70, size: 2.5, alpha: 0.7 },
    ];
    for (const def of layerDefs) {
      const stars = [];
      for (let i = 0; i < def.count; i++) {
        stars.push({
          x: Math.random() * canvasW,
          y: Math.random() * canvasH,
          size: def.size * (0.6 + Math.random() * 0.4),
          alpha: def.alpha * (0.6 + Math.random() * 0.4),
          twinkle: Math.random() * Math.PI * 2,
        });
      }
      this.layers.push({ stars, speed: def.speed });
    }
  }

  update(dt, canvasW, canvasH) {
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.y += layer.speed * dt;
        star.twinkle += dt * 2;
        if (star.y > canvasH + 5) {
          star.y = -5;
          star.x = Math.random() * canvasW;
        }
      }
    }
  }
}
