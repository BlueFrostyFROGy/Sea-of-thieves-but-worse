import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'server', '.data');
const STATE_FILE = path.join(DATA_DIR, 'world-state.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveWorldSnapshot(snapshot) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
}

export function loadWorldSnapshot() {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
