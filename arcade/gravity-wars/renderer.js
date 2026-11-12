/**
 * Gravity Wars — Neon Visual FX & Canvas Renderer
 * Exposed as window.GW.Renderer.
 *
 * Visual Features:
 *   - Gravity Well Equipotential Lines: concentric pulsing contour rings around planets
 *     scaled by mass to visualize gravitational pull.
 *   - Glowing Projectile Trails: multi-segmented fading neon trails with outer bloom
 *     and bright core behind moving ordnance.
 *   - Black Hole Accretion Disk: swirling relativistic plasma arcs, lensing distortion
 *     halo, and photon ring around singularities.
 *   - Neon Particle Burst Explosions: radial spark particles, dual expanding shockwave
 *     rings, flash core, and damped camera screen shake.
 */
(function () {
  'use strict';

  const GW = (window.GW = window.GW || {});
  const { Entities, Weapons } = GW;
  const { WORLD } = Entities;

  const MAX_DRAG = 160;

  // Deterministic starfield with subtle twinkle phases
  const stars = (function () {
    const rand = Entities.createRng(99);
    const arr = [];
    for (let i = 0; i < 110; i++) {
      arr.push({
        x: rand() * WORLD.width,
        y: rand() * WORLD.height,
        r: rand() * 1.35 + 0.25,
        a: rand() * 0.5 + 0.18,
        phase: rand() * Math.PI * 2,
        speed: 0.8 + rand() * 1.8,
        tint: i % 9 === 0 ? '#38bdf8' : i % 13 === 0 ? '#a78bfa' : '#ffffff',
      });
    }
    return arr;
  })();

  // Active particle bursts and camera shake trauma
  let particles = [];
  let shakeTrauma = 0;
  let shakeTime = 0;

  function resetFX() {
    particles = [];
    shakeTrauma = 0;
  }

  /** Add camera screen shake trauma in [0..1]. */
  function addShake(amount) {
    shakeTrauma = Math.min(1, shakeTrauma + (amount || 0.35));
  }

  /**
   * Spawn a neon particle burst and shockwave explosion at (x, y).
   * Pushes the shockwave/flash descriptor into `effects` and sparks into `particles`.
   */
  function spawnExplosion(effects, x, y, radius, color, major) {
    const r = radius || 40;
    const col = color || '#facc15';
    effects.push({
      kind: 'boom',
      x,
      y,
      r,
      t: 0,
      life: major ? 0.95 : 0.68,
      color: col,
      major: !!major,
    });

    const count = major ? 42 : 24;
    const palettes = [col, '#ffffff', '#facc15', '#38bdf8', '#f472b6'];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const spd = (45 + Math.random() * (major ? 220 : 145)) * (0.65 + (r / 60) * 0.5);
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 1.4 + Math.random() * (major ? 2.6 : 1.8),
        t: 0,
        life: 0.38 + Math.random() * (major ? 0.55 : 0.35),
        color: i % 4 === 0 ? '#ffffff' : i % 7 === 0 ? palettes[i % palettes.length] : col,
      });
    }

    addShake(major ? 0.72 : Math.min(0.5, 0.2 + (r / 90) * 0.35));
  }

  /** Advance particle physics and decay camera shake by dt (seconds). */
  function stepFX(dt) {
    shakeTime += dt;
    if (shakeTrauma > 0) {
      shakeTrauma = Math.max(0, shakeTrauma - dt * 1.85);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.t += dt;
      if (pt.t >= pt.life) {
        particles.splice(i, 1);
        continue;
      }
      const drag = Math.pow(0.08, dt);
      pt.vx *= drag;
      pt.vy *= drag;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
  }

  function hexToRgba(hex, alpha) {
    const a = Math.max(0, Math.min(1, alpha));
    if (!hex || hex[0] !== '#') return 'rgba(250,204,21,' + a.toFixed(3) + ')';
    const clean = hex.slice(1);
    const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function drawStars(ctx, t) {
    for (const s of stars) {
      const twinkle = s.a * (0.72 + 0.28 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = s.tint === '#ffffff' ? 'rgba(255,255,255,' + twinkle.toFixed(3) + ')' : hexToRgba(s.tint, twinkle);
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  /**
   * Gravity Well Equipotential Lines:
   * Render faint concentric glowing contour rings pulsing around each planet/black hole
   * to visualize its gravitational field strength and reach.
   */
  function drawGravityWells(ctx, planets, t) {
    ctx.save();
    for (let idx = 0; idx < planets.length; idx++) {
      const p = planets[idx];
      if (p.active === false || p.shield || !(p.mass > 0)) continue;

      // Determine contour count and max reach from gravitational mass
      const massNorm = Math.min(1, Math.sqrt(p.mass) / 1800);
      const ringCount = p.blackHole ? 5 : 4;
      const maxSpan = p.blackHole ? p.radius * 6.8 : p.radius * (1.85 + massNorm * 1.45);
      const baseColor = p.blackHole ? '#a78bfa' : p.color;

      for (let i = 0; i < ringCount; i++) {
        // Animated inward/outward equipotential pulse phase
        const pulseOffset = p.blackHole
          ? ((t * 0.45 + i / ringCount) % 1) // Black hole pulls contours inward
          : ((i / ringCount + Math.sin(t * 1.6 + idx + i * 0.9) * 0.035 + 1) % 1);

        const frac = p.blackHole ? 1 - pulseOffset : (i + 1) / ringCount;
        const ringR = p.radius + 8 + frac * (maxSpan - p.radius);
        const falloff = 1 - frac * 0.78;
        const pulseAlpha = 0.08 + 0.16 * falloff * (0.8 + 0.2 * Math.sin(t * 2.2 + i * 1.3 + idx));

        ctx.strokeStyle = hexToRgba(baseColor, pulseAlpha);
        ctx.lineWidth = i === 0 ? 1.4 : 1.0;

        if (i % 2 === 1) {
          ctx.setLineDash([8, 6]);
          ctx.lineDashOffset = (idx % 2 === 0 ? 1 : -1) * t * (10 + i * 3);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPlanet(ctx, p, t) {
    if (p.shield) return;
    if (p.blackHole) {
      drawBlackHole(ctx, p, t);
      return;
    }

    // Atmospheric outer neon glow
    const halo = ctx.createRadialGradient(p.x, p.y, p.radius * 0.85, p.x, p.y, p.radius * 2.7);
    halo.addColorStop(0, hexToRgba(p.color, 0.36));
    halo.addColorStop(0.5, hexToRgba(p.color, 0.12));
    halo.addColorStop(1, hexToRgba(p.color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Planet sphere with specular highlight and deep shadow limb
    const body = ctx.createRadialGradient(
      p.x - p.radius * 0.35,
      p.y - p.radius * 0.35,
      p.radius * 0.08,
      p.x,
      p.y,
      p.radius
    );
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.24, p.color);
    body.addColorStop(0.78, hexToRgba(p.color, 0.65));
    body.addColorStop(1, '#080c18');

    ctx.save();
    ctx.fillStyle = body;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Crisp neon rim highlight
    ctx.strokeStyle = hexToRgba(p.color, 0.75);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Black Hole accretion disk swirl and gravitational lensing distortion glow.
   */
  function drawBlackHole(ctx, p, t) {
    // 1. Deep space gravitational lensing distortion glow
    const lensRadius = p.radius * 5.6;
    const halo = ctx.createRadialGradient(p.x, p.y, p.radius * 0.9, p.x, p.y, lensRadius);
    halo.addColorStop(0, 'rgba(167, 139, 250, 0.55)');
    halo.addColorStop(0.28, 'rgba(251, 146, 60, 0.25)');
    halo.addColorStop(0.6, 'rgba(56, 189, 248, 0.08)');
    halo.addColorStop(1, 'rgba(167, 139, 250, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, lensRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Swirling relativistic vortex arms (inward spiraling plasma)
    ctx.save();
    ctx.translate(p.x, p.y);
    for (let arm = 0; arm < 3; arm++) {
      const baseAngle = t * 1.9 + (arm * Math.PI * 2) / 3;
      ctx.strokeStyle = arm % 2 === 0 ? 'rgba(167, 139, 250, 0.42)' : 'rgba(251, 146, 60, 0.38)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const k = s / 18;
        const rad = p.radius * (1.15 + k * 2.5);
        const ang = baseAngle - k * 2.4;
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad * 0.58;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 3. Tilted multi-band accretion disk with rotating Doppler shimmer
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.35);

    // Outer orange-gold accretion band
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#fb923c';
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur = 14;
    ctx.setLineDash([24, 9]);
    ctx.lineDashOffset = -t * 48;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 2.55, p.radius * 0.82, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner white-hot / violet relativistic jet ring
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#facc15';
    ctx.shadowColor = '#f472b6';
    ctx.shadowBlur = 12;
    ctx.setLineDash([16, 7]);
    ctx.lineDashOffset = t * 62;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.85, p.radius * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 4. Event horizon core + glowing photon sphere ring
    ctx.save();
    ctx.fillStyle = '#020108';
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBarrier(ctx, b, t) {
    const path = () => {
      ctx.beginPath();
      if (b.kind === 'line') {
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
      } else {
        ctx.arc(b.cx, b.cy, b.r, (b.a0 * Math.PI) / 180, (b.a1 * Math.PI) / 180);
      }
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(56,189,248,0.18)';
    ctx.lineWidth = 18;
    path();
    ctx.stroke();

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.setLineDash([14, 6]);
    ctx.lineDashOffset = -t * 30;
    path();
    ctx.stroke();
    ctx.restore();
  }

  function drawDrone(ctx, d, t) {
    if (!d.alive) return;
    const pulse = 1 + 0.08 * Math.sin(t * 3.8 + d.x);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.shadowColor = d.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = d.color + '33';
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      const r = d.radius * pulse;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShip(ctx, s, isActive, state, t) {
    if (!s.alive) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing, 1);
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.radius, 0);
    ctx.lineTo(-s.radius * 0.8, -s.radius * 0.8);
    ctx.lineTo(-s.radius * 0.4, 0);
    ctx.lineTo(-s.radius * 0.8, s.radius * 0.8);
    ctx.closePath();
    ctx.fill();

    // Cockpit core highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.radius * 0.15, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isActive && (state === 'AIMING' || state === 'ROUND_START')) {
      ctx.save();
      ctx.strokeStyle = hexToRgba(s.color, 0.65);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t * 16;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Faint dotted trail of the previous shot. */
  function drawGhost(ctx, ghost) {
    if (!ghost || !ghost.length) return;
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    for (const item of ghost) {
      const pts = Array.isArray(item) ? item : item.points;
      if (!pts) continue;
      for (let i = 0; i < pts.length; i += 3) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Multi-segmented fading neon trail behind moving ordnance.
   * Renders a soft colored neon glow ribbon plus a bright inner core that tapers.
   */
  function drawTrail(ctx, trailObj, alpha, fallbackColor) {
    const pts = Array.isArray(trailObj) ? trailObj : trailObj && trailObj.points;
    const color = (!Array.isArray(trailObj) && trailObj && trailObj.color) || fallbackColor || '#facc15';
    if (!pts || pts.length < 2) return;

    const n = pts.length;
    const segments = 28;
    const step = Math.max(1, Math.floor(n / segments));

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < n - 1; i += step) {
      const j = Math.min(i + step, n - 1);
      const prog = j / n; // 0 at tail -> 1 at head
      const segAlpha = alpha * (0.08 + 0.92 * prog * prog);

      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      for (let k = i + 1; k <= j; k++) ctx.lineTo(pts[k].x, pts[k].y);

      // Outer neon bloom pass
      ctx.strokeStyle = hexToRgba(color, segAlpha * 0.42);
      ctx.lineWidth = 1.5 + 5.5 * prog;
      ctx.stroke();

      // Inner bright core pass
      ctx.strokeStyle = prog > 0.78 ? hexToRgba('#ffffff', segAlpha * 0.9) : hexToRgba(color, segAlpha);
      ctx.lineWidth = 0.9 + 2.1 * prog;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawProjectile(ctx, p) {
    const color = (p.spec && p.spec.color) || '#facc15';
    ctx.save();

    // Glowing aura around projectile head
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 3.8);
    glow.addColorStop(0, hexToRgba(color, 0.85));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (p.type === 'bouncer' && p.bouncesLeft > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.type === 'cluster') {
      const k = Math.min(p.age / Weapons.SPLIT_DELAY, 1);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 4.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(ctx) {
    if (!particles.length) return;
    ctx.save();
    for (const pt of particles) {
      const k = pt.t / pt.life;
      const alpha = Math.max(0, 1 - k * k);
      ctx.fillStyle = hexToRgba(pt.color, alpha);
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - 0.5 * k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEffect(ctx, e) {
    const k = Math.min(1, e.t / e.life);
    if (e.kind === 'boom') {
      ctx.save();
      const inv = 1 - k;
      // Expanding primary blast fill & ring
      const rad1 = 4 + e.r * Math.pow(Math.min(1, k * 1.9), 0.65);
      ctx.fillStyle = hexToRgba(e.color, inv * 0.32);
      ctx.strokeStyle = hexToRgba(e.color, inv);
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3 * inv + 0.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Secondary fast outer shockwave ring
      const rad2 = 6 + e.r * (e.major ? 1.55 : 1.3) * Math.pow(k, 0.5);
      ctx.strokeStyle = hexToRgba('#ffffff', inv * 0.75);
      ctx.lineWidth = 1.5 * inv;
      ctx.beginPath();
      ctx.arc(e.x, e.y, rad2, 0, Math.PI * 2);
      ctx.stroke();

      // Bright initial flash core
      if (k < 0.35) {
        const fk = 1 - k / 0.35;
        ctx.fillStyle = hexToRgba('#ffffff', fk * 0.9);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 0.38 * fk, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.font = '700 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.text, e.x, e.y - k * 26);
      ctx.restore();
    }
  }

  function drawAim(ctx, ship, aim, drag) {
    if (!ship) return;
    const rad = (-aim.angle * Math.PI) / 180;
    const len = (aim.power / 100) * MAX_DRAG;

    ctx.save();
    ctx.strokeStyle = ship.color;
    ctx.shadowColor = ship.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y);
    ctx.lineTo(ship.x + Math.cos(rad) * len, ship.y + Math.sin(rad) * len);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = ship.color;
    ctx.beginPath();
    ctx.arc(ship.x + Math.cos(rad) * len, ship.y + Math.sin(rad) * len, 4.2, 0, Math.PI * 2);
    ctx.fill();

    if (drag) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y);
      ctx.lineTo(drag.px, drag.py);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(drag.px, drag.py, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Render the entire Gravity Wars frame onto `ctx`.
   */
  function renderScene(ctx, canvas, scale, view) {
    const t = performance.now() / 1000;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply damped camera screen shake in world coordinates
    let shakeX = 0;
    let shakeY = 0;
    if (shakeTrauma > 0.001) {
      const mag = shakeTrauma * shakeTrauma * 11;
      shakeX = Math.sin(shakeTime * 58) * mag + Math.cos(shakeTime * 93) * mag * 0.5;
      shakeY = Math.cos(shakeTime * 67) * mag + Math.sin(shakeTime * 81) * mag * 0.5;
    }

    ctx.setTransform(scale, 0, 0, scale, shakeX * scale, shakeY * scale);

    drawStars(ctx, t);
    drawGravityWells(ctx, view.planets, t);

    if (view.mode === 'challenge' && view.challenge) {
      for (const b of view.challenge.barriers) drawBarrier(ctx, b, t);
    }
    for (const p of view.planets) drawPlanet(ctx, p, t);

    drawGhost(ctx, view.ghost);

    if (view.mode === 'challenge') {
      for (const d of view.drones) drawDrone(ctx, d, t);
    }
    for (let i = 0; i < view.ships.length; i++) {
      drawShip(ctx, view.ships[i], i === view.turn, view.state, t);
    }

    for (const tr of view.shotTrails) {
      drawTrail(ctx, tr, 0.82);
    }
    for (const p of view.projectiles) {
      drawTrail(ctx, p.trail, 1, p.spec && p.spec.color);
      drawProjectile(ctx, p);
    }

    drawParticles(ctx);
    for (const e of view.effects) drawEffect(ctx, e);

    if (view.showAim) {
      drawAim(ctx, view.ships[view.turn], view.aim, view.drag);
    }
  }

  GW.Renderer = {
    resetFX,
    addShake,
    spawnExplosion,
    stepFX,
    renderScene,
  };
})();
