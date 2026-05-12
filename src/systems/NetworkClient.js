export class NetworkClient {
  constructor(url = 'ws://localhost:2567') {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.selfPlayerId = null;
    this.latestSnapshot = null;
    this.onSnapshot = null;
    this.onSessionWarning = null;
    this.onSessionReset = null;
    this.onCrewUpdate = null;
    this.inputSeq = 0;
    this.serverAckSeq = 0;
  }

  connect({ name = 'Captain', shipType = 'skiff', crewId = null, role = 'helmsman', openCrew = true, crewName = 'Open Crew' } = {}) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        this.ws.send(JSON.stringify({ type: 'join', name, shipType, crewId, role, openCrew, crewName }));
      });

      this.ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'joined') {
          this.connected = true;
          this.selfPlayerId = msg.selfPlayerId;
          this.latestSnapshot = msg.world;
          resolve(msg);
          return;
        }
        if (msg.type === 'snapshot') {
          this.latestSnapshot = msg;
          const ack = msg.ack?.find((a) => a.playerId === this.selfPlayerId);
          if (ack) this.serverAckSeq = ack.seq;
          if (this.onSnapshot) this.onSnapshot(msg);
          return;
        }
        if (msg.type === 'session-warning' && this.onSessionWarning) return this.onSessionWarning(msg);
        if (msg.type === 'session-reset' && this.onSessionReset) return this.onSessionReset(msg);
        if (msg.type === 'crew-update' && this.onCrewUpdate) return this.onCrewUpdate(msg);
      });

      this.ws.addEventListener('error', (err) => reject(err));
      this.ws.addEventListener('close', () => {
        this.connected = false;
      });
    });
  }

  sendInput({ throttle = 0, turn = 0, fire = false } = {}) {
    if (!this.connected || !this.ws) return;
    this.inputSeq += 1;
    this.ws.send(JSON.stringify({ type: 'input', throttle, turn, fire, seq: this.inputSeq }));
  }

  sendMessage(payload) {
    if (!this.connected || !this.ws) return;
    this.ws.send(JSON.stringify(payload));
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
