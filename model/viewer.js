// Interactive beehive scale viewer. mountBeehiveScale(root) wires up one
// viewer.html block; the root's data-bs elements are looked up inside it, so
// the viewer can be embedded in any page (see build-viewer.mjs).
//
// URL hash options (used by render-preview.mjs for product images):
//   #shot                  hide the panel and overlays
//   explode=0.6            exploded-view position 0..1
//   context=robot          show the scale inside the Robotic Beehive plinth
//   hive=solid|ghost|off   hive display
//   theme=light|dark       force the colour theme
//   cam=close              camera close on the scale (product image)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildScale, batteryLife, PARTS } from './scale-model.js';

// Parts list order in the panel, grouped by assembly.
const PART_ORDER = [
  ['Scale', ['deck', 'locator', 'level', 'bracketTop', 'loadcell', 'bracketLow', 'stop', 'bumper', 'base', 'gland', 'feet']],
  ['Pod', ['pod', 'podLid', 'pcb', 'esp32', 'hx711', 'charger', 'lora', 'battery', 'holder', 'm8', 'vent', 'led', 'dock']],
  ['Sensors', ['probe', 'sht', 'cable', 'solar']],
];

const SPECS = (s) => {
  const { derived: d, params: p } = s;
  const life = batteryLife(p.cells);
  return [
    ['Deck', `${p.deck.w} × ${p.deck.d} mm`],
    ['Height', `${Math.round(d.height)} mm + ${p.feet.h} mm feet`],
    ['Capacity', '200 kg (350 kg cell option)'],
    ['Load cell', 'AP62AFB single point, HX711'],
    ['Controller', 'ESP32-S3 · Wi-Fi + BLE (LoRa option)'],
    ['Sensors', 'weight · brood temp · air T/RH · battery'],
    ['Battery', `${p.cells} × 18650 (1S, ${p.cells * 2.5} Ah)`],
    ['Runtime', d.robot ? 'robot 5 V rail on the solar port' : p.solar ? 'all year with 1 W solar' : `≈ ${Math.floor(life.months)} months at 10-min readings`],
    ['Mounting', '4 × M10, 400 × 300 mm'],
    ['Target BOM', '≈ €140–220 at 100 units'],
  ];
};

export function mountBeehiveScale(root) {
  const $ = (name) => root.querySelector(`[data-bs="${name}"]`);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const shot = hash.has('shot');
  if (shot) root.classList.add('bs-shot');
  if (['light', 'dark'].includes(hash.get('theme'))) document.documentElement.dataset.theme = hash.get('theme');

  const canvas = $('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: shot });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 30);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 0.25;
  controls.maxDistance = 6;

  const sun = new THREE.DirectionalLight(0xfff4e0, 2.3);
  sun.position.set(-1.5, 3.2, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1.1, right: 1.1, top: 1.6, bottom: -0.6, near: 0.5, far: 8 });
  sun.shadow.bias = -0.0004;
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  fill.position.set(2, 1.2, -2.5);
  scene.add(sun, fill, new THREE.HemisphereLight(0xdfe8ff, 0x3b4a2c, 0.5));

  const groundMat = new THREE.MeshStandardMaterial({ color: 0xb9c2b0, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5, 64), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const applyThemeColors = () => {
    const cs = getComputedStyle(root);
    scene.background = new THREE.Color(cs.getPropertyValue('--bs-scene').trim() || '#dfe3dc');
    groundMat.color.set(cs.getPropertyValue('--bs-ground').trim() || '#b9c2b0');
  };
  applyThemeColors();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyThemeColors);
  new MutationObserver(applyThemeColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- model ---------------------------------------------------------------
  const opts = {
    context: hash.get('context') === 'robot' ? 'robot' : 'hive',
    cells: 4,
    solar: true,
  };
  let hiveMode = ['solid', 'ghost', 'off'].includes(hash.get('hive')) ? hash.get('hive') : 'ghost';
  let explode = Math.max(0, Math.min(1, Number(hash.get('explode')) || 0));
  let explodeTarget = explode;
  let selected = null;
  let scale;

  const frameCamera = () => {
    if (hash.get('cam') === 'close') {
      controls.target.set(0, 0.1 + explode * 0.14, -0.12);
      camera.position.set(1.05, 0.7 + explode * 0.2, -1.2);
    } else if (opts.context === 'robot') {
      controls.target.set(0, 0.5, -0.05);
      camera.position.set(2.0, 1.45, -2.35);
    } else {
      controls.target.set(0, 0.34, -0.06);
      camera.position.set(1.75, 1.2, -2.05);
    }
  };

  function build() {
    if (scale) {
      scene.remove(scale.root);
      scale.root.traverse((o) => o.geometry?.dispose());
    }
    scale = buildScale(opts);
    scene.add(scale.root);
    scale.applyExplode(explode);
    setHive(hiveMode);
    renderSpecs();
    if (selected) highlight(selected);
  }

  function setHive(mode) {
    hiveMode = mode;
    for (const b of $('hive').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.value === mode));
    scale.nodes.hive.visible = mode !== 'off';
    for (const m of scale.nodes.hiveMaterials) {
      Object.assign(m, { transparent: mode === 'ghost', opacity: mode === 'ghost' ? 0.16 : 1, depthWrite: mode !== 'ghost' });
      m.needsUpdate = true;
    }
    scale.nodes.hive.traverse((o) => { if (o.isMesh && o.userData.part === 'hive') o.castShadow = mode === 'solid'; });
  }

  const pressSeg = (name, value) => {
    for (const b of $(name).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.value === String(value)));
  };

  // ---- selection highlight ------------------------------------------------
  const glow = new Map();
  function highlight(part) {
    for (const [mesh, mat] of glow) mesh.material = mat;
    glow.clear();
    if (!part) return;
    scale.root.traverse((o) => {
      if (!o.isMesh || o.userData.part !== part) return;
      glow.set(o, o.material);
      const m = o.material.clone();
      if (m.emissive) { m.emissive.set(0xf2b705); m.emissiveIntensity = 0.55; }
      o.material = m;
    });
  }
  function select(part) {
    selected = selected === part ? null : part;
    highlight(selected);
    for (const li of $('parts').children) li.classList.toggle('on', li.dataset.part === selected);
    if (selected) showInfo(selected);
  }
  function showInfo(part) {
    $('info-title').textContent = PARTS[part][0];
    $('info-text').textContent = PARTS[part][1];
  }

  // ---- panel ---------------------------------------------------------------
  function renderParts() {
    const list = $('parts');
    list.innerHTML = '';
    let n = 0;
    for (const [groupName, keys] of PART_ORDER) {
      for (const key of keys) {
        const li = document.createElement('li');
        li.tabIndex = 0;
        li.dataset.part = key;
        li.innerHTML = '<span class="n"></span><span class="t"></span><span class="r"></span><span class="d"></span>';
        li.querySelector('.n').textContent = String(++n).padStart(2, '0');
        li.querySelector('.t').textContent = PARTS[key][0];
        li.querySelector('.r').textContent = groupName;
        li.querySelector('.d').textContent = PARTS[key][1];
        li.addEventListener('click', () => select(key));
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(key); } });
        list.appendChild(li);
      }
    }
  }
  function renderSpecs() {
    $('specs').innerHTML = SPECS(scale).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }

  for (const b of $('context').querySelectorAll('button')) {
    b.addEventListener('click', () => {
      opts.context = b.dataset.value;
      pressSeg('context', opts.context);
      build();
      frameCamera();
    });
  }
  for (const b of $('hive').querySelectorAll('button')) b.addEventListener('click', () => setHive(b.dataset.value));
  for (const b of $('cells').querySelectorAll('button')) {
    b.addEventListener('click', () => {
      opts.cells = +b.dataset.value;
      pressSeg('cells', opts.cells);
      build();
    });
  }
  $('solar').addEventListener('change', (e) => { opts.solar = e.target.checked; build(); });
  const explodeBtn = $('explode');
  const scrub = $('scrub');
  explodeBtn.addEventListener('click', () => { explodeTarget = explodeTarget > 0.5 ? 0 : 1; });
  scrub.addEventListener('input', () => { explode = explodeTarget = scrub.value / 1000; });

  // ---- hover / click on the model -----------------------------------------
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    for (const h of ray.intersectObject(scale.root, true)) {
      let o = h.object;
      if (!o.visible || (hiveMode === 'ghost' && o.userData.part === 'hive')) continue;
      let hidden = false;
      for (let q = o; q; q = q.parent) if (!q.visible) hidden = true;
      if (hidden) continue;
      while (o && !o.userData.part) o = o.parent;
      if (o && PARTS[o.userData.part]) return o.userData.part;
    }
    return null;
  };
  let lastPart = null;
  canvas.addEventListener('pointermove', (e) => {
    const part = pick(e);
    if (part && part !== lastPart && !selected) { lastPart = part; showInfo(part); }
  });
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const part = pick(e);
    if (part) select(part);
    else if (selected) select(selected);
  });

  // ---- loop ----------------------------------------------------------------
  const resize = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);

  renderParts();
  pressSeg('context', opts.context);
  build();
  frameCamera();
  const clock = new THREE.Clock();
  let chipState = '';
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (explode !== explodeTarget) {
      const step = dt * 0.9;
      explode = Math.abs(explodeTarget - explode) <= step ? explodeTarget : explode + Math.sign(explodeTarget - explode) * step;
      scale.applyExplode(explode);
      scrub.value = String(Math.round(explode * 1000));
    }
    const state = explode > 0.98 ? 'Exploded' : explode < 0.02 ? 'Assembled' : 'Exploding';
    if (state !== chipState) {
      chipState = state;
      $('chip').textContent = `${state} · ${opts.context === 'robot' ? 'in the Robotic Beehive plinth' : 'stand-alone'}`;
    }
    explodeBtn.textContent = explodeTarget > 0.5 ? 'Assemble' : 'Explode';
    controls.update();
    renderer.render(scene, camera);
  };
  // Only render while the viewer is on screen (it is embedded in long pages).
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { clock.getDelta(); renderer.setAnimationLoop(frame); }
    else renderer.setAnimationLoop(null);
  }).observe(root);
  frame();
  scrub.value = String(Math.round(explode * 1000));
  root.dataset.ready = '1';
}

export function mountAll() {
  for (const root of document.querySelectorAll('[data-beehive-scale]')) {
    if (root.dataset.mounted) continue;
    root.dataset.mounted = '1';
    try {
      mountBeehiveScale(root);
    } catch (err) {
      const note = document.createElement('p');
      note.textContent = `3D preview failed to start: ${err instanceof Error ? err.message : err}`;
      root.replaceChildren(note);
    }
  }
}
