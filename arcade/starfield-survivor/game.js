/* ============================================
   Starfield Survivor — Game Loop & Logic
   ============================================ */

const Game = (() => {
  // ── State ──────────────────────────────────
  const STATES = { TITLE: 0, PLAYING: 1, DYING: 2, GAME_OVER: 3 };

  let state = STATES.TITLE;
  let canvas, renderer;
  let player, starfield, particles;
  let debris = [];
  let powerups = [];
  let score = 0;
  let elapsed = 0; // seconds survived
  let grazeCount = 0;
  let highScore = parseFloat(localStorage.getItem('ss_highScore')) || 0;
  let lastTime = 0;
  let animFrameId = null;

  // Slow-mo
  let slowMoActive = false;
  let slowMoTimer = 0;
  const SLOW_MO_DURATION = 4;
  const SLOW_MO_FACTOR = 0.35;

  // Death sequence
  let deathTimer = 0;
  const DEATH_DURATION = 1.8; // seconds of slow-mo death
  const DEATH_SLOW_FACTOR = 0.2;
  let deathX = 0;
  let deathY = 0;
  let deathParticleTimer = 0;

  // Spawning
  let spawnTimer = 0;
  let waveNumber = 0;
  let difficultyMult = 1;
  let powerupTimer = 0;

  // Input
  let mouseX = 0;
  let mouseY = 0;
  let usingKeyboard = false;
  let keys = {};

  // ── DOM refs ───────────────────────────────
  let titleScreen, gameOverScreen;
  let goScoreEl, goTimeEl, goGrazeEl, goHighEl;

  // ── Init ───────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    renderer = new Renderer(canvas);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // DOM
    titleScreen = document.getElementById('screen-title');
    gameOverScreen = document.getElementById('screen-gameover');
    goScoreEl = document.getElementById('go-score');
    goTimeEl = document.getElementById('go-time');
    goGrazeEl = document.getElementById('go-graze');
    goHighEl = document.getElementById('go-high');

    // Input
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchMove, { passive: false });
    window.addEventListener('keydown', e => { keys[e.key] = true; usingKeyboard = true; });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // Buttons
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-retry').addEventListener('click', startGame);

    // Start render loop (title screen)
    starfield = new StarField(canvas.width, canvas.height);
    particles = new ParticleSystem();
    lastTime = performance.now();
    loop(lastTime);
  }

  function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (starfield) starfield = new StarField(canvas.width, canvas.height);
  }

  // ── Input handlers ─────────────────────────
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    usingKeyboard = false;
  }

  function onTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    usingKeyboard = false;
  }

  // ── Start / Reset ──────────────────────────
  function startGame() {
    player = new Player(canvas.width / 2, canvas.height * 0.75);
    mouseX = player.x;
    mouseY = player.y;
    debris = [];
    powerups = [];
    particles = new ParticleSystem();
    score = 0;
    elapsed = 0;
    grazeCount = 0;
    spawnTimer = 0;
    waveNumber = 0;
    difficultyMult = 1;
    powerupTimer = 0;
    slowMoActive = false;
    slowMoTimer = 0;

    titleScreen.classList.remove('screen--active');
    gameOverScreen.classList.remove('screen--active');
    state = STATES.PLAYING;
  }

  function gameOver() {
    state = STATES.GAME_OVER;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('ss_highScore', highScore);
    }

    // Populate stats
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    goScoreEl.textContent = Math.floor(score).toLocaleString();
    goTimeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    goGrazeEl.textContent = grazeCount;
    goHighEl.textContent = Math.floor(highScore).toLocaleString();

    gameOverScreen.classList.add('screen--active');
    renderer.shake(15);
    renderer.flashScreen(0, 0.5);
  }

  // ── Main Loop ──────────────────────────────
  function loop(timestamp) {
    const rawDt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    // Apply slow-mo
    let dt = rawDt;
    if (slowMoActive) {
      dt *= SLOW_MO_FACTOR;
      slowMoTimer -= rawDt;
      if (slowMoTimer <= 0) {
        slowMoActive = false;
        slowMoTimer = 0;
      }
    }

    renderer.clear();
    starfield.update(rawDt, canvas.width, canvas.height); // stars always normal speed
    renderer.drawStarfield(starfield);

    if (state === STATES.PLAYING) {
      updatePlaying(dt, rawDt);
    } else if (state === STATES.DYING) {
      updateDying(rawDt);
    }

    // Always draw particles
    particles.update(rawDt);
    renderer.drawParticles(particles);

    renderer.endFrame();
    animFrameId = requestAnimationFrame(loop);
  }

  // ── Play Logic ─────────────────────────────
  function updatePlaying(dt, rawDt) {
    elapsed += rawDt;
    score += rawDt * 10; // 10 points per second base

    // Difficulty ramp every 10 seconds
    const expectedWave = Math.floor(elapsed / 10);
    if (expectedWave > waveNumber) {
      waveNumber = expectedWave;
      difficultyMult = 1 + waveNumber * 0.12;
    }

    // Keyboard movement
    if (usingKeyboard && player) {
      const kSpeed = player.speed * 60 * dt;
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) mouseX = player.x - kSpeed;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) mouseX = player.x + kSpeed;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) mouseY = player.y - kSpeed;
      if (keys['ArrowDown'] || keys['s'] || keys['S']) mouseY = player.y + kSpeed;
    }

    // Update player
    player.update(dt, mouseX, mouseY, canvas.width, canvas.height);

    // Spawn debris
    spawnTimer += dt * difficultyMult;
    const spawnInterval = Math.max(0.15, 0.8 / difficultyMult);
    while (spawnTimer >= spawnInterval) {
      spawnTimer -= spawnInterval;
      spawnDebris();
    }

    // Spawn power-ups
    powerupTimer += rawDt;
    const puInterval = 8 + Math.random() * 4; // every 8-12 seconds
    if (powerupTimer >= puInterval) {
      powerupTimer = 0;
      spawnPowerUp();
    }

    // Update debris
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.update(dt);

      // Check collision with player
      let hit = false;
      if (d.type === DEBRIS_TYPES.PULSE_RING) {
        hit = d.collidesWithPoint(player.x, player.y, player.hitRadius);
      } else if (d.type === DEBRIS_TYPES.LASER_BEAM) {
        hit = d.collidesWithPoint(player.x, player.y, player.hitRadius);
      } else {
        // Circle collision
        const dx = d.x - player.x;
        const dy = d.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (d.radius || 0) + player.hitRadius;
        hit = dist < minDist;

        // Graze check (near miss)
        const grazeDist = minDist + player.radius * 2;
        if (!hit && dist < grazeDist && !d._grazed) {
          d._grazed = true;
          grazeCount++;
          score += 50;
          particles.emit(player.x, player.y, 6, {
            hue: 280,
            speed: 80,
            life: 0.4,
            size: 3,
            type: 'graze',
          });
          renderer.shake(2);
        }
      }

      if (hit && player.alive) {
        const damageTaken = player.takeDamage(d.damage);
        if (damageTaken) {
          particles.emit(player.x, player.y, 12, {
            hue: 0,
            speed: 150,
            life: 0.5,
            size: 4,
            type: 'spark',
          });
          renderer.shake(8);
          renderer.flashScreen(0, 0.25);
        } else {
          // Shield absorbed
          particles.emit(player.x, player.y, 10, {
            hue: 200,
            speed: 120,
            life: 0.4,
            size: 3,
            type: 'shield',
          });
          renderer.shake(4);
        }
        // Remove debris on hit (except rings and beams)
        if (d.type !== DEBRIS_TYPES.PULSE_RING && d.type !== DEBRIS_TYPES.LASER_BEAM) {
          debris.splice(i, 1);
          continue;
        }
      }

      // Remove off-screen / dead
      if (d.isOffScreen(canvas.width, canvas.height) || d.dead) {
        debris.splice(i, 1);
      }
    }

    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.update(rawDt);

      // Collection check
      const dx = pu.x - player.x;
      const dy = pu.y - player.y;
      if (Math.sqrt(dx * dx + dy * dy) < pu.radius + player.radius) {
        applyPowerUp(pu);
        powerups.splice(i, 1);
        continue;
      }

      if (pu.dead) {
        powerups.splice(i, 1);
      }
    }

    // Check death
    if (!player.alive) {
      // Initial death burst
      particles.emit(player.x, player.y, 30, {
        hue: 160,
        speed: 200,
        life: 1.2,
        size: 5,
        type: 'spark',
      });
      particles.emit(player.x, player.y, 20, {
        hue: 40,
        speed: 150,
        life: 1,
        size: 4,
        type: 'spark',
      });
      // Enter dying state
      deathX = player.x;
      deathY = player.y;
      deathTimer = 0;
      deathParticleTimer = 0;
      state = STATES.DYING;
      renderer.shake(20);
      renderer.flashScreen(0, 0.6);
      return;
    }

    // ── Draw everything ──────────────────────
    // Draw debris
    for (const d of debris) {
      switch (d.type) {
        case DEBRIS_TYPES.ASTEROID: renderer.drawAsteroid(d); break;
        case DEBRIS_TYPES.SHARD: renderer.drawShard(d); break;
        case DEBRIS_TYPES.PULSE_RING: renderer.drawPulseRing(d); break;
        case DEBRIS_TYPES.LASER_BEAM: renderer.drawLaserBeam(d); break;
        case DEBRIS_TYPES.COMET: renderer.drawComet(d); break;
      }
    }

    // Draw power-ups
    for (const pu of powerups) {
      renderer.drawPowerUp(pu);
    }

    // Draw player
    renderer.drawPlayer(player);

    // HUD
    renderer.drawHUD(player, score, elapsed, grazeCount, highScore, slowMoActive);
  }

  // ── Death Sequence ─────────────────────────
  function updateDying(rawDt) {
    deathTimer += rawDt;

    // Slow-mo factor for debris during death
    const dt = rawDt * DEATH_SLOW_FACTOR;

    // Continue updating / drawing debris in slow-mo (they drift onward)
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.update(dt);
      if (d.isOffScreen(canvas.width, canvas.height) || d.dead) {
        debris.splice(i, 1);
      }
    }

    // Progressive explosion bursts from death point
    deathParticleTimer += rawDt;
    if (deathParticleTimer > 0.12) {
      deathParticleTimer = 0;
      const burstHue = [0, 30, 160, 40, 280][Math.floor(Math.random() * 5)];
      const spread = 20 + deathTimer * 30;
      particles.emit(
        deathX + (Math.random() - 0.5) * spread,
        deathY + (Math.random() - 0.5) * spread,
        6 + Math.floor(Math.random() * 6),
        {
          hue: burstHue,
          speed: 60 + Math.random() * 100,
          life: 0.6 + Math.random() * 0.4,
          size: 3 + Math.random() * 3,
          type: 'spark',
        }
      );
      // Build screen shake over time
      renderer.shake(3 + deathTimer * 4);
    }

    // Draw debris (still visible, drifting slowly)
    for (const d of debris) {
      switch (d.type) {
        case DEBRIS_TYPES.ASTEROID: renderer.drawAsteroid(d); break;
        case DEBRIS_TYPES.SHARD: renderer.drawShard(d); break;
        case DEBRIS_TYPES.PULSE_RING: renderer.drawPulseRing(d); break;
        case DEBRIS_TYPES.LASER_BEAM: renderer.drawLaserBeam(d); break;
        case DEBRIS_TYPES.COMET: renderer.drawComet(d); break;
      }
    }

    // Draw HUD (frozen during death)
    renderer.drawHUD(player, score, elapsed, grazeCount, highScore, false);

    // Transition to game-over after duration
    if (deathTimer >= DEATH_DURATION) {
      // Final flash
      renderer.flashScreen(30, 0.4);
      gameOver();
    }
  }

  // ── Spawning ───────────────────────────────
  function spawnDebris() {
    const w = canvas.width;
    const h = canvas.height;
    const roll = Math.random();
    const speed = (60 + Math.random() * 80) * difficultyMult;

    if (roll < 0.35) {
      // Asteroid — from edges
      const edge = randomEdgePoint(w, h, 30);
      const angle = Math.atan2(h / 2 - edge.y + (Math.random() - 0.5) * h * 0.6,
                               w / 2 - edge.x + (Math.random() - 0.5) * w * 0.6);
      debris.push(new Asteroid(edge.x, edge.y,
        Math.cos(angle) * speed * 0.6,
        Math.sin(angle) * speed * 0.6,
        14 + Math.random() * 16
      ));
    } else if (roll < 0.6) {
      // Shard — aimed near player
      const edge = randomEdgePoint(w, h, 20);
      const targetX = player.x + (Math.random() - 0.5) * 100;
      const targetY = player.y + (Math.random() - 0.5) * 100;
      const angle = Math.atan2(targetY - edge.y, targetX - edge.x);
      debris.push(new Shard(edge.x, edge.y,
        Math.cos(angle) * speed * 1.5,
        Math.sin(angle) * speed * 1.5
      ));
    } else if (roll < 0.72 && waveNumber >= 2) {
      // Pulse ring — from center-ish
      const cx = w * (0.2 + Math.random() * 0.6);
      const cy = h * (0.2 + Math.random() * 0.6);
      const gapAngle = Math.atan2(player.y - cy, player.x - cx); // gap toward player
      const gapSize = Math.max(0.4, 0.8 - waveNumber * 0.02);
      debris.push(new PulseRing(cx, cy, Math.max(w, h), gapAngle, gapSize, 120 + difficultyMult * 30));
    } else if (roll < 0.84 && waveNumber >= 3) {
      // Laser beam — from edges
      const edge = Math.floor(Math.random() * 4);
      let ox, oy, angle;
      if (edge === 0) { // top
        ox = Math.random() * w;
        oy = 0;
        angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      } else if (edge === 1) { // right
        ox = w;
        oy = Math.random() * h;
        angle = Math.PI + (Math.random() - 0.5) * 0.6;
      } else if (edge === 2) { // bottom
        ox = Math.random() * w;
        oy = h;
        angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      } else { // left
        ox = 0;
        oy = Math.random() * h;
        angle = 0 + (Math.random() - 0.5) * 0.6;
      }
      debris.push(new LaserBeam(ox, oy, angle, w, h));
    } else if (roll < 0.95) {
      // Comet — diagonal speed
      const edge = randomEdgePoint(w, h, 20);
      const angle = Math.atan2(h / 2 - edge.y, w / 2 - edge.x) + (Math.random() - 0.5) * 1;
      const cSpeed = speed * 1.3;
      debris.push(new Comet(edge.x, edge.y,
        Math.cos(angle) * cSpeed,
        Math.sin(angle) * cSpeed
      ));
    } else {
      // Shard burst — multiple shards from one point
      const edge = randomEdgePoint(w, h, 20);
      const baseAngle = Math.atan2(player.y - edge.y, player.x - edge.x);
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const a = baseAngle + (i - count / 2) * 0.2;
        debris.push(new Shard(edge.x, edge.y,
          Math.cos(a) * speed * 1.3,
          Math.sin(a) * speed * 1.3
        ));
      }
    }
  }

  function randomEdgePoint(w, h, margin) {
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: return { x: Math.random() * w, y: -margin }; // top
      case 1: return { x: w + margin, y: Math.random() * h }; // right
      case 2: return { x: Math.random() * w, y: h + margin }; // bottom
      case 3: return { x: -margin, y: Math.random() * h }; // left
    }
  }

  function spawnPowerUp() {
    const margin = 60;
    const x = margin + Math.random() * (canvas.width - margin * 2);
    const y = margin + Math.random() * (canvas.height - margin * 2);

    const roll = Math.random();
    let type;
    if (roll < 0.45) {
      type = POWERUP_TYPES.SHIELD;
    } else if (roll < 0.75) {
      type = POWERUP_TYPES.SLOW_MO;
    } else {
      type = POWERUP_TYPES.HEALTH; // rarest
    }

    powerups.push(new PowerUp(x, y, type));
  }

  function applyPowerUp(pu) {
    switch (pu.type) {
      case POWERUP_TYPES.SHIELD:
        player.activateShield();
        particles.emit(player.x, player.y, 15, {
          hue: 200,
          speed: 100,
          life: 0.6,
          size: 3,
          type: 'shield',
        });
        break;
      case POWERUP_TYPES.HEALTH:
        player.heal(25);
        particles.emit(player.x, player.y, 15, {
          hue: 120,
          speed: 80,
          life: 0.8,
          size: 4,
          type: 'heal',
        });
        renderer.flashScreen(120, 0.15);
        break;
      case POWERUP_TYPES.SLOW_MO:
        slowMoActive = true;
        slowMoTimer = SLOW_MO_DURATION;
        particles.emit(player.x, player.y, 12, {
          hue: 280,
          speed: 60,
          life: 0.6,
          size: 3,
          type: 'graze',
        });
        renderer.flashScreen(280, 0.12);
        break;
    }
    score += 100;
  }

  // ── Public API ─────────────────────────────
  return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', Game.init);
