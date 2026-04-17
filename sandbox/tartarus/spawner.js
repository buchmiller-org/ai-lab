// ============================================================
// TARTARUS — Spawner
// Phase-based enemy spawn configuration and logic
// ============================================================

import { state, getZoneForPhase } from './gameState.js';
import { EnemyType } from './entities.js';

// --- Enemy HP formula: Base HP × (1.15 ^ Phase) ---
function scaledHP(baseHP, phase) {
  return Math.round(baseHP * Math.pow(1.15, phase));
}

// --- Spawn table ---
// Each phase defines an array of spawn waves.
// Each wave: { type, count, hp, speed, radius, scrapValue, color, interval }
// interval = seconds between each spawn in this wave

function getSpawnConfig(phase) {
  const zone = getZoneForPhase(phase);
  const waves = [];

  switch (zone) {
    case 1: // Surface Crust (phases 1-4): Scouts + Swarmers
      waves.push({
        type: EnemyType.SCOUT,
        count: 3 + phase * 2,
        hp: scaledHP(8, phase),
        speed: 75 + phase * 3,
        radius: 8,
        scrapValue: 3 + phase,
        color: '#ff4444',
        interval: 2.5 - phase * 0.2,
      });
      if (phase >= 2) {
        waves.push({
          type: EnemyType.SWARMER,
          count: 1 + phase,
          hp: scaledHP(12, phase),
          speed: 55 + phase * 2,
          radius: 10,
          scrapValue: 5 + phase,
          color: '#ff6633',
          interval: 3.5 - phase * 0.3,
        });
      }
      break;

    case 2: // Hive Aquifer (phase 5): Swarmers + guaranteed Elite
      waves.push({
        type: EnemyType.SWARMER,
        count: 10,
        hp: scaledHP(12, phase),
        speed: 60,
        radius: 10,
        scrapValue: 10,
        color: '#ff6633',
        interval: 2.0,
      });
      waves.push({
        type: EnemyType.ELITE,
        count: 1,
        hp: scaledHP(60, phase),
        speed: 45,
        radius: 20,
        scrapValue: 60,
        color: '#ff2222',
        interval: 0, // spawn immediately
      });
      break;

    case 3: // Obsidian Mantle (phases 6-9): Swarmers + Geode-Beetles
      waves.push({
        type: EnemyType.SWARMER,
        count: 5 + (phase - 5) * 3,
        hp: scaledHP(12, phase),
        speed: 60,
        radius: 10,
        scrapValue: 8 + phase,
        color: '#ff6633',
        interval: 2.0 - (phase - 5) * 0.15,
      });
      waves.push({
        type: EnemyType.GEODE_BEETLE,
        count: 2 + (phase - 5),
        hp: scaledHP(30, phase),
        speed: 35,
        radius: 14,
        scrapValue: 15 + phase,
        color: '#cc44ff',
        interval: 4.0 - (phase - 5) * 0.3,
      });
      if (phase >= 7) {
        waves.push({
          type: EnemyType.SCOUT,
          count: 4 + (phase - 6) * 2,
          hp: scaledHP(8, phase),
          speed: 90,
          radius: 8,
          scrapValue: 5,
          color: '#ff4444',
          interval: 1.5,
        });
      }
      break;

    case 4: // Magma Vents (phase 10): All types + guaranteed Mini-Boss
      waves.push({
        type: EnemyType.SWARMER,
        count: 12,
        hp: scaledHP(12, phase),
        speed: 65,
        radius: 10,
        scrapValue: 12,
        color: '#ff6633',
        interval: 1.8,
      });
      waves.push({
        type: EnemyType.GEODE_BEETLE,
        count: 5,
        hp: scaledHP(30, phase),
        speed: 38,
        radius: 14,
        scrapValue: 20,
        color: '#cc44ff',
        interval: 3.5,
      });
      // Magma-Worm mini-boss: chain of segments
      waves.push({
        type: EnemyType.WORM_SEGMENT,
        count: 5,
        hp: scaledHP(40, phase),
        speed: 25,
        radius: 16,
        scrapValue: 30,
        color: '#ff8c00',
        interval: 0.3, // segments spawn in rapid sequence
      });
      break;

    case 5: // Deep Hive (phases 11-14): All types, maximum intensity
      waves.push({
        type: EnemyType.SCOUT,
        count: 8 + (phase - 10) * 3,
        hp: scaledHP(8, phase),
        speed: 95,
        radius: 8,
        scrapValue: 6,
        color: '#ff4444',
        interval: 1.2,
      });
      waves.push({
        type: EnemyType.SWARMER,
        count: 8 + (phase - 10) * 2,
        hp: scaledHP(12, phase),
        speed: 65,
        radius: 10,
        scrapValue: 12,
        color: '#ff6633',
        interval: 1.5,
      });
      waves.push({
        type: EnemyType.GEODE_BEETLE,
        count: 3 + (phase - 10),
        hp: scaledHP(30, phase),
        speed: 40,
        radius: 14,
        scrapValue: 20,
        color: '#cc44ff',
        interval: 3.0,
      });
      break;

    case 6: // Kyloric Core (phase 15): Everything maxed
      waves.push({
        type: EnemyType.SCOUT,
        count: 25,
        hp: scaledHP(8, phase),
        speed: 100,
        radius: 8,
        scrapValue: 6,
        color: '#ff4444',
        interval: 0.8,
      });
      waves.push({
        type: EnemyType.SWARMER,
        count: 20,
        hp: scaledHP(12, phase),
        speed: 70,
        radius: 10,
        scrapValue: 12,
        color: '#ff6633',
        interval: 1.0,
      });
      waves.push({
        type: EnemyType.GEODE_BEETLE,
        count: 8,
        hp: scaledHP(30, phase),
        speed: 42,
        radius: 14,
        scrapValue: 20,
        color: '#cc44ff',
        interval: 2.5,
      });
      break;
  }

  return waves;
}

// --- Active wave state ---
let activeWaves = [];   // array of { config, spawned, timer }

export function resetSpawner() {
  activeWaves = [];
}

/** Called when a new phase begins — loads spawn waves for that phase */
export function startPhaseSpawns(phase) {
  const configs = getSpawnConfig(phase);
  activeWaves = configs.map(cfg => ({
    config: cfg,
    spawned: 0,
    timer: cfg.interval === 0 ? 0 : cfg.interval * 0.5, // first spawn comes quickly
  }));
}

/**
 * Update the spawner. Called every frame.
 * @param {number} dt - Delta time in seconds
 * @param {ObjectPool} enemyPool
 * @param {number} canvasW
 * @param {number} canvasH
 */
export function updateSpawner(dt, enemyPool, canvasW, canvasH) {
  for (const wave of activeWaves) {
    if (wave.spawned >= wave.config.count) continue; // wave complete

    wave.timer -= dt;
    if (wave.timer <= 0) {
      // Spawn one enemy
      const enemy = enemyPool.acquire();
      if (enemy) {
        const pos = getEdgeSpawnPosition(canvasW, canvasH);
        enemy.spawn(
          wave.config.type,
          pos.x, pos.y,
          wave.config.hp,
          wave.config.speed,
          wave.config.radius,
          wave.config.scrapValue,
          wave.config.color
        );
        wave.spawned++;
      }
      wave.timer = wave.config.interval;
    }
  }
}

/**
 * Get a random spawn position along the canvas edge
 */
export function getEdgeSpawnPosition(canvasW, canvasH) {
  const side = Math.floor(Math.random() * 4);
  const margin = 30;
  let x, y;

  switch (side) {
    case 0: // top
      x = Math.random() * canvasW;
      y = -margin;
      break;
    case 1: // right
      x = canvasW + margin;
      y = Math.random() * canvasH;
      break;
    case 2: // bottom
      x = Math.random() * canvasW;
      y = canvasH + margin;
      break;
    case 3: // left
      x = -margin;
      y = Math.random() * canvasH;
      break;
  }
  return { x, y };
}
