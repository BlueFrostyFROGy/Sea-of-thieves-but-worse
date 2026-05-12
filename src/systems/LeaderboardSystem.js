/**
 * LeaderboardSystem — Global leaderboard via Firebase Realtime Database REST API.
 *
 * SETUP (one-time, free):
 *  1. Go to https://console.firebase.google.com → Create project
 *  2. Build → Realtime Database → Create database → Start in TEST mode
 *  3. Copy your database URL (e.g. https://my-project-default-rtdb.firebaseio.com)
 *  4. Paste it into FIREBASE_DB_URL below (replace the placeholder)
 */

const FIREBASE_DB_URL = 'https://tides-of-ruin-default-rtdb.firebaseio.com';

const LEADERBOARD_PATH = `${FIREBASE_DB_URL}/leaderboard`;
const CONFIGURED = FIREBASE_DB_URL !== 'https://YOUR-PROJECT-default-rtdb.firebaseio.com';

import { SHIP_CLASSES } from '../data/gddData.js';

/** Calculate a fleet's power score from profile data */
export function calcFleetPower(profile) {
  const ships = profile?.ownedShips ?? ['skiff'];
  const shipValue = ships.reduce((sum, key) => sum + (SHIP_CLASSES[key]?.cost ?? 0), 0);
  const gold = profile?.gold ?? 0;
  const stats = profile?.stats ?? {};
  const fame = (stats.voyagesCompleted ?? 0) * 500 + (stats.shipsSunk ?? 0) * 1000;
  return shipValue + gold + fame;
}

/** Get or create a stable player UID stored in localStorage */
function getPlayerId() {
  const KEY = 'tides_leaderboard_uid';
  let uid = localStorage.getItem(KEY);
  if (!uid) {
    uid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem(KEY, uid);
  }
  return uid;
}

/**
 * Submit the player's current fleet power to the leaderboard.
 * @param {object} profile - the player profile object
 * @returns {Promise<void>}
 */
export async function submitScore(profile) {
  if (!CONFIGURED) {
    console.warn('[Leaderboard] Firebase URL not configured — skipping score submission.');
    return;
  }
  const uid = getPlayerId();
  const name = profile?.playerName ?? profile?.name ?? 'Unnamed Pirate';
  const power = calcFleetPower(profile);
  const ships = (profile?.ownedShips ?? ['skiff']).length;
  const gold = profile?.gold ?? 0;
  const payload = {
    name,
    power,
    ships,
    gold,
    flagship: profile?.flagshipShip ?? 'skiff',
    ts: Date.now()
  };
  try {
    const res = await fetch(`${LEADERBOARD_PATH}/${uid}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('[Leaderboard] Score submitted:', power);
  } catch (e) {
    console.warn('[Leaderboard] Submit failed:', e.message);
  }
}

/**
 * Fetch the top-10 leaderboard entries sorted by fleet power (descending).
 * @returns {Promise<Array<{rank, name, power, ships, gold, flagship}>>}
 */
export async function fetchLeaderboard() {
  if (!CONFIGURED) {
    return [{ rank: 1, name: '— Configure Firebase to see scores —', power: 0, ships: 0, gold: 0, flagship: 'skiff' }];
  }
  try {
    const res = await fetch(`${LEADERBOARD_PATH}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data) return [];
    return Object.values(data)
      .sort((a, b) => b.power - a.power)
      .slice(0, 10)
      .map((entry, i) => ({ rank: i + 1, ...entry }));
  } catch (e) {
    console.warn('[Leaderboard] Fetch failed:', e.message);
    return [{ rank: 1, name: '— Could not load leaderboard —', power: 0, ships: 0, gold: 0, flagship: 'skiff' }];
  }
}

export { CONFIGURED };
