import * as THREE from "three";
import type { Kind } from "@/lib/not-today";
import { addOutlines, at, blob, type Materials } from "./model";

/**
 * Everything that falls in Not Today, built from basic shapes in the same painted
 * style as the hamster. Each one is a template, cloned as it spawns. Objects
 * rather than words, so the jokes work for anyone. About 0.8 hamster units wide.
 */

function box(mat: THREE.Material, w: number, h: number, d: number) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
function cylinder(mat: THREE.Material, top: number, bottom: number, h: number) {
  return new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, 24), mat);
}
function turned<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
  o.rotation.set(x, y, z);
  return o;
}
function group(...parts: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.add(...parts);
  return g;
}

function alarm(m: Materials) {
  const hand = (len: number, angle: number) => {
    const h = at(box(m.choreIron, 0.03, len, 0.02), Math.sin(angle) * len * 0.5, 0.33 + Math.cos(angle) * len * 0.5, 0.11);
    h.rotation.z = -angle;
    return h;
  };
  return group(
    at(turned(cylinder(m.choreRed, 0.32, 0.32, 0.18), Math.PI / 2, 0, 0), 0, 0.33, 0),
    at(turned(cylinder(m.cream, 0.25, 0.25, 0.02), Math.PI / 2, 0, 0), 0, 0.33, 0.095),
    hand(0.19, 0.5),
    hand(0.14, 2.2),
    at(blob(m.bookCover2, 0.13, 1, 0.7, 1), -0.2, 0.68, 0),
    at(blob(m.bookCover2, 0.13, 1, 0.7, 1), 0.2, 0.68, 0),
    at(box(m.choreIron, 0.05, 0.1, 0.05), -0.2, 0.03, 0),
    at(box(m.choreIron, 0.05, 0.1, 0.05), 0.2, 0.03, 0),
  );
}

function toothbrush(m: Materials) {
  return turned(
    group(
      box(m.choreBlue, 0.09, 0.85, 0.06),
      at(box(m.choreBlue, 0.13, 0.26, 0.06), 0, 0.5, 0),
      at(box(m.flower, 0.12, 0.24, 0.14), 0, 0.5, 0.09),
      at(box(m.choreBlue, 0.05, 0.1, 0.04), 0, 0.42, 0.03),
    ),
    0,
    0,
    0.5,
  );
}

function bucket(m: Materials) {
  const pail = cylinder(m.propSoft, 0.36, 0.27, 0.5);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.022, 10, 32, Math.PI), m.choreIron);
  return group(at(pail, 0, 0.25, 0), at(cylinder(m.choreBlue, 0.33, 0.33, 0.03), 0, 0.46, 0), at(handle, 0, 0.5, 0));
}

function book(m: Materials) {
  return group(
    at(box(m.bookCover, 0.8, 0.04, 0.6), 0, 0.2, 0),
    at(box(m.bookCover, 0.8, 0.04, 0.6), 0, 0.04, 0),
    at(box(m.bookCover, 0.04, 0.2, 0.6), -0.38, 0.12, 0),
    at(box(m.cream, 0.72, 0.13, 0.54), 0.01, 0.12, 0),
  );
}

function broccoli(m: Materials) {
  return group(
    at(cylinder(m.grass, 0.13, 0.17, 0.4), 0, 0.2, 0),
    at(blob(m.grassDark, 0.27), 0, 0.58, 0),
    at(blob(m.grassDark, 0.2), -0.25, 0.45, 0.04),
    at(blob(m.grassDark, 0.2), 0.25, 0.45, -0.04),
    at(blob(m.grassDark, 0.18), 0.04, 0.47, 0.22),
  );
}

function dumbbell(m: Materials) {
  const weight = (x: number) => at(turned(cylinder(m.choreIron, 0.21, 0.21, 0.16), 0, 0, Math.PI / 2), x, 0.21, 0);
  return group(at(turned(cylinder(m.laptopLid, 0.05, 0.05, 0.9), 0, 0, Math.PI / 2), 0, 0.21, 0), weight(-0.36), weight(0.36));
}

function phone(m: Materials, screen: THREE.Material) {
  return turned(
    group(
      box(m.choreIron, 0.42, 0.8, 0.06),
      at(new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.7), screen), 0, 0, 0.032),
      at(new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.7), screen), 0, 0, -0.032).rotateY(Math.PI),
    ),
    0.2,
    0,
    0,
  );
}

function plates(m: Materials) {
  const g = new THREE.Group();
  const offsets = [0, 0.05, -0.04, 0.03, -0.02];
  offsets.forEach((x, i) => g.add(at(cylinder(i % 2 ? m.flower : m.cream, 0.4, 0.32, 0.07), x, 0.04 + i * 0.09, 0)));
  return g;
}

function sock(m: Materials) {
  return group(
    at(cylinder(m.flower, 0.15, 0.15, 0.5), 0, 0.55, 0),
    at(cylinder(m.choreRed, 0.156, 0.156, 0.08), 0, 0.68, 0),
    at(blob(m.flower, 0.17, 1, 1, 1), 0, 0.28, 0),
    at(blob(m.flower, 0.17, 1.75, 0.82, 1), 0.2, 0.22, 0),
  );
}

function vacuum(m: Materials) {
  const wheel = (z: number) => at(turned(cylinder(m.choreIron, 0.1, 0.1, 0.05), Math.PI / 2, 0, 0), -0.14, 0.1, z);
  return group(
    at(blob(m.choreRed, 0.27, 1.3, 1, 1), -0.14, 0.32, 0),
    wheel(0.25),
    wheel(-0.25),
    at(turned(cylinder(m.laptopLid, 0.035, 0.035, 0.7), 0, 0, 0.95), 0.4, 0.42, 0),
    at(box(m.choreIron, 0.24, 0.07, 0.42), 0.66, 0.15, 0),
  );
}

function mosquito(m: Materials) {
  const wing = (s: number) => at(turned(blob(m.flower, 0.26, 1.4, 0.08, 0.55), 0, 0, s * 0.45), s * 0.3, 0.46, 0);
  return group(
    at(blob(m.choreIron, 0.13, 1, 1.5, 1), 0, 0.3, 0),
    at(blob(m.choreIron, 0.1), 0, 0.56, 0),
    at(turned(cylinder(m.choreIron, 0.01, 0.018, 0.3), 0.9, 0, 0), 0, 0.5, 0.2),
    wing(1),
    wing(-1),
  );
}

function seed(m: Materials) {
  return group(blob(m.seed, 0.1, 0.75, 1.5, 0.75), at(blob(m.seedStripe, 0.08, 0.25, 1.35, 0.8), 0.06, 0, 0));
}

function pillow(m: Materials) {
  return group(blob(m.pink, 0.38, 1.25, 0.5, 1), at(blob(m.flower, 0.1, 1.2, 0.3, 1), 0, 0.19, 0));
}

function cancelStamp(m: Materials) {
  return group(
    at(cylinder(m.bookCover, 0.36, 0.36, 0.1), 0, 0.05, 0),
    at(cylinder(m.bookCover2, 0.08, 0.13, 0.3), 0, 0.25, 0),
    at(blob(m.bookCover2, 0.16), 0, 0.46, 0),
  );
}

function glowCanvas(draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * What marks something as good to catch: a gold halo, a gold mark on the grass
 * instead of a dark shadow, and a few twinkles. Chores get none of it.
 */
export function createGlowParts() {
  const glow = glowCanvas((ctx, size) => {
    const mid = size / 2;
    const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    g.addColorStop(0, "rgba(255,214,84,0.95)");
    g.addColorStop(0.5, "rgba(255,200,60,0.5)");
    g.addColorStop(1, "rgba(255,190,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  const star = glowCanvas((ctx, size) => {
    const mid = size / 2;
    const waist = size * 0.07;
    ctx.fillStyle = "#fff6c9";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? waist : mid;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(mid + Math.cos(a) * r, mid + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
  const halo = new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false });
  const twinkle = new THREE.SpriteMaterial({ map: star, transparent: true, depthWrite: false });
  const ground = new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false });
  return {
    halo,
    twinkle,
    ground,
    dispose() {
      glow.dispose();
      star.dispose();
      halo.dispose();
      twinkle.dispose();
      ground.dispose();
    },
  };
}

export function createChoreModels(m: Materials): Record<Kind, THREE.Group> {
  const models: Record<Kind, THREE.Group> = {
    alarm: alarm(m),
    toothbrush: toothbrush(m),
    bucket: bucket(m),
    book: book(m),
    broccoli: broccoli(m),
    dumbbell: dumbbell(m),
    phone: phone(m, m.cream),
    plates: plates(m),
    sock: sock(m),
    vacuum: vacuum(m),
    mosquito: mosquito(m),
    phoneNight: phone(m, m.glint),
    seed: seed(m),
    pillow: pillow(m),
    cancel: cancelStamp(m),
  };
  models.seed.scale.setScalar(2.6);
  models.mosquito.scale.setScalar(1.3);
  for (const model of Object.values(models)) addOutlines(model, m.outline, 0.018);
  return models;
}
