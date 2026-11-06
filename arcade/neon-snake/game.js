// ─── Configuration ──────────────────────────────────────────
const GRID_COUNT  = 20;        // cells per axis
const BASE_SPEED  = 140;       // ms per tick at start
const MIN_SPEED   = 60;        // fastest tick
const SPEED_STEP  = 3;         // ms faster per food eaten

// Colors
const C_BG        = '#080c18';
const C_GRID      = 'rgba(56, 189, 248, 0.04)';
const C_HEAD      = '#06d6a0';
const C_TAIL      = '#22c55e';
const C_FOOD      = '#f472b6';
const C_FOOD_ALT  = '#fb923c';
const C_PARTICLE  = ['#06d6a0', '#22c55e', '#38bdf8', '#a855f7', '#f472b6', '#facc15'];

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
let cellSize, score, highScore, snake, dir, nextDir, food, speed;
let particles = [];
let gameState = 'start'; // 'start' | 'playing' | 'gameover'
let lastTick = 0;
let animId;

// ─── High score persistence ────────────────────────────────
function loadHigh() {
  try { return parseInt(localStorage.getItem('arcade.neon-snake.high-score') || localStorage.getItem('neonSnakeHigh'), 10) || 0; } catch { return 0; }
}
function saveHigh(v) {
  try { localStorage.setItem('arcade.neon-snake.high-score', v); } catch {}
}

// ─── Canvas sizing ─────────────────────────────────────────
function resize() {
  const maxW = Math.min(window.innerWidth - 32, 700);
  const maxH = Math.min(window.innerHeight - 200, 700);
  const side = Math.floor(Math.min(maxW, maxH) / GRID_COUNT) * GRID_COUNT;
  canvas.width  = side;
  canvas.height = side;
  cellSize = side / GRID_COUNT;
}
window.addEventListener('resize', resize);

// ─── Init / Reset ──────────────────────────────────────────
function initGame() {
  const mid = Math.floor(GRID_COUNT / 2);
  snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score   = 0;
  speed   = BASE_SPEED;
  particles = [];
  placeFood();
  updateHUD();
}

// ─── Food placement ────────────────────────────────────────
function placeFood() {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * GRID_COUNT), y: Math.floor(Math.random() * GRID_COUNT) };
  } while (occupied.has(`${pos.x},${pos.y}`));
  food = pos;
  food.hue = Math.random() > 0.5 ? 0 : 1; // alternate color
}

// ─── Particles ─────────────────────────────────────────────
function spawnParticles(cx, cy) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 1.5 + Math.random() * 3;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1,
      decay: 0.02 + Math.random() * 0.02,
      color: C_PARTICLE[Math.floor(Math.random() * C_PARTICLE.length)],
      r: 2 + Math.random() * 3,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Game logic tick ───────────────────────────────────────
function tick() {
  // Apply queued direction
  dir = { ...nextDir };

  // Move head
  const head = {
    x: (snake[0].x + dir.x + GRID_COUNT) % GRID_COUNT,
    y: (snake[0].y + dir.y + GRID_COUNT) % GRID_COUNT,
  };

  // Self-collision check
  for (const seg of snake) {
    if (seg.x === head.x && seg.y === head.y) {
      endGame();
      return;
    }
  }

  snake.unshift(head);

  // Eat food?
  if (head.x === food.x && head.y === food.y) {
    score++;
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    spawnParticles(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2
    );
    placeFood();
    updateHUD();
  } else {
    snake.pop();
  }
}

// ─── HUD ───────────────────────────────────────────────────
function updateHUD() {
  hudScore.textContent = `Score: ${score}`;
  hudHigh.textContent  = `Best: ${highScore}`;
}

// ─── Drawing ───────────────────────────────────────────────
function draw() {
  const w = canvas.width;
  const h = canvas.height;

  // Background
  ctx.fillStyle = C_BG;
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < GRID_COUNT; i++) {
    const p = i * cellSize;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke();
  }

  // Food
  const fx = food.x * cellSize + cellSize / 2;
  const fy = food.y * cellSize + cellSize / 2;
  const foodR = cellSize * 0.35;
  const foodPulse = 1 + Math.sin(performance.now() / 300) * 0.15;
  const foodColor = food.hue === 0 ? C_FOOD : C_FOOD_ALT;

  ctx.save();
  ctx.shadowColor = foodColor;
  ctx.shadowBlur  = 22 * foodPulse;
  ctx.fillStyle   = foodColor;
  ctx.beginPath();
  ctx.arc(fx, fy, foodR * foodPulse, 0, Math.PI * 2);
  ctx.fill();
  // outer glow ring
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(fx, fy, foodR * foodPulse * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Snake
  const total = snake.length;
  for (let i = total - 1; i >= 0; i--) {
    const seg = snake[i];
    const t = total > 1 ? i / (total - 1) : 0; // 0 = tail, 1 = head
    const sx = seg.x * cellSize;
    const sy = seg.y * cellSize;
    const pad = cellSize * 0.08;
    const r = cellSize * 0.18;

    // Interpolate color from tail->head
    const color = lerpColor(C_TAIL, C_HEAD, t);

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = i === 0 ? 18 : 10;
    ctx.fillStyle   = color;

    // Rounded rect
    roundRect(ctx, sx + pad, sy + pad, cellSize - pad * 2, cellSize - pad * 2, r);
    ctx.fill();

    // Head eye dots
    if (i === 0) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = C_BG;
      const eyeR = cellSize * 0.08;
      const eyeOff = cellSize * 0.22;
      if (dir.x === 1) { // right
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.65, sy + cellSize * 0.32, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.65, sy + cellSize * 0.68, eyeR, 0, Math.PI * 2); ctx.fill();
      } else if (dir.x === -1) { // left
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.35, sy + cellSize * 0.32, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.35, sy + cellSize * 0.68, eyeR, 0, Math.PI * 2); ctx.fill();
      } else if (dir.y === -1) { // up
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.32, sy + cellSize * 0.35, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.68, sy + cellSize * 0.35, eyeR, 0, Math.PI * 2); ctx.fill();
      } else { // down
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.32, sy + cellSize * 0.65, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + cellSize * 0.68, sy + cellSize * 0.65, eyeR, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // Particles
  drawParticles();
}

// ─── Utilities ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
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

function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

// ─── Game flow ─────────────────────────────────────────────
function startGame() {
  gameState = 'playing';
  startOvl.classList.remove('overlay--visible');
  startOvl.classList.add('overlay--hidden');
  gameoverOvl.classList.remove('overlay--visible');
  gameoverOvl.classList.add('overlay--hidden');
  initGame();
  lastTick = performance.now();
}

function endGame() {
  gameState = 'gameover';
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
function loop(ts) {
  animId = requestAnimationFrame(loop);

  if (gameState === 'playing') {
    if (ts - lastTick >= speed) {
      tick();
      lastTick = ts;
    }
    updateParticles();
  }

  draw();
}

// ─── Input handling ────────────────────────────────────────
const DIR_MAP = {
  ArrowUp:    { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
  w: { x:  0, y: -1 },
  s: { x:  0, y:  1 },
  a: { x: -1, y:  0 },
  d: { x:  1, y:  0 },
  W: { x:  0, y: -1 },
  S: { x:  0, y:  1 },
  A: { x: -1, y:  0 },
  D: { x:  1, y:  0 },
};

document.addEventListener('keydown', (e) => {
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
    return;
  }
  const d = DIR_MAP[e.key];
  if (d) {
    e.preventDefault();
    // Prevent reversing into yourself
    if (d.x !== -dir.x || d.y !== -dir.y) {
      nextDir = d;
    }
  }
});

// Mobile D-pad buttons
function handleDpad(btn) {
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
    return;
  }
  const dirName = btn.dataset.dir;
  const map = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} };
  const d = map[dirName];
  if (d && (d.x !== -dir.x || d.y !== -dir.y)) {
    nextDir = d;
  }
}

document.querySelectorAll('.mobile-btn[data-dir]').forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDpad(btn);
  });
  btn.addEventListener('click', (e) => {
    handleDpad(btn);
  });
});

// Tap canvas overlays to start
wrapEl.addEventListener('click', () => {
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
  }
});

// Swipe support on canvas
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  if (gameState === 'start' || gameState === 'gameover') {
    startGame();
    e.preventDefault();
    return;
  }
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (gameState !== 'playing') return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const minSwipe = 20;
  if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
  let d;
  if (Math.abs(dx) > Math.abs(dy)) {
    d = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    d = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }
  if (d.x !== -dir.x || d.y !== -dir.y) {
    nextDir = d;
  }
}, { passive: false });

// ─── Boot ──────────────────────────────────────────────────
highScore = loadHigh();
resize();
initGame();
updateHUD();
requestAnimationFrame(loop);
