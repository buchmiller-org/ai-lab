/* ============================================
   Asteroid Miner — Game Logic
   ============================================ */

(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────
  const SAVE_KEY = 'asteroid_miner_save';
  const TICK_MS  = 100;  // idle tick every 100ms
  const AUTOSAVE_MS = 5000;

  // Mineral color palette per depth tier
  const MINERAL_COLORS = [
    ['#a855f7', '#c084fc', '#d8b4fe'],   // Tier 1 — purple
    ['#38bdf8', '#67e8f9', '#06d6a0'],   // Tier 2 — cyan/teal
    ['#facc15', '#fbbf24', '#f59e0b'],   // Tier 3 — gold
    ['#f472b6', '#fb7185', '#f43f5e'],   // Tier 4 — rose
    ['#06d6a0', '#34d399', '#a3e635'],   // Tier 5 — emerald
  ];

  // Upgrade definitions
  const UPGRADES = [
    {
      id: 'drill',
      name: 'Mining Drill',
      icon: '⛏️',
      desc: 'Automated drill extracts minerals passively.',
      baseCost: 15,
      costMult: 1.15,
      cps: 0.1,         // credits per second per unit
    },
    {
      id: 'scanner',
      name: 'Ore Scanner',
      icon: '📡',
      desc: 'Detects richer veins, boosting click value.',
      baseCost: 100,
      costMult: 1.18,
      clickBonus: 1,    // extra per-click per unit
    },
    {
      id: 'excavator',
      name: 'Excavator Bot',
      icon: '🤖',
      desc: 'A tireless robot that mines around the clock.',
      baseCost: 500,
      costMult: 1.15,
      cps: 4,
    },
    {
      id: 'refinery',
      name: 'Ore Refinery',
      icon: '🏭',
      desc: 'Refines raw ore into premium credits.',
      baseCost: 3000,
      costMult: 1.14,
      cps: 20,
    },
    {
      id: 'deepcore',
      name: 'Deep Core Probe',
      icon: '🔬',
      desc: 'Reaches the asteroid core for exotic minerals.',
      baseCost: 15000,
      costMult: 1.13,
      cps: 100,
    },
    {
      id: 'quantum',
      name: 'Quantum Extractor',
      icon: '⚛️',
      desc: 'Harvests minerals from parallel dimensions.',
      baseCost: 100000,
      costMult: 1.12,
      cps: 500,
    },
  ];

  // Depth milestones — unlock new visuals at certain total credits earned
  const DEPTH_THRESHOLDS = [0, 100, 1000, 10000, 100000, 1000000];

  // Achievements
  const ACHIEVEMENTS = [
    { id: 'first_click',  name: 'First Strike',      desc: 'Mine your first mineral.',       check: s => s.totalClicks >= 1 },
    { id: 'clicks_100',   name: 'Persistent Miner',   desc: 'Click 100 times.',              check: s => s.totalClicks >= 100 },
    { id: 'clicks_1000',  name: 'Click Maniac',       desc: 'Click 1,000 times.',            check: s => s.totalClicks >= 1000 },
    { id: 'credits_1k',   name: 'Thousandaire',       desc: 'Earn 1,000 total credits.',     check: s => s.totalCredits >= 1000 },
    { id: 'credits_100k', name: 'Space Baron',        desc: 'Earn 100,000 total credits.',   check: s => s.totalCredits >= 100000 },
    { id: 'credits_1m',   name: 'Galactic Mogul',     desc: 'Earn 1,000,000 total credits.', check: s => s.totalCredits >= 1000000 },
    { id: 'depth_3',      name: 'Deep Driller',       desc: 'Reach depth 3.',                check: s => s.depth >= 3 },
    { id: 'depth_5',      name: 'Core Breaker',       desc: 'Reach depth 5.',                check: s => s.depth >= 5 },
    { id: 'first_upgrade', name: 'Automation',        desc: 'Purchase your first upgrade.',   check: s => Object.values(s.upgrades).some(v => v > 0) },
    { id: 'all_upgrades',  name: 'Full Arsenal',      desc: 'Own at least one of every upgrade.', check: s => UPGRADES.every(u => (s.upgrades[u.id] || 0) > 0) },
  ];

  // ─── State ────────────────────────────────────────────
  let state = createFreshState();

  function createFreshState() {
    const upgrades = {};
    UPGRADES.forEach(u => upgrades[u.id] = 0);
    return {
      credits: 0,
      totalCredits: 0,
      totalClicks: 0,
      depth: 1,
      upgrades: upgrades,
      achievements: [],
    };
  }

  // ─── DOM refs ─────────────────────────────────────────
  const $credits  = document.getElementById('hud-credits');
  const $depth    = document.getElementById('hud-depth');
  const $cps      = document.getElementById('hud-cps');
  const $asteroid = document.getElementById('asteroid');
  const $body     = document.getElementById('asteroid-body');
  const $glow     = document.getElementById('asteroid-glow');
  const $zone     = document.getElementById('asteroid-zone');
  const $list     = document.getElementById('upgrades-list');
  const $toasts   = document.getElementById('toast-area');
  const $starCanvas = document.getElementById('starfield-canvas');

  // ─── Starfield ────────────────────────────────────────
  const starCtx = $starCanvas.getContext('2d');
  let stars = [];

  function initStarfield() {
    resizeStarCanvas();
    stars = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 3000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * $starCanvas.width,
        y: Math.random() * $starCanvas.height,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.3 + 0.05,
        alpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resizeStarCanvas() {
    $starCanvas.width  = window.innerWidth;
    $starCanvas.height = window.innerHeight;
  }

  function drawStarfield(time) {
    starCtx.clearRect(0, 0, $starCanvas.width, $starCanvas.height);
    for (const s of stars) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * s.twinkleSpeed + s.twinklePhase));
      starCtx.beginPath();
      starCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      starCtx.fillStyle = `rgba(200, 210, 255, ${s.alpha * twinkle})`;
      starCtx.fill();

      // Slow drift
      s.y += s.speed;
      if (s.y > $starCanvas.height + 2) {
        s.y = -2;
        s.x = Math.random() * $starCanvas.width;
      }
    }
  }

  window.addEventListener('resize', () => {
    resizeStarCanvas();
  });

  // ─── Formatting ───────────────────────────────────────
  function formatNum(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
  }

  // ─── Game Calculations ────────────────────────────────
  function getClickValue() {
    let val = 1;
    UPGRADES.forEach(u => {
      if (u.clickBonus) val += u.clickBonus * (state.upgrades[u.id] || 0);
    });
    return val;
  }

  function getCPS() {
    let cps = 0;
    UPGRADES.forEach(u => {
      if (u.cps) cps += u.cps * (state.upgrades[u.id] || 0);
    });
    return cps;
  }

  function getUpgradeCost(upDef) {
    const owned = state.upgrades[upDef.id] || 0;
    return Math.floor(upDef.baseCost * Math.pow(upDef.costMult, owned));
  }

  function updateDepth() {
    let d = 1;
    for (let i = DEPTH_THRESHOLDS.length - 1; i >= 0; i--) {
      if (state.totalCredits >= DEPTH_THRESHOLDS[i]) { d = i + 1; break; }
    }
    if (d !== state.depth) {
      state.depth = d;
      updateAsteroidVisual();
    }
  }

  // ─── Visuals ──────────────────────────────────────────
  function updateAsteroidVisual() {
    const tier = Math.min(state.depth, MINERAL_COLORS.length) - 1;
    const colors = MINERAL_COLORS[tier];
    const hueShift = tier * 30;

    // Update glow color
    $glow.style.background = `radial-gradient(circle, ${colors[0]}33, transparent 70%)`;

    // Update asteroid surface tint
    const tint = colors[1] + '22';
    $body.style.background = `
      radial-gradient(circle at 35% 30%, #5a5a6e, #2a2a3a 40%, ${tint} 80%),
      radial-gradient(circle at 35% 30%, #5a5a6e, #2a2a3a 40%, #1a1a28 80%)
    `;
  }

  // ─── Click Handling ───────────────────────────────────
  function onAsteroidClick(e) {
    e.preventDefault();
    const val = getClickValue();
    state.credits += val;
    state.totalCredits += val;
    state.totalClicks++;

    // Shake
    $asteroid.classList.remove('asteroid--shake');
    void $asteroid.offsetWidth;
    $asteroid.classList.add('asteroid--shake');

    // Particles
    spawnParticles(e);

    // Float text
    spawnFloatText(e, val);

    // Flash credits HUD
    $credits.classList.add('hud__value--flash');
    setTimeout(() => $credits.classList.remove('hud__value--flash'), 150);

    updateDepth();
    checkAchievements();
    renderHUD();
    renderUpgrades();
  }

  function spawnParticles(e) {
    const tier = Math.min(state.depth, MINERAL_COLORS.length) - 1;
    const colors = MINERAL_COLORS[tier];
    const rect = $zone.getBoundingClientRect();

    // Get click position relative to asteroid zone
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'mineral-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.left = cx + 'px';
      p.style.top  = cy + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.boxShadow  = `0 0 6px ${colors[0]}`;
      p.style.width  = (3 + Math.random() * 5) + 'px';
      p.style.height = p.style.width;
      $zone.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  function spawnFloatText(e, val) {
    const rect = $zone.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const tier = Math.min(state.depth, MINERAL_COLORS.length) - 1;
    const color = MINERAL_COLORS[tier][0];

    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = '+' + formatNum(val);
    el.style.left  = cx + 'px';
    el.style.top   = (cy - 10) + 'px';
    el.style.color = color;
    $zone.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  // ─── Upgrade Handling ─────────────────────────────────
  function buyUpgrade(upDef) {
    const cost = getUpgradeCost(upDef);
    if (state.credits < cost) return;

    state.credits -= cost;
    state.upgrades[upDef.id] = (state.upgrades[upDef.id] || 0) + 1;

    checkAchievements();
    renderHUD();
    renderUpgrades();
  }

  // ─── Rendering ────────────────────────────────────────
  function renderHUD() {
    $credits.textContent = formatNum(state.credits);
    $depth.textContent   = state.depth;
    $cps.textContent     = formatNum(getCPS());
  }

  function renderUpgrades() {
    // Only recreate DOM if children count changed
    if ($list.children.length !== UPGRADES.length) {
      $list.innerHTML = '';
      UPGRADES.forEach(upDef => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.id = 'upgrade-' + upDef.id;
        card.innerHTML = `
          <div class="upgrade-card__icon">${upDef.icon}</div>
          <div class="upgrade-card__info">
            <div class="upgrade-card__name">${upDef.name}</div>
            <div class="upgrade-card__desc">${upDef.desc}</div>
          </div>
          <div class="upgrade-card__right">
            <div class="upgrade-card__cost"></div>
            <div class="upgrade-card__count"></div>
          </div>
        `;
        card.addEventListener('click', () => {
          const cost = getUpgradeCost(upDef);
          if (state.credits >= cost) {
            buyUpgrade(upDef);
            card.classList.remove('upgrade-card--flash');
            void card.offsetWidth;
            card.classList.add('upgrade-card--flash');
          }
        });
        $list.appendChild(card);
      });
    }

    // Update values
    UPGRADES.forEach(upDef => {
      const card = document.getElementById('upgrade-' + upDef.id);
      if (!card) return;
      const cost  = getUpgradeCost(upDef);
      const owned = state.upgrades[upDef.id] || 0;
      const canBuy = state.credits >= cost;

      card.querySelector('.upgrade-card__cost').textContent  = '💎 ' + formatNum(cost);
      card.querySelector('.upgrade-card__count').textContent = 'Owned: ' + owned;
      card.classList.toggle('upgrade-card--locked', !canBuy);
    });
  }

  // ─── Achievements ─────────────────────────────────────
  function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
      if (state.achievements.includes(a.id)) return;
      if (a.check(state)) {
        state.achievements.push(a.id);
        showToast('🏆 ' + a.name + ' — ' + a.desc);
      }
    });
  }

  function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $toasts.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  // ─── Save / Load ──────────────────────────────────────
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (_) { /* storage full or unavailable */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      // Merge with fresh state to handle missing fields from older saves
      const fresh = createFreshState();
      state = { ...fresh, ...saved, upgrades: { ...fresh.upgrades, ...(saved.upgrades || {}) } };
    } catch (_) { /* corrupted save */ }
  }

  // ─── Game Loop ────────────────────────────────────────
  let lastTick = performance.now();

  function gameLoop(time) {
    // Starfield
    drawStarfield(time);

    // Idle income
    const now = performance.now();
    if (now - lastTick >= TICK_MS) {
      const dt = (now - lastTick) / 1000;
      const income = getCPS() * dt;
      if (income > 0) {
        state.credits += income;
        state.totalCredits += income;
        updateDepth();
        checkAchievements();
        renderHUD();
        renderUpgrades();
      }
      lastTick = now;
    }

    requestAnimationFrame(gameLoop);
  }

  // ─── Init ─────────────────────────────────────────────
  function init() {
    load();
    initStarfield();
    updateAsteroidVisual();
    renderHUD();
    renderUpgrades();

    // Asteroid click / touch
    $asteroid.addEventListener('click', onAsteroidClick);
    $asteroid.addEventListener('touchstart', onAsteroidClick, { passive: false });

    // Autosave
    setInterval(save, AUTOSAVE_MS);

    // Start loop
    requestAnimationFrame(gameLoop);
  }

  init();
})();
