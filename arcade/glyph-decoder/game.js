/* ============================================
   Glyph Decoder — Game Logic
   ============================================ */

(function () {
  'use strict';

  // --- Glyph Sets ---
  // Each tier unlocks more symbols as difficulty increases
  const GLYPH_TIERS = [
    // Tier 1: Basic geometric symbols
    ['⌬', '◈', '⟡', '⌖', '◬', '⬡'],
    // Tier 2: More exotic 
    ['⊛', '⊕', '⊗', '⏣', '⎔', '⬢'],
    // Tier 3: Advanced 
    ['◎', '⊞', '⊠', '⋈', '⊶', '⊡'],
  ];

  // --- Difficulty config per level ---
  function getLevelConfig(level) {
    const patternLength = Math.min(3 + Math.floor((level - 1) / 3), 8);  // 3→8
    const numHidden = Math.min(Math.max(1, Math.floor(level / 2)), patternLength);  // ramps up
    const timerSeconds = Math.max(6, 20 - (level - 1) * 1.2);  // 20s→6s
    const paletteExtra = Math.min(2 + Math.floor((level - 1) / 2), 6);  // distractors
    const tier = Math.min(Math.floor((level - 1) / 4), GLYPH_TIERS.length - 1);

    return { patternLength, numHidden, timerSeconds, paletteExtra, tier };
  }

  // --- State ---
  let state = {
    screen: 'title',   // title | game | gameover
    level: 1,
    score: 0,
    streak: 0,
    bestStreak: 0,
    bestScore: 0,
    decoded: 0,         // total patterns decoded this run
    pattern: [],        // full pattern (array of glyph strings)
    hiddenIndices: [],   // which indices are hidden
    answerSlots: [],     // player's answer (null or glyph string)
    palette: [],         // available glyphs
    timerTotal: 0,
    timerRemaining: 0,
    timerInterval: null,
    memorizePhase: false,
  };

  // --- DOM refs ---
  const $ = id => document.getElementById(id);
  const dom = {
    hudLevel: $('hud-level'),
    hudScore: $('hud-score'),
    hudStreak: $('hud-streak'),
    hudBest: $('hud-best'),
    screenTitle: $('screen-title'),
    screenGame: $('screen-game'),
    screenGameover: $('screen-gameover'),
    timerFill: $('timer-fill'),
    timerBar: $('timer-bar'),
    transmissionText: $('transmission-text'),
    patternGlyphs: $('pattern-glyphs'),
    answerSlots: $('answer-slots'),
    paletteGlyphs: $('palette-glyphs'),
    btnStart: $('btn-start'),
    btnSubmit: $('btn-submit'),
    btnClear: $('btn-clear'),
    btnRetry: $('btn-retry'),
    resultFlash: $('result-flash'),
    resultIcon: $('result-icon'),
    resultText: $('result-text'),
    goScore: $('go-score'),
    goLevel: $('go-level'),
    goDecoded: $('go-decoded'),
    goStreak: $('go-streak'),
  };

  // --- Utilities ---
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  // --- Load best score from localStorage ---
  function loadBest() {
    try {
      state.bestScore = parseInt(localStorage.getItem('glyphDecoder_best') || '0', 10);
    } catch { state.bestScore = 0; }
  }

  function saveBest() {
    try {
      localStorage.setItem('glyphDecoder_best', String(state.bestScore));
    } catch { /* ignore */ }
  }

  // --- Screen switching ---
  function showScreen(name) {
    state.screen = name;
    dom.screenTitle.classList.toggle('screen--active', name === 'title');
    dom.screenGame.classList.toggle('screen--active', name === 'game');
    dom.screenGameover.classList.toggle('screen--active', name === 'gameover');
  }

  // --- HUD Update ---
  function updateHUD() {
    dom.hudLevel.textContent = state.level;
    dom.hudScore.textContent = state.score;
    dom.hudStreak.textContent = state.streak;
    dom.hudBest.textContent = state.bestScore;
  }

  // --- Generate a new pattern ---
  function generateRound() {
    const config = getLevelConfig(state.level);

    // Build available glyph pool from unlocked tiers
    let pool = [];
    for (let t = 0; t <= config.tier; t++) {
      pool = pool.concat(GLYPH_TIERS[t]);
    }

    // Pick glyphs for the pattern
    const patternGlyphs = [];
    for (let i = 0; i < config.patternLength; i++) {
      patternGlyphs.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    state.pattern = patternGlyphs;

    // Decide which indices to hide
    const allIndices = patternGlyphs.map((_, i) => i);
    state.hiddenIndices = pickRandom(allIndices, config.numHidden).sort((a, b) => a - b);

    // Build palette: hidden glyphs + distractors
    const hiddenGlyphs = state.hiddenIndices.map(i => patternGlyphs[i]);
    const usedSet = new Set(hiddenGlyphs);
    const distractorPool = pool.filter(g => !usedSet.has(g));
    const distractors = pickRandom(distractorPool, Math.min(config.paletteExtra, distractorPool.length));
    state.palette = shuffle([...hiddenGlyphs, ...distractors]);

    // Reset answer slots
    state.answerSlots = new Array(config.numHidden).fill(null);

    // Timer
    state.timerTotal = config.timerSeconds;
    state.timerRemaining = config.timerSeconds;

    // Start memorize phase: show all glyphs briefly
    state.memorizePhase = true;
  }

  // --- Render pattern ---
  function renderPattern() {
    dom.patternGlyphs.innerHTML = '';
    state.pattern.forEach((glyph, i) => {
      const cell = document.createElement('div');
      cell.className = 'glyph-cell glyph-cell--pattern';
      cell.textContent = glyph;

      if (!state.memorizePhase && state.hiddenIndices.includes(i)) {
        cell.classList.add('glyph-cell--hidden');
      }

      dom.patternGlyphs.appendChild(cell);
    });
  }

  // --- Render answer slots ---
  function renderAnswerSlots() {
    dom.answerSlots.innerHTML = '';
    state.answerSlots.forEach((glyph, i) => {
      const cell = document.createElement('div');
      cell.className = 'glyph-cell glyph-cell--answer';
      if (glyph) {
        cell.classList.add('glyph-cell--filled');
        cell.textContent = glyph;
      }
      cell.dataset.index = i;
      cell.addEventListener('click', () => removeFromSlot(i));
      dom.answerSlots.appendChild(cell);
    });

    // Enable submit if all slots filled
    const allFilled = state.answerSlots.every(s => s !== null);
    dom.btnSubmit.disabled = !allFilled;
  }

  // --- Render palette ---
  function renderPalette() {
    dom.paletteGlyphs.innerHTML = '';
    state.palette.forEach((glyph, i) => {
      const cell = document.createElement('div');
      cell.className = 'glyph-cell glyph-cell--palette';
      cell.textContent = glyph;
      cell.dataset.paletteIndex = i;
      cell.addEventListener('click', () => addToSlot(glyph, i));
      dom.paletteGlyphs.appendChild(cell);
    });
  }

  // --- Add glyph to first empty slot ---
  function addToSlot(glyph, paletteIdx) {
    if (state.memorizePhase) return;
    const emptyIdx = state.answerSlots.indexOf(null);
    if (emptyIdx === -1) return;

    state.answerSlots[emptyIdx] = glyph;

    // Disable the palette cell visually
    const palCell = dom.paletteGlyphs.children[paletteIdx];
    if (palCell) {
      palCell.style.opacity = '0.2';
      palCell.style.pointerEvents = 'none';
    }

    renderAnswerSlots();
  }

  // --- Remove glyph from slot ---
  function removeFromSlot(slotIdx) {
    if (state.memorizePhase) return;
    const glyph = state.answerSlots[slotIdx];
    if (!glyph) return;

    state.answerSlots[slotIdx] = null;

    // Re-enable the first matching disabled palette cell
    const palCells = dom.paletteGlyphs.children;
    for (let i = 0; i < palCells.length; i++) {
      if (palCells[i].textContent === glyph && palCells[i].style.opacity === '0.2') {
        palCells[i].style.opacity = '';
        palCells[i].style.pointerEvents = '';
        break;
      }
    }

    renderAnswerSlots();
  }

  // --- Clear all answer slots ---
  function clearSlots() {
    state.answerSlots.fill(null);
    // Re-enable all palette cells
    const palCells = dom.paletteGlyphs.children;
    for (let i = 0; i < palCells.length; i++) {
      palCells[i].style.opacity = '';
      palCells[i].style.pointerEvents = '';
    }
    renderAnswerSlots();
  }

  // --- Timer ---
  function startTimer() {
    stopTimer();
    state.timerInterval = setInterval(() => {
      state.timerRemaining = Math.max(0, state.timerRemaining - 0.1);
      updateTimerDisplay();
      if (state.timerRemaining <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 100);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const pct = (state.timerRemaining / state.timerTotal) * 100;
    dom.timerFill.style.width = pct + '%';

    // Color states
    dom.timerFill.classList.remove('timer-bar__fill--warning', 'timer-bar__fill--critical');
    if (pct <= 20) {
      dom.timerFill.classList.add('timer-bar__fill--critical');
    } else if (pct <= 40) {
      dom.timerFill.classList.add('timer-bar__fill--warning');
    }
  }

  // --- Handle timeout ---
  function handleTimeout() {
    flashResult(false, 'Time\'s Up!');
    setTimeout(() => endGame(), 1200);
  }

  // --- Submit answer ---
  function submitAnswer() {
    if (state.answerSlots.some(s => s === null)) return;
    stopTimer();

    // Check correctness
    let allCorrect = true;
    const answerCells = dom.answerSlots.children;

    state.hiddenIndices.forEach((patIdx, slotIdx) => {
      const expected = state.pattern[patIdx];
      const given = state.answerSlots[slotIdx];
      if (given === expected) {
        answerCells[slotIdx].classList.add('glyph-cell--correct');
      } else {
        answerCells[slotIdx].classList.add('glyph-cell--wrong');
        allCorrect = false;
      }
    });

    if (allCorrect) {
      handleCorrect();
    } else {
      handleWrong();
    }
  }

  // --- Correct answer ---
  function handleCorrect() {
    const timeBonus = Math.round(state.timerRemaining * 10);
    const streakBonus = state.streak * 25;
    const basePoints = 100 * state.level;
    const points = basePoints + timeBonus + streakBonus;

    state.score += points;
    state.streak += 1;
    state.decoded += 1;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBest();
    }
    state.level += 1;

    updateHUD();
    flashResult(true, `+${points} pts`);

    setTimeout(() => {
      startRound();
    }, 1200);
  }

  // --- Wrong answer ---
  function handleWrong() {
    state.streak = 0;
    updateHUD();
    flashResult(false, 'Wrong Pattern');

    setTimeout(() => endGame(), 2500);
  }

  // --- Flash result overlay ---
  function flashResult(correct, text) {
    dom.resultFlash.className = 'result-flash result-flash--visible ' +
      (correct ? 'result-flash--correct' : 'result-flash--wrong');
    dom.resultIcon.textContent = correct ? '✓' : '✗';
    dom.resultText.textContent = text;

    setTimeout(() => {
      dom.resultFlash.className = 'result-flash';
    }, correct ? 1000 : 2000);
  }

  // --- Start a new round ---
  function startRound() {
    generateRound();
    showScreen('game');
    updateHUD();

    // Memorize phase: show all glyphs for a brief time
    const memTime = Math.max(1200, 3000 - (state.level - 1) * 150);
    dom.transmissionText.textContent = 'Memorize the pattern...';
    dom.btnSubmit.disabled = true;

    renderPattern();
    renderAnswerSlots();
    renderPalette();

    // Hide palette during memorize
    dom.paletteGlyphs.style.opacity = '0.3';
    dom.paletteGlyphs.style.pointerEvents = 'none';

    setTimeout(() => {
      state.memorizePhase = false;
      dom.transmissionText.textContent = 'Fill in the missing glyphs!';
      dom.paletteGlyphs.style.opacity = '';
      dom.paletteGlyphs.style.pointerEvents = '';
      renderPattern();
      startTimer();
    }, memTime);
  }

  // --- Start new game ---
  function startGame() {
    state.level = 1;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.decoded = 0;
    loadBest();
    startRound();
  }

  // --- End game ---
  function endGame() {
    stopTimer();
    dom.goScore.textContent = state.score;
    dom.goLevel.textContent = state.level;
    dom.goDecoded.textContent = state.decoded;
    dom.goStreak.textContent = state.bestStreak;
    showScreen('gameover');
  }

  // --- Event listeners ---
  dom.btnStart.addEventListener('click', startGame);
  dom.btnRetry.addEventListener('click', startGame);
  dom.btnClear.addEventListener('click', clearSlots);
  dom.btnSubmit.addEventListener('click', submitAnswer);

  // Keyboard shortcut: Enter to submit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.screen === 'game' && !dom.btnSubmit.disabled) {
      submitAnswer();
    }
  });

  // --- Init ---
  loadBest();
  updateHUD();
  showScreen('title');

})();
