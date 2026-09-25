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
//   transport lock. Front modules and solar wings hook onto rails on the base
//   and connect through the landing board to one M12 connector under the
//   front rail. The only cable outside the case is the probe lead into the
//   entrance (and, with a wing or lid panel, one lead run under the base).
// - Wood where a joinery shop can make it (deck, skirt, base boards), 3D printed
//   ASA for small shaped parts, aluminium only where load or wear needs it.

import * as THREE from 'three';

const MM = 0.001;
// Rail sides: rotation about Y that turns the local +Z (outward) frame to that side.
const SIDES = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 };

export const DEFAULTS = {
  context: 'hive', // 'hive' = stand-alone on the ground, 'robot' = inside the Robotic Beehive plinth
  front: 'landing', // front module: 'landing' board or 'observer' (concept)
  solar: 'landing', // panel position: 'landing', 'left', 'back', 'right' (wing on that rail), 'lid' or 'none'
  cells: 4, // 18650 cells fitted in the battery cartridge (2–4)
  boxes: 2, // hive bodies on the scale
  hive: { w: 506, d: 450, h: 285, wall: 25, lid: 80, bottomBoard: 60, robotBottomBoard: 150, entrance: 300 }, // Estonian hive (outer)
  deck: { w: 560, d: 510, t: 18, skirt: 40, st: 20 }, // film-faced plywood top, thermo-pine skirt
  base: { w: 504, d: 454, floor: 12, wall: 22, h: 60 }, // plywood floor, thermo-pine board walls
  feet: { x: 200, z: 150, h: 25 }, // 400 × 300 mm pattern = Robotic Beehive deck pads
  cell: { l: 180, w: 45, h: 50 }, // AP62AFB single-point cell (verify against the delivered part)
  bracket: { x: 341.8, z: 254.2, t: 12, bar: 28 }, // AP62AFB weighing brackets
  pod: { len: 76, h: 38, w: 150 }, // len along X into the bay, w along Z = face width
  board: { w: 440, d: 155, t: 12, slope: 0.1, wingTilt: 0.87 }, // radians: landing 6°, wing 50°
  robot: { plinth: 200, post: { x: 372, z: 302 }, e: 22 }, // from robotic-beehive DEFAULTS
};

// ---------------------------------------------------------------------------
// Part descriptions (shown on hover in the viewer, exported as glTF extras)
// ---------------------------------------------------------------------------
export const PARTS = {
  feet: ['Levelling feet', 'Four M10 feet in threaded inserts, rubber pads, 400 × 300 mm pattern. Level the scale once with the bubble level. In the Robotic Beehive the same four holes bolt the scale to the plinth.'],
  base: ['Base', 'Thermo-pine boards (22 mm) screwed to an 12 mm exterior plywood floor with drain holes. Any joinery shop with a CNC router can make it. It carries the fixed end of the load cell, the pod bay and the rails: everything electrical is on the part that is not weighed.'],
  bracketLow: ['Lower weighing bracket', 'Cast aluminium bracket from the AP62AFB kit (341.8 × 254.2 mm), bolted through the plywood floor. It holds the fixed end of the load cell.'],
  loadcell: ['Single-point load cell', 'AP62AFB aluminium single-point cell, 200 kg (350 kg option), potted and sealed. The cell is loaded through its centre, so the reading does not depend on where the weight sits on the deck.'],
  bracketTop: ['Upper weighing bracket', 'The second AP62AFB bracket, bolted to the live end of the load cell and, through threaded inserts, to the deck plywood.'],
  deck: ['Deck', '18 mm film-faced birch plywood with the anti-slip mesh face used on trailer floors, and a 40 mm thermo-pine skirt. Faces and sealed edges keep rain out, so the deck does not gain weight when wet. The skirt overlaps the base with an 8 mm gap: water runs off outside and nothing bypasses the load cell.'],
  locator: ['Hive locators', '3D-printed ASA corner blocks. They put the bottom board in the same place every time, centred over the load cell, and stop it sliding off in a storm.'],
  level: ['Bubble level', 'Set into the front skirt. Level the scale during installation: a tilted hive loads the cell off-axis, and its frames hang out of plumb.'],
  stop: ['Overload stop (×4)', 'An M10 bolt in a threaded insert under each deck corner, set with a feeler gauge just below the deck. A leaning beekeeper, a dropped box or a heavy snow load lands on the stops, not on the cell.'],
  bumper: ['Side bumpers', 'EPDM pads on the base walls limit sideways deck travel to 4 mm. They do not touch in normal use, so they never take any of the weight.'],
  lock: ['Transport lock', 'Captive quarter-turn lock on the service side, next to the pod. Turned to the red mark it clamps the deck to the base for shipping or moving a hive, so the cell cannot be overloaded. Turned back it weighs; it cannot be lost, and the pod display warns if it is left locked.'],
  harness: ['Internal harness', 'Load cell, front connector and ambient sensor are wired to the pod dock inside the base. No cable runs outside, so sun, rain, mice and hive tools cannot reach it.'],
  bay: ['Pod bay', '3D-printed ASA sleeve in a rectangular cut in the right wall, with guides and the dock connector. The pod sits flush under the deck overhang: nothing sticks out to catch snow, a boot or a hive tool.'],
  dock: ['Dock connector', 'Keyed, gasketed 12-pin connector at the back of the bay. The pod mates with it as it slides in, so fitting a pod is one movement.'],
  pod: ['Electronics pod', 'IP67 housing, 150 × 38 × 76 mm, 3D-printed honey-yellow ASA for pilot batches, moulded later. It slides out of the bay after one quarter-turn, for service or to move it to another scale or the Robotic Beehive.'],
  podLid: ['Pod lid', 'Screwed lid with a silicone gasket. Only opened at the factory or for repair; batteries change through the cartridge.'],
  face: ['Display + button', '0.96″ OLED behind a window and a sealed button on the pod face. Press it to see weight, temperatures, battery, Wi-Fi and the lock state for 15 s and to send a reading now; hold it for 5 s to start BLE setup. The OLED works in frost, unlike e-paper.'],
  usbc: ['USB-C port', 'Under a rubber flap on the pod face. Charges the cells from a power bank or charger without removing anything (for scales without solar), and flashes firmware.'],
  cartridge: ['Battery cartridge', '3D-printed sled with the 2–4 cells. It slides out of the pod face: swap in a charged cartridge in seconds, or charge it at home on USB-C. Keyed so it only fits one way.'],
  battery: ['18650 cells', 'Li-ion 18650 cells, all in parallel (1S), so no balancing is needed. The kit ships with 2 or 4 cells.'],
  pcb: ['Carrier PCB', 'Gratheon carrier board: ESP32-S3 module, HX711 weight ADC, ideal-diode input selector, BQ24074 charger, MAX17048 fuel gauge, TPS62840 3.3 V buck and a load switch that powers sensors and display only when needed.'],
  esp32: ['ESP32-S3-MINI-1', 'Pre-certified Wi-Fi + BLE 5 module, about 8 µA in deep sleep. Setup over BLE from a phone, uploads over Wi-Fi, flashing over the USB-C port.'],
  hx711: ['HX711 ADC', '24-bit bridge ADC at 10 Hz. The load switch turns off excitation between readings, which saves battery and stops the cell self-heating.'],
  charger: ['Charger + fuel gauge', 'The BQ24074 charges from the solar panel, USB-C or the Robotic Beehive 5 V rail, and blocks charging below 0 °C. The MAX17048 reports battery % with every upload.'],
  lora: ['LoRa option', 'Footprint for an SX1262 module, fitted for apiaries without Wi-Fi and for the Robotic Beehive supervisor.'],
  vent: ['Pressure vent', 'ePTFE membrane vent. The pod breathes through it as the temperature changes, instead of pulling damp air in past the seals.'],
  sht: ['Ambient sensor', 'SHT40 behind 3D-printed louvres in the left wall of the base, shaded by the deck skirt and away from the pod electronics and the bees’ exhaust air at the entrance.'],
  rail: ['Accessory rails', 'Aluminium rails on the front, left, back and right of the base, below the deck skirt. Front modules and the solar wing hook on with two 3D-printed hooks and one thumb screw. They carry no hive weight.'],
  fmi: ['Front connector', 'M12 8-pin socket under the front rail, facing down: power in, ground, switched 3.3 V, 1-Wire (probe + module ID chip), UART, wake and shield. The landing board, the Entrance Observer and the Robotic Beehive harness all plug in here.'],
  landing: ['Solar landing board', 'The landing board is the solar panel: 2.5 W ETFE with a textured, bee-safe surface, 440 × 155 mm, 6° slope so rain and snow slide off. Use it when the entrance faces roughly south. It hinges flat for shipping and folds down if something hits it. It hangs on the base, so bees and snow on it are not weighed.'],
  landingPlain: ['Landing board', 'Plain HDPE landing board on the same rail, with the probe socket and an input for a panel mounted elsewhere. Used when the panel goes on a side, back or lid, when there is no solar, and as the even background the Entrance Observer camera needs.'],
  wing: ['Solar wing', 'The same 2.5 W panel module on a wing bracket, hooked on whichever rail faces south, tilted 50° so the low winter sun reaches it and snow slides off. Its lead runs under the base to the landing board.'],
  probe: ['Hive temperature probe', 'Stainless DS18B20 on a semi-rigid 2.5 mm lead. It plugs into the landing board and is pushed in through the entrance until the tip lies under the brood nest. No drilling, and it stays in place during an inspection.'],
  cable: ['Cables', 'The short M12 plug under the landing board and, with a wing or lid panel, one lead run under the base or clipped down the hive corner.'],
  solar: ['Lid panel (option)', 'A panel position on the lid for sites where the base is shaded, with one lead clipped down the front corner of the hive to the landing board. In the Robotic Beehive the roof panel feeds the pod instead.'],
  observer: ['Entrance Observer (concept)', 'Future front module: camera arch over a plain landing board, on the same front rail and connector. It brings its own power (mains or PoE), feeds the pod through the connector, and shares time and readings over UART.'],
  hive: ['Hive', 'A standard hive on the deck: bottom board, bodies and lid. The hive itself needs no changes.'],
  robot: ['Robotic Beehive plinth', 'Ghost of the Robotic Beehive plinth. The scale replaces the four deck pads and bolts to the same 400 × 300 mm holes; the robot harness plugs into the front connector, so the pod runs from the robot 5 V rail and roof panel.'],
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
  const solar = robot ? 'none' : p.solar;
  return {
    robot, ground, baseY, floorTop, lowBracketY, cellY, topBracketY, deckY, deckTop,
    height: deckTop - baseY, // the scale stack, without feet
    skirtBottom: deckY - p.deck.skirt,
    bottomBoard,
    lidTop: deckTop + bottomBoard + p.boxes * p.hive.h + p.hive.lid,
    boardTop: deckTop - 2, // landing board rear edge, just below the deck and entrance
    solar,
    // the landing board is a solar panel only when it is the chosen panel position
    solarBoard: !robot && p.front !== 'observer' && solar === 'landing',
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
    solar: std(0x162a52, { metalness: 0.35, roughness: 0.3 }),
    solarGrid: std(0x8fa3c2, { metalness: 0.6, roughness: 0.4 }),
    bubble: new THREE.MeshPhysicalMaterial({ color: 0xc8f07a, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe6ee, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.4 }),
    concept: std(0x3a4046, { roughness: 0.6, transparent: true, opacity: 0.55 }),
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
  if (!['landing', 'observer'].includes(p.front)) p.front = 'landing';
  if (!['landing', 'left', 'back', 'right', 'lid', 'none'].includes(p.solar)) p.solar = 'landing';
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

  const B = p.base, K = p.deck, BR = p.bracket, C = p.cell, P = p.pod, H = p.hive, BD = p.board;
  const W2 = B.w / 2, D2 = B.d / 2, KW2 = K.w / 2, KD2 = K.d / 2, BW = B.wall;
  const bay = { z: P.w / 2 + 2, h: P.h + 2, x0: W2 - P.len - 2 }; // opening half-width, height, inner end
  // Per side: base and deck half-widths perpendicular to that side, rail length.
  const sideDims = (side) => (side === 'left' || side === 'right' ? { base: W2, deck: KW2 } : { base: D2, deck: KD2 });
  // Local (x, z) in a side frame → world (x, z); local +Z points away from the scale.
  const toWorld = (side, x, y, z) => {
    const a = SIDES[side];
    return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  };
  const railZ = (side) => sideDims(side).deck + 8; // outer face of the rail plate
  const hingeY = d.boardTop - d.baseY; // landing-board hinge height, base-local

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
  // side bumpers on the outer wall faces (clear of the bay and the rails)
  for (const s of [-1, 1]) for (const z of [-150, 150]) box(base, 4, 12, 40, M.rubber, s * (W2 + 2), B.h - 10, z, 'bumper');
  for (const s of [-1, 1]) box(base, 40, 12, 4, M.rubber, 120, B.h - 10, s * (D2 + 2), 'bumper');
  // ambient sensor: printed louvres in the -X wall, under the skirt
  for (let i = 0; i < 4; i++) box(base, 3, 3, 50, M.asa, -W2 - 1, 25 + i * 7, -110, 'sht');
  box(base, 12, 8, 10, M.white, -W2 + BW + 6, 28, -110, 'sht');
  // accessory rails on all four sides, below the deck skirt; the right rail leaves the bay free
  for (const side of Object.keys(SIDES)) {
    const g = group(base, `rail_${side}`, 0, 0, 0, 'rail');
    g.rotation.y = SIDES[side];
    const { base: bh } = sideDims(side);
    const rz = railZ(side);
    const len = side === 'left' || side === 'right' ? 400 : 440;
    const spans = side === 'right' ? [[-len / 2, -bay.z - 6], [bay.z + 6, len / 2]] : [[-len / 2, len / 2]];
    for (const [a, b] of spans) {
      slab(g, a, 16, bh, b - a, 4, rz - bh, M.alu, 'rail');
      slab(g, a, 16, rz - 4, b - a, 30, 4, M.alu, 'rail');
    }
  }
  // front connector (M12, facing down under the front ledge)
  cyl(base, 8, 14, M.steel, 60, 9, D2 + 18, 'y', 'fmi', 20);
  cyl(base, 9.5, 3, M.black, 60, 17, D2 + 18, 'y', 'fmi', 20);
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
    box(deck, 40, 20, 8, M.asa, sx * (hx - 16), K.t + 10, sz * (hz + 4), 'locator');
    box(deck, 8, 20, 32, M.asa, sx * (hx + 4), K.t + 10, sz * (hz - 12), 'locator');
  }
  const lvl = place(deck, cached('lvl', () => new THREE.CylinderGeometry(9 * MM, 9 * MM, 4 * MM, 24)), M.bubble, -200, -K.skirt / 2, KD2 + 1, 'level');
  lvl.rotation.x = Math.PI / 2;
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
  if (d.solar === 'lid') {
    const panel = group(hive, 'lidPanel', 0, lidY + H.lid, -H.d / 2 + 90, 'solar');
    panel.rotation.x = -0.35;
    for (const sx of [-1, 1]) box(panel, 8, 40, 8, M.asa, sx * 90, 20, 0, 'solar');
    box(panel, 250, 5, 160, M.alu, 0, 42, 0, 'solar');
    box(panel, 242, 5.4, 152, M.solar, 0, 42, 0, 'solar');
    for (let i = 1; i < 5; i++) box(panel, 1, 5.8, 152, M.solarGrid, -121 + i * 48.4, 42, 0, 'solar');
  }

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

  // ----- solar panel module (same part as the landing board or as a wing) ------
  const panelTop = (g, part) => {
    box(g, BD.w, BD.t, BD.d, M.alu, 0, -BD.t / 2, BD.d / 2 - 8, part);
    box(g, BD.w - 16, 1, BD.d - 16, M.solar, 0, 0.3, BD.d / 2 - 8, part);
    for (let i = 1; i < 8; i++) box(g, 0.8, 1.2, BD.d - 16, M.solarGrid, -(BD.w - 16) / 2 + i * (BD.w - 16) / 8, 0.4, BD.d / 2 - 8, part);
    for (let i = 1; i < 3; i++) box(g, BD.w - 16, 1.2, 0.8, M.solarGrid, 0, 0.4, i * (BD.d - 16) / 3, part);
  };
  const hookPair = (g, side, topY, part) => {
    const rz = railZ(side);
    for (const sx of [-1, 1]) {
      slab(g, sx * 190 - 10, 20, rz, 20, topY - 20, 4, M.asa, part); // printed bracket
      box(g, 20, 8, 8, M.asa, sx * 190, 44, rz + 2, part); // hook over the rail
    }
  };

  if (!d.robot) {
    // front module: landing board (solar or plain) or the Entrance Observer
    const frontPart = p.front === 'observer' ? 'observer' : d.solarBoard ? 'landing' : 'landingPlain';
    const front = explodable(group(root, 'frontModule', 0, d.baseY, 0, frontPart), 0, 0, 190);
    nodes.front = front;
    const hingeZ = railZ('front') + 6;
    hookPair(front, 'front', hingeY - 4, frontPart);
    for (const sx of [-1, 1]) cyl(front, 4, 12, M.steel, sx * 190, hingeY - 4, hingeZ, 'x', frontPart, 12);
    const board = group(front, 'landingBoard', 0, hingeY, hingeZ, frontPart === 'observer' ? 'landingPlain' : frontPart);
    board.rotation.x = BD.slope;
    if (d.solarBoard) panelTop(board, 'landing');
    else {
      box(board, BD.w, BD.t, BD.d, M.hdpe, 0, -BD.t / 2, BD.d / 2 - 8, 'landingPlain');
      for (let i = 1; i < 6; i++) box(board, BD.w - 20, 0.8, 2, M.white, 0, 0.2, i * BD.d / 6 - 8, 'landingPlain');
    }
    box(board, 14, 6, 10, M.asa, -150, 3, -2, 'probe'); // probe socket on the rear edge
    box(board, 12, 8, 10, M.asa, 200, -BD.t - 4, 30, 'cable'); // input for a panel elsewhere
    // M12 plug from the board to the connector under the front ledge
    const fmiZ = D2 + 18;
    cable(fieldCables, [[60, d.boardTop - 18, hingeZ + 30], [60, d.baseY + 44, hingeZ + 16], [60, d.baseY - 2, fmiZ + 20], [60, d.baseY + 1, fmiZ]], 2.5, M.cable);
    cyl(fieldCables, 9, 12, M.black, 60, d.baseY - 1, fmiZ, 'y', 'fmi', 20);

    if (p.front === 'observer') {
      const obs = group(front, 'observer', 0, 0, 0, 'observer');
      const archTop = hingeY + 290, oz = railZ('front') + 4;
      for (const sx of [-1, 1]) slab(obs, sx * 228 - 8, 20, oz, 16, archTop - 20, 16, M.concept, 'observer');
      slab(obs, -236, archTop, oz, 472, 16, 16, M.concept, 'observer');
      const cam = group(obs, 'observerCam', 0, archTop - 10, oz + 95, 'observer');
      box(cam, 180, 60, 130, M.concept, 0, 0, 0, 'observer');
      box(cam, 200, 6, 150, M.concept, 0, 34, 0, 'observer');
      cyl(cam, 12, 10, M.glass, 0, -34, 20, 'y', 'observer', 24);
    }

    // hive probe: from the socket on the board's rear edge in through the entrance
    const inY = d.deckTop + floor + 3;
    cable(fieldCables, [[-150, d.boardTop + 5, hingeZ + 4], [-146, d.boardTop + 9, hingeZ - 8], [-138, inY + 2, H.d / 2 + 8], [-120, inY, H.d / 2 - 12], [-60, inY, 80], [-15, inY, 25]], 1.4, M.cable, 'probe');
    cyl(fieldCables, 3, 40, M.probeSteel, 0, inY, 0, 'z', 'probe', 16);

    const auxIn = [200, d.boardTop - 24, hingeZ + 30];
    // solar wing on a side rail, with its lead under the base to the landing board
    if (['left', 'back', 'right'].includes(d.solar)) {
      const side = d.solar;
      const wingHinge = hingeY + 40;
      const out = new THREE.Vector3(...toWorld(side, 0, 0, 1));
      const wing = explodable(group(root, `wing_${side}`, 0, d.baseY, 0, 'wing'), out.x * 170, 0, out.z * 170);
      wing.rotation.y = SIDES[side];
      nodes.wing = wing;
      const wz = railZ(side) + 6;
      hookPair(wing, side, wingHinge - 4, 'wing');
      for (const sx of [-1, 1]) {
        cyl(wing, 4, 12, M.steel, sx * 190, wingHinge - 4, wz, 'x', 'wing', 12);
      }
      const panel = group(wing, 'wingPanel', 0, wingHinge, wz, 'wing');
      panel.rotation.x = BD.wingTilt;
      panelTop(panel, 'wing');
      const w = (x, y, z) => { const [X, , Z] = toWorld(side, x, 0, z); return [X, d.baseY + y, Z]; };
      cable(fieldCables, [w(170, wingHinge - 20, wz + 16), w(170, 30, wz + 6), w(160, -6, sideDims(side).base - 40), w(120, -8, 0), [180, d.baseY - 8, D2 - 40], [200, d.baseY + 4, railZ('front') + 16], [205, d.boardTop - 40, hingeZ + 32], auxIn], 1.8, M.cable);
    }
    if (d.solar === 'lid') {
      // one lead from the lid panel down the front-right hive corner, in clips, to the board
      const cx = H.w / 2 + 4, cz = H.d / 2 + 4, top = d.deckTop + lidY + H.lid;
      cable(fieldCables, [[40, top + 30, -H.d / 2 + 80], [cx - 30, top + 6, -H.d / 2 + 60], [cx, top - 20, cz - 40], [cx, top - 60, cz], [cx, d.deckTop + 60, cz], [cx - 20, d.boardTop - 6, hingeZ + 20], auxIn], 1.8, M.cable);
      for (let y = d.deckTop + 120; y < top - 60; y += 170) box(fieldCables, 10, 6, 10, M.asa, cx - 1, y, cz - 1, 'cable');
    }
  } else {
    // Robotic Beehive: the robot harness plugs into the front connector
    const fmiZ = D2 + 18;
    cable(fieldCables, [[60, d.baseY + 1, fmiZ], [60, d.baseY - 30, fmiZ + 12], [80, d.ground - 60, fmiZ + 12], [120, 70, fmiZ]], 2.5, M.cable, 'fmi');
    cyl(fieldCables, 9, 12, M.black, 60, d.baseY - 1, fmiZ, 'y', 'fmi', 20);
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
