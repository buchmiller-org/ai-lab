/**
 * Gravity Wars — Physics Engine
 *
 * Pure, DOM-free, deterministic N-body gravity + collision logic.
 * Units: pixels and seconds. Exposed as window.GW.Physics.
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});

  const Physics = {
    /** Gravitational constant (tuned for pixel/second units). */
    G: 1,
    /** Softening length (px) — prevents singular acceleration near cores. */
    EPSILON: 12,
    /** Fixed simulation step per rendered frame (seconds). */
    FRAME_DT: 1 / 60,
    /** Sub-steps per fixed frame step (4–8 recommended). */
    SUBSTEPS: 8,
    /** Extra margin outside the world box before a body counts as lost. */
    BOUNDS_MARGIN: 120,
    /** Hard cap on speed (px/s) to keep sub-step travel below collision radii. */
    MAX_SPEED: 900,
  };

  /**
   * Gravitational acceleration at (x, y) from all active bodies.
   *   a = G * M / (r^2 + eps^2) * r_hat   (r_hat = unit vector toward body)
   * Written without a sqrt-free shortcut so direction stays exact:
   *   a_vec = G * M * d / ((r^2 + eps^2) * r)
   */
  Physics.accelerationAt = function (x, y, bodies, out) {
    out = out || { x: 0, y: 0 };
    const eps2 = Physics.EPSILON * Physics.EPSILON;
    let ax = 0;
    let ay = 0;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.active === false || b.mass === 0) continue; // massless bodies (shield pylons) are solid but exert no pull
      const dx = b.x - x;
      const dy = b.y - y;
      const r2 = dx * dx + dy * dy;
      const r = Math.sqrt(r2);
      if (r < 1e-9) continue;
      const mag = (Physics.G * b.mass) / (r2 + eps2);
      ax += (mag * dx) / r;
      ay += (mag * dy) / r;
    }
    out.x = ax;
    out.y = ay;
    return out;
  };

  const _a0 = { x: 0, y: 0 };
  const _a1 = { x: 0, y: 0 };

  /**
   * Advance a point-mass (anything with x,y,vx,vy) by dt using velocity Verlet
   * (symplectic, time-reversible: good energy behaviour for orbits).
   */
  Physics.stepVerlet = function (p, bodies, dt) {
    // Optional per-body gravity multiplier (e.g. heavy ordnance feels wells more).
    const g = p.gScale === undefined ? 1 : p.gScale;
    Physics.accelerationAt(p.x, p.y, bodies, _a0);
    _a0.x *= g;
    _a0.y *= g;
    p.x += p.vx * dt + 0.5 * _a0.x * dt * dt;
    p.y += p.vy * dt + 0.5 * _a0.y * dt * dt;
    Physics.accelerationAt(p.x, p.y, bodies, _a1);
    _a1.x *= g;
    _a1.y *= g;
    p.vx += 0.5 * (_a0.x + _a1.x) * dt;
    p.vy += 0.5 * (_a0.y + _a1.y) * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > Physics.MAX_SPEED) {
      const k = Physics.MAX_SPEED / sp;
      p.vx *= k;
      p.vy *= k;
    }
  };

  /** Circle-circle intersection. */
  Physics.circlesOverlap = function (a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rr = a.radius + b.radius;
    return dx * dx + dy * dy <= rr * rr;
  };

  /** True if the circle is beyond the world box expanded by `margin`. */
  Physics.outOfBounds = function (p, world, margin) {
    const m = margin === undefined ? Physics.BOUNDS_MARGIN : margin;
    return p.x < -m || p.y < -m || p.x > world.width + m || p.y > world.height + m;
  };

  /**
   * Check a projectile against planets, ships and bounds.
   * Returns { type: 'planet'|'ship'|'bounds', target } or null.
   */
  Physics.detectCollision = function (proj, planets, ships, world) {
    for (let i = 0; i < planets.length; i++) {
      if (planets[i].active !== false && Physics.circlesOverlap(proj, planets[i])) {
        return { type: 'planet', target: planets[i] };
      }
    }
    for (let i = 0; i < ships.length; i++) {
      if (ships[i].alive !== false && Physics.circlesOverlap(proj, ships[i])) {
        return { type: 'ship', target: ships[i] };
      }
    }
    if (Physics.outOfBounds(proj, world)) return { type: 'bounds', target: null };
    return null;
  };

  /**
   * Advance a projectile by one fixed frame step (FRAME_DT) using SUBSTEPS
   * Verlet sub-steps, checking collisions after every sub-step so fast
   * projectiles cannot tunnel through planets.
   * Returns the collision result (and marks the projectile dead) or null.
   */
  Physics.stepProjectile = function (proj, planets, ships, world) {
    const h = Physics.FRAME_DT / Physics.SUBSTEPS;
    for (let s = 0; s < Physics.SUBSTEPS; s++) {
      Physics.stepVerlet(proj, planets, h);
      proj.age += h;
      const hit = Physics.detectCollision(proj, planets, ships, world);
      if (hit) {
        proj.alive = false;
        proj.hit = hit;
        return hit;
      }
    }
    proj.recordTrail();
    return null;
  };

  GW.Physics = Physics;
})();
