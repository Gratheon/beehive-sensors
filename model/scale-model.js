// Gratheon beehive scale — parametric model of the Phase 3 production kit.
// Single source of truth for the browser viewer (index.html) and the GLB
// exporter (export-glb.mjs). All dimensions are in millimetres; the scene is
// built in metres (glTF convention).
//
// Axes match robotic-beehive/model/hive-model.js so the scale drops into the
// Robotic Beehive plinth without conversion:
//   X = left/right (frame length), Y = up, Z = front(+)/back(-), entrance at +Z.
//
// Layout rules:
// - Everything electrical lives on the base (the part that is not weighed).
//   The pod slides into a bay on the +X side, the service side, next to the
//   transport lock. The scale runs on batteries; the Entrance Observer (or the
//   Robotic Beehive) powers it through one M12 connector recessed under the
//   front wall. The Observer bolts to two threaded inserts in that wall.
// - The hive climate probe plugs into a socket built into the front-right hive
//   corner block and runs in a groove along the deck into the entrance. Under an
//   Entrance Observer the porch floor covers that groove. The socket's own lead
//   drops through the deck and loops down inside the skirt, so no cable shows.
// - Wood where a joinery shop can make it (deck, skirt, base boards), 3D printed
//   ASA for small shaped parts, aluminium only where load or wear needs it.

import * as THREE from 'three';

const MM = 0.001;
// Rail sides: rotation about Y that turns the local +Z (outward) frame to that side.

export const DEFAULTS = {
  context: 'hive', // 'hive' = stand-alone on the ground, 'robot' = inside the Robotic Beehive plinth
  observer: false, // an Entrance Observer bolted to the front of the base
  cells: 4, // 18650 cells fitted in the battery cartridge (2–4)
  boxes: 2, // hive bodies on the scale
  hive: { w: 506, d: 450, h: 285, wall: 25, lid: 80, bottomBoard: 60, robotBottomBoard: 150, entrance: 300 }, // Estonian hive (outer)
  deck: { w: 560, d: 510, t: 18, skirt: 40, st: 20 }, // film-faced plywood top, thermo-pine skirt
  base: { w: 504, d: 454, floor: 12, wall: 22, h: 60 }, // plywood floor, thermo-pine board walls
  feet: { x: 200, z: 150, h: 25 }, // 400 × 300 mm pattern = Robotic Beehive deck pads
  cell: { l: 180, w: 45, h: 50 }, // AP62AFB single-point cell (verify against the delivered part)
  bracket: { x: 341.8, z: 254.2, t: 12, bar: 28 }, // AP62AFB weighing brackets
  pod: { len: 76, h: 38, w: 150 }, // len along X into the bay, w along Z = face width
  // Entrance Observer, simplified, from entrance-observer/3d-model/observer-model.js DEFAULTS
  eo: { frameW: 456, post: 22, depth: 15, ridge: 318, roofLen: 212, roofHalfW: 238, slope: 30, pod: { y: 205, z: 135, w: 170, h: 57, d: 140 }, porch: { depth: 46, w: 312, floorEnd: 48 }, board: { w: 448, d: 150, slope: 6 } },
  robot: { plinth: 200, post: { x: 372, z: 302 }, e: 22 }, // from robotic-beehive DEFAULTS
};

// ---------------------------------------------------------------------------
// Part descriptions (shown on hover in the viewer, exported as glTF extras)
// ---------------------------------------------------------------------------
export const PARTS = {
  feet: ['Levelling feet', 'Four M10 feet in threaded inserts, rubber pads, 400 × 300 mm pattern. Level the scale once with the tilt readout on the pod display. In the Robotic Beehive the same four holes bolt the scale to the plinth.'],
  base: ['Base', 'Thermo-pine boards (22 mm) screwed to an 12 mm exterior plywood floor with drain holes. Any joinery shop with a CNC router can make it. It carries the fixed end of the load cell, the pod bay and the Entrance Observer mounting points: everything electrical is on the part that is not weighed.'],
  bracketLow: ['Lower weighing bracket', 'Cast aluminium bracket from the AP62AFB kit (341.8 × 254.2 mm), bolted through the plywood floor. It holds the fixed end of the load cell.'],
  loadcell: ['Single-point load cell', 'AP62AFB aluminium single-point cell, 200 kg (350 kg option), potted and sealed. The cell is loaded through its centre, so the reading does not depend on where the weight sits on the deck.'],
  bracketTop: ['Upper weighing bracket', 'The second AP62AFB bracket, bolted to the live end of the load cell and, through threaded inserts, to the deck plywood.'],
  deck: ['Deck', '18 mm film-faced birch plywood with the anti-slip mesh face used on trailer floors, and a 40 mm thermo-pine skirt. Faces and sealed edges keep rain out, so the deck does not gain weight when wet. The skirt overlaps the base with an 8 mm gap: water runs off outside and nothing bypasses the load cell.'],
  locator: ['Hive locators', '3D-printed ASA corner blocks. They put the bottom board in the same place every time, centred over the load cell, and stop it sliding off in a storm.'],
  stop: ['Overload stop (×4)', 'An M10 bolt in a threaded insert under each deck corner, set with a feeler gauge just below the deck. A leaning beekeeper, a dropped box or a heavy snow load lands on the stops, not on the cell.'],
  bumper: ['Side bumpers', 'EPDM pads on the base walls limit sideways deck travel to 4 mm. They do not touch in normal use, so they never take any of the weight.'],
  lock: ['Transport lock', 'Captive quarter-turn lock on the service side, next to the pod. Turned to the red mark it clamps the deck to the base for shipping or moving a hive, so the cell cannot be overloaded. Turned back it weighs; it cannot be lost, and the pod display warns if it is left locked.'],
  harness: ['Internal harness', 'Load cell, front connector and ambient sensor are wired to the pod dock inside the base. No cable runs outside, so sun, rain, mice and hive tools cannot reach it.'],
  bay: ['Pod bay', '3D-printed ASA sleeve in a rectangular cut in the right wall, with guides and the dock connector. The pod sits flush under the deck overhang: nothing sticks out to catch snow, a boot or a hive tool.'],
  dock: ['Dock connector', 'Keyed, gasketed 12-pin connector at the back of the bay. The pod mates with it as it slides in, so fitting a pod is one movement.'],
  pod: ['Electronics pod', 'IP67 housing, 150 × 38 × 76 mm, 3D-printed honey-yellow ASA for pilot batches, moulded later. It slides out of the bay after one quarter-turn, for service or to move it to another scale or the Robotic Beehive.'],
  podLid: ['Pod lid', 'Screwed lid with a silicone gasket. Only opened at the factory or for repair; batteries change through the cartridge.'],
  face: ['Display + button', '0.96″ OLED behind a window and a sealed button on the pod face. Press it to see weight, temperatures, battery, Wi-Fi and the lock state for 15 s and to send a reading now; hold it for 5 s to start BLE setup. The OLED works in frost, unlike e-paper.'],
  usbc: ['USB-C port', 'Under a rubber flap on the pod face. Charges the cells from a power bank or charger without removing anything, and flashes firmware. With an Entrance Observer fitted there is nothing to charge.'],
  cartridge: ['Battery cartridge', '3D-printed sled with the 2–4 cells. It slides out of the pod face: swap in a charged cartridge in seconds, or charge it at home on USB-C. Keyed so it only fits one way.'],
  battery: ['18650 cells', 'Li-ion 18650 cells, all in parallel (1S), so no balancing is needed. The kit ships with 2 or 4 cells.'],
  pcb: ['Carrier PCB', 'Gratheon carrier board: ESP32-S3 module, HX711 weight ADC, ideal-diode input selector, BQ24074 charger, MAX17048 fuel gauge, TPS62840 3.3 V buck and a load switch that powers sensors and display only when needed.'],
  esp32: ['ESP32-S3-MINI-1', 'Pre-certified Wi-Fi + BLE 5 module, about 8 µA in deep sleep. Setup over BLE from a phone, uploads over Wi-Fi, flashing over the USB-C port.'],
  accel: ['Tilt sensor', 'LIS2DH12 accelerometer on the pod board. The pod sits fixed in the base, so it measures the tilt of the scale: the display shows it while you level the feet, and every upload reports it, so the app can warn when a hive has been tipped over or the scale has sunk into soft ground.'],
  hx711: ['HX711 ADC', '24-bit bridge ADC at 10 Hz. The load switch turns off excitation between readings, which saves battery and stops the cell self-heating.'],
  charger: ['Charger + fuel gauge', 'The BQ24074 charges from USB-C or from the 5 V that an Entrance Observer or the Robotic Beehive supplies, and blocks charging below 0 °C. The MAX17048 reports battery % with every upload.'],
  lora: ['LoRa option', 'Footprint for an SX1262 module, fitted for apiaries without Wi-Fi and for the Robotic Beehive supervisor.'],
  vent: ['Pressure vent', 'ePTFE membrane vent. The pod breathes through it as the temperature changes, instead of pulling damp air in past the seals.'],
  sht: ['Ambient sensor', 'SHT40 behind 3D-printed louvres in the left wall of the base, shaded by the deck skirt and away from the pod electronics and the bees’ exhaust air at the entrance.'],
  mount: ['Observer mounting points', 'Two M6 threaded inserts in the front wall of the base, under the deck edge, 434 mm apart. The Entrance Observer bolts to them with two printed risers and thumbscrews, so it is carried by the base and never weighed. Stand-alone they are just two small brass rings in the wood.'],
  fmi: ['Accessory connector', 'M12 8-pin socket recessed into the underside of the front wall, facing down, with a dust cap when unused: 5 V in, ground, switched 3.3 V, 1-Wire, UART, wake and shield. The Entrance Observer and the Robotic Beehive harness plug in here and power the pod, so batteries only matter for a stand-alone scale.'],
  sensorPort: ['Sensor port', 'The front-right hive locator is also the socket for the hive climate probe: a 3D-printed block on the deck, next to the entrance corner. Its lead drops through the deck and loops down inside the skirt to the base, so no cable shows and the loop does not load the cell.'],
  cableGuide: ['Probe groove', 'Printed clip-in groove along the front strip of the deck that holds the probe lead from the sensor port to the entrance. Under an Entrance Observer the porch floor covers it, and the lead enters inside the porch, out of the camera view.'],
  probe: ['Hive climate probe', 'SHT45 temperature and humidity sensor behind a vented stainless cap, on a semi-rigid flat 4-core lead. It goes in through the entrance and rests under the brood frames: brood-nest temperature and hive humidity without drilling, and it stays in place during an inspection.'],
  cable: ['Cables', 'With an Entrance Observer: one short M12 lead from the foot of its right upright to the scale connector. Stand-alone: no outside cables apart from the probe lead into the entrance.'],
  observer: ['Entrance Observer', 'Gratheon Entrance Observer on the scale, simplified: wall frame bolted to the front of the base with two risers, porch with the automatic gate, its own landing board, and the head with the camera pod under a gable roof. It powers the scale pod over the M12 lead (from PoE or its solar roof and optional external panel) and uploads the scale readings together with its own.'],
  hive: ['Hive', 'A standard hive on the deck: bottom board, bodies and lid. The hive itself needs no changes.'],
  robot: ['Robotic Beehive plinth', 'Ghost of the Robotic Beehive plinth. The scale replaces the four deck pads and bolts to the same 400 × 300 mm holes; the robot harness plugs into the accessory connector, so the pod runs from the robot 5 V rail and roof panel.'],
};

// ---------------------------------------------------------------------------
// Derived geometry and figures
// ---------------------------------------------------------------------------
export function derive(p) {
  const robot = p.context === 'robot';
  const feetH = robot ? 0 : p.feet.h; // bolted straight onto the plinth cross members
  const ground = robot ? p.robot.plinth : 0; // what the scale stands on
  const baseY = ground + feetH;
  const floorTop = baseY + p.base.floor;
  const lowBracketY = floorTop; // bottom face of the lower bracket
  const cellY = lowBracketY + p.bracket.t + 4; // 4 mm boss under the fixed end
  const topBracketY = cellY + p.cell.h + 4; // 4 mm boss over the live end
  const deckY = topBracketY + p.bracket.t; // underside of the deck plywood
  const deckTop = deckY + p.deck.t;
  const bottomBoard = robot ? p.hive.robotBottomBoard : p.hive.bottomBoard;
  return {
    robot, ground, baseY, floorTop, lowBracketY, cellY, topBracketY, deckY, deckTop,
    height: deckTop - baseY, // the scale stack, without feet
    skirtBottom: deckY - p.deck.skirt,
    bottomBoard,
    lidTop: deckTop + bottomBoard + p.boxes * p.hive.h + p.hive.lid,
    entranceY: deckTop + 12, // bottom-board floor = entrance floor
    observer: !robot && !!p.observer,
  };
}

// Energy budget of the pod at the default cadence: weigh every 10 minutes,
// upload a Wi-Fi batch every 30 minutes. Mirrors the table in the website docs
// (docs/beehive-sensors/product-description).
export const ENERGY = {
  sleepMa: 0.02, // ESP32-S3 deep sleep + charger + fuel gauge + buck
  measureS: 0.6, measureMa: 12, measuresPerDay: 144,
  uploadS: 4, uploadMa: 120, uploadsPerDay: 48,
  displayS: 15, displayMa: 25, displaysPerDay: 1, // a look at the OLED once a day on average
  cellMah: 2500, depth: 0.8, coldFactor: 0.7, selfDischargePerMonth: 0.02,
};
export function batteryLife(cells, e = ENERGY) {
  const load = e.sleepMa * 24
    + e.measuresPerDay * e.measureS * e.measureMa / 3600
    + e.uploadsPerDay * e.uploadS * e.uploadMa / 3600
    + e.displaysPerDay * e.displayS * e.displayMa / 3600;
  const selfDischarge = cells * e.cellMah * e.selfDischargePerMonth / 30.4;
  const mAhPerDay = load + selfDischarge;
  const days = (cells * e.cellMah * e.depth * e.coldFactor) / mAhPerDay;
  return { mAhPerDay, days, months: days / 30.4 };
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
function makeMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o });
  return {
    alu: std(0xc9ced3, { metalness: 0.7, roughness: 0.38 }),
    aluCast: std(0xaeb4b8, { metalness: 0.6, roughness: 0.55 }),
    film: std(0x4a3325, { roughness: 0.8 }), // film-faced plywood, anti-slip mesh face
    plyEdge: std(0xd9bc8e, { roughness: 0.85 }),
    timber: std(0x7c5536, { roughness: 0.8 }), // thermo-pine
    timberDark: std(0x6a462c, { roughness: 0.82 }),
    asa: std(0x2d3033, { roughness: 0.6 }), // 3D-printed ASA, graphite
    steel: std(0x9aa1a8, { metalness: 0.85, roughness: 0.3 }),
    brass: std(0xb8923a, { metalness: 0.8, roughness: 0.35 }),
    black: std(0x1f2122, { roughness: 0.55 }),
    rubber: std(0x151515, { roughness: 0.95 }),
    cellBody: std(0xd4d8db, { metalness: 0.65, roughness: 0.35 }),
    potting: std(0x2b2b2b, { roughness: 0.6 }),
    pod: std(0xf2b705, { roughness: 0.5 }), // Gratheon honey yellow ASA
    podDark: std(0xc98f00, { roughness: 0.5 }),
    gasket: std(0x4a4f52, { roughness: 0.9 }),
    pcb: std(0x16301f, { roughness: 0.6 }),
    can: std(0xbfc5ca, { metalness: 0.8, roughness: 0.3 }),
    chip: std(0x121212, { roughness: 0.5 }),
    screen: std(0x05080a, { roughness: 0.15, metalness: 0.2, emissive: 0x2a6f9a, emissiveIntensity: 0.35 }),
    cellWrapA: std(0x2a63b8, { roughness: 0.45 }),
    cellWrapB: std(0x2f8f5b, { roughness: 0.45 }),
    white: std(0xf1f0ea, { roughness: 0.8 }),
    hdpe: std(0xe9e7df, { roughness: 0.85 }),
    cable: std(0x202326, { roughness: 0.7 }),
    probeSteel: std(0xd0d4d8, { metalness: 0.9, roughness: 0.25 }),
    red: std(0xc8261d, { roughness: 0.45 }),
    wood: [std(0xd7b07a, { roughness: 0.85 }), std(0xcfa46b, { roughness: 0.85 }), std(0xdcba88, { roughness: 0.85 })],
    lid: std(0xb98d5a, { roughness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe6ee, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.4 }),
    opal: std(0xf4f3ee, { roughness: 0.4, transparent: true, opacity: 0.75 }), // Observer roof
    porch: std(0x9ea3a6, { roughness: 0.85 }), // Observer porch, apron, board insert
    eoBorder: std(0x2d6cb0, { roughness: 0.7 }), // Observer board border, painted in the hive colour
    robot: std(0xc4c9ce, { metalness: 0.75, roughness: 0.35, transparent: true, opacity: 0.35, depthWrite: false }),
  };
}

// ---------------------------------------------------------------------------
// Builder helpers (geometry cache keeps the GLB small)
// ---------------------------------------------------------------------------
function helpers() {
  const geoCache = new Map();
  const cached = (key, make) => {
    if (!geoCache.has(key)) geoCache.set(key, make());
    return geoCache.get(key);
  };
  const place = (parent, geo, mat, x, y, z, part) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x * MM, y * MM, z * MM);
    m.castShadow = true;
    m.receiveShadow = true;
    if (part) m.userData.part = part;
    parent.add(m);
    return m;
  };
  const box = (parent, sx, sy, sz, mat, x = 0, y = 0, z = 0, part) =>
    place(parent, cached(`b${sx}|${sy}|${sz}`, () => new THREE.BoxGeometry(sx * MM, sy * MM, sz * MM)), mat, x, y, z, part);
  // Box given by its min corner and size, which reads better for boards and sheet parts.
  const slab = (parent, x0, y0, z0, sx, sy, sz, mat, part) => box(parent, sx, sy, sz, mat, x0 + sx / 2, y0 + sy / 2, z0 + sz / 2, part);
  // Cylinder along an axis ('x' | 'y' | 'z')
  const cyl = (parent, r, len, mat, x = 0, y = 0, z = 0, axis = 'y', part, seg = 20) => {
    const m = place(parent, cached(`c${r}|${len}|${seg}`, () => new THREE.CylinderGeometry(r * MM, r * MM, len * MM, seg)), mat, x, y, z, part);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    return m;
  };
  const group = (parent, name, x = 0, y = 0, z = 0, part) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x * MM, y * MM, z * MM);
    if (part) g.userData.part = part;
    parent.add(g);
    return g;
  };
  // Flexible cable through points given in mm.
  const cable = (parent, pts, r, mat, part = 'cable') => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x * MM, y * MM, z * MM)), false, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 12), r * MM, 8, false), mat);
    m.castShadow = true;
    m.userData.part = part;
    parent.add(m);
    return m;
  };
  return { box, slab, cyl, group, place, cached, cable };
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
export function buildScale(options = {}) {
  const p = { ...DEFAULTS, ...options };
  p.cells = Math.max(2, Math.min(4, Math.round(p.cells)));
  const d = derive(p);
  const M = makeMaterials();
  const { box, slab, cyl, group, place, cached, cable } = helpers();

  const root = new THREE.Group();
  root.name = 'BeehiveScale';
  const nodes = { root, explode: [] };
  // Every movable assembly registers how far it travels in the exploded view.
  const explodable = (g, dx, dy, dz) => {
    g.userData.home = g.position.clone();
    g.userData.explode = new THREE.Vector3(dx * MM, dy * MM, dz * MM);
    nodes.explode.push(g);
    return g;
  };
  // Cables outside the scale are hidden in the exploded view (they would float).
  const fieldCables = group(root, 'fieldCables');
  nodes.fieldCables = fieldCables;

  const B = p.base, K = p.deck, BR = p.bracket, C = p.cell, P = p.pod, H = p.hive;
  const W2 = B.w / 2, D2 = B.d / 2, KW2 = K.w / 2, KD2 = K.d / 2, BW = B.wall;
  const bay = { z: P.w / 2 + 2, h: P.h + 2, x0: W2 - P.len - 2 }; // opening half-width, height, inner end
  const MOUNT_X = p.eo.frameW / 2 - p.eo.post / 2, MOUNT_Y = 38; // under the Observer uprights, below the skirt
  const FMI_Z = D2 - BW / 2; // accessory connector in the middle of the front wall
  const port = { x0: 210, x1: 272, z0: H.d / 2 + 1, z1: KD2 - 3, h: 22 }; // sensor port block on the deck, front right
  // ----- feet ----------------------------------------------------------------
  if (!d.robot) {
    const feet = explodable(group(root, 'feet', 0, 0, 0, 'feet'), 0, -30, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cyl(feet, 5, p.feet.h, M.steel, sx * p.feet.x, p.feet.h / 2 + 4, sz * p.feet.z, 'y', 'feet', 12);
      cyl(feet, 20, 8, M.rubber, sx * p.feet.x, 4, sz * p.feet.z, 'y', 'feet', 28);
      cyl(feet, 9, 6, M.steel, sx * p.feet.x, p.feet.h - 3, sz * p.feet.z, 'y', 'feet', 6); // lock nut
    }
  }

  // ----- base: plywood floor + thermo-pine board walls -------------------------
  const base = explodable(group(root, 'base', 0, d.baseY, 0, 'base'), 0, 0, 0);
  const wallH = B.h - B.floor, wy = B.floor + wallH / 2;
  box(base, B.w, B.floor, B.d, M.plyEdge, 0, B.floor / 2, 0, 'base');
  box(base, B.w - 2, 0.6, B.d - 2, M.timberDark, 0, B.floor + 0.3, 0, 'base'); // sealed face
  for (const s of [-1, 1]) box(base, B.w, wallH, BW, M.timber, 0, wy, s * (D2 - BW / 2), 'base');
  box(base, BW, wallH, B.d - 2 * BW, M.timber, -W2 + BW / 2, wy, 0, 'base');
  // right (service) wall with the rectangular cut for the pod bay
  const sideZ = D2 - BW - bay.z;
  for (const s of [-1, 1]) box(base, BW, wallH, sideZ, M.timber, W2 - BW / 2, wy, s * (bay.z + sideZ / 2), 'base');
  box(base, BW, B.h - B.floor - bay.h, 2 * bay.z, M.timber, W2 - BW / 2, B.floor + bay.h + (B.h - B.floor - bay.h) / 2, 0, 'base');
  // 3D-printed bay sleeve: floor, sides, back, dock connector
  slab(base, bay.x0, B.floor, -bay.z, W2 - bay.x0, 1.5, 2 * bay.z, M.asa, 'bay');
  for (const s of [-1, 1]) slab(base, bay.x0, B.floor, s > 0 ? bay.z - 2 : -bay.z, W2 - bay.x0, bay.h, 2, M.asa, 'bay');
  slab(base, bay.x0 - 2, B.floor, -bay.z, 2, bay.h, 2 * bay.z, M.asa, 'bay');
  box(base, 6, 16, 44, M.black, bay.x0 + 1, B.floor + 20, 30, 'dock');
  // drain holes through the floor
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(base, 6, 1, M.black, sx * (W2 - BW - 16), B.floor + 0.3, sz * (D2 - BW - 16), 'y', 'base', 16);
  // overload stops: tube + bolt head, 1 mm under the deck
  const stopTop = d.deckY - 1 - d.baseY;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (W2 - BW - 14), z = sz * (D2 - BW - 14);
    cyl(base, 9, stopTop - B.floor - 8, M.aluCast, x, B.floor + (stopTop - B.floor - 8) / 2, z, 'y', 'stop', 16);
    cyl(base, 8, 8, M.steel, x, stopTop - 4, z, 'y', 'stop', 6);
  }
  // side bumpers on the outer wall faces (clear of the bay and the mounting points)
  for (const s of [-1, 1]) for (const z of [-150, 150]) box(base, 4, 12, 40, M.rubber, s * (W2 + 2), B.h - 10, z, 'bumper');
  for (const s of [-1, 1]) box(base, 40, 12, 4, M.rubber, 120, B.h - 10, s * (D2 + 2), 'bumper');
  // ambient sensor: printed louvres in the -X wall, under the skirt
  for (let i = 0; i < 4; i++) box(base, 3, 3, 50, M.asa, -W2 - 1, 25 + i * 7, -110, 'sht');
  box(base, 12, 8, 10, M.white, -W2 + BW + 6, 28, -110, 'sht');
  // Entrance Observer mounting points: two M6 threaded inserts in the front wall, under the deck edge
  for (const sx of [-1, 1]) {
    cyl(base, 5, 1, M.brass, sx * MOUNT_X, MOUNT_Y, D2 + 0.5, 'z', 'mount', 16);
    cyl(base, 3, 1.2, M.black, sx * MOUNT_X, MOUNT_Y, D2 + 0.6, 'z', 'mount', 12);
  }
  // accessory connector: M12 socket recessed into the underside of the front wall, facing down
  cyl(base, 8, 14, M.steel, 60, 7, FMI_Z, 'y', 'fmi', 20);
  cyl(base, 10, 0.6, M.black, 60, -0.2, FMI_Z, 'y', 'fmi', 24);
  // internal harness: load cell, front connector and ambient sensor to the dock
  const dockPt = (z) => [bay.x0 - 2, B.floor + 18, z];
  const cellLead = [-C.l / 2 - 28, d.cellY - d.baseY + C.h / 2, 0];
  cable(base, [cellLead, [-C.l / 2 - 40, B.floor + 8, 10], [-150, B.floor + 5, 140], [60, B.floor + 4, 140], [150, B.floor + 4, 100], [bay.x0 - 10, B.floor + 6, 60], dockPt(40)], 2.2, M.cable, 'harness');
  cable(base, [[60, B.floor + 6, D2 - BW], [60, B.floor + 4, D2 - BW - 20], [150, B.floor + 3, 170], [160, B.floor + 3, 120], [bay.x0 - 14, B.floor + 5, 70], dockPt(20)], 2.2, M.cable, 'harness');
  cable(base, [[-W2 + BW + 6, B.floor + 14, -110], [-200, B.floor + 4, -150], [100, B.floor + 3, -150], [150, B.floor + 3, -110], [bay.x0 - 10, B.floor + 6, -40], dockPt(10)], 1.6, M.cable, 'harness');

  // ----- AP62AFB brackets + load cell ----------------------------------------
  const bracket = (name, y, part, dy) => {
    const g = explodable(group(root, name, 0, y, 0, part), 0, dy, 0);
    const X2 = BR.x / 2, Z2 = BR.z / 2, bar = BR.bar, t = BR.t;
    box(g, BR.x, t, bar, M.aluCast, 0, t / 2, Z2 - bar / 2, part);
    box(g, BR.x, t, bar, M.aluCast, 0, t / 2, -Z2 + bar / 2, part);
    box(g, bar, t, BR.z - 2 * bar, M.aluCast, X2 - bar / 2, t / 2, 0, part);
    box(g, bar, t, BR.z - 2 * bar, M.aluCast, -X2 + bar / 2, t / 2, 0, part);
    const armLen = Math.hypot(X2 - 20, Z2 - 20);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const arm = box(g, armLen, t * 0.8, 20, M.aluCast, sx * (X2 - 20) / 2, t * 0.4, sz * (Z2 - 20) / 2, part);
      arm.rotation.y = -Math.atan2(sz * (Z2 - 20), sx * (X2 - 20));
    }
    box(g, 120, t, 70, M.aluCast, 0, t / 2, 0, part);
    return g;
  };
  bracket('bracketLow', d.lowBracketY, 'bracketLow', 25);
  const cellG = explodable(group(root, 'loadcell', 0, d.cellY, 0, 'loadcell'), 0, 115, 0);
  box(cellG, C.l, C.h, C.w, M.cellBody, 0, C.h / 2, 0, 'loadcell');
  for (const s of [-1, 1]) {
    cyl(cellG, 9, 2, M.black, -16, C.h / 2, s * (C.w / 2 + 0.5), 'z', 'loadcell', 24);
    cyl(cellG, 9, 2, M.black, 16, C.h / 2, s * (C.w / 2 + 0.5), 'z', 'loadcell', 24);
    box(cellG, 32, 18, 2, M.black, 0, C.h / 2, s * (C.w / 2 + 0.5), 'loadcell');
    box(cellG, 56, 4, 2.2, M.potting, 0, C.h - 8, s * (C.w / 2 + 0.6), 'loadcell');
  }
  box(cellG, 36, 4, 36, M.aluCast, -C.l / 2 + 22, -2, 0, 'loadcell'); // fixed-end boss
  box(cellG, 36, 4, 36, M.aluCast, C.l / 2 - 22, C.h + 2, 0, 'loadcell'); // live-end boss
  cyl(cellG, 3, 30, M.cable, -C.l / 2 - 15, C.h / 2, 0, 'x', 'loadcell', 10); // lead exit
  bracket('bracketTop', d.topBracketY, 'bracketTop', 205);

  // ----- deck: film-faced plywood + thermo-pine skirt -------------------------
  const deck = explodable(group(root, 'deck', 0, d.deckY, 0, 'deck'), 0, 300, 0);
  box(deck, K.w, K.t - 1, K.d, M.plyEdge, 0, (K.t - 1) / 2, 0, 'deck');
  box(deck, K.w, 1, K.d, M.film, 0, K.t - 0.5, 0, 'deck');
  for (const s of [-1, 1]) {
    box(deck, K.w, K.skirt, K.st, M.timber, 0, -K.skirt / 2, s * (KD2 - K.st / 2), 'deck');
    box(deck, K.st, K.skirt, K.d - 2 * K.st, M.timber, s * (KW2 - K.st / 2), -K.skirt / 2, 0, 'deck');
  }
  const hx = H.w / 2, hz = H.d / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (!(sx > 0 && sz > 0)) box(deck, 40, 20, 8, M.asa, sx * (hx - 16), K.t + 10, sz * (hz + 4), 'locator');
    box(deck, 8, 20, 32, M.asa, sx * (hx + 4), K.t + 10, sz * (hz - 12), 'locator');
  }
  // sensor port: the front-right locator doubles as the probe socket
  slab(deck, port.x0, K.t, port.z0, port.x1 - port.x0, port.h, port.z1 - port.z0, M.asa, 'sensorPort');
  box(deck, 2, 10, 10, M.black, port.x0 - 0.5, K.t + 9, (port.z0 + port.z1) / 2, 'sensorPort'); // socket
  cyl(deck, 5, 1, M.pod, port.x1 - 18, K.t + port.h + 0.4, (port.z0 + port.z1) / 2, 'y', 'sensorPort', 6); // hexagon mark
  // probe groove along the front strip of the deck to the entrance corner
  slab(deck, 128, K.t, port.z0 + 3, port.x0 - 128, 6, 12, M.asa, 'cableGuide');
  box(deck, 90, 14, 2, M.pod, 190, -K.skirt / 2, KD2 + 1, 'deck'); // printed badge
  // transport lock: captive quarter-turn knob on the service-side skirt, next to the pod
  const lock = group(deck, 'transportLock', KW2 + 3, -K.skirt / 2, -bay.z - 45, 'lock');
  cyl(lock, 11, 6, M.asa, 0, 0, 0, 'x', 'lock', 24);
  box(lock, 3, 16, 4, M.asa, 4, 0, 0, 'lock'); // wing grip
  box(lock, 1, 6, 2, M.red, 3.2, 12, 0, 'lock'); // red LOCK mark on the skirt
  cyl(lock, 3, 30, M.steel, -18, 0, 0, 'x', 'lock', 10);

  // ----- hive ------------------------------------------------------------------
  const hive = explodable(group(root, 'hive', 0, d.deckTop, 0, 'hive'), 0, 480, 0);
  nodes.hive = hive;
  const T = H.wall, E2 = H.entrance / 2;
  const hiveMats = [];
  const woodMat = (i) => { const m = M.wood[i % M.wood.length].clone(); hiveMats.push(m); return m; };
  const walls = (g, y0, h, mat) => {
    box(g, H.w, h, T, mat, 0, y0 + h / 2, H.d / 2 - T / 2, 'hive');
    box(g, H.w, h, T, mat, 0, y0 + h / 2, -H.d / 2 + T / 2, 'hive');
    box(g, T, h, H.d - 2 * T, mat, H.w / 2 - T / 2, y0 + h / 2, 0, 'hive');
    box(g, T, h, H.d - 2 * T, mat, -H.w / 2 + T / 2, y0 + h / 2, 0, 'hive');
  };
  // bottom board: floor + walls, entrance slot 15 mm high above the floor at the front
  const bbMat = woodMat(2), bb = d.bottomBoard, floor = 12, entH = 15;
  box(hive, H.w, floor, H.d, bbMat, 0, floor / 2, 0, 'hive');
  box(hive, H.w, bb, T, bbMat, 0, bb / 2, -H.d / 2 + T / 2, 'hive');
  for (const s of [-1, 1]) {
    box(hive, T, bb, H.d - 2 * T, bbMat, s * (H.w / 2 - T / 2), bb / 2, 0, 'hive');
    box(hive, H.w / 2 - E2, bb, T, bbMat, s * (H.w / 2 + E2) / 2, bb / 2, H.d / 2 - T / 2, 'hive');
  }
  box(hive, H.entrance, bb - floor - entH, T, bbMat, 0, floor + entH + (bb - floor - entH) / 2, H.d / 2 - T / 2, 'hive');
  for (let i = 0; i < p.boxes; i++) walls(hive, bb + i * H.h, H.h, woodMat(i));
  const lidY = bb + p.boxes * H.h;
  const lidMat = M.lid.clone();
  hiveMats.push(lidMat);
  box(hive, H.w + 20, H.lid, H.d + 20, lidMat, 0, lidY + H.lid / 2, 0, 'hive');
  nodes.hiveMaterials = hiveMats;

  // ----- electronics pod (slides into the +X bay) -----------------------------
  const pod = explodable(group(root, 'pod', W2 + 0.5, d.floorTop + 1.5, 0, 'pod'), 190, 0, 0);
  nodes.pod = pod;
  const PW2 = P.w / 2, t = 2.5;
  slab(pod, -P.len, 0, -PW2, P.len - 3, t, P.w, M.pod, 'pod');
  for (const s of [-1, 1]) slab(pod, -P.len, 0, s > 0 ? PW2 - t : -PW2, P.len - 3, P.h - 4, t, M.pod, 'pod');
  slab(pod, -P.len, 0, -PW2, t, P.h - 4, P.w, M.pod, 'pod');
  box(pod, 4, 12, 40, M.black, -P.len - 1, 17, 30, 'dock'); // mating half of the dock connector
  const podLid = explodable(group(pod, 'podLid', 0, P.h - 4, 0, 'podLid'), 0, 45, 0);
  slab(podLid, -P.len, 0, -PW2, P.len - 3, 1, P.w, M.gasket, 'podLid');
  slab(podLid, -P.len, 1, -PW2, P.len - 3, 3, P.w, M.pod, 'podLid');
  // face plate: display, button, USB-C flap, vent, quarter-turn latch
  slab(pod, -3, 0, -PW2, 3, P.h, P.w, M.pod, 'pod');
  box(pod, 1, 17, 30, M.black, 0.4, 24, 36, 'face'); // bezel
  box(pod, 1.2, 13, 26, M.screen, 0.6, 24, 36, 'face'); // OLED window
  cyl(pod, 5.5, 3, M.podDark, 1.5, 26, 64, 'x', 'face', 24); // button
  box(pod, 2, 8, 14, M.rubber, 1, 10, 64, 'usbc'); // USB-C flap
  cyl(pod, 3, 1, M.white, 0.6, 10, 36, 'x', 'vent', 16);
  cyl(pod, 4, 2, M.steel, 1, 30, -66, 'x', 'pod', 16); // latch
  const pcb = group(pod, 'pcb', -P.len / 2, 4, 42, 'pcb');
  box(pcb, P.len - 10, 1.6, 62, M.pcb, 0, 0.8, 0, 'pcb');
  box(pcb, 15.4, 2.4, 20.5, M.can, -14, 2.8, 8, 'esp32');
  box(pcb, 10, 1.5, 6, M.chip, 10, 2.4, -14, 'hx711');
  box(pcb, 3, 1, 3, M.chip, 4, 2.1, 22, 'accel');
  box(pcb, 4, 1, 4, M.chip, 12, 2.1, 8, 'charger');
  box(pcb, 2, 0.8, 2, M.chip, 20, 2, 8, 'charger');
  box(pcb, 16, 1, 22, M.gasket, -12, 2.1, -16, 'lora'); // SX1262 footprint
  box(pcb, 10, 3.5, 9, M.steel, P.len / 2 - 8, 3, 22, 'usbc'); // receptacle behind the flap
  box(pcb, 4, 12, 28, M.chip, P.len / 2 - 8, 12, -6, 'face'); // OLED module
  const cart = explodable(group(pod, 'cartridge', 0, 2.5, -30, 'cartridge'), 95, 0, 0);
  slab(cart, -P.len + 5, 0, -42, P.len - 5, 3, 82, M.asa, 'cartridge');
  for (const s of [-1, 1]) slab(cart, -P.len + 5, 0, s > 0 ? 38 : -42, P.len - 5, 22, 4, M.asa, 'cartridge');
  slab(cart, -2, -1.5, -42, 3, P.h - 7, 82, M.podDark, 'cartridge'); // end cap = part of the face
  box(cart, 1.5, 5, 40, M.black, 1.4, 20, 0, 'cartridge'); // grip slot
  nodes.cells = [];
  for (let i = 0; i < 4; i++) {
    const z = -29 + i * 19.5;
    if (i < p.cells) {
      nodes.cells.push(cyl(cart, 9.25, 65, i % 2 ? M.cellWrapB : M.cellWrapA, -P.len / 2 + 1, 12.5, z, 'x', 'battery', 24));
      cyl(cart, 4, 1.5, M.steel, -P.len / 2 + 34, 12.5, z, 'x', 'battery', 12);
    } else {
      box(cart, 62, 2, 16, M.gasket, -P.len / 2 + 1, 4, z, 'cartridge'); // empty slot
    }
  }

  // ----- hive climate probe: sensor port → groove → entrance ----------------
  if (!d.robot) {
    const zc = (port.z0 + port.z1) / 2, gy = d.deckTop + 3, inY = d.entranceY + 2;
    cable(fieldCables, [[port.x0 - 3, d.deckTop + 9, zc], [port.x0 - 14, gy, zc], [150, gy, zc], [134, gy + 2, zc - 2], [128, inY, H.d / 2 + 2], [110, inY, H.d / 2 - 20], [50, inY, 90], [10, inY, 30]], 1.4, M.cable, 'probe');
    cyl(fieldCables, 3.5, 36, M.probeSteel, 0, inY + 1, 10, 'z', 'probe', 16);
    for (let i = 0; i < 4; i++) cyl(fieldCables, 3.7, 1.2, M.black, 0, inY + 1, -2 + i * 3, 'z', 'probe', 16); // vent slots
  }
  // the port's lead: through the deck, down inside the skirt, over the base wall to the harness (hidden)
  {
    const x = (port.x0 + port.x1) / 2 + 10, gapZ = D2 + 4;
    cable(fieldCables, [[x, d.deckY + 2, gapZ], [x, d.deckY - 14, gapZ], [x - 6, d.baseY + B.h + 12, gapZ - 2], [x - 12, d.baseY + B.h + 8, D2 - BW - 6], [x - 20, d.baseY + B.floor + 8, D2 - BW - 12], [bay.x0 - 12, d.baseY + B.floor + 6, 60]], 1.4, M.cable, 'harness');
  }

  const fmiZ = FMI_Z;
  if (d.observer) {
    // Entrance Observer, simplified from its own model: origin at the entrance floor, 14 mm in front of the deck
    const E = p.eo, O = [0, d.entranceY, KD2 + 14];
    const obs = explodable(group(root, 'entranceObserver', ...O, 'observer'), 0, 0, 220);
    nodes.observer = obs;
    const graphite = M.asa, FW = E.frameW / 2, tan = Math.tan((E.slope * Math.PI) / 180);
    const roofUnder = (x) => E.ridge - Math.abs(x) * tan;
    const legBottom = d.baseY + 16 - O[1]; // legs reach down in front of the base
    const riserY = d.baseY + MOUNT_Y - 8 - O[1], riserZ = D2 - O[2]; // back plate on the base wall, under the skirt
    for (const s of [-1, 1]) {
      const x = s * (FW - E.post / 2), top = roofUnder(FW) - 3;
      slab(obs, x - E.post / 2, legBottom, 0, E.post, top - legBottom, E.depth, graphite, 'observer'); // upright
      const len = Math.hypot(FW, roofUnder(0) - roofUnder(FW));
      const rafter = box(obs, len, E.post, E.depth, graphite, s * FW / 2, (roofUnder(FW) + roofUnder(0)) / 2 - 14, E.depth / 2, 'observer');
      rafter.rotation.z = -s * Math.atan2(roofUnder(0) - roofUnder(FW), FW);
      slab(obs, x - E.post / 2, riserY, riserZ, E.post, 16, -riserZ, M.asa, 'observer'); // printed riser: leg → base wall
      slab(obs, x - E.post / 2, riserY - 4, riserZ, E.post, 24, 4, M.asa, 'observer'); // back plate on the inserts
      cyl(obs, 6, 5, M.pod, x, riserY + 8, riserZ + 7, 'z', 'observer', 16); // thumbscrew
    }
    // head: ridge beam, opal gable roof, camera pod with its yellow face
    slab(obs, -15, E.ridge - 40, 2, 30, 36, 186, M.alu, 'observer');
    for (const s of [-1, 1]) {
      const len = E.roofHalfW / Math.cos((E.slope * Math.PI) / 180);
      const sheet = box(obs, len, 3, E.roofLen, M.opal, s * E.roofHalfW / 2, E.ridge - (E.roofHalfW / 2) * tan + 2, 2 + E.roofLen / 2, 'observer');
      sheet.rotation.z = -s * ((E.slope * Math.PI) / 180);
    }
    const pod = E.pod;
    box(obs, pod.w, pod.h, pod.d, M.alu, 0, pod.y + pod.h / 2, pod.z, 'observer');
    // front gable in thermo-pine closes the roof; the pod face is set into it
    const gx = (E.ridge - pod.y) / tan, gz = pod.z + pod.d / 2 - 12;
    const gable = new THREE.Shape();
    gable.moveTo(-gx * MM, pod.y * MM);
    gable.lineTo(gx * MM, pod.y * MM);
    gable.lineTo(0, (E.ridge - 4) * MM);
    gable.closePath();
    place(obs, cached('eoGable', () => new THREE.ExtrudeGeometry(gable, { depth: 12 * MM, bevelEnabled: false })), M.timber, 0, 0, gz, 'observer');
    box(obs, pod.w - 50, pod.h - 14, 2, M.pod, 0, pod.y + pod.h / 2, gz + 13, 'observer');
    box(obs, 48, 24, 1, M.screen, -10, pod.y + pod.h / 2, gz + 14.2, 'observer'); // activity display
    box(obs, 34, 30, 34, M.black, 0, pod.y - 12, pod.z - 30, 'observer'); // lens hood
    // porch over the entrance with the gate lintel, grey apron and the landing board
    const pz0 = H.d / 2 + 2 - O[2];
    slab(obs, -E.porch.w / 2 - 4, 17, pz0, E.porch.w + 8, 4, E.porch.depth - pz0, M.porch, 'observer');
    for (const s of [-1, 1]) slab(obs, s > 0 ? E.porch.w / 2 : -E.porch.w / 2 - 4, 0, pz0, 4, 17, E.porch.depth - pz0, M.porch, 'observer');
    slab(obs, -(FW - E.post), -3, pz0, 2 * (FW - E.post), 3, E.porch.floorEnd - pz0, M.porch, 'observer');
    slab(obs, -E.porch.w / 2 - 4, 17, E.porch.depth - 6, E.porch.w + 8, 21, 6, M.porch, 'observer'); // lintel
    const board = group(obs, 'observerBoard', 0, -2, E.porch.floorEnd, 'observer');
    board.rotation.x = (E.board.slope * Math.PI) / 180;
    slab(board, -E.board.w / 2, -15, 0, E.board.w, 15, E.board.d, M.eoBorder, 'observer');
    slab(board, -E.board.w / 2 + 40, 0, 0, E.board.w - 80, 0.6, E.board.d - 20, M.porch, 'observer'); // grey insert
    // short M12 lead: foot of the right upright → scale accessory connector
    const foot = [O[0] + FW - E.post / 2, d.baseY + 4, O[2] + 27];
    cable(fieldCables, [foot, [foot[0], d.baseY - 10, foot[2] - 4], [foot[0] - 30, d.baseY - 12, D2 + 10], [100, d.baseY - 12, fmiZ + 8], [60, d.baseY - 14, fmiZ], [60, d.baseY - 8, fmiZ]], 2.3, M.cable);
    cyl(fieldCables, 9, 10, M.black, 60, d.baseY - 5, fmiZ, 'y', 'fmi', 20);
  } else if (!d.robot) {
    cyl(base, 9, 4, M.rubber, 60, -2, FMI_Z, 'y', 'fmi', 20); // dust cap on the unused connector
  } else {
    // Robotic Beehive: the robot harness plugs into the accessory connector
    cable(fieldCables, [[60, d.baseY - 8, fmiZ], [60, d.baseY - 30, fmiZ + 4], [80, d.ground - 60, fmiZ + 12], [120, 70, fmiZ]], 2.5, M.cable, 'fmi');
    cyl(fieldCables, 9, 10, M.black, 60, d.baseY - 5, fmiZ, 'y', 'fmi', 20);
  }

  // ----- Robotic Beehive plinth (ghost) ---------------------------------------
  if (d.robot) {
    const R = p.robot, E = R.e, PX = R.post.x, PZ = R.post.z;
    const rb = group(root, 'robotPlinth', 0, 0, 0, 'robot');
    nodes.robot = rb;
    const postH = d.lidTop + 120;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(rb, E, postH - 40, E, M.robot, sx * PX, 40 + (postH - 40) / 2, sz * PZ, 'robot');
      cyl(rb, 22, 10, M.robot, sx * PX, 5, sz * PZ, 'y', 'robot', 24);
    }
    const ring = (y) => {
      box(rb, 2 * PX + E, E, E, M.robot, 0, y, PZ, 'robot');
      box(rb, 2 * PX + E, E, E, M.robot, 0, y, -PZ, 'robot');
      box(rb, E, E, 2 * PZ - E, M.robot, PX, y, 0, 'robot');
      box(rb, E, E, 2 * PZ - E, M.robot, -PX, y, 0, 'robot');
    };
    ring(51);
    ring(R.plinth - 11);
    for (const z of [-p.feet.z, p.feet.z]) box(rb, 2 * PX, E, E, M.robot, 0, R.plinth - 11, z, 'robot');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(rb, 8, 6, M.steel, sx * p.feet.x, R.plinth + 3, sz * p.feet.z, 'y', 'feet', 6);
  }

  const applyExplode = (u) => {
    const e = u * u * (3 - 2 * u);
    for (const g of nodes.explode) g.position.copy(g.userData.home).addScaledVector(g.userData.explode, e);
    fieldCables.visible = u < 0.02;
  };
  applyExplode(0);

  return { root, nodes, params: p, derived: d, applyExplode, MM };
}
