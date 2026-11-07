/**
 * Gravity Wars — Session 2
 * Hotseat match loop, dual aiming controls, weapons, ghost trajectory.
 *
 * Storage Key Convention: arcade.gravity-wars.<key> (none used yet).
 */
(function () {
  'use strict';

  const { Physics, Entities, Weapons } = window.GW;
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
  const MAX_FLIGHT = 14; // seconds; safety net for endless orbits

  const STATES = ['ROUND_START', 'AIMING', 'PROJECTILE_FLIGHT', 'IMPACT_RESOLUTION', 'TURN_CHANGE', 'ROUND_OVER'];
  const COLORS = ['#06d6a0', '#f472b6'];

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

  // --- State ---
  let state = 'ROUND_START';
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
  let shotTrails = []; // trails of the shot currently in flight / just finished
  let ghost = []; // trails of the previous shot (faint dotted)
  let effects = []; // explosions & floating text
  let flightTime = 0;
  let drag = null; // { px, py } pointer in world coords while dragging
  let roundWinner = -1;
  let scale = 1;
  let lastTime = 0;
  let accumulator = 0;

  const aim = () => aims[turn];

  // --- State machine ---
  function setState(next) {
    state = next;
    stateTimer = 0;
    updateUi();
  }

  function startRound() {
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
    setState('ROUND_START');
  }

  function newMatch() {
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

  function fire() {
    if (state !== 'AIMING') return;
    drag = null;
    const a = aim();
    const rad = (-a.angle * Math.PI) / 180;
    projectiles = [Weapons.launch(a.weapon, ships[turn], rad, (a.power / 100) * MAX_SPEED)];
    shotTrails = [];
    flightTime = 0;
    hideBanner();
    setState('PROJECTILE_FLIGHT');
  }

  /** Tap / Space during flight: trigger the Cluster Splitter early. */
  function trySplit() {
    if (state !== 'PROJECTILE_FLIGHT') return;
    const extra = [];
    for (const p of projectiles) {
      if (p.type === 'cluster' && !p.split && p.alive) {
        shotTrails.push(p.trail);
        extra.push(...Weapons.split(p));
      }
    }
    if (extra.length) projectiles = projectiles.filter((p) => p.alive).concat(extra);
  }

  function detonate(p, hit) {
    if (hit.type === 'bounds') return;
    const spec = p.spec;
    effects.push({ kind: 'boom', x: p.x, y: p.y, r: spec.blast || 20, t: 0, life: 0.6, color: spec.color });
    for (let i = 0; i < ships.length; i++) {
      const s = ships[i];
      if (!s.alive) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y) - s.radius;
      let dmg = 0;
      if (hit.type === 'ship' && hit.target === s) dmg = spec.damage;
      else if (d < spec.blast) dmg = spec.damage * (1 - Math.max(0, d) / spec.blast);
      dmg = Math.round(dmg);
      if (dmg <= 0) continue;
      hp[i] = Math.max(0, hp[i] - dmg);
      effects.push({ kind: 'text', x: s.x, y: s.y - 24, t: 0, life: 1.2, text: '-' + dmg, color: s.color });
      if (hp[i] <= 0) {
        s.alive = false;
        effects.push({ kind: 'boom', x: s.x, y: s.y, r: 70, t: 0, life: 1.0, color: s.color });
      }
    }
    updateUi();
  }

  function simulate() {
    const dt = Physics.FRAME_DT;
    stateTimer += dt;
    for (const e of effects) e.t += dt;
    effects = effects.filter((e) => e.t < e.life);

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
        for (const p of projectiles) {
          if (Weapons.shouldSplit(p)) {
            shotTrails.push(p.trail);
            spawned.push(...Weapons.split(p));
            continue;
          }
          const hit = Weapons.step(p, planets, ships, WORLD);
          if (hit) {
            p.trail.push({ x: p.x, y: p.y });
            shotTrails.push(p.trail);
            p.alive = false;
            detonate(p, hit);
          }
        }
        projectiles = projectiles.filter((p) => p.alive).concat(spawned);
        if (flightTime > MAX_FLIGHT) {
          for (const p of projectiles) shotTrails.push(p.trail);
          projectiles = [];
        }
        if (projectiles.length === 0) {
          ghost = shotTrails;
          setState('IMPACT_RESOLUTION');
        }
        break;
      }

      case 'IMPACT_RESOLUTION':
        if (stateTimer >= T_IMPACT) setState('TURN_CHANGE');
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
    } else {
      roundWinner = dead[0] ? 1 : 0;
      score[roundWinner]++;
      showBanner('P' + (roundWinner + 1) + ' WINS THE ROUND', COLORS[roundWinner]);
    }
    if (roundWinner === -1) round--; // a draw does not consume a round number
    setState('ROUND_OVER');
  }

  function showMatchOver() {
    const w = score[0] > score[1] ? 0 : 1;
    $('modal-title').textContent = 'PLAYER ' + (w + 1) + ' VICTORIOUS';
    $('modal-text').textContent = 'Final score  ' + score[0] + ' – ' + score[1];
    modal.querySelector('.modal__card').style.setProperty('--pc', COLORS[w]);
    hideBanner();
    modal.hidden = false;
    $('rematch-btn').focus();
    updateUi();
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
        if (state !== 'AIMING') return;
        aim().weapon = id;
        updateUi();
        b.blur();
      });
      weaponsEl.appendChild(b);
    });
  }

  function updateUi() {
    for (let i = 0; i < 2; i++) {
      $('hp-p' + (i + 1)).style.width = (hp[i] / MAX_HP) * 100 + '%';
      $('hp-text-p' + (i + 1)).textContent = hp[i];
      $('score-p' + (i + 1)).textContent = score[i];
      $('hud-p' + (i + 1)).classList.toggle('is-active', i === turn && state !== 'MATCH_OVER');
    }
    $('hud-round').textContent = 'ROUND ' + round;
    $('hud-turn').textContent = 'P' + (turn + 1);
    $('hud-turn').style.color = COLORS[turn];

    const a = aim();
    angleRange.value = a.angle;
    powerRange.value = a.power;
    angleOut.textContent = Math.round(a.angle) + '°';
    powerOut.textContent = Math.round(a.power) + '%';
    controls.dataset.player = turn + 1;
    weaponsEl.querySelectorAll('.weapon-btn').forEach((b) => {
      b.classList.toggle('is-selected', b.dataset.weapon === a.weapon);
    });

    const aiming = state === 'AIMING';
    const canSplit = state === 'PROJECTILE_FLIGHT' && projectiles.some((p) => p.type === 'cluster' && !p.split);
    controls.classList.toggle('is-locked', !aiming);
    fireBtn.disabled = !aiming && !canSplit;
    fireBtn.textContent = canSplit ? 'SPLIT' : 'FIRE';
  }

  function setAngle(v) {
    aim().angle = ((Math.round(v) % 360) + 360) % 360;
    updateUi();
  }
  function setPower(v) {
    aim().power = Math.max(1, Math.min(100, Math.round(v)));
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
    updateUi();
  }

  // --- Rendering ---
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    drawStars();
    planets.forEach(drawPlanet);
    drawGhost();
    ships.forEach(drawShip);

    shotTrails.forEach((t) => drawTrail(t, 0.8));
    for (const p of projectiles) {
      drawTrail(p.trail, 1);
      drawProjectile(p);
    }
    effects.forEach(drawEffect);
    if (state === 'AIMING') drawAim();
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
    if (!s.alive) return;
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
    if (ships[turn] === s && (state === 'AIMING' || state === 'ROUND_START')) {
      ctx.strokeStyle = s.color + '88';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** Faint dotted trail of the previous shot. */
  function drawGhost() {
    if (!ghost.length) return;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const trail of ghost) {
      for (let i = 0; i < trail.length; i += 3) {
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTrail(trail, alpha) {
    if (trail.length < 2) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const n = trail.length;
    const seg = Math.max(1, Math.floor(n / 40));
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
    ctx.shadowColor = p.spec.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (p.type === 'bouncer' && p.bouncesLeft > 0) {
      // Elastic warp shield
      ctx.strokeStyle = p.spec.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.type === 'cluster') {
      const k = Math.min(p.age / Weapons.SPLIT_DELAY, 1);
      ctx.strokeStyle = p.spec.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEffect(e) {
    const k = e.t / e.life;
    if (e.kind === 'boom') {
      ctx.fillStyle = e.color + Math.round((1 - k) * 90).toString(16).padStart(2, '0');
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4 + e.r * Math.min(1, k * 2.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = e.color;
      ctx.font = '700 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.text, e.x, e.y - k * 24);
      ctx.globalAlpha = 1;
    }
  }

  function drawAim() {
    const s = ships[turn];
    const a = aim();
    const rad = (-a.angle * Math.PI) / 180;
    const len = (a.power / 100) * MAX_DRAG;
    // Direction/power indicator from the ship
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(rad) * len, s.y + Math.sin(rad) * len);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(rad) * len, s.y + Math.sin(rad) * len, 4, 0, Math.PI * 2);
    ctx.fill();
    // Slingshot pull-back line while dragging
    if (drag) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(drag.px, drag.py);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(drag.px, drag.py, 5, 0, Math.PI * 2);
      ctx.fill();
    }
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
      if (state !== 'AIMING') return;
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
      if (pulled >= MIN_DRAG) fire();
    });
    canvas.addEventListener('pointercancel', () => {
      drag = null;
    });

    angleRange.addEventListener('input', () => state === 'AIMING' && setAngle(+angleRange.value));
    powerRange.addEventListener('input', () => state === 'AIMING' && setPower(+powerRange.value));
    document.querySelectorAll('.step-btn').forEach((b) => {
      b.addEventListener('click', () => {
        if (state !== 'AIMING') return;
        const d = +b.dataset.delta;
        if (b.dataset.step === 'angle') setAngle(aim().angle + d);
        else setPower(aim().power + d);
      });
    });
    fireBtn.addEventListener('click', () => {
      if (state === 'AIMING') fire();
      else trySplit();
      fireBtn.blur();
    });
    $('rematch-btn').addEventListener('click', newMatch);

    window.addEventListener('keydown', (e) => {
      if (!modal.hidden) return;
      const step = e.shiftKey ? 5 : 1;
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          if (state === 'AIMING') setAngle(aim().angle + step); // CCW
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (state === 'AIMING') setAngle(aim().angle - step);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (state === 'AIMING') setPower(aim().power + step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (state === 'AIMING') setPower(aim().power - step);
          break;
        case 'Space':
          e.preventDefault();
          if (e.repeat) break;
          if (state === 'AIMING') fire();
          else trySplit();
          break;
        default:
      }
    });
    window.addEventListener('resize', resize);
  }

  function init() {
    buildWeaponButtons();
    bindEvents();
    resize();
    newMatch();
    requestAnimationFrame(loop);
  }

  init();
})();
