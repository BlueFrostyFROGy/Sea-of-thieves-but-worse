import { FACTIONS, RANK_THRESHOLDS } from '../data/gddData.js';

const STORAGE_KEY = 'tides_of_ruin_profile_v1';

function baseProfile() {
  return {
    gold: 0,
    totalGoldEarned: 0,
    ownedShips: ['skiff'],
    flagshipShip: 'skiff',
    reputation: Object.fromEntries(Object.keys(FACTIONS).map((k) => [k, 0])),
    factionCurrency: Object.fromEntries(Object.keys(FACTIONS).map((k) => [k, 0])),
    permits: {
      warship: false
    },
    cosmetics: [],
    achievementsGranted: [],
    shipLog: [],
    hallOfLegends: [],
    crewFame: 0,
    stats: {
      shipsSunk: 0,
      voyagesCompleted: 0,
      legendarySold: 0
    }
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseProfile();
    const parsed = JSON.parse(raw);
    return {
      ...baseProfile(),
      ...parsed,
      reputation: { ...baseProfile().reputation, ...(parsed.reputation ?? {}) },
      factionCurrency: { ...baseProfile().factionCurrency, ...(parsed.factionCurrency ?? {}) },
      permits: { ...baseProfile().permits, ...(parsed.permits ?? {}) },
      ownedShips: Array.isArray(parsed.ownedShips) && parsed.ownedShips.length ? parsed.ownedShips : ['skiff'],
      flagshipShip: typeof parsed.flagshipShip === 'string' ? parsed.flagshipShip : 'skiff',
      achievementsGranted: Array.isArray(parsed.achievementsGranted) ? [...parsed.achievementsGranted] : [],
      shipLog: Array.isArray(parsed.shipLog) ? parsed.shipLog.slice(0, 5) : [],
      hallOfLegends: Array.isArray(parsed.hallOfLegends) ? parsed.hallOfLegends.slice(0, 10) : [],
      stats: { ...baseProfile().stats, ...(parsed.stats ?? {}) }
    };
  } catch {
    return baseProfile();
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function factionRank(rep) {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (rep >= RANK_THRESHOLDS[i]) return i;
  }
  return 0;
}

export function computeWarshipPermit(profile) {
  return Object.values(profile.reputation).some((rep) => factionRank(rep) >= 3);
}
