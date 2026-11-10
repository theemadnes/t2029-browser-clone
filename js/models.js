/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   Procedural 3D Voxel Engine & 8-Bit Visual Assets (Three.js)
   Authentic 1992 Bethesda DOS / VGA Voxel Reconstruction
   ========================================================================== */

const VoxelBuilder = {
  createBox(w, h, d, mat, x = 0, y = 0, z = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
  },

  addBox(parent, w, h, d, mat, x = 0, y = 0, z = 0) {
    const box = this.createBox(w, h, d, mat, x, y, z);
    parent.add(box);
    return box;
  }
};

const ModelFactory = {
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
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  },

  initMaterials() {
    if (this.materials) return;

    let groundTexture = null;
    let hazardTexture = null;
    let wallTexture = null;
    let buildingTexture = null;

    if (typeof document !== 'undefined') {
      // 1. Post-apocalyptic 8-Bit Ruined Street & Asphalt Texture
      groundTexture = this.createCanvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#1e252d';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#141920';
        ctx.lineWidth = 4;
        for (let x = 0; x < w; x += 64) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 64) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        ctx.fillStyle = '#c8961e';
        for (let y = 16; y < h; y += 48) {
          ctx.fillRect(32, y, 8, 24);
          ctx.fillRect(w - 40, y, 8, 24);
        }

        for (let i = 0; i < 400; i++) {
          const x = (Math.random() * w) | 0;
          const y = (Math.random() * h) | 0;
          ctx.fillStyle = Math.random() > 0.5 ? '#2a333d' : '#10141a';
          ctx.fillRect(x, y, 3, 3);
        }
      });
      if (groundTexture) groundTexture.repeat.set(40, 40);

      // 2. Ruined Building Voxel Brick Facade
      buildingTexture = this.createCanvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#262c33';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#15191f';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);

        for (let y = 8; y < h - 8; y += 24) {
          for (let x = 8; x < w - 8; x += 20) {
            ctx.fillStyle = Math.random() > 0.65 ? '#0a0e14' : '#141a22';
            ctx.fillRect(x, y, 12, 14);
            if (Math.random() > 0.88) {
              ctx.fillStyle = '#00e5ff';
              ctx.fillRect(x + 4, y + 4, 4, 4);
            }
          }
        }
      });
      if (buildingTexture) buildingTexture.repeat.set(2, 6);

      // 3. Hazard Chevron Texture
      hazardTexture = this.createCanvasTexture(64, 64, (ctx, w, h) => {
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#15181c';
        for (let i = -w; i < w * 2; i += 16) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 10, 0);
          ctx.lineTo(i + 10 + h, h);
          ctx.lineTo(i + h, h);
          ctx.closePath();
          ctx.fill();
        }
      });
      if (hazardTexture) hazardTexture.repeat.set(2, 2);

      // 4. Bunker Metal Plate Wall Texture
      wallTexture = this.createCanvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#252c34';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#11161c';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#3d4754';
        [ [8, 8], [w - 12, 8], [8, h - 12], [w - 12, h - 12] ].forEach(([bx, by]) => {
          ctx.fillRect(bx, by, 4, 4);
        });
      });
      if (wallTexture) wallTexture.repeat.set(4, 2);

      // 5. Authentic 1992 Bethesda Bitmap Skyline Panorama
      this.skylineTexture = this.createCanvasTexture(1024, 256, (ctx, w, h) => {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0.0, '#0a121e');
        skyGrad.addColorStop(0.5, '#152233');
        skyGrad.addColorStop(0.8, '#421a16');
        skyGrad.addColorStop(1.0, '#592018');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 180; i++) {
          const sx = (Math.random() * w) | 0;
          const sy = (Math.random() * (h * 0.5)) | 0;
          ctx.fillRect(sx, sy, 2, 2);
        }

        const beams = [120, 360, 600, 840];
        beams.forEach(bx => {
          ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
          ctx.beginPath();
          ctx.moveTo(bx - 8, h);
          ctx.lineTo(bx + 8, h);
          ctx.lineTo(bx + 90, 0);
          ctx.lineTo(bx + 50, 0);
          ctx.closePath();
          ctx.fill();
        });

        ctx.fillStyle = '#0f141d';
        let curX = 0;
        while (curX < w) {
          const bWidth = 18 + ((Math.random() * 30) | 0);
          const bHeight = 40 + ((Math.random() * 110) | 0);
          ctx.fillRect(curX, h - bHeight, bWidth, bHeight);
          curX += bWidth + 2;
        }

        curX = 8;
        while (curX < w) {
          const bWidth = 24 + ((Math.random() * 40) | 0);
          const bHeight = 70 + ((Math.random() * 120) | 0);
          ctx.fillStyle = '#171f2a';
          ctx.fillRect(curX, h - bHeight, bWidth, bHeight);

          for (let wy = h - bHeight + 10; wy < h - 10; wy += 8) {
            for (let wx = curX + 4; wx < curX + bWidth - 4; wx += 6) {
              if (Math.random() > 0.75) {
                ctx.fillStyle = Math.random() > 0.85 ? '#00e5ff' : '#ffaa00';
                ctx.fillRect(wx, wy, 3, 4);
                ctx.fillStyle = '#171f2a';
              }
            }
          }
          curX += bWidth + 6;
        }
      });
    }

    // 8-Bit VGA Flat-Shaded Voxel Materials
    this.materials = {
      chrome: new THREE.MeshStandardMaterial({
        color: 0xc2d0de,
        metalness: 0.88,
        roughness: 0.32,
        flatShading: true
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: 0x2a323c,
        metalness: 0.75,
        roughness: 0.48,
        flatShading: true
      }),
      gunmetal: new THREE.MeshStandardMaterial({
        color: 0x424c58,
        metalness: 0.70,
        roughness: 0.42,
        flatShading: true
      }),
      hazard: new THREE.MeshStandardMaterial({
        color: 0xd4a017,
        map: hazardTexture,
        metalness: 0.25,
        roughness: 0.60,
        flatShading: true
      }),

      redEye: new THREE.MeshBasicMaterial({ color: 0xff1e27 }),
      cyanGlow: new THREE.MeshBasicMaterial({ color: 0x00ffff }),
      amberGlow: new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
      greenGlow: new THREE.MeshBasicMaterial({ color: 0x00ff66 }),
      orangeGlow: new THREE.MeshBasicMaterial({ color: 0xff5500 }),

      concrete: new THREE.MeshStandardMaterial({
        color: 0x4e5660,
        map: groundTexture,
        roughness: 0.85,
        metalness: 0.15,
        flatShading: true
      }),
      ruinBrick: new THREE.MeshStandardMaterial({
        color: 0x3e454e,
        map: buildingTexture,
        roughness: 0.90,
        metalness: 0.10,
        flatShading: true
      }),
      bunkerWall: new THREE.MeshStandardMaterial({
        color: 0x2d343e,
        map: wallTexture,
        metalness: 0.45,
        roughness: 0.55,
        flatShading: true
      }),
      bunkerFloor: new THREE.MeshStandardMaterial({
        color: 0x202730,
        map: groundTexture,
        metalness: 0.50,
        roughness: 0.50,
        flatShading: true
      }),
      rustMetal: new THREE.MeshStandardMaterial({
        color: 0x663c2b,
        metalness: 0.50,
        roughness: 0.85,
        flatShading: true
      }),

      debrisMetal: new THREE.MeshStandardMaterial({
        color: 0x909fae,
        metalness: 0.85,
        roughness: 0.30,
        flatShading: true
      }),
      debrisFire: new THREE.MeshBasicMaterial({ color: 0xff4400 }),
      debrisSmoke: new THREE.MeshBasicMaterial({ color: 0x1e242a })
    };
  },

  // =========================================================================
  // 1. FIRST-PERSON WEAPON VIEWMODEL (3D Voxel Plasma Pulse Cannon)
  // =========================================================================

  createWeaponViewModel(weaponId = 'ppc_40w') {
    this.initMaterials();
    const group = new THREE.Group();

    let barrelColor = 0x00ffff;
    let coilColor = 0x0099cc;
    if (weaponId === 'ppc_60w') {
      barrelColor = 0x33b5e5;
      coilColor = 0x0077b3;
    } else if (weaponId === 'ppc_80w') {
      barrelColor = 0xffaa00;
      coilColor = 0xcc7700;
    } else if (weaponId === 'ppc_100w') {
      barrelColor = 0xff1155;
      coilColor = 0xaa0033;
    }

    const coilMat = new THREE.MeshBasicMaterial({ color: coilColor });
    const muzzleMat = new THREE.MeshBasicMaterial({ color: barrelColor });

    // Voxel Receiver
    VoxelBuilder.addBox(group, 0.16, 0.18, 0.65, this.materials.gunmetal, 0, 0, -0.22);
    VoxelBuilder.addBox(group, 0.12, 0.08, 0.40, this.materials.darkMetal, 0, 0.12, -0.15);

    // Voxel Cooling Fins on Top
    for (let i = 0; i < 5; i++) {
      VoxelBuilder.addBox(group, 0.14, 0.03, 0.03, this.materials.chrome, 0, 0.17, -0.05 - i * 0.06);
    }

    // Voxel Plasma Power Chamber
    VoxelBuilder.addBox(group, 0.10, 0.10, 0.32, coilMat, 0, 0.02, -0.58);
    for (let i = 0; i < 4; i++) {
      VoxelBuilder.addBox(group, 0.14, 0.14, 0.04, this.materials.darkMetal, 0, 0.02, -0.46 - i * 0.08);
    }

    // Voxel Twin Barrel
    VoxelBuilder.addBox(group, 0.06, 0.06, 0.50, this.materials.chrome, -0.035, 0.02, -0.85);
    VoxelBuilder.addBox(group, 0.06, 0.06, 0.50, this.materials.chrome, 0.035, 0.02, -0.85);

    // Voxel Heavy Muzzle Brake
    VoxelBuilder.addBox(group, 0.16, 0.10, 0.10, this.materials.darkMetal, 0, 0.02, -1.12);
    const emitterL = VoxelBuilder.addBox(group, 0.04, 0.04, 0.02, muzzleMat, -0.035, 0.02, -1.18);
    const emitterR = VoxelBuilder.addBox(group, 0.04, 0.04, 0.02, muzzleMat, 0.035, 0.02, -1.18);

    // Voxel Grip & Power Battery
    VoxelBuilder.addBox(group, 0.08, 0.22, 0.12, this.materials.darkMetal, 0, -0.16, 0.05);
    VoxelBuilder.addBox(group, 0.10, 0.20, 0.20, this.materials.gunmetal, 0, -0.12, -0.18);
    VoxelBuilder.addBox(group, 0.02, 0.14, 0.04, this.materials.greenGlow, 0.055, -0.12, -0.18);

    // Voxel Scope
    VoxelBuilder.addBox(group, 0.06, 0.08, 0.22, this.materials.darkMetal, 0, 0.18, -0.22);
    VoxelBuilder.addBox(group, 0.05, 0.05, 0.02, this.materials.redEye, 0, 0.18, -0.11);

    group.position.set(0.32, -0.26, -0.55);
    group.scale.set(1.15, 1.15, 1.15);

    group.userData = {
      basePos: group.position.clone(),
      emitter: emitterL
    };

    return group;
  },

  // =========================================================================
  // 2. 3D VOXEL T-800 ENDOSKELETON
  // =========================================================================

  createT800() {
    this.initMaterials();
    const t800 = new THREE.Group();

    // --- HEAD ---
    const head = new THREE.Group();
    head.position.set(0, 1.62, 0);

    // Cranium
    VoxelBuilder.addBox(head, 0.32, 0.14, 0.32, this.materials.chrome, 0, 0.16, 0);
    VoxelBuilder.addBox(head, 0.38, 0.16, 0.36, this.materials.chrome, 0, 0.04, 0.02);
    VoxelBuilder.addBox(head, 0.40, 0.08, 0.22, this.materials.chrome, 0, -0.04, 0.12);

    // Eye Sockets & Glowing Red Voxel Eyes
    VoxelBuilder.addBox(head, 0.34, 0.10, 0.12, this.materials.darkMetal, 0, -0.08, 0.15);
    VoxelBuilder.addBox(head, 0.06, 0.06, 0.04, this.materials.redEye, -0.09, -0.08, 0.21);
    VoxelBuilder.addBox(head, 0.06, 0.06, 0.04, this.materials.redEye, 0.09, -0.08, 0.21);

    // Cheekbones & Dental Jaw
    VoxelBuilder.addBox(head, 0.28, 0.10, 0.18, this.materials.chrome, 0, -0.16, 0.12);
    VoxelBuilder.addBox(head, 0.18, 0.04, 0.12, this.materials.chrome, 0, -0.22, 0.16); // upper teeth
    VoxelBuilder.addBox(head, 0.16, 0.04, 0.10, this.materials.chrome, 0, -0.26, 0.15); // lower teeth
    VoxelBuilder.addBox(head, 0.24, 0.10, 0.24, this.materials.darkMetal, 0, -0.29, 0.08); // jaw bone
    VoxelBuilder.addBox(head, 0.14, 0.16, 0.14, this.materials.darkMetal, 0, -0.38, 0); // neck
    t800.add(head);

    // --- TORSO ---
    const torso = new THREE.Group();
    torso.position.set(0, 1.05, 0);

    // Clavicle & Chest Ribs
    VoxelBuilder.addBox(torso, 0.88, 0.10, 0.22, this.materials.chrome, 0, 0.32, 0);
    VoxelBuilder.addBox(torso, 0.54, 0.18, 0.28, this.materials.chrome, 0, 0.20, 0.04);
    VoxelBuilder.addBox(torso, 0.50, 0.10, 0.26, this.materials.chrome, 0, 0.08, 0.03);
    VoxelBuilder.addBox(torso, 0.44, 0.09, 0.24, this.materials.chrome, 0, -0.02, 0.02);
    VoxelBuilder.addBox(torso, 0.38, 0.08, 0.22, this.materials.chrome, 0, -0.11, 0.01);

    // Spine Column & Abdominal Hydraulic Pistons
    VoxelBuilder.addBox(torso, 0.14, 0.52, 0.14, this.materials.darkMetal, 0, 0.06, -0.08);
    VoxelBuilder.addBox(torso, 0.08, 0.28, 0.08, this.materials.chrome, -0.14, -0.16, 0.02);
    VoxelBuilder.addBox(torso, 0.08, 0.28, 0.08, this.materials.chrome, 0.14, -0.16, 0.02);

    // Pelvis
    VoxelBuilder.addBox(torso, 0.46, 0.18, 0.26, this.materials.darkMetal, 0, -0.32, 0);
    t800.add(torso);

    // --- LEFT ARM ---
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.46, 1.34, 0);
    VoxelBuilder.addBox(leftArm, 0.16, 0.16, 0.16, this.materials.chrome, 0, 0, 0);
    VoxelBuilder.addBox(leftArm, 0.12, 0.34, 0.12, this.materials.darkMetal, 0, -0.22, 0);
    VoxelBuilder.addBox(leftArm, 0.14, 0.12, 0.14, this.materials.chrome, 0, -0.42, 0);
    VoxelBuilder.addBox(leftArm, 0.12, 0.32, 0.12, this.materials.chrome, 0, -0.62, 0.06);
    VoxelBuilder.addBox(leftArm, 0.10, 0.10, 0.12, this.materials.darkMetal, 0.12, -0.76, 0.22);
    t800.add(leftArm);

    // --- RIGHT ARM ---
    const rightArm = new THREE.Group();
    rightArm.position.set(0.46, 1.34, 0);
    VoxelBuilder.addBox(rightArm, 0.16, 0.16, 0.16, this.materials.chrome, 0, 0, 0);
    VoxelBuilder.addBox(rightArm, 0.12, 0.34, 0.12, this.materials.darkMetal, 0, -0.22, 0);
    VoxelBuilder.addBox(rightArm, 0.14, 0.12, 0.14, this.materials.chrome, 0, -0.42, 0);
    VoxelBuilder.addBox(rightArm, 0.12, 0.32, 0.12, this.materials.chrome, 0, -0.62, 0.06);
    VoxelBuilder.addBox(rightArm, 0.10, 0.10, 0.12, this.materials.darkMetal, -0.10, -0.74, 0.08);
    t800.add(rightArm);

    // --- PHASED PLASMA RIFLE (HELD IN HANDS) ---
    const rifle = new THREE.Group();
    VoxelBuilder.addBox(rifle, 0.12, 0.16, 0.65, this.materials.darkMetal, 0.04, 0.58, 0.32);
    VoxelBuilder.addBox(rifle, 0.09, 0.09, 0.48, this.materials.chrome, 0.04, 0.60, 0.82);
    const rifleEmitter = VoxelBuilder.addBox(rifle, 0.07, 0.07, 0.06, this.materials.cyanGlow, 0.04, 0.60, 1.08);
    VoxelBuilder.addBox(rifle, 0.09, 0.20, 0.14, this.materials.gunmetal, 0.04, 0.44, 0.28);
    VoxelBuilder.addBox(rifle, 0.05, 0.05, 0.22, this.materials.darkMetal, 0.04, 0.70, 0.38);
    VoxelBuilder.addBox(rifle, 0.04, 0.04, 0.02, this.materials.redEye, 0.04, 0.70, 0.50);
    t800.add(rifle);

    // --- LEFT LEG ---
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.76, 0);
    VoxelBuilder.addBox(leftLeg, 0.14, 0.14, 0.14, this.materials.chrome, 0, 0, 0);
    VoxelBuilder.addBox(leftLeg, 0.15, 0.36, 0.15, this.materials.darkMetal, 0, -0.22, 0);
    VoxelBuilder.addBox(leftLeg, 0.18, 0.14, 0.18, this.materials.chrome, 0, -0.44, 0.02);
    VoxelBuilder.addBox(leftLeg, 0.14, 0.36, 0.14, this.materials.chrome, 0, -0.66, 0);
    VoxelBuilder.addBox(leftLeg, 0.06, 0.32, 0.06, this.materials.darkMetal, 0, -0.66, -0.08);
    VoxelBuilder.addBox(leftLeg, 0.18, 0.10, 0.32, this.materials.darkMetal, 0, -0.89, 0.06);
    t800.add(leftLeg);

    // --- RIGHT LEG ---
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.76, 0);
    VoxelBuilder.addBox(rightLeg, 0.14, 0.14, 0.14, this.materials.chrome, 0, 0, 0);
    VoxelBuilder.addBox(rightLeg, 0.15, 0.36, 0.15, this.materials.darkMetal, 0, -0.22, 0);
    VoxelBuilder.addBox(rightLeg, 0.18, 0.14, 0.18, this.materials.chrome, 0, -0.44, 0.02);
    VoxelBuilder.addBox(rightLeg, 0.14, 0.36, 0.14, this.materials.chrome, 0, -0.66, 0);
    VoxelBuilder.addBox(rightLeg, 0.06, 0.32, 0.06, this.materials.darkMetal, 0, -0.66, -0.08);
    VoxelBuilder.addBox(rightLeg, 0.18, 0.10, 0.32, this.materials.darkMetal, 0, -0.89, 0.06);
    t800.add(rightLeg);

    t800.userData = {
      head: head,
      torso: torso,
      leftArm: leftArm,
      rightArm: rightArm,
      leftLeg: leftLeg,
      rightLeg: rightLeg,
      rifleEmitter: rifleEmitter
    };

    return t800;
  },

  // =========================================================================
  // 3. 3D VOXEL HK-AERIAL (FLYING HUNTER-KILLER)
  // =========================================================================

  createHKAerial() {
    this.initMaterials();
    const hk = new THREE.Group();

    // Voxel Fuselage
    VoxelBuilder.addBox(hk, 0.7, 0.45, 1.4, this.materials.gunmetal, 0, 0, 1.2);
    VoxelBuilder.addBox(hk, 0.5, 0.12, 0.15, this.materials.redEye, 0, -0.05, 1.92); // optic scan visor
    VoxelBuilder.addBox(hk, 1.5, 0.75, 2.4, this.materials.darkMetal, 0, 0.15, -0.1);
    VoxelBuilder.addBox(hk, 0.8, 0.30, 2.0, this.materials.gunmetal, 0, 0.58, -0.2);

    // Twin Voxel Tail Fins
    VoxelBuilder.addBox(hk, 0.12, 0.75, 0.9, this.materials.gunmetal, -0.55, 0.70, -1.2);
    VoxelBuilder.addBox(hk, 0.12, 0.75, 0.9, this.materials.gunmetal, 0.55, 0.70, -1.2);

    // Left VTOL Turbine Engine
    const leftTurbine = new THREE.Group();
    leftTurbine.position.set(-1.95, 0.1, -0.1);
    VoxelBuilder.addBox(hk, 1.2, 0.14, 0.6, this.materials.gunmetal, -1.35, 0.1, -0.1); // wing pylon
    VoxelBuilder.addBox(leftTurbine, 0.85, 0.85, 2.0, this.materials.darkMetal, 0, 0, 0);
    VoxelBuilder.addBox(leftTurbine, 0.75, 0.75, 0.15, this.materials.chrome, 0, 0, 0.95);
    VoxelBuilder.addBox(leftTurbine, 0.70, 0.70, 0.25, this.materials.darkMetal, 0, 0, -1.15);
    const leftFlare = VoxelBuilder.addBox(leftTurbine, 0.50, 0.50, 0.50, this.materials.cyanGlow, 0, 0, -1.50);
    hk.add(leftTurbine);

    // Right VTOL Turbine Engine
    const rightTurbine = new THREE.Group();
    rightTurbine.position.set(1.95, 0.1, -0.1);
    VoxelBuilder.addBox(hk, 1.2, 0.14, 0.6, this.materials.gunmetal, 1.35, 0.1, -0.1); // wing pylon
    VoxelBuilder.addBox(rightTurbine, 0.85, 0.85, 2.0, this.materials.darkMetal, 0, 0, 0);
    VoxelBuilder.addBox(rightTurbine, 0.75, 0.75, 0.15, this.materials.chrome, 0, 0, 0.95);
    VoxelBuilder.addBox(rightTurbine, 0.70, 0.70, 0.25, this.materials.darkMetal, 0, 0, -1.15);
    const rightFlare = VoxelBuilder.addBox(rightTurbine, 0.50, 0.50, 0.50, this.materials.cyanGlow, 0, 0, -1.50);
    hk.add(rightTurbine);

    // Chin Dual Plasma Cannon Turret
    const turret = new THREE.Group();
    turret.position.set(0, -0.35, 0.7);
    VoxelBuilder.addBox(turret, 0.5, 0.25, 0.6, this.materials.darkMetal, 0, 0, 0);
    VoxelBuilder.addBox(turret, 0.12, 0.12, 1.1, this.materials.chrome, -0.16, -0.06, 0.65);
    VoxelBuilder.addBox(turret, 0.12, 0.12, 1.1, this.materials.chrome, 0.16, -0.06, 0.65);
    VoxelBuilder.addBox(turret, 0.08, 0.08, 0.1, this.materials.redEye, 0, -0.02, 0.32);
    hk.add(turret);

    hk.userData = {
      leftTurbine: leftTurbine,
      rightTurbine: rightTurbine,
      turret: turret,
      leftFlare: leftFlare,
      rightFlare: rightFlare
    };

    return hk;
  },

  // =========================================================================
  // 4. 3D VOXEL HK-TANK (GROUND HUNTER-KILLER TANK)
  // =========================================================================

  createHKTank() {
    this.initMaterials();
    const tank = new THREE.Group();

    // --- LEFT CATERPILLAR TRACK ASSEMBLY ---
    const leftTrack = new THREE.Group();
    leftTrack.position.set(-1.8, 0.7, 0);
    VoxelBuilder.addBox(leftTrack, 0.9, 1.3, 5.8, this.materials.darkMetal, 0, 0, 0);
    // Voxel Tread Teeth
    for (let z = -2.7; z <= 2.7; z += 0.45) {
      VoxelBuilder.addBox(leftTrack, 0.95, 0.08, 0.25, this.materials.chrome, 0, 0.68, z);
      VoxelBuilder.addBox(leftTrack, 0.95, 0.08, 0.25, this.materials.chrome, 0, -0.68, z);
    }
    VoxelBuilder.addBox(leftTrack, 0.15, 0.9, 5.2, this.materials.gunmetal, -0.52, 0.05, 0);
    tank.add(leftTrack);

    // --- RIGHT CATERPILLAR TRACK ASSEMBLY ---
    const rightTrack = new THREE.Group();
    rightTrack.position.set(1.8, 0.7, 0);
    VoxelBuilder.addBox(rightTrack, 0.9, 1.3, 5.8, this.materials.darkMetal, 0, 0, 0);
    for (let z = -2.7; z <= 2.7; z += 0.45) {
      VoxelBuilder.addBox(rightTrack, 0.95, 0.08, 0.25, this.materials.chrome, 0, 0.68, z);
      VoxelBuilder.addBox(rightTrack, 0.95, 0.08, 0.25, this.materials.chrome, 0, -0.68, z);
    }
    VoxelBuilder.addBox(rightTrack, 0.15, 0.9, 5.2, this.materials.gunmetal, 0.52, 0.05, 0);
    tank.add(rightTrack);

    // --- CHASSIS ---
    VoxelBuilder.addBox(tank, 2.8, 1.1, 4.8, this.materials.darkMetal, 0, 0.9, 0);
    VoxelBuilder.addBox(tank, 2.6, 0.75, 1.6, this.materials.gunmetal, 0, 1.3, 1.9); // sloped glacis
    VoxelBuilder.addBox(tank, 2.4, 0.40, 1.6, this.materials.darkMetal, 0, 1.45, -1.7); // rear deck

    // --- TURRET ---
    const turret = new THREE.Group();
    turret.position.set(0, 1.8, 0.2);
    VoxelBuilder.addBox(turret, 2.6, 1.2, 2.8, this.materials.gunmetal, 0, 0.65, 0);
    VoxelBuilder.addBox(turret, 0.3, 1.0, 2.6, this.materials.darkMetal, -1.25, 0.65, 0);
    VoxelBuilder.addBox(turret, 0.3, 1.0, 2.6, this.materials.darkMetal, 1.25, 0.65, 0);

    // Dual Heavy Plasma Cannons
    const barrels = new THREE.Group();
    barrels.position.set(0, 0.7, 1.4);
    VoxelBuilder.addBox(barrels, 1.8, 0.6, 0.7, this.materials.darkMetal, 0, 0, 0);
    VoxelBuilder.addBox(barrels, 0.32, 0.32, 3.4, this.materials.chrome, -0.55, 0, 1.8);
    VoxelBuilder.addBox(barrels, 0.32, 0.32, 3.4, this.materials.chrome, 0.55, 0, 1.8);
    VoxelBuilder.addBox(barrels, 0.20, 0.20, 0.1, this.materials.cyanGlow, -0.55, 0, 3.52);
    VoxelBuilder.addBox(barrels, 0.20, 0.20, 0.1, this.materials.cyanGlow, 0.55, 0, 3.52);
    turret.add(barrels);

    // Dual High-Intensity Searchlights
    VoxelBuilder.addBox(turret, 0.4, 0.4, 0.4, this.materials.darkMetal, -1.1, 0.9, 1.2);
    VoxelBuilder.addBox(turret, 0.3, 0.3, 0.05, this.materials.amberGlow, -1.1, 0.9, 1.42);
    VoxelBuilder.addBox(turret, 0.4, 0.4, 0.4, this.materials.darkMetal, 1.1, 0.9, 1.2);
    VoxelBuilder.addBox(turret, 0.3, 0.3, 0.05, this.materials.amberGlow, 1.1, 0.9, 1.42);

    // Antenna mast
    VoxelBuilder.addBox(turret, 0.1, 1.2, 0.1, this.materials.chrome, 0.8, 1.5, -0.8);
    tank.add(turret);

    tank.userData = {
      turret: turret,
      barrels: barrels,
      leftTrack: leftTrack,
      rightTrack: rightTrack
    };

    return tank;
  },

  // =========================================================================
  // 5. 3D VOXEL G-500 HUNTER DRONE
  // =========================================================================

  createG500() {
    this.initMaterials();
    const drone = new THREE.Group();

    // Central Voxel Orb
    VoxelBuilder.addBox(drone, 1.1, 1.1, 1.1, this.materials.darkMetal, 0, 0, 0);
    VoxelBuilder.addBox(drone, 0.8, 0.8, 1.25, this.materials.gunmetal, 0, 0, 0);
    const eye = VoxelBuilder.addBox(drone, 0.4, 0.4, 0.15, this.materials.redEye, 0, 0, 0.65);

    // Quad Outrigger Thrusters
    const thrusters = [];
    const angles = [ [ -0.7, 0.7 ], [ 0.7, 0.7 ], [ -0.7, -0.7 ], [ 0.7, -0.7 ] ];
    angles.forEach(([x, y]) => {
      VoxelBuilder.addBox(drone, 0.35, 0.35, 0.9, this.materials.gunmetal, x, y, -0.1);
      const flare = VoxelBuilder.addBox(drone, 0.22, 0.22, 0.25, this.materials.cyanGlow, x, y, -0.6);
      thrusters.push(flare);
    });

    // Underslung Pulse Blaster
    VoxelBuilder.addBox(drone, 0.15, 0.15, 0.6, this.materials.chrome, 0, -0.75, 0.2);

    drone.userData = { eye: eye, thrusters: thrusters };
    return drone;
  },

  // =========================================================================
  // 6. 3D VOXEL SPIDER SCOUT / SEEKER
  // =========================================================================

  createSpiderScout() {
    this.initMaterials();
    const scout = new THREE.Group();

    // Armored Voxel Dome Body
    VoxelBuilder.addBox(scout, 0.85, 0.40, 0.85, this.materials.darkMetal, 0, 0.35, 0);
    VoxelBuilder.addBox(scout, 0.60, 0.20, 0.60, this.materials.gunmetal, 0, 0.58, 0);
    const core = VoxelBuilder.addBox(scout, 0.35, 0.18, 0.35, this.materials.redEye, 0, 0.72, 0);

    // 6 Segmented Voxel Legs
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const leg = new THREE.Group();
      leg.position.set(Math.cos(angle) * 0.42, 0.35, Math.sin(angle) * 0.42);
      leg.rotation.y = -angle;

      VoxelBuilder.addBox(leg, 0.10, 0.10, 0.40, this.materials.chrome, 0, 0.08, 0.20);
      VoxelBuilder.addBox(leg, 0.08, 0.42, 0.08, this.materials.darkMetal, 0, -0.16, 0.40);
      VoxelBuilder.addBox(leg, 0.06, 0.12, 0.12, this.materials.chrome, 0, -0.38, 0.44);

      scout.add(leg);
      legs.push(leg);
    }

    scout.userData = { core: core, legs: legs };
    return scout;
  },

  // =========================================================================
  // 7. 3D VOXEL DEFENSE TURRET
  // =========================================================================

  createDefenseTurret(isCeiling = false) {
    this.initMaterials();
    const group = new THREE.Group();

    // Voxel Mounting Pedestal
    VoxelBuilder.addBox(group, 1.4, 0.25, 1.4, this.materials.darkMetal, 0, 0.12, 0);
    VoxelBuilder.addBox(group, 1.0, 0.30, 1.0, this.materials.gunmetal, 0, 0.35, 0);

    // Swivel Turret Bunker
    const turret = new THREE.Group();
    turret.position.set(0, 0.6, 0);
    VoxelBuilder.addBox(turret, 0.9, 0.8, 0.9, this.materials.gunmetal, 0, 0.4, 0);
    VoxelBuilder.addBox(turret, 0.2, 0.2, 0.1, this.materials.redEye, 0, 0.45, 0.48); // red targeting eye

    // Twin Barrels
    const barrels = new THREE.Group();
    barrels.position.set(0, 0.45, 0.35);
    VoxelBuilder.addBox(barrels, 0.12, 0.12, 1.1, this.materials.chrome, -0.22, 0, 0.55);
    VoxelBuilder.addBox(barrels, 0.12, 0.12, 1.1, this.materials.chrome, 0.22, 0, 0.55);
    VoxelBuilder.addBox(barrels, 0.08, 0.08, 0.06, this.materials.cyanGlow, -0.22, 0, 1.12);
    VoxelBuilder.addBox(barrels, 0.08, 0.08, 0.06, this.materials.cyanGlow, 0.22, 0, 1.12);
    turret.add(barrels);
    group.add(turret);

    if (isCeiling) {
      group.rotation.x = Math.PI;
    }

    group.userData = { turret: turret, barrels: barrels };
    return group;
  },

  // =========================================================================
  // 8. 3D VOXEL RUINED BUILDINGS & ARCHITECTURE
  // =========================================================================

  createRuinBuilding(width = 16, height = 32, depth = 16) {
    this.initMaterials();
    const building = new THREE.Group();

    // Base Tier
    const baseH = height * 0.45;
    VoxelBuilder.addBox(building, width, baseH, depth, this.materials.ruinBrick, 0, baseH / 2, 0);

    // Mid Tier
    const midH = height * 0.35;
    const midW = width * 0.85;
    const midD = depth * 0.85;
    VoxelBuilder.addBox(building, midW, midH, midD, this.materials.ruinBrick, 0, baseH + midH / 2, 0);

    // Jagged Crumbling Top Voxel Spires
    const topH = height * 0.20;
    const spireW = midW * 0.45;
    const spireD = midD * 0.45;
    VoxelBuilder.addBox(building, spireW, topH, spireD, this.materials.ruinBrick, -spireW / 2, baseH + midH + topH / 2, 0);

    // Exposed Twisted Rebar Beams
    VoxelBuilder.addBox(building, 0.15, topH * 0.8, 0.15, this.materials.rustMetal, spireW * 0.3, baseH + midH + topH * 0.4, spireD * 0.3);
    VoxelBuilder.addBox(building, 0.15, topH * 0.6, 0.15, this.materials.rustMetal, spireW * 0.1, baseH + midH + topH * 0.3, -spireD * 0.2);

    // Hollowed Window Openings (Voxel Insets)
    const winMat = this.materials.darkMetal;
    for (let y = 4; y < baseH + midH - 4; y += 6) {
      VoxelBuilder.addBox(building, 2.2, 3.0, 0.4, winMat, -width * 0.3, y, depth / 2 + 0.1);
      VoxelBuilder.addBox(building, 2.2, 3.0, 0.4, winMat, width * 0.3, y, depth / 2 + 0.1);
      VoxelBuilder.addBox(building, 2.2, 3.0, 0.4, winMat, -width * 0.3, y, -depth / 2 - 0.1);
      VoxelBuilder.addBox(building, 2.2, 3.0, 0.4, winMat, width * 0.3, y, -depth / 2 - 0.1);
    }

    // Piles of Voxel Rubble Blocks Around the Base
    const rubbleMat = this.materials.concrete;
    const rubbleCoords = [
      [ width * 0.4, depth * 0.55 ], [ -width * 0.45, depth * 0.52 ],
      [ width * 0.52, -depth * 0.38 ], [ -width * 0.55, -depth * 0.42 ]
    ];
    rubbleCoords.forEach(([rx, rz]) => {
      VoxelBuilder.addBox(building, 2.4, 1.2, 2.2, rubbleMat, rx, 0.6, rz);
      VoxelBuilder.addBox(building, 1.4, 0.8, 1.4, this.materials.rustMetal, rx + 0.6, 1.4, rz);
    });

    return building;
  },

  // =========================================================================
  // 9. 3D VOXEL MISSION STRUCTURES & OBJECTIVES
  // =========================================================================

  createRelayTower() {
    this.initMaterials();
    const tower = new THREE.Group();

    // Voxel Concrete Base
    VoxelBuilder.addBox(tower, 3.2, 0.6, 3.2, this.materials.concrete, 0, 0.3, 0);

    // 4-Legged Voxel Lattice Frame
    const legCoords = [ [-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1] ];
    legCoords.forEach(([lx, lz]) => {
      VoxelBuilder.addBox(tower, 0.35, 12.0, 0.35, this.materials.darkMetal, lx, 6.6, lz);
    });

    // Horizontal Bracing Struts
    for (let y = 3; y <= 11; y += 3) {
      VoxelBuilder.addBox(tower, 2.4, 0.25, 0.25, this.materials.chrome, 0, y, 1.1);
      VoxelBuilder.addBox(tower, 2.4, 0.25, 0.25, this.materials.chrome, 0, y, -1.1);
      VoxelBuilder.addBox(tower, 0.25, 0.25, 2.4, this.materials.chrome, 1.1, y, 0);
      VoxelBuilder.addBox(tower, 0.25, 0.25, 2.4, this.materials.chrome, -1.1, y, 0);
    }

    // Top Platform & Dish
    VoxelBuilder.addBox(tower, 2.8, 0.4, 2.8, this.materials.gunmetal, 0, 12.8, 0);
    VoxelBuilder.addBox(tower, 1.8, 1.8, 0.3, this.materials.chrome, 0, 14.2, 0.8);
    VoxelBuilder.addBox(tower, 0.2, 0.2, 0.8, this.materials.cyanGlow, 0, 14.2, 1.3);

    // Blinking Red Beacon on Mast
    VoxelBuilder.addBox(tower, 0.2, 3.0, 0.2, this.materials.chrome, 0, 15.5, -0.4);
    VoxelBuilder.addBox(tower, 0.4, 0.4, 0.4, this.materials.redEye, 0, 17.2, -0.4);

    return tower;
  },

  createCommGrid() {
    this.initMaterials();
    const grid = new THREE.Group();

    // Mainframe Housing
    VoxelBuilder.addBox(grid, 2.6, 2.2, 1.4, this.materials.darkMetal, 0, 1.1, 0);

    // Sloped Operator Console Desk
    VoxelBuilder.addBox(grid, 2.4, 0.35, 0.9, this.materials.gunmetal, 0, 0.8, 0.8);

    // Glowing 8-Bit Monitors & Data Banks
    VoxelBuilder.addBox(grid, 1.0, 0.75, 0.08, this.materials.cyanGlow, -0.6, 1.6, 0.72);
    VoxelBuilder.addBox(grid, 1.0, 0.75, 0.08, this.materials.greenGlow, 0.6, 1.6, 0.72);

    // Tape Reels & Blinking Indicator LEDs
    for (let y = 0.5; y <= 1.8; y += 0.35) {
      VoxelBuilder.addBox(grid, 0.12, 0.12, 0.04, this.materials.amberGlow, 1.15, y, 0.72);
      VoxelBuilder.addBox(grid, 0.12, 0.12, 0.04, this.materials.redEye, 1.15, y + 0.15, 0.72);
    }

    return grid;
  },

  createTimeDistortionDevice() {
    this.initMaterials();
    const group = new THREE.Group();

    // Stepped Voxel Octagonal Dais
    VoxelBuilder.addBox(group, 7.5, 0.4, 7.5, this.materials.concrete, 0, 0.2, 0);
    VoxelBuilder.addBox(group, 5.8, 0.35, 5.8, this.materials.darkMetal, 0, 0.55, 0);
    VoxelBuilder.addBox(group, 4.2, 0.30, 4.2, this.materials.gunmetal, 0, 0.85, 0);

    // 4 Corner Temporal Emitter Pylons
    const cornerOffsets = [ [-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4] ];
    cornerOffsets.forEach(([cx, cz]) => {
      VoxelBuilder.addBox(group, 0.7, 4.5, 0.7, this.materials.darkMetal, cx, 3.1, cz);
      VoxelBuilder.addBox(group, 0.8, 0.3, 0.8, this.materials.chrome, cx, 5.4, cz);
      VoxelBuilder.addBox(group, 0.5, 0.5, 0.5, this.materials.cyanGlow, cx, 5.8, cz);
    });

    // Central Voxel Temporal Portal Rings
    const ring1 = new THREE.Group();
    ring1.position.set(0, 3.2, 0);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      VoxelBuilder.addBox(ring1, 0.35, 0.35, 0.55, this.materials.chrome, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0);
    }
    group.add(ring1);

    const ring2 = new THREE.Group();
    ring2.position.set(0, 3.2, 0);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      VoxelBuilder.addBox(ring2, 0.30, 0.30, 0.45, this.materials.amberGlow, Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6);
    }
    group.add(ring2);

    // Pulsing Central Chronal Energy Core
    const core = VoxelBuilder.addBox(group, 0.9, 0.9, 0.9, this.materials.cyanGlow, 0, 3.2, 0);

    group.userData = { ring1: ring1, ring2: ring2, core: core };
    return group;
  },

  createReactorCore() {
    this.initMaterials();
    const group = new THREE.Group();

    // Heavy Concrete & Steel Base
    VoxelBuilder.addBox(group, 6.0, 0.8, 6.0, this.materials.concrete, 0, 0.4, 0);
    VoxelBuilder.addBox(group, 4.8, 0.6, 4.8, this.materials.darkMetal, 0, 1.1, 0);

    // 4 Heavy Magnetic Containment Pillars
    const pCoords = [ [-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2] ];
    pCoords.forEach(([px, pz]) => {
      VoxelBuilder.addBox(group, 0.9, 6.5, 0.9, this.materials.gunmetal, px, 4.65, pz);
      VoxelBuilder.addBox(group, 1.1, 0.3, 1.1, this.materials.hazard, px, 7.8, pz);
      VoxelBuilder.addBox(group, 0.6, 0.6, 0.6, this.materials.redEye, px, 8.2, pz);
    });

    // Central Glowing Voxel Reactor Core
    const core = VoxelBuilder.addBox(group, 2.2, 3.2, 2.2, this.materials.redEye, 0, 4.5, 0);
    VoxelBuilder.addBox(group, 2.6, 0.4, 2.6, this.materials.chrome, 0, 6.2, 0);
    VoxelBuilder.addBox(group, 2.6, 0.4, 2.6, this.materials.chrome, 0, 2.8, 0);

    // Rotating Containment Ring
    const ring = new THREE.Group();
    ring.position.set(0, 4.5, 0);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      VoxelBuilder.addBox(ring, 0.4, 0.4, 0.6, this.materials.cyanGlow, Math.cos(a) * 2.8, 0, Math.sin(a) * 2.8);
    }
    group.add(ring);

    group.userData = { core: core, ring: ring };
    return group;
  },

  createBlastDoor(label = 'ALPHA') {
    this.initMaterials();
    const group = new THREE.Group();

    // Heavy Voxel Door Frame
    VoxelBuilder.addBox(group, 0.8, 4.6, 0.8, this.materials.darkMetal, -2.2, 2.3, 0);
    VoxelBuilder.addBox(group, 0.8, 4.6, 0.8, this.materials.darkMetal, 2.2, 2.3, 0);
    VoxelBuilder.addBox(group, 5.2, 0.8, 0.8, this.materials.darkMetal, 0, 4.6, 0);
    VoxelBuilder.addBox(group, 4.8, 0.3, 0.85, this.materials.hazard, 0, 4.3, 0); // hazard stripe header

    // Left and Right Sliding Blast Leaves
    VoxelBuilder.addBox(group, 1.8, 3.8, 0.45, this.materials.gunmetal, -0.9, 2.0, 0);
    VoxelBuilder.addBox(group, 1.8, 3.8, 0.45, this.materials.gunmetal, 0.9, 2.0, 0);

    // Hydraulic Locking Bolts & Warning Lamps
    VoxelBuilder.addBox(group, 0.25, 0.45, 0.55, this.materials.chrome, 0, 2.0, 0);
    VoxelBuilder.addBox(group, 0.25, 0.45, 0.55, this.materials.chrome, 0, 3.0, 0);
    VoxelBuilder.addBox(group, 0.20, 0.20, 0.15, this.materials.redEye, -1.9, 3.6, 0.45);
    VoxelBuilder.addBox(group, 0.20, 0.20, 0.15, this.materials.greenGlow, 1.9, 3.6, 0.45);

    return group;
  },

  createExtractionPad() {
    this.initMaterials();
    const pad = new THREE.Group();

    // Stepped Voxel Octagonal Landing Platform
    VoxelBuilder.addBox(pad, 12.0, 0.4, 12.0, this.materials.concrete, 0, 0.2, 0);
    VoxelBuilder.addBox(pad, 10.0, 0.2, 10.0, this.materials.hazard, 0, 0.5, 0);
    VoxelBuilder.addBox(pad, 7.5, 0.15, 7.5, this.materials.bunkerFloor, 0, 0.65, 0);

    // Central Landing Target Symbol
    VoxelBuilder.addBox(pad, 5.0, 0.05, 0.6, this.materials.cyanGlow, 0, 0.75, 0);
    VoxelBuilder.addBox(pad, 0.6, 0.05, 5.0, this.materials.cyanGlow, 0, 0.75, 0);

    // 4 Corner Voxel Beacon Pylons
    const corners = [ [-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2] ];
    corners.forEach(([cx, cz]) => {
      VoxelBuilder.addBox(pad, 0.7, 2.2, 0.7, this.materials.darkMetal, cx, 1.2, cz);
      VoxelBuilder.addBox(pad, 0.8, 0.25, 0.8, this.materials.chrome, cx, 2.4, cz);
      VoxelBuilder.addBox(pad, 0.4, 0.4, 0.4, this.materials.amberGlow, cx, 2.7, cz);
    });

    pad.userData = { isExtraction: true };
    return pad;
  },

  // 3D Sector Transporter / Teleportation Platform
  createTransporterPad(label = 'SECTOR TRANSPORTER') {
    this.initMaterials();
    const pad = new THREE.Group();

    // Base Octagonal Platform with Hazard Edges
    VoxelBuilder.addBox(pad, 4.2, 0.35, 4.2, this.materials.concrete, 0, 0.175, 0);
    VoxelBuilder.addBox(pad, 3.8, 0.15, 3.8, this.materials.hazard, 0, 0.35, 0);
    VoxelBuilder.addBox(pad, 3.0, 0.10, 3.0, this.materials.bunkerFloor, 0, 0.45, 0);

    // Glowing Central Teleport Energy Node
    VoxelBuilder.addBox(pad, 2.2, 0.05, 2.2, this.materials.cyanGlow, 0, 0.51, 0);
    VoxelBuilder.addBox(pad, 0.8, 0.08, 0.8, this.materials.amberGlow, 0, 0.53, 0);

    // 4 Corner Energy Pylons
    const cornerPylons = [ [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6] ];
    cornerPylons.forEach(([px, pz]) => {
      VoxelBuilder.addBox(pad, 0.35, 2.2, 0.35, this.materials.darkMetal, px, 1.1, pz);
      VoxelBuilder.addBox(pad, 0.45, 0.2, 0.45, this.materials.chrome, px, 2.2, pz);
      VoxelBuilder.addBox(pad, 0.25, 0.25, 0.25, this.materials.cyanGlow, px, 2.4, pz);
    });

    // Holographic Teleport Beam Column
    const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, 3.2, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.9;
    pad.add(beam);

    pad.userData = { isTransporter: true, label: label, beam: beam };
    return pad;
  },

  // 3D Panoramic Bitmap Skyline Backdrop of Ruined Los Angeles
  createSkylineBackdrop(radius = 280, height = 150) {
    this.initMaterials();
    const group = new THREE.Group();

    if (this.skylineTexture) {
      const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);
      const cylMat = new THREE.MeshBasicMaterial({
        map: this.skylineTexture,
        side: THREE.BackSide,
        depthWrite: false
      });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.position.y = height / 2 - 15;
      group.add(cyl);
    }

    const searchlightColors = [0x88ccff, 0x00e5ff, 0xff5555, 0x66ddff];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + 0.35;
      const x = Math.cos(angle) * (radius * 0.72);
      const z = Math.sin(angle) * (radius * 0.72);

      const beamGeo = new THREE.CylinderGeometry(0.8, 16, 180, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: searchlightColors[i],
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, 80, z);
      beam.rotation.z = 0.28 * (i % 2 === 0 ? 1 : -1);
      beam.rotation.x = 0.18;
      beam.userData = { initialZ: beam.rotation.z, speed: 0.6 + i * 0.25 };
      group.add(beam);
    }

    return group;
  },

  // 3D Cinematic Voxel Showcase for Title Screen & Menus
  createTitleShowcase() {
    this.initMaterials();
    const showcase = new THREE.Group();

    const backdrop = this.createSkylineBackdrop(50, 45);
    backdrop.position.y = -5;
    showcase.add(backdrop);

    // Voxel Platform
    const floorGeo = new THREE.CylinderGeometry(15, 16, 0.4, 32);
    const floor = new THREE.Mesh(floorGeo, this.materials.concrete);
    floor.position.y = -0.2;
    showcase.add(floor);

    const ringGeo = new THREE.RingGeometry(13.8, 14.6, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, this.materials.cyanGlow);
    ring.position.y = 0.02;
    showcase.add(ring);

    // Voxel T-800 Endoskeleton in center
    const t800 = this.createT800();
    t800.position.set(0, 0, 0);
    t800.scale.set(1.4, 1.4, 1.4);
    showcase.add(t800);

    // Voxel HK-Aerial hovering in sky
    const hk = this.createHKAerial();
    hk.position.set(5, 5.5, -8);
    hk.scale.set(0.8, 0.8, 0.8);
    hk.rotation.y = -0.4;
    showcase.add(hk);

    // Voxel Ruined buildings in background
    const b1 = this.createRuinBuilding(8, 25, 8);
    b1.position.set(-14, 0, -18);
    showcase.add(b1);

    const b2 = this.createRuinBuilding(10, 32, 10);
    b2.position.set(15, 0, -22);
    showcase.add(b2);

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
