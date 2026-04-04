/* ============================================
   Rogue Signal — Renderer
   DOM rendering for all game screens
   ============================================ */

/* global RSData, RSEngine */

window.RSRender = (() => {
  'use strict';

  const { NODE_ICONS } = RSData;

  // ─── Cached DOM Refs ────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const screens = {};
  const els = {};

  function cacheRefs() {
    // Screens
    ['title', 'map', 'combat', 'reward', 'shop', 'event', 'gameover', 'victory'].forEach(s => {
      screens[s] = $('screen-' + s);
    });

    // HUD
    els.hudHp = $('hud-hp');
    els.hudSector = $('hud-sector');
    els.hudCredits = $('hud-credits');
    els.hudDeck = $('hud-deck');
    els.hud = $('hud');

    // Combat
    els.enemyArea = $('enemy-area');
    els.handArea = $('hand-area');
    els.energyCurrent = $('energy-current');
    els.energyMax = $('energy-max');
    els.drawCount = $('draw-count');
    els.discardCount = $('discard-count');
    els.btnEndTurn = $('btn-end-turn');
    els.probeHpFill = $('probe-hp-fill');
    els.probeHpText = $('probe-hp-text');
    els.probeBlock = $('probe-block');
    els.blockAmount = $('block-amount');
    els.probeStatus = $('probe-status');

    // Map
    els.mapGraph = $('map-graph');
    els.mapTitle = $('map-title');

    // Reward
    els.rewardCards = $('reward-cards');

    // Shop
    els.shopCards = $('shop-cards');
    els.shopServices = $('shop-services');
    els.shopCredits = $('shop-credits');

    // Event
    els.eventIcon = $('event-icon');
    els.eventTitle = $('event-title');
    els.eventDesc = $('event-desc');
    els.eventChoices = $('event-choices');

    // Game over
    els.goSector = $('go-sector');
    els.goNodes = $('go-nodes');
    els.goCards = $('go-cards');

    // Victory
    els.vicHp = $('vic-hp');
    els.vicNodes = $('vic-nodes');
    els.vicCards = $('vic-cards');
    els.vicCredits = $('vic-credits');
  }

  // ─── Screen Management ─────────────────────────────────────────
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('screen--active'));
    if (screens[name]) {
      screens[name].classList.add('screen--active');
    }

    // Show/hide HUD based on screen
    const showHud = ['map', 'combat', 'reward', 'shop', 'event'].includes(name);
    els.hud.classList.toggle('hud--visible', showHud);
  }

  // ─── HUD ────────────────────────────────────────────────────────
  function updateHUD() {
    const s = RSEngine.getState();
    els.hudHp.textContent = `${s.hp}/${s.maxHp}`;
    els.hudSector.textContent = `${s.sector + 1}/3`;
    els.hudCredits.textContent = s.credits;
    els.hudDeck.textContent = s.deck.length;

    // HP color
    const hpRatio = s.hp / s.maxHp;
    if (hpRatio > 0.6) els.hudHp.style.color = '';
    else if (hpRatio > 0.3) els.hudHp.style.color = '#facc15';
    else els.hudHp.style.color = '#ef4444';
  }

  // ─── Map Rendering ─────────────────────────────────────────────
  function renderMap(onNodeClick) {
    const s = RSEngine.getState();
    const map = s.currentMap;
    els.mapTitle.textContent = `Sector ${s.sector + 1} — ${map.name}`;
    els.mapGraph.innerHTML = '';

    // Create SVG for connection lines
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('map-lines');
    svg.setAttribute('preserveAspectRatio', 'none');
    els.mapGraph.appendChild(svg);

    // Create node layers
    const nodePositions = {};
    const layerEls = [];

    map.layers.forEach((layer, lIdx) => {
      const layerDiv = document.createElement('div');
      layerDiv.className = 'map-layer';
      els.mapGraph.appendChild(layerDiv);
      layerEls.push(layerDiv);

      layer.forEach((node, nIdx) => {
        const btn = document.createElement('button');
        btn.className = 'map-node';
        btn.dataset.nodeId = node.id;
        btn.dataset.type = node.type;

        // State classes
        if (node.visited) btn.classList.add('map-node--visited');
        else if (node.available) btn.classList.add('map-node--available');
        else btn.classList.add('map-node--locked');

        // Icon
        const icon = document.createElement('span');
        icon.className = 'map-node__icon';
        icon.textContent = NODE_ICONS[node.type] || '?';
        btn.appendChild(icon);

        // Label
        const label = document.createElement('span');
        label.className = 'map-node__label';
        label.textContent = node.type === 'start' ? 'Start'
          : node.type === 'boss' ? 'Boss'
          : capitalise(node.type);
        btn.appendChild(label);

        if (node.available && !node.visited) {
          btn.addEventListener('click', () => onNodeClick(node.id));
        } else {
          btn.disabled = true;
        }

        layerDiv.appendChild(btn);

        // Store position for SVG lines — we'll calc after layout
        nodePositions[node.id] = { layerIdx: lIdx, nodeIdx: nIdx, el: btn };
      });
    });

    // Draw connection lines after a frame (so layout is computed)
    requestAnimationFrame(() => {
      const graphRect = els.mapGraph.getBoundingClientRect();
      svg.setAttribute('width', graphRect.width);
      svg.setAttribute('height', graphRect.height);
      svg.style.width = graphRect.width + 'px';
      svg.style.height = graphRect.height + 'px';

      map.layers.forEach((layer, lIdx) => {
        if (lIdx >= map.layers.length - 1) return;
        layer.forEach(node => {
          const fromPos = nodePositions[node.id];
          if (!fromPos) return;
          const fromRect = fromPos.el.getBoundingClientRect();
          const fromX = fromRect.left + fromRect.width / 2 - graphRect.left;
          const fromY = fromRect.top + fromRect.height / 2 - graphRect.top;

          node.connections.forEach(connIdx => {
            const nextNode = map.layers[lIdx + 1][connIdx];
            if (!nextNode) return;
            const toPos = nodePositions[nextNode.id];
            if (!toPos) return;
            const toRect = toPos.el.getBoundingClientRect();
            const toX = toRect.left + toRect.width / 2 - graphRect.left;
            const toY = toRect.top + toRect.height / 2 - graphRect.top;

            const line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', fromX);
            line.setAttribute('y1', fromY);
            line.setAttribute('x2', toX);
            line.setAttribute('y2', toY);

            // Style based on visited
            if (node.visited && nextNode.visited) {
              line.classList.add('map-line--visited');
            } else if (node.visited && nextNode.available) {
              line.classList.add('map-line--available');
            } else {
              line.classList.add('map-line--locked');
            }

            svg.appendChild(line);
          });
        });
      });
    });
  }

  // ─── Combat Rendering ──────────────────────────────────────────
  function renderEnemies(onEnemyClick) {
    const s = RSEngine.getState();
    els.enemyArea.innerHTML = '';

    s.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;

      const div = document.createElement('div');
      div.className = 'enemy';
      if (enemy.boss) div.classList.add('enemy--boss');
      div.dataset.uid = enemy.uid;

      // Intent indicator
      const intent = document.createElement('div');
      intent.className = 'enemy__intent';
      const intentInfo = formatIntent(enemy.intent, enemy);
      intent.innerHTML = intentInfo.html;
      intent.classList.add('enemy__intent--' + enemy.intent.type);
      div.appendChild(intent);

      // Sprite
      const sprite = document.createElement('div');
      sprite.className = 'enemy__sprite';
      sprite.textContent = enemy.sprite;
      div.appendChild(sprite);

      // Name + HP bar
      const info = document.createElement('div');
      info.className = 'enemy__info';

      const name = document.createElement('div');
      name.className = 'enemy__name';
      name.textContent = enemy.name;
      info.appendChild(name);

      const hpBar = document.createElement('div');
      hpBar.className = 'enemy__hp-bar';
      const hpFill = document.createElement('div');
      hpFill.className = 'enemy__hp-fill';
      hpFill.style.width = Math.max(0, (enemy.hp / enemy.maxHp) * 100) + '%';
      hpBar.appendChild(hpFill);
      info.appendChild(hpBar);

      const hpText = document.createElement('div');
      hpText.className = 'enemy__hp-text';
      hpText.textContent = `${enemy.hp}/${enemy.maxHp}`;
      if (enemy.block > 0) hpText.textContent += ` 🛡${enemy.block}`;
      if (enemy.weak > 0) hpText.textContent += ` 💫${enemy.weak}`;
      info.appendChild(hpText);

      div.appendChild(info);

      // Click handler for targeting
      div.addEventListener('click', () => {
        if (onEnemyClick) onEnemyClick(enemy.uid);
      });

      els.enemyArea.appendChild(div);
    });
  }

  function formatIntent(intent, enemy) {
    const weakMod = enemy.weak > 0 ? 0.75 : 1;
    switch (intent.type) {
      case 'attack': {
        const dmg = Math.round(intent.value * weakMod) + enemy.buffStacks * 2;
        return { html: `<span class="intent-icon">⚔️</span> <span class="intent-val">${dmg}</span>` };
      }
      case 'defend':
        return { html: `<span class="intent-icon">🛡</span> <span class="intent-val">${intent.value}</span>` };
      case 'buff':
        return { html: `<span class="intent-icon">⬆️</span> <span class="intent-desc">${intent.desc || 'Buff'}</span>` };
      case 'debuff':
        return { html: `<span class="intent-icon">⬇️</span> <span class="intent-desc">${intent.desc || 'Debuff'}</span>` };
      default:
        return { html: '❓' };
    }
  }

  function renderHand(onCardClick, selectedEnemyUid) {
    const s = RSEngine.getState();
    els.handArea.innerHTML = '';

    s.hand.forEach((card, idx) => {
      const cardEl = createCardElement(card, {
        playable: card.cost <= s.energy,
        inHand: true,
        index: idx,
        total: s.hand.length,
      });

      cardEl.addEventListener('click', () => {
        if (card.cost <= s.energy) {
          onCardClick(card.uid, selectedEnemyUid);
        }
      });

      els.handArea.appendChild(cardEl);
    });
  }

  function createCardElement(card, opts = {}) {
    const div = document.createElement('div');
    div.className = 'card';
    div.classList.add('card--' + card.type);
    div.classList.add('card--' + card.rarity);
    if (opts.playable) div.classList.add('card--playable');
    if (opts.inHand) div.classList.add('card--in-hand');

    // Cost badge
    const cost = document.createElement('div');
    cost.className = 'card__cost';
    cost.textContent = card.cost;
    div.appendChild(cost);

    // Card name
    const name = document.createElement('div');
    name.className = 'card__name';
    name.textContent = card.name;
    div.appendChild(name);

    // Type indicator
    const typeEl = document.createElement('div');
    typeEl.className = 'card__type';
    typeEl.textContent = capitalise(card.type);
    div.appendChild(typeEl);

    // Description
    const desc = document.createElement('div');
    desc.className = 'card__desc';
    desc.textContent = card.desc;
    div.appendChild(desc);

    // Rarity pip
    const rarity = document.createElement('div');
    rarity.className = 'card__rarity';
    rarity.classList.add('card__rarity--' + card.rarity);
    div.appendChild(rarity);

    return div;
  }

  function updateCombatInfo() {
    const s = RSEngine.getState();
    els.energyCurrent.textContent = s.energy;
    els.energyMax.textContent = s.maxEnergy;
    els.drawCount.textContent = s.drawPile.length;
    els.discardCount.textContent = s.discardPile.length;

    // Probe status
    const hpPct = Math.max(0, (s.hp / s.maxHp) * 100);
    els.probeHpFill.style.width = hpPct + '%';

    if (hpPct > 60) els.probeHpFill.className = 'probe-hp-fill';
    else if (hpPct > 30) els.probeHpFill.className = 'probe-hp-fill probe-hp-fill--mid';
    else els.probeHpFill.className = 'probe-hp-fill probe-hp-fill--low';

    els.probeHpText.textContent = `${s.hp}/${s.maxHp}`;

    if (s.block > 0) {
      els.probeBlock.style.display = '';
      els.blockAmount.textContent = s.block;
    } else {
      els.probeBlock.style.display = 'none';
    }
  }

  // ─── Reward Screen ─────────────────────────────────────────────
  function renderReward(cardChoices, onCardPick) {
    els.rewardCards.innerHTML = '';

    cardChoices.forEach(card => {
      const cardEl = createCardElement(card, { playable: true });
      cardEl.addEventListener('click', () => onCardPick(card));
      els.rewardCards.appendChild(cardEl);
    });
  }

  // ─── Shop Screen ───────────────────────────────────────────────
  function renderShop(shopData, callbacks) {
    const s = RSEngine.getState();
    els.shopCredits.textContent = s.credits;
    els.shopCards.innerHTML = '';
    els.shopServices.innerHTML = '';

    // Cards for sale
    shopData.cards.forEach(card => {
      if (card.sold) return;
      const wrap = document.createElement('div');
      wrap.className = 'shop-item';

      const cardEl = createCardElement(card, { playable: s.credits >= card.price });
      wrap.appendChild(cardEl);

      const price = document.createElement('div');
      price.className = 'shop-item__price';
      price.textContent = card.price + ' credits';
      if (s.credits < card.price) price.classList.add('shop-item__price--unaffordable');
      wrap.appendChild(price);

      wrap.addEventListener('click', () => {
        if (callbacks.onBuyCard(card)) {
          card.sold = true;
          renderShop(shopData, callbacks);
        }
      });

      els.shopCards.appendChild(wrap);
    });

    // Services
    // Remove card
    const removeItem = document.createElement('div');
    removeItem.className = 'shop-service';
    removeItem.innerHTML = `
      <span class="shop-service__icon">✂️</span>
      <span class="shop-service__text">Remove a card</span>
      <span class="shop-service__price">${shopData.removePrice} credits</span>
    `;
    if (s.credits >= shopData.removePrice) {
      removeItem.classList.add('shop-service--affordable');
      removeItem.addEventListener('click', () => callbacks.onRemoveCard(shopData.removePrice));
    }
    els.shopServices.appendChild(removeItem);

    // Heal
    const healItem = document.createElement('div');
    healItem.className = 'shop-service';
    healItem.innerHTML = `
      <span class="shop-service__icon">💚</span>
      <span class="shop-service__text">Repair probe (+${shopData.healAmount} HP)</span>
      <span class="shop-service__price">${shopData.healPrice} credits</span>
    `;
    if (s.credits >= shopData.healPrice && s.hp < s.maxHp) {
      healItem.classList.add('shop-service--affordable');
      healItem.addEventListener('click', () => {
        if (callbacks.onHeal(shopData.healPrice, shopData.healAmount)) {
          renderShop(shopData, callbacks);
        }
      });
    }
    els.shopServices.appendChild(healItem);
  }

  // ─── Event Screen ──────────────────────────────────────────────
  function renderEvent(event, onChoice) {
    els.eventIcon.textContent = event.icon;
    els.eventTitle.textContent = event.title;
    els.eventDesc.textContent = event.desc;
    els.eventChoices.innerHTML = '';

    event.choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn--event-choice';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => onChoice(idx));
      els.eventChoices.appendChild(btn);
    });
  }

  function renderEventResult(resultText) {
    els.eventChoices.innerHTML = '';
    const msg = document.createElement('p');
    msg.className = 'event-result';
    msg.textContent = resultText;
    els.eventChoices.appendChild(msg);

    const btn = document.createElement('button');
    btn.className = 'btn btn--secondary';
    btn.textContent = 'Continue';
    btn.addEventListener('click', () => {
      window.RSGame.returnToMap();
    });
    els.eventChoices.appendChild(btn);
  }

  // ─── Game Over / Victory ───────────────────────────────────────
  function renderGameOver() {
    const s = RSEngine.getState();
    els.goSector.textContent = s.sector + 1;
    els.goNodes.textContent = s.nodesCleared;
    els.goCards.textContent = s.deck.length;
  }

  function renderVictory() {
    const s = RSEngine.getState();
    els.vicHp.textContent = `${s.hp}/${s.maxHp}`;
    els.vicNodes.textContent = s.nodesCleared;
    els.vicCards.textContent = s.deck.length;
    els.vicCredits.textContent = s.totalCreditsEarned;
  }

  // ─── Combat Animations ─────────────────────────────────────────
  function flashScreen(color, duration) {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    flash.style.background = color;
    document.getElementById('game-container').appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('screen-flash--active'));
    setTimeout(() => flash.remove(), duration || 300);
  }

  function shakeElement(el, intensity, duration) {
    el.classList.add('shake');
    el.style.setProperty('--shake-intensity', intensity + 'px');
    setTimeout(() => el.classList.remove('shake'), duration || 300);
  }

  function floatingText(parent, text, color) {
    const span = document.createElement('span');
    span.className = 'floating-text';
    span.textContent = text;
    span.style.color = color || '#fff';
    parent.appendChild(span);
    setTimeout(() => span.remove(), 1000);
  }

  // ─── Remove Card Picker (for shop) ─────────────────────────────
  function showRemoveCardPicker(cards, onPick) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.textContent = 'Choose a card to remove';
    content.appendChild(title);

    const cardGrid = document.createElement('div');
    cardGrid.className = 'modal-cards';

    cards.forEach(card => {
      const cardEl = createCardElement(card, { playable: true });
      cardEl.addEventListener('click', () => {
        onPick(card);
        modal.remove();
      });
      cardGrid.appendChild(cardEl);
    });

    content.appendChild(cardGrid);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn--secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => modal.remove());
    content.appendChild(cancelBtn);

    modal.appendChild(content);
    document.getElementById('game-container').appendChild(modal);
  }

  // ─── Utility ────────────────────────────────────────────────────
  function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ─── Public API ─────────────────────────────────────────────────
  return {
    cacheRefs,
    showScreen,
    updateHUD,
    renderMap,
    renderEnemies,
    renderHand,
    updateCombatInfo,
    renderReward,
    renderShop,
    renderEvent,
    renderEventResult,
    renderGameOver,
    renderVictory,
    flashScreen,
    shakeElement,
    floatingText,
    showRemoveCardPicker,
    createCardElement,
  };
})();
