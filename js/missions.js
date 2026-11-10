/* ==========================================================================
   THE TERMINATOR: 2029 - 3D BROWSER CLONE
   Missions, Briefings, Objectives & Tactical Maps
   ========================================================================== */

const MISSIONS_DATA = {
  training: {
    id: 'training',
    num: 0,
    title: 'Training Arena',
    subtitle: 'A.C.E. Armor Combat Simulation',
    rank: 'Recruit',
    recommendedLoadout: 'ppc_40w + Fusion Grenades',
    briefing: `Welcome to the resistance training grid, soldier. Before John Connor sends you into the ruined sectors of Los Angeles, you must calibrate your A.C.E. (Advanced Combat Environment) Battle Armor.

Familiarize yourself with the 3D full-freedom movement (WASD) and mouse-aim reticle. Cycle your Phased Plasma Cannons, test your explosive ordnance, and eliminate the holographic combat drones in this simulated environment. Once all targets are neutralized, proceed to the extraction beacon.`,
    objectives: [
      { id: 'move_check', text: 'Calibrate A.C.E. suit movement controls', done: false },
      { id: 'kill_drones', text: 'Destroy simulated combat drones (0/4)', targetCount: 4, currentCount: 0, done: false },
      { id: 'test_explosives', text: 'Deploy explosive ordnance (Grenade or Mine)', done: false },
      { id: 'extract', text: 'Proceed to simulated extraction pad', done: false }
    ],
    timeLimit: null,
    playerStart: { x: 10, y: 10 },
    extractionCoord: { x: 30, y: 30 },
    environment: 'simulator'
  },

  1: {
    id: 1,
    num: 1,
    title: 'Mission 1: Telemetry Recovery',
    subtitle: 'Sector 4 Relay Station & Underground Lab',
    rank: 'Private',
    recommendedLoadout: '2x 40W PPC + 4x Fusion Grenades',
    briefing: `SOLDIER: Skynet forces have launched a coordinated assault against our Forward Relay Station in Sector 4.

Your primary orders are twofold:
1. Protect the Relay Station at coordinates [15, 16] from approaching machine patrols.
2. Infiltrate the Underground Laboratory entrance at [25, 48].
3. Retrieve the vital Skynet Telemetry Data Cartridge stored at [82, 64].
4. Move rapidly to the Extraction Point at [25, 2] where our transport team is standing by.

Watch your weapon thermal gauge. Sustained fire will trigger suit thermal protection lockouts. Good luck.`,
    objectives: [
      { id: 'protect_relay', text: 'Defend Relay Station at [15, 16]', coord: { x: 15, y: 16 }, done: false },
      { id: 'enter_lab', text: 'Infiltrate Underground Lab entrance at [25, 48]', coord: { x: 25, y: 48 }, done: false },
      { id: 'get_telemetry', text: 'Retrieve Telemetry Data at [82, 64]', coord: { x: 82, y: 64 }, done: false },
      { id: 'extract', text: 'Evacuate to Extraction Point at [25, 2]', coord: { x: 25, y: 2 }, done: false }
    ],
    timeLimit: null,
    playerStart: { x: 12, y: 8 },
    extractionCoord: { x: 25, y: 2 },
    environment: 'ruins'
  },

  2: {
    id: 2,
    num: 2,
    title: 'Mission 2: Epsilon Sector Sabotage',
    subtitle: 'Communications Grid Demolition',
    rank: 'Corporal',
    promotion: 'Sergeant Major',
    recommendedLoadout: '2x 40W PPC + 4x Proximity Mines',
    briefing: `COMMAND TRANSMISSION: John Connor has authorized an offensive strike into Skynet's Epsilon Sector.

Skynet is coordinating regional Hunter-Killer patrols using a network of high-frequency broadcast arrays. You must sever their communications backbone:
1. Advance south into the Epsilon sector and reach Relay Tower 1 at [6, 109]. Plant a Proximity Mine to destroy the structure.
2. Advance to the central Communications Grid at [25, 111] and demolish it.
3. Locate Relay Tower 2 at [44, 108] and detonate it.
4. Fall back west to the extraction rendezvous at [25, 1].

Machine reinforcements will converge once the first tower falls. Maintain situational awareness.`,
    objectives: [
      { id: 'tower1', text: 'Demolish Relay Tower 1 at [6, 109] with Proximity Mine', coord: { x: 6, y: 109 }, done: false },
      { id: 'comm_grid', text: 'Demolish Communications Grid at [25, 111]', coord: { x: 25, y: 111 }, done: false },
      { id: 'tower2', text: 'Demolish Relay Tower 2 at [44, 108] with Proximity Mine', coord: { x: 44, y: 108 }, done: false },
      { id: 'extract', text: 'Extract to Rendezvous at [25, 1]', coord: { x: 25, y: 1 }, done: false }
    ],
    timeLimit: null,
    playerStart: { x: 10, y: 15 },
    extractionCoord: { x: 25, y: 1 },
    environment: 'ruins'
  },

  3: {
    id: 3,
    num: 3,
    title: 'Mission 3: Chronal Anomaly',
    subtitle: 'Sgt. Hendrick & The Time Distortion Device',
    rank: 'Sergeant Major',
    promotion: '2nd Lieutenant',
    recommendedLoadout: '2x 60W PPC + Neurolink Autofire + 3x Armor Plates',
    briefing: `PRIORITY FLASH: We have received a faint distress transponder from Sgt. Hendrick, pinned down behind enemy lines. He possesses critical tactical codes regarding Skynet's temporal research.

1. Rendezvous with Sgt. Hendrick at [10, 41]. Speak with him to verify password "OMEGA-1" and activate your Locator Beacon for medevac.
2. Infiltrate the subterranean research complex entrance at [16, 47].
3. Take the Level 2 elevator at [16, 110], then the Level 3 elevator at [108, 67].
4. Locate the Time Distortion Device at [81, 25]. Equip your Diatomic Scanner and deploy the Locator Beacon to tag it for heavy retrieval.

Expect heavy T-800 Endoskeleton resistance in the lower bunker levels. Keep your armor plates reinforced.`,
    objectives: [
      { id: 'rescue_hendrick', text: 'Locate Sgt. Hendrick at [10, 41] (Password: OMEGA-1)', coord: { x: 10, y: 41 }, done: false },
      { id: 'enter_complex', text: 'Enter Subterranean Complex at [16, 47]', coord: { x: 16, y: 47 }, done: false },
      { id: 'elevator_l2', text: 'Take Elevator to Level 2 at [16, 110]', coord: { x: 16, y: 110 }, done: false },
      { id: 'elevator_l3', text: 'Take Elevator to Level 3 at [108, 67]', coord: { x: 108, y: 67 }, done: false },
      { id: 'secure_device', text: 'Secure Time Distortion Device at [81, 25]', coord: { x: 81, y: 25 }, done: false }
    ],
    timeLimit: null,
    playerStart: { x: 10, y: 12 },
    extractionCoord: { x: 81, y: 25 },
    environment: 'bunker'
  },

  4: {
    id: 4,
    num: 4,
    title: 'Mission 4: Blitzkrieg',
    subtitle: 'The 18-Minute Defense Network Assault',
    rank: '2nd Lieutenant',
    recommendedLoadout: '1x 80W PPC + 5x Armor Plates + Proximity Mines',
    briefing: `TACTICAL URGENCY: An 18-MINUTE COUNTDOWN is underway! Skynet is locking down the regional Defense Network to initiate orbital countermeasures.

There is no time for caution or protracted firefights. You must run like the wind:
1. Charge sequentially through the 8 automated defense gates:
   Gate 1 [40, 9] -> Gate 2 [25, 19] -> Gate 3 [45, 29] -> Gate 4 [25, 39]
   Gate 5 [40, 63] -> Gate 6 [25, 72] -> Gate 7 [45, 82] -> Gate 8 [30, 92]
2. Reach the underground entrance at [25, 111] and bypass the security terminal using access override code: 38473-ENABLE.
3. Plant a Proximity Mine at the Defense Network core at [9, 168].
4. Escape up the elevator at [25, 140] before the countdown expires!`,
    objectives: [
      { id: 'breach_gates', text: 'Breach Gates 1 through 8 across perimeter', done: false },
      { id: 'underground_code', text: 'Enter Underground [25, 111] with code 38473-ENABLE', coord: { x: 25, y: 111 }, done: false },
      { id: 'destroy_defense', text: 'Destroy Defense Network core at [9, 168] with Mine', coord: { x: 9, y: 168 }, done: false },
      { id: 'extract_elevator', text: 'Extract via Elevator at [25, 140]', coord: { x: 25, y: 140 }, done: false }
    ],
    timeLimit: 18 * 60, // 18 minutes in seconds
    playerStart: { x: 38, y: 4 },
    extractionCoord: { x: 25, y: 140 },
    environment: 'trench'
  },

  5: {
    id: 5,
    num: 5,
    title: 'Mission 5: Zero Hour Extraction',
    subtitle: 'Rescue Major Altorrez at Comm Base Gamma',
    rank: '2nd Lieutenant',
    promotion: 'Captain',
    recommendedLoadout: '1x 100W PPC + 5x Armor Plates + Autodoc Medpacks',
    briefing: `CRITICAL RESCUE OPERATION: Major Altorrez was ambushed inside Comm Base Gamma and is losing blood rapidly. You have a STRICT 10-MINUTE TIME LIMIT before his vitals flatline.

1. Rush to the Comm Base Gamma entrance at [111, 48].
2. Take the descent elevator at [48, 48] down to Level 2.
3. Heavy Eradicator units and 10+ Terminators guard the interior chamber. Penetrate to [27, 85], administer an Autodoc Medpack to stabilize the Major, and hoist him onto your A.C.E. suit.
4. Carry him back to the ascent elevator at [25, 28] to reach Level 1.
5. Sprint to the extraction surface point at [64, 1].

Do not engage in unnecessary combat. Your objective is the Major's survival!`,
    objectives: [
      { id: 'enter_gamma', text: 'Enter Comm Base Gamma at [111, 48]', coord: { x: 111, y: 48 }, done: false },
      { id: 'elevator_down', text: 'Take Elevator at [48, 48] to Level 2', coord: { x: 48, y: 48 }, done: false },
      { id: 'rescue_altorrez', text: 'Heal and pick up Major Altorrez at [27, 85]', coord: { x: 27, y: 85 }, done: false },
      { id: 'elevator_up', text: 'Ascend Elevator at [25, 28] to Level 1', coord: { x: 25, y: 28 }, done: false },
      { id: 'extract', text: 'Extract to Surface rendezvous at [64, 1]', coord: { x: 64, y: 1 }, done: false }
    ],
    timeLimit: 10 * 60, // 10 minutes
    playerStart: { x: 95, y: 35 },
    extractionCoord: { x: 64, y: 1 },
    environment: 'bunker'
  },

  6: {
    id: 6,
    num: 6,
    title: 'Mission 6: Deep Infiltration',
    subtitle: 'Satellite Uplinks & The Vault of Chronos',
    rank: 'Captain',
    recommendedLoadout: '1x 100W PPC + 1x Fusion Grenade + 4x Armor Plates + Proximity Mines',
    briefing: `INTELLIGENCE BRIEFING: Skynet has begun transmitting temporal displacement parameters to external facilities.

1. Destroy or retrieve the 3 Satellite CD Cartridges positioned at [10, 13], [37, 13], and [37, 34].
2. CRITICAL: Recover the Gamma Security Access Card at [10, 41] FIRST. Place it in suit inventory slots 1-5 to enable blast door authorization.
3. Approach the fortified Gamma Base entrance at [10, 47] and trigger the door with your Gamma Card.
4. Navigate deep underground via elevators [16, 110] and [108, 67].
5. Locate the main Time Distortion Equipment at [69, 36] and vaporize it with a Proximity Mine.
6. Escape up elevators [88, 38] and [64, 106] to surface exit [48, 102], then reach extraction at [25, 0].`,
    objectives: [
      { id: 'satellites', text: 'Secure Satellite Uplink CDs [10,13], [37,13], [37,34] (0/3)', currentCount: 0, targetCount: 3, done: false },
      { id: 'get_gamma_card', text: 'Acquire Gamma Access Card at [10, 41]', coord: { x: 10, y: 41 }, done: false },
      { id: 'breach_base', text: 'Breach Gamma Base blast door at [10, 47]', coord: { x: 10, y: 47 }, done: false },
      { id: 'destroy_chronos', text: 'Destroy Time Distortion Equipment at [69, 36] with Mine', coord: { x: 69, y: 36 }, done: false },
      { id: 'extract', text: 'Escape through [48, 102] to Extraction [25, 0]', coord: { x: 25, y: 0 }, done: false }
    ],
    timeLimit: null,
    playerStart: { x: 10, y: 8 },
    extractionCoord: { x: 25, y: 0 },
    environment: 'vault'
  },

  7: {
    id: 7,
    num: 7,
    title: 'Mission 7: Nuclear Counter-Strike',
    subtitle: 'Skynet Launch Complex & Viral-X Deployment',
    rank: 'Captain',
    promotion: 'Major',
    recommendedLoadout: '1x 100W PPC + Viral-X Cartridge + 4x Armor Plates + Proximity Mines',
    briefing: `JOHN CONNOR DIRECT TRANSMISSION: This is our most perilous hour. Skynet has prepped an ICBM launch battery armed with cobalt warheads targeting human survival enclaves.

1. Navigate through the irradiated perimeter to the Launch Complex entrance at [173, 47].
2. Breach the silo perimeter and destroy Nexus Control Node 1 at [142, 82] with a Proximity Mine.
3. Destroy Nexus Control Node 2 at [142, 84] with a Proximity Mine.
4. Jack your suit interface into Central Launch Control at [141, 83] and upload the VIRAL-X cybernetic counter-algorithm to terminate the missile sequence.

Hunter-Killer Tanks and heavy CSM enforcers are deployed in defense. Use high-power PPC discharges to dismantle their armor.`,
    objectives: [
      { id: 'enter_launch', text: 'Infiltrate Launch Complex entrance at [173, 47]', coord: { x: 173, y: 47 }, done: false },
      { id: 'destroy_nexus1', text: 'Demolish Nexus Control 1 at [142, 82] with Mine', coord: { x: 142, y: 82 }, done: false },
      { id: 'destroy_nexus2', text: 'Demolish Nexus Control 2 at [142, 84] with Mine', coord: { x: 142, y: 84 }, done: false },
      { id: 'deploy_viral_x', text: 'Inject Viral-X at Launch Control terminal [141, 83]', coord: { x: 141, y: 83 }, done: false }
    ],
    timeLimit: null,
    playerStart: { x: 165, y: 30 },
    extractionCoord: { x: 141, y: 83 },
    environment: 'silo'
  },

  8: {
    id: 8,
    num: 8,
    title: 'Mission 8: Judgment Core',
    subtitle: 'The Final Strike on Skynet Central Reactor',
    rank: 'Major',
    promotion: 'Colonel - Savior of Humanity',
    recommendedLoadout: '1x 100W PPC + Maximum Mines + Full Armor Loadout',
    briefing: `THIS IS IT, SOLDIER. THE HEART OF SKYNET.

We have breached the inner perimeter of Skynet's central processing citadel. The reactor core powers Skynet's central mind and automated production lines. If we destroy it, the machines will collapse.

1. The facility is secured behind 4 sector blast barriers. You must scavenge the security cards:
   - Alpha Card at [28, 94] (unlocks Alpha blast door at [94, 85])
   - Beta Card at [99, 3]
   - Gamma Card at [176, 104]
   - Delta Card at [105, 169]
2. Take the deep shaft elevator at [36, 191] or [89, 87] down to the Reactor Core chamber.
3. Unleash everything you have to overload the Skynet Central Reactor Core at [120, 180].
4. Backtrack to the Shuttle Bay elevator at [35, 128] and escape via the Resistance extraction shuttle at [26, 237] before the entire mountain implodes!

For John Connor. For humanity. End the nightmare!`,
    objectives: [
      { id: 'get_alpha_card', text: 'Acquire Alpha Sector Card at [28, 94]', coord: { x: 28, y: 94 }, done: false },
      { id: 'unlock_alpha_door', text: 'Unlock Alpha Blast Door at [94, 85]', coord: { x: 94, y: 85 }, done: false },
      { id: 'get_sector_cards', text: 'Acquire Beta, Gamma & Delta Sector Cards (0/3)', currentCount: 0, targetCount: 3, done: false },
      { id: 'reach_reactor', text: 'Descend elevator [36, 191] to the Reactor Core', coord: { x: 36, y: 191 }, done: false },
      { id: 'destroy_reactor', text: 'Destroy the Skynet Central Reactor Core at [120, 180]', coord: { x: 120, y: 180 }, done: false },
      { id: 'escape_shuttle', text: 'Escape via Shuttle Bay at [26, 237]', coord: { x: 26, y: 237 }, done: false }
    ],
    timeLimit: null,
    playerStart: { x: 25, y: 80 },
    extractionCoord: { x: 26, y: 237 },
    environment: 'core'
  }
};

window.MISSIONS_DATA = MISSIONS_DATA;
