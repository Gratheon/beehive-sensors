// Gratheon beehive scale — parametric model of the Phase 3 production kit.
// Single source of truth for the browser viewer (index.html) and the GLB
// exporter (export-glb.mjs). All dimensions are in millimetres; the scene is
// built in metres (glTF convention).
//
// Axes match robotic-beehive/model/hive-model.js so the scale drops into the
// Robotic Beehive plinth without conversion:
//   X = left/right (frame length), Y = up, Z = front(+)/back(-), entrance at +Z.

import * as THREE from 'three';

const MM = 0.001;
const GLAND_X = 115; // load-cell gland on the back wall, clear of the pod

export const DEFAULTS = {
  context: 'hive', // 'hive' = stand-alone on the ground, 'robot' = inside the Robotic Beehive plinth
  cells: 4, // 18650 cells fitted in the 4-slot holder (2–4)
  boxes: 2, // hive bodies on the scale
  solar: true,
  hive: { w: 506, d: 450, h: 285, wall: 25, lid: 80, bottomBoard: 60, robotBottomBoard: 150 }, // Estonian hive (outer)
  deck: { w: 540, d: 490, t: 3, skirt: 45 },
  base: { w: 524, d: 474, t: 2.5, wall: 60 },
  feet: { x: 200, z: 150, h: 25 }, // 400 × 300 mm pattern = Robotic Beehive deck pads
  cell: { l: 180, w: 45, h: 50 }, // AP62AFB single-point cell (verify against the delivered part)
  bracket: { x: 341.8, z: 254.2, t: 12, bar: 28 }, // AP62AFB weighing brackets
  pod: { w: 150, h: 38, d: 90, wall: 2.5, lid: 7 },
  robot: { plinth: 200, post: { x: 372, z: 302 }, e: 22 }, // from robotic-beehive DEFAULTS
};

// ---------------------------------------------------------------------------
// Part descriptions (shown on hover in the viewer, exported as glTF extras)
// ---------------------------------------------------------------------------
export const PARTS = {
  feet: ['Levelling feet', 'Four M10 stainless feet with rubber pads on a 400 × 300 mm pattern. Level the scale once with the bubble level. In the Robotic Beehive the same four holes bolt the scale to the plinth.'],
  base: ['Base pan', '2.5 mm aluminium (5052) pan with drain holes in every corner. It carries the fixed end of the load cell and is the only part that touches the ground.'],
  bracketLow: ['Lower weighing bracket', 'Cast aluminium bracket from the AP62AFB kit (341.8 × 254.2 mm). It is bolted to the base floor and holds the fixed end of the load cell.'],
  loadcell: ['Single-point load cell', 'AP62AFB aluminium single-point cell, 200 kg (350 kg option), potted and sealed, 4-wire shielded lead. The cell is loaded through its centre, so the reading does not depend on where the weight sits on the deck.'],
  bracketTop: ['Upper weighing bracket', 'The second AP62AFB bracket. It is bolted to the live end of the load cell and to the underside of the deck.'],
  deck: ['Deck', '3 mm aluminium top with a 45 mm skirt all round. The skirt overlaps the base wall by 17 mm with a 5 mm gap, so rain runs off outside and nothing touches the base or bypasses the load cell.'],
  locator: ['Hive locators', 'Four corner angles put the bottom board in the same place every time, centred over the load cell. They also stop the hive sliding off in a storm.'],
  level: ['Bubble level', 'Set into the front skirt. Level the scale during installation: a tilted hive loads the cell off-axis, and its frames hang out of plumb.'],
  stop: ['Overload stop (×4)', 'An M10 bolt under each deck corner, set with a feeler gauge just below the deck. If a beekeeper leans on a corner or drops a box, the stops take the load before the cell passes its safe limit.'],
  bumper: ['Side bumpers', 'EPDM pads on the base wall limit sideways deck travel to 3 mm. They do not touch in normal use, so they never take any of the weight.'],
  gland: ['Cable gland', 'M12 gland where the load-cell lead leaves the base. The lead is clamped inside, so a pull on the cable never reaches the cell.'],
  dock: ['Pod dock', 'Two rails on the back of the base. The pod slides in and clicks into place, and one screw locks it. The back of the hive is where the beekeeper stands, away from the flight path.'],
  pod: ['Electronics pod', 'IP67 ASA housing, 150 × 38 × 90 mm, honey yellow. The same pod runs the stand-alone scale and acts as the Robotic Beehive supervisor.'],
  podLid: ['Pod lid', 'Screwed lid with a silicone gasket and a drip lip. You only open it to swap batteries.'],
  pcb: ['Carrier PCB', 'Gratheon carrier board: ESP32-S3 module, HX711 weight ADC, BQ24074 solar charger, MAX17048 fuel gauge, TPS62840 3.3 V buck, a load switch that powers the sensors only while measuring, and pogo pads for factory flashing.'],
  esp32: ['ESP32-S3-MINI-1', 'Pre-certified Wi-Fi + BLE 5 module with a PCB antenna, about 8 µA in deep sleep. Setup is over BLE from a phone; uploads go over Wi-Fi.'],
  hx711: ['HX711 ADC', '24-bit bridge ADC at 10 Hz. The load switch turns off excitation between readings, which saves battery and stops the cell self-heating.'],
  charger: ['Charger + fuel gauge', 'The BQ24074 charges from a 5–6 V solar panel and uses the pack thermistor to block charging below 0 °C. The MAX17048 reports battery % and voltage with every upload.'],
  lora: ['LoRa option', 'Footprint for an SX1262 module, not fitted on the Wi-Fi SKU. It is fitted for apiaries without Wi-Fi and for the Robotic Beehive supervisor.'],
  battery: ['18650 cells', 'Li-ion 18650 cells, all in parallel (1S), so no balancing is needed. The kit ships with 2 or 4 cells, and they can be swapped without tools.'],
  holder: ['Battery holder', 'Keyed 4-slot 1S holder with a 10 kΩ NTC between the cells for the charger temperature cut-off.'],
  m8: ['M8 connectors', 'Three sealed M8 sockets on the back face under a drip hood: load cell (4-pin), hive probe (3-pin) and solar (3-pin, two contacts used). Any field part can be replaced without opening the pod.'],
  vent: ['Pressure vent', 'ePTFE membrane vent. The pod breathes through it as the temperature changes, instead of pulling damp air in past the seals.'],
  sht: ['Ambient sensor', 'SHT40 temperature and humidity sensor in a louvred radiation shield outside the pod, so heat from the electronics does not skew it.'],
  led: ['Status light + magnet switch', 'A light pipe blinks on every upload. Hold the supplied magnet here for 3 s to wake the pod into BLE setup mode. There is no button hole to leak.'],
  probe: ['Hive temperature probe', 'Stainless DS18B20 probe lying on the top bars in the brood nest, with a 2.5 mm flat cable out through the box seam at the back. Brood-nest temperature shows brood rearing, a queenless colony and where the winter cluster sits.'],
  cable: ['Cables', 'Shielded PUR cables with overmoulded M8 plugs. They run along the back of the scale, away from the landing board.'],
  solar: ['Solar panel (option)', '1 W 6 V panel on the lid. With it the pod runs all year. Without it, see the battery-life figure for the fitted cells at 10-minute readings.'],
  hive: ['Hive', 'A standard hive on the deck: bottom board, bodies and lid. The hive itself needs no changes.'],
  robot: ['Robotic Beehive plinth', 'Ghost of the Robotic Beehive plinth. The scale replaces the four deck pads and bolts to the same 400 × 300 mm holes. The robot hive deck rises by the scale height (88 mm), and the pod becomes the always-on ESP32 supervisor.'],
};

// ---------------------------------------------------------------------------
// Derived geometry and figures
// ---------------------------------------------------------------------------
export function derive(p) {
  const robot = p.context === 'robot';
  const feetH = robot ? 0 : p.feet.h; // bolted straight onto the plinth cross members
  const ground = robot ? p.robot.plinth : 0; // what the scale stands on
  const baseY = ground + feetH;
  const floorTop = baseY + p.base.t;
  const lowBracketY = floorTop; // bottom face of the lower bracket
  const cellY = lowBracketY + p.bracket.t + 4; // 4 mm boss under the fixed end
  const topBracketY = cellY + p.cell.h + 4; // 4 mm boss over the live end
  const deckY = topBracketY + p.bracket.t; // underside of the deck plate
  const deckTop = deckY + p.deck.t;
  const bottomBoard = robot ? p.hive.robotBottomBoard : p.hive.bottomBoard;
  return {
    robot, ground, baseY, floorTop, lowBracketY, cellY, topBracketY, deckY, deckTop,
    height: deckTop - baseY, // the scale stack, without feet
    bottomBoard,
    seam: deckTop + bottomBoard + p.hive.h, // top of the brood box (probe lies here)
    hiveTop: deckTop + bottomBoard + p.boxes * p.hive.h + p.hive.lid,
    podY: baseY + 1,
    podZ: -(p.base.d / 2) - 13 - p.pod.d / 2, // centre of the pod, behind the deck skirt
  };
}

// Energy budget of the pod at the default cadence: weigh every 10 minutes,
// upload a Wi-Fi batch every 30 minutes. Mirrors the table in the website docs
// (docs/beehive-sensors/product-description).
export const ENERGY = {
  sleepMa: 0.02, // ESP32-S3 deep sleep + charger + fuel gauge + buck
  measureS: 0.6, measureMa: 12, measuresPerDay: 144,
  uploadS: 4, uploadMa: 120, uploadsPerDay: 48,
  cellMah: 2500, depth: 0.8, coldFactor: 0.7, selfDischargePerMonth: 0.02,
};
export function batteryLife(cells, e = ENERGY) {
  const load = e.sleepMa * 24 + e.measuresPerDay * e.measureS * e.measureMa / 3600 + e.uploadsPerDay * e.uploadS * e.uploadMa / 3600;
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
    deck: std(0xb9bfc4, { metalness: 0.55, roughness: 0.42 }), // clear-anodised aluminium
    basePan: std(0x2c3135, { metalness: 0.3, roughness: 0.7 }), // graphite powder coat
    steel: std(0x9aa1a8, { metalness: 0.85, roughness: 0.3 }),
    black: std(0x1f2122, { roughness: 0.55 }),
    rubber: std(0x151515, { roughness: 0.95 }),
    cellBody: std(0xd4d8db, { metalness: 0.65, roughness: 0.35 }),
    potting: std(0x2b2b2b, { roughness: 0.6 }),
    pod: std(0xf2b705, { roughness: 0.5 }), // Gratheon honey yellow ASA
    podLid: std(0xe6ab00, { roughness: 0.45 }),
    gasket: std(0x4a4f52, { roughness: 0.9 }),
    pcb: std(0x16301f, { roughness: 0.6 }),
    can: std(0xbfc5ca, { metalness: 0.8, roughness: 0.3 }),
    chip: std(0x121212, { roughness: 0.5 }),
    gold: std(0xd4a93c, { metalness: 0.9, roughness: 0.3 }),
    cellWrapA: std(0x2a63b8, { roughness: 0.45 }),
    cellWrapB: std(0x2f8f5b, { roughness: 0.45 }),
    white: std(0xf1f0ea, { roughness: 0.8 }),
    cable: std(0x202326, { roughness: 0.7 }),
    probeSteel: std(0xd0d4d8, { metalness: 0.9, roughness: 0.25 }),
    wood: [std(0xd7b07a, { roughness: 0.85 }), std(0xcfa46b, { roughness: 0.85 }), std(0xdcba88, { roughness: 0.85 })],
    lid: std(0xb98d5a, { roughness: 0.85 }),
    solar: std(0x14213d, { metalness: 0.4, roughness: 0.25 }),
    bubble: new THREE.MeshPhysicalMaterial({ color: 0xc8f07a, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.8 }),
    led: std(0x6a4a00, { emissive: 0xffc21a, emissiveIntensity: 1.6 }),
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
  // Box given by its min corner and size, which reads better for sheet metal.
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

  const B = p.base, K = p.deck, BR = p.bracket, C = p.cell, P = p.pod;

  // ----- feet ----------------------------------------------------------------
  if (!d.robot) {
    const feet = explodable(group(root, 'feet', 0, 0, 0, 'feet'), 0, -30, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cyl(feet, 5, p.feet.h, M.steel, sx * p.feet.x, p.feet.h / 2 + 4, sz * p.feet.z, 'y', 'feet', 12);
      cyl(feet, 20, 8, M.rubber, sx * p.feet.x, 4, sz * p.feet.z, 'y', 'feet', 28);
      cyl(feet, 9, 6, M.steel, sx * p.feet.x, p.feet.h - 3, sz * p.feet.z, 'y', 'feet', 6); // lock nut
    }
  }

  // ----- base pan ------------------------------------------------------------
  const base = explodable(group(root, 'base', 0, d.baseY, 0, 'base'), 0, 0, 0);
  const W2 = B.w / 2, D2 = B.d / 2;
  box(base, B.w, B.t, B.d, M.basePan, 0, B.t / 2, 0, 'base');
  for (const s of [-1, 1]) {
    box(base, B.w, B.wall, B.t, M.basePan, 0, B.wall / 2, s * (D2 - B.t / 2), 'base');
    box(base, B.t, B.wall, B.d - 2 * B.t, M.basePan, s * (W2 - B.t / 2), B.wall / 2, 0, 'base');
    // stiffening ribs pressed into the floor
    box(base, B.w - 60, 3, 14, M.basePan, 0, B.t + 1.5, s * 60, 'base');
  }
  // drain holes (dark discs just above the floor)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(base, 5, 0.6, M.black, sx * (W2 - 18), B.t + 0.3, sz * (D2 - 18), 'y', 'base', 16);
  // overload stops: tube + bolt head, 1 mm under the deck (exaggerated for visibility)
  const stopTop = d.deckY - 1 - d.baseY;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (W2 - 36), z = sz * (D2 - 34);
    cyl(base, 9, stopTop - B.t - 8, M.aluCast, x, B.t + (stopTop - B.t - 8) / 2, z, 'y', 'stop', 16);
    cyl(base, 8, 8, M.steel, x, stopTop - 4, z, 'y', 'stop', 6);
  }
  // side bumpers on the outer wall faces
  for (const s of [-1, 1]) {
    box(base, 4, 14, 40, M.rubber, s * (W2 + 2), B.wall - 16, 0, 'bumper');
    box(base, 40, 14, 4, M.rubber, 0, B.wall - 16, s * (D2 + 2), 'bumper');
  }
  // gland for the load-cell lead (back wall)
  cyl(base, 9, 10, M.black, GLAND_X, 22, -D2 - 5, 'z', 'gland', 6);
  cyl(base, 6, 8, M.black, GLAND_X, 22, -D2 - 13, 'z', 'gland', 16);
  // pod dock rails
  const dockLen = P.d + 16;
  for (const sx of [-1, 1]) {
    slab(base, sx * (P.w / 2 - 6) - 8, -1, -D2 - dockLen, 16, 3, dockLen, M.alu, 'dock');
    slab(base, sx * (P.w / 2 + 2) - 2, -1, -D2 - dockLen, 4, 12, dockLen, M.alu, 'dock');
  }

  // ----- AP62AFB brackets + load cell ----------------------------------------
  const bracket = (name, y, part, dy) => {
    const g = explodable(group(root, name, 0, y, 0, part), 0, dy, 0);
    const X2 = BR.x / 2, Z2 = BR.z / 2, bar = BR.bar, t = BR.t;
    box(g, BR.x, t, bar, M.aluCast, 0, t / 2, Z2 - bar / 2, part);
    box(g, BR.x, t, bar, M.aluCast, 0, t / 2, -Z2 + bar / 2, part);
    box(g, bar, t, BR.z - 2 * bar, M.aluCast, X2 - bar / 2, t / 2, 0, part);
    box(g, bar, t, BR.z - 2 * bar, M.aluCast, -X2 + bar / 2, t / 2, 0, part);
    // diagonal arms to the centre pad
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
  // twin-bore strain window and potted gauge area on both faces
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

  // ----- deck ------------------------------------------------------------------
  const deck = explodable(group(root, 'deck', 0, d.deckY, 0, 'deck'), 0, 300, 0);
  const KW2 = K.w / 2, KD2 = K.d / 2;
  box(deck, K.w, K.t, K.d, M.deck, 0, K.t / 2, 0, 'deck');
  for (const s of [-1, 1]) {
    box(deck, K.w, K.skirt, K.t, M.deck, 0, K.t - K.skirt / 2, s * (KD2 - K.t / 2), 'deck');
    box(deck, K.t, K.skirt, K.d - 2 * K.t, M.deck, s * (KW2 - K.t / 2), K.t - K.skirt / 2, 0, 'deck');
  }
  // anti-slip rails on top (bees and boxes: nothing slides)
  for (let i = -3; i <= 3; i++) box(deck, K.w - 90, 1.2, 6, M.deck, 0, K.t + 0.6, i * 58, 'deck');
  // hive locators (corner angles)
  const hx = p.hive.w / 2, hz = p.hive.d / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(deck, 40, 25, 3, M.alu, sx * (hx - 17), K.t + 12.5, sz * (hz + 1.5), 'locator');
    box(deck, 3, 25, 40, M.alu, sx * (hx + 1.5), K.t + 12.5, sz * (hz - 17), 'locator');
  }
  // bubble level and badge on the front skirt
  const lvl = place(deck, cached('lvl', () => new THREE.CylinderGeometry(9 * MM, 9 * MM, 4 * MM, 24)), M.bubble, -160, K.t - 20, KD2 + 1, 'level');
  lvl.rotation.x = Math.PI / 2;
  box(deck, 90, 14, 1, M.pod, 150, K.t - 20, KD2 + 0.6, 'deck');
  box(deck, 90, 14, 1, M.pod, -150, K.t - 20, -KD2 - 0.6, 'deck');

  // ----- hive ------------------------------------------------------------------
  const hive = explodable(group(root, 'hive', 0, d.deckTop, 0, 'hive'), 0, 480, 0);
  nodes.hive = hive;
  const H = p.hive, T = H.wall;
  const walls = (g, y0, h, mat) => {
    box(g, H.w, h, T, mat, 0, y0 + h / 2, H.d / 2 - T / 2, 'hive');
    box(g, H.w, h, T, mat, 0, y0 + h / 2, -H.d / 2 + T / 2, 'hive');
    box(g, T, h, H.d - 2 * T, mat, H.w / 2 - T / 2, y0 + h / 2, 0, 'hive');
    box(g, T, h, H.d - 2 * T, mat, -H.w / 2 + T / 2, y0 + h / 2, 0, 'hive');
  };
  const hiveMats = [];
  const woodMat = (i) => { const m = M.wood[i % M.wood.length].clone(); hiveMats.push(m); return m; };
  // bottom board: floor + walls with an entrance slot at the front
  const bbMat = woodMat(2);
  box(hive, H.w, 12, H.d, bbMat, 0, 6, 0, 'hive');
  box(hive, H.w, d.bottomBoard, T, bbMat, 0, d.bottomBoard / 2, -H.d / 2 + T / 2, 'hive');
  for (const s of [-1, 1]) {
    box(hive, T, d.bottomBoard, H.d - 2 * T, bbMat, s * (H.w / 2 - T / 2), d.bottomBoard / 2, 0, 'hive');
    box(hive, H.w / 2 - 150, d.bottomBoard, T, bbMat, s * (H.w / 2 + 150) / 2, d.bottomBoard / 2, H.d / 2 - T / 2, 'hive');
  }
  box(hive, 300, d.bottomBoard - 15, T, bbMat, 0, (d.bottomBoard - 15) / 2 + 15, H.d / 2 - T / 2, 'hive');
  box(hive, 340, 8, 60, bbMat, 0, 11, H.d / 2 + 30, 'hive'); // landing board
  for (let i = 0; i < p.boxes; i++) walls(hive, d.bottomBoard + i * H.h, H.h, woodMat(i));
  const lidY = d.bottomBoard + p.boxes * H.h;
  const lidMat = M.lid.clone();
  hiveMats.push(lidMat);
  box(hive, H.w + 20, H.lid, H.d + 20, lidMat, 0, lidY + H.lid / 2, 0, 'hive');
  nodes.hiveMaterials = hiveMats;
  // DS18B20 probe on the top bars of the brood box, and its flat cable
  const seamY = d.bottomBoard + H.h;
  cyl(hive, 3, 40, M.probeSteel, 0, seamY - 6, -40, 'z', 'probe', 16);
  box(hive, 6, 1.5, H.d / 2 - 40, M.cable, 0, seamY - 1, -(H.d / 2 + 40) / 2, 'probe');
  if (p.solar && !d.robot) { // the Robotic Beehive has its own roof panel
    const panel = group(hive, 'solarPanel', 0, lidY + H.lid, -H.d / 2 + 75, 'solar');
    panel.rotation.x = -0.35;
    box(panel, 8, 40, 8, M.alu, -70, 20, 0, 'solar');
    box(panel, 8, 40, 8, M.alu, 70, 20, 0, 'solar');
    box(panel, 200, 5, 130, M.alu, 0, 42, 0, 'solar');
    box(panel, 192, 5.4, 122, M.solar, 0, 42, 0, 'solar');
    for (let i = 1; i < 4; i++) box(panel, 1, 5.8, 122, M.alu, -96 + i * 48, 42, 0, 'solar');
  }

  // ----- electronics pod -------------------------------------------------------
  const podHome = d.robot ? { x: 180, y: 62, z: -200 } : { x: 0, y: d.podY, z: d.podZ };
  const pod = explodable(group(root, 'pod', podHome.x, podHome.y, podHome.z, 'pod'), 0, 0, d.robot ? -60 : -170);
  nodes.pod = pod;
  const PW2 = P.w / 2, PD2 = P.d / 2, t = P.wall;
  const tubH = P.h - P.lid;
  box(pod, P.w, t, P.d, M.pod, 0, t / 2, 0, 'pod');
  for (const s of [-1, 1]) {
    box(pod, P.w, tubH, t, M.pod, 0, tubH / 2, s * (PD2 - t / 2), 'pod');
    box(pod, t, tubH, P.d - 2 * t, M.pod, s * (PW2 - t / 2), tubH / 2, 0, 'pod');
  }
  // M8 sockets on the back face under a drip hood
  box(pod, 90, 3, 14, M.pod, 20, tubH - 3, -PD2 - 7, 'pod');
  for (const [i, x] of [-15, 20, 55].entries()) {
    cyl(pod, 6, 10, M.steel, x, 13, -PD2 - 5, 'z', 'm8', 16);
    cyl(pod, 4.5, 6, M.black, x, 13, -PD2 - 12, 'z', 'm8', 6);
    nodes[`m8_${i}`] = [x, 13, -PD2 - 15];
  }
  cyl(pod, 5, 2, M.white, -50, -0.5, 20, 'y', 'vent', 20);
  // SHT40 radiation shield on the -X end
  const sht = group(pod, 'sht', -PW2 - 16, tubH / 2 + 2, 10, 'sht');
  for (let i = 0; i < 4; i++) cyl(sht, 14, 2, M.white, 0, -12 + i * 7, 0, 'y', 'sht', 24);
  cyl(sht, 4, 26, M.white, 0, -2, 0, 'y', 'sht', 12);
  box(sht, 8, 6, 6, M.white, 11, 2, 0, 'sht');

  // lid (lifts off in the exploded view)
  const lid = explodable(group(pod, 'podLid', 0, tubH, 0, 'podLid'), 0, 70, 0);
  box(lid, P.w - 4, 1.5, P.d - 4, M.gasket, 0, 0.75, 0, 'podLid');
  box(lid, P.w + 4, P.lid - 1.5, P.d + 4, M.podLid, 0, 1.5 + (P.lid - 1.5) / 2, 0, 'podLid');
  cyl(lid, 3.5, 2, M.led, 50, P.lid + 0.5, -PD2 + 16, 'y', 'led', 16);
  cyl(lid, 7, 0.6, M.white, 28, P.lid + 0.3, -PD2 + 16, 'y', 'led', 20);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(lid, 2.5, 1.2, M.steel, sx * (PW2 - 7), P.lid + 0.4, sz * (PD2 - 7), 'y', 'podLid', 12);

  // battery holder + cells (left half), PCB (right half)
  const batt = explodable(group(pod, 'battery', -PW2 + t + 36, t, 0), 0, 30, 0);
  box(batt, 70, 4, 82, M.black, 0, 2, 0, 'holder');
  for (const s of [-1, 1]) box(batt, 3, 16, 82, M.black, s * 35, 8, 0, 'holder');
  nodes.cells = [];
  for (let i = 0; i < 4; i++) {
    const z = -30 + i * 20;
    if (i < p.cells) {
      nodes.cells.push(cyl(batt, 9.25, 65, i % 2 ? M.cellWrapB : M.cellWrapA, 0, 13.5, z, 'x', 'battery', 24));
      cyl(batt, 4, 1.5, M.steel, 33, 13.5, z, 'x', 'battery', 12);
    } else {
      box(batt, 64, 2, 16, M.gasket, 0, 5, z, 'holder'); // empty slot
    }
  }
  const pcb = explodable(group(pod, 'pcb', PW2 - t - 36, 14, 0, 'pcb'), 0, 48, 0);
  box(pcb, 68, 1.6, 82, M.pcb, 0, 0.8, 0, 'pcb');
  box(pcb, 15.4, 2.4, 20.5, M.can, -14, 2.8, -24, 'esp32');
  box(pcb, 15.4, 0.8, 5, M.black, -14, 2, -37, 'esp32'); // antenna keep-out
  box(pcb, 10, 1.5, 6, M.chip, 12, 2.4, -22, 'hx711');
  box(pcb, 4, 1, 4, M.chip, 10, 2.1, 6, 'charger');
  box(pcb, 2, 0.8, 2, M.chip, 18, 2, 6, 'charger');
  box(pcb, 3, 1, 3, M.chip, -6, 2.1, 8, 'pcb'); // buck
  box(pcb, 16, 1, 26, M.gasket, -8, 2.1, 26, 'lora'); // SX1262 footprint (DNP)
  for (let i = 0; i < 6; i++) cyl(pcb, 1.2, 0.3, M.gold, 20 + (i % 3) * 4, 1.8, 26 + Math.floor(i / 3) * 4, 'y', 'pcb', 10); // pogo pads
  box(pcb, 6, 3, 8, M.white, 26, 3, -36, 'pcb'); // M8 header block

  // ----- cables ----------------------------------------------------------------
  const cables = group(root, 'cables');
  nodes.cables = cables;
  const podWorld = ([x, y, z]) => [podHome.x + x, podHome.y + y, podHome.z + z];
  const gland = [GLAND_X, d.baseY + 22, -D2 - 17];
  const m8 = [0, 1, 2].map((i) => podWorld(nodes[`m8_${i}`]));
  const out = ([x, y, z], dz = 22) => [x, y, z - dz]; // straight out of a socket
  const backZ = podHome.z - PD2 - 14; // behind the pod's back face
  if (!d.robot) {
    const wallZ = -H.d / 2 - 6, skirtZ = -KD2 - 8;
    cable(cables, [gland, [GLAND_X, d.baseY + 20, -D2 - 45], [GLAND_X - 10, d.baseY + 16, backZ - 12], out(m8[1], 30), m8[1]], 2.5, M.cable);
    cable(cables, [m8[0], out(m8[0], 30), [-95, d.baseY + 24, backZ - 6], [-95, d.deckY - 8, skirtZ], [-95, d.deckTop + 30, wallZ], [-45, d.deckTop + seamY - 25, wallZ + 2], [0, d.deckTop + seamY, wallZ + 4]], 1.8, M.cable);
    if (p.solar) {
      const top = d.deckTop + lidY + H.lid;
      cable(cables, [m8[2], out(m8[2], 30), [125, d.baseY + 24, backZ - 6], [150, d.deckY - 8, skirtZ], [150, d.deckTop + 30, wallZ], [150, top - 30, wallZ - 6], [100, top + 6, -H.d / 2 + 10], [60, top + 22, -H.d / 2 + 40]], 1.8, M.cable);
    }
  } else {
    cable(cables, [gland, [GLAND_X, d.baseY + 6, -D2 - 40], [podHome.x + 30, podHome.y + 70, -D2 - 30], out(m8[1], 40), m8[1]], 2.5, M.cable);
  }

  // ----- Robotic Beehive plinth (ghost) ---------------------------------------
  if (d.robot) {
    const R = p.robot, E = R.e, PX = R.post.x, PZ = R.post.z;
    const rb = group(root, 'robotPlinth', 0, 0, 0, 'robot');
    nodes.robot = rb;
    const postH = d.hiveTop + 120;
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
    // deck cross members at z = ±150, the scale's M10 holes land on them
    for (const z of [-p.feet.z, p.feet.z]) box(rb, 2 * PX, E, E, M.robot, 0, R.plinth - 11, z, 'robot');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(rb, 8, 6, M.steel, sx * p.feet.x, R.plinth + 3, sz * p.feet.z, 'y', 'feet', 6);
    // pod bracket on the lower ring
    box(rb, 180, 4, 120, M.robot, podHome.x, 60, podHome.z, 'robot');
  }

  const applyExplode = (u) => {
    const e = u * u * (3 - 2 * u);
    for (const g of nodes.explode) g.position.copy(g.userData.home).addScaledVector(g.userData.explode, e);
    nodes.cables.visible = u < 0.02;
  };
  applyExplode(0);

  return { root, nodes, params: p, derived: d, applyExplode, MM };
}
