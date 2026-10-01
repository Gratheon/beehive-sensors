// Print-ready solids for the 3D-printed parts of the beehive scale.
//
// scale-model.js draws these parts as simple boxes for the viewer; here each one
// is a closed (manifold) solid with its holes, pockets and grooves, built with
// the manifold-3d CSG kernel so slicers get watertight STL files. Dimensions
// follow scale-model.js DEFAULTS. Units are millimetres, Z is up and every part
// is already oriented for printing without supports (flat face on the bed).
//
// export-print-parts.mjs writes print/<id>.stl and renders the BOM images.
// Optional `view` only affects the thumbnail: `dir` = camera direction (Y-up),
// `flip` = show the part upside down (the face that is on the print bed).

// ASA colours from scale-model.js: graphite for small parts (a shade lighter here,
// so holes and edges still read in a small thumbnail), honey yellow for the pod.
const GRAPHITE = 0x4a5056, HONEY = 0xf2b705;

export const PRINT_PARTS = [
  { id: 'hive-locator', title: 'Hive locator', color: GRAPHITE, build: hiveLocator },
  { id: 'sensor-port', title: 'Sensor port block', color: GRAPHITE, build: sensorPort, view: { dir: [-1, 0.9, 1.1] } },
  { id: 'probe-groove', title: 'Probe groove', color: GRAPHITE, build: probeGroove },
  { id: 'pod-bay-sleeve', title: 'Pod bay sleeve', color: GRAPHITE, build: podBaySleeve },
  { id: 'pod-tub', title: 'Pod enclosure tub', color: HONEY, build: podTub },
  { id: 'pod-lid', title: 'Pod enclosure lid', color: HONEY, build: podLid },
  { id: 'pod-face', title: 'Pod enclosure face', color: HONEY, build: podFace, view: { flip: true } },
  { id: 'battery-cartridge', title: 'Battery cartridge', color: GRAPHITE, build: batteryCartridge },
  { id: 'transport-lock-knob', title: 'Transport lock knob', color: GRAPHITE, build: lockKnob },
  { id: 'ambient-louvre', title: 'Ambient sensor louvre', color: GRAPHITE, build: ambientLouvre, view: { flip: true } },
];

// ---------------------------------------------------------------------------
// Helpers over a manifold-3d module instance (Manifold, CrossSection)
// ---------------------------------------------------------------------------
function kit({ Manifold, CrossSection }) {
  const SEG = 48;
  // Axis-aligned box from its min corner and size, like slab() in scale-model.js.
  const slab = (x, y, z, sx, sy, sz) => Manifold.cube([sx, sy, sz]).translate([x, y, z]);
  // Vertical cylinder standing on z0.
  const cylZ = (r, h, x, y, z0 = 0, seg = SEG) => Manifold.cylinder(h, r, r, seg).translate([x, y, z0]);
  // Cylinder along X / Y starting at x0 / y0.
  const cylX = (r, len, x0, y, z, seg = SEG) => Manifold.cylinder(len, r, r, seg).rotate([0, 90, 0]).translate([x0, y, z]);
  const cylY = (r, len, x, y0, z, seg = SEG) => Manifold.cylinder(len, r, r, seg).rotate([-90, 0, 0]).translate([x, y0, z]);
  // Profile drawn in the YZ plane, extruded along +X from x0.
  const prismX = (pts, x0, len) => new CrossSection([pts]).extrude(len).rotate([90, 0, 90]).translate([x0, 0, 0]);
  // Profile drawn in the XY plane, extruded along +Z from z0.
  const prismZ = (pts, z0, h) => new CrossSection([pts]).extrude(h).translate([0, 0, z0]);
  // Countersunk hole for a wood screw driven from the top face (top at zTop).
  const csk = (x, y, zTop, r = 2.1, head = 4.2) =>
    Manifold.union([
      cylZ(r, zTop + 2, x, y, -1),
      Manifold.cylinder(head - r + 0.01, r, head, SEG).translate([x, y, zTop - (head - r)]),
      cylZ(head, 2, x, y, zTop),
    ]);
  const union = (parts) => Manifold.union(parts);
  return { Manifold, slab, cylZ, cylX, cylY, prismX, prismZ, csk, union };
}

// ---------------------------------------------------------------------------
// Scale mechanics
// ---------------------------------------------------------------------------

// L-shaped corner block (×3). Origin = the hive corner it locates: the hive sits
// at x ≤ 0, y ≤ 0. Arms 10 mm thick, 20 mm high, with a 3 mm lead-in chamfer on
// the inner top edges so the bottom board drops into place.
function hiveLocator(M) {
  const { Manifold, slab, csk, union } = kit(M);
  const T = 10, H = 20, c = 3 * Math.SQRT2;
  let p = union([slab(-36, 0, 0, 36 + T, T, H), slab(0, -28, 0, T, 28 + T, H)]);
  p = p.subtract(Manifold.cube([40, c, c], true).rotate([45, 0, 0]).translate([-18, 0, H]));
  p = p.subtract(Manifold.cube([c, 32, c], true).rotate([0, 45, 0]).translate([0, -14, H]));
  return p.subtract(union([csk(-22, T / 2, H), csk(T / 2, -16, H)]));
}

// Front-right corner block that holds the sealed 4-pin probe socket. The socket
// faces -X (towards the groove and the entrance); its lead turns down through a
// hole in the deck. x 0..62 along the front, y 0 = hive side .. 26 = deck edge.
function sensorPort(M) {
  const { Manifold, slab, cylX, cylZ, csk, union } = kit(M);
  const L = 62, D = 26, H = 22, yc = D / 2, zc = 11;
  return slab(0, 0, 0, L, D, H).subtract(union([
    cylX(6.5, 20, -1, yc, zc), // socket bore, Ø13 × 19
    cylX(3.5, 24, 18, yc, zc), // lead channel
    cylZ(4, zc + 1, 41, yc, -1), // lead drops through the deck here
    cylZ(5, 1, 44, yc, H - 0.6, 6), // engraved hexagon mark (Gratheon)
    csk(54, 7, H), csk(54, D - 7, H),
  ]));
}

// Channel along the front strip of the deck for the flat probe lead. The lead
// presses in past two 1.2 mm lips; two countersunk screws hold the channel.
function probeGroove(M) {
  const { slab, csk, union } = kit(M);
  const L = 82, W = 12, H = 6;
  return slab(0, 0, 0, L, W, H).subtract(union([
    slab(-1, (W - 8) / 2, 2.4, L + 2, 8, 2.6), // 8 × 2.6 lead slot
    slab(-1, (W - 5.6) / 2, 4.9, L + 2, 5.6, 2), // opening between the lips
    csk(10, W / 2, 2.4, 1.6, 3.2), csk(L - 10, W / 2, 2.4, 1.6, 3.2),
  ]));
}

// Sleeve in the service-side wall cut, printed standing on its floor.
// X across the bay, Y = depth from the outer wall face (y 0) into the base,
// Z up. Side flanges cover the cut edges; the back wall holds the dock connector.
function podBaySleeve(M) {
  const { slab, cylY, cylZ, union } = kit(M);
  const IW = 151, IH = 38, t = 2.5, floor = 2, depth = 80;
  const OW = IW + 2 * t, H = floor + IH;
  let p = union([
    slab(-OW / 2, 0, 0, OW, depth, H),
    slab(-OW / 2 - 6, 0, 0, OW + 12, 2, H), // flanges on the outer wall face
  ]);
  p = p.subtract(slab(-IW / 2, -1, floor, IW, depth - t + 1, H));
  // dock connector window (40 × 12) + two M2.5 screw holes, centred like the dock in scale-model.js
  const dx = 30, dz = 20;
  return p.subtract(union([
    slab(dx - 20, depth - t - 1, dz - 6, 40, t + 2, 12),
    cylY(1.35, t + 2, dx - 26, depth - t - 1, dz), cylY(1.35, t + 2, dx + 26, depth - t - 1, dz),
    cylZ(2, floor + 2, -40, 8, -1), cylZ(2, floor + 2, 40, 8, -1), // drain holes by the opening
  ]));
}

// ---------------------------------------------------------------------------
// Electronics pod: 150 × 38 × 76 mm = tub + lid + face, honey-yellow ASA
// ---------------------------------------------------------------------------
// Pod axes in print coordinates: X = 0 at the dock end .. 73 at the face,
// Y = across the face (-75..75), Z up. Lid screws: four M3 into corner bosses.
const POD = { len: 73, w: 150, tubH: 34, wall: 2.5, floor: 2.5, faceT: 3, h: 38 };
// Front bosses stay behind the face plate's locating lip (x 70..73).
const BOSSES = [[5.5, -69.5], [5.5, 69.5], [65, -69.5], [65, 69.5]];
const STANDOFFS = [[12, 16], [12, 64], [60, 16], [60, 64]];

// Open-top, open-front tub. The face is solvent-welded (acetone) to the front.
function podTub(M) {
  const { slab, cylZ, union } = kit(M);
  const { len, w, tubH, wall, floor } = POD;
  let p = slab(0, -w / 2, 0, len, w, tubH).subtract(slab(wall, -w / 2 + wall, floor, len, w - 2 * wall, tubH));
  p = union([
    p,
    ...BOSSES.map(([x, y]) => cylZ(3.5, tubH, x, y)),
    ...STANDOFFS.map(([x, y]) => cylZ(2.5, floor + 1.5, x, y)), // PCB standoffs
    slab(8, 12, 0, 62, 3, floor + 3.5), // cartridge guide rail
  ]);
  return p.subtract(union([
    ...BOSSES.map(([x, y]) => cylZ(1.25, 14, x, y, tubH - 13)), // M3 self-tapping pilots
    ...STANDOFFS.map(([x, y]) => cylZ(1.1, 4, x, y, floor)),
    slab(-1, 10, 11, wall + 2, 40, 12), // dock connector window
  ]));
}

// Flat lid, printed inner face up: groove for a 1.5 mm silicone cord on the rim.
function podLid(M) {
  const { slab, cylZ, union } = kit(M);
  const { len, w, wall } = POD, t = 3, g = 1.6, c = wall / 2;
  // 1 mm deep ring on the rim centre line; the front run presses against the face plate
  const ring = (grow, z0, h) => slab(c - grow, -w / 2 + c - grow, z0, len - 1 - c + 2 * grow, w - 2 * c + 2 * grow, h);
  const groove = ring(g / 2, t - 1, 2).subtract(ring(-g / 2, t - 2, 4));
  return slab(0, -w / 2, 0, len, w, t).subtract(union([groove, ...BOSSES.map(([x, y]) => cylZ(1.65, t + 2, x, y, -1))]));
}

// Face plate, printed outer face down. X = across (-75..75, the pod's Z),
// Y = up (0..38). Openings: OLED window, button, USB-C, vent, latch and the
// battery cartridge slot with a chamfered corner, so the cartridge only fits one way.
function podFace(M) {
  const { slab, cylZ, prismZ, union } = kit(M);
  const { w, h, faceT: t, tubH, wall, floor } = POD;
  const plate = union([
    slab(-w / 2, 0, 0, w, h, t),
    // locating lip that fits inside the tub (right side and top, clear of the cartridge)
    slab(w / 2 - wall - 1.7, floor + 0.5, t, 1.5, tubH - floor - 1, 3),
    slab(12, tubH - 1.7, t, w / 2 - wall - 12.2, 1.5, 3),
  ]);
  const C = CARTRIDGE_SLOT;
  const slot = prismZ([[C.x0, C.y0], [C.x1, C.y0], [C.x1, C.y1], [C.x0 + C.key, C.y1], [C.x0, C.y1 - C.key]], -1, t + 2);
  return plate.subtract(union([
    slot,
    slab(36 - 13, 24 - 6.5, -1, 26, 13, t + 2), // OLED window (glazed from inside)
    cylZ(5.6, t + 2, 64, 26, -1), // sealed button
    slab(64 - 5, 10 - 2.25, -1, 10, 4.5, t + 2), // USB-C behind the rubber flap
    cylZ(2, t + 2, 36, 10, -1), // adhesive ePTFE vent
    cylZ(4.1, t + 2, 20, 10, -1), // quarter-turn latch
  ]));
}
// Cartridge slot in face coordinates (shared with the cartridge end cap).
const CARTRIDGE_SLOT = { x0: -72.5, x1: 10.5, y0: 2.5, y1: 33, key: 6 };

// Keyed sled for 4 × 18650 in parallel, leaf contacts at both ends. Printed on
// its floor; X = insertion axis (0 = rear contacts, 72 = outside of the end cap).
function batteryCartridge(M) {
  const { slab, cylX, prismX, union } = kit(M);
  const L = 69, W = 82, wall = 2.5, floor = 3, sideH = 22, cellR = 9.4, cellZ = 12.5;
  const cells = [12.25, 31.5, 50.75, 70];
  const C = CARTRIDGE_SLOT, capW = C.x1 - C.x0 - 1, capH = C.y1 - C.y0 - 0.5, k = C.key;
  // end cap = part of the pod face; same chamfered corner as the slot (top, at y 0 = the
  // pod's left side, x0 of the slot), 0.5 mm clearance
  const cap = prismX([[0, 0], [capW, 0], [capW, capH], [k, capH], [0, capH - k]], L, 3);
  let p = union([
    slab(0, 0, 0, L, W, floor),
    slab(0, 0, 0, L, wall, sideH), slab(0, W - wall, 0, L, wall, sideH),
    slab(0, 0, 0, 2, W, sideH), // rear contact wall
    slab(L - 1, 0, 0, 1, W, sideH), // front contact wall, against the cap
    cap,
    ...[16, 50].map((x) => slab(x, wall, 0, 4, W - 2 * wall, cellZ)), // cell cradles
  ]);
  return p.subtract(union([
    ...cells.map((y) => cylX(cellR, L - 4, 2.5, y, cellZ)),
    ...cells.map((y) => slab(-1, y - 3, cellZ - 2.5, 4, 6, 5)), // rear leaf-contact tabs
    ...cells.map((y) => slab(L - 2, y - 3, cellZ - 2.5, 4, 6, 5)), // front leaf-contact tabs
    slab(-1, 39.5, floor - 1.5, L, 3, 2), // wire channel under the cells, front bus → rear
    slab(L + 1.2, 20, 16, 2, capW - 40, 6), // finger grip slot in the cap, 1.8 mm deep
  ]));
}

// Knob pressed onto the head of the M8 cam bolt (hex 13 mm), wing grip on top.
// Printed with the open hex pocket on the bed.
function lockKnob(M) {
  const { Manifold, slab, cylZ, union } = kit(M);
  const hexR = 13.2 / Math.sqrt(3); // 13.2 mm across flats
  const knob = union([cylZ(11, 8, 0, 0), slab(-13, -2, 8, 26, 4, 7)]);
  return knob.subtract(union([
    Manifold.cylinder(5.6, hexR, hexR, 6).translate([0, 0, -0.01]), // bolt-head pocket
    cylZ(1.2, 1, 10.5, 0, 14.4), // dot for the red paint mark on the pointer end
  ]));
}

// Louvre insert for the ambient-sensor pocket in the left base wall. Flange on
// the outer face, 45° slats that shed rain outward, a duct through the 22 mm
// wall; the SHT40 board sits at the inner end, shaded by the deck skirt.
function ambientLouvre(M) {
  const { Manifold, slab, union } = kit(M);
  const IX = 50, IY = 28, t = 1.6, depth = 22;
  let p = union([
    slab(-31, -19, 0, 62, 38, 2),
    slab(-IX / 2 - t, -IY / 2 - t, 0, IX + 2 * t, IY + 2 * t, depth),
  ]).subtract(slab(-IX / 2, -IY / 2, -1, IX, IY, depth + 2));
  const slats = union([-10.5, -3.5, 3.5, 10.5].map((y) => Manifold.cube([IX + 0.2, 1.6, 9.9], true).rotate([-45, 0, 0]).translate([0, y, 3.5])))
    .intersect(slab(-IX / 2 - 0.1, -IY / 2 - 0.1, 0, IX + 0.2, IY + 0.2, 8));
  return union([p, slats]);
}

// ---------------------------------------------------------------------------
// Build every part; returns [{ ...part, manifold }]
// ---------------------------------------------------------------------------
export function buildPrintParts(wasm) {
  return PRINT_PARTS.map((part) => ({ ...part, manifold: part.build(wasm) }));
}
