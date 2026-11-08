import * as THREE from "three";
import { addOutlines, at, blob, type Materials } from "./model";

/**
 * The Not Today backdrop: a cobbled village street with houses, lamp posts, a
 * washing line and mountains behind. Only the lamp posts get an ink outline, so
 * the background stays soft and the falling things read in front of it.
 * `setNight` (0..1) lights the windows and lamps.
 */

function cobbleTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8d857a";
  ctx.fillRect(0, 0, size, size);
  const shades = ["#b9b1a3", "#aca496", "#c3bcae", "#b2aa9b"];
  const tile = size / 8;
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 8; col++) {
      ctx.fillStyle = shades[(row * 3 + col * 5 + 8) % shades.length];
      ctx.beginPath();
      ctx.roundRect(col * tile + (row % 2 ? tile / 2 : 0) + 3, row * tile + 3, tile - 6, tile - 6, 14);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.anisotropy = 8;
  return texture;
}

export function createVillage(m: Materials) {
  const owned: THREE.Material[] = [];
  const paint = (color: number) => {
    const material = new THREE.MeshToonMaterial({ color, gradientMap: m.bands });
    owned.push(material);
    return material;
  };

  const group = new THREE.Group();

  const cobbles = cobbleTexture();
  const street = new THREE.MeshToonMaterial({ map: cobbles, gradientMap: m.bands });
  owned.push(street);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), street);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const windowLight = new THREE.MeshBasicMaterial({ color: 0x6f8296 });
  const lampLight = new THREE.MeshBasicMaterial({ color: 0xe9e4d2 });
  owned.push(windowLight, lampLight);

  const beam = paint(0x7a5a3e);
  const door = paint(0x5f7f7a);

  // [centre x, width, wall height, wall colour, roof colour, chimney]
  const houses: [number, number, number, number, number, boolean][] = [
    [-7.8, 3.6, 2.0, 0xe8dcc4, 0xb5654f, true],
    [-3.9, 3.4, 1.6, 0xd9c7a8, 0x5f8a8f, false],
    [0.1, 3.8, 2.2, 0xeee3cf, 0xc27a52, true],
    [4.2, 3.4, 1.7, 0xcfd6c6, 0xa95b52, false],
    [8.0, 3.6, 2.1, 0xe5d3b8, 0x6d8aa0, true],
  ];
  for (const [x, width, height, wall, roof, chimney] of houses) {
    const house = at(new THREE.Group(), x, 0, -8);
    house.add(at(new THREE.Mesh(new THREE.BoxGeometry(width, height, 3), paint(wall)), 0, height / 2, 0));

    // A three-sided cylinder lying down makes the roof; flatten its height.
    const radius = (width + 0.4) / Math.sqrt(3);
    const pitch = 0.36; // low, to leave the sky open
    const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 3.4, 3), paint(roof));
    top.rotation.x = -Math.PI / 2;
    top.scale.z = pitch;
    house.add(at(top, 0, height + (radius / 2) * pitch, 0));

    house.add(at(new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.03), beam), 0, height * 0.62, 1.51));
    house.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.95, 0.04), door), -width * 0.24, 0.48, 1.51));
    for (const wx of [width * 0.16, width * 0.36]) {
      house.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), windowLight), wx, height * 0.36, 1.52));
    }
    house.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), windowLight), -width * 0.1, height * 0.82, 1.52));
    if (chimney) house.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.34), beam), width * 0.24, height + 0.72, 0));
    group.add(house);
  }

  // Trees poking up between and behind the houses.
  const trunk = paint(0x6e5138);
  const leaves: [number, number, number][] = [
    [-5.85, -10, 1.15],
    [-1.8, -10.5, 1.0],
    [2.2, -10, 1.2],
    [6.1, -10.5, 1.05],
  ];
  for (const [x, z, size] of leaves) {
    group.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 10), trunk), x, 1.1, z));
    group.add(at(blob(m.grassDark, size, 1, 1.1, 1), x, 2.7, z));
  }

  // Mountains far behind.
  const nearRange = paint(0x7f98b6);
  const farRange = paint(0xa5b8cf);
  const peaks: [number, number, number, number, THREE.Material][] = [
    [-20, -44, 16, 8.2, farRange],
    [14, -46, 18, 8.8, farRange],
    [-7, -36, 12, 5.6, nearRange],
    [22, -36, 12, 5.2, nearRange],
    [6, -38, 10, 5, nearRange],
  ];
  for (const [x, z, r, h, material] of peaks) {
    group.add(at(new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), material), x, h / 2, z));
  }

  // A washing line with this week's chores already hanging on it.
  const pole = paint(0x8a6a4a);
  const cloths = [m.flower, m.choreBlue, m.cream, m.choreRed, m.flower];
  const line = new THREE.Group();
  for (const px of [1.6, 6.2]) line.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 10), pole), px, 1.25, -5.8));
  const rope = at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.6, 6), beam), 3.9, 2.35, -5.8);
  rope.rotation.z = Math.PI / 2;
  line.add(rope);
  cloths.forEach((cloth, i) => line.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56 + (i % 2) * 0.16, 0.02), cloth), 2.3 + i * 0.8, 2.03 - (i % 2) * 0.08, -5.8)));
  group.add(line);

  // Lamp posts at either end of the street.
  const iron = paint(0x3f444c);
  for (const x of [-4.1, 4.1]) {
    const lamp = at(new THREE.Group(), x, 0, -1.6);
    lamp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 2.9, 12), iron), 0, 1.45, 0));
    const glass = at(blob(lampLight, 0.2, 1, 1.15, 1), 0, 3.08, 0);
    glass.userData.noOutline = true;
    lamp.add(glass);
    lamp.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.2, 12), iron), 0, 3.38, 0));
    addOutlines(lamp, m.outline, 0.018);
    group.add(lamp);
  }

  const windowDay = new THREE.Color(0x6f8296);
  const windowNight = new THREE.Color(0xffd678);
  const lampDay = new THREE.Color(0xe9e4d2);
  const lampNight = new THREE.Color(0xffe08a);

  return {
    group,
    setNight(amount: number) {
      windowLight.color.lerpColors(windowDay, windowNight, amount);
      lampLight.color.lerpColors(lampDay, lampNight, amount);
    },
    dispose() {
      for (const material of owned) material.dispose();
      cobbles.dispose();
    },
  };
}
