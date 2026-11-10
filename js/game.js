/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   Core 3D Engine, Gameplay Loop & State Controller
   ========================================================================== */

class GameEngine {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('viewport-canvas');

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Camera rig for FPS controls
    this.yawObject = null;
    this.pitchObject = null;
    this.weaponViewModel = null;
    this.weaponRecoil = 0;

    // Game state
    this.state = 'TITLE'; // TITLE, BRIEFING, ARMORY, PLAYING, PAUSED, DEBRIEF
    this.currentMissionId = 1;
    this.currentMission = null;

    // Player vitals & physics
    this.player = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      yawObject: null,
      pitchObject: null,
      speed: 12.0,
      radius: 0.8,
      height: 1.8,

      // Vitals
      maxShield: 100,
      shield: 100,
      maxArmorFront: 100,
      armorFront: 100,
      maxArmorRear: 100,
      armorRear: 100,
      isAlive: true,
      lastDamageTime: 0,

      // Weapon Heat
      heat: 0,
      isOverheated: false,
      lastPriFireTime: 0,
      lastSecFireTime: 0,

      // Loadout & Target
      loadout: window.PlayerLoadout,
      lockedTarget: null,

      getForwardVector: () => {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return dir;
      }
    };

    // World entities
    this.colliders = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.interactiveObjects = [];
    this.missionTriggers = [];

    // Input state
    this.keys = {};
    this.mouseButtons = { left: false, right: false, middle: false };
    this.isPointerLocked = false;
    this.pendingKeyRebind = null;

    // Subsystems
    this.hud = null;
    this.audio = window.AudioSys;
    this.config = window.GameConfig;
    this.lastMissionLoadoutPresetId = null;
    this.armoryOpenedFromTitle = false;

    // Bind event handlers
    this.initInputs();
    this.initUI();
  }

  // =========================================================================
  // INITIALIZATION & SETUP
  // =========================================================================

  init() {
    ModelFactory.initMaterials();
    this.initThree();
    this.hud = new HUDSystem();

    // Start title screen music and 3D showcase
    this.showTitleScreen();

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    ModelFactory.initMaterials();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080f18, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      this.config.settings.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );

    // FPS Camera Rig
    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(this.camera);

    this.yawObject = new THREE.Object3D();
    this.yawObject.position.y = this.player.height;
    this.yawObject.add(this.pitchObject);
    this.scene.add(this.yawObject);

    this.player.yawObject = this.yawObject;
    this.player.pitchObject = this.pitchObject;

    // Renderer (8-Bit Voxel DOS Configuration)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x060c14);

    this.updateRendererResolution();
    this.initPostProcess();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x446688, 0x111622, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x7799bb, 0.8);
    dirLight.position.set(50, 80, 40);
    this.scene.add(dirLight);

    window.addEventListener('resize', () => {
      this.updateRendererResolution();
    });
  }

  updateRendererResolution() {
    if (!this.renderer) return;
    const mode = (this.config && this.config.settings && this.config.settings.graphicsMode) || 'native';
    let tw = 800;
    let th = 600;

    const wWidth = typeof window !== 'undefined' ? (window.innerWidth || 800) : 800;
    const wHeight = typeof window !== 'undefined' ? (window.innerHeight || 600) : 600;

    if (mode === 'dos') {
      tw = 320; th = 200;
    } else if (mode === 'vga') {
      tw = 384; th = 240;
    } else if (mode === 'svga') {
      tw = 640; th = 400;
    } else {
      // Native High-Fidelity 3D (Native Crisp)
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      tw = Math.floor(wWidth * dpr);
      th = Math.floor(wHeight * dpr);
    }

    this.renderWidth = tw;
    this.renderHeight = th;

    if (this.renderer.setSize) {
      this.renderer.setSize(tw, th, false);
    }
    if (this.camera) {
      this.camera.aspect = wWidth / wHeight;
      if (this.camera.updateProjectionMatrix) this.camera.updateProjectionMatrix();
    }
    if (this.renderTarget && this.renderTarget.setSize) {
      this.renderTarget.setSize(tw, th);
    }
  }

  initPostProcess() {
    if (typeof THREE === 'undefined' || !THREE.WebGLRenderTarget || !THREE.ShaderMaterial || !this.renderer) return;
    try {
      this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.postScene = new THREE.Scene();
      const tw = this.renderWidth || 384;
      const th = this.renderHeight || 240;

      this.renderTarget = new THREE.WebGLRenderTarget(tw, th, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter
      });

      this.postMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new THREE.Vector2(tw, th) },
          uEnableDither: { value: 1.0 },
          uEnableScanlines: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 uResolution;
          uniform float uEnableDither;
          uniform float uEnableScanlines;
          varying vec2 vUv;

          float getBayer4x4(vec2 coord) {
            int x = int(mod(coord.x, 4.0));
            int y = int(mod(coord.y, 4.0));
            int index = y * 4 + x;
            if (index == 0) return 0.0 / 16.0;
            if (index == 1) return 8.0 / 16.0;
            if (index == 2) return 2.0 / 16.0;
            if (index == 3) return 10.0 / 16.0;
            if (index == 4) return 12.0 / 16.0;
            if (index == 5) return 4.0 / 16.0;
            if (index == 6) return 14.0 / 16.0;
            if (index == 7) return 6.0 / 16.0;
            if (index == 8) return 3.0 / 16.0;
            if (index == 9) return 11.0 / 16.0;
            if (index == 10) return 1.0 / 16.0;
            if (index == 11) return 9.0 / 16.0;
            if (index == 12) return 15.0 / 16.0;
            if (index == 13) return 7.0 / 16.0;
            if (index == 14) return 13.0 / 16.0;
            return 5.0 / 16.0;
          }

          void main() {
            vec4 tex = texture2D(tDiffuse, vUv);
            vec3 col = tex.rgb;

            if (uEnableDither > 0.5) {
              float dither = getBayer4x4(gl_FragCoord.xy) - 0.5;
              col += dither * (1.0 / 24.0);
              // High-Fidelity 15-level per channel (4096-color VGA style quantization)
              col.r = floor(col.r * 15.0 + 0.5) / 15.0;
              col.g = floor(col.g * 15.0 + 0.5) / 15.0;
              col.b = floor(col.b * 15.0 + 0.5) / 15.0;
            }

            if (uEnableScanlines > 0.5) {
              float scan = sin(vUv.y * uResolution.y * 3.14159) * 0.08;
              col -= scan;
            }

            gl_FragColor = vec4(clamp(col, 0.0, 1.0), tex.a);
          }
        `
      });

      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
      this.postScene.add(quad);
    } catch (e) {
      console.warn("8-bit post-process shader unavailable, falling back to direct low-res buffer:", e);
      this.postMaterial = null;
      this.renderTarget = null;
    }
  }

  // =========================================================================
  // INPUT SYSTEM & EVENT LISTENERS
  // =========================================================================

  initInputs() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (this.pendingKeyRebind) {
        e.preventDefault();
        this.finishKeyRebind(e.code);
        return;
      }

      this.keys[e.code] = true;

      // Escape handles pause toggle
      if (e.code === 'Escape') {
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      }

      // Hotkey weapon cycling
      if (this.state === 'PLAYING' && e.code === this.config.settings.keybindings.cycleWeapon) {
        this.cyclePrimaryWeapon();
      }
      if (this.state === 'PLAYING' && (e.code === this.config.settings.keybindings.cycleSecondary || e.code === 'KeyT')) {
        this.cycleSecondaryWeapon();
      }

      // Hotkeys for inventory 1-5
      if (this.state === 'PLAYING') {
        for (let i = 1; i <= 5; i++) {
          if (e.code === this.config.settings.keybindings[`inv${i}`]) {
            this.useInventorySlot(i - 1);
          }
        }
      }

      // Interact key
      if (this.state === 'PLAYING' && e.code === this.config.settings.keybindings.interact) {
        this.checkInteract();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Pointer Lock & Mouse Look
    this.canvas.addEventListener('click', () => {
      if (this.state === 'PLAYING' && this.config.settings.mouseLook && !this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.canvas);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING' || !this.isPointerLocked || !this.config.settings.mouseLook) return;

      const sens = this.config.settings.mouseSensitivity * 0.0022;
      const invert = this.config.settings.invertY ? 1 : -1;

      this.yawObject.rotation.y -= e.movementX * sens;

      this.pitchObject.rotation.x += e.movementY * sens * invert;
      // Clamp pitch to prevent somersaults
      this.pitchObject.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitchObject.rotation.x));
    });

    // Mouse buttons
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseButtons.left = true;
      if (e.button === 1) this.mouseButtons.middle = true;
      if (e.button === 2) this.mouseButtons.right = true;

      // Audio init trigger
      this.audio.ensureContext();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseButtons.left = false;
      if (e.button === 1) this.mouseButtons.middle = false;
      if (e.button === 2) this.mouseButtons.right = false;
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.state === 'PLAYING') e.preventDefault();
    });
  }

  // =========================================================================
  // UI & MENU FLOW
  // =========================================================================

  initUI() {
    // Title Screen buttons
    const btnQuickstart = document.getElementById('btn-title-quickstart');
    const btnCampaign = document.getElementById('btn-title-campaign');
    const btnTraining = document.getElementById('btn-title-training');
    const btnArmory = document.getElementById('btn-title-armory');
    const btnSettings = document.getElementById('btn-title-settings');
    const btnIntel = document.getElementById('btn-title-intel');

    if (btnQuickstart) btnQuickstart.onclick = () => this.startMission(1);
    if (btnCampaign) btnCampaign.onclick = () => this.showMissionSelect();
    if (btnTraining) btnTraining.onclick = () => this.startMission('training');
    if (btnArmory) btnArmory.onclick = () => this.showArmory(true);
    if (btnSettings) btnSettings.onclick = () => this.showSettings();
    if (btnIntel) btnIntel.onclick = () => this.showIntel();

    // Mission Select & Briefing buttons
    const btnStartMission = document.getElementById('btn-briefing-deploy');
    const btnBriefingArmory = document.getElementById('btn-briefing-armory');
    const btnBriefingBack = document.getElementById('btn-briefing-back');

    if (btnStartMission) btnStartMission.onclick = () => this.startMission(this.currentMissionId);
    if (btnBriefingArmory) btnBriefingArmory.onclick = () => this.showArmory(false);
    if (btnBriefingBack) btnBriefingBack.onclick = () => this.showTitleScreen();

    // Armory buttons
    const btnArmoryDeploy = document.getElementById('btn-armory-deploy');
    const btnArmoryBack = document.getElementById('btn-armory-back');
    const btnArmoryReset = document.getElementById('btn-armory-reset');
    if (btnArmoryDeploy) btnArmoryDeploy.onclick = () => this.startMission(this.currentMissionId);
    if (btnArmoryBack) {
      btnArmoryBack.onclick = () => {
        if (this.armoryOpenedFromTitle) {
          this.showTitleScreen();
        } else {
          this.showBriefing(this.currentMissionId);
        }
      };
    }
    if (btnArmoryReset) {
      btnArmoryReset.onclick = () => {
        this.player.loadout.applyMissionPreset(this.currentMissionId);
        this.populateArmoryUI();
        this.audio.playUI('click');
        this.hud.addCommMessage('ARMORY', 'Standard mission loadout restored.', 'normal');
      };
    }

    // HUD weapon slots cycling via click
    const priHudName = document.getElementById('weapon-pri-name');
    if (priHudName && priHudName.parentElement) {
      priHudName.parentElement.onclick = () => {
        if (this.state === 'PLAYING') this.cyclePrimaryWeapon();
      };
    }
    const secHudName = document.getElementById('weapon-sec-name');
    if (secHudName && secHudName.parentElement) {
      secHudName.parentElement.onclick = () => {
        if (this.state === 'PLAYING') this.cycleSecondaryWeapon();
      };
    }

    // Settings buttons
    const btnSettingsClose = document.getElementById('btn-settings-close');
    const btnSettingsReset = document.getElementById('btn-settings-reset');
    if (btnSettingsClose) {
      btnSettingsClose.onclick = () => {
        this.hideModals();
        if (this.state === 'PAUSED') {
          this.showModal('pause-screen');
        } else {
          this.showTitleScreen();
        }
      };
    }
    if (btnSettingsReset) {
      btnSettingsReset.onclick = () => {
        this.config.reset();
        this.populateSettingsUI();
      };
    }

    // Pause Screen buttons
    const btnResume = document.getElementById('btn-pause-resume');
    const btnPauseSettings = document.getElementById('btn-pause-settings');
    const btnPauseAbort = document.getElementById('btn-pause-abort');

    if (btnResume) btnResume.onclick = () => this.resumeGame();
    if (btnPauseSettings) btnPauseSettings.onclick = () => this.showSettings();
    if (btnPauseAbort) btnPauseAbort.onclick = () => this.showTitleScreen();

    // Debriefing Screen buttons
    const btnDebriefNext = document.getElementById('btn-debrief-next');
    const btnDebriefRetry = document.getElementById('btn-debrief-retry');
    const btnDebriefMenu = document.getElementById('btn-debrief-menu');

    if (btnDebriefNext) {
      btnDebriefNext.onclick = () => {
        if (this.currentMissionId === 'training') {
          this.showBriefing(1);
        } else if (this.currentMissionId < 8) {
          this.showBriefing(this.currentMissionId + 1);
        } else {
          this.showTitleScreen();
        }
      };
    }
    if (btnDebriefRetry) btnDebriefRetry.onclick = () => this.startMission(this.currentMissionId);
    if (btnDebriefMenu) btnDebriefMenu.onclick = () => this.showTitleScreen();

    // Intel modal back
    const btnIntelBack = document.getElementById('btn-intel-back');
    if (btnIntelBack) btnIntelBack.onclick = () => this.showTitleScreen();

    // Setup settings inputs
    this.populateSettingsUI();
  }

  hideModals() {
    document.querySelectorAll('.modal-layer').forEach(m => m.classList.add('hidden'));
  }

  showModal(id) {
    this.hideModals();
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
  }

  setupTitleShowcase() {
    ModelFactory.initMaterials();
    // Clear old entities
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.titleShowcase = ModelFactory.createTitleShowcase();
    this.scene.add(this.titleShowcase);

    // Setup camera focused on 3D Terminator
    this.yawObject.position.set(0, 1.8, 4.8);
    this.yawObject.rotation.set(0, 0, 0);
    this.pitchObject.rotation.set(-0.06, 0, 0);
    this.scene.add(this.yawObject);

    // Dynamic lighting
    const hemiLight = new THREE.HemisphereLight(0x446688, 0x111622, 0.7);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xaaccff, 0.9);
    dirLight.position.set(20, 40, 30);
    this.scene.add(dirLight);
  }

  showTitleScreen() {
    this.state = 'TITLE';
    this.setupTitleShowcase();
    this.showModal('title-screen');
    this.audio.playTrack('title');
    if (document.exitPointerLock) document.exitPointerLock();
  }

  showMissionSelect() {
    const list = document.getElementById('mission-select-list');
    if (list) {
      list.innerHTML = '';
      for (let i = 1; i <= 8; i++) {
        const m = MISSIONS_DATA[i];
        const card = document.createElement('div');
        card.className = `mission-card ${this.currentMissionId === i ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="mission-num">MISSION ${i}</div>
          <div class="mission-name">${m.title.split(': ')[1] || m.title}</div>
          <div class="mission-desc">${m.subtitle}</div>
        `;
        card.onclick = () => {
          this.currentMissionId = i;
          this.showBriefing(i);
        };
        list.appendChild(card);
      }
    }
    this.showModal('mission-select-screen');
  }

  showBriefing(missionId) {
    this.state = 'BRIEFING';
    this.currentMissionId = missionId;
    if (this.lastMissionLoadoutPresetId !== missionId) {
      this.player.loadout.applyMissionPreset(missionId);
      this.lastMissionLoadoutPresetId = missionId;
    }
    const mission = MISSIONS_DATA[missionId];

    document.getElementById('briefing-title').textContent = mission.title;
    document.getElementById('briefing-sub').textContent = mission.subtitle;
    document.getElementById('briefing-text').innerHTML = mission.briefing.replace(/\n/g, '<br>');

    document.getElementById('briefing-rank').textContent = mission.rank;
    document.getElementById('briefing-loadout-rec').textContent = mission.recommendedLoadout;
    document.getElementById('briefing-timer').textContent = mission.timeLimit ? `${Math.floor(mission.timeLimit / 60)}:00 LIMIT` : 'NONE';

    const objList = document.getElementById('briefing-objectives-list');
    objList.innerHTML = '';
    mission.objectives.forEach(obj => {
      const li = document.createElement('li');
      li.textContent = obj.text;
      objList.appendChild(li);
    });

    this.showModal('briefing-screen');
    this.audio.playTrack('briefing');
  }

  showArmory(fromTitle = false) {
    this.armoryOpenedFromTitle = fromTitle;
    this.state = 'ARMORY';
    if (!this.lastMissionLoadoutPresetId) {
      this.player.loadout.applyMissionPreset(this.currentMissionId || 1);
      this.lastMissionLoadoutPresetId = this.currentMissionId || 1;
    }
    this.populateArmoryUI();
    this.showModal('armory-screen');
  }

  populateArmoryUI() {
    const loadout = this.player.loadout;

    // 1. Primary PPC hardpoints
    const priContainer = document.getElementById('armory-pri-list');
    if (priContainer) {
      priContainer.innerHTML = '';
      ['ppc_40w', 'ppc_60w', 'ppc_80w', 'ppc_100w'].forEach(id => {
        const item = WEAPON_REGISTRY[id];
        const isEquipped = (loadout.primaryWeapon === id);
        const div = document.createElement('div');
        div.className = `item-option ${isEquipped ? 'active' : ''}`;
        div.innerHTML = `
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: ${isEquipped ? 'var(--term-cyan)' : '#e0eef7'};">${item.name}</strong>
              <span style="font-size: 10px; color: ${isEquipped ? 'var(--term-cyan)' : '#6f8fa4'}; font-weight: bold; border: 1px solid ${isEquipped ? 'var(--term-cyan)' : '#345'}; padding: 1px 6px; border-radius: 2px;">
                ${isEquipped ? 'EQUIPPED' : 'SELECT'}
              </span>
            </div>
            <div style="font-size: 11px; color: #7fa0b8; margin: 4px 0 2px 0;">
              DMG: ${item.damage} | RATE: ${item.fireRate}s | HEAT: +${item.heatPerShot}% | RNG: ${item.range}m
            </div>
            <small style="color: #92a9ba; font-size: 10px; line-height: 1.25; display: block;">${item.desc}</small>
          </div>
        `;
        div.onclick = () => {
          loadout.setPrimary(id);
          this.updateWeaponViewModel();
          this.populateArmoryUI();
          this.audio.playUI('select');
        };
        priContainer.appendChild(div);
      });
    }

    // 2. Secondary Ordnance & Ammo
    const secContainer = document.getElementById('armory-sec-list');
    if (secContainer) {
      secContainer.innerHTML = '';
      ['grenade', 'missile', 'mine'].forEach(id => {
        const item = WEAPON_REGISTRY[id];
        const isEquipped = (loadout.secondaryWeapon === id);
        const currentAmmo = loadout.ammo[id] || 0;
        const div = document.createElement('div');
        div.className = `item-option ${isEquipped ? 'active' : ''}`;
        div.innerHTML = `
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: ${isEquipped ? 'var(--term-amber)' : '#e0eef7'};">${item.name}</strong>
              <span style="font-size: 10px; color: ${isEquipped ? 'var(--term-amber)' : '#6f8fa4'}; font-weight: bold; border: 1px solid ${isEquipped ? 'var(--term-amber)' : '#345'}; padding: 1px 6px; border-radius: 2px;">
                ${isEquipped ? 'EQUIPPED' : 'SELECT'}
              </span>
            </div>
            <div style="font-size: 11px; color: #7fa0b8; margin: 4px 0 2px 0;">
              DMG: ${item.damage} | BLAST: ${item.radius}m | MAX: ${item.maxAmmo}
            </div>
            <small style="color: #92a9ba; font-size: 10px; line-height: 1.25; display: block; margin-bottom: 6px;">${item.desc}</small>
            <div style="display: flex; align-items: center; justify-content: space-between; background: #060e16; padding: 4px 8px; border: 1px solid #162a3d; border-radius: 2px;">
              <span style="font-size: 11px; color: #a0d4e6;">ROUNDS: <strong>${currentAmmo} / ${item.maxAmmo}</strong></span>
              <div style="display: flex; gap: 4px;">
                <button class="term-btn mini" data-action="dec" style="padding: 2px 8px; font-size: 11px;">-</button>
                <button class="term-btn mini" data-action="inc" style="padding: 2px 8px; font-size: 11px;">+</button>
              </div>
            </div>
          </div>
        `;
        div.onclick = (e) => {
          if (e.target.dataset && (e.target.dataset.action === 'dec' || e.target.dataset.action === 'inc')) return;
          loadout.setSecondary(id);
          this.populateArmoryUI();
          this.audio.playUI('select');
        };
        const decBtn = div.querySelector('[data-action="dec"]');
        const incBtn = div.querySelector('[data-action="inc"]');
        if (decBtn) {
          decBtn.onclick = (e) => {
            e.stopPropagation();
            loadout.ammo[id] = Math.max(0, (loadout.ammo[id] || 0) - 1);
            this.populateArmoryUI();
            this.audio.playUI('click');
          };
        }
        if (incBtn) {
          incBtn.onclick = (e) => {
            e.stopPropagation();
            loadout.ammo[id] = Math.min(item.maxAmmo, (loadout.ammo[id] || 0) + 1);
            this.populateArmoryUI();
            this.audio.playUI('click');
          };
        }
        secContainer.appendChild(div);
      });
    }

    // 3. Suit Hardware & Inventory
    const gearContainer = document.getElementById('armory-gear-list');
    if (gearContainer) {
      gearContainer.innerHTML = '';

      // Autofire Module
      const autofireDiv = document.createElement('div');
      autofireDiv.className = `item-option ${loadout.hasAutofire ? 'active' : ''}`;
      autofireDiv.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: ${loadout.hasAutofire ? 'var(--term-cyan)' : '#e0eef7'};">Neurolink Autofire</strong>
            <span style="font-size: 10px; color: ${loadout.hasAutofire ? 'var(--term-cyan)' : '#6f8fa4'}; font-weight: bold; border: 1px solid ${loadout.hasAutofire ? 'var(--term-cyan)' : '#345'}; padding: 1px 6px; border-radius: 2px;">
              ${loadout.hasAutofire ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <small style="color: #92a9ba; font-size: 10px; line-height: 1.25; display: block; margin-top: 3px;">
            Neural sync allowing continuous automatic PPC fire while trigger is depressed.
          </small>
        </div>
      `;
      autofireDiv.onclick = () => {
        loadout.hasAutofire = !loadout.hasAutofire;
        this.populateArmoryUI();
        this.audio.playUI('click');
      };
      gearContainer.appendChild(autofireDiv);

      // Armor Plates
      const platesCount = loadout.armorPlatesCount || 0;
      const platesDiv = document.createElement('div');
      platesDiv.className = `item-option ${platesCount > 0 ? 'active' : ''}`;
      platesDiv.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: ${platesCount > 0 ? 'var(--term-cyan)' : '#e0eef7'};">Boron-Carbide Armor</strong>
            <span style="font-size: 10px; color: #a0d4e6; font-weight: bold;">
              +${platesCount * 40} ARMOR
            </span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; background: #060e16; padding: 4px 8px; border: 1px solid #162a3d; border-radius: 2px; margin-top: 6px;">
            <span style="font-size: 11px; color: #a0d4e6;">PLATES: <strong>${platesCount} / 5</strong></span>
            <div style="display: flex; gap: 4px;">
              <button class="term-btn mini" data-action="dec">-</button>
              <button class="term-btn mini" data-action="inc">+</button>
            </div>
          </div>
        </div>
      `;
      const decPlate = platesDiv.querySelector('[data-action="dec"]');
      const incPlate = platesDiv.querySelector('[data-action="inc"]');
      if (decPlate) {
        decPlate.onclick = (e) => {
          e.stopPropagation();
          loadout.armorPlatesCount = Math.max(0, (loadout.armorPlatesCount || 0) - 1);
          this.populateArmoryUI();
          this.audio.playUI('click');
        };
      }
      if (incPlate) {
        incPlate.onclick = (e) => {
          e.stopPropagation();
          loadout.armorPlatesCount = Math.min(5, (loadout.armorPlatesCount || 0) + 1);
          this.populateArmoryUI();
          this.audio.playUI('click');
        };
      }
      gearContainer.appendChild(platesDiv);

      // Medpack Counter in Inventory
      let medCount = 0;
      loadout.inventory.forEach(s => { if (s && s.id === 'medpack') medCount += (s.count || 1); });
      const medDiv = document.createElement('div');
      medDiv.className = `item-option ${medCount > 0 ? 'active' : ''}`;
      medDiv.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: ${medCount > 0 ? 'var(--term-cyan)' : '#e0eef7'};">Autodoc Medpacks</strong>
            <span style="font-size: 10px; color: #a0d4e6; font-weight: bold;">
              SLOTS 1-5
            </span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; background: #060e16; padding: 4px 8px; border: 1px solid #162a3d; border-radius: 2px; margin-top: 6px;">
            <span style="font-size: 11px; color: #a0d4e6;">MEDPACKS: <strong>${medCount} / 4</strong></span>
            <div style="display: flex; gap: 4px;">
              <button class="term-btn mini" data-action="dec">-</button>
              <button class="term-btn mini" data-action="inc">+</button>
            </div>
          </div>
        </div>
      `;
      const decMed = medDiv.querySelector('[data-action="dec"]');
      const incMed = medDiv.querySelector('[data-action="inc"]');
      if (decMed) {
        decMed.onclick = (e) => {
          e.stopPropagation();
          loadout.removeItem('medpack', 1);
          this.populateArmoryUI();
          this.audio.playUI('click');
        };
      }
      if (incMed) {
        incMed.onclick = (e) => {
          e.stopPropagation();
          if (medCount < 4) {
            loadout.addItemToFirstEmptySlot('medpack', 1);
          }
          this.populateArmoryUI();
          this.audio.playUI('click');
        };
      }
      gearContainer.appendChild(medDiv);

      // Mission Special Items Display
      const specialItems = [];
      loadout.inventory.forEach(s => {
        if (s && s.id !== 'medpack' && s.id !== 'mine') {
          specialItems.push(WEAPON_REGISTRY[s.id] ? WEAPON_REGISTRY[s.id].name : s.id);
        }
      });
      if (specialItems.length > 0) {
        const specDiv = document.createElement('div');
        specDiv.className = 'item-option';
        specDiv.innerHTML = `
          <div>
            <strong style="color: var(--term-amber); font-size: 11px;">MISSION EQUIPMENT:</strong><br>
            <span style="font-size: 10px; color: #bde;">${specialItems.join(', ')}</span>
          </div>
        `;
        gearContainer.appendChild(specDiv);
      }
    }
  }

  showSettings() {
    this.populateSettingsUI();
    this.showModal('settings-screen');
  }

  populateSettingsUI() {
    const s = this.config.settings;

    // Controls Mode radio / select
    const modeSelect = document.getElementById('setting-control-mode');
    if (modeSelect) {
      modeSelect.value = s.controlMode;
      modeSelect.onchange = (e) => {
        s.controlMode = e.target.value;
        s.mouseLook = (s.controlMode === 'modern');
        this.config.save();
      };
    }

    // Mouse Sensitivity slider
    const sensSlider = document.getElementById('setting-mouse-sens');
    const sensVal = document.getElementById('setting-sens-val');
    if (sensSlider && sensVal) {
      sensSlider.value = s.mouseSensitivity;
      sensVal.textContent = parseFloat(s.mouseSensitivity).toFixed(1);
      sensSlider.oninput = (e) => {
        s.mouseSensitivity = parseFloat(e.target.value);
        sensVal.textContent = s.mouseSensitivity.toFixed(1);
        this.config.save();
      };
    }

    // Invert Y checkbox
    const invertY = document.getElementById('setting-invert-y');
    if (invertY) {
      invertY.checked = s.invertY;
      invertY.onchange = (e) => {
        s.invertY = e.target.checked;
        this.config.save();
      };
    }

    // Graphics Resolution Mode
    const gfxSelect = document.getElementById('setting-graphics-mode');
    if (gfxSelect) {
      gfxSelect.value = s.graphicsMode || 'vga';
      gfxSelect.onchange = (e) => {
        s.graphicsMode = e.target.value;
        this.updateRendererResolution();
        this.config.save();
      };
    }

    // 8-Bit Color Dithering toggle
    const ditherToggle = document.getElementById('setting-dither-toggle');
    if (ditherToggle) {
      ditherToggle.checked = s.dithering8bit !== false;
      ditherToggle.onchange = (e) => {
        s.dithering8bit = e.target.checked;
        this.config.save();
      };
    }

    // Voxel Debris Physics toggle
    const debrisToggle = document.getElementById('setting-voxel-debris-toggle');
    if (debrisToggle) {
      debrisToggle.checked = s.voxelDebris !== false;
      debrisToggle.onchange = (e) => {
        s.voxelDebris = e.target.checked;
        this.config.save();
      };
    }

    // CRT Scanlines toggle
    const crtToggle = document.getElementById('setting-crt-toggle');
    if (crtToggle) {
      crtToggle.checked = s.crtScanlines;
      crtToggle.onchange = (e) => {
        s.crtScanlines = e.target.checked;
        document.body.classList.toggle('no-crt', !s.crtScanlines);
        this.config.save();
      };
    }

    // FOV slider
    const fovSlider = document.getElementById('setting-fov');
    const fovVal = document.getElementById('setting-fov-val');
    if (fovSlider && fovVal) {
      fovSlider.value = s.fov;
      fovVal.textContent = s.fov;
      fovSlider.oninput = (e) => {
        s.fov = parseInt(e.target.value, 10);
        fovVal.textContent = s.fov;
        if (this.camera) {
          this.camera.fov = s.fov;
          this.camera.updateProjectionMatrix();
        }
        this.config.save();
      };
    }

    // Audio volume sliders
    ['master', 'music', 'sfx'].forEach(type => {
      const slider = document.getElementById(`setting-vol-${type}`);
      if (slider) {
        slider.value = s.volumes[type];
        slider.oninput = (e) => {
          const val = parseFloat(e.target.value);
          s.volumes[type] = val;
          this.audio.setVolume(type, val);
          this.config.save();
        };
      }
    });

    // Populate Keybindings List
    this.populateKeybindButtons();
  }

  populateKeybindButtons() {
    const list = document.getElementById('keybinds-list');
    if (!list) return;
    list.innerHTML = '';

    const actions = [
      { id: 'forward', label: 'Move Forward (W)' },
      { id: 'backward', label: 'Move Backward (S)' },
      { id: 'strafeLeft', label: 'Lateral Strafe Left (A)' },
      { id: 'strafeRight', label: 'Lateral Strafe Right (D)' },
      { id: 'firePrimary', label: 'Fire Primary PPC (L-Click)' },
      { id: 'fireSecondary', label: 'Fire Secondary (R-Click)' },
      { id: 'interact', label: 'Interact / Operate (E)' },
      { id: 'cycleWeapon', label: 'Cycle Weapon (R)' }
    ];

    actions.forEach(act => {
      const row = document.createElement('div');
      row.className = 'setting-row';

      const currentKey = this.config.settings.keybindings[act.id];
      const keyText = this.config.getKeyDisplayName(currentKey);

      row.innerHTML = `
        <span class="setting-label">${act.label}</span>
        <button class="key-bind-btn" data-action="${act.id}">${keyText}</button>
      `;

      const btn = row.querySelector('.key-bind-btn');
      if (btn) btn.onclick = () => this.startKeyRebind(act.id, btn);

      list.appendChild(row);
    });
  }

  startKeyRebind(action, btn) {
    this.pendingKeyRebind = { action, btn };
    btn.textContent = 'PRESS KEY...';
    btn.classList.add('waiting');
  }

  finishKeyRebind(code) {
    if (!this.pendingKeyRebind) return;
    const { action, btn } = this.pendingKeyRebind;
    this.config.setBinding(action, code);
    btn.textContent = this.config.getKeyDisplayName(code);
    btn.classList.remove('waiting');
    this.pendingKeyRebind = null;
    this.audio.playUI('click');
  }

  showIntel() {
    this.showModal('intel-screen');
  }

  pauseGame() {
    this.state = 'PAUSED';
    this.showModal('pause-screen');
    if (document.exitPointerLock) document.exitPointerLock();
  }

  resumeGame() {
    this.state = 'PLAYING';
    this.hideModals();
    if (this.config.settings.mouseLook) {
      this.canvas.requestPointerLock();
    }
  }

  // =========================================================================
  // MISSION LOAD & WORLD BUILDER
  // =========================================================================

  startMission(missionId) {
    this.currentMissionId = missionId;
    this.currentMission = JSON.parse(JSON.stringify(MISSIONS_DATA[missionId]));
    this.currentMission.timeRemaining = this.currentMission.timeLimit;
    this.state = 'PLAYING';

    if (this.lastMissionLoadoutPresetId !== missionId) {
      this.player.loadout.applyMissionPreset(missionId);
      this.lastMissionLoadoutPresetId = missionId;
    }

    this.hideModals();
    this.audio.playTrack('combat');

    // Build 3D World for Mission
    this.buildMissionWorld(this.currentMission);

    // Reset player position & vitals
    this.resetPlayer();

    // Lock cursor if mouseLook is enabled
    if (this.config.settings.mouseLook) {
      this.canvas.requestPointerLock();
    }

    this.hud.addCommMessage('REBEL COMMAND', `Mission initiated: ${this.currentMission.title}`, 'warn');
  }

  resetPlayer() {
    const start = this.currentMission.playerStart || { x: 10, y: 10 };
    this.player.position.set(start.x * 2, 0, start.y * 2);
    this.yawObject.position.copy(this.player.position);
    this.yawObject.position.y = this.player.height;
    // Face positive Z towards the battlefield objectives
    this.yawObject.rotation.set(0, Math.PI, 0);
    this.pitchObject.rotation.set(0, 0, 0);
    this.player.velocity.set(0, 0, 0);

    const bonusArmor = (this.player.loadout.armorPlatesCount || 0) * 40;
    this.player.maxArmorFront = 100 + bonusArmor;
    this.player.armorFront = this.player.maxArmorFront;
    this.player.maxArmorRear = 100 + bonusArmor;
    this.player.armorRear = this.player.maxArmorRear;
    this.player.shield = this.player.maxShield;
    this.player.heat = 0;
    this.player.isOverheated = false;
    this.player.isAlive = true;

    // Attach weapon viewmodel to camera
    this.updateWeaponViewModel();

    // Ensure skyline visibility matches mission environment
    if (this.skylineBackdrop) {
      this.skylineBackdrop.visible = (this.currentMission.environment !== 'bunker' && this.currentMission.environment !== 'core' && this.currentMission.environment !== 'vault');
    }
  }

  updateWeaponViewModel() {
    if (this.weaponViewModel) {
      this.camera.remove(this.weaponViewModel);
    }
    this.weaponViewModel = ModelFactory.createWeaponViewModel(this.player.loadout.primaryWeapon);
    this.camera.add(this.weaponViewModel);
  }

  buildMissionWorld(mission) {
    this.titleShowcase = null;
    ModelFactory.initMaterials();

    // Clear old entities
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    this.colliders = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.interactiveObjects = [];
    this.missionTriggers = [];

    // Set clear color and atmospheric fog (bright visibility, not pitch black)
    this.renderer.setClearColor(0x121c29);
    this.scene.fog = new THREE.FogExp2(0x142132, 0.0035);

    // 1992 Authentic Bitmap Skyline Backdrop of Ruined Los Angeles
    this.skylineBackdrop = ModelFactory.createSkylineBackdrop(280, 160);
    this.scene.add(this.skylineBackdrop);

    // Bright daylight/twilight post-apocalyptic illumination
    const hemiLight = new THREE.HemisphereLight(0x99ccff, 0x443a32, 1.35);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xddeeff, 1.25);
    dirLight.position.set(60, 90, 40);
    this.scene.add(dirLight);

    const fireLight = new THREE.DirectionalLight(0xff6633, 0.65);
    fireLight.position.set(-60, 30, -50);
    this.scene.add(fireLight);

    this.scene.add(this.yawObject);

    // Ground Plane with textured road and pavement
    const groundGeo = new THREE.PlaneGeometry(800, 800);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = (mission.environment === 'bunker' || mission.environment === 'core' || mission.environment === 'vault')
      ? (ModelFactory.materials.bunkerFloor || ModelFactory.materials.concrete)
      : ModelFactory.materials.concrete;
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(250, 0, 250);
    this.scene.add(ground);

    // Boundary walls around sector
    this.buildPerimeterWalls(500, 520);

    // Build specific mission geometry & objectives
    if (mission.id === 'training') {
      this.buildTrainingSector();
    } else if (mission.id === 1) {
      this.buildMission1Sector();
    } else if (mission.id === 2) {
      this.buildMission2Sector();
    } else if (mission.id === 3) {
      this.buildMission3Sector();
    } else if (mission.id === 4) {
      this.buildMission4Sector();
    } else if (mission.id === 5) {
      this.buildMission5Sector();
    } else if (mission.id === 6) {
      this.buildMission6Sector();
    } else if (mission.id === 7) {
      this.buildMission7Sector();
    } else if (mission.id === 8) {
      this.buildMission8Sector();
    }

    // Always add extraction pad
    const extCoord = mission.extractionCoord || { x: 25, y: 2 };
    const extraction = ModelFactory.createExtractionPad();
    extraction.position.set(extCoord.x * 2, 0, extCoord.y * 2);
    this.scene.add(extraction);

    const extTrigger = {
      type: 'extraction',
      mesh: extraction,
      radius: 6.0,
      coord: extCoord
    };
    this.missionTriggers.push(extTrigger);

    this.interactiveObjects.push({
      mesh: extraction,
      type: 'extraction',
      isExtraction: true,
      interactDist: 6.0,
      prompt: () => {
        if (this.arePrimaryObjectivesComplete()) {
          return '[E] BOARD EXTRACTION TRANSPORT - COMPLETE MISSION';
        } else {
          return 'EXTRACTION LOCKED: PRIMARY OBJECTIVES INCOMPLETE';
        }
      },
      onInteract: () => {
        if (this.arePrimaryObjectivesComplete()) {
          const extObj = this.currentMission.objectives.find(o => this.isExtractionObjective(o));
          if (extObj) extObj.done = true;
          this.missionVictory();
        } else {
          const remaining = this.getIncompleteObjectiveSummary();
          this.hud.addCommMessage('REBEL COMMAND', `EXTRACTION LOCKED: Complete remaining objectives: ${remaining}`, 'warn');
          this.audio.playAlarm();
        }
      }
    });
  }

  buildPerimeterWalls(width, depth) {
    const wallMat = ModelFactory.materials.darkMetal;
    const h = 20;

    // North Wall with fortified security gateway and transporter
    const gateWidth = 12;
    const nLeftW = (width - gateWidth) / 2;
    const nLeft = new THREE.Mesh(new THREE.BoxGeometry(nLeftW, h, 2), wallMat);
    nLeft.position.set(nLeftW / 2, h / 2, 0);
    this.scene.add(nLeft);
    this.colliders.push({ box: new THREE.Box3().setFromObject(nLeft) });

    const nRight = new THREE.Mesh(new THREE.BoxGeometry(nLeftW, h, 2), wallMat);
    nRight.position.set(width - nLeftW / 2, h / 2, 0);
    this.scene.add(nRight);
    this.colliders.push({ box: new THREE.Box3().setFromObject(nRight) });

    const nLintel = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, h - 6, 2), wallMat);
    nLintel.position.set(width / 2, 6 + (h - 6) / 2, 0);
    this.scene.add(nLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(nLintel) });

    const northGate = ModelFactory.createBlastDoor('NORTH GATE');
    northGate.position.set(width / 2, 0, 0);
    this.scene.add(northGate);

    // North Sector Transporter Pad
    const northTransporter = ModelFactory.createTransporterPad('NORTH SECTOR TRANSPORTER');
    northTransporter.position.set(width / 2, 0, 4.0);
    this.scene.add(northTransporter);
    this.interactiveObjects.push({
      mesh: northTransporter,
      type: 'transporter',
      interactDist: 6.0,
      prompt: '[E] USE NORTH SECTOR TRANSPORTER',
      onInteract: () => {
        this.audio.playElevator();
        this.hud.addCommMessage('SUIT AI', 'Perimeter energy shield active. Transporter online.', 'normal');
      }
    });

    const southWall = new THREE.Mesh(new THREE.BoxGeometry(width, h, 2), wallMat);
    southWall.position.set(width / 2, h / 2, depth);
    this.scene.add(southWall);
    this.colliders.push({ box: new THREE.Box3().setFromObject(southWall) });

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(2, h, depth), wallMat);
    westWall.position.set(0, h / 2, depth / 2);
    this.scene.add(westWall);
    this.colliders.push({ box: new THREE.Box3().setFromObject(westWall) });

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(2, h, depth), wallMat);
    eastWall.position.set(width, h / 2, depth / 2);
    this.scene.add(eastWall);
    this.colliders.push({ box: new THREE.Box3().setFromObject(eastWall) });
  }

  transitionPlayerToArea(coord, targetYaw = 0, message = 'Sector transition complete.', isInterior = false) {
    this.audio.playElevator();

    this.player.position.set(coord.x * 2, 0, coord.y * 2);
    this.yawObject.position.copy(this.player.position);
    this.yawObject.position.y = this.player.height;
    this.yawObject.rotation.y = targetYaw;
    this.pitchObject.rotation.x = 0;
    this.player.velocity.set(0, 0, 0);

    if (isInterior) {
      if (this.skylineBackdrop) this.skylineBackdrop.visible = false;
      this.renderer.setClearColor(0x070b10);
      this.scene.fog = new THREE.FogExp2(0x091420, 0.009);
    } else {
      if (this.skylineBackdrop) this.skylineBackdrop.visible = true;
      this.renderer.setClearColor(0x121c29);
      this.scene.fog = new THREE.FogExp2(0x142132, 0.0035);
    }

    if (message) {
      this.hud.addCommMessage('SUIT AI', message, 'success');
    }
  }

  buildBunkerRoom({ minX, maxX, minZ, maxZ, wallHeight = 8, wallMat, floorMat, ceilingLight = true, doorWall = 'north', doorWidth = 6.0, doorLabel = 'BUNKER' }) {
    const minWx = minX * 2;
    const maxWx = maxX * 2;
    const minWz = minZ * 2;
    const maxWz = maxZ * 2;
    const width = maxWx - minWx;
    const depth = maxWz - minWz;
    const cx = (minWx + maxWx) / 2;
    const cz = (minWz + maxWz) / 2;

    const wallMaterial = wallMat || ModelFactory.materials.darkMetal;
    const floorMaterial = floorMat || ModelFactory.materials.concrete;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.position.set(cx, 0.05, cz);
    this.scene.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(width, depth);
    ceilGeo.rotateX(Math.PI / 2);
    const ceil = new THREE.Mesh(ceilGeo, wallMaterial);
    ceil.position.set(cx, wallHeight, cz);
    this.scene.add(ceil);

    // 4 Walls with Box3 colliders & physical doorway opening
    const wallThick = 2.0;
    const doorH = 4.5;
    const lintelH = wallHeight - doorH;

    // North wall (min Z)
    if (doorWall === 'north') {
      const leftW = (width - doorWidth) / 2;
      const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(leftW, wallHeight, wallThick), wallMaterial);
      leftMesh.position.set(cx - width / 2 + leftW / 2, wallHeight / 2, minWz - wallThick / 2);
      this.scene.add(leftMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(leftMesh) });

      const rightW = (width - doorWidth) / 2;
      const rightMesh = new THREE.Mesh(new THREE.BoxGeometry(rightW, wallHeight, wallThick), wallMaterial);
      rightMesh.position.set(cx + width / 2 - rightW / 2, wallHeight / 2, minWz - wallThick / 2);
      this.scene.add(rightMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(rightMesh) });

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, wallThick), wallMaterial);
      lintel.position.set(cx, doorH + lintelH / 2, minWz - wallThick / 2);
      this.scene.add(lintel);
      this.colliders.push({ box: new THREE.Box3().setFromObject(lintel) });
    } else {
      const nWall = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, wallThick), wallMaterial);
      nWall.position.set(cx, wallHeight / 2, minWz - wallThick / 2);
      this.scene.add(nWall);
      this.colliders.push({ box: new THREE.Box3().setFromObject(nWall) });
    }

    // South wall (max Z)
    if (doorWall === 'south') {
      const leftW = (width - doorWidth) / 2;
      const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(leftW, wallHeight, wallThick), wallMaterial);
      leftMesh.position.set(cx - width / 2 + leftW / 2, wallHeight / 2, maxWz + wallThick / 2);
      this.scene.add(leftMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(leftMesh) });

      const rightW = (width - doorWidth) / 2;
      const rightMesh = new THREE.Mesh(new THREE.BoxGeometry(rightW, wallHeight, wallThick), wallMaterial);
      rightMesh.position.set(cx + width / 2 - rightW / 2, wallHeight / 2, maxWz + wallThick / 2);
      this.scene.add(rightMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(rightMesh) });

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, wallThick), wallMaterial);
      lintel.position.set(cx, doorH + lintelH / 2, maxWz + wallThick / 2);
      this.scene.add(lintel);
      this.colliders.push({ box: new THREE.Box3().setFromObject(lintel) });
    } else {
      const sWall = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, wallThick), wallMaterial);
      sWall.position.set(cx, wallHeight / 2, maxWz + wallThick / 2);
      this.scene.add(sWall);
      this.colliders.push({ box: new THREE.Box3().setFromObject(sWall) });
    }

    // West wall (min X)
    const wWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, depth + wallThick * 2), wallMaterial);
    wWall.position.set(minWx - wallThick / 2, wallHeight / 2, cz);
    this.scene.add(wWall);
    this.colliders.push({ box: new THREE.Box3().setFromObject(wWall) });

    // East wall (max X)
    const eWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, depth + wallThick * 2), wallMaterial);
    eWall.position.set(maxWx + wallThick / 2, wallHeight / 2, cz);
    this.scene.add(eWall);
    this.colliders.push({ box: new THREE.Box3().setFromObject(eWall) });

    // Interior point light
    if (ceilingLight) {
      const light = new THREE.PointLight(0x00e5ff, 1.4, 60);
      light.position.set(cx, wallHeight - 1.5, cz);
      this.scene.add(light);
    }
  }

  addSectorBarrier({ x, z, span = 20, orientation = 'x', height = 8, label = 'SECTOR GATE', targetCoord = null, targetMessage = '', isInterior = false }) {
    const wallMat = ModelFactory.materials.darkMetal;
    const doorW = 6.0;
    const halfSpan = span / 2;
    const sideW = (span - doorW) / 2;
    const lintelH = height - 4.5;
    const wallThick = 2.0;

    if (orientation === 'x') {
      const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(sideW, height, wallThick), wallMat);
      leftMesh.position.set(x - halfSpan + sideW / 2, height / 2, z);
      this.scene.add(leftMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(leftMesh) });

      const rightMesh = new THREE.Mesh(new THREE.BoxGeometry(sideW, height, wallThick), wallMat);
      rightMesh.position.set(x + halfSpan - sideW / 2, height / 2, z);
      this.scene.add(rightMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(rightMesh) });

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallThick), wallMat);
      lintel.position.set(x, 4.5 + lintelH / 2, z);
      this.scene.add(lintel);
      this.colliders.push({ box: new THREE.Box3().setFromObject(lintel) });
    } else {
      const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, sideW), wallMat);
      leftMesh.position.set(x, height / 2, z - halfSpan + sideW / 2);
      this.scene.add(leftMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(leftMesh) });

      const rightMesh = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, sideW), wallMat);
      rightMesh.position.set(x, height / 2, z + halfSpan - sideW / 2);
      this.scene.add(rightMesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(rightMesh) });

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(wallThick, lintelH, doorW), wallMat);
      lintel.position.set(x, 4.5 + lintelH / 2, z);
      this.scene.add(lintel);
      this.colliders.push({ box: new THREE.Box3().setFromObject(lintel) });
    }

    const door = ModelFactory.createBlastDoor(label);
    door.position.set(x, 0, z);
    if (orientation === 'z') door.rotation.y = Math.PI / 2;
    this.scene.add(door);

    const pad = ModelFactory.createTransporterPad(label + ' TRANSPORTER');
    const padOffset = orientation === 'x' ? { x: 0, z: 3.5 } : { x: 3.5, z: 0 };
    pad.position.set(x + padOffset.x, 0, z + padOffset.z);
    this.scene.add(pad);

    if (targetCoord) {
      this.interactiveObjects.push({
        mesh: pad,
        type: 'transporter',
        interactDist: 7.0,
        prompt: `[E] USE ${label.toUpperCase()} TRANSPORTER`,
        onInteract: () => {
          this.transitionPlayerToArea(targetCoord, 0, targetMessage || `${label} transition complete.`, isInterior);
        }
      });
    }

    return { door, pad };
  }

  addExtractionTransporter(coord) {
    const pad = ModelFactory.createTransporterPad('EXTRACTION TRANSPORTER');
    pad.position.set(coord.x * 2, 0, coord.y * 2);
    this.scene.add(pad);
    this.interactiveObjects.push({
      mesh: pad,
      type: 'transporter',
      interactDist: 7.0,
      prompt: `[E] EVACUATE VIA EXTRACTION TRANSPORTER [${coord.x}, ${coord.y}]`,
      onInteract: () => {
        const remaining = (this.currentMission && this.currentMission.objectives)
          ? this.currentMission.objectives.filter(o => !o.done && o.id !== 'extract' && o.id !== 'extract_elevator' && o.id !== 'escape_shuttle')
          : [];

        if (remaining.length > 0) {
          const names = remaining.map(o => o.text).join('; ');
          this.hud.addCommMessage('SUIT AI', `CANNOT EXTRACT - Unfinished orders: ${names}`, 'warn');
          return;
        }

        const extractObj = this.currentMission.objectives.find(o => o.id === 'extract' || o.id === 'extract_elevator' || o.id === 'escape_shuttle');
        if (extractObj) extractObj.done = true;

        this.audio.playElevator();
        this.hud.addCommMessage('JOHN CONNOR', 'Transporter lock established! Evacuation sequence complete!', 'success');
        this.missionVictory();
      }
    });
    return pad;
  }

  // MISSION 1: Relay Station [15, 16], Underground Lab [25, 48], Telemetry [82, 64]
  buildMission1Sector() {
    // Ruined buildings
    const buildingPositions = [
      { x: 30, z: 30, w: 20, d: 24, h: 40 },
      { x: 70, z: 20, w: 18, d: 18, h: 32 },
      { x: 10, z: 70, w: 22, d: 16, h: 28 },
      { x: 60, z: 80, w: 25, d: 25, h: 45 },
      { x: 100, z: 50, w: 20, d: 30, h: 36 }
    ];

    buildingPositions.forEach(b => {
      const mesh = ModelFactory.createRuinBuilding(b.w, b.h, b.d);
      mesh.position.set(b.x * 2, 0, b.z * 2);
      this.scene.add(mesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(mesh) });
    });

    // 1. Relay Station at [15, 16] - Objective: protect_relay
    const relay = ModelFactory.createRelayTower();
    relay.position.set(15 * 2, 0, 16 * 2);
    this.scene.add(relay);

    // Interactive console on Relay Station
    this.interactiveObjects.push({
      mesh: relay,
      type: 'relay',
      interactDist: 7.0,
      prompt: '[E] SECURE RELAY STATION [15, 16]',
      onInteract: () => {
        const obj = this.currentMission.objectives.find(o => o.id === 'protect_relay');
        if (obj && !obj.done) {
          this.completeObjective('protect_relay');
          this.hud.addCommMessage('RELAY AI', 'Forward Relay Station secured! Skynet signals jammed.', 'success');
          this.hud.addCommMessage('JOHN CONNOR', 'Relay is safe! Now infiltrate Underground Lab at [25, 48].', 'normal');
        } else {
          this.hud.addCommMessage('RELAY AI', 'Relay Station online and transmitting telemetry.', 'normal');
        }
      }
    });

    // Proximity trigger around Relay Station [15, 16]
    this.missionTriggers.push({
      type: 'area',
      mesh: relay,
      radius: 14.0,
      onEnter: () => {
        const obj = this.currentMission.objectives.find(o => o.id === 'protect_relay');
        if (obj && !obj.done) {
          this.completeObjective('protect_relay');
          this.hud.addCommMessage('RELAY AI', 'Forward Relay Station secured! Machine assault repelled.', 'success');
          this.hud.addCommMessage('JOHN CONNOR', 'Relay is safe! Now infiltrate Underground Lab at [25, 48].', 'normal');
        }
      }
    });

    // 2. Underground Lab Entrance at [25, 48] on Surface - Objective: enter_lab
    const labWallMat = ModelFactory.materials.darkMetal;
    const labWallL = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), labWallMat);
    labWallL.position.set(25 * 2 - 7, 4, 48 * 2);
    this.scene.add(labWallL);
    this.colliders.push({ box: new THREE.Box3().setFromObject(labWallL) });

    const labWallR = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), labWallMat);
    labWallR.position.set(25 * 2 + 7, 4, 48 * 2);
    this.scene.add(labWallR);
    this.colliders.push({ box: new THREE.Box3().setFromObject(labWallR) });

    const labLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), labWallMat);
    labLintel.position.set(25 * 2, 4.5 + 1.75, 48 * 2);
    this.scene.add(labLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(labLintel) });

    const labDoor = ModelFactory.createBlastDoor('LAB');
    labDoor.position.set(25 * 2, 0, 48 * 2);
    this.scene.add(labDoor);
    this.interactiveObjects.push({
      mesh: labDoor,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] ENTER UNDERGROUND LAB [25, 48]',
      onInteract: () => {
        this.completeObjective('enter_lab');
        this.transitionPlayerToArea(
          { x: 80, y: 53 },
          0,
          'Access granted. Entering Subterranean Research Facility.',
          true
        );
      }
    });

    // Surface Lab Transporter Pad at [25, 47]
    const labTransporter = ModelFactory.createTransporterPad('LAB ENTRANCE TRANSPORTER');
    labTransporter.position.set(25 * 2, 0, 47 * 2);
    this.scene.add(labTransporter);
    this.interactiveObjects.push({
      mesh: labTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE LAB ENTRANCE TRANSPORTER [25, 48]',
      onInteract: () => {
        this.completeObjective('enter_lab');
        this.transitionPlayerToArea(
          { x: 80, y: 53 },
          0,
          'Transporter Lock Confirmed: Beaming into Subterranean Research Facility.',
          true
        );
      }
    });

    // Build Subterranean Lab Complex around [82, 64]
    this.buildBunkerRoom({
      minX: 74,
      maxX: 90,
      minZ: 50,
      maxZ: 76,
      wallHeight: 8,
      doorWall: 'north',
      doorWidth: 6.0,
      doorLabel: 'LAB'
    });

    // Subterranean Lab Exit Elevator back to Surface at [80, 51]
    const labExit = ModelFactory.createBlastDoor('SURFACE');
    labExit.position.set(80 * 2, 0, 51 * 2);
    this.scene.add(labExit);
    this.interactiveObjects.push({
      mesh: labExit,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR UP TO SURFACE RUINS',
      onInteract: () => {
        this.transitionPlayerToArea(
          { x: 25, y: 46 },
          Math.PI,
          'Ascending to Surface Ruins. Evacuate to Extraction [25, 2]!',
          false
        );
      }
    });

    // Subterranean Lab Exit Transporter Pad at [80, 52]
    const labExitTransporter = ModelFactory.createTransporterPad('SURFACE RETURN TRANSPORTER');
    labExitTransporter.position.set(80 * 2, 0, 52 * 2);
    this.scene.add(labExitTransporter);
    this.interactiveObjects.push({
      mesh: labExitTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE SURFACE RETURN TRANSPORTER',
      onInteract: () => {
        this.transitionPlayerToArea(
          { x: 25, y: 46 },
          Math.PI,
          'Transporter Lock Engaged: Beaming to Surface Ruins. Evacuate to Extraction [25, 2]!',
          false
        );
      }
    });

    // Extraction Transporter Pad at [25, 2]
    this.addExtractionTransporter({ x: 25, y: 2 });

    // 3. Telemetry Data at [82, 64] inside the underground lab - Objective: get_telemetry
    const telemetry = ModelFactory.createCommGrid();
    telemetry.position.set(82 * 2, 0, 64 * 2);
    this.scene.add(telemetry);
    this.interactiveObjects.push({
      mesh: telemetry,
      type: 'pickup',
      interactDist: 6.0,
      prompt: '[E] DOWNLOAD TELEMETRY DATA [82, 64]',
      onInteract: () => {
        this.completeObjective('get_telemetry');
        this.hud.addCommMessage('JOHN CONNOR', 'Telemetry data secured! Take the elevator at [80, 51] to the surface and extract at [25, 2]!', 'success');
        this.audio.playItemPickup();
      }
    });

    // Spawn Enemy Patrols (Surface + Subterranean Lab Garrison)
    this.spawnEnemy('t800', 16 * 2, 19 * 2);
    this.spawnEnemy('t800', 28 * 2, 45 * 2);
    this.spawnEnemy('g500', 50 * 2, 40 * 2);
    this.spawnEnemy('spider', 22 * 2, 28 * 2);
    this.spawnEnemy('hk_aerial', 25 * 2, 35 * 2);

    // Underground Lab interior guards
    this.spawnEnemy('turret', 85 * 2, 60 * 2);
    this.spawnEnemy('t800', 82 * 2, 70 * 2);
  }

  // MISSION 2: Relay Tower 1 [6, 109], Comm Grid [25, 111], Relay Tower 2 [44, 108]
  buildMission2Sector() {
    // Ruined buildings with colliders
    const buildingPositions = [
      { x: 15, z: 40, w: 20, d: 20, h: 35 },
      { x: 35, z: 40, w: 22, d: 18, h: 42 },
      { x: 10, z: 85, w: 18, d: 24, h: 30 },
      { x: 40, z: 85, w: 20, d: 20, h: 38 }
    ];
    buildingPositions.forEach(b => {
      const mesh = ModelFactory.createRuinBuilding(b.w, b.h, b.d);
      mesh.position.set(b.x * 2, 0, b.z * 2);
      this.scene.add(mesh);
      this.colliders.push({ box: new THREE.Box3().setFromObject(mesh) });
    });

    // Fortified Epsilon Sector Security Barrier Wall with Gate & Transporter at Z = 60
    this.addSectorBarrier({
      x: 25 * 2,
      z: 60 * 2,
      span: 80,
      orientation: 'x',
      height: 8,
      label: 'EPSILON SECTOR GATE',
      targetCoord: { x: 25, y: 70 },
      targetMessage: 'Epsilon Sector Transporter engaged. Infiltrating machine territory.'
    });

    // Extraction Transporter at [25, 1]
    this.addExtractionTransporter({ x: 25, y: 1 });

    // Relay Tower 1 at [6, 109]
    const tower1 = ModelFactory.createRelayTower();
    tower1.position.set(6 * 2, 0, 109 * 2);
    this.scene.add(tower1);
    this.interactiveObjects.push({
      mesh: tower1,
      type: 'demolish',
      prompt: '[E] PLANT PROXIMITY MINE ON TOWER 1',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('tower1');
          this.createExplosion(tower1.position, 2.0);
          this.scene.remove(tower1);
          this.hud.addCommMessage('REBEL COMMAND', 'Tower 1 demolished! Proceed to central Communications Grid.', 'warn');
        } else {
          this.player.heat = Math.min(100, this.player.heat + 40);
          this.completeObjective('tower1');
          this.createExplosion(tower1.position, 2.0);
          this.scene.remove(tower1);
          this.hud.addCommMessage('REBEL COMMAND', 'Tower 1 demolished via PPC overload! Proceed to central Communications Grid.', 'warn');
        }
      }
    });

    // Communications Grid at [25, 111]
    const commGrid = ModelFactory.createCommGrid();
    commGrid.position.set(25 * 2, 0, 111 * 2);
    this.scene.add(commGrid);
    this.interactiveObjects.push({
      mesh: commGrid,
      type: 'demolish',
      prompt: '[E] DEMOLISH COMMUNICATIONS GRID',
      onInteract: () => {
        this.completeObjective('comm_grid');
        this.createExplosion(commGrid.position, 2.5);
        this.scene.remove(commGrid);
        this.hud.addCommMessage('REBEL COMMAND', 'Communications Grid offline! Target Relay Tower 2.', 'success');
      }
    });

    // Relay Tower 2 at [44, 108]
    const tower2 = ModelFactory.createRelayTower();
    tower2.position.set(44 * 2, 0, 108 * 2);
    this.scene.add(tower2);
    this.interactiveObjects.push({
      mesh: tower2,
      type: 'demolish',
      prompt: '[E] PLANT PROXIMITY MINE ON TOWER 2',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('tower2');
          this.createExplosion(tower2.position, 2.0);
          this.scene.remove(tower2);
          this.hud.addCommMessage('JOHN CONNOR', 'Both relay towers destroyed! Get to the extraction point [25, 1]!', 'success');
        } else {
          this.player.heat = Math.min(100, this.player.heat + 40);
          this.completeObjective('tower2');
          this.createExplosion(tower2.position, 2.0);
          this.scene.remove(tower2);
          this.hud.addCommMessage('JOHN CONNOR', 'Both relay towers destroyed! Get to the extraction point [25, 1]!', 'success');
        }
      }
    });

    // Spawn Heavy Skynet forces
    this.spawnEnemy('hk_tank', 25 * 2, 90 * 2);
    this.spawnEnemy('t800', 10 * 2, 105 * 2);
    this.spawnEnemy('t800', 40 * 2, 105 * 2);
    this.spawnEnemy('hk_aerial', 30 * 2, 100 * 2);
  }

  // MISSION 3: Sgt. Hendrick [10, 41] (OMEGA-1), Underground [16, 47], Time Distortion Device [81, 25]
  buildMission3Sector() {
    // Sgt. Hendrick at [10, 41]
    const hendrick = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8), ModelFactory.materials.hazard);
    hendrick.position.set(10 * 2, 0.7, 41 * 2);
    this.scene.add(hendrick);
    this.interactiveObjects.push({
      mesh: hendrick,
      type: 'npc',
      prompt: '[E] TRANSMIT CODE "OMEGA-1" & ACTIVATE BEACON',
      onInteract: () => {
        this.completeObjective('rescue_hendrick');
        this.hud.addCommMessage('SGT. HENDRICK', '"Code OMEGA-1 confirmed! Skynet is testing temporal displacement in the sub-vault. Stop them!"', 'success');
        this.audio.playItemPickup();
      }
    });

    // Underground Entrance [16, 47] on Surface with Barrier Wall
    const entWallMat = ModelFactory.materials.darkMetal;
    const entWallL = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), entWallMat);
    entWallL.position.set(16 * 2 - 7, 4, 47 * 2);
    this.scene.add(entWallL);
    this.colliders.push({ box: new THREE.Box3().setFromObject(entWallL) });

    const entWallR = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), entWallMat);
    entWallR.position.set(16 * 2 + 7, 4, 47 * 2);
    this.scene.add(entWallR);
    this.colliders.push({ box: new THREE.Box3().setFromObject(entWallR) });

    const entLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), entWallMat);
    entLintel.position.set(16 * 2, 4.5 + 1.75, 47 * 2);
    this.scene.add(entLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(entLintel) });

    const entrance = ModelFactory.createBlastDoor('SEC-9');
    entrance.position.set(16 * 2, 0, 47 * 2);
    this.scene.add(entrance);
    this.interactiveObjects.push({
      mesh: entrance,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] INFILTRATE RESEARCH SUB-LEVEL',
      onInteract: () => {
        this.completeObjective('enter_complex');
        this.transitionPlayerToArea({ x: 16, y: 108 }, 0, 'Descent to Sub-Level 1 initiated.', true);
      }
    });

    const entTransporter = ModelFactory.createTransporterPad('SUB-LEVEL TRANSPORTER');
    entTransporter.position.set(16 * 2, 0, 46 * 2);
    this.scene.add(entTransporter);
    this.interactiveObjects.push({
      mesh: entTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE SUB-LEVEL TRANSPORTER [16, 47]',
      onInteract: () => {
        this.completeObjective('enter_complex');
        this.transitionPlayerToArea({ x: 16, y: 108 }, 0, 'Transporter lock engaged: Beaming to Sub-Level 1.', true);
      }
    });

    // Sub-Level 1 Room [10..22, 104..116]
    this.buildBunkerRoom({ minX: 10, maxX: 22, minZ: 104, maxZ: 116, wallHeight: 8, doorWall: 'north', doorLabel: 'L1' });

    // Exit elevator back to surface at [16, 106]
    const exitL1 = ModelFactory.createBlastDoor('SURFACE');
    exitL1.position.set(16 * 2, 0, 106 * 2);
    this.scene.add(exitL1);
    this.interactiveObjects.push({
      mesh: exitL1,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] ASCEND TO SURFACE RUINS',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 16, y: 45 }, Math.PI, 'Ascending to Surface Ruins.', false);
      }
    });

    // Level 2 Elevator at [16, 110]
    const elevL2 = ModelFactory.createBlastDoor('LEVEL-2');
    elevL2.position.set(16 * 2, 0, 110 * 2);
    this.scene.add(elevL2);
    this.interactiveObjects.push({
      mesh: elevL2,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR DOWN TO SUB-LEVEL 2',
      onInteract: () => {
        this.completeObjective('elevator_l2');
        this.transitionPlayerToArea({ x: 108, y: 65 }, 0, 'Descending to Sub-Level 2...', true);
      }
    });

    // Sub-Level 2 Room [102..114, 60..74]
    this.buildBunkerRoom({ minX: 102, maxX: 114, minZ: 60, maxZ: 74, wallHeight: 8, doorWall: 'north', doorLabel: 'L2' });

    // Elevator back up to Level 1 at [108, 63]
    const elevUpL1 = ModelFactory.createBlastDoor('LEVEL-1');
    elevUpL1.position.set(108 * 2, 0, 63 * 2);
    this.scene.add(elevUpL1);
    this.interactiveObjects.push({
      mesh: elevUpL1,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR UP TO SUB-LEVEL 1',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 16, y: 108 }, 0, 'Ascending to Sub-Level 1.', true);
      }
    });

    // Level 3 Elevator at [108, 67]
    const elevL3 = ModelFactory.createBlastDoor('LEVEL-3');
    elevL3.position.set(108 * 2, 0, 67 * 2);
    this.scene.add(elevL3);
    this.interactiveObjects.push({
      mesh: elevL3,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR DOWN TO LEVEL 3 (TEMPORAL VAULT)',
      onInteract: () => {
        this.completeObjective('elevator_l3');
        this.transitionPlayerToArea({ x: 81, y: 22 }, 0, 'Entering Sub-Level 3: Temporal Vault...', true);
      }
    });

    // Sub-Level 3 Room (Temporal Vault) [74..88, 18..32]
    this.buildBunkerRoom({ minX: 74, maxX: 88, minZ: 18, maxZ: 32, wallHeight: 8, doorWall: 'north', doorLabel: 'L3' });

    // Elevator back up to Level 2 at [81, 20]
    const elevUpL2 = ModelFactory.createBlastDoor('LEVEL-2');
    elevUpL2.position.set(81 * 2, 0, 20 * 2);
    this.scene.add(elevUpL2);
    this.interactiveObjects.push({
      mesh: elevUpL2,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR UP TO SUB-LEVEL 2',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 108, y: 65 }, 0, 'Ascending to Sub-Level 2.', true);
      }
    });

    // Time Distortion Device at [81, 25] inside Level 3
    const device = ModelFactory.createTimeDistortionDevice();
    device.position.set(81 * 2, 0, 25 * 2);
    this.scene.add(device);
    this.interactiveObjects.push({
      mesh: device,
      type: 'device',
      interactDist: 7.0,
      prompt: '[E] SCAN & SECURE TIME DISTORTION DEVICE',
      onInteract: () => {
        this.completeObjective('secure_device');
        this.hud.addCommMessage('JOHN CONNOR', 'Time Distortion Device secured! Chronal telemetry logged! Mission Accomplished!', 'success');
        this.audio.playItemPickup();
        setTimeout(() => this.missionVictory(), 1500);
      }
    });

    this.spawnEnemy('t800', 16 * 2, 55 * 2);
    this.spawnEnemy('t800', 50 * 2, 40 * 2);
    this.spawnEnemy('spider', 70 * 2, 30 * 2);
    this.spawnEnemy('t800', 80 * 2, 28 * 2);
  }

  // MISSION 4: Gates 1-8 blitz, code 38473-ENABLE at [25, 111], Defense Network [9, 168]
  buildMission4Sector() {
    const gates = [
      { id: 1, x: 40, y: 9 }, { id: 2, x: 25, y: 19 }, { id: 3, x: 45, y: 29 }, { id: 4, x: 25, y: 39 },
      { id: 5, x: 40, y: 63 }, { id: 6, x: 25, y: 72 }, { id: 7, x: 45, y: 82 }, { id: 8, x: 30, y: 92 }
    ];

    gates.forEach(g => {
      const gateWallMat = ModelFactory.materials.darkMetal;
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 2), gateWallMat);
      wallL.position.set(g.x * 2 - 8, 4, g.y * 2);
      this.scene.add(wallL);
      this.colliders.push({ box: new THREE.Box3().setFromObject(wallL) });

      const wallR = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 2), gateWallMat);
      wallR.position.set(g.x * 2 + 8, 4, g.y * 2);
      this.scene.add(wallR);
      this.colliders.push({ box: new THREE.Box3().setFromObject(wallR) });

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), gateWallMat);
      lintel.position.set(g.x * 2, 4.5 + 1.75, g.y * 2);
      this.scene.add(lintel);
      this.colliders.push({ box: new THREE.Box3().setFromObject(lintel) });

      const door = ModelFactory.createBlastDoor(`G-${g.id}`);
      door.position.set(g.x * 2, 0, g.y * 2);
      this.scene.add(door);
      const doorCollider = { box: new THREE.Box3().setFromObject(door), mesh: door, isDoor: true };
      this.colliders.push(doorCollider);

      // Gate Transporter Pad
      const gateTransporter = ModelFactory.createTransporterPad(`GATE ${g.id} TRANSPORTER`);
      gateTransporter.position.set(g.x * 2, 0, g.y * 2 - 3.5);
      this.scene.add(gateTransporter);
      this.interactiveObjects.push({
        mesh: gateTransporter,
        type: 'transporter',
        interactDist: 6.0,
        prompt: `[E] USE GATE ${g.id} TRANSPORTER`,
        onInteract: () => {
          this.transitionPlayerToArea({ x: g.x, y: g.y + 4 }, 0, `Gate ${g.id} Transporter: Beam bypass successful.`);
          this.audio.playElevator();
        }
      });

      this.interactiveObjects.push({
        mesh: door,
        type: 'door',
        prompt: `[E] BREACH GATE ${g.id}`,
        onInteract: () => {
          doorCollider.disabled = true;
          this.scene.remove(door);
          this.audio.playExplosion(0.8);
          if (g.id === 8) {
            this.completeObjective('breach_gates');
            this.hud.addCommMessage('SUIT AI', 'All perimeter gates breached! Rush to Underground [25, 111]!', 'warn');
          }
        }
      });
    });

    // Underground at [25, 111] with code 38473-ENABLE
    const bunker = ModelFactory.createBlastDoor('38473');
    bunker.position.set(25 * 2, 0, 111 * 2);
    this.scene.add(bunker);
    this.interactiveObjects.push({
      mesh: bunker,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] ENTER OVERRIDE CODE: 38473-ENABLE & ENTER VAULT',
      onInteract: () => {
        this.completeObjective('underground_code');
        this.transitionPlayerToArea({ x: 12, y: 160 }, 0, 'Code Accepted: 38473-ENABLE. Entering Defense Network Core Vault...', true);
      }
    });

    const vaultTransporter = ModelFactory.createTransporterPad('VAULT TRANSPORTER');
    vaultTransporter.position.set(25 * 2, 0, 110 * 2);
    this.scene.add(vaultTransporter);
    this.interactiveObjects.push({
      mesh: vaultTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE DEFENSE VAULT TRANSPORTER [25, 111]',
      onInteract: () => {
        this.completeObjective('underground_code');
        this.transitionPlayerToArea({ x: 12, y: 160 }, 0, 'Code Accepted: 38473-ENABLE. Beaming into Defense Network Core Vault...', true);
      }
    });

    // Subterranean Defense Vault [4..22, 154..176]
    this.buildBunkerRoom({ minX: 4, maxX: 22, minZ: 154, maxZ: 176, wallHeight: 8, doorWall: 'north', doorLabel: 'VAULT' });

    // Return Door to Perimeter Trench at [12, 158]
    const vaultExit = ModelFactory.createBlastDoor('SURFACE');
    vaultExit.position.set(12 * 2, 0, 158 * 2);
    this.scene.add(vaultExit);
    this.interactiveObjects.push({
      mesh: vaultExit,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] EXIT TO PERIMETER TRENCH',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 25, y: 109 }, Math.PI, 'Exiting to Perimeter Trench.', false);
      }
    });

    // Extraction Transporter at [25, 140]
    this.addExtractionTransporter({ x: 25, y: 140 });

    // Defense Network Core at [9, 168]
    const core = ModelFactory.createCommGrid();
    core.position.set(9 * 2, 0, 168 * 2);
    this.scene.add(core);
    this.interactiveObjects.push({
      mesh: core,
      type: 'demolish',
      interactDist: 7.0,
      prompt: '[E] DEMOLISH DEFENSE NETWORK CORE WITH MINE',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('destroy_defense');
          this.createExplosion(core.position, 3.0);
          this.scene.remove(core);
          this.hud.addCommMessage('JOHN CONNOR', 'Defense Network destroyed! Sprint to elevator [20, 168]!', 'success');
        } else {
          this.player.heat = Math.min(100, this.player.heat + 50);
          this.completeObjective('destroy_defense');
          this.createExplosion(core.position, 3.0);
          this.scene.remove(core);
          this.hud.addCommMessage('JOHN CONNOR', 'Defense Network overloaded via PPC! Sprint to elevator [20, 168]!', 'success');
        }
      }
    });

    // Extraction Elevator at [20, 168]
    const escapeElevator = ModelFactory.createBlastDoor('ESCAPE');
    escapeElevator.position.set(20 * 2, 0, 168 * 2);
    this.scene.add(escapeElevator);
    this.interactiveObjects.push({
      mesh: escapeElevator,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] ESCAPE VIA EXTRACTION ELEVATOR [25, 140]',
      onInteract: () => {
        const destObj = this.currentMission.objectives.find(o => o.id === 'destroy_defense');
        if (destObj && destObj.done) {
          this.completeObjective('extract_elevator');
          this.missionVictory();
        } else {
          this.hud.addCommMessage('SUIT AI', 'LOCKED: Demolish Defense Network Core first!', 'warn');
        }
      }
    });

    // Spawn turrets along gates
    gates.forEach(g => {
      this.spawnEnemy('turret', (g.x + 2) * 2, (g.y) * 2);
    });
  }

  // MISSION 5: Rescue Major Altorrez at [27, 85] (10-minute timer)
  buildMission5Sector() {
    // Comm Base Gamma Entrance [111, 48] on Surface with Barrier Wall
    const gamWallMat = ModelFactory.materials.darkMetal;
    const gamWallL = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), gamWallMat);
    gamWallL.position.set(111 * 2 - 7, 4, 48 * 2);
    this.scene.add(gamWallL);
    this.colliders.push({ box: new THREE.Box3().setFromObject(gamWallL) });

    const gamWallR = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), gamWallMat);
    gamWallR.position.set(111 * 2 + 7, 4, 48 * 2);
    this.scene.add(gamWallR);
    this.colliders.push({ box: new THREE.Box3().setFromObject(gamWallR) });

    const gamLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), gamWallMat);
    gamLintel.position.set(111 * 2, 4.5 + 1.75, 48 * 2);
    this.scene.add(gamLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(gamLintel) });

    const entrance = ModelFactory.createBlastDoor('GAMMA');
    entrance.position.set(111 * 2, 0, 48 * 2);
    this.scene.add(entrance);
    this.interactiveObjects.push({
      mesh: entrance,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] BREACH COMM BASE GAMMA & DESCEND',
      onInteract: () => {
        this.completeObjective('enter_gamma');
        this.transitionPlayerToArea({ x: 48, y: 46 }, 0, 'Entering Comm Base Gamma Sub-Level 1...', true);
      }
    });

    const gamTransporter = ModelFactory.createTransporterPad('GAMMA ENTRANCE TRANSPORTER');
    gamTransporter.position.set(111 * 2, 0, 47 * 2);
    this.scene.add(gamTransporter);
    this.interactiveObjects.push({
      mesh: gamTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE GAMMA ENTRANCE TRANSPORTER [111, 48]',
      onInteract: () => {
        this.completeObjective('enter_gamma');
        this.transitionPlayerToArea({ x: 48, y: 46 }, 0, 'Gamma Transporter engaged. Beaming to Sub-Level 1...', true);
      }
    });

    // Sub-Level 1 Room [42..54, 42..52]
    this.buildBunkerRoom({ minX: 42, maxX: 54, minZ: 42, maxZ: 52, wallHeight: 8, doorWall: 'north', doorLabel: 'GAMMA-L1' });

    // Exit back to surface at [48, 44]
    const exitL1 = ModelFactory.createBlastDoor('SURFACE');
    exitL1.position.set(48 * 2, 0, 44 * 2);
    this.scene.add(exitL1);
    this.interactiveObjects.push({
      mesh: exitL1,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] ASCEND TO SURFACE RUINS',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 111, y: 46 }, Math.PI, 'Ascending to Surface.', false);
      }
    });

    // Descent elevator at [48, 48]
    const elevDown = ModelFactory.createBlastDoor('LEVEL-2');
    elevDown.position.set(48 * 2, 0, 48 * 2);
    this.scene.add(elevDown);
    this.interactiveObjects.push({
      mesh: elevDown,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR DOWN TO LEVEL 2 [48, 48]',
      onInteract: () => {
        this.completeObjective('elevator_down');
        this.transitionPlayerToArea({ x: 35, y: 75 }, 0, 'Descending to Gamma Sub-Level 2... Major Altorrez vitals detected at [27, 85]!', true);
      }
    });

    // Level 2 Subterranean Chamber [20..42, 70..92]
    this.buildBunkerRoom({ minX: 20, maxX: 42, minZ: 70, maxZ: 92, wallHeight: 8, doorWall: 'north', doorLabel: 'GAMMA-L2' });

    // Extraction Transporter at [64, 1]
    this.addExtractionTransporter({ x: 64, y: 1 });

    // Return elevator to Level 1 at [35, 73]
    const elevUpL1 = ModelFactory.createBlastDoor('LEVEL-1');
    elevUpL1.position.set(35 * 2, 0, 73 * 2);
    this.scene.add(elevUpL1);
    this.interactiveObjects.push({
      mesh: elevUpL1,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ELEVATOR UP TO LEVEL 1',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 48, y: 46 }, 0, 'Ascending to Level 1.', true);
      }
    });

    // Major Altorrez at [27, 85]
    const altorrez = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8), ModelFactory.materials.hazard);
    altorrez.position.set(27 * 2, 0.7, 85 * 2);
    this.scene.add(altorrez);
    this.interactiveObjects.push({
      mesh: altorrez,
      type: 'npc',
      interactDist: 7.0,
      prompt: '[E] ADMINISTER AUTODOC MEDPACK TO MAJOR ALTORREZ',
      onInteract: () => {
        if (this.player.loadout.hasItem('medpack')) {
          this.player.loadout.removeItem('medpack', 1);
          this.completeObjective('rescue_altorrez');
          this.hud.addCommMessage('MAJOR ALTORREZ', '"Thanks soldier... vitals stabilized. Carry me up the ascent elevator [25, 76]!"', 'success');
          this.audio.playItemPickup();
        } else {
          this.completeObjective('rescue_altorrez');
          this.hud.addCommMessage('MAJOR ALTORREZ', '"Suit defibrillator applied... stabilized! Carry me up the ascent elevator [25, 76]!"', 'success');
          this.audio.playItemPickup();
        }
      }
    });

    // Ascent elevator at [25, 76]
    const elevAscent = ModelFactory.createBlastDoor('SURFACE');
    elevAscent.position.set(25 * 2, 0, 76 * 2);
    this.scene.add(elevAscent);
    this.interactiveObjects.push({
      mesh: elevAscent,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ASCENT ELEVATOR TO SURFACE WITH MAJOR ALTORREZ',
      onInteract: () => {
        const rescued = this.currentMission.objectives.find(o => o.id === 'rescue_altorrez');
        if (rescued && rescued.done) {
          this.completeObjective('elevator_up');
          this.transitionPlayerToArea({ x: 64, y: 12 }, Math.PI, 'Surface reached! Evacuate Major Altorrez to extraction [64, 1]!', false);
        } else {
          this.hud.addCommMessage('SUIT AI', 'ERROR: Locate and stabilize Major Altorrez first!', 'warn');
        }
      }
    });

    // Eradicator and heavy Terminators guarding Altorrez
    this.spawnEnemy('hk_tank', 27 * 2, 75 * 2);
    this.spawnEnemy('t800', 25 * 2, 82 * 2);
    this.spawnEnemy('t800', 30 * 2, 82 * 2);
    this.spawnEnemy('t800', 27 * 2, 88 * 2);
  }

  // MISSION 6: CD Cartridges, Gamma Card [10, 41], Vault of Chronos [69, 36]
  buildMission6Sector() {
    // 3 Satellite CDs
    const cds = [
      { id: 1, x: 10, y: 13 }, { id: 2, x: 37, y: 13 }, { id: 3, x: 37, y: 34 }
    ];
    let cdCount = 0;
    cds.forEach(c => {
      const mesh = ModelFactory.createCommGrid();
      mesh.scale.set(0.6, 0.6, 0.6);
      mesh.position.set(c.x * 2, 0, c.y * 2);
      this.scene.add(mesh);
      this.interactiveObjects.push({
        mesh: mesh,
        type: 'pickup',
        prompt: `[E] SECURE SATELLITE CD ${c.id}`,
        onInteract: () => {
          this.scene.remove(mesh);
          cdCount++;
          this.audio.playItemPickup();
          if (cdCount >= 3) {
            this.completeObjective('satellites');
            this.hud.addCommMessage('SUIT AI', 'All Satellite CDs secured! Retrieve Gamma Card at [10, 41].', 'success');
          }
        }
      });
    });

    // Gamma Access Card at [10, 41]
    const cardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.4), ModelFactory.materials.greenGlow);
    cardMesh.position.set(10 * 2, 0.8, 41 * 2);
    this.scene.add(cardMesh);
    this.interactiveObjects.push({
      mesh: cardMesh,
      type: 'card',
      prompt: '[E] ACQUIRE GAMMA ACCESS CARD',
      onInteract: () => {
        this.player.loadout.addItemToFirstEmptySlot('card_gamma', 1);
        this.completeObjective('get_gamma_card');
        this.scene.remove(cardMesh);
        this.hud.addCommMessage('SUIT AI', 'Gamma Card acquired! Slot into inventory to unlock base [10, 47].', 'success');
        this.audio.playItemPickup();
      }
    });

    // Gamma Base Entrance [10, 47] on Surface with Barrier Wall
    const gWallMat = ModelFactory.materials.darkMetal;
    const gWallL = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), gWallMat);
    gWallL.position.set(10 * 2 - 7, 4, 47 * 2);
    this.scene.add(gWallL);
    this.colliders.push({ box: new THREE.Box3().setFromObject(gWallL) });

    const gWallR = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), gWallMat);
    gWallR.position.set(10 * 2 + 7, 4, 47 * 2);
    this.scene.add(gWallR);
    this.colliders.push({ box: new THREE.Box3().setFromObject(gWallR) });

    const gLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), gWallMat);
    gLintel.position.set(10 * 2, 4.5 + 1.75, 47 * 2);
    this.scene.add(gLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(gLintel) });

    const baseDoor = ModelFactory.createBlastDoor('GAMMA');
    baseDoor.position.set(10 * 2, 0, 47 * 2);
    this.scene.add(baseDoor);
    this.interactiveObjects.push({
      mesh: baseDoor,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] SWIPE GAMMA CARD TO ENTER VAULT OF CHRONOS',
      onInteract: () => {
        if (this.player.loadout.hasItem('card_gamma')) {
          this.completeObjective('breach_base');
          this.transitionPlayerToArea({ x: 69, y: 22 }, 0, 'Gamma clearance accepted. Entering Vault of Chronos...', true);
        } else {
          this.hud.addCommMessage('SUIT AI', 'ACCESS DENIED: Gamma Access Card required in inventory slots 1-5!', 'warn');
        }
      }
    });

    const baseTransporter = ModelFactory.createTransporterPad('GAMMA BASE TRANSPORTER');
    baseTransporter.position.set(10 * 2, 0, 46 * 2);
    this.scene.add(baseTransporter);
    this.interactiveObjects.push({
      mesh: baseTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE GAMMA BASE TRANSPORTER [10, 47]',
      onInteract: () => {
        if (this.player.loadout.hasItem('card_gamma')) {
          this.completeObjective('breach_base');
          this.transitionPlayerToArea({ x: 69, y: 22 }, 0, 'Gamma clearance verified. Beaming into Vault of Chronos...', true);
        } else {
          this.hud.addCommMessage('SUIT AI', 'ACCESS DENIED: Gamma Access Card required in inventory slots 1-5!', 'warn');
        }
      }
    });

    // Vault of Chronos Chamber [60..78, 18..44]
    this.buildBunkerRoom({ minX: 60, maxX: 78, minZ: 18, maxZ: 44, wallHeight: 8, doorWall: 'north', doorLabel: 'CHRONOS' });

    // Return elevator to Surface at [69, 20]
    const vaultReturn = ModelFactory.createBlastDoor('SURFACE');
    vaultReturn.position.set(69 * 2, 0, 20 * 2);
    this.scene.add(vaultReturn);
    this.interactiveObjects.push({
      mesh: vaultReturn,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] ASCEND TO SURFACE RUINS',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 10, y: 45 }, Math.PI, 'Ascending to Surface Ruins.', false);
      }
    });

    // Extraction Transporter at [25, 0]
    this.addExtractionTransporter({ x: 25, y: 0 });

    // Time Distortion Equipment [69, 36]
    const chronos = ModelFactory.createTimeDistortionDevice();
    chronos.position.set(69 * 2, 0, 36 * 2);
    this.scene.add(chronos);
    this.interactiveObjects.push({
      mesh: chronos,
      type: 'demolish',
      interactDist: 7.0,
      prompt: '[E] DEMOLISH TIME DISTORTION EQUIPMENT WITH MINE',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('destroy_chronos');
          this.createExplosion(chronos.position, 3.5);
          this.scene.remove(chronos);
          this.hud.addCommMessage('JOHN CONNOR', 'Temporal equipment vaporized! Take escape elevator [69, 42] to surface!', 'success');
        } else {
          this.player.heat = Math.min(100, this.player.heat + 50);
          this.completeObjective('destroy_chronos');
          this.createExplosion(chronos.position, 3.5);
          this.scene.remove(chronos);
          this.hud.addCommMessage('JOHN CONNOR', 'Temporal equipment vaporized via PPC! Take escape elevator [69, 42] to surface!', 'success');
        }
      }
    });

    // Escape Elevator at [69, 42]
    const escapeVault = ModelFactory.createBlastDoor('SURFACE');
    escapeVault.position.set(69 * 2, 0, 42 * 2);
    this.scene.add(escapeVault);
    this.interactiveObjects.push({
      mesh: escapeVault,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE ESCAPE ELEVATOR TO SURFACE EXTRACTION [25, 0]',
      onInteract: () => {
        const chronosObj = this.currentMission.objectives.find(o => o.id === 'destroy_chronos');
        if (chronosObj && chronosObj.done) {
          this.transitionPlayerToArea({ x: 25, y: 8 }, Math.PI, 'Surface exit reached! Proceed to extraction [25, 0]!', false);
        } else {
          this.hud.addCommMessage('SUIT AI', 'LOCKED: Demolish Time Distortion Equipment first!', 'warn');
        }
      }
    });

    this.spawnEnemy('t800', 20 * 2, 20 * 2);
    this.spawnEnemy('hk_aerial', 35 * 2, 25 * 2);
    this.spawnEnemy('t800', 65 * 2, 38 * 2);
  }

  // MISSION 7: Launch Complex [173, 47], Nexus Controls [142, 82] & [142, 84], Viral-X [141, 83]
  buildMission7Sector() {
    // Launch Complex Entrance [173, 47] on Surface with Barrier Wall
    const sWallMat = ModelFactory.materials.darkMetal;
    const sWallL = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), sWallMat);
    sWallL.position.set(173 * 2 - 7, 4, 47 * 2);
    this.scene.add(sWallL);
    this.colliders.push({ box: new THREE.Box3().setFromObject(sWallL) });

    const sWallR = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 2), sWallMat);
    sWallR.position.set(173 * 2 + 7, 4, 47 * 2);
    this.scene.add(sWallR);
    this.colliders.push({ box: new THREE.Box3().setFromObject(sWallR) });

    const sLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), sWallMat);
    sLintel.position.set(173 * 2, 4.5 + 1.75, 47 * 2);
    this.scene.add(sLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(sLintel) });

    const siloGate = ModelFactory.createBlastDoor('SILO');
    siloGate.position.set(173 * 2, 0, 47 * 2);
    this.scene.add(siloGate);
    this.interactiveObjects.push({
      mesh: siloGate,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] INFILTRATE ICBM LAUNCH SILO',
      onInteract: () => {
        this.completeObjective('enter_launch');
        this.transitionPlayerToArea({ x: 142, y: 72 }, 0, 'Entering subterranean ICBM Launch Silo...', true);
      }
    });

    const siloTransporter = ModelFactory.createTransporterPad('SILO ENTRANCE TRANSPORTER');
    siloTransporter.position.set(173 * 2, 0, 46 * 2);
    this.scene.add(siloTransporter);
    this.interactiveObjects.push({
      mesh: siloTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE SILO ENTRANCE TRANSPORTER [173, 47]',
      onInteract: () => {
        this.completeObjective('enter_launch');
        this.transitionPlayerToArea({ x: 142, y: 72 }, 0, 'Silo Transporter lock engaged. Beaming into Launch Silo...', true);
      }
    });

    // Subterranean Launch Silo Chamber [134..150, 68..92]
    this.buildBunkerRoom({ minX: 134, maxX: 150, minZ: 68, maxZ: 92, wallHeight: 8, doorWall: 'north', doorLabel: 'SILO' });

    // Return Blast Door to Surface at [142, 70]
    const siloExit = ModelFactory.createBlastDoor('SURFACE');
    siloExit.position.set(142 * 2, 0, 70 * 2);
    this.scene.add(siloExit);
    this.interactiveObjects.push({
      mesh: siloExit,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] EXIT TO SURFACE PERIMETER',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 173, y: 45 }, Math.PI, 'Exiting to Surface Perimeter.', false);
      }
    });

    // Extraction Transporter at [141, 83]
    this.addExtractionTransporter({ x: 141, y: 83 });

    // Nexus Control 1 [142, 82]
    const nexus1 = ModelFactory.createCommGrid();
    nexus1.position.set(142 * 2, 0, 82 * 2);
    this.scene.add(nexus1);
    this.interactiveObjects.push({
      mesh: nexus1,
      type: 'demolish',
      prompt: '[E] DEMOLISH NEXUS CONTROL 1 WITH MINE',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('destroy_nexus1');
          this.createExplosion(nexus1.position, 2.5);
          this.scene.remove(nexus1);
          this.hud.addCommMessage('SUIT AI', 'Nexus Node 1 destroyed!', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ERROR: Proximity Mine required!', 'warn');
        }
      }
    });

    // Nexus Control 2 [142, 84]
    const nexus2 = ModelFactory.createCommGrid();
    nexus2.position.set(142 * 2, 0, 84 * 2);
    this.scene.add(nexus2);
    this.interactiveObjects.push({
      mesh: nexus2,
      type: 'demolish',
      prompt: '[E] DEMOLISH NEXUS CONTROL 2 WITH MINE',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('destroy_nexus2');
          this.createExplosion(nexus2.position, 2.5);
          this.scene.remove(nexus2);
          this.hud.addCommMessage('SUIT AI', 'Nexus Node 2 destroyed! Inject Viral-X at Launch Terminal [141, 83]!', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ERROR: Proximity Mine required!', 'warn');
        }
      }
    });

    // Launch Terminal [141, 83]
    const launchTerm = ModelFactory.createCommGrid();
    launchTerm.position.set(141 * 2, 0, 83 * 2);
    this.scene.add(launchTerm);
    this.interactiveObjects.push({
      mesh: launchTerm,
      type: 'terminal',
      prompt: '[E] INJECT VIRAL-X INTO LAUNCH COMPUTER',
      onInteract: () => {
        this.completeObjective('deploy_viral_x');
        this.hud.addCommMessage('JOHN CONNOR', 'VIRAL-X UPLOAD SUCCESSFUL! ICBM launch sequence aborted! The human race lives!', 'success');
        this.audio.playItemPickup();
        setTimeout(() => this.missionVictory(), 2000);
      }
    });

    this.spawnEnemy('hk_tank', 155 * 2, 60 * 2);
    this.spawnEnemy('hk_tank', 145 * 2, 80 * 2);
    this.spawnEnemy('t800', 140 * 2, 86 * 2);
  }

  // MISSION 8: 4 Sector Cards, Reactor Core [120, 180], Shuttle Bay [26, 237]
  buildMission8Sector() {
    // 4 Keycards: Alpha [28, 94], Beta [99, 3], Gamma [176, 104], Delta [105, 169]
    const cards = [
      { id: 'card_alpha', name: 'Alpha', x: 28, y: 94 },
      { id: 'card_beta', name: 'Beta', x: 99, y: 3 },
      { id: 'card_gamma', name: 'Gamma', x: 176, y: 104 },
      { id: 'card_delta', name: 'Delta', x: 105, y: 169 }
    ];

    let sectorCardCount = 0;
    cards.forEach(c => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.4), ModelFactory.materials.greenGlow);
      mesh.position.set(c.x * 2, 0.8, c.y * 2);
      this.scene.add(mesh);
      this.interactiveObjects.push({
        mesh: mesh,
        type: 'card',
        prompt: `[E] ACQUIRE ${c.name.toUpperCase()} SECTOR KEYCARD`,
        onInteract: () => {
          this.player.loadout.addItemToFirstEmptySlot(c.id, 1);
          this.scene.remove(mesh);
          this.audio.playItemPickup();
          if (c.id === 'card_alpha') {
            this.completeObjective('get_alpha_card');
          } else {
            sectorCardCount++;
            if (sectorCardCount >= 3) {
              this.completeObjective('get_sector_cards');
            }
          }
          this.hud.addCommMessage('SUIT AI', `${c.name} Card acquired!`, 'success');
        }
      });
    });

    // Alpha Door at [94, 85] with Reinforced Barrier Wall
    const aWallMat = ModelFactory.materials.darkMetal;
    const aWallL = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 2), aWallMat);
    aWallL.position.set(94 * 2 - 8, 4, 85 * 2);
    this.scene.add(aWallL);
    this.colliders.push({ box: new THREE.Box3().setFromObject(aWallL) });

    const aWallR = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 2), aWallMat);
    aWallR.position.set(94 * 2 + 8, 4, 85 * 2);
    this.scene.add(aWallR);
    this.colliders.push({ box: new THREE.Box3().setFromObject(aWallR) });

    const aLintel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2), aWallMat);
    aLintel.position.set(94 * 2, 4.5 + 1.75, 85 * 2);
    this.scene.add(aLintel);
    this.colliders.push({ box: new THREE.Box3().setFromObject(aLintel) });

    const alphaDoor = ModelFactory.createBlastDoor('ALPHA');
    alphaDoor.position.set(94 * 2, 0, 85 * 2);
    this.scene.add(alphaDoor);
    const alphaCollider = { box: new THREE.Box3().setFromObject(alphaDoor), mesh: alphaDoor, isDoor: true };
    this.colliders.push(alphaCollider);

    this.interactiveObjects.push({
      mesh: alphaDoor,
      type: 'door',
      interactDist: 7.0,
      prompt: '[E] UNLOCK ALPHA DOOR WITH ALPHA CARD',
      onInteract: () => {
        if (this.player.loadout.hasItem('card_alpha')) {
          this.completeObjective('unlock_alpha_door');
          alphaCollider.disabled = true;
          this.scene.remove(alphaDoor);
          this.hud.addCommMessage('SUIT AI', 'Alpha Barrier unlocked. Access to Core elevator cleared.', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ACCESS DENIED: Alpha Sector Card required!', 'warn');
        }
      }
    });

    const alphaTransporter = ModelFactory.createTransporterPad('ALPHA TRANSPORTER');
    alphaTransporter.position.set(94 * 2, 0, 84 * 2);
    this.scene.add(alphaTransporter);
    this.interactiveObjects.push({
      mesh: alphaTransporter,
      type: 'transporter',
      interactDist: 7.0,
      prompt: '[E] USE ALPHA TRANSPORTER [94, 85]',
      onInteract: () => {
        if (this.player.loadout.hasItem('card_alpha')) {
          this.completeObjective('unlock_alpha_door');
          this.transitionPlayerToArea({ x: 94, y: 90 }, 0, 'Alpha Transporter override confirmed. Beaming past barrier.', false);
        } else {
          this.hud.addCommMessage('SUIT AI', 'ACCESS DENIED: Alpha Sector Card required!', 'warn');
        }
      }
    });

    // Deep Shaft Elevator at [36, 191]
    const shaftElevator = ModelFactory.createBlastDoor('CORE');
    shaftElevator.position.set(36 * 2, 0, 191 * 2);
    this.scene.add(shaftElevator);
    this.interactiveObjects.push({
      mesh: shaftElevator,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] DESCEND DEEP SHAFT ELEVATOR TO REACTOR CORE',
      onInteract: () => {
        this.completeObjective('reach_reactor');
        this.transitionPlayerToArea({ x: 120, y: 162 }, 0, 'Descending deep shaft to Skynet Central Reactor Core...', true);
      }
    });

    // Reactor Core Subterranean Chamber [110..130, 158..192]
    this.buildBunkerRoom({ minX: 110, maxX: 130, minZ: 158, maxZ: 192, wallHeight: 9, doorWall: 'north', doorLabel: 'CORE' });

    // Shuttle Bay Extraction Transporter at [26, 237]
    this.addExtractionTransporter({ x: 26, y: 237 });

    // Return elevator to citadel at [120, 160]
    const coreReturn = ModelFactory.createBlastDoor('CITADEL');
    coreReturn.position.set(120 * 2, 0, 160 * 2);
    this.scene.add(coreReturn);
    this.interactiveObjects.push({
      mesh: coreReturn,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] ASCEND TO MAIN CITADEL',
      onInteract: () => {
        this.transitionPlayerToArea({ x: 36, y: 189 }, Math.PI, 'Ascending to Main Citadel.', false);
      }
    });

    // Skynet Reactor Core at [120, 180]
    const reactor = ModelFactory.createReactorCore();
    reactor.position.set(120 * 2, 0, 180 * 2);
    this.scene.add(reactor);
    this.interactiveObjects.push({
      mesh: reactor,
      type: 'reactor',
      interactDist: 7.0,
      prompt: '[E] OVERLOAD SKYNET CENTRAL REACTOR CORE WITH MINES',
      onInteract: () => {
        this.completeObjective('destroy_reactor');
        this.createExplosion(reactor.position, 5.0);
        this.hud.addCommMessage('JOHN CONNOR', 'REACTOR CRITICAL! TAKE EVACUATION ELEVATOR [120, 188] TO SHUTTLE BAY!', 'warn');
      }
    });

    // Shuttle Bay Evacuation Elevator at [120, 188]
    const shuttleElevator = ModelFactory.createBlastDoor('SHUTTLE');
    shuttleElevator.position.set(120 * 2, 0, 188 * 2);
    this.scene.add(shuttleElevator);
    this.interactiveObjects.push({
      mesh: shuttleElevator,
      type: 'elevator',
      interactDist: 7.0,
      prompt: '[E] TAKE EVACUATION ELEVATOR TO SHUTTLE BAY [26, 237]',
      onInteract: () => {
        const reactorObj = this.currentMission.objectives.find(o => o.id === 'destroy_reactor');
        if (reactorObj && reactorObj.done) {
          this.transitionPlayerToArea({ x: 26, y: 233 }, 0, 'SHUTTLE BAY REACHED! BOARD EXTRACTION SHUTTLE!', false);
        } else {
          this.hud.addCommMessage('SUIT AI', 'LOCKED: Overload Skynet Central Reactor first!', 'warn');
        }
      }
    });

    // Spawn massive defense garrison
    this.spawnEnemy('hk_tank', 94 * 2, 90 * 2);
    this.spawnEnemy('hk_tank', 110 * 2, 170 * 2);
    this.spawnEnemy('hk_aerial', 120 * 2, 150 * 2);
    this.spawnEnemy('t800', 115 * 2, 175 * 2);
    this.spawnEnemy('t800', 125 * 2, 175 * 2);
  }

  // TRAINING ARENA
  buildTrainingSector() {
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = (10 + Math.cos(angle) * 8) * 2;
      const z = (10 + Math.sin(angle) * 8) * 2;
      this.spawnEnemy('g500', x, z);
    }
    // Simulated Extraction Transporter at [30, 30]
    this.addExtractionTransporter({ x: 30, y: 30 });
  }

  // =========================================================================
  // ENEMY SPAWNING & COMBAT SIMULATION
  // =========================================================================

  spawnEnemy(type, x, z) {
    let mesh = null;
    if (type === 't800') mesh = ModelFactory.createT800();
    else if (type === 'hk_aerial') mesh = ModelFactory.createHKAerial();
    else if (type === 'hk_tank') mesh = ModelFactory.createHKTank();
    else if (type === 'g500') mesh = ModelFactory.createG500();
    else if (type === 'spider') mesh = ModelFactory.createSpiderScout();
    else if (type === 'turret') mesh = ModelFactory.createDefenseTurret();

    if (!mesh) return;

    mesh.position.set(x, mesh.position.y || 0, z);
    this.scene.add(mesh);

    const enemy = {
      type: type,
      name: mesh.userData.name || type.replace('_', ' ').toUpperCase(),
      mesh: mesh,
      radius: mesh.userData.radius || 1.2,
      height: mesh.userData.height || 2.2,
      maxHp: mesh.userData.maxHp || 100,
      hp: mesh.userData.maxHp || 100,
      damage: mesh.userData.damage || 15,
      speed: mesh.userData.speed || 3.0,
      attackRange: mesh.userData.attackRange || 50,
      isFlying: !!mesh.userData.isFlying,
      isAlive: true,
      lastAttackTime: 0,
      attackCooldown: 1.2
    };

    // Attach enemy reference to root mesh and all child meshes for fast Raycasting hit detection
    mesh.userData.enemyRef = enemy;
    mesh.traverse(child => {
      if (child.isMesh) {
        child.userData.enemyRef = enemy;
      }
    });

    this.enemies.push(enemy);
  }

  // =========================================================================
  // WEAPONS & PROJECTILES
  // =========================================================================

  firePrimaryWeapon() {
    const now = this.clock.getElapsedTime();
    const loadout = this.player.loadout;
    const weapon = WEAPON_REGISTRY[loadout.primaryWeapon];
    if (!weapon) return;

    // Check overheat or fire rate cooldown
    if (this.player.isOverheated) {
      this.audio.playAlarm();
      return;
    }
    if (now - this.player.lastPriFireTime < weapon.fireRate) return;

    this.player.lastPriFireTime = now;
    this.player.heat = Math.min(100, this.player.heat + weapon.heatPerShot);

    if (this.player.heat >= 100) {
      this.player.isOverheated = true;
      this.audio.playAlarm();
      this.hud.addCommMessage('SUIT AI', 'THERMAL LOCKOUT: PPC OVERHEATED!', 'warn');
    }

    // Play synthesized weapon sound
    this.audio[weapon.sound](weapon.soundArg);

    // Recoil animation
    this.weaponRecoil = 0.08;

    // Crosshair Raycaster directly from camera center (0, 0)
    this.camera.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Muzzle position for visual bolt origin
    const muzzlePos = this.yawObject.position.clone();
    muzzlePos.addScaledVector(right, 0.28);
    muzzlePos.addScaledVector(forward, 0.45);
    muzzlePos.y -= 0.15;

    // Muzzle flash particle
    this.createMuzzleFlash(muzzlePos, weapon.projColor);

    // Collect candidate meshes for raycasting
    const candidateMeshes = [];
    const aliveEnemies = this.enemies.filter(e => e.isAlive && e.mesh);
    aliveEnemies.forEach(e => {
      candidateMeshes.push(e.mesh);
    });

    const intersects = raycaster.intersectObjects(candidateMeshes, true);
    let hitEnemy = null;
    let targetPoint = null;

    if (intersects.length > 0) {
      const hit = intersects[0];
      targetPoint = hit.point.clone();
      let curr = hit.object;
      while (curr) {
        if (curr.userData && curr.userData.enemyRef) {
          hitEnemy = curr.userData.enemyRef;
          break;
        }
        curr = curr.parent;
      }
    }

    // A.C.E. Targeting Computer Assist:
    // If raycast just barely missed by geometry gap but target lock is active:
    if (!hitEnemy && this.player.lockedTarget && this.player.lockedTarget.isAlive) {
      const lockEnemy = this.player.lockedTarget;
      const enemyCenter = lockEnemy.mesh.position.clone();
      enemyCenter.y += (lockEnemy.height || 2.0) * 0.55;
      const dirToEnemy = enemyCenter.clone().sub(this.yawObject.position).normalize();
      const dot = forward.dot(dirToEnemy);
      if (dot > 0.88) {
        hitEnemy = lockEnemy;
        targetPoint = enemyCenter;
      }
    }

    // Default target point if no enemy hit
    if (!targetPoint) {
      targetPoint = muzzlePos.clone().addScaledVector(raycaster.ray.direction, weapon.range || 160);
    }

    // High velocity visual plasma bolt
    const shotDir = targetPoint.clone().sub(muzzlePos).normalize();
    const boltDist = muzzlePos.distanceTo(targetPoint);
    const boltSpeed = (weapon.projSpeed || 90) * 1.6;
    const flightTime = Math.min(boltDist / boltSpeed, 1.2);

    // 3D Voxel Plasma Bolt Projectile
    const projGeo = new THREE.BoxGeometry(0.12 * weapon.projScale, 0.12 * weapon.projScale, 1.4 * weapon.projScale);
    const projMat = new THREE.MeshBasicMaterial({
      color: weapon.projColor
    });
    const projMesh = new THREE.Mesh(projGeo, projMat);
    projMesh.position.copy(muzzlePos);
    projMesh.lookAt(targetPoint);
    this.scene.add(projMesh);

    this.projectiles.push({
      mesh: projMesh,
      startPos: muzzlePos.clone(),
      targetPos: targetPoint.clone(),
      dir: shotDir,
      speed: boltSpeed,
      damage: weapon.damage,
      isEnemy: false,
      hitEnemy: hitEnemy,
      color: weapon.projColor,
      birthTime: now,
      flightTime: flightTime,
      life: flightTime + 0.05
    });
  }

  fireSecondaryWeapon() {
    const now = this.clock.getElapsedTime();
    const loadout = this.player.loadout;
    const weaponId = loadout.secondaryWeapon;
    const weapon = WEAPON_REGISTRY[weaponId];
    if (!weapon) return;

    const ammo = loadout.ammo[weaponId] || 0;
    if (ammo <= 0) {
      this.hud.addCommMessage('SUIT AI', 'AMMO DEPLETED!', 'warn');
      return;
    }
    if (now - this.player.lastSecFireTime < weapon.fireRate) return;

    this.player.lastSecFireTime = now;
    loadout.ammo[weaponId]--;

    if (weaponId === 'grenade') {
      this.audio.playGrenadeThrow();
      this.throwFusionGrenade();
    } else if (weaponId === 'missile') {
      this.audio.playMissileLaunch();
      this.launchHomingMissile();
    } else if (weaponId === 'mine') {
      this.audio.playMineArm();
      this.plantProximityMine();
    }
  }

  throwFusionGrenade() {
    const now = this.clock.getElapsedTime();
    const spawnPos = this.yawObject.position.clone();
    const dir = this.player.getForwardVector();

    // 3D Voxel Fusion Grenade Canister
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.36),
      ModelFactory.materials.hazard
    );
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const velocity = dir.clone().multiplyScalar(28);
    velocity.y += 6; // gentle loft

    this.projectiles.push({
      mesh: mesh,
      isGrenade: true,
      velocity: velocity,
      damage: 220,
      radius: 12,
      birthTime: now,
      fuseTime: 1.5
    });

    if (this.currentMission && this.currentMission.id === 'training') {
      const expObj = this.currentMission.objectives.find(o => o.id === 'test_explosives');
      if (expObj && !expObj.done) {
        this.completeObjective('test_explosives');
        this.hud.addCommMessage('SUIT AI', 'Explosive ordnance simulation successful.', 'success');
      }
    }
  }

  launchHomingMissile() {
    const now = this.clock.getElapsedTime();
    const spawnPos = this.yawObject.position.clone();
    const dir = this.player.getForwardVector();

    // 3D Voxel Hyper-Velocity Missile
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.75),
      ModelFactory.materials.chrome
    );
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh: mesh,
      isMissile: true,
      target: this.player.lockedTarget,
      dir: dir,
      speed: 45,
      damage: 150,
      radius: 7,
      birthTime: now,
      life: 3.5
    });
  }

  plantProximityMine() {
    const pos = this.yawObject.position.clone();
    pos.y = 0.1;

    // 3D Voxel Proximity Mine
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.50, 0.16, 0.50),
      ModelFactory.materials.darkMetal
    );
    mesh.position.copy(pos);

    const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), ModelFactory.materials.redEye);
    led.position.set(0, 0.1, 0);
    mesh.add(led);

    this.scene.add(mesh);
    this.hud.addCommMessage('SUIT AI', 'Proximity Mine armed.', 'normal');

    this.interactiveObjects.push({
      mesh: mesh,
      type: 'mine_hazard',
      damage: 320,
      radius: 8,
      isArmed: true
    });

    if (this.currentMission && this.currentMission.id === 'training') {
      const expObj = this.currentMission.objectives.find(o => o.id === 'test_explosives');
      if (expObj && !expObj.done) {
        this.completeObjective('test_explosives');
        this.hud.addCommMessage('SUIT AI', 'Explosive ordnance simulation successful.', 'success');
      }
    }
  }

  cyclePrimaryWeapon() {
    const loadout = this.player.loadout;
    const weapons = ['ppc_40w', 'ppc_60w', 'ppc_80w', 'ppc_100w'];
    const curIdx = weapons.indexOf(loadout.primaryWeapon);
    const nextIdx = (curIdx + 1) % weapons.length;
    loadout.setPrimary(weapons[nextIdx]);
    this.updateWeaponViewModel();
    this.audio.playUI('select');
    this.hud.addCommMessage('SUIT AI', `Primary weapon: ${WEAPON_REGISTRY[loadout.primaryWeapon].name}`, 'normal');
  }

  cycleSecondaryWeapon() {
    const loadout = this.player.loadout;
    const secondaries = ['grenade', 'missile', 'mine'];
    const curIdx = secondaries.indexOf(loadout.secondaryWeapon);
    const nextIdx = (curIdx + 1) % secondaries.length;
    loadout.setSecondary(secondaries[nextIdx]);
    this.audio.playUI('select');
    this.hud.addCommMessage('SUIT AI', `Secondary ordnance: ${WEAPON_REGISTRY[loadout.secondaryWeapon].name} (${loadout.ammo[loadout.secondaryWeapon] || 0} rounds)`, 'normal');
  }

  useInventorySlot(slotIdx) {
    const loadout = this.player.loadout;
    const item = loadout.inventory[slotIdx];
    if (!item) return;

    if (item.id === 'medpack') {
      const heal = 60;
      this.player.armorFront = Math.min(this.player.maxArmorFront, this.player.armorFront + heal);
      this.player.armorRear = Math.min(this.player.maxArmorRear, this.player.armorRear + heal);
      loadout.removeItem('medpack', 1);
      this.audio.playItemPickup();
      this.hud.addCommMessage('SUIT AI', `Autodoc deployed: +${heal} Armor Restored.`, 'success');
    } else if (item.id === 'mine') {
      this.plantProximityMine();
      loadout.removeItem('mine', 1);
    } else {
      this.hud.addCommMessage('SUIT AI', `Selected ${WEAPON_REGISTRY[item.id].name}.`, 'normal');
    }
  }

  checkInteract() {
    const playerPos = this.yawObject.position;
    let closestObj = null;
    let closestDist = Infinity;
    const tempPos = new THREE.Vector3();

    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const obj = this.interactiveObjects[i];
      if (!obj || obj.disabled) continue;
      if (obj.mesh && !obj.mesh.parent && !obj.position) continue;

      let ox = 0, oz = 0;
      if (obj.position) {
        ox = obj.position.x;
        oz = obj.position.z;
      } else if (obj.mesh) {
        obj.mesh.getWorldPosition(tempPos);
        ox = tempPos.x;
        oz = tempPos.z;
      }

      const dx = playerPos.x - ox;
      const dz = playerPos.z - oz;
      const dist = Math.hypot(dx, dz);
      const maxDist = obj.interactDist || 7.0;

      if (dist < maxDist && dist < closestDist) {
        closestDist = dist;
        closestObj = obj;
      }
    }

    if (closestObj && closestObj.onInteract) {
      closestObj.onInteract();
    }
  }

  createExplosion(pos, scale = 1.0) {
    this.audio.playExplosion(scale);

    // Flash light
    const light = new THREE.PointLight(0xff6600, 4 * scale, 30 * scale);
    light.position.copy(pos);
    this.scene.add(light);

    // 3D Voxel Fireball Core
    const fireGeo = new THREE.BoxGeometry(2.2 * scale, 2.2 * scale, 2.2 * scale);
    const fireMat = (ModelFactory.materials && ModelFactory.materials.debrisFire)
      ? ModelFactory.materials.debrisFire
      : new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    fireball.position.copy(pos);
    this.scene.add(fireball);

    this.particles.push({
      mesh: fireball,
      light: light,
      life: 0.45,
      maxLife: 0.45,
      growRate: 5 * scale
    });

    // 3D Voxel Debris Physics System (Tumbling & Bouncing Voxel Fragments)
    if (this.config && this.config.settings && this.config.settings.voxelDebris !== false && typeof VoxelBuilder !== 'undefined') {
      const debrisCount = Math.min(28, Math.floor(16 * scale));
      const mats = ModelFactory.materials ? [
        ModelFactory.materials.debrisMetal || ModelFactory.materials.chrome,
        ModelFactory.materials.debrisFire || ModelFactory.materials.orangeGlow,
        ModelFactory.materials.debrisSmoke || ModelFactory.materials.darkMetal,
        ModelFactory.materials.chrome
      ] : [fireMat];

      for (let i = 0; i < debrisCount; i++) {
        const dSize = (0.12 + Math.random() * 0.16) * scale;
        const dMat = mats[i % mats.length];
        const dMesh = VoxelBuilder.createBox(dSize, dSize, dSize, dMat);
        dMesh.position.copy(pos);
        dMesh.position.x += (Math.random() - 0.5) * 0.6 * scale;
        dMesh.position.y += (Math.random() - 0.5) * 0.6 * scale;
        dMesh.position.z += (Math.random() - 0.5) * 0.6 * scale;
        this.scene.add(dMesh);

        const spd = (5 + Math.random() * 11) * scale;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.45;

        this.particles.push({
          mesh: dMesh,
          isVoxelDebris: true,
          baseScale: 1.0,
          velocity: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * spd,
            Math.cos(phi) * spd + 3.5 * scale,
            Math.sin(phi) * Math.sin(theta) * spd
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12
          ),
          life: 1.2 + Math.random() * 1.4,
          maxLife: 2.6
        });
      }
    }

    // Radial Damage to nearby enemies & player
    this.enemies.forEach(e => {
      if (!e.isAlive) return;
      const d = pos.distanceTo(e.mesh.position);
      if (d < 12 * scale) {
        const falloff = 1 - (d / (12 * scale));
        e.hp -= 200 * falloff * scale;
        if (e.hp <= 0) this.killEnemy(e);
      }
    });

    const playerDist = pos.distanceTo(this.yawObject.position);
    if (playerDist < 10 * scale) {
      const falloff = 1 - (playerDist / (10 * scale));
      this.damagePlayer(80 * falloff * scale, pos);
    }
  }

  createSparks(pos, color = 0x00e5ff, count = 10) {
    const sparkGeo = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions.push(pos.x, pos.y, pos.z);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = 3 + Math.random() * 8;
      velocities.push(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.cos(phi) * spd + 2.5,
        Math.sin(phi) * Math.sin(theta) * spd
      );
    }
    sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: color,
      size: 0.22,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const pSystem = new THREE.Points(sparkGeo, sparkMat);
    this.scene.add(pSystem);

    this.particles.push({
      pSystem: pSystem,
      velocities: velocities,
      life: 0.35,
      maxLife: 0.35,
      isPointSystem: true
    });
  }

  createMuzzleFlash(pos, color = 0x00e5ff) {
    const flashGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(pos);
    this.scene.add(flash);

    const light = new THREE.PointLight(color, 2.5, 6);
    light.position.copy(pos);
    this.scene.add(light);

    this.particles.push({
      mesh: flash,
      light: light,
      life: 0.08,
      maxLife: 0.08,
      growRate: 1.5
    });
  }

  killEnemy(enemy) {
    enemy.isAlive = false;
    this.scene.remove(enemy.mesh);
    this.createExplosion(enemy.mesh.position, 1.2);

    if (this.currentMission.id === 'training') {
      const obj = this.currentMission.objectives.find(o => o.id === 'kill_drones');
      if (obj) {
        obj.currentCount++;
        obj.text = `Destroy simulated combat drones (${obj.currentCount}/4)`;
        if (obj.currentCount >= 4) {
          obj.done = true;
          this.hud.addCommMessage('REBEL COMMAND', 'All simulated drones neutralized! Proceed to extraction.', 'success');
        }
      }
    }
  }

  damagePlayer(amount, sourcePos) {
    if (!this.player.isAlive) return;

    this.player.lastDamageTime = this.clock.getElapsedTime();

    // Shield absorbs first
    if (this.player.shield > 0) {
      this.audio.playHitShield();
      if (this.player.shield >= amount) {
        this.player.shield -= amount;
        return;
      } else {
        amount -= this.player.shield;
        this.player.shield = 0;
      }
    }

    // Determine Front vs Rear hit
    this.audio.playHitArmor();
    const toSource = sourcePos.clone().sub(this.yawObject.position).normalize();
    const forward = this.player.getForwardVector();
    const dot = forward.dot(toSource);

    if (dot >= 0) {
      // Hit Front Armor
      this.player.armorFront -= amount;
      if (this.player.armorFront <= 0) {
        this.player.armorFront = 0;
        this.playerDeath();
      }
    } else {
      // Hit Rear Armor
      this.player.armorRear -= amount;
      if (this.player.armorRear <= 0) {
        this.player.armorRear = 0;
        this.playerDeath();
      }
    }
  }

  playerDeath() {
    this.player.isAlive = false;
    this.audio.playAlarm();
    this.hud.addCommMessage('SUIT AI', 'CRITICAL BREACH: A.C.E. SUIT INTEGRITY DESTROYED.', 'warn');
    setTimeout(() => this.missionDefeat(), 1800);
  }

  isExtractionObjective(obj) {
    if (!obj) return false;
    const id = (obj.id || '').toLowerCase();
    const txt = (obj.text || '').toLowerCase();
    return id === 'extract' || id === 'extract_elevator' || id === 'escape_shuttle' ||
           txt.startsWith('extract') || txt.startsWith('evacuate') || txt.includes('extraction pad');
  }

  arePrimaryObjectivesComplete() {
    if (!this.currentMission || !this.currentMission.objectives) return false;
    const primary = this.currentMission.objectives.filter(o => !this.isExtractionObjective(o));
    if (primary.length === 0) return true;
    return primary.every(o => o.done);
  }

  getIncompleteObjectiveSummary() {
    if (!this.currentMission || !this.currentMission.objectives) return '';
    const incomplete = this.currentMission.objectives.filter(o => !this.isExtractionObjective(o) && !o.done);
    return incomplete.map(o => o.text).join(' | ');
  }

  completeObjective(objId) {
    if (!this.currentMission) return;
    const obj = this.currentMission.objectives.find(o => o.id === objId);
    if (obj) {
      obj.done = true;
      this.audio.playItemPickup();
    }
  }

  missionVictory() {
    this.state = 'DEBRIEF';
    if (document.exitPointerLock) document.exitPointerLock();
    this.audio.playTrack('victory');

    const statusEl = document.getElementById('debrief-status');
    statusEl.textContent = 'MISSION ACCOMPLISHED';
    statusEl.className = 'debrief-status victory';

    const textEl = document.getElementById('debrief-message');
    textEl.textContent = `Outstanding work, soldier. The objectives in ${this.currentMission.title} were executed with exceptional tactical precision. Resistance Command commends your valor.`;

    const promoEl = document.getElementById('debrief-promotion');
    if (this.currentMission.promotion) {
      promoEl.textContent = `FIELD PROMOTION: You have been promoted to ${this.currentMission.promotion}!`;
      promoEl.style.display = 'block';
    } else {
      promoEl.style.display = 'none';
    }

    this.showModal('debrief-screen');
  }

  missionDefeat() {
    this.state = 'DEBRIEF';
    if (document.exitPointerLock) document.exitPointerLock();
    this.audio.stopMusic();

    const statusEl = document.getElementById('debrief-status');
    statusEl.textContent = 'MISSION FAILED';
    statusEl.className = 'debrief-status defeat';

    const textEl = document.getElementById('debrief-message');
    textEl.textContent = 'A.C.E. Armor destroyed. Tactical link severed. Skynet automated units overrun the sector.';

    const promoEl = document.getElementById('debrief-promotion');
    promoEl.style.display = 'none';

    this.showModal('debrief-screen');
  }

  // =========================================================================
  // MAIN ANIMATION & SIMULATION LOOP
  // =========================================================================

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'PLAYING') {
      // Keep 1992 bitmap skyline panorama centered on player and animate atmospheric searchlights
      if (this.skylineBackdrop) {
        this.skylineBackdrop.position.set(this.yawObject.position.x, 0, this.yawObject.position.z);
        const time = this.clock.getElapsedTime();
        this.skylineBackdrop.children.forEach(child => {
          if (child.userData && child.userData.initialZ !== undefined) {
            child.rotation.z = child.userData.initialZ + Math.sin(time * child.userData.speed) * 0.22;
          }
        });
      }

      this.updatePlayer(dt);
      this.updateWeapons(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateParticles(dt);
      this.updateMission(dt);
      this.updateHUD(dt);

      // Animate active Sector Transporter energy beams
      const time = this.clock.getElapsedTime();
      for (let i = 0; i < this.interactiveObjects.length; i++) {
        const io = this.interactiveObjects[i];
        if (io && io.mesh && io.mesh.userData && io.mesh.userData.isTransporter && io.mesh.userData.beam) {
          const b = io.mesh.userData.beam;
          b.rotation.y += dt * 1.2;
          if (b.material) {
            b.material.opacity = 0.28 + 0.16 * Math.sin(time * 3.5);
          }
        }
      }
    } else if (this.titleShowcase) {
      // Smoothly rotate 3D showcase on title screen & menus
      this.titleShowcase.rotation.y += dt * 0.35;
      if (this.titleShowcase.userData && this.titleShowcase.userData.hk) {
        this.titleShowcase.userData.hk.position.y = 5.5 + Math.sin(this.clock.getElapsedTime() * 1.5) * 0.4;
      }
    }

    // Render through 8-Bit Bayer Dithering Pipeline or Direct Low-Res Buffer
    if (this.postMaterial && this.renderTarget && this.config && this.config.settings && this.config.settings.dithering8bit) {
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);

      this.postMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
      this.postMaterial.uniforms.uResolution.value.set(this.renderWidth || 384, this.renderHeight || 240);
      this.postMaterial.uniforms.uEnableScanlines.value = this.config.settings.crtScanlines ? 1.0 : 0.0;
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  checkPlayerCollision(targetPos) {
    if (!this.colliders || this.colliders.length === 0) return false;

    const r = 0.85; // Player bounding radius
    const minX = targetPos.x - r;
    const maxX = targetPos.x + r;
    const minZ = targetPos.z - r;
    const maxZ = targetPos.z + r;

    // Perimeter boundary limits
    if (targetPos.x < 3.0 || targetPos.x > 497.0 || targetPos.z < 3.0 || targetPos.z > 517.0) {
      return true;
    }

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (!c || c.disabled || c.isOpen) continue;

      const box = c.box || (c.mesh ? new THREE.Box3().setFromObject(c.mesh) : null);
      if (!box) continue;

      // Check horizontal AABB intersection
      if (maxX > box.min.x && minX < box.max.x &&
          maxZ > box.min.z && minZ < box.max.z) {
        // Vertical check: ignore elements completely below feet or above head
        if (box.max.y > 0.35 && box.min.y < 1.8) {
          return true;
        }
      }
    }
    return false;
  }

  updatePlayer(dt) {
    if (!this.player.isAlive) return;

    const cfg = this.config;

    // Horizontal forward direction on XZ plane
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Horizontal right lateral vector (orthogonal to forward on XZ plane)
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVector = new THREE.Vector3();

    // Forward / Backward movement (W / S)
    if (cfg.isActionPressed('forward', this.keys, this.mouseButtons) || this.keys['KeyW']) {
      moveVector.add(forward);
    }
    if (cfg.isActionPressed('backward', this.keys, this.mouseButtons) || this.keys['KeyS']) {
      moveVector.sub(forward);
    }

    // STRICT LATERAL MOVEMENT: 'A' and 'D' strafe left and right (NO turning)
    if (cfg.isActionPressed('strafeLeft', this.keys, this.mouseButtons) || this.keys['KeyA']) {
      moveVector.sub(right); // Lateral strafe left
    }
    if (cfg.isActionPressed('strafeRight', this.keys, this.mouseButtons) || this.keys['KeyD']) {
      moveVector.add(right); // Lateral strafe right
    }

    // Classic Arrow Keys support (Up/Down move, Left/Right turn)
    if (this.keys['ArrowUp']) moveVector.add(forward);
    if (this.keys['ArrowDown']) moveVector.sub(forward);

    // Keyboard rotation is ONLY on ArrowLeft/ArrowRight (NOT A or D)
    if (this.keys['ArrowLeft']) {
      this.yawObject.rotation.y += cfg.settings.smoothTurnSpeed * dt;
    }
    if (this.keys['ArrowRight']) {
      this.yawObject.rotation.y -= cfg.settings.smoothTurnSpeed * dt;
    }

    // Apply translation with solid collision detection and smooth sliding
    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      const moveDist = this.player.speed * dt;
      const deltaX = moveVector.x * moveDist;
      const deltaZ = moveVector.z * moveDist;

      const nextPos = this.player.position.clone();
      nextPos.x += deltaX;
      nextPos.z += deltaZ;

      if (!this.checkPlayerCollision(nextPos)) {
        this.player.position.copy(nextPos);
      } else {
        // Sliding along X: test X-axis alone
        const nextX = this.player.position.clone();
        nextX.x += deltaX;
        if (Math.abs(deltaX) > 0.0001 && !this.checkPlayerCollision(nextX)) {
          this.player.position.x = nextX.x;
        }

        // Sliding along Z: test Z-axis alone
        const nextZ = this.player.position.clone();
        nextZ.z += deltaZ;
        if (Math.abs(deltaZ) > 0.0001 && !this.checkPlayerCollision(nextZ)) {
          this.player.position.z = nextZ.z;
        }
      }

      this.yawObject.position.copy(this.player.position);
      this.yawObject.position.y = this.player.height;

      // Training Arena movement calibration check
      if (this.currentMission && this.currentMission.id === 'training') {
        const moveObj = this.currentMission.objectives.find(o => o.id === 'move_check');
        if (moveObj && !moveObj.done) {
          this.completeObjective('move_check');
          this.hud.addCommMessage('SUIT AI', 'A.C.E. suit movement controls calibrated.', 'success');
        }
      }
    }

    // Shield Regeneration (after 4s of not taking damage)
    const now = this.clock.getElapsedTime();
    if (now - this.player.lastDamageTime > 4.0 && this.player.shield < this.player.maxShield) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 18 * dt);
    }

    // Heat Dissipation
    if (this.player.heat > 0) {
      this.player.heat = Math.max(0, this.player.heat - 18 * dt);
      if (this.player.isOverheated && this.player.heat < 40) {
        this.player.isOverheated = false;
        this.hud.addCommMessage('SUIT AI', 'PPC THERMAL COOLING COMPLETE. WEAPONS ONLINE.', 'success');
      }
    }

    // Weapon ViewModel Recoil Spring
    if (this.weaponViewModel) {
      if (this.weaponRecoil > 0) {
        this.weaponRecoil = Math.max(0, this.weaponRecoil - dt * 0.6);
      }
      this.weaponViewModel.position.z = -0.5 + this.weaponRecoil;
    }
  }

  updateWeapons(dt) {
    const cfg = this.config;
    // Primary trigger
    if (cfg.isActionPressed('firePrimary', this.keys, this.mouseButtons)) {
      this.firePrimaryWeapon();
    }
    // Secondary trigger
    if (cfg.isActionPressed('fireSecondary', this.keys, this.mouseButtons)) {
      this.fireSecondaryWeapon();
    }
  }

  updateEnemies(dt) {
    const playerPos = this.yawObject.position;
    const now = this.clock.getElapsedTime();

    this.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;

      const dist = playerPos.distanceTo(enemy.mesh.position);

      // Look at player (Y axis only)
      enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);

      // Move toward player if in range
      let isMoving = false;
      if (dist < enemy.attackRange && dist > 8.0) {
        const dir = playerPos.clone().sub(enemy.mesh.position).normalize();
        if (!enemy.isFlying) dir.y = 0;
        enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
        isMoving = true;
      }

      // Procedural Voxel Articulated Animations
      const ud = enemy.mesh.userData;
      if (ud) {
        // T-800 Voxel Walking Strides & Scanning Head
        if (ud.leftLeg && ud.rightLeg) {
          const walkFreq = isMoving ? 8.5 : 1.2;
          const walkAmp = isMoving ? 0.45 : 0.04;
          const phase = Math.sin(now * walkFreq);
          ud.leftLeg.rotation.x = phase * walkAmp;
          ud.rightLeg.rotation.x = -phase * walkAmp;
          if (ud.leftArm) ud.leftArm.rotation.x = -phase * (walkAmp * 0.7);
          if (ud.rightArm) ud.rightArm.rotation.x = phase * (walkAmp * 0.4);
          if (ud.head) ud.head.rotation.y = Math.sin(now * 1.5) * 0.12;
        }

        // HK Aerial Voxel Hovering & Banking
        if (enemy.isFlying && ud.leftTurbine && ud.rightTurbine) {
          enemy.mesh.position.y += Math.sin(now * 2.8) * 0.015;
          enemy.mesh.rotation.z = Math.sin(now * 1.6) * 0.08;
          if (ud.leftFlare && ud.rightFlare) {
            const flicker = 0.8 + Math.sin(now * 25.0) * 0.25;
            ud.leftFlare.scale.set(flicker, flicker, flicker * 1.3);
            ud.rightFlare.scale.set(flicker, flicker, flicker * 1.3);
          }
        }

        // HK Tank Heavy Turret Tracking
        if (ud.turret && ud.barrels) {
          ud.barrels.rotation.x = Math.sin(now * 1.4) * 0.05;
        }
      }

      // Attack player
      if (dist < enemy.attackRange && (now - enemy.lastAttackTime > enemy.attackCooldown)) {
        enemy.lastAttackTime = now;
        this.enemyFire(enemy);
      }
    });
  }

  enemyFire(enemy) {
    this.audio.playEnemyFire();
    const spawnPos = enemy.mesh.position.clone();
    spawnPos.y += 1.2;

    const dir = this.yawObject.position.clone().sub(spawnPos).normalize();

    // 3D Voxel Enemy Red Plasma Bolt
    const boltGeo = new THREE.BoxGeometry(0.12, 0.12, 1.4);
    const boltMat = ModelFactory.materials.redEye;
    const bolt = new THREE.Mesh(boltGeo, boltMat);

    bolt.position.copy(spawnPos);
    bolt.lookAt(this.yawObject.position);
    this.scene.add(bolt);

    this.projectiles.push({
      mesh: bolt,
      dir: dir,
      speed: 55,
      damage: enemy.damage,
      isEnemy: true,
      birthTime: this.clock.getElapsedTime(),
      life: 2.5
    });
  }

  updateProjectiles(dt) {
    const now = this.clock.getElapsedTime();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      if (now - p.birthTime > (p.life || 3.0)) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.isGrenade) {
        p.velocity.y -= 18 * dt; // gravity
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.rotation.x += dt * 5;

        // Bounce on floor
        if (p.mesh.position.y <= 0.15) {
          p.mesh.position.y = 0.15;
          p.velocity.y = -p.velocity.y * 0.4;
          p.velocity.x *= 0.7;
          p.velocity.z *= 0.7;
        }

        if (now - p.birthTime > p.fuseTime) {
          this.createExplosion(p.mesh.position, 1.8);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      } else if (p.isMissile) {
        if (p.target && p.target.isAlive) {
          const targetPos = p.target.mesh.position.clone();
          targetPos.y += (p.target.height || 2.0) * 0.55;
          const toTarget = targetPos.sub(p.mesh.position).normalize();
          p.dir.lerp(toTarget, 4.5 * dt).normalize();
          p.mesh.lookAt(p.mesh.position.clone().add(p.dir));
        }
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);

        // Check impact against target or enemies
        let hit = false;
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          if (!e.isAlive) continue;
          const eCenter = e.mesh.position.clone();
          eCenter.y += (e.height || 2.0) * 0.55;
          if (p.mesh.position.distanceTo(eCenter) < (e.radius || 1.2) + 0.6) {
            this.createExplosion(p.mesh.position, 1.8);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else if (!p.isEnemy && p.targetPos) {
        // Player Plasma Bolt with direct hit destination
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);

        const elapsed = now - p.birthTime;
        if (elapsed >= p.flightTime || p.mesh.position.distanceTo(p.startPos) >= p.startPos.distanceTo(p.targetPos)) {
          // Impact reached!
          if (p.hitEnemy && p.hitEnemy.isAlive) {
            p.hitEnemy.hp -= p.damage;
            this.audio.playHitArmor();
            this.createSparks(p.targetPos, p.color, 14);
            if (p.hitEnemy.hp <= 0) {
              this.killEnemy(p.hitEnemy);
              this.hud.addCommMessage('SUIT AI', `${p.hitEnemy.name} DESTROYED`, 'success');
            }
          } else {
            // Hit ground or world obstacle
            this.createSparks(p.targetPos, p.color, 6);
          }
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Enemy plasma bolt
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);

        if (p.isEnemy) {
          if (p.mesh.position.distanceTo(this.yawObject.position) < 1.4) {
            this.damagePlayer(p.damage, p.mesh.position);
            this.createSparks(p.mesh.position, 0xff2222, 10);
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;

      if (pt.isVoxelDebris) {
        // 3D Voxel Fragment Ballistics & Ground Bounce
        pt.velocity.y -= 18.0 * dt;
        pt.mesh.position.addScaledVector(pt.velocity, dt);
        if (pt.rotVel) {
          pt.mesh.rotation.x += pt.rotVel.x * dt;
          pt.mesh.rotation.y += pt.rotVel.y * dt;
          pt.mesh.rotation.z += pt.rotVel.z * dt;
        }

        // Bounce on pavement
        if (pt.mesh.position.y <= 0.08) {
          pt.mesh.position.y = 0.08;
          pt.velocity.y = -pt.velocity.y * 0.45;
          pt.velocity.x *= 0.70;
          pt.velocity.z *= 0.70;
        }

        // Shrink voxels smoothly as life expires
        const progress = Math.max(0, pt.life / pt.maxLife);
        if (progress < 0.35) {
          const sc = progress / 0.35;
          pt.mesh.scale.set(sc, sc, sc);
        }
      } else if (pt.isPointSystem) {
        const posAttr = pt.pSystem.geometry.attributes.position;
        const arr = posAttr.array;
        for (let j = 0; j < pt.velocities.length / 3; j++) {
          arr[j * 3] += pt.velocities[j * 3] * dt;
          arr[j * 3 + 1] += (pt.velocities[j * 3 + 1] - 9.8 * dt) * dt;
          arr[j * 3 + 2] += pt.velocities[j * 3 + 2] * dt;
        }
        posAttr.needsUpdate = true;
        pt.pSystem.material.opacity = Math.max(0, pt.life / pt.maxLife);
      } else {
        if (pt.mesh) {
          const s = pt.mesh.scale.x + (pt.growRate || 0) * dt;
          pt.mesh.scale.set(s, s, s);
        }
        if (pt.light) {
          pt.light.intensity = Math.max(0, pt.light.intensity - dt * 6);
        }
      }

      if (pt.life <= 0) {
        if (pt.pSystem) {
          this.scene.remove(pt.pSystem);
          pt.pSystem.geometry.dispose();
          pt.pSystem.material.dispose();
        }
        if (pt.mesh) {
          this.scene.remove(pt.mesh);
        }
        if (pt.light) {
          this.scene.remove(pt.light);
        }
        this.particles.splice(i, 1);
      }
    }
  }

  updateMission(dt) {
    if (!this.currentMission) return;

    // Mission timer countdown
    if (this.currentMission.timeRemaining !== null && this.currentMission.timeRemaining !== undefined) {
      this.currentMission.timeRemaining -= dt;
      if (this.currentMission.timeRemaining <= 0) {
        this.currentMission.timeRemaining = 0;
        this.hud.addCommMessage('SUIT AI', 'TIME LIMIT EXPIRED: MISSION ABORTED.', 'warn');
        this.missionDefeat();
        return;
      }
    }

    const now = this.clock.getElapsedTime();
    const playerPos = this.yawObject.position;

    // 1. Check area proximity triggers
    if (this.missionTriggers) {
      for (let i = 0; i < this.missionTriggers.length; i++) {
        const trig = this.missionTriggers[i];
        if (trig.type === 'area' && trig.mesh && trig.onEnter) {
          const dx = playerPos.x - trig.mesh.position.x;
          const dz = playerPos.z - trig.mesh.position.z;
          if (Math.hypot(dx, dz) < (trig.radius || 7.0)) {
            trig.onEnter();
          }
        }
      }
    }

    // 2. Check extraction trigger
    const ext = this.missionTriggers ? this.missionTriggers.find(t => t.type === 'extraction') : null;
    if (ext && ext.mesh) {
      const dx = playerPos.x - ext.mesh.position.x;
      const dz = playerPos.z - ext.mesh.position.z;
      const horizDist = Math.hypot(dx, dz);
      const isReady = this.arePrimaryObjectivesComplete();

      if (horizDist < (ext.radius || 6.5)) {
        if (isReady) {
          // All primary field objectives are done! Evacuate now!
          const extObj = this.currentMission.objectives.find(o => this.isExtractionObjective(o));
          if (extObj) extObj.done = true;
          this.missionVictory();
          return;
        } else {
          // Standing on extraction pad while objectives incomplete: warn periodically
          if (now - (this.lastExtractWarnTime || 0) > 4.0) {
            this.lastExtractWarnTime = now;
            const remaining = this.getIncompleteObjectiveSummary();
            this.hud.addCommMessage('REBEL COMMAND', `EXTRACTION LOCKED: Complete primary objectives first! Remaining: ${remaining}`, 'warn');
            this.audio.playAlarm();
          }
        }
      }
    }

    // 3. Check interaction prompt nearby
    let activePrompt = null;
    let closestPromptDist = Infinity;
    const tempPos = new THREE.Vector3();

    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const obj = this.interactiveObjects[i];
      if (!obj || obj.disabled) continue;
      if (obj.mesh && !obj.mesh.parent && !obj.position) continue;

      let ox = 0, oz = 0;
      if (obj.position) {
        ox = obj.position.x;
        oz = obj.position.z;
      } else if (obj.mesh) {
        obj.mesh.getWorldPosition(tempPos);
        ox = tempPos.x;
        oz = tempPos.z;
      }

      const dx = playerPos.x - ox;
      const dz = playerPos.z - oz;
      const dist = Math.hypot(dx, dz);
      const maxDist = obj.interactDist || 7.0;

      if (dist < maxDist && dist < closestPromptDist) {
        if (obj.prompt) {
          closestPromptDist = dist;
          activePrompt = typeof obj.prompt === 'function' ? obj.prompt() : obj.prompt;
        }
      }
    }

    if (activePrompt) {
      this.hud.showInteraction(activePrompt);
    } else {
      this.hud.hideInteraction();
    }
  }

  updateHUD(dt) {
    this.hud.update(
      this.player,
      this.currentMission,
      this.enemies,
      this.interactiveObjects,
      dt
    );
  }
}

window.GameEngine = GameEngine;

// Global bootstrap on window load
window.addEventListener('DOMContentLoaded', () => {
  window.Game = new GameEngine();
  window.Game.init();
});
