/**
 * Cyber Pong — 3-Tier AI Opponent Controller
 *
 * Tiers: Rookie, Cyber, Overdrive.
 * Reaction-window paced tracking with wall-bounce & spin prediction.
 * Exposed as window.CP.AI.
 */
(function () {
  'use strict';

  const CP = (window.CP = window.CP || {});

  const TIERS = {
    rookie: {
      id: 'rookie',
      name: 'Rookie',
      blurb: 'Follows the ball with reaction lag and wide aim error.',
      speedMult: 0.7,
      reactionInterval: 0.16,
      jitter: 26,
      deadzone: 16,
      predictBounces: false,
      seekPowerups: false,
    },
    cyber: {
      id: 'cyber',
      name: 'Cyber',
      blurb: 'Predicts wall reflections and angles returns away from you.',
      speedMult: 0.94,
      reactionInterval: 0.07,
      jitter: 10,
      deadzone: 7,
      predictBounces: true,
      seekPowerups: false,
    },
    overdrive: {
      id: 'overdrive',
      name: 'Overdrive',
      blurb: 'Simulates spin curves, snipes corners, and hunts anomalies.',
      speedMult: 1.14,
      reactionInterval: 0.02,
      jitter: 2,
      deadzone: 3,
      predictBounces: true,
      seekPowerups: true,
    },
  };

  const ORDER = ['rookie', 'cyber', 'overdrive'];

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  /** Fold a projected Y coordinate across top/bottom court bounds. */
  function reflectY(rawY, minY, maxY) {
    const span = maxY - minY;
    if (span <= 0) return minY;
    let y = (rawY - minY) % (span * 2);
    if (y < 0) y += span * 2;
    if (y > span) y = span * 2 - y;
    return minY + y;
  }

  /** Predict where `ball` will cross `targetX`. */
  function predictInterceptY(ball, targetX, tier, world) {
    if (!tier.predictBounces || ball.vx <= 0) return ball.y;

    const minY = ball.radius;
    const maxY = world.height - ball.radius;

    // Overdrive simulates curved trajectories when spin is present
    if (tier.id === 'overdrive' && Math.abs(ball.spin) > 0.05) {
      let x = ball.x;
      let y = ball.y;
      let vx = ball.vx;
      let vy = ball.vy;
      let spin = ball.spin;
      const stepDt = 1 / 60;
      for (let i = 0; i < 180; i++) {
        const spd = Math.hypot(vx, vy) || ball.speed || 370;
        vy += spin * 220 * stepDt;
        const maxVy = spd * 0.85;
        if (Math.abs(vy) > maxVy) vy = Math.sign(vy) * maxVy;
        vx = Math.sqrt(Math.max(1, spd * spd - vy * vy));
        x += vx * stepDt;
        y += vy * stepDt;
        if (y <= minY) {
          y = minY + (minY - y);
          vy = Math.abs(vy);
          spin *= 0.65;
        } else if (y >= maxY) {
          y = maxY - (y - maxY);
          vy = -Math.abs(vy);
          spin *= 0.65;
        }
        if (x >= targetX) break;
      }
      return clamp(y, minY, maxY);
    }

    const time = Math.max(0, (targetX - ball.x) / Math.max(1, ball.vx));
    return reflectY(ball.y + ball.vy * time, minY, maxY);
  }

  /** Choose the most urgent incoming ball for the right-side AI paddle. */
  function selectTargetBall(balls, aiPaddle) {
    let best = null;
    let bestEta = Infinity;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (!b.alive) continue;
      if (b.vx > 0 && b.x <= aiPaddle.x + aiPaddle.width) {
        const eta = (aiPaddle.x - b.x) / Math.max(1, b.vx);
        if (eta < bestEta) {
          bestEta = eta;
          best = b;
        }
      }
    }
    return best;
  }

  /** Compute tactical vertical offset on the paddle face to aim the return. */
  function computeAimOffset(aiPaddle, playerPaddle, interceptY, anomalies, tier, world) {
    if (tier.id === 'rookie') return 0;

    let aimTargetY =
      playerPaddle.y + playerPaddle.height / 2 < world.height * 0.5
        ? world.height * 0.82
        : world.height * 0.18;

    if (tier.seekPowerups && anomalies && anomalies.length > 0) {
      let closest = null;
      let closestDist = Infinity;
      for (let i = 0; i < anomalies.length; i++) {
        const a = anomalies[i];
        if (a.alive === false) continue;
        const d = Math.hypot(aiPaddle.x - a.x, interceptY - a.y);
        if (d < closestDist) {
          closestDist = d;
          closest = a;
        }
      }
      if (closest) {
        aimTargetY = closest.y;
        const dx = Math.max(80, aiPaddle.x - closest.x);
        const angle = Math.atan2(aimTargetY - interceptY, dx);
        const maxAngle = (58 * Math.PI) / 180;
        const rel = clamp(angle / maxAngle, -0.78, 0.78);
        return -rel * (aiPaddle.height * 0.5);
      }
    }

    const dx = Math.max(120, aiPaddle.x - playerPaddle.x);
    const angle = Math.atan2(aimTargetY - interceptY, dx);
    const maxAngle = (58 * Math.PI) / 180;
    const rel = clamp(angle / maxAngle, -0.72, 0.72);
    return -rel * (aiPaddle.height * 0.5);
  }

  function createController(tierId) {
    const tier = TIERS[tierId] || TIERS.cyber;
    return {
      tier,
      timer: 0,
      aimY: 250,
      jitterOffset: 0,
    };
  }

  /** Update AI paddle targetY on reaction intervals. */
  function step(controller, aiPaddle, playerPaddle, balls, anomalies, roundActive, dt, world) {
    const { Physics } = CP;
    const tier = controller.tier;

    aiPaddle.speed = Physics.PADDLE_SPEED * tier.speedMult;
    aiPaddle.trackMult = 1;

    if (!roundActive) {
      aiPaddle.targetY = world.height / 2;
      return;
    }

    controller.timer -= dt;
    const incoming = selectTargetBall(balls, aiPaddle);

    if (controller.timer <= 0) {
      controller.timer = tier.reactionInterval;
      controller.jitterOffset = (Math.random() * 2 - 1) * tier.jitter;

      if (incoming) {
        const contactX = aiPaddle.x - incoming.radius;
        const interceptY = predictInterceptY(incoming, contactX, tier, world);
        const offset = computeAimOffset(aiPaddle, playerPaddle, interceptY, anomalies, tier, world);
        controller.aimY = clamp(
          interceptY + offset + controller.jitterOffset,
          aiPaddle.height * 0.4,
          world.height - aiPaddle.height * 0.4
        );
      } else {
        // Drift near center while ball heads toward human side
        controller.aimY = world.height * 0.5 + controller.jitterOffset * 0.5;
      }
    }

    const currentCenter = aiPaddle.y + aiPaddle.height / 2;
    if (Math.abs(controller.aimY - currentCenter) > tier.deadzone) {
      aiPaddle.targetY = controller.aimY;
    } else {
      aiPaddle.targetY = currentCenter;
    }
  }

  CP.AI = {
    TIERS,
    ORDER,
    createController,
    step,
  };
})();
