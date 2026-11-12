/**
 * Gravity Wars — Weapons
 * Four ordnance types. Exposed as window.GW.Weapons.
 * DOM-free: builds projectiles, handles per-weapon flight rules (split, bounce).
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});
  const { Physics, Entities } = GW;

  const SPLIT_DELAY = 1.2; // seconds
  const SPLIT_SPREAD = 0.3; // radians between sub-munitions

  const TYPES = {
    plasma: {
      id: 'plasma', name: 'Plasma', desc: 'Balanced damage, medium blast',
      mass: 1, gScale: 1, radius: 3, damage: 40, blast: 45, color: '#facc15',
    },
    torpedo: {
      id: 'torpedo', name: 'Torpedo', desc: 'Heavy: bends hard in gravity wells, big hit',
      mass: 4, gScale: 2.6, radius: 5, damage: 65, blast: 38, color: '#fb923c',
    },
    cluster: {
      id: 'cluster', name: 'Cluster', desc: 'Splits in 3 after 1.2s or on tap / Space',
      mass: 1, gScale: 1, radius: 3.5, damage: 0, blast: 0, color: '#a78bfa',
    },
    bouncer: {
      id: 'bouncer', name: 'Warp', desc: 'Ricochets once off a planet, then detonates',
      mass: 1, gScale: 1, radius: 3.5, damage: 38, blast: 40, color: '#38bdf8', bounces: 1,
    },
    // Internal: sub-munition released by the Cluster Splitter.
    bomblet: {
      id: 'bomblet', name: 'Bomblet', desc: '',
      mass: 0.5, gScale: 1, radius: 2.5, damage: 22, blast: 26, color: '#c4b5fd',
    },
  };

  /** Selectable weapons, in HUD order. */
  const ORDER = ['plasma', 'torpedo', 'cluster', 'bouncer'];

  function make(type, x, y, vx, vy) {
    const spec = TYPES[type];
    const p = new Entities.Projectile(x, y, vx, vy, spec.mass);
    p.type = type;
    p.spec = spec;
    p.radius = spec.radius;
    p.gScale = spec.gScale;
    p.bouncesLeft = spec.bounces || 0;
    p.split = false;
    return p;
  }

  /** Launch a weapon from a ship (angle in radians, speed in px/s). */
  function launch(type, ship, angle, speed) {
    const base = Entities.launchProjectile(ship, angle, speed);
    return make(type, base.x, base.y, base.vx, base.vy);
  }

  function shouldSplit(p) {
    return p.type === 'cluster' && !p.split && p.alive && p.age >= SPLIT_DELAY;
  }

  /** Split a cluster shell into 3 spreading bomblets. Marks the parent dead. */
  function split(p) {
    p.split = true;
    p.alive = false;
    const sp = Math.hypot(p.vx, p.vy);
    const base = Math.atan2(p.vy, p.vx);
    const out = [];
    for (let i = -1; i <= 1; i++) {
      const a = base + i * SPLIT_SPREAD;
      out.push(make('bomblet', p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp));
    }
    return out;
  }

  /**
   * Advance one frame. Returns a collision result when the projectile detonates
   * or leaves the world, else null. Handles the Warp Bouncer's single ricochet.
   */
  function step(p, planets, ships, world) {
    const hit = Physics.stepProjectile(p, planets, ships, world);
    if (hit && hit.type === 'planet' && p.bouncesLeft > 0) {
      p.bouncesLeft--;
      const pl = hit.target;
      let nx = p.x - pl.x;
      let ny = p.y - pl.y;
      const d = Math.hypot(nx, ny) || 1;
      nx /= d;
      ny /= d;
      const dot = p.vx * nx + p.vy * ny;
      p.vx -= 2 * dot * nx; // elastic reflection
      p.vy -= 2 * dot * ny;
      p.x = pl.x + nx * (pl.radius + p.radius + 1);
      p.y = pl.y + ny * (pl.radius + p.radius + 1);
      p.alive = true;
      p.hit = null;
      p.bounced = true;
      p.recordTrail();
      return null;
    }
    return hit;
  }

  /**
   * Damage a detonation at (x, y) deals to one ship: full damage on a direct
   * hit, otherwise linear splash falloff inside the blast radius.
   * Shared by the game loop and the AI solver so both always agree.
   */
  function damageFor(spec, hit, x, y, ship) {
    if (hit.type === 'ship' && hit.target === ship) return Math.round(spec.damage);
    const d = Math.hypot(ship.x - x, ship.y - y) - ship.radius;
    if (d < spec.blast) return Math.round(spec.damage * (1 - Math.max(0, d) / spec.blast));
    return 0;
  }

  GW.Weapons = { TYPES, ORDER, SPLIT_DELAY, launch, shouldSplit, split, step, damageFor };
})();
