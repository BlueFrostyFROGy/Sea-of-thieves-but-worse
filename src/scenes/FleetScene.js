import Phaser from 'phaser';
import { SHIP_CLASSES } from '../data/gddData.js';

export class FleetScene extends Phaser.Scene {
  constructor() {
    super('FleetScene');
  }

  init(data) {
    this.profile = data?.profile ?? {};
    this.ownedShips = this.profile.ownedShips ?? ['skiff'];
    this.gold = this.profile.gold ?? 0;
  }

  create() {
    // Set up camera and world size for walking around
    const worldWidth = 2400;
    const worldHeight = 2400;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Background
    this.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 0x1a3d4d);
    this.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth - 40, worldHeight - 40, 0x0f2834).setStrokeStyle(2, 0x2a7f62, 0.8);

    // Central base/building
    const baseX = worldWidth / 2;
    const baseY = worldHeight / 2;
    const baseSize = 180;
    
    // Base structure
    this.add.rectangle(baseX, baseY, baseSize, baseSize, 0x3d2817).setStrokeStyle(3, 0x5c4a2f, 1);
    this.add.text(baseX, baseY - baseSize / 2 - 30, 'Fleet Base', { fontSize: '20px', color: '#ffe7b0', fontStyle: 'bold' }).setOrigin(0.5);

    // Gold pile in base
    this.createGoldPile(baseX, baseY);

    // Create docks in 4 directions: North, South, East, West
    const dockDistance = 400;
    
    // North dock
    this.createDock(baseX, baseY - dockDistance, 'north', 0);
    
    // South dock
    this.createDock(baseX, baseY + dockDistance, 'south', 2);
    
    // East dock
    this.createDock(baseX + dockDistance, baseY, 'east', 1);
    
    // West dock
    this.createDock(baseX - dockDistance, baseY, 'west', 3);

    // Player (walking avatar)
    this.player = this.physics.add.sprite(baseX, baseY + 100, null);
    this.player.setDisplaySize(30, 40);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.2);
    this.player.setTint(0x4a90e2);

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.8);

    // Input for movement
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      w: this.input.keyboard.addKey('W'),
      a: this.input.keyboard.addKey('A'),
      s: this.input.keyboard.addKey('S'),
      d: this.input.keyboard.addKey('D')
    };

    // Escape to return to menu
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

    // Instructions
    this.add.text(baseX, worldHeight - 40, 'Arrow keys or WASD to walk • ESC to return', { fontSize: '12px', color: '#6f8fa6' }).setOrigin(0.5);
  }

  createGoldPile(x, y) {
    // Scale gold pile based on amount of gold
    const goldAmount = this.gold;
    const maxGold = 10000000;
    const scaleRatio = Math.max(0.3, Math.min(1, goldAmount / maxGold));
    const pileSize = 60 * scaleRatio;

    // Draw multiple circles to create a pile effect
    const colors = [0xffd700, 0xffa500, 0xffed4e];
    for (let i = 0; i < 3; i++) {
      const offsetY = (i - 1) * (pileSize / 2);
      const circle = this.add.circle(x, y + offsetY, pileSize - i * 8, colors[i]);
      circle.setStrokeStyle(1, 0x8b6f47, 0.6);
    }

    // Gold text display
    const goldText = this.add.text(x, y + pileSize + 50, `${this.formatGold(this.gold)}g`, {
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pulsing tween for gold
    this.tweens.add({
      targets: goldText,
      scale: { from: 1, to: 1.1 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });
  }

  createDock(x, y, direction, dockIndex) {
    const shipCount = this.ownedShips.length;
    const dockLength = 100 + (shipCount - 1) * 120;

    let dockX, dockY, isHorizontal;
    if (direction === 'north') {
      dockX = x;
      dockY = y;
      isHorizontal = true;
    } else if (direction === 'south') {
      dockX = x;
      dockY = y;
      isHorizontal = true;
    } else if (direction === 'east') {
      dockX = x;
      dockY = y;
      isHorizontal = false;
    } else {
      dockX = x;
      dockY = y;
      isHorizontal = false;
    }

    // Draw dock platform
    if (isHorizontal) {
      this.add.rectangle(dockX, dockY, dockLength, 60, 0x5c4a2f).setStrokeStyle(2, 0x8b6f47, 0.8);
    } else {
      this.add.rectangle(dockX, dockY, 60, dockLength, 0x5c4a2f).setStrokeStyle(2, 0x8b6f47, 0.8);
    }

    // Dock label
    this.add.text(dockX, dockY - (isHorizontal ? 45 : 65), `${direction.toUpperCase()} Dock`, {
      fontSize: '14px',
      color: '#ffe7b0'
    }).setOrigin(0.5);

    // Place ships on this dock
    this.ownedShips.forEach((shipKey, idx) => {
      let shipX, shipY;
      if (isHorizontal) {
        shipX = dockX - (dockLength / 2 - 70) + idx * 120;
        shipY = dockY;
      } else {
        shipX = dockX;
        shipY = dockY - (dockLength / 2 - 70) + idx * 120;
      }

      this.createShipSprite(shipX, shipY, shipKey);
    });
  }

  createShipSprite(x, y, shipKey) {
    const ship = SHIP_CLASSES[shipKey];
    if (!ship) return;

    // Draw simple ship silhouette
    const shipGroup = this.add.group();

    // Hull
    const hull = this.add.ellipse(x, y, 50, 80, 0x2a5f7f);
    hull.setStrokeStyle(2, 0x1a3d4d, 1);
    shipGroup.add(hull);

    // Sail
    const sail = this.add.triangle(x, y - 30, 0, -30, 0, 30, 35, 0, 0x9fc0d6);
    sail.setStrokeStyle(1, 0x5c7a8a, 0.8);
    shipGroup.add(sail);

    // Label with ship class and cargo
    const label = this.add.text(x, y + 60, `${ship.label}\n(Cargo: ${ship.cargo})`, {
      fontSize: '11px',
      color: '#eef8ff',
      align: 'center'
    }).setOrigin(0.5);
    shipGroup.add(label);

    // Make interactive for hover effect
    hull.setInteractive();
    hull.on('pointerover', () => {
      hull.setFillStyle(0x3a7f9f);
      label.setColor('#ffd700');
    });
    hull.on('pointerout', () => {
      hull.setFillStyle(0x2a5f7f);
      label.setColor('#eef8ff');
    });
  }

  formatGold(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toString();
  }

  update() {
    // Player movement
    const speed = 200;
    if (this.cursors.left.isDown || this.keys.a.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.keys.d.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown || this.keys.w.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.keys.s.isDown) {
      this.player.setVelocityY(speed);
    } else {
      this.player.setVelocityY(0);
    }
  }
}
