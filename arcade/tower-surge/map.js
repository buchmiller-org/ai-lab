/* ============================================
   Tower Surge — Map & Grid System
   ============================================ */
window.TS = window.TS || {};

(function () {
  'use strict';

  const GRID_COLS = 16;
  const GRID_ROWS = 10;
  const CELL_SIZE = 48;

  // Tile types
  const TILE_EMPTY = 0;
  const TILE_PATH = 1;
  const TILE_TOWER = 2;

  // Waypoints define the enemy path (grid coords).
  // Enemies enter from the left and exit right.
  const PATH_WAYPOINTS = [
    { x: -1, y: 2 },
    { x: 3, y: 2 },
    { x: 3, y: 8 },
    { x: 7, y: 8 },
    { x: 7, y: 1 },
    { x: 12, y: 1 },
    { x: 12, y: 8 },
    { x: 16, y: 8 }
  ];

  /** Fill in every grid cell between adjacent waypoints. */
  function generatePathCells(waypoints) {
    const cells = [];
    const seen = new Set();

    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      let cx = a.x, cy = a.y;

      while (cx !== b.x || cy !== b.y) {
        if (cx >= 0 && cx < GRID_COLS && cy >= 0 && cy < GRID_ROWS) {
          const key = cx + ',' + cy;
          if (!seen.has(key)) { seen.add(key); cells.push({ x: cx, y: cy }); }
        }
        cx += dx;
        cy += dy;
      }
    }
    // last waypoint
    const last = waypoints[waypoints.length - 1];
    if (last.x >= 0 && last.x < GRID_COLS && last.y >= 0 && last.y < GRID_ROWS) {
      const key = last.x + ',' + last.y;
      if (!seen.has(key)) cells.push({ x: last.x, y: last.y });
    }
    return cells;
  }

  /** Create a 2-D grid array with path cells marked. */
  function createGrid() {
    const grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_COLS; x++) grid[y][x] = TILE_EMPTY;
    }
    generatePathCells(PATH_WAYPOINTS).forEach(function (c) {
      grid[c.y][c.x] = TILE_PATH;
    });
    return grid;
  }

  function canPlaceTower(grid, col, row) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    return grid[row][col] === TILE_EMPTY;
  }

  function pixelToGrid(px, py) {
    return { x: Math.floor(px / CELL_SIZE), y: Math.floor(py / CELL_SIZE) };
  }

  function gridToPixel(gx, gy) {
    return { x: gx * CELL_SIZE + CELL_SIZE / 2, y: gy * CELL_SIZE + CELL_SIZE / 2 };
  }

  /** Build pixel-space segments between waypoints for enemy interpolation. */
  function buildPathSegments(waypoints) {
    var segs = [];
    for (var i = 0; i < waypoints.length - 1; i++) {
      var a = waypoints[i], b = waypoints[i + 1];
      var ax = (a.x + 0.5) * CELL_SIZE, ay = (a.y + 0.5) * CELL_SIZE;
      var bx = (b.x + 0.5) * CELL_SIZE, by = (b.y + 0.5) * CELL_SIZE;
      var dx = bx - ax, dy = by - ay;
      segs.push({ ax: ax, ay: ay, bx: bx, by: by, length: Math.sqrt(dx * dx + dy * dy) });
    }
    return segs;
  }

  TS.Map = {
    GRID_COLS: GRID_COLS,
    GRID_ROWS: GRID_ROWS,
    CELL_SIZE: CELL_SIZE,
    TILE_EMPTY: TILE_EMPTY,
    TILE_PATH: TILE_PATH,
    TILE_TOWER: TILE_TOWER,
    PATH_WAYPOINTS: PATH_WAYPOINTS,
    generatePathCells: generatePathCells,
    createGrid: createGrid,
    canPlaceTower: canPlaceTower,
    pixelToGrid: pixelToGrid,
    gridToPixel: gridToPixel,
    buildPathSegments: buildPathSegments
  };
})();
