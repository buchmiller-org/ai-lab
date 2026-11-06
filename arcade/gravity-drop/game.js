// ─── Configuration ──────────────────────────────────────────
const CANVAS_W        = 400;
const CANVAS_H        = 600;
const ORB_RADIUS      = 10;
const ORB_X_SPEED     = 4.5;         // px per frame lateral
const BASE_FALL_SPEED = 0.8;         // starting fall speed (slow start)
const MAX_FALL_SPEED  = 7.0;
const SPEED_INC       = 0.0006;      // fall speed increase per frame (gradual ramp)
const BOOST_MULT      = 2.2;         // multiplier when boosting
const BARRIER_GAP     = 100;         // vertical gap between barrier rows
const GAP_WIDTH_MIN   = 70;          // min passage width (narrows over time)
const GAP_WIDTH_MAX   = 140;         // starting passage width
const GAP_NARROW_RATE = 0.08;        // per barrier passed, gap shrinks this many px
const GAP_WIDTH_FLOOR = 50;          // smallest possible gap
const BARRIER_HEIGHT  = 6;

// Colors
const C_BG        = '#080c18';
const C_GRID      = 'rgba(168, 85, 247, 0.03)';
const C_ORB       = '#a855f7';
const C_ORB_CORE  = '#d8b4fe';
const C_TRAIL     = '#a855f7';
const C_BARRIER   = ['#06d6a0', '#38bdf8', '#a855f7', '#f472b6', '#fb923c'];
const C_PARTICLE  = ['#a855f7', '#06d6a0', '#38bdf8', '#f472b6', '#facc15', '#d8b4fe'];

// ─── DOM refs ──────────────────────────────────────────────
const canvas      = document.getElementById('game-canvas');
const ctx         = canvas.getContext('2d');
const wrapEl      = document.getElementById('canvas-wrap');
const startOvl    = document.getElementById('overlay-start');
const gameoverOvl = document.getElementById('overlay-gameover');
const hudScore    = document.getElementById('hud-score');
const hudHigh     = document.getElementById('hud-high');
const finalScoreE = document.getElementById('final-score');
const finalHighE  = document.getElementById('final-high');
const newBestE    = document.getElementById('new-best');

// ─── State ─────────────────────────────────────────────────
let orb, fallSpeed, score, highScore, barriers, particles, trail;
let gameState = 'start'; // 'start' | 'playing' | 'gameover'
let keysDown = {};
let cameraY = 0; // world-Y of the top of the viewport
let distanceTraveled = 0;
let barriersPassed = 0;
let boosting = false;
let screenScale = 1;
let lastGapCenter = CANVAS_W / 2;
let lastShift = 0;        // signed shift of the most recent gap vs. the one before
let barriersSpawned = 0;  // total barriers created (for reversal ramp)
let gameOverTime = 0;     // timestamp when game over occurred
const RESTART_COOLDOWN = 1000; // ms to wait before allowing restart after game over

function canRestart() {
  return gameState === 'start' || (gameState === 'gameover' && performance.now() - gameOverTime >= RESTART_COOLDOWN);
}

// ─── High score persistence ────────────────────────────────
function loadHigh() {
  try { return parseInt(localStorage.getItem('arcade.gravity-drop.high-score') || localStorage.getItem('gravityDropHigh'), 10) || 0; } catch { return 0; }
}
function saveHigh(v) {
  try { localStorage.setItem('arcade.gravity-drop.high-score', v); } catch {}
}

// ─── Canvas sizing ─────────────────────────────────────────
function resize() {
  const maxW = Math.min(window.innerWidth - 32, CANVAS_W);
  const maxH = Math.min(window.innerHeight - 200, CANVAS_H);
  // Maintain aspect ratio
  const aspect = CANVAS_W / CANVAS_H;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  canvas.style.width = Math.floor(w) + 'px';
  canvas.style.height = Math.floor(h) + 'px';
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;
  screenScale = w / CANVAS_W;
}
window.addEventListener('resize', resize);

// ─── Init / Reset ──────────────────────────────────────────
function initGame() {
  orb = { x: CANVAS_W / 2, y: 80 };
  fallSpeed = BASE_FALL_SPEED;
  score = 0;
  cameraY = 0;
  distanceTraveled = 0;
  barriersPassed = 0;
  boosting = false;
  barriers = [];
  particles = [];
  trail = [];
  lastGapCenter = CANVAS_W / 2;
  lastShift = 0;
  barriersSpawned = 0;

  // Pre-generate initial barriers below the start
  for (let i = 0; i < 20; i++) {
    spawnBarrier(200 + i * BARRIER_GAP);
  }
  updateHUD();
}

// ─── Barrier generation ────────────────────────────────────
const REVERSAL_START = 50;   // max reversal px for the first barriers
const REVERSAL_INC   = 2;    // extra reversal px allowed per barrier spawned
const REVERSAL_CAP   = 200;  // hard cap on the ramp component
const REACH_MARGIN   = 0.8;  // fraction of theoretical max reach to allow (leaves reaction room)

function spawnBarrier(worldY) {
  const gapW = Math.max(GAP_WIDTH_FLOOR, GAP_WIDTH_MAX - barriersPassed * GAP_NARROW_RATE);
  const minGapX = gapW / 2 + 10;
  const maxGapX = CANVAS_W - gapW / 2 - 10;

  // Pick a random candidate gap center
  let gapCenter = minGapX + Math.random() * (maxGapX - minGapX);

  // Physics cap: max horizontal distance the orb can travel between two barriers
  // frames between barriers â‰ˆ BARRIER_GAP / estimatedSpeed
  const estSpeed = Math.min(MAX_FALL_SPEED, BASE_FALL_SPEED + barriersSpawned * SPEED_INC * 60);
  const framesBetween = BARRIER_GAP / estSpeed;
  const maxReach = ORB_X_SPEED * framesBetween * REACH_MARGIN;

  // Limit zig-zag: if this shift reverses the previous one, cap the reversal magnitude
  const shift = gapCenter - lastGapCenter;
  if (lastShift !== 0 && Math.sign(shift) !== Math.sign(lastShift)) {
    // Take the tighter of the difficulty ramp and the physics limit
    const rampLimit = Math.min(REVERSAL_CAP, REVERSAL_START + barriersSpawned * REVERSAL_INC);
    const maxReversal = Math.min(rampLimit, maxReach);
    if (Math.abs(shift) > maxReversal) {
      gapCenter = lastGapCenter + Math.sign(shift) * maxReversal;
      gapCenter = Math.max(minGapX, Math.min(maxGapX, gapCenter));
    }
  }

  const finalShift = gapCenter - lastGapCenter;
  lastShift = finalShift;
  lastGapCenter = gapCenter;
  barriersSpawned++;

  const color = C_BARRIER[Math.floor(Math.random() * C_BARRIER.length)];

  barriers.push({
    y: worldY,
    gapCenter: gapCenter,
    gapWidth: gapW,
    color: color,
    passed: false,
    glowPhase: Math.random() * Math.PI * 2,
  });
}

function ensureBarriers() {
  // Keep barriers spawned ahead of the camera
  const furthest = barriers.length > 0 ? barriers[barriers.length - 1].y : 0;
  const needed = cameraY + CANVAS_H + 400;
  let y = furthest + BARRIER_GAP;
  while (y < needed) {
    spawnBarrier(y);
    y += BARRIER_GAP;
  }
  // Remove barriers far above camera
  while (barriers.length > 0 && barriers[0].y < cameraY - 100) {
    barriers.shift();
  }
}

// ─── Particles ─────────────────────────────────────────────
function spawnParticles(x, y, count, colors, spread) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = spread * (0.5 + Math.random());
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1,
      decay: 0.015 + Math.random() * 0.025,
      color: colors[Math.floor(Math.random() * colors.length)],
      r: 2 + Math.random() * 3,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const screenY = p.y - cameraY;
    if (screenY < -20 || screenY > CANVAS_H + 20) continue;
    ctx.save();
    ctx.globalAlpha = p.life * 0.8;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, screenY, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Trail ─────────────────────────────────────────────────
function updateTrail() {
  trail.push({ x: orb.x, y: orb.y, life: 1 });
  if (trail.length > 30) trail.shift();
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].life -= 0.04;
    if (trail[i].life <= 0) { trail.splice(i, 1); }
  }
}

function drawTrail() {
  for (const t of trail) {
    const screenY = t.y - cameraY;
    if (screenY < -20 || screenY > CANVAS_H + 20) continue;
    ctx.save();
    ctx.globalAlpha = t.life * 0.35;
    ctx.shadowColor = C_TRAIL;
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = C_TRAIL;
    ctx.beginPath();
    ctx.arc(t.x, screenY, ORB_RADIUS * t.life * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Collision detection ───────────────────────────────────
function checkCollision() {
  const orbTop = orb.y - ORB_RADIUS;
  const orbBot = orb.y + ORB_RADIUS;

  for (const b of barriers) {
    const bTop = b.y;
    const bBot = b.y + BARRIER_HEIGHT;

    // Check if orb overlaps vertically with barrier
    if (orbBot > bTop && orbTop < bBot) {
      // Check if orb is outside the gap
      const gapLeft  = b.gapCenter - b.gapWidth / 2;
      const gapRight = b.gapCenter + b.gapWidth / 2;

      if (orb.x - ORB_RADIUS < gapLeft || orb.x + ORB_RADIUS > gapRight) {
        return true;
      }
    }

    // Mark as passed for scoring
    if (!b.passed && orb.y > b.y + BARRIER_HEIGHT) {
      b.passed = true;
      barriersPassed++;
      score = barriersPassed;
      // Spawn pass-through sparkles
      spawnParticles(orb.x, orb.y, 6, ['#06d6a0', '#38bdf8', '#a855f7'], 2.5);
      updateHUD();
    }
  }
  return false;
}

// ─── Game logic (per frame) ────────────────────────────────
function update() {
  // Lateral movement
  let moveX = 0;
  if (keysDown['ArrowLeft'] || keysDown['a'] || keysDown['A'])  moveX -= 1;
  if (keysDown['ArrowRight'] || keysDown['d'] || keysDown['D']) moveX += 1;

  orb.x += moveX * ORB_X_SPEED;
  // Clamp to canvas bounds
  orb.x = Math.max(ORB_RADIUS + 2, Math.min(CANVAS_W - ORB_RADIUS - 2, orb.x));

  // Boost
  boosting = keysDown['ArrowDown'] || keysDown['s'] || keysDown['S'] || keysDown[' '] || keysDown['boost'];
  const currentSpeed = boosting ? fallSpeed * BOOST_MULT : fallSpeed;

  // Fall
  orb.y += currentSpeed;
  distanceTraveled += currentSpeed;

  // Accelerate over time
  fallSpeed = Math.min(MAX_FALL_SPEED, fallSpeed + SPEED_INC);

  // Camera follows orb (orb stays in upper portion of screen)
  const targetCameraY = orb.y - CANVAS_H * 0.25;
  cameraY += (targetCameraY - cameraY) * 0.1;

  // Ensure barriers exist ahead
  ensureBarriers();

  // Update trail
  updateTrail();

  // Update particles
  updateParticles();

  // Collision
  if (checkCollision()) {
    // Death particles
    spawnParticles(orb.x, orb.y, 30, C_PARTICLE, 5);
    endGame();
  }
}

// ─── HUD ───────────────────────────────────────────────────
function updateHUD() {
  hudScore.textContent = `Score: ${score}`;
  hudHigh.textContent  = `Best: ${highScore}`;
}

// ─── Drawing ───────────────────────────────────────────────
function draw() {
  const w = CANVAS_W;
  const h = CANVAS_H;

  // Background
  ctx.fillStyle = C_BG;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 0.5;
  const gridSize = 40;
  const gridOffset = cameraY % gridSize;
  for (let y = -gridOffset; y < h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }

  // Draw depth indicator lines (subtle side markers)
  const depthMark = Math.floor(cameraY / 200);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#a855f7';
  for (let d = depthMark - 2; d < depthMark + 8; d++) {
    const markY = d * 200 - cameraY;
    if (markY > -10 && markY < h + 10) {
      ctx.fillRect(0, markY, 8, 1);
      ctx.fillRect(w - 8, markY, 8, 1);
    }
  }
  ctx.restore();

  // Barriers
  const now = performance.now();
  for (const b of barriers) {
    const screenY = b.y - cameraY;
    if (screenY < -20 || screenY > h + 20) continue;

    const gapLeft  = b.gapCenter - b.gapWidth / 2;
    const gapRight = b.gapCenter + b.gapWidth / 2;
    const glowVal  = 0.6 + Math.sin(now * 0.003 + b.glowPhase) * 0.2;

    ctx.save();
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 12 * glowVal;
    ctx.fillStyle   = b.color;
    ctx.globalAlpha = 0.85;

    // Left barrier segment
    if (gapLeft > 0) {
      roundRect(ctx, 0, screenY, gapLeft, BARRIER_HEIGHT, 3);
      ctx.fill();
    }
    // Right barrier segment
    if (gapRight < w) {
      roundRect(ctx, gapRight, screenY, w - gapRight, BARRIER_HEIGHT, 3);
      ctx.fill();
    }

    // Gap edge glow dots
    ctx.globalAlpha = 0.4 * glowVal;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(gapLeft, screenY + BARRIER_HEIGHT / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gapRight, screenY + BARRIER_HEIGHT / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Trail
  drawTrail();

  // Orb
  const orbScreenY = orb.y - cameraY;
  const orbPulse = 1 + Math.sin(now * 0.005) * 0.08;

  // Outer glow
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.shadowColor = C_ORB;
  ctx.shadowBlur  = 40;
  ctx.fillStyle   = C_ORB;
  ctx.beginPath();
  ctx.arc(orb.x, orbScreenY, ORB_RADIUS * 2.5 * orbPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main orb body
  ctx.save();
  ctx.shadowColor = C_ORB;
  ctx.shadowBlur  = 25 * orbPulse;
  const orbGrad = ctx.createRadialGradient(
    orb.x - 3, orbScreenY - 3, 1,
    orb.x, orbScreenY, ORB_RADIUS
  );
  orbGrad.addColorStop(0, C_ORB_CORE);
  orbGrad.addColorStop(0.5, C_ORB);
  orbGrad.addColorStop(1, 'rgba(168, 85, 247, 0.6)');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(orb.x, orbScreenY, ORB_RADIUS * orbPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Boost indicator (brighter glow when boosting)
  if (boosting) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur  = 30;
    ctx.fillStyle   = '#facc15';
    ctx.beginPath();
    ctx.arc(orb.x, orbScreenY, ORB_RADIUS * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Particles
  drawParticles();

  // Vignette overlay
  const vignette = ctx.createRadialGradient(w/2, h/2, h * 0.3, w/2, h/2, h * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

// ─── Utilities ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  if (w < 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Game flow ─────────────────────────────────────────────
function startGame() {
  gameState = 'playing';
  startOvl.classList.remove('overlay--visible');
  startOvl.classList.add('overlay--hidden');
  gameoverOvl.classList.remove('overlay--visible');
  gameoverOvl.classList.add('overlay--hidden');
  initGame();
}

function endGame() {
  gameState = 'gameover';
  gameOverTime = performance.now();
  const isNewBest = score > highScore;
  if (isNewBest) {
    highScore = score;
    saveHigh(highScore);
  }
  finalScoreE.textContent = score;
  finalHighE.textContent  = `Best: ${highScore}`;
  newBestE.style.display  = isNewBest ? 'block' : 'none';
  gameoverOvl.classList.remove('overlay--hidden');
  gameoverOvl.classList.add('overlay--visible');
  updateHUD();
}

// ─── Main loop ─────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);

  if (gameState === 'playing') {
    update();
  }

  draw();
}

// ─── Input handling ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (canRestart()) {
    startGame();
    return;
  }
  keysDown[e.key] = true;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  delete keysDown[e.key];
});

// Mobile buttons
function handleMobileDown(dir) {
  if (canRestart()) {
    startGame();
    return;
  }
  if (dir === 'left') {
    keysDown['ArrowLeft'] = true;
  } else if (dir === 'right') {
    keysDown['ArrowRight'] = true;
  } else if (dir === 'boost') {
    keysDown['boost'] = true;
  }
}
function handleMobileUp(dir) {
  if (dir === 'left') {
    delete keysDown['ArrowLeft'];
  } else if (dir === 'right') {
    delete keysDown['ArrowRight'];
  } else if (dir === 'boost') {
    delete keysDown['boost'];
  }
}

document.querySelectorAll('.mobile-btn[data-dir]').forEach(btn => {
  const dir = btn.dataset.dir;
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleMobileDown(dir);
  });
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleMobileUp(dir);
  });
  btn.addEventListener('mousedown', () => handleMobileDown(dir));
  btn.addEventListener('mouseup', () => handleMobileUp(dir));
  btn.addEventListener('mouseleave', () => handleMobileUp(dir));
});

// Tap canvas overlays to start
wrapEl.addEventListener('click', () => {
  if (canRestart()) {
    startGame();
  }
});

// Swipe support
let touchStartX = 0, touchStartY = 0;
let touchActive = false;
canvas.addEventListener('touchstart', (e) => {
  if (canRestart()) {
    startGame();
    e.preventDefault();
    return;
  }
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchActive = true;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (gameState !== 'playing' || !touchActive) return;
  e.preventDefault();
  const t = e.touches[0];
  const dx = t.clientX - touchStartX;
  const threshold = 10;
  // Clear previous direction
  delete keysDown['ArrowLeft'];
  delete keysDown['ArrowRight'];
  if (dx < -threshold) {
    keysDown['ArrowLeft'] = true;
  } else if (dx > threshold) {
    keysDown['ArrowRight'] = true;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  touchActive = false;
  delete keysDown['ArrowLeft'];
  delete keysDown['ArrowRight'];
}, { passive: false });

// ─── Boot ──────────────────────────────────────────────────
highScore = loadHigh();
resize();
initGame();
updateHUD();
requestAnimationFrame(loop);
