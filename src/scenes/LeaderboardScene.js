import Phaser from 'phaser';
import { fetchLeaderboard, calcFleetPower, CONFIGURED } from '../systems/LeaderboardSystem.js';
import { SHIP_CLASSES } from '../data/gddData.js';

const SHIP_ICON = { skiff: '⛵', brigantine: '🚢', galleon: '⚓', warship: '💀' };

function formatPower(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  init(data) {
    this.profile = data?.profile ?? null;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Dark background overlay
    this.add.rectangle(cx, height / 2, width, height, 0x03101a);

    // Header
    this.add.text(cx, 52, '⚓  FLEET LEADERBOARD  ⚓', {
      fontSize: '34px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(cx, 98, 'Global rankings — most powerful fleet wins', {
      fontSize: '16px', color: '#79b8e8'
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(cx, 120, width - 100, 2, 0x31526d);

    // Column headers
    const colY = 148;
    const cols = this._cols(width);
    this.add.text(cols.rank,    colY, 'RANK', { fontSize: '13px', color: '#9fc0d6', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cols.name,    colY, 'CAPTAIN', { fontSize: '13px', color: '#9fc0d6', fontStyle: 'bold' }).setOrigin(0);
    this.add.text(cols.power,   colY, 'FLEET POWER', { fontSize: '13px', color: '#9fc0d6', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cols.ships,   colY, 'SHIPS', { fontSize: '13px', color: '#9fc0d6', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cols.flagship, colY, 'FLAGSHIP', { fontSize: '13px', color: '#9fc0d6', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.rectangle(cx, 162, width - 100, 1, 0x31526d, 0.5);

    // Loading text — replaced once data arrives
    this.loadingText = this.add.text(cx, height / 2, 'Loading...', {
      fontSize: '20px', color: '#79b8e8'
    }).setOrigin(0.5);

    // Your score row at bottom
    if (this.profile) {
      const myPower = calcFleetPower(this.profile);
      const ships = (this.profile.ownedShips ?? ['skiff']).length;
      const flagship = this.profile.flagshipShip ?? 'skiff';
      this.add.rectangle(cx, height - 106, width - 80, 56, 0x0f2c44, 0.9).setStrokeStyle(2, 0x4a90e2, 0.8);
      this.add.text(cx, height - 118, 'YOUR FLEET', { fontSize: '12px', color: '#4a90e2', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx, height - 98, `Power: ${formatPower(myPower)}  •  Ships: ${ships}  •  Flagship: ${SHIP_CLASSES[flagship]?.label ?? flagship}`, {
        fontSize: '16px', color: '#c5e7ff', fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    if (!CONFIGURED) {
      this.add.rectangle(cx, height / 2 - 60, width - 80, 120, 0x1a0a0a, 0.95).setStrokeStyle(2, 0xff6b35, 0.8);
      this.add.text(cx, height / 2 - 80, '⚠ Firebase Not Configured', { fontSize: '18px', color: '#ff9f5a', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(cx, height / 2 - 50, [
        'To enable the global leaderboard:',
        '1. Go to console.firebase.google.com → Create Project',
        '2. Build → Realtime Database → Start in Test Mode',
        '3. Copy your DB URL into src/systems/LeaderboardSystem.js'
      ].join('\n'), { fontSize: '13px', color: '#ffd691', align: 'center', lineSpacing: 6 }).setOrigin(0.5);
      this.loadingText.destroy();
    }

    // Back button
    const backBtn = this.add.container(cx, height - 46);
    const btnBg = this.add.rectangle(0, 0, 200, 38, 0x193a56, 0.96).setStrokeStyle(2, 0xa7d8ff, 0.9);
    const btnTxt = this.add.text(0, 0, '← BACK TO MENU', { fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    backBtn.add([btnBg, btnTxt]);
    btnBg.setInteractive({ useHandCursor: true });
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x2a5f7f));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x193a56));
    btnBg.on('pointerdown', () => this.scene.start('MenuScene', { profile: this.profile }));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene', { profile: this.profile }));

    // Fetch and render
    if (CONFIGURED) {
      fetchLeaderboard().then(entries => this._renderEntries(entries, width, height));
    }
  }

  _cols(width) {
    const cx = width / 2;
    return {
      rank:     cx - 360,
      name:     cx - 300,
      power:    cx + 40,
      ships:    cx + 180,
      flagship: cx + 310
    };
  }

  _renderEntries(entries, width, height) {
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = null;
    }

    const cols = this._cols(width);
    const rowHeight = 42;
    const startY = 185;

    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    const bgColors   = [0x1a1200, 0x12121a, 0x110d0a];

    entries.forEach((entry, i) => {
      const rowY = startY + i * rowHeight;
      const isTop3 = i < 3;

      // Row background
      const rowBg = this.add.rectangle(width / 2, rowY + rowHeight / 2 - 4, width - 100, rowHeight - 4, isTop3 ? bgColors[i] : 0x081722, isTop3 ? 0.7 : 0.4);
      if (isTop3) rowBg.setStrokeStyle(1, isTop3 ? [0xffd700, 0xc0c0c0, 0xcd7f32][i] : 0x31526d, 0.5);

      // Rank medal
      const rankLabel = i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${entry.rank}`;
      this.add.text(cols.rank, rowY + rowHeight / 2 - 4, rankLabel, {
        fontSize: isTop3 ? '22px' : '16px',
        color: rankColors[i] ?? '#79b8e8'
      }).setOrigin(0.5);

      // Name
      this.add.text(cols.name, rowY + rowHeight / 2 - 4, entry.name ?? 'Unknown', {
        fontSize: '15px', color: isTop3 ? '#ffe7b0' : '#d8efff'
      }).setOrigin(0, 0.5);

      // Power (animated for top 3)
      const pwrText = this.add.text(cols.power, rowY + rowHeight / 2 - 4, formatPower(entry.power ?? 0), {
        fontSize: isTop3 ? '17px' : '15px',
        color: isTop3 ? '#ffd700' : '#c5e7ff',
        fontStyle: isTop3 ? 'bold' : 'normal'
      }).setOrigin(0.5);

      if (isTop3) {
        this.tweens.add({
          targets: pwrText,
          alpha: { from: 0.7, to: 1 },
          duration: 900 + i * 150,
          yoyo: true,
          repeat: -1
        });
      }

      // Ships count
      const shipIcon = SHIP_ICON[entry.flagship] ?? '⛵';
      this.add.text(cols.ships, rowY + rowHeight / 2 - 4, `${entry.ships ?? 1}`, {
        fontSize: '15px', color: '#9fc0d6'
      }).setOrigin(0.5);

      // Flagship icon
      this.add.text(cols.flagship, rowY + rowHeight / 2 - 4,
        `${shipIcon} ${SHIP_CLASSES[entry.flagship]?.label ?? entry.flagship ?? 'Skiff'}`, {
        fontSize: '14px', color: '#eef8ff'
      }).setOrigin(0.5);
    });

    if (entries.length === 0) {
      this.add.text(width / 2, 300, 'No scores yet — be the first!', {
        fontSize: '18px', color: '#79b8e8'
      }).setOrigin(0.5);
    }
  }
}
