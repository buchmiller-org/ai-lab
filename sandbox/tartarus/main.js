// ============================================================
// TARTARUS — Main Entry Point
// Initializes all modules, runs the requestAnimationFrame loop
// ============================================================

import { state, GamePhase, resetState } from './gameState.js';
import { Rig, Enemy, EnemyType, Projectile, Particle, ObjectPool } from './entities.js';
import { initUI, updateHUD, showComm, setOnUpgradeCallback } from './uiManager.js';
import { generateRigName } from './rigNames.js';
import { getEdgeSpawnPosition, updateSpawner, startPhaseSpawns, resetSpawner } from './spawner.js';
import { getZoneForPhase, ZONES } from './gameState.js';

// --- Canvas Setup ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

/** Resize canvas to match its CSS pixel dimensions (retina-aware) */
function resizeCanvas() {
  const wrapper = document.getElementById('canvas-wrapper');
  const rect = wrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Update logical dimensions for game use
  canvasW = rect.width;
  canvasH = rect.height;

  // Reposition rig
  rig.setPosition(canvasW, canvasH);
}

let canvasW = 0;
let canvasH = 0;

// --- Rig Instance ---
const rig = new Rig();

// --- Object Pools ---
const enemyPool = new ObjectPool(Enemy, 200);
const projectilePool = new ObjectPool(Projectile, 500);
const particlePool = new ObjectPool(Particle, 300);

// --- Phase / Zone progression ---
let lastZone = 0;             // track zone changes for transition effects
const BASE_PARALLAX_SPEEDS = [12, 20, 8]; // base speeds for 3 BG layers

// --- Background Layers (parallax rock textures) ---
const BG_LAYERS = [
  { color: '#13131a', speed: 12, offset: 0, height: 60 },
  { color: '#16161f', speed: 20, offset: 30, height: 40 },
  { color: '#111119', speed: 8,  offset: 70, height: 80 },
];

function drawBackground(dt) {
  // Base void
  ctx.fillStyle = '#0f0f11';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Scrolling rock layers (simulate drilling downward)
  for (const layer of BG_LAYERS) {
    layer.offset = (layer.offset - layer.speed * dt) % (layer.height * 2);
    if (layer.offset < 0) layer.offset += layer.height * 2;
    ctx.fillStyle = layer.color;
    for (let y = -layer.height + layer.offset; y < canvasH; y += layer.height * 2) {
      ctx.fillRect(0, y, canvasW, layer.height);
    }
  }

  // Tunnel wall edges — dark strips at left and right to frame the play area
  const wallWidth = 16;
  const wallGrad = ctx.createLinearGradient(0, 0, wallWidth, 0);
  wallGrad.addColorStop(0, '#0a0a0e');
  wallGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, wallWidth, canvasH);

  const wallGradR = ctx.createLinearGradient(canvasW, 0, canvasW - wallWidth, 0);
  wallGradR.addColorStop(0, '#0a0a0e');
  wallGradR.addColorStop(1, 'transparent');
  ctx.fillStyle = wallGradR;
  ctx.fillRect(canvasW - wallWidth, 0, wallWidth, canvasH);
}

// --- Delta Time ---
let lastTimestamp = 0;
const MAX_DT = 0.1; // Cap dt to prevent jumps when tab loses focus

// --- Debug overlay ---
let dtDisplay = 0;
let frameCount = 0;
let fpsDisplay = 0;
let fpsAccumulator = 0;

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  // Delta time (seconds)
  if (lastTimestamp === 0) lastTimestamp = timestamp;
  let dt = (timestamp - lastTimestamp) / 1000;
  if (dt > MAX_DT) dt = MAX_DT;
  lastTimestamp = timestamp;

  // FPS counter
  fpsAccumulator += dt;
  frameCount++;
  if (fpsAccumulator >= 1) {
    fpsDisplay = frameCount;
    frameCount = 0;
    fpsAccumulator -= 1;
  }
  dtDisplay = dt;

  // --- UPDATE ---
  update(dt);

  // --- RENDER ---
  render(dt);
}

function update(dt) {
  // --- Phase timer & progression ---
  state.phaseTimer += dt;

  // Smooth depth increment: 500m per phase over phaseDuration seconds
  const depthPerSecond = 500 / state.phaseDuration;
  state.depth += depthPerSecond * dt;
  state.stats.maxDepth = Math.max(state.stats.maxDepth, state.depth);

  // Phase advance
  if (state.phaseTimer >= state.phaseDuration && state.currentPhase < 15) {
    state.phaseTimer = 0;
    state.currentPhase++;

    // Snap depth to phase boundary
    state.depth = (state.currentPhase - 1) * 500;

    // Update zone
    const newZone = getZoneForPhase(state.currentPhase);
    if (newZone !== state.currentZone) {
      state.currentZone = newZone;
      onZoneTransition(newZone);
    }

    // Start spawns for new phase
    startPhaseSpawns(state.currentPhase);

    console.log(`[TARTARUS] Phase ${state.currentPhase} | Zone ${state.currentZone} | Depth ${Math.floor(state.depth)}m`);
  }

  // Update parallax speed based on zone (deeper = faster scroll)
  const speedMultiplier = 1 + (state.currentZone - 1) * 0.3;
  for (let i = 0; i < BG_LAYERS.length; i++) {
    BG_LAYERS[i].speed = BASE_PARALLAX_SPEEDS[i] * speedMultiplier;
  }

  // --- Spawner ---
  updateSpawner(dt, enemyPool, canvasW, canvasH);

  // --- Update enemies — move toward rig ---
  enemyPool.forEachActive(enemy => {
    enemy.update(dt, rig.x, rig.y);

    // Check if enemy reached the rig (collision with rig body)
    const dx = rig.x - enemy.x;
    const dy = rig.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      // Enemy reached the rig — deal damage
      state.rigHP = Math.max(0, state.rigHP - 5);
      spawnDeathParticles(enemy.x, enemy.y, enemy.color, 4);
      enemy.active = false;
    }
  });

  // --- Turret auto-fire ---
  rig.updateTurrets(dt, enemyPool, projectilePool);

  // --- Update projectiles ---
  projectilePool.forEachActive(proj => {
    proj.update(dt, canvasW, canvasH);
  });

  // --- Projectile ↔ Enemy collision ---
  projectilePool.forEachActive(proj => {
    if (!proj.active) return;
    enemyPool.forEachActive(enemy => {
      if (!enemy.active || !proj.active) return;
      const dx = proj.x - enemy.x;
      const dy = proj.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < enemy.radius + 3) {
        // Hit!
        enemy.hp -= proj.damage;
        proj.active = false;

        if (enemy.hp <= 0) {
          // Enemy killed
          enemy.active = false;
          state.scrap += enemy.scrapValue;
          state.stats.enemiesKilled++;
          state.stats.scrapEarned += enemy.scrapValue;
          spawnDeathParticles(enemy.x, enemy.y, enemy.color, 8);
        }
      }
    });
  });

  // --- Update particles ---
  particlePool.forEachActive(p => {
    p.update(dt);
  });

  updateHUD();
}

/** Spawn a burst of particles at a position (enemy death effect) */
function spawnDeathParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const p = particlePool.acquire();
    if (!p) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    p.spawn(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0.3 + Math.random() * 0.4,  // life
      1.5 + Math.random() * 2.5,  // radius
      color
    );
  }
}

function render(dt) {
  // Clear + draw background
  drawBackground(dt);

  // Draw particles (behind everything)
  particlePool.forEachActive(p => {
    p.draw(ctx);
  });

  // Draw enemies
  enemyPool.forEachActive(enemy => {
    enemy.draw(ctx);
  });

  // Draw projectiles
  projectilePool.forEachActive(proj => {
    proj.draw(ctx);
  });

  // Draw rig at center (on top of everything)
  rig.draw(ctx);

  // Debug: dt + FPS overlay (top-left of canvas)
  ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
  ctx.font = '10px "Share Tech Mono", monospace';
  const ae = enemyPool.activeCount();
  const ap = projectilePool.activeCount();
  const pt = Math.ceil(state.phaseDuration - state.phaseTimer);
  ctx.fillText(`dt: ${(dtDisplay * 1000).toFixed(1)}ms | FPS: ${fpsDisplay} | P${state.currentPhase} ${pt}s | enemies: ${ae} | proj: ${ap}`, 8, 14);
}

// ============================================================
// INITIALIZATION
// ============================================================

/** Handle zone boundary transitions */
function onZoneTransition(newZone) {
  const zoneData = ZONES[newZone];
  if (!zoneData) return;

  // Zone transition comm messages
  const comms = {
    2: `${state.rigName} has breached the Hive Aquifer. Anomalous biological signature detected. This is above the projected threat threshold.`,
    3: `${state.rigName} entering the Obsidian Mantle. Rock density increasing. Armored organisms expected.`,
    4: `Territorial apex organism detected. ${state.rigName}, engaging is mandatory. Surviving is optional.`,
    5: `${state.rigName} has penetrated the Deep Hive nesting grounds. Maximum hostility anticipated. Unit integrity is a secondary concern.`,
    6: `Kyloric Core detected. ${state.rigName}, begin final extraction. Survive 45 seconds. The corporation appreciates your service.`,
  };
  if (comms[newZone]) {
    showComm(comms[newZone], 5000);
  }

  // Flash the zone label
  const zoneEl = document.getElementById('hud-zone');
  if (zoneEl) {
    zoneEl.classList.remove('zone-flash');
    void zoneEl.offsetWidth; // force reflow
    zoneEl.classList.add('zone-flash');
  }
}

/**
 * Sync turret stats from weapon slot state.
 * Called after any Tier 1 upgrade purchase.
 */
function syncTurretStats(slotIndex) {
  // Only sync for slots 0-3 that map to turrets 0-3
  if (slotIndex < 0 || slotIndex >= 4) return;
  if (slotIndex >= rig.turrets.length) return;

  const slotData = state.weaponSlots[slotIndex];
  const turret = rig.turrets[slotIndex];

  // Base stats at Mk.I
  const baseDamage = 5;
  const baseFireRate = 0.5; // seconds between shots

  if (!slotData.path) {
    // No path chosen yet (Mk.I) — base stats
    turret.damage = baseDamage;
    turret.fireRate = baseFireRate;
  } else if (slotData.path === 'OVERCHARGE') {
    // Overcharge: +40% damage per Mk level above 1
    const dmgMultiplier = 1 + (slotData.mk - 1) * 0.4;
    turret.damage = Math.round(baseDamage * dmgMultiplier);
    turret.fireRate = baseFireRate;
  } else if (slotData.path === 'OVERDRIVE') {
    // Overdrive: -20% fire rate (faster) per Mk level above 1
    const rateMultiplier = 1 - (slotData.mk - 1) * 0.15;
    turret.damage = baseDamage;
    turret.fireRate = Math.max(0.1, baseFireRate * rateMultiplier);
  }

  console.log(`[TARTARUS] Slot ${slotIndex} upgraded: Mk.${slotData.mk} ${slotData.path || ''} → dmg:${turret.damage} rate:${turret.fireRate.toFixed(2)}s`);
}

function init() {
  // Init UI
  initUI();

  // Register upgrade callback
  setOnUpgradeCallback(syncTurretStats);

  // Reset game state
  resetState();
  resetSpawner();
  state.rigName = generateRigName();
  state.phase = GamePhase.PLAYING;
  state.currentPhase = 1;
  state.currentZone = 1;
  state.depth = 0;
  lastZone = 1;

  // Size canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Initial HUD render
  updateHUD();

  // Show deployment comm
  showComm(`Designating unit: ${state.rigName}. Drop trajectory nominal. Brace for surface impact.`);

  // Start phase 1 spawns
  startPhaseSpawns(1);

  // Log confirmation
  console.log('[TARTARUS] Init complete. Game loop running with delta time.');
  console.log(`[TARTARUS] Rig designation: ${state.rigName}`);

  // Start loop
  requestAnimationFrame(gameLoop);
}

init();
