/* ============================================
   Tower Surge — Canvas Renderer
   ============================================ */
window.TS = window.TS || {};

(function () {
  'use strict';

  var COLS = TS.Map.GRID_COLS, ROWS = TS.Map.GRID_ROWS, CS = TS.Map.CELL_SIZE;
  var TYPES = TS.Entities.TOWER_TYPES;
  var ctx, canvas;

  function init(el) {
    canvas = el;
    ctx = el.getContext('2d');
    canvas.width = COLS * CS;
    canvas.height = ROWS * CS;
  }

  /* ---- shape helpers ---- */
  function hexPath(cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i - Math.PI / 6;
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function diamondPath(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }

  function circlePath(cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }

  function trianglePath(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.866, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.866, cy + r * 0.5);
    ctx.closePath();
  }

  function octagonPath(cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = (Math.PI / 4) * i - Math.PI / 8;
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /** Draw the correct tower shape based on type. */
  function towerShapePath(type, cx, cy, r) {
    if (type === 'spark') diamondPath(cx, cy, r);
    else if (type === 'nova') circlePath(cx, cy, r);
    else hexPath(cx, cy, r); // pulse = hex
  }

  /** Draw the correct enemy shape based on type. */
  function drawEnemyShape(type, cx, cy, s) {
    if (type === 'swarm') {
      trianglePath(cx, cy, s);
    } else if (type === 'titan') {
      octagonPath(cx, cy, s);
    } else if (type === 'phantom') {
      diamondPath(cx, cy, s);
    } else {
      // glitch = square
      ctx.beginPath();
      ctx.rect(cx - s, cy - s, s * 2, s * 2);
    }
  }

  /* ---- drawing functions ---- */
  function clear() {
    ctx.fillStyle = '#080c18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(56,189,248,0.05)';
    ctx.lineWidth = 1;
    for (var x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CS, 0); ctx.lineTo(x * CS, ROWS * CS); ctx.stroke(); }
    for (var y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CS); ctx.lineTo(COLS * CS, y * CS); ctx.stroke(); }
  }

  function drawPath(pathCells, t) {
    for (var i = 0; i < pathCells.length; i++) {
      var c = pathCells[i], px = c.x * CS, py = c.y * CS;
      ctx.fillStyle = 'rgba(56,189,248,0.04)';
      ctx.fillRect(px + 1, py + 1, CS - 2, CS - 2);
      var g = 0.08 + Math.sin(t * 1.5 + c.x * 0.5 + c.y * 0.3) * 0.04;
      ctx.strokeStyle = 'rgba(6,214,160,' + g + ')';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1, py + 1, CS - 2, CS - 2);
    }
  }

  function drawBuildable(grid, placingType) {
    if (!placingType) return;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (grid[y][x] === TS.Map.TILE_EMPTY) {
          ctx.fillStyle = 'rgba(6,214,160,0.04)';
          ctx.fillRect(x * CS + 2, y * CS + 2, CS - 4, CS - 4);
        }
      }
    }
  }

  function drawEndpoints(pathCells, t) {
    if (!pathCells || pathCells.length === 0) return;
    var firstCell = pathCells[0];
    var lastCell = pathCells[pathCells.length - 1];
    var spx = firstCell.x * CS + CS / 2;
    var spy = firstCell.y * CS + CS / 2;
    var cpx = lastCell.x * CS + CS / 2;
    var cpy = lastCell.y * CS + CS / 2;

    // --- Spawn marker ---
    var spPulse = 0.5 + Math.sin(t * 3) * 0.3;
    // Outer ring
    ctx.strokeStyle = 'rgba(6,214,160,' + (spPulse * 0.5) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(spx, spy, 18 + Math.sin(t * 2) * 2, 0, Math.PI * 2); ctx.stroke();
    // Inner filled circle
    ctx.fillStyle = 'rgba(6,214,160,' + spPulse + ')';
    ctx.beginPath(); ctx.arc(spx, spy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#06d6a0'; ctx.lineWidth = 2; ctx.stroke();
    // Arrow pointing right (direction of travel)
    ctx.fillStyle = '#06d6a0'; ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(spx + 4, spy - 4);
    ctx.lineTo(spx + 10, spy);
    ctx.lineTo(spx + 4, spy + 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Label
    ctx.font = '9px "Orbitron",sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#06d6a0'; ctx.fillText('SPAWN', spx, spy + 28);

    // --- Core marker ---
    var cpPulse = 0.5 + Math.sin(t * 2) * 0.3;
    // Outer ring
    ctx.strokeStyle = 'rgba(239,68,68,' + (cpPulse * 0.5) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cpx, cpy, 20 + Math.sin(t * 2.5) * 3, 0, Math.PI * 2); ctx.stroke();
    // Inner shield shape
    ctx.fillStyle = 'rgba(239,68,68,' + cpPulse + ')';
    ctx.beginPath(); ctx.arc(cpx, cpy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.stroke();
    // Inner icon (double ring)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cpx, cpy, 6, 0, Math.PI * 2); ctx.stroke();
    // Label
    ctx.font = '10px "Orbitron",sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444'; ctx.fillText('CORE', cpx, cpy - 22);
    // HP underneath
    ctx.font = '8px "Orbitron",sans-serif';
    ctx.fillStyle = 'rgba(239,68,68,0.7)';
    ctx.fillText('DEFEND', cpx, cpy + 24);
  }

  function drawTowers(towers, selected, t) {
    for (var i = 0; i < towers.length; i++) {
      var tw = towers[i], def = TYPES[tw.type];
      var cx = tw.x, cy = tw.y, bs = 14 + tw.level * 2;

      ctx.save(); ctx.translate(cx, cy);

      // Glow ring
      var gs = bs + 4 + Math.sin(t * 3) * 2;
      ctx.strokeStyle = def.glowColor; ctx.lineWidth = 2;
      towerShapePath(tw.type, 0, 0, gs); ctx.stroke();

      // Body
      ctx.fillStyle = def.color; ctx.globalAlpha = 0.9;
      towerShapePath(tw.type, 0, 0, bs); ctx.fill(); ctx.globalAlpha = 1;

      // Inner
      ctx.fillStyle = '#0a0e1a';
      towerShapePath(tw.type, 0, 0, bs * 0.45); ctx.fill();

      // Barrel
      ctx.save(); ctx.rotate(tw.angle);
      ctx.fillStyle = def.color; ctx.fillRect(0, -2, bs + 6, 4);
      ctx.restore();

      // Level dots — inside the tower body (won't clip at edges)
      if (tw.level > 1) {
        ctx.fillStyle = '#0a0e1a';
        for (var l = 0; l < tw.level; l++) {
          var dx = -3 + l * 5;
          ctx.beginPath(); ctx.arc(dx, bs * 0.7, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = def.color;
        for (var m = 0; m < tw.level; m++) {
          var dx2 = -3 + m * 5;
          ctx.beginPath(); ctx.arc(dx2, bs * 0.7, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      // Selection ring
      if (tw === selected) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, tw.range, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawEnemies(enemies, t) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (!e.alive) continue;
      var cx = e.x, cy = e.y, s = e.size;
      var glitch = e.flashTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
      ctx.save(); ctx.translate(cx + glitch, cy);
      ctx.rotate(Math.sin(t * 8 + e.pathProgress * 10) * 0.1);
      ctx.shadowBlur = 8; ctx.shadowColor = e.color;
      ctx.fillStyle = e.flashTimer > 0 ? '#fff' : e.color;
      drawEnemyShape(e.type, 0, 0, s);
      ctx.fill();
      // Inner detail
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      drawEnemyShape(e.type, 0, 0, s * 0.55);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // HP bar
      if (e.hp < e.maxHp) {
        var bw = s * 2.5, bh = 3, bx = cx - bw / 2, by = cy - s - 7;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, bh);
        var ratio = e.hp / e.maxHp;
        ctx.fillStyle = ratio > 0.5 ? '#06d6a0' : ratio > 0.25 ? '#facc15' : '#ef4444';
        ctx.fillRect(bx, by, bw * ratio, bh);
      }
    }
  }

  function drawProjectiles(projs) {
    for (var i = 0; i < projs.length; i++) {
      var p = projs[i]; if (!p.alive) continue;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawParticles(parts) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; if (!p.alive) continue;
      var a = p.life / p.maxLife;
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlacementPreview(col, row, type, canPlace) {
    var px = col * CS, py = row * CS;
    ctx.fillStyle = canPlace ? 'rgba(6,214,160,0.12)' : 'rgba(239,68,68,0.12)';
    ctx.fillRect(px, py, CS, CS);
    ctx.strokeStyle = canPlace ? 'rgba(6,214,160,0.5)' : 'rgba(239,68,68,0.5)';
    ctx.lineWidth = 2; ctx.strokeRect(px, py, CS, CS);
    if (canPlace && type) {
      var def = TYPES[type], range = def.range * CS;
      var pos = TS.Map.gridToPixel(col, row);
      ctx.strokeStyle = def.glowColor; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(pos.x, pos.y, range, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** Main render call. */
  function render(state, t) {
    clear();
    drawGrid();
    drawPath(state.pathCells, t);
    drawBuildable(state.grid, state.placingType);
    drawEndpoints(state.pathCells, t);
    drawTowers(state.towers, state.selectedTower, t);
    drawEnemies(state.enemies, t);
    drawProjectiles(state.projectiles);
    drawParticles(state.particles);
    if (state.placingType && state.hoverCell) {
      var cp = TS.Map.canPlaceTower(state.grid, state.hoverCell.x, state.hoverCell.y);
      drawPlacementPreview(state.hoverCell.x, state.hoverCell.y, state.placingType, cp);
    }
  }

  TS.Renderer = { init: init, render: render };
})();
