import * as THREE from "three";
import type { Materials } from "./model";

/** The painted backdrop the games share: a sky, the meadow floor, hills and clouds. */

function paintSky(c: HTMLCanvasElement, top: string, bottom: string) {
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
}

/** A vertical gradient to use as the scene background. `repaint` changes its colours. */
export function createSky(top: string, bottom: string) {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 256;
  paintSky(c, top, bottom);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return {
    texture,
    repaint(newTop: string, newBottom: string) {
      paintSky(c, newTop, newBottom);
      texture.needsUpdate = true;
    },
  };
}

/** The meadow floor and rolling hills behind it. */
export function createLandscape(m: Materials) {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), m.grass);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);
  const hills: [number, number, number, number][] = [
    [-9, -16, 10, 0.17],
    [8, -18, 13, 0.14],
    [0, -24, 16, 0.15],
  ];
  for (const [x, z, r, flat] of hills) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), m.grassDark);
    hill.position.set(x, 0, z);
    hill.scale.y = flat;
    group.add(hill);
  }
  return group;
}

/** Soft clouds: a few overlapping blobs each. */
export function createClouds(m: Materials) {
  const places: [number, number, number][] = [
    [-5.5, 4.3, 1],
    [1.5, 4.8, 0.8],
    [7, 3.9, 1.15],
  ];
  const puffs: [number, number, number][] = [
    [0, 0, 0.75],
    [-0.8, -0.14, 0.52],
    [0.85, -0.16, 0.58],
    [0.3, 0.3, 0.5],
  ];
  return places.map(([x, y, size]) => {
    const cloud = new THREE.Group();
    for (const [px, py, r] of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m.flower);
      puff.position.set(px, py, 0);
      cloud.add(puff);
    }
    cloud.position.set(x, y, -9);
    cloud.scale.set(size * 1.3, size * 0.8, size);
    return cloud;
  });
}
