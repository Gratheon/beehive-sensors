// Writes print-ready STL files for the 3D-printed parts (print-parts.js) and
// renders a thumbnail of each for the bill of materials.
//
//   node export-print-parts.mjs                          # print/*.stl + print/*.png
//   node export-print-parts.mjs --website ../../gratheon.com
//
// With --website it also copies the STLs to content/assets/models/beehive-scale-parts/
// and the thumbnails (as WebP, needs cwebp) to the BOM image folder.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import Module from 'manifold-3d';
import { buildPrintParts } from './print-parts.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'print');
mkdirSync(outDir, { recursive: true });

const wasm = await Module();
wasm.setup();

// Binary STL from a manifold mesh (positions in the first three vertex properties).
function toStl(manifold, name) {
  const { vertProperties: v, triVerts: t, numProp } = manifold.getMesh();
  const tris = t.length / 3;
  const buf = Buffer.alloc(84 + tris * 50);
  buf.write(`Gratheon beehive scale - ${name}`.slice(0, 80), 0, 'ascii');
  buf.writeUInt32LE(tris, 80);
  const p = (i) => [v[i * numProp], v[i * numProp + 1], v[i * numProp + 2]];
  for (let i = 0, o = 84; i < tris; i++, o += 50) {
    const [a, b, c] = [p(t[i * 3]), p(t[i * 3 + 1]), p(t[i * 3 + 2])];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const len = Math.hypot(...n) || 1;
    [...n.map((x) => x / len), ...a, ...b, ...c].forEach((x, k) => buf.writeFloatLE(x, o + k * 4));
  }
  return buf;
}

const parts = buildPrintParts(wasm);
for (const part of parts) {
  const m = part.manifold;
  // status() is an embind enum: value 0 = NoError. Empty = a boolean op went wrong.
  if (m.status().value !== 0 || m.isEmpty()) throw new Error(`${part.id}: invalid solid (status ${m.status().value})`);
  part.stl = toStl(m, part.title);
  writeFileSync(join(outDir, `${part.id}.stl`), part.stl);
  const b = m.boundingBox();
  const size = b.max.map((x, i) => (x - b.min[i]).toFixed(0)).join(' × ');
  console.log(`wrote print/${part.id}.stl  ${size} mm, ${(m.volume() / 1000).toFixed(1)} cm³, ${m.numTri()} triangles`);
}

// ---- thumbnails (headless Chrome, WebGL through SwiftShader) ----------------
const chrome = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(existsSync);
if (!chrome) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
const bundle = (await build({ entryPoints: [join(here, 'print-render.js')], bundle: true, format: 'iife', minify: true, write: false })).outputFiles[0].text;
const tmp = mkdtempSync(join(tmpdir(), 'print-parts-'));
for (const part of parts) {
  const page = join(tmp, `${part.id}.html`);
  writeFileSync(page, `<!doctype html><style>html,body{margin:0;overflow:hidden;background:#fff}</style><body>
<script>window.PART=${JSON.stringify({ stl: part.stl.toString('base64'), color: part.color, view: part.view })}</script>
<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>`);
  execFileSync(chrome, [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
    '--window-size=600,600', '--virtual-time-budget=5000', `--screenshot=${join(outDir, `${part.id}.png`)}`,
    pathToFileURL(page).href,
  ], { stdio: 'ignore' });
  console.log(`wrote print/${part.id}.png`);
}
rmSync(tmp, { recursive: true, force: true });

// ---- website ----------------------------------------------------------------
const i = process.argv.indexOf('--website');
if (i > 0) {
  const site = resolve(process.argv[i + 1]);
  const models = join(site, 'content/assets/models/beehive-scale-parts');
  const images = join(site, 'content/docs/beehive-sensors/bom-images');
  mkdirSync(models, { recursive: true });
  for (const part of parts) {
    copyFileSync(join(outDir, `${part.id}.stl`), join(models, `${part.id}.stl`));
    execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '384', '384', join(outDir, `${part.id}.png`), '-o', join(images, `print-${part.id}.webp`)]);
  }
  console.log(`updated ${site}: ${parts.length} STL files, ${parts.length} BOM thumbnails`);
}
