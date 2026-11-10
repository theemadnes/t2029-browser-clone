# The Terminator: 2029 - 3D Browser Edition

A complete, modern, browser-based 3D recreation of the classic 1992 Bethesda Softworks MS-DOS sci-fi game [The Terminator: 2029](https://en.wikipedia.org/wiki/The_Terminator_2029).

While the original 1992 title utilized a stepped 2D raycasting engine with flat bitmap sprites, this edition features **full real-time 3D WebGL graphics and 6DOF movement**, complete with configurable modern FPS controls (WASD + Mouse-Look / Pointer Lock) or classic retro keyboard controls, procedural Web Audio synthesizer, and the authentic A.C.E. Battle Armor cockpit tactical HUD.

---

## Key Features

### 1. Full 3D Graphics & Visual Assets
* **Three.js WebGL Engine**: Complete 3D environment including ruined post-apocalyptic Los Angeles skyscrapers, concrete rubble piles, rebar barriers, bunker blast doors, security terminals, and elevator shafts.
* **Full 3D Skynet Enemy Models**:
  * **T-800 Endoskeleton**: Chrome hyperalloy chassis, articulated limbs, ribcage, glowing red ocular sensors, and Phased Plasma Rifle.
  * **HK-Aerial (Hunter-Killer Aerial Gunship)**: Sleek aerodynamic fuselage, dual tilting VTOL jet turbine nacelles with glowing exhaust rings, ventral searchlight, and twin chin plasma cannons.
  * **HK-Tank (Hunter-Killer Ground Treaded Behemoth)**: Heavy dual caterpillar tread assemblies, sloped armored glacis, 360-degree rotating turret, glowing red scanner visor, and twin heavy plasma cannons.
  * **G-500 / G-1000 Assault Drones**: Quad-thruster hovering combat scouts with glowing optical sensors.
  * **Spider Scouts**: Articulated multi-jointed hydraulic arachnid infiltrators designed for tight corridors.
  * **Automated Defense Turrets**: Ceiling and ground-mounted swivel turrets with laser target indicators.
* **First-Person A.C.E. Weapon Viewmodels**: Fully 3D modeled Phased Plasma Cannons with animated thermal recoil and glowing energy coils.
* **Particle & Lighting Effects**: Dynamic point lights attached to plasma bolts, shockwave fireballs, flying sparks, and volumetric searchlight beams.
* **Optional CRT Scanlines Overlay**: Toggleable authentic 1992 CRT monitor scanlines and curved screen vignette.

### 2. Configurable Controls (Modern WASD + Mouse-Look & Classic)
* **Modern FPS Mode**:
  * **Mouse-Look (Pointer Lock API)**: Click canvas to lock mouse for smooth 360° horizontal yaw and vertical pitch looking.
  * **WASD Movement**: `W` (Forward), `S` (Backward), `A` (Strafe Left), `D` (Strafe Right).
  * **Left Click**: Fire Primary Phased Plasma Cannon.
  * **Right Click**: Fire Secondary Ordnance (Fusion Grenades, Homing Missiles, Proximity Mines).
* **Classic Retro Mode**:
  * Keyboard turn / tank turn mode with arrow keys or `Q`/`E`.
* **Full Customization**:
  * Mouse Sensitivity slider (0.2x to 3.5x).
  * Invert Y-Axis toggle.
  * Keybinding remapper (rebind all actions in the Settings menu).
  * Field of View (FOV) slider (60° to 100°).
  * Preferences automatically saved to `localStorage`.

### 3. A.C.E. Battle Armor Cockpit HUD
* **Upper Compass Tape**: Real-time 360° heading tape (N, NE, E, SE, S, SW, W, NW).
* **Grid Coordinates `[X, Y]`**: Dynamic coordinate display accurately matching the original 1992 grid and walkthrough waypoints.
* **Front & Rear Directional Armor**: Separate front and rear armor integrity gauges (damage is calculated directionally based on incoming fire angle).
* **Deflector Shield Bar**: Absorbs incoming damage before armor breaches; recharges automatically after 4 seconds out of fire.
* **PPC Thermal Heat Gauge**: Firing energy weapons increases suit temperature. Sustained fire triggers an audible overheat warning and temporary thermal lockout.
* **Equipped Weapons & Ammo Readout**: Live primary status and secondary ammo counters.
* **5-Slot Quick-Access Inventory**: Interactive inventory slots for Medpacks, Proximity Mines, Scanners, Beacons, Keycards, and Viral-X.
* **Tactical Radar / Minimap**: Rotating radar sweep showing player heading, red blips for hostile Skynet machines, yellow markers for objectives, and green for extraction points.
* **Dynamic Target Lock Reticle**: Automatically tracks targets near crosshairs, displaying target classification, range in meters, and remaining armor integrity.

### 4. Procedural Web Audio API Soundscape
* **No external audio files required**; 100% synthesized in-browser with zero latency.
* **Dystopian Terminator Synth Soundtrack**: Featuring the iconic 5-beat metallic rhythm, industrial bassline, and cinematic synthesizer chord swells.
* **Sound Effects**: 4 distinct PPC discharge sounds (40W, 60W, 80W, 100W), rocket whooshes, grenade throws, deep resonant explosions, mine arming beeps, shield deflection shimmers, armor thuds, suit servo footsteps, and warning klaxons.

---

## Complete Campaign & Mission Walkthroughs

The game includes the complete campaign sourced from the official documentation and the [GameFAQs Walkthrough](https://gamefaqs.gamespot.com/pc/565155-the-terminator-2029/faqs/2138):

1. **Training Arena (Combat Simulator)**:
   * Calibrate A.C.E. armor movement and weapons in a virtual grid against simulated drones.
2. **Mission 1: Telemetry Recovery**:
   * Defend the Relay Station at `[15, 16]`.
   * Infiltrate the Underground Laboratory at `[25, 48]`.
   * Retrieve the Skynet Telemetry Data at `[82, 64]`.
   * Extract at `[25, 2]`.
3. **Mission 2: Epsilon Sector Sabotage**:
   * Navigate south into the Epsilon sector.
   * Destroy Relay Tower 1 at `[6, 109]` with a Proximity Mine.
   * Demolish the central Communications Grid at `[25, 111]`.
   * Destroy Relay Tower 2 at `[44, 108]`.
   * Extract at `[25, 1]`. *(Promotion: Sergeant Major)*.
4. **Mission 3: Chronal Anomaly**:
   * Locate wounded Sgt. Hendrick at `[10, 41]`, confirm password `OMEGA-1`, and activate his rescue beacon.
   * Infiltrate the subterranean research complex at `[16, 47]`.
   * Take Level 2 elevator at `[16, 110]` and Level 3 elevator at `[108, 67]`.
   * Secure the Time Distortion Device at `[81, 25]` using the Diatomic Scanner and Locator Beacon. *(Promotion: 2nd Lieutenant)*.
5. **Mission 4: Blitzkrieg (18-Minute Time Limit)**:
   * Charge through perimeter Gates 1 to 8 in rapid succession (`[40, 9]` to `[30, 92]`).
   * Access underground facility at `[25, 111]` with code `38473-ENABLE`.
   * Plant a mine to destroy the Defense Network core at `[9, 168]`.
   * Evacuate via elevator at `[25, 140]`.
6. **Mission 5: Zero Hour Extraction (10-Minute Time Limit)**:
   * Infiltrate Comm Base Gamma at `[111, 48]`.
   * Descend elevator `[48, 48]` to Level 2.
   * Fight through Eradicators to locate critically wounded Major Altorrez at `[27, 85]`.
   * Administer an Autodoc Medpack to stabilize him.
   * Ascend elevator `[25, 28]` and carry him to extraction at `[64, 1]`. *(Promotion: Captain)*.
7. **Mission 6: Deep Infiltration**:
   * Recover/destroy 3 Satellite Uplink CDs at `[10, 13]`, `[37, 13]`, and `[37, 34]`.
   * Retrieve the Gamma Access Card at `[10, 41]` (must be placed in suit inventory).
   * Unlock Gamma Base entrance at `[10, 47]`.
   * Descend into the deep vault and vaporize the Time Distortion Equipment at `[69, 36]`.
   * Escape through `[48, 102]` to extraction at `[25, 0]`.
8. **Mission 7: Nuclear Counter-Strike**:
   * Breach the Skynet Launch Complex at `[173, 47]`.
   * Demolish Nexus Control 1 at `[142, 82]` and Nexus Control 2 at `[142, 84]` with Proximity Mines.
   * Terminal jack at Launch Control `[141, 83]` and deploy **Viral-X** to abort the ICBM launch! *(Promotion: Major)*.
9. **Mission 8: Judgment Core**:
   * Scavenge 4 security clearance cards: Alpha `[28, 94]`, Beta `[99, 3]`, Gamma `[176, 104]`, Delta `[105, 169]`.
   * Unlock the Alpha blast door at `[94, 85]`.
   * Descend deep core shaft `[36, 191]`.
   * Overload and destroy the Central Skynet Reactor Core at `[120, 180]`.
   * Evacuate to Shuttle Bay `[26, 237]` to secure ultimate victory for the human Resistance! *(Promotion: Colonel / Savior of Humanity)*.

---

## Weapons & Equipment Specification

| Item | Slot | Damage | Range / Radius | Special Characteristics |
| :--- | :--- | :---: | :---: | :--- |
| **40-Watt PPC** | Primary | 28 | 120m | Fast cycling (0.22s), low heat output (10 units). |
| **60-Watt PPC** | Primary | 48 | 140m | Piercing blue plasma, balanced thermal load (16 units). |
| **80-Watt PPC** | Primary | 82 | 160m | Heavy assault blaster, high penetration (24 units). |
| **100-Watt PPC** | Primary | 135 | 180m | Prototype high-wattage beam, devastating damage (35 units). |
| **Fusion Grenades** | Secondary | 220 | 12m radius | Bouncing physics, timed fuse, heavy blast damage. |
| **Homing Missiles** | Secondary | 140 | 7m radius | Seeks and steers toward locked Skynet targets. |
| **Proximity Mines** | Secondary | 320 | 9m radius | Magnetic mine, arms with triple-beep, triggers on proximity. |
| **Autodoc Medpack** | Usable | +60 HP | Self / Target | Heals suit armor integrity or stabilizes wounded officers. |
| **Diatomic Scanner** | Usable | N/A | Scan Range | Detects chronal resonance frequencies. |
| **Locator Beacon** | Usable | N/A | Transponder | Marks high-value targets for Resistance air extraction. |
| **Viral-X Cartridge**| Usable | N/A | Direct Jack | Cyberwarfare payload that neutralizes Skynet ICBM networks. |
| **Keycards** | Keycard | N/A | Blast Doors | Grants security access through Alpha, Beta, Gamma, Delta doors. |

---

## How to Run Locally

Because the project is built with standard HTML5, CSS3, ES6 JavaScript, and local vendored Three.js r128, no build step or node_modules installation is required.

Start any local web server from the repository root:

```bash
# Using Python 3:
python3 -m http.server 8080
```

Then open your browser to:
`http://localhost:8080`

Click anywhere on the screen during gameplay to lock your mouse pointer and pilot the A.C.E. Battle Armor. Press `Escape` at any time to pause or open the Settings menu.
