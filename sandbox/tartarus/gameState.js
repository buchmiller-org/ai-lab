// ============================================================
// TARTARUS — Game State
// Central store for all run-time game data
// ============================================================

export const GamePhase = {
  MENU:       'MENU',
  DEPLOYING:  'DEPLOYING',
  PLAYING:    'PLAYING',
  PAUSED:     'PAUSED',
  ZONE_EVENT: 'ZONE_EVENT',
  GAME_OVER:  'GAME_OVER',
  EXTRACTION: 'EXTRACTION',
  WIN:        'WIN',
};

const INITIAL_STATE = {
  // Run phase
  phase: GamePhase.MENU,

  // Rig
  rigHP: 100,
  rigMaxHP: 100,

  // Economy
  scrap: 0,

  // Progression
  currentPhase: 1,      // 1–15
  currentZone: 1,        // 1–6
  depth: 0,              // meters
  phaseTimer: 0,         // seconds elapsed in current phase
  phaseDuration: 30,     // seconds per phase

  // Rig designation
  rigName: '',

  // Weapon slots: array of 4 slots
  weaponSlots: [
    { name: 'TURRET A', mk: 1, maxMk: 4, path: null, active: true },
    { name: 'TURRET B', mk: 1, maxMk: 4, path: null, active: true },
    { name: '— EMPTY —', mk: 0, maxMk: 4, path: null, active: false },
    { name: '— EMPTY —', mk: 0, maxMk: 4, path: null, active: false },
  ],

  // Ultimate system
  ultimateUnlocked: false,
  ultimateName: '',
  ultimateCooldown: 0,
  ultimateMaxCooldown: 0,

  // Canister launch
  canisterProgress: 0,  // 0–1
  canisterReady: false,
  canisterHeld: false,

  // Targeting override
  targetOverrideId: null,
  targetOverrideTimer: 0,

  // Stats (for run-end summary)
  stats: {
    enemiesKilled: 0,
    scrapEarned: 0,
    scrapSpent: 0,
    canistersLaunched: 0,
    depositsHarvested: 0,
    maxDepth: 0,
  },
};

/** The live game state object — mutated in place during a run */
export const state = { ...structuredClone(INITIAL_STATE) };

/** Reset state for a new run */
export function resetState() {
  Object.assign(state, structuredClone(INITIAL_STATE));
}

/** Zone data lookup */
export const ZONES = [
  null, // 1-indexed
  { name: 'THE SURFACE CRUST',  phases: [1, 4],   depthStart: 0,    depthEnd: 2000 },
  { name: 'THE HIVE AQUIFER',   phases: [5, 5],   depthStart: 2000, depthEnd: 2500 },
  { name: 'THE OBSIDIAN MANTLE', phases: [6, 9],  depthStart: 2500, depthEnd: 4500 },
  { name: 'THE MAGMA VENTS',   phases: [10, 10],  depthStart: 4500, depthEnd: 5000 },
  { name: 'THE DEEP HIVE',     phases: [11, 14],  depthStart: 5000, depthEnd: 7000 },
  { name: 'THE KYLORIC CORE',  phases: [15, 15],  depthStart: 7000, depthEnd: 7500 },
];

/** Get zone number for a given phase */
export function getZoneForPhase(phase) {
  for (let z = 1; z < ZONES.length; z++) {
    const [start, end] = ZONES[z].phases;
    if (phase >= start && phase <= end) return z;
  }
  return 6;
}
