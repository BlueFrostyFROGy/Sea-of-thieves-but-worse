# Tides of Ruin

A playable 2D pirate sandbox implementation derived from your GDD.

## Implemented in this build

- Top-down ocean world with 4 danger zones
- Ship class selection (Skiff, Brigantine, Galleon, Warship)
- Crew size selection and crew-efficiency scaling
- Faction selection and per-faction treasure sale bonuses
- Procedural island generation (outposts + event island types)
- Wind direction with rotation over time (~20 min full rotation)
- Weather states (Clear, Squall, Thunderstorm, Dead Calm, Cursed Fog)
- 30-minute day/night cycle
- Naval movement with wind efficiency
- Ship hull + flooding + repair + bailing + sink penalty loop
- Cannon combat (player and AI ships)
- Treasure discovery/collection/sale economy loop
- Dynamic world event rotation with reward modifiers
- Faction mission system with progress/completion rewards
- Multi-step voyage contracts with outpost acceptance/turn-in
- Ammo types with faction-rank unlocks and in-combat cycling
- Outpost ship upgrade purchasing with sink-loss penalty
- Ship component health model (helm, capstan, cannons, sails, masts, lantern, cargo door)
- Anchor/capstan system with emergency drop and timed raise
- Chart table overlay with navigation/event/ship-log data
- Persistent profile progression (gold, faction rep, permit unlocks)
- Faction rank unlock grants (cosmetics/perks tracked per rank)
- World-event objective chains with bonus payout on completion
- Cosmetic shop purchases at outposts with faction-rank gating
- Achievement-based cosmetic unlocks + Hall of Legends crew fame board
- Warship permit gating (Rank 3 with any faction)
- On-foot mode and boarding/disembark loop
- Melee/parry/sidearm combat against island skeletons
- Death's Veil downed/respawn flow with Resurrection Lantern behavior
- Food healing system (banana/fish/rum + rum stumble effect)
- Sea creature encounters (shark, lurker, serpent, kraken)
- Shipwreck diving loop with breath management
- Ghost Armada event behavior with phase-shifting ghost ships
- Social progression data: crew fame + recent legendary global ship log
- HUD and interaction prompts

## Controls

- Menu: `[` / `]` set crew count for selected ship
- `W/S`: Throttle up/down
- `A/D`: Turn ship (requires functional helm)
- `SPACE`: Fire cannon
- `X`: Drop/raise anchor (raise requires capstan)
- `Z`: Emergency anchor drop (causes hull stress)
- `V`: Repair worst-damaged ship component
- `TAB`: Toggle chart table overlay
- `N`: Connect/disconnect runtime network sync
- `Y`: Propose alliance with nearest remote crew (network mode)
- `H`: Break alliance (network mode)
- `G`: Board/disembark (islands or enemy ships)
- `T`: Toggle dive while on foot near shipwreck shoals
- `J`: Melee strike
- `K`: Block/parry window
- `L`: Sidearm pistol
- `Q`: Cycle ammo type
- `F`: Loot/dig at island
- `E`: Dock/sell at outpost
- `U`: Buy next ship upgrade at outpost
- `C`: Buy next available cosmetic at outpost
- `M`: Claim completed mission and take a new one
- `P`: Accept/turn-in voyage contract at outpost
- `1/2/3`: Eat Banana/Fish/Rum
- `R`: Repair hull
- `B`: Bail water
- `ESC`: Return to menu

## Run

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Open the local URL printed in the terminal.

## Authoritative Multiplayer Scaffold

The project now includes a websocket authoritative server foundation:

- Server entry: [server/index.js](server/index.js)
- Shared world state model: [server/state/worldState.js](server/state/worldState.js)
- Server persistence layer: [server/state/persistence.js](server/state/persistence.js)
- Client network helper: [src/systems/NetworkClient.js](src/systems/NetworkClient.js)

Current server features now include:

- 20Hz authoritative simulation ticks
- Crew-aware lobby joining (shared crew ship)
- Alliance creation/break protocol messages
- Input sequence + server ack metadata for reconciliation support
- Session lifecycle timer (4-hour reset target + warnings)
- Periodic world snapshot persistence to server/.data/world-state.json
- Broadcast of latest legendary sale social log

Run server:

- `npm run dev:server`

Run client + server together (simple combined command):

- `npm run dev:all`

Enable client network mode by appending `?net=1` to the local URL (optional `&ws=ws://localhost:2567`).

## Notes

This is a fully playable foundational build of the sandbox loop. The GDD includes many advanced systems (multiplayer authoritative server, boarding, melee, role-specialized crew, faction mission chains, major world bosses, persistent 4–8h server session, etc.) that require phased expansion. The current architecture is organized so those systems can be added incrementally.
