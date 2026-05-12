import Phaser from 'phaser';
import { SHIP_CLASSES } from '../data/gddData.js';
import { saveProfile } from '../systems/ProfileSystem.js';
import { submitScore } from '../systems/LeaderboardSystem.js';

export class FleetScene extends Phaser.Scene {
  constructor() {
    super('FleetScene');
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
      const shipSpacing = 340; // px between ship centers along each dock
      const islandRadius = 220;

      // World size: big enough to hold all ships on the longest dock
      const maxPerDock = Math.ceil(this.ownedShips.length / 4);
      const pierLength = Math.max(700, maxPerDock * shipSpacing + 300);
      const worldSize = Math.max(3200, (islandRadius + pierLength) * 2 + 600);

      this.worldWidth = worldSize;
      this.worldHeight = worldSize;

      const cx = worldSize / 2;
      const cy = worldSize / 2;

      // Background ocean
      this.add.rectangle(cx, cy, worldSize, worldSize, 0x1a3d4d);
      this.add.rectangle(cx, cy, worldSize - 40, worldSize - 40, 0x0f2834).setStrokeStyle(2, 0x2a7f62, 0.8);

      // Central island — circle
      this.add.circle(cx, cy, islandRadius + 10, 0x2a6e4a); // grass ring
      this.add.circle(cx, cy, islandRadius, 0xc2a96e);       // sand
      this.add.circle(cx, cy, islandRadius - 30, 0xb89658);  // inner sand

      // Base building on island
      this.add.rectangle(cx, cy, 110, 110, 0x3d2817).setStrokeStyle(3, 0x5c4a2f, 1);
      this.add.text(cx, cy - islandRadius - 24, 'Fleet Base', { fontSize: '20px', color: '#ffe7b0', fontStyle: 'bold' }).setOrigin(0.5);

      // Gold pile on island
      this.createGoldPile(cx, cy);

      // Distribute ships across 4 docks (round-robin)
      const dockBuckets = [[], [], [], []];
      this.ownedShips.forEach((shipKey, index) => {
        dockBuckets[index % 4].push({ shipKey, index });
      });

      // Draw four straight piers + ships
      this.createDock(cx, cy, islandRadius, 'north',  dockBuckets[0], pierLength, shipSpacing);
      this.createDock(cx, cy, islandRadius, 'south',  dockBuckets[1], pierLength, shipSpacing);
      this.createDock(cx, cy, islandRadius, 'east',   dockBuckets[2], pierLength, shipSpacing);
      this.createDock(cx, cy, islandRadius, 'west',   dockBuckets[3], pierLength, shipSpacing);

      // Player avatar
      this.player = this.add.rectangle(cx, cy + islandRadius + 30, 28, 38, 0x4a90e2).setDepth(10);
      this.playerX = cx;
      this.playerY = cy + islandRadius + 30;
      this.playerSpeed = 6;

      // Camera
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.cameras.main.setZoom(0.75);
      this.cameras.main.setBounds(0, 0, worldSize, worldSize);

      // Input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = {
        w: this.input.keyboard.addKey('W'),
        a: this.input.keyboard.addKey('A'),
        s: this.input.keyboard.addKey('S'),
        d: this.input.keyboard.addKey('D')
      };

      this.createSelectionPanel();

      this.input.keyboard.on('keydown-ESC', () => {
        this.scene.start('MenuScene', { profile: this.profile });
      });

      this.add.text(cx, worldSize - 40, 'Arrow keys or WASD to walk  •  Click a ship  •  ESC to return', { fontSize: '12px', color: '#6f8fa6' }).setOrigin(0.5);

      this.selectedShipIndex = null;
      console.log('FleetScene created successfully');

      // Submit fleet power to global leaderboard (fire-and-forget)
      submitScore(this.profile).catch(() => {});
    } catch (e) {
      console.error('FleetScene create error:', e);
      this.scene.start('MenuScene');
    }
  }

  createGoldPile(x, y) {
    // Scale gold pile based on amount of gold
    const goldAmount = this.gold;
    const maxGold = 10000000;
    const scaleRatio = Math.max(0.3, Math.min(1, goldAmount / maxGold));
    const pileSize = 60 * scaleRatio;

    // Glow halos
    const haloOuter = this.add.circle(x, y, pileSize * 1.9, 0xffd45a, 0.22).setBlendMode(Phaser.BlendModes.ADD);
    const haloInner = this.add.circle(x, y, pileSize * 1.2, 0xfff1a6, 0.28).setBlendMode(Phaser.BlendModes.ADD);

    // Draw multiple circles to create a pile effect
    const colors = [0xffd700, 0xffa500, 0xffed4e];
    const coins = [];
    for (let i = 0; i < 3; i++) {
      const offsetY = (i - 1) * (pileSize / 2);
      const circle = this.add.circle(x, y + offsetY, pileSize - i * 8, colors[i]);
      circle.setStrokeStyle(1, 0x8b6f47, 0.6);
      coins.push(circle);
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
      scale: { from: 1, to: 1.2 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    this.tweens.add({
      targets: [haloOuter, haloInner],
      alpha: { from: 0.18, to: 0.42 },
      scale: { from: 1, to: 1.12 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    this.tweens.add({
      targets: coins,
      duration: 700,
      yoyo: true,
      repeat: -1,
      alpha: { from: 0.88, to: 1 }
    });
  }

  getShipVisualScale(shipKey) {
    return {
      skiff: 2.5,
      brigantine: 3.2,
      galleon: 4.0,
      warship: 4.8
    }[shipKey] ?? 2.5;
  }

  createDock(cx, cy, islandRadius, direction, shipsOnDock = [], pierLength = 700, shipSpacing = 340) {
    const pierWidth = 72;
    // How far from pier centreline ships are offset (so they don't sit ON the walkway)
    const shipOffset = 210;

    // Pier start = island edge; pier extends outward
    let pierX, pierY, pierW, pierH, labelX, labelY, labelAnchorY;

    if (direction === 'north') {
      const pierTop = cy - islandRadius - pierLength;
      pierX = cx;
      pierY = pierTop + pierLength / 2;
      pierW = pierWidth;
      pierH = pierLength;
      labelX = cx;
      labelY = pierTop - 22;
      labelAnchorY = 1;
    } else if (direction === 'south') {
      const pierTop = cy + islandRadius;
      pierX = cx;
      pierY = pierTop + pierLength / 2;
      pierW = pierWidth;
      pierH = pierLength;
      labelX = cx;
      labelY = pierTop + pierLength + 22;
      labelAnchorY = 0;
    } else if (direction === 'east') {
      const pierLeft = cx + islandRadius;
      pierX = pierLeft + pierLength / 2;
      pierY = cy;
      pierW = pierLength;
      pierH = pierWidth;
      labelX = pierLeft + pierLength + 22;
      labelY = cy;
      labelAnchorY = 0.5;
    } else { // west
      const pierRight = cx - islandRadius;
      pierX = pierRight - pierLength / 2;
      pierY = cy;
      pierW = pierLength;
      pierH = pierWidth;
      labelX = pierRight - pierLength - 22;
      labelY = cy;
      labelAnchorY = 0.5;
    }

    // Draw pier plank
    this.add.rectangle(pierX, pierY, pierW, pierH, 0x5c4a2f).setStrokeStyle(2, 0x8b6f47, 0.9);
    // Plank lines for texture
    if (pierW > pierH) { // horizontal pier
      for (let lx = pierX - pierW / 2 + 60; lx < pierX + pierW / 2 - 20; lx += 60) {
        this.add.rectangle(lx, pierY, 3, pierH - 8, 0x4a3820, 0.5);
      }
    } else { // vertical pier
      for (let ly = pierY - pierH / 2 + 60; ly < pierY + pierH / 2 - 20; ly += 60) {
        this.add.rectangle(pierX, ly, pierW - 8, 3, 0x4a3820, 0.5);
      }
    }

    // Label
    this.add.text(labelX, labelY, `${direction.toUpperCase()} DOCK`, {
      fontSize: '14px', color: '#ffe7b0', fontStyle: 'bold'
    }).setOrigin(0.5, labelAnchorY);

    if (shipsOnDock.length === 0) return;

    // Distribute ships evenly along the pier, offset to one side
    const total = shipsOnDock.length;
    const usedLength = (total - 1) * shipSpacing;
    const startOffset = -usedLength / 2;

    shipsOnDock.forEach(({ shipKey, index }, idx) => {
      const pos = startOffset + idx * shipSpacing;
      let shipX, shipY;

      if (direction === 'north' || direction === 'south') {
        // Vertical pier – ships placed to the east side
        shipX = cx + shipOffset;
        // Map pos along the pier centre
        shipY = pierY + pos;
      } else {
        // Horizontal pier – ships placed to the south side
        shipX = pierX + pos;
        shipY = cy + shipOffset;
      }

      this.createShipSprite(shipX, shipY, shipKey, index);
    });
  }

  createShipSprite(x, y, shipKey, shipIndex) {
    const ship = SHIP_CLASSES[shipKey];
    if (!ship) return;

    // Use same ship scaling as OceanScene
    const shipVisualScale = this.getShipVisualScale(shipKey);

    const shipContainer = this.add.container(x, y).setDepth(5);

    // Hull
    const hull = this.add.rectangle(0, 0, 84 * shipVisualScale, 32 * shipVisualScale, 0x8a5b35);
    
    // Deck
    const deck = this.add.rectangle(-8 * shipVisualScale, 0, 54 * shipVisualScale, 18 * shipVisualScale, 0x9a6a40);
    
    // Bow (pointy front)
    const bow = this.add.triangle(44 * shipVisualScale, 0, 0, -16 * shipVisualScale, 30 * shipVisualScale, 0, 0, 16 * shipVisualScale, 0xbe8b5f);
    
    // Rails
    const railTop = this.add.rectangle(0, -14 * shipVisualScale, 74 * shipVisualScale, 3 * shipVisualScale, 0x4f2f1d);
    const railBottom = this.add.rectangle(0, 14 * shipVisualScale, 74 * shipVisualScale, 3 * shipVisualScale, 0x4f2f1d);

    shipContainer.add([hull, deck, bow, railTop, railBottom]);

    // Label with ship class and cargo
    const label = this.add.text(x, y + 50 * shipVisualScale, `${ship.label}\n(Cargo: ${ship.cargo})`, {
      fontSize: '12px',
      color: '#eef8ff',
      align: 'center'
    }).setOrigin(0.5).setDepth(5);

    // Make interactive for click
    const hitZone = this.add.rectangle(x, y, 100 * shipVisualScale, 80 * shipVisualScale, 0x000000, 0);
    hitZone.setInteractive();
    
    hitZone.on('pointerover', () => {
      hull.setFillStyle(0xaa7b55);
      label.setColor('#ffd700');
    });
    hitZone.on('pointerout', () => {
      if (this.selectedShipIndex !== shipIndex) {
        hull.setFillStyle(0x8a5b35);
        label.setColor('#eef8ff');
      }
    });
    
    // Click to select ship
    hitZone.on('pointerdown', () => {
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
      buySkiffText: this.add.text(20 + 140, height - 85, `Buy Extra Skiff: ${SHIP_CLASSES.skiff.cost}g`, { fontSize: '11px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0, 0).setDepth(101),
      buttons: {
        sail: this.createFixedButton(20 + 20, height - 55, 80, 30, 'SET SAIL', () => {
          if (this.selectedShipKey !== undefined) {
            this.sailShip();
          }
        }).setScrollFactor(0, 0).setDepth(101),
        flagship: this.createFixedButton(20 + 105, height - 55, 80, 30, 'FLAGSHIP', () => {
          if (this.selectedShipKey !== undefined) {
            this.setFlagship();
          }
        }).setScrollFactor(0, 0).setDepth(101),
        buySkiff: this.createFixedButton(20 + 190, height - 55, 90, 30, 'BUY SKIFF', () => {
          this.buyExtraSkiff();
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

  buyExtraSkiff() {
    const skiffCost = SHIP_CLASSES.skiff.cost;
    if (this.profile.gold < skiffCost) {
      this.selectionPanel.title.setText(`Need ${skiffCost}g to buy a skiff!`);
      return;
    }
    this.profile.gold -= skiffCost;
    this.profile.ownedShips = [...(this.profile.ownedShips ?? []), 'skiff'];
    saveProfile(this.profile);
    this.selectionPanel.title.setText('Skiff Purchased!');
    // Reload scene to show new ship
    setTimeout(() => this.scene.restart(), 1000);
  }

  formatGold(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toString();
  }

  update() {
    // Simple player movement without physics
    const worldWidth = this.worldWidth ?? 4200;
    const worldHeight = this.worldHeight ?? 4200;
    const minX = 50;
    const maxX = worldWidth - 50;
    const minY = 50;
    const maxY = worldHeight - 50;

    if (this.cursors.left.isDown || this.keys.a.isDown) {
      this.playerX = Math.max(minX, this.playerX - this.playerSpeed);
    }
    if (this.cursors.right.isDown || this.keys.d.isDown) {
      this.playerX = Math.min(maxX, this.playerX + this.playerSpeed);
    }
    if (this.cursors.up.isDown || this.keys.w.isDown) {
      this.playerY = Math.max(minY, this.playerY - this.playerSpeed);
    }
    if (this.cursors.down.isDown || this.keys.s.isDown) {
      this.playerY = Math.min(maxY, this.playerY + this.playerSpeed);
    }

    this.player.setPosition(this.playerX, this.playerY);
  }
}
