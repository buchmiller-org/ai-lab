/**
 * Cyber Pong — HiDPI Canvas Renderer & Neon VFX
 *
 * Renders the logical 800x500 arena cleanly at devicePixelRatio scale.
 * Exposed as window.CP.Renderer.
 */
(function () {
  'use strict';

  const CP = (window.CP = window.CP || {});

  let particles = [];
  let shockwaves = [];
  let floatingTexts = [];
  let warpBeams = [];
  let shakeTrauma = 0;
  let shakeTime = 0;
  let flashAlpha = 0;
  let flashColor = '#38bdf8';

  function hexToRgba(hex, alpha) {
    const a = Math.max(0, Math.min(1, alpha));
    if (!hex || hex[0] !== '#') return 'rgba(56,189,248,' + a.toFixed(3) + ')';
    const clean = hex.slice(1);
    const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function resetFX() {
    particles = [];
    shockwaves = [];
    floatingTexts = [];
    warpBeams = [];
    shakeTrauma = 0;
    flashAlpha = 0;
  }

  function addShake(amount) {
    shakeTrauma = Math.min(1, shakeTrauma + (amount || 0.25));
  }

  function spawnBurst(x, y, color, count, radius) {
    const n = count || 18;
    const r = radius || 36;
    const col = color || '#38bdf8';

    shockwaves.push({
      x,
      y,
      r,
      color: col,
      t: 0,
      life: 0.42,
    });

    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.45;
      const spd = 65 + Math.random() * 210;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 1.5 + Math.random() * 2.4,
        t: 0,
        life: 0.26 + Math.random() * 0.34,
        color: i % 4 === 0 ? '#ffffff' : col,
      });
    }
  }

  function addFloatingText(x, y, text, color) {
    floatingTexts.push({
      x,
      y,
      text,
      color: color || '#ffffff',
      t: 0,
      life: 1.05,
    });
  }

  function addWarpBeam(x1, y1, x2, y2, color) {
    const segs = 6;
    const pts = [{ x: x1, y: y1 }];
    for (let i = 1; i < segs; i++) {
      const f = i / segs;
      const jx = x1 + (x2 - x1) * f + (Math.random() - 0.5) * 14;
      const jy = y1 + (y2 - y1) * f + (Math.random() - 0.5) * 26;
      pts.push({ x: jx, y: jy });
    }
    pts.push({ x: x2, y: y2 });
    warpBeams.push({
      pts,
      color: color || '#f472b6',
      t: 0,
      life: 0.45,
    });
  }

  /** Dual chromatic goal shockwaves, directional particle spray, and screen impact flash. */
  function spawnGoalShockwave(x, y, color, isMatchPoint) {
    const primary = color || '#06d6a0';
    const secondary = primary === '#06d6a0' ? '#38bdf8' : '#a855f7';
    const accent = isMatchPoint ? '#facc15' : '#ffffff';

    shockwaves.push({
      x,
      y,
      r: isMatchPoint ? 150 : 96,
      color: primary,
      t: 0,
      life: isMatchPoint ? 0.72 : 0.52,
    });
    shockwaves.push({
      x,
      y,
      r: isMatchPoint ? 220 : 140,
      color: secondary,
      t: 0,
      life: isMatchPoint ? 0.85 : 0.6,
    });
    if (isMatchPoint) {
      shockwaves.push({
        x,
        y,
        r: 72,
        color: accent,
        t: 0,
        life: 0.48,
      });
    }

    const count = isMatchPoint ? 64 : 42;
    const inwardBase = x < 400 ? 0 : Math.PI;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 1.15;
      const ang = inwardBase + spread;
      const spd = 95 + Math.random() * (isMatchPoint ? 340 : 250);
      const col =
        i % 5 === 0 ? '#ffffff' : i % 4 === 0 ? accent : i % 3 === 0 ? secondary : primary;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 1.8 + Math.random() * (isMatchPoint ? 3.2 : 2.5),
        t: 0,
        life: 0.34 + Math.random() * (isMatchPoint ? 0.56 : 0.38),
        color: col,
      });
    }

    addShake(isMatchPoint ? 0.85 : 0.55);
    flashAlpha = isMatchPoint ? 0.42 : 0.22;
    flashColor = primary;
  }

  function stepFX(dt) {
    shakeTime += dt;
    if (shakeTrauma > 0) {
      shakeTrauma = Math.max(0, shakeTrauma - dt * 2.1);
    }
    if (flashAlpha > 0) {
      flashAlpha = Math.max(0, flashAlpha - dt * 1.4);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const drag = Math.pow(0.06, dt);
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = shockwaves.length - 1; i >= 0; i--) {
      shockwaves[i].t += dt;
      if (shockwaves[i].t >= shockwaves[i].life) shockwaves.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      floatingTexts[i].t += dt;
      if (floatingTexts[i].t >= floatingTexts[i].life) floatingTexts.splice(i, 1);
    }

    for (let i = warpBeams.length - 1; i >= 0; i--) {
      warpBeams[i].t += dt;
      if (warpBeams[i].t >= warpBeams[i].life) warpBeams.splice(i, 1);
    }
  }

  function drawCourt(ctx, world, t) {
    const w = world.width;
    const h = world.height;

    // Subtle cyber grid
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 40; x < w; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 40; y < h; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Goal-zone subtle glow strips
    const leftGrad = ctx.createLinearGradient(0, 0, 56, 0);
    leftGrad.addColorStop(0, 'rgba(6, 214, 160, 0.09)');
    leftGrad.addColorStop(1, 'rgba(6, 214, 160, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 56, h);

    const rightGrad = ctx.createLinearGradient(w, 0, w - 56, 0);
    rightGrad.addColorStop(0, 'rgba(244, 114, 182, 0.09)');
    rightGrad.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(w - 56, 0, 56, h);

    // Center arena ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 68, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed neon center net
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.lineDashOffset = -t * 18;
    ctx.beginPath();
    ctx.moveTo(w / 2, 10);
    ctx.lineTo(w / 2, h - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top & bottom neon rails
    ctx.strokeStyle = 'rgba(6, 214, 160, 0.45)';
    ctx.shadowColor = '#06d6a0';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(w, 1);
    ctx.moveTo(0, h - 1);
    ctx.lineTo(w, h - 1);
    ctx.stroke();
    ctx.restore();
  }

  function drawBarriers(ctx, paddles, world, barrierOffset, t) {
    for (let i = 0; i < 2; i++) {
      const p = paddles[i];
      if (!p || p.shieldTimer <= 0 || p.shieldHp <= 0) continue;

      const x = i === 0 ? barrierOffset : world.width - barrierOffset;
      const blink = p.shieldTimer < 2.2 ? 0.45 + 0.55 * Math.sin(t * 18) : 1;

      ctx.save();
      ctx.globalAlpha = blink;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, world.height - 12);
      ctx.stroke();

      ctx.strokeStyle = '#7dd3fc';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([18, 8]);
      ctx.lineDashOffset = (i === 0 ? -1 : 1) * t * 44;
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, world.height - 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // Emitter nodes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, 12, 4, 0, Math.PI * 2);
      ctx.arc(x, world.height - 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawAnomalies(ctx, anomalies, t) {
    if (!anomalies || !anomalies.length) return;
    for (let i = 0; i < anomalies.length; i++) {
      const a = anomalies[i];
      if (a.alive === false) continue;

      const color = a.spec.color;
      const spawnScale = Math.min(1, a.age / 0.25);
      const lifeLeft = Math.max(0, 1 - a.age / a.maxLife);
      const fade = a.age > a.maxLife - 1.8 ? 0.5 + 0.5 * Math.sin(t * 16) : 1;
      const pulse = 1 + 0.06 * Math.sin(t * 4.5 + i);
      const r = a.radius * spawnScale * pulse;

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.globalAlpha = fade;

      // Radial aura
      const aura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.3);
      aura.addColorStop(0, hexToRgba(color, 0.42));
      aura.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2);
      ctx.fill();

      // Rotating outer hexagon
      ctx.save();
      ctx.rotate(t * 1.15);
      ctx.fillStyle = hexToRgba(color, 0.16);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 3) * k;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Remaining life arc
      ctx.strokeStyle = hexToRgba('#ffffff', 0.45);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + lifeLeft * Math.PI * 2);
      ctx.stroke();

      // Crisp center glyph
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.spec.glyph, 0, 1);

      ctx.restore();
    }
  }

  function ballColor(ball) {
    if (ball.overcharged) return '#fb923c';
    if (ball.lastHitBy === 0) return '#06d6a0';
    if (ball.lastHitBy === 1) return '#f472b6';
    return '#38bdf8';
  }

  function drawBall(ctx, ball, t) {
    const col = ballColor(ball);
    const pts = ball.trail;

    if (pts && pts.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < pts.length - 1; i++) {
        const prog = (i + 1) / pts.length;
        const segCol = pts[i + 1].overcharged ? '#fb923c' : col;
        ctx.strokeStyle = hexToRgba(segCol, prog * 0.48);
        ctx.lineWidth = 2 + prog * (ball.radius * 1.45);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    // Outer halo
    const aura = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, ball.radius * 3.4);
    aura.addColorStop(0, hexToRgba(col, 0.78));
    aura.addColorStop(1, hexToRgba(col, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Overcharge plasma ring
    if (ball.overcharged) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.lineDashOffset = -t * 36;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Core sphere
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function drawPaddle(ctx, p, t) {
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.overcharge ? '#fb923c' : p.color;
    ctx.shadowBlur = p.overcharge ? 24 : 16;

    drawRoundedRect(ctx, p.x, p.y, p.width, p.height, 6);
    ctx.fill();

    // Bright center core
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    drawRoundedRect(ctx, p.x + p.width * 0.32, p.y + 8, p.width * 0.36, Math.max(8, p.height - 16), 3);
    ctx.fill();

    // Overcharge armed rim
    if (p.overcharge) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 16);
      ctx.strokeStyle = hexToRgba('#fb923c', pulse);
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, p.x - 3, p.y - 3, p.width + 6, p.height + 6, 8);
      ctx.stroke();
    }

    // Size modifier timer strip
    if (p.sizeTimer > 0) {
      const maxDur = p.sizeMult > 1 ? 9 : 7;
      const frac = Math.max(0, Math.min(1, p.sizeTimer / maxDur));
      const barCol = p.sizeMult > 1 ? '#06d6a0' : '#f87171';
      const barX = p.side === 0 ? p.x - 5 : p.x + p.width + 2;
      const barH = p.height * frac;
      ctx.fillStyle = barCol;
      ctx.fillRect(barX, p.y + (p.height - barH) / 2, 3, barH);
    }

    ctx.restore();
  }

  function drawFX(ctx) {
    // Warp lightning beams
    for (let i = 0; i < warpBeams.length; i++) {
      const b = warpBeams[i];
      const alpha = Math.max(0, 1 - b.t / b.life);
      ctx.save();
      ctx.strokeStyle = hexToRgba(b.color, alpha);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3 * alpha + 1;
      ctx.beginPath();
      ctx.moveTo(b.pts[0].x, b.pts[0].y);
      for (let k = 1; k < b.pts.length; k++) {
        ctx.lineTo(b.pts[k].x, b.pts[k].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Shockwave rings
    for (let i = 0; i < shockwaves.length; i++) {
      const s = shockwaves[i];
      const k = Math.min(1, s.t / s.life);
      const rad = 6 + s.r * Math.pow(k, 0.65);
      ctx.save();
      ctx.strokeStyle = hexToRgba(s.color, (1 - k) * 0.85);
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5 * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particle sparks
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      const k = pt.t / pt.life;
      const alpha = Math.max(0, 1 - k * k);
      ctx.save();
      ctx.fillStyle = hexToRgba(pt.color, alpha);
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - 0.45 * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating callouts
    for (let i = 0; i < floatingTexts.length; i++) {
      const ft = floatingTexts[i];
      const k = Math.min(1, ft.t / ft.life);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.font = '700 13px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y - k * 28);
      ctx.restore();
    }
  }

  function drawTelemetryAndCountdown(ctx, world, view) {
    if (view.roundActive && view.balls.length > 0) {
      let topSpeed = 0;
      let anyOvercharged = false;
      for (let i = 0; i < view.balls.length; i++) {
        const b = view.balls[i];
        if (!b.alive) continue;
        const spd = Math.round(b.speed || Math.hypot(b.vx, b.vy));
        if (spd > topSpeed) topSpeed = spd;
        if (b.overcharged) anyOvercharged = true;
      }

      const label =
        'RALLY ' +
        String(view.rally).padStart(2, '0') +
        ' · ' +
        topSpeed +
        ' PX/S' +
        (anyOvercharged ? ' · ⚡ OVERCHARGE' : '');

      ctx.save();
      ctx.font = '700 10px Orbitron, sans-serif';
      const padX = 12;
      const w = ctx.measureText(label).width + padX * 2;
      const x = world.width / 2 - w / 2;
      const y = 14;
      ctx.fillStyle = 'rgba(7, 11, 21, 0.72)';
      ctx.strokeStyle = anyOvercharged ? 'rgba(251, 146, 60, 0.55)' : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, x, y, w, 22, 11);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = anyOvercharged ? '#fb923c' : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, world.width / 2, y + 11.5);
      ctx.restore();
    }

    if (view.state === 'COUNTDOWN' && view.countdown > 0) {
      const ceil = Math.ceil(view.countdown);
      const frac = view.countdown - Math.floor(view.countdown);
      const pop = 1 + (frac > 0.7 ? (frac - 0.7) * 0.8 : 0);

      ctx.save();
      ctx.translate(world.width / 2, world.height / 2);
      ctx.scale(pop, pop);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 24;
      ctx.font = '900 74px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ceil), 0, -6);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 12px Orbitron, sans-serif';
      ctx.fillText(view.serveText || 'GET READY', 0, 48);
      ctx.restore();
    }
  }

  /** Render the complete Cyber Pong scene onto `ctx` using logical WORLD coords. */
  function renderScene(ctx, canvas, scale, world, barrierOffset, view) {
    const t = performance.now() / 1000;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070b15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let shakeX = 0;
    let shakeY = 0;
    if (shakeTrauma > 0.001) {
      const mag = shakeTrauma * shakeTrauma * 9;
      shakeX = Math.sin(shakeTime * 62) * mag + Math.cos(shakeTime * 97) * mag * 0.45;
      shakeY = Math.cos(shakeTime * 71) * mag + Math.sin(shakeTime * 83) * mag * 0.45;
    }

    ctx.setTransform(scale, 0, 0, scale, shakeX * scale, shakeY * scale);

    drawCourt(ctx, world, t);
    drawBarriers(ctx, view.paddles, world, barrierOffset, t);
    drawAnomalies(ctx, view.anomalies, t);

    for (let i = 0; i < view.balls.length; i++) {
      if (view.balls[i].alive) drawBall(ctx, view.balls[i], t);
    }

    for (let i = 0; i < view.paddles.length; i++) {
      drawPaddle(ctx, view.paddles[i], t);
    }

    drawFX(ctx);
    if (flashAlpha > 0.005) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(
        world.width / 2,
        world.height / 2,
        world.height * 0.15,
        world.width / 2,
        world.height / 2,
        world.width * 0.68
      );
      glow.addColorStop(0, hexToRgba(flashColor, flashAlpha * 0.16));
      glow.addColorStop(1, hexToRgba(flashColor, flashAlpha * 0.55));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, world.width, world.height);
      ctx.restore();
    }
    drawTelemetryAndCountdown(ctx, world, view);
  }

  CP.Renderer = {
    resetFX,
    addShake,
    spawnBurst,
    spawnGoalShockwave,
    addFloatingText,
    addWarpBeam,
    stepFX,
    renderScene,
  };
})();
