import { randomUUID } from 'node:crypto';

export function createWorldState() {
  return {
    serverId: randomUUID(),
    createdAt: Date.now(),
    sessionEndAt: Date.now() + 4 * 60 * 60 * 1000,
    resetCount: 0,
    tick: 0,
    players: new Map(),
    ships: new Map(),
    treasures: new Map(),
    crews: new Map(),
    worldEvents: [],
    recentLegendarySales: []
  };
}

export function spawnShip(world, { type = 'skiff', crewId = null, x = 400, y = 400 }) {
  const shipId = randomUUID();
  const ship = {
    shipId,
    type,
    crewId,
    position: { x, y },
    heading: 0,
    speed: 0,
    hullHP: type === 'warship' ? 5000 : type === 'galleon' ? 3200 : type === 'brigantine' ? 1600 : 800,
    waterLevel: 0,
    activeBreaches: [],
    sails: [{ raised: true, angle: 0, hp: 100 }],
    cargo: [],
    upgrades: [],
    factionFlag: 'neutral'
  };
  world.ships.set(shipId, ship);
  return ship;
}

export function createTreasure(world, { type = 'saltmossCoffer', tier = 1, baseValue = 100, x = 0, y = 0, discoveredBy = null }) {
  const itemId = randomUUID();
  const item = {
    itemId,
    type,
    tier,
    baseValue,
    modifiers: [],
    location: { x, y },
    discoveredBy,
    timestamp: Date.now()
  };
  world.treasures.set(itemId, item);
  return item;
}

export function serializeWorld(world) {
  return {
    serverId: world.serverId,
    createdAt: world.createdAt,
    sessionEndAt: world.sessionEndAt,
    resetCount: world.resetCount,
    tick: world.tick,
    players: Array.from(world.players.values()),
    ships: Array.from(world.ships.values()),
    treasures: Array.from(world.treasures.values()),
    worldEvents: world.worldEvents,
    recentLegendarySales: world.recentLegendarySales
  };
}

export function hydrateWorldState(world, snapshot) {
  if (!snapshot) return world;

  world.serverId = snapshot.serverId ?? world.serverId;
  world.createdAt = snapshot.createdAt ?? world.createdAt;
  world.sessionEndAt = snapshot.sessionEndAt ?? (Date.now() + 4 * 60 * 60 * 1000);
  world.resetCount = snapshot.resetCount ?? 0;
  world.tick = snapshot.tick ?? 0;

  world.players = new Map((snapshot.players ?? []).map((p) => [p.playerId, p]));
  world.ships = new Map((snapshot.ships ?? []).map((s) => [s.shipId, s]));
  world.treasures = new Map((snapshot.treasures ?? []).map((t) => [t.itemId, t]));
  world.worldEvents = Array.isArray(snapshot.worldEvents) ? snapshot.worldEvents : [];
  world.recentLegendarySales = Array.isArray(snapshot.recentLegendarySales) ? snapshot.recentLegendarySales : [];
  world.crews = new Map();

  for (const player of world.players.values()) {
    if (!player.crewId) continue;
    const existing = world.crews.get(player.crewId) ?? {
      crewId: player.crewId,
      name: `Crew-${String(player.crewId).slice(0, 4)}`,
      shipId: player.shipId,
      captainId: player.playerId,
      openCrew: true,
      allianceWith: null,
      memberIds: []
    };
    existing.memberIds.push(player.playerId);
    world.crews.set(player.crewId, existing);
  }

  return world;
}

export function resetWorldSession(world) {
  world.serverId = randomUUID();
  world.createdAt = Date.now();
  world.sessionEndAt = Date.now() + 4 * 60 * 60 * 1000;
  world.resetCount += 1;
  world.tick = 0;
  world.players.clear();
  world.ships.clear();
  world.treasures.clear();
  world.crews.clear();
  world.worldEvents = [];
  world.recentLegendarySales = [];
}
