/**
 * Cyber Pong — Deterministic Physics Engine
 *
 * Pure, DOM-free physics with fixed 1/60 timestep and collision sub-stepping.
 * Units: logical pixels and seconds. Exposed as window.CP.Physics.
 */
(function () {
  'use strict';

  const CP = (window.CP = window.CP || {});

  const WORLD = { width: 800, height: 500 };
  const FRAME_DT = 1 / 60;
  const SUBSTEPS = 4;

  const WIN_SCORE = 5;
  const PADDLE_WIDTH = 14;
  const PADDLE_MARGIN = 26;
  const BASE_PADDLE_HEIGHT = 86;
  const MIN_PADDLE_HEIGHT = 48;
  const MAX_PADDLE_HEIGHT = 136;
  const PADDLE_SPEED = 430;

  const BALL_RADIUS = 7;
  const INITIAL_BALL_SPEED = 370;
  const MAX_BALL_SPEED = 880;
  const RALLY_ACCEL = 1.045;
  const BARRIER_OFFSET = 12;

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  /** Create a paddle descriptor for side 0 (left) or side 1 (right). */
  function createPaddle(side) {
    return {
      side,
      x: side === 0 ? PADDLE_MARGIN : WORLD.width - PADDLE_MARGIN - PADDLE_WIDTH,
      y: (WORLD.height - BASE_PADDLE_HEIGHT) / 2,
      width: PADDLE_WIDTH,
      height: BASE_PADDLE_HEIGHT,
      baseHeight: BASE_PADDLE_HEIGHT,
      vy: 0,
      speed: PADDLE_SPEED,
      color: side === 0 ? '#06d6a0' : '#f472b6',
      targetY: null,
      trackMult: 2.3,
      overcharge: false,
      sizeTimer: 0,
      sizeMult: 1,
      shieldTimer: 0,
      shieldHp: 0,
    };
  }

  /** Create a ball entity with velocity and trail state. */
  function createBall(x, y, vx, vy, lastHitBy) {
    return {
      x,
      y,
      vx,
      vy,
      radius: BALL_RADIUS,
      speed: Math.hypot(vx, vy),
      spin: 0,
      overcharged: false,
      lastHitBy: lastHitBy === undefined ? null : lastHitBy,
      trail: [],
      alive: true,
      warpCooldown: 0,
    };
  }

  /** Serve a fresh ball from court center toward `towardSide` (0 or 1). */
  function serveBall(towardSide) {
    const dir = towardSide === 0 ? -1 : 1;
    const angle = (Math.random() * 2 - 1) * 0.28;
    const vx = Math.cos(angle) * INITIAL_BALL_SPEED * dir;
    const vy = Math.sin(angle) * INITIAL_BALL_SPEED;
    return createBall(WORLD.width / 2, WORLD.height / 2, vx, vy, 1 - towardSide);
  }

  /** Advance one paddle by `dt` seconds using pointer targetY or keyboard inputDy (-1..1). */
  function stepPaddle(paddle, inputDy, dt) {
    if (paddle.sizeTimer > 0) {
      paddle.sizeTimer = Math.max(0, paddle.sizeTimer - dt);
      if (paddle.sizeTimer === 0) paddle.sizeMult = 1;
    }
    if (paddle.shieldTimer > 0) {
      paddle.shieldTimer = Math.max(0, paddle.shieldTimer - dt);
      if (paddle.shieldTimer === 0) paddle.shieldHp = 0;
    }

    const desiredH = clamp(
      paddle.baseHeight * (paddle.sizeTimer > 0 ? paddle.sizeMult : 1),
      MIN_PADDLE_HEIGHT,
      MAX_PADDLE_HEIGHT
    );
    if (Math.abs(paddle.height - desiredH) > 0.1) {
      const center = paddle.y + paddle.height / 2;
      paddle.height += (desiredH - paddle.height) * Math.min(1, dt * 10);
      paddle.y = clamp(center - paddle.height / 2, 0, WORLD.height - paddle.height);
    } else {
      paddle.height = desiredH;
    }

    const prevY = paddle.y;
    const maxY = WORLD.height - paddle.height;

    if (paddle.targetY !== null && Number.isFinite(paddle.targetY)) {
      const targetTop = clamp(paddle.targetY - paddle.height / 2, 0, maxY);
      const diff = targetTop - paddle.y;
      const maxStep = paddle.speed * (paddle.trackMult || 2.3) * dt;
      if (Math.abs(diff) <= maxStep) {
        paddle.y = targetTop;
      } else {
        paddle.y += Math.sign(diff) * maxStep;
      }
    } else if (inputDy !== 0) {
      paddle.y += inputDy * paddle.speed * dt;
    }

    paddle.y = clamp(paddle.y, 0, maxY);
    paddle.vy = dt > 0 ? (paddle.y - prevY) / dt : 0;
  }

  function applyPaddleBounce(ball, paddle, side, hooks) {
    ball.x = side === 0 ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
    const rel = clamp((ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2), -1, 1);
    const bounceAngle = rel * ((58 * Math.PI) / 180);

    let nextSpeed = Math.min(
      MAX_BALL_SPEED,
      Math.max(INITIAL_BALL_SPEED, Math.hypot(ball.vx, ball.vy)) * RALLY_ACCEL
    );

    if (paddle.overcharge) {
      paddle.overcharge = false;
      ball.overcharged = true;
      nextSpeed = Math.min(MAX_BALL_SPEED * 1.15, nextSpeed * 1.32);
      ball.spin = (rel * 0.65 + clamp(paddle.vy / 500, -1, 1) * 0.85) * 1.45;
    } else {
      ball.overcharged = false;
      ball.spin = rel * 0.25 + clamp(paddle.vy / 650, -0.6, 0.6);
    }

    const dirX = side === 0 ? 1 : -1;
    ball.vx = Math.cos(bounceAngle) * nextSpeed * dirX;
    ball.vy = Math.sin(bounceAngle) * nextSpeed;
    ball.speed = nextSpeed;
    ball.lastHitBy = side;

    if (hooks.onPaddleHit) hooks.onPaddleHit(ball, paddle, side);
  }

  /** Step all active balls across SUBSTEPS and dispatch collision/scoring hooks. */
  function stepBalls(balls, paddles, anomalies, dt, hooks) {
    const cb = hooks || {};
    const subDt = dt / SUBSTEPS;

    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      if (!ball.alive) continue;

      if (ball.warpCooldown > 0) {
        ball.warpCooldown = Math.max(0, ball.warpCooldown - dt);
      }

      for (let s = 0; s < SUBSTEPS; s++) {
        if (!ball.alive) break;

        if (ball.spin !== 0) {
          const spd = Math.hypot(ball.vx, ball.vy) || ball.speed || INITIAL_BALL_SPEED;
          ball.vy += ball.spin * 220 * subDt;
          const maxVy = spd * 0.85;
          if (Math.abs(ball.vy) > maxVy) ball.vy = Math.sign(ball.vy) * maxVy;
          const dirX = ball.vx >= 0 ? 1 : -1;
          ball.vx = dirX * Math.sqrt(Math.max(1, spd * spd - ball.vy * ball.vy));
        }

        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;
        ball.speed = Math.hypot(ball.vx, ball.vy);

        // Top & bottom rails
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
          ball.spin *= 0.65;
          if (cb.onWallHit) cb.onWallHit(ball);
        } else if (ball.y + ball.radius >= WORLD.height) {
          ball.y = WORLD.height - ball.radius;
          ball.vy = -Math.abs(ball.vy);
          ball.spin *= 0.65;
          if (cb.onWallHit) cb.onWallHit(ball);
        }

        // Paddle collisions
        const p0 = paddles[0];
        if (
          ball.vx < 0 &&
          ball.x - ball.radius <= p0.x + p0.width &&
          ball.x + ball.radius >= p0.x &&
          ball.y + ball.radius >= p0.y &&
          ball.y - ball.radius <= p0.y + p0.height
        ) {
          applyPaddleBounce(ball, p0, 0, cb);
        }

        const p1 = paddles[1];
        if (
          ball.vx > 0 &&
          ball.x + ball.radius >= p1.x &&
          ball.x - ball.radius <= p1.x + p1.width &&
          ball.y + ball.radius >= p1.y &&
          ball.y - ball.radius <= p1.y + p1.height
        ) {
          applyPaddleBounce(ball, p1, 1, cb);
        }

        // Goal-line laser barriers
        if (
          p0.shieldTimer > 0 &&
          p0.shieldHp > 0 &&
          ball.vx < 0 &&
          ball.x - ball.radius <= BARRIER_OFFSET
        ) {
          ball.x = BARRIER_OFFSET + ball.radius;
          ball.vx = Math.abs(ball.vx);
          p0.shieldHp -= 1;
          if (p0.shieldHp <= 0) {
            p0.shieldHp = 0;
            p0.shieldTimer = 0;
          }
          ball.lastHitBy = 0;
          if (cb.onShieldHit) cb.onShieldHit(ball, 0);
        }

        if (
          p1.shieldTimer > 0 &&
          p1.shieldHp > 0 &&
          ball.vx > 0 &&
          ball.x + ball.radius >= WORLD.width - BARRIER_OFFSET
        ) {
          ball.x = WORLD.width - BARRIER_OFFSET - ball.radius;
          ball.vx = -Math.abs(ball.vx);
          p1.shieldHp -= 1;
          if (p1.shieldHp <= 0) {
            p1.shieldHp = 0;
            p1.shieldTimer = 0;
          }
          ball.lastHitBy = 1;
          if (cb.onShieldHit) cb.onShieldHit(ball, 1);
        }

        // Mid-court anomalies
        if (anomalies && anomalies.length) {
          for (let aIdx = 0; aIdx < anomalies.length; aIdx++) {
            const anom = anomalies[aIdx];
            if (anom.alive === false) continue;
            const dx = ball.x - anom.x;
            const dy = ball.y - anom.y;
            const rr = ball.radius + anom.radius;
            if (dx * dx + dy * dy <= rr * rr) {
              if (cb.onAnomalyHit) cb.onAnomalyHit(ball, anom);
            }
          }
        }

        // Goal lines
        if (ball.x + ball.radius < 0) {
          ball.alive = false;
          if (cb.onScore) cb.onScore(1, ball);
          break;
        }
        if (ball.x - ball.radius > WORLD.width) {
          ball.alive = false;
          if (cb.onScore) cb.onScore(0, ball);
          break;
        }
      }

      if (ball.alive) {
        ball.trail.push({ x: ball.x, y: ball.y, overcharged: ball.overcharged });
        if (ball.trail.length > 22) ball.trail.shift();
      }
    }
  }

  CP.Physics = {
    WORLD,
    FRAME_DT,
    SUBSTEPS,
    WIN_SCORE,
    PADDLE_WIDTH,
    PADDLE_MARGIN,
    BASE_PADDLE_HEIGHT,
    MIN_PADDLE_HEIGHT,
    MAX_PADDLE_HEIGHT,
    PADDLE_SPEED,
    BALL_RADIUS,
    INITIAL_BALL_SPEED,
    MAX_BALL_SPEED,
    RALLY_ACCEL,
    BARRIER_OFFSET,
    createPaddle,
    createBall,
    serveBall,
    stepPaddle,
    stepBalls,
  };
})();
