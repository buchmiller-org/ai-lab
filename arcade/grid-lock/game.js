/**
 * Grid Lock - Game Logic
 */

// --- State ---
let currentLevelIndex = 0;
let blocks = [];
let gameGrid = []; // 6x6 array
let movesCount = 0;
let gridSize = 6;
let isDragging = false;
let draggedBlock = null;
let dragStartX = 0;
let dragStartY = 0;
let minFree = 0;
let maxFree = 0;
let savedProgress = { unlocked: 0, scores: {} };

// --- DOM Elements ---
const boardEl = document.getElementById('game-board');
const hudLevel = document.getElementById('hud-level');
const hudMoves = document.getElementById('hud-moves');
const hudBest = document.getElementById('hud-best');

const overlayManager = document.getElementById('overlay-manager');
const panelStart = document.getElementById('panel-start');
const panelWin = document.getElementById('panel-win');
const panelLevels = document.getElementById('panel-levels');

const btnStart = document.getElementById('btn-start');
const btnNext = document.getElementById('btn-next');
const btnReset = document.getElementById('btn-reset');
const btnReplay = document.getElementById('btn-replay');
const btnLevels = document.getElementById('btn-levels');
const btnWinLevels = document.getElementById('btn-win-levels');
const btnCloseLevels = document.getElementById('btn-close-levels');
const btnControlsLevels = document.getElementById('btn-controls-levels');

const winTitle = document.getElementById('win-title');
const levelStats = document.getElementById('level-stats');
const levelsGrid = document.getElementById('levels-grid');

let isOverlayOpen = false;
let lastMenuSource = null;

// --- Initialization ---

function loadProgress() {
  try {
    const data = localStorage.getItem('arcade.grid-lock.progress') || localStorage.getItem('gridLock_progress');
    if (data) {
      savedProgress = JSON.parse(data);
    }
  } catch {}
}

function saveProgress() {
  try {
    localStorage.setItem('arcade.grid-lock.progress', JSON.stringify(savedProgress));
  } catch {}
}

function initGame() {
  loadProgress();
  if (savedProgress.unlocked > 0) {
    currentLevelIndex = savedProgress.unlocked;
    if (currentLevelIndex >= LEVELS.length) {
      currentLevelIndex = LEVELS.length - 1;
    }
    btnStart.textContent = `Resume Level ${currentLevelIndex + 1}`;
  }
  loadLevel(currentLevelIndex);
}

function loadLevel(index) {
  if (index >= LEVELS.length) {
    showOverlay(overlayGameComplete);
    return;
  }
  
  const levelData = LEVELS[index];
  // Deep copy blocks so we don't mutate the original level data
  blocks = JSON.parse(JSON.stringify(levelData.blocks));
  movesCount = 0;
  
  updateHUD();
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = '';
  
  // Create grid cells for visual background
  const gridBg = document.createElement('div');
  gridBg.className = 'game-board-grid-bg';
  for (let i = 0; i < 36; i++) {
    const cell = document.createElement('div');
    cell.className = 'game-board-cell';
    gridBg.appendChild(cell);
  }
  boardEl.appendChild(gridBg);
  
  // Create blocks
  blocks.forEach(block => {
    const el = document.createElement('div');
    el.className = `block block--${block.axis}`;
    if (block.isTarget) {
      el.classList.add('block--target');
    }
    el.id = `block-${block.id}`;
    
    // Store reference to DOM element in block object
    block.el = el;
    
    // Set initial position & size based on 6x6 grid
    updateBlockDOM(block);
    
    // Add event listeners for dragging
    el.addEventListener('pointerdown', (e) => startDrag(e, block));
    
    boardEl.appendChild(el);
  });
  
  // Rebuild logical grid
  rebuildGrid();
}

function updateBlockDOM(block) {
  const cellSizePct = 100 / gridSize;
  block.el.style.left = `${block.x * cellSizePct}%`;
  block.el.style.top = `${block.y * cellSizePct}%`;
  
  if (block.axis === 'h') {
    block.el.style.width = `${block.len * cellSizePct}%`;
    block.el.style.height = `${cellSizePct}%`;
  } else {
    block.el.style.width = `${cellSizePct}%`;
    block.el.style.height = `${block.len * cellSizePct}%`;
  }
}

function rebuildGrid(excludeBlock = null) {
  gameGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
  
  blocks.forEach(block => {
    if (excludeBlock && block.id === excludeBlock.id) return;
    
    for (let i = 0; i < block.len; i++) {
      if (block.axis === 'h') {
        gameGrid[block.y][block.x + i] = block.id;
      } else {
        gameGrid[block.y + i][block.x] = block.id;
      }
    }
  });
}

function updateHUD() {
  hudLevel.textContent = `Level ${currentLevelIndex + 1}`;
  hudMoves.textContent = `Moves: ${movesCount}`;
  const best = savedProgress.scores[currentLevelIndex];
  if (best !== undefined) {
    hudBest.textContent = `Best: ${best}`;
    hudBest.style.opacity = '0.7';
  } else {
    hudBest.textContent = `Best: --`;
    hudBest.style.opacity = '0.3';
  }
}

// --- Drag Mechanics ---

function startDrag(e, block) {
  if (isDragging) return;
  e.preventDefault();
  
  isDragging = true;
  draggedBlock = block;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  
  block.el.classList.add('dragging');
  
  // Temporarily remove this block from the grid to calculate bounds
  rebuildGrid(block);
  
  // Calculate bounds
  if (block.axis === 'h') {
    minFree = 0;
    maxFree = gridSize - block.len;
    
    // Look left
    for (let x = block.x - 1; x >= 0; x--) {
      if (gameGrid[block.y][x] !== null) {
        minFree = x + 1;
        break;
      }
    }
    // Look right
    for (let x = block.x + block.len; x < gridSize; x++) {
      if (gameGrid[block.y][x] !== null) {
        maxFree = x - block.len;
        break;
      }
    }
    // If target block is clear to the right edge, let it exit completely
    if (block.isTarget && maxFree === gridSize - block.len) {
      maxFree = gridSize; 
    }
  } else {
    minFree = 0;
    maxFree = gridSize - block.len;
    
    // Look up
    for (let y = block.y - 1; y >= 0; y--) {
      if (gameGrid[y][block.x] !== null) {
        minFree = y + 1;
        break;
      }
    }
    // Look down
    for (let y = block.y + block.len; y < gridSize; y++) {
      if (gameGrid[y][block.x] !== null) {
        maxFree = y - block.len;
        break;
      }
    }
  }
  
  // Add window listeners for move and up
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
}

function onDragMove(e) {
  if (!isDragging || !draggedBlock) return;
  e.preventDefault();
  
  const boardRect = boardEl.getBoundingClientRect();
  const cellPx = boardRect.width / gridSize;
  
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;
  
  if (draggedBlock.axis === 'h') {
    const minDx = (minFree - draggedBlock.x) * cellPx;
    const maxDx = (maxFree - draggedBlock.x) * cellPx;
    let dx = Math.max(minDx, Math.min(maxDx, deltaX));
    draggedBlock.el.style.transform = `translateX(${dx}px)`;
  } else {
    const minDy = (minFree - draggedBlock.y) * cellPx;
    const maxDy = (maxFree - draggedBlock.y) * cellPx;
    let dy = Math.max(minDy, Math.min(maxDy, deltaY));
    draggedBlock.el.style.transform = `translateY(${dy}px)`;
  }
}

function onDragEnd(e) {
  if (!isDragging || !draggedBlock) return;
  
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  
  const boardRect = boardEl.getBoundingClientRect();
  const cellPx = boardRect.width / gridSize;
  
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;
  
  let newX = draggedBlock.x;
  let newY = draggedBlock.y;
  let moved = false;
  
  if (draggedBlock.axis === 'h') {
    const minDx = (minFree - draggedBlock.x) * cellPx;
    const maxDx = (maxFree - draggedBlock.x) * cellPx;
    let dx = Math.max(minDx, Math.min(maxDx, deltaX));
    let cellOffset = Math.round(dx / cellPx);
    newX = draggedBlock.x + cellOffset;
    if (newX !== draggedBlock.x) moved = true;
  } else {
    const minDy = (minFree - draggedBlock.y) * cellPx;
    const maxDy = (maxFree - draggedBlock.y) * cellPx;
    let dy = Math.max(minDy, Math.min(maxDy, deltaY));
    let cellOffset = Math.round(dy / cellPx);
    newY = draggedBlock.y + cellOffset;
    if (newY !== draggedBlock.y) moved = true;
  }
  
  // Snap to grid
  draggedBlock.x = newX;
  draggedBlock.y = newY;
  
  // Normal reset logic
  draggedBlock.el.classList.remove('dragging');
  draggedBlock.el.style.transition = 'none'; // Prevent jarring jump
  draggedBlock.el.style.transform = '';
  updateBlockDOM(draggedBlock);
  
  // Force layout reflow
  void draggedBlock.el.offsetWidth;
  draggedBlock.el.style.transition = '';
  
  if (moved) {
    movesCount++;
    updateHUD();
  }
  
  rebuildGrid();
  isDragging = false;
  
  // Check if target is sliding out (touching exit at gridSize - block.len) 
  if (draggedBlock.isTarget && draggedBlock.x >= gridSize - draggedBlock.len) {
      // Auto-slide completely out smoothly over 0.4s via left property
      draggedBlock.el.style.transition = 'left 0.4s ease-in';
      draggedBlock.x = gridSize + 1;
      updateBlockDOM(draggedBlock);
      const b = draggedBlock;
      draggedBlock = null;
      setTimeout(() => {
         checkWinCondition(b);
      }, 450);
      return;
  }

  draggedBlock = null;
}

function checkWinCondition(block) {
  if (block.isTarget && block.x > gridSize - block.len) {
    // Win! Update progress.
    let prevBest = savedProgress.scores[currentLevelIndex];
    let isNewBest = false;
    
    if (prevBest === undefined || movesCount < prevBest) {
       savedProgress.scores[currentLevelIndex] = movesCount;
       isNewBest = true;
    }
    if (currentLevelIndex >= savedProgress.unlocked) {
       savedProgress.unlocked = currentLevelIndex + 1;
    }
    saveProgress();
    
    btnStart.textContent = `Resume Level ${Math.min(savedProgress.unlocked + 1, LEVELS.length)}`;

    if (currentLevelIndex === LEVELS.length - 1 && currentLevelIndex < savedProgress.unlocked) {
       winTitle.textContent = "You Win!";
       levelStats.innerHTML = `You beat all the levels!`;
       btnNext.disabled = true;
       btnNext.style.display = 'none';
    } else {
       winTitle.textContent = `Level ${currentLevelIndex + 1} Complete!`;
       levelStats.innerHTML = `Moves: ${movesCount}`;
       if (isNewBest) levelStats.innerHTML += '<br><span style="color:var(--color-accent-yellow)">New Best!</span>';
       btnNext.disabled = false;
       btnNext.style.display = 'inline-block';
    }
    
    showPanel(panelWin);
  }
}

// --- Overlays ---

function showPanel(panel) {
  isOverlayOpen = true;
  overlayManager.classList.replace('overlay-manager--hidden', 'overlay-manager--visible');
  
  panelStart.classList.replace('panel--active', 'panel--hidden');
  panelWin.classList.replace('panel--active', 'panel--hidden');
  panelLevels.classList.replace('panel--active', 'panel--hidden');
  
  panel.classList.replace('panel--hidden', 'panel--active');
  
  btnReset.disabled = true;
  btnControlsLevels.disabled = true;
}

function hideOverlay() {
  isOverlayOpen = false;
  overlayManager.classList.replace('overlay-manager--visible', 'overlay-manager--hidden');
  btnReset.disabled = false;
  btnControlsLevels.disabled = false;
  
  panelStart.classList.replace('panel--active', 'panel--hidden');
  panelWin.classList.replace('panel--active', 'panel--hidden');
  panelLevels.classList.replace('panel--active', 'panel--hidden');
}

function populateLevelsGrid() {
  levelsGrid.innerHTML = '';
  for (let i = 0; i < LEVELS.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.innerHTML = `Level ${i + 1}`;
    
    if (i <= savedProgress.unlocked) {
       const score = savedProgress.scores[i];
       const scoreHTML = score !== undefined ? `<span class="level-btn__score">Best: ${score}</span>` : `<span class="level-btn__score"></span>`;
       btn.innerHTML += scoreHTML;
       btn.addEventListener('click', () => {
         hideOverlay();
         currentLevelIndex = i;
         loadLevel(i);
       });
    } else {
       btn.disabled = true;
       btn.innerHTML += `<span class="level-btn__score">Locked</span>`;
    }
    levelsGrid.appendChild(btn);
  }
}

// --- Event Listeners ---

btnStart.addEventListener('click', () => {
  hideOverlay();
  loadLevel(currentLevelIndex);
});

btnNext.addEventListener('click', () => {
  hideOverlay();
  currentLevelIndex++;
  loadLevel(currentLevelIndex);
});

btnReplay.addEventListener('click', () => {
  hideOverlay();
  loadLevel(currentLevelIndex);
});

btnReset.addEventListener('click', () => {
  if (!isOverlayOpen) loadLevel(currentLevelIndex);
});

btnLevels.addEventListener('click', () => {
  lastMenuSource = panelStart;
  populateLevelsGrid();
  showPanel(panelLevels);
});

btnWinLevels.addEventListener('click', () => {
  lastMenuSource = panelWin;
  populateLevelsGrid();
  showPanel(panelLevels);
});

btnControlsLevels.addEventListener('click', () => {
  if (!isOverlayOpen) {
    lastMenuSource = null;
    populateLevelsGrid();
    showPanel(panelLevels);
  }
});

btnCloseLevels.addEventListener('click', () => {
  if (lastMenuSource) {
     showPanel(lastMenuSource);
  } else {
     hideOverlay();
  }
});

// Initially set up state and render background
loadProgress();
if (savedProgress.unlocked > 0) {
  currentLevelIndex = Math.min(savedProgress.unlocked, LEVELS.length - 1);
  btnStart.textContent = `Resume Level ${currentLevelIndex + 1}`;
}
loadLevel(currentLevelIndex);
showPanel(panelStart);
