import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import {
  createWorldState,
  hydrateWorldState,
  resetWorldSession,
  serializeWorld,
  spawnShip
} from './state/worldState.js';
import { loadWorldSnapshot, saveWorldSnapshot } from './state/persistence.js';

const PORT = Number(process.env.TIDES_SERVER_PORT ?? 2567);
const TICK_RATE = 20;
const TICK_MS = Math.floor(1000 / TICK_RATE);
const PERSIST_MS = 10000;
const SESSION_RESET_WARNING_MS = 5 * 60 * 1000;

const WORLD_EVENTS = [
  'skullFort',
  'ghostArmada',
  'dreadSerpent',
  'kraken',
  'merchantConvoy',
  'cursedTide'
];

const world = createWorldState();
const persisted = loadWorldSnapshot();
if (persisted) {
  hydrateWorldState(world, persisted);
  world.players.clear();
  world.crews.clear();
}

const wss = new WebSocketServer({ port: PORT });

console.log(`[Tides Server] Running on ws://localhost:${PORT}`);

function now() {
  return Date.now();
}

function safeSend(ws, payload) {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify(payload));
}

function broadcast(payload) {
  for (const ws of wss.clients) safeSend(ws, payload);
}

function findCrewById(crewId) {
  if (!crewId) return null;
  return world.crews.get(crewId) ?? null;
}

function createCrew({ name = 'Crew', openCrew = true }) {
  const crewId = randomUUID();
  const crew = {
    crewId,
    name,
    captainId: null,
    shipId: null,
    openCrew,
    allianceWith: null,
    memberIds: []
  };
  world.crews.set(crewId, crew);
  return crew;
}

function resolveCrewForJoin(msg) {
  const requestedCrew = findCrewById(msg.crewId);
  if (requestedCrew && requestedCrew.openCrew) return requestedCrew;
  return createCrew({ name: msg.crewName ?? 'Open Crew', openCrew: msg.openCrew !== false });
}

function handleJoin(ws, msg) {
  const playerId = randomUUID();
  const crew = resolveCrewForJoin(msg);
  let ship = crew.shipId ? world.ships.get(crew.shipId) : null;
  if (!ship) {
    ship = spawnShip(world, { type: msg.shipType ?? 'skiff', crewId: crew.crewId, x: 450, y: 780 });
    crew.shipId = ship.shipId;
  }

  if (!crew.captainId) crew.captainId = playerId;
  if (!crew.memberIds.includes(playerId)) crew.memberIds.push(playerId);

  const player = {
    playerId,
    crewId: crew.crewId,
    shipId: ship.shipId,
    name: msg.name ?? `Crewmate-${playerId.slice(0, 4)}`,
    role: msg.role ?? 'helmsman',
    hp: 100,
    position: { x: ship.position.x, y: ship.position.y },
    heading: 0,
    connectedAt: now(),
    lastInputAt: now(),
    wanted: 0,
    bounty: 0,
    crewFame: 0,
    input: {
      throttle: 0,
      turn: 0,
      fire: false,
      seq: 0
    },
    lastProcessedInputSeq: 0
  };

  ws.playerId = playerId;
  world.players.set(playerId, player);

  safeSend(ws, {
    type: 'joined',
    serverTime: now(),
    tickRate: TICK_RATE,
    selfPlayerId: playerId,
    sessionEndAt: world.sessionEndAt,
    world: serializeWorld(world)
  });

  broadcast({
    type: 'crew-update',
    crew: {
      ...crew,
      memberIds: [...crew.memberIds]
    }
  });
}

function handleInput(ws, msg) {
  const player = world.players.get(ws.playerId);
  if (!player) return;
  player.lastInputAt = now();
  player.input = {
    throttle: PhaserLike.clamp(Number(msg.throttle ?? 0), -1, 1),
    turn: PhaserLike.clamp(Number(msg.turn ?? 0), -1, 1),
    fire: Boolean(msg.fire)
  };
  player.input.seq = Number(msg.seq ?? player.input.seq ?? 0);
  player.lastProcessedInputSeq = player.input.seq;
}

function handleRoleSet(ws, msg) {
  const player = world.players.get(ws.playerId);
  if (!player) return;
  const allowed = new Set(['helmsman', 'cannoneer', 'lookout', 'engineer', 'boarder', 'quartermaster']);
  if (!allowed.has(msg.role)) return;
  player.role = msg.role;
}

function handleCrewOpenMode(ws, msg) {
  const player = world.players.get(ws.playerId);
  if (!player) return;
  const crew = world.crews.get(player.crewId);
  if (!crew || crew.captainId !== player.playerId) return;
  crew.openCrew = Boolean(msg.openCrew);
  broadcast({ type: 'crew-update', crew });
}

function handleAllianceCreate(ws, msg) {
  const player = world.players.get(ws.playerId);
  if (!player) return;
  const crewA = world.crews.get(player.crewId);
  const crewB = world.crews.get(msg.targetCrewId);
  if (!crewA || !crewB || crewA.crewId === crewB.crewId) return;
  crewA.allianceWith = crewB.crewId;
  crewB.allianceWith = crewA.crewId;
  broadcast({ type: 'alliance-updated', crews: [crewA, crewB] });
}

function handleAllianceBreak(ws) {
  const player = world.players.get(ws.playerId);
  if (!player) return;
  const crewA = world.crews.get(player.crewId);
  if (!crewA?.allianceWith) return;
  const crewB = world.crews.get(crewA.allianceWith);
  crewA.allianceWith = null;
  if (crewB) crewB.allianceWith = null;
  broadcast({ type: 'alliance-updated', crews: [crewA, ...(crewB ? [crewB] : [])] });
}

function handleLegendarySale(ws, msg) {
  const player = world.players.get(ws.playerId);
  if (!player) return;
  world.recentLegendarySales = [
    {
      crewId: player.crewId,
      crewName: (world.crews.get(player.crewId)?.name) ?? `Crew-${String(player.crewId).slice(0, 4)}`,
      itemName: msg.itemName ?? 'Legendary Relic',
      value: Number(msg.value ?? 0),
      at: now()
    },
    ...world.recentLegendarySales
  ].slice(0, 5);
}

function resolveCrewInput(crew) {
  const members = crew.memberIds.map((id) => world.players.get(id)).filter(Boolean);
  if (!members.length) return { throttle: 0, turn: 0, fire: false };

  const helmsman = members.find((m) => m.role === 'helmsman') ?? members.find((m) => m.playerId === crew.captainId) ?? members[0];
  const cannoneers = members.filter((m) => m.role === 'canoneer' || m.role === 'cannoneer');
  const anyFire = (canoneers.length ? cannoneers : members).some((m) => m.input.fire);

  return {
    throttle: helmsman.input.throttle,
    turn: helmsman.input.turn,
    fire: anyFire
  };
}

function simulateShip(ship, input, dtSec) {
  const accel = 120;
  const maxSpeed = 220;
  const turnRate = 2.4;

  ship.heading += PhaserLike.clamp(input.turn, -1, 1) * turnRate * dtSec;
  ship.speed += PhaserLike.clamp(input.throttle, -1, 1) * accel * dtSec;
  ship.speed *= 0.985;
  ship.speed = PhaserLike.clamp(ship.speed, -70, maxSpeed);

  ship.position.x += Math.cos(ship.heading) * ship.speed * dtSec;
  ship.position.y += Math.sin(ship.heading) * ship.speed * dtSec;

  ship.position.x = PhaserLike.clamp(ship.position.x, 0, 8200);
  ship.position.y = PhaserLike.clamp(ship.position.y, 0, 4600);
}

const PhaserLike = {
  clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
};

function simulationTick() {
  const dtSec = 1 / TICK_RATE;
  world.tick += 1;

  if (world.worldEvents.length === 0 || world.worldEvents[0].endsAt <= now()) {
    world.worldEvents = [{
      key: WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)],
      startedAt: now(),
      endsAt: now() + 30000
    }];
  }

  if (world.sessionEndAt - now() <= SESSION_RESET_WARNING_MS && world.tick % (TICK_RATE * 10) === 0) {
    broadcast({ type: 'session-warning', message: 'Server session resetting soon.', resetAt: world.sessionEndAt });
  }

  if (now() >= world.sessionEndAt) {
    broadcast({ type: 'session-reset', message: 'World session reset.' });
    resetWorldSession(world);
    return;
  }

  for (const crew of world.crews.values()) {
    const ship = world.ships.get(crew.shipId);
    if (!ship) continue;

    const crewInput = resolveCrewInput(crew);
    simulateShip(ship, crewInput, dtSec);

    for (const memberId of crew.memberIds) {
      const player = world.players.get(memberId);
      if (!player) continue;
      player.position.x = ship.position.x;
      player.position.y = ship.position.y;
      player.heading = ship.heading;
    }
  }

  const snapshot = {
    type: 'snapshot',
    serverTime: now(),
    tick: world.tick,
    sessionEndAt: world.sessionEndAt,
    players: Array.from(world.players.values()),
    ships: Array.from(world.ships.values()),
    crews: Array.from(world.crews.values()),
    worldEvents: world.worldEvents,
    recentLegendarySales: world.recentLegendarySales,
    ack: Array.from(world.players.values()).map((p) => ({ playerId: p.playerId, seq: p.lastProcessedInputSeq }))
  };

  broadcast(snapshot);
}

wss.on('connection', (ws) => {
  safeSend(ws, { type: 'hello', message: 'Tides of Ruin authoritative server ready.' });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'join') return handleJoin(ws, msg);
      if (msg.type === 'input') return handleInput(ws, msg);
      if (msg.type === 'role:set') return handleRoleSet(ws, msg);
      if (msg.type === 'crew:open-mode') return handleCrewOpenMode(ws, msg);
      if (msg.type === 'alliance:create') return handleAllianceCreate(ws, msg);
      if (msg.type === 'alliance:break') return handleAllianceBreak(ws);
      if (msg.type === 'legendary:sale') return handleLegendarySale(ws, msg);
    } catch {
      safeSend(ws, { type: 'error', message: 'Invalid JSON payload.' });
    }
  });

  ws.on('close', () => {
    if (!ws.playerId) return;
    const player = world.players.get(ws.playerId);
    if (player?.crewId) {
      const crew = world.crews.get(player.crewId);
      if (crew) {
        crew.memberIds = crew.memberIds.filter((id) => id !== player.playerId);
        if (crew.captainId === player.playerId) crew.captainId = crew.memberIds[0] ?? null;
        if (crew.memberIds.length === 0) {
          if (crew.shipId) world.ships.delete(crew.shipId);
          world.crews.delete(crew.crewId);
        }
      }
    }
    world.players.delete(ws.playerId);
  });
});

setInterval(simulationTick, TICK_MS);
setInterval(() => saveWorldSnapshot(serializeWorld(world)), PERSIST_MS);
