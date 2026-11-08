import * as THREE from "three";
import { createSky } from "./meadow";
import { addOutlines, at, blob, createBowl, type Materials } from "./model";

/**
 * The tic-tac-toe backdrop: a wooden desk in a cosy study at night, with a sheet
 * of paper, a lamp, a mug of pencils, some books, a snack, and a window behind.
 */

function woodTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const planks = ["#a9744a", "#b27d51", "#a06c44", "#ad784d"];
  const plank = size / 4;
  planks.forEach((shade, i) => {
    ctx.fillStyle = shade;
    ctx.fillRect(0, i * plank, size, plank);
    ctx.strokeStyle = "rgba(90,55,30,0.28)";
    ctx.lineWidth = 2;
    for (let line = 1; line < 4; line++) {
      const y = i * plank + (line * plank) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size / 3, y + 7 - line * 3, (size * 2) / 3, y - 7 + line * 3, size, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(60,35,18,0.6)";
    ctx.fillRect(0, i * plank, size, 3);
  });
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 8;
  return texture;
}

export function createDesk(m: Materials, paperSize: number) {
  const owned: THREE.Material[] = [];
  const paint = (color: number) => {
    const material = new THREE.MeshToonMaterial({ color, gradientMap: m.bands });
    owned.push(material);
    return material;
  };

  const group = new THREE.Group();

  const wood = woodTexture();
  const top = new THREE.MeshToonMaterial({ map: wood, gradientMap: m.bands });
  owned.push(top);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), top);
  desk.rotation.x = -Math.PI / 2;
  desk.position.z = 6.5;
  group.add(desk);

  const paper = new THREE.Mesh(new THREE.BoxGeometry(paperSize, 0.02, paperSize), m.flower);
  paper.position.y = 0.01;
  group.add(paper);

  // The wall and the window onto the night.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), paint(0x6d7f7a));
  wall.position.set(0, 8, -5.5);
  group.add(wall);
  const night = createSky("#141b3a", "#46507e");
  const glass = new THREE.MeshBasicMaterial({ map: night.texture });
  owned.push(glass);
  group.add(at(new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), glass), 0, 3.4, -5.46));
  const frame = paint(0x7a5a3e);
  const bars: [number, number, number, number][] = [
    [0, 5.26, 5.4, 0.2],
    [0, 1.54, 5.4, 0.2],
    [-2.6, 3.4, 0.2, 3.9],
    [2.6, 3.4, 0.2, 3.9],
    [0, 3.4, 0.09, 3.6],
    [0, 3.4, 5, 0.09],
  ];
  for (const [x, y, w, h] of bars) group.add(at(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frame), x, y, -5.42));
  const moon = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
  owned.push(moon);
  group.add(at(blob(moon, 0.42), 1.25, 4.3, -5.44));

  // Shelf of books on the wall, either side of the window.
  const shelf = paint(0x6a4c33);
  const spines = [m.choreRed, m.bookCover, m.bookCover2, m.choreBlue, m.pink];
  for (const side of [-1, 1]) {
    const x = side * 6;
    group.add(at(new THREE.Mesh(new THREE.BoxGeometry(4, 0.14, 0.7), shelf), x, 2.7, -5.15));
    for (let i = 0; i < 9; i++) {
      const height = 0.75 + ((i * 7) % 5) * 0.09;
      group.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.3, height, 0.5), spines[(i + (side > 0 ? 2 : 0)) % spines.length]), x - 1.5 + i * 0.36, 2.77 + height / 2, -5.15));
    }
  }

  const props = new THREE.Group();

  // Desk lamp, back left. The shade's underside glows.
  const brass = paint(0xc9a24f);
  const lamp = at(new THREE.Group(), -4.5, 0, -3);
  lamp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.12, 24), brass), 0, 0.06, 0));
  lamp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 12), brass), 0, 1.3, 0));
  lamp.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.8, 28, 1, true), m.bookCover), 0, 2.75, 0));
  const bulb = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  owned.push(bulb);
  const light = blob(bulb, 0.3);
  light.userData.noOutline = true;
  lamp.add(at(light, 0, 2.45, 0));
  props.add(lamp);

  // Mug of pencils, front left.
  const mug = at(new THREE.Group(), -4.75, 0, 1.45);
  mug.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 0.95, 26), m.choreBlue), 0, 0.48, 0));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 10, 24), m.choreBlue);
  mug.add(at(handle, 0.5, 0.48, 0));
  const pencils: [number, number, THREE.Material][] = [
    [-0.15, -0.16, m.bookCover2],
    [0.14, 0.2, m.choreRed],
    [0.02, -0.04, m.bookCover],
  ];
  for (const [x, lean, colour] of pencils) {
    const pencil = at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10), colour), x, 1.15, 0);
    pencil.rotation.z = lean;
    mug.add(pencil);
  }
  props.add(mug);

  // Books, back right.
  const stack = at(new THREE.Group(), 4.75, 0, -2.6);
  const covers: [number, number, THREE.Material][] = [
    [1.5, 0.05, m.choreRed],
    [1.3, -0.1, m.bookCover],
    [1.15, 0.14, m.bookCover2],
  ];
  covers.forEach(([width, turn, colour], i) => {
    const book = at(new THREE.Group(), 0, 0.17 + i * 0.32, 0);
    book.rotation.y = turn;
    book.add(new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, width * 0.74), colour));
    book.add(at(new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.2, width * 0.74 + 0.02), m.cream), 0.05, 0, 0));
    stack.add(book);
  });
  props.add(stack);

  // A snack, for after.
  const bowl = createBowl(m);
  bowl.group.position.set(4.8, 0, 1.8);
  bowl.group.scale.setScalar(1.5);
  props.add(bowl.group);

  addOutlines(props, m.outline, 0.018);
  group.add(props);

  return {
    group,
    dispose() {
      for (const material of owned) material.dispose();
      wood.dispose();
      night.texture.dispose();
    },
  };
}
