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

    // Bind event handlers
    this.initInputs();
    this.initUI();
  }

  // =========================================================================
  // INITIALIZATION & SETUP
  // =========================================================================

  init() {
    this.initThree();
    this.hud = new HUDSystem();

    // Start title screen music and display
    this.showTitleScreen();

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
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

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x060c14);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x446688, 0x111622, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x7799bb, 0.8);
    dirLight.position.set(50, 80, 40);
    this.scene.add(dirLight);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
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
    const btnCampaign = document.getElementById('btn-title-campaign');
    const btnTraining = document.getElementById('btn-title-training');
    const btnArmory = document.getElementById('btn-title-armory');
    const btnSettings = document.getElementById('btn-title-settings');
    const btnIntel = document.getElementById('btn-title-intel');

    if (btnCampaign) btnCampaign.onclick = () => this.showMissionSelect();
    if (btnTraining) btnTraining.onclick = () => this.startMission('training');
    if (btnArmory) btnArmory.onclick = () => this.showArmory();
    if (btnSettings) btnSettings.onclick = () => this.showSettings();
    if (btnIntel) btnIntel.onclick = () => this.showIntel();

    // Mission Select & Briefing buttons
    const btnStartMission = document.getElementById('btn-briefing-deploy');
    const btnBriefingArmory = document.getElementById('btn-briefing-armory');
    const btnBriefingBack = document.getElementById('btn-briefing-back');

    if (btnStartMission) btnStartMission.onclick = () => this.startMission(this.currentMissionId);
    if (btnBriefingArmory) btnBriefingArmory.onclick = () => this.showArmory();
    if (btnBriefingBack) btnBriefingBack.onclick = () => this.showTitleScreen();

    // Armory buttons
    const btnArmoryDeploy = document.getElementById('btn-armory-deploy');
    const btnArmoryBack = document.getElementById('btn-armory-back');
    if (btnArmoryDeploy) btnArmoryDeploy.onclick = () => this.startMission(this.currentMissionId);
    if (btnArmoryBack) btnArmoryBack.onclick = () => this.showBriefing(this.currentMissionId);

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

  showTitleScreen() {
    this.state = 'TITLE';
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

  showArmory() {
    this.state = 'ARMORY';
    this.populateArmoryUI();
    this.showModal('armory-screen');
  }

  populateArmoryUI() {
    const loadout = this.player.loadout;
    loadout.applyMissionPreset(this.currentMissionId);

    // Primary weapon options
    const priContainer = document.getElementById('armory-pri-list');
    if (priContainer) {
      priContainer.innerHTML = '';
      ['ppc_40w', 'ppc_60w', 'ppc_80w', 'ppc_100w'].forEach(id => {
        const item = WEAPON_REGISTRY[id];
        const div = document.createElement('div');
        div.className = `item-option ${loadout.primaryWeapon === id ? 'active' : ''}`;
        div.innerHTML = `<div><strong>${item.name}</strong><br><small>${item.desc}</small></div>`;
        div.onclick = () => {
          loadout.setPrimary(id);
          this.populateArmoryUI();
          this.audio.playUI('click');
        };
        priContainer.appendChild(div);
      });
    }

    // Secondary weapon options
    const secContainer = document.getElementById('armory-sec-list');
    if (secContainer) {
      secContainer.innerHTML = '';
      ['grenade', 'missile', 'mine'].forEach(id => {
        const item = WEAPON_REGISTRY[id];
        const div = document.createElement('div');
        div.className = `item-option ${loadout.secondaryWeapon === id ? 'active' : ''}`;
        div.innerHTML = `<div><strong>${item.name}</strong> (${loadout.ammo[id] || 0})<br><small>${item.desc}</small></div>`;
        div.onclick = () => {
          loadout.setSecondary(id);
          this.populateArmoryUI();
          this.audio.playUI('click');
        };
        secContainer.appendChild(div);
      });
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
      { id: 'forward', label: 'Move Forward' },
      { id: 'backward', label: 'Move Backward' },
      { id: 'strafeLeft', label: 'Strafe Left' },
      { id: 'strafeRight', label: 'Strafe Right' },
      { id: 'firePrimary', label: 'Fire Primary PPC' },
      { id: 'fireSecondary', label: 'Fire Secondary' },
      { id: 'interact', label: 'Interact / Operate' },
      { id: 'cycleWeapon', label: 'Cycle Weapon' }
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
      btn.onclick = () => this.startKeyRebind(act.id, btn);

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
    this.yawObject.rotation.set(0, 0, 0);
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
  }

  updateWeaponViewModel() {
    if (this.weaponViewModel) {
      this.camera.remove(this.weaponViewModel);
    }
    this.weaponViewModel = ModelFactory.createWeaponViewModel(this.player.loadout.primaryWeapon);
    this.camera.add(this.weaponViewModel);
  }

  buildMissionWorld(mission) {
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

    // Re-add lights and player camera rig
    const hemiLight = new THREE.HemisphereLight(0x446688, 0x111622, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x7799bb, 0.8);
    dirLight.position.set(50, 80, 40);
    this.scene.add(dirLight);

    this.scene.add(this.yawObject);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = (mission.environment === 'bunker' || mission.environment === 'core')
      ? ModelFactory.materials.bunkerFloor
      : ModelFactory.materials.concrete;
    const ground = new THREE.Mesh(groundGeo, groundMat);
    this.scene.add(ground);

    // Boundary walls around sector
    this.buildPerimeterWalls(240, 240);

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
    this.missionTriggers.push({
      type: 'extraction',
      mesh: extraction,
      radius: 4.5,
      coord: extCoord
    });
  }

  buildPerimeterWalls(width, depth) {
    const wallMat = ModelFactory.materials.darkMetal;
    const h = 20;

    const northWall = new THREE.Mesh(new THREE.BoxGeometry(width, h, 2), wallMat);
    northWall.position.set(width / 2, h / 2, 0);
    this.scene.add(northWall);
    this.colliders.push({ box: new THREE.Box3().setFromObject(northWall) });

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

    // Relay Station at [15, 16]
    const relay = ModelFactory.createRelayTower();
    relay.position.set(15 * 2, 0, 16 * 2);
    this.scene.add(relay);

    // Underground Lab Entrance at [25, 48]
    const labDoor = ModelFactory.createBlastDoor('LAB');
    labDoor.position.set(25 * 2, 0, 48 * 2);
    this.scene.add(labDoor);
    this.interactiveObjects.push({
      mesh: labDoor,
      type: 'door',
      prompt: '[E] ENTER UNDERGROUND LAB',
      onInteract: () => {
        this.completeObjective('enter_lab');
        this.hud.addCommMessage('SUIT AI', 'Access granted to Underground Research Facility.', 'success');
        this.audio.playElevator();
      }
    });

    // Telemetry Data at [82, 64]
    const telemetry = ModelFactory.createCommGrid();
    telemetry.position.set(82 * 2, 0, 64 * 2);
    this.scene.add(telemetry);
    this.interactiveObjects.push({
      mesh: telemetry,
      type: 'pickup',
      prompt: '[E] DOWNLOAD TELEMETRY DATA',
      onInteract: () => {
        this.completeObjective('get_telemetry');
        this.hud.addCommMessage('JOHN CONNOR', 'Telemetry data secured! Evacuate immediately to extraction!', 'success');
        this.audio.playItemPickup();
      }
    });

    // Spawn Enemy Patrols
    this.spawnEnemy('t800', 18 * 2, 22 * 2);
    this.spawnEnemy('t800', 28 * 2, 45 * 2);
    this.spawnEnemy('g500', 50 * 2, 40 * 2);
    this.spawnEnemy('spider', 75 * 2, 60 * 2);
    this.spawnEnemy('hk_aerial', 60 * 2, 50 * 2);
  }

  // MISSION 2: Relay Tower 1 [6, 109], Comm Grid [25, 111], Relay Tower 2 [44, 108]
  buildMission2Sector() {
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
          this.hud.addCommMessage('SUIT AI', 'ERROR: Proximity Mine required in inventory!', 'warn');
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
          this.hud.addCommMessage('SUIT AI', 'ERROR: Proximity Mine required in inventory!', 'warn');
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

    // Underground Entrance [16, 47]
    const entrance = ModelFactory.createBlastDoor('SEC-9');
    entrance.position.set(16 * 2, 0, 47 * 2);
    this.scene.add(entrance);
    this.interactiveObjects.push({
      mesh: entrance,
      type: 'door',
      prompt: '[E] INFILTRATE RESEARCH SUB-LEVEL',
      onInteract: () => {
        this.completeObjective('enter_complex');
        this.audio.playElevator();
        this.hud.addCommMessage('SUIT AI', 'Descent to Sub-Level 1 initiated.', 'normal');
      }
    });

    // Time Distortion Device at [81, 25]
    const device = ModelFactory.createTimeDistortionDevice();
    device.position.set(81 * 2, 0, 25 * 2);
    this.scene.add(device);
    this.interactiveObjects.push({
      mesh: device,
      type: 'device',
      prompt: '[E] SCAN & SECURE TIME DISTORTION DEVICE',
      onInteract: () => {
        this.completeObjective('secure_device');
        this.completeObjective('elevator_l2');
        this.completeObjective('elevator_l3');
        this.hud.addCommMessage('JOHN CONNOR', 'Time Distortion Device secured! Chronal telemetry logged! Mission Accomplished!', 'success');
        this.audio.playItemPickup();
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
      const door = ModelFactory.createBlastDoor(`G-${g.id}`);
      door.position.set(g.x * 2, 0, g.y * 2);
      this.scene.add(door);
      this.interactiveObjects.push({
        mesh: door,
        type: 'door',
        prompt: `[E] BREACH GATE ${g.id}`,
        onInteract: () => {
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
      prompt: '[E] ENTER OVERRIDE CODE: 38473-ENABLE',
      onInteract: () => {
        this.completeObjective('underground_code');
        this.hud.addCommMessage('SUIT AI', 'Code Accepted: 38473-ENABLE. Perimeter barrier deactivated.', 'success');
        this.audio.playElevator();
      }
    });

    // Defense Network Core at [9, 168]
    const core = ModelFactory.createCommGrid();
    core.position.set(9 * 2, 0, 168 * 2);
    this.scene.add(core);
    this.interactiveObjects.push({
      mesh: core,
      type: 'demolish',
      prompt: '[E] DEMOLISH DEFENSE NETWORK CORE WITH MINE',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('destroy_defense');
          this.createExplosion(core.position, 3.0);
          this.scene.remove(core);
          this.hud.addCommMessage('JOHN CONNOR', 'Defense Network destroyed! Sprint to elevator [25, 140]!', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ERROR: Proximity Mine required!', 'warn');
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
    // Comm Base Gamma Entrance [111, 48]
    const entrance = ModelFactory.createBlastDoor('GAMMA');
    entrance.position.set(111 * 2, 0, 48 * 2);
    this.scene.add(entrance);
    this.interactiveObjects.push({
      mesh: entrance,
      type: 'door',
      prompt: '[E] BREACH COMM BASE GAMMA',
      onInteract: () => {
        this.completeObjective('enter_gamma');
        this.completeObjective('elevator_down');
        this.hud.addCommMessage('SUIT AI', 'Entered Gamma Sub-Level. Major Altorrez vitals detected at [27, 85].', 'warn');
      }
    });

    // Major Altorrez at [27, 85]
    const altorrez = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8), ModelFactory.materials.hazard);
    altorrez.position.set(27 * 2, 0.7, 85 * 2);
    this.scene.add(altorrez);
    this.interactiveObjects.push({
      mesh: altorrez,
      type: 'npc',
      prompt: '[E] ADMINISTER AUTODOC MEDPACK TO MAJOR ALTORREZ',
      onInteract: () => {
        if (this.player.loadout.hasItem('medpack')) {
          this.player.loadout.removeItem('medpack', 1);
          this.completeObjective('rescue_altorrez');
          this.completeObjective('elevator_up');
          this.hud.addCommMessage('MAJOR ALTORREZ', '"Thanks soldier... vitals stabilized. Carry me to the surface [64, 1]!"', 'success');
          this.audio.playItemPickup();
        } else {
          this.hud.addCommMessage('SUIT AI', 'ERROR: Autodoc Medpack required in inventory!', 'warn');
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

    // Gamma Base Entrance [10, 47]
    const baseDoor = ModelFactory.createBlastDoor('GAMMA');
    baseDoor.position.set(10 * 2, 0, 47 * 2);
    this.scene.add(baseDoor);
    this.interactiveObjects.push({
      mesh: baseDoor,
      type: 'door',
      prompt: '[E] SWIPE GAMMA CARD TO OPEN BLAST DOOR',
      onInteract: () => {
        if (this.player.loadout.hasItem('card_gamma')) {
          this.completeObjective('breach_base');
          this.scene.remove(baseDoor);
          this.hud.addCommMessage('SUIT AI', 'Gamma clearance accepted. Vault doors open.', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ACCESS DENIED: Gamma Access Card required in inventory slots 1-5!', 'warn');
        }
      }
    });

    // Time Distortion Equipment [69, 36]
    const chronos = ModelFactory.createTimeDistortionDevice();
    chronos.position.set(69 * 2, 0, 36 * 2);
    this.scene.add(chronos);
    this.interactiveObjects.push({
      mesh: chronos,
      type: 'demolish',
      prompt: '[E] DEMOLISH TIME DISTORTION EQUIPMENT WITH MINE',
      onInteract: () => {
        if (this.player.loadout.hasItem('mine')) {
          this.player.loadout.removeItem('mine', 1);
          this.completeObjective('destroy_chronos');
          this.createExplosion(chronos.position, 3.5);
          this.scene.remove(chronos);
          this.hud.addCommMessage('JOHN CONNOR', 'Temporal equipment vaporized! Extract to [25, 0]!', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ERROR: Proximity Mine required!', 'warn');
        }
      }
    });

    this.spawnEnemy('t800', 20 * 2, 20 * 2);
    this.spawnEnemy('hk_aerial', 35 * 2, 25 * 2);
    this.spawnEnemy('t800', 65 * 2, 38 * 2);
  }

  // MISSION 7: Launch Complex [173, 47], Nexus Controls [142, 82] & [142, 84], Viral-X [141, 83]
  buildMission7Sector() {
    // Launch Complex Entrance [173, 47]
    const siloGate = ModelFactory.createBlastDoor('SILO');
    siloGate.position.set(173 * 2, 0, 47 * 2);
    this.scene.add(siloGate);
    this.interactiveObjects.push({
      mesh: siloGate,
      type: 'door',
      prompt: '[E] BREACH LAUNCH COMPLEX',
      onInteract: () => {
        this.completeObjective('enter_launch');
        this.hud.addCommMessage('SUIT AI', 'Launch Silo penetrated. Nexus Control nodes detected at [142, 82] & [142, 84].', 'warn');
      }
    });

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

    // Alpha Door at [94, 85]
    const alphaDoor = ModelFactory.createBlastDoor('ALPHA');
    alphaDoor.position.set(94 * 2, 0, 85 * 2);
    this.scene.add(alphaDoor);
    this.interactiveObjects.push({
      mesh: alphaDoor,
      type: 'door',
      prompt: '[E] UNLOCK ALPHA DOOR WITH ALPHA CARD',
      onInteract: () => {
        if (this.player.loadout.hasItem('card_alpha')) {
          this.completeObjective('unlock_alpha_door');
          this.scene.remove(alphaDoor);
          this.hud.addCommMessage('SUIT AI', 'Alpha Barrier unlocked. Access to Core elevator cleared.', 'success');
        } else {
          this.hud.addCommMessage('SUIT AI', 'ACCESS DENIED: Alpha Sector Card required!', 'warn');
        }
      }
    });

    // Skynet Reactor Core at [120, 180]
    const reactor = ModelFactory.createReactorCore();
    reactor.position.set(120 * 2, 0, 180 * 2);
    this.scene.add(reactor);
    this.interactiveObjects.push({
      mesh: reactor,
      type: 'reactor',
      prompt: '[E] OVERLOAD SKYNET CENTRAL REACTOR CORE WITH MINES',
      onInteract: () => {
        this.completeObjective('destroy_reactor');
        this.completeObjective('reach_reactor');
        this.createExplosion(reactor.position, 5.0);
        this.hud.addCommMessage('JOHN CONNOR', 'REACTOR CRITICAL! RUN TO SHUTTLE BAY [26, 237] BEFORE IMPLOSION!', 'warn');
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
      radius: mesh.userData.radius || 1.0,
      height: mesh.userData.height || 2.0,
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

    // Play synthesized sound
    this.audio[weapon.sound](weapon.soundArg);

    // Recoil animation
    this.weaponRecoil = 0.08;

    // Spawn Projectile
    const spawnPos = this.yawObject.position.clone();
    spawnPos.y += 0.1; // adjust to eye level
    const dir = this.player.getForwardVector();

    const projGeo = new THREE.CylinderGeometry(0.04 * weapon.projScale, 0.04 * weapon.projScale, 1.2 * weapon.projScale, 8);
    projGeo.rotateX(Math.PI / 2);
    const projMat = new THREE.MeshBasicMaterial({ color: weapon.projColor });
    const projMesh = new THREE.Mesh(projGeo, projMat);

    projMesh.position.copy(spawnPos);
    projMesh.quaternion.copy(this.camera.quaternion);
    this.scene.add(projMesh);

    this.projectiles.push({
      mesh: projMesh,
      dir: dir,
      speed: weapon.projSpeed,
      damage: weapon.damage,
      isEnemy: false,
      birthTime: now,
      life: 2.5
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

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8),
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
  }

  launchHomingMissile() {
    const now = this.clock.getElapsedTime();
    const spawnPos = this.yawObject.position.clone();
    const dir = this.player.getForwardVector();

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8),
      ModelFactory.materials.chrome
    );
    mesh.rotateX(Math.PI / 2);
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

    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 0.15, 12),
      ModelFactory.materials.darkMetal
    );
    mesh.position.copy(pos);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), ModelFactory.materials.redEye);
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
  }

  cyclePrimaryWeapon() {
    const loadout = this.player.loadout;
    const weapons = ['ppc_40w', 'ppc_60w', 'ppc_80w', 'ppc_100w'];
    const curIdx = weapons.indexOf(loadout.primaryWeapon);
    const nextIdx = (curIdx + 1) % weapons.length;
    loadout.setPrimary(weapons[nextIdx]);
    this.updateWeaponViewModel();
    this.audio.playUI('select');
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
    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const obj = this.interactiveObjects[i];
      if (!obj.mesh) continue;
      const dist = playerPos.distanceTo(obj.mesh.position);
      if (dist < 4.0) {
        if (obj.onInteract) {
          obj.onInteract();
          return;
        }
      }
    }
  }

  createExplosion(pos, scale = 1.0) {
    this.audio.playExplosion(scale);

    // Flash light
    const light = new THREE.PointLight(0xff6600, 4 * scale, 30 * scale);
    light.position.copy(pos);
    this.scene.add(light);

    // Fireball mesh
    const fireGeo = new THREE.SphereGeometry(2.5 * scale, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4400, wireframe: true });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    fireball.position.copy(pos);
    this.scene.add(fireball);

    this.particles.push({
      mesh: fireball,
      light: light,
      life: 0.5,
      maxLife: 0.5,
      growRate: 6 * scale
    });

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
      this.updatePlayer(dt);
      this.updateWeapons(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateParticles(dt);
      this.updateMission(dt);
      this.updateHUD(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updatePlayer(dt) {
    if (!this.player.isAlive) return;

    // Movement Vectors
    const moveDir = new THREE.Vector3();
    const cfg = this.config;

    if (cfg.isActionPressed('forward', this.keys, this.mouseButtons)) moveDir.z -= 1;
    if (cfg.isActionPressed('backward', this.keys, this.mouseButtons)) moveDir.z += 1;
    if (cfg.isActionPressed('strafeLeft', this.keys, this.mouseButtons)) moveDir.x -= 1;
    if (cfg.isActionPressed('strafeRight', this.keys, this.mouseButtons)) moveDir.x += 1;

    // Classic keyboard turning support
    if (cfg.settings.controlMode === 'classic') {
      if (this.keys['ArrowLeft'] || this.keys['KeyQ']) {
        this.yawObject.rotation.y += cfg.settings.smoothTurnSpeed * dt;
      }
      if (this.keys['ArrowRight'] || this.keys['KeyE']) {
        this.yawObject.rotation.y -= cfg.settings.smoothTurnSpeed * dt;
      }
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Apply yaw rotation to movement
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yawObject.rotation.y);

      this.player.position.addScaledVector(moveDir, this.player.speed * dt);
      this.yawObject.position.copy(this.player.position);
      this.yawObject.position.y = this.player.height;
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
      if (dist < enemy.attackRange && dist > 8.0) {
        const dir = playerPos.clone().sub(enemy.mesh.position).normalize();
        if (!enemy.isFlying) dir.y = 0;
        enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
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

    const boltGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6);
    boltGeo.rotateX(Math.PI / 2);
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
          const toTarget = p.target.mesh.position.clone().sub(p.mesh.position).normalize();
          p.dir.lerp(toTarget, 4.5 * dt).normalize();
          p.mesh.lookAt(p.mesh.position.clone().add(p.dir));
        }
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);

        // Check impact
        if (p.target && p.target.isAlive && p.mesh.position.distanceTo(p.target.mesh.position) < 2.0) {
          this.createExplosion(p.mesh.position, 1.5);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      } else {
        // Standard plasma bolt
        p.mesh.position.addScaledVector(p.dir, p.speed * dt);

        if (p.isEnemy) {
          // Check hit against player
          if (p.mesh.position.distanceTo(this.yawObject.position) < 1.4) {
            this.damagePlayer(p.damage, p.mesh.position);
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
            continue;
          }
        } else {
          // Check hit against enemies
          let hit = false;
          for (let j = 0; j < this.enemies.length; j++) {
            const e = this.enemies[j];
            if (!e.isAlive) continue;
            if (p.mesh.position.distanceTo(e.mesh.position) < e.radius + 0.4) {
              e.hp -= p.damage;
              hit = true;
              this.audio.playHitArmor();
              if (e.hp <= 0) this.killEnemy(e);
              break;
            }
          }
          if (hit) {
            this.scene.remove(p.mesh);
            this.projectiles.splice(i, 1);
          }
        }
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.mesh) {
        const s = pt.mesh.scale.x + pt.growRate * dt;
        pt.mesh.scale.set(s, s, s);
      }
      if (pt.light) {
        pt.light.intensity = Math.max(0, pt.light.intensity - dt * 6);
      }
      if (pt.life <= 0) {
        if (pt.mesh) this.scene.remove(pt.mesh);
        if (pt.light) this.scene.remove(pt.light);
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

    // Check extraction trigger
    const ext = this.missionTriggers.find(t => t.type === 'extraction');
    if (ext) {
      const dist = this.yawObject.position.distanceTo(ext.mesh.position);
      if (dist < ext.radius) {
        const allDone = this.currentMission.objectives.every(o => o.done);
        if (allDone) {
          this.missionVictory();
        }
      }
    }

    // Check interaction prompt nearby
    let activePrompt = null;
    const playerPos = this.yawObject.position;
    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const obj = this.interactiveObjects[i];
      if (!obj.mesh) continue;
      if (playerPos.distanceTo(obj.mesh.position) < 4.0 && obj.prompt) {
        activePrompt = obj.prompt;
        break;
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

// Global bootstrap on window load
window.addEventListener('DOMContentLoaded', () => {
  window.Game = new GameEngine();
  window.Game.init();
});
