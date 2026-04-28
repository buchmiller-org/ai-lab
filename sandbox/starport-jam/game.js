const COLORS = {
    RED: 0xff4444,
    YELLOW: 0xffcc00,
    GREEN: 0x44ff44,
    BLUE: 0x4444ff,
    PURPLE: 0xcc44cc
};

const COLOR_KEYS = Object.keys(COLORS);

const config = {
    type: Phaser.AUTO,
    width: 600,
    height: 900,
    backgroundColor: '#2a2a35',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Game State
let grid = [];
const GRID_SIZE = 8;
const POD_SIZE = 48;
let path;
let landingPads = [];
let dispatchQueue = [];
const MAX_PADS = 3;
let deck = [];
let remainingText;
let totalPodsLeft = 0;

function preload() {
    // --- ASSET REQUIREMENTS FOR USER ---
    // Save these inside sandbox/starport-jam/assets/
    // 
    // this.load.image('pod_base', 'assets/pod_base.png');         // 64x64, grayscale/white block
    // this.load.image('shuttle_base', 'assets/shuttle.png');      // 96x96, grayscale/white flat cartoon spaceship
    // this.load.image('landing_pad', 'assets/landing_pad.png');   // 100x100
    // this.load.image('bg', 'assets/background.png');             // 600x900 or seamless tile
    // ------------------------------------

    // Generating Placeholders
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Background placeholder
    g.fillStyle(0x3a3a4a);
    g.fillRect(0, 0, 600, 900);
    g.generateTexture('bg', 600, 900);
    g.clear();

    // Pod placeholder
    g.fillStyle(0xffffff);
    g.fillRoundedRect(0, 0, 44, 44, 6);
    g.lineStyle(2, 0x000000, 0.2);
    g.strokeRoundedRect(0, 0, 44, 44, 6);
    g.generateTexture('pod_base', 44, 44);
    g.clear();

    // Shuttle placeholder (Points RIGHT)
    g.fillStyle(0xdddddd);
    g.fillTriangle(96, 48, 0, 0, 0, 96);
    g.fillStyle(0xffffff);
    g.fillRect(8, 24, 40, 48);
    g.generateTexture('shuttle_base', 96, 96);
    g.clear();

    // Landing Pad placeholder
    g.lineStyle(4, 0x666677);
    g.strokeRoundedRect(0, 0, 96, 96, 16);
    g.generateTexture('landing_pad', 96, 96);
    g.clear();
}

function create() {
    this.add.image(300, 450, 'bg');
    
    remainingText = this.add.text(50, 800, 'Inbound:\n0', { fontSize: '18px', color: '#aaa', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);

    createGrid(this);
    createTrack(this);
    createLandingPads(this);
    fillDispatchQueue(this);
}

function createGrid(scene) {
    const startX = 300 - (GRID_SIZE * POD_SIZE) / 2 + (POD_SIZE / 2);
    const startY = 300 - (GRID_SIZE * POD_SIZE) / 2 + (POD_SIZE / 2);
    
    let tallies = {};
    for (let key of COLOR_KEYS) tallies[key] = 0;
    totalPodsLeft = GRID_SIZE * GRID_SIZE;

    for (let row = 0; row < GRID_SIZE; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            let randomColorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
            tallies[randomColorKey]++;
            
            let pod = scene.add.sprite(startX + col * POD_SIZE, startY + row * POD_SIZE, 'pod_base');
            pod.setTint(COLORS[randomColorKey]);
            
            grid[row][col] = {
                sprite: pod,
                colorKey: randomColorKey,
                row: row,
                col: col
            };
        }
    }
    
    deck = [];
    for (let key in tallies) {
        let count = tallies[key];
        while (count > 0) {
            let cap = Math.min(count, Math.floor(Math.random() * 4) + 5); // random 5 to 8
            deck.push({ colorKey: key, capacity: cap });
            count -= cap;
        }
    }
    deck.sort(() => Math.random() - 0.5); // Shuffle
}

function createTrack(scene) {
    const padding = 50;
    const gridPixelSize = GRID_SIZE * POD_SIZE;
    const startX = 300 - gridPixelSize / 2 - padding;
    const startY = 300 - gridPixelSize / 2 - padding;
    const endX = 300 + gridPixelSize / 2 + padding;
    const endY = 300 + gridPixelSize / 2 + padding;

    path = new Phaser.Curves.Path(startX, endY); // Bottom Left
    path.lineTo(startX, startY);                 // Top Left
    path.lineTo(endX, startY);                   // Top Right
    path.lineTo(endX, endY);                     // Bottom Right
    path.lineTo(startX, endY);                   // Back to Bottom Left

    let graphics = scene.add.graphics();
    graphics.lineStyle(8, 0x555566, 0.5);
    path.draw(graphics);
}

function createLandingPads(scene) {
    const padSpacing = 110;
    const startX = 300 - (1 * padSpacing); // Centered for 3 pads
    const yPos = 650;

    for (let i = 0; i < MAX_PADS; i++) {
        scene.add.image(startX + (i * padSpacing), yPos, 'landing_pad');
        landingPads.push({
            x: startX + (i * padSpacing),
            y: yPos,
            shuttle: null
        });
    }
}

function fillDispatchQueue(scene) {
    const queueY = 800;
    const spacing = 80;
    const startX = 300 - (2 * spacing);

    while(dispatchQueue.length < 5 && deck.length > 0) {
        let data = deck.shift();
        let index = dispatchQueue.length;
        let shuttle = createShuttle(scene, startX + (index * spacing), queueY, data.colorKey, data.capacity);
        dispatchQueue.push(shuttle);
    }
    if (remainingText) remainingText.setText('Inbound:\n' + deck.length);
}

function createShuttle(scene, x, y, colorKey, capacity) {
    let shuttle = scene.add.sprite(x, y, 'shuttle_base');
    shuttle.setTint(COLORS[colorKey]);
    shuttle.setInteractive();
    
    shuttle.colorKey = colorKey;
    shuttle.state = 'queue';
    shuttle.padIndex = -1;
    shuttle.capacity = capacity;
    shuttle.currentLoad = 0;
    
    let text = scene.add.text(x, y, '0/' + capacity, { fontSize: '20px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
    shuttle.label = text;

    shuttle.on('pointerdown', () => handleShuttleClick(scene, shuttle));

    return shuttle;
}

function handleShuttleClick(scene, shuttle) {
    if (shuttle.state === 'queue' || shuttle.state === 'pad') {
        if (shuttle.state === 'queue') {
            let queueIndex = dispatchQueue.indexOf(shuttle);
            dispatchQueue.splice(queueIndex, 1);
            dispatchQueue.forEach((s, idx) => {
                scene.tweens.add({ targets: [s, s.label], x: 300 - (2 * 80) + (idx * 80), duration: 200 });
            });
            fillDispatchQueue(scene);
        } else {
            landingPads[shuttle.padIndex].shuttle = null;
        }
        deployToTrack(scene, shuttle);
    }
}

function deployToTrack(scene, shuttle) {
    shuttle.state = 'track';
    shuttle.extractedNodes = {}; 
    shuttle.setRotation(-Math.PI/2); // Point UP
    
    scene.tweens.add({
        targets: [shuttle, shuttle.label],
        x: path.getStartPoint().x,
        y: path.getStartPoint().y,
        duration: 300,
        onComplete: () => {
            shuttle.pathTween = scene.tweens.addCounter({
                from: 0,
                to: 1, 
                duration: 6000, 
                onUpdate: (tween) => {
                    let t = tween.getValue();
                    let point = path.getPoint(t);
                    shuttle.x = point.x;
                    shuttle.y = point.y;
                    shuttle.label.x = point.x;
                    shuttle.label.y = point.y;
                    
                    let tangent = path.getTangent(t);
                    shuttle.setRotation(tangent.angle());
                    
                    tryExtractPods(scene, shuttle);
                },
                onComplete: () => {
                    if (shuttle.currentLoad < shuttle.capacity) {
                        let emptyPadIndex = landingPads.findIndex(pad => pad.shuttle === null);
                        if (emptyPadIndex !== -1) {
                            landingPads[emptyPadIndex].shuttle = shuttle;
                            shuttle.state = 'pad';
                            shuttle.padIndex = emptyPadIndex;
                            shuttle.setRotation(Math.PI/2); // Point DOWN
                            scene.tweens.add({
                                targets: [shuttle, shuttle.label],
                                x: landingPads[emptyPadIndex].x,
                                y: landingPads[emptyPadIndex].y,
                                duration: 300,
                                onComplete: () => shuttle.setRotation(-Math.PI/2)
                            });
                        } else {
                            showGameOver(scene, "GRIDLOCK! NO PADS AVAILABLE");
                        }
                    }
                }
            });
        }
    });
}

function tryExtractPods(scene, shuttle) {
    if (shuttle.currentLoad >= shuttle.capacity) return;

    const padding = 50;
    const gridPixelSize = GRID_SIZE * POD_SIZE;
    const trackStartX = 300 - gridPixelSize / 2 - padding;
    const trackStartY = 300 - gridPixelSize / 2 - padding;
    const trackEndX = 300 + gridPixelSize / 2 + padding;
    const trackEndY = 300 + gridPixelSize / 2 + padding;

    let onLeft = Math.abs(shuttle.x - trackStartX) < 5;
    let onRight = Math.abs(shuttle.x - trackEndX) < 5;
    let onTop = Math.abs(shuttle.y - trackStartY) < 5;
    let onBottom = Math.abs(shuttle.y - trackEndY) < 5;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let podObj = grid[r][c];
            if (podObj && podObj.colorKey === shuttle.colorKey) {
                let dx = Math.abs(shuttle.x - podObj.sprite.x);
                let dy = Math.abs(shuttle.y - podObj.sprite.y);
                
                let aligned = false;
                let clearPath = false;
                let nodeId = '';

                if (onLeft && dy < 40) {
                    nodeId = 'L' + r;
                    aligned = true;
                    clearPath = true;
                    for (let i = 0; i < c; i++) { if (grid[r][i]) clearPath = false; }
                } else if (onRight && dy < 40) {
                    nodeId = 'R' + r;
                    aligned = true;
                    clearPath = true;
                    for (let i = c + 1; i < GRID_SIZE; i++) { if (grid[r][i]) clearPath = false; }
                } else if (onTop && dx < 40) {
                    nodeId = 'T' + c;
                    aligned = true;
                    clearPath = true;
                    for (let i = 0; i < r; i++) { if (grid[i][c]) clearPath = false; }
                } else if (onBottom && dx < 40) {
                    nodeId = 'B' + c;
                    aligned = true;
                    clearPath = true;
                    for (let i = r + 1; i < GRID_SIZE; i++) { if (grid[i][c]) clearPath = false; }
                }

                if (aligned && clearPath && !shuttle.extractedNodes[nodeId]) {
                    shuttle.extractedNodes[nodeId] = true;
                    grid[r][c] = null;
                    totalPodsLeft--;
                    shuttle.currentLoad++;
                    shuttle.label.setText(`${shuttle.currentLoad}/${shuttle.capacity}`);

                    scene.tweens.add({
                        targets: podObj.sprite,
                        x: shuttle.x,
                        y: shuttle.y,
                        scaleX: 0.2,
                        scaleY: 0.2,
                        duration: 200,
                        onComplete: () => {
                            podObj.sprite.destroy();
                            if (shuttle.currentLoad >= shuttle.capacity) {
                                launchShuttle(scene, shuttle);
                            }
                            if (totalPodsLeft <= 0) {
                                showGameOver(scene, "YOU WIN! SPACEPORT CLEARED!");
                            }
                        }
                    });
                }
            }
        }
    }
}

function launchShuttle(scene, shuttle) {
    if (shuttle.state === 'launching') return;
    shuttle.state = 'launching';
    
    if (shuttle.pathTween) shuttle.pathTween.stop();
    
    shuttle.setRotation(-Math.PI/2); // Point UP for hyperspace
    
    scene.tweens.add({
        targets: [shuttle, shuttle.label],
        y: -100, // Fly up
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
            shuttle.destroy();
            shuttle.label.destroy();
        }
    });
}

function showGameOver(scene, message) {
    let bg = scene.add.rectangle(300, 450, 600, 900, 0x000000, 0.7);
    bg.setDepth(10);
    let txt = scene.add.text(300, 400, message, { fontSize: '32px', color: '#fff', fontStyle: 'bold', align: 'center', wordWrap: { width: 500 } }).setOrigin(0.5);
    txt.setDepth(11);
    
    let btn = scene.add.text(300, 500, 'PLAY AGAIN', { fontSize: '24px', color: '#0f0', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setInteractive()
        .setDepth(11)
        .on('pointerdown', () => {
            scene.scene.restart();
        });
}

function update() {
}
