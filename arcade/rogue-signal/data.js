/* ============================================
   Rogue Signal — Data Definitions
   Card pool, enemy patterns, events, shop items
   ============================================ */

/* global window */

window.RSData = (() => {
  'use strict';

  // ─── Card Definitions ───────────────────────────────────────────
  // type: 'attack' | 'skill' | 'power'
  // rarity: 'starter' | 'common' | 'uncommon' | 'rare'

  const STARTER_CARDS = [
    { id: 'thrust', name: 'Thrust', cost: 1, type: 'attack', rarity: 'starter',
      desc: 'Deal 6 damage.', effect: { damage: 6 } },
    { id: 'thrust', name: 'Thrust', cost: 1, type: 'attack', rarity: 'starter',
      desc: 'Deal 6 damage.', effect: { damage: 6 } },
    { id: 'thrust', name: 'Thrust', cost: 1, type: 'attack', rarity: 'starter',
      desc: 'Deal 6 damage.', effect: { damage: 6 } },
    { id: 'thrust', name: 'Thrust', cost: 1, type: 'attack', rarity: 'starter',
      desc: 'Deal 6 damage.', effect: { damage: 6 } },
    { id: 'shield_pulse', name: 'Shield Pulse', cost: 1, type: 'skill', rarity: 'starter',
      desc: 'Gain 5 block.', effect: { block: 5 } },
    { id: 'shield_pulse', name: 'Shield Pulse', cost: 1, type: 'skill', rarity: 'starter',
      desc: 'Gain 5 block.', effect: { block: 5 } },
    { id: 'scan', name: 'Scan', cost: 1, type: 'skill', rarity: 'starter',
      desc: 'Draw 2 cards.', effect: { draw: 2 } },
    { id: 'repair_signal', name: 'Repair Signal', cost: 1, type: 'skill', rarity: 'starter',
      desc: 'Heal 3 HP.', effect: { heal: 3 } },
  ];

  const REWARD_POOL = [
    // Common attacks
    { id: 'ion_beam', name: 'Ion Beam', cost: 2, type: 'attack', rarity: 'common',
      desc: 'Deal 12 damage.', effect: { damage: 12 } },
    { id: 'plasma_bolt', name: 'Plasma Bolt', cost: 1, type: 'attack', rarity: 'common',
      desc: 'Deal 8 damage.', effect: { damage: 8 } },
    { id: 'kinetic_burst', name: 'Kinetic Burst', cost: 1, type: 'attack', rarity: 'common',
      desc: 'Deal 4 damage twice.', effect: { damage: 4, hits: 2 } },

    // Common skills
    { id: 'deflector_array', name: 'Deflector Array', cost: 2, type: 'skill', rarity: 'common',
      desc: 'Gain 12 block.', effect: { block: 12 } },
    { id: 'full_scan', name: 'Full Scan', cost: 1, type: 'skill', rarity: 'common',
      desc: 'Draw 3 cards.', effect: { draw: 3 } },
    { id: 'recall', name: 'Recall', cost: 0, type: 'skill', rarity: 'common',
      desc: 'Draw 1 card. Gain 2 block.', effect: { draw: 1, block: 2 } },
    { id: 'patch_hull', name: 'Patch Hull', cost: 1, type: 'skill', rarity: 'common',
      desc: 'Heal 5 HP.', effect: { heal: 5 } },

    // Uncommon attacks
    { id: 'emp_burst', name: 'EMP Burst', cost: 2, type: 'attack', rarity: 'uncommon',
      desc: 'Deal 8 damage to ALL enemies.', effect: { damage: 8, aoe: true } },
    { id: 'piercing_lance', name: 'Piercing Lance', cost: 2, type: 'attack', rarity: 'uncommon',
      desc: 'Deal 16 damage.', effect: { damage: 16 } },
    { id: 'barrage', name: 'Barrage', cost: 1, type: 'attack', rarity: 'uncommon',
      desc: 'Deal 3 damage 3 times.', effect: { damage: 3, hits: 3 } },

    // Uncommon skills
    { id: 'overcharge', name: 'Overcharge', cost: 0, type: 'skill', rarity: 'uncommon',
      desc: 'Gain 2 energy.', effect: { energy: 2 } },
    { id: 'nano_repair', name: 'Nano Repair', cost: 2, type: 'skill', rarity: 'uncommon',
      desc: 'Heal 10 HP.', effect: { heal: 10 } },
    { id: 'signal_boost', name: 'Signal Boost', cost: 1, type: 'skill', rarity: 'uncommon',
      desc: 'Draw 2 cards. Gain 1 energy.', effect: { draw: 2, energy: 1 } },
    { id: 'freq_jam', name: 'Frequency Jam', cost: 1, type: 'skill', rarity: 'uncommon',
      desc: 'Apply 2 Weak to an enemy.', effect: { weak: 2 } },
    { id: 'adaptive_hull', name: 'Adaptive Hull', cost: 1, type: 'skill', rarity: 'uncommon',
      desc: 'Gain block equal to your hand size × 3.', effect: { blockPerCard: 3 } },
    { id: 'power_cycle', name: 'Power Cycle', cost: 1, type: 'skill', rarity: 'uncommon',
      desc: 'Discard your hand. Draw 5 cards.', effect: { discardHand: true, draw: 5 } },

    // Rare attacks
    { id: 'gravity_sling', name: 'Gravity Sling', cost: 3, type: 'attack', rarity: 'rare',
      desc: 'Deal 24 damage.', effect: { damage: 24 } },
    { id: 'nova_flare', name: 'Nova Flare', cost: 3, type: 'attack', rarity: 'rare',
      desc: 'Deal 15 damage to ALL enemies.', effect: { damage: 15, aoe: true } },
    { id: 'chain_lightning', name: 'Chain Lightning', cost: 2, type: 'attack', rarity: 'rare',
      desc: 'Deal 5 damage 4 times to random enemies.', effect: { damage: 5, hits: 4, random: true } },

    // Rare skills
    { id: 'emergency_protocol', name: 'Emergency Protocol', cost: 0, type: 'skill', rarity: 'rare',
      desc: 'Gain 8 block. Draw 2 cards.', effect: { block: 8, draw: 2 } },
    { id: 'quantum_shield', name: 'Quantum Shield', cost: 2, type: 'skill', rarity: 'rare',
      desc: 'Gain 20 block.', effect: { block: 20 } },
    { id: 'full_restore', name: 'Full Restore', cost: 3, type: 'skill', rarity: 'rare',
      desc: 'Heal 20 HP.', effect: { heal: 20 } },
  ];

  // ─── Enemy Definitions ──────────────────────────────────────────
  // intent types: 'attack', 'defend', 'buff', 'debuff', 'multi'
  // pattern: array of intents that cycle

  const ENEMIES = {
    // ── Sector 1 Enemies ──
    micro_asteroid: {
      id: 'micro_asteroid', name: 'Micro-Asteroid', hp: 14,
      sprite: '🪨', sector: 1, elite: false,
      pattern: [
        { type: 'attack', value: 6 },
        { type: 'attack', value: 7 },
        { type: 'attack', value: 5 },
      ]
    },
    space_junk: {
      id: 'space_junk', name: 'Space Junk', hp: 10,
      sprite: '🛰️', sector: 1, elite: false,
      pattern: [
        { type: 'attack', value: 4 },
        { type: 'defend', value: 4 },
      ]
    },
    solar_flare: {
      id: 'solar_flare', name: 'Solar Flare', hp: 22,
      sprite: '☀️', sector: 1, elite: false,
      pattern: [
        { type: 'buff', value: 0, desc: 'Charging…' },
        { type: 'attack', value: 18 },
      ]
    },

    // ── Sector 1 Elite ──
    rogue_drone: {
      id: 'rogue_drone', name: 'Rogue Drone', hp: 32,
      sprite: '🤖', sector: 1, elite: true,
      pattern: [
        { type: 'attack', value: 10 },
        { type: 'defend', value: 8 },
        { type: 'attack', value: 12 },
        { type: 'debuff', value: 1, desc: 'Jamming signal' },
      ]
    },

    // ── Sector 2 Enemies ──
    em_storm: {
      id: 'em_storm', name: 'EM Storm', hp: 28,
      sprite: '⚡', sector: 2, elite: false,
      pattern: [
        { type: 'attack', value: 8 },
        { type: 'debuff', value: 1, desc: 'Draining power' },
        { type: 'attack', value: 10 },
      ]
    },
    dark_comet: {
      id: 'dark_comet', name: 'Dark Comet', hp: 20,
      sprite: '☄️', sector: 2, elite: false,
      pattern: [
        { type: 'attack', value: 9 },
        { type: 'attack', value: 9 },
        { type: 'buff', value: 0, desc: 'Accelerating…' },
        { type: 'attack', value: 16 },
      ]
    },
    mine_field: {
      id: 'mine_field', name: 'Mine Field', hp: 18,
      sprite: '💣', sector: 2, elite: false,
      pattern: [
        { type: 'attack', value: 5 },
        { type: 'attack', value: 5 },
        { type: 'attack', value: 12 },
      ]
    },

    // ── Sector 2 Elite ──
    pirate_cruiser: {
      id: 'pirate_cruiser', name: 'Pirate Cruiser', hp: 45,
      sprite: '🚀', sector: 2, elite: true,
      pattern: [
        { type: 'attack', value: 8 },
        { type: 'defend', value: 10 },
        { type: 'attack', value: 14 },
        { type: 'attack', value: 10 },
      ]
    },

    // ── Sector 3 Enemies ──
    gravity_well: {
      id: 'gravity_well', name: 'Gravity Well', hp: 30,
      sprite: '🌀', sector: 3, elite: false,
      pattern: [
        { type: 'debuff', value: 1, desc: 'Pulling in…' },
        { type: 'attack', value: 14 },
        { type: 'attack', value: 10 },
      ]
    },
    corrupted_ai: {
      id: 'corrupted_ai', name: 'Corrupted AI', hp: 35,
      sprite: '👾', sector: 3, elite: false,
      pattern: [
        { type: 'attack', value: 7 },
        { type: 'buff', value: 0, desc: 'Computing…' },
        { type: 'attack', value: 12 },
        { type: 'debuff', value: 1, desc: 'Hacking systems' },
      ]
    },

    // ── Sector 3 Elite ──
    void_sentinel: {
      id: 'void_sentinel', name: 'Void Sentinel', hp: 55,
      sprite: '🛸', sector: 3, elite: true,
      pattern: [
        { type: 'defend', value: 12 },
        { type: 'attack', value: 15 },
        { type: 'attack', value: 10 },
        { type: 'debuff', value: 2, desc: 'System overload' },
        { type: 'attack', value: 18 },
      ]
    },
  };

  // ── Boss Definitions ──
  const BOSSES = {
    debris_king: {
      id: 'debris_king', name: 'Debris King', hp: 55,
      sprite: '👑🪨', sector: 1, elite: false, boss: true,
      pattern: [
        { type: 'attack', value: 8 },
        { type: 'buff', value: 0, desc: 'Summoning debris…' },
        { type: 'attack', value: 14 },
        { type: 'defend', value: 6 },
        { type: 'attack', value: 10 },
      ]
    },
    storm_core: {
      id: 'storm_core', name: 'Storm Core', hp: 70,
      sprite: '🌩️', sector: 2, elite: false, boss: true,
      pattern: [
        { type: 'attack', value: 10 },
        { type: 'debuff', value: 1, desc: 'Electromagnetic surge' },
        { type: 'attack', value: 12 },
        { type: 'attack', value: 8 },
        { type: 'buff', value: 0, desc: 'Building charge…' },
        { type: 'attack', value: 22 },
      ]
    },
    void_leviathan: {
      id: 'void_leviathan', name: 'Void Leviathan', hp: 90,
      sprite: '🐉', sector: 3, elite: false, boss: true,
      pattern: [
        { type: 'attack', value: 12 },
        { type: 'defend', value: 10 },
        { type: 'debuff', value: 1, desc: 'Void corruption' },
        { type: 'attack', value: 16 },
        { type: 'attack', value: 10 },
        { type: 'buff', value: 0, desc: 'Consuming light…' },
        { type: 'attack', value: 24 },
      ]
    },
  };

  // ─── Event Definitions ──────────────────────────────────────────
  const EVENTS = [
    {
      id: 'abandoned_relay',
      title: 'Abandoned Relay',
      icon: '📡',
      desc: 'Your probe detects an abandoned signal relay station. Its data banks hum with residual power.',
      choices: [
        { text: 'Download signal data (gain a random card)', effect: { randomCard: true } },
        { text: 'Salvage components (gain 25 credits)', effect: { credits: 25 } },
        { text: 'Leave it alone', effect: {} },
      ]
    },
    {
      id: 'signal_echo',
      title: 'Signal Echo',
      icon: '📻',
      desc: 'A strange echo bounces back from the void — a perfect copy of one of your signals.',
      choices: [
        { text: 'Amplify the echo (duplicate a random card)', effect: { duplicateCard: true } },
        { text: 'Filter the noise (remove a random starter card)', effect: { removeStarter: true } },
        { text: 'Ignore it', effect: {} },
      ]
    },
    {
      id: 'power_surge',
      title: 'Power Surge',
      icon: '🔋',
      desc: 'A nearby pulsar emits a powerful energy wave. You can try to harness it.',
      choices: [
        { text: 'Absorb the energy (heal 15 HP)', effect: { heal: 15 } },
        { text: 'Overload systems (take 5 damage, gain a rare card)', effect: { damage: 5, rareCard: true } },
        { text: 'Deflect it', effect: {} },
      ]
    },
    {
      id: 'data_fragment',
      title: 'Data Fragment',
      icon: '💾',
      desc: 'Encrypted data fragments float in the wreckage of a destroyed vessel.',
      choices: [
        { text: 'Decrypt the data (gain 15 credits)', effect: { credits: 15 } },
        { text: 'Patch into nav systems (heal 10 HP)', effect: { heal: 10 } },
        { text: 'Too risky — move on', effect: {} },
      ]
    },
    {
      id: 'cosmic_shrine',
      title: 'Anomalous Object',
      icon: '🔮',
      desc: 'An unknown alien artifact pulses with mysterious energy. It reacts to your probe\'s signals.',
      choices: [
        { text: 'Touch it (remove a card, gain a better one)', effect: { removeAndUpgrade: true } },
        { text: 'Scan it (gain 20 credits)', effect: { credits: 20 } },
        { text: 'Back away carefully', effect: {} },
      ]
    },
  ];

  // ─── Sector Names ───────────────────────────────────────────────
  const SECTOR_NAMES = [
    'Debris Belt',
    'Storm Nebula',
    'The Void',
  ];

  // ─── Map Node Types ─────────────────────────────────────────────
  const NODE_TYPES = {
    COMBAT: 'combat',
    ELITE: 'elite',
    EVENT: 'event',
    SHOP: 'shop',
    BOSS: 'boss',
    START: 'start',
  };

  const NODE_ICONS = {
    combat: '⚔️',
    elite: '💀',
    event: '❓',
    shop: '🛒',
    boss: '👁',
    start: '📡',
  };

  // ─── Public API ─────────────────────────────────────────────────
  return {
    STARTER_CARDS,
    REWARD_POOL,
    ENEMIES,
    BOSSES,
    EVENTS,
    SECTOR_NAMES,
    NODE_TYPES,
    NODE_ICONS,
  };
})();
