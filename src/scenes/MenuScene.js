import Phaser from 'phaser';
import { FACTIONS, SHIP_CLASSES } from '../data/gddData.js';
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
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard.on('keydown-RETURN', () => this.startGame());

    this.refreshLabels();
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
