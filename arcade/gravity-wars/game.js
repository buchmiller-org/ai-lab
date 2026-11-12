/**
 * Gravity Wars — Session 4
 * Mode selector (Vs AI / 2-Player Local / Solo Challenges), AI turns,
 * challenge levels with star progression, hotseat match loop, weapons,
 * procedural Web Audio (audio.js), and neon visual FX renderer (renderer.js).
 *
 * Storage Key Convention: arcade.gravity-wars.<key>
 *   arcade.gravity-wars.challenges  – { "<level#>": { stars, shots } } best result per level
 *   arcade.gravity-wars.ai-record   – { "<tier>": { w, l } } match record per AI tier
 *   arcade.gravity-wars.muted       – boolean audio mute state
 */
(function () {
  'use strict';

  const { Physics, Entities, Weapons, AI, Challenges, Audio, Renderer } = window.GW;
  const { WORLD } = Entities;

  // --- Tunables ---
  const MAX_DRAG = 160; // px of drag for 100% power
  const MIN_DRAG = 12; // releasing with less than this cancels the shot
  const MAX_SPEED = 560; // launch speed at 100% power (px/s)
  const MAX_HP = 100;
  const WINS_NEEDED = 3; // first to 3 rounds wins the match
  const T_ROUND_START = 1.4;
  const T_IMPACT = 0.9;
  const T_TURN_CHANGE = 0.5;
  const T_ROUND_OVER = 2.2;
  const T_AI_LOCK = 0.55; // beat where the AI's chosen aim is shown before it fires
  const MAX_FLIGHT = 14; // seconds; safety net for endless orbits

  const STATES = ['ROUND_START', 'AIMING', 'PROJECTILE_FLIGHT', 'IMPACT_RESOLUTION', 'TURN_CHANGE', 'ROUND_OVER'];
  const COLORS = ['#06d6a0', '#f472b6'];

  // --- Persistence (every access guarded: private mode / quota / corrupt JSON) ---
  const KEY_CHALLENGES = 'arcade.gravity-wars.challenges';
  const KEY_AI_RECORD = 'arcade.gravity-wars.ai-record';

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

  /** Coerce whatever was stored into a clean { "<n>": { stars, shots } } map. */
  function loadProgress() {
    const raw = Store.read(KEY_CHALLENGES, {});
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (let i = 1; i <= Challenges.COUNT; i++) {
      const r = raw[i];
      if (r && Number.isFinite(r.stars) && r.stars >= 1) {
        out[i] = { stars: Math.min(3, Math.floor(r.stars)), shots: Number.isFinite(r.shots) ? r.shots : 0 };
      }
    }
    return out;
  }

  function loadAiRecord() {
    const raw = Store.read(KEY_AI_RECORD, {});
    const out = {};
    for (const id of AI.ORDER) {
      const r = raw && raw[id];
      out[id] = { w: r && r.w > 0 ? Math.floor(r.w) : 0, l: r && r.l > 0 ? Math.floor(r.l) : 0 };
    }
    return out;
  }

  let progress = loadProgress();
  let aiRecord = loadAiRecord();

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  const angleRange = $('angle-range');
  const powerRange = $('power-range');
  const angleOut = $('angle-out');
  const powerOut = $('power-out');
  const fireBtn = $('fire-btn');
  const controls = $('controls');
  const weaponsEl = $('weapons');
  const banner = $('banner');
  const modal = $('modal');
  const menuEl = $('menu');
  const gameEl = $('game-container');
  const matchHud = $('match-hud');
  const chalHud = $('chal-hud');
  const aiStatus = $('ai-status');
  const hintCard = $('hint-card');
  const retryBtn = $('retry-btn');
  const muteBtn = $('mute-btn');
  const rematchBtn = $('rematch-btn');
  const modalAltBtn = $('modal-alt-btn');

  // --- State ---
  let mode = 'menu'; // 'menu' | 'ai' | 'local' | 'challenge'
  let aiTier = 'tactical';
  let aiJob = null; // active time-sliced aiming job
  let aiPhase = null; // 'think' | 'lock'
  let aiTimer = 0;
  let challenge = null; // built level state (challenge mode)
  let drones = [];
  let ammoLeft = 0;
  let modalActions = { primary: null, alt: null };
  let state = 'MENU';
  let stateTimer = 0;
  let planets = [];
  let ships = [];
  let hp = [MAX_HP, MAX_HP];
  let score = [0, 0];
  let round = 1;
  let turn = 0; // index of active player
  let roundStarter = 0;
  let aims = [
    { angle: 30, power: 50, weapon: 'plasma' },
    { angle: 150, power: 50, weapon: 'plasma' },
  ];
  let projectiles = [];
  let shotTrails = []; // trails of the shot currently in flight / just finished: { points, color }
  let ghost = []; // trails of the previous shot (faint dotted)
  let effects = []; // explosions & floating text
  let flightTime = 0;
  let drag = null; // { px, py } pointer in world coords while dragging
  let roundWinner = -1;
  let scale = 1;
  let lastTime = 0;
  let accumulator = 0;

  const aim = () => aims[turn];
  const isAiTurn = () => mode === 'ai' && turn === 1;
  /** True while the local human may adjust / fire. */
  const humanAiming = () => state === 'AIMING' && !isAiTurn();
  /** What projectiles can collide with / damage. */
  const targets = () => (mode === 'challenge' ? drones : ships);
  const nameOf = (i) => (mode === 'ai' ? (i === 0 ? 'YOU' : 'AI') : 'P' + (i + 1));

  // --- State machine ---
  function setState(next) {
    if (state === 'PROJECTILE_FLIGHT' && next !== 'PROJECTILE_FLIGHT') {
      Audio.stopFlightHum();
    }
    state = next;
    stateTimer = 0;
    updateUi();
  }

  function startRound() {
    Audio.stopFlightHum();
    Renderer.resetFX();
    planets = Entities.generatePlanets(Math.floor(Math.random() * 1e9));
    ships = Entities.createShips();
    hp = [MAX_HP, MAX_HP];
    projectiles = [];
    shotTrails = [];
    ghost = [];
    effects = [];
    turn = roundStarter;
    roundStarter = 1 - roundStarter;
    showBanner('ROUND ' + round, COLORS[turn]);
    Audio.blip('round');
    setState('ROUND_START');
  }

  function newMatch() {
    cancelAi();
    score = [0, 0];
    round = 1;
    roundStarter = 0;
    aims = [
      { angle: 30, power: 50, weapon: 'plasma' },
      { angle: 150, power: 50, weapon: 'plasma' },
    ];
    modal.hidden = true;
    startRound();
  }

  // --- Modes ---
  function showGame() {
    menuEl.hidden = true;
    gameEl.hidden = false;
    resize(); // canvas had no layout box while hidden
  }

  function showMenu() {
    cancelAi();
    Audio.stopFlightHum();
    Renderer.resetFX();
    mode = 'menu';
    state = 'MENU';
    modal.hidden = true;
    hideBanner();
    hintCard.hidden = true;
    gameEl.hidden = true;
    menuEl.hidden = false;
    buildMenu();
    const first = menuEl.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function startVsAi(tier) {
    Audio.blip('ui');
    aiTier = tier;
    mode = 'ai';
    showGame();
    setModeLabel('Vs AI · ' + AI.TIERS[tier].name);
    newMatch();
  }

  function startLocal() {
    Audio.blip('ui');
    mode = 'local';
    showGame();
    setModeLabel('2-Player Local');
    newMatch();
  }

  function setModeLabel(text) {
    $('mode-label').textContent = text;
    retryBtn.hidden = mode !== 'challenge';
  }

  function startChallenge(i) {
    cancelAi();
    Audio.stopFlightHum();
    Renderer.resetFX();
    mode = 'challenge';
    showGame();
    challenge = Challenges.build(i);
    challenge.used = 0;
    ammoLeft = challenge.ammo;
    planets = challenge.planets;
    drones = challenge.drones;
    ships = [challenge.ship];
    projectiles = [];
    shotTrails = [];
    ghost = [];
    effects = [];
    turn = 0;
    flightTime = 0;
    aims[0] = { angle: 30, power: 55, weapon: 'plasma' };
    modal.hidden = true;
    setModeLabel('Challenge ' + (i + 1) + ' · ' + challenge.name);
    hintCard.textContent = challenge.hint;
    hintCard.hidden = false;
    showBanner(challenge.name.toUpperCase(), '#38bdf8');
    Audio.blip('round');
    setState('ROUND_START');
  }

  // --- AI turn driver (runs once per rendered frame, never blocks) ---
  function cancelAi() {
    aiJob = null;
    aiPhase = null;
    aiTimer = 0;
    aiStatus.hidden = true;
  }

  function startAiTurn() {
    aiJob = AI.createJob(aiTier, {
      shooter: ships[1],
      enemy: ships[0],
      planets,
      world: WORLD,
      maxSpeed: MAX_SPEED,
      maxFlight: MAX_FLIGHT,
    });
    aiPhase = 'think';
    aiTimer = 0;
    aiStatus.hidden = false;
    updateUi();
  }

  function tickAi(dt) {
    if (!aiJob) startAiTurn();
    aiTimer += dt;
    if (aiPhase === 'think') {
      // A few virtual projections per frame under a ms budget keeps frames smooth.
      if (!aiJob.done) aiJob.step(AI.PROJECTIONS_PER_FRAME, AI.FRAME_BUDGET_MS);
      if (aiJob.done && aiTimer >= AI.MIN_THINK_TIME) {
        const r = aiJob.result;
        const a = aim();
        a.angle = r.angle;
        a.power = r.power;
        a.weapon = r.weapon;
        aiPhase = 'lock';
        aiTimer = 0;
        aiStatus.hidden = true;
        Audio.blip('lock');
        updateUi();
      }
    } else if (aiPhase === 'lock' && aiTimer >= T_AI_LOCK) {
      cancelAi();
      fire();
    }
  }

  function fire() {
    if (state !== 'AIMING') return;
    drag = null;
    const a = aim();
    if (mode === 'challenge') {
      ammoLeft--;
      challenge.used++;
      hintCard.hidden = true;
    }
    const rad = (-a.angle * Math.PI) / 180;
    projectiles = [Weapons.launch(a.weapon, ships[turn], rad, (a.power / 100) * MAX_SPEED)];
    shotTrails = [];
    flightTime = 0;
    hideBanner();
    Audio.launch(a.weapon, a.power);
    Audio.startFlightHum();
    setState('PROJECTILE_FLIGHT');
  }

  /** Tap / Space during flight: trigger the Cluster Splitter early. */
  function trySplit() {
    if (state !== 'PROJECTILE_FLIGHT' || isAiTurn()) return;
    const extra = [];
    for (const p of projectiles) {
      if (p.type === 'cluster' && !p.split && p.alive) {
        shotTrails.push({ points: p.trail, color: p.spec.color });
        extra.push(...Weapons.split(p));
      }
    }
    if (extra.length) {
      Audio.split();
      projectiles = projectiles.filter((p) => p.alive).concat(extra);
    }
  }

  function detonate(p, hit) {
    if (hit.type === 'bounds') return;
    const spec = p.spec;
    let majorHit = false;

    if (mode === 'challenge') {
      majorHit = detonateDrones(p, hit);
    } else {
      for (let i = 0; i < ships.length; i++) {
        const s = ships[i];
        if (!s.alive) continue;
        const dmg = Weapons.damageFor(spec, hit, p.x, p.y, s);
        if (dmg <= 0) continue;
        majorHit = true;
        hp[i] = Math.max(0, hp[i] - dmg);
        effects.push({ kind: 'text', x: s.x, y: s.y - 24, t: 0, life: 1.2, text: '-' + dmg, color: s.color });
        if (hp[i] <= 0) {
          s.alive = false;
          Renderer.spawnExplosion(effects, s.x, s.y, 72, s.color, true);
        }
      }
    }

    Renderer.spawnExplosion(effects, p.x, p.y, spec.blast || 24, spec.color, majorHit);
    Audio.explosion(spec.blast || 24, majorHit);
    updateUi();
  }

  /** Any damaging contact destroys a drone. Returns true if at least one drone was destroyed. */
  function detonateDrones(p, hit) {
    let any = false;
    for (const d of drones) {
      if (!d.alive) continue;
      if (Weapons.damageFor(p.spec, hit, p.x, p.y, d) <= 0) continue;
      d.alive = false;
      any = true;
      Renderer.spawnExplosion(effects, d.x, d.y, 52, d.color, true);
      effects.push({ kind: 'text', x: d.x, y: d.y - 22, t: 0, life: 1.1, text: 'DOWN', color: '#facc15' });
    }
    return any;
  }

  /** Compute normalized gravitational proximity [0..1] for dynamic flight hum modulation. */
  function updateProximityHum() {
    let maxProx = 0;
    let nearBlackHole = false;
    for (const pr of projectiles) {
      if (!pr.alive) continue;
      for (const pl of planets) {
        if (pl.active === false || pl.shield || !(pl.mass > 0)) continue;
        const dist = Math.hypot(pr.x - pl.x, pr.y - pl.y);
        const surfDist = Math.max(1, dist - pl.radius);
        const pullRange = pl.blackHole ? pl.radius * 8 : pl.radius * 3.6;
        if (surfDist < pullRange) {
          const prox = Math.pow(1 - surfDist / pullRange, 1.35);
          if (prox > maxProx) {
            maxProx = prox;
            nearBlackHole = !!pl.blackHole;
          }
        }
      }
    }
    Audio.updateFlightHum(maxProx, nearBlackHole);
  }

  function simulate() {
    const dt = Physics.FRAME_DT;
    stateTimer += dt;
    for (const e of effects) e.t += dt;
    effects = effects.filter((e) => e.t < e.life);
    Renderer.stepFX(dt);

    switch (state) {
      case 'ROUND_START':
        if (stateTimer >= T_ROUND_START) {
          hideBanner();
          setState('AIMING');
        }
        break;

      case 'PROJECTILE_FLIGHT': {
        flightTime += dt;
        let spawned = [];
        let splitHappened = false;
        for (const p of projectiles) {
          if (Weapons.shouldSplit(p)) {
            shotTrails.push({ points: p.trail, color: p.spec.color });
            spawned.push(...Weapons.split(p));
            splitHappened = true;
            continue;
          }
          const wasBounced = !!p.bounced;
          const hit = Weapons.step(p, planets, targets(), WORLD);
          if (!wasBounced && p.bounced) {
            Audio.bounce();
            Renderer.addShake(0.18);
          }
          if (hit) {
            p.trail.push({ x: p.x, y: p.y });
            shotTrails.push({ points: p.trail, color: p.spec.color });
            p.alive = false;
            detonate(p, hit);
          }
        }
        if (splitHappened) Audio.split();
        projectiles = projectiles.filter((p) => p.alive).concat(spawned);
        if (projectiles.length > 0) {
          updateProximityHum();
        }
        if (flightTime > MAX_FLIGHT) {
          for (const p of projectiles) shotTrails.push({ points: p.trail, color: p.spec.color });
          projectiles = [];
        }
        if (projectiles.length === 0) {
          ghost = shotTrails;
          setState('IMPACT_RESOLUTION');
        }
        break;
      }

      case 'IMPACT_RESOLUTION':
        if (stateTimer >= T_IMPACT) {
          if (mode === 'challenge') resolveChallengeShot();
          else setState('TURN_CHANGE');
        }
        break;

      case 'TURN_CHANGE':
        if (stateTimer === dt) resolveTurnEnd();
        if (state === 'TURN_CHANGE' && stateTimer >= T_TURN_CHANGE) {
          turn = 1 - turn;
          setState('AIMING');
        }
        break;

      case 'ROUND_OVER':
        if (stateTimer >= T_ROUND_OVER) {
          if (score[0] >= WINS_NEEDED || score[1] >= WINS_NEEDED) {
            showMatchOver();
            state = 'MATCH_OVER';
          } else {
            round++;
            startRound();
          }
        }
        break;
      default:
        break;
    }
  }

  /** Check for knock-outs at the end of a turn. */
  function resolveTurnEnd() {
    const dead = hp.map((h) => h <= 0);
    if (!dead[0] && !dead[1]) return;
    if (dead[0] && dead[1]) {
      roundWinner = -1;
      showBanner('DRAW — REPLAY', '#facc15');
      Audio.blip('round');
    } else {
      roundWinner = dead[0] ? 1 : 0;
      score[roundWinner]++;
      showBanner(nameOf(roundWinner) + (mode === 'ai' && roundWinner === 0 ? ' WIN THE ROUND' : ' WINS THE ROUND'), COLORS[roundWinner]);
      Audio.fanfare(mode === 'ai' && roundWinner === 1 ? 'defeat' : 'round');
    }
    if (roundWinner === -1) round--; // a draw does not consume a round number
    setState('ROUND_OVER');
  }

  /** Generic end-of-game dialog. Opts: title, text, color, stars, primary/alt {label, run}. */
  function showModal(o) {
    $('modal-title').textContent = o.title;
    $('modal-text').textContent = o.text;
    modal.querySelector('.modal__card').style.setProperty('--pc', o.color);
    const starsEl = $('modal-stars');
    starsEl.hidden = o.stars === undefined;
    if (o.stars !== undefined) starsEl.innerHTML = starMarkup(o.stars, 'on', 'off');
    rematchBtn.textContent = o.primary.label;
    modalAltBtn.hidden = !o.alt;
    if (o.alt) modalAltBtn.textContent = o.alt.label;
    $('modal-menu-btn').textContent = mode === 'challenge' ? 'LEVELS' : 'MODES';
    modalActions = { primary: o.primary.run, alt: o.alt ? o.alt.run : null };
    hideBanner();
    modal.hidden = false;
    rematchBtn.focus();
    updateUi();
  }

  function showMatchOver() {
    const w = score[0] > score[1] ? 0 : 1;
    let title = 'PLAYER ' + (w + 1) + ' VICTORIOUS';
    if (mode === 'ai') {
      title = w === 0 ? 'VICTORY' : 'AI VICTORIOUS';
      const rec = aiRecord[aiTier];
      if (w === 0) rec.w++;
      else rec.l++;
      Store.write(KEY_AI_RECORD, aiRecord);
    }
    Audio.fanfare(mode === 'ai' && w === 1 ? 'defeat' : 'victory');
    const extra = mode === 'ai' ? '  ·  ' + AI.TIERS[aiTier].name + ' record ' + aiRecord[aiTier].w + 'W–' + aiRecord[aiTier].l + 'L' : '';
    showModal({
      title,
      text: 'Final score  ' + score[0] + ' – ' + score[1] + extra,
      color: COLORS[w],
      primary: { label: 'PLAY AGAIN', run: newMatch },
    });
  }

  // --- Challenge flow ---
  const starMarkup = (n, on, off) =>
    [1, 2, 3].map((i) => '<span class="' + (i <= n ? on : off) + '">★</span>').join('');

  function resolveChallengeShot() {
    if (drones.every((d) => !d.alive)) return finishChallenge(true);
    if (ammoLeft <= 0) return finishChallenge(false);
    setState('AIMING');
  }

  function finishChallenge(won) {
    const i = challenge.index;
    state = 'CHALLENGE_END';
    if (!won) {
      Audio.fanfare('defeat');
      const left = drones.filter((d) => d.alive).length;
      showModal({
        title: 'OUT OF AMMO',
        text: left + (left === 1 ? ' drone' : ' drones') + ' still active.',
        color: '#f87171',
        stars: 0,
        primary: { label: 'RETRY', run: () => startChallenge(i) },
      });
      return;
    }
    Audio.fanfare('victory');
    const stars = Challenges.starsFor(i, challenge.used);
    const prev = progress[i + 1];
    const best = {
      stars: prev ? Math.max(prev.stars, stars) : stars,
      shots: prev && prev.stars >= stars && prev.shots > 0 ? Math.min(prev.shots, challenge.used) : challenge.used,
    };
    progress[i + 1] = best;
    Store.write(KEY_CHALLENGES, progress);
    const hasNext = i + 1 < Challenges.COUNT;
    const prevNote = prev && prev.stars > stars ? '  ·  Best ' + prev.stars + '★' : '';
    showModal({
      title: 'LEVEL CLEARED',
      text: 'Used ' + challenge.used + ' of ' + challenge.ammo + ' shots' + prevNote + (hasNext ? '' : '  ·  Final level complete!'),
      color: '#facc15',
      stars,
      primary: hasNext ? { label: 'NEXT LEVEL', run: () => startChallenge(i + 1) } : { label: 'LEVELS', run: showMenu },
      alt: { label: 'RETRY', run: () => startChallenge(i) },
    });
  }

  function totalStars() {
    let n = 0;
    for (let i = 1; i <= Challenges.COUNT; i++) if (progress[i]) n += progress[i].stars;
    return n;
  }

  // --- Mode selector UI ---
  function buildMenu() {
    const aiBox = $('menu-ai');
    aiBox.innerHTML = '';
    for (const id of AI.ORDER) {
      const t = AI.TIERS[id];
      const r = aiRecord[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-btn';
      b.id = 'menu-ai-' + id;
      b.innerHTML = t.name + '<small>' + t.blurb + (r.w + r.l ? '<br>Record ' + r.w + 'W–' + r.l + 'L' : '') + '</small>';
      b.addEventListener('click', () => startVsAi(id));
      aiBox.appendChild(b);
    }

    const grid = $('level-grid');
    grid.innerHTML = '';
    for (let i = 0; i < Challenges.COUNT; i++) {
      const def = Challenges.LEVELS[i];
      const pr = progress[i + 1];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-tile' + (pr ? ' is-cleared' : '');
      b.id = 'level-tile-' + (i + 1);
      b.setAttribute('aria-label', 'Level ' + (i + 1) + ' ' + def.name + ', ' + (pr ? pr.stars : 0) + ' of 3 stars');
      b.innerHTML =
        '<span class="level-tile__num">LEVEL ' + (i + 1) + '</span>' +
        '<span class="level-tile__name">' + def.name + '</span>' +
        '<span class="level-tile__meta"><span class="stars" aria-hidden="true">' + starMarkup(pr ? pr.stars : 0, 'on', 'off') + '</span>' +
        '<span>' + (pr ? 'Best ' + pr.shots + (pr.shots === 1 ? ' shot' : ' shots') : def.ammo + ' shots') + '</span></span>';
      b.addEventListener('click', () => startChallenge(i));
      grid.appendChild(b);
    }
    $('menu-star-total').textContent = '★ ' + totalStars() + ' / ' + Challenges.COUNT * 3;
  }

  // --- Banner ---
  function showBanner(text, color) {
    banner.textContent = text;
    banner.style.setProperty('--banner-color', color);
    banner.hidden = false;
  }
  function hideBanner() {
    banner.hidden = true;
  }

  // --- UI sync ---
  function syncMuteUi() {
    if (!muteBtn) return;
    const isMuted = Audio.isMuted();
    muteBtn.classList.toggle('is-muted', isMuted);
    muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute audio' : 'Mute audio');
    muteBtn.textContent = isMuted ? '🔇 MUTE' : '🔊 SFX';
  }

  function buildWeaponButtons() {
    Weapons.ORDER.forEach((id) => {
      const spec = Weapons.TYPES[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'weapon-btn';
      b.dataset.weapon = id;
      b.title = spec.desc;
      b.style.setProperty('--wc', spec.color);
      b.innerHTML = spec.name + '<small>' + spec.desc.split(',')[0].split(':')[0] + '</small>';
      b.addEventListener('click', () => {
        if (!humanAiming()) return;
        aim().weapon = id;
        Audio.blip('weapon');
        updateUi();
        b.blur();
      });
      weaponsEl.appendChild(b);
    });
  }

  function updateUi() {
    syncMuteUi();
    const chal = mode === 'challenge';
    matchHud.hidden = chal;
    chalHud.hidden = !chal;
    if (chal) {
      $('chal-level').textContent = 'LEVEL ' + (challenge.index + 1);
      $('chal-name').textContent = challenge.name;
      $('chal-targets').textContent = drones.filter((d) => d.alive).length + '/' + drones.length;
      let pips = '';
      for (let i = 0; i < challenge.ammo; i++) pips += '<span class="pip' + (i < ammoLeft ? '' : ' is-spent') + '"></span>';
      $('chal-ammo').innerHTML = pips;
    } else {
      for (let i = 0; i < 2; i++) {
        $('hp-p' + (i + 1)).style.width = (hp[i] / MAX_HP) * 100 + '%';
        $('hp-text-p' + (i + 1)).textContent = hp[i];
        $('score-p' + (i + 1)).textContent = score[i];
        $('hud-p' + (i + 1)).classList.toggle('is-active', i === turn && state !== 'MATCH_OVER');
        $('hud-p' + (i + 1)).querySelector('.hud__name').textContent = nameOf(i);
      }
      $('hud-round').textContent = 'ROUND ' + round;
      $('hud-turn').textContent = nameOf(turn);
      $('hud-turn').style.color = COLORS[turn];
    }

    const a = aim();
    angleRange.value = a.angle;
    powerRange.value = a.power;
    angleOut.textContent = Math.round(a.angle) + '°';
    powerOut.textContent = Math.round(a.power) + '%';
    controls.dataset.player = turn + 1;
    weaponsEl.querySelectorAll('.weapon-btn').forEach((b) => {
      b.classList.toggle('is-selected', b.dataset.weapon === a.weapon);
    });

    const aiming = humanAiming();
    const canSplit = !isAiTurn() && state === 'PROJECTILE_FLIGHT' && projectiles.some((p) => p.type === 'cluster' && !p.split);
    controls.classList.toggle('is-locked', !aiming);
    fireBtn.disabled = !aiming && !canSplit;
    fireBtn.textContent = canSplit ? 'SPLIT' : 'FIRE';
  }

  function setAngle(v) {
    aim().angle = ((Math.round(v) % 360) + 360) % 360;
    Audio.aimSweep(aim().power, aim().angle);
    updateUi();
  }
  function setPower(v) {
    aim().power = Math.max(1, Math.min(100, Math.round(v)));
    Audio.aimSweep(aim().power, aim().angle);
    updateUi();
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

  /** Slingshot drag → angle/power on the active player's aim. */
  function applyDrag() {
    const s = ships[turn];
    const dx = s.x - drag.px;
    const dy = s.y - drag.py;
    const len = Math.hypot(dx, dy);
    drag.len = len;
    if (len < 2) return;
    aim().angle = ((Math.round((-Math.atan2(dy, dx) * 180) / Math.PI) % 360) + 360) % 360;
    aim().power = Math.max(1, Math.min(100, Math.round((len / MAX_DRAG) * 100)));
    Audio.aimSweep(aim().power, aim().angle);
    updateUi();
  }

  // --- Rendering (delegated to GW.Renderer) ---
  function render() {
    Renderer.renderScene(ctx, canvas, scale, {
      mode,
      state,
      turn,
      challenge,
      planets,
      drones,
      ships,
      ghost,
      shotTrails,
      projectiles,
      effects,
      aim: aim(),
      drag,
      showAim: state === 'AIMING' && !(isAiTurn() && aiPhase !== 'lock'),
    });
  }

  // --- Main loop (fixed time-step with accumulator => deterministic) ---
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const frameDt = Math.min((ts - lastTime) / 1000, 0.1);
    accumulator += frameDt;
    lastTime = ts;
    if (mode === 'menu') {
      accumulator = 0;
      requestAnimationFrame(loop);
      return;
    }
    while (accumulator >= Physics.FRAME_DT) {
      simulate();
      accumulator -= Physics.FRAME_DT;
    }
    if (state === 'AIMING' && isAiTurn()) tickAi(frameDt);
    updateFireLabel();
    render();
    requestAnimationFrame(loop);
  }

  let lastFireLabel = '';
  function updateFireLabel() {
    // Cheap per-frame sync so the FIRE/SPLIT button tracks cluster shells.
    const canSplit = state === 'PROJECTILE_FLIGHT' && projectiles.some((p) => p.type === 'cluster' && !p.split);
    const key = state + canSplit;
    if (key !== lastFireLabel) {
      lastFireLabel = key;
      updateUi();
    }
  }

  // --- Input ---
  function bindEvents() {
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === 'PROJECTILE_FLIGHT') {
        trySplit();
        return;
      }
      if (!humanAiming()) return;
      canvas.setPointerCapture(e.pointerId);
      const w = toWorld(e);
      drag = { px: w.x, py: w.y, len: 0 };
      applyDrag();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const w = toWorld(e);
      drag.px = w.x;
      drag.py = w.y;
      applyDrag();
    });
    canvas.addEventListener('pointerup', () => {
      if (!drag) return;
      const pulled = drag.len;
      drag = null;
      if (pulled >= MIN_DRAG && humanAiming()) fire();
    });
    canvas.addEventListener('pointercancel', () => {
      drag = null;
    });

    angleRange.addEventListener('input', () => humanAiming() && setAngle(+angleRange.value));
    powerRange.addEventListener('input', () => humanAiming() && setPower(+powerRange.value));
    document.querySelectorAll('.step-btn').forEach((b) => {
      b.addEventListener('click', () => {
        if (!humanAiming()) return;
        const d = +b.dataset.delta;
        if (b.dataset.step === 'angle') setAngle(aim().angle + d);
        else setPower(aim().power + d);
      });
    });
    fireBtn.addEventListener('click', () => {
      if (humanAiming()) fire();
      else trySplit();
      fireBtn.blur();
    });

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        Audio.toggleMute();
        syncMuteUi();
        muteBtn.blur();
      });
    }

    // Modal + mode navigation
    rematchBtn.addEventListener('click', () => {
      Audio.blip('ui');
      if (modalActions.primary) modalActions.primary();
    });
    modalAltBtn.addEventListener('click', () => {
      Audio.blip('ui');
      if (modalActions.alt) modalActions.alt();
    });
    $('modal-menu-btn').addEventListener('click', () => {
      Audio.blip('ui');
      showMenu();
    });
    $('menu-btn').addEventListener('click', () => {
      Audio.blip('ui');
      showMenu();
    });
    retryBtn.addEventListener('click', () => {
      if (mode === 'challenge') {
        Audio.blip('ui');
        startChallenge(challenge.index);
      }
    });
    $('menu-local').addEventListener('click', startLocal);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        Audio.toggleMute();
        syncMuteUi();
        return;
      }
      if (!modal.hidden || mode === 'menu') return;
      const step = e.shiftKey ? 5 : 1;
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          if (humanAiming()) setAngle(aim().angle + step); // CCW
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (humanAiming()) setAngle(aim().angle - step);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (humanAiming()) setPower(aim().power + step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (humanAiming()) setPower(aim().power - step);
          break;
        case 'Space':
          e.preventDefault();
          if (e.repeat) break;
          if (humanAiming()) fire();
          else trySplit();
          break;
        default:
      }
    });
    window.addEventListener('resize', resize);
  }

  function init() {
    buildWeaponButtons();
    syncMuteUi();
    bindEvents();
    showMenu();
    requestAnimationFrame(loop);
  }

  init();
})();
