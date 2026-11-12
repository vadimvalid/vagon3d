// Неизменная часть модели: кузов, крыша, тележки, путь и служебные зоны по концам вагона.
import {
  CylinderGeometry, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  Path, PlaneGeometry, ShadowMaterial, Shape,
} from 'three';
import { N, BAY, HALF, L, W, H, T } from '../config.js';

export function buildShell(kit, scene) {
  const { M, B, mk, sprite, labelTex } = kit;
  const batch = kit.createBatch();
  const put = batch.put;
  const shell = {};
  const plates = [];

  /* ---- боковые стены с окнами ---- */
  const wins = [];
  for (let i = 0; i < N; i++) wins.push([-HALF + (i + 0.5) * BAY, 1.0, 0.95, 1.85]);
  [-1, 1].forEach(s => {
    wins.push([s * (HALF + 0.65), 0.45, 1.3, 1.85]);
    wins.push([s * (L / 2 - 0.5), 0.42, 1.1, 1.9]);
  });
  const outline = new Shape();
  outline.moveTo(-L / 2, 0); outline.lineTo(L / 2, 0); outline.lineTo(L / 2, H); outline.lineTo(-L / 2, H); outline.lineTo(-L / 2, 0);
  wins.forEach(([cx, w, y0, y1]) => {
    const hole = new Path();
    hole.moveTo(cx - w / 2, y0); hole.lineTo(cx - w / 2, y1); hole.lineTo(cx + w / 2, y1); hole.lineTo(cx + w / 2, y0); hole.lineTo(cx - w / 2, y0);
    outline.holes.push(hole);
  });
  const wallGeo = new ExtrudeGeometry(outline, { depth: T, bevelEnabled: false });

  function wall(s) {
    const g = new Group();
    mk(wallGeo, M.inner, g, 0, 0, s > 0 ? W / 2 : -W / 2 - T);
    mk(wallGeo, M.body, g, 0, 0, s > 0 ? W / 2 + T : -W / 2 - 2 * T);
    wins.forEach(([cx, w, y0, y1]) => {
      // сквозь стекло можно кликнуть по месту
      mk(new PlaneGeometry(w, y1 - y0), M.glass, g, cx, (y0 + y1) / 2, s * (W / 2 + T)).userData.pass = true;
    });
    put(B(L, 0.1, 0.012), M.stripe, g, 0, 0.8, s * (W / 2 + 2 * T + 0.006));
    for (let i = 0; i < N; i++) {
      const cx = wins[i][0], z = s * (W / 2 - 0.02);
      put(B(0.16, 0.62, 0.025), M.curtain, g, cx - 0.43, 1.52, z);
      put(B(0.16, 0.62, 0.025), M.curtain, g, cx + 0.43, 1.52, z);
      put(B(1.1, 0.02, 0.02), M.metal, g, cx, 1.84, z);
    }
    [-1, 1].forEach(e => {
      const dx = e * (L / 2 - 0.5), zo = s * (W / 2 + 2 * T + 0.005);
      put(B(0.02, 2.05, 0.01), M.under, g, dx - 0.42, 1.03, zo);
      put(B(0.02, 2.05, 0.01), M.under, g, dx + 0.42, 1.03, zo);
      put(B(0.86, 0.02, 0.01), M.under, g, dx, 2.06, zo);
      put(B(0.025, 0.9, 0.025), M.metal, g, dx - e * 0.52, 1.0, s * (W / 2 + 2 * T + 0.03));
      put(B(0.9, 0.05, 0.3), M.steel, g, dx, -0.42, s * (W / 2 - 0.08));
      const plate = new Mesh(new PlaneGeometry(0.3, 0.3), new MeshBasicMaterial({ map: labelTex('07'), transparent: true }));
      plate.position.set(dx - e * 0.95, 1.45, s * (W / 2 + 2 * T + 0.008));
      plate.receiveShadow = true;
      if (s < 0) plate.rotation.y = Math.PI;
      g.add(plate);
      plates.push(plate);
    });
    scene.add(g);
    return g;
  }
  shell.wp = wall(1);
  shell.wn = wall(-1);

  /* ---- крыша ---- */
  const hw = W / 2 + 2 * T, arc = new Shape();
  arc.moveTo(-hw, 0); arc.quadraticCurveTo(-hw, 0.42, -0.85, 0.5); arc.lineTo(0.85, 0.5); arc.quadraticCurveTo(hw, 0.42, hw, 0); arc.lineTo(-hw, 0);
  const roofGeo = new ExtrudeGeometry(arc, { depth: L, bevelEnabled: false, curveSegments: 10 });
  roofGeo.rotateY(Math.PI / 2); roofGeo.translate(-L / 2, H, 0);
  shell.roof = mk(roofGeo, M.roof, scene);
  for (let i = 0; i < 6; i++) mk(B(0.45, 0.1, 0.45), M.roof, shell.roof, -HALF + 1.5 + i * 2.8, H + 0.54, 0);

  /* ---- торцы ---- */
  function endWall(s) {
    const g = new Group();
    put(B(2 * T, H, W), M.body, g, s * (L / 2 - T), H / 2, 0);
    put(B(0.02, 2.0, 0.8), M.under, g, s * (L / 2 + 0.005), 1.0, 0);
    scene.add(g);
    return g;
  }
  shell.ep = endWall(1);
  shell.en = endWall(-1);

  /* ---- пол, подвагонное оборудование, тележки ---- */
  put(B(L, 0.08, W + 4 * T), M.floor, scene, 0, -0.04, 0);
  put(B(L - 0.6, 0.3, W - 0.5), M.under, scene, 0, -0.23, 0);
  put(B(3, 0.45, 1.6), M.under, scene, 0, -0.6, 0);
  put(B(1.6, 0.4, 0.6), M.under, scene, -4.2, -0.58, 0.85);
  put(B(1.2, 0.35, 0.55), M.under, scene, 4.6, -0.55, -0.9);
  put(new CylinderGeometry(0.2, 0.2, 1.7, 16).rotateZ(Math.PI / 2), M.steel, scene, 3.6, -0.62, 0.8);
  const wheelGeo = new CylinderGeometry(0.46, 0.46, 0.11, 28).rotateX(Math.PI / 2);
  const axleGeo = new CylinderGeometry(0.07, 0.07, 1.6, 10).rotateX(Math.PI / 2);
  [-1, 1].forEach(s => {
    const bx = s * (L / 2 - 3.4);
    put(B(2.9, 0.22, 2.0), M.steel, scene, bx, -0.6, 0);
    [-0.95, 0.95].forEach(dx => {
      put(axleGeo, M.steel, scene, bx + dx, -0.66, 0);
      [-0.76, 0.76].forEach(dz => put(wheelGeo, M.under, scene, bx + dx, -0.66, dz));
    });
    put(B(0.6, 0.2, 0.25), M.steel, scene, s * (L / 2 + 0.3), -0.3, 0);
  });

  /* ---- путь ---- */
  const track = L + 10;
  [-0.76, 0.76].forEach(z => put(B(track, 0.14, 0.07), M.rail, scene, 0, -1.19, z));
  const count = Math.floor(track / 0.62);
  const sleepers = new InstancedMesh(B(0.22, 0.12, 2.7), M.sleeper, count);
  const m4 = new Matrix4();
  for (let i = 0; i < count; i++) {
    m4.makeTranslation(-track / 2 + 0.31 + i * 0.62, -1.32, 0);
    sleepers.setMatrixAt(i, m4);
  }
  sleepers.receiveShadow = true;
  scene.add(sleepers);
  put(B(track, 0.12, 3.5), M.ballast, scene, 0, -1.44, 0);
  const ground = new Mesh(new PlaneGeometry(120, 60), new ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  ground.receiveShadow = true;
  ground.userData.pass = true;
  scene.add(ground);

  /* ---- служебные зоны по концам ---- */
  [-1, 1].forEach(s => {
    const xb = s * (HALF + 2.3);
    put(B(0.04, H, 1.75), M.part, scene, xb, H / 2, -1.5 + 0.875);
    put(B(0.04, H, 0.55), M.part, scene, xb, H / 2, 1.5 - 0.275);
    put(B(0.04, H - 2, 0.7), M.part, scene, xb, 2 + (H - 2) / 2, 0.6);
  });
  const zone = (len, cx, text) => {
    put(B(len, 2.3, 1.72), M.part, scene, cx, 1.15, -0.64);
    sprite(text, scene, cx, 2.47, -0.64);
    put(B(len * 0.6, 1.95, 0.02), M.zdoor, scene, cx, 0.98, 0.228);
    put(B(0.03, 0.12, 0.03), M.metal, scene, cx + len * 0.22, 1.0, 0.25);
  };
  zone(1.24, -HALF - 0.68, 'Проводник');
  zone(0.9, -HALF - 1.81, 'WC');
  zone(1.0, HALF + 0.58, 'WC');
  put(B(0.4, 0.8, 0.4), M.part, scene, -HALF - 1.5, 0.4, 1.25);
  put(new CylinderGeometry(0.15, 0.15, 0.7, 20), M.metal, scene, -HALF - 1.5, 1.15, 1.25);
  put(B(0.04, 0.04, 0.1), M.steel, scene, -HALF - 1.5, 0.95, 1.06);
  sprite('Титан', scene, -HALF - 1.5, 1.72, 1.25);
  put(B(0.35, 0.6, 0.3), M.steel, scene, HALF + 0.5, 0.3, 1.3);

  batch.flush();
  return { shell, plates };
}
