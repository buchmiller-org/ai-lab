// ============================================================
// TARTARUS — Rig Names
// Generates random unit designations from word lists
// ============================================================

const PREFIXES = [
  'IRON', 'EMBER', 'SABLE', 'FORGE', 'VOID', 'CINDER',
  'DEEP', 'STONE', 'DARK', 'ASH', 'GREY', 'COLD',
];

const SUFFIXES = [
  'JAW', 'CLAW', 'MOLE', 'BORE', 'FANG', 'SPIKE',
  'GHOST', 'MARE', 'TUSK', 'VEIN', 'PICK', 'CRAWL',
];

/** Generate a random rig designation (e.g. "VOID-FANG") */
export function generateRigName() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return `${prefix}-${suffix}`;
}
