import Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { WindSystem } from '../systems/WindSystem.js';
import { WorldGenerator } from '../systems/WorldGenerator.js';
import { NetworkClient } from '../systems/NetworkClient.js';
import { FACTIONS, SHIP_CLASSES, SHIP_UPGRADES, ZONES } from '../data/gddData.js';

export class OceanScene extends Phaser.Scene {
  constructor() {
    super('OceanScene');
    this.sceneFailed = false;
  }

  init(data) {
    const payload = data ?? {};
    this.shipType = SHIP_CLASSES[payload.shipType] ? payload.shipType : 'skiff';
    this.faction = FACTIONS[payload.faction] ? payload.faction : 'saltwind';
    this.profile = payload.profile ?? null;
    this.crewCount = payload.crewCount ?? 1;
    this.crewRole = payload.crewRole ?? 'helmsman';
    this.openCrew = payload.openCrew ?? true;
    this.crewName = payload.crewName ?? 'Open Crew';
    this.networkUrl = payload.networkUrl ?? null;
    this.networkCrewId = payload.networkCrewId ?? null;
    this.networkPlayerName = payload.networkPlayerName ?? null;
    this.isNetworkSession = Boolean(payload.isNetworkSession);
    this.sceneFailed = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a2a43');
    try {
      this.world = new WorldGenerator().buildWorld();
      this.state = new GameState(this, this.shipType, this.faction, this.profile, this.crewCount, this.crewRole);
      this.wind = new WindSystem(this);

      this.createMap();
      this.createIslandDetails();
      this.createPlayerShip();
      this.createEnemies();
      this.createLandAndBoardingSystems();
      this.createInput();
      this.createHud();
      this.bindEvents();
      this.setupNetworking();

      this.daySeconds = 0;
      this.toastTimer = 0;
      this.toastText = '';
      this.parryWindow = 0;
      this.meleeCooldown = 0;
      this.jumpCooldown = 0;
      this.waterWarnCooldown = 0;
      this.lootInteractCooldown = 0;
    } catch (error) {
      this.sceneFailed = true;
      this.reportSceneError(error, 'startup');
      this.time.delayedCall(1800, () => this.scene.start('MenuScene'));
    }
  }

  setupNetworking() {
    this.network = null;
    this.remoteShipSprites = new Map();
    this.networkEnabled = false;

    const params = new URLSearchParams(window.location.search);
    const shouldConnect = this.isNetworkSession || params.get('net') === '1';
    if (!shouldConnect) return;

    this.networkEnabled = true;
    this.network = new NetworkClient(this.networkUrl ?? params.get('ws') ?? 'ws://localhost:2567');
    this.network.onSnapshot = (snapshot) => this.applyNetworkSnapshot(snapshot);
    this.network.onSessionWarning = (msg) => this.pushToast(msg.message);
    this.network.onSessionReset = (msg) => this.pushToast(msg.message);
    this.network.onCrewUpdate = (msg) => {
      const crew = msg?.crew;
      if (!crew) return this.pushToast('Crew roster updated.');
      this.pushToast(`Crew updated: ${crew.name} is now ${crew.openCrew ? 'Open' : 'Closed'}.`);
    };

    this.network.connect({
      name: this.networkPlayerName ?? 'LocalCaptain',
      shipType: this.shipType,
      crewId: this.networkCrewId ?? this.faction,
      role: this.state.crewRole,
      openCrew: this.openCrew,
      crewName: this.crewName
    }).then(() => {
      this.pushToast('Connected to authoritative server.');
    }).catch(() => {
      this.networkEnabled = false;
      this.pushToast('Server connection failed. Continuing offline.');
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.network?.disconnect());
  }

  createMap() {
    this.cameras.main.setBounds(0, 0, this.world.width, this.world.height);

    this.add.rectangle(this.world.width / 2, this.world.height / 2, this.world.width, this.world.height, 0x0a2a43);

    for (const zone of ZONES) {
      this.add.rectangle((zone.xMin + zone.xMax) / 2, this.world.height / 2, zone.xMax - zone.xMin, this.world.height, zone.color, 0.14);
    }

    this.islandGraphics = this.add.graphics();
    this.redrawIslands();

    this.nightOverlay = this.add.rectangle(
      this.world.width / 2,
      this.world.height / 2,
      this.world.width,
      this.world.height,
      0x020716,
      0
    ).setDepth(50);

    this.createChartOverlay();
  }

  reportSceneError(error, phase) {
    this.sceneFailed = true;
    console.error(`OceanScene ${phase} failed:`, error);
    if (this.loadingText) this.loadingText.destroy();
    if (this.loadingBackdrop) this.loadingBackdrop.destroy();
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x12070a, 0.95).setDepth(2000).setScrollFactor(0);
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, 'Voyage failed to launch', { fontSize: '26px', color: '#ffd1d1', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 28, String(error?.message ?? error), { fontSize: '16px', color: '#ffe9e9', align: 'center', wordWrap: { width: Math.min(760, this.scale.width - 80) } }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
  }

  createChartOverlay() {
    this.chartVisible = false;
    this.chartContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(120).setVisible(false);
    const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x01060e, 0.86).setOrigin(0, 0);
    const title = this.add.text(24, 16, 'Chart Table — The Shattered Meridian', { fontSize: '20px', color: '#d7efff' });
    this.chartText = this.add.text(24, 52, '', { fontSize: '15px', color: '#a8d0ee', lineSpacing: 6 });
    this.chartContainer.add([bg, title, this.chartText]);
  }

  redrawIslands() {
    const palette = {
      outpost: 0xd9b785,
      treasure: 0x4b8c4f,
      resource: 0x8ccf77,
      settlement: 0x94806d,
      shipwreck: 0x5f6c75,
      ghost: 0x8f7eb7,
      skullfort: 0x7a3e3e,
      seafort: 0x606870
    };

    this.islandGraphics.clear();
    for (const island of this.world.islands) {
      this.islandGraphics.fillStyle(palette[island.type] ?? 0x88aa88, 1);
      this.islandGraphics.fillCircle(island.x, island.y, island.radius);
      this.islandGraphics.lineStyle(2, 0x000000, 0.35);
      this.islandGraphics.strokeCircle(island.x, island.y, island.radius);
    }
  }

  resolveLootTierForSource(sourceType) {
    if (sourceType === 'bossVault') {
      return Phaser.Math.FloatBetween(0, 1) < 0.45 ? 'legendaryRelics' : 'warlordsVaults';
    }
    if (sourceType === 'seafortVault' || sourceType === 'skullfort') {
      return Phaser.Math.FloatBetween(0, 1) < 0.18 ? 'legendaryRelics' : 'warlordsVaults';
    }
    if (sourceType === 'ghost') return Phaser.Math.FloatBetween(0, 1) < 0.35 ? 'warlordsVaults' : 'captainsPlunder';
    if (sourceType === 'shipwreck') return Phaser.Math.FloatBetween(0, 1) < 0.2 ? 'warlordsVaults' : 'captainsPlunder';
    if (sourceType === 'treasure') return Phaser.Math.FloatBetween(0, 1) < 0.55 ? 'captainsPlunder' : 'driftwoodFinds';
    return 'driftwoodFinds';
  }

  createLootNodeAt(x, y, { zone, sourceType, islandId, requiresDive = false, valueMult = 1, tier = null } = {}) {
    const resolvedTier = tier ?? this.resolveLootTierForSource(sourceType);
    const style = this.getLootTierStyle(resolvedTier);
    const chestBase = this.add.rectangle(x, y + 5, 20, 12, style.base).setDepth(7);
    const chestLid = this.add.rectangle(x, y - 1, 20, 7, style.lid).setDepth(8);
    const chestLock = this.add.rectangle(x, y + 2, 5, 5, style.lock).setDepth(8.2);
    const chestSparkle = this.add.circle(x + 11, y - 9, 3, 0xffe8a8, 0.85).setDepth(9);
    const sprites = [chestBase, chestLid, chestSparkle, chestLock];

    if (resolvedTier === 'legendaryRelics') {
      const aura = this.add.circle(x, y - 1, 16, style.glow ?? 0xb46dff, 0.34).setDepth(6.9);
      this.tweens.add({ targets: aura, alpha: { from: 0.18, to: 0.52 }, yoyo: true, repeat: -1, duration: 900 });
      sprites.push(aura);
    }

    const node = {
      x,
      y,
      taken: false,
      zone,
      sourceType,
      islandId,
      requiresDive,
      valueMult,
      treasureTier: resolvedTier,
      sprites
    };
    this.lootNodes.push(node);
    return node;
  }

  findNearestSupplyBarrel(maxDist, fromX = this.playerPawn.x, fromY = this.playerPawn.y) {
    let nearest = null;
    let best = maxDist;
    for (const barrel of this.supplyBarrels ?? []) {
      if (!barrel || barrel.used) continue;
      const d = Phaser.Math.Distance.Between(fromX, fromY, barrel.x, barrel.y);
      if (d < best) {
        best = d;
        nearest = barrel;
      }
    }
    return nearest;
  }

  createIslandDetails() {
    this.lootNodes = [];
    this.supplyBarrels = [];
    this.seafortStates = new Map();

    for (const island of this.world.islands) {
      island.buildings = [];
      island.vegetation = [];

      // --- Buildings (min-distance spaced) ---
      const buildingCount = island.type === 'outpost' ? 6 : island.type === 'settlement' ? 5 : island.type === 'seafort' ? 3 : 3;
      const placedB = [];
      for (let attempt = 0; attempt < buildingCount * 10 && placedB.length < buildingCount; attempt++) {
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const d = Phaser.Math.Between(Math.floor(island.radius * 0.2), Math.max(25, Math.floor(island.radius * 0.65)));
        const bx = island.x + Math.cos(a) * d;
        const by = island.y + Math.sin(a) * d;
        if (placedB.some(p => Phaser.Math.Distance.Between(p.x, p.y, bx, by) < 44)) continue;
        placedB.push({ x: bx, y: by });
        const w = Phaser.Math.Between(22, 42);
        const h = Phaser.Math.Between(18, 32);
        const color = island.type === 'outpost' ? 0x7f5f3e : island.type === 'seafort' ? 0x5a5a5a : 0x6c5037;
        const roofColor = island.type === 'seafort' ? 0x3a3a3a : 0x583622;
        const building = this.add.rectangle(bx, by, w, h, color).setDepth(6);
        const roof = this.add.triangle(bx, by - h * 0.5 - 2, -w * 0.55, 0, w * 0.55, 0, 0, -10, roofColor).setDepth(6.1);
        const door = this.add.rectangle(bx, by + h * 0.22, Math.max(6, w * 0.25), Math.max(7, h * 0.38), 0x3b2518).setDepth(6.2);
        island.buildings.push(building, roof, door);
      }

      // --- Vegetation (min-distance spaced) ---
      const treeCount = island.type === 'outpost' ? 8 : island.type === 'seafort' ? 4 : 14;
      const placedT = [];
      for (let attempt = 0; attempt < treeCount * 12 && placedT.length < treeCount; attempt++) {
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const d = Phaser.Math.Between(Math.floor(island.radius * 0.15), island.radius - 12);
        const tx = island.x + Math.cos(a) * d;
        const ty = island.y + Math.sin(a) * d;
        if (placedT.some(p => Phaser.Math.Distance.Between(p.x, p.y, tx, ty) < 32)) continue;
        placedT.push({ x: tx, y: ty });
        const trunk = this.add.rectangle(tx, ty + 5, 5, 12, 0x5a3c24).setDepth(5.8);
        const leaves = this.add.circle(tx, ty - 4, Phaser.Math.Between(9, 16), 0x2f7a3c).setDepth(5.9);
        island.vegetation.push(trunk, leaves);
      }

      // --- Supply barrels ---
      const barrelCount = island.type === 'outpost' ? 3 : Phaser.Math.Between(1, 2);
      for (let b = 0; b < barrelCount; b++) {
        const ba = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const bd = Phaser.Math.Between(Math.floor(island.radius * 0.2), Math.max(20, Math.floor(island.radius * 0.72)));
        const bx = island.x + Math.cos(ba) * bd;
        const by = island.y + Math.sin(ba) * bd;
        const barrelBody = this.add.circle(bx, by + 1, 7, 0x6a3c24).setDepth(7);
        const barrelBand1 = this.add.rectangle(bx, by - 3, 12, 2, 0x2a2a2a).setDepth(7.1);
        const barrelBand2 = this.add.rectangle(bx, by + 4, 12, 2, 0x2a2a2a).setDepth(7.1);
        const barrelTop = this.add.circle(bx, by - 6, 6, 0x84502f).setDepth(7.15);
        const barrel = { x: bx, y: by, islandId: island.id, used: false, sprites: [barrelBody, barrelBand1, barrelBand2, barrelTop] };
        this.supplyBarrels.push(barrel);
        island.buildings.push(...barrel.sprites);
      }

      // --- Outpost: npc seller + flag + pier ---
      if (island.type === 'outpost') {
        const px = island.x + Phaser.Math.Between(-20, 20);
        const py = island.y - island.radius * 0.35;
        const pole = this.add.rectangle(px, py - 18, 3, 36, 0x8b7355).setDepth(7);
        const flag = this.add.triangle(px + 2, py - 34, 0, 0, 26, 8, 0, 16, island.type === 'outpost' ? 0xffd700 : 0x56d9c6).setDepth(7.1);
        const poleBase = this.add.rectangle(px, py, 7, 7, 0x8b7355).setDepth(7);
        const sign = this.add.rectangle(px + 30, py - 18, 28, 14, 0xd4a055).setDepth(7.2);
        const signText = this.add.text(px + 18, py - 25, 'OUTPOST', { fontSize: '8px', color: '#1a0a00' }).setDepth(7.3);
        const npcBase = this.add.circle(island.x, island.y, 10, 0x3a2218).setDepth(7.4);
        const npcBody = this.add.rectangle(island.x, island.y + 1, 10, 16, 0x7b4c2a).setDepth(7.5);
        const npcHead = this.add.circle(island.x, island.y - 11, 5, 0xf1c7a0).setDepth(7.6);
        const npcHat = this.add.rectangle(island.x, island.y - 15, 11, 4, 0x283a4b).setDepth(7.7);
        const npcDialog = this.add.text(island.x - 18, island.y - 28, 'SELL', { fontSize: '9px', color: '#1a0a00' }).setDepth(7.8);
        const pierDir = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const pier1 = this.add.rectangle(
          island.x + Math.cos(pierDir) * (island.radius + 14),
          island.y + Math.sin(pierDir) * (island.radius + 14),
          12, 44, 0x8b7355, 0.9
        ).setDepth(5).setRotation(pierDir + Math.PI / 2);

        const chestAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const chestDist = Phaser.Math.Between(Math.floor(island.radius * 0.2), Math.max(24, Math.floor(island.radius * 0.55)));
        const chestX = island.x + Math.cos(chestAngle) * chestDist;
        const chestY = island.y + Math.sin(chestAngle) * chestDist;
        island.lootNode = this.createLootNodeAt(chestX, chestY, {
          zone: island.zone,
          sourceType: island.type,
          islandId: island.id,
          requiresDive: false
        });

        island.outpostNpc = { x: island.x, y: island.y, sprite: npcBody };
        island.buildings.push(pole, flag, poleBase, sign, signText, npcBase, npcBody, npcHead, npcHat, npcDialog, pier1);
        continue;
      }

      // --- Sea Fort: stone walls + vault ---
      if (island.type === 'seafort') {
        const wallR = island.radius * 0.6;
        for (let w = 0; w < 8; w++) {
          const wa = (w / 8) * Math.PI * 2;
          const wallSeg = this.add.rectangle(
            island.x + Math.cos(wa) * wallR,
            island.y + Math.sin(wa) * wallR,
            20, 11, 0x6a6a6a
          ).setDepth(6).setRotation(wa);
          island.buildings.push(wallSeg);
        }
        for (let t = 0; t < 4; t++) {
          const ta = (t / 4) * Math.PI * 2;
          const tower = this.add.circle(island.x + Math.cos(ta) * wallR, island.y + Math.sin(ta) * wallR, 12, 0x555555).setDepth(6.2);
          island.buildings.push(tower);
        }
        const fortPole = this.add.rectangle(island.x, island.y - 10, 3, 42, 0x8b7355).setDepth(6.3);
        const fortFlag = this.add.triangle(island.x + 2, island.y - 34, 0, 0, 30, 10, 0, 18, 0x8f2c2c).setDepth(6.4);
        const fortFlagLabel = this.add.text(island.x - 16, island.y - 46, 'RAISE', { fontSize: '8px', color: '#fff1a8' }).setDepth(6.5);
        const vaultBase = this.add.rectangle(island.x, island.y, 30, 30, 0x444444).setDepth(6.5);
        const vaultDoor = this.add.rectangle(island.x, island.y, 20, 24, 0x1a1a1a).setDepth(6.6);
        const vaultLock = this.add.circle(island.x, island.y, 7, 0xc9963f).setDepth(6.7);
        const vaultPole = this.add.rectangle(island.x + 34, island.y + 6, 3, 34, 0x8b7355).setDepth(6.55);
        const vaultFlag = this.add.triangle(island.x + 36, island.y - 10, 0, 0, 24, 8, 0, 16, 0x2dd4bf).setDepth(6.56);
        const vaultFlagLabel = this.add.text(island.x + 20, island.y - 22, 'OPEN', { fontSize: '8px', color: '#e9ffff' }).setDepth(6.57);
        const vaultLabel = this.add.text(island.x - 22, island.y + 18, 'VAULT', { fontSize: '9px', color: '#ffcc44' }).setDepth(7);
        island.buildings.push(fortPole, fortFlag, fortFlagLabel, vaultBase, vaultDoor, vaultLock, vaultPole, vaultFlag, vaultFlagLabel, vaultLabel);
        const fortState = {
          island, enemyCount: 0, cleared: false, started: false, keySpawned: false, opened: false,
          keySprite: null, keyGlowSprite: null, fortFlag, fortFlagLabel, vaultFlag, vaultFlagLabel, vaultLock, vaultDoor, vaultLabel,
          bossSpawned: false
        };
        this.seafortStates.set(island.id, fortState);
        continue;
      }

      // --- Regular island loot node ---
      const la = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const ld = Phaser.Math.Between(Math.floor(island.radius * 0.2), Math.max(20, island.radius - 22));
      const lx = island.x + Math.cos(la) * ld;
      const ly = island.y + Math.sin(la) * ld;
      island.lootNode = this.createLootNodeAt(lx, ly, {
        zone: island.zone,
        sourceType: island.type,
        islandId: island.id,
        requiresDive: island.type === 'shipwreck'
      });
    }
  }

  findNearestLootNode(maxDist, fromX = this.playerPawn.x, fromY = this.playerPawn.y) {
    let nearest = null;
    let best = maxDist;

    for (const node of this.lootNodes) {
      if (!node || node.taken) continue;
      if (!node.sprites?.some((sprite) => sprite.visible)) continue;

      const d = this.getLootNodeDistance(node, fromX, fromY);
      if (!Number.isFinite(d)) continue;

      if (d < best) {
        best = d;
        nearest = node;
      }
    }

    return nearest;
  }

  getLootNodeDistance(node, fromX, fromY) {
    let best = Phaser.Math.Distance.Between(fromX, fromY, node.x, node.y);

    for (const sprite of node.sprites ?? []) {
      if (!sprite?.visible) continue;
      const sx = Number.isFinite(sprite.x) ? sprite.x : null;
      const sy = Number.isFinite(sprite.y) ? sprite.y : null;
      if (sx == null || sy == null) continue;

      const raw = Phaser.Math.Distance.Between(fromX, fromY, sx, sy);
      const halfW = Number.isFinite(sprite.displayWidth) ? sprite.displayWidth * 0.5 : 10;
      const halfH = Number.isFinite(sprite.displayHeight) ? sprite.displayHeight * 0.5 : 10;
      const interactPad = Math.max(10, Math.max(halfW, halfH));
      const adjusted = Math.max(0, raw - interactPad);
      if (Number.isFinite(adjusted)) best = Math.min(best, adjusted);
    }

    return best;
  }

  createPlayerShip() {
    this.shipStats = SHIP_CLASSES[this.shipType];
    this.shipVisualScale = {
      skiff: 2.5,
      brigantine: 3.2,
      galleon: 4.0,
      warship: 4.8
    }[this.shipType] ?? 2.5;
    this.boardingReturnRadius = 90 * this.shipVisualScale;

    this.playerShip = this.add.container(460, 800);
    const hull = this.add.rectangle(0, 0, 84, 32, 0x8a5b35);
    const deck = this.add.rectangle(-8, 0, 54, 18, 0x9a6a40);
    const bow = this.add.triangle(44, 0, 0, -16, 30, 0, 0, 16, 0xbe8b5f);
    const stern = this.add.rectangle(-40, 0, 12, 22, 0x744728);
    const cabin = this.add.rectangle(-16, -4, 20, 14, 0x6d4a2e);
    const hatch = this.add.rectangle(12, 1, 16, 10, 0x5f3f27);
    const railTop = this.add.rectangle(0, -14, 74, 3, 0x4f2f1d);
    const railBottom = this.add.rectangle(0, 14, 74, 3, 0x4f2f1d);

    const cannonsPerSide = Phaser.Math.Clamp(Math.floor(this.shipStats.cannons / 2), 1, 6);
    const cannonTop = [];
    const cannonBottom = [];
    this.cannonStations = [];
    for (let i = 0; i < cannonsPerSide; i++) {
      const t = cannonsPerSide === 1 ? 0.5 : i / (cannonsPerSide - 1);
      const x = Phaser.Math.Linear(-20, 24, t);
      cannonTop.push(this.add.rectangle(x, -17, 8, 4, 0x1f252f));
      cannonBottom.push(this.add.rectangle(x, 17, 8, 4, 0x1f252f));
      this.cannonStations.push({ x, y: -17, side: 'port' });
      this.cannonStations.push({ x, y: 17, side: 'starboard' });
    }

    this.playerShip.add([hull, deck, bow, stern, cabin, hatch, railTop, railBottom, ...cannonTop, ...cannonBottom]);
    this.playerShip.setScale(this.shipVisualScale);
    this.playerShip.setDepth(10);

    this.shipVel = new Phaser.Math.Vector2(0, 0);
    this.heading = 0;
    this.throttle = 0;

    this.cameras.main.startFollow(this.playerShip, true, 0.08, 0.08);
  }

  createEnemies() {
    this.enemyShips = [];
    this.enemyBalls = [];
    this.playerBalls = [];

    const x = Phaser.Math.Between(900, this.world.width - 400);
    const y = Phaser.Math.Between(240, this.world.height - 240);
    const ship = this.add.container(x, y).setDepth(8);
    const hull = this.add.rectangle(0, 0, 56, 22, 0x5e2323);
    const bow = this.add.triangle(30, 0, 0, -11, 18, 0, 0, 11, 0x7d3434);
    const railTop = this.add.rectangle(0, -10, 46, 2, 0x2a1212);
    const railBottom = this.add.rectangle(0, 10, 46, 2, 0x2a1212);
    const cannons = [
      this.add.rectangle(-10, -12, 7, 3, 0x20242b),
      this.add.rectangle(8, -12, 7, 3, 0x20242b),
      this.add.rectangle(-10, 12, 7, 3, 0x20242b),
      this.add.rectangle(8, 12, 7, 3, 0x20242b)
    ];
    ship.add([hull, bow, railTop, railBottom, ...cannons]);
    ship.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
    this.enemyShips.push({ sprite: ship, hp: 260, cooldown: Phaser.Math.FloatBetween(1.3, 3.6), speed: Phaser.Math.FloatBetween(90, 130) });
  }

  createInput() {
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      sprint: 'SHIFT',
      interact: 'E',
      loot: 'F',
      sell: 'COMMA',
      fire: 'SPACE',
      jump: 'SPACE',
      melee: 'J',
      block: 'K',
      sidearm: 'L',
      board: 'G',
      contract: 'P',
      dive: 'T',
      roleCycle: 'I',
      openCrewToggle: 'O',
      anchor: 'X',
      emergencyAnchor: 'Z',
      chart: 'TAB',
      componentRepair: 'V',
      network: 'N',
      cosmetic: 'C',
      allianceCreate: 'Y',
      allianceBreak: 'H',
      ammo: 'Q',
      upgrade: 'U',
      mission: 'M',
      food1: 'ONE',
      food2: 'TWO',
      food3: 'THREE',
      repair: 'R',
      bail: 'B',
      esc: 'ESC'
    });
  }

  createLandAndBoardingSystems() {
    this.onFoot = false;
    this.playerPawn = this.add.container(this.playerShip.x, this.playerShip.y).setDepth(21).setVisible(true);
    const pawnShadow = this.add.circle(0, 5, 10, 0x000000, 0.3);
    const pawnBody = this.add.circle(0, 0, 8, 0x1f3f60);
    const pawnHead = this.add.circle(0, -10, 5, 0xf8d9b6);
    const pawnBandana = this.add.rectangle(0, -10, 8, 2, 0xc94646);
    const pawnTrim = this.add.circle(0, 0, 9, 0xcde8ff, 0.22);
    // Sword (held right side)
    this.pawnSword = this.add.rectangle(14, 2, 18, 3, 0xd0d8e8);
    const swordGuard = this.add.rectangle(10, 2, 3, 8, 0x8a9ab8);
    const swordHandle = this.add.rectangle(6, 2, 6, 3, 0x6a4020);
    this.playerPawn.add([pawnShadow, pawnTrim, pawnBody, pawnHead, pawnBandana, this.pawnSword, swordGuard, swordHandle]);
    this.playerSidearmShots = [];
    this.skeletons = [];
    this.creatures = [];
    this.nextCreatureSpawn = 22;
    this.carriedLoot = null;
    this.carriedLootSprite = null;
    this.shipCargoSprites = [];
    this.shipCargoOverflowLabel = null;
    this.fortKey = null;
  }

  getLootTierStyle(tier = 'driftwoodFinds') {
    const palette = {
      driftwoodFinds: { base: 0x6b4a2a, lid: 0xb68749, lock: 0xd9ba6b, glow: null },
      captainsPlunder: { base: 0x5d2e1f, lid: 0xd08b3f, lock: 0xf0c06b, glow: 0xffd089 },
      warlordsVaults: { base: 0x3f2a62, lid: 0x7f66c4, lock: 0xd7ccff, glow: 0xa18dff },
      legendaryRelics: { base: 0x2e1b4f, lid: 0xae7dff, lock: 0xffeaa8, glow: 0xb46dff }
    };
    return palette[tier] ?? palette.driftwoodFinds;
  }

  createLootCrateSprite(x, y, depth = 11, tier = 'driftwoodFinds') {
    const style = this.getLootTierStyle(tier);
    const crate = this.add.container(x, y).setDepth(depth);
    const base = this.add.rectangle(0, 4, 16, 10, style.base);
    const lid = this.add.rectangle(0, -1, 16, 6, style.lid);
    const lock = this.add.rectangle(0, 2, 4, 4, style.lock);
    const nodes = [base, lid, lock];
    if (tier === 'legendaryRelics') {
      const aura = this.add.circle(0, -2, 14, style.glow ?? 0xb46dff, 0.33);
      this.tweens.add({ targets: aura, alpha: { from: 0.2, to: 0.55 }, yoyo: true, repeat: -1, duration: 800 });
      nodes.unshift(aura);
    }
    crate.add(nodes);
    return crate;
  }

  updateCarriedLootVisual() {
    if (!this.carriedLoot || !this.onFoot) {
      if (this.carriedLootSprite) {
        this.carriedLootSprite.destroy();
        this.carriedLootSprite = null;
      }
      return;
    }

    if (!this.carriedLootSprite) {
      this.carriedLootSprite = this.createLootCrateSprite(this.playerPawn.x, this.playerPawn.y - 18, 24, this.carriedLoot.tier);
      this.carriedLootSprite.setScale(0.95);
    }

    this.carriedLootSprite.x = this.playerPawn.x;
    this.carriedLootSprite.y = this.playerPawn.y - 18;
  }

  refreshShipCargoVisuals() {
    this.shipCargoSprites.forEach((s) => s.destroy());
    this.shipCargoSprites = [];
    if (this.shipCargoOverflowLabel) {
      this.shipCargoOverflowLabel.destroy();
      this.shipCargoOverflowLabel = null;
    }

    const count = this.state.cargo.length;
    if (!count) return;

    const maxVisual = Math.min(count, 64);
    const cols = 8;
    for (let i = 0; i < maxVisual; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = -24 + col * 8;
      const y = -6 + row * 7;
      const cargoItem = this.state.cargo[count - maxVisual + i];
      const crate = this.createLootCrateSprite(0, 0, 11, cargoItem?.tier ?? 'driftwoodFinds');
      crate.x = x;
      crate.y = y;
      crate.setScale(0.5);
      this.playerShip.add(crate);
      this.shipCargoSprites.push(crate);
    }

    if (count > maxVisual) {
      this.shipCargoOverflowLabel = this.add.text(26, -22, `x${count}`, { fontSize: '11px', color: '#fff6cc', fontStyle: 'bold' }).setDepth(12);
      this.playerShip.add(this.shipCargoOverflowLabel);
    }
  }

  getActiveHostileCount() {
    const seaShips = this.enemyShips.filter((e) => e.hp > 0).length;
    const seaCreatures = this.creatures.filter((c) => c.hp > 0).length;
    return seaShips + seaCreatures;
  }

  canSpawnHostile() {
    return this.getActiveHostileCount() < 1;
  }

  spawnIslandDefender(island) {
    if (!island || island.type === 'outpost') return;

    const isFort = island.type === 'seafort' || island.type === 'skullfort';
    const spawnCount = isFort ? Phaser.Math.Between(4, 6) : 1;

    for (let s = 0; s < spawnCount; s++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(8, Math.max(12, island.radius - 8));
      const hp = isFort ? 180 : island.type === 'ghost' ? 90 : 70;
      const color = island.type === 'seafort' ? 0xcccccc : island.type === 'ghost' ? 0x9e7cff : 0xe8e1d0;
      const enemy = this.add.rectangle(
        island.x + Math.cos(angle) * dist,
        island.y + Math.sin(angle) * dist,
        12, 16, color
      ).setDepth(9);
      const skeletonObj = { sprite: enemy, islandId: island.id, fortId: island.id, hp, cooldown: Phaser.Math.FloatBetween(1.2, 2.2), stagger: 0 };
      this.skeletons.push(skeletonObj);
    }

    if (isFort) {
      const fort = this.seafortStates?.get(island.id);
      const bossAlreadyAlive = this.skeletons.some((s) => s.fortId === island.id && s.isBoss && s.hp > 0);
      if (!bossAlreadyAlive) {
        const boss = this.add.rectangle(
          island.x + Phaser.Math.Between(-26, 26),
          island.y + Phaser.Math.Between(-26, 26),
          28,
          36,
          island.type === 'skullfort' ? 0x7d1717 : 0xbdbdbd
        ).setDepth(9.3);
        this.skeletons.push({
          sprite: boss,
          islandId: island.id,
          fortId: island.id,
          hp: island.type === 'skullfort' ? 900 : 700,
          cooldown: Phaser.Math.FloatBetween(0.9, 1.4),
          stagger: 0,
          isBoss: true
        });
        if (fort) fort.bossSpawned = true;
      }
    }
  }

  createHud() {
    this.hud = this.add.container(16, 16).setScrollFactor(0).setDepth(100);
    this.hudPanel = this.add.rectangle(0, 0, 700, 86, 0x04101b, 0.5).setOrigin(0, 0);

    this.hudText = this.add.text(12, 10, '', { fontSize: '14px', color: '#e9f6ff', lineSpacing: 4 });
    this.toast = this.add.text(12, 56, '', { fontSize: '13px', color: '#8ee3ff' });

    this.hud.add([this.hudPanel, this.hudText, this.toast]);
  }

  bindEvents() {
    this.events.on('weather-changed', (weather) => this.pushToast(`Weather shift: ${weather.label}`));
    this.events.on('event-started', (event) => {
      this.pushToast(`World Event: ${event.label}`);
      if (event.key === 'ghostArmada' && this.isNight()) this.spawnGhostArmada();
      if (event.key === 'dreadSerpent') this.spawnBossCreature('serpent');
      if (event.key === 'kraken') this.spawnBossCreature('kraken');
    });
    this.events.on('event-ended', () => this.pushToast('World Event ended. Seas briefly calm.'));
    this.events.on('mission-complete', (mission) => this.pushToast(`Mission Complete: ${mission.label} (+${mission.rewardGold}g, +${mission.rewardRep} rep)`));
    this.events.on('contract-complete', (contract) => this.pushToast(`Contract complete: Return to outpost to turn in ${contract.label}.`));
    this.events.on('event-objective-complete', (obj) => this.pushToast(`World Event Complete: +${obj.rewardGold}g, +${obj.rewardRep} rep`));
    this.events.on('rank-unlock', ({ factionKey, rank, unlock }) => this.pushToast(`${factionKey} rank ${rank} unlocked: ${unlock.label}`));
    this.events.on('achievement-unlock', (ach) => this.pushToast(`Achievement: ${ach.label}`));
    this.events.on('player-downed', () => {
      this.state.player.hp = 50;
      this.state.player.isDowned = false;
      if (this.onFoot) {
        this.onFoot = false;
        this.cameras.main.startFollow(this.playerShip, true, 0.08, 0.08);
      }
      this.playerPawn.setPosition(this.playerShip.x, this.playerShip.y);
      this.pushToast('Knocked out! Your crew hauled you back aboard. (50 HP)');
    });
    this.events.on('player-respawned', () => {
      this.playerPawn.setPosition(this.playerShip.x, this.playerShip.y);
      this.onFoot = false;
      this.cameras.main.startFollow(this.playerShip, true, 0.08, 0.08);
      this.pushToast('Respawned at Resurrection Lantern (50 HP).');
    });
  }

  pushToast(text) {
    this.toastText = text;
    this.toastTimer = 7;
  }

  consumeLootPress() {
    if (!this.keys?.loot) return false;
    if (this.lootInteractCooldown > 0) return false;
    if (Phaser.Input.Keyboard.JustDown(this.keys.loot) || this.keys.loot.isDown) {
      this.lootInteractCooldown = 0.16;
      return true;
    }
    return false;
  }

  update(time, delta) {
    if (this.sceneFailed) return;

    try {
      const dt = delta / 1000;
      this.daySeconds += dt;
      this.wind.update(dt);
      this.state.update(dt, this.getCurrentZone()?.key ?? null);
      if (this.state.updateAnchor(dt)) this.pushToast('Anchor raised. Underway.');
      this.parryWindow = Math.max(0, this.parryWindow - dt);
      this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
      this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
      this.waterWarnCooldown = Math.max(0, this.waterWarnCooldown - dt);
      this.lootInteractCooldown = Math.max(0, this.lootInteractCooldown - dt);

      if (Phaser.Input.Keyboard.JustDown(this.keys.chart)) {
        this.chartVisible = !this.chartVisible;
        this.chartContainer.setVisible(this.chartVisible);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.network)) this.toggleNetworkConnection();

      if (Phaser.Input.Keyboard.JustDown(this.keys.roleCycle)) {
        const role = this.state.cycleRole();
        this.pushToast(`Role switched: ${role}`);
        if (this.network?.connected) this.network.sendMessage({ type: 'role:set', role });
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.openCrewToggle)) {
        if (this.network?.connected) {
          const selfPlayer = (this.networkSnapshot?.players ?? []).find((p) => p.playerId === this.network.selfPlayerId);
          const selfCrew = (this.networkSnapshot?.crews ?? []).find((c) => c.crewId === selfPlayer?.crewId);
          if (selfCrew?.captainId && selfCrew.captainId !== this.network.selfPlayerId) {
            this.pushToast('Only the captain can change Crew Mode.');
            return;
          }
        }

        this.openCrew = !this.openCrew;
        this.pushToast(`Open Crew ${this.openCrew ? 'enabled' : 'disabled'}.`);
        if (this.network?.connected) this.network.sendMessage({ type: 'crew:open-mode', openCrew: this.openCrew });
      }

      this.handleInput(dt);
      this.updateShipPhysics(dt);
      if (!this.onFoot) {
        this.playerPawn.setPosition(this.playerShip.x, this.playerShip.y);
        this.playerPawn.setRotation(this.heading);
      }
      this.updateEnemyAi(dt);
      this.updateSkeletonAi(dt);
      this.updateSeaCreatures(dt);
      this.updateProjectiles(dt);
      this.updateSidearmShots(dt);
      this.handleInteractions();
      this.checkSeafortClearing();
      this.updateCarriedLootVisual();
      this.updateDayNight();
      this.updateHud();
      this.updateChartOverlay();
      this.updateRemoteShips();

      if (this.network?.connected) {
        this.network.sendInput({
          throttle: (this.keys.up.isDown ? 1 : 0) - (this.keys.down.isDown ? 1 : 0),
          turn: (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0),
          fire: this.keys.fire.isDown
        });
      }

      if (this.state.activeEvent?.key === 'ghostArmada' && this.isNight() && !this.enemyShips.some((e) => e.ghost)) {
        this.spawnGhostArmada();
      }
      if (this.state.activeEvent?.key === 'dreadSerpent' && !this.creatures.some((c) => c.type === 'serpent')) {
        this.spawnBossCreature('serpent');
      }
      if (this.state.activeEvent?.key === 'kraken' && !this.creatures.some((c) => c.type === 'kraken')) {
        this.spawnBossCreature('kraken');
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) this.scene.start('MenuScene');
    } catch (error) {
      this.reportSceneError(error, 'update');
      this.time.delayedCall(1800, () => this.scene.start('MenuScene'));
    }
  }

  handleInput(dt) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.board)) this.toggleBoardingState();

    if (this.onFoot) {
      this.handleOnFootInput(dt);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.contract)) {
      const nearest = this.findNearestIsland(86);
      if (!nearest || nearest.type !== 'outpost') {
        this.pushToast('Visit an outpost to manage contracts.');
      } else {
        const result = this.state.activeContract?.complete ? this.state.turnInContract() : this.state.startContract();
        this.pushToast(result.reason);
      }
    }

    if (this.keys.up.isDown) this.throttle = Phaser.Math.Clamp(this.throttle + dt * 0.62, 0, 1);
    if (this.keys.down.isDown) this.throttle = Phaser.Math.Clamp(this.throttle - dt * 0.9, 0, 1);

    const crewEff = this.state.getCrewEfficiency();
    const speed = this.shipVel.length();
    const highSpeedPenalty = Phaser.Math.Clamp(1 - speed * 0.0042, 0.32, 1);
    const turnScale = this.shipStats.turnRate * crewEff.maneuver * highSpeedPenalty;
    if (!this.state.canSteerShip()) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.right)) {
        this.pushToast('Helm destroyed. Repair component [V].');
      }
    } else {
      if (this.keys.left.isDown) this.heading -= turnScale;
      if (this.keys.right.isDown) this.heading += turnScale;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.fire)) {
      if (!this.state.canUseCannons()) {
        this.pushToast('Cannons disabled. Repair component [V].');
      } else if (this.shipType === 'warship' && !this.onFoot) {
        this.firePlayerCannon();
      } else if (this.onFoot) {
        this.firePlayerCannon();
      } else {
        this.pushToast('Smaller ships require you to man a cannon on deck first. Press [G].');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ammo)) this.pushToast(`Loaded ${this.state.cycleAmmo()}.`);
    if (Phaser.Input.Keyboard.JustDown(this.keys.mission)) {
      if (this.state.refreshMission()) this.pushToast(`New mission accepted: ${this.state.currentMission.label}`);
      else this.pushToast('Current mission not complete yet.');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.allianceCreate) && this.network?.connected) {
      const target = this.findNearestRemoteShip(180);
      if (!target) this.pushToast('No nearby crew to ally with.');
      else {
        this.network.sendMessage({ type: 'alliance:create', targetCrewId: target.crewId });
        this.pushToast('Alliance request sent.');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.allianceBreak) && this.network?.connected) {
      this.network.sendMessage({ type: 'alliance:break' });
      this.pushToast('Alliance broken. Traitor bounty risk increased.');
      this.state.wantedLevel = Math.min(5, this.state.wantedLevel + 1.5);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.anchor)) {
      const result = this.state.toggleAnchor();
      this.pushToast(result.reason);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.emergencyAnchor)) {
      this.state.dropAnchorEmergency();
      this.pushToast('Emergency anchor drop! Hull stress sustained.');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.componentRepair)) {
      const worst = Object.entries(this.state.ship.components).sort((a, b) => a[1] - b[1])[0];
      if (!worst || worst[1] >= 100) this.pushToast('Ship components already stable.');
      else this.pushToast(this.state.repairComponent(worst[0]).reason);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.cosmetic)) {
      const nearest = this.findNearestIsland(86);
      if (!nearest || nearest.type !== 'outpost') {
        this.pushToast('Dock at an outpost to purchase cosmetics.');
      } else {
        this.buyContextCosmetic();
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.repair)) {
      this.state.repairHull();
      this.pushToast('Repairs applied.');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.bail)) {
      this.state.bailWater();
      this.pushToast('Bailed water from hold.');
    }
  }

  handleOnFootInput(dt) {
    const axis = new Phaser.Math.Vector2(0, 0);
    if (this.keys.left.isDown) axis.x -= 1;
    if (this.keys.right.isDown) axis.x += 1;
    if (this.keys.up.isDown) axis.y -= 1;
    if (this.keys.down.isDown) axis.y += 1;

    let speed = 130;
    if (this.state.player.isDiving) speed = 95;
    if (!this.state.player.isDiving && this.keys.sprint.isDown && this.state.player.stamina > 0) {
      speed = 210;
      this.state.player.stamina = Math.max(0, this.state.player.stamina - 45 * dt);
    } else {
      this.state.player.stamina = Math.min(100, this.state.player.stamina + 33 * dt);
    }

    if (axis.lengthSq() > 0) axis.normalize().scale(speed * dt);

    let nextX = Phaser.Math.Clamp(this.playerPawn.x + axis.x, 0, this.world.width);
    let nextY = Phaser.Math.Clamp(this.playerPawn.y + axis.y, 0, this.world.height);

    let firedDeckCannon = false;
    if (Phaser.Input.Keyboard.JustDown(this.keys.fire)) {
      if (!this.state.canUseCannons()) {
        this.pushToast('Cannons disabled. Repair component [V].');
      } else {
        const station = this.getNearestCannonStation(this.playerPawn.x, this.playerPawn.y);
        if (station && station.distance <= 56) {
          this.firePlayerCannon();
          firedDeckCannon = true;
        }
      }
    }

    if (!firedDeckCannon && Phaser.Input.Keyboard.JustDown(this.keys.jump) && this.jumpCooldown <= 0) {
      this.jumpCooldown = 0.75;
      const jumpDir = axis.lengthSq() > 0
        ? axis.clone().normalize()
        : new Phaser.Math.Vector2(Math.cos(this.heading), Math.sin(this.heading));
      nextX = Phaser.Math.Clamp(nextX + jumpDir.x * 48, 0, this.world.width);
      nextY = Phaser.Math.Clamp(nextY + jumpDir.y * 48, 0, this.world.height);
      this.pushToast('Jump!');
    }

    const walkable = this.isPointWalkable(nextX, nextY);
    if (!walkable && !this.state.player.isDiving) {
      if (this.waterWarnCooldown <= 0) {
        this.pushToast('You cannot walk on water. Move on deck/islands or dive [T].');
        this.waterWarnCooldown = 1.3;
      }
    } else {
      this.playerPawn.x = nextX;
      this.playerPawn.y = nextY;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.melee) && this.meleeCooldown <= 0) {
      this.meleeCooldown = 0.38;
      this.resolveMeleeStrike();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.block)) this.parryWindow = 0.25;

    if (Phaser.Input.Keyboard.JustDown(this.keys.sidearm) && this.state.canFireSidearm()) {
      this.state.consumeSidearmShot();
      this.fireSidearm();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.dive)) {
      const nearest = this.findNearestIsland(55, this.playerPawn.x, this.playerPawn.y);
      if (!nearest || nearest.type !== 'shipwreck') {
        this.pushToast('Diving is only useful near shipwreck shoals.');
      } else {
        const diving = this.state.toggleDive();
        this.pushToast(diving ? 'Diving underwater.' : 'Surfaced for air.');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.food1)) this.pushToast(this.state.useFood('banana').reason);
    if (Phaser.Input.Keyboard.JustDown(this.keys.food2)) this.pushToast(this.state.useFood('fish').reason);
    if (Phaser.Input.Keyboard.JustDown(this.keys.food3)) this.pushToast(this.state.useFood('rum').reason);
  }

  isOnShipDeck(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.playerShip.x, this.playerShip.y) <= this.boardingReturnRadius;
  }

  isOnIsland(x, y) {
    return this.world.islands.some((island) => Phaser.Math.Distance.Between(x, y, island.x, island.y) <= island.radius + 2);
  }

  isPointWalkable(x, y) {
    return this.isOnShipDeck(x, y) || this.isOnIsland(x, y);
  }

  updateShipPhysics(dt) {
    if (this.onFoot) {
      this.playerShip.rotation = this.heading;
      return;
    }

    const crewEff = this.state.getCrewEfficiency();
    const anchorFactor = this.state.ship.anchorDown || this.state.ship.anchorRaisingRemaining > 0 ? 0.12 : 1;
    const accel = this.shipStats.accel * crewEff.maneuver * anchorFactor;
    const capMap = { skiff: 240, brigantine: 205, galleon: 175, warship: 165 };
    const maxSpeed = (capMap[this.shipType] ?? 190) * (this.state.ship.effects.speedMult ?? 1);

    this.shipVel.x += Math.cos(this.heading) * accel * this.throttle;
    this.shipVel.y += Math.sin(this.heading) * accel * this.throttle;

    if (this.state.ship.anchorDown) this.shipVel.scale(0.86);

    this.shipVel.scale(this.shipStats.drag);
    if (this.throttle < 0.1) this.shipVel.scale(0.94);
    if (this.shipVel.length() > maxSpeed) this.shipVel.setLength(maxSpeed);

    this.playerShip.x += this.shipVel.x * dt;
    this.playerShip.y += this.shipVel.y * dt;
    this.playerShip.rotation = this.heading;

    this.playerShip.x = Phaser.Math.Clamp(this.playerShip.x, 30, this.world.width - 30);
    this.playerShip.y = Phaser.Math.Clamp(this.playerShip.y, 30, this.world.height - 30);

    for (const island of this.world.islands) {
      const distance = Phaser.Math.Distance.Between(this.playerShip.x, this.playerShip.y, island.x, island.y);
      if (distance < island.radius + 14) {
        const angle = Phaser.Math.Angle.Between(island.x, island.y, this.playerShip.x, this.playerShip.y);
        this.playerShip.x = island.x + Math.cos(angle) * (island.radius + 15);
        this.playerShip.y = island.y + Math.sin(angle) * (island.radius + 15);
        this.shipVel.scale(0.55);
        this.state.applyShipDamage(8);
      }
    }

    if (this.state.ship.water >= 100 || this.state.ship.hull <= 0) {
      this.state.sinkPenalty();
      this.playerShip.setPosition(460, 800);
      this.playerPawn.setPosition(this.playerShip.x, this.playerShip.y);
      this.shipVel.set(0, 0);
      this.pushToast('Your ship sank. Cargo and voyage rep lost.');
    }

    const zone = this.getCurrentZone();
    if (this.shipType === 'warship' && (zone.key === 'amber' || zone.key === 'tangled')) {
      this.state.wantedLevel = Math.min(5, this.state.wantedLevel + dt * 0.2);
    }
  }

  firePlayerCannon() {
    if (!this.state.canFirePlayerCannon()) return;
    this.state.consumePlayerCannonShot();

    const projectileStats = this.state.getPlayerProjectileStats();
    const tint = {
      iron: 0xf0dfc8,
      chain: 0xa9b7c9,
      exploding: 0xff985f,
      grapple: 0x8cd2ff,
      fire: 0xff5e3a
    }[projectileStats.ammoKey] ?? 0xf0dfc8;

    const shipScale = this.shipVisualScale;

    // Warship can fire from the wheel; smaller ships must be on deck at a cannon.
    if (this.shipType === 'warship' && !this.onFoot) {
      const cannonsPerSide = Phaser.Math.Clamp(Math.floor(this.shipStats.cannons / 2), 1, 6);
      const shipHalfLen = 38 * this.shipVisualScale;
      const perpL = this.heading - Math.PI / 2;
      const perpR = this.heading + Math.PI / 2;

      for (const perpAngle of [perpL, perpR]) {
        for (let i = 0; i < cannonsPerSide; i++) {
          const t = cannonsPerSide === 1 ? 0.5 : i / (cannonsPerSide - 1);
          const along = Phaser.Math.Linear(-shipHalfLen * 0.55, shipHalfLen * 0.55, t);
          const offset = 16 * this.shipVisualScale;
          const ox = Math.cos(this.heading) * along + Math.cos(perpAngle) * offset;
          const oy = Math.sin(this.heading) * along + Math.sin(perpAngle) * offset;
          const spread = Phaser.Math.FloatBetween(-0.07, 0.07);
          const angle = perpAngle + spread;
          const ball = this.add.circle(this.playerShip.x + ox, this.playerShip.y + oy, 4, tint).setDepth(12);
          this.playerBalls.push({
            sprite: ball,
            vel: new Phaser.Math.Vector2(Math.cos(angle) * projectileStats.speed, Math.sin(angle) * projectileStats.speed),
            ttl: 2.4,
            damage: projectileStats.damage,
            splash: projectileStats.splash,
            burn: projectileStats.burn
          });
        }
      }
      return;
    }

    if (!this.onFoot) {
      this.pushToast('Get on deck and man a cannon to fire.');
      return;
    }

    const stationInfo = this.getNearestCannonStation(this.playerPawn.x, this.playerPawn.y);
    if (!stationInfo || stationInfo.distance > 56) {
      this.pushToast('Move next to a cannon to fire it.');
      return;
    }
    const nearestStation = stationInfo.station;

    const target = this.findNearestHostile(this.playerPawn.x, this.playerPawn.y, 420);
    const angle = target ? Phaser.Math.Angle.Between(nearestStation.wx, nearestStation.wy, target.x, target.y) : this.heading + (nearestStation.side === 'port' ? -Math.PI / 2 : Math.PI / 2);
    const ball = this.add.circle(nearestStation.wx, nearestStation.wy, 4, tint).setDepth(12);
    this.playerBalls.push({
      sprite: ball,
      vel: new Phaser.Math.Vector2(Math.cos(angle) * projectileStats.speed, Math.sin(angle) * projectileStats.speed),
      ttl: 2.4,
      damage: projectileStats.damage,
      splash: projectileStats.splash,
      burn: projectileStats.burn
    });
  }

  getNearestCannonStation(fromX, fromY) {
    if (!this.cannonStations?.length) return null;

    const shipScale = this.shipVisualScale;
    let nearestStation = null;
    let bestDist = Infinity;
    for (const station of this.cannonStations) {
      const wx = this.playerShip.x + (station.x * shipScale * Math.cos(this.heading)) - (station.y * shipScale * Math.sin(this.heading));
      const wy = this.playerShip.y + (station.x * shipScale * Math.sin(this.heading)) + (station.y * shipScale * Math.cos(this.heading));
      const d = Phaser.Math.Distance.Between(fromX, fromY, wx, wy);
      if (d < bestDist) {
        bestDist = d;
        nearestStation = { ...station, wx, wy };
      }
    }

    return nearestStation ? { station: nearestStation, distance: bestDist } : null;
  }

  updateEnemyAi(dt) {
    for (const enemy of this.enemyShips) {
      if (enemy.hp <= 0) continue;

      const s = enemy.sprite;
      if (enemy.burningFor > 0) {
        enemy.burningFor -= dt;
        enemy.hp -= 8 * dt;
      }

      if (enemy.hp <= 0) {
        s.destroy();
        this.state.addShipSinkCredit();
        if (enemy.ghost) this.state.addGhostShipSinkCredit();
        this.pushToast('Enemy vessel sunk by fire.');
        continue;
      }

      if (enemy.ghost) {
        enemy.phaseTimer -= dt;
        if (enemy.phaseTimer <= 0) {
          enemy.phased = !enemy.phased;
          enemy.phaseTimer = enemy.phased ? 1.4 : Phaser.Math.FloatBetween(2.8, 5.2);
          s.setAlpha(enemy.phased ? 0.3 : 0.9);
        }
      }

      const target = this.onFoot ? this.playerPawn : this.playerShip;
      const dist = Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y);
      if (dist < 980) {
        const ang = Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y);
        s.rotation = Phaser.Math.Angle.RotateTo(s.rotation, ang, 0.02);
        s.x += Math.cos(s.rotation) * enemy.speed * dt;
        s.y += Math.sin(s.rotation) * enemy.speed * dt;

        enemy.cooldown -= dt;
        if (enemy.cooldown <= 0 && dist < 540) {
          enemy.cooldown = Phaser.Math.FloatBetween(1.5, 2.8);
          this.fireEnemyShot(enemy);
        }

        if (dist < 28 && !this.onFoot) {
          const relativeSpeed = this.shipVel.length() + enemy.speed;
          const ramBase = Math.max(20, Math.floor(relativeSpeed * 0.8));
          this.state.applyShipDamage(Math.max(10, ramBase * 0.55));
          enemy.hp -= Math.max(12, Math.floor(relativeSpeed * 0.18));
          if (enemy.hp <= 0) {
            s.destroy();
            this.state.addShipSinkCredit();
            if (enemy.ghost) this.state.addGhostShipSinkCredit();
            this.pushToast('Enemy vessel sunk after ramming.');
          }
          enemy.cooldown = Math.max(enemy.cooldown, 1.2);
        }
      }
    }
  }

  fireEnemyShot(enemy) {
    const heading = enemy.sprite.rotation;
    const ball = this.add.circle(
      enemy.sprite.x + Math.cos(heading) * 22,
      enemy.sprite.y + Math.sin(heading) * 22,
      3,
      0xff7364
    ).setDepth(12);

    const speed = 390;
    this.enemyBalls.push({
      sprite: ball,
      vel: new Phaser.Math.Vector2(Math.cos(heading) * speed, Math.sin(heading) * speed),
      ttl: 3
    });
  }

  resolveMeleeStrike() {
    const meleeMult = this.state.getCrewEfficiency().melee ?? 1;
    // Sword swing visual
    if (this.pawnSword) {
      this.pawnSword.setFillStyle(0xffffff);
      this.time.delayedCall(150, () => { if (this.pawnSword) this.pawnSword.setFillStyle(0xd0d8e8); });
    }
    for (const enemy of this.skeletons) {
      if (enemy.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, enemy.sprite.x, enemy.sprite.y);
      if (d <= 34) {
        const meleeDamage = Math.floor((enemy.isBoss ? 38 : 45) * meleeMult);
        enemy.hp -= meleeDamage;
        enemy.stagger = 0.3;
        if (enemy.hp <= 0) {
          enemy.sprite.destroy();
          this.state.gold += enemy.isBoss ? 850 : 45;
          this.state.unbankedRep += 2;
          this.state.addSkeletonDefeatCredit();
          this.pushToast(enemy.isBoss ? 'Fort boss defeated!' : 'Skeleton defeated.');
        }
      }
    }
  }

  fireSidearm() {
    const target = this.findNearestHostile(this.playerPawn.x, this.playerPawn.y, 380);
    const angle = target
      ? Phaser.Math.Angle.Between(this.playerPawn.x, this.playerPawn.y, target.x, target.y)
      : this.heading;
    const shot = this.add.circle(this.playerPawn.x, this.playerPawn.y, 3, 0xffebc0).setDepth(22);
    this.playerSidearmShots.push({
      sprite: shot,
      vel: new Phaser.Math.Vector2(Math.cos(angle) * 500, Math.sin(angle) * 500),
      ttl: 0.8,
      damage: 50
    });
  }

  updateSidearmShots(dt) {
    for (let i = this.playerSidearmShots.length - 1; i >= 0; i--) {
      const s = this.playerSidearmShots[i];
      s.ttl -= dt;
      s.sprite.x += s.vel.x * dt;
      s.sprite.y += s.vel.y * dt;

      let hit = false;
      for (const enemy of this.skeletons) {
        if (enemy.hp <= 0) continue;
        const hitRadius = enemy.isBoss ? 18 : 12;
        if (Phaser.Math.Distance.Between(s.sprite.x, s.sprite.y, enemy.sprite.x, enemy.sprite.y) < hitRadius) {
          enemy.hp -= s.damage;
          if (enemy.hp <= 0) {
            enemy.sprite.destroy();
            this.state.gold += enemy.isBoss ? 850 : 45;
            this.state.addSkeletonDefeatCredit();
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        for (const creature of this.creatures) {
          if (creature.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(s.sprite.x, s.sprite.y, creature.sprite.x, creature.sprite.y) < creature.hitRadius) {
            creature.hp -= s.damage;
            hit = true;
            break;
          }
        }
      }

      if (s.ttl <= 0 || hit) {
        s.sprite.destroy();
        this.playerSidearmShots.splice(i, 1);
      }
    }
  }

  updateSkeletonAi(dt) {
    if (!this.onFoot) return;

    for (const skeleton of this.skeletons) {
      if (skeleton.hp <= 0) continue;
      if (skeleton.stagger > 0) {
        skeleton.stagger -= dt;
        continue;
      }

      const s = skeleton.sprite;
      const dist = Phaser.Math.Distance.Between(s.x, s.y, this.playerPawn.x, this.playerPawn.y);
      if (dist > (skeleton.isBoss ? 320 : 240)) continue;

      const ang = Phaser.Math.Angle.Between(s.x, s.y, this.playerPawn.x, this.playerPawn.y);
      const chaseSpeed = skeleton.isBoss ? 52 : 68;
      let moveX = Math.cos(ang) * chaseSpeed * dt;
      let moveY = Math.sin(ang) * chaseSpeed * dt;

      // Separation: steer away from other skeletons that are too close
      for (const other of this.skeletons) {
        if (other === skeleton || other.hp <= 0) continue;
        const sepDist = Phaser.Math.Distance.Between(s.x, s.y, other.sprite.x, other.sprite.y);
        if (sepDist < 32 && sepDist > 0) {
          const sepAng = Phaser.Math.Angle.Between(other.sprite.x, other.sprite.y, s.x, s.y);
          const push = (32 - sepDist) / 32;
          moveX += Math.cos(sepAng) * 55 * push * dt;
          moveY += Math.sin(sepAng) * 55 * push * dt;
        }
      }

      s.x += moveX;
      s.y += moveY;

      skeleton.cooldown -= dt;
      if (dist < (skeleton.isBoss ? 28 : 20) && skeleton.cooldown <= 0) {
        skeleton.cooldown = Phaser.Math.FloatBetween(skeleton.isBoss ? 0.8 : 1.0, skeleton.isBoss ? 1.4 : 1.8);
        if (this.parryWindow > 0) {
          skeleton.stagger = 0.8;
          this.pushToast('Parry successful.');
        } else {
          this.state.damagePlayer(skeleton.isBoss ? 34 : 18);
          this.pushToast(skeleton.isBoss ? 'The fort boss crushed you!' : 'You were hit by a skeleton.');
        }
      }
    }
  }

  updateSeaCreatures(dt) {
    this.nextCreatureSpawn -= dt;
    if (this.nextCreatureSpawn <= 0) {
      this.nextCreatureSpawn = Phaser.Math.Between(28, 42);
      const zone = this.getCurrentZone();
      if (zone.danger >= 2 && this.canSpawnHostile()) this.spawnAmbientCreature(zone.danger >= 3 ? 'lurker' : 'shark');
    }

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (c.hp <= 0) {
        c.sprite.destroy();
        this.state.addSeaCreatureReward(c.type);
        this.pushToast(`${c.label} defeated.`);
        this.creatures.splice(i, 1);
        continue;
      }

      const target = this.onFoot ? this.playerPawn : this.playerShip;
      const ang = Phaser.Math.Angle.Between(c.sprite.x, c.sprite.y, target.x, target.y);
      c.sprite.x += Math.cos(ang) * c.speed * dt;
      c.sprite.y += Math.sin(ang) * c.speed * dt;
      c.sprite.rotation = ang;

      // Island collision — push creatures out
      for (const island of this.world.islands) {
        const idist = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, island.x, island.y);
        if (idist < island.radius + 10) {
          const pushAng = Phaser.Math.Angle.Between(island.x, island.y, c.sprite.x, c.sprite.y);
          c.sprite.x = island.x + Math.cos(pushAng) * (island.radius + 11);
          c.sprite.y = island.y + Math.sin(pushAng) * (island.radius + 11);
        }
      }

      c.cooldown -= dt;

      const reach = this.onFoot ? 20 : 26;
      if (c.cooldown <= 0 && Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, target.x, target.y) < reach) {
        c.cooldown = c.attackRate;
        if (this.onFoot) this.state.damagePlayer(c.playerDamage);
        else this.state.applyShipDamage(c.shipDamage);
        this.pushToast(`${c.label} attacks!`);
      }
    }
  }

  spawnAmbientCreature(type) {
    if (!this.canSpawnHostile()) return;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(180, 340);
    const x = this.playerShip.x + Math.cos(angle) * radius;
    const y = this.playerShip.y + Math.sin(angle) * radius;
    const def = this.getCreatureDef(type);
    const sprite = this.createCreatureSprite(def, x, y);
    this.creatures.push({ ...def, sprite, hp: def.hp, cooldown: Phaser.Math.FloatBetween(0.5, 1.8) });
  }

  spawnBossCreature(type) {
    if (!this.canSpawnHostile()) return;
    if (this.creatures.some((c) => c.type === type)) return;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = this.playerShip.x + Math.cos(angle) * 420;
    const y = this.playerShip.y + Math.sin(angle) * 420;
    const def = this.getCreatureDef(type);
    const sprite = this.createCreatureSprite(def, x, y);
    this.creatures.push({ ...def, sprite, hp: def.hp, cooldown: 1.2 });
  }

  createCreatureSprite(def, x, y) {
    const container = this.add.container(x, y).setDepth(7);

    if (def.type === 'kraken') {
      const body = this.add.ellipse(0, 0, def.w, def.h, def.color);
      const eyeL = this.add.circle(16, -6, 4, 0xf7ebd6);
      const eyeR = this.add.circle(16, 6, 4, 0xf7ebd6);
      const pupilL = this.add.circle(17, -6, 2, 0x130d1b);
      const pupilR = this.add.circle(17, 6, 2, 0x130d1b);
      const tent1 = this.add.rectangle(-20, 20, 8, 24, 0x51386e);
      const tent2 = this.add.rectangle(0, 24, 8, 28, 0x51386e);
      const tent3 = this.add.rectangle(20, 20, 8, 24, 0x51386e);
      container.add([tent1, tent2, tent3, body, eyeL, eyeR, pupilL, pupilR]);
      return container;
    }

    if (def.type === 'serpent') {
      const segA = this.add.circle(-30, 0, 14, 0x476a35);
      const segB = this.add.circle(-10, 0, 13, 0x4f7438);
      const segC = this.add.circle(10, 0, 12, 0x567d40);
      const head = this.add.ellipse(28, 0, 30, 18, 0x5e8747);
      const jaw = this.add.triangle(42, 0, 0, -6, 14, 0, 0, 6, 0x325428);
      const eye = this.add.circle(34, -4, 2.5, 0xf7ebd6);
      container.add([segA, segB, segC, head, jaw, eye]);
      return container;
    }

    const body = this.add.ellipse(0, 0, def.w, def.h, def.color);
    const finTop = this.add.triangle(-6, -def.h * 0.45, 0, 0, 8, -10, 14, 0, 0x355772);
    const finBot = this.add.triangle(-6, def.h * 0.45, 0, 0, 8, 10, 14, 0, 0x355772);
    const tail = this.add.triangle(-def.w * 0.45, 0, 0, 0, -14, -8, -14, 8, 0x2c4f68);
    const eye = this.add.circle(def.w * 0.25, -2, 2.4, 0xf4ead6);
    container.add([tail, body, finTop, finBot, eye]);
    return container;
  }

  getCreatureDef(type) {
    const map = {
      shark: { type: 'shark', label: 'Reef Shark', hp: 85, speed: 65, shipDamage: 28, playerDamage: 22, attackRate: 1.4, w: 30, h: 12, color: 0x6a95b3, hitRadius: 18 },
      lurker: { type: 'lurker', label: 'Deep Lurker', hp: 180, speed: 58, shipDamage: 45, playerDamage: 30, attackRate: 1.6, w: 42, h: 16, color: 0x446f8f, hitRadius: 22 },
      serpent: { type: 'serpent', label: 'Dread Serpent', hp: 600, speed: 82, shipDamage: 80, playerDamage: 42, attackRate: 1.2, w: 90, h: 24, color: 0x5e8747, hitRadius: 34 },
      kraken: { type: 'kraken', label: 'Leviathan Kraken', hp: 900, speed: 48, shipDamage: 120, playerDamage: 55, attackRate: 1.0, w: 110, h: 44, color: 0x6b4b8f, hitRadius: 40 }
    };
    return map[type] ?? map.shark;
  }

  toggleBoardingState() {
    if (this.state.player.isDowned) return;
    if (!this.onFoot) {
      const nearIsland = this.findNearestIsland(70);
      const nearEnemy = this.findNearestEnemyShip(55);

      this.onFoot = true;
      this.playerPawn.setPosition(this.playerShip.x, this.playerShip.y).setVisible(true);
      this.playerShip.setVisible(true);
      this.shipVel.scale(0.2);
      this.cameras.main.startFollow(this.playerPawn, true, 0.1, 0.1);
      if (nearIsland) this.spawnIslandDefender(nearIsland);
      this.pushToast(nearEnemy ? 'Boarded enemy vessel.' : nearIsland ? 'Went ashore.' : 'Now moving on deck.');
      return;
    }

    const distToShip = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, this.playerShip.x, this.playerShip.y);
    if (distToShip <= this.boardingReturnRadius) {
      this.onFoot = false;
      this.state.player.isDiving = false;
      this.cameras.main.startFollow(this.playerShip, true, 0.08, 0.08);
      this.pushToast('Returned to helm.');
    } else {
      this.pushToast('Move closer to your ship to return aboard.');
    }
  }

  findNearestHostile(x, y, maxDist) {
    let best = null;
    let dBest = maxDist;

    for (const s of this.skeletons) {
      if (s.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, s.sprite.x, s.sprite.y);
      if (d < dBest) {
        dBest = d;
        best = s.sprite;
      }
    }

    for (const c of this.creatures) {
      if (c.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, c.sprite.x, c.sprite.y);
      if (d < dBest) {
        dBest = d;
        best = c.sprite;
      }
    }

    return best;
  }

  findNearestEnemyShip(maxDist, fromX = this.playerShip.x, fromY = this.playerShip.y) {
    let nearest = null;
    let best = maxDist;
    for (const enemy of this.enemyShips) {
      if (enemy.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(fromX, fromY, enemy.sprite.x, enemy.sprite.y);
      if (d < best) {
        best = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  checkSeafortClearing() {
    if (!this.seafortStates) return;
    for (const [, fort] of this.seafortStates.entries()) {
      if (!fort.started || fort.cleared || fort.opened) continue;
      const alive = this.skeletons.filter(s => s.fortId === fort.island.id && s.hp > 0).length;
      if (alive === 0) {
        fort.cleared = true;
        if (!fort.keySpawned) {
          fort.keySpawned = true;
          const kx = fort.island.x + 12;
          const ky = fort.island.y - 12;
          fort.keyGlowSprite = this.add.circle(kx, ky, 13, 0xffee88, 0.4).setDepth(8.9);
          fort.keySprite = this.add.circle(kx, ky, 8, 0xffd700).setDepth(9);
          this.add.text(kx - 10, ky + 12, 'KEY', { fontSize: '9px', color: '#ffee44' }).setDepth(9.1);
          this.pushToast('Sea Fort cleared! A vault key has appeared — pick it up with [F].');
        }
      }
    }
  }

  spawnGhostArmada() {
    if (!this.canSpawnHostile()) return;
    const x = this.playerShip.x + Phaser.Math.Between(340, 650);
    const y = this.playerShip.y + Phaser.Math.Between(-280, 280);
    const body = this.add.rectangle(x, y, 40, 15, 0x6ea6ff, 0.9).setDepth(8);
    body.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
    this.enemyShips.push({
      sprite: body,
      hp: 520,
      cooldown: Phaser.Math.FloatBetween(1.2, 2.6),
      speed: Phaser.Math.FloatBetween(95, 125),
      ghost: true,
      phaseTimer: Phaser.Math.FloatBetween(3, 6),
      phased: false
    });
  }

  isNight() {
    const cycle = 30 * 60;
    const t = (this.daySeconds % cycle) / cycle;
    return t < 0.25 || t > 0.75;
  }

  updateProjectiles(dt) {
    this.stepProjectileArray(this.playerBalls, dt, (ball) => {
      for (const enemy of this.enemyShips) {
        if (enemy.hp <= 0) continue;
        if (enemy.ghost && enemy.phased) continue;
        if (Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, enemy.sprite.x, enemy.sprite.y) < 16) {
          enemy.hp -= ball.damage ?? 120;

          if (ball.burn) {
            enemy.burningFor = 3;
          }

          if ((ball.splash ?? 0) > 0) {
            for (const neighbor of this.enemyShips) {
              if (neighbor.hp <= 0 || neighbor === enemy) continue;
              if (Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, neighbor.sprite.x, neighbor.sprite.y) <= ball.splash) {
                neighbor.hp -= Math.floor((ball.damage ?? 100) * 0.35);
              }
            }
          }

          if (enemy.hp <= 0) {
            enemy.sprite.destroy();
            this.state.addShipSinkCredit();
            if (enemy.ghost) this.state.addGhostShipSinkCredit();
            this.pushToast('Enemy vessel sunk.');
          }
          return true;
        }
      }

      // Sea creature hit check
      for (const creature of this.creatures) {
        if (creature.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, creature.sprite.x, creature.sprite.y) < (creature.hitRadius ?? 20)) {
          creature.hp -= (ball.damage ?? 120) * 0.6;
          if (creature.hp <= 0) {
            creature.sprite.destroy();
            this.state.addSeaCreatureReward(creature.type);
            this.pushToast(`${creature.label} sunk by cannon fire!`);
            this.creatures.splice(this.creatures.indexOf(creature), 1);
          }
          return true;
        }
      }

      // Land target hit check (skeletons and fort bosses)
      for (const skel of this.skeletons) {
        if (skel.hp <= 0) continue;
        const hitRadius = skel.isBoss ? 20 : 13;
        if (Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, skel.sprite.x, skel.sprite.y) < hitRadius) {
          skel.hp -= Math.floor((ball.damage ?? 120) * (skel.isBoss ? 0.85 : 1));
          if ((ball.splash ?? 0) > 0) {
            for (const nearby of this.skeletons) {
              if (nearby.hp <= 0 || nearby === skel) continue;
              if (Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, nearby.sprite.x, nearby.sprite.y) <= ball.splash) {
                nearby.hp -= Math.floor((ball.damage ?? 120) * 0.45);
              }
            }
          }
          if (skel.hp <= 0) {
            skel.sprite.destroy();
            this.state.gold += skel.isBoss ? 850 : 45;
            this.state.addSkeletonDefeatCredit();
            this.pushToast(skel.isBoss ? 'Fort boss obliterated by cannon fire!' : 'Skeleton blasted by cannon fire!');
          }
          return true;
        }
      }

      // Cannonballs now collide with landmasses; splash can still damage nearby land targets.
      for (const island of this.world.islands) {
        const islandDist = Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, island.x, island.y);
        if (islandDist <= island.radius + 2) {
          if ((ball.splash ?? 0) > 0) {
            for (const skel of this.skeletons) {
              if (skel.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, skel.sprite.x, skel.sprite.y) <= ball.splash + (skel.isBoss ? 8 : 0)) {
                skel.hp -= Math.floor((ball.damage ?? 120) * 0.35);
                if (skel.hp <= 0) {
                  skel.sprite.destroy();
                  this.state.gold += skel.isBoss ? 850 : 45;
                  this.state.addSkeletonDefeatCredit();
                }
              }
            }
          }
          return true;
        }
      }

      return false;
    });

    this.stepProjectileArray(this.enemyBalls, dt, (ball) => {
      if (!this.onFoot && Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, this.playerShip.x, this.playerShip.y) < 20) {
        this.state.applyShipDamage(70);
        this.pushToast('Incoming hit on hull!');
        return true;
      }
      if (this.onFoot && Phaser.Math.Distance.Between(ball.sprite.x, ball.sprite.y, this.playerPawn.x, this.playerPawn.y) < 16) {
        this.state.damagePlayer(28);
        this.pushToast('You were hit by cannon fire!');
        return true;
      }
      return false;
    });
  }

  stepProjectileArray(arr, dt, onCollide) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const obj = arr[i];
      obj.ttl -= dt;
      obj.sprite.x += obj.vel.x * dt;
      obj.sprite.y += obj.vel.y * dt;

      const expired =
        obj.ttl <= 0 ||
        obj.sprite.x < 0 || obj.sprite.y < 0 ||
        obj.sprite.x > this.world.width || obj.sprite.y > this.world.height ||
        onCollide(obj);

      if (expired) {
        obj.sprite.destroy();
        arr.splice(i, 1);
      }
    }
  }

  handleInteractions() {
    const actorX = this.onFoot ? this.playerPawn.x : this.playerShip.x;
    const actorY = this.onFoot ? this.playerPawn.y : this.playerShip.y;
    const nearest = this.findNearestIsland(this.onFoot ? 52 : 82, actorX, actorY);
    const outpostCandidate = this.findNearestIsland(88, actorX, actorY);
    const nearestOutpost = outpostCandidate?.type === 'outpost' ? outpostCandidate : null;
    const nearestLootNode = this.onFoot ? this.findNearestLootNode(110, actorX, actorY) : null;
    const lootPressed = this.onFoot && this.consumeLootPress();

    // --- Fort vault open with E ---
    if (this.onFoot && this.fortKey && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      const fort = this.seafortStates?.get(this.fortKey);
      if (fort && !fort.opened) {
        const dist = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, fort.island.x, fort.island.y);
        if (dist < fort.island.radius * 0.65) {
          fort.opened = true;
          this.fortKey = null;
          if (fort.vaultDoor) fort.vaultDoor.setFillStyle(0x664400);
          if (fort.vaultLock) fort.vaultLock.setFillStyle(0x44cc44);
          if (fort.vaultLabel?.setText) fort.vaultLabel.setText('OPEN');
          if (fort.vaultFlag) fort.vaultFlag.setFillStyle(0x7cffc8);
          const bossVault = Boolean(fort.bossSpawned);
          const chestCount = bossVault ? Phaser.Math.Between(12, 20) : Phaser.Math.Between(5, 10);
          for (let c = 0; c < chestCount; c++) {
            const ca = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const cd = Phaser.Math.Between(16, Math.max(22, Math.floor(fort.island.radius * 0.45)));
            const cx = fort.island.x + Math.cos(ca) * cd;
            const cy = fort.island.y + Math.sin(ca) * cd;
            this.createLootNodeAt(cx, cy, {
              zone: fort.island.zone,
              sourceType: bossVault ? 'bossVault' : 'seafortVault',
              valueMult: bossVault ? 2.6 : 1,
              islandId: fort.island.id,
              requiresDive: false
            });
          }
          this.pushToast(bossVault
            ? `Boss Vault opened! ${chestCount} high-value treasure chests inside!`
            : `Vault opened! ${chestCount} treasure chests inside!`);
          return;
        } else {
          this.pushToast('Move deeper into the fort to use the vault key [E].');
          return;
        }
      }
    }

    // --- Fort start with F at the flag ---
    if (lootPressed) {
      const fort = nearest && (nearest.type === 'seafort' || nearest.type === 'skullfort') ? this.seafortStates?.get(nearest.id) : null;
      if (fort && !fort.started) {
        const flagDist = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, fort.island.x, fort.island.y - 38);
        if (flagDist < 42) {
          fort.started = true;
          if (fort.fortFlag) fort.fortFlag.setFillStyle(0xffffff);
          if (fort.fortFlagLabel?.setText) fort.fortFlagLabel.setText('RAISED');
          this.spawnIslandDefender(fort.island);
          this.pushToast('Fort flag raised! Defeat the defenders to claim the vault key.');
          return;
        }
      }
    }

    if (this.onFoot && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      const barrel = this.findNearestSupplyBarrel(34, this.playerPawn.x, this.playerPawn.y);
      if (barrel) {
        barrel.used = true;
        for (const s of barrel.sprites) {
          if (s.setFillStyle) s.setFillStyle(0x393939);
          if (s.setAlpha) s.setAlpha(0.8);
        }
        const refill = this.state.replenishSupplies();
        this.pushToast(refill.reason);
        return;
      }
    }

    if (lootPressed) {
      let pickupNode = this.findNearestLootNode(140, this.playerPawn.x, this.playerPawn.y);
      if (!pickupNode && nearest?.lootNode && !nearest.lootNode.taken) {
        const fallbackDist = this.getLootNodeDistance(nearest.lootNode, this.playerPawn.x, this.playerPawn.y);
        if (Number.isFinite(fallbackDist) && fallbackDist <= 180) pickupNode = nearest.lootNode;
      }
      const nearShip = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, this.playerShip.x, this.playerShip.y) <= this.boardingReturnRadius + 28;

      // --- Ship cargo loop: set down / pick back up with F ---
      if (this.carriedLoot && nearShip) {
        this.state.loadCargo(this.carriedLoot);
        this.pushToast(`Stored ${this.carriedLoot.name} on deck.`);
        this.carriedLoot = null;
        if (this.carriedLootSprite) {
          this.carriedLootSprite.destroy();
          this.carriedLootSprite = null;
        }
        this.refreshShipCargoVisuals();
        return;
      }

      if (!this.carriedLoot && this.state.cargo.length > 0 && nearShip && !pickupNode) {
        this.carriedLoot = this.state.cargo.pop();
        this.refreshShipCargoVisuals();
        this.pushToast(`Picked up ${this.carriedLoot.name} from your ship.`);
        return;
      }

      // --- Fort key pickup ---
      if (this.seafortStates) {
        for (const [id, fort] of this.seafortStates.entries()) {
          if (!fort.cleared || fort.opened || !fort.keySprite) continue;
          const dist = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, fort.keySprite.x, fort.keySprite.y);
          if (dist < 52) {
            this.fortKey = id;
            fort.keySprite.destroy();
            if (fort.keyGlowSprite) fort.keyGlowSprite.destroy();
            fort.keySprite = null;
            this.pushToast('Fort Vault Key obtained! Press [E] near the vault to open it.');
            return;
          }
        }
      }

      if (this.carriedLoot) {
        this.pushToast(`Already carrying ${this.carriedLoot.name}. Bring it to the ship.`);
      } else if (!pickupNode) {
        this.pushToast('No loot cache nearby.');
      } else if (pickupNode.requiresDive && !this.state.player.isDiving) {
        this.pushToast('Shipwreck loot requires diving [T].');
      } else {
        const zone = ZONES.find((z) => z.key === pickupNode.zone);
        const treasure = this.state.rollTreasure(zone?.danger ?? 1, pickupNode.treasureTier ?? null);
        treasure.fromType = pickupNode.sourceType;
        if (pickupNode.valueMult && pickupNode.valueMult > 1) {
          treasure.baseValue = Math.floor(treasure.baseValue * pickupNode.valueMult);
        }
        this.carriedLoot = treasure;
        pickupNode.taken = true;
        pickupNode.sprites.forEach((s) => s.setVisible(false));
        this.pushToast(`Picked up ${treasure.name}. Return it to your ship.`);
      }
    }

    if (this.onFoot && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      const distToShip = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, this.playerShip.x, this.playerShip.y);
      if (this.carriedLoot && distToShip <= this.boardingReturnRadius + 22) {
        this.state.loadCargo(this.carriedLoot);
        this.pushToast(`Stored ${this.carriedLoot.name} on deck.`);
        this.carriedLoot = null;
        if (this.carriedLootSprite) {
          this.carriedLootSprite.destroy();
          this.carriedLootSprite = null;
        }
        this.refreshShipCargoVisuals();
        return;
      }

      const enemy = this.findNearestEnemyShip(44, this.playerPawn.x, this.playerPawn.y);
      if (enemy) {
        enemy.hp -= 100;
        this.state.gold += 80;
        this.state.addBoardSabotageCredit();
        this.state.wantedLevel = Math.min(5, this.state.wantedLevel + 1);
        this.pushToast('Sabotage successful: plundered enemy cargo and damaged helm.');
        return;
      }
      // fall through to outpost sell check below
    }

    const sellPressed = Phaser.Input.Keyboard.JustDown(this.keys.sell);

    if (this.onFoot && Phaser.Input.Keyboard.JustDown(this.keys.interact) && nearestOutpost) {
      const npc = nearestOutpost.outpostNpc;
      const npcDist = npc ? Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, npc.x, npc.y) : Infinity;
      if (npcDist <= 68) {
        this.pushToast('Press [,] to sell loot to the merchant.');
        return;
      }
    }

    if (sellPressed) {
      if (!nearestOutpost) {
        this.pushToast('Visit an outpost to sell your loot.');
        return;
      }
      const npc = nearestOutpost.outpostNpc;
      if (!npc) {
        this.pushToast('NPC not found at outpost.');
        return;
      }
      const npcDist = Phaser.Math.Distance.Between(this.playerPawn.x, this.playerPawn.y, npc.x, npc.y);
      if (!this.onFoot) {
        this.pushToast('Walk to the outpost NPC to sell your cargo.');
        return;
      }
      if (npcDist > 68) {
        this.pushToast('Get closer to the merchant to sell.');
        return;
      }
      if (this.carriedLoot) {
        const sold = this.carriedLoot;
        const sale = this.state.sellCargoItem(sold);
        this.carriedLoot = null;
        if (this.carriedLootSprite) {
          this.carriedLootSprite.destroy();
          this.carriedLootSprite = null;
        }
        this.state.unbankedRep = 0;
        this.pushToast(`Sold ${sold.name} to the outpost merchant for ${sale.total} gold.`);
        if (sold.tier === 'legendaryRelics' && this.network?.connected) {
          this.network.sendMessage({
            type: 'legendary:sale',
            itemName: sold.name,
            value: sold.baseValue
          });
        }
      } else if (this.state.cargo.length > 0) {
        this.pushToast('Pick up a crate from your ship first with [F], then sell it to the merchant.');
      } else {
        this.pushToast('You have no loot to sell.');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.upgrade) && nearestOutpost && !this.onFoot) {
      this.tryBuyContextUpgrade();
    }
  }

  tryBuyContextUpgrade() {
    const candidates = Object.keys(SHIP_UPGRADES).filter((k) => !this.state.ship.upgrades.includes(k));
    if (!candidates.length) {
      this.pushToast('All current upgrades purchased.');
      return;
    }

    const byCostAsc = candidates.sort((a, b) => SHIP_UPGRADES[a].cost - SHIP_UPGRADES[b].cost);
    const affordable = byCostAsc.find((k) => SHIP_UPGRADES[k].cost <= this.state.gold) ?? byCostAsc[0];
    const result = this.state.tryBuyUpgrade(affordable);
    this.pushToast(`${result.reason} ${result.ok ? `(-${SHIP_UPGRADES[affordable].cost}g)` : ''}`);
  }

  buyContextCosmetic() {
    const options = this.state.getBuyableCosmetics();
    if (!options.length) {
      this.pushToast('All available cosmetics owned.');
      return;
    }

    const sorted = [...options].sort((a, b) => a.cost - b.cost);
    const pick = sorted.find((c) => c.cost <= this.state.gold) ?? sorted[0];
    const result = this.state.buyCosmetic(pick.id);
    this.pushToast(`${result.reason} ${result.ok ? `(-${pick.cost}g)` : ''}`);
  }

  findNearestRemoteShip(maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const sprite of this.remoteShipSprites.values()) {
      const d = Phaser.Math.Distance.Between(this.playerShip.x, this.playerShip.y, sprite.x, sprite.y);
      if (d < bestDist) {
        bestDist = d;
        best = sprite;
      }
    }
    return best;
  }

  getCurrentZone() {
    return ZONES.find((z) => this.playerShip.x >= z.xMin && this.playerShip.x < z.xMax) ?? ZONES[ZONES.length - 1];
  }

  findNearestIsland(maxDist, fromX = this.playerShip.x, fromY = this.playerShip.y) {
    let nearest = null;
    let best = Infinity;

    for (const island of this.world.islands) {
      const d = Phaser.Math.Distance.Between(fromX, fromY, island.x, island.y) - island.radius;
      if (d < best && d <= maxDist) {
        best = d;
        nearest = island;
      }
    }

    return nearest;
  }

  updateDayNight() {
    const cycle = 30 * 60;
    const t = (this.daySeconds % cycle) / cycle;
    const darkness = Math.max(0, Math.sin((t - 0.25) * Math.PI * 2));

    const fogModifier = this.wind.weather.key === 'cursedfog' ? 0.2 : 0;
    this.nightOverlay.fillAlpha = Phaser.Math.Clamp(darkness * 0.45 + fogModifier, 0, 0.7);

    if (this.state.player.blurRemaining > 0) {
      this.cameras.main.setRotation(Math.sin(this.time.now * 0.01) * 0.01);
    } else {
      this.cameras.main.setRotation(0);
    }
  }

  updateHud() {
    const mode = this.onFoot ? 'On Foot' : 'At Helm';
    const speed = Math.floor(this.shipVel.length());
    const player = this.state.player;
    const zone = this.getCurrentZone();
    const carrying = this.carriedLoot ? this.carriedLoot.name : 'None';
    const fortKeyHint = this.fortKey ? ' | 🗝 FORT KEY' : '';

    this.hudText.setText([
      `${SHIP_CLASSES[this.shipType].label} | ${mode} | Zone: ${zone.name} | Speed ${speed} | Hull ${Math.floor(this.state.ship.hull)} | Cargo ${this.state.cargo.length} | Gold ${this.state.gold}${fortKeyHint}`,
      `HP ${Math.floor(player.hp)}  Stamina ${Math.floor(player.stamina)}  Breath ${player.isDiving ? `${player.breath.toFixed(1)}s` : 'Surface'} | Carrying: ${carrying} | [G] deck/island [SPACE] jump [F] pick up / fort flag / ship cargo [E] interact/store [,] sell [J] sword`
    ]);

    if (this.toastTimer > 0) {
      this.toastTimer -= this.game.loop.delta / 1000;
      this.toast.setText(this.toastText);
      this.toast.setAlpha(1);
    } else {
      this.toast.setAlpha(0);
    }
  }

  updateChartOverlay() {
    if (!this.chartVisible) return;

    const zone = this.getCurrentZone();
    const nearest = this.findNearestIsland(300, this.playerShip.x, this.playerShip.y);
    const event = this.state.activeEvent?.label ?? 'None';
    const eventObjective = this.state.activeEventObjective;
    const contract = this.state.activeContract;
    const contractStep = contract?.steps?.[contract.currentStep] ?? null;
    const shipLog = this.state.profile.shipLog ?? [];
    const hall = this.state.profile.hallOfLegends ?? [];
    const logLines = shipLog.length
      ? shipLog.map((entry, idx) => `${idx + 1}. ${entry.itemName} — ${entry.value}g`)
      : ['No legendary sales yet.'];
    const hallLines = hall.length
      ? hall.slice(0, 5).map((entry, idx) => `${idx + 1}. ${entry.crewName} — Fame ${entry.crewFame}`)
      : ['No crews ranked yet.'];

    this.chartText.setText([
      `Position: (${Math.floor(this.playerShip.x)}, ${Math.floor(this.playerShip.y)})`,
      `Current Zone: ${zone.name} | Wind Heading: ${Math.floor((Phaser.Math.RadToDeg(this.wind.angle) + 360) % 360)}°`,
      `Weather: ${this.wind.weather.label} | Active Event: ${event}`,
      `Event Objective: ${eventObjective ? `${eventObjective.objective} ${eventObjective.progress}/${eventObjective.target}` : 'None'}`,
      `Voyage Contract: ${contract ? `${contract.label} | ${contract.complete ? 'Complete' : `${contractStep?.label ?? 'Step'} ${Math.floor(contract.stepProgress)}/${contractStep?.target ?? 0}`}` : 'None'}`,
      `Diving: ${this.state.player.isDiving ? `Underwater (${this.state.player.breath.toFixed(1)}s breath)` : 'Surface'}`,
      `Nearest Landmark: ${nearest ? `${nearest.type.toUpperCase()} ${nearest.id}` : 'Open Water'}`,
      `Ship: ${SHIP_CLASSES[this.shipType].label} | Crew ${this.state.crewCount}/${this.shipStats.maxCrew} | Wanted ${Math.floor(this.state.wantedLevel)}`,
      '',
      'Global Ship Log (Latest 5 Legendary Sales):',
      ...logLines,
      '',
      'Hall of Legends (Top Fame Crews):',
      ...hallLines,
      '',
      'Controls: [TAB] Close Chart | [X] Anchor | [Z] Emergency Anchor | [V] Repair Worst Component | [I] Cycle Role | [O] Crew Mode | [N] Network'
    ]);
  }

  toggleNetworkConnection() {
    if (this.network?.connected) {
      this.network.disconnect();
      this.networkEnabled = false;
      this.pushToast('Disconnected from server.');
      return;
    }

    if (!this.network) this.network = new NetworkClient('ws://localhost:2567');
    this.network.onSnapshot = (snapshot) => this.applyNetworkSnapshot(snapshot);
    this.network.connect({
      name: 'LocalCaptain',
      shipType: this.shipType,
      crewId: this.faction,
      role: this.state.crewRole,
      openCrew: this.openCrew,
      crewName: this.crewName
    })
      .then(() => {
        this.networkEnabled = true;
        this.pushToast('Connected to server.');
      })
      .catch(() => {
        this.networkEnabled = false;
        this.pushToast('Failed to connect to server.');
      });
  }

  applyNetworkSnapshot(snapshot) {
    this.networkSnapshot = snapshot;

    if (this.network?.selfPlayerId) {
      const selfPlayerMeta = (snapshot.players ?? []).find((p) => p.playerId === this.network.selfPlayerId);
      const selfCrew = (snapshot.crews ?? []).find((c) => c.crewId === selfPlayerMeta?.crewId);
      if (typeof selfCrew?.openCrew === 'boolean') this.openCrew = selfCrew.openCrew;
    }

    if (!this.network?.selfPlayerId) return;
    const selfPlayer = (snapshot.players ?? []).find((p) => p.playerId === this.network.selfPlayerId);
    if (!selfPlayer) return;
    const selfShip = (snapshot.ships ?? []).find((s) => s.shipId === selfPlayer.shipId);
    if (!selfShip) return;

    const dx = selfShip.position.x - this.playerShip.x;
    const dy = selfShip.position.y - this.playerShip.y;
    const error = Math.hypot(dx, dy);

    if (error > 180) {
      this.playerShip.x = selfShip.position.x;
      this.playerShip.y = selfShip.position.y;
      this.shipVel.set(0, 0);
    } else if (error > 12) {
      this.playerShip.x = Phaser.Math.Linear(this.playerShip.x, selfShip.position.x, 0.15);
      this.playerShip.y = Phaser.Math.Linear(this.playerShip.y, selfShip.position.y, 0.15);
    }

    this.heading = Phaser.Math.Angle.RotateTo(this.heading, selfShip.heading, 0.08);
  }

  updateRemoteShips() {
    if (!this.networkSnapshot?.ships) return;

    const selfId = this.network.selfPlayerId;
    const playerMap = new Map((this.networkSnapshot.players ?? []).map((p) => [p.shipId, p.playerId]));
    const playerCrewMap = new Map((this.networkSnapshot.players ?? []).map((p) => [p.playerId, p.crewId]));
    const crews = this.networkSnapshot.crews ?? [];
    const crewById = new Map(crews.map((c) => [c.crewId, c]));
    const selfCrewId = playerCrewMap.get(selfId) ?? null;
    const selfCrew = crewById.get(selfCrewId) ?? null;

    const alive = new Set();
    for (const ship of this.networkSnapshot.ships) {
      if (playerMap.get(ship.shipId) === selfId) continue;
      alive.add(ship.shipId);

      const ownerPlayerId = playerMap.get(ship.shipId);
      const ownerCrewId = playerCrewMap.get(ownerPlayerId) ?? null;
      const isAllied = Boolean(selfCrew?.allianceWith && selfCrew.allianceWith === ownerCrewId);

      let sprite = this.remoteShipSprites.get(ship.shipId);
      if (!sprite) {
        sprite = this.add.rectangle(ship.position.x, ship.position.y, 34, 14, 0x6bc5ff, 0.85).setDepth(8);
        sprite.targetX = ship.position.x;
        sprite.targetY = ship.position.y;
        sprite.targetRot = ship.heading;
        this.remoteShipSprites.set(ship.shipId, sprite);
      }

      sprite.crewId = ownerCrewId;
      sprite.fillColor = isAllied ? 0x79df8a : 0x6bc5ff;

      sprite.targetX = ship.position.x;
      sprite.targetY = ship.position.y;
      sprite.targetRot = ship.heading;
    }

    for (const [shipId, sprite] of this.remoteShipSprites.entries()) {
      if (!alive.has(shipId)) {
        sprite.destroy();
        this.remoteShipSprites.delete(shipId);
        continue;
      }

      sprite.x = Phaser.Math.Linear(sprite.x, sprite.targetX ?? sprite.x, 0.2);
      sprite.y = Phaser.Math.Linear(sprite.y, sprite.targetY ?? sprite.y, 0.2);
      sprite.rotation = Phaser.Math.Angle.RotateTo(sprite.rotation, sprite.targetRot ?? sprite.rotation, 0.1);
    }
  }

  formatClock(totalSeconds) {
    const cycle = 30 * 60;
    const normalized = ((totalSeconds % cycle) + cycle) % cycle;
    const hours = Math.floor((normalized / cycle) * 24);
    const mins = Math.floor((((normalized / cycle) * 24) % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
