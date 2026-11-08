import * as THREE from "three";
import { createDesk } from "./desk";
import { addOutlines, at, createHamster, createMaterials, createShadow } from "./model";
import { groundOffset } from "./stage";

/**
 * The tic-tac-toe scene: the hamster and its enormous pen on a sheet of paper.
 * Loaded lazily by the TicTacToe component; the rules are in lib/tic-tac-toe.
 * Every mark is a thin tube revealed along its length, so it appears to be drawn.
 * With reduced motion the marks simply appear and the hamster stays put.
 */

export interface TicTacToeApi {
  /** The cell under this screen position, or null. */
  cellAt(clientX: number, clientY: number): number | null;
  setHover(cell: number | null): void;
  drawPlayer(cell: number, done: () => void): void;
  drawHamster(cell: number, done: () => void): void;
  finish(winner: "X" | "O" | null, line: readonly number[] | null, onBeat: (beat: PanicBeat) => void): void;
  reset(): void;
  setTheme(theme: { dark: boolean }): void;
  dispose(): void;
}

interface Stroke {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  triangles: number;
}

type Reaction = "win" | "lose" | "draw" | null;

/** The moments of the hamster's breakdown after you win, for the caption to follow. */
export type PanicBeat = "shock" | "circles" | "stare" | "gone";

type PanicStage = "shock" | "circles" | "stare" | "windup" | "zoom" | "gone";

/** How the hamster looks this frame while panicking. */
interface PanicPose {
  yaw: number;
  rock: number;
  hop: number;
  flail: number; // arms, 0..1
  bulge: number; // eyes, 1 is normal
  feet: number; // how frantically the feet are going, 0..1
  stretch: number; // 1 is normal; more is cartoon speed
  shake: number; // head, side to side
}

const CELL = 1.7;
const PAPER = CELL * 3 + 1.2;
const INK_HEIGHT = 0.026;
const HOME = new THREE.Vector3(4.05, 0, 0.1);
const HAMSTER_SIZE = 0.82;
const WALK_SPEED = 3.6;
const FACING_YOU = -Math.PI / 2;

// Seconds.
const THINK = 0.6;
const DRAW_O = 1.05;
const X_STROKE = 0.17;
const STRIKE = 0.45;
const STILL_PAUSE = 0.5; // reduced motion: how long before play moves on
const SHOCK = 0.5;
const CIRCLES = 2.8;
const STARE = 0.8;
const WINDUP = 0.6;
const PUFF_LIFE = 0.5;
const PUFF_COUNT = 16;

const OFF_DESK_X = 13;
const WALK_BACK_FROM_X = 7.5; // just out of shot
const CIRCLE_CENTRE = new THREE.Vector3(0, 0, 0.1);

function cellCentre(cell: number) {
  return new THREE.Vector3(((cell % 3) - 1) * CELL, 0, (Math.floor(cell / 3) - 1) * CELL);
}

function jitter(amount: number) {
  return (Math.random() - 0.5) * amount;
}

export function createTicTacToe(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): TicTacToeApi {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4f5f5b);
  const camera = new THREE.PerspectiveCamera(30, 3 / 2, 0.1, 80);
  camera.position.set(0, 8.6, 11.6);
  camera.lookAt(0, 1.1, -1);

  // Warm lamplight from the back left, a soft cool fill from the window.
  const hemi = new THREE.HemisphereLight(0xffe9cf, 0x8a7460, 1.25);
  const key = new THREE.DirectionalLight(0xffdca8, 2.1);
  key.position.set(-3, 7, 4);
  const rim = new THREE.DirectionalLight(0xbfd2ff, 0.8);
  rim.position.set(3, 4, -5);
  scene.add(hemi, key, rim);

  const mats = createMaterials();
  const desk = createDesk(mats, PAPER);
  scene.add(desk.group);

  const ham = createHamster(mats);
  ham.root.rotation.order = "ZYX";
  ham.root.scale.setScalar(HAMSTER_SIZE);
  addOutlines(ham.root, mats.outline);
  const shadow = createShadow();
  shadow.material.opacity = 0.3;
  scene.add(ham.root, shadow.mesh);

  // The pen. Its origin is the nib, and it extends along +y.
  const pen = new THREE.Group();
  const nib = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 18), mats.choreIron);
  nib.rotation.x = Math.PI;
  pen.add(at(nib, 0, 0.17, 0));
  pen.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 20), mats.bookCover2), 0, 0.5, 0));
  pen.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.5, 20), mats.choreBlue), 0, 1.92, 0));
  pen.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), mats.bookCover2), 0, 2.95, 0));
  pen.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), mats.choreBlue), 0, 3.05, 0));
  addOutlines(pen, mats.outline, 0.018);
  scene.add(pen);

  const ink = {
    grid: new THREE.MeshBasicMaterial({ color: 0x4a3a2e }),
    x: new THREE.MeshBasicMaterial({ color: 0x2f5f9e }),
    o: new THREE.MeshBasicMaterial({ color: 0xc8553d }),
    strike: new THREE.MeshBasicMaterial({ color: 0x2e8b57 }),
  };

  function createStroke(points: THREE.Vector3[], material: THREE.Material, radius: number, parent: THREE.Object3D): Stroke {
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 6, false);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = INK_HEIGHT;
    mesh.scale.y = 0.2; // flat on the page
    parent.add(mesh);
    const stroke = { mesh, curve, triangles: geometry.index!.count / 3 };
    reveal(stroke, 0);
    return stroke;
  }
  function reveal(stroke: Stroke, progress: number) {
    (stroke.mesh.geometry as THREE.BufferGeometry).setDrawRange(0, Math.floor(stroke.triangles * Math.min(1, progress)) * 3);
  }

  // The hand-drawn grid never changes.
  const gridLines = new THREE.Group();
  scene.add(gridLines);
  const reach = CELL * 1.45;
  for (const across of [-CELL / 2, CELL / 2]) {
    for (const horizontal of [true, false]) {
      const points = [-1, -0.33, 0.33, 1].map((p) => {
        const along = p * reach;
        const off = across + jitter(0.07);
        return horizontal ? new THREE.Vector3(along, 0, off) : new THREE.Vector3(off, 0, along);
      });
      reveal(createStroke(points, ink.grid, 0.05, gridLines), 1);
    }
  }

  const marks = new THREE.Group();
  scene.add(marks);

  function circlePoints(centre: THREE.Vector3) {
    const points: THREE.Vector3[] = [];
    const radius = 0.54;
    const steps = 16;
    const startAngle = -Math.PI / 2 + jitter(0.5);
    for (let i = 0; i <= steps; i++) {
      // A touch over one turn, so the ends overlap the way a real O does.
      const a = startAngle + (i / steps) * Math.PI * 2.12;
      const r = radius * (1 + jitter(0.08));
      points.push(new THREE.Vector3(centre.x + Math.cos(a) * r, 0, centre.z + Math.sin(a) * r));
    }
    return points;
  }
  function crossStrokes(centre: THREE.Vector3): Stroke[] {
    const size = 0.5;
    const line = (x1: number, z1: number, x2: number, z2: number) => {
      const start = new THREE.Vector3(centre.x + x1 + jitter(0.08), 0, centre.z + z1 + jitter(0.08));
      const end = new THREE.Vector3(centre.x + x2 + jitter(0.08), 0, centre.z + z2 + jitter(0.08));
      const middle = start.clone().lerp(end, 0.5);
      middle.x += jitter(0.09);
      middle.z += jitter(0.09);
      return createStroke([start, middle, end], ink.x, 0.075, marks);
    };
    return [line(-size, -size, size, size), line(size, -size, -size, size)];
  }

  const hover = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.86, CELL * 0.86), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.28, depthWrite: false }));
  hover.rotation.x = -Math.PI / 2;
  hover.position.y = 0.022;
  hover.visible = false;
  scene.add(hover);

  // ---- What's happening ----
  const position = HOME.clone();
  const tip = new THREE.Vector3(HOME.x + 0.25, 0.3, HOME.z + 0.35);
  let job: { stage: "think" | "walk" | "draw"; t: number; stand: THREE.Vector3; stroke: Stroke; done: () => void } | null = null;
  let crossQueue: { stroke: Stroke; t: number }[] = [];
  let crossDone: (() => void) | null = null;
  let strike: { stroke: Stroke; t: number } | null = null;
  let reaction: Reaction = null;
  let yaw = FACING_YOU;
  let headDown = 0;
  let squash = 1;
  let eyesOpen = 1;
  let t = 0;
  let blink = 0;
  let nextBlink = 2;
  let stillTimer: ReturnType<typeof setTimeout> | undefined;
  let panic: { stage: PanicStage; t: number; angle: number; radius: number; startX: number; nextPuff: number; onBeat: (beat: PanicBeat) => void } | null = null;
  let penDropped = false;

  // Dust kicked up by small panicking feet.
  const puffGeometry = new THREE.SphereGeometry(0.2, 12, 8);
  const puffs = Array.from({ length: PUFF_COUNT }, () => {
    const material = new THREE.MeshBasicMaterial({ color: 0xfff4e2, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(puffGeometry, material);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, material, life: 0 };
  });
  function puff(x: number, z: number) {
    const free = puffs.find((p) => p.life <= 0);
    if (!free) return;
    free.life = PUFF_LIFE;
    free.mesh.position.set(x + jitter(0.3), 0.2, z + jitter(0.3));
    free.mesh.visible = true;
  }
  function updatePuffs(dt: number) {
    for (const p of puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const left = Math.max(0, p.life / PUFF_LIFE);
      p.mesh.scale.setScalar(0.6 + (1 - left) * 1.6);
      p.material.opacity = left * 0.85;
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  const penLying = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.86, 0, 0.5).normalize());
  const penRest = new THREE.Vector3();

  const STILL_POSE: PanicPose = { yaw: FACING_YOU, rock: 0, hop: 0, flail: 0, bulge: 1, feet: 0, stretch: 1, shake: 0 };

  function enterPanic(p: NonNullable<typeof panic>, stage: PanicStage) {
    p.stage = stage;
    p.t = 0;
  }

  /** The breakdown, one frame at a time. Moves the hamster and says how it should look. */
  function stepPanic(p: NonNullable<typeof panic>, dt: number): PanicPose {
    p.t += dt;
    const shaking = Math.sin(t * 34);
    if (p.stage === "shock") {
      if (p.t >= SHOCK) {
        const from = position.clone().sub(CIRCLE_CENTRE);
        p.angle = Math.atan2(from.z, from.x);
        p.radius = from.length();
        p.onBeat("circles");
        enterPanic(p, "circles");
      }
      return { ...STILL_POSE, hop: Math.sin(Math.min(1, p.t / SHOCK) * Math.PI) * 0.8, bulge: 1.6, flail: 0.4 };
    }
    if (p.stage === "circles") {
      p.angle += (5.5 + (2 * p.t) / CIRCLES) * dt;
      p.radius += (1.75 + Math.sin(p.t * 4) * 0.25 - p.radius) * ease(dt, 6);
      position.set(CIRCLE_CENTRE.x + Math.cos(p.angle) * p.radius, 0, CIRCLE_CENTRE.z + Math.sin(p.angle) * p.radius);
      p.nextPuff -= dt;
      if (p.nextPuff <= 0) {
        p.nextPuff = 0.09;
        puff(position.x, position.z);
      }
      if (p.t >= CIRCLES) {
        p.onBeat("stare");
        enterPanic(p, "stare");
      }
      // Travelling along the circle: the tangent is (-sin a, cos a).
      return { ...STILL_POSE, yaw: Math.atan2(-Math.cos(p.angle), -Math.sin(p.angle)), rock: shaking * 0.24, hop: Math.abs(shaking) * 0.17, flail: 1, bulge: 1.5, feet: 1, shake: Math.sin(t * 22) * 0.4 };
    }
    if (p.stage === "stare") {
      if (p.t >= STARE) {
        p.startX = position.x;
        enterPanic(p, "windup");
      }
      return { ...STILL_POSE, bulge: 1.35 };
    }
    if (p.stage === "windup") {
      // The cartoon moment: it leans back and its feet spin up before it moves.
      position.x = p.startX - Math.min(1, p.t / WINDUP) * 0.55;
      p.nextPuff -= dt;
      if (p.nextPuff <= 0) {
        p.nextPuff = 0.07;
        puff(position.x - 0.3, position.z);
      }
      if (p.t >= WINDUP) {
        for (let i = 0; i < 6; i++) puff(position.x, position.z);
        enterPanic(p, "zoom");
      }
      return { ...STILL_POSE, yaw: 0, rock: 0.3, hop: Math.abs(shaking) * 0.05, flail: 0.5, bulge: 1.4, feet: 1 };
    }
    if (p.stage === "zoom") {
      position.x += 46 * dt;
      if (position.x >= OFF_DESK_X) {
        ham.root.visible = false;
        shadow.mesh.visible = false;
        p.onBeat("gone");
        enterPanic(p, "gone");
      }
      return { ...STILL_POSE, yaw: 0, rock: -0.3, flail: 1, bulge: 1.4, feet: 1, stretch: 2.6 };
    }
    return STILL_POSE;
  }

  const motion = opts.reducedMotion ? 0 : 1;
  const walkGoal = new THREE.Vector3();
  const tipGoal = new THREE.Vector3();
  const grip = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const penAxis = new THREE.Vector3();

  function ease(dt: number, rate: number) {
    return 1 - Math.exp(-dt * rate);
  }

  function step(dt: number) {
    t += dt;
    let finished: (() => void) | null = null;

    if (crossQueue.length > 0) {
      const current = crossQueue[0];
      current.t += dt;
      reveal(current.stroke, current.t / X_STROKE);
      if (current.t >= X_STROKE) {
        reveal(current.stroke, 1);
        crossQueue.shift();
        if (crossQueue.length === 0) {
          finished = crossDone;
          crossDone = null;
        }
      }
    }
    if (strike) {
      strike.t += dt;
      reveal(strike.stroke, strike.t / STRIKE);
      if (strike.t >= STRIKE) strike = null;
    }

    // Where the hamster is headed, and where its nib is.
    walkGoal.copy(job && job.stage !== "think" ? job.stand : HOME);
    const away = walkGoal.clone().sub(position);
    away.y = 0;
    const distance = away.length();
    const walking = !panic && !(job?.stage === "think") && !(job?.stage === "draw") && distance > 0.02 && motion === 1;
    let targetYaw = FACING_YOU;
    if (walking) {
      position.addScaledVector(away.normalize(), Math.min(distance, WALK_SPEED * dt));
      // It shuffles with its face half towards you, so the pen stays in its paw.
      targetYaw = FACING_YOU + Math.max(-0.6, Math.min(0.6, away.x * 0.5));
    }

    let drawing = false;
    if (job) {
      job.t += dt;
      if (job.stage === "think" && job.t >= THINK) {
        job.stage = "walk";
        job.t = 0;
      } else if (job.stage === "walk" && (distance <= 0.03 || !motion)) {
        job.stage = "draw";
        job.t = 0;
      } else if (job.stage === "draw") {
        const p = Math.min(1, job.t / DRAW_O);
        reveal(job.stroke, p);
        job.stroke.curve.getPoint(p, tipGoal);
        drawing = true;
        if (p >= 1) {
          finished = job.done;
          job = null;
          drawing = false;
        }
      }
    }
    if (!drawing) tipGoal.set(position.x + 0.62, 0.25, position.z + 0.4);
    else tipGoal.y = INK_HEIGHT;
    tip.lerp(tipGoal, dt ? ease(dt, drawing ? 40 : 14) : 1);

    const crazed = panic ? stepPanic(panic, dt) : STILL_POSE;
    updatePuffs(dt);
    if (panic) targetYaw = crazed.yaw;

    let angle = targetYaw - yaw;
    angle = Math.atan2(Math.sin(angle), Math.cos(angle)); // the short way round
    yaw += angle * (dt ? ease(dt, panic ? 20 : 10) : 1);

    const k = dt ? ease(dt, 9) : 1;
    const thinking = job?.stage === "think";
    headDown += ((drawing ? 0.12 : reaction === "lose" ? 0.5 : reaction === "win" ? -0.25 : thinking ? -0.15 : 0) - headDown) * k;
    squash += ((reaction === "lose" ? 0.82 : 1) - squash) * k;
    eyesOpen += ((reaction === "lose" ? 0.3 : 1) - eyesOpen) * k;

    const stride = t * 15;
    const rock = walking ? Math.sin(stride) * 0.14 : reaction === "draw" ? Math.sin(t * 3) * 0.08 * motion : 0;
    const hop = (walking ? Math.abs(Math.sin(stride)) * 0.08 : reaction === "win" ? Math.abs(Math.sin(t * 8)) * 0.42 : 0) * motion + crazed.hop;
    const breath = Math.sin(t * 2.4) * 0.012 * motion;

    ham.root.position.set(position.x, (groundOffset(1.08, squash) + hop) * HAMSTER_SIZE, position.z);
    ham.root.rotation.set(0, yaw, rock + crazed.rock);
    ham.root.scale.set(HAMSTER_SIZE * crazed.stretch, HAMSTER_SIZE / Math.sqrt(crazed.stretch), HAMSTER_SIZE);
    ham.pitch.rotation.z = 1.08;
    ham.inner.scale.set(1 + (1 - squash) * 0.5, squash * (1 + breath), 1 + (1 - squash) * 0.5);
    ham.head.rotation.z = -1.12 - headDown;
    ham.head.rotation.y = thinking ? Math.sin(t * 5) * 0.2 * motion : crazed.shake;

    if (motion && t > nextBlink) {
      blink = 1;
      nextBlink = t + 2.5 + Math.random() * 4;
    }
    blink = Math.max(0, blink - dt * 7);
    const open = eyesOpen * (1 - Math.sin(Math.min(1, blink) * Math.PI));
    for (const e of ham.eyes) e.scale.set(crazed.bulge, Math.max(0.12, panic ? crazed.bulge : open), crazed.bulge);

    ham.front.position.set(0.62, 0.26 + crazed.flail * 0.2, 0);
    const shuffle = walking ? Math.sin(stride) * 0.1 : Math.sin(t * 46) * 0.24 * crazed.feet;
    ham.backL.position.set(-0.12 + shuffle, 0.06, 0.3);
    ham.backR.position.set(-0.12 - shuffle, 0.06, -0.3);

    shadow.mesh.position.set(position.x, 0.03, position.z);
    shadow.mesh.scale.set(1.9, 1.1, 1);

    if (penDropped) {
      // Abandoned where it fell, and both arms free to wave about.
      const fall = dt ? ease(dt, 9) : 1;
      pen.position.lerp(penRest, fall);
      pen.quaternion.slerp(penLying, fall);
      const wave = Math.sin(t * 32) * 0.22 * crazed.flail;
      ham.frontL.position.set(0, wave, 0.2 + crazed.flail * 0.28);
      ham.frontR.position.set(0, -wave, -0.2 - crazed.flail * 0.28);
    } else {
      // The top of the pen stays up beside its head, whatever the nib is doing.
      penAxis.set(position.x + 0.72, 3, position.z + 0.3).sub(tip).normalize();
      pen.position.copy(tip);
      pen.quaternion.setFromUnitVectors(up, penAxis);

      // Its paw reaches for the barrel, but only as far as a short arm can.
      grip.copy(tip).addScaledVector(penAxis, (0.85 - tip.y) / penAxis.y);
      ham.front.updateWorldMatrix(true, false);
      ham.front.worldToLocal(grip);
      grip.clampLength(0, 0.85);
      ham.frontR.position.copy(grip);
      ham.frontL.position.set(0, 0, 0.2);
    }

    finished?.();
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
    if (opts.reducedMotion || raf || !onScreen || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function still() {
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

  const raycaster = new THREE.Raycaster();
  const paperPlane = new THREE.Plane(up, 0);
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();

  function finishStill(done: () => void) {
    still();
    stillTimer = setTimeout(done, STILL_PAUSE * 1000);
  }

  return {
    cellAt(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(paperPlane, hit)) return null;
      const col = Math.floor(hit.x / CELL + 1.5);
      const row = Math.floor(hit.z / CELL + 1.5);
      return col >= 0 && col < 3 && row >= 0 && row < 3 ? row * 3 + col : null;
    },
    setHover(cell) {
      hover.visible = cell !== null;
      if (cell !== null) {
        const centre = cellCentre(cell);
        hover.position.x = centre.x;
        hover.position.z = centre.z;
      }
      if (opts.reducedMotion) renderer.render(scene, camera);
    },
    drawPlayer(cell, done) {
      const strokes = crossStrokes(cellCentre(cell));
      if (opts.reducedMotion) {
        for (const s of strokes) reveal(s, 1);
        finishStill(done);
        return;
      }
      crossQueue = strokes.map((stroke) => ({ stroke, t: 0 }));
      crossDone = done;
    },
    drawHamster(cell, done) {
      const centre = cellCentre(cell);
      const stroke = createStroke(circlePoints(centre), ink.o, 0.075, marks);
      if (opts.reducedMotion) {
        reveal(stroke, 1);
        finishStill(done);
        return;
      }
      // It stands behind and just to the side, so the pen and the mark both show.
      job = { stage: "think", t: 0, stand: new THREE.Vector3(centre.x - 0.1, 0, centre.z - 0.8), stroke, done };
    },
    finish(winner, line, onBeat) {
      if (winner === "X" && !opts.reducedMotion) {
        // You beat it, and it can't cope.
        job = null;
        penDropped = true;
        penRest.set(tip.x, 0.17, tip.z);
        panic = { stage: "shock", t: 0, angle: 0, radius: 0, startX: 0, nextPuff: 0, onBeat };
        onBeat("shock");
      } else {
        reaction = winner === "O" ? "win" : winner === "X" ? "lose" : "draw";
      }
      if (line) {
        const start = cellCentre(line[0]);
        const end = cellCentre(line[2]);
        const past = end.clone().sub(start).multiplyScalar(0.18);
        const stroke = createStroke([start.clone().sub(past), start.clone().lerp(end, 0.5), end.clone().add(past)], ink.strike, 0.1, marks);
        if (opts.reducedMotion) reveal(stroke, 1);
        else strike = { stroke, t: 0 };
      }
      if (opts.reducedMotion) still();
    },
    reset() {
      for (const child of [...marks.children]) {
        marks.remove(child);
        (child as THREE.Mesh).geometry.dispose();
      }
      strike = null;
      reaction = null;
      if (panic) {
        // It sheepishly wanders back in from the side, pen in paw.
        panic = null;
        penDropped = false;
        ham.root.visible = true;
        shadow.mesh.visible = true;
        position.set(WALK_BACK_FROM_X, 0, HOME.z);
        tip.set(position.x + 0.62, 0.25, position.z + 0.4);
        for (const p of puffs) {
          p.life = 0;
          p.mesh.visible = false;
        }
      }
      if (opts.reducedMotion) still();
    },
    setTheme() {
      // A study at night looks the same in either theme.
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
      for (const m of Object.values(ink)) m.dispose();
      for (const p of puffs) p.material.dispose();
      (hover.material as THREE.Material).dispose();
      desk.dispose();
      shadow.material.map?.dispose();
      shadow.material.dispose();
      renderer.dispose();
    },
  };
}
