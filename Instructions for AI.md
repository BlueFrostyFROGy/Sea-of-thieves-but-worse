# TIDES OF RUIN — 2D Pirate Sandbox Game
## Full Game Design Document (GDD)
### For AI-Assisted Development

---

# TABLE OF CONTENTS
1. Game Overview
2. Core Philosophy
3. World & Map Design
4. Player & Character System
5. Ship System
6. Sailing & Navigation
7. Combat System (Ship & Melee)
8. Treasure System
9. Factions
10. Economy & Trading
11. World Events
12. Progression & Cosmetics
13. Multiplayer & Crew System
14. Audio & Visual Direction
15. Technical Architecture Notes

---

# 1. GAME OVERVIEW

**Title:** Tides of Ruin
**Genre:** 2D Sandbox Pirate Adventure / Multiplayer Action
**Perspective:** Top-down 2D (think Zelda: A Link to the Past or Enter the Gungeon camera angle)
**Platform Target:** PC (primary), with potential for browser/mobile
**Player Count:** 1–8 players per ship crew (ships scale in size/capability with crew)
**Session Type:** Persistent shared world server with multiple crews per server (12–24 players per server recommended)

---

# 2. CORE PHILOSOPHY

The game is built on four pillars:

### Pillar 1 — Emergent Adventure
No scripted story campaigns. Every voyage is player-driven. Players choose what to pursue — treasure, combat, trading, faction missions, or world events. The world reacts to player choices dynamically.

### Pillar 2 — Social & Crew Dependency
Ships require multiple roles to operate at peak efficiency. A sloop can be soloed but is severely limited compared to a crew. Larger ships need 4–8 players to truly excel. Cooperation creates advantage; betrayal creates drama.

### Pillar 3 — Risk Versus Reward
Everything valuable is also dangerous. The richest treasure islands are in the most contested waters. Selling goods at faction outposts exposes you to ambushes. The more you carry, the more you risk losing.

### Pillar 4 — Mastery Through Simplicity
Controls are simple. Mechanics are readable at a glance. Depth comes from player interaction and world complexity — not complicated button combinations.

---

# 3. WORLD & MAP DESIGN

## 3.1 — The World: The Shattered Meridian

The game takes place across **The Shattered Meridian**, a vast archipelago of hundreds of islands scattered across a procedurally-seeded but hand-curated ocean. The world is divided into four major **Zones** based on danger level, with each zone containing unique island types, enemies, and loot.

### Zone 1 — The Amber Shallows (Starter Zone)
- Calm winds, shallow reefs, frequent patrols by friendly faction ships
- Low-tier treasure, basic enemy skeletons, low PvP activity
- Islands: sandy beaches, small villages, trading posts
- Good for new crews to learn systems

### Zone 2 — The Tangled Reach
- Moderate danger, shifting winds, mixed faction presence
- Mid-tier treasure, skeleton captains, moderate PvP risk
- Islands: jungle-covered, hidden caves, overgrown ruins
- Where most mid-game play happens

### Zone 3 — The Iron Depths
- Stormy seas, strong currents, dangerous wildlife (sea serpents, kraken tentacles)
- High-tier treasure, elite skeleton captains, pirate hunters
- Islands: volcanic rock, dark caverns, ancient temples
- Requires experienced crews; frequent PvP engagements

### Zone 4 — The Abyssal Crown (Endgame Zone)
- Permanent fog/storm, deadly currents, rare and extreme world events
- Legendary-tier treasure, boss skeleton lords, maximum PvP risk
- Islands: cursed islands, floating ruins, sunken spires partially above water
- Only large crews with upgraded ships can reliably operate here

## 3.2 — Island Types

Every island falls into one of the following categories:

| Type | Description | Has Safe Dock? | Has Enemies? |
|---|---|---|---|
| **Outpost** | Faction hub, shops, banking | Yes | No |
| **Treasure Island** | Dungeon-style island with buried/guarded treasure | No | Yes |
| **Skull Fort** | Wave-based defense event, high reward | No | Yes (many) |
| **Shipwreck Shoal** | Sunken ships with loot, partially submerged | No | Moderate |
| **Ghost Island** | Cursed, haunted, high risk/reward | No | Yes (ghosts) |
| **Sea Trade Post** | Neutral merchant, no faction affiliation | Small dock | No |
| **Abandoned Settlement** | Looting zones, random loot chests | No | Some |
| **Resource Island** | Wood, cloth, cannonballs available | No | Rare |

## 3.3 — Day/Night & Weather Cycle

- **Day/Night:** Full cycle every 30 real-world minutes. Night reduces visibility significantly. Some events only occur at night (Ghost Armadas, cursed fog zones).
- **Weather Events:**
  - Clear Skies — bonus sailing speed
  - Squalls — reduces visibility, increases wave height (harder to bail water)
  - Thunderstorms — lightning can strike the ship (causes fires/damage)
  - Dead Calms — no wind, must row or use emergency sails
  - Cursed Fog — magical weather that spawns ghost enemies and disrupts compass navigation

---

# 4. PLAYER & CHARACTER SYSTEM

## 4.1 — Character Customization

Full character creator at game start. Options include:
- Body type (short/medium/tall, thin/muscular/heavy)
- Skin tone (broad range)
- Face features (scars, eye color, facial hair, hair style/color)
- Starting cosmetic outfit (no gameplay advantage)

All cosmetic options unlocked through gameplay or currency. No pay-to-win.

## 4.2 — Character Stats

Players do NOT have RPG stats or levels. There is no XP bar. Characters are equal in raw ability. Progression is expressed through:
- Gear quality (weapons, tools)
- Ship upgrades
- Faction rank (unlocks mission types, not power)
- Cosmetics (purely visual)

## 4.3 — Player Abilities (Always Available)

- **Swim** — players can swim indefinitely but slowly; sharks become a threat in deep water
- **Dive** — submerge for ~15 seconds to explore underwater wreckage or retrieve fallen loot
- **Climb** — scale cliffs, ship masts, rocky outcrops
- **Carry** — carry one large chest OR two small items OR one keg at a time (two hands fully occupied)
- **Sprint** — short burst of speed, depletes a small stamina bar that refills in 3 seconds
- **Revive** — can revive downed crew members (takes 4 seconds, interruptible)

## 4.4 — Death System

When a player dies:
1. A **Death's Veil** countdown begins (30 seconds)
2. If a crew member revives them before it expires, they respawn at that location with half health
3. If not revived, they respawn at the ship's **Resurrection Lantern** (a ship-mounted device)
4. If the ship is sunk or the Resurrection Lantern is destroyed, they respawn at the nearest friendly outpost

Players do NOT drop their equipped cosmetics on death. They DO drop any treasure they were physically carrying.

---

# 5. SHIP SYSTEM

## 5.1 — Ship Classes

Ships scale with crew size. Larger ships are strictly more powerful but require more players to operate at full efficiency. A smaller crew on a large ship is at a significant disadvantage.

### Skiff (1–2 Players)
- **Hull HP:** 800
- **Cannons:** 2 (1 per side)
- **Sail Count:** 1
- **Cargo Hold:** 4 small chest slots / 2 large chest slots
- **Anchor Speed:** Fast
- **Special:** Most maneuverable ship; can navigate shallow reefs larger ships cannot
- **Weakness:** Fragile, sinks quickly if not bailed, easily boarded

### Brigantine (2–4 Players)
- **Hull HP:** 1,600
- **Cannons:** 4 (2 per side)
- **Sail Count:** 2
- **Cargo Hold:** 10 small / 5 large
- **Anchor Speed:** Medium
- **Special:** Good balance of speed and firepower; favored by mid-tier pirates
- **Weakness:** Can struggle to operate at full efficiency with only 2 players

### Galleon (4–8 Players)
- **Hull HP:** 3,200
- **Cannons:** 8 (4 per side) + 2 forward-facing swivel guns
- **Sail Count:** 4
- **Cargo Hold:** 24 small / 12 large + 1 vault slot (legendary chests)
- **Anchor Speed:** Slow
- **Special:** Intimidating, powerful, can carry massive hauls; swivel guns allow rear-arc fire
- **Weakness:** Slow to turn, slow to anchor, requires full crew to be effective
- **Crew Bonus:** At 6+ crew members, gains a "Full Crew" passive: +10% cannon reload speed and hull repair rate

### Warship (6–8 Players — Endgame Only)
- **Hull HP:** 5,000
- **Cannons:** 12 (6 per side) + 4 swivel guns (bow and stern)
- **Sail Count:** 5
- **Cargo Hold:** 32 small / 16 large + 2 vault slots
- **Anchor Speed:** Very Slow
- **Special:** Near-unstoppable in direct combat; used for Abyssal Crown content
- **Weakness:** Cannot navigate Zones 1 or 2 without drawing massive faction aggression; extremely hard to sink but slow to repair if overwhelmed
- **Unlock Requirement:** Must reach Rank 3 with any faction before a Warship permit can be purchased

## 5.2 — Ship Anatomy (All Ships)

Every ship has the following physical components, each of which can be damaged/destroyed and must be repaired:

| Component | Function | Repair Method |
|---|---|---|
| **Hull Planks** | Keep ship from sinking; holes let in water | Wood planks (held in hand, applied to breach) |
| **Sails** | Propel the ship; each sail has HP | Cloth rolls (applied to sail tears) |
| **Mast(s)** | Hold sails up; if destroyed, sail is inoperable | Timber planks (slower repair) |
| **Helm** | Steering wheel; if destroyed, ship cannot turn | Timber planks |
| **Capstan** | Raises/lowers anchor; if destroyed, ship cannot anchor/un-anchor | Iron fittings (special repair item) |
| **Cannon(s)** | Fire at enemies; can be disabled by hits | Iron fittings |
| **Resurrection Lantern** | Player respawn point; if destroyed, crew spawns at outpost | Rare lantern oil (purchasable) |
| **Cargo Hold Door** | If blown open, all cargo becomes accessible to boarders | Timber planks |

## 5.3 — Ship Upgrades

Ships can be upgraded at outpost dry docks. Upgrades are permanent until the ship sinks (see Ship Loss).

**Hull Upgrades:**
- Iron Plating: +20% hull HP, planks take longer to apply (trade-off)
- Barnacle Keel: Reduces water drag, +5% base speed
- Reinforced Bow: Ram damage against enemy ships increased by 30%

**Sail Upgrades:**
- Storm Sails: Less speed reduction in bad weather
- Speed Canvas: +10% max speed in good weather
- Battle Sails: Faster sail raising/lowering

**Weapon Upgrades:**
- Long-Range Cannons: +25% effective range, -10% fire rate
- Rapid Fire Breach: +25% fire rate, -15% damage per shot
- Chain Shot Cannons: Unlocks chain shot ammo type (destroys sails/masts instead of hull)

**Utility Upgrades:**
- Extended Hold: +50% cargo capacity
- Crow's Nest: Adds a top-mast lookout point with extended view range
- Reinforced Capstan: Anchor raises 40% faster

## 5.4 — Ship Loss

If a ship sinks:
- All cargo aboard is dropped in the water at the sinking location as floating debris (can be retrieved by anyone)
- The ship itself is NOT permanently lost — it respawns at the last outpost the crew visited, fully repaired
- However, ALL upgrades on the ship are lost when it sinks (you must repurchase them)
- The crew loses any unbanked faction reputation (see Economy section)
- Any legendary items stored in the vault are dropped at the wreck site

This creates strong incentive to protect your ship and to regularly bank at outposts.

---

# 6. SAILING & NAVIGATION

## 6.1 — Wind System

Wind is a real directional force on the map. The wind direction and speed rotate gradually over time (full 360° rotation over ~20 real-world minutes).

- Sailing **with the wind** gives maximum speed
- Sailing **across the wind** gives ~70% speed
- Sailing **against the wind** requires tacking (zigzag sailing) at ~30% speed
- **Dead Calm** events remove all wind for 3–5 minutes; ships must row using oars (slow)

The wind direction is visible via:
- A wind vane at the helm
- Floating particles on the ocean surface
- The movement of clouds

## 6.2 — Sail Controls

- **Raise/Lower Sails:** Toggle button; must be done at the mast(s)
- **Rotate Sails:** Adjust the angle of each sail relative to the ship using a crank near each mast
- **Full Crew Sail Efficiency:** On a Galleon/Warship, each sail must be individually managed for peak speed — this is why multiple crew members are needed

## 6.3 — Anchor

- Dropping anchor stops the ship. Raising anchor takes time proportional to ship size.
- If a crew member destroys the capstan while your anchor is down, you are stuck until it is repaired.
- **Emergency Anchor Drop:** Can instantly drop anchor from the helm (no capstan needed) but causes minor hull stress damage.

## 6.4 — Navigation Tools

| Tool | Description |
|---|---|
| **Compass** | Always available; shows cardinal directions |
| **Spyglass** | Zoom in on distant objects, read ship flags, spot treasure markers |
| **Chart Table** | Ship-mounted map showing the full world; marks current position, island names, and active world events |
| **Treasure Map** | Hand-held map leading to a specific buried treasure location; must be physically held and compared to landmarks |
| **Star Chart** | Rare navigation item; reveals hidden islands not shown on the standard chart |

## 6.5 — Boarding Enemy Ships

Any player can board an enemy ship by:
- Jumping from their own ship onto the enemy ship (if close enough)
- Swimming to the enemy ship and climbing up the anchor rope or side
- Using a **Boarding Hook** (throwable item) to create a rope bridge between ships

Once aboard, boarders can:
- Fight the enemy crew
- Steal cargo from the hold
- Sabotage the ship (plant kegs, break the helm, destroy the capstan)
- Lower enemy sails to slow them

---

# 7. COMBAT SYSTEM

## 7.1 — Naval Combat

### Cannon Mechanics
- Cannons are loaded manually: player must stand at the cannon, press "Load" to insert a cannonball from inventory, then aim and fire
- Cannons have a horizontal aim arc (left-right) and vertical arc (up-down for range adjustment)
- **Projectile Travel Time:** Cannonballs are physically simulated with arc and drop; players must lead moving targets
- **Reload Time:** ~3.5 seconds base; reduced by upgrades and crew perks

### Cannonball Types
| Ammo Type | Effect | Unlock Method |
|---|---|---|
| **Iron Ball** | Standard damage to hull | Default |
| **Chain Shot** | Two balls connected by chain; shreds sails/masts | Unlock via Ironclad Guild faction |
| **Exploding Shot** | Delayed explosion after impact; wider area damage | Unlock via Bloodtide Brotherhood |
| **Grapple Shot** | Hooks into enemy ship; briefly locks them in place | Unlock via Saltwind Syndicate |
| **Fire Shot** | Sets target ship section on fire; must be extinguished | Unlock via Ashfall Compact faction |

### Ship Ramming
- Any ship can ram another ship by sailing into it
- Ram damage depends on relative speed and ship size
- A Warship ramming a Skiff at full speed will nearly one-shot it
- Ram damage affects both ships

### Sinking Mechanics
- Ships have a water level inside. As hull planks are breached, water floods in.
- Players can **bail water** using a bucket (removes water from hold)
- If water level reaches 100%, ship begins to sink and cannot be stopped — crew has ~60 seconds to abandon ship or retrieve cargo before it goes under
- Fires aboard ships deal hull HP directly over time and spread to adjacent sections

## 7.2 — Melee & Ranged Combat (On Land / Boarding)

### Weapons
Each player can carry **2 weapons** simultaneously plus a **tool item**.

**Melee Weapons:**
| Weapon | Damage | Speed | Special |
|---|---|---|---|
| Cutlass | Medium | Fast | Parry window on block; can deflect pistol shots |
| Heavy Cutlass | High | Slow | Knockback on hit; interrupts revives |
| Boarding Axe | Medium | Medium | Can break down barricades and cargo hold doors faster |
| Dagger | Low | Very Fast | Can be thrown short-range; lethal if used from behind |

**Ranged Weapons:**
| Weapon | Damage | Range | Notes |
|---|---|---|---|
| Flintlock Pistol | High (1 shot) | Medium | Single shot; long reload (4 sec); accurate |
| Blunderbuss | Very High | Short | Shotgun spread; 1 shot; faster reload than pistol |
| Eye of the Deep | Medium x3 | Long | 3-shot burst; long reload; rare item |
| Throwing Knife | Low | Short | Throwable; applies bleed damage over 5 sec |

**Tool Items:**
| Tool | Use |
|---|---|
| Lantern | Illuminates dark caves and below-deck areas at night |
| Shovel | Required to dig up buried treasure |
| Compass | Navigation |
| Bucket | Bail water from ship |
| Repair Hammer | Faster plank application speed when equipped |
| Keg (Explosive) | Place and detonate; destroys hull sections in a radius |

### Combat Mechanics
- Players have **100 HP**. No regeneration — health is restored with food items only.
- **Food Items:** Bananas (+25 HP), Cooked Fish (+50 HP), Rum (+75 HP but applies brief blur/stumble effect)
- Falling from height deals fall damage (off a mast = 40 damage, off a cliff = 60 damage)
- Players can **parry** melee attacks with a well-timed block (1/4 second window)
- Successful parry staggers the attacker for 0.8 seconds — enough for a counter strike

---

# 8. TREASURE SYSTEM

## 8.1 — Treasure Philosophy

Treasure is the core economy loop. Everything valuable is physical — players must pick it up, carry it to their ship, transport it across the sea, and physically hand it to a faction representative at an outpost. This means treasure can be stolen at any point in the journey.

## 8.2 — Treasure Tiers

### Tier 1 — Driftwood Finds (Common)
Low value, found everywhere, easy to carry.

| Name | Description | Base Value |
|---|---|---|
| **Saltmoss Coffer** | Barnacle-crusted box of coins | 50–150 gold |
| **Deadman's Satchel** | Worn leather bag of trinkets | 80–200 gold |
| **Crewman's Lockbox** | Small iron box, simple lock | 100–250 gold |
| **Shoal Urn** | Clay pot sealed with wax, contains old coins | 60–180 gold |
| **Barnacle Ring** | Jeweled ring encrusted with sea growth | 75–175 gold |

### Tier 2 — Captain's Plunder (Uncommon)
Medium value, often guarded, requires effort to acquire.

| Name | Description | Base Value |
|---|---|---|
| **Tombmarker Chest** | Carved with a skull and crossed anchors | 500–900 gold |
| **Crimson Trove** | Bloodwood chest with brass clasps | 600–1,100 gold |
| **Ironjaw Strongbox** | Heavy iron chest needing two hands | 700–1,200 gold |
| **Hollowbones Casket** | Bone-inlaid box, rattles when moved | 550–950 gold |
| **Tideglass Vessel** | Crystal vessel holding preserved coins and gems | 800–1,400 gold |
| **Emberthorn Box** | Scorched mahogany with ember-hot metal fittings | 900–1,500 gold |

### Tier 3 — Warlord's Vaults (Rare)
High value, heavily guarded, requires Tier 3 maps or event completion.

| Name | Description | Base Value |
|---|---|---|
| **Reaper's Coffer of Dust** | Ancient chest, glows faintly, leaks spectral dust | 3,000–5,000 gold |
| **Ironclad War Chest** | Faction war spoil; massive, requires two players to carry | 4,000–6,500 gold |
| **Vaultbreaker's Prize** | Chest stolen from a sunken faction armory | 3,500–5,500 gold |
| **Dreadcrown Casket** | Jet-black chest with a crown motif; extremely heavy | 5,000–8,000 gold |
| **Stormbound Vault** | Locked with a lightning-bolt mechanism; key required | 4,500–7,000 gold |
| **Thornwater Archive** | Contains ancient maps and jewels; fragile | 4,000–6,000 gold |

### Tier 4 — Legendary Relics (Very Rare)
Enormous value, requires endgame content, takes up a ship's vault slot.

| Name | Description | Base Value |
|---|---|---|
| **The Abyssal Throne** | A coral and black-iron throne fragment; impossibly heavy | 15,000–25,000 gold |
| **The Godtide Jewel** | A massive gem said to have fallen from the sky | 18,000–30,000 gold |
| **Wrath of the First Corsair** | Ornate sealed chest belonging to a legendary pirate lord | 20,000–35,000 gold |
| **The Sunken Crown** | Crown of the first sea king; cannot be hidden by any means (glows on map for all players) | 25,000–40,000 gold |
| **Oblivion's Safe** | Vault door from a sunken warship | 22,000–38,000 gold |

### Bonus Treasure Modifiers
Certain conditions add bonus gold to any chest's value:
- Delivered **without dying** in the voyage: +15%
- Delivered during an **active world event**: +20%
- Delivered while **wanted** (enemy faction is hunting you): +25%
- **First crew** to deliver a legendary relic in a server session: +50% one-time bonus

## 8.3 — Treasure Maps & Finding Treasure

### Riddle Maps
Text-based clues describing a location. Example:
> *"Where the three palms cast one shadow at dusk, beneath the stone that faces the drowned giant, three paces north."*
The player must navigate to the correct island, find the landmark, and dig with a shovel.

### X-Mark Charts
Traditional X-on-a-map treasure maps. Island is named, location is marked with an X. Simple but sometimes leads to guarded caches.

### Voyage Contracts
Issued by factions. A series of objectives across multiple islands leading to a final treasure chest. More complex, higher reward.

### Shipwreck Diving
Underwater wreck exploration reveals loot in sunken cargo holds. Requires diving. Dangerous due to sharks and limited breath.

## 8.4 — Selling Treasure

Treasure must be physically handed to a **Faction Steward** NPC at an outpost. Different factions pay bonuses for different treasure types (see Factions section). Treasure sold to the wrong faction still earns base value but no bonus.

---

# 9. FACTIONS

There are **five playable factions** in Tides of Ruin. Each has a unique identity, mission type, visual aesthetic, exclusive unlocks, and lore. Players can be members of multiple factions simultaneously but earn rep separately. Rank 5 is max per faction.

---

## FACTION 1 — THE SALTWIND SYNDICATE

**Identity:** Merchants and smugglers. Masters of trade, deception, and information. They control most of the outpost economies from the shadows.

**Visual Theme:** Teal and gold. Fine clothes, ledger books, ink-stained fingers. Their ships fly merchant flags with a hidden dagger motif.

**Mission Types:**
- **Cargo Runs:** Transport sealed crates from one outpost to another without opening them (opening reduces reward)
- **Black Market Drops:** Deliver contraband to specific coordinates at sea (ambushes likely)
- **Market Sabotage:** Sink enemy merchant ships that are undercutting Syndicate prices
- **Broker Contracts:** Escort Syndicate NPC merchant ships safely to their destination

**Faction Currency:** Trade Tokens

**Exclusive Unlocks (by rank):**
- Rank 1: Grapple Shot cannonballs
- Rank 2: Merchant Coat cosmetic set
- Rank 3: Syndicate-flagged ship skin (reduces aggression from Syndicate NPC ships)
- Rank 4: Extended Cargo Hold upgrade access
- Rank 5: **The Merchant's Seal** — a legendary item worth double gold when sold to any faction

**Lore:** The Saltwind Syndicate predates all other factions. They say they funded the first ships to cross the Shattered Meridian. Their true leadership is unknown — all dealings are conducted through masked brokers.

---

## FACTION 2 — THE IRONCLAD GUILD

**Identity:** Military order. Former naval officers, mercenaries, and disciplined fighters. They patrol the seas and wage war on piracy — though their definition of "piracy" shifts with whoever is paying.

**Visual Theme:** Deep navy blue and silver. Polished armor, structured uniforms, insignia-stamped iron. Their ships fly a clenched iron fist on white.

**Mission Types:**
- **Bounty Hunting:** Hunt and sink specified player or NPC pirate ships
- **Garrison Defense:** Defend an outpost or island from waves of incoming skeleton pirates
- **Patrol Routes:** Escort Guild patrol ships through dangerous zones
- **Armada Assault:** Attack and destroy an enemy skeleton armada

**Faction Currency:** Iron Marks

**Exclusive Unlocks (by rank):**
- Rank 1: Chain Shot cannonballs
- Rank 2: Guild Officer armor cosmetic set
- Rank 3: Warship access (purchase permit)
- Rank 4: Reinforced Bow upgrade access
- Rank 5: **Iron Mandate** — guild-issued letter that prevents NPC pirate ships from attacking your vessel

**Lore:** The Ironclad Guild was founded after the Great Corsair War, which nearly depopulated the Amber Shallows. Their "order" is really a complex web of contracts and enforcement. They are corrupt in ways they pretend not to be.

---

## FACTION 3 — THE BLOODTIDE BROTHERHOOD

**Identity:** True pirates. Anarchists, thrill-seekers, and glory hunters. They worship the sea itself as a living god and believe the bravest death is in combat.

**Visual Theme:** Blood red and bone white. Skull motifs, tattered flags, chains as jewelry. Their ships fly a red skull on black — the most feared flag in the Meridian.

**Mission Types:**
- **Raiding Contracts:** Board and loot specific named NPC ships
- **Skull Fort Raids:** Lead assaults on Skull Fort islands for the faction reward
- **Blood Price Hunts:** Kill a specific legendary skeleton captain and return their skull
- **Sea War:** Declared PvP mode — Brotherhood ships that attack each other earn double bounty payouts

**Faction Currency:** Blood Marks

**Exclusive Unlocks (by rank):**
- Rank 1: Exploding Shot cannonballs
- Rank 2: Brotherhood Corsair cosmetic set (intimidating; increases time before NPC ships flee you)
- Rank 3: Heavy Cutlass weapon upgrade access
- Rank 4: Eye of the Deep gun unlock
- Rank 5: **The Crimson Rite** — drinking a Brotherhood legendary rum increases your crew's speed and damage for 90 seconds

**Lore:** The Brotherhood is older than the Shattered Meridian itself, or so they claim. They trace lineage to the first pirates who refused to serve any crown. They celebrate death as transition, not tragedy. Their rituals unsettle even other pirates.

---

## FACTION 4 — THE ASHFALL COMPACT

**Identity:** Scholars, archaeologists, and cursed relic hunters. They seek the ancient secrets buried across the Meridian — and are not above dark magic to get them.

**Visual Theme:** Ashen grey and ember orange. Robes and long coats, scrolls, strange instruments. Their ships fly an hourglass over a flame.

**Mission Types:**
- **Relic Recovery:** Retrieve specific named treasure items from Ghost Islands or cursed zones
- **Ritual Sites:** Navigate to a location and perform a multi-step ritual to open a hidden vault
- **Forbidden Cartography:** Chart unexplored islands and bring back a filled Star Chart
- **Cursed Cargo:** Transport volatile cursed treasure that slowly damages your ship over time (must be sold quickly)

**Faction Currency:** Ember Seals

**Exclusive Unlocks (by rank):**
- Rank 1: Fire Shot cannonballs
- Rank 2: Compact Scholar cosmetic set
- Rank 3: Ghost Island safe passage item (reduces ghost enemy aggression)
- Rank 4: Ritual Lantern — reveals hidden vault entrances on Ghost Islands
- Rank 5: **The Ashfall Tome** — contains the location of a new legendary vault each in-game week

**Lore:** The Compact believes the Shattered Meridian was once a single continent, shattered by an ancient god of the sea who was angered by a great civilization. The ruins of that civilization are everywhere, and the Compact wants to reconstruct what was lost — or use it as a weapon.

---

## FACTION 5 — THE REEFWALKER COVENANT

**Identity:** Survivalists, hunters, and naturalists. They know the sea better than anyone. They worship no gods and serve no empire — only the wild ocean itself.

**Visual Theme:** Ocean green and sandy brown. Leather and rope, fish-scale details, feathers and bones. Their ships fly a breaking wave over a compass rose.

**Mission Types:**
- **Deep Sea Hunting:** Hunt and kill specified massive sea creatures for trophies
- **Survival Runs:** Crew must operate under specific hardship conditions (storm, no food, skeleton crew) to complete a voyage
- **Island Mastery:** Fully chart and collect every item type on a specific island
- **Kraken Patrol:** Enter a Zone 4 area during a Kraken event and survive for a set time

**Faction Currency:** Tide Markers

**Exclusive Unlocks (by rank):**
- Rank 1: Barnacle Keel ship upgrade access
- Rank 2: Covenant Hunter cosmetic set
- Rank 3: Sea creature warning system (ship-mounted; alerts crew when a Kraken/Serpent is nearby)
- Rank 4: Storm Sails upgrade access
- Rank 5: **Reefwalker's Map** — reveals all resource islands and sea creature spawn zones on the chart

**Lore:** The Covenant predates every outpost and settlement. They were already here when the Syndicate arrived, the Guild marched in, and the Brotherhood took to the seas. They have no headquarters — only meeting points. They have no leaders — only elders. They have survived everything the sea has thrown at them.

---

# 10. ECONOMY & TRADING

## 10.1 — Currency
- **Gold** is the universal currency, earned by selling treasure
- **Faction Currencies** (Trade Tokens, Iron Marks, etc.) are earned by completing faction missions and used to unlock faction-exclusive items and upgrades

## 10.2 — Economy Cycle

1. Accept a **voyage/mission** (from a faction or found on an island)
2. Sail to the **target location**
3. **Complete the objective** (dig, fight, dive, deliver)
4. **Transport treasure** back on your ship
5. **Sell at an outpost** by physically handing chests to the Faction Steward NPC
6. Receive **Gold + Faction Reputation**

**Danger Zones:** The economy is vulnerable at every step. Other players can attack during travel, board during transport, or even infiltrate your outpost sale if timed poorly.

## 10.3 — Gold Uses

| Purchase | Cost Range |
|---|---|
| Basic ship upgrades | 500–2,000 gold |
| Rare ship upgrades | 3,000–8,000 gold |
| Weapon unlocks | 200–1,500 gold |
| Cosmetic items | 500–10,000 gold |
| Warship permit | 15,000 gold |
| Legendary cosmetic set | 25,000–50,000 gold |

## 10.4 — Reputation Banking

Faction reputation gained during a voyage is **not secured until you successfully sell treasure at an outpost**. If your ship sinks before you sell, all reputation from that voyage is lost (gold already in your account is safe, but unbanked voyage rep is gone). This creates a strong incentive to safely return to port before sinking.

---

# 11. WORLD EVENTS

World events appear on all players' chart tables when they are active. They are large-scale challenges that reward the crew that completes them.

## 11.1 — Active World Events

### Skull Fort Siege
- A massive skeleton fortress appears on an island, marked by a green skull cloud visible from sea
- Waves of skeleton defenders protect the island
- Final wave summons a **Skeleton Captain Boss** with unique attack patterns
- Reward: Skull Fort Vault unlocks containing 3–6 high-tier treasure chests
- **Risk:** Other player crews can see the event and attack when you're weakened after fighting skeletons

### Ghost Armada
- 5 ghost ships spawn and sail in formation, marked by blue flame on the chart
- Must sink all 5 ships; they have spectral abilities (phasing through cannonballs on cooldown, healing)
- Reward: Each ghost ship drops a rare chest when sunk; final flagship drops a Warlord's Vault chest
- Only occurs at night; event ends at dawn

### Dread Serpent
- A massive sea serpent attacks ships in a specific ocean zone
- Must deal enough damage to force it to retreat (killing it requires endgame gear)
- Reward: Serpent Scales (valuable trade item), rare treasure washed up on nearby shores
- Defeating it fully (only possible with upgraded Warship cannons) drops a legendary item

### The Leviathan Kraken
- Kraken tentacles rise from the water and grab ships in Zone 3–4
- Crew must fight off tentacles on the ship's deck using melee and ranged weapons while keeping the ship afloat
- Reward: Kraken ink (crafting material), Kraken Trophy chest, legendary reputation with Reefwalker Covenant
- Can escape by dealing enough damage to tentacles; surviving long enough forces it to retreat

### Merchant Convoy Raid (PvP Event)
- A large Syndicate merchant NPC convoy spawns heading toward an outpost
- The Bloodtide Brotherhood faction posts a massive bounty on the convoy
- Any crew that sinks the convoy earns the bounty
- The Syndicate faction pays defending crews for keeping the convoy alive
- Creates direct PvP conflict with a clear objective and reward structure

### The Cursed Tide
- A zone of black water and purple fog sweeps across part of the map for 15 minutes
- Inside the zone, all treasure values are doubled, but skeleton enemies are near-immortal and player compass navigation is scrambled
- High risk, high reward endurance event

---

# 12. PROGRESSION & COSMETICS

## 12.1 — What Never Changes With Progression
- Base player movement speed
- Base weapon damage
- Swim speed
- Ability to access any zone or island

## 12.2 — What Progresses
- **Ship upgrades** (purchased with gold; lost on sink)
- **Faction rank** (unlocks mission types and exclusive purchases)
- **Cosmetic unlocks** (permanent; never lost)
- **Tool quality** (Repair Hammer efficiency, Shovel speed — minor upgrades, not game-breaking)

## 12.3 — Cosmetic Categories

Everything in this list is purely visual.

**Character Cosmetics:**
- Hats (tricornes, bandanas, helmets, crowns)
- Outfits (shirts, coats, pants, boots, belts)
- Tattoos
- Hair styles and colors
- Eye patches, prosthetics, scars
- Emotes and dances

**Ship Cosmetics:**
- Hull paint and design
- Sail designs (patterns, faction colors, custom icons)
- Figurehead (decorative bow piece)
- Flag and pennants
- Cannon skin
- Helm design
- Lantern style

**Weapon Cosmetics:**
- Cutlass designs (gold-hilted, bone-handled, rusted iron)
- Pistol skins
- Blunderbuss skins

## 12.4 — How Cosmetics Are Earned

- **Faction Rank Rewards:** Each rank-up grants a cosmetic tied to that faction's theme
- **Gold Purchases:** From outpost cosmetic shops
- **World Event Completion:** Unique cosmetics locked behind completing specific events
- **Legendary Achievements:** e.g. "Sink 50 enemy ships" — grants a special flag
- **No loot boxes or random cosmetic packs.** All cosmetics have known acquisition methods.

---

# 13. MULTIPLAYER & CREW SYSTEM

## 13.1 — Crew Formation

- Players can form a crew via the lobby/matchmaking system or open-crew mode (anyone can join your ship)
- **Crew size matches ship class:** When a crew is formed, they select their ship type
- A crew can change ship type at an outpost for a gold fee (smaller ships are cheaper; upgrading costs more)

## 13.2 — Crew Roles (Suggested, Not Mandatory)

Ships work best when players specialize. No role is forced — but efficiency rewards it.

| Role | Primary Tasks |
|---|---|
| **Helmsman** | Steering; reading charts; calling navigation |
| **Cannoneer** | Loading and firing cannons; tracking enemy ship position |
| **Lookout** | Crow's nest surveillance; calling enemy positions via spyglass |
| **Engineer** | Hull repair; bailing water; maintaining ship components |
| **Boarder** | Combat specialist; jumps to enemy ships; fights on islands |
| **Quartermaster** | Manages cargo; sorts hold; communicates with faction stewards |

On smaller ships, players cover multiple roles. On a Warship at full crew, roles can be fully specialized.

## 13.3 — Alliance System

Two separate crews can form a **Temporary Alliance**:
- Flag their ships as allied (visible to all players on the server)
- Can board each other's ships without triggering combat
- Share a cargo hold space on each other's ships
- Split treasure sale proceeds (agreed percentage before alliance)

Alliances can be **betrayed** at any time. Betraying an alliance awards a temporary "Traitor's Bounty" that other crews can collect by sinking the betraying ship.

## 13.4 — Server Social Systems

- **Global Ship Log:** A board at every outpost showing the last 5 legendary items sold, with the selling crew's name
- **Wanted Bounties:** Players who sink other players accumulate a bounty; other crews earn gold by sinking them
- **Crew Fame:** Persistent across sessions. High-fame crews appear in the server's Hall of Legends board.

## 13.5 — Open Crew (Solo Join)

Players without a crew can join any ship flying a **Seeking Crew** flag. Ship captains can kick players at any time. Open crew players earn a full equal share of all treasure sold during the voyage.

---

# 14. AUDIO & VISUAL DIRECTION

## 14.1 — Visual Style

- **Top-down 2D**, similar to a zoomed-out Zelda: Wind Waker in color palette
- **Art direction:** Rich, saturated colors. Deep blues and greens for sea; warm oranges and yellows for tropical islands; dark purples and grays for cursed zones
- **Lighting:** Dynamic day/night. Real-time shadows cast by masts, islands, and rocks. Lantern glow in dark areas. Moonlight reflecting on water at night.
- **Animations:** Fluid ocean wave animation. Ship wake trails. Sail cloth physics. Cannonball arc with particle trail. Splash effects for all water impacts.
- **UI Style:** Minimal HUD. Health shown as a subtle glow around player. Compass always visible in corner. No floating damage numbers (immersive mode).

## 14.2 — Water Rendering

- Animated tile-based ocean with parallax depth illusion
- Wave height variation based on weather/zone
- Foam at shorelines and in ship wake
- Underwater view for diving: murky blue-green with visibility falloff; bioluminescent plants near wrecks

## 14.3 — Audio Design

- **Dynamic music system:** Calm exploration music shifts to tense strings when an enemy ship is spotted; full battle theme when combat begins
- **Positional audio:** Cannon fire, waves, wind, crew shouts — all directional and distance-falloff
- **Environmental audio:** Jungle ambience on tropical islands; howling wind in Zone 3; ghostly wails near cursed islands; eerie silence in the Cursed Tide event
- **Ship audio:** Creaking wood, flapping sails, splashing bow, groaning under cannon fire
- **Musical instrument items:** Players can equip a hurdy-gurdy, concertina, or drum and play simple songs — used socially and for specific faction rituals (Ashfall Compact)

---

# 15. TECHNICAL ARCHITECTURE NOTES

These are recommendations for an AI or developer building this game.

## 15.1 — Recommended Engine

- **Godot 4** (free, open-source, excellent 2D support, GDScript or C#)
- Alternative: **Unity 2D** (wider asset ecosystem but license concerns)
- For browser-based: **Phaser 3** (JavaScript, excellent 2D ocean/tile support)

## 15.2 — Networking Architecture

- **Authoritative Server Model:** Server handles all physics, treasure positions, and combat resolution
- **Client Prediction:** Players' own movement is client-predicted, reconciled with server state
- **State Sync:** Ship position, sail angle, hull damage, water level, cargo hold state — all synced at 20 ticks/second
- **Treasure as Physical Objects:** Each chest is a unique entity on the server with a UUID; position is tracked at all times; cannot be duplicated

## 15.3 — World State

- **Persistent Session:** World events, treasure positions, sunk ships, and faction outpost states persist for the duration of a server session (4–8 hour sessions recommended before reset)
- **Procedural Treasure Placement:** Each session, buried treasure locations are re-randomized within island dig zones using seeded RNG

## 15.4 — Physics Priorities

- Ship movement physics (wind force vectors, water drag, wave resistance)
- Cannonball ballistic physics (arc, drop, ricochet off rock surfaces)
- Water ingress simulation (per-breach water flow rates, hold fill level)
- Player physics on a moving ship (players move relative to ship, not world, when standing on deck)

## 15.5 — Data Structure Suggestions

**Ship State Object:**
```json
{
  "shipId": "uuid",
  "type": "galleon",
  "crewIds": ["player1", "player2", ...],
  "position": { "x": 0, "y": 0 },
  "heading": 270,
  "speed": 4.2,
  "hullHP": 2800,
  "waterLevel": 12,
  "activeBreaches": [{ "location": "portMid", "flowRate": 3.2 }],
  "sails": [{ "raised": true, "angle": 45, "hp": 100 }, ...],
  "cargo": [{ "itemId": "crimsonTrove_001", "slot": 1 }],
  "upgrades": ["ironPlating", "longRangeCannons"],
  "factionFlag": "bloodtide"
}
```

**Treasure Item Object:**
```json
{
  "itemId": "uuid",
  "type": "tombmarkerChest",
  "tier": 2,
  "baseValue": 750,
  "modifiers": ["stormVoyage", "noDeaths"],
  "location": "ship_galleon_uuid",
  "discoveredBy": "player_uuid",
  "timestamp": 1700000000
}
```

---

# APPENDIX A — ENEMY TYPES

## Skeleton Enemies (Land & Sea)
| Type | HP | Behavior | Drops |
|---|---|---|---|
| Driftbone | 30 | Wanders, attacks on sight | Common loot, bones |
| Ironbone | 60 | Patrols in groups, charges | Uncommon loot |
| Ashbone | 80 | Throws cursed fire; immune to fire damage | Fire Shot ammo |
| Captainbone | 150 | Leads groups; uses pistol + cutlass; calls reinforcements | Tier 2 chest, map fragment |
| Skeleton Lord | 500 | Boss; unique attack pattern per lord; phase-based fight | Tier 3 chest, faction reward item |

## Sea Creatures
| Creature | Zone | Behavior | Reward |
|---|---|---|---|
| Reef Shark | 1–2 | Attacks swimming players | Shark trophy |
| Deep Lurker | 2–3 | Attacks ships; bites hull; can be fought off with melee | Lurker fang (craft material) |
| Dread Serpent | 3–4 | Attacks ship from water surface; can tip ship | Serpent scale, rare chest |
| Leviathan Kraken | 4 | Grabs ship with tentacles; crew must fight on deck | Kraken ink, legendary chest |

---

# APPENDIX B — QUICK REFERENCE — SHIP CREW EFFICIENCY

| Ship | Minimum | Optimal | Maximum | Notes |
|---|---|---|---|---|
| Skiff | 1 | 2 | 2 | Solo viable but slow repairs |
| Brigantine | 1 | 3 | 4 | 1 person is very difficult |
| Galleon | 2 | 6 | 8 | Below 4 = severe disadvantage |
| Warship | 4 | 7 | 8 | Below 6 = cannot use all cannons |

---

*End of Game Design Document — Tides of Ruin v1.0*
*Total Word Count: ~8,500 | Sections: 15 + 2 Appendices*
