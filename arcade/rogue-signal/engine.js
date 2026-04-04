/* ============================================
   Rogue Signal — Game Engine
   State machine, combat, map generation, deck
   ============================================ */

/* global RSData */

window.RSEngine = (() => {
  'use strict';

  const { STARTER_CARDS, REWARD_POOL, ENEMIES, BOSSES, EVENTS, SECTOR_NAMES, NODE_TYPES } = RSData;

  // ─── Game State ─────────────────────────────────────────────────
  let state = {};

  function newGame() {
    state = {
      // Meta
      screen: 'title', // title | map | combat | reward | shop | event | gameover | victory
      sector: 0,       // 0-based sector index
      nodesCleared: 0,
      totalCreditsEarned: 0,

      // Probe
      hp: 50,
      maxHp: 50,
      block: 0,
      credits: 0,

      // Deck
      deck: STARTER_CARDS.map(c => ({ ...c, uid: uid() })),
      drawPile: [],
      hand: [],
      discardPile: [],

      // Combat
      energy: 0,
      maxEnergy: 3,
      enemies: [],
      turnNumber: 0,
      cardsPlayedThisTurn: 0,
      combatReward: null,

      // Map
      maps: [],       // one per sector
      currentMap: null,
      currentNode: null,
      visitedNodes: new Set(),
    };

    // Generate maps for all 3 sectors
    for (let i = 0; i < 3; i++) {
      state.maps.push(generateMap(i));
    }
    state.currentMap = state.maps[0];

    return state;
  }

  // ─── UID Generator ──────────────────────────────────────────────
  let _uid = 0;
  function uid() { return 'c' + (++_uid) + '_' + Math.random().toString(36).slice(2, 6); }

  // ─── Map Generation ─────────────────────────────────────────────
  function generateMap(sectorIndex) {
    const layers = 6; // start + 4 middle + boss
    const nodesPerLayer = [1, 3, 3, 3, 2, 1]; // widths
    const map = { sector: sectorIndex, name: SECTOR_NAMES[sectorIndex], layers: [] };

    for (let layer = 0; layer < layers; layer++) {
      const count = nodesPerLayer[layer];
      const nodes = [];

      for (let i = 0; i < count; i++) {
        let type;
        if (layer === 0) {
          type = NODE_TYPES.START;
        } else if (layer === layers - 1) {
          type = NODE_TYPES.BOSS;
        } else {
          type = pickNodeType(layer, sectorIndex);
        }

        nodes.push({
          id: `s${sectorIndex}_l${layer}_n${i}`,
          layer,
          index: i,
          type,
          connections: [], // indices in next layer this node connects to
          visited: false,
          available: layer === 0, // start nodes are immediately available
        });
      }

      map.layers.push(nodes);
    }

    // Generate connections — each node connects to 1-2 nodes in next layer
    for (let layer = 0; layer < layers - 1; layer++) {
      const current = map.layers[layer];
      const next = map.layers[layer + 1];

      // Ensure every next-layer node has at least one connection from previous
      const connectedNext = new Set();

      for (let i = 0; i < current.length; i++) {
        const node = current[i];
        // Connect to closest node(s) in next layer
        const ratio = next.length > 1 ? i / Math.max(current.length - 1, 1) : 0.5;
        const targetIdx = Math.round(ratio * (next.length - 1));

        node.connections.push(targetIdx);
        connectedNext.add(targetIdx);

        // Possibly add a second connection for branching
        if (next.length > 1 && Math.random() < 0.5) {
          const alt = Math.random() < 0.5 ? targetIdx - 1 : targetIdx + 1;
          if (alt >= 0 && alt < next.length && alt !== targetIdx) {
            node.connections.push(alt);
            connectedNext.add(alt);
          }
        }
      }

      // Ensure connectivity: any next-layer node without an incoming edge gets one
      for (let j = 0; j < next.length; j++) {
        if (!connectedNext.has(j)) {
          // Connect from closest current-layer node
          const ratio = next.length > 1 ? j / (next.length - 1) : 0.5;
          const sourceIdx = Math.min(Math.round(ratio * (current.length - 1)), current.length - 1);
          current[sourceIdx].connections.push(j);
        }
      }

      // Deduplicate connections
      for (const node of current) {
        node.connections = [...new Set(node.connections)].sort((a, b) => a - b);
      }
    }

    return map;
  }

  function pickNodeType(layer, _sector) {
    const roll = Math.random();
    if (roll < 0.1) return NODE_TYPES.ELITE;
    if (roll < 0.25) return NODE_TYPES.EVENT;
    if (roll < 0.35) return NODE_TYPES.SHOP;
    return NODE_TYPES.COMBAT;
  }

  // ─── Map Navigation ────────────────────────────────────────────
  function selectNode(nodeId) {
    const map = state.currentMap;
    let selectedNode = null;

    for (const layer of map.layers) {
      for (const node of layer) {
        if (node.id === nodeId) {
          selectedNode = node;
          break;
        }
      }
      if (selectedNode) break;
    }

    if (!selectedNode || !selectedNode.available || selectedNode.visited) return null;

    state.currentNode = selectedNode;
    selectedNode.visited = true;
    state.visitedNodes.add(nodeId);

    // Mark all nodes on same layer as unavailable (already passed)
    const layer = selectedNode.layer;
    for (const node of map.layers[layer]) {
      node.available = false;
    }

    // Mark connected nodes in next layer as available
    if (layer + 1 < map.layers.length) {
      for (const connIdx of selectedNode.connections) {
        map.layers[layer + 1][connIdx].available = true;
      }
    }

    return selectedNode;
  }

  // ─── Combat Setup ───────────────────────────────────────────────
  function startCombat(nodeType) {
    state.block = 0;
    state.turnNumber = 0;
    state.cardsPlayedThisTurn = 0;

    // Pick enemies based on sector and type
    if (nodeType === NODE_TYPES.BOSS) {
      const bossKeys = Object.keys(BOSSES).filter(k => BOSSES[k].sector === state.sector + 1);
      const bossKey = bossKeys[0] || Object.keys(BOSSES)[0];
      state.enemies = [spawnEnemy(BOSSES[bossKey])];
    } else if (nodeType === NODE_TYPES.ELITE) {
      const elites = Object.values(ENEMIES).filter(e => e.sector === state.sector + 1 && e.elite);
      const template = elites.length > 0 ? elites[Math.floor(Math.random() * elites.length)]
        : Object.values(ENEMIES)[0];
      state.enemies = [spawnEnemy(template)];
    } else {
      // Regular combat: 1-2 enemies
      const regulars = Object.values(ENEMIES).filter(e => e.sector <= state.sector + 1 && !e.elite);
      const count = Math.random() < 0.4 ? 2 : 1;
      state.enemies = [];
      for (let i = 0; i < count; i++) {
        const template = regulars[Math.floor(Math.random() * regulars.length)];
        state.enemies.push(spawnEnemy(template));
      }
    }

    // Set up deck
    state.drawPile = shuffleArrayInPlace([...state.deck.map(c => ({ ...c, uid: uid() }))]);
    state.hand = [];
    state.discardPile = [];

    // Determine combat rewards
    if (nodeType === NODE_TYPES.BOSS) {
      state.combatReward = { credits: 30 + state.sector * 10, cards: 3 };
    } else if (nodeType === NODE_TYPES.ELITE) {
      state.combatReward = { credits: 20 + state.sector * 5, cards: 3 };
    } else {
      state.combatReward = { credits: 8 + state.sector * 4, cards: 3 };
    }

    state.screen = 'combat';
    startTurn();
  }

  function spawnEnemy(template) {
    const hpScale = 1 + state.sector * 0.05; // slight scaling per sector
    return {
      ...template,
      uid: uid(),
      hp: Math.round(template.hp * hpScale),
      maxHp: Math.round(template.hp * hpScale),
      block: 0,
      patternIndex: 0,
      intent: template.pattern[0],
      weak: 0,     // turns of weakness
      buffStacks: 0,
    };
  }

  // ─── Turn Management ───────────────────────────────────────────
  function startTurn() {
    state.energy = state.maxEnergy;
    state.block = 0;
    state.cardsPlayedThisTurn = 0;
    state.turnNumber++;

    // Update enemy intents
    for (const enemy of state.enemies) {
      enemy.intent = enemy.pattern[enemy.patternIndex % enemy.pattern.length];
    }

    // Draw cards
    drawCards(5);
  }

  function drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (state.drawPile.length === 0) {
        if (state.discardPile.length === 0) return; // no cards left
        state.drawPile = shuffleArrayInPlace([...state.discardPile]);
        state.discardPile = [];
      }
      state.hand.push(state.drawPile.pop());
    }
  }

  // ─── Card Playing ───────────────────────────────────────────────
  function playCard(cardUid, targetEnemyUid) {
    const cardIdx = state.hand.findIndex(c => c.uid === cardUid);
    if (cardIdx === -1) return { success: false, msg: 'Card not in hand' };

    const card = state.hand[cardIdx];
    if (card.cost > state.energy) return { success: false, msg: 'Not enough energy' };

    // Spend energy
    state.energy -= card.cost;
    state.cardsPlayedThisTurn++;

    // Resolve effects
    const result = resolveCardEffect(card, targetEnemyUid);

    // Move card to discard (unless it was discardHand which handles itself)
    state.hand.splice(cardIdx, 1);
    state.discardPile.push(card);

    // Check if all enemies dead
    state.enemies = state.enemies.filter(e => e.hp > 0);
    if (state.enemies.length === 0) {
      return { success: true, combatEnd: true, victory: true, ...result };
    }

    return { success: true, ...result };
  }

  function resolveCardEffect(card, targetEnemyUid) {
    const fx = card.effect;
    const result = { damage: 0, block: 0, heal: 0, draw: 0, energy: 0 };

    // --- Damage ---
    if (fx.damage) {
      const hits = fx.hits || 1;
      if (fx.aoe) {
        for (let h = 0; h < hits; h++) {
          for (const enemy of state.enemies) {
            result.damage += dealDamageToEnemy(enemy, fx.damage);
          }
        }
      } else if (fx.random) {
        for (let h = 0; h < hits; h++) {
          const alive = state.enemies.filter(e => e.hp > 0);
          if (alive.length > 0) {
            const target = alive[Math.floor(Math.random() * alive.length)];
            result.damage += dealDamageToEnemy(target, fx.damage);
          }
        }
      } else {
        // Single target
        let target = state.enemies.find(e => e.uid === targetEnemyUid);
        if (!target) target = state.enemies[0];
        if (target) {
          for (let h = 0; h < hits; h++) {
            result.damage += dealDamageToEnemy(target, fx.damage);
          }
        }
      }
    }

    // --- Block ---
    if (fx.block) {
      state.block += fx.block;
      result.block += fx.block;
    }
    if (fx.blockPerCard) {
      const bonus = state.hand.length * fx.blockPerCard;
      state.block += bonus;
      result.block += bonus;
    }

    // --- Heal ---
    if (fx.heal) {
      state.hp = Math.min(state.maxHp, state.hp + fx.heal);
      result.heal += fx.heal;
    }

    // --- Energy ---
    if (fx.energy) {
      state.energy += fx.energy;
      result.energy += fx.energy;
    }

    // --- Discard hand (Power Cycle) ---
    if (fx.discardHand) {
      state.discardPile.push(...state.hand.filter(c => c.uid !== undefined)); // Exclude the card itself (already moved)
      state.hand = [];
    }

    // --- Draw ---
    if (fx.draw) {
      drawCards(fx.draw);
      result.draw += fx.draw;
    }

    // --- Weak ---
    if (fx.weak) {
      let target = state.enemies.find(e => e.uid === targetEnemyUid);
      if (!target) target = state.enemies[0];
      if (target) {
        target.weak += fx.weak;
      }
    }

    return result;
  }

  function dealDamageToEnemy(enemy, baseDamage) {
    let actual = baseDamage;
    // Enemy block absorbs first
    if (enemy.block > 0) {
      const absorbed = Math.min(enemy.block, actual);
      enemy.block -= absorbed;
      actual -= absorbed;
    }
    enemy.hp = Math.max(0, enemy.hp - actual);
    return actual;
  }

  // ─── Enemy Turn ─────────────────────────────────────────────────
  function enemyTurn() {
    const results = [];

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;

      const intent = enemy.intent;
      const res = { enemy: enemy.name, type: intent.type, value: 0 };

      // Apply weak: reduce damage by 25%
      const weakMod = enemy.weak > 0 ? 0.75 : 1;

      switch (intent.type) {
        case 'attack': {
          let dmg = Math.round(intent.value * weakMod);
          // Buff scaling
          dmg += enemy.buffStacks * 2;
          // Apply to player's block first
          if (state.block > 0) {
            const absorbed = Math.min(state.block, dmg);
            state.block -= absorbed;
            dmg -= absorbed;
          }
          state.hp = Math.max(0, state.hp - dmg);
          res.value = intent.value;
          res.actualDamage = dmg;
          break;
        }
        case 'defend':
          enemy.block += intent.value;
          res.value = intent.value;
          break;
        case 'buff':
          enemy.buffStacks += 1;
          res.desc = intent.desc;
          break;
        case 'debuff':
          // Reduce player's max energy by 1 next turn (temporary)
          state.maxEnergy = Math.max(1, state.maxEnergy - intent.value);
          res.value = intent.value;
          res.desc = intent.desc || 'Debuff';
          break;
      }

      // Tick weak
      if (enemy.weak > 0) enemy.weak--;

      // Advance pattern
      enemy.patternIndex++;
      enemy.intent = enemy.pattern[enemy.patternIndex % enemy.pattern.length];

      results.push(res);
    }

    // Discard hand, check death
    state.discardPile.push(...state.hand);
    state.hand = [];

    // Restore max energy (debuffs are temporary 1-turn)
    state.maxEnergy = 3;

    if (state.hp <= 0) {
      return { results, playerDead: true };
    }

    // Start new turn
    startTurn();
    return { results, playerDead: false };
  }

  // ─── Combat Victory ────────────────────────────────────────────
  function endCombat() {
    state.nodesCleared++;
    const reward = state.combatReward;
    state.credits += reward.credits;
    state.totalCreditsEarned += reward.credits;

    // Small heal between combats
    state.hp = Math.min(state.maxHp, state.hp + 3);

    // Generate card rewards
    const cardChoices = generateRewardCards(reward.cards);

    // Check if this was the boss
    const wasBoss = state.currentNode && state.currentNode.type === NODE_TYPES.BOSS;

    return { credits: reward.credits, cardChoices, wasBoss };
  }

  function generateRewardCards(count) {
    const pool = [...REWARD_POOL];
    const picked = [];
    const weights = { common: 60, uncommon: 30, rare: 10 };

    for (let i = 0; i < count; i++) {
      const roll = Math.random() * 100;
      let rarity;
      if (roll < weights.rare) rarity = 'rare';
      else if (roll < weights.rare + weights.uncommon) rarity = 'uncommon';
      else rarity = 'common';

      const filtered = pool.filter(c => c.rarity === rarity);
      if (filtered.length === 0) continue;

      const card = filtered[Math.floor(Math.random() * filtered.length)];
      picked.push({ ...card, uid: uid() });
      // Remove from pool to avoid duplicates
      const idx = pool.findIndex(c => c.id === card.id);
      if (idx !== -1) pool.splice(idx, 1);
    }

    return picked;
  }

  function addCardToDeck(card) {
    state.deck.push({ ...card, uid: uid() });
  }

  // ─── Sector Progression ─────────────────────────────────────────
  function advanceSector() {
    state.sector++;
    if (state.sector >= 3) {
      state.screen = 'victory';
      return true; // game won
    }
    state.currentMap = state.maps[state.sector];
    state.currentNode = null;
    state.screen = 'map';
    return false; // continue
  }

  // ─── Event System ───────────────────────────────────────────────
  function getRandomEvent() {
    return EVENTS[Math.floor(Math.random() * EVENTS.length)];
  }

  function resolveEvent(choiceIndex, event) {
    const choice = event.choices[choiceIndex];
    if (!choice) return {};
    const fx = choice.effect;
    const result = {};

    if (fx.credits) {
      state.credits += fx.credits;
      state.totalCreditsEarned += fx.credits;
      result.credits = fx.credits;
    }
    if (fx.heal) {
      state.hp = Math.min(state.maxHp, state.hp + fx.heal);
      result.heal = fx.heal;
    }
    if (fx.damage) {
      state.hp = Math.max(0, state.hp - fx.damage);
      result.damage = fx.damage;
    }
    if (fx.randomCard) {
      const cards = generateRewardCards(1);
      if (cards.length > 0) {
        addCardToDeck(cards[0]);
        result.card = cards[0];
      }
    }
    if (fx.rareCard) {
      const rares = REWARD_POOL.filter(c => c.rarity === 'rare');
      if (rares.length > 0) {
        const card = { ...rares[Math.floor(Math.random() * rares.length)], uid: uid() };
        addCardToDeck(card);
        result.card = card;
      }
    }
    if (fx.duplicateCard) {
      if (state.deck.length > 0) {
        const original = state.deck[Math.floor(Math.random() * state.deck.length)];
        addCardToDeck(original);
        result.duplicated = original.name;
      }
    }
    if (fx.removeStarter) {
      const starters = state.deck.filter(c => c.rarity === 'starter');
      if (starters.length > 0) {
        const toRemove = starters[Math.floor(Math.random() * starters.length)];
        const idx = state.deck.findIndex(c => c.uid === toRemove.uid);
        if (idx !== -1) {
          state.deck.splice(idx, 1);
          result.removed = toRemove.name;
        }
      }
    }
    if (fx.removeAndUpgrade) {
      // Remove worst card, add a random uncommon+
      const starters = state.deck.filter(c => c.rarity === 'starter');
      if (starters.length > 0) {
        const toRemove = starters[Math.floor(Math.random() * starters.length)];
        const idx = state.deck.findIndex(c => c.uid === toRemove.uid);
        if (idx !== -1) state.deck.splice(idx, 1);
        result.removed = toRemove.name;
      }
      const upgrades = REWARD_POOL.filter(c => c.rarity === 'uncommon' || c.rarity === 'rare');
      if (upgrades.length > 0) {
        const card = { ...upgrades[Math.floor(Math.random() * upgrades.length)], uid: uid() };
        addCardToDeck(card);
        result.card = card;
      }
    }

    // Check death from damage
    if (state.hp <= 0) {
      result.playerDead = true;
    }

    return result;
  }

  // ─── Shop ───────────────────────────────────────────────────────
  function generateShop() {
    const cards = generateRewardCards(4);
    const prices = cards.map(c => {
      if (c.rarity === 'rare') return 40 + Math.floor(Math.random() * 15);
      if (c.rarity === 'uncommon') return 25 + Math.floor(Math.random() * 10);
      return 15 + Math.floor(Math.random() * 8);
    });

    return {
      cards: cards.map((c, i) => ({ ...c, price: prices[i] })),
      removePrice: 20 + state.sector * 10,
      healPrice: 15,
      healAmount: 15,
    };
  }

  function buyCard(card) {
    if (state.credits < card.price) return false;
    state.credits -= card.price;
    addCardToDeck(card);
    return true;
  }

  function removeCard(cardUid) {
    const idx = state.deck.findIndex(c => c.uid === cardUid);
    if (idx === -1) return false;
    state.deck.splice(idx, 1);
    return true;
  }

  function buyHeal(price, amount) {
    if (state.credits < price) return false;
    state.credits -= price;
    state.hp = Math.min(state.maxHp, state.hp + amount);
    return true;
  }

  // ─── Utilities ──────────────────────────────────────────────────
  function shuffleArrayInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getState() { return state; }

  // ─── Public API ─────────────────────────────────────────────────
  return {
    newGame,
    getState,
    selectNode,
    startCombat,
    playCard,
    enemyTurn,
    endCombat,
    addCardToDeck,
    advanceSector,
    getRandomEvent,
    resolveEvent,
    generateShop,
    buyCard,
    removeCard,
    buyHeal,
    drawCards,
    generateRewardCards,
  };
})();
