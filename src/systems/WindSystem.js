import Phaser from 'phaser';
import { WEATHER_STATES } from '../data/gddData.js';

export class WindSystem {
  constructor(scene) {
    this.scene = scene;
    this.angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.speed = 1;
    this.rotationRate = (Math.PI * 2) / (20 * 60);
    this.weather = WEATHER_STATES[0];
    this.nextWeatherChange = 35;
    this.elapsed = 0;
  }

  update(deltaSec) {
    this.elapsed += deltaSec;
    this.angle += this.rotationRate * deltaSec;

    if (this.elapsed >= this.nextWeatherChange) {
      this.elapsed = 0;
      this.nextWeatherChange = Phaser.Math.Between(25, 45);
      this.weather = Phaser.Utils.Array.GetRandom(WEATHER_STATES);
      this.scene.events.emit('weather-changed', this.weather);
    }
  }

  getRelativeEfficiency(headingRadians) {
    const diff = Phaser.Math.Angle.Wrap(headingRadians - this.angle);
    const normalized = Math.cos(diff);
    const windFactor = Phaser.Math.Clamp((normalized + 1) / 2, 0.3, 1);
    return windFactor * this.weather.speedMult;
  }
}
