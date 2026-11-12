// Интерьер, который зависит от типа вагона: полки, кресла, перегородки, двери купе.
import { Group, Vector3 } from 'three';
import { N, BAY, HALF, W, H, ROWS, PITCH } from '../config.js';

const V = (x, y, z) => new Vector3(x, y, z);

/**
 * Собирает интерьер вагона.
 * Возвращает группы (их прячет и «просвечивает» рендер) и recs: номер места → меши и точки камеры.
 */
export function buildInterior(kit, type, info, isBusy) {
  const { M, B, geo, mk, sprite } = kit;
  const batch = kit.createBatch();
  const put = batch.put;
  const plac = type === 'plac';

  const root = new Group();
  const gLower = new Group(), gUpper = new Group(), gCorr = new Group(), gCeil = new Group();
  root.add(gLower, gUpper, gCorr, gCeil);

  const recs = new Map();
  const rec = (n, center, eye, dir) => {
    const r = { meshes: [], center, eye, dir, ...info.get(n) };
    recs.set(n, r);
    return r;
  };
  /** Привязывает меш к месту: по нему кликают, его перекрашивает подсветка. */
  const tag = (mesh, r) => {
    mesh.userData.seat = r.n;
    mesh.userData.base = mesh.material;
    r.meshes.push(mesh);
    return mesh;
  };

  if (type === 'sit') buildSeats();
  else buildBerths();

  batch.flush();
  return { root, gUpper, gCorr, gCeil, recs };

  /* ---- сидячий вагон: 18 рядов по 2 + 2 ---- */
  function buildSeats() {
    const xs = -HALF + 0.55;
    put(B(ROWS * PITCH + 0.4, 0.012, 0.9), M.carpet, root, xs + (ROWS - 1) * PITCH / 2, 0.006, 0);
    for (let r = 0; r < ROWS; r++) {
      const x = xs + r * PITCH;
      [[-1.05, 0], [-0.45, 1], [0.45, 2], [1.05, 3]].forEach(([z, k]) => {
        const n = 4 * r + 1 + k, rc = rec(n, V(x, 0.62, z), V(x, 1.18, z), V(1, -0.12, 0));
        tag(mk(B(0.52, 0.1, 0.5), M.seatFab, gLower, x, 0.46, z), rc);
        put(B(0.3, 0.44, 0.3), M.seatFrame, gLower, x, 0.23, z);
        tag(mk(B(0.1, 0.66, 0.5), M.seatBack, gLower, x - 0.23, 0.82, z), rc);
        tag(mk(B(0.12, 0.2, 0.42), M.seatBack, gLower, x - 0.22, 1.22, z), rc);
        put(B(0.34, 0.05, 0.05), M.seatFrame, gLower, x + 0.04, 0.58, z + 0.26);
        put(B(0.34, 0.05, 0.05), M.seatFrame, gLower, x + 0.04, 0.58, z - 0.26);
        if (isBusy(n)) put(B(0.26, 0.3, 0.34), M.bag, gLower, x + 0.04, 0.63, z);
        sprite(String(n), gLower, x - 0.3, 1.46, z);
      });
      put(B(0.5, 0.03, 0.16), M.lamp, gCeil, x, H - 0.02, -0.8);
      put(B(0.5, 0.03, 0.16), M.lamp, gCeil, x, H - 0.02, 0.8);
      [-1.42, 1.42].forEach(z => put(B(0.8, 0.04, 0.42), M.shelf, gUpper, x, 1.85, z));
    }
    for (let i = 0; i <= 1; i++) put(B(0.04, H, W - 0.1), M.part, root, i ? HALF : -HALF, H / 2, 0);
  }

  /* ---- плацкарт, купе и СВ ---- */
  function buildBerths() {
    const zLen = plac ? 1.7 : 1.9, zc = -W / 2 + 0.03 + zLen / 2, zEnd = zc + zLen / 2;
    const pLen = plac ? 1.75 : 2.0, pz = -W / 2 + pLen / 2;

    // поперечные перегородки
    for (let i = 0; i <= N; i++) {
      const x = -HALF + i * BAY, edge = i === 0 || i === N, hP = plac && !edge ? 2.35 : H;
      put(B(0.04, hP, pLen), M.part, root, x, hP / 2, pz);
      if (plac) {
        const hS = edge ? H : 1.45;
        put(B(0.04, hS, 0.6), M.part, root, x, hS / 2, 1.2);
        if (edge) put(B(0.04, H - 2, 0.65), M.part, root, x, 2 + (H - 2) / 2, 0.575);
      }
    }

    for (let i = 0; i < N; i++) {
      const x0 = -HALF + i * BAY, xc = x0 + BAY / 2;

      // две пары полок поперёк вагона
      [x0 + 0.34, x0 + BAY - 0.34].forEach((x, slot) => {
        const toMid = slot === 0 ? 1 : -1;
        const nLow = type === 'sv' ? 2 * i + 1 + slot : 4 * i + 1 + 2 * slot;
        const rl = rec(nLow, V(x, 0.45, zc), V(x, 1.2, zc + 0.25), V(toMid, -0.12, -0.7));
        tag(mk(B(0.6, 0.1, zLen), M.berth, gLower, x, 0.45, zc), rl);
        tag(mk(B(0.58, 0.4, zLen - 0.04), M.base, gLower, x, 0.2, zc), rl);
        put(B(0.42, 0.08, 0.3), M.pillow, gLower, x, 0.54, -W / 2 + 0.22);
        if (isBusy(nLow)) put(B(0.34, 0.26, 0.4), M.bag, gLower, x, 0.63, zc + 0.2);
        const wx = slot === 0 ? x0 + 0.05 : x0 + BAY - 0.05;
        tag(mk(B(0.05, 0.42, zLen - 0.1), M.cushion, gLower, wx, 0.86, zc), rl);
        put(B(0.03, 0.05, 0.14), M.lamp, gLower, wx, 1.22, -W / 2 + 0.35);
        sprite(String(nLow), gLower, x, 0.72, zEnd - 0.16);
        if (type === 'sv') return;

        const ru = rec(nLow + 1, V(x, 1.45, zc), V(x, 1.88, zc + 0.3), V(toMid * 0.8, -0.5, -0.6));
        tag(mk(B(0.6, 0.1, zLen), M.berthUp, gUpper, x, 1.45, zc), ru);
        put(B(0.42, 0.08, 0.3), M.pillowUp, gUpper, x, 1.54, -W / 2 + 0.22);
        sprite(String(nLow + 1), gUpper, x, 1.72, zEnd - 0.16);
        tag(mk(B(0.54, 0.03, zEnd + W / 2 - 0.8), M.pillowUp, gUpper, x, 1.515, (zEnd - W / 2) / 2), ru);
        tag(mk(B(0.5, 0.07, 0.34), M.blanket, gUpper, x, 1.535, zEnd - 0.2), ru);
        tag(mk(B(0.02, 0.1, 0.7), M.berthUp, gUpper, x + toMid * 0.3, 1.55, zc), ru);
        if (plac) {
          put(B(0.56, 0.03, zLen), M.shelf, gUpper, x, 2.05, zc);
          put(geo.roll, M.roll, gUpper, x, 2.185, zc - 0.35);
        }
      });

      // столик, чай, потолочные лампы
      put(B(0.5, 0.03, 0.42), M.table, gLower, xc, 0.74, -W / 2 + 0.24);
      put(geo.tea, M.tea, gLower, xc - 0.12, 0.805, -W / 2 + 0.2);
      put(geo.tea, M.tea, gLower, xc + 0.1, 0.805, -W / 2 + 0.32);
      put(B(0.7, 0.03, 0.16), M.lamp, gCeil, xc, H - 0.02, -0.6);
      put(B(0.7, 0.03, 0.16), M.lamp, gCeil, xc, H - 0.02, plac ? 0.56 : 1.0);

      if (plac) {
        // боковые места вдоль прохода
        const nl = 53 - 2 * i, z = 1.2;
        const rl = rec(nl, V(xc, 0.5, z), V(x0 + 0.36, 1.2, z), V(1, -0.12, -0.5));
        [x0 + 0.29, x0 + BAY - 0.29].forEach(x => tag(mk(B(0.5, 0.5, 0.56), M.berth, gLower, x, 0.25, z), rl));
        [x0 + 0.075, x0 + BAY - 0.075].forEach(x => tag(mk(B(0.07, 0.5, 0.56), M.berth, gLower, x, 0.78, z), rl));
        tag(mk(B(0.74, 0.04, 0.5), M.table, gLower, xc, 0.72, z + 0.02), rl);
        sprite(String(nl), gLower, xc, 0.98, z);
        const ru = rec(nl + 1, V(xc, 1.45, z), V(x0 + 0.42, 1.88, z), V(0.8, -0.45, -0.6));
        tag(mk(B(1.78, 0.08, 0.56), M.berthUp, gUpper, xc, 1.45, z), ru);
        put(B(0.3, 0.08, 0.42), M.pillowUp, gUpper, x0 + 0.25, 1.53, z);
        sprite(String(nl + 1), gUpper, xc, 1.72, z);
        put(B(1.78, 0.03, 0.5), M.shelf, gUpper, xc, 2.05, z + 0.03);
      } else {
        // стена коридора с дверью купе
        const zw = 0.5, seg = BAY / 2 - 0.33;
        put(B(seg, H, 0.04), M.corr, gCorr, x0 + seg / 2, H / 2, zw);
        put(B(seg, H, 0.04), M.corr, gCorr, x0 + BAY - seg / 2, H / 2, zw);
        put(B(0.66, H - 2, 0.04), M.corr, gCorr, xc, 2 + (H - 2) / 2, zw);
        put(B(0.6, 2.0, 0.025), M.door, gCorr, xc + 0.33 + 0.3, 1.0, zw - 0.035);
        put(B(0.66, 0.012, 1.5), M.carpet, root, xc, 0.006, -0.45);
        if (i > 0) put(B(0.3, 0.32, 0.04), M.cushion, root, x0, 0.62, 1.47);
      }
    }

    if (plac) {
      for (let i = 1; i < N; i++) put(B(0.03, 0.34, 0.03), M.metal, root, -HALF + i * BAY, 1.25, 0.27);
    } else {
      put(B(2 * HALF, 0.012, 0.6), M.carpet, root, 0, 0.006, 1.0);
      [0.74, 1.26].forEach(z => put(B(2 * HALF, 0.014, 0.04), M.carpetEdge, root, 0, 0.007, z));
      put(geo.handrail, M.metal, root, 0, 0.93, 1.45);
    }
  }
}
