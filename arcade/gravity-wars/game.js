/**
 * Gravity Wars — Session 1 sandbox
 * Drag-to-aim / release-to-fire test projectile in an N-body gravity field.
 *
 * Storage Key Convention: arcade.gravity-wars.<key> (none used yet).
 */
(function () {
  'use strict';

  const { Physics, Entities } = window.GW;
  const { WORLD } = Entities;

  // --- Tunables ---
  const MAX_DRAG = 160; // px of drag for 100% power
  const MAX_SPEED = 560; // launch speed at 100% power (px/s)
  const MIN_POWER = 0.05;
  const RESET_DELAY = 0.9; // seconds shown after impact before reset
  const PREDICT_STEPS = 90; // frames of aim-preview (1.5 s)

  // --- DOM ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const hudAngle = document.getElementById('hud-angle');
  const hudPower = document.getElementById('hud-power');
  const hudShooter = document.getElementById('hud-shooter');

  // --- State ---
  let seed = 1337;
  let planets = [];
  let ships = [];
  let shooter = 0; // index into ships
  let projectile = null;
  let lastTrail = null; // finished projectile kept visible during reset delay
  let impact = null; // { x, y, t }
  let resetTimer = 0;
  let aim = null; // { px, py } pointer in world coords while dragging
  let scale = 1;
  let lastTime = 0;
  let accumulator = 0;

  function newMap(nextSeed) {
    if (nextSeed !== undefined) seed = nextSeed;
    planets = Entities.generatePlanets(seed);
    ships = Entities.createShips();
    clearShot();
  }

  function clearShot() {
    projectile = null;
    lastTrail = null;
    impact = null;
    resetTimer = 0;
  }

  // --- Canvas sizing (responsive + HiDPI) ---
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / WORLD.width;
  }

  function toWorld(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WORLD.width,
      y: ((e.clientY - rect.top) / rect.height) * WORLD.height,
    };
  }

  // --- Aim helpers ---
  /** Slingshot: pull away from the target; shot goes the opposite way. */
  function aimVector() {
    const s = ships[shooter];
    const dx = s.x - aim.px;
    const dy = s.y - aim.py;
    const len = Math.hypot(dx, dy);
    const power = Math.min(len / MAX_DRAG, 1);
    return { angle: Math.atan2(dy, dx), power, valid: power >= MIN_POWER };
  }

  function fire() {
    const a = aimVector();
    aim = null;
    updateHud(null);
    if (!a.valid) return;
    projectile = Entities.launchProjectile(ships[shooter], a.angle, a.power * MAX_SPEED);
    lastTrail = null;
    impact = null;
  }

  function updateHud(a) {
    hudShooter.textContent = 'P' + (shooter + 1);
    if (!a) {
      hudAngle.textContent = '--';
      hudPower.textContent = '--';
      return;
    }
    // Display angle in degrees, 0 = right, counter-clockwise positive.
    const deg = Math.round((-a.angle * 180) / Math.PI);
    hudAngle.textContent = ((deg % 360) + 360) % 360 + '°';
    hudPower.textContent = Math.round(a.power * 100) + '%';
  }

  // --- Simulation ---
  function simulate() {
    if (projectile && projectile.alive) {
      const hit = Physics.stepProjectile(projectile, planets, ships, WORLD);
      if (hit) {
        impact = { x: projectile.x, y: projectile.y, t: 0, type: hit.type };
        lastTrail = projectile.trail;
        resetTimer = RESET_DELAY;
        projectile = null;
      }
    } else if (resetTimer > 0) {
      resetTimer -= Physics.FRAME_DT;
      if (impact) impact.t += Physics.FRAME_DT;
      if (resetTimer <= 0) clearShot();
    }
  }

  /** Predict trajectory with the exact same integrator (deterministic). */
  function predictPath(a) {
    const p = Entities.launchProjectile(ships[shooter], a.angle, a.power * MAX_SPEED);
    const pts = [{ x: p.x, y: p.y }];
    for (let i = 0; i < PREDICT_STEPS; i++) {
      if (Physics.stepProjectile(p, planets, ships, WORLD)) break;
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  // --- Rendering ---
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    drawStars();
    planets.forEach(drawPlanet);
    ships.forEach(drawShip);

    if (lastTrail) drawTrail(lastTrail, 0.9);
    if (projectile) {
      drawTrail(projectile.trail, 1);
      drawProjectile(projectile);
    }
    if (impact) drawImpact(impact);
    if (aim) drawAim();
  }

  const stars = (function () {
    const rand = Entities.createRng(99);
    const arr = [];
    for (let i = 0; i < 90; i++) arr.push({ x: rand() * WORLD.width, y: rand() * WORLD.height, r: rand() * 1.2 + 0.2, a: rand() * 0.5 + 0.15 });
    return arr;
  })();

  function drawStars() {
    for (const s of stars) {
      ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  function drawPlanet(p) {
    // Gravity-well halo
    const halo = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, p.radius * 2.6);
    halo.addColorStop(0, p.color + '55');
    halo.addColorStop(1, p.color + '00');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(p.x - p.radius * 0.35, p.y - p.radius * 0.35, p.radius * 0.1, p.x, p.y, p.radius);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.25, p.color);
    body.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = body;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawShip(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing, 1);
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.radius, 0);
    ctx.lineTo(-s.radius * 0.8, -s.radius * 0.8);
    ctx.lineTo(-s.radius * 0.4, 0);
    ctx.lineTo(-s.radius * 0.8, s.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    if (ships[shooter] === s) {
      ctx.strokeStyle = s.color + '88';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawTrail(trail, alpha) {
    if (trail.length < 2) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const n = trail.length;
    const seg = Math.max(1, Math.floor(n / 40)); // fade in ~40 chunks
    for (let i = 0; i < n - 1; i += seg) {
      const j = Math.min(i + seg, n - 1);
      ctx.strokeStyle = 'rgba(250, 204, 21,' + (alpha * (0.15 + 0.85 * (j / n))).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(trail[i].x, trail[i].y);
      for (let k = i + 1; k <= j; k++) ctx.lineTo(trail[k].x, trail[k].y);
      ctx.stroke();
    }
  }

  function drawProjectile(p) {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawImpact(im) {
    const k = Math.min(im.t / RESET_DELAY, 1);
    ctx.strokeStyle = 'rgba(251, 146, 60,' + (1 - k).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(im.x, im.y, 6 + k * 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawAim() {
    const s = ships[shooter];
    const a = aimVector();
    // Rubber band from ship to pointer
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(aim.px, aim.py);
    ctx.stroke();
    if (!a.valid) return;
    const pts = predictPath(a);
    ctx.strokeStyle = 'rgba(6, 214, 160, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- Main loop (fixed time-step with accumulator => deterministic) ---
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    accumulator += Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;
    while (accumulator >= Physics.FRAME_DT) {
      simulate();
      accumulator -= Physics.FRAME_DT;
    }
    render();
    requestAnimationFrame(loop);
  }

  // --- Input ---
  function bindEvents() {
    canvas.addEventListener('pointerdown', (e) => {
      if (projectile) return; // one shot in flight at a time
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      clearShot();
      const w = toWorld(e);
      aim = { px: w.x, py: w.y };
      updateHud(aimVector());
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!aim) return;
      const w = toWorld(e);
      aim.px = w.x;
      aim.py = w.y;
      updateHud(aimVector());
    });
    canvas.addEventListener('pointerup', () => {
      if (aim) fire();
    });
    canvas.addEventListener('pointercancel', () => {
      aim = null;
      updateHud(null);
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyS') {
        shooter = (shooter + 1) % ships.length;
        updateHud(aim ? aimVector() : null);
      } else if (e.code === 'KeyR') {
        newMap(Math.floor(Math.random() * 1e9));
      }
    });
    window.addEventListener('resize', resize);
  }

  function init() {
    newMap();
    resize();
    updateHud(null);
    bindEvents();
    requestAnimationFrame(loop);
  }

  init();
})();
