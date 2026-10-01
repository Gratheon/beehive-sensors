// Browser side of export-print-parts.mjs: renders one STL (inlined as base64 in
// window.PART) on a white background for the bill-of-materials thumbnails.
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const { stl, color, view = {} } = window.PART;
const bytes = Uint8Array.from(atob(stl), (c) => c.charCodeAt(0));
const geo = new STLLoader().parse(bytes.buffer);
geo.computeVertexNormals();
// STL is Z-up (print bed); three.js is Y-up.
geo.rotateX(-Math.PI / 2);
if (view.flip) geo.rotateX(Math.PI);
geo.computeBoundingBox();
const center = geo.boundingBox.getCenter(new THREE.Vector3());
geo.translate(-center.x, -geo.boundingBox.min.y, -center.z);
geo.computeBoundingSphere();
const r = geo.boundingSphere.radius;

// Transparent canvas on a white page: a tone-mapped scene.background would come out grey.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
// Fixed square: headless window chrome can make innerHeight smaller than --window-size.
const SIZE = 600;
renderer.setSize(SIZE, SIZE);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b4aa, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(r * 1.5, r * 3, r * 2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -r * 2, right: r * 2, top: r * 2, bottom: -r * 2, near: 0.1, far: r * 10 });
key.shadow.bias = -0.0005;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.6);
fill.position.set(-r * 2, r, -r);
scene.add(fill);

const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 }));
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(r * 20, r * 20), new THREE.ShadowMaterial({ opacity: 0.18 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Isometric-ish view from the front right. Frame the bounding-box corners so
// flat and long parts fill the thumbnail too: re-centre and re-scale a few times.
const camera = new THREE.PerspectiveCamera(30, 1, r / 50, r * 50);
const dir = new THREE.Vector3(...(view.dir || [1, 0.85, 1.25])).normalize();
const target = geo.boundingSphere.center.clone();
const { min, max } = geo.boundingBox.setFromBufferAttribute(geo.attributes.position);
const corners = [];
for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z));
let dist = r / Math.sin(THREE.MathUtils.degToRad(15));
for (let k = 0; k < 4; k++) {
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const ndc = corners.map((c) => c.clone().project(camera));
  const [x0, x1] = [Math.min(...ndc.map((p) => p.x)), Math.max(...ndc.map((p) => p.x))];
  const [y0, y1] = [Math.min(...ndc.map((p) => p.y)), Math.max(...ndc.map((p) => p.y))];
  target.copy(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, target.clone().project(camera).z).unproject(camera));
  dist *= Math.max(x1 - x0, y1 - y0) / 2 / 0.84;
}
camera.position.copy(target).addScaledVector(dir, dist);
camera.lookAt(target);
// Keep drawing: a single synchronous frame is not picked up by headless --screenshot.
renderer.setAnimationLoop(() => renderer.render(scene, camera));
