import * as THREE from "three";
import { DAY_SECONDS, HOME_SECONDS, SPAWN_HEIGHT, WORLD_HALF, isHazard, newRun, periodAt, tick, type Faller, type GameEvent, type Run } from "@/lib/not-today";
import { createChoreModels, createGlowParts } from "./chores";
import { createClouds, createSky } from "./meadow";
import { addOutlines, createHamster, createMaterials, createNest, createShadow } from "./model";
import { groundOffset } from "./stage";
import { createVillage } from "./village";

/**
 * The Not Today scene: a day passing over a village street while chores fall on the
 * hamster. Loaded lazily by the NotToday component. The rules are in lib/not-today;
 * this runs them every frame and draws the result. It pauses (and so does the
 * game) while off screen or in a hidden tab. Reduced motion keeps the falling,
 * which is the game, but drops the wobbling and swaying.
 */

export interface Hud {
  period: number;
  progress: number; // 0..1 through the day
  dodged: number;
  stuck: number;
  seeds: number;
}

export interface NotTodayHandlers {
  onHud(hud: Hud): void;
  onEvent(event: GameEvent): void;
  onEnd(run: Run): void;
}

export interface NotTodayApi {
  start(handlers: NotTodayHandlers): void;
  /** Where the pointer is across the canvas, 0..1. */
  steer(fraction: number): void;
  setDirection(direction: number): void;
  setTheme(theme: { dark: boolean }): void;
  dispose(): void;
}

// [how far through the day, sky top, sky bottom, sun strength, ambient strength]
const DAY_KEYS: [number, string, string, number, number][] = [
  [0, "#8fc7e8", "#fde2c4", 2.2, 1.05],
  [0.35, "#79c2ee", "#dff2f7", 2.4, 1.1],
  [0.65, "#56608f", "#f5a56f", 1.9, 0.95],
  [0.9, "#141b3a", "#3a3f6b", 1.0, 0.7],
  [1, "#141b3a", "#3a3f6b", 1.0, 0.7],
];

const MAX_TOWER = 16;
const SLEEP_AFTER = 0.9; // seconds into the walk home before it flops into the nest

interface Visual {
  obj: THREE.Object3D;
  shadow: THREE.Mesh;
  halo: THREE.Sprite | null; // only good things have one
  twinkles: THREE.Sprite[];
}

const GLOW_HEIGHT = { seed: 0, pillow: 0, cancel: 0.25 }; // the middle of each model, above its origin

export function createNotToday(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): NotTodayApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(23, 3 / 2, 0.1, 80);
  // Further back and aimed higher than Cheek Stuffer: the hamster sits low, under a lot of open sky.
  camera.position.set(0, 2.2, 15);
  camera.lookAt(0, 2.3, 0);

  const sky = createSky(DAY_KEYS[0][1], DAY_KEYS[0][2]);
  scene.background = sky.texture;

  const hemi = new THREE.HemisphereLight(0xfff1dc, 0xa9c48e, 1.1);
  const key = new THREE.DirectionalLight(0xffe0b0, 2.4);
  key.position.set(3, 5, 5);
  const rim = new THREE.DirectionalLight(0xcfe2ff, 1.1);
  rim.position.set(-4, 3.5, -4);
  scene.add(hemi, key, rim);

  const mats = createMaterials();
  const ham = createHamster(mats);
  ham.root.rotation.order = "ZYX"; // so the waddle tips it side to side, whichever way it faces
  const nest = createNest(mats);
  const hamShadow = createShadow();
  const village = createVillage(mats);
  nest.group.position.set(0, 0, -0.1);
  nest.group.visible = false;
  scene.add(ham.root, nest.group, hamShadow.mesh, village.group);
  addOutlines(ham.root, mats.outline);
  addOutlines(nest.group, mats.outline);
  const clouds = createClouds(mats);
  scene.add(...clouds);

  const starPositions = new Float32Array(180);
  for (let i = 0; i < 60; i++) {
    // Two unrelated irrational steps scatter them evenly, with no visible pattern.
    starPositions[i * 3] = (((i * 0.7549) % 1) - 0.5) * 34;
    starPositions[i * 3 + 1] = 2.5 + ((i * 0.5698) % 1) * 12;
    starPositions[i * 3 + 2] = -30;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xfff6d8, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  scene.add(new THREE.Points(starGeometry, starMaterial));

  // Templates stay in the scene, hidden, so dispose() finds their geometry.
  const models = createChoreModels(mats);
  const templates = new THREE.Group();
  templates.visible = false;
  templates.add(...Object.values(models));
  scene.add(templates);

  const glowParts = createGlowParts();
  const visuals = new Map<number, Visual>();
  const tower = new THREE.Group();
  scene.add(tower);
  const towerItems: THREE.Object3D[] = [];

  function syncFallers(fallers: Faller[]) {
    const alive = new Set<number>();
    for (const f of fallers) {
      alive.add(f.id);
      let v = visuals.get(f.id);
      if (!v) {
        const obj = models[f.kind].clone();
        const shadow = hamShadow.mesh.clone();
        const good = !isHazard(f.kind);
        if (good) shadow.material = glowParts.ground;
        const halo = good ? new THREE.Sprite(glowParts.halo) : null;
        const twinkles = good ? [0, 1, 2].map(() => new THREE.Sprite(glowParts.twinkle)) : [];
        scene.add(obj, shadow, ...(halo ? [halo] : []), ...twinkles);
        v = { obj, shadow, halo, twinkles };
        visuals.set(f.id, v);
      }

      // Good things drift down swaying; chores tumble. The sway is only drawn: it's
      // small enough that catching still follows f.x.
      const sway = v.halo ? Math.sin(f.age * 2.4 + f.id) * 0.24 * motion : 0;
      const x = f.x + sway;
      v.obj.position.set(x, f.y, 0);
      if (v.halo) v.obj.rotation.set(0, Math.sin(f.age * 1.5 + f.id) * 0.6, -Math.sin(f.age * 2.4 + f.id) * 0.25 * motion);
      else v.obj.rotation.set((f.age * 2.4 + f.id) * (motion || 0.2), (f.age * 2 + f.id) * (motion || 0.2), 0);

      if (v.halo) {
        const y = f.y + GLOW_HEIGHT[f.kind as keyof typeof GLOW_HEIGHT];
        const pulse = 1.7 + Math.sin(f.age * 5) * 0.16 * motion;
        v.halo.position.set(x, y, -0.6);
        v.halo.scale.set(pulse, pulse, 1);
        v.twinkles.forEach((s, i) => {
          const a = (i / 3) * Math.PI * 2 + f.age * 1.4 * motion;
          const size = motion ? Math.max(0.02, 0.15 + Math.sin(f.age * 7 + i * 2.1) * 0.15) : 0.16;
          s.position.set(x + Math.cos(a) * 0.62, y + Math.sin(a) * 0.62, 0.4);
          s.scale.set(size, size, 1);
        });
      }

      // The mark on the grass arrives first and tightens as the thing gets close.
      const near = 1 - Math.max(0, Math.min(1, f.y / SPAWN_HEIGHT));
      const widen = v.halo ? 2.1 : 1;
      v.shadow.position.set(x, 0.004, 0);
      v.shadow.scale.set((0.35 + near * 0.75) * widen, (0.22 + near * 0.42) * widen, 1); // deeper, as the low camera flattens the grass
    }
    for (const [id, v] of visuals) {
      if (alive.has(id)) continue;
      scene.remove(v.obj, v.shadow, ...(v.halo ? [v.halo] : []), ...v.twinkles);
      visuals.delete(id);
    }
  }

  function addToTower(kind: keyof typeof models) {
    if (towerItems.length >= MAX_TOWER) return;
    const item = models[kind].clone();
    item.scale.multiplyScalar(0.72);
    tower.add(item);
    towerItems.push(item);
  }

  function clearScene() {
    syncFallers([]);
    for (const item of towerItems.splice(0)) tower.remove(item);
  }

  // ---- State ----
  let run: Run | null = null;
  let handlers: NotTodayHandlers | null = null;
  let lastHud = "";
  let t = 0;
  let previousX = 0;
  let velocity = 0;
  let yaw = -Math.PI / 2;
  let pitch = 1.08;
  let headPitch = -1.12;
  let squashBase = 1;
  let eyesBase = 1;
  let lift = 0;
  let puff = 0;
  let gulp = 0;
  let bump = 0; // 1 right after being hit
  let nestScale = 0;
  let blink = 0;
  let nextBlink = 2;
  let skyTimer = 0;

  const motion = opts.reducedMotion ? 0 : 1;
  const headTop = new THREE.Vector3();
  const colorA = new THREE.Color();
  const colorB = new THREE.Color();

  function ease(dt: number, rate: number) {
    return 1 - Math.exp(-dt * rate);
  }

  function hexAt(a: string, b: string, p: number) {
    return `#${colorA.set(a).lerp(colorB.set(b), p).getHexString()}`;
  }

  function paintTimeOfDay(day: number) {
    let i = 0;
    while (i < DAY_KEYS.length - 2 && day > DAY_KEYS[i + 1][0]) i++;
    const [at, top, bottom, sun, ambient] = DAY_KEYS[i];
    const [nextAt, nextTop, nextBottom, nextSun, nextAmbient] = DAY_KEYS[i + 1];
    const p = Math.min(1, (day - at) / (nextAt - at));
    sky.repaint(hexAt(top, nextTop, p), hexAt(bottom, nextBottom, p));
    key.intensity = sun + (nextSun - sun) * p;
    hemi.intensity = ambient + (nextAmbient - ambient) * p;
    starMaterial.opacity = Math.max(0, Math.min(1, (day - 0.72) / 0.18));
    village.setNight(Math.max(0, Math.min(1, (day - 0.6) / 0.25)));
  }

  function handle(event: GameEvent) {
    if (event.type === "hit") {
      addToTower(event.kind);
      bump = 1;
    } else if (event.type === "seed") {
      gulp = 1;
    } else if (event.type === "home") {
      nest.group.visible = true;
    }
    handlers?.onEvent(event);
  }

  function emitHud(r: Run) {
    const hud: Hud = {
      period: periodAt(r.clock),
      progress: Math.round(Math.min(1, r.clock / DAY_SECONDS) * 100) / 100,
      dodged: r.dodged,
      stuck: r.stuck.length,
      seeds: r.seeds,
    };
    const stamp = JSON.stringify(hud);
    if (stamp === lastHud) return;
    lastHud = stamp;
    handlers?.onHud(hud);
  }

  function step(dt: number) {
    t += dt;
    let ended: Run | null = null;
    if (run && run.phase !== "over") {
      const events = tick(run, dt);
      events.forEach(handle);
      emitHud(run);
      syncFallers(run.fallers);
      if (events.some((e) => e.type === "over")) ended = run;
    }

    // Time of day. Repainting the sky every frame would be a waste.
    skyTimer -= dt;
    if (skyTimer <= 0) {
      skyTimer = 0.15;
      paintTimeOfDay(run ? Math.min(1, run.clock / DAY_SECONDS) : 0);
    }

    const x = run ? run.x : 0;
    if (dt > 0) velocity += ((x - previousX) / dt - velocity) * ease(dt, 14);
    previousX = x;

    const homeTime = run && run.phase !== "running" ? HOME_SECONDS - run.homeLeft : 0;
    const asleep = homeTime > SLEEP_AFTER || run?.phase === "over";
    const k = ease(dt, 8);
    const yawTarget = asleep ? -0.75 : -Math.PI / 2 + Math.max(-0.7, Math.min(0.7, velocity * 0.12));
    yaw += (yawTarget - yaw) * k;
    pitch += ((asleep ? -0.05 : 1.08) - pitch) * k;
    headPitch += ((asleep ? 0.7 : -1.12) - headPitch) * k;
    squashBase += ((asleep ? 0.8 : 1) - squashBase) * k;
    eyesBase += ((asleep ? 0 : 1) - eyesBase) * k;
    lift += ((asleep ? nest.floorY : 0) - lift) * k;
    nestScale += ((nest.group.visible ? 1 : 0) - nestScale) * ease(dt, 7);
    nest.group.scale.setScalar(Math.max(0.001, nestScale));

    gulp = Math.max(0, gulp - dt * 6);
    bump = Math.max(0, bump - dt * 4);

    const moving = Math.min(1, Math.abs(velocity) / 4) * motion;
    const stride = t * 16;
    const squash = squashBase * (1 - bump * 0.22);
    const breath = Math.sin(t * 2.4) * 0.012 * motion;
    ham.root.position.set(x, lift + groundOffset(pitch, squash) + Math.abs(Math.sin(stride)) * 0.07 * moving, asleep ? -0.1 : 0);
    ham.root.rotation.set(0, yaw, Math.sin(stride) * 0.13 * moving);
    ham.pitch.rotation.z = pitch;
    const wide = 1 + (1 - squash) * 0.5 + breath * 0.5;
    ham.inner.scale.set(wide, squash * (1 + breath), wide);
    ham.head.rotation.z = headPitch + gulp * 0.1 * motion;
    ham.front.position.set(asleep ? 0.42 : 0.62, asleep ? 0.08 : 0.26, 0);
    const shuffle = Math.sin(stride) * 0.1 * moving;
    ham.backL.position.set(-0.12 + shuffle, 0.06, 0.3);
    ham.backR.position.set(-0.12 - shuffle, 0.06, -0.3);

    if (motion && t > nextBlink) {
      blink = 1;
      nextBlink = t + 2.5 + Math.random() * 4;
    }
    blink = Math.max(0, blink - dt * 7);
    const open = eyesBase * (1 - Math.sin(Math.min(1, blink) * Math.PI)) * (1 - bump);
    for (const e of ham.eyes) e.scale.set(1, Math.max(0.12, open), 1);

    // Cheeks keep pace with halfWidth(): more seeds, wider hamster.
    puff += (Math.min(12, (run?.seeds ?? 0) * 0.45) - puff) * ease(dt, 14);
    const size = 1 + puff * 0.14 + gulp * 0.12 * motion;
    ham.cheeks.forEach((c, i) => {
      c.scale.set(size, size * 0.92, size);
      c.position.set(0.26, -0.16 - puff * 0.012, (i === 0 ? 1 : -1) * (0.22 + puff * 0.055));
      c.children[0]?.scale.setScalar(1 + 0.02 / (0.23 * size));
    });

    hamShadow.mesh.position.set(x, 0.002, 0);
    hamShadow.mesh.scale.set(2 + puff * 0.1, 0.84 + puff * 0.04, 1);

    // The tower of chores on its head, swaying more the faster it goes.
    ham.head.updateWorldMatrix(true, false);
    headTop.set(-0.02, 0.44, 0);
    ham.head.localToWorld(headTop);
    tower.position.copy(headTop);
    towerItems.forEach((item, i) => {
      // Three columns, the side ones on its shoulders, so a full day's chores stay in frame.
      const column = i % 3;
      const row = Math.floor(i / 3);
      const sway = (Math.sin(t * 2.2 + i * 0.4) * 0.018 + moving * Math.sin(stride * 0.5 + i * 0.3) * 0.03) * (row + 1) * 2 * motion;
      item.position.set((column === 0 ? 0 : column === 1 ? -0.55 : 0.55) + sway, row * 0.3 - (column === 0 ? 0 : 0.42), column === 0 ? 0 : -0.1);
      item.rotation.set(0, i * 1.7, sway * 0.5);
    });

    clouds.forEach((c, i) => {
      c.position.x += dt * (0.05 + i * 0.02) * motion;
      if (c.position.x > 11) c.position.x = -11;
    });

    if (ended) handlers?.onEnd(ended);
  }

  // ---- Loop ----
  let raf = 0;
  let last = 0;
  let onScreen = true;

  function frame(now: number) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    step(dt);
    renderer.render(scene, camera);
    schedule();
  }
  function schedule() {
    if (raf || !onScreen || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function resize() {
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
  paintTimeOfDay(0);
  step(0);
  renderer.render(scene, camera);
  schedule();

  return {
    start(h) {
      clearScene();
      handlers = h;
      run = newRun();
      lastHud = "";
      nest.group.visible = false;
      nestScale = 0;
      skyTimer = 0;
    },
    steer(fraction) {
      if (!run || run.phase !== "running") return;
      const halfView = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
      run.target = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, (fraction - 0.5) * 2 * halfView));
    },
    setDirection(direction) {
      if (run?.phase === "running") run.direction = direction;
    },
    setTheme(theme) {
      // The sky follows the time of day, not the theme.
      hamShadow.material.opacity = theme.dark ? 0.45 : 0.25;
    },
    dispose() {
      stopLoop();
      handlers = null;
      run = null;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      clearScene();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      for (const m of Object.values(mats)) m.dispose();
      glowParts.dispose();
      village.dispose();
      sky.texture.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      hamShadow.material.map?.dispose();
      hamShadow.material.dispose();
      renderer.dispose();
    },
  };
}
