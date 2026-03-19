/**
 * Pixel Maze Game Logic
 */

// --- Configuration & State ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const uiLayer = document.getElementById('ui-layer');
const screenStart = document.getElementById('screen-start');
const screenComplete = document.getElementById('screen-complete');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const btnNext = document.getElementById('btn-next');
const startLevelText = document.getElementById('start-level-text');
const completeLevelText = document.getElementById('complete-level-text');

let isPlaying = false;
let frameId = null;

// Thematic Colors
const COLOR_BG = '#0a1628';
const COLOR_WALL = '#facc15';
const COLOR_PLAYER = '#06d6a0';
const COLOR_EXIT = '#f472b6';

let currentLevel = 1;
const levelKey = 'aiGames_pixelMaze_highestLevel';

let maze;
let player;
let exitPos;
let w, h;

function getHighestLevel() {
  const saved = localStorage.getItem(levelKey);
  return saved ? parseInt(saved, 10) : 1;
}

function saveHighestLevel(level) {
  const highest = getHighestLevel();
  if (level > highest) {
    localStorage.setItem(levelKey, level.toString());
  }
}

function getGridSize(level) {
  // Start at 8x8, add 2 every level. Max out at some point to prevent performance issues.
  return Math.min(8 + (level - 1) * 2, 40); 
}

// --- Maze Generator ---
class Maze {
  constructor(size) {
    this.size = size;
    this.grid = [];
    
    // Initialize grid
    for (let r = 0; r < size; r++) {
      let row = [];
      for (let c = 0; c < size; c++) {
        row.push({
          r, c,
          visited: false,
          walls: { top: true, right: true, bottom: true, left: true }
        });
      }
      this.grid.push(row);
    }
  }

  generate() {
    let current = this.grid[0][0];
    current.visited = true;
    let stack = [current];

    while (stack.length > 0) {
      let r = current.r;
      let c = current.c;
      let neighbors = [];
      
      // Top
      if (r > 0 && !this.grid[r-1][c].visited) neighbors.push({cell: this.grid[r-1][c], dir: 'top'});
      // Right
      if (c < this.size-1 && !this.grid[r][c+1].visited) neighbors.push({cell: this.grid[r][c+1], dir: 'right'});
      // Bottom
      if (r < this.size-1 && !this.grid[r+1][c].visited) neighbors.push({cell: this.grid[r+1][c], dir: 'bottom'});
      // Left
      if (c > 0 && !this.grid[r][c-1].visited) neighbors.push({cell: this.grid[r][c-1], dir: 'left'});

      if (neighbors.length > 0) {
        // Randomly pick a valid neighbor
        let next = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        // Remove the wall between current and chosen neighbor
        if (next.dir === 'top') { current.walls.top = false; next.cell.walls.bottom = false; }
        if (next.dir === 'right') { current.walls.right = false; next.cell.walls.left = false; }
        if (next.dir === 'bottom') { current.walls.bottom = false; next.cell.walls.top = false; }
        if (next.dir === 'left') { current.walls.left = false; next.cell.walls.right = false; }

        next.cell.visited = true;
        stack.push(current);
        current = next.cell;
      } else {
        // Backtrack
        current = stack.pop();
      }
    }
  }

  getCell(r, c) {
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return null;
    return this.grid[r][c];
  }
}

// --- Drawing ---
function draw() {
  if (!maze) return;

  // Clear Canvas (the CSS background shines through)
  ctx.clearRect(0, 0, w, h);

  const cellSize = w / maze.size;
  const padding = 2; // slight padding so walls don't cut off at edge

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw Exit
  ctx.fillStyle = COLOR_EXIT;
  ctx.shadowColor = COLOR_EXIT;
  ctx.shadowBlur = 15;
  // A glowing pulsing square
  const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85; // 0.7 to 1.0
  const ex = exitPos.c * cellSize;
  const ey = exitPos.r * cellSize;
  const emargin = cellSize * 0.2;
  const esize = cellSize - (emargin * 2);
  
  ctx.fillRect(
    ex + emargin + (esize * (1 - pulse) / 2), 
    ey + emargin + (esize * (1 - pulse) / 2), 
    esize * pulse, 
    esize * pulse
  );

  // Draw Player
  ctx.fillStyle = COLOR_PLAYER;
  ctx.shadowColor = COLOR_PLAYER;
  ctx.shadowBlur = 12;
  const px = player.c * cellSize;
  const py = player.r * cellSize;
  const pmargin = cellSize * 0.25;
  const psize = cellSize - (pmargin * 2);
  ctx.fillRect(px + pmargin, py + pmargin, psize, psize);

  // Reset shadow for walls
  ctx.shadowBlur = 5;
  ctx.shadowColor = COLOR_WALL;
  ctx.strokeStyle = COLOR_WALL;
  ctx.lineWidth = Math.max(2, cellSize * 0.1);

  // Draw Walls
  ctx.beginPath();
  for (let r = 0; r < maze.size; r++) {
    for (let c = 0; c < maze.size; c++) {
      let cell = maze.grid[r][c];
      let x = c * cellSize;
      let y = r * cellSize;

      if (cell.walls.top) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
      }
      if (cell.walls.right) {
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
      }
      if (cell.walls.bottom) {
        ctx.moveTo(x, y + cellSize);
        ctx.lineTo(x + cellSize, y + cellSize);
      }
      if (cell.walls.left) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cellSize);
      }
    }
  }
  ctx.stroke();

  // If playing, continue loop for the pulsing effect
  if (isPlaying) {
    frameId = requestAnimationFrame(draw);
  }
}

function handleInput(dir) {
  if (!isPlaying) return;

  const cell = maze.getCell(player.r, player.c);
  if (!cell) return;

  if (dir === 'up' && !cell.walls.top) player.r--;
  if (dir === 'right' && !cell.walls.right) player.c++;
  if (dir === 'down' && !cell.walls.bottom) player.r++;
  if (dir === 'left' && !cell.walls.left) player.c--;

  checkWin();
}

function checkWin() {
  if (player.r === exitPos.r && player.c === exitPos.c) {
    levelComplete();
  }
}

// --- Input Listeners ---

let moveInterval = null;
let moveTimeout = null;
let currentDirection = null;

const INITIAL_DELAY = 150; // ms before auto-repeat starts
const REPEAT_DELAY = 80;   // ms between continuous moves

function startMovement(dir) {
  if (currentDirection === dir) return;
  stopMovement();
  currentDirection = dir;
  
  handleInput(dir);
  
  moveTimeout = setTimeout(() => {
    moveInterval = setInterval(() => {
      handleInput(dir);
    }, REPEAT_DELAY);
  }, INITIAL_DELAY);
}

function stopMovement(dir) {
  if (dir && currentDirection !== dir) return;
  clearTimeout(moveTimeout);
  clearInterval(moveInterval);
  currentDirection = null;
}

window.addEventListener('keydown', (e) => {
  if (!isPlaying) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "w", "a", "s", "d"].includes(e.key)) {
    e.preventDefault(); 
    if (e.repeat) return; // Ignore OS auto-repeat

    if (e.key === 'ArrowUp' || e.key === 'w') startMovement('up');
    if (e.key === 'ArrowRight' || e.key === 'd') startMovement('right');
    if (e.key === 'ArrowDown' || e.key === 's') startMovement('down');
    if (e.key === 'ArrowLeft' || e.key === 'a') startMovement('left');
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') stopMovement('up');
  if (e.key === 'ArrowRight' || e.key === 'd') stopMovement('right');
  if (e.key === 'ArrowDown' || e.key === 's') stopMovement('down');
  if (e.key === 'ArrowLeft' || e.key === 'a') stopMovement('left');
});

// Swipe detection
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

canvas.addEventListener('touchstart', (e) => {
  if (!isPlaying) return;
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
  e.preventDefault(); // prevents mouse emulation
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
  if (isPlaying) e.preventDefault(); // prevent scrolling while playing
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
  if (!isPlaying) return;
  const touchEndX = e.changedTouches[0].screenX;
  const touchEndY = e.changedTouches[0].screenY;
  
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // horizontal
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) handleInput('right');
      else handleInput('left');
    }
  } else {
    // vertical
    if (Math.abs(dy) > SWIPE_THRESHOLD) {
      if (dy > 0) handleInput('down');
      else handleInput('up');
    }
  }
});

// --- Game Flow ---

function initGame() {
  w = canvas.width;
  h = canvas.height;
  
  const highest = getHighestLevel();
  startLevelText.textContent = `Resume from Level ${highest}`;
  currentLevel = highest;

  showScreen(screenStart);
}

function startLevel() {
  const size = getGridSize(currentLevel);
  maze = new Maze(size);
  maze.generate();
  
  player = { r: 0, c: 0 };
  exitPos = { r: size - 1, c: size - 1 };
  
  hideScreens();
  isPlaying = true;

  if (frameId) cancelAnimationFrame(frameId);
  draw();
}

function levelComplete() {
  stopMovement();
  isPlaying = false;
  if (frameId) cancelAnimationFrame(frameId);

  // Re-draw once without requestAnimationFrame so it stays static
  draw(); 

  currentLevel++;
  saveHighestLevel(currentLevel);

  completeLevelText.textContent = `You reached Level ${currentLevel}`;
  showScreen(screenComplete);
}

// --- UI Helpers ---

function showScreen(screenEl) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen--active'));
  screenEl.classList.add('screen--active');
}

function hideScreens() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen--active'));
}

btnStart.addEventListener('click', () => {
  currentLevel = getHighestLevel();
  startLevel();
});

btnReset.addEventListener('click', () => {
  localStorage.removeItem(levelKey);
  currentLevel = 1;
  startLevelText.textContent = `Resume from Level 1`;
  startLevel();
});

btnNext.addEventListener('click', () => {
  startLevel();
});

// --- Boot ---
initGame();
