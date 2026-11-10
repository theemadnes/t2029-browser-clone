/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   A.C.E. Battle Armor Cockpit HUD & Tactical Radar System
   ========================================================================== */

class HUDSystem {
  constructor() {
    // DOM Elements
    this.dom = {
      coords: document.getElementById('hud-coords-val'),
      timer: document.getElementById('hud-timer-val'),
      timerBox: document.getElementById('hud-timer-box'),
      missionTitle: document.getElementById('hud-mission-title'),
      missionObj: document.getElementById('hud-mission-obj'),
      compassReadout: document.getElementById('compass-readout'),

      // Reticle & Target
      reticle: document.getElementById('reticle-box'),
      targetBox: document.getElementById('target-info-box'),
      targetName: document.getElementById('target-name'),
      targetRange: document.getElementById('target-range'),
      targetHp: document.getElementById('target-hp'),
      interactionPrompt: document.getElementById('interaction-prompt'),
      interactionText: document.getElementById('interaction-text'),

      // Comms
      commsBox: document.getElementById('hud-messages'),

      // Armor / Shield
      shieldFill: document.getElementById('shield-fill'),
      shieldVal: document.getElementById('shield-val'),
      armorFrontFill: document.getElementById('armor-front-fill'),
      armorFrontVal: document.getElementById('armor-front-val'),
      armorRearFill: document.getElementById('armor-rear-fill'),
      armorRearVal: document.getElementById('armor-rear-val'),

      // Heat
      heatFill: document.getElementById('heat-fill'),
      heatVal: document.getElementById('heat-val'),

      // Weapons
      priName: document.getElementById('weapon-pri-name'),
      priStatus: document.getElementById('weapon-pri-status'),
      secName: document.getElementById('weapon-sec-name'),
      secAmmo: document.getElementById('weapon-sec-ammo'),

      // Inventory
      invSlots: [
        document.getElementById('inv-slot-1'),
        document.getElementById('inv-slot-2'),
        document.getElementById('inv-slot-3'),
        document.getElementById('inv-slot-4'),
        document.getElementById('inv-slot-5')
      ],

      // Radar
      radarCanvas: document.getElementById('radar-canvas')
    };

    this.radarCtx = this.dom.radarCanvas ? this.dom.radarCanvas.getContext('2d') : null;
    this.cardinalDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  }

  update(player, mission, enemies, objectives, dt) {
    if (!player) return;

    // 1. Coordinates [X, Y]
    const gridX = Math.round(player.position.x / 2);
    const gridY = Math.round(player.position.z / 2);
    if (this.dom.coords) {
      this.dom.coords.textContent = `[${gridX}, ${gridY}]`;
    }

    // 2. Compass Heading
    if (this.dom.compassReadout && player.yawObject) {
      let deg = Math.round((-player.yawObject.rotation.y * 180 / Math.PI) % 360);
      if (deg < 0) deg += 360;

      const idx = Math.round(deg / 45) % 8;
      const cardinal = this.cardinalDirs[idx];
      this.dom.compassReadout.textContent = `${cardinal} ${deg.toString().padStart(3, '0')}°`;
    }

    // 3. Shield & Armor
    this.updateBar(this.dom.shieldFill, this.dom.shieldVal, player.shield, player.maxShield, 'shield');
    this.updateBar(this.dom.armorFrontFill, this.dom.armorFrontVal, player.armorFront, player.maxArmorFront, 'armor');
    this.updateBar(this.dom.armorRearFill, this.dom.armorRearVal, player.armorRear, player.maxArmorRear, 'armor');

    // 4. Weapon Heat
    if (this.dom.heatFill && this.dom.heatVal) {
      const heatPct = Math.min(100, Math.round(player.heat));
      this.dom.heatFill.style.width = `${heatPct}%`;
      this.dom.heatVal.textContent = `${heatPct}%`;

      if (player.isOverheated) {
        this.dom.heatFill.classList.add('overheated');
        this.dom.heatVal.textContent = 'OVERHEAT';
        this.dom.heatVal.style.color = 'var(--term-red)';
      } else {
        this.dom.heatFill.classList.remove('overheated');
        this.dom.heatVal.style.color = 'var(--term-amber)';
      }
    }

    // 5. Equipped Weapons Status
    if (this.dom.priName) {
      const priWeapon = WEAPON_REGISTRY[player.loadout.primaryWeapon];
      this.dom.priName.textContent = priWeapon ? priWeapon.name : '40-Watt PPC';
      this.dom.priStatus.textContent = player.isOverheated ? 'COOLING...' : 'ONLINE';
      this.dom.priStatus.style.color = player.isOverheated ? 'var(--term-red)' : 'var(--term-green)';
    }

    if (this.dom.secName) {
      const secWeapon = WEAPON_REGISTRY[player.loadout.secondaryWeapon];
      this.dom.secName.textContent = secWeapon ? secWeapon.name : 'NONE';
      const ammoCount = player.loadout.ammo[player.loadout.secondaryWeapon] || 0;
      this.dom.secAmmo.textContent = `AMMO: ${ammoCount.toString().padStart(2, '0')}`;
    }

    // 6. Inventory Slots (1 - 5)
    this.updateInventory(player.loadout.inventory);

    // 7. Mission Objectives & Timer
    if (mission) {
      if (this.dom.missionTitle) {
        this.dom.missionTitle.textContent = mission.title;
      }

      // Active objective
      const activeObj = mission.objectives.find(o => !o.done);
      if (this.dom.missionObj) {
        this.dom.missionObj.textContent = activeObj ? `OBJ: ${activeObj.text}` : 'ALL OBJECTIVES COMPLETE - EXTRACT';
        this.dom.missionObj.style.color = activeObj ? 'var(--term-cyan)' : 'var(--term-green)';
      }

      // Timer (if applicable)
      if (mission.timeRemaining !== null && mission.timeRemaining !== undefined) {
        if (this.dom.timerBox) this.dom.timerBox.style.display = 'flex';
        const mins = Math.floor(Math.max(0, mission.timeRemaining) / 60);
        const secs = Math.floor(Math.max(0, mission.timeRemaining) % 60);
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (this.dom.timer) {
          this.dom.timer.textContent = timeStr;
          if (mission.timeRemaining < 120) {
            this.dom.timer.classList.add('urgent');
          } else {
            this.dom.timer.classList.remove('urgent');
          }
        }
      } else {
        if (this.dom.timerBox) this.dom.timerBox.style.display = 'none';
      }
    }

    // 8. Reticle & Target Lock
    this.updateTargetLock(player, enemies);

    // 9. Tactical Radar
    this.drawRadar(player, enemies, objectives);
  }

  updateBar(fillElem, textElem, val, maxVal, type) {
    if (!fillElem || !textElem) return;
    const pct = Math.max(0, Math.min(100, Math.round((val / maxVal) * 100)));
    fillElem.style.width = `${pct}%`;
    textElem.textContent = `${pct}%`;

    fillElem.classList.remove('warning', 'critical');
    if (pct <= 25) {
      fillElem.classList.add('critical');
    } else if (pct <= 50) {
      fillElem.classList.add('warning');
    }
  }

  updateInventory(inventory) {
    for (let i = 0; i < 5; i++) {
      const slotEl = this.dom.invSlots[i];
      if (!slotEl) continue;

      const item = inventory[i];
      const iconEl = slotEl.querySelector('.inv-slot-icon');
      const countEl = slotEl.querySelector('.inv-slot-count');

      if (item && WEAPON_REGISTRY[item.id]) {
        slotEl.classList.add('equipped');
        const reg = WEAPON_REGISTRY[item.id];
        let shortName = reg.name.substring(0, 3).toUpperCase();
        if (item.id === 'medpack') shortName = 'MED';
        if (item.id === 'mine') shortName = 'MIN';
        if (item.id === 'scanner') shortName = 'SCN';
        if (item.id === 'beacon') shortName = 'BCN';
        if (item.id.startsWith('card_')) shortName = item.id.split('_')[1].toUpperCase();
        if (item.id === 'viral_x') shortName = 'VRX';

        if (iconEl) iconEl.textContent = shortName;
        if (countEl) countEl.textContent = item.count > 1 ? `x${item.count}` : '';
      } else {
        slotEl.classList.remove('equipped');
        if (iconEl) iconEl.textContent = '';
        if (countEl) countEl.textContent = '';
      }
    }
  }

  updateTargetLock(player, enemies) {
    let closestEnemy = null;
    let minDistance = 80; // lock range in meters

    if (enemies && enemies.length > 0) {
      enemies.forEach(enemy => {
        if (!enemy.isAlive) return;
        const dist = player.position.distanceTo(enemy.mesh.position);
        if (dist < minDistance) {
          // Check if enemy is in forward cone of view
          const dirToEnemy = enemy.mesh.position.clone().sub(player.position).normalize();
          const playerForward = player.getForwardVector();
          const dot = playerForward.dot(dirToEnemy);
          if (dot > 0.85) { // within ~30 deg forward angle
            minDistance = dist;
            closestEnemy = enemy;
          }
        }
      });
    }

    if (closestEnemy) {
      if (this.dom.reticle) this.dom.reticle.classList.add('locked');
      if (this.dom.targetBox) this.dom.targetBox.classList.add('active');

      const hpPct = Math.round((closestEnemy.hp / closestEnemy.maxHp) * 100);
      if (this.dom.targetName) this.dom.targetName.textContent = closestEnemy.name.toUpperCase();
      if (this.dom.targetRange) this.dom.targetRange.textContent = `RANGE: ${Math.round(minDistance)}m`;
      if (this.dom.targetHp) this.dom.targetHp.textContent = `ARMOR: ${hpPct}%`;
      player.lockedTarget = closestEnemy;
    } else {
      if (this.dom.reticle) this.dom.reticle.classList.remove('locked');
      if (this.dom.targetBox) this.dom.targetBox.classList.remove('active');
      player.lockedTarget = null;
    }
  }

  showInteraction(text) {
    if (this.dom.interactionPrompt && this.dom.interactionText) {
      this.dom.interactionText.textContent = text;
      this.dom.interactionPrompt.classList.add('active');
    }
  }

  hideInteraction() {
    if (this.dom.interactionPrompt) {
      this.dom.interactionPrompt.classList.remove('active');
    }
  }

  addCommMessage(sender, text, type = 'normal') {
    if (!this.dom.commsBox) return;

    const msg = document.createElement('div');
    msg.className = `comm-msg ${type}`;
    msg.innerHTML = `<strong>[${sender}]</strong> ${text}`;
    this.dom.commsBox.appendChild(msg);

    // Keep max 4 messages
    while (this.dom.commsBox.children.length > 4) {
      this.dom.commsBox.removeChild(this.dom.commsBox.firstChild);
    }

    // Audio cue
    if (window.AudioSys) {
      window.AudioSys.playUI('select');
    }

    setTimeout(() => {
      if (msg.parentNode === this.dom.commsBox) {
        this.dom.commsBox.removeChild(msg);
      }
    }, 6000);
  }

  // Draw 2D Tactical Radar / Minimap
  drawRadar(player, enemies, objectives) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.dom.radarCanvas.width;
    const h = this.dom.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 1.4; // 1 meter = 1.4 canvas pixels

    ctx.clearRect(0, 0, w, h);

    // Radar coordinate transform based on player yaw
    const playerAngle = player.yawObject ? player.yawObject.rotation.y : 0;

    // Draw Objectives (Pulsing Cyan / Yellow diamonds)
    if (objectives && objectives.length > 0) {
      objectives.forEach(obj => {
        if (!obj.mesh || obj.done) return;
        const dx = obj.mesh.position.x - player.position.x;
        const dz = obj.mesh.position.z - player.position.z;

        // Rotate relative to player heading
        const rx = dx * Math.cos(playerAngle) - dz * Math.sin(playerAngle);
        const rz = dx * Math.sin(playerAngle) + dz * Math.cos(playerAngle);

        const screenX = cx + rx * scale;
        const screenY = cy + rz * scale;

        // Clip to radar circle
        if (Math.hypot(screenX - cx, screenY - cy) < cx - 6) {
          ctx.save();
          ctx.fillStyle = obj.isExtraction ? '#00ff66' : '#ffaa00';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // Draw Hostile Skynet Units (Red Blips)
    if (enemies && enemies.length > 0) {
      enemies.forEach(enemy => {
        if (!enemy.isAlive || !enemy.mesh) return;
        const dx = enemy.mesh.position.x - player.position.x;
        const dz = enemy.mesh.position.z - player.position.z;

        const rx = dx * Math.cos(playerAngle) - dz * Math.sin(playerAngle);
        const rz = dx * Math.sin(playerAngle) + dz * Math.cos(playerAngle);

        const screenX = cx + rx * scale;
        const screenY = cy + rz * scale;

        if (Math.hypot(screenX - cx, screenY - cy) < cx - 6) {
          ctx.save();
          ctx.fillStyle = '#ff2222';
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(screenX, screenY, enemy.type === 'hk_tank' ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // Draw Player Center Triangle
    ctx.save();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

window.HUDSystem = HUDSystem;
