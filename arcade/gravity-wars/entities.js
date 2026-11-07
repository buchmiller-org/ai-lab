/**
 * Gravity Wars — Entities
 * Planets, ships, projectiles and the seeded level generator.
 * Exposed as window.GW.Entities.
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});
  const Physics = GW.Physics;

  const WORLD = { width: 800, height: 600 };

  const PLANET_COLORS = ['#38bdf8', '#f472b6', '#facc15', '#a78bfa', '#06d6a0', '#fb923c'];

  /** Deterministic PRNG (mulberry32) so maps are reproducible from a seed. */
  function createRng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Planet {
    constructor(x, y, radius, mass, color) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.mass = mass;
      this.color = color;
      this.active = true;
    }
  }

  class Ship {
    constructor(id, x, y, color, facing) {
      this.id = id; // 1 or 2
      this.x = x;
      this.y = y;
      this.radius = 14;
      this.color = color;
      this.facing = facing; // +1 faces right, -1 faces left
      this.alive = true;
    }
  }

  class Projectile {
    constructor(x, y, vx, vy, mass) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.mass = mass === undefined ? 1 : mass;
      this.radius = 3;
      this.alive = true;
      this.age = 0;
      this.hit = null;
      this.trail = [{ x, y }];
    }

    recordTrail() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > Projectile.MAX_TRAIL) this.trail.shift();
    }
  }
  Projectile.MAX_TRAIL = 1200;

  /** Ship spawn positions (left / right edge zones). */
  function shipSpawns() {
    return [
      { x: 70, y: WORLD.height * 0.5 },
      { x: WORLD.width - 70, y: WORLD.height * 0.5 },
    ];
  }

  /**
   * Generate 2–4 planets with varied radii/masses between the ship zones.
   * Mass scales with area (radius^2) times a density jitter.
   */
  function generatePlanets(seed) {
    const rand = createRng(seed);
    const count = 2 + Math.floor(rand() * 3); // 2..4
    const spawns = shipSpawns();
    const planets = [];
    const minX = 200;
    const maxX = WORLD.width - 200;
    const colors = PLANET_COLORS.slice();

    for (let n = 0; n < count; n++) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const radius = 24 + rand() * 38; // 24..62
        const x = minX + rand() * (maxX - minX);
        const y = radius + 30 + rand() * (WORLD.height - 2 * radius - 60);
        const clear = 14;
        let ok = true;
        for (const p of planets) {
          if (Math.hypot(p.x - x, p.y - y) < p.radius + radius + 70) ok = false;
        }
        for (const s of spawns) {
          if (Math.hypot(s.x - x, s.y - y) < radius + 110 + clear) ok = false;
        }
        if (!ok) continue;
        const density = 450 + rand() * 450;
        const mass = radius * radius * density;
        const color = colors.splice(Math.floor(rand() * colors.length), 1)[0];
        planets.push(new Planet(x, y, radius, mass, color));
        break;
      }
    }
    // Guarantee the minimum even if placement was unlucky.
    if (planets.length < 2) {
      planets.length = 0;
      planets.push(new Planet(330, 200, 40, 40 * 40 * 700, PLANET_COLORS[0]));
      planets.push(new Planet(470, 400, 50, 50 * 50 * 700, PLANET_COLORS[1]));
    }
    return planets;
  }

  function createShips() {
    const [a, b] = shipSpawns();
    return [new Ship(1, a.x, a.y, '#06d6a0', 1), new Ship(2, b.x, b.y, '#f472b6', -1)];
  }

  /** Build a launched projectile from a ship with the given angle (rad) and speed. */
  function launchProjectile(ship, angle, speed) {
    const off = ship.radius + 6;
    return new Projectile(
      ship.x + Math.cos(angle) * off,
      ship.y + Math.sin(angle) * off,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      1
    );
  }

  GW.Entities = {
    WORLD,
    createRng,
    Planet,
    Ship,
    Projectile,
    generatePlanets,
    createShips,
    launchProjectile,
  };
})();
