export const ZONES = [
  { key: 'amber', name: 'Amber Shallows', danger: 1, xMin: 0, xMax: 2200, color: 0x2b9ed1 },
  { key: 'tangled', name: 'Tangled Reach', danger: 2, xMin: 2200, xMax: 4200, color: 0x2a7f62 },
  { key: 'iron', name: 'Iron Depths', danger: 3, xMin: 4200, xMax: 6200, color: 0x404b66 },
  { key: 'abyssal', name: 'Abyssal Crown', danger: 4, xMin: 6200, xMax: 8200, color: 0x352547 }
];

export const SHIP_CLASSES = {
  skiff: { label: 'Skiff', cost: 0, hp: 800, cannons: 2, sails: 1, cargo: 4, turnRate: 0.12, accel: 8.3, drag: 0.988, anchorRaiseSec: 2.5, minCrew: 1, optimalCrew: 2, maxCrew: 2 },
  brigantine: { label: 'Brigantine', cost: 3000, hp: 1600, cannons: 4, sails: 2, cargo: 10, turnRate: 0.1, accel: 7.6, drag: 0.986, anchorRaiseSec: 4, minCrew: 1, optimalCrew: 3, maxCrew: 4 },
  galleon: { label: 'Galleon', cost: 9000, hp: 3200, cannons: 8, sails: 4, cargo: 24, turnRate: 0.075, accel: 6.8, drag: 0.983, anchorRaiseSec: 6, minCrew: 2, optimalCrew: 6, maxCrew: 8 },
  warship: { label: 'Warship', cost: 18000, hp: 5000, cannons: 12, sails: 5, cargo: 32, turnRate: 0.06, accel: 6.4, drag: 0.981, anchorRaiseSec: 7.5, minCrew: 4, optimalCrew: 7, maxCrew: 8 }
};

export const FACTIONS = {
  saltwind: { name: 'Saltwind Syndicate', color: '#56d9c6', treasureBonus: ['captainsPlunder'], currencyName: 'Trade Tokens' },
  ironclad: { name: 'Ironclad Guild', color: '#a7c2e9', treasureBonus: ['warlordsVaults'], currencyName: 'Iron Marks' },
  bloodtide: { name: 'Bloodtide Brotherhood', color: '#f05058', treasureBonus: ['legendaryRelics'], currencyName: 'Blood Marks' },
  ashfall: { name: 'Ashfall Compact', color: '#ff8c4d', treasureBonus: ['warlordsVaults', 'legendaryRelics'], currencyName: 'Ember Seals' },
  reefwalker: { name: 'Reefwalker Covenant', color: '#89d680', treasureBonus: ['driftwoodFinds'], currencyName: 'Tide Markers' }
};

export const TREASURE_TABLE = [
  { id: 'saltmossCoffer', tier: 'driftwoodFinds', name: 'Saltmoss Coffer', min: 50, max: 150, weight: 30 },
  { id: 'deadmanSatchel', tier: 'driftwoodFinds', name: "Deadman's Satchel", min: 80, max: 200, weight: 25 },
  { id: 'crewLockbox', tier: 'driftwoodFinds', name: 'Crewman Lockbox', min: 100, max: 250, weight: 22 },
  { id: 'crimsonTrove', tier: 'captainsPlunder', name: 'Crimson Trove', min: 600, max: 1100, weight: 11 },
  { id: 'ironjawStrongbox', tier: 'captainsPlunder', name: 'Ironjaw Strongbox', min: 700, max: 1200, weight: 10 },
  { id: 'dreadcrownCasket', tier: 'warlordsVaults', name: 'Dreadcrown Casket', min: 5000, max: 8000, weight: 4 },
  { id: 'stormboundVault', tier: 'warlordsVaults', name: 'Stormbound Vault', min: 4500, max: 7000, weight: 3.5 },
  { id: 'sunkencrown', tier: 'legendaryRelics', name: 'The Sunken Crown', min: 25000, max: 40000, weight: 0.7 },
  { id: 'godtideJewel', tier: 'legendaryRelics', name: 'The Godtide Jewel', min: 18000, max: 30000, weight: 1.2 }
];

export const WEATHER_STATES = [
  { key: 'clear', label: 'Clear Skies', speedMult: 1.08, vis: 1 },
  { key: 'squall', label: 'Squall', speedMult: 0.92, vis: 0.78 },
  { key: 'thunderstorm', label: 'Thunderstorm', speedMult: 0.84, vis: 0.74 },
  { key: 'deadcalm', label: 'Dead Calm', speedMult: 0.26, vis: 1 },
  { key: 'cursedfog', label: 'Cursed Fog', speedMult: 0.75, vis: 0.58 }
];

export const WORLD_EVENTS = [
  { key: 'skullFort', label: 'Skull Fort Siege', valueBonus: 0.2 },
  { key: 'ghostArmada', label: 'Ghost Armada', valueBonus: 0.2 },
  { key: 'dreadSerpent', label: 'Dread Serpent', valueBonus: 0.15 },
  { key: 'kraken', label: 'Leviathan Kraken', valueBonus: 0.25 },
  { key: 'merchantConvoy', label: 'Merchant Convoy Raid', valueBonus: 0.2 },
  { key: 'cursedTide', label: 'The Cursed Tide', valueBonus: 1.0 }
];

export const RANK_THRESHOLDS = [0, 100, 250, 450, 700, 1000];

export const SHIP_UPGRADES = {
  ironPlating: {
    label: 'Iron Plating',
    category: 'hull',
    cost: 2200,
    apply: { hullMult: 1.2, repairPenalty: 0.85 }
  },
  barnacleKeel: {
    label: 'Barnacle Keel',
    category: 'hull',
    cost: 1600,
    apply: { speedMult: 1.05 }
  },
  reinforcedBow: {
    label: 'Reinforced Bow',
    category: 'hull',
    cost: 1700,
    apply: { ramDamageMult: 1.3 }
  },
  stormSails: {
    label: 'Storm Sails',
    category: 'sails',
    cost: 1800,
    apply: { badWeatherPenaltyMult: 0.75 }
  },
  speedCanvas: {
    label: 'Speed Canvas',
    category: 'sails',
    cost: 2000,
    apply: { clearWeatherSpeedMult: 1.1 }
  },
  battleSails: {
    label: 'Battle Sails',
    category: 'sails',
    cost: 1400,
    apply: { sailResponseMult: 1.2 }
  },
  longRangeCannons: {
    label: 'Long-Range Cannons',
    category: 'weapon',
    cost: 2600,
    apply: { projectileSpeedMult: 1.25, cannonDamageMult: 0.9 }
  },
  rapidFireBreach: {
    label: 'Rapid Fire Breach',
    category: 'weapon',
    cost: 2400,
    apply: { cannonCooldownMult: 0.75, cannonDamageMult: 0.85 }
  },
  chainShotCannons: {
    label: 'Chain Shot Rig',
    category: 'weapon',
    cost: 2100,
    apply: { unlockAmmo: 'chain' }
  },
  extendedHold: {
    label: 'Extended Hold',
    category: 'utility',
    cost: 3000,
    apply: { cargoMult: 1.5 }
  },
  crowsNest: {
    label: "Crow's Nest",
    category: 'utility',
    cost: 1300,
    apply: { visionHint: true }
  },
  reinforcedCapstan: {
    label: 'Reinforced Capstan',
    category: 'utility',
    cost: 1800,
    apply: { anchorRaiseMult: 1.4 }
  }
};

export const AMMO_TYPES = {
  iron: { label: 'Iron Ball', damageMult: 1, speedMult: 1, splash: 0, unlockRank: 0 },
  chain: { label: 'Chain Shot', damageMult: 0.8, speedMult: 0.9, splash: 0, unlockFaction: 'ironclad', unlockRank: 1 },
  exploding: { label: 'Exploding Shot', damageMult: 0.9, speedMult: 0.9, splash: 48, unlockFaction: 'bloodtide', unlockRank: 1 },
  grapple: { label: 'Grapple Shot', damageMult: 0.65, speedMult: 0.95, splash: 0, unlockFaction: 'saltwind', unlockRank: 1 },
  fire: { label: 'Fire Shot', damageMult: 0.85, speedMult: 0.92, splash: 24, burn: true, unlockFaction: 'ashfall', unlockRank: 1 }
};

export const MISSION_TEMPLATES = {
  saltwind: [
    { key: 'cargoRun', label: 'Cargo Run', objective: 'sellCount', target: 3, rewardGold: 550, rewardRep: 35 },
    { key: 'brokerEscort', label: 'Broker Escort', objective: 'surviveTime', target: 180, rewardGold: 700, rewardRep: 45 }
  ],
  ironclad: [
    { key: 'bountyHunt', label: 'Bounty Hunt', objective: 'sinkShips', target: 3, rewardGold: 650, rewardRep: 40 },
    { key: 'patrolRoute', label: 'Patrol Route', objective: 'visitZones', target: 3, rewardGold: 700, rewardRep: 45 }
  ],
  bloodtide: [
    { key: 'raidingContract', label: 'Raiding Contract', objective: 'lootCount', target: 4, rewardGold: 700, rewardRep: 45 },
    { key: 'seaWar', label: 'Sea War', objective: 'sinkShips', target: 4, rewardGold: 900, rewardRep: 55 }
  ],
  ashfall: [
    { key: 'relicRecovery', label: 'Relic Recovery', objective: 'lootGhost', target: 2, rewardGold: 850, rewardRep: 55 },
    { key: 'cursedCargo', label: 'Cursed Cargo', objective: 'sellDuringEvent', target: 2, rewardGold: 1000, rewardRep: 60 }
  ],
  reefwalker: [
    { key: 'survivalRun', label: 'Survival Run', objective: 'surviveTime', target: 240, rewardGold: 600, rewardRep: 40 },
    { key: 'islandMastery', label: 'Island Mastery', objective: 'visitZones', target: 4, rewardGold: 900, rewardRep: 55 }
  ]
};

export const FACTION_RANK_UNLOCKS = {
  saltwind: {
    1: { type: 'ammo', label: 'Grapple Shot' },
    2: { type: 'cosmetic', label: 'Merchant Coat Set' },
    3: { type: 'cosmetic', label: 'Syndicate Ship Skin' },
    4: { type: 'upgrade', label: 'Extended Cargo Hold Access' },
    5: { type: 'legendary', label: "The Merchant's Seal" }
  },
  ironclad: {
    1: { type: 'ammo', label: 'Chain Shot' },
    2: { type: 'cosmetic', label: 'Guild Officer Armor Set' },
    3: { type: 'permit', label: 'Warship Permit Access' },
    4: { type: 'upgrade', label: 'Reinforced Bow Access' },
    5: { type: 'legendary', label: 'Iron Mandate' }
  },
  bloodtide: {
    1: { type: 'ammo', label: 'Exploding Shot' },
    2: { type: 'cosmetic', label: 'Brotherhood Corsair Set' },
    3: { type: 'weapon', label: 'Heavy Cutlass Access' },
    4: { type: 'weapon', label: 'Eye of the Deep Access' },
    5: { type: 'legendary', label: 'Crimson Rite' }
  },
  ashfall: {
    1: { type: 'ammo', label: 'Fire Shot' },
    2: { type: 'cosmetic', label: 'Compact Scholar Set' },
    3: { type: 'utility', label: 'Ghost Safe Passage' },
    4: { type: 'utility', label: 'Ritual Lantern Access' },
    5: { type: 'legendary', label: 'Ashfall Tome' }
  },
  reefwalker: {
    1: { type: 'upgrade', label: 'Barnacle Keel Access' },
    2: { type: 'cosmetic', label: 'Covenant Hunter Set' },
    3: { type: 'utility', label: 'Sea Creature Warning System' },
    4: { type: 'upgrade', label: 'Storm Sails Access' },
    5: { type: 'legendary', label: "Reefwalker's Map" }
  }
};

export const WORLD_EVENT_OBJECTIVES = {
  skullFort: { objective: 'defeatSkeletons', target: 12, rewardGold: 1200, rewardRep: 55 },
  ghostArmada: { objective: 'sinkGhostShips', target: 5, rewardGold: 1500, rewardRep: 70 },
  dreadSerpent: { objective: 'defeatCreature', target: 1, rewardGold: 1400, rewardRep: 65 },
  kraken: { objective: 'defeatCreature', target: 1, rewardGold: 1800, rewardRep: 80 },
  merchantConvoy: { objective: 'sinkShips', target: 4, rewardGold: 1300, rewardRep: 60 },
  cursedTide: { objective: 'sellDuringEvent', target: 3, rewardGold: 1100, rewardRep: 50 }
};

export const COSMETIC_CATALOG = [
  { id: 'hat_tricorne_black', label: 'Black Tricorne', category: 'hat', cost: 650 },
  { id: 'outfit_merchant_coat', label: 'Merchant Coat', category: 'outfit', cost: 1400, faction: 'saltwind', minRank: 2 },
  { id: 'outfit_guild_officer', label: 'Guild Officer Armor', category: 'outfit', cost: 1600, faction: 'ironclad', minRank: 2 },
  { id: 'outfit_bloodtide_corsair', label: 'Bloodtide Corsair Set', category: 'outfit', cost: 1700, faction: 'bloodtide', minRank: 2 },
  { id: 'outfit_compact_scholar', label: 'Compact Scholar Set', category: 'outfit', cost: 1500, faction: 'ashfall', minRank: 2 },
  { id: 'outfit_reefwalker_hunter', label: 'Reefwalker Hunter Set', category: 'outfit', cost: 1500, faction: 'reefwalker', minRank: 2 },
  { id: 'ship_hull_abyssal_lacquer', label: 'Abyssal Hull Lacquer', category: 'ship', cost: 3200 },
  { id: 'ship_figurehead_kraken', label: 'Kraken Figurehead', category: 'ship', cost: 4500 },
  { id: 'weapon_cutlass_gilded', label: 'Gilded Cutlass Skin', category: 'weapon', cost: 1200 },
  { id: 'weapon_pistol_bonegrip', label: 'Bonegrip Pistol Skin', category: 'weapon', cost: 1100 },
  { id: 'emote_deck_jig', label: 'Deck Jig Emote', category: 'emote', cost: 900 },
  { id: 'flag_hall_of_legends', label: 'Hall of Legends Flag', category: 'ship', cost: 5000 }
];

export const LEGENDARY_ACHIEVEMENTS = [
  { id: 'sink_50_ships', label: 'Sink 50 enemy ships', cosmeticId: 'flag_hall_of_legends', metric: 'shipsSunk', target: 50 },
  { id: 'sell_10_legendary', label: 'Sell 10 legendary relics', cosmeticId: 'ship_figurehead_kraken', metric: 'legendarySold', target: 10 },
  { id: 'complete_25_voyages', label: 'Complete 25 voyages', cosmeticId: 'emote_deck_jig', metric: 'voyagesCompleted', target: 25 }
];

export const VOYAGE_CONTRACT_TEMPLATES = {
  saltwind: [
    {
      key: 'saltwind_blackroute',
      label: 'Black Route Exchange',
      steps: [
        { objective: 'lootAny', target: 2, label: 'Acquire 2 cargo crates' },
        { objective: 'visitZone', zone: 'tangled', target: 1, label: 'Deliver route through Tangled Reach' },
        { objective: 'sellCount', target: 2, label: 'Sell 2 treasure items at outpost' }
      ],
      rewardGold: 1400,
      rewardRep: 75
    }
  ],
  ironclad: [
    {
      key: 'ironclad_patrolchain',
      label: 'Meridian Patrol Chain',
      steps: [
        { objective: 'visitZone', zone: 'amber', target: 1, label: 'Patrol Amber Shallows' },
        { objective: 'visitZone', zone: 'iron', target: 1, label: 'Patrol Iron Depths' },
        { objective: 'sinkShips', target: 2, label: 'Sink 2 hostile ships' }
      ],
      rewardGold: 1600,
      rewardRep: 85
    }
  ],
  bloodtide: [
    {
      key: 'bloodtide_warpath',
      label: 'Brotherhood Warpath',
      steps: [
        { objective: 'sinkShips', target: 2, label: 'Sink 2 ships' },
        { objective: 'boardSabotage', target: 1, label: 'Board and sabotage one enemy ship' },
        { objective: 'sellCount', target: 1, label: 'Cash in plunder at outpost' }
      ],
      rewardGold: 1700,
      rewardRep: 90
    }
  ],
  ashfall: [
    {
      key: 'ashfall_relicline',
      label: 'Relic Line Expedition',
      steps: [
        { objective: 'lootGhost', target: 1, label: 'Recover relic from Ghost Island' },
        { objective: 'visitZone', zone: 'abyssal', target: 1, label: 'Cross the Abyssal Crown' },
        { objective: 'sellDuringEvent', target: 1, label: 'Sell during active event' }
      ],
      rewardGold: 2000,
      rewardRep: 100
    }
  ],
  reefwalker: [
    {
      key: 'reefwalker_huntline',
      label: 'Predator Huntline',
      steps: [
        { objective: 'defeatCreature', target: 1, label: 'Defeat 1 sea creature' },
        { objective: 'surviveTime', target: 180, label: 'Survive at sea for 3 minutes' },
        { objective: 'visitZone', zone: 'iron', target: 1, label: 'Sail through Iron Depths' }
      ],
      rewardGold: 1750,
      rewardRep: 92
    }
  ]
};
