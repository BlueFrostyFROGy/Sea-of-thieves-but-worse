import Phaser from 'phaser';
import {
  AMMO_TYPES,
  COSMETIC_CATALOG,
  FACTIONS,
  FACTION_RANK_UNLOCKS,
  LEGENDARY_ACHIEVEMENTS,
  MISSION_TEMPLATES,
  SHIP_CLASSES,
  SHIP_UPGRADES,
  TREASURE_TABLE,
  VOYAGE_CONTRACT_TEMPLATES,
  WORLD_EVENT_OBJECTIVES,
  WORLD_EVENTS
} from '../data/gddData.js';
import { computeWarshipPermit, factionRank, loadProfile, saveProfile } from './ProfileSystem.js';

function weightedChoice(table, rng) {
  const total = table.reduce((acc, item) => acc + item.weight, 0);
  let cursor = rng.frac() * total;
  for (const item of table) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return table[0];
}

const ROLE_ORDER = ['helmsman', 'cannoneer', 'lookout', 'engineer', 'boarder', 'quartermaster'];
const ROLE_EFFECTS = {
  helmsman: { maneuver: 1.12 },
  cannoneer: { reload: 1.15 },
  lookout: { vision: 1.2 },
  engineer: { repair: 1.15, bail: 1.2 },
  boarder: { melee: 1.2 },
  quartermaster: { saleBonus: 1.08 }
};

export class GameState {
  constructor(scene, shipType = 'skiff', faction = 'saltwind', profileInput = null, crewCount = 1, crewRole = 'helmsman') {
    this.scene = scene;
    this.shipType = shipType;
    this.faction = faction;
    this.crewCount = crewCount;
    this.crewRole = ROLE_ORDER.includes(crewRole) ? crewRole : 'helmsman';
    this.profile = profileInput ?? loadProfile();
    this.profileStartStats = { ...(this.profile.stats ?? {}) };

    const stats = SHIP_CLASSES[shipType];
    this.ship = {
      maxHull: stats.hp,
      hull: stats.hp,
      water: 0,
      sailTrim: 0.8,
      upgrades: [],
      effects: {},
      anchorDown: false,
      anchorRaisingRemaining: 0,
      components: {
        helm: 100,
        capstan: 100,
        lantern: 100,
        cargoDoor: 100,
        sails: 100,
        masts: 100,
        cannons: 100
      }
    };

    this.gold = this.profile.gold ?? 0;
    this.cargo = [];
    this.reputation = { ...Object.fromEntries(Object.keys(FACTIONS).map((k) => [k, 0])), ...(this.profile.reputation ?? {}) };
    this.factionCurrency = { ...Object.fromEntries(Object.keys(FACTIONS).map((k) => [k, 0])), ...(this.profile.factionCurrency ?? {}) };
    this.unbankedRep = 0;
    this.activeEvent = null;
    this.activeEventObjective = null;
    this.currentMission = this.makeMission();
    this.activeContract = null;
    this.wantedLevel = 0;
    this.noDeathStreak = true;
    this.firstLegendarySold = false;
    this.metrics = {
      shipsSunk: 0,
      islandsLooted: 0,
      ghostLooted: 0,
      legendarySold: 0,
      soldCount: 0,
      soldDuringEvent: 0,
      boardSabotage: 0,
      creatureDefeated: 0,
      survivedSeconds: 0,
      visitedZones: new Set()
    };

    this.availableAmmo = this.resolveUnlockedAmmo();
    this.selectedAmmo = this.availableAmmo[0];
    this.playerCannonCooldown = 0;
    this.sidearmCooldown = 0;

    this.player = {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      isDowned: false,
      deathVeilRemaining: 0,
      blurRemaining: 0,
      isDiving: false,
      breath: 15,
      maxBreath: 15,
      food: {
        banana: 3,
        fish: 2,
        rum: 1
      }
    };

    this.rng = new Phaser.Math.RandomDataGenerator([String(Date.now())]);
    this.rankUnlocksGranted = new Set(this.profile.rankUnlocksGranted ?? []);
    this.achievementsGranted = new Set(this.profile.achievementsGranted ?? []);

    for (const factionKey of Object.keys(FACTIONS)) this.checkFactionRankUnlocks(factionKey, true);
    this.scheduleNextWorldEvent();
  }

  getCrewEfficiency() {
    const stats = SHIP_CLASSES[this.shipType];
    const ratio = Phaser.Math.Clamp(this.crewCount / stats.optimalCrew, 0.25, 1.15);
    const role = ROLE_EFFECTS[this.crewRole] ?? {};
    return {
      maneuver: ratio,
      reload: ratio,
      repair: ratio,
      bail: 1,
      melee: 1,
      saleBonus: 1,
      vision: 1,
      fullCrewBonus: this.shipType === 'galleon' && this.crewCount >= 6 ? 1.1 : this.shipType === 'warship' && this.crewCount >= 6 ? 1.1 : 1,
      ...role
    };
  }

  cycleRole() {
    const idx = ROLE_ORDER.indexOf(this.crewRole);
    this.crewRole = ROLE_ORDER[(idx + 1) % ROLE_ORDER.length];
    return this.crewRole;
  }

  makeMission() {
    const pool = MISSION_TEMPLATES[this.faction];
    const pick = Phaser.Utils.Array.GetRandom(pool);
    return {
      ...pick,
      progress: 0,
      complete: false
    };
  }

  startContract() {
    if (this.activeContract && !this.activeContract.complete) return { ok: false, reason: 'Finish current contract first.' };
    const pool = VOYAGE_CONTRACT_TEMPLATES[this.faction] ?? [];
    if (!pool.length) return { ok: false, reason: 'No contracts available.' };

    const template = Phaser.Utils.Array.GetRandom(pool);
    const baseline = {
      lootAny: this.metrics.islandsLooted,
      sinkShips: this.metrics.shipsSunk,
      boardSabotage: this.metrics.boardSabotage,
      sellCount: this.metrics.soldCount,
      lootGhost: this.metrics.ghostLooted,
      sellDuringEvent: this.metrics.soldDuringEvent,
      defeatCreature: this.metrics.creatureDefeated
    };
    this.activeContract = {
      ...template,
      currentStep: 0,
      stepProgress: 0,
      complete: false,
      metricBaseline: baseline
    };
    return { ok: true, reason: `Contract accepted: ${template.label}` };
  }

  turnInContract() {
    if (!this.activeContract?.complete) return { ok: false, reason: 'Contract not complete.' };
    const rewardGold = this.activeContract.rewardGold;
    const rewardRep = this.activeContract.rewardRep;
    this.gold += rewardGold;
    this.reputation[this.faction] += rewardRep;
    this.factionCurrency[this.faction] += Math.max(6, Math.floor(rewardRep * 0.6));
    this.checkFactionRankUnlocks(this.faction);
    const label = this.activeContract.label;
    this.activeContract = null;
    this.syncProfile();
    return { ok: true, reason: `Contract turned in: ${label} (+${rewardGold}g, +${rewardRep} rep)` };
  }

  tickContract(currentZoneKey, deltaSec) {
    const c = this.activeContract;
    if (!c || c.complete) return;

    const step = c.steps[c.currentStep];
    if (!step) return;

    if (step.objective === 'visitZone' && currentZoneKey && step.zone === currentZoneKey) {
      c.stepProgress = Math.min(step.target, c.stepProgress + deltaSec * 0.8);
    }
    if (step.objective === 'surviveTime') {
      c.stepProgress = Math.min(step.target, c.stepProgress + deltaSec);
    }

    const metricValue = {
      lootAny: this.metrics.islandsLooted,
      sinkShips: this.metrics.shipsSunk,
      boardSabotage: this.metrics.boardSabotage,
      sellCount: this.metrics.soldCount,
      lootGhost: this.metrics.ghostLooted,
      sellDuringEvent: this.metrics.soldDuringEvent,
      defeatCreature: this.metrics.creatureDefeated
    }[step.objective];

    if (metricValue !== undefined) {
      const baseline = c.metricBaseline?.[step.objective] ?? 0;
      c.stepProgress = Math.min(step.target, Math.max(0, metricValue - baseline));
    }

    if (c.stepProgress >= step.target) {
      c.currentStep += 1;
      c.stepProgress = 0;
      if (c.currentStep >= c.steps.length) {
        c.complete = true;
        this.scene.events.emit('contract-complete', c);
      }
    }
  }

  resolveUnlockedAmmo() {
    const ammo = [];
    for (const [key, def] of Object.entries(AMMO_TYPES)) {
      if (!def.unlockFaction) {
        ammo.push(key);
        continue;
      }
      const rep = this.reputation[def.unlockFaction] ?? 0;
      if (factionRank(rep) >= (def.unlockRank ?? 1)) ammo.push(key);
    }
    if (this.ship.upgrades.includes('chainShotCannons') && !ammo.includes('chain')) ammo.push('chain');
    return ammo;
  }

  cycleAmmo() {
    const idx = this.availableAmmo.indexOf(this.selectedAmmo);
    const next = (idx + 1) % this.availableAmmo.length;
    this.selectedAmmo = this.availableAmmo[next];
    return AMMO_TYPES[this.selectedAmmo].label;
  }

  getAmmoDef() {
    return AMMO_TYPES[this.selectedAmmo] ?? AMMO_TYPES.iron;
  }

  update(deltaSec, currentZoneKey = null) {
    this.metrics.survivedSeconds += deltaSec;
    this.playerCannonCooldown = Math.max(0, this.playerCannonCooldown - deltaSec);
    this.sidearmCooldown = Math.max(0, this.sidearmCooldown - deltaSec);
    this.player.blurRemaining = Math.max(0, this.player.blurRemaining - deltaSec);

    if (this.player.isDiving) {
      this.player.breath = Math.max(0, this.player.breath - deltaSec);
      if (this.player.breath <= 0) this.damagePlayer(8 * deltaSec);
    } else {
      this.player.breath = Math.min(this.player.maxBreath, this.player.breath + deltaSec * 2.3);
    }

    if (this.player.isDowned) {
      this.player.deathVeilRemaining -= deltaSec;
      if (this.player.deathVeilRemaining <= 0) {
        this.player.isDowned = false;
        this.player.hp = 50;
        this.scene.events.emit('player-respawned');
      }
    }

    if (currentZoneKey) this.metrics.visitedZones.add(currentZoneKey);
    this.tickMission();
    this.tickContract(currentZoneKey, deltaSec);
  }

  scheduleNextWorldEvent() {
    const delayMs = Phaser.Math.Between(50000, 90000);
    this.scene.time.delayedCall(delayMs, () => {
      this.activeEvent = Phaser.Utils.Array.GetRandom(WORLD_EVENTS);
      const objectiveDef = WORLD_EVENT_OBJECTIVES[this.activeEvent.key];
      this.activeEventObjective = objectiveDef
        ? {
          key: this.activeEvent.key,
          ...objectiveDef,
          progress: 0,
          complete: false
        }
        : null;
      this.scene.events.emit('event-started', this.activeEvent);

      this.scene.time.delayedCall(30000, () => {
        this.activeEvent = null;
        this.activeEventObjective = null;
        this.scene.events.emit('event-ended');
        this.scheduleNextWorldEvent();
      });
    });
  }

  progressActiveEvent(objective, amount = 1) {
    const e = this.activeEventObjective;
    if (!e || e.complete || e.objective !== objective) return;
    e.progress = Math.min(e.target, e.progress + amount);
    if (e.progress >= e.target) {
      e.complete = true;
      this.gold += e.rewardGold;
      this.reputation[this.faction] += e.rewardRep;
      this.factionCurrency[this.faction] += Math.max(5, Math.floor(e.rewardRep * 0.5));
      this.scene.events.emit('event-objective-complete', e);
      this.checkFactionRankUnlocks(this.faction);
      this.syncProfile();
    }
  }

  rollTreasure(zoneDanger = 1, forcedTier = null) {
    const table = forcedTier
      ? TREASURE_TABLE.filter((t) => t.tier === forcedTier)
      : TREASURE_TABLE;
    const item = weightedChoice(table.length ? table : TREASURE_TABLE, this.rng);
    const rawValue = Phaser.Math.Between(item.min, item.max);
    const zoneMultiplier = 1 + zoneDanger * 0.18;
    return {
      id: `${item.id}_${Math.floor(this.rng.frac() * 99999)}`,
      tier: item.tier,
      name: item.name,
      baseValue: Math.floor(rawValue * zoneMultiplier),
      discoveredAt: Date.now()
    };
  }

  replenishSupplies() {
    const maxFood = { banana: 12, fish: 8, rum: 6 };
    const gainFood = { banana: 3, fish: 2, rum: 1 };

    let foodGained = 0;
    for (const key of Object.keys(maxFood)) {
      const before = this.player.food[key] ?? 0;
      const after = Math.min(maxFood[key], before + gainFood[key]);
      this.player.food[key] = after;
      foodGained += Math.max(0, after - before);
    }

    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.ship.hull = Math.min(this.ship.maxHull, this.ship.hull + 120);
    this.ship.water = Math.max(0, this.ship.water - 14);
    for (const key of Object.keys(this.ship.components)) {
      this.ship.components[key] = Math.min(100, this.ship.components[key] + 8);
    }

    return {
      foodGained,
      reason: `Barrel looted: +${foodGained} food, ship patched, and supplies restocked.`
    };
  }

  loadCargo(treasure) {
    this.cargo.push(treasure);
    this.unbankedRep += 5;
    this.metrics.islandsLooted += 1;
    if (treasure.fromType === 'ghost') this.metrics.ghostLooted += 1;
    if (treasure.tier === 'legendaryRelics') this.wantedLevel = Math.min(5, this.wantedLevel + 2);
    return true;
  }

  addShipSinkCredit() {
    this.metrics.shipsSunk += 1;
    this.wantedLevel = Math.min(5, this.wantedLevel + 1);
    this.progressActiveEvent('sinkShips', 1);
  }

  buyCosmetic(cosmeticId) {
    const item = COSMETIC_CATALOG.find((c) => c.id === cosmeticId);
    if (!item) return { ok: false, reason: 'Unknown cosmetic.' };
    if ((this.profile.cosmetics ?? []).includes(item.label)) return { ok: false, reason: 'Already owned.' };
    if (item.faction) {
      const rank = factionRank(this.reputation[item.faction] ?? 0);
      if (rank < (item.minRank ?? 0)) return { ok: false, reason: `${item.faction} rank ${item.minRank} required.` };
    }
    if (this.gold < item.cost) return { ok: false, reason: 'Not enough gold.' };

    this.gold -= item.cost;
    this.profile.cosmetics = [...(this.profile.cosmetics ?? []), item.label];
    this.syncProfile();
    return { ok: true, reason: `${item.label} unlocked.` };
  }

  getBuyableCosmetics() {
    const owned = new Set(this.profile.cosmetics ?? []);
    return COSMETIC_CATALOG.filter((item) => {
      if (owned.has(item.label)) return false;
      if (!item.faction) return true;
      return factionRank(this.reputation[item.faction] ?? 0) >= (item.minRank ?? 0);
    });
  }

  addSkeletonDefeatCredit() {
    this.progressActiveEvent('defeatSkeletons', 1);
  }

  addGhostShipSinkCredit() {
    this.progressActiveEvent('sinkGhostShips', 1);
  }

  addBoardSabotageCredit() {
    this.metrics.boardSabotage += 1;
  }

  applyShipDamage(damage) {
    this.ship.hull = Math.max(0, this.ship.hull - damage);
    this.ship.water = Phaser.Math.Clamp(this.ship.water + damage * 0.045, 0, 100);

    const roll = Phaser.Math.Between(1, 100);
    let component = 'sails';
    if (roll <= 16) component = 'helm';
    else if (roll <= 30) component = 'capstan';
    else if (roll <= 45) component = 'cannons';
    else if (roll <= 60) component = 'masts';
    else if (roll <= 75) component = 'lantern';
    else if (roll <= 88) component = 'cargoDoor';

    this.ship.components[component] = Math.max(0, this.ship.components[component] - Math.ceil(damage * 0.16));
  }

  damagePlayer(amount) {
    if (this.player.isDowned) return;
    this.player.hp = Math.max(0, this.player.hp - amount);
    if (this.player.hp <= 0) {
      this.player.isDowned = true;
      this.player.deathVeilRemaining = 30;
      this.noDeathStreak = false;
      this.scene.events.emit('player-downed');
    }
  }

  canFireSidearm() {
    return !this.player.isDowned && this.sidearmCooldown <= 0;
  }

  consumeSidearmShot() {
    this.sidearmCooldown = 4;
  }

  useFood(itemKey) {
    const map = {
      banana: 25,
      fish: 50,
      rum: 75
    };

    if (!map[itemKey]) return { ok: false, reason: 'Unknown food item.' };
    if ((this.player.food[itemKey] ?? 0) <= 0) return { ok: false, reason: `No ${itemKey} left.` };
    if (this.player.hp >= this.player.maxHp) return { ok: false, reason: 'Already full health.' };

    this.player.food[itemKey] -= 1;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + map[itemKey]);
    if (itemKey === 'rum') this.player.blurRemaining = 4;
    return { ok: true, reason: `${itemKey} used (+${map[itemKey]} HP).` };
  }

  toggleDive() {
    this.player.isDiving = !this.player.isDiving;
    return this.player.isDiving;
  }

  addSeaCreatureReward(creatureKey) {
    const rewards = {
      shark: { gold: 110, rep: 8, token: 5 },
      lurker: { gold: 230, rep: 14, token: 8 },
      serpent: { gold: 950, rep: 40, token: 24 },
      kraken: { gold: 1500, rep: 60, token: 35 }
    };
    const r = rewards[creatureKey];
    if (!r) return;
    this.gold += r.gold;
    this.metrics.creatureDefeated += 1;
    this.reputation.reefwalker += r.rep;
    this.factionCurrency.reefwalker += r.token;
    if (creatureKey === 'serpent' || creatureKey === 'kraken') this.progressActiveEvent('defeatCreature', 1);
    this.checkFactionRankUnlocks('reefwalker');
    this.syncProfile();
  }

  bailWater() {
    const crewEff = this.getCrewEfficiency();
    this.ship.water = Math.max(0, this.ship.water - Math.floor(16 * (crewEff.bail ?? 1)));
  }

  repairHull() {
    const crewEff = this.getCrewEfficiency();
    const repairAmount = Math.floor(120 * (this.ship.effects.repairPenalty ?? 1) * crewEff.repair * crewEff.fullCrewBonus);
    this.ship.hull = Math.min(this.ship.maxHull, this.ship.hull + repairAmount);
    this.ship.water = Math.max(0, this.ship.water - 6);
  }

  repairComponent(componentKey) {
    if (!(componentKey in this.ship.components)) return { ok: false, reason: 'Unknown component.' };
    const crewEff = this.getCrewEfficiency();
    this.ship.components[componentKey] = Math.min(100, this.ship.components[componentKey] + Math.floor(30 * crewEff.repair));
    return { ok: true, reason: `${componentKey} repaired.` };
  }

  canSteerShip() {
    return this.ship.components.helm > 0;
  }

  canUseCannons() {
    return this.ship.components.cannons > 0;
  }

  canUseCapstan() {
    return this.ship.components.capstan > 0;
  }

  dropAnchorEmergency() {
    this.ship.anchorDown = true;
    this.ship.anchorRaisingRemaining = 0;
    this.applyShipDamage(18);
  }

  toggleAnchor() {
    if (this.ship.anchorDown) {
      if (!this.canUseCapstan()) return { ok: false, reason: 'Capstan destroyed. Cannot raise anchor.' };
      const stats = SHIP_CLASSES[this.shipType];
      const crewEff = this.getCrewEfficiency();
      const capstanMult = this.ship.effects.anchorRaiseMult ?? 1;
      this.ship.anchorRaisingRemaining = Math.max(1, stats.anchorRaiseSec / (crewEff.repair * capstanMult));
      return { ok: true, reason: 'Raising anchor...' };
    }
    this.ship.anchorDown = true;
    this.ship.anchorRaisingRemaining = 0;
    return { ok: true, reason: 'Anchor dropped.' };
  }

  updateAnchor(deltaSec) {
    if (this.ship.anchorRaisingRemaining > 0) {
      this.ship.anchorRaisingRemaining -= deltaSec;
      if (this.ship.anchorRaisingRemaining <= 0) {
        this.ship.anchorRaisingRemaining = 0;
        this.ship.anchorDown = false;
        return true;
      }
    }
    return false;
  }

  sinkPenalty() {
    this.cargo = [];
    this.unbankedRep = 0;
    this.ship.upgrades = [];
    this.ship.effects = {};
    this.ship.hull = this.ship.maxHull;
    this.ship.water = 0;
    this.ship.anchorDown = false;
    this.ship.anchorRaisingRemaining = 0;
    this.ship.components = {
      helm: 100,
      capstan: 100,
      lantern: 100,
      cargoDoor: 100,
      sails: 100,
      masts: 100,
      cannons: 100
    };
    this.noDeathStreak = false;
    this.wantedLevel = Math.max(0, this.wantedLevel - 2);
    this.availableAmmo = this.resolveUnlockedAmmo();
    this.selectedAmmo = this.availableAmmo[0];

    if (this.scene?.refreshShipCargoVisuals) {
      this.scene.refreshShipCargoVisuals();
    }
  }

  tryBuyUpgrade(upgradeKey) {
    const upgrade = SHIP_UPGRADES[upgradeKey];
    if (!upgrade) return { ok: false, reason: 'Unknown upgrade.' };
    if (this.ship.upgrades.includes(upgradeKey)) return { ok: false, reason: 'Already installed.' };
    if (this.gold < upgrade.cost) return { ok: false, reason: 'Not enough gold.' };

    const rankGates = {
      extendedHold: { faction: 'saltwind', rank: 4 },
      reinforcedBow: { faction: 'ironclad', rank: 4 },
      stormSails: { faction: 'reefwalker', rank: 4 }
    };
    const gate = rankGates[upgradeKey];
    if (gate) {
      const rep = this.reputation[gate.faction] ?? 0;
      const factionGateRank = factionRank(rep);
      if (factionGateRank < gate.rank) return { ok: false, reason: `${gate.faction} rank ${gate.rank} required.` };
    }

    this.gold -= upgrade.cost;
    this.ship.upgrades.push(upgradeKey);
    this.recomputeShipEffects();
    return { ok: true, reason: `${upgrade.label} installed.` };
  }

  recomputeShipEffects() {
    this.ship.effects = {};

    for (const key of this.ship.upgrades) {
      const apply = SHIP_UPGRADES[key]?.apply;
      if (!apply) continue;
      for (const [prop, val] of Object.entries(apply)) {
        if (typeof val === 'boolean') this.ship.effects[prop] = val;
        else this.ship.effects[prop] = (this.ship.effects[prop] ?? 1) * val;
      }
    }

    const baseMax = SHIP_CLASSES[this.shipType].hp;
    this.ship.maxHull = Math.floor(baseMax * (this.ship.effects.hullMult ?? 1));
    this.ship.hull = Math.min(this.ship.hull, this.ship.maxHull);

    this.availableAmmo = this.resolveUnlockedAmmo();
    if (!this.availableAmmo.includes(this.selectedAmmo)) this.selectedAmmo = this.availableAmmo[0];
  }

  canFirePlayerCannon() {
    return this.playerCannonCooldown <= 0;
  }

  consumePlayerCannonShot() {
    const cooldownMult = this.ship.effects.cannonCooldownMult ?? 1;
    const crewEff = this.getCrewEfficiency();
    this.playerCannonCooldown = (1.35 * cooldownMult) / (crewEff.reload * crewEff.fullCrewBonus);
  }

  getPlayerProjectileStats() {
    const ammo = this.getAmmoDef();
    const speedMult = (this.ship.effects.projectileSpeedMult ?? 1) * (ammo.speedMult ?? 1);
    const damageMult = (this.ship.effects.cannonDamageMult ?? 1) * (ammo.damageMult ?? 1);
    return {
      speed: 520 * speedMult,
      damage: Math.floor(120 * damageMult),
      splash: ammo.splash ?? 0,
      burn: Boolean(ammo.burn),
      ammoKey: this.selectedAmmo
    };
  }

  sellCargoItem(item) {
    if (!item) return { total: 0, soldLegendary: 0 };

    let value = item.baseValue;

    if (FACTIONS[this.faction].treasureBonus.includes(item.tier)) value *= 1.2;
    if (this.activeEvent) value *= 1 + this.activeEvent.valueBonus;
    if (this.noDeathStreak) value *= 1.15;
    if (this.wantedLevel > 0) value *= 1 + this.wantedLevel * 0.05;
    if (this.activeEvent?.key === 'cursedTide') value *= 2;

    let soldLegendary = 0;
    if (item.tier === 'legendaryRelics') {
      soldLegendary = 1;
      this.metrics.legendarySold += 1;
      this.profile.shipLog = [
        {
          itemName: item.name,
          value: Math.floor(value),
          at: Date.now()
        },
        ...(this.profile.shipLog ?? [])
      ].slice(0, 5);
      if (!this.firstLegendarySold) {
        value *= 1.5;
        this.firstLegendarySold = true;
      }
    }

    value *= this.getCrewEfficiency().saleBonus ?? 1;
    const total = Math.floor(value);

    this.gold += total;
    this.profile.totalGoldEarned = (this.profile.totalGoldEarned ?? 0) + total;
    this.profile.crewFame = (this.profile.crewFame ?? 0) + Math.floor(total / 1000) + soldLegendary * 5;
    this.reputation[this.faction] += this.unbankedRep + 8;
    this.checkFactionRankUnlocks(this.faction);
    this.metrics.soldCount += 1;
    if (this.activeEvent) this.metrics.soldDuringEvent += 1;
    if (this.activeEvent) this.progressActiveEvent('sellDuringEvent', 1);

    this.noDeathStreak = true;
    this.wantedLevel = Math.max(0, this.wantedLevel - 1);
    this.syncProfile();
    this.tickMission();

    return { total, soldLegendary };
  }

  sellAllCargo() {
    if (!this.cargo.length) return { total: 0, soldCount: 0 };

    let total = 0;
    let soldLegendary = 0;
    for (const item of this.cargo) {
      let value = item.baseValue;

      if (FACTIONS[this.faction].treasureBonus.includes(item.tier)) value *= 1.2;
      if (this.activeEvent) value *= 1 + this.activeEvent.valueBonus;
      if (this.noDeathStreak) value *= 1.15;
      if (this.wantedLevel > 0) value *= 1 + this.wantedLevel * 0.05;
      if (this.activeEvent?.key === 'cursedTide') value *= 2;

      if (item.tier === 'legendaryRelics') {
        soldLegendary += 1;
        this.metrics.legendarySold += 1;
        this.profile.shipLog = [
          {
            itemName: item.name,
            value: Math.floor(value),
            at: Date.now()
          },
          ...(this.profile.shipLog ?? [])
        ].slice(0, 5);
        if (!this.firstLegendarySold) {
          value *= 1.5;
          this.firstLegendarySold = true;
        }
      }

      value *= this.getCrewEfficiency().saleBonus ?? 1;

      total += Math.floor(value);
    }

    this.gold += total;
    this.profile.totalGoldEarned = (this.profile.totalGoldEarned ?? 0) + total;
    this.profile.crewFame = (this.profile.crewFame ?? 0) + Math.floor(total / 1000) + soldLegendary * 5;
    this.reputation[this.faction] += this.unbankedRep + this.cargo.length * 8;
    this.checkFactionRankUnlocks(this.faction);
    const soldCount = this.cargo.length;
    this.metrics.soldCount += soldCount;
    if (this.activeEvent) this.metrics.soldDuringEvent += soldCount;
    if (this.activeEvent) this.progressActiveEvent('sellDuringEvent', soldCount);

    this.cargo = [];
    this.unbankedRep = 0;
    this.noDeathStreak = true;
    this.wantedLevel = Math.max(0, this.wantedLevel - 1);

    this.syncProfile();
    this.tickMission();

    if (this.scene?.refreshShipCargoVisuals) {
      this.scene.refreshShipCargoVisuals();
    }

    return { total, soldCount, soldLegendary };
  }

  tickMission() {
    const m = this.currentMission;
    if (!m || m.complete) return;

    const calculators = {
      sellCount: () => this.metrics.soldCount,
      sinkShips: () => this.metrics.shipsSunk,
      lootCount: () => this.metrics.islandsLooted,
      lootGhost: () => this.metrics.ghostLooted,
      surviveTime: () => Math.floor(this.metrics.survivedSeconds),
      visitZones: () => this.metrics.visitedZones.size,
      sellDuringEvent: () => this.metrics.soldDuringEvent
    };

    m.progress = Math.min(m.target, calculators[m.objective]?.() ?? 0);
    if (m.progress >= m.target) {
      m.complete = true;
      this.gold += m.rewardGold;
      this.reputation[this.faction] += m.rewardRep;
      this.factionCurrency[this.faction] += Math.max(5, Math.floor(m.rewardRep * 0.6));
      this.checkFactionRankUnlocks(this.faction);
      this.scene.events.emit('mission-complete', m);
      this.profile.stats.voyagesCompleted = (this.profile.stats.voyagesCompleted ?? 0) + 1;
      this.syncProfile();
    }
  }

  refreshMission() {
    if (!this.currentMission?.complete) return false;
    this.currentMission = this.makeMission();
    this.metrics = {
      shipsSunk: 0,
      islandsLooted: 0,
      ghostLooted: 0,
      legendarySold: 0,
      soldCount: 0,
      soldDuringEvent: 0,
      boardSabotage: 0,
      creatureDefeated: 0,
      survivedSeconds: 0,
      visitedZones: new Set()
    };
    return true;
  }

  checkFactionRankUnlocks(factionKey, silent = false) {
    const rank = factionRank(this.reputation[factionKey] ?? 0);
    const unlockMap = FACTION_RANK_UNLOCKS[factionKey] ?? {};

    for (let r = 1; r <= rank; r++) {
      const unlock = unlockMap[r];
      if (!unlock) continue;
      const unlockId = `${factionKey}:${r}`;
      if (this.rankUnlocksGranted.has(unlockId)) continue;

      this.rankUnlocksGranted.add(unlockId);
      if (unlock.type === 'cosmetic') {
        this.profile.cosmetics = Array.from(new Set([...(this.profile.cosmetics ?? []), unlock.label]));
      }
      if (!silent) {
        this.scene.events.emit('rank-unlock', {
          factionKey,
          rank: r,
          unlock
        });
      }
    }
  }

  getProjectedStats() {
    return {
      shipsSunk: (this.profileStartStats.shipsSunk ?? 0) + this.metrics.shipsSunk,
      legendarySold: (this.profileStartStats.legendarySold ?? 0) + this.metrics.legendarySold,
      voyagesCompleted: this.profile.stats.voyagesCompleted ?? 0
    };
  }

  checkLegendaryAchievements() {
    const stats = this.getProjectedStats();
    for (const ach of LEGENDARY_ACHIEVEMENTS) {
      if (this.achievementsGranted.has(ach.id)) continue;
      if ((stats[ach.metric] ?? 0) < ach.target) continue;

      this.achievementsGranted.add(ach.id);
      const cosmetic = COSMETIC_CATALOG.find((c) => c.id === ach.cosmeticId);
      if (cosmetic && !(this.profile.cosmetics ?? []).includes(cosmetic.label)) {
        this.profile.cosmetics = [...(this.profile.cosmetics ?? []), cosmetic.label];
      }
      this.scene.events.emit('achievement-unlock', ach);
    }
  }

  updateHallOfLegends() {
    const entry = {
      crewName: 'Local Crew',
      crewFame: this.profile.crewFame ?? 0,
      updatedAt: Date.now()
    };

    const current = Array.isArray(this.profile.hallOfLegends) ? [...this.profile.hallOfLegends] : [];
    const existingIdx = current.findIndex((e) => e.crewName === entry.crewName);
    if (existingIdx >= 0) current[existingIdx] = entry;
    else current.push(entry);

    current.sort((a, b) => (b.crewFame ?? 0) - (a.crewFame ?? 0));
    this.profile.hallOfLegends = current.slice(0, 10);
  }

  syncProfile() {
    this.profile.gold = this.gold;
    this.profile.reputation = { ...this.reputation };
    this.profile.factionCurrency = { ...this.factionCurrency };
    this.profile.permits.warship = computeWarshipPermit(this.profile);
    this.profile.rankUnlocksGranted = Array.from(this.rankUnlocksGranted);
    this.profile.achievementsGranted = Array.from(this.achievementsGranted);
    this.profile.stats.shipsSunk = (this.profileStartStats.shipsSunk ?? 0) + this.metrics.shipsSunk;
    this.profile.stats.legendarySold = (this.profileStartStats.legendarySold ?? 0) + this.metrics.legendarySold;
    this.checkLegendaryAchievements();
    this.updateHallOfLegends();
    saveProfile(this.profile);
  }
}
