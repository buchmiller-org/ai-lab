/**
 * Bit Breaker - Main Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const levelOverlay = document.getElementById('level-overlay');
const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const livesDisplay = document.getElementById('lives-display');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const comboContainer = document.getElementById('combo-container');
const comboValueDisplay = document.getElementById('combo-value');
const bestScoreDisplay = document.getElementById('best-score-display');

// Game State
let gameState = 'START'; // START, PLAYING, LEVEL_END, GAME_OVER
let animationId;
let lastTime = 0;

// Game Metrics
let score = 0;
let level = 1;
let lives = 3;
let bestScore = parseInt(localStorage.getItem('bitBreakerBestScore')) || 0;
bestScoreDisplay.textContent = bestScore;
let comboMultiplier = 1;
let consecutiveHits = 0;
let shakeTime = 0;

// Particle System
const particles = new ParticleSystem();

// Colors mapping to rows (Top to bottom)
const brickColors = [
  '#ff0055', // Red/Pink
  '#ffbb00', // Orange/Yellow
  '#00ffcc', // Cyan
  '#0088ff', // Blue
  '#ff00ff'  // Magenta
];

// Inputs
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  Space: false
};

// Entities
let paddle = {
  x: canvas.width / 2 - 50,
  y: canvas.height - 30,
  width: 100,
  height: 15,
  speed: 8,
  color: '#00ffcc',
  targetX: canvas.width / 2 - 50
};

let balls = [];
let bricks = [];
let powerups = [];

function initBall() {
  balls = [{
    x: canvas.width / 2,
    y: paddle.y - 10,
    radius: 6,
    speed: 3 + (level * 0.5),
    dx: 3 * (Math.random() > 0.5 ? 1 : -1),
    dy: -(3 + (level * 0.5)),
    color: '#ffffff',
    active: false // Waits for player to click or space
  }];
}

function buildLevel() {
  bricks = [];
  const rows = Math.min(5 + Math.floor(level / 2), 8);
  const cols = 10;
  const padding = 10;
  const offsetTop = 60;
  const offsetLeft = 35;
  const w = (canvas.width - offsetLeft * 2 - padding * (cols - 1)) / cols;
  const h = 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Randomly leave some empty spaces in higher levels
      if (level > 2 && Math.random() > 0.8) continue;
      
      const brickX = offsetLeft + c * (w + padding);
      const brickY = offsetTop + r * (h + padding);
      const colorProfile = brickColors[r % brickColors.length];
      
      bricks.push({
        x: brickX,
        y: brickY,
        width: w,
        height: h,
        color: colorProfile,
        status: 1, // 1 = active, 0 = broken
        value: (rows - r) * 10
      });
    }
  }
}

// Controls
window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = true;
  }
  
  if (e.code === 'Space') {
    if (gameState === 'START') startGame();
    else if (gameState === 'PLAYING' && !balls[0].active) {
      balls[0].active = true;
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.code)) {
    keys[e.code] = false;
  }
});

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const mouseX = (e.clientX - rect.left) * scaleX;
  
  paddle.targetX = mouseX - paddle.width / 2;
});

window.addEventListener('mousedown', (e) => {
  // Prevent triggering if clicked on the arcade return link or a button
  if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
  
  if (gameState === 'START') startGame();
  else if (gameState === 'PLAYING' && balls.length > 0 && !balls[0].active) {
    balls[0].active = true;
  }
});

restartBtn.addEventListener('click', resetGame);

// Core Logic
function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  updateHUD();
  gameOverOverlay.classList.remove('active');
  startGame();
}

function startGame() {
  gameState = 'PLAYING';
  startOverlay.classList.remove('active');
  paddle.width = 100;
  comboMultiplier = 1;
  consecutiveHits = 0;
  hideCombo();
  initBall();
  buildLevel();
  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

function nextLevel() {
  gameState = 'LEVEL_END';
  level++;
  updateHUD();
  levelOverlay.classList.add('active');
  
  setTimeout(() => {
    levelOverlay.classList.remove('active');
    paddle.width = 100;
    initBall();
    buildLevel();
    powerups = [];
    particles.particles = [];
    gameState = 'PLAYING';
  }, 2000);
}

function loseLife() {
  lives--;
  updateHUD();
  comboMultiplier = 1;
  consecutiveHits = 0;
  hideCombo();
  powerups = [];
  paddle.width = 100;
  
  if (lives <= 0) {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('bitBreakerBestScore', bestScore);
      bestScoreDisplay.textContent = bestScore;
    }
    gameState = 'GAME_OVER';
    finalScoreDisplay.textContent = score;
    gameOverOverlay.classList.add('active');
  } else {
    initBall();
  }
}

function spawnPowerup(x, y) {
  if (Math.random() > 0.15) return; // 15% chance
  
  const types = ['WIDE', 'MULTIBALL'];
  const type = types[Math.floor(Math.random() * types.length)];
  const color = type === 'WIDE' ? '#0088ff' : '#ff00ff';
  
  powerups.push({
    x: x,
    y: y,
    width: 20,
    height: 20,
    dy: 3,
    type: type,
    color: color
  });
}

function applyPowerup(type) {
  if (type === 'WIDE') {
    paddle.width = Math.min(paddle.width + 40, 200);
  } else if (type === 'MULTIBALL') {
    if (balls.length < 5 && balls[0].active) {
      let b1 = {...balls[0]};
      b1.dx = -b1.dx;
      balls.push(b1);
    }
  }
}

function screenShake() {
  shakeTime = 10;
}

function showCombo() {
  if (comboMultiplier > 1) {
    comboValueDisplay.textContent = `x${comboMultiplier}`;
    comboContainer.classList.remove('hidden');
    comboContainer.classList.add('active');
  }
}

function hideCombo() {
  comboContainer.classList.remove('active');
  setTimeout(() => {
    if (comboMultiplier <= 1) comboContainer.classList.add('hidden');
  }, 300);
}

function updateHUD() {
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level;
  livesDisplay.textContent = lives;
}

// Update Loop
function update(dt) {
  if (gameState !== 'PLAYING') return;

  // Paddle logic
  if (keys.ArrowLeft) paddle.targetX -= paddle.speed;
  if (keys.ArrowRight) paddle.targetX += paddle.speed;
  
  // Smooth paddle movement toward target
  paddle.x += (paddle.targetX - paddle.x) * 0.4;
  
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;

  let activeBricksCount = 0;
  for (let brick of bricks) {
    if (brick.status === 1) activeBricksCount++;
  }

  // Update Balls
  for (let i = balls.length - 1; i >= 0; i--) {
    let b = balls[i];
    
    if (!b.active) {
      b.x = paddle.x + paddle.width / 2;
      b.y = paddle.y - b.radius - 1;
      continue;
    }

    // Move ball
    b.x += b.dx;
    b.y += b.dy;
    
    // Create trail
    particles.createTrail(b.x, b.y, b.color);

    // Wall collision
    if (b.x - b.radius < 0) { b.x = b.radius; b.dx = -b.dx; }
    if (b.x + b.radius > canvas.width) { b.x = canvas.width - b.radius; b.dx = -b.dx; }
    if (b.y - b.radius < 0) { b.y = b.radius; b.dy = -b.dy; }
    
    // Floor collision
    if (b.y + b.radius > canvas.height) {
      balls.splice(i, 1);
      continue;
    }

    // Paddle collision
    if (b.dy > 0 && 
        b.y + b.radius > paddle.y && 
        b.y - b.radius < paddle.y + paddle.height &&
        b.x > paddle.x && 
        b.x < paddle.x + paddle.width) {
      
      b.y = paddle.y - b.radius;
      b.dy = -b.dy;
      
      // Affect angle based on hit location
      let hitOffset = (b.x - (paddle.x + paddle.width/2)) / (paddle.width/2);
      b.dx = hitOffset * b.speed * 1.5; // Bending the bounce
      
      // Reset Combo
      comboMultiplier = 1;
      consecutiveHits = 0;
      hideCombo();
      
      particles.emit(b.x, b.y, paddle.color, 5);
      
      // Ensure vertical speed doesn't drop too low to avoid boring horizontal bouncing
      if (Math.abs(b.dy) < b.speed * 0.5) {
        b.dy = -(b.speed * 0.8);
      }
    }

    // Brick collision (Simplified AABB)
    let closestBrick = null;
    let closestDist = Infinity;

    for (let brick of bricks) {
      if (brick.status === 1) {
        let cx = Math.max(brick.x, Math.min(b.x, brick.x + brick.width));
        let cy = Math.max(brick.y, Math.min(b.y, brick.y + brick.height));
        let dist = (b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy);
        
        if (dist < b.radius * b.radius && dist < closestDist) {
            closestDist = dist;
            closestBrick = brick;
        }
      }
    }

    if (closestBrick) {
      closestBrick.status = 0;
      score += closestBrick.value * comboMultiplier;
      
      consecutiveHits++;
      if (consecutiveHits > 2) {
        comboMultiplier = Math.min(10, Math.floor(consecutiveHits / 2));
        showCombo();
      }
      
      updateHUD();
      particles.emit(closestBrick.x + closestBrick.width/2, closestBrick.y + closestBrick.height/2, closestBrick.color, 15);
      spawnPowerup(closestBrick.x + closestBrick.width/2, closestBrick.y);
      screenShake();
      
      // Determine bounce direction
      let overlapLeft = b.x + b.radius - closestBrick.x;
      let overlapRight = closestBrick.x + closestBrick.width - (b.x - b.radius);
      let overlapTop = b.y + b.radius - closestBrick.y;
      let overlapBottom = closestBrick.y + closestBrick.height - (b.y - b.radius);
      
      let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      
      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        b.dx = -b.dx;
      } else {
        b.dy = -b.dy;
      }
    }
  }

  if (balls.length === 0) {
    loseLife();
  } else if (activeBricksCount === 0 && gameState === 'PLAYING') {
    nextLevel();
  }

  // Update Powerups
  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    p.y += p.dy;
    
    // Catch powerup
    if (p.y + p.height > paddle.y && 
        p.y < paddle.y + paddle.height &&
        p.x + p.width > paddle.x && 
        p.x < paddle.x + paddle.width) {
      
      applyPowerup(p.type);
      particles.emit(p.x, p.y, p.color, 10);
      powerups.splice(i, 1);
      score += 50;
      updateHUD();
      continue;
    }
    
    if (p.y > canvas.height) {
      powerups.splice(i, 1);
    }
  }

  particles.update();
  if (shakeTime > 0) shakeTime--;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  
  if (shakeTime > 0) {
    const magnitude = shakeTime * 0.5;
    const dx = (Math.random() - 0.5) * magnitude;
    const dy = (Math.random() - 0.5) * magnitude;
    ctx.translate(dx, dy);
  }

  // Draw Paddle
  ctx.fillStyle = paddle.color;
  ctx.shadowBlur = 15;
  ctx.shadowColor = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  
  // Draw Paddle Highlight
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(paddle.x, paddle.y, paddle.width, 3);
  ctx.shadowBlur = 0;

  // Draw Bricks
  for (let brick of bricks) {
    if (brick.status === 1) {
      ctx.fillStyle = brick.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 2);
    }
  }
  ctx.shadowBlur = 0;

  // Draw Powerups
  for (let p of powerups) {
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.color;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(p.type === 'WIDE' ? 'W' : 'M', p.x + p.width/2, p.y + p.height/2 + 3);
  }
  ctx.shadowBlur = 0;

  // Draw Particles
  particles.draw(ctx);

  // Draw Balls
  for (let b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = b.color;
    ctx.fill();
    ctx.closePath();
  }

  ctx.restore();
}

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Fixed time step is better, but this simple update works for arcade feel
  update(dt);
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

// Initial draw, but don't start the loop until interaction
updateHUD();
