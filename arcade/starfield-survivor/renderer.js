/* ============================================
   Starfield Survivor — Canvas Renderer
   ============================================ */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
    this.flash = { alpha: 0, hue: 0 };
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  clear() {
    this.ctx.save();

    // Apply screen shake
    if (this.screenShake.intensity > 0.5) {
      const sx = (Math.random() - 0.5) * this.screenShake.intensity;
      const sy = (Math.random() - 0.5) * this.screenShake.intensity;
      this.ctx.translate(sx, sy);
      this.screenShake.intensity *= this.screenShake.decay;
    } else {
      this.screenShake.intensity = 0;
    }

    // Background
    this.ctx.fillStyle = '#06080f';
    this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
  }

  endFrame() {
    // Screen flash overlay
    if (this.flash.alpha > 0.01) {
      this.ctx.globalAlpha = this.flash.alpha;
      this.ctx.fillStyle = `hsl(${this.flash.hue}, 100%, 70%)`;
      this.ctx.fillRect(-10, -10, this.w + 20, this.h + 20);
      this.ctx.globalAlpha = 1;
      this.flash.alpha *= 0.85;
    }

    this.ctx.restore();
  }

  shake(intensity) {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
  }

  flashScreen(hue, alpha) {
    this.flash.hue = hue;
    this.flash.alpha = alpha;
  }

  // ── Starfield ──────────────────────────────
  drawStarfield(starfield) {
    const ctx = this.ctx;
    for (const layer of starfield.layers) {
      for (const star of layer.stars) {
        const twinkleAlpha = star.alpha * (0.6 + 0.4 * Math.sin(star.twinkle));
        ctx.globalAlpha = twinkleAlpha;
        ctx.fillStyle = '#c8d6e5';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Player ─────────────────────────────────
  drawPlayer(player) {
    const ctx = this.ctx;
    if (!player.alive) return;

    // Trail
    for (let i = player.trail.length - 1; i >= 0; i--) {
      const t = player.trail[i];
      ctx.globalAlpha = t.alpha * 0.3;
      ctx.fillStyle = '#06d6a0';
      ctx.beginPath();
      ctx.arc(t.x, t.y, player.radius * (0.3 + t.alpha * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Invincibility blink
    if (player.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    // Damage flash
    const baseColor = player.damageFlash > 0 ? '#ff4444' : '#06d6a0';

    // Ship body — triangle pointing up
    ctx.save();
    ctx.translate(player.x, player.y);

    // Engine glow
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 20;

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(0, -player.radius);
    ctx.lineTo(-player.radius * 0.7, player.radius * 0.6);
    ctx.lineTo(0, player.radius * 0.3);
    ctx.lineTo(player.radius * 0.7, player.radius * 0.6);
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, -player.radius * 0.6);
    ctx.lineTo(-player.radius * 0.3, player.radius * 0.2);
    ctx.lineTo(0, player.radius * 0.05);
    ctx.lineTo(player.radius * 0.3, player.radius * 0.2);
    ctx.closePath();
    ctx.fill();

    // Engine flame
    const flicker = 0.7 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(6, 214, 160, ${0.6 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(-player.radius * 0.3, player.radius * 0.5);
    ctx.lineTo(0, player.radius * (0.8 + flicker * 0.4));
    ctx.lineTo(player.radius * 0.3, player.radius * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Shield overlay
    if (player.shieldActive) {
      const shieldAlpha = player.shieldTimer < 2
        ? 0.2 + 0.3 * Math.sin(Date.now() / 60) // flicker when about to expire
        : 0.35 + 0.1 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner fill
      ctx.fillStyle = `rgba(56, 189, 248, ${shieldAlpha * 0.15})`;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.shieldRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // DEBUG hitbox (uncomment to visualize)
    // ctx.strokeStyle = 'red';
    // ctx.beginPath();
    // ctx.arc(player.x, player.y, player.hitRadius, 0, Math.PI * 2);
    // ctx.stroke();
  }

  // ── Debris ─────────────────────────────────
  drawAsteroid(a) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);

    ctx.strokeStyle = `hsla(${a.hue}, 80%, 60%, 0.8)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsl(${a.hue}, 80%, 50%)`;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
    for (let i = 1; i < a.vertices.length; i++) {
      ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Dim interior fill
    ctx.fillStyle = `hsla(${a.hue}, 60%, 20%, 0.3)`;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawShard(s) {
    const ctx = this.ctx;
    const angle = Math.atan2(s.vy, s.vx);

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(angle);

    ctx.fillStyle = `hsla(${s.hue}, 90%, 65%, 0.9)`;
    ctx.shadowColor = `hsl(${s.hue}, 90%, 60%)`;
    ctx.shadowBlur = 12;

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(s.radius * 2, 0);
    ctx.lineTo(0, -s.radius * 0.6);
    ctx.lineTo(-s.radius, 0);
    ctx.lineTo(0, s.radius * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawPulseRing(ring) {
    const ctx = this.ctx;
    if (ring.radius < 1) return;

    const alpha = Math.max(0, 1 - ring.radius / ring.maxRadius);
    ctx.strokeStyle = `hsla(${ring.hue}, 90%, 60%, ${alpha * 0.8})`;
    ctx.lineWidth = ring.thickness;
    ctx.shadowColor = `hsl(${ring.hue}, 90%, 55%)`;
    ctx.shadowBlur = 8;

    // Draw arc with gap
    const gStart = ring.gapAngle - ring.gapSize / 2;
    const gEnd = ring.gapAngle + ring.gapSize / 2;

    ctx.beginPath();
    ctx.arc(ring.cx, ring.cy, ring.radius, gEnd, gStart + Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  drawLaserBeam(beam) {
    const ctx = this.ctx;

    if (beam.phase === 'telegraph') {
      // Warning line — thin, pulsing
      const pulseAlpha = 0.15 + 0.15 * Math.sin(beam.timer * 12);
      ctx.strokeStyle = `rgba(255, 50, 50, ${pulseAlpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(beam.originX, beam.originY);
      ctx.lineTo(beam.endX, beam.endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Warning marker at origin
      const markerAlpha = 0.3 + 0.3 * Math.sin(beam.timer * 10);
      ctx.fillStyle = `rgba(255, 50, 50, ${markerAlpha})`;
      ctx.beginPath();
      ctx.arc(beam.originX, beam.originY, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (beam.phase === 'fire') {
      // Active beam — thick, glowing
      const fade = 1 - beam.timer / beam.fireDuration;
      ctx.strokeStyle = `rgba(255, 80, 60, ${fade * 0.9})`;
      ctx.lineWidth = beam.width * 2;
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.moveTo(beam.originX, beam.originY);
      ctx.lineTo(beam.endX, beam.endY);
      ctx.stroke();

      // Core white line
      ctx.strokeStyle = `rgba(255, 220, 200, ${fade * 0.8})`;
      ctx.lineWidth = beam.width * 0.5;
      ctx.beginPath();
      ctx.moveTo(beam.originX, beam.originY);
      ctx.lineTo(beam.endX, beam.endY);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }
  }

  drawComet(c) {
    const ctx = this.ctx;

    // Trail
    for (let i = c.trail.length - 1; i >= 0; i--) {
      const t = c.trail[i];
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = `hsl(${c.hue}, 90%, 60%)`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, c.radius * t.alpha * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Body
    ctx.fillStyle = `hsl(${c.hue}, 90%, 70%)`;
    ctx.shadowColor = `hsl(${c.hue}, 90%, 60%)`;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = `rgba(255, 255, 240, 0.6)`;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // ── Particles ──────────────────────────────
  drawParticles(particleSystem) {
    const ctx = this.ctx;
    for (const p of particleSystem.particles) {
      ctx.globalAlpha = p.alpha;
      if (p.type === 'graze') {
        ctx.fillStyle = `hsl(${p.hue}, 90%, 75%)`;
        ctx.shadowColor = `hsl(${p.hue}, 90%, 65%)`;
        ctx.shadowBlur = 6;
      } else if (p.type === 'heal') {
        ctx.fillStyle = `hsl(${p.hue}, 80%, 65%)`;
        ctx.shadowColor = `hsl(${p.hue}, 80%, 55%)`;
        ctx.shadowBlur = 8;
      } else if (p.type === 'shield') {
        ctx.fillStyle = `hsl(${p.hue}, 80%, 70%)`;
        ctx.shadowColor = `hsl(${p.hue}, 80%, 60%)`;
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = `hsl(${p.hue}, 80%, 60%)`;
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ── Power-Ups ──────────────────────────────
  drawPowerUp(pu) {
    const ctx = this.ctx;
    const pulse = 0.8 + 0.2 * Math.sin(pu.pulse);

    // Outer glow ring
    ctx.strokeStyle = `hsla(${pu.hue}, 90%, 60%, ${0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsl(${pu.hue}, 90%, 55%)`;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.radius * 1.3 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.fillStyle = `hsla(${pu.hue}, 80%, 25%, 0.6)`;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `hsla(${pu.hue}, 90%, 65%, 0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Symbol
    ctx.shadowBlur = 0;
    ctx.fillStyle = `hsl(${pu.hue}, 90%, 75%)`;
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.symbol, pu.x, pu.y);

    // Despawn warning — flicker when < 2s
    if (pu.life < 2) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 50);
    }
    ctx.globalAlpha = 1;
  }

  // ── HUD ────────────────────────────────────
  drawHUD(player, score, elapsed, grazeCount, highScore, slowMoActive) {
    const ctx = this.ctx;
    const pad = 16;

    // Semi-transparent HUD bar at top
    ctx.fillStyle = 'rgba(6, 8, 15, 0.6)';
    ctx.fillRect(0, 0, this.w, 52);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 51, this.w, 1);

    // Health bar (left side)
    const barX = pad;
    const barY = 16;
    const barW = 140;
    const barH = 20;
    const hpPct = player.hp / player.maxHp;

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    // HP fill — color shifts from green to red
    const hpHue = hpPct * 120; // 120=green, 0=red
    ctx.fillStyle = `hsl(${hpHue}, 80%, 50%)`;
    ctx.shadowColor = `hsl(${hpHue}, 80%, 45%)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpPct, barH, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HP text
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, barX + barW / 2, barY + barH / 2);

    // Shield indicator
    if (player.shieldActive) {
      const shieldX = barX + barW + 12;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.roundRect(shieldX, barY, 60, barH, 4);
      ctx.fill();
      const shPct = player.shieldTimer / player.shieldDuration;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();
      ctx.roundRect(shieldX, barY, 60 * shPct, barH, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛡', shieldX + 30, barY + barH / 2);
    }

    // Score (center)
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(score).toLocaleString(), this.w / 2, 26);

    // Time + Graze (right side)
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(193, 203, 216, 0.8)';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, this.w - pad, 20);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(`Graze ×${grazeCount}`, this.w - pad, 38);

    // Slow-mo indicator
    if (slowMoActive) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.font = '700 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◎ SLOW', this.w / 2, 46);
    }

    // High score
    if (highScore > 0) {
      ctx.fillStyle = 'rgba(193, 203, 216, 0.4)';
      ctx.font = '400 10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Best: ${Math.floor(highScore).toLocaleString()}`, pad, 48);
    }
  }
}
