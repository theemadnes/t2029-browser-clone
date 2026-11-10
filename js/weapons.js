/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   Weapons, Ordinance & Equipment Systems
   ========================================================================== */

const WEAPON_REGISTRY = {
  // --- PRIMARY PHASED PLASMA CANNONS (PPC) ---
  ppc_40w: {
    id: 'ppc_40w',
    name: '40-Watt PPC',
    type: 'primary',
    slotType: 'plasma',
    damage: 28,
    fireRate: 0.22, // seconds between shots
    heatPerShot: 10,
    projSpeed: 80,
    projColor: 0x00e5ff,
    projGlow: 0x0088cc,
    projScale: 0.4,
    range: 120,
    sound: 'playPPC',
    soundArg: 40,
    desc: 'Standard issue Resistance Phased Plasma Cannon. Rapid fire with low heat output.'
  },

  ppc_60w: {
    id: 'ppc_60w',
    name: '60-Watt PPC',
    type: 'primary',
    slotType: 'plasma',
    damage: 48,
    fireRate: 0.32,
    heatPerShot: 16,
    projSpeed: 88,
    projColor: 0x33b5e5,
    projGlow: 0x006699,
    projScale: 0.55,
    range: 140,
    sound: 'playPPC',
    soundArg: 60,
    desc: 'Uprated military plasma rifle. High particle density with balanced thermal load.'
  },

  ppc_80w: {
    id: 'ppc_80w',
    name: '80-Watt PPC',
    type: 'primary',
    slotType: 'plasma',
    damage: 82,
    fireRate: 0.46,
    heatPerShot: 24,
    projSpeed: 95,
    projColor: 0x9955ff,
    projGlow: 0x6600cc,
    projScale: 0.7,
    range: 160,
    sound: 'playPPC',
    soundArg: 80,
    desc: 'Heavy assault plasma weapon capable of breaching armored HK chassis.'
  },

  ppc_100w: {
    id: 'ppc_100w',
    name: '100-Watt PPC',
    type: 'primary',
    slotType: 'plasma',
    damage: 135,
    fireRate: 0.65,
    heatPerShot: 35,
    projSpeed: 110,
    projColor: 0xffffff,
    projGlow: 0xffaa00,
    projScale: 0.9,
    range: 180,
    sound: 'playPPC',
    soundArg: 100,
    desc: 'Experimental high-wattage plasma cannon. Massive stopping power with heavy thermal strain.'
  },

  // --- SECONDARY WEAPONS & ORDNANCE ---
  grenade: {
    id: 'grenade',
    name: 'Fusion Grenades',
    type: 'secondary',
    slotType: 'explosive',
    maxAmmo: 12,
    defaultAmmo: 4,
    damage: 220,
    radius: 12,
    fuseTime: 1.6,
    throwSpeed: 30,
    fireRate: 0.9,
    heatPerShot: 0,
    sound: 'playGrenadeThrow',
    desc: 'Concentrated fusion explosives. Caution: large blast radius deals self-damage in close quarters.'
  },

  missile: {
    id: 'missile',
    name: 'Homing Missiles',
    type: 'secondary',
    slotType: 'explosive',
    maxAmmo: 10,
    defaultAmmo: 4,
    damage: 140,
    radius: 7,
    projSpeed: 50,
    turnRate: 4.5,
    fireRate: 0.8,
    heatPerShot: 5,
    sound: 'playMissileLaunch',
    desc: 'Micro-rockets equipped with thermal seekers that home in on locked Skynet targets.'
  },

  mine: {
    id: 'mine',
    name: 'Proximity Mines',
    type: 'secondary',
    slotType: 'explosive',
    maxAmmo: 8,
    defaultAmmo: 4,
    damage: 320,
    radius: 9,
    armTime: 1.5,
    fireRate: 1.0,
    heatPerShot: 0,
    sound: 'playMineArm',
    desc: 'Deployable magnetic ordnance used for ambushes and demolishing Skynet infrastructure.'
  },

  // --- SUIT UPGRADES & TACTICAL ITEMS ---
  autofire: {
    id: 'autofire',
    name: 'Neurolink Autofire',
    type: 'module',
    desc: 'Direct neural link module permitting continuous automatic PPC cycling while trigger is depressed.'
  },

  armor_plate: {
    id: 'armor_plate',
    name: 'Reinforced Armor Plate',
    type: 'module',
    bonusArmor: 40,
    desc: 'Composite depleted boron-carbide plate. Increases front and rear armor thresholds by +40 points.'
  },

  medpack: {
    id: 'medpack',
    name: 'Autodoc Medpack',
    type: 'usable',
    maxAmmo: 5,
    defaultAmmo: 2,
    healAmount: 60,
    desc: 'Trauma medical kit used to patch armor breaches or revive wounded Resistance personnel.'
  },

  scanner: {
    id: 'scanner',
    name: 'Diatomic Scanner',
    type: 'usable',
    desc: 'Sub-atomic resonance scanner calibrated to locate and stabilize the Time Distortion Device.'
  },

  beacon: {
    id: 'beacon',
    name: 'Locator Beacon',
    type: 'usable',
    desc: 'Tactical transponder beacon used to mark High-Value Targets for Resistance retrieval.'
  },

  card_gamma: {
    id: 'card_gamma',
    name: 'Gamma Access Card',
    type: 'keycard',
    doorCode: 'GAMMA',
    desc: 'Security clearance keycard required to unlock the fortified blast doors of Base Gamma.'
  },

  card_alpha: {
    id: 'card_alpha',
    name: 'Alpha Access Card',
    type: 'keycard',
    doorCode: 'ALPHA',
    desc: 'Skynet reactor complex sector security keycard Alpha.'
  },

  card_beta: {
    id: 'card_beta',
    name: 'Beta Access Card',
    type: 'keycard',
    doorCode: 'BETA',
    desc: 'Skynet reactor complex sector security keycard Beta.'
  },

  card_delta: {
    id: 'card_delta',
    name: 'Delta Access Card',
    type: 'keycard',
    doorCode: 'DELTA',
    desc: 'Skynet reactor complex sector security keycard Delta.'
  },

  viral_x: {
    id: 'viral_x',
    name: 'Viral-X Data Cartridge',
    type: 'usable',
    desc: 'Cybernetic counter-algorithm formulated to disable Skynet ICBM launch protocols.'
  }
};

class LoadoutManager {
  constructor() {
    this.primaryWeapon = 'ppc_40w';
    this.secondaryWeapon = 'grenade';
    this.ammo = {
      grenade: 4,
      missile: 4,
      mine: 4,
      medpack: 2
    };

    // 5 inventory slots as per original manual & walkthrough
    this.inventory = [
      null, null, null, null, null
    ];

    this.hasAutofire = false;
    this.armorPlatesCount = 0;
  }

  setPrimary(id) {
    if (WEAPON_REGISTRY[id] && WEAPON_REGISTRY[id].type === 'primary') {
      this.primaryWeapon = id;
    }
  }

  setSecondary(id) {
    if (WEAPON_REGISTRY[id] && WEAPON_REGISTRY[id].type === 'secondary') {
      this.secondaryWeapon = id;
    }
  }

  setInventorySlot(slotIndex, itemId, count = 1) {
    if (slotIndex >= 0 && slotIndex < 5) {
      if (!itemId) {
        this.inventory[slotIndex] = null;
      } else if (WEAPON_REGISTRY[itemId]) {
        this.inventory[slotIndex] = {
          id: itemId,
          count: count
        };
      }
    }
  }

  addItemToFirstEmptySlot(itemId, count = 1) {
    // Check if stackable item already exists
    for (let i = 0; i < 5; i++) {
      if (this.inventory[i] && this.inventory[i].id === itemId) {
        this.inventory[i].count += count;
        return i;
      }
    }
    // Find first empty slot
    for (let i = 0; i < 5; i++) {
      if (!this.inventory[i]) {
        this.inventory[i] = { id: itemId, count: count };
        return i;
      }
    }
    return -1; // Inventory full
  }

  hasItem(itemId) {
    return this.inventory.some(slot => slot && slot.id === itemId);
  }

  removeItem(itemId, count = 1) {
    for (let i = 0; i < 5; i++) {
      if (this.inventory[i] && this.inventory[i].id === itemId) {
        this.inventory[i].count -= count;
        if (this.inventory[i].count <= 0) {
          this.inventory[i] = null;
        }
        return true;
      }
    }
    return false;
  }

  applyMissionPreset(missionId) {
    // Provide recommended weapons and equipment based on GameFAQs walkthrough
    if (missionId === 'training') {
      this.setPrimary('ppc_40w');
      this.setSecondary('grenade');
      this.ammo.grenade = 6;
      this.inventory = [
        { id: 'medpack', count: 2 },
        null, null, null, null
      ];
    } else if (missionId === 1) {
      this.setPrimary('ppc_40w');
      this.setSecondary('grenade');
      this.ammo.grenade = 4;
      this.inventory = [
        { id: 'medpack', count: 2 },
        null, null, null, null
      ];
    } else if (missionId === 2) {
      this.setPrimary('ppc_40w');
      this.setSecondary('mine');
      this.ammo.mine = 4;
      this.inventory = [
        { id: 'mine', count: 4 },
        { id: 'medpack', count: 2 },
        null, null, null
      ];
    } else if (missionId === 3) {
      this.setPrimary('ppc_60w');
      this.setSecondary('missile');
      this.hasAutofire = true;
      this.armorPlatesCount = 3;
      this.inventory = [
        { id: 'scanner', count: 1 },
        { id: 'beacon', count: 1 },
        { id: 'medpack', count: 2 },
        null, null
      ];
    } else if (missionId === 4) {
      this.setPrimary('ppc_80w');
      this.setSecondary('mine');
      this.ammo.mine = 3;
      this.armorPlatesCount = 5;
      this.inventory = [
        { id: 'mine', count: 3 },
        { id: 'medpack', count: 2 },
        null, null, null
      ];
    } else if (missionId === 5) {
      this.setPrimary('ppc_100w');
      this.setSecondary('missile');
      this.armorPlatesCount = 5;
      this.inventory = [
        { id: 'medpack', count: 3 },
        null, null, null, null
      ];
    } else if (missionId === 6) {
      this.setPrimary('ppc_100w');
      this.setSecondary('mine');
      this.ammo.mine = 4;
      this.armorPlatesCount = 4;
      this.inventory = [
        { id: 'mine', count: 4 },
        { id: 'grenade', count: 2 },
        null, null, null
      ];
    } else if (missionId === 7) {
      this.setPrimary('ppc_100w');
      this.setSecondary('mine');
      this.ammo.mine = 4;
      this.armorPlatesCount = 4;
      this.inventory = [
        { id: 'viral_x', count: 1 },
        { id: 'mine', count: 4 },
        { id: 'medpack', count: 2 },
        null, null
      ];
    } else if (missionId === 8) {
      this.setPrimary('ppc_100w');
      this.setSecondary('mine');
      this.ammo.mine = 6;
      this.armorPlatesCount = 5;
      this.inventory = [
        { id: 'mine', count: 6 },
        { id: 'medpack', count: 3 },
        null, null, null
      ];
    }
  }
}

window.WEAPON_REGISTRY = WEAPON_REGISTRY;
window.PlayerLoadout = new LoadoutManager();
