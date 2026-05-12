import Phaser from 'phaser';
import { SHIP_CLASSES } from '../data/gddData.js';
import { saveProfile } from '../systems/ProfileSystem.js';

export class FleetScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'FleetScene',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      }
    });
  }

  init(data) {
    try {
      this.profile = data?.profile ?? { ownedShips: ['skiff'], gold: 0, flagshipShip: 'skiff' };
      this.ownedShips = data?.ownedShips ?? this.profile.ownedShips ?? ['skiff'];
      this.gold = data?.gold ?? this.profile.gold ?? 0;
      console.log('FleetScene init:', { ownedShips: this.ownedShips, gold: this.gold });
    } catch (e) {
      console.error('FleetScene init error:', e);
      this.ownedShips = ['skiff'];
      this.gold = 0;
    }
  }

  create() {
    try {
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

      // UI Panel for selected ship (fixed to screen)
      this.createSelectionPanel();

      // Escape to return to menu
      this.input.keyboard.on('keydown-ESC', () => {
        console.log('ESC pressed, returning to menu');
        this.scene.start('MenuScene', { profile: this.profile });
      });

      // Instructions
      this.add.text(baseX, worldHeight - 40, 'Arrow keys or WASD to walk • Click a ship • ESC to return', { fontSize: '12px', color: '#6f8fa6' }).setOrigin(0.5);

      // Track selected ship
      this.selectedShipIndex = null;
      console.log('FleetScene created successfully');
    } catch (e) {
      console.error('FleetScene create error:', e);
      // Fallback: return to menu
      this.scene.start('MenuScene');
    }
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

      this.createShipSprite(shipX, shipY, shipKey, idx);
    });
  }

  createShipSprite(x, y, shipKey, shipIndex) {
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
      if (this.selectedShipIndex !== shipIndex) {
        hull.setFillStyle(0x2a5f7f);
        label.setColor('#eef8ff');
      }
    });
    
    // Click to select ship
    hull.on('pointerdown', () => {
      this.selectShip(shipIndex, shipKey, ship);
      hull.setFillStyle(0x4aaf2f);
      label.setColor('#ffd700');
    });
  }

  selectShip(shipIndex, shipKey, ship) {
    this.selectedShipIndex = shipIndex;
    this.selectedShipKey = shipKey;
    this.updateSelectionPanel(ship);
  }

  createSelectionPanel() {
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Panel background
    const panelBg = this.add.rectangle(20 + 140, height - 80, 280, 160, 0x081722, 0.95);
    panelBg.setStrokeStyle(2, 0x31526d, 0.8);
    panelBg.setScrollFactor(0, 0); // Fixed to screen
    panelBg.setDepth(100);

    this.selectionPanel = {
      bg: panelBg,
      title: this.add.text(20 + 140, height - 150, 'Click a ship', { fontSize: '14px', color: '#ffe7b0', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0, 0).setDepth(101),
      stats: this.add.text(20 + 140, height - 110, '', { fontSize: '12px', color: '#eef8ff' }).setOrigin(0.5).setScrollFactor(0, 0).setDepth(101),
      buttons: {
        sail: this.createFixedButton(20 + 60, height - 55, 110, 30, 'SET SAIL', () => {
          if (this.selectedShipKey !== undefined) {
            this.sailShip();
          }
        }).setScrollFactor(0, 0).setDepth(101),
        flagship: this.createFixedButton(20 + 220, height - 55, 110, 30, 'SET FLAGSHIP', () => {
          if (this.selectedShipKey !== undefined) {
            this.setFlagship();
          }
        }).setScrollFactor(0, 0).setDepth(101)
      }
    };
  }

  createFixedButton(x, y, width, height, label, callback) {
    const bg = this.add.rectangle(x, y, width, height, 0x1f4762, 0.9).setStrokeStyle(1, 0x4a90e2, 0.9);
    const text = this.add.text(x, y, label, { fontSize: '11px', color: '#c5e7ff', fontStyle: 'bold' }).setOrigin(0.5);
    
    bg.setInteractive();
    bg.on('pointerover', () => {
      bg.setFillStyle(0x2a5f7f, 0.95);
      text.setColor('#ffffff');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1f4762, 0.9);
      text.setColor('#c5e7ff');
    });
    bg.on('pointerdown', () => {
      callback();
    });
    
    return bg;
  }

  updateSelectionPanel(ship) {
    this.selectionPanel.title.setText(ship.label);
    const statsText = `Hull: ${ship.hp}  •  Cannons: ${ship.cannons}\nCargo: ${ship.cargo}  •  Price: ${ship.cost}g`;
    this.selectionPanel.stats.setText(statsText);
  }

  sailShip() {
    if (this.selectedShipKey === undefined) return;
    // Return to menu
    this.scene.start('MenuScene', { profile: this.profile });
  }

  setFlagship() {
    if (this.selectedShipKey === undefined) return;
    this.profile.flagshipShip = this.selectedShipKey;
    saveProfile(this.profile);
    this.selectionPanel.title.setText(`${SHIP_CLASSES[this.selectedShipKey].label} (Flagship)`);
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
