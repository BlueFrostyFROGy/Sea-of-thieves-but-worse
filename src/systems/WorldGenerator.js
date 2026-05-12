import Phaser from 'phaser';
import { ZONES } from '../data/gddData.js';

export class WorldGenerator {
  constructor(seed = Date.now()) {
    this.random = new Phaser.Math.RandomDataGenerator([String(seed)]);
  }

  buildWorld() {
    const islands = [];
    const outposts = [];

    ZONES.forEach((zone, zoneIndex) => {
      const islandCount = 10 + zoneIndex * 3;
      for (let i = 0; i < islandCount; i++) {
        const isOutpost = i === 0 || (zoneIndex === 0 && i < 3);
        const r = this.random.between(100, 220);
        const minGap = r + 240; // minimum edge-to-edge clearance

        let x, y, attempts = 0;
        do {
          x = this.random.between(zone.xMin + 120, zone.xMax - 120);
          y = this.random.between(300, 4300);
          attempts++;
        } while (
          attempts < 20 &&
          islands.some(existing => Phaser.Math.Distance.Between(x, y, existing.x, existing.y) < existing.radius + minGap)
        );

        const island = {
          id: `${zone.key}_${i}`,
          zone: zone.key,
          x,
          y,
          radius: r,
          type: isOutpost ? 'outpost' : this.rollIslandType(zoneIndex),
          discovered: false,
          looted: false
        };

        islands.push(island);
        if (isOutpost) outposts.push(island);
      }
    });

    // Guarantee a clear starter outpost near spawn waters so selling is always accessible.
    if (outposts.length > 0) {
      outposts[0].x = 620;
      outposts[0].y = 860;
      outposts[0].radius = Math.max(outposts[0].radius, 180);
    }
    for (const outpost of outposts) {
      outpost.radius = Math.max(outpost.radius, 150);
    }

    return { islands, outposts, width: 8200, height: 4600 };
  }

  rollIslandType(zoneIndex) {
    const pools = [
      ['treasure', 'resource', 'settlement', 'outpost', 'seafort'],
      ['treasure', 'treasure', 'shipwreck', 'ghost', 'resource', 'outpost', 'seafort'],
      ['treasure', 'skullfort', 'shipwreck', 'ghost', 'outpost', 'seafort'],
      ['ghost', 'skullfort', 'treasure', 'shipwreck', 'outpost', 'seafort']
    ];
    const pool = pools[Math.min(zoneIndex, pools.length - 1)];
    return pool[this.random.between(0, pool.length - 1)];
  }
}
