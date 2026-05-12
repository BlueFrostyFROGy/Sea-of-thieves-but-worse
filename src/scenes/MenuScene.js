import Phaser from 'phaser';
import { FACTIONS, SHIP_CLASSES } from '../data/gddData.js';
import { NetworkClient } from '../systems/NetworkClient.js';
import { factionRank, loadProfile, saveProfile } from '../systems/ProfileSystem.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.shipKeys = Object.keys(SHIP_CLASSES);
    this.factionKeys = Object.keys(FACTIONS);
    this.roleKeys = ['helmsman', 'cannoneer', 'lookout', 'engineer', 'boarder', 'quartermaster'];
    this.shipIndex = 0;
    this.factionIndex = 0;
    this.crewCount = 1;
    this.roleIndex = 0;
    this.openCrew = true;
    this.profile = null;
    this.viewMode = 'sail';
    this.lobbyState = null;
    this.lobbyMode = 'idle';
    this.lobbyCodeInput = '';
    this.lobbyJoinCode = '';
  }

  create() {
    const { width, height } = this.scale;
    this.profile = loadProfile();
    this.profile.ownedShips = Array.isArray(this.profile.ownedShips) && this.profile.ownedShips.length
      ? this.profile.ownedShips.filter((shipKey) => this.shipKeys.includes(shipKey))
      : ['skiff'];
    if (!this.profile.ownedShips.length) this.profile.ownedShips = ['skiff'];
    this.profile.flagshipShip = this.profile.ownedShips.includes(this.profile.flagshipShip) ? this.profile.flagshipShip : this.profile.ownedShips[0];
    this.shipIndex = Math.max(0, this.shipKeys.indexOf(this.profile.flagshipShip));
    saveProfile(this.profile);

    this.add.rectangle(width / 2, height / 2, width, height, 0x03101a);
    this.add.text(width / 2, 64, 'TIDES OF RUIN', { fontSize: '48px', color: '#c5e7ff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width / 2, 110, 'Choose your voyage, expand your fleet, and buy new ships.', { fontSize: '15px', color: '#79b8e8' }).setOrigin(0.5);

    this.tabButtons = [
      this.createTabButton(width / 2 - 185, 168, 'Voyage Setup', 'sail'),
      this.createTabButton(width / 2, 168, 'Ship Shop', 'shop'),
      this.createTabButton(width / 2 + 185, 168, 'My Ships', 'fleet')
    ];

    this.mainPanel = this.add.rectangle(width / 2, height / 2 + 20, 860, 344, 0x071723, 0.9).setStrokeStyle(2, 0x31526d, 0.9);

    this.pageTitle = this.add.text(width / 2, 224, '', { fontSize: '25px', color: '#ffe7b0', fontStyle: 'bold' }).setOrigin(0.5);
    this.pageBody = this.add.text(width / 2, 320, '', { fontSize: '17px', color: '#eef8ff', align: 'center', lineSpacing: 8, wordWrap: { width: 760 } }).setOrigin(0.5);
    this.pageMeta = this.add.text(width / 2, 442, '', { fontSize: '14px', color: '#ffd691', align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5);
    this.pageHint = this.add.text(width / 2, 492, '', { fontSize: '14px', color: '#9fc0d6', align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5);

    this.launchButton = this.createButton(width / 2, height / 2 + 136, 240, 44, 'LAUNCH VOYAGE', () => this.launchVoyage());

    this.footerLabel = this.add.text(width / 2, height - 66, 'Controls: click tabs or use [1]/[2]/[3]. Left/Right changes ship. Up/Down changes faction. Enter launches. B buys. F sets flagship.', { fontSize: '13px', color: '#6f8fa6', align: 'center' }).setOrigin(0.5);

    this.lobbyPanel = this.add.rectangle(width / 2, height / 2 + 210, 860, 98, 0x081722, 0.92).setStrokeStyle(2, 0x31526d, 0.8);
    this.lobbyTitle = this.add.text(width / 2 - 392, height / 2 + 170, 'Lobby', { fontSize: '18px', color: '#ffe7b0', fontStyle: 'bold' });
    this.lobbyText = this.add.text(width / 2 - 392, height / 2 + 198, '', { fontSize: '14px', color: '#eef8ff', wordWrap: { width: 740 }, lineSpacing: 6 });
    this.lobbyHint = this.add.text(width / 2 - 392, height / 2 + 245, '', { fontSize: '12px', color: '#9fc0d6', wordWrap: { width: 740 } });
    this.lobbyButtons = {
      create: this.createButton(width / 2 - 240, height / 2 + 206, 150, 34, 'CREATE LOBBY', () => this.createLobby()),
      join: this.createButton(width / 2 - 76, height / 2 + 206, 150, 34, 'JOIN LOBBY', () => this.enterJoinMode()),
      start: this.createButton(width / 2 + 88, height / 2 + 206, 150, 34, 'SET SAIL', () => this.startLobby())
    };
    this.lobbyButtons.start.setVisible(false);
    this.lobbyCodeText = this.add.text(width / 2 + 248, height / 2 + 198, '', { fontSize: '18px', color: '#9ef0ff', fontStyle: 'bold' }).setOrigin(0, 0);

    this.input.keyboard.on('keydown-ONE', () => this.setViewMode('sail'));
    this.input.keyboard.on('keydown-TWO', () => this.setViewMode('shop'));
    this.input.keyboard.on('keydown-THREE', () => this.setViewMode('fleet'));
    this.input.keyboard.on('keydown-LEFT', () => this.cycleShip(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.cycleShip(1));
    this.input.keyboard.on('keydown-UP', () => this.cycleFaction(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.cycleFaction(1));
    this.input.keyboard.on('keydown-OPEN_BRACKET', () => this.cycleCrew(-1));
    this.input.keyboard.on('keydown-CLOSE_BRACKET', () => this.cycleCrew(1));
    this.input.keyboard.on('keydown-COMMA', () => this.cycleRole(-1));
    this.input.keyboard.on('keydown-PERIOD', () => this.cycleRole(1));
    this.input.keyboard.on('keydown-O', () => this.toggleOpenCrew());
    this.input.keyboard.on('keydown-B', () => this.buySelectedShip());
    this.input.keyboard.on('keydown-F', () => this.setFlagshipShip());

    this.input.keyboard.on('keydown-BACKSPACE', () => {
      if (this.lobbyMode === 'join' && this.lobbyJoinCode.length > 0) {
        this.lobbyJoinCode = this.lobbyJoinCode.slice(0, -1);
        this.refreshLobbyUI();
      }
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.lobbyMode === 'join') return this.joinLobby();
      if (this.lobbyState?.isHost) return this.startLobby();
      this.startGame();
    });

    this.input.keyboard.on('keydown', (event) => this.handleLobbyKeyboard(event));

    this.setupLobbyClient();

    this.refreshLabels();
  }

  setupLobbyClient() {
    this.lobbyClient = null;
    this.lobbyStatus = 'Offline';
    const host = window.location.hostname;
    this.multiplayerAvailable = host === 'localhost' || host === '127.0.0.1' || host === '';
    if (!this.multiplayerAvailable) {
      this.lobbyButtons.create.setAlpha(0.35).disableInteractive();
      this.lobbyButtons.join.setAlpha(0.35).disableInteractive();
      this.lobbyHint.setText('Multiplayer requires running the game locally (npm run dev).');
    }
  }

  createTabButton(x, y, label, mode) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 158, 34, 0x10283b, 0.9).setStrokeStyle(1, 0x4c6a81, 0.8);
    const text = this.add.text(0, 0, label, { fontSize: '15px', color: '#d8efff' }).setOrigin(0.5);
    container.add([bg, text]);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setViewMode(mode));
    container.mode = mode;
    container.bg = bg;
    container.label = text;
    return container;
  }

  createButton(x, y, width, height, label, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0x193a56, 0.96).setStrokeStyle(2, 0xa7d8ff, 0.9);
    const text = this.add.text(0, 0, label, { fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([bg, text]);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    container.bg = bg;
    container.label = text;
    return container;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.refreshLabels();
  }

  handleLobbyKeyboard(event) {
    if (this.lobbyMode !== 'join') return;
    const key = event.key?.toUpperCase?.() ?? '';
    if (/^[A-Z0-9]$/.test(key) && this.lobbyJoinCode.length < 6) {
      this.lobbyJoinCode += key;
      this.refreshLobbyUI();
    }
  }

  connectLobbyClient() {
    if (this.lobbyClient?.connected) return this.lobbyClient;
    if (!this.lobbyClient) this.lobbyClient = new NetworkClient('ws://localhost:2567');

    this.lobbyClient.onLobbyCreated = (msg) => {
      this.lobbyState = { code: msg.code, shipType: msg.shipType, openCrew: msg.openCrew, crewName: msg.crewName, members: msg.members ?? [], isHost: true };
      this.lobbyMode = 'host';
      this.refreshLobbyUI();
    };
    this.lobbyClient.onLobbyJoined = (msg) => {
      this.lobbyState = { code: msg.code, shipType: msg.shipType, openCrew: msg.openCrew, crewName: msg.crewName, members: msg.members ?? [], isHost: false };
      this.lobbyMode = 'join-wait';
      this.refreshLobbyUI();
    };
    this.lobbyClient.onLobbyUpdate = (msg) => {
      if (!this.lobbyState || this.lobbyState.code !== msg.code) return;
      this.lobbyState = { ...this.lobbyState, shipType: msg.shipType, openCrew: msg.openCrew, crewName: msg.crewName, members: msg.members ?? [], isHost: this.lobbyState.isHost };
      this.refreshLobbyUI();
    };
    this.lobbyClient.onLobbyStarted = (msg) => {
      this.lobbyState = null;
      this.lobbyMode = 'idle';
      this.lobbyJoinCode = '';
      this.refreshLobbyUI();
      this.lobbyClient?.disconnect();
      this.lobbyClient = null;
      this.scene.start('OceanScene', {
        shipType: msg.shipType,
        faction: this.factionKeys[this.factionIndex],
        profile: this.profile,
        crewCount: this.crewCount,
        crewRole: this.roleKeys[this.roleIndex],
        openCrew: msg.openCrew,
        crewName: msg.crewName,
        lobbyCode: msg.code,
        networkUrl: msg.wsUrl,
        networkCrewId: msg.crewId,
        networkPlayerName: msg.playerName,
        isNetworkSession: true,
        waitForLobbyStart: false
      });
    };
    return this.lobbyClient;
  }

  refreshLobbyUI() {
    const code = this.lobbyState?.code ?? this.lobbyCodeInput;
    const members = this.lobbyState?.members ?? [];
    const modeText = this.lobbyMode === 'join' ? `Enter Code: ${this.lobbyJoinCode || '______'}` : this.lobbyState ? `Lobby Code: ${code}` : 'No active lobby';
    const memberText = members.length ? members.map((m, idx) => `${idx + 1}. ${m.name}${m.isHost ? ' (Host)' : ''}`).join('   ') : 'No lobby members yet.';
    this.lobbyText.setText([modeText, memberText]);
    this.lobbyHint.setText(
      this.lobbyMode === 'join'
        ? 'Type the 6-character code and press Enter to join.'
        : this.lobbyState?.isHost
          ? 'Wait for others to join, then press Set Sail.'
          : this.lobbyState
            ? 'Waiting for host to set sail.'
            : 'Create a lobby to host, or join with a code.'
    );
    this.lobbyCodeText.setText(this.lobbyState?.code ?? '');
    this.lobbyButtons.start.setVisible(Boolean(this.lobbyState?.isHost));
  }

  createLobby() {
    if (!this.multiplayerAvailable) return this.setStatusMessage('Multiplayer only works when running locally.');
    const client = this.connectLobbyClient();
    client.connect({
      name: this.profile?.name ?? 'Captain',
      shipType: this.getLaunchShipKey(),
      crewId: null,
      role: this.roleKeys[this.roleIndex],
      openCrew: this.openCrew,
      crewName: `${FACTIONS[this.factionKeys[this.factionIndex]].name} Crew`,
      autoJoin: false
    }).then(() => {
      client.createLobby({
        name: this.profile?.name ?? 'Captain',
        shipType: this.getLaunchShipKey(),
        role: this.roleKeys[this.roleIndex],
        openCrew: this.openCrew,
        crewName: `${FACTIONS[this.factionKeys[this.factionIndex]].name} Crew`
      });
    }).catch(() => this.setStatusMessage('Lobby host connection failed.'));
  }

  enterJoinMode() {
    if (!this.multiplayerAvailable) return this.setStatusMessage('Multiplayer only works when running locally.');
    this.lobbyMode = 'join';
    this.lobbyJoinCode = '';
    this.refreshLobbyUI();
  }

  joinLobby() {
    const code = this.lobbyJoinCode.trim().toUpperCase();
    if (code.length !== 6) return this.setStatusMessage('Enter the 6-character lobby code.');
    const client = this.connectLobbyClient();
    client.connect({
      name: this.profile?.name ?? 'Crewmate',
      shipType: this.getLaunchShipKey(),
      crewId: null,
      role: this.roleKeys[this.roleIndex],
      openCrew: true,
      crewName: `${FACTIONS[this.factionKeys[this.factionIndex]].name} Crew`,
      autoJoin: false
    }).then(() => {
      client.joinLobby(code, {
        name: this.profile?.name ?? 'Crewmate',
        role: this.roleKeys[this.roleIndex]
      });
    }).catch(() => this.setStatusMessage('Lobby join failed.'));
  }

  startLobby() {
    const client = this.connectLobbyClient();
    if (!this.lobbyState?.isHost) return this.setStatusMessage('Only the host can set sail.');
    client.startLobby({
      shipType: this.getLaunchShipKey(),
      openCrew: this.openCrew,
      crewName: `${FACTIONS[this.factionKeys[this.factionIndex]].name} Crew`
    });
  }

  setStatusMessage(message) {
    this.pageMeta.setText(message);
  }

  getLaunchShipKey() {
    const highlightedShipKey = this.shipKeys[this.shipIndex];
    if (this.profile.ownedShips.includes(highlightedShipKey)) return highlightedShipKey;
    if (this.profile.ownedShips.includes(this.profile.flagshipShip)) return this.profile.flagshipShip;
    const fallback = this.profile.ownedShips[0] ?? 'skiff';
    return this.shipKeys.includes(fallback) ? fallback : 'skiff';
  }

  launchVoyage() {
    this.setViewMode('sail');
    const shipKey = this.getLaunchShipKey();
    this.shipIndex = Math.max(0, this.shipKeys.indexOf(shipKey));

    this.profile.flagshipShip = shipKey;
    saveProfile(this.profile);

    this.scene.start('OceanScene', {
      shipType: shipKey,
      faction: this.factionKeys[this.factionIndex],
      profile: this.profile,
      crewCount: this.crewCount,
      crewRole: this.roleKeys[this.roleIndex],
      openCrew: this.openCrew,
      crewName: `${FACTIONS[this.factionKeys[this.factionIndex]].name} Crew`
    });
  }

  cycleShip(delta) {
    this.shipIndex = (this.shipIndex + delta + this.shipKeys.length) % this.shipKeys.length;
    this.refreshLabels();
  }

  cycleFaction(delta) {
    this.factionIndex = (this.factionIndex + delta + this.factionKeys.length) % this.factionKeys.length;
    this.refreshLabels();
  }

  cycleCrew(delta) {
    const ship = SHIP_CLASSES[this.shipKeys[this.shipIndex]];
    this.crewCount = Phaser.Math.Clamp(this.crewCount + delta, 1, ship.maxCrew);
    this.refreshLabels();
  }

  cycleRole(delta) {
    this.roleIndex = (this.roleIndex + delta + this.roleKeys.length) % this.roleKeys.length;
    this.refreshLabels();
  }

  toggleOpenCrew() {
    this.openCrew = !this.openCrew;
    this.refreshLabels();
  }

  getShipState(shipKey) {
    const ship = SHIP_CLASSES[shipKey];
    const previousShipKey = this.shipKeys[this.shipKeys.indexOf(shipKey) - 1] ?? null;
    const owned = this.profile.ownedShips.includes(shipKey);
    const previousOwned = !previousShipKey || this.profile.ownedShips.includes(previousShipKey);
    const status = owned ? 'Owned' : !previousOwned ? `Buy ${SHIP_CLASSES[previousShipKey].label} first` : `${ship.cost}g`;
    return { ship, owned, previousOwned, status };
  }

  refreshLabels() {
    const shipKey = this.shipKeys[this.shipIndex];
    const factionKey = this.factionKeys[this.factionIndex];
    const faction = FACTIONS[factionKey];
    const selectedRep = this.profile.reputation[factionKey] ?? 0;
    const selectedRank = factionRank(selectedRep);
    const { ship, owned, status } = this.getShipState(shipKey);

    this.crewCount = Phaser.Math.Clamp(this.crewCount, 1, ship.maxCrew);

    for (const tab of this.tabButtons) {
      const active = tab.mode === this.viewMode;
      tab.bg.setFillStyle(active ? 0x1f4762 : 0x10283b, 0.95);
      tab.bg.setStrokeStyle(1, active ? 0xbcdfff : 0x4c6a81, 0.95);
      tab.label.setColor(active ? '#ffffff' : '#d8efff');
    }

    if (this.viewMode === 'sail') {
      this.pageTitle.setText('Voyage Setup');
      const shipStatusLine = `${ship.label}${owned ? '' : ' (Locked)'}  •  Price ${ship.cost}g  •  Hull ${ship.hp}  •  Cannons ${ship.cannons}  •  Cargo ${ship.cargo}`;
      const launchShip = SHIP_CLASSES[this.getLaunchShipKey()];
      this.pageBody.setText([
        shipStatusLine,
        `Faction: ${faction.name}  •  Rank ${selectedRank} (${selectedRep} rep)`,
        `Crew ${this.crewCount}/${ship.maxCrew}  •  Role ${this.roleKeys[this.roleIndex]}  •  Open Crew ${this.openCrew ? 'On' : 'Off'}`,
        `Flagship: ${SHIP_CLASSES[this.profile.flagshipShip].label}  •  Launching as ${launchShip.label}`
      ].join('\n'));
      this.pageMeta.setText(`Gold ${this.profile.gold}  •  Selected ship status: ${status}`);
      this.pageHint.setText('Use Left/Right to choose a ship, Up/Down to choose faction, [ / ] crew, < / > role, O toggle crew, then click Launch Voyage.');
    } else if (this.viewMode === 'shop') {
      this.pageTitle.setText('Ship Shop');
      this.pageBody.setText(this.shipKeys.map((key, index) => {
        const data = this.getShipState(key);
        const selected = key === shipKey ? '▶ ' : '  ';
        return `${selected}${index + 1}. ${data.ship.label} — Price ${data.ship.cost}g — ${data.owned ? 'Owned' : data.status} — Hull ${data.ship.hp}, Cannons ${data.ship.cannons}, Cargo ${data.ship.cargo}`;
      }).join('\n'));
      this.pageMeta.setText(`Gold ${this.profile.gold}  •  Selected ${ship.label} costs ${ship.cost}g  •  ${status}`);
      this.pageHint.setText('Click the Ship Shop tab any time, or use [2]. Use Left/Right to browse ships and [B] to buy the selected ship.');
    } else {
      const fleetLines = this.profile.ownedShips.map((key, index) => {
        const selected = key === shipKey ? '▶ ' : '  ';
        const flagship = key === this.profile.flagshipShip ? ' (Flagship)' : '';
        return `${selected}${index + 1}. ${SHIP_CLASSES[key].label}${flagship}`;
      });
      this.pageTitle.setText('My Ships');
      this.pageBody.setText(fleetLines.length ? fleetLines.join('\n') : 'No ships owned.');
      this.pageMeta.setText(`Fleet size ${this.profile.ownedShips.length}  •  Current flagship ${SHIP_CLASSES[this.profile.flagshipShip].label}  •  Launching as ${SHIP_CLASSES[this.getLaunchShipKey()].label}`);
      this.pageHint.setText('Use Left/Right to browse ships. Press [F] to make the selected owned ship your flagship. Click Launch Voyage to start playing with your flagship.');
    }

    const showLaunchButton = this.viewMode === 'sail' || this.viewMode === 'fleet';
    this.launchButton.setVisible(showLaunchButton);
    this.launchButton.label.setText(this.viewMode === 'fleet' ? 'START SAILING' : 'LAUNCH VOYAGE');
  }

  buySelectedShip() {
    this.setViewMode('shop');
    const shipKey = this.shipKeys[this.shipIndex];
    const { ship, owned, previousOwned } = this.getShipState(shipKey);

    if (owned) return this.setStatusMessage(`${ship.label} already owned.`);
    if (!previousOwned) return this.setStatusMessage('Buy the previous ship first.');
    if (this.profile.gold < ship.cost) return this.setStatusMessage(`Not enough gold. Need ${ship.cost}g.`);

    this.profile.gold -= ship.cost;
    this.profile.ownedShips = Array.from(new Set([...(this.profile.ownedShips ?? []), shipKey]));
    if (!this.profile.flagshipShip) this.profile.flagshipShip = shipKey;
    saveProfile(this.profile);
    this.refreshLabels();
    this.setStatusMessage(`${ship.label} purchased!`);
  }

  setFlagshipShip() {
    this.setViewMode('fleet');
    const shipKey = this.shipKeys[this.shipIndex];
    if (!this.profile.ownedShips.includes(shipKey)) {
      this.setStatusMessage('You can only set an owned ship as your flagship.');
      return;
    }
    this.profile.flagshipShip = shipKey;
    saveProfile(this.profile);
    this.refreshLabels();
    this.setStatusMessage(`${SHIP_CLASSES[shipKey].label} is now your flagship.`);
  }

  startGame() {
    this.launchVoyage();
  }
}
