import * as THREE from "three";
import type { HamsterPose } from "@/lib/hamster";
import {
  BODY,
  addOutlines,
  createBowl,
  createGrass,
  createHamster,
  createLaptop,
  createMaterials,
  createNest,
  createShadow,
  createWheel,
} from "./model";

/**
 * The 3D hamster on a transparent canvas. Loaded lazily by HamsterStage.
 *
 * Every pose is a set of targets (where the body, head and paws should be);
 * each frame eases towards them, so switching pose is a smooth move rather than
 * a cut. On top of that each pose has a calm loop (running, typing, chewing,
 * breathing) and rare small extras (blink, ear twitch, a glance).
 *
 * It only draws while the canvas is on screen and the tab is visible, at most
 * 30 times a second. With reduced motion it draws one still frame per change.
 */

export interface StageTheme {
  dark: boolean;
}

export interface HamsterStageApi {
  setPose(pose: HamsterPose): void;
  setTheme(theme: StageTheme): void;
  dispose(): void;
}

interface Target {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  headPitch: number;
  headYaw: number;
  frontX: number;
  frontY: number;
  backX: number;
  squash: number;
  eyes: number; // 1 open, 0 closed
}

type Prop = "wheel" | "laptop" | "bowl" | "nest";

/** The laptop and the hamster typing at it are turned this far towards the camera, so both read. */
const LAPTOP_TURN = -0.82;

export function createHamsterStage(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): HamsterStageApi {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Toon colours are meant to be shown as painted, so no film tone curve on them.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(23, 160 / 104, 0.1, 50);
  camera.position.set(2.0, 2.3, 8.1);
  camera.lookAt(0.15, 1.2, 0);

  // Warm late-afternoon sun from the front right, a cool sky fill, a soft rim from behind.
  const hemi = new THREE.HemisphereLight(0xfff1dc, 0xa9c48e, 1.1);
  const key = new THREE.DirectionalLight(0xffe0b0, 2.4);
  key.position.set(3, 5, 5);
  const rim = new THREE.DirectionalLight(0xcfe2ff, 1.1);
  rim.position.set(-4, 3.5, -4);
  scene.add(hemi, key, rim);

  const mats = createMaterials();
  const ham = createHamster(mats);
  const wheel = createWheel(mats);
  const laptop = createLaptop(mats);
  const bowl = createBowl(mats);
  const nest = createNest(mats);
  const shadow = createShadow();
  // The laptop faces away from the camera; the hamster types behind it and peeks over the lid.
  laptop.group.position.set(0.35, 0, 0.35);
  laptop.group.rotation.y = LAPTOP_TURN;
  bowl.group.position.set(0.8, 0, 0.62);
  bowl.group.scale.setScalar(1.15);
  scene.add(ham.root, wheel.group, laptop.group, bowl.group, nest.group, shadow.mesh, createGrass(mats).group);
  for (const o of [ham.root, wheel.group, laptop.group, bowl.group, nest.group]) addOutlines(o, mats.outline);

  const props: Record<Prop, THREE.Object3D> = { wheel: wheel.group, laptop: laptop.group, bowl: bowl.group, nest: nest.group };
  const propScale: Record<Prop, number> = { wheel: 0, laptop: 0, bowl: 0, nest: 0 };

  // frontX/frontY: front paws in the body's own space; backX: back feet on the floor.
  const upright = { pitch: 1.08, headPitch: -1.12 };
  const TARGETS: Record<HamsterPose, Target> = {
    wheel: { x: -0.62, y: wheel.floorY, z: 0, yaw: -0.18, pitch: 0.04, headPitch: 0.02, headYaw: 0, frontX: 0.5, frontY: 0.08, backX: 0.2, squash: 1, eyes: 1 },
    laptop: { x: -0.66, y: 0, z: -0.74, yaw: LAPTOP_TURN, pitch: 0.45, headPitch: -0.12, headYaw: 0, frontX: 0.55, frontY: 0.12, backX: 0.22, squash: 1, eyes: 1 },
    sit: { x: 0.15, y: 0, z: 0, yaw: -1.15, ...upright, headYaw: 0, frontX: 0.51, frontY: 0.16, backX: -0.12, squash: 1, eyes: 1 },
    eat: { x: -0.1, y: 0, z: -0.1, yaw: -1.0, ...upright, headYaw: 0, frontX: 0.62, frontY: 0.26, backX: -0.12, squash: 1, eyes: 1 },
    sleep: { x: -0.35, y: nest.floorY, z: 0.15, yaw: -0.75, pitch: -0.05, headPitch: 0.7, headYaw: 0.35, frontX: 0.42, frontY: 0.08, backX: 0.05, squash: 0.8, eyes: 0 },
  };
  const PROPS: Record<HamsterPose, Prop | null> = { wheel: "wheel", laptop: "laptop", sit: null, eat: "bowl", sleep: "nest" };

  let pose: HamsterPose = "sit";
  const cur: Target = { ...TARGETS.sit };
  let first = true;

  // Idle extras.
  let t = 0;
  let nextBlink = 2 + Math.random() * 3;
  let blink = 0; // 0..1 while blinking
  let nextTwitch = 5 + Math.random() * 6;
  let twitch = 0;
  let twitchSide = 0;
  let nextGlance = 9 + Math.random() * 10;
  let glance = 0; // signed target yaw while glancing
  let glanceLeft = 0;

  function ease(dt: number, rate: number) {
    return 1 - Math.exp(-dt * rate);
  }

  function step(dt: number) {
    t += dt;
    const target = TARGETS[pose];
    const k = first ? 1 : ease(dt, 5);
    for (const key of Object.keys(cur) as (keyof Target)[]) cur[key] += (target[key] - cur[key]) * k;
    const pk = first ? 1 : ease(dt, 7);
    for (const p of Object.keys(props) as Prop[]) {
      propScale[p] += ((PROPS[pose] === p ? 1 : 0) - propScale[p]) * pk;
      props[p].visible = propScale[p] > 0.01;
      props[p].scale.setScalar(Math.max(0.001, easeOutBack(propScale[p])));
    }
    first = false;

    // Extras (none while asleep or when motion is reduced).
    const lively = !opts.reducedMotion && pose !== "sleep";
    if (lively && t > nextBlink) {
      blink = 1;
      nextBlink = t + 2.5 + Math.random() * 4;
    }
    blink = Math.max(0, blink - dt * 7);
    if (lively && t > nextTwitch) {
      twitch = 1;
      twitchSide = Math.random() < 0.5 ? 0 : 1;
      nextTwitch = t + 6 + Math.random() * 9;
    }
    twitch = Math.max(0, twitch - dt * 3);
    if (lively && pose !== "wheel" && t > nextGlance) {
      glance = (Math.random() < 0.5 ? -1 : 1) * 0.38;
      glanceLeft = 1.4;
      nextGlance = t + 12 + Math.random() * 14;
    }
    glanceLeft = Math.max(0, glanceLeft - dt);
    const glanceYaw = glanceLeft > 0 ? glance : 0;

    const loop = opts.reducedMotion ? 0 : 1;
    const breath = Math.sin(t * (pose === "sleep" ? 1.3 : 2.4)) * (pose === "sleep" ? 0.03 : 0.012) * loop;

    // Root and body.
    let bob = 0;
    if (pose === "wheel") bob = Math.abs(Math.sin(t * 13)) * 0.035 * loop;
    ham.root.position.set(cur.x, cur.y + groundOffset(cur.pitch, cur.squash) + bob, cur.z);
    ham.root.rotation.y = cur.yaw;
    ham.pitch.rotation.z = cur.pitch + (pose === "wheel" ? Math.sin(t * 13) * 0.025 * loop : 0);
    ham.inner.scale.set(1 + breath * 0.5, cur.squash * (1 + breath), 1 + breath * 0.5);

    // Head.
    let nod = 0;
    if (pose === "laptop") nod = Math.sin(t * 1.4) * 0.05 * loop;
    if (pose === "eat") nod = Math.sin(t * 10) * 0.025 * loop;
    ham.head.rotation.z = cur.headPitch + nod;
    ham.head.rotation.y += (cur.headYaw + glanceYaw - ham.head.rotation.y) * ease(dt, 4);

    // Eyes: open/closed by pose, plus blinks.
    const open = cur.eyes * (1 - Math.sin(Math.min(1, blink) * Math.PI));
    for (const e of ham.eyes) e.scale.set(1, Math.max(0.12, open), 1);

    // Ears twitch one at a time.
    ham.ears.forEach((ear, i) => {
      const s = i === 0 ? 1 : -1;
      ear.rotation.x = 0.35 * s + (i === twitchSide ? Math.sin(twitch * Math.PI * 3) * 0.25 * twitch : 0);
    });

    // Cheeks puff while eating.
    const puff = pose === "eat" ? 1 + (0.5 + 0.5 * Math.sin(t * 1.6)) * 0.14 * loop + 0.06 : 1;
    for (const c of ham.cheeks) c.scale.set(puff, puff * 0.92, puff);
    ham.seed.visible = pose === "eat" && cur.frontY > -0.05;

    // Paws.
    ham.front.position.set(cur.frontX, cur.frontY, 0);
    ham.frontL.position.set(0, 0, 0.2);
    ham.frontR.position.set(0, 0, -0.2);
    ham.backL.position.set(cur.backX, 0.06, 0.3);
    ham.backR.position.set(cur.backX, 0.06, -0.3);
    if (pose === "wheel" && loop) {
      const s = Math.sin(t * 13);
      ham.frontL.position.x = s * 0.12;
      ham.frontR.position.x = -s * 0.12;
      ham.backL.position.x = cur.backX - s * 0.14;
      ham.backR.position.x = cur.backX + s * 0.14;
      ham.frontL.position.y = Math.max(0, s) * 0.05;
      ham.frontR.position.y = Math.max(0, -s) * 0.05;
    }
    if (pose === "laptop" && loop) {
      ham.frontL.position.y = Math.max(0, Math.sin(t * 9)) * 0.045;
      ham.frontR.position.y = Math.max(0, Math.sin(t * 9 + 2.2)) * 0.045;
    }
    if (pose === "eat" && loop) ham.front.position.y += Math.sin(t * 10) * 0.012;

    // The wheel turns while running; the rungs under its feet move backwards.
    if (pose === "wheel" && loop) wheel.spin.rotation.z -= dt * 2.6;

    // Shadow follows whatever is on the floor.
    const wide = pose === "wheel" ? 2.7 : pose === "laptop" ? 2.6 : pose === "sleep" ? 2.1 : pose === "eat" ? 2.2 : 1.6;
    shadow.mesh.scale.x += (wide - shadow.mesh.scale.x) * pk;
    shadow.mesh.scale.y += (wide * 0.42 - shadow.mesh.scale.y) * pk;
    shadow.mesh.position.x += ((pose === "laptop" ? 0.3 : pose === "eat" ? 0.3 : 0) - shadow.mesh.position.x) * pk;
    shadow.mesh.position.z += ((pose === "laptop" ? -0.1 : 0) - shadow.mesh.position.z) * pk;
  }

  // ---- Loop ----
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let acc = 0;
  const FRAME = 1 / 30;

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : FRAME;
    last = now;
    acc += dt;
    if (acc >= FRAME) {
      step(acc);
      acc = 0;
      renderer.render(scene, camera);
    }
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

  // One still frame (reduced motion, or right after a change while paused).
  function still() {
    first = true;
    step(0);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || 160;
    const h = canvas.clientHeight || 104;
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

  return {
    setPose(next) {
      if (next === pose) return;
      pose = next;
      if (opts.reducedMotion) still();
    },
    setTheme(theme) {
      // The world keeps its own wood and straw colours; only the shadow and rim light adjust.
      shadow.material.opacity = theme.dark ? 0.45 : 0.2;
      rim.intensity = theme.dark ? 1.6 : 1.1;
      if (opts.reducedMotion) renderer.render(scene, camera);
    },
    dispose() {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      for (const m of Object.values(mats)) m.dispose(); // materials and the toon bands texture
      shadow.material.map?.dispose();
      shadow.material.dispose();
      renderer.dispose();
    },
  };
}

/**
 * How far to lift the hamster so the lowest point of its body touches the floor
 * once it's tilted up by `pitch` (it pivots around its rear).
 */
export function groundOffset(pitch: number, squash: number) {
  const s = Math.sin(pitch);
  const c = Math.cos(pitch);
  const centreY = BODY.x * s + BODY.y * squash * c;
  const a = BODY.r * BODY.sx;
  const b = BODY.r * BODY.sy * squash;
  return Math.sqrt((a * s) ** 2 + (b * c) ** 2) - centreY;
}

function easeOutBack(x: number) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
