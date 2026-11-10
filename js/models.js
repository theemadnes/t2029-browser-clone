/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   Procedural 3D Mesh Generator & Visual Assets (Three.js)
   ========================================================================== */

const ModelFactory = {
  // Shared materials for optimal performance
  materials: null,

  createCanvasTexture(width, height, drawFn) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  },

  initMaterials() {
    if (this.materials) return;

    // Procedural grid texture for wasteland ground
    let groundTexture = null;
    let hazardTexture = null;
    let wallTexture = null;

    if (typeof document !== 'undefined') {
      groundTexture = this.createCanvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#0f141a';
        ctx.fillRect(0, 0, w, h);
        // Distressed asphalt speckles
        for (let i = 0; i < 400; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const r = Math.random() * 2 + 1;
          ctx.fillStyle = Math.random() > 0.5 ? '#1a222c' : '#080b0f';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Cyber grid lines
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.stroke();
      });
      if (groundTexture) groundTexture.repeat.set(80, 80);

      // Hazard stripes texture
      hazardTexture = this.createCanvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111';
        ctx.beginPath();
        for (let i = -w; i < w * 2; i += 32) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 16, 0);
          ctx.lineTo(i + 16 - h, h);
          ctx.lineTo(i - h, h);
        }
        ctx.fill();
      });
      if (hazardTexture) hazardTexture.repeat.set(4, 1);

      // Bunker wall panels texture
      wallTexture = this.createCanvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#1c2229';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#2b343e';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.fillStyle = '#3a4654';
        // Corner bolts
        [16, w - 16].forEach(x => {
          [16, h - 16].forEach(y => {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
          });
        });
      });
      if (wallTexture) wallTexture.repeat.set(4, 2);
    }

    this.materials = {
      // Metallic chassis
      chrome: new THREE.MeshStandardMaterial({
        color: 0x99aab8,
        metalness: 0.9,
        roughness: 0.25
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: 0x22272e,
        metalness: 0.8,
        roughness: 0.4
      }),
      gunmetal: new THREE.MeshStandardMaterial({
        color: 0x3a424a,
        metalness: 0.75,
        roughness: 0.35
      }),
      hazard: new THREE.MeshStandardMaterial({
        color: 0xd4a017,
        map: hazardTexture,
        metalness: 0.3,
        roughness: 0.6
      }),

      // Glowing elements
      redEye: new THREE.MeshBasicMaterial({
        color: 0xff1111
      }),
      cyanGlow: new THREE.MeshBasicMaterial({
        color: 0x00e5ff
      }),
      amberGlow: new THREE.MeshBasicMaterial({
        color: 0xffaa00
      }),
      greenGlow: new THREE.MeshBasicMaterial({
        color: 0x00ff66
      }),

      // Environment
      concrete: new THREE.MeshStandardMaterial({
        color: 0x3b3d40,
        map: groundTexture,
        roughness: 0.85,
        metalness: 0.15
      }),
      ruinBrick: new THREE.MeshStandardMaterial({
        color: 0x483d3b,
        roughness: 0.95,
        metalness: 0.05
      }),
      bunkerWall: new THREE.MeshStandardMaterial({
        color: 0x1f2429,
        map: wallTexture,
        metalness: 0.5,
        roughness: 0.5
      }),
      bunkerFloor: new THREE.MeshStandardMaterial({
        color: 0x14181c,
        map: groundTexture,
        metalness: 0.6,
        roughness: 0.4
      }),
      rustMetal: new THREE.MeshStandardMaterial({
        color: 0x4d3326,
        metalness: 0.6,
        roughness: 0.8
      })
    };
  },

  // =========================================================================
  // FIRST-PERSON WEAPON VIEWMODELS
  // =========================================================================

  createWeaponViewModel(weaponId = 'ppc_40w') {
    this.initMaterials();
    const group = new THREE.Group();

    // Main weapon receiver
    const receiverGeo = new THREE.BoxGeometry(0.14, 0.16, 0.7);
    const receiver = new THREE.Mesh(receiverGeo, this.materials.gunmetal);
    receiver.position.set(0, 0, -0.2);
    group.add(receiver);

    // Stock & Grip
    const gripGeo = new THREE.BoxGeometry(0.08, 0.22, 0.1);
    const grip = new THREE.Mesh(gripGeo, this.materials.darkMetal);
    grip.position.set(0, -0.15, 0.05);
    grip.rotation.x = 0.25;
    group.add(grip);

    // Barrel assembly
    let barrelColor = 0x00e5ff;
    let coilColor = 0x00aacc;
    let barrelRadius = 0.04;
    let barrelLen = 0.65;

    if (weaponId === 'ppc_60w') {
      barrelColor = 0x33b5e5;
      coilColor = 0x0088cc;
      barrelRadius = 0.048;
    } else if (weaponId === 'ppc_80w') {
      barrelColor = 0x9955ff;
      coilColor = 0x6600cc;
      barrelRadius = 0.055;
      barrelLen = 0.75;
    } else if (weaponId === 'ppc_100w') {
      barrelColor = 0xffffff;
      coilColor = 0xffaa00;
      barrelRadius = 0.065;
      barrelLen = 0.85;
    }

    const barrelGeo = new THREE.CylinderGeometry(barrelRadius * 0.9, barrelRadius, barrelLen, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.materials.chrome);
    barrel.position.set(0, 0.02, -0.6);
    group.add(barrel);

    // Glowing energy coil rings
    const coilMat = new THREE.MeshBasicMaterial({ color: coilColor });
    for (let i = 0; i < 4; i++) {
      const coilGeo = new THREE.TorusGeometry(barrelRadius + 0.02, 0.012, 8, 16);
      const coil = new THREE.Mesh(coilGeo, coilMat);
      coil.position.set(0, 0.02, -0.42 - i * 0.1);
      group.add(coil);
    }

    // Muzzle emitter cap
    const muzzleMat = new THREE.MeshBasicMaterial({ color: barrelColor });
    const muzzleGeo = new THREE.CylinderGeometry(barrelRadius * 1.1, barrelRadius * 0.8, 0.08, 12);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0.02, -0.6 - barrelLen / 2);
    group.add(muzzle);

    // Top Tactical Scope
    const scopeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 10);
    scopeGeo.rotateX(Math.PI / 2);
    const scope = new THREE.Mesh(scopeGeo, this.materials.darkMetal);
    scope.position.set(0, 0.12, -0.2);
    group.add(scope);

    // Front/Right alignment for FPS view
    group.position.set(0.28, -0.26, -0.5);
    group.scale.set(1.2, 1.2, 1.2);

    return group;
  },

  // =========================================================================
  // SKYNET ENEMY UNITS
  // =========================================================================

  // 1. T-800 Endoskeleton
  createT800() {
    this.initMaterials();
    const t800 = new THREE.Group();

    // Chrome Skull
    const skullGeo = new THREE.BoxGeometry(0.35, 0.42, 0.38);
    const skull = new THREE.Mesh(skullGeo, this.materials.chrome);
    skull.position.set(0, 1.75, 0);
    t800.add(skull);

    // Brow & Jaw
    const jawGeo = new THREE.BoxGeometry(0.24, 0.16, 0.28);
    const jaw = new THREE.Mesh(jawGeo, this.materials.chrome);
    jaw.position.set(0, 1.52, 0.06);
    t800.add(jaw);

    // Glowing Red Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, this.materials.redEye);
    leftEye.position.set(-0.09, 1.76, 0.18);
    const rightEye = new THREE.Mesh(eyeGeo, this.materials.redEye);
    rightEye.position.set(0.09, 1.76, 0.18);
    t800.add(leftEye);
    t800.add(rightEye);

    // Neck & Spine
    const spineGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8);
    const spine = new THREE.Mesh(spineGeo, this.materials.chrome);
    spine.position.set(0, 1.35, -0.05);
    t800.add(spine);

    // Ribcage & Chest Plate
    const chestGeo = new THREE.BoxGeometry(0.65, 0.45, 0.32);
    const chest = new THREE.Mesh(chestGeo, this.materials.chrome);
    chest.position.set(0, 1.38, 0.02);
    t800.add(chest);

    // Pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.48, 0.2, 0.28);
    const pelvis = new THREE.Mesh(pelvisGeo, this.materials.chrome);
    pelvis.position.set(0, 0.95, 0);
    t800.add(pelvis);

    // Arms
    [-0.42, 0.42].forEach(x => {
      const shoulderGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const shoulder = new THREE.Mesh(shoulderGeo, this.materials.chrome);
      shoulder.position.set(x, 1.48, 0);
      t800.add(shoulder);

      const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8);
      const arm = new THREE.Mesh(armGeo, this.materials.chrome);
      arm.position.set(x, 1.25, 0.1);
      arm.rotation.x = -0.4;
      t800.add(arm);
    });

    // Weapon held by T-800: Phased Plasma Rifle
    const rifleGeo = new THREE.BoxGeometry(0.1, 0.12, 0.75);
    const rifle = new THREE.Mesh(rifleGeo, this.materials.darkMetal);
    rifle.position.set(0.2, 1.2, 0.35);
    rifle.rotation.x = -0.2;
    t800.add(rifle);

    const rifleEmitter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8),
      this.materials.redEye
    );
    rifleEmitter.rotateX(Math.PI / 2);
    rifleEmitter.position.set(0.2, 1.22, 0.75);
    t800.add(rifleEmitter);

    // Legs
    [-0.18, 0.18].forEach(x => {
      const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.95, 8);
      const leg = new THREE.Mesh(legGeo, this.materials.chrome);
      leg.position.set(x, 0.48, 0);
      t800.add(leg);

      const footGeo = new THREE.BoxGeometry(0.12, 0.08, 0.24);
      const foot = new THREE.Mesh(footGeo, this.materials.chrome);
      foot.position.set(x, 0.04, 0.06);
      t800.add(foot);
    });

    t800.userData = {
      type: 't800',
      radius: 0.6,
      height: 2.0,
      maxHp: 100,
      damage: 18,
      speed: 3.8,
      attackRange: 45
    };

    return t800;
  },

  // 2. HK-Aerial (Hunter-Killer Aerial Gunship)
  createHKAerial() {
    this.initMaterials();
    const hk = new THREE.Group();

    // Central Aerodynamic Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.9, 3.2, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.materials.darkMetal);
    body.scale.set(1.3, 0.6, 1);
    hk.add(body);

    // Wing Pylons
    const wingGeo = new THREE.BoxGeometry(4.2, 0.12, 0.8);
    const wings = new THREE.Mesh(wingGeo, this.materials.chrome);
    wings.position.set(0, 0.15, -0.3);
    hk.add(wings);

    // Twin Tilt VTOL Turbines / Nacelles
    [-2.1, 2.1].forEach(x => {
      const turbineGeo = new THREE.CylinderGeometry(0.4, 0.45, 1.2, 12);
      const turbine = new THREE.Mesh(turbineGeo, this.materials.darkMetal);
      turbine.position.set(x, 0.2, -0.3);
      turbine.rotation.x = Math.PI / 2;
      hk.add(turbine);

      // Glowing Exhaust Ring
      const exhaustGeo = new THREE.RingGeometry(0.2, 0.38, 12);
      const exhaust = new THREE.Mesh(exhaustGeo, this.materials.cyanGlow);
      exhaust.position.set(x, 0.2, -0.91);
      hk.add(exhaust);
    });

    // Ventral Searchlight & Chin Plasma Cannons
    const searchGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const searchlight = new THREE.Mesh(searchGeo, this.materials.redEye);
    searchlight.position.set(0, -0.35, 0.8);
    hk.add(searchlight);

    // Twin Plasma Barrels
    [-0.35, 0.35].forEach(x => {
      const gunGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8);
      gunGeo.rotateX(Math.PI / 2);
      const gun = new THREE.Mesh(gunGeo, this.materials.chrome);
      gun.position.set(x, -0.32, 1.2);
      hk.add(gun);
    });

    hk.position.y = 8; // Flies above ground
    hk.userData = {
      type: 'hk_aerial',
      radius: 2.2,
      height: 1.5,
      maxHp: 320,
      damage: 28,
      speed: 7.0,
      attackRange: 80,
      isFlying: true
    };

    return hk;
  },

  // 3. HK-Tank (Hunter-Killer Ground Treaded Behemoth)
  createHKTank() {
    this.initMaterials();
    const tank = new THREE.Group();

    // Dual Caterpillar Tracks
    [-1.6, 1.6].forEach(x => {
      const trackGeo = new THREE.BoxGeometry(0.8, 1.1, 4.4);
      const track = new THREE.Mesh(trackGeo, this.materials.darkMetal);
      track.position.set(x, 0.55, 0);
      tank.add(track);

      // Treads plates
      for (let z = -2.0; z <= 2.0; z += 0.5) {
        const plateGeo = new THREE.BoxGeometry(0.85, 0.12, 0.2);
        const plate = new THREE.Mesh(plateGeo, this.materials.rustMetal);
        plate.position.set(x, 1.1, z);
        tank.add(plate);
      }
    });

    // Main Chassis
    const hullGeo = new THREE.BoxGeometry(2.6, 0.9, 3.8);
    const hull = new THREE.Mesh(hullGeo, this.materials.chrome);
    hull.position.set(0, 1.0, 0);
    tank.add(hull);

    // Front Sloped Glacis
    const glacisGeo = new THREE.BoxGeometry(2.4, 0.6, 1.2);
    glacisGeo.rotateX(-0.4);
    const glacis = new THREE.Mesh(glacisGeo, this.materials.gunmetal);
    glacis.position.set(0, 1.1, 1.8);
    tank.add(glacis);

    // Rotating Upper Turret
    const turretGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.8, 12);
    const turret = new THREE.Mesh(turretGeo, this.materials.darkMetal);
    turret.position.set(0, 1.8, -0.2);
    tank.add(turret);

    // Central Red Scanner Visor
    const visorGeo = new THREE.BoxGeometry(0.8, 0.15, 0.3);
    const visor = new THREE.Mesh(visorGeo, this.materials.redEye);
    visor.position.set(0, 1.9, 0.9);
    tank.add(visor);

    // Twin Heavy Plasma Cannons
    [-0.55, 0.55].forEach(x => {
      const gunGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.6, 12);
      gunGeo.rotateX(Math.PI / 2);
      const gun = new THREE.Mesh(gunGeo, this.materials.chrome);
      gun.position.set(x, 1.85, 1.8);
      tank.add(gun);

      const muzzleCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.12, 0.2, 12),
        this.materials.redEye
      );
      muzzleCap.rotateX(Math.PI / 2);
      muzzleCap.position.set(x, 1.85, 3.1);
      tank.add(muzzleCap);
    });

    tank.userData = {
      type: 'hk_tank',
      radius: 2.5,
      height: 2.8,
      maxHp: 550,
      damage: 45,
      speed: 2.8,
      attackRange: 70
    };

    return tank;
  },

  // 4. G-500 / G-1000 Assault Drone
  createG500() {
    this.initMaterials();
    const drone = new THREE.Group();

    // Central Pod
    const podGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const pod = new THREE.Mesh(podGeo, this.materials.darkMetal);
    pod.position.set(0, 1.3, 0);
    drone.add(pod);

    // Glowing Sensor Ring
    const eyeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12);
    eyeGeo.rotateX(Math.PI / 2);
    const eye = new THREE.Mesh(eyeGeo, this.materials.redEye);
    eye.position.set(0, 1.3, 0.48);
    drone.add(eye);

    // Quad Hover Thrusters
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const x = Math.cos(angle) * 0.55;
      const z = Math.sin(angle) * 0.55;

      const thruster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 0.3, 8),
        this.materials.chrome
      );
      thruster.position.set(x, 1.15, z);
      drone.add(thruster);

      const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.12, 8),
        this.materials.amberGlow
      );
      glow.rotateX(Math.PI / 2);
      glow.position.set(x, 0.99, z);
      drone.add(glow);
    }

    drone.userData = {
      type: 'g500',
      radius: 0.7,
      height: 1.6,
      maxHp: 80,
      damage: 14,
      speed: 4.8,
      attackRange: 40
    };

    return drone;
  },

  // 5. Spider Scout (Arachnid Infiltrator)
  createSpiderScout() {
    this.initMaterials();
    const spider = new THREE.Group();

    // Low chassis body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.25, 0.6);
    const body = new THREE.Mesh(bodyGeo, this.materials.darkMetal);
    body.position.set(0, 0.35, 0);
    spider.add(body);

    // Red Cluster Eyes
    [-0.12, 0, 0.12].forEach(x => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        this.materials.redEye
      );
      eye.position.set(x, 0.4, 0.32);
      spider.add(eye);
    });

    // 4 Articulated Hydraulic Legs
    for (let i = 0; i < 4; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const frontBack = (i < 2) ? 0.2 : -0.2;

      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.25, 0.35, frontBack);

      const upperLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
        this.materials.chrome
      );
      upperLeg.position.set(side * 0.18, 0.1, 0);
      upperLeg.rotation.z = -side * 0.8;
      legGroup.add(upperLeg);

      const lowerLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6),
        this.materials.darkMetal
      );
      lowerLeg.position.set(side * 0.36, -0.15, 0);
      lowerLeg.rotation.z = side * 0.5;
      legGroup.add(lowerLeg);

      spider.add(legGroup);
    }

    spider.userData = {
      type: 'spider',
      radius: 0.5,
      height: 0.6,
      maxHp: 60,
      damage: 15,
      speed: 5.5,
      attackRange: 30
    };

    return spider;
  },

  // 6. Automated Defense Turret (Ceiling or Ground)
  createDefenseTurret(isCeiling = false) {
    this.initMaterials();
    const turret = new THREE.Group();

    // Base Mounting Dome
    const baseGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.25, 12);
    const base = new THREE.Mesh(baseGeo, this.materials.darkMetal);
    turret.add(base);

    // Swivel Turret Ball
    const ballGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const ball = new THREE.Mesh(ballGeo, this.materials.chrome);
    ball.position.set(0, isCeiling ? -0.3 : 0.3, 0);
    turret.add(ball);

    // Dual Laser Barrels
    [-0.15, 0.15].forEach(x => {
      const gunGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
      gunGeo.rotateX(Math.PI / 2);
      const gun = new THREE.Mesh(gunGeo, this.materials.gunmetal);
      gun.position.set(x, isCeiling ? -0.3 : 0.3, 0.4);
      turret.add(gun);
    });

    // Red Laser Targeting Dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      this.materials.redEye
    );
    dot.position.set(0, isCeiling ? -0.3 : 0.3, 0.45);
    turret.add(dot);

    turret.userData = {
      type: 'turret',
      radius: 0.6,
      height: 0.8,
      maxHp: 140,
      damage: 20,
      speed: 0, // Stationary
      attackRange: 50
    };

    return turret;
  },

  // =========================================================================
  // ENVIRONMENT MESHES & MISSION PROPS
  // =========================================================================

  // Ruined Skyscraper / Concrete Block
  createRuinBuilding(width = 16, height = 32, depth = 16) {
    this.initMaterials();
    const group = new THREE.Group();

    const buildingGeo = new THREE.BoxGeometry(width, height, depth);
    const building = new THREE.Mesh(buildingGeo, this.materials.concrete);
    building.position.set(0, height / 2, 0);
    group.add(building);

    // Shattered Top / Rubble variation
    const rubbleCount = Math.floor(width / 4);
    for (let i = 0; i < rubbleCount; i++) {
      const rSize = 2 + Math.random() * 3;
      const rGeo = new THREE.BoxGeometry(rSize, rSize * 1.5, rSize);
      const rMesh = new THREE.Mesh(rGeo, this.materials.ruinBrick);
      rMesh.position.set(
        (Math.random() - 0.5) * (width - 2),
        height + rSize / 2,
        (Math.random() - 0.5) * (depth - 2)
      );
      rMesh.rotation.set(Math.random() * 0.3, Math.random() * 0.3, 0);
      group.add(rMesh);
    }

    return group;
  },

  // Relay Tower (Mission 2 objective)
  createRelayTower() {
    this.initMaterials();
    const tower = new THREE.Group();

    // Lattice frame
    const mastGeo = new THREE.CylinderGeometry(0.2, 1.2, 18, 4);
    const mast = new THREE.Mesh(mastGeo, this.materials.chrome);
    mast.position.y = 9;
    tower.add(mast);

    // Satellite Dish
    const dishGeo = new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    dishGeo.rotateX(Math.PI / 3);
    const dish = new THREE.Mesh(dishGeo, this.materials.darkMetal);
    dish.position.set(0, 16, 0.4);
    tower.add(dish);

    // Red Blinking Beacon
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      this.materials.redEye
    );
    beacon.position.set(0, 18.2, 0);
    tower.add(beacon);

    tower.userData = { isObjective: true, hp: 120, name: 'Relay Tower' };
    return tower;
  },

  // Communications Grid (Mission 2 objective)
  createCommGrid() {
    this.initMaterials();
    const grid = new THREE.Group();

    // Central Server Array
    for (let x = -2; x <= 2; x += 1.3) {
      const rackGeo = new THREE.BoxGeometry(0.8, 3.2, 1.4);
      const rack = new THREE.Mesh(rackGeo, this.materials.darkMetal);
      rack.position.set(x, 1.6, 0);
      grid.add(rack);

      // Blinking status lights
      const ledMat = (x === 0) ? this.materials.greenGlow : this.materials.cyanGlow;
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), ledMat);
      led.position.set(x, 2.4, 0.71);
      grid.add(led);
    }

    grid.userData = { isObjective: true, hp: 150, name: 'Communications Grid' };
    return grid;
  },

  // Time Distortion Device (Missions 3 & 6)
  createTimeDistortionDevice() {
    this.initMaterials();
    const device = new THREE.Group();

    // Pedestal Base
    const baseGeo = new THREE.CylinderGeometry(1.4, 1.8, 0.8, 12);
    const base = new THREE.Mesh(baseGeo, this.materials.darkMetal);
    base.position.y = 0.4;
    device.add(base);

    // Core Chronal Energy Orb
    const orbGeo = new THREE.SphereGeometry(0.8, 16, 16);
    const orb = new THREE.Mesh(orbGeo, this.materials.cyanGlow);
    orb.position.y = 2.2;
    device.add(orb);

    // Rotating Gyro Rings
    const ringGeo = new THREE.TorusGeometry(1.3, 0.08, 8, 24);
    const ring1 = new THREE.Mesh(ringGeo, this.materials.chrome);
    ring1.position.y = 2.2;
    device.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, this.materials.chrome);
    ring2.position.y = 2.2;
    ring2.rotation.x = Math.PI / 2;
    device.add(ring2);

    device.userData = {
      isObjective: true,
      name: 'Time Distortion Device',
      ring1: ring1,
      ring2: ring2
    };

    return device;
  },

  // Skynet Reactor Core (Mission 8)
  createReactorCore() {
    this.initMaterials();
    const reactor = new THREE.Group();

    // Giant Cylinder Core
    const coreGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16, 1, true);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0066aa,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 6;
    reactor.add(core);

    // Pulsing Central Energy Rod
    const rodGeo = new THREE.CylinderGeometry(0.8, 0.8, 14, 12);
    const rod = new THREE.Mesh(rodGeo, this.materials.redEye);
    rod.position.y = 6;
    reactor.add(rod);

    // 4 Containment Pylons
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * 4.5;
      const z = Math.sin(angle) * 4.5;

      const pylonGeo = new THREE.CylinderGeometry(0.6, 0.9, 12, 8);
      const pylon = new THREE.Mesh(pylonGeo, this.materials.chrome);
      pylon.position.set(x, 6, z);
      reactor.add(pylon);
    }

    reactor.userData = { isObjective: true, hp: 500, name: 'Skynet Reactor Core' };
    return reactor;
  },

  // Blast Door (Interactive security door)
  createBlastDoor(label = 'ALPHA') {
    this.initMaterials();
    const doorGroup = new THREE.Group();

    // Door Frame
    const frameGeo = new THREE.BoxGeometry(4.2, 5.2, 0.6);
    const frame = new THREE.Mesh(frameGeo, this.materials.darkMetal);
    frame.position.y = 2.5;
    doorGroup.add(frame);

    // Sliding Door Panel
    const panelGeo = new THREE.BoxGeometry(3.6, 4.6, 0.3);
    const panel = new THREE.Mesh(panelGeo, this.materials.chrome);
    panel.position.set(0, 2.5, 0);
    doorGroup.add(panel);

    // Door Label / Access Panel
    const panelSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.3, 0.05),
      this.materials.redEye
    );
    panelSign.position.set(0, 3.8, 0.18);
    doorGroup.add(panelSign);

    doorGroup.userData = {
      isDoor: true,
      code: label,
      isOpen: false,
      panel: panel,
      openProgress: 0
    };

    return doorGroup;
  },

  // Extraction Beacon / Pad
  createExtractionPad() {
    this.initMaterials();
    const pad = new THREE.Group();

    const ringGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.2, 16);
    const ring = new THREE.Mesh(ringGeo, this.materials.darkMetal);
    pad.add(ring);

    // Glowing green beacon ring
    const glowGeo = new THREE.RingGeometry(1.2, 2.2, 16);
    glowGeo.rotateX(-Math.PI / 2);
    const glow = new THREE.Mesh(glowGeo, this.materials.greenGlow);
    glow.position.y = 0.12;
    pad.add(glow);

    // Vertical holographic extraction beam
    const beamGeo = new THREE.CylinderGeometry(0.1, 1.8, 12, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 6;
    pad.add(beam);

    pad.userData = { isExtraction: true };
    return pad;
  },

  // 3D Cinematic Showcase for Title Screen & Menus
  createTitleShowcase() {
    this.initMaterials();
    const showcase = new THREE.Group();

    // Ground platform with glowing grid
    const floorGeo = new THREE.CylinderGeometry(15, 16, 0.4, 32);
    const floor = new THREE.Mesh(floorGeo, this.materials.concrete);
    floor.position.y = -0.2;
    showcase.add(floor);

    // Glowing cyan cyber ring around platform
    const ringGeo = new THREE.RingGeometry(13.8, 14.6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, this.materials.cyanGlow);
    ring.position.y = 0.02;
    showcase.add(ring);

    // Iconic 3D T-800 Endoskeleton in center
    const t800 = this.createT800();
    t800.position.set(0, 0, 0);
    t800.scale.set(1.4, 1.4, 1.4);
    showcase.add(t800);

    // HK-Aerial hovering in sky
    const hk = this.createHKAerial();
    hk.position.set(5, 5.5, -8);
    hk.scale.set(0.8, 0.8, 0.8);
    hk.rotation.y = -0.4;
    showcase.add(hk);

    // Ruined buildings in background
    const b1 = this.createRuinBuilding(8, 25, 8);
    b1.position.set(-14, 0, -18);
    showcase.add(b1);

    const b2 = this.createRuinBuilding(10, 32, 10);
    b2.position.set(15, 0, -22);
    showcase.add(b2);

    // Red and Cyan Dynamic Atmospheric Lights
    const redLight = new THREE.PointLight(0xff2222, 2.8, 25);
    redLight.position.set(0, 2.5, 3);
    showcase.add(redLight);

    const cyanLight = new THREE.PointLight(0x00e5ff, 2.2, 30);
    cyanLight.position.set(-4, 4, 2);
    showcase.add(cyanLight);

    showcase.userData = {
      t800: t800,
      hk: hk,
      ring: ring
    };

    return showcase;
  }
};

window.ModelFactory = ModelFactory;
