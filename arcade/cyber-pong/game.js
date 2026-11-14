/**
 * Cyber Pong — Session 3 Controller
 *
 * Fixed 1/60 timestep accumulator loop, HiDPI canvas sizing, multi-modal input
 * (mouse tracking, dual-zone touch, W/S & Arrow keys), 3-tier AI, 5 mid-court
 * power-ups, Classic/Arcade rulesets, procedural Web Audio, chromatic goal
 * shockwaves, and guarded localStorage career stats.
 *
 * Storage Key Convention: arcade.cyber-pong.<key>
 *   arcade.cyber-pong.stats  – { bestStreak, currentStreak, longestRally, fastestSpeed, aiRecord }
 *   arcade.cyber-pong.muted  – boolean audio mute state (managed by audio.js)
 */
(function () {
  'use strict';

  const { Physics, PowerUps, AI, Audio, Renderer } = window.CP;
  const { WORLD } = Physics;

  const COUNTDOWN_DURATION = 2.1; // 3 beats at 0.7s per digit
  const POINT_PAUSE_DURATION = 0.85;
  const MATCH_POINT_SLOWMO_DURATION = 0.38;
  const KEY_STATS = 'arcade.cyber-pong.stats';

  const RULESET_DESCRIPTIONS = {
    arcade:
      'Mid-court neon anomalies: Overcharge Smash, Nano Expand, Split Multiball, Laser Barrier & Phase Warp.',
    classic:
      'Pure competitive Pong: zero power-ups, escalating rally speed, paddle-angle & spin physics.',
  };

  // --- Guarded Persistence ---
  const Store = {
    read(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  function defaultStats() {
    const aiRecord = {};
    for (const id of AI.ORDER) aiRecord[id] = { w: 0, l: 0 };
    return {
      bestStreak: 0,
      currentStreak: 0,
      longestRally: 0,
      fastestSpeed: 0,
      aiRecord,
    };
  }

  function loadStats() {
    const raw = Store.read(KEY_STATS, null);
    const out = defaultStats();
    if (!raw || typeof raw !== 'object') return out;
    if (Number.isFinite(raw.bestStreak) && raw.bestStreak > 0) {
      out.bestStreak = Math.floor(raw.bestStreak);
    }
    if (Number.isFinite(raw.currentStreak) && raw.currentStreak > 0) {
      out.currentStreak = Math.floor(raw.currentStreak);
    }
    if (Number.isFinite(raw.longestRally) && raw.longestRally > 0) {
      out.longestRally = Math.floor(raw.longestRally);
    }
    if (Number.isFinite(raw.fastestSpeed) && raw.fastestSpeed > 0) {
      out.fastestSpeed = Math.round(raw.fastestSpeed);
    }
    if (raw.aiRecord && typeof raw.aiRecord === 'object') {
      for (const id of AI.ORDER) {
        const r = raw.aiRecord[id];
        if (r && typeof r === 'object') {
          out.aiRecord[id] = {
            w: Number.isFinite(r.w) && r.w > 0 ? Math.floor(r.w) : 0,
            l: Number.isFinite(r.l) && r.l > 0 ? Math.floor(r.l) : 0,
          };
        }
      }
    }
    return out;
  }

  let stats = loadStats();
  let statsDirty = false;

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const menuEl = $('menu');
  const gameEl = $('game-container');
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const bannerEl = $('banner');
  const modalEl = $('modal');
  const modeLabelEl = $('mode-label');
  const rulesetBtn = $('ruleset-btn');
  const rulesetDescEl = $('ruleset-desc');
  const controlsHintEl = $('controls-hint');
  const muteBtn = $('mute-btn');

  const scoreP1El = $('score-player');
  const scoreP2El = $('score-ai');
  const nameP1El = $('name-p1');
  const nameP2El = $('name-p2');
  const statusP1El = $('status-p1');
  const statusP2El = $('status-p2');
  const hudRulesetEl = $('hud-ruleset');
  const hudRallyEl = $('hud-rally');

  // --- Match State ---
  let mode = 'menu'; // 'menu' | 'ai' | 'local'
  let ruleset = 'arcade'; // 'arcade' | 'classic'
  let aiTier = 'cyber';
  let aiController = null;

  let state = 'MENU'; // 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'POINT_PAUSE' | 'MATCH_POINT_SLOWMO' | 'MATCH_OVER'
  let stateTimer = 0;
  let lastCountdownDigit = 0;
  let nextServeSide = 0;
  let pendingWinner = 0;

  let paddles = [Physics.createPaddle(0), Physics.createPaddle(1)];
  let balls = [];
  let powerupState = PowerUps.createState();
  let scores = [0, 0];
  let rally = 0;
  let bestRally = 0;
  let topSpeed = Physics.INITIAL_BALL_SPEED;

  let scale = 1;
  let lastTime = 0;
  let accumulator = 0;
  let lastStatus = ['', ''];

  // --- Input State ---
  const keys = {
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false,
  };
  const activePointers = new Map(); // pointerId -> { side, y }

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
  }

  // --- UI Helpers ---
  function showBanner(text, color) {
    bannerEl.textContent = text;
    bannerEl.style.setProperty('--banner-color', color || '#38bdf8');
    bannerEl.hidden = false;
  }

  function hideBanner() {
    bannerEl.hidden = true;
  }

  function syncRulesetUi() {
    document.querySelectorAll('.ruleset-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.ruleset === ruleset);
    });
    rulesetDescEl.textContent = RULESET_DESCRIPTIONS[ruleset];
    const isClassic = ruleset === 'classic';
    rulesetBtn.textContent = isClassic ? '🏓 Classic' : '⚡ Arcade';
    rulesetBtn.classList.toggle('is-classic', isClassic);
    hudRulesetEl.textContent = isClassic ? 'CLASSIC' : 'ARCADE';

    if (mode === 'ai') {
      modeLabelEl.textContent =
        'Vs AI · ' + AI.TIERS[aiTier].name + ' · ' + (isClassic ? 'Classic' : 'Arcade');
    } else if (mode === 'local') {
      modeLabelEl.textContent = '2-Player Local · ' + (isClassic ? 'Classic' : 'Arcade');
    }
  }

  function paddleStatusText(p) {
    const tags = [];
    if (p.overcharge) tags.push('⚡ OVERCHARGE');
    if (p.shieldTimer > 0 && p.shieldHp > 0) tags.push('🛡 SHIELD');
    if (p.sizeTimer > 0) tags.push(p.sizeMult > 1 ? '↕ EXPAND' : '↕ SHRUNK');
    return tags.length ? tags.join(' · ') : 'READY';
  }

  function syncStatusUi() {
    const s1 = paddleStatusText(paddles[0]);
    const s2 = paddleStatusText(paddles[1]);
    if (s1 !== lastStatus[0]) {
      lastStatus[0] = s1;
      statusP1El.textContent = s1;
      statusP1El.classList.toggle('is-buffed', s1 !== 'READY');
    }
    if (s2 !== lastStatus[1]) {
      lastStatus[1] = s2;
      statusP2El.textContent = s2;
      statusP2El.classList.toggle('is-buffed', s2 !== 'READY');
    }
  }

  function syncMuteUi() {
    if (!muteBtn) return;
    const isMuted = Audio.isMuted();
    muteBtn.classList.toggle('is-muted', isMuted);
    muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute audio' : 'Mute audio');
    muteBtn.textContent = isMuted ? '🔇 MUTE' : '🔊 SFX';
  }

  function syncStatsUi() {
    $('stat-streak').textContent = String(stats.bestStreak);
    $('stat-rally').textContent = String(stats.longestRally);
    $('stat-speed').textContent = Math.round(stats.fastestSpeed) + ' px/s';
    let totalWins = 0;
    for (const id of AI.ORDER) totalWins += stats.aiRecord[id].w;
    $('stat-wins').textContent = String(totalWins);
  }

  function updateUi() {
    syncMuteUi();
    scoreP1El.textContent = scores[0];
    scoreP2El.textContent = scores[1];
    nameP1El.textContent = mode === 'ai' ? 'YOU' : 'P1';
    nameP2El.textContent = mode === 'ai' ? AI.TIERS[aiTier].name.toUpperCase() : 'P2';

    lastStatus = ['', ''];
    syncStatusUi();

    hudRallyEl.textContent = rally > 0 ? 'RALLY ' + rally : 'FIRST TO ' + Physics.WIN_SCORE;
    syncRulesetUi();
  }

  function buildMenu() {
    const aiBox = $('menu-ai');
    aiBox.innerHTML = '';
    for (const id of AI.ORDER) {
      const tier = AI.TIERS[id];
      const rec = stats.aiRecord[id];
      const recText = rec.w + rec.l > 0 ? '<br>Record ' + rec.w + 'W–' + rec.l + 'L' : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-btn';
      btn.id = 'menu-ai-' + id;
      btn.innerHTML = tier.name + '<small>' + tier.blurb + recText + '</small>';
      btn.addEventListener('click', () => startVsAi(id));
      aiBox.appendChild(btn);
    }
    syncStatsUi();
  }

  function flushStats() {
    if (!statsDirty) return;
    Store.write(KEY_STATS, stats);
    statsDirty = false;
  }

  // --- Navigation & Match Lifecycle ---
  function showMenu() {
    flushStats();
    mode = 'menu';
    state = 'MENU';
    activePointers.clear();
    Renderer.resetFX();
    hideBanner();
    modalEl.hidden = true;
    gameEl.hidden = true;
    menuEl.hidden = false;
    buildMenu();
    syncRulesetUi();
    syncMuteUi();
    const first = menuEl.querySelector('.menu-btn');
    if (first) first.focus({ preventScroll: true });
  }

  function showGame() {
    menuEl.hidden = true;
    gameEl.hidden = false;
    resize();
  }

  function startVsAi(tierId) {
    Audio.blip('ui');
    aiTier = tierId;
    mode = 'ai';
    aiController = AI.createController(tierId);
    controlsHintEl.innerHTML =
      'Move mouse or drag to steer paddle · <kbd>W</kbd>/<kbd>S</kbd> or <kbd>↑</kbd>/<kbd>↓</kbd> · <kbd>M</kbd> mute';
    showGame();
    newMatch();
  }

  function startLocal() {
    Audio.blip('ui');
    mode = 'local';
    aiController = null;
    controlsHintEl.innerHTML =
      'Touch/drag left &amp; right halves of court · <kbd>W</kbd>/<kbd>S</kbd> (P1) · <kbd>↑</kbd>/<kbd>↓</kbd> (P2) · <kbd>M</kbd> mute';
    showGame();
    newMatch();
  }

  function newMatch() {
    flushStats();
    scores = [0, 0];
    bestRally = 0;
    topSpeed = Physics.INITIAL_BALL_SPEED;
    nextServeSide = Math.random() > 0.5 ? 1 : 0;
    paddles = [Physics.createPaddle(0), Physics.createPaddle(1)];
    if (mode === 'ai') {
      aiController = AI.createController(aiTier);
    }
    PowerUps.resetState(powerupState);
    Renderer.resetFX();
    activePointers.clear();
    modalEl.hidden = true;
    startCountdown(nextServeSide);
  }

  function startCountdown(serveToSide) {
    nextServeSide = serveToSide;
    balls = [];
    rally = 0;
    paddles.forEach((p) => {
      p.overcharge = false;
      p.sizeTimer = 0;
      p.sizeMult = 1;
      p.shieldTimer = 0;
      p.shieldHp = 0;
      p.height = p.baseHeight;
      p.y = (WORLD.height - p.height) / 2;
      p.vy = 0;
      p.targetY = null;
    });
    PowerUps.resetState(powerupState);
    state = 'COUNTDOWN';
    stateTimer = COUNTDOWN_DURATION;
    lastCountdownDigit = 3;
    Audio.countdown(3);
    hideBanner();
    updateUi();
  }

  function toggleRulesetInGame() {
    ruleset = ruleset === 'arcade' ? 'classic' : 'arcade';
    Audio.blip('mode');
    if (ruleset === 'classic') {
      PowerUps.resetState(powerupState);
      paddles.forEach((p) => {
        p.overcharge = false;
        p.sizeTimer = 0;
        p.sizeMult = 1;
        p.shieldTimer = 0;
        p.shieldHp = 0;
      });
    }
    Renderer.addFloatingText(
      WORLD.width / 2,
      70,
      ruleset === 'arcade' ? 'ARCADE CHAOS ON' : 'CLASSIC PURIST ON',
      ruleset === 'arcade' ? '#38bdf8' : '#cbd5e1'
    );
    updateUi();
  }

  function finishMatch(winnerSide) {
    state = 'MATCH_OVER';
    hideBanner();
    const isP1Win = winnerSide === 0;
    let title = isP1Win ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
    let extra = '';

    if (mode === 'ai') {
      title = isP1Win ? 'VICTORY' : AI.TIERS[aiTier].name.toUpperCase() + ' WINS';
      const rec = stats.aiRecord[aiTier];
      if (isP1Win) {
        rec.w++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
      } else {
        rec.l++;
        stats.currentStreak = 0;
      }
      extra = ' · ' + AI.TIERS[aiTier].name + ' ' + rec.w + 'W–' + rec.l + 'L';
      Audio.fanfare(isP1Win ? 'victory' : 'defeat');
    } else {
      Audio.fanfare('victory');
    }

    if (bestRally > stats.longestRally) stats.longestRally = bestRally;
    if (Math.round(topSpeed) > stats.fastestSpeed) stats.fastestSpeed = Math.round(topSpeed);
    Store.write(KEY_STATS, stats);
    statsDirty = false;

    const card = modalEl.querySelector('.modal__card');
    card.style.setProperty('--pc', paddles[winnerSide].color);
    $('modal-title').textContent = title;
    $('modal-text').textContent =
      'Final Score ' +
      scores[0] +
      ' – ' +
      scores[1] +
      ' · Best Rally ' +
      bestRally +
      ' · Top Speed ' +
      Math.round(topSpeed) +
      ' px/s' +
      extra;

    modalEl.hidden = false;
    $('rematch-btn').focus({ preventScroll: true });
    updateUi();
  }

  // --- Simulation ---
  function readKeyboardInputs() {
    let p0Input = 0;
    let p1Input = 0;

    if (mode === 'ai') {
      if (keys.w || keys.ArrowUp) p0Input -= 1;
      if (keys.s || keys.ArrowDown) p0Input += 1;
      if (p0Input !== 0) paddles[0].targetY = null;
    } else {
      if (keys.w) p0Input -= 1;
      if (keys.s) p0Input += 1;
      if (keys.ArrowUp) p1Input -= 1;
      if (keys.ArrowDown) p1Input += 1;
      if (p0Input !== 0) paddles[0].targetY = null;
      if (p1Input !== 0) paddles[1].targetY = null;
    }

    return [p0Input, p1Input];
  }

  function trackLiveRecords(ball) {
    if (rally > stats.longestRally) {
      stats.longestRally = rally;
      statsDirty = true;
    }
    const spd = Math.round((ball && ball.speed) || 0);
    if (spd > stats.fastestSpeed) {
      stats.fastestSpeed = spd;
      statsDirty = true;
    }
  }

  const ballHooks = {
    onWallHit(ball) {
      Audio.wallHit(ball.speed);
      Renderer.spawnBurst(
        ball.x,
        ball.y,
        ball.overcharged ? '#fb923c' : '#38bdf8',
        6,
        16
      );
    },

    onPaddleHit(ball, paddle) {
      rally++;
      if (rally > bestRally) bestRally = rally;
      if (ball.speed > topSpeed) topSpeed = ball.speed;
      trackLiveRecords(ball);

      Audio.paddleHit(rally, ball.speed, ball.overcharged);
      Renderer.spawnBurst(
        ball.x,
        ball.y,
        ball.overcharged ? '#fb923c' : paddle.color,
        ball.overcharged ? 20 : 11,
        ball.overcharged ? 36 : 22
      );
      if (ball.overcharged) {
        Renderer.addShake(0.28);
        Renderer.addFloatingText(ball.x, ball.y - 16, '⚡ SMASH!', '#fb923c');
      }
      updateUi();
    },

    onShieldHit(ball, side) {
      rally++;
      if (rally > bestRally) bestRally = rally;
      trackLiveRecords(ball);

      Audio.shieldHit();
      Renderer.spawnBurst(ball.x, ball.y, '#38bdf8', 22, 42);
      Renderer.addFloatingText(
        side === 0 ? 74 : WORLD.width - 74,
        clamp(ball.y, 40, WORLD.height - 40),
        'SHIELD BLOCK',
        '#38bdf8'
      );
      Renderer.addShake(0.32);
      updateUi();
    },

    onAnomalyHit(ball, anomaly) {
      const res = PowerUps.applyPickup(anomaly, ball, balls, paddles, WORLD);
      if (ball.speed > topSpeed) topSpeed = ball.speed;
      trackLiveRecords(ball);

      Audio.powerup(anomaly.type);
      Renderer.spawnBurst(anomaly.x, anomaly.y, res.color, 24, 44);
      Renderer.addFloatingText(anomaly.x, anomaly.y - 10, res.label, res.color);
      Renderer.addShake(0.22);
      if (res.warpBeam) {
        Renderer.addWarpBeam(
          res.warpBeam.x1,
          res.warpBeam.y1,
          res.warpBeam.x2,
          res.warpBeam.y2,
          res.warpBeam.color
        );
      }
      updateUi();
    },

    onScore(scorerSide, ball) {
      scores[scorerSide]++;
      nextServeSide = 1 - scorerSide;
      const isMatchPoint = scores[scorerSide] >= Physics.WIN_SCORE;
      const gx = scorerSide === 0 ? WORLD.width - 8 : 8;
      const gy = clamp(ball.y, 24, WORLD.height - 24);

      Renderer.spawnGoalShockwave(gx, gy, paddles[scorerSide].color, isMatchPoint);
      Renderer.addFloatingText(gx + (scorerSide === 0 ? -36 : 36), gy, '+1', paddles[scorerSide].color);
      Audio.goal(isMatchPoint);
      flushStats();

      if (isMatchPoint) {
        for (let i = 0; i < balls.length; i++) balls[i].alive = false;
        pendingWinner = scorerSide;
        state = 'MATCH_POINT_SLOWMO';
        stateTimer = MATCH_POINT_SLOWMO_DURATION;
        showBanner('MATCH POINT!', paddles[scorerSide].color);
        updateUi();
        return;
      }

      if (balls.filter((b) => b.alive).length === 0) {
        const scorerLabel =
          mode === 'ai'
            ? scorerSide === 0
              ? 'POINT YOU'
              : 'POINT ' + AI.TIERS[aiTier].name.toUpperCase()
            : scorerSide === 0
              ? 'POINT P1'
              : 'POINT P2';
        showBanner(scorerLabel, paddles[scorerSide].color);
      }
      updateUi();
    },
  };

  function simulate(dt) {
    if (state === 'MATCH_POINT_SLOWMO') {
      Renderer.stepFX(dt * 0.32);
      stateTimer -= dt;
      if (stateTimer <= 0) {
        finishMatch(pendingWinner);
      }
      return;
    }

    Renderer.stepFX(dt);

    const [p0Input, p1Input] = readKeyboardInputs();
    const roundActive = state === 'PLAYING';

    if (state === 'COUNTDOWN' || state === 'PLAYING' || state === 'POINT_PAUSE') {
      Physics.stepPaddle(paddles[0], p0Input, dt);
      if (mode === 'ai' && aiController) {
        AI.step(aiController, paddles[1], paddles[0], balls, powerupState.anomalies, roundActive, dt, WORLD);
        Physics.stepPaddle(paddles[1], 0, dt);
      } else {
        Physics.stepPaddle(paddles[1], p1Input, dt);
      }
      syncStatusUi();
    }

    if (state === 'COUNTDOWN') {
      stateTimer -= dt;
      if (stateTimer <= 0) {
        Audio.countdown(0);
        balls = [Physics.serveBall(nextServeSide)];
        state = 'PLAYING';
        hideBanner();
        updateUi();
      } else {
        const digit = Math.ceil((stateTimer / COUNTDOWN_DURATION) * 3);
        if (digit > 0 && digit !== lastCountdownDigit) {
          lastCountdownDigit = digit;
          Audio.countdown(digit);
        }
      }
      return;
    }

    if (state === 'PLAYING') {
      PowerUps.step(powerupState, ruleset, true, dt, WORLD);
      Physics.stepBalls(balls, paddles, powerupState.anomalies, dt, ballHooks);

      balls = balls.filter((b) => b.alive);
      powerupState.anomalies = powerupState.anomalies.filter((a) => a.alive !== false);

      for (let i = 0; i < balls.length; i++) {
        if (balls[i].speed > topSpeed) {
          topSpeed = balls[i].speed;
          trackLiveRecords(balls[i]);
        }
      }

      if (state === 'PLAYING' && balls.length === 0) {
        state = 'POINT_PAUSE';
        stateTimer = POINT_PAUSE_DURATION;
      }
      return;
    }

    if (state === 'POINT_PAUSE') {
      stateTimer -= dt;
      if (stateTimer <= 0) {
        startCountdown(nextServeSide);
      }
    }
  }

  // --- Rendering & HiDPI Sizing ---
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / WORLD.width;
  }

  function toWorld(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * WORLD.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * WORLD.height,
    };
  }

  function render() {
    const serveName =
      mode === 'ai'
        ? nextServeSide === 0
          ? 'SERVING TO YOU'
          : 'SERVING TO AI'
        : nextServeSide === 0
          ? 'SERVING TO P1'
          : 'SERVING TO P2';

    Renderer.renderScene(ctx, canvas, scale, WORLD, Physics.BARRIER_OFFSET, {
      state,
      roundActive: state === 'PLAYING',
      countdown: state === 'COUNTDOWN' ? (stateTimer / COUNTDOWN_DURATION) * 3 : 0,
      serveText: serveName,
      rally,
      paddles,
      balls,
      anomalies: powerupState.anomalies,
    });
  }

  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const frameDt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;

    if (mode !== 'menu') {
      accumulator += frameDt;
      while (accumulator >= Physics.FRAME_DT) {
        simulate(Physics.FRAME_DT);
        accumulator -= Physics.FRAME_DT;
      }
      render();
    } else {
      accumulator = 0;
    }

    requestAnimationFrame(loop);
  }

  // --- Events ---
  function handleKey(e, isDown) {
    if (isDown && !e.repeat && e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      Audio.toggleMute();
      syncMuteUi();
      return;
    }
    const k = e.key === 'W' || e.key === 'w' ? 'w' : e.key === 'S' || e.key === 's' ? 's' : e.key;
    if (Object.prototype.hasOwnProperty.call(keys, k)) {
      keys[k] = isDown;
      if (mode !== 'menu') e.preventDefault();
    }
  }

  function bindEvents() {
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    window.addEventListener('resize', resize);

    // Pointer / Touch paddle controls
    canvas.addEventListener('pointerdown', (e) => {
      if (mode === 'menu') return;
      e.preventDefault();
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {
          // Ignore if capture is unsupported for synthetic events
        }
      }
      const w = toWorld(e);
      const side = mode === 'local' && w.x >= WORLD.width / 2 ? 1 : 0;
      activePointers.set(e.pointerId, { side, y: w.y });
      paddles[side].targetY = clamp(w.y, 0, WORLD.height);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (mode === 'menu') return;
      const w = toWorld(e);
      const tracked = activePointers.get(e.pointerId);
      if (tracked) {
        tracked.y = w.y;
        paddles[tracked.side].targetY = clamp(w.y, 0, WORLD.height);
      } else if (mode === 'ai' && e.pointerType === 'mouse') {
        paddles[0].targetY = clamp(w.y, 0, WORLD.height);
      }
    });

    const releasePointer = (e) => {
      const tracked = activePointers.get(e.pointerId);
      if (!tracked) return;
      activePointers.delete(e.pointerId);
      const stillHeldForSide = Array.from(activePointers.values()).some(
        (entry) => entry.side === tracked.side
      );
      if (!stillHeldForSide) {
        paddles[tracked.side].targetY = null;
      }
    };

    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);

    // Ruleset switcher on menu
    document.querySelectorAll('.ruleset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        ruleset = btn.dataset.ruleset;
        Audio.blip('mode');
        syncRulesetUi();
      });
    });

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        Audio.toggleMute();
        syncMuteUi();
        muteBtn.blur();
      });
    }

    $('menu-local').addEventListener('click', startLocal);
    $('menu-btn').addEventListener('click', () => {
      Audio.blip('ui');
      showMenu();
    });
    $('ruleset-btn').addEventListener('click', () => {
      toggleRulesetInGame();
      rulesetBtn.blur();
    });
    $('restart-top-btn').addEventListener('click', () => {
      Audio.blip('ui');
      newMatch();
      $('restart-top-btn').blur();
    });

    $('rematch-btn').addEventListener('click', () => {
      Audio.blip('ui');
      newMatch();
    });
    $('modal-menu-btn').addEventListener('click', () => {
      Audio.blip('ui');
      showMenu();
    });
  }

  function init() {
    buildMenu();
    bindEvents();
    showMenu();
    requestAnimationFrame(loop);
  }

  init();
})();
