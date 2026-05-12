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
    this.onLobbyCreated = null;
    this.onLobbyJoined = null;
    this.onLobbyUpdate = null;
    this.onLobbyStarted = null;
    this.onLobbyHostTransfer = null;
    this.inputSeq = 0;
    this.serverAckSeq = 0;
  }

  connect({ name = 'Captain', shipType = 'skiff', crewId = null, role = 'helmsman', openCrew = true, crewName = 'Open Crew', autoJoin = true } = {}) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', () => {
        this.connected = true;
        if (!autoJoin) {
          resolve({ type: 'connected' });
          return;
        }
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
        if (msg.type === 'lobby:created' && this.onLobbyCreated) return this.onLobbyCreated(msg);
        if (msg.type === 'lobby:joined' && this.onLobbyJoined) return this.onLobbyJoined(msg);
        if (msg.type === 'lobby:update' && this.onLobbyUpdate) return this.onLobbyUpdate(msg);
        if (msg.type === 'lobby:started' && this.onLobbyStarted) return this.onLobbyStarted(msg);
        if (msg.type === 'lobby:host-transfer' && this.onLobbyHostTransfer) return this.onLobbyHostTransfer(msg);
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

  createLobby(payload = {}) {
    this.sendMessage({ type: 'lobby:create', ...payload });
  }

  joinLobby(code, payload = {}) {
    this.sendMessage({ type: 'lobby:join', code, ...payload });
  }

  startLobby(payload = {}) {
    this.sendMessage({ type: 'lobby:start', ...payload });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
