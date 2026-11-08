import * as THREE from "three";
import { addOutlines, createGrass, createHamster, createMaterials, createNest, createShadow } from "./model";
import { createClouds, createLandscape, createSky } from "./meadow";
import { groundOffset } from "./stage";

/**
 * The Cheek Stuffer scene: the hamster in a small painted meadow, a line of
 * seeds on its right and the nest on its left. Loaded lazily by CheekStuffer.
 *
 * It only draws what the game tells it to; the rules are in lib/cheek-stuffer.
 * `bank` and `burst` call `done` when their animation ends. It stops drawing
 * while off screen or in a hidden tab. With reduced motion it draws still frames.
 */

export interface CheekGameApi {
  stuff(cheeks: number, fullness: number): void;
  bank(cheeks: number, done: () => void): void;
  burst(cheeks: number, done: () => void): void;
  reset(): void;
  setTheme(theme: { dark: boolean }): void;
  dispose(): void;
}

interface Pose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  headPitch: number;
  frontX: number;
  frontY: number;
  squash: number;
  eyes: number;
}

const HOME: Pose = { x: 0.1, z: 0, yaw: -1.25, pitch: 1.08, headPitch: -1.12, frontX: 0.62, frontY: 0.26, squash: 1, eyes: 1 };
const AT_NEST: Pose = { ...HOME, x: -1.3, z: -0.1, yaw: -2.6 };
const WALK_BACK: Pose = { ...HOME, yaw: -0.2 };
const SQUASHED: Pose = { ...HOME, squash: 0.72, eyes: 0 };
const DAZED: Pose = { ...HOME, eyes: 0 };

// Seconds.
const WADDLE = 0.75;
const SPIT = 0.6;
const RETURN = 0.65;
const SEED_FLIGHT = 0.16;
const BURST_LENGTH = 1.25;
const STILL_ACTION = 0.9; // how long reduced motion holds a message before moving on

const NEST_X = -2.45;
const NEST_Z = -0.1;
const QUEUE_X = 1.55;
const QUEUE_Z = 0.35;
const QUEUE_GAP = 0.42;
const QUEUE_LENGTH = 5;
const SEED_Y = 0.15;
const SEED_SIZE = 1.5;
const FLOOR = 0.08;
const POOL_SIZE = 90; // the fullest possible nest, a burst and the queue

interface Seed {
  obj: THREE.Group;
}
interface Arc {
  seed: Seed;
  t: number;
  length: number;
  from: THREE.Vector3;
  to: THREE.Vector3 | null; // null: the hamster's mouth, wherever it has got to
  height: number;
  pileAt: number; // index in the nest, or -1 to vanish on arrival
}
interface Flung {
  seed: Seed;
  velocity: THREE.Vector3;
  spin: number;
  life: number;
}
type Action = { kind: "bank"; t: number; n: number; spat: number; done: () => void } | { kind: "burst"; t: number; n: number; fired: boolean; done: () => void };

export function createCheekGame(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): CheekGameApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping; // toon colours are shown as painted

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(23, 3 / 2, 0.1, 80);
  camera.position.set(0, 2.5, 13);
  camera.lookAt(-0.1, 1.15, 0);

  const skyDay = createSky("#a8d8ea", "#fdf0d5").texture;
  const skyDusk = createSky("#2b3a5c", "#e0a07a").texture;
  scene.background = skyDusk;

  const hemi = new THREE.HemisphereLight(0xfff1dc, 0xa9c48e, 1.1);
  const key = new THREE.DirectionalLight(0xffe0b0, 2.4);
  key.position.set(3, 5, 5);
  const rim = new THREE.DirectionalLight(0xcfe2ff, 1.1);
  rim.position.set(-4, 3.5, -4);
  scene.add(hemi, key, rim);

  const mats = createMaterials();
  const ham = createHamster(mats);
  const nest = createNest(mats);
  const shadow = createShadow();
  const grass = createGrass(mats);
  nest.group.position.set(NEST_X, 0, NEST_Z);
  grass.group.scale.setScalar(1.9);
  grass.group.position.z = -0.4;
  scene.add(ham.root, nest.group, shadow.mesh, grass.group, createLandscape(mats));
  addOutlines(ham.root, mats.outline);
  addOutlines(nest.group, mats.outline);
  const clouds = createClouds(mats);
  scene.add(...clouds);

  // ---- Seeds: one shared pool, moved between the queue, the air and the nest ----
  const seedBody = new THREE.SphereGeometry(0.09, 14, 10);
  const seedStripe = new THREE.SphereGeometry(0.072, 10, 8);
  const free: Seed[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const obj = new THREE.Group();
    const body = new THREE.Mesh(seedBody, mats.seed);
    body.scale.set(0.75, 1.5, 0.75);
    const stripe = new THREE.Mesh(seedStripe, mats.seedStripe);
    stripe.scale.set(0.25, 1.35, 0.8);
    stripe.position.x = 0.055;
    obj.add(body, stripe);
    obj.visible = false;
    scene.add(obj);
    free.push({ obj });
  }
  const queue: Seed[] = [];
  const arcs: Arc[] = [];
  const flung: Flung[] = [];
  const pile: Seed[] = [];
  let pileCount = 0; // includes seeds still in the air on their way to the nest

  function take(): Seed | undefined {
    const seed = free.pop();
    if (seed) seed.obj.visible = true;
    return seed;
  }
  function release(seed: Seed) {
    seed.obj.visible = false;
    free.push(seed);
  }
  function refillQueue() {
    while (queue.length < QUEUE_LENGTH) {
      const seed = take();
      if (!seed) return;
      seed.obj.position.set(QUEUE_X + (queue.length + 1) * QUEUE_GAP, SEED_Y, QUEUE_Z);
      seed.obj.scale.setScalar(opts.reducedMotion ? SEED_SIZE : 0.001);
      seed.obj.rotation.set(0, 0, 1.4);
      queue.push(seed);
    }
  }
  refillQueue();

  const mouth = new THREE.Vector3();
  function updateMouth() {
    ham.head.updateWorldMatrix(true, false);
    mouth.set(0.55, -0.15, 0);
    ham.head.localToWorld(mouth);
  }

  function pilePosition(i: number) {
    const r = 0.55 * (0.25 + 0.75 * ((i * 0.618) % 1));
    const a = i * 2.4;
    return new THREE.Vector3(NEST_X + Math.cos(a) * r, 0.2 + i * 0.011 * (1 - r / 0.75), NEST_Z + Math.sin(a) * r);
  }
  function placeInPile(seed: Seed, i: number, at: THREE.Vector3) {
    seed.obj.position.copy(at);
    seed.obj.rotation.set(i * 1.3, i * 2.1, 1.4);
    seed.obj.scale.setScalar(SEED_SIZE * 0.8);
    pile.push(seed);
  }
  function spit() {
    const seed = take();
    if (!seed) return;
    arcs.push({ seed, t: 0, length: 0.32, from: mouth.clone(), to: pilePosition(pileCount), height: 0.7, pileAt: pileCount });
    pileCount++;
  }
  function fling() {
    const seed = take();
    if (!seed) return;
    seed.obj.position.copy(mouth);
    seed.obj.scale.setScalar(SEED_SIZE);
    const a = Math.random() * Math.PI * 2;
    const out = 1.5 + Math.random() * 2.5;
    flung.push({ seed, velocity: new THREE.Vector3(Math.cos(a) * out, 3 + Math.random() * 3.5, Math.sin(a) * out * 0.5), spin: 8 + Math.random() * 10, life: 1.5 });
  }

  // ---- What's happening ----
  const cur: Pose = { ...HOME };
  let first = true;
  let t = 0;
  let cheeks = 0;
  let puff = 0; // the cheeks as drawn, in seeds
  let full = 0; // fullness the wobble is following
  let shownFull = 0;
  let gulp = 0; // 1 right after a swallow
  let dizzy = 0; // 1 right after a burst
  let blink = 0;
  let nextBlink = 2;
  let action: Action | null = null;
  let stillTimer: ReturnType<typeof setTimeout> | undefined;

  function ease(dt: number, rate: number) {
    return 1 - Math.exp(-dt * rate);
  }

  function step(dt: number) {
    t += dt;
    const motion = opts.reducedMotion ? 0 : 1;
    updateMouth();

    let target = HOME;
    let cheekTarget = cheeks;
    let rocking = 0;
    let dip = 0;
    let finished: (() => void) | null = null;

    if (action?.kind === "bank") {
      action.t += dt;
      const at = action.t;
      if (at < WADDLE) {
        target = AT_NEST;
        rocking = 1;
      } else if (at < WADDLE + SPIT) {
        target = AT_NEST;
        dip = 0.4;
        const p = (at - WADDLE) / SPIT;
        cheekTarget = action.n * (1 - p);
        for (const due = Math.floor(p * action.n); action.spat < due; action.spat++) spit();
      } else {
        for (; action.spat < action.n; action.spat++) spit();
        target = WALK_BACK;
        rocking = 1;
        cheekTarget = 0;
      }
      if (at >= WADDLE + SPIT + RETURN) {
        cheeks = 0;
        finished = action.done;
        action = null;
      }
    } else if (action?.kind === "burst") {
      action.t += dt;
      if (action.t >= 0 && !action.fired) {
        action.fired = true;
        for (let i = 0; i < action.n; i++) fling();
        cheeks = cheekTarget = puff = 0;
        full = shownFull = 0;
        dizzy = 1;
      }
      if (action.fired) target = action.t < 0.35 ? SQUASHED : action.t < 0.85 ? DAZED : HOME;
      if (action.t >= BURST_LENGTH) {
        finished = action.done;
        action = null;
      }
    }

    const k = first ? 1 : ease(dt, 6);
    for (const p of Object.keys(cur) as (keyof Pose)[]) cur[p] += (target[p] - cur[p]) * k;
    puff += (cheekTarget - puff) * (first ? 1 : ease(dt, 16));
    shownFull += (full - shownFull) * (first ? 1 : ease(dt, 10));
    first = false;
    gulp = Math.max(0, gulp - dt * 6);
    dizzy = Math.max(0, dizzy - dt * 1.1);

    // The fuller the cheeks, the worse the wobble. It is how you read the hidden limit.
    const wobble = shownFull * shownFull * motion;
    const rock = Math.sin(t * 14) * 0.16 * rocking * motion;
    const hop = Math.abs(Math.sin(t * 14)) * 0.06 * rocking * motion;
    const breath = Math.sin(t * 2.4) * 0.012 * motion;

    ham.root.position.set(cur.x + Math.sin(t * 47) * 0.012 * wobble, groundOffset(cur.pitch, cur.squash) + hop, cur.z);
    ham.root.rotation.set(rock, cur.yaw, 0);
    ham.pitch.rotation.z = cur.pitch;
    ham.inner.scale.set(1 + (1 - cur.squash) * 0.5 + breath * 0.5, cur.squash * (1 + breath), 1 + (1 - cur.squash) * 0.5 + breath * 0.5);

    ham.head.rotation.z = cur.headPitch - dip - shownFull * 0.12 + gulp * 0.1 * motion;
    ham.head.rotation.x = Math.sin(t * (16 + 26 * shownFull)) * 0.07 * wobble;
    ham.head.rotation.y = Math.sin(t * 22) * 0.32 * dizzy * motion; // shaking it off

    if (motion && t > nextBlink) {
      blink = 1;
      nextBlink = t + 2.5 + Math.random() * 4;
    }
    blink = Math.max(0, blink - dt * 7);
    const open = cur.eyes * (1 - Math.sin(Math.min(1, blink) * Math.PI));
    const bulge = 1 + wobble * 0.3;
    for (const e of ham.eyes) e.scale.set(bulge, Math.max(0.12, open) * bulge, bulge);

    // The cheeks, far past anything the model was drawn for. The ink line stays thin.
    const size = (1 + puff * 0.14 + gulp * 0.12 * motion) * (1 + Math.sin(t * 30) * 0.02 * wobble);
    ham.cheeks.forEach((c, i) => {
      c.scale.set(size, size * 0.92, size);
      c.position.set(0.26, -0.16 - puff * 0.012, (i === 0 ? 1 : -1) * (0.22 + puff * 0.055));
      c.children[0]?.scale.setScalar(1 + 0.02 / (0.23 * size));
    });

    ham.front.position.set(cur.frontX, cur.frontY, 0);
    const shuffle = Math.sin(t * 14) * 0.1 * rocking * motion;
    ham.backL.position.set(-0.12 + shuffle, 0.06, 0.3);
    ham.backR.position.set(-0.12 - shuffle, 0.06, -0.3);

    shadow.mesh.position.x = cur.x;
    shadow.mesh.position.z = cur.z;
    shadow.mesh.scale.set(2 + puff * 0.1, 0.84 + puff * 0.04, 1);

    // Seeds.
    queue.forEach((seed, i) => {
      const o = seed.obj;
      const before = o.position.x;
      o.position.x += (QUEUE_X + i * QUEUE_GAP - before) * (dt ? ease(dt, 12) : 1);
      o.rotation.x -= (o.position.x - before) * 8;
      o.scale.setScalar(o.scale.x + (SEED_SIZE - o.scale.x) * (dt ? ease(dt, 12) : 1));
    });
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.t += dt;
      const p = Math.min(1, a.t / a.length);
      const end = a.to ?? mouth;
      a.seed.obj.position.lerpVectors(a.from, end, p);
      a.seed.obj.position.y += Math.sin(p * Math.PI) * a.height;
      a.seed.obj.rotation.z += dt * 14;
      if (p < 1) continue;
      arcs.splice(i, 1);
      if (a.pileAt >= 0) placeInPile(a.seed, a.pileAt, end);
      else release(a.seed);
    }
    for (let i = flung.length - 1; i >= 0; i--) {
      const f = flung[i];
      f.life -= dt;
      f.velocity.y -= 9 * dt;
      const o = f.seed.obj;
      o.position.addScaledVector(f.velocity, dt);
      if (o.position.y < FLOOR) {
        o.position.y = FLOOR;
        f.velocity.y *= -0.45;
        f.velocity.x *= 0.6;
        f.velocity.z *= 0.6;
        f.spin *= 0.6;
      }
      o.rotation.x += f.spin * dt;
      o.rotation.z += f.spin * 0.7 * dt;
      if (f.life < 0.25) o.scale.setScalar(Math.max(0.001, SEED_SIZE * (f.life / 0.25)));
      if (f.life <= 0) {
        flung.splice(i, 1);
        release(f.seed);
      }
    }

    clouds.forEach((c, i) => {
      c.position.x += dt * (0.05 + i * 0.02) * motion;
      if (c.position.x > 11) c.position.x = -11;
    });

    finished?.();
  }

  // ---- Loop ----
  let raf = 0;
  let last = 0;
  let onScreen = true;

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    step(dt);
    renderer.render(scene, camera);
    schedule();
  }
  function schedule() {
    if (opts.reducedMotion || raf || !onScreen || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function still() {
    first = true;
    step(0);
    renderer.render(scene, camera);
  }
  function resize() {
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (opts.reducedMotion) still();
  }

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) schedule();
    else stopLoop();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  function onVisibility() {
    if (document.hidden) stopLoop();
    else schedule();
  }
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  still();
  schedule();

  /** Reduced motion skips the animation but still holds the message for a moment. */
  function finishStill(done: () => void) {
    still();
    stillTimer = setTimeout(done, STILL_ACTION * 1000);
  }

  return {
    stuff(n, fullness) {
      cheeks = n;
      full = fullness;
      if (opts.reducedMotion) {
        still();
        return;
      }
      gulp = 1;
      const seed = queue.shift();
      if (seed) arcs.push({ seed, t: 0, length: SEED_FLIGHT, from: seed.obj.position.clone(), to: null, height: 0.35, pileAt: -1 });
      refillQueue();
    },
    bank(n, done) {
      full = 0;
      if (opts.reducedMotion) {
        cheeks = 0;
        for (let i = 0; i < n; i++) {
          const seed = take();
          if (seed) placeInPile(seed, pileCount, pilePosition(pileCount));
          pileCount++;
        }
        finishStill(done);
        return;
      }
      cheeks = n;
      action = { kind: "bank", t: 0, n, spat: 0, done };
    },
    burst(n, done) {
      if (opts.reducedMotion) {
        cheeks = 0;
        full = 0;
        finishStill(done);
        return;
      }
      const seed = queue.shift();
      if (seed) arcs.push({ seed, t: 0, length: SEED_FLIGHT, from: seed.obj.position.clone(), to: null, height: 0.35, pileAt: -1 });
      refillQueue();
      action = { kind: "burst", t: -SEED_FLIGHT, n, fired: false, done };
    },
    reset() {
      for (const seed of pile.splice(0)) release(seed);
      pileCount = 0;
      cheeks = 0;
      full = 0;
      if (opts.reducedMotion) still();
    },
    setTheme(theme) {
      scene.background = theme.dark ? skyDusk : skyDay;
      shadow.material.opacity = theme.dark ? 0.45 : 0.2;
      key.intensity = theme.dark ? 1.9 : 2.4;
      rim.intensity = theme.dark ? 1.6 : 1.1;
      if (opts.reducedMotion) renderer.render(scene, camera);
    },
    dispose() {
      stopLoop();
      clearTimeout(stillTimer);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      for (const m of Object.values(mats)) m.dispose();
      skyDay.dispose();
      skyDusk.dispose();
      shadow.material.map?.dispose();
      shadow.material.dispose();
      renderer.dispose();
    },
  };
}

