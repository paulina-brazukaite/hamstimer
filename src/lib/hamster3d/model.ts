import * as THREE from "three";

/**
 * The hamster and its props, built from rounded primitives (no asset files),
 * in a hand-painted animated-film look: flat colour bands (toon shading), a thin
 * warm-brown ink outline, big shiny eyes, rosy cheeks, warm wood props and a few
 * grass tufts. Sizes are in "hamster units": the body is about 1.5 long, and
 * y = 0 is the floor. The hamster faces +x.
 *
 * Group layout, so poses can be animated by moving a few pivots:
 *   root            position on the floor, turn (rotation.y)
 *   ├─ backPaws     stay on the floor when it sits up
 *   └─ pitch        tilts the body up around its rear (rotation.z)
 *      └─ inner     the body, head, front paws, tail
 *         ├─ head   tilts and turns the head; holds eyes, ears, cheeks
 *         └─ front  the front paws (and the seed when eating)
 */

export type Materials = ReturnType<typeof createMaterials>;

export function createMaterials() {
  const bands = toonBands();
  const paint = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap: bands });
  return {
    bands,
    prop: paint(0xb57f4c), // warm wood
    propSoft: Object.assign(paint(0xd9ab72), { side: THREE.DoubleSide }), // lighter wood; the bowl is open
    laptopLid: paint(0xc9ccd1),
    laptopKeys: paint(0xe6e4df),
    fur: paint(0xe9a961),
    furDark: paint(0xcf8a4a),
    cream: paint(0xfff4e3),
    pink: paint(0xf3a9a0),
    paw: paint(0xf9d8c8),
    nose: paint(0xe27f76),
    eye: new THREE.MeshBasicMaterial({ color: 0x2e1d15 }),
    glint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    blush: new THREE.MeshBasicMaterial({ color: 0xf28e8e, transparent: true, opacity: 0.55, depthWrite: false }),
    seed: paint(0x4a3b31),
    seedStripe: paint(0xf3ead8),
    choreRed: paint(0xd9574e),
    choreBlue: paint(0x74b3d6),
    choreIron: paint(0x4b4f57),
    bedding: paint(0xead39a),
    bookCover: paint(0x5d8c66),
    bookCover2: paint(0xe8bf55),
    grass: paint(0x8cc068),
    grassDark: paint(0x6aa04f),
    flower: paint(0xfffaf0),
    outline: new THREE.MeshBasicMaterial({ color: 0x4a3122, side: THREE.BackSide }),
    screen: new THREE.MeshStandardMaterial({ color: 0x2a2d33, emissive: 0xf2c230, emissiveIntensity: 0.28, roughness: 0.4 }),
  };
}

/** Four flat light levels for toon shading: shadow, mid, light, highlight. */
function toonBands() {
  const tex = new THREE.DataTexture(new Uint8Array([110, 175, 225, 255]), 4, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * The ink line: each mesh gets a slightly bigger copy of itself,
 * drawn from the inside in dark brown, so only a thin rim shows around it.
 * Meshes marked `userData.noOutline` (eye glints, blush, the screen) are skipped.
 */
export function addOutlines(root: THREE.Object3D, material: THREE.Material, width = 0.02) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !mesh.userData.noOutline && !mesh.userData.isOutline) meshes.push(mesh);
  });
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingSphere();
    const r = mesh.geometry.boundingSphere!.radius * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);
    const line = new THREE.Mesh(mesh.geometry, material);
    line.userData.isOutline = true;
    line.scale.setScalar(1 + width / Math.max(r, 0.05));
    mesh.add(line);
  }
}

function noOutline<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => (c.userData.noOutline = true));
  return o;
}

const SEG = 40;

/** The main body ellipsoid, in the `inner` group's space (stage.ts keeps it on the floor). */
export const BODY = { x: 0.62, y: 0.58, r: 0.62, sx: 1.22, sy: 0.92 };

export function blob(mat: THREE.Material, r: number, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, SEG, SEG / 2), mat);
  m.scale.set(sx, sy, sz);
  return m;
}

export function at<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.position.set(x, y, z);
  return o;
}

export interface Hamster {
  root: THREE.Group;
  pitch: THREE.Group;
  inner: THREE.Group;
  head: THREE.Group;
  front: THREE.Group;
  frontL: THREE.Mesh;
  frontR: THREE.Mesh;
  backL: THREE.Mesh;
  backR: THREE.Mesh;
  eyes: THREE.Group[];
  ears: THREE.Group[];
  cheeks: THREE.Mesh[];
  seed: THREE.Group;
}

export function createHamster(m: Materials): Hamster {
  const root = new THREE.Group();
  const pitch = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.x = 0.62; // pivot sits at the rear of the body
  root.add(pitch);
  pitch.add(inner);

  // Body: a soft pear, darker on the back, cream belly.
  inner.add(at(blob(m.fur, BODY.r, BODY.sx, BODY.sy, 0.98), 0, BODY.y, 0));
  // The back patch and belly blend into the body, so no ink line of their own.
  inner.add(noOutline(at(blob(m.furDark, 0.5, 1.08, 0.6, 0.84), -0.1, 0.84, 0)));
  inner.add(noOutline(at(blob(m.cream, 0.48, 1.02, 0.74, 0.86), 0.22, 0.42, 0)));
  inner.add(at(blob(m.fur, 0.075), -0.72, 0.56, 0)); // tail

  // Head: big for a hamster, which is most of the cuteness.
  const head = at(new THREE.Group(), 0.58, 0.82, 0);
  inner.add(head);
  head.add(blob(m.fur, 0.5, 1.04, 0.94, 1));
  head.add(noOutline(at(blob(m.cream, 0.21), 0.39, -0.11, 0))); // muzzle
  const cheeks = [1, -1].map((s) => {
    const c = at(blob(m.cream, 0.23, 1, 0.92, 1), 0.26, -0.16, 0.22 * s);
    head.add(c);
    return c;
  });
  head.add(at(blob(m.nose, 0.06), 0.6, -0.02, 0));
  // Big, slightly tall eyes with a big and a small highlight.
  const eyes = [1, -1].map((s) => {
    const g = at(new THREE.Group(), 0.31, 0.12, 0.29 * s);
    g.add(blob(m.eye, 0.105, 0.9, 1.15, 1));
    g.add(noOutline(at(blob(m.glint, 0.042), 0.06, 0.05, 0.03 * s)));
    g.add(noOutline(at(blob(m.glint, 0.018), 0.08, -0.045, 0.01 * s)));
    head.add(g);
    return g;
  });
  // Rosy cheeks, and a few fluffy tufts on top of the head.
  for (const s of [1, -1]) {
    const b = noOutline(at(blob(m.blush, 0.085, 0.5, 0.55, 1.1), 0.27, -0.06, 0.36 * s));
    b.rotation.y = 0.5 * s;
    head.add(b);
  }
  const tufts: [number, number, number][] = [
    [0.05, 0.47, 0.1],
    [-0.05, 0.48, -0.06],
    [0.12, 0.44, -0.16],
  ];
  for (const [x, y, z] of tufts) {
    const tuft = at(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), m.fur), x, y, z);
    tuft.rotation.set(z * 1.5, 0, -0.35 + x);
    head.add(tuft);
  }
  const ears = [1, -1].map((s) => {
    const g = at(new THREE.Group(), -0.06, 0.36, 0.25 * s);
    g.rotation.set(0.35 * s, -0.5 * s, 0);
    g.add(blob(m.fur, 0.15, 0.82, 1, 0.42));
    g.add(at(blob(m.pink, 0.1, 0.7, 0.85, 0.24), 0.02, 0.0, 0.035 * s));
    head.add(g);
    return g;
  });

  // Front paws (and the seed they hold while eating).
  const front = at(new THREE.Group(), 0.46, 0.1, 0);
  inner.add(front);
  const frontL = at(blob(m.paw, 0.095, 1.25, 0.7, 1), 0, 0, 0.2);
  const frontR = at(blob(m.paw, 0.095, 1.25, 0.7, 1), 0, 0, -0.2);
  front.add(frontL, frontR);
  const seed = new THREE.Group();
  seed.add(blob(m.seed, 0.09, 0.75, 1.5, 0.75));
  seed.add(at(blob(m.seedStripe, 0.072, 0.25, 1.35, 0.8), 0.055, 0, 0));
  seed.rotation.z = 0.3;
  seed.visible = false;
  front.add(at(seed, 0.12, 0.08, 0));

  // Back paws stay on the floor, outside the pitch pivot.
  const backL = at(blob(m.paw, 0.12, 1.4, 0.6, 1), 0.2, 0.06, 0.3);
  const backR = at(blob(m.paw, 0.12, 1.4, 0.6, 1), 0.2, 0.06, -0.3);
  root.add(backL, backR);

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  return { root, pitch, inner, head, front, frontL, frontR, backL, backR, eyes, ears, cheeks, seed };
}

/** Running wheel, axis along z, centred over the origin. `spin` turns the rungs. */
export function createWheel(m: Materials) {
  const group = new THREE.Group();
  const R = 1.28;
  const D = 0.82; // half the depth
  const cy = R + 0.12;
  const spin = at(new THREE.Group(), 0, cy, 0);
  group.add(spin);
  for (const z of [-D, D]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.045, 16, 96), m.prop);
    ring.position.z = z;
    spin.add(ring);
  }
  const rungGeo = new THREE.CylinderGeometry(0.022, 0.022, D * 2, 10);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const rung = new THREE.Mesh(rungGeo, m.propSoft);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    spin.add(rung);
  }
  const spokeGeo = new THREE.CylinderGeometry(0.028, 0.028, R, 10);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, m.prop);
    spoke.position.set((Math.cos(a) * R) / 2, (Math.sin(a) * R) / 2, -D);
    spoke.rotation.z = a - Math.PI / 2;
    spin.add(spoke);
  }
  spin.add(at(blob(m.prop, 0.09, 1, 1, 0.6), 0, 0, -D));
  // Stand: two legs from the hub at the back down to the floor.
  for (const s of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, cy * 1.05, 12), m.prop);
    leg.position.set(0.32 * s, cy / 2, -D - 0.12);
    leg.rotation.z = 0.24 * s;
    group.add(leg);
  }
  const axle = at(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 10), m.prop), 0, cy, -D - 0.06);
  axle.rotation.x = Math.PI / 2;
  group.add(axle);
  return { group, spin, floorY: cy - R + 0.04 };
}

/** A small laptop on a book (so little paws reach the keys), screen facing -x. */
export function createLaptop(m: Materials) {
  const group = new THREE.Group();
  // Two books stacked, slightly askew.
  const books: [number, number, number, THREE.Material][] = [
    [0.27, 0.135, 0, m.bookCover],
    [0.2, 0.37, 0.12, m.bookCover2],
  ];
  for (const [h, y, turn, cover] of books) {
    // Hard covers top and bottom, a spine, and the pages showing on the other three sides.
    const b = at(new THREE.Group(), 0, y, 0);
    b.rotation.y = turn;
    const t = 0.035;
    for (const s of [1, -1]) b.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.92, t, 1.12), cover), 0, s * (h / 2 - t / 2), 0));
    b.add(at(new THREE.Mesh(new THREE.BoxGeometry(t, h, 1.12), cover), -0.46 + t / 2, 0, 0));
    b.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.86, h - 2 * t, 1.06), m.cream), 0.0, 0, 0));
    group.add(b);
  }
  const laptop = at(new THREE.Group(), -0.2, 0.47, 0);
  group.add(laptop);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.05, 0.98), m.laptopKeys);
  base.position.y = 0.025;
  laptop.add(base);
  const hinge = at(new THREE.Group(), 0.39, 0.05, 0);
  hinge.rotation.z = -0.14; // lid leans back a little, away from the hamster
  laptop.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.58, 0.98), m.laptopLid);
  lid.position.set(0, 0.29, 0);
  hinge.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.48), m.screen);
  screen.position.set(-0.027, 0.3, 0);
  screen.rotation.y = -Math.PI / 2;
  noOutline(screen);
  hinge.add(screen);
  // A little sunflower-seed logo on the back of the lid.
  const logo = new THREE.Group();
  logo.add(blob(m.bookCover2, 0.07, 0.25, 1.5, 0.95));
  logo.add(at(blob(m.cream, 0.05, 0.2, 1.3, 0.3), 0.004, 0, 0));
  logo.rotation.x = 0.5;
  hinge.add(at(logo, 0.03, 0.32, 0));
  // Warm screen light on the hamster's face (switches off with the laptop).
  // Gentle: toon shading jumps a whole band with extra light.
  const glow = new THREE.PointLight(0xffd36b, 0.6, 1.6, 2);
  glow.position.set(-0.35, 0.35, 0);
  hinge.add(glow);
  return { group };
}

/** A shallow seed bowl. */
export function createBowl(m: Materials) {
  const group = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.13, 40, 1, true), m.propSoft);
  bowl.position.y = 0.065;
  group.add(bowl);
  const bottom = at(new THREE.Mesh(new THREE.CircleGeometry(0.26, 40), m.propSoft), 0, 0.005, 0);
  bottom.rotation.x = -Math.PI / 2;
  group.add(bottom);
  const seeds: [number, number, number][] = [
    [-0.1, 0.1, 0.05],
    [0.08, 0.11, -0.06],
    [0.02, 0.12, 0.12],
    [-0.04, 0.13, -0.12],
  ];
  for (const [x, y, z] of seeds) {
    const s = blob(m.seed, 0.06, 0.75, 0.6, 1.5);
    s.position.set(x, y, z);
    s.rotation.y = x * 8;
    group.add(s);
  }
  return { group };
}

/** A round nest of bedding to sleep in. */
export function createNest(m: Materials) {
  const group = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.26, 20, 64), m.bedding);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1, 0.55);
  rim.position.y = 0.14;
  group.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 48), m.bedding);
  floor.position.y = 0.04;
  group.add(floor);
  return { group, floorY: 0.08 };
}

/** Painted look only: a few grass tufts and two tiny flowers at the edges of the floor. */
export function createGrass(m: Materials) {
  const group = new THREE.Group();
  const blade = new THREE.ConeGeometry(0.045, 0.3, 8);
  const tufts: [number, number, number, number][] = [
    [-1.65, 0, 0.35, 1],
    [-1.35, 0, -0.55, 0.8],
    [1.75, 0, 0.15, 0.9],
    [1.45, 0, -0.7, 0.75],
  ];
  for (const [x, y, z, size] of tufts) {
    const tuft = at(new THREE.Group(), x, y, z);
    tuft.scale.setScalar(size);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + x;
      const b = new THREE.Mesh(blade, i % 2 ? m.grass : m.grassDark);
      b.position.set(Math.cos(a) * 0.07, 0.14, Math.sin(a) * 0.07);
      b.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      b.scale.y = 0.8 + ((i * 37) % 10) / 25;
      tuft.add(b);
    }
    group.add(tuft);
  }
  const flowers: [number, number][] = [
    [-1.5, -0.1],
    [1.62, -0.3],
  ];
  for (const [x, z] of flowers) {
    const f = at(new THREE.Group(), x, 0, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), m.grassDark);
    stem.position.y = 0.16;
    f.add(stem);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      f.add(at(blob(m.flower, 0.045, 1, 0.5, 1), Math.cos(a) * 0.05, 0.33, Math.sin(a) * 0.05));
    }
    f.add(at(blob(m.bookCover2, 0.03), 0, 0.34, 0));
    group.add(f);
  }
  return { group };
}

/** A soft contact shadow: a blurred dark ellipse on the floor. */
export function createShadow() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.5, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const material = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    opacity: 0.2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return { mesh, material };
}
