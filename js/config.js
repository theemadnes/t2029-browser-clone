/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   Configuration & Control Customization Manager
   ========================================================================== */

class ConfigManager {
  constructor() {
    this.STORAGE_KEY = 't2029_game_config_v1';

    // Default configuration
    this.defaults = {
      controlMode: 'modern', // 'modern' (WASD + Mouse-Look) or 'classic' (Keyboard Tank/Turn)
      mouseLook: true,
      mouseSensitivity: 1.2,
      invertY: false,
      smoothTurnSpeed: 2.2, // for keyboard turning
      graphicsMode: 'native', // 'native' (High-Fidelity 3D VGA), 'svga' (640x400), 'vga' (384x240), 'dos' (320x200)
      dithering8bit: false, // Optional 256-color VGA Bayer ordered dithering
      voxelDebris: true, // 3D physics debris on robot explosions
      crtScanlines: true,
      fov: 75,
      cockpitBezel: true,
      volumes: {
        master: 0.8,
        music: 0.55,
        sfx: 0.75
      },
      keybindings: {
        forward: 'KeyW',
        backward: 'KeyS',
        strafeLeft: 'KeyA',
        strafeRight: 'KeyD',
        turnLeft: 'ArrowLeft',
        turnRight: 'ArrowRight',
        firePrimary: 'Mouse0',
        fireSecondary: 'Mouse2',
        interact: 'KeyE',
        useItem: 'KeyF',
        cycleWeapon: 'KeyR',
        cycleSecondary: 'KeyT',
        inv1: 'Digit1',
        inv2: 'Digit2',
        inv3: 'Digit3',
        inv4: 'Digit4',
        inv5: 'Digit5',
        toggleMap: 'KeyM',
        pause: 'Escape'
      }
    };

    this.settings = JSON.parse(JSON.stringify(this.defaults));
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = Object.assign({}, this.defaults, parsed);
        this.settings.volumes = Object.assign({}, this.defaults.volumes, parsed.volumes || {});
        this.settings.keybindings = Object.assign({}, this.defaults.keybindings, parsed.keybindings || {});
      }
    } catch (e) {
      console.warn("Could not load stored config, using defaults:", e);
    }
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Could not save config to localStorage:", e);
    }
  }

  reset() {
    this.settings = JSON.parse(JSON.stringify(this.defaults));
    this.save();
    return this.settings;
  }

  setBinding(action, code) {
    if (this.settings.keybindings.hasOwnProperty(action)) {
      this.settings.keybindings[action] = code;
      this.save();
    }
  }

  isActionPressed(action, activeKeys, mouseButtons) {
    const bind = this.settings.keybindings[action];
    if (!bind) return false;

    if (bind === 'Mouse0') return !!mouseButtons.left;
    if (bind === 'Mouse1') return !!mouseButtons.middle;
    if (bind === 'Mouse2') return !!mouseButtons.right;

    return !!activeKeys[bind];
  }

  getKeyDisplayName(code) {
    if (!code) return 'NONE';
    if (code === 'Mouse0') return 'L-CLICK';
    if (code === 'Mouse1') return 'M-CLICK';
    if (code === 'Mouse2') return 'R-CLICK';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
    if (code === 'Space') return 'SPACE';
    if (code === 'Escape') return 'ESC';
    if (code === 'Enter') return 'ENTER';
    return code;
  }
}

window.GameConfig = new ConfigManager();
