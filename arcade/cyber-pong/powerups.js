/**
 * Cyber Pong — Mid-Court Neon Power-Up Anomalies
 *
 * Manages spawning, lifecycle, and resolution of 5 mid-court power-ups.
 * Exposed as window.CP.PowerUps.
 */
(function () {
  'use strict';

  const CP = (window.CP = window.CP || {});

  const TYPES = {
    overcharge: {
      id: 'overcharge',
      color: '#fb923c',
      glyph: '⚡',
      label: 'OVERCHARGE SMASH',
    },
    expand: {
      id: 'expand',
      color: '#06d6a0',
      glyph: '↕',
      label: 'NANO EXPAND',
    },
    multiball: {
      id: 'multiball',
      color: '#a855f7',
      glyph: '✦',
      label: 'SPLIT MULTIBALL',
    },
    barrier: {
      id: 'barrier',
      color: '#38bdf8',
      glyph: '🛡',
      label: 'LASER BARRIER',
    },
    warp: {
      id: 'warp',
      color: '#f472b6',
      glyph: '≫',
      label: 'PHASE WARP',
    },
  };

  const ORDER = ['overcharge', 'expand', 'multiball', 'barrier', 'warp'];
  const MAX_ANOMALIES = 2;
  const ANOMALY_RADIUS = 19;
  const ANOMALY_LIFE = 11;
  const SPAWN_INTERVAL = 4.8;
  const INITIAL_SPAWN_DELAY = 2.6;
  const MAX_ACTIVE_BALLS = 3;

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  function createState() {
    return {
      anomalies: [],
      spawnTimer: INITIAL_SPAWN_DELAY,
    };
  }

  function resetState(state) {
    state.anomalies = [];
    state.spawnTimer = INITIAL_SPAWN_DELAY;
  }

  function pickType(existing) {
    const used = new Set(existing.map((a) => a.type));
    const candidates = ORDER.filter((t) => !used.has(t));
    const pool = candidates.length ? candidates : ORDER;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnAnomaly(state, world) {
    const type = pickType(state.anomalies);
    const spec = TYPES[type];
    const minX = 270;
    const maxX = Math.max(minX + 10, world.width - 270);
    const minY = 75;
    const maxY = Math.max(minY + 10, world.height - 75);

    let x = minX + Math.random() * (maxX - minX);
    let y = minY + Math.random() * (maxY - minY);

    for (let attempt = 0; attempt < 8; attempt++) {
      const tx = minX + Math.random() * (maxX - minX);
      const ty = minY + Math.random() * (maxY - minY);
      const tooClose = state.anomalies.some((a) => Math.hypot(a.x - tx, a.y - ty) < 84);
      if (!tooClose) {
        x = tx;
        y = ty;
        break;
      }
    }

    state.anomalies.push({
      type,
      spec,
      x,
      y,
      radius: ANOMALY_RADIUS,
      age: 0,
      maxLife: ANOMALY_LIFE,
      alive: true,
    });
  }

  /** Advance anomaly timers and spawn mid-court power-ups in Arcade mode. */
  function step(state, ruleset, roundActive, dt, world) {
    if (ruleset !== 'arcade') {
      if (state.anomalies.length) state.anomalies = [];
      return;
    }
    if (!roundActive) return;

    for (let i = state.anomalies.length - 1; i >= 0; i--) {
      const anom = state.anomalies[i];
      anom.age += dt;
      if (!anom.alive || anom.age >= anom.maxLife) {
        state.anomalies.splice(i, 1);
      }
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = SPAWN_INTERVAL;
      if (state.anomalies.length < MAX_ANOMALIES) {
        spawnAnomaly(state, world);
      }
    }
  }

  /** Apply a collected anomaly effect and return HUD/FX metadata. */
  function applyPickup(anomaly, ball, balls, paddles, world) {
    const { Physics } = CP;
    anomaly.alive = false;

    const owner =
      ball.lastHitBy !== null && ball.lastHitBy !== undefined
        ? ball.lastHitBy
        : ball.vx >= 0
          ? 0
          : 1;
    const foe = 1 - owner;
    const spec = anomaly.spec;
    let warpBeam = null;

    switch (anomaly.type) {
      case 'overcharge': {
        const cap = Physics.MAX_BALL_SPEED * 1.15;
        const curSpd = Math.hypot(ball.vx, ball.vy) || Physics.INITIAL_BALL_SPEED;
        const boost = Math.min(cap, curSpd * 1.28) / curSpd;
        ball.vx *= boost;
        ball.vy *= boost;
        ball.speed = Math.hypot(ball.vx, ball.vy);
        ball.overcharged = true;
        ball.spin += (ball.vy >= 0 ? 1 : -1) * 0.75;

        const movingTowardOwner =
          (owner === 0 && ball.vx < 0) || (owner === 1 && ball.vx > 0);
        if (movingTowardOwner) {
          paddles[owner].overcharge = true;
        }
        break;
      }

      case 'expand': {
        paddles[owner].sizeMult = 1.45;
        paddles[owner].sizeTimer = 9;
        paddles[foe].sizeMult = 0.72;
        paddles[foe].sizeTimer = 7;
        break;
      }

      case 'multiball': {
        const activeCount = balls.filter((b) => b.alive).length;
        if (activeCount < MAX_ACTIVE_BALLS) {
          const dirX = ball.vx >= 0 ? 1 : -1;
          const spd = Math.hypot(ball.vx, ball.vy) || Physics.INITIAL_BALL_SPEED;
          const baseAngle = Math.atan2(ball.vy, Math.abs(ball.vx));
          const spread = (22 * Math.PI) / 180;
          const sign = baseAngle > 0.35 ? -1 : baseAngle < -0.35 ? 1 : Math.random() > 0.5 ? 1 : -1;
          const twinAngle = clamp(baseAngle + sign * spread, -1.08, 1.08);
          const twin = Physics.createBall(
            ball.x,
            ball.y,
            Math.cos(twinAngle) * spd * dirX,
            Math.sin(twinAngle) * spd,
            owner
          );
          twin.overcharged = ball.overcharged;
          twin.spin = -ball.spin * 0.5;
          balls.push(twin);
        }
        break;
      }

      case 'barrier': {
        paddles[owner].shieldTimer = 11;
        paddles[owner].shieldHp = 1;
        break;
      }

      case 'warp': {
        const x1 = ball.x;
        const y1 = ball.y;
        const dirX = ball.vx >= 0 ? 1 : -1;
        const blinkX = clamp(ball.x + dirX * 135, 130, world.width - 130);
        const shiftY = (Math.random() > 0.5 ? 1 : -1) * (42 + Math.random() * 44);
        const blinkY = clamp(ball.y + shiftY, ball.radius + 26, world.height - ball.radius - 26);
        ball.x = blinkX;
        ball.y = blinkY;
        ball.warpCooldown = 0.2;
        ball.trail = [{ x: blinkX, y: blinkY, overcharged: ball.overcharged }];
        warpBeam = { x1, y1, x2: blinkX, y2: blinkY, color: spec.color };
        break;
      }

      default:
        break;
    }

    return {
      owner,
      type: anomaly.type,
      label: spec.label,
      color: spec.color,
      warpBeam,
    };
  }

  CP.PowerUps = {
    TYPES,
    ORDER,
    createState,
    resetState,
    step,
    applyPickup,
  };
})();
