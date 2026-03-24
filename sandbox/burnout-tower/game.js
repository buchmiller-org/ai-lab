/* ============================================================
   Burnout Tower — Prototype
   A roguelite action-survival office game built with Phaser 3.
   ============================================================ */

// --------------- constants ---------------
const GAME_W = 800;
const GAME_H = 600;
const PLAYER_SPEED = 200;
const DASH_SPEED = 600;
const DASH_DURATION = 200;       // ms
const DASH_COOLDOWN = 4000;      // ms
const AUTO_FIRE_INTERVAL = 1500; // ms
const PROJECTILE_SPEED = 300;
const PROJECTILE_RANGE = 180;
const ENEMY_SPEED = 60;
const ENEMY_STRESS = 0.15;       // stress per second of contact
const ENEMY_HEALTH = 3;          // hits to resolve
const SPAWN_INTERVAL_BASE = 2200;// ms between spawns
const SHIFT_DURATION = 120;      // seconds (2 min)
const URGENT_MIN = 50;           // seconds between urgent tasks
const URGENT_MAX = 70;
const URGENT_WINDUP = 3;         // seconds of warning
const URGENT_TIMER = 25;         // seconds to reach zone
const URGENT_STAND_TIME = 2;     // seconds standing in zone
const URGENT_FAIL_PENALTY = 0.20;

// --------------- colour palette ---------------
const COL = {
  bg: 0x2b2b3d,
  wall: 0x555568,
  desk: 0x6e6e80,
  player: 0x00e5ff,
  playerDash: 0x80f0ff,
  enemy: 0xffab40,
  enemyBar: 0xff5252,
  enemyBarBg: 0x333333,
  bullet: 0x00e5ff,
  check: 0x69f0ae,
  stress: 0xff1744,
  stressBg: 0x333344,
  clock: 0xffffff,
  urgent: 0xffea00,
  urgentZone: 0xffea00,
  mint: 0x69f0ae,
  uiText: 0xffffff,
  cardBg: 0x333355,
  cardHover: 0x444477,
  overlay: 0x000000,
};

// ============================================================
//  BOOT SCENE — generate placeholder textures
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // player (cyan square)
    const pg = this.make.graphics({ add: false });
    pg.fillStyle(COL.player);
    pg.fillRect(0, 0, 24, 24);
    pg.generateTexture('player', 24, 24);
    pg.destroy();

    // enemy (orange circle)
    const eg = this.make.graphics({ add: false });
    eg.fillStyle(COL.enemy);
    eg.fillCircle(12, 12, 12);
    eg.generateTexture('enemy', 24, 24);
    eg.destroy();

    // bullet (small cyan circle)
    const bg = this.make.graphics({ add: false });
    bg.fillStyle(COL.bullet);
    bg.fillCircle(4, 4, 4);
    bg.generateTexture('bullet', 8, 8);
    bg.destroy();

    // mint (green diamond)
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(COL.mint);
    mg.fillTriangle(8, 0, 16, 8, 8, 16);
    mg.fillTriangle(8, 0, 0, 8, 8, 16);
    mg.generateTexture('mint', 16, 16);
    mg.destroy();

    // desk (gray rectangle)
    const dg = this.make.graphics({ add: false });
    dg.fillStyle(COL.desk);
    dg.fillRect(0, 0, 64, 32);
    dg.lineStyle(1, 0x888899);
    dg.strokeRect(0, 0, 64, 32);
    dg.generateTexture('desk', 64, 32);
    dg.destroy();

    this.scene.start('Game', { floor: 1, upgrades: {} });
  }
}

// ============================================================
//  GAME SCENE — main gameplay
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.floorNum = data.floor || 1;
    this.upgrades = data.upgrades || {};
    this.stress = data.stress || 0;
    this.dashReady = true;
    this.isDashing = false;
    this.autoFireTimer = 0;
    this.shiftElapsed = 0;
    this.shiftDone = false;
    this.urgentActive = false;
    this.urgentStandTimer = 0;
    this.urgentCountdown = 0;
    this.urgentWindup = false;
    this.nextUrgent = Phaser.Math.Between(URGENT_MIN, URGENT_MAX);
    this.enemiesResolved = 0;
    this.gameOver = false;
  }

  create() {
    // ---- camera & world ----
    this.cameras.main.setBackgroundColor(COL.bg);

    // ---- walls (border) ----
    this.walls = this.physics.add.staticGroup();
    const wallT = 16;
    this._addWall(GAME_W / 2, wallT / 2, GAME_W, wallT);          // top
    this._addWall(GAME_W / 2, GAME_H - wallT / 2, GAME_W, wallT); // bottom
    this._addWall(wallT / 2, GAME_H / 2, wallT, GAME_H);          // left
    this._addWall(GAME_W - wallT / 2, GAME_H / 2, wallT, GAME_H); // right

    // ---- desks (obstacles) ----
    this.desks = this.physics.add.staticGroup();
    const deskLayout = [
      { x: 200, y: 180 }, { x: 350, y: 180 },
      { x: 550, y: 180 }, { x: 700, y: 180 },
      { x: 200, y: 320 }, { x: 350, y: 320 },
      { x: 550, y: 320 }, { x: 700, y: 320 },
      { x: 200, y: 460 }, { x: 350, y: 460 },
      { x: 550, y: 460 }, { x: 700, y: 460 },
    ];
    deskLayout.forEach(d => {
      const desk = this.desks.create(d.x, d.y, 'desk');
      desk.setSize(64, 32).refreshBody();
    });

    // ---- water cooler (stress relief zone) ----
    this.waterCooler = this.add.rectangle(80, GAME_H - 60, 28, 28, 0x4fc3f7);
    this.physics.add.existing(this.waterCooler, true);
    this.add.text(80, GAME_H - 42, '💧', { fontSize: '14px' }).setOrigin(0.5);
    this.coolerTimer = 0;

    // ---- player ----
    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H / 2, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    const speedMod = this.upgrades.speed ? 1.2 : 1;
    this.playerSpeed = PLAYER_SPEED * speedMod;

    // ---- enemies group ----
    this.enemies = this.physics.add.group();
    this.spawnTimer = this.time.addEvent({
      delay: this.upgrades.fireRate ? SPAWN_INTERVAL_BASE : SPAWN_INTERVAL_BASE - (this.floorNum - 1) * 100,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    // ---- bullets group ----
    this.bullets = this.physics.add.group();

    // ---- mints group ----
    this.mints = this.physics.add.group();

    // ---- collisions ----
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.desks);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitEnemy, null, this);
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.mints, this.onCollectMint, null, this);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.desks);
    this.physics.add.collider(this.bullets, this.walls, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.desks, (b) => b.destroy());

    // ---- input ----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => this.triggerDash());

    // ---- HUD ----
    this.createHUD();

    // ---- urgent task zone (hidden initially) ----
    this.urgentZone = this.add.rectangle(0, 0, 60, 60, COL.urgentZone, 0.25);
    this.urgentZone.setStrokeStyle(2, COL.urgentZone);
    this.urgentZone.setVisible(false);
    this.urgentZone.setDepth(5);

    // ---- urgent task text ----
    this.urgentText = this.add.text(GAME_W / 2, 60, '', {
      fontFamily: 'Orbitron', fontSize: '16px', color: '#ffea00', align: 'center',
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    // ---- floor label ----
    this.add.text(GAME_W / 2, 28, `FLOOR ${this.floorNum}`, {
      fontFamily: 'Orbitron', fontSize: '11px', color: '#888',
    }).setOrigin(0.5).setDepth(20);
  }

  // ---- wall helper ----
  _addWall(x, y, w, h) {
    const wall = this.add.rectangle(x, y, w, h, COL.wall);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  // ---- HUD ----
  createHUD() {
    const y = 10;

    // stress bar
    this.stressBarBg = this.add.rectangle(GAME_W - 170, y + 8, 150, 14, COL.stressBg).setOrigin(0, 0).setDepth(20);
    this.stressBarFill = this.add.rectangle(GAME_W - 170, y + 8, 0, 14, COL.stress).setOrigin(0, 0).setDepth(20);
    this.add.text(GAME_W - 230, y + 6, 'STRESS', {
      fontFamily: 'Orbitron', fontSize: '10px', color: '#ff5252',
    }).setDepth(20);

    // clock
    this.clockText = this.add.text(20, y + 4, '9:00 AM', {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#ffffff',
    }).setDepth(20);

    // dash cooldown indicator
    this.dashIcon = this.add.text(GAME_W / 2, GAME_H - 30, '⚡ DASH [SPACE]', {
      fontFamily: 'Inter', fontSize: '12px', color: '#80f0ff',
    }).setOrigin(0.5).setDepth(20);
  }

  // ---- update ----
  update(time, delta) {
    if (this.gameOver || this.shiftDone) return;

    const dt = delta / 1000;

    // ---- player movement ----
    if (!this.isDashing) {
      let vx = 0, vy = 0;
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
      }
      this.player.setVelocity(vx * this.playerSpeed, vy * this.playerSpeed);
    }

    // ---- auto fire ----
    this.autoFireTimer += delta;
    const fireInterval = this.upgrades.fireRate ? AUTO_FIRE_INTERVAL * 0.6 : AUTO_FIRE_INTERVAL;
    if (this.autoFireTimer >= fireInterval) {
      this.autoFireTimer = 0;
      this.autoFire();
    }

    // ---- shift timer ----
    this.shiftElapsed += dt;
    this.updateClock();

    if (this.shiftElapsed >= SHIFT_DURATION) {
      this.completeFloor();
      return;
    }

    // ---- urgent task scheduling ----
    if (!this.urgentActive && !this.urgentWindup && this.shiftElapsed >= this.nextUrgent) {
      this.startUrgentWindup();
    }

    // ---- urgent task logic ----
    if (this.urgentWindup) {
      this.urgentWindupElapsed += dt;
      if (this.urgentWindupElapsed >= URGENT_WINDUP) {
        this.activateUrgentTask();
      }
    }

    if (this.urgentActive) {
      this.urgentCountdown -= dt;
      this.urgentText.setText(`URGENT TASK! ${Math.ceil(this.urgentCountdown)}s`).setVisible(true);

      // check if player is in zone
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.urgentZone.x, this.urgentZone.y
      );
      if (dist < 35) {
        this.urgentStandTimer += dt;
        this.urgentZone.setFillStyle(COL.urgentZone, 0.5);
        if (this.urgentStandTimer >= URGENT_STAND_TIME) {
          this.completeUrgentTask();
        }
      } else {
        this.urgentStandTimer = 0;
        this.urgentZone.setFillStyle(COL.urgentZone, 0.25);
      }

      if (this.urgentCountdown <= 0) {
        this.failUrgentTask();
      }
    }

    // ---- water cooler proximity ----
    const coolerDist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.waterCooler.x, this.waterCooler.y
    );
    if (coolerDist < 40) {
      this.coolerTimer += dt;
      if (this.coolerTimer >= 2) {
        this.stress = Math.max(0, this.stress - 0.1);
        this.coolerTimer = 0;
      }
    } else {
      this.coolerTimer = 0;
    }

    // ---- enemy movement (chase player) ----
    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active || enemy.getData('resolved')) return;
      this.physics.moveToObject(enemy, this.player, ENEMY_SPEED);
    });

    // ---- update HUD ----
    this.stressBarFill.width = 150 * this.stress;
    if (this.stress > 0.75) {
      this.stressBarFill.setFillStyle(0xff0000);
    } else if (this.stress > 0.5) {
      this.stressBarFill.setFillStyle(0xff5252);
    } else {
      this.stressBarFill.setFillStyle(COL.stress);
    }

    // dash icon
    this.dashIcon.setColor(this.dashReady ? '#80f0ff' : '#555555');
    this.dashIcon.setText(this.dashReady ? '⚡ DASH [SPACE]' : '⚡ COOLING DOWN...');

    // stress vignette effect
    if (this.stress > 0.5) {
      this.cameras.main.setAlpha(1 - (this.stress - 0.5) * 0.15);
    }
  }

  // ---- clock display ----
  updateClock() {
    // map 0-SHIFT_DURATION seconds to 9:00 AM - 5:00 PM (8 hours)
    // clock snaps to the nearest 30-minute increment so it feels like time
    // is passing in meaningful chunks rather than ticking every second
    const progress = Math.min(this.shiftElapsed / SHIFT_DURATION, 1);
    const totalMinutes = Math.floor(progress * 480 / 30) * 30; // snap to 30-min blocks
    const hours = 9 + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours;
    this.clockText.setText(`${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`);
  }

  // ---- spawn enemy ----
  spawnEnemy() {
    if (this.gameOver || this.shiftDone) return;

    // pick a random edge
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    const margin = 30;
    switch (side) {
      case 0: x = Phaser.Math.Between(margin, GAME_W - margin); y = margin; break;
      case 1: x = Phaser.Math.Between(margin, GAME_W - margin); y = GAME_H - margin; break;
      case 2: x = margin; y = Phaser.Math.Between(margin, GAME_H - margin); break;
      case 3: x = GAME_W - margin; y = Phaser.Math.Between(margin, GAME_H - margin); break;
    }

    const enemy = this.enemies.create(x, y, 'enemy');
    enemy.setData('hp', ENEMY_HEALTH);
    enemy.setData('resolved', false);
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(0.5);

    // health bar above enemy
    const barBg = this.add.rectangle(0, 0, 24, 4, COL.enemyBarBg).setDepth(9);
    const barFill = this.add.rectangle(0, 0, 24, 4, COL.enemyBar).setDepth(9);
    enemy.setData('barBg', barBg);
    enemy.setData('barFill', barFill);

    // update bar position each frame
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!enemy.active) {
          barBg.destroy();
          barFill.destroy();
          return;
        }
        barBg.setPosition(enemy.x, enemy.y - 18);
        barFill.setPosition(enemy.x - 12, enemy.y - 18);
        barFill.setOrigin(0, 0.5);
        barFill.width = 24 * (enemy.getData('hp') / ENEMY_HEALTH);
      },
    });
  }

  // ---- auto fire ----
  autoFire() {
    if (this.gameOver) return;

    // find nearest enemy
    let nearest = null;
    let nearestDist = Infinity;
    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active || enemy.getData('resolved')) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const range = this.upgrades.range ? PROJECTILE_RANGE * 1.5 : PROJECTILE_RANGE;
      if (d < range && d < nearestDist) {
        nearest = enemy;
        nearestDist = d;
      }
    });

    if (!nearest) return;

    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
    this.physics.moveToObject(bullet, nearest, PROJECTILE_SPEED);

    // destroy bullet after a short time
    this.time.delayedCall(800, () => { if (bullet.active) bullet.destroy(); });
  }

  // ---- collisions ----
  onPlayerHitEnemy(player, enemy) {
    if (this.isDashing || enemy.getData('resolved') || this.gameOver) return;

    const stressMod = this.upgrades.stressReduce ? 0.6 : 1;
    this.stress += ENEMY_STRESS * (1 / 60) * stressMod; // per-frame overlap
    if (this.stress >= 1) {
      this.stress = 1;
      this.burnout();
    }
  }

  onBulletHitEnemy(bullet, enemy) {
    if (enemy.getData('resolved')) return;
    bullet.destroy();

    let hp = enemy.getData('hp') - 1;
    enemy.setData('hp', hp);

    if (hp <= 0) {
      this.resolveEnemy(enemy);
    } else {
      // flash white
      enemy.setTint(0xffffff);
      this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });
    }
  }

  onCollectMint(player, mint) {
    mint.destroy();
    this.stress = Math.max(0, this.stress - 0.1);

    // feedback
    const txt = this.add.text(player.x, player.y - 20, '-10% Stress', {
      fontFamily: 'Inter', fontSize: '12px', color: '#69f0ae',
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: txt, y: txt.y - 30, alpha: 0, duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  // ---- resolve enemy (checkmark + walk off) ----
  resolveEnemy(enemy) {
    enemy.setData('resolved', true);
    enemy.setVelocity(0, 0);
    enemy.body.enable = false;
    this.enemiesResolved++;

    // destroy health bar
    const barBg = enemy.getData('barBg');
    const barFill = enemy.getData('barFill');
    if (barBg) barBg.destroy();
    if (barFill) barFill.destroy();

    // checkmark
    const check = this.add.text(enemy.x, enemy.y - 16, '✓', {
      fontSize: '20px', color: '#69f0ae',
    }).setOrigin(0.5).setDepth(15);

    // maybe drop a mint (15% chance)
    if (Math.random() < 0.15) {
      const mint = this.mints.create(enemy.x, enemy.y, 'mint');
      mint.setBounce(0.3);
      mint.setCollideWorldBounds(true);
    }

    // walk off screen
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
    this.tweens.add({
      targets: enemy,
      x: enemy.x + Math.cos(angle) * 300,
      y: enemy.y + Math.sin(angle) * 300,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        enemy.destroy();
        check.destroy();
      },
    });
  }

  // ---- dash ----
  triggerDash() {
    if (!this.dashReady || this.isDashing || this.gameOver) return;
    this.dashReady = false;
    this.isDashing = true;

    // determine dash direction from current velocity or facing
    let vx = this.player.body.velocity.x;
    let vy = this.player.body.velocity.y;
    if (vx === 0 && vy === 0) {
      vx = 1; // default right
    }
    const angle = Math.atan2(vy, vx);
    this.player.setVelocity(
      Math.cos(angle) * DASH_SPEED,
      Math.sin(angle) * DASH_SPEED
    );

    // visual
    this.player.setTint(COL.playerDash);

    // trail effect
    const trail = this.add.rectangle(this.player.x, this.player.y, 24, 24, COL.playerDash, 0.5).setDepth(8);
    this.tweens.add({ targets: trail, alpha: 0, duration: 300, onComplete: () => trail.destroy() });

    // end dash
    this.time.delayedCall(DASH_DURATION, () => {
      this.isDashing = false;
      this.player.clearTint();
    });

    // cooldown
    this.time.delayedCall(DASH_COOLDOWN, () => {
      this.dashReady = true;
    });
  }

  // ---- urgent task ----
  startUrgentWindup() {
    this.urgentWindup = true;
    this.urgentWindupElapsed = 0;

    this.urgentText.setText('BOSS: "I need this NOW!"').setVisible(true);
    this.tweens.add({
      targets: this.urgentText, alpha: 0.3,
      yoyo: true, repeat: 2, duration: 500,
      onComplete: () => { this.urgentText.setAlpha(1); },
    });
  }

  activateUrgentTask() {
    this.urgentWindup = false;
    this.urgentActive = true;
    this.urgentCountdown = URGENT_TIMER;
    this.urgentStandTimer = 0;

    // pick a reachable position (not on a desk)
    let zx, zy;
    do {
      zx = Phaser.Math.Between(80, GAME_W - 80);
      zy = Phaser.Math.Between(80, GAME_H - 80);
    } while (this._overlapsDesk(zx, zy));

    this.urgentZone.setPosition(zx, zy).setVisible(true);

    // pulsing glow
    this.tweens.add({
      targets: this.urgentZone,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 600,
    });
  }

  _overlapsDesk(x, y) {
    let overlaps = false;
    this.desks.children.iterate(desk => {
      if (Math.abs(desk.x - x) < 50 && Math.abs(desk.y - y) < 30) {
        overlaps = true;
      }
    });
    return overlaps;
  }

  completeUrgentTask() {
    this.urgentActive = false;
    this.urgentZone.setVisible(false);
    this.tweens.killTweensOf(this.urgentZone);
    this.urgentZone.setAlpha(1);
    this.nextUrgent = this.shiftElapsed + Phaser.Math.Between(URGENT_MIN, URGENT_MAX);

    this.urgentText.setText('✓ TASK COMPLETE').setColor('#69f0ae');
    this.time.delayedCall(2000, () => {
      this.urgentText.setVisible(false).setColor('#ffea00');
    });
  }

  failUrgentTask() {
    this.urgentActive = false;
    this.urgentZone.setVisible(false);
    this.tweens.killTweensOf(this.urgentZone);
    this.urgentZone.setAlpha(1);
    this.nextUrgent = this.shiftElapsed + Phaser.Math.Between(URGENT_MIN, URGENT_MAX);

    this.stress = Math.min(1, this.stress + URGENT_FAIL_PENALTY);
    this.urgentText.setText('✗ TASK FAILED  +20% STRESS').setColor('#ff1744');
    this.time.delayedCall(2500, () => {
      this.urgentText.setVisible(false).setColor('#ffea00');
    });

    // flash screen
    this.cameras.main.flash(400, 255, 23, 68, true);

    if (this.stress >= 1) {
      this.burnout();
    }
  }

  // ---- complete floor ----
  completeFloor() {
    this.shiftDone = true;
    this.spawnTimer.remove();
    this.player.setVelocity(0, 0);

    // clear remaining enemies
    this.enemies.children.iterate(e => { if (e) e.destroy(); });

    // "5:00 PM — Shift Over!" overlay
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, COL.overlay, 0.6).setDepth(50);
    const txt = this.add.text(GAME_W / 2, GAME_H / 2 - 20, '🔔 5:00 PM — SHIFT OVER!', {
      fontFamily: 'Orbitron', fontSize: '22px', color: '#69f0ae',
    }).setOrigin(0.5).setDepth(51);
    const sub = this.add.text(GAME_W / 2, GAME_H / 2 + 20, 'Heading to the elevator...', {
      fontFamily: 'Inter', fontSize: '14px', color: '#aaa',
    }).setOrigin(0.5).setDepth(51);

    this.time.delayedCall(2500, () => {
      this.scene.start('Upgrade', {
        floor: this.floorNum,
        stress: this.stress,
        upgrades: this.upgrades,
        enemiesResolved: this.enemiesResolved,
      });
    });
  }

  // ---- burnout (game over) ----
  burnout() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.spawnTimer.remove();

    this.cameras.main.fade(1500, 255, 255, 255, false, (cam, progress) => {
      if (progress >= 1) {
        this.scene.start('GameOver', {
          floor: this.floorNum,
          enemiesResolved: this.enemiesResolved,
        });
      }
    });
  }
}

// ============================================================
//  UPGRADE SCENE — elevator between floors
// ============================================================
class UpgradeScene extends Phaser.Scene {
  constructor() { super('Upgrade'); }

  init(data) {
    this.floorNum = data.floor;
    this.stress = data.stress;
    this.upgrades = { ...(data.upgrades || {}) };
    this.enemiesResolved = data.enemiesResolved;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    this.add.text(GAME_W / 2, 50, '🛗 ELEVATOR', {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#00e5ff',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 85, `Floor ${this.floorNum} cleared! Choose an upgrade:`, {
      fontFamily: 'Inter', fontSize: '14px', color: '#aaa',
    }).setOrigin(0.5);

    // upgrade options
    const options = this._getUpgradeOptions();
    const cardW = 200;
    const cardH = 180;
    const startX = GAME_W / 2 - (options.length * (cardW + 20)) / 2 + cardW / 2;

    options.forEach((opt, i) => {
      const cx = startX + i * (cardW + 20);
      const cy = GAME_H / 2;

      const card = this.add.rectangle(cx, cy, cardW, cardH, COL.cardBg)
        .setStrokeStyle(2, 0x555577)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx, cy - 55, opt.icon, { fontSize: '32px' }).setOrigin(0.5);

      this.add.text(cx, cy - 15, opt.name, {
        fontFamily: 'Orbitron', fontSize: '13px', color: '#00e5ff', align: 'center',
        wordWrap: { width: cardW - 20 },
      }).setOrigin(0.5);

      this.add.text(cx, cy + 25, opt.desc, {
        fontFamily: 'Inter', fontSize: '11px', color: '#ccc', align: 'center',
        wordWrap: { width: cardW - 20 },
      }).setOrigin(0.5);

      card.on('pointerover', () => card.setFillStyle(COL.cardHover));
      card.on('pointerout', () => card.setFillStyle(COL.cardBg));
      card.on('pointerdown', () => {
        opt.apply(this.upgrades);
        this.proceedToNextFloor();
      });
    });

    // Break Room option (reduce stress)
    if (this.stress > 0.15) {
      const hrBtn = this.add.text(GAME_W / 2, GAME_H - 80, '💊 Break Room: Reduce 15% Stress', {
        fontFamily: 'Inter', fontSize: '13px', color: '#69f0ae',
        backgroundColor: '#2a3a2a', padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      hrBtn.on('pointerover', () => hrBtn.setColor('#aaffcc'));
      hrBtn.on('pointerout', () => hrBtn.setColor('#69f0ae'));
      hrBtn.on('pointerdown', () => {
        this.stress = Math.max(0, this.stress - 0.15);
        hrBtn.setText('💊 Stress reduced!').removeInteractive();
      });
    }
  }

  _getUpgradeOptions() {
    // pool of possible upgrades — always show 3
    const pool = [
      {
        icon: '⚡', name: 'RAPID FILING',
        desc: 'Auto-fire 40% faster',
        key: 'fireRate',
        apply: (u) => { u.fireRate = true; },
      },
      {
        icon: '🛡️', name: 'STRESS SHIELD',
        desc: 'Take 40% less Stress from contacts',
        key: 'stressReduce',
        apply: (u) => { u.stressReduce = true; },
      },
      {
        icon: '🏃', name: 'ERGONOMIC SHOES',
        desc: 'Move 20% faster',
        key: 'speed',
        apply: (u) => { u.speed = true; },
      },
      {
        icon: '🎯', name: 'LONG ARM',
        desc: 'Auto-fire range +50%',
        key: 'range',
        apply: (u) => { u.range = true; },
      },
      {
        icon: '☕', name: 'ESPRESSO SHOT',
        desc: 'Dash cooldown -30%',
        key: 'dashSpeed',
        apply: (u) => { u.dashSpeed = true; },
      },
    ];

    // filter out already-owned, then pick 3
    const available = pool.filter(p => !this.upgrades[p.key]);
    if (available.length <= 3) return available;
    Phaser.Utils.Array.Shuffle(available);
    return available.slice(0, 3);
  }

  proceedToNextFloor() {
    this.time.delayedCall(500, () => {
      this.scene.start('Game', {
        floor: this.floorNum + 1,
        stress: this.stress,
        upgrades: this.upgrades,
      });
    });
  }
}

// ============================================================
//  GAME OVER SCENE
// ============================================================
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.floorNum = data.floor;
    this.enemiesResolved = data.enemiesResolved;
  }

  create() {
    this.cameras.main.setBackgroundColor(0xf5f5f5);

    this.add.text(GAME_W / 2, 130, "You've Been Let Go.", {
      fontFamily: 'Inter', fontSize: '22px', color: '#d32f2f',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 190, `Floor reached: ${this.floorNum}`, {
      fontFamily: 'Inter', fontSize: '16px', color: '#555',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 220, `Tasks resolved: ${this.enemiesResolved}`, {
      fontFamily: 'Inter', fontSize: '16px', color: '#555',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 290,
      'We appreciate your contributions.\nPlease clean out your desk by end of day.', {
      fontFamily: 'Inter', fontSize: '13px', color: '#888',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    const restartBtn = this.add.text(GAME_W / 2, 380, '[ TRY AGAIN ]', {
      fontFamily: 'Orbitron', fontSize: '18px', color: '#1a1a2e',
      backgroundColor: '#00e5ff', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setColor('#fff'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#1a1a2e'));
    restartBtn.on('pointerdown', () => {
      this.scene.start('Game', { floor: 1, upgrades: {} });
    });
  }
}

// ============================================================
//  PHASER CONFIG
// ============================================================
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene, UpgradeScene, GameOverScene],
};

const game = new Phaser.Game(config);
