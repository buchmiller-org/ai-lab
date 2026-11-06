/**
 * Prototype Title — Sandbox Prototype Stub
 * 
 * Purpose: Test hypotheses and game mechanics rapidly.
 * Can be replaced by Phaser, Three.js, Pixi, or vanilla Canvas logic.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('prototype-canvas');
  const ctx = canvas.getContext('2d');
  const debugReadout = document.getElementById('debug-readout');

  // Prototype state
  let lastTime = 0;
  let frameCount = 0;
  let fps = 0;
  let fpsTimer = 0;

  // Simple test player entity
  const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 200,
    color: '#38bdf8'
  };

  const keys = {};

  function init() {
    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    requestAnimationFrame(loop);
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // FPS calculation
    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
      updateDebug();
    }

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function update(dt) {
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    // Keep within canvas bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
  }

  function render() {
    // Clear background
    ctx.fillStyle = '#060910';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#131b2e';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw test player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Test Entity', player.x, player.y - player.size - 6);
  }

  function updateDebug() {
    debugReadout.textContent = `Status: Active | Pos: (${Math.round(player.x)}, ${Math.round(player.y)}) | FPS: ${fps}`;
  }

  init();
})();
