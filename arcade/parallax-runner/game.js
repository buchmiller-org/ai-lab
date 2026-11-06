// ============================================
// Parallax Runner — Game Logic
// ============================================

(function () {
  'use strict';

  // --- DOM ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('canvas-wrap');
  const hudScore = document.getElementById('hud-score');
  const hudLayer = document.getElementById('hud-layer');
  const hudHigh = document.getElementById('hud-high');
  const overlayStart = document.getElementById('overlay-start');
  const overlayGameover = document.getElementById('overlay-gameover');
  const finalScoreEl = document.getElementById('final-score');
  const finalHighEl = document.getElementById('final-high');
  const newBestEl = document.getElementById('new-best');

  // --- Constants ---
  const STORAGE_KEY = 'arcade.parallax-runner.high-score';
  const BASE_SPEED = 1.8;
  const SPEED_RAMP = 0.0003; // per frame
  const GRAVITY = 0.45;
  const JUMP_FORCE = -12.5;
  const GROUND_Y_RATIO = 0.78; // ground line as ratio of canvas height
  const PLAYER_W = 26;
  const PLAYER_H = 34;
  const PLAYER_X_RATIO = 0.15; // player x position as ratio of canvas width
  const OBSTACLE_MIN_W = 20;
  const OBSTACLE_MAX_W = 40;
  const OBSTACLE_MIN_H = 20;

  // Difficulty scaling — ramps from easy to hard over ~500 score
  const DIFFICULTY_RAMP_FRAMES = 3000; // frames to reach full difficulty
  function getDifficulty() {
    return Math.min(1, frameCount / DIFFICULTY_RAMP_FRAMES);
  }
  function getObstacleMaxH() { return 35 + getDifficulty() * 55; } // 35 → 90
  function getMinGap() { return 280 - getDifficulty() * 120; }     // 280 → 160
  function getMaxGap() { return 450 - getDifficulty() * 150; }     // 450 → 300
  function getSpikeChance() { return 0.15 + getDifficulty() * 0.30; } // 15% → 45%

  // Layer definitions: name, color, speed multiplier, opacity when inactive
  const LAYERS = [
    { name: 'FAR', color: '#a855f7', rgb: '168,85,247', speedMult: 0.4, inactiveAlpha: 0.15, buildingAlpha: 0.12 },
    { name: 'MID', color: '#f472b6', rgb: '244,114,182', speedMult: 0.7, inactiveAlpha: 0.25, buildingAlpha: 0.18 },
    { name: 'NEAR', color: '#06d6a0', rgb: '6,214,160', speedMult: 1.0, inactiveAlpha: 0.35, buildingAlpha: 0.25 },
  ];

  // --- State ---
  let W, H, groundY, playerX;
  let state = 'start'; // start | playing | gameover
  let score = 0;
  let highScore = parseInt(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('parallax-runner-high')) || 0;
  let speed = BASE_SPEED;
  let activeLayer = 1; // 0=far, 1=mid, 2=near
  let frameCount = 0;
  let gameOverTime = 0; // timestamp for restart lockout

  // Player
  let player = { y: 0, vy: 0, onGround: true };

  // Obstacles per layer
  let obstacles = [[], [], []];

  // Parallax background buildings per layer
  let buildings = [[], [], []];

  // Stars
  let stars = [];

  // Input
  let keys = {};
  let jumpQueued = false;
  let switchQueued = 0; // -1=up(far), 1=down(near)

  // Touch
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartTime = 0;

  // --- Resize ---
  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H * GROUND_Y_RATIO;
    playerX = W * PLAYER_X_RATIO;
  }

  // --- Stars ---
  function initStars() {
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * groundY * 0.6,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.5 + 0.3,
      });
    }
  }

  // --- Buildings (parallax scenery) ---
  function initBuildings() {
    for (let li = 0; li < 3; li++) {
      buildings[li] = [];
      let x = 0;
      while (x < W + 200) {
        const w = 30 + Math.random() * 60;
        const h = 30 + Math.random() * (80 + li * 30);
        buildings[li].push({ x, w, h });
        x += w + Math.random() * 20 + 5;
      }
    }
  }

  // --- Obstacles ---
  function spawnObstacle(li) {
    const lastObs = obstacles[li][obstacles[li].length - 1];
    const minGap = getMinGap();
    const maxGap = getMaxGap();
    const startX = lastObs ? lastObs.x + lastObs.w + minGap + Math.random() * (maxGap - minGap) : W + Math.random() * 200;
    const w = OBSTACLE_MIN_W + Math.random() * (OBSTACLE_MAX_W - OBSTACLE_MIN_W);
    const maxH = getObstacleMaxH();
    const h = OBSTACLE_MIN_H + Math.random() * (maxH - OBSTACLE_MIN_H);
    // Some obstacles are tall thin spikes, some are short wide blocks
    const type = Math.random() < getSpikeChance() ? 'spike' : 'block';
    const finalW = type === 'spike' ? w * 0.5 : w;
    const finalH = type === 'spike' ? h * 1.3 : h;
    obstacles[li].push({ x: startX, w: finalW, h: finalH, type });
  }

  function initObstacles() {
    for (let li = 0; li < 3; li++) {
      obstacles[li] = [];
      // Start with 3-4 obstacles spread out
      const count = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        spawnObstacle(li);
      }
    }
  }

  // --- Reset ---
  function resetGame() {
    speed = BASE_SPEED;
    score = 0;
    frameCount = 0;
    activeLayer = 1;
    player = { y: groundY - PLAYER_H, vy: 0, onGround: true };
    initStars();
    initBuildings();
    initObstacles();
    updateHUD();
  }

  // --- HUD ---
  function updateHUD() {
    hudScore.textContent = 'Score: ' + Math.floor(score);
    hudLayer.textContent = 'Layer: ' + LAYERS[activeLayer].name;
    hudLayer.style.color = LAYERS[activeLayer].color;
    hudHigh.textContent = 'Best: ' + highScore;
  }

  // --- Drawing ---
  function drawStars() {
    for (const s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBuildings(li, alpha) {
    const layer = LAYERS[li];
    ctx.globalAlpha = alpha;
    for (const b of buildings[li]) {
      // Building body
      ctx.fillStyle = layer.color;
      ctx.fillRect(b.x, groundY - b.h, b.w, b.h);

      // Window dots
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const winSize = 3;
      const gap = 8;
      for (let wy = groundY - b.h + 8; wy < groundY - 6; wy += gap) {
        for (let wx = b.x + 6; wx < b.x + b.w - 4; wx += gap) {
          ctx.fillRect(wx, wy, winSize, winSize);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    // Ground line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Grid lines below ground
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let y = groundY + 20; y < H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function drawObstacles(li, alpha) {
    const layer = LAYERS[li];
    ctx.globalAlpha = alpha;

    for (const obs of obstacles[li]) {
      const ox = obs.x;
      const oy = groundY - obs.h;

      if (obs.type === 'spike') {
        // Triangle spike
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(ox, groundY);
        ctx.lineTo(ox + obs.w / 2, oy);
        ctx.lineTo(ox + obs.w, groundY);
        ctx.closePath();
        ctx.fill();

        // Glow
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Block
        ctx.fillStyle = layer.color;
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(ox, oy, obs.w, obs.h);
        ctx.shadowBlur = 0;

        // Stripe detail
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(ox, oy, obs.w, 3);
        ctx.fillRect(ox, oy + obs.h - 3, obs.w, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const px = playerX;
    const py = player.y;
    const layer = LAYERS[activeLayer];

    ctx.save();

    // Glow
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = 20;

    // Body
    ctx.fillStyle = layer.color;
    ctx.fillRect(px, py, PLAYER_W, PLAYER_H);

    // Inner detail
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px + 3, py + 3, PLAYER_W - 6, PLAYER_H - 6);

    // Eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + PLAYER_W - 9, py + 8, 5, 5);

    // Small highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(px + 2, py + 2, 4, 8);

    ctx.restore();

    // Layer indicator arrows
    drawLayerIndicator(px, py);
  }

  function drawLayerIndicator(px, py) {
    const arrowSize = 5;
    const cx = px + PLAYER_W / 2;

    // Up arrow (can go to farther layer)
    if (activeLayer > 0) {
      ctx.fillStyle = LAYERS[activeLayer - 1].color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - arrowSize, py - 6);
      ctx.lineTo(cx, py - 6 - arrowSize);
      ctx.lineTo(cx + arrowSize, py - 6);
      ctx.closePath();
      ctx.fill();
    }

    // Down arrow (can go to nearer layer)
    if (activeLayer < 2) {
      ctx.fillStyle = LAYERS[activeLayer + 1].color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx - arrowSize, py + PLAYER_H + 6);
      ctx.lineTo(cx, py + PLAYER_H + 6 + arrowSize);
      ctx.lineTo(cx + arrowSize, py + PLAYER_H + 6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  // Layer switch flash effect
  let switchFlash = 0;
  let switchFlashColor = '';

  function drawSwitchFlash() {
    if (switchFlash > 0) {
      ctx.globalAlpha = switchFlash * 0.15;
      ctx.fillStyle = switchFlashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      switchFlash -= 0.05;
    }
  }

  // --- Update ---
  function update() {
    frameCount++;
    speed = BASE_SPEED + frameCount * SPEED_RAMP;
    score += speed * 0.1;

    // Stars
    for (const s of stars) {
      s.x -= s.speed * speed;
      if (s.x < -5) {
        s.x = W + 5;
        s.y = Math.random() * groundY * 0.6;
      }
    }

    // Buildings
    for (let li = 0; li < 3; li++) {
      const spd = speed * LAYERS[li].speedMult * 0.5;
      for (const b of buildings[li]) {
        b.x -= spd;
      }
      // Remove off-screen, add new
      while (buildings[li].length > 0 && buildings[li][0].x + buildings[li][0].w < -10) {
        buildings[li].shift();
      }
      const last = buildings[li][buildings[li].length - 1];
      if (last && last.x + last.w < W + 100) {
        const w = 30 + Math.random() * 60;
        const h = 30 + Math.random() * (80 + li * 30);
        buildings[li].push({ x: last.x + last.w + Math.random() * 20 + 5, w, h });
      }
    }

    // Obstacles
    for (let li = 0; li < 3; li++) {
      const spd = speed * LAYERS[li].speedMult;
      for (const obs of obstacles[li]) {
        obs.x -= spd;
      }
      // Remove off-screen
      while (obstacles[li].length > 0 && obstacles[li][0].x + obstacles[li][0].w < -50) {
        obstacles[li].shift();
      }
      // Spawn new - ensure there are always obstacles ahead
      const lastObs = obstacles[li][obstacles[li].length - 1];
      if (!lastObs || lastObs.x < W) {
        spawnObstacle(li);
      }
    }

    // Player input
    if (jumpQueued && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      jumpQueued = false;
    }

    if (switchQueued !== 0) {
      const newLayer = activeLayer + switchQueued;
      if (newLayer >= 0 && newLayer <= 2) {
        activeLayer = newLayer;
        switchFlash = 1;
        switchFlashColor = LAYERS[activeLayer].color;
        updateHUD();
      }
      switchQueued = 0;
    }

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y >= groundY - PLAYER_H) {
      player.y = groundY - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
    }

    // Collision with active layer obstacles
    for (const obs of obstacles[activeLayer]) {
      if (checkCollision(playerX, player.y, PLAYER_W, PLAYER_H, obs)) {
        gameOver();
        return;
      }
    }

    updateHUD();
  }

  function checkCollision(px, py, pw, ph, obs) {
    // Shrink hitbox slightly for fairness
    const margin = 4;
    const ox = obs.x;
    const oy = groundY - obs.h;

    if (obs.type === 'spike') {
      // Simplified triangle collision: use inner rectangle
      const spikeMargin = obs.w * 0.25;
      return (
        px + pw - margin > ox + spikeMargin &&
        px + margin < ox + obs.w - spikeMargin &&
        py + ph - margin > oy + obs.h * 0.3 &&
        py + margin < groundY
      );
    } else {
      return (
        px + pw - margin > ox &&
        px + margin < ox + obs.w &&
        py + ph - margin > oy &&
        py + margin < oy + obs.h
      );
    }
  }

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, '#050810');
    skyGrad.addColorStop(1, '#0a1225');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, groundY);

    // Below ground
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, groundY, W, H - groundY);

    drawStars();

    // Draw layers back to front
    for (let li = 0; li < 3; li++) {
      const isActive = li === activeLayer;
      const alpha = isActive ? LAYERS[li].buildingAlpha : LAYERS[li].buildingAlpha * 0.4;
      drawBuildings(li, alpha);
    }

    drawGround();

    // Draw obstacles back to front
    for (let li = 0; li < 3; li++) {
      const isActive = li === activeLayer;
      const alpha = isActive ? 1.0 : LAYERS[li].inactiveAlpha;
      drawObstacles(li, alpha);

      // Draw player on its active layer (correct z-order)
      if (li === activeLayer) {
        drawPlayer();
      }
    }

    drawSwitchFlash();
  }

  // --- Game Loop ---
  let animId;

  function loop() {
    if (state !== 'playing') return;
    update();
    render();
    animId = requestAnimationFrame(loop);
  }

  // --- State Transitions ---
  function startGame() {
    if (state === 'start' || state === 'gameover') {
      state = 'playing';
      overlayStart.classList.remove('overlay--visible');
      overlayStart.classList.add('overlay--hidden');
      overlayGameover.classList.remove('overlay--visible');
      overlayGameover.classList.add('overlay--hidden');
      resetGame();
      loop();
    }
  }

  function gameOver() {
    state = 'gameover';
    gameOverTime = Date.now();
    cancelAnimationFrame(animId);

    const finalScore = Math.floor(score);
    finalScoreEl.textContent = finalScore;

    let isNewBest = false;
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem(STORAGE_KEY, highScore);
      isNewBest = true;
    }

    finalHighEl.textContent = 'Best: ' + highScore;
    hudHigh.textContent = 'Best: ' + highScore;

    if (isNewBest) {
      newBestEl.style.display = 'block';
      newBestEl.classList.remove('overlay--hidden');
    } else {
      newBestEl.style.display = 'none';
    }

    overlayGameover.classList.remove('overlay--hidden');
    overlayGameover.classList.add('overlay--visible');
  }

  // --- Input Handling ---
  const RESTART_LOCKOUT_MS = 600;

  function handleAction(action) {
    if (state === 'start') {
      setTimeout(() => startGame(), 50);
      return;
    }
    if (state === 'gameover') {
      // Prevent accidental restart — require small wait
      if (Date.now() - gameOverTime < RESTART_LOCKOUT_MS) return;
      startGame();
      return;
    }

    if (action === 'jump') {
      jumpQueued = true;
    } else if (action === 'up') {
      switchQueued = -1;
    } else if (action === 'down') {
      switchQueued = 1;
    }
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (keys[e.code]) return;
    keys[e.code] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      handleAction('jump');
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handleAction('up');
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      handleAction('down');
    } else if (state === 'start' || state === 'gameover') {
      handleAction('start');
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Touch
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    touchStartTime = Date.now();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartY;
    const dx = t.clientX - touchStartX;
    const dt = Date.now() - touchStartTime;

    // Swipe detection
    if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx) && dt < 400) {
      if (dy < 0) {
        handleAction('up');
      } else {
        handleAction('down');
      }
    } else {
      // Tap = jump
      handleAction('jump');
    }
  }, { passive: false });

  // Overlay click/tap
  overlayStart.addEventListener('click', () => handleAction('start'));
  overlayGameover.addEventListener('click', () => handleAction('start'));

  // --- Init ---
  function init() {
    resize();
    hudHigh.textContent = 'Best: ' + highScore;

    // Draw idle scene
    resetGame();
    render();
  }

  window.addEventListener('resize', resize);
  init();

})();
