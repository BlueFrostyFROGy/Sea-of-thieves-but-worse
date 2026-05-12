import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { OceanScene } from './scenes/OceanScene.js';
import { FleetScene } from './scenes/FleetScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#07131f',
  scene: [BootScene, MenuScene, OceanScene, FleetScene, LeaderboardScene],
  render: {
    antialias: true,
    pixelArt: false
  }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
