/* ============================================
   Rogue Signal — Main Game Controller
   Initialization, event wiring, screen flow
   ============================================ */

/* global RSData, RSEngine, RSRender */

window.RSGame = (() => {
  'use strict';

  let currentEvent = null;
  let currentShopData = null;
  let rewardChoices = null;
  let selectedEnemyUid = null;
  let isEnemyTurnInProgress = false;

  // ─── Initialization ─────────────────────────────────────────────
  function init() {
    RSRender.cacheRefs();
    bindButtons();
    RSRender.showScreen('title');
  }

  function bindButtons() {
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-retry').addEventListener('click', startGame);
    document.getElementById('btn-play-again').addEventListener('click', startGame);
    document.getElementById('btn-end-turn').addEventListener('click', endTurn);
    document.getElementById('btn-skip-reward').addEventListener('click', skipReward);
    document.getElementById('btn-leave-shop').addEventListener('click', leaveShop);
  }

  // ─── Game Flow ──────────────────────────────────────────────────
  function startGame() {
    RSEngine.newGame();
    RSRender.updateHUD();
    goToMap();
  }

  function goToMap() {
    const s = RSEngine.getState();
    s.screen = 'map';
    RSRender.showScreen('map');
    RSRender.renderMap(handleNodeClick);
    RSRender.updateHUD();
  }

  function handleNodeClick(nodeId) {
    const node = RSEngine.selectNode(nodeId);
    if (!node) return;

    const type = node.type;

    switch (type) {
      case RSData.NODE_TYPES.START:
        // Just move to next available — re-render map
        goToMap();
        break;

      case RSData.NODE_TYPES.COMBAT:
      case RSData.NODE_TYPES.ELITE:
      case RSData.NODE_TYPES.BOSS:
        RSEngine.startCombat(type);
        enterCombat();
        break;

      case RSData.NODE_TYPES.EVENT:
        enterEvent();
        break;

      case RSData.NODE_TYPES.SHOP:
        enterShop();
        break;

      default:
        goToMap();
    }
  }

  // ─── Combat Flow ───────────────────────────────────────────────
  function enterCombat() {
    selectedEnemyUid = null;
    isEnemyTurnInProgress = false;
    RSRender.showScreen('combat');
    refreshCombat();

    // Auto-select first enemy
    const s = RSEngine.getState();
    if (s.enemies.length > 0) {
      selectedEnemyUid = s.enemies[0].uid;
    }
  }

  function refreshCombat() {
    RSRender.renderEnemies(onEnemyClick);
    RSRender.renderHand(onCardClick, selectedEnemyUid);
    RSRender.updateCombatInfo();
    RSRender.updateHUD();
    highlightSelectedEnemy();
  }

  function onEnemyClick(enemyUid) {
    selectedEnemyUid = enemyUid;
    highlightSelectedEnemy();
  }

  function highlightSelectedEnemy() {
    document.querySelectorAll('.enemy').forEach(el => {
      el.classList.toggle('enemy--selected', el.dataset.uid === selectedEnemyUid);
    });
  }

  function onCardClick(cardUid, _enemyUid) {
    if (isEnemyTurnInProgress) return;

    const s = RSEngine.getState();
    const card = s.hand.find(c => c.uid === cardUid);
    if (!card) return;

    // For attacks, need a target
    const targetUid = (card.type === 'attack' && !card.effect.aoe && !card.effect.random)
      ? (selectedEnemyUid || (s.enemies[0] && s.enemies[0].uid))
      : selectedEnemyUid;

    const result = RSEngine.playCard(cardUid, targetUid);

    if (!result.success) return;

    // Visual feedback
    if (result.damage > 0) {
      const enemyEl = document.querySelector(`.enemy[data-uid="${targetUid}"]`);
      if (enemyEl) {
        RSRender.shakeElement(enemyEl, 4, 200);
        RSRender.floatingText(enemyEl, `-${result.damage}`, '#ef4444');
      }
    }
    if (result.block > 0) {
      const probeEl = document.getElementById('probe-status');
      RSRender.floatingText(probeEl, `+${result.block} 🛡`, '#38bdf8');
    }
    if (result.heal > 0) {
      const probeEl = document.getElementById('probe-status');
      RSRender.floatingText(probeEl, `+${result.heal} ❤️`, '#06d6a0');
    }

    // Combat ended?
    if (result.combatEnd && result.victory) {
      setTimeout(() => combatVictory(), 400);
      return;
    }

    // Re-select enemy if current one died
    const alive = RSEngine.getState().enemies.filter(e => e.hp > 0);
    if (alive.length > 0 && !alive.find(e => e.uid === selectedEnemyUid)) {
      selectedEnemyUid = alive[0].uid;
    }

    refreshCombat();
  }

  function endTurn() {
    if (isEnemyTurnInProgress) return;
    isEnemyTurnInProgress = true;

    // Disable end turn button visually
    document.getElementById('btn-end-turn').disabled = true;

    // Animate enemy turn with delays
    const result = RSEngine.enemyTurn();

    // Show enemy attack effects
    let delay = 0;
    result.results.forEach((res, idx) => {
      setTimeout(() => {
        if (res.type === 'attack' && res.actualDamage > 0) {
          RSRender.flashScreen('rgba(239, 68, 68, 0.15)', 200);
          const probeEl = document.getElementById('probe-status');
          RSRender.shakeElement(probeEl, 5, 250);
          RSRender.floatingText(probeEl, `-${res.actualDamage}`, '#ef4444');
        }
        if (res.type === 'defend') {
          const enemyEls = document.querySelectorAll('.enemy');
          if (enemyEls[idx]) {
            RSRender.floatingText(enemyEls[idx], `+${res.value} 🛡`, '#38bdf8');
          }
        }
        if (res.type === 'buff') {
          const enemyEls = document.querySelectorAll('.enemy');
          if (enemyEls[idx]) {
            RSRender.floatingText(enemyEls[idx], '⬆️', '#facc15');
          }
        }
        if (res.type === 'debuff') {
          RSRender.flashScreen('rgba(168, 85, 247, 0.15)', 200);
        }
      }, delay);
      delay += 500;
    });

    // After all enemy animations complete
    setTimeout(() => {
      isEnemyTurnInProgress = false;
      document.getElementById('btn-end-turn').disabled = false;

      if (result.playerDead) {
        gameOver();
        return;
      }

      refreshCombat();
    }, delay + 200);
  }

  function combatVictory() {
    const reward = RSEngine.endCombat();
    rewardChoices = reward.cardChoices;

    if (reward.wasBoss) {
      // Check if we advance sector or win
      const won = RSEngine.advanceSector();
      if (won) {
        RSRender.renderVictory();
        RSRender.showScreen('victory');
        return;
      }
    }

    // Show reward screen
    RSRender.showScreen('reward');
    RSRender.renderReward(rewardChoices, onRewardPick);
    RSRender.updateHUD();
  }

  function onRewardPick(card) {
    RSEngine.addCardToDeck(card);
    RSRender.updateHUD();
    goToMap();
  }

  function skipReward() {
    goToMap();
  }

  // ─── Event Flow ────────────────────────────────────────────────
  function enterEvent() {
    currentEvent = RSEngine.getRandomEvent();
    RSRender.showScreen('event');
    RSRender.renderEvent(currentEvent, handleEventChoice);
    RSRender.updateHUD();
  }

  function handleEventChoice(choiceIdx) {
    const result = RSEngine.resolveEvent(choiceIdx, currentEvent);

    // Build result message
    const parts = [];
    if (result.credits) parts.push(`Gained ${result.credits} credits.`);
    if (result.heal) parts.push(`Healed ${result.heal} HP.`);
    if (result.damage) parts.push(`Took ${result.damage} damage.`);
    if (result.card) parts.push(`Got card: ${result.card.name}.`);
    if (result.duplicated) parts.push(`Duplicated: ${result.duplicated}.`);
    if (result.removed) parts.push(`Removed: ${result.removed}.`);
    if (parts.length === 0) parts.push('Nothing happened.');

    RSRender.updateHUD();

    if (result.playerDead) {
      setTimeout(() => gameOver(), 800);
      RSRender.renderEventResult(parts.join(' ') + ' The probe is destroyed!');
      return;
    }

    RSRender.renderEventResult(parts.join(' '));
  }

  function returnToMap() {
    goToMap();
  }

  // ─── Shop Flow ─────────────────────────────────────────────────
  function enterShop() {
    currentShopData = RSEngine.generateShop();
    RSRender.showScreen('shop');
    RSRender.renderShop(currentShopData, {
      onBuyCard: handleBuyCard,
      onRemoveCard: handleRemoveCard,
      onHeal: handleShopHeal,
    });
    RSRender.updateHUD();
  }

  function handleBuyCard(card) {
    const success = RSEngine.buyCard(card);
    if (success) RSRender.updateHUD();
    return success;
  }

  function handleRemoveCard(price) {
    const s = RSEngine.getState();
    if (s.credits < price) return;

    RSRender.showRemoveCardPicker(s.deck, (card) => {
      if (RSEngine.removeCard(card.uid)) {
        s.credits -= price;
        RSRender.updateHUD();
        RSRender.renderShop(currentShopData, {
          onBuyCard: handleBuyCard,
          onRemoveCard: handleRemoveCard,
          onHeal: handleShopHeal,
        });
      }
    });
  }

  function handleShopHeal(price, amount) {
    const success = RSEngine.buyHeal(price, amount);
    if (success) RSRender.updateHUD();
    return success;
  }

  function leaveShop() {
    goToMap();
  }

  // ─── Game Over / Victory ───────────────────────────────────────
  function gameOver() {
    RSRender.renderGameOver();
    RSRender.showScreen('gameover');
  }

  // ─── Public API ─────────────────────────────────────────────────
  return {
    init,
    returnToMap,
  };
})();

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => RSGame.init());
