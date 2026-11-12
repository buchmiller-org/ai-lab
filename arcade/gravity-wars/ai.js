/**
 * Gravity Wars — AI Targeting Solver
 * Exposed as window.GW.AI. DOM-free.
 *
 * Three opponent tiers:
 *   novice   – aims straight at the enemy with up to +/-15° / +/-15% error. No simulation.
 *   tactical – fast-forwards virtual shots (exact game physics) over a seed set of
 *              direct and high-arc launches, then refines the best one.
 *   ace      – like tactical, but when a planet blocks line-of-sight it seeds
 *              slingshot launches that bend around the blocker; with a clear line
 *              it also tries the heavy torpedo first.
 *
 * Performance model
 *   - A solve is a generator that yields after EVERY virtual projection.
 *   - A "job" drives that generator a few projections per rendered frame under a
 *     millisecond budget, so the UI thread never stalls on an aim calculation.
 *   - A hard cap (MAX_PROJECTIONS) bounds the total work per turn.
 *
 * Because projections reuse Weapons.step / Physics.stepProjectile, a predicted
 * trajectory is identical to the real one (the tier's aim error is applied last).
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});
  const { Physics, Weapons } = GW;

  /** Hard cap on virtual projections per AI turn. */
  const MAX_PROJECTIONS = 40;
  /** Minimum "thinking" time shown to the player (seconds). */
  const MIN_THINK_TIME = 0.8;
  /** Time-slicing: projections per rendered frame, and a wall-clock guard. */
  const PROJECTIONS_PER_FRAME = 2;
  const FRAME_BUDGET_MS = 4;
  /** Net predicted damage that counts as "a hit worth firing". */
  const HIT_MIN = 15;

  const TIERS = {
    novice: {
      id: 'novice', name: 'Novice', blurb: 'Points and prays. Big aiming errors.',
      angleErr: 15, powerErr: 0.15,
    },
    tactical: {
      id: 'tactical', name: 'Tactical', blurb: 'Simulates direct and lobbed shots.',
      angleErr: 2.2, powerErr: 0.03,
    },
    ace: {
      id: 'ace', name: 'Orbital Ace', blurb: 'Slingshots shots around planets.',
      angleErr: 0.35, powerErr: 0.01,
    },
  };

  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const noop = () => {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const norm360 = (a) => ((a % 360) + 360) % 360;

  /** Game-convention angle (deg, 0 = right, CCW positive) from one body to another. */
  function bearingDeg(from, to) {
    return (-Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  }

  /** Distance from point c to the segment a→b. */
  function distToSegment(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / l2, 0, 1);
    return Math.hypot(ax + t * dx - cx, ay + t * dy - cy);
  }

  /** Planets intersecting the straight shooter→enemy line, nearest the shooter first. */
  function findBlockers(ctx) {
    const { shooter, enemy, planets } = ctx;
    const out = [];
    for (const p of planets) {
      if (p.active === false || p.shield || !(p.mass > 0)) continue;
      const d = distToSegment(shooter.x, shooter.y, enemy.x, enemy.y, p.x, p.y);
      if (d < p.radius + 22) out.push(p);
    }
    out.sort((a, b) => Math.hypot(a.x - shooter.x, a.y - shooter.y) - Math.hypot(b.x - shooter.x, b.y - shooter.y));
    return out;
  }

  // ---------------------------------------------------------------------------
  // Virtual projection
  // ---------------------------------------------------------------------------

  /**
   * Fast-forward one shot with the real game physics and report the outcome.
   * Returns { enemyDmg, selfDmg, miss } where miss is the closest approach (px,
   * edge-to-edge) of any projectile to the enemy.
   */
  function project(ctx, weapon, angleDeg, power) {
    const { shooter, enemy, planets, world } = ctx;
    const targets = [shooter, enemy];
    const maxFrames = Math.ceil((ctx.maxFlight || 14) / Physics.FRAME_DT) + 1;
    const first = Weapons.launch(weapon, shooter, (-angleDeg * Math.PI) / 180, (power / 100) * ctx.maxSpeed);
    first.recordTrail = noop; // virtual shots never need a trail
    let projs = [first];
    let enemyDmg = 0;
    let selfDmg = 0;
    let miss = Infinity;

    for (let f = 0; f < maxFrames && projs.length; f++) {
      const spawned = [];
      for (const p of projs) {
        if (Weapons.shouldSplit(p)) {
          const kids = Weapons.split(p);
          for (const k of kids) k.recordTrail = noop;
          spawned.push(...kids);
          continue;
        }
        const hit = Weapons.step(p, planets, targets, world);
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y) - enemy.radius - p.radius;
        if (d < miss) miss = d;
        if (hit) {
          p.alive = false;
          if (hit.type !== 'bounds') {
            enemyDmg += Weapons.damageFor(p.spec, hit, p.x, p.y, enemy);
            selfDmg += Weapons.damageFor(p.spec, hit, p.x, p.y, shooter);
          }
        }
      }
      projs = projs.filter((p) => p.alive).concat(spawned);
    }
    return { enemyDmg, selfDmg, miss: Math.max(0, miss) };
  }

  // ---------------------------------------------------------------------------
  // Search primitives (generators: one `yield` per projection)
  // ---------------------------------------------------------------------------

  /** Simulate one candidate, score it (lower fitness = better) and yield. */
  function* evalCand(S, ctx, weapon, angle, power) {
    const c = { weapon, angle, power: clamp(power, 5, 100) };
    c.res = project(ctx, weapon, angle, c.power);
    c.net = c.res.enemyDmg - 1.5 * c.res.selfDmg;
    c.hit = c.net >= HIT_MIN;
    c.fit = c.net >= 1 ? -1000 - c.net : c.res.miss + (c.res.selfDmg > 0 ? 300 : 0);
    S.used++;
    if (!S.best || c.fit < S.best.fit) S.best = c;
    yield c;
    return c;
  }

  /** Coordinate pattern search on (angle, power) around a seed. */
  function* refine(S, ctx, seed, limit) {
    let cur = seed;
    let da = 10;
    let dp = 14;
    while (S.used < limit && !cur.hit) {
      let improved = false;
      const moves = [[da, 0], [-da, 0], [0, dp], [0, -dp]];
      for (const [sa, sp] of moves) {
        if (S.used >= limit) break;
        const c = yield* evalCand(S, ctx, cur.weapon, cur.angle + sa, cur.power + sp);
        if (c.fit < cur.fit) {
          cur = c;
          improved = true;
          if (cur.hit) break;
        }
      }
      if (!improved) {
        da *= 0.5;
        dp *= 0.5;
        if (da < 0.3) break;
      }
    }
    return cur;
  }

  /**
   * Evaluate a seed set, return early on the first hit, otherwise refine the two
   * most promising seeds. `limit` is an absolute S.used ceiling for this search.
   */
  function* search(S, ctx, weapon, seeds, limit) {
    const cands = [];
    for (const [a, p] of seeds) {
      if (S.used >= limit) break;
      const c = yield* evalCand(S, ctx, weapon, a, p);
      cands.push(c);
      if (c.hit) return c;
    }
    cands.sort((x, y) => x.fit - y.fit);
    const starts = cands.slice(0, 2);
    for (let i = 0; i < starts.length; i++) {
      const remaining = limit - S.used;
      if (remaining <= 0) break;
      const share = i === starts.length - 1 ? remaining : Math.ceil(remaining * 0.6);
      const r = yield* refine(S, ctx, starts[i], S.used + share);
      if (r.hit) return r;
    }
    return S.best;
  }

  // ---------------------------------------------------------------------------
  // Seed sets
  // ---------------------------------------------------------------------------

  /** Direct shots at three powers + high/low arcs either side of the bearing. */
  function directAndLobSeeds(b) {
    const seeds = [[b, 45], [b, 65], [b, 85]];
    for (const off of [28, -28, 55, -55]) {
      seeds.push([b + off, 60]);
      seeds.push([b + off, 85]);
    }
    return seeds;
  }

  /** Slingshot seeds: tangent launches around each blocker, plus a coarse fan. */
  function slingshotSeeds(ctx, blockers, b) {
    const { shooter } = ctx;
    const seeds = [];
    for (const bl of blockers.slice(0, 2)) {
      const bb = bearingDeg(shooter, bl);
      const dist = Math.hypot(bl.x - shooter.x, bl.y - shooter.y);
      const half = (Math.asin(Math.min(1, (bl.radius + 12) / dist)) * 180) / Math.PI;
      for (const side of [1, -1]) {
        for (const extra of [4, 16]) {
          for (const pw of [55, 82]) seeds.push([bb + side * (half + extra), pw]);
        }
      }
    }
    for (const off of [25, -25, 50, -50, 75, -75]) seeds.push([b + off, 75]);
    return seeds;
  }

  // ---------------------------------------------------------------------------
  // Tier solvers (generators returning a plan)
  // ---------------------------------------------------------------------------

  function* solveNovice(S, ctx, rand) {
    const b = bearingDeg(ctx.shooter, ctx.enemy);
    const dist = Math.hypot(ctx.enemy.x - ctx.shooter.x, ctx.enemy.y - ctx.shooter.y);
    return { weapon: 'plasma', angle: b, power: clamp(28 + (dist / ctx.world.width) * 62, 20, 95) };
  }

  function* solveTactical(S, ctx) {
    const b = bearingDeg(ctx.shooter, ctx.enemy);
    yield* search(S, ctx, 'plasma', directAndLobSeeds(b), S.limit);
    return S.best;
  }

  function* solveAce(S, ctx) {
    const b = bearingDeg(ctx.shooter, ctx.enemy);
    const blockers = findBlockers(ctx);
    if (blockers.length === 0) {
      // Clear line: try the hard-hitting torpedo first, then fall back to plasma.
      const seeds = [[b, 50], [b, 75], [b + 25, 70], [b - 25, 70]];
      yield* search(S, ctx, 'torpedo', seeds, Math.floor(S.limit / 2));
      if (!S.best || !S.best.hit) yield* search(S, ctx, 'plasma', directAndLobSeeds(b), S.limit);
    } else {
      yield* search(S, ctx, 'plasma', slingshotSeeds(ctx, blockers, b), S.limit);
    }
    return S.best;
  }

  /**
   * Create a time-sliced aiming job.
   *   ctx = { shooter, enemy, planets, world, maxSpeed, maxFlight, rand? }
   * Drive with job.step(maxProjections, maxMs) once per frame until job.done;
   * then read job.result = { angle, power, weapon, projections, predicted, solved }.
   */
  function createJob(tierId, ctx) {
    const tier = TIERS[tierId] || TIERS.tactical;
    const rand = ctx.rand || Math.random;
    const S = { used: 0, limit: MAX_PROJECTIONS, best: null };
    const solver = tier.id === 'novice' ? solveNovice : tier.id === 'ace' ? solveAce : solveTactical;
    const gen = solver(S, ctx, rand);
    const job = { tier, done: false, result: null, projections: 0 };

    function finish(plan) {
      const p = plan || S.best;
      const jitter = (amt) => (rand() * 2 - 1) * amt;
      job.projections = S.used;
      job.result = {
        weapon: p.weapon,
        angle: norm360(Math.round(p.angle + jitter(tier.angleErr))),
        power: clamp(Math.round(p.power * (1 + jitter(tier.powerErr))), 1, 100),
        projections: S.used,
        solved: !!p.hit,
        predicted: p.res ? { damage: p.res.enemyDmg, self: p.res.selfDmg, miss: Math.round(p.res.miss) } : null,
      };
      job.done = true;
    }

    job.step = function (maxProj, maxMs) {
      if (job.done) return true;
      const t0 = now();
      let n = 0;
      while (!job.done) {
        const r = gen.next();
        if (r.done) {
          finish(r.value);
          break;
        }
        n++;
        if (n >= (maxProj || 1) || now() - t0 >= (maxMs || 1e9)) break;
      }
      job.projections = S.used;
      return job.done;
    };

    return job;
  }

  GW.AI = {
    TIERS,
    ORDER: ['novice', 'tactical', 'ace'],
    MAX_PROJECTIONS,
    MIN_THINK_TIME,
    PROJECTIONS_PER_FRAME,
    FRAME_BUDGET_MS,
    createJob,
    project,
    findBlockers,
  };
})();
