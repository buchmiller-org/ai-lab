// ============================================================
// TARTARUS — UI Manager
// Updates HUD values, manages overlays and screen transitions
// ============================================================

import { state, ZONES, GamePhase } from './gameState.js';

// Cache DOM references
const els = {};

/** Callback set by main.js to sync turret stats after an upgrade */
let onUpgradeCallback = null;

export function setOnUpgradeCallback(fn) {
  onUpgradeCallback = fn;
}

export function initUI() {
  els.depth      = document.getElementById('hud-depth');
  els.zone       = document.getElementById('hud-zone');
  els.scrap      = document.getElementById('hud-scrap');
  els.healthFill = document.getElementById('health-bar-fill');
  els.healthLabel = document.getElementById('health-bar-label');
  els.canisterBar = document.getElementById('canister-bar-container');
  els.canisterFill = document.getElementById('canister-bar-fill');
  els.commOverlay = document.getElementById('overlay-comm');

  // Weapon slots
  els.slots = [];
  for (let i = 0; i < 4; i++) {
    const slot = document.getElementById(`slot-${i}`);
    els.slots.push({
      root: slot,
      name: slot.querySelector('.slot-name'),
      mk:   slot.querySelector('.slot-mk'),
      cost: slot.querySelector('.slot-cost'),
    });

    // Click handler for Tier 1 upgrades
    slot.addEventListener('click', () => onSlotClick(i));
  }

  els.btnOverhaul = document.getElementById('btn-overhaul');
  els.btnUltimate = document.getElementById('btn-ultimate');
  els.ultimateLabel = document.getElementById('ultimate-label');
}

// ============================================================
// TIER 1 UPGRADE LOGIC
// ============================================================

/** Upgrade cost table: cost to upgrade FROM current Mk level */
const UPGRADE_COSTS = [0, 50, 65, 80, 100]; // index = current mk

function getUpgradeCost(currentMk) {
  return UPGRADE_COSTS[currentMk] || 100;
}

function onSlotClick(slotIndex) {
  const slotData = state.weaponSlots[slotIndex];
  if (!slotData.active) return;
  if (slotData.mk >= slotData.maxMk) return; // already maxed

  const cost = getUpgradeCost(slotData.mk);

  // Check if player can afford it
  if (state.scrap < cost) {
    // Can't afford — shake animation
    const el = els.slots[slotIndex].root;
    el.classList.remove('slot-denied');
    void el.offsetWidth;
    el.classList.add('slot-denied');
    return;
  }

  // Special case: Mk.I → Mk.II requires fork choice
  if (slotData.mk === 1) {
    showForkOverlay(slotIndex, cost);
    return;
  }

  // Standard upgrade: deduct scrap, increment mk
  applyUpgrade(slotIndex, cost);
}

function applyUpgrade(slotIndex, cost) {
  const slotData = state.weaponSlots[slotIndex];
  state.scrap -= cost;
  state.stats.scrapSpent += cost;
  slotData.mk++;

  // Flash animation
  const el = els.slots[slotIndex].root;
  el.classList.remove('slot-upgraded');
  void el.offsetWidth;
  el.classList.add('slot-upgraded');

  // Notify main.js to sync turret stats
  if (onUpgradeCallback) onUpgradeCallback(slotIndex);

  // Refresh HUD
  updateHUD();
}

// ============================================================
// MK.II FORK OVERLAY
// ============================================================

let forkOverlayEl = null;

function showForkOverlay(slotIndex, cost) {
  const slotData = state.weaponSlots[slotIndex];

  // Create overlay if it doesn't exist
  if (!forkOverlayEl) {
    forkOverlayEl = document.createElement('div');
    forkOverlayEl.id = 'fork-overlay';
    document.getElementById('game-container').appendChild(forkOverlayEl);
  }

  forkOverlayEl.innerHTML = `
    <div class="fork-title">WEAPON PATH — ${slotData.name}</div>
    <div class="fork-subtitle">Choose a specialization. This cannot be reversed.</div>
    <div class="fork-options">
      <button class="fork-btn" id="fork-overcharge">
        <span class="fork-icon">⚡</span>
        <span class="fork-label">OVERCHARGE</span>
        <span class="fork-desc">Increase damage per shot.<br>Effective vs. armored targets.</span>
      </button>
      <button class="fork-btn" id="fork-overdrive">
        <span class="fork-icon">⚙</span>
        <span class="fork-label">OVERDRIVE</span>
        <span class="fork-desc">Increase fire rate.<br>Effective vs. swarm volume.</span>
      </button>
    </div>
  `;

  forkOverlayEl.classList.remove('hidden');

  // Button handlers
  document.getElementById('fork-overcharge').onclick = () => {
    slotData.path = 'OVERCHARGE';
    closeForkOverlay();
    applyUpgrade(slotIndex, cost);
  };

  document.getElementById('fork-overdrive').onclick = () => {
    slotData.path = 'OVERDRIVE';
    closeForkOverlay();
    applyUpgrade(slotIndex, cost);
  };
}

function closeForkOverlay() {
  if (forkOverlayEl) {
    forkOverlayEl.classList.add('hidden');
  }
}

// ============================================================
// HUD REFRESH
// ============================================================

/** Refresh all HUD values from game state */
export function updateHUD() {
  // Depth
  const depthStr = Math.floor(state.depth).toLocaleString();
  els.depth.textContent = `DEPTH: ${depthStr}m`;

  // Zone label
  const zoneData = ZONES[state.currentZone];
  if (zoneData) {
    els.zone.textContent = `ZONE ${state.currentZone} — ${zoneData.name}`;
  }

  // Scrap
  els.scrap.textContent = `⚙ ${state.scrap}`;

  // Health bar
  const hpPct = Math.max(0, state.rigHP / state.rigMaxHP);
  els.healthFill.style.width = `${hpPct * 100}%`;

  // Health color transitions
  if (hpPct > 0.5) {
    els.healthFill.style.background = 'var(--health-high)';
  } else if (hpPct > 0.25) {
    els.healthFill.style.background = 'var(--health-mid)';
  } else {
    els.healthFill.style.background = 'var(--health-low)';
  }

  els.healthLabel.textContent = `HULL ${Math.ceil(hpPct * 100)}%`;

  // Weapon slots
  for (let i = 0; i < 4; i++) {
    const slotData = state.weaponSlots[i];
    const slotEl = els.slots[i];
    slotEl.name.textContent = slotData.name;

    if (slotData.active) {
      // Mk label with path indicator
      let mkText = slotData.mk > 0 ? `Mk.${toRoman(slotData.mk)}` : '';
      if (slotData.path) {
        mkText += ` ${slotData.path === 'OVERCHARGE' ? '⚡' : '⚙'}`;
      }
      slotEl.mk.textContent = mkText;

      // Cost label
      const costEl = slotEl.cost;
      costEl.classList.remove('insufficient', 'maxed');
      if (slotData.mk >= slotData.maxMk) {
        costEl.textContent = 'MAX';
        costEl.classList.add('maxed');
      } else {
        const cost = getUpgradeCost(slotData.mk);
        costEl.textContent = `⚙ ${cost}`;
        if (state.scrap < cost) {
          costEl.classList.add('insufficient');
        }
      }

      slotEl.root.classList.remove('locked');
    } else {
      slotEl.mk.textContent = '';
      slotEl.cost.textContent = '';
      slotEl.root.classList.add('locked');
    }
  }

  // Ultimate
  if (state.ultimateUnlocked) {
    els.btnUltimate.classList.remove('locked');
    els.ultimateLabel.textContent = state.ultimateName || 'ACTIVATE';
  } else {
    els.btnUltimate.classList.add('locked');
    els.ultimateLabel.textContent = '[ LOCKED ]';
  }
}

/** Show a megacorp comm line */
let commTimeout = null;
export function showComm(text, durationMs = 4000) {
  els.commOverlay.textContent = text;
  els.commOverlay.classList.remove('hidden');
  if (commTimeout) clearTimeout(commTimeout);
  commTimeout = setTimeout(() => {
    els.commOverlay.classList.add('hidden');
  }, durationMs);
}

/** Convert number to roman numeral (1-4) */
function toRoman(n) {
  const map = ['', 'I', 'II', 'III', 'IV'];
  return map[n] || String(n);
}
