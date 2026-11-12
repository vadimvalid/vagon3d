// Общие кирпичики сцены: материалы, кэш геометрии, сборка мешей, таблички с номерами.
import {
  BoxGeometry, CanvasTexture, ColorManagement, CylinderGeometry, DoubleSide, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, Sprite, SpriteMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HALF } from '../config.js';

// Палитра подобрана на глаз в «плоском» цветовом пространстве, без пересчёта sRGB ↔ linear.
// Оставляем так же, иначе все цвета модели поплывут. Должно стоять до создания материалов.
ColorManagement.enabled = false;

/** Множитель яркости света: возвращает прежнюю, «не физическую» шкалу интенсивностей. */
export const LIGHT = Math.PI;

export function createKit() {
  const lam = (color, opts) => new MeshLambertMaterial({ color, ...opts });
  const M = {
    body: lam(0x2b5a47), inner: lam(0xe4e0cf), roof: lam(0x8f9692, { transparent: true }), floor: lam(0x74675a), under: lam(0x2a2f2c),
    steel: lam(0x4a504c), rail: lam(0x6d716e), sleeper: lam(0x5b4a3c), ballast: lam(0x8e8a7e), stripe: lam(0xf0c330),
    part: lam(0xd9d3bd), berth: lam(0x8c4032), berthUp: lam(0xa5553f, { transparent: true }), base: lam(0x6b5a48), pillow: lam(0xf5f3ec),
    table: lam(0xcfc7ae), shelf: lam(0xb9b199, { transparent: true }), pillowUp: lam(0xf5f3ec, { transparent: true }),
    sel: lam(0xf0c330, { emissive: 0x4a3600 }), hov: lam(0xdb9a62),
    cushion: lam(0x74352a), curtain: lam(0x6f93ad), metal: lam(0xaab0ac), lamp: new MeshBasicMaterial({ color: 0xfff1c9 }),
    tea: lam(0xa85f22), carpet: lam(0x7a2b2b), carpetEdge: lam(0xc9a24a), zdoor: lam(0xb89f78),
    blanket: lam(0x5d7486, { transparent: true }), roll: lam(0xd9d3c2, { transparent: true }),
    busy: lam(0x6f7a72), bag: lam(0x3f4a52), seatFab: lam(0x3b5c74), seatBack: lam(0x325066), seatFrame: lam(0x9aa0a0),
    glass: lam(0xa9cdd2, { transparent: true, opacity: 0.3, side: DoubleSide, depthWrite: false }),
    corr: lam(0xd9d3bd, { transparent: true }), door: lam(0xb89f78, { transparent: true }),
  };
  const noShadow = new Set([M.glass, M.lamp, M.shelf]);

  /* ---- геометрия: одинаковые коробки создаются один раз и живут всё время ---- */
  const shared = new WeakSet();
  const boxes = new Map();
  const keep = geo => { shared.add(geo); return geo; };
  const B = (w, h, d) => {
    const key = `${Math.round(w * 1e4)}|${Math.round(h * 1e4)}|${Math.round(d * 1e4)}`;
    let geo = boxes.get(key);
    if (!geo) boxes.set(key, geo = keep(new BoxGeometry(w, h, d)));
    return geo;
  };
  const geo = {
    tea: keep(new CylinderGeometry(0.032, 0.028, 0.1, 12)),
    roll: keep(new CylinderGeometry(0.12, 0.12, 0.5, 14).rotateX(Math.PI / 2)),
    handrail: keep(new CylinderGeometry(0.015, 0.015, 2 * HALF, 8).rotateZ(Math.PI / 2)),
  };

  const dress = (mesh, mat) => {
    mesh.castShadow = !noShadow.has(mat);
    mesh.receiveShadow = mat !== M.glass;
    return mesh;
  };

  /** Отдельный меш: для всего, что подсвечивается, прячется или меняется после создания. */
  const mk = (g, mat, parent, x = 0, y = 0, z = 0) => {
    const mesh = dress(new Mesh(g, mat), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  /**
   * Пакет статичных деталей. Непрозрачные детали с одним материалом и одним родителем
   * склеиваются в один меш: вместо сотен вызовов отрисовки получаются десятки.
   * Прозрачные остаются отдельными, им нужна сортировка по глубине.
   */
  const createBatch = () => {
    const buckets = new Map();
    return {
      put(g, mat, parent, x = 0, y = 0, z = 0) {
        if (mat.transparent || !g.index) { mk(g, mat, parent, x, y, z); return; }
        const key = parent.id + ':' + mat.id;
        let bucket = buckets.get(key);
        if (!bucket) buckets.set(key, bucket = { parent, mat, parts: [] });
        bucket.parts.push(g.clone().translate(x, y, z));
      },
      flush() {
        for (const { parent, mat, parts } of buckets.values()) {
          const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
          parent.add(dress(new Mesh(merged, mat), mat));
        }
        buckets.clear();
      },
    };
  };

  /** Освобождает геометрию поддерева, кроме общей из кэша. */
  const disposeTree = root => root.traverse(o => {
    if (o.isMesh && !shared.has(o.geometry)) o.geometry.dispose();
  });

  /* ---- таблички: номера мест, вагона и подписи ---- */
  const FONT = '"PT Sans Narrow","Arial Narrow",Arial,sans-serif';
  const textures = new Map();
  const spriteMats = new Map();
  function drawLabel(canvas, text) {
    const wide = text.length > 2, g = canvas.getContext('2d'), w = canvas.width, r = 24;
    g.clearRect(0, 0, w, canvas.height);
    g.beginPath();
    g.moveTo(6 + r, 6);
    g.arcTo(w - 6, 6, w - 6, 122, r); g.arcTo(w - 6, 122, 6, 122, r);
    g.arcTo(6, 122, 6, 6, r); g.arcTo(6, 6, w - 6, 6, r);
    g.closePath();
    g.fillStyle = '#f4f6f0'; g.fill();
    g.lineWidth = 6; g.strokeStyle = '#14221b'; g.stroke();
    g.fillStyle = '#14221b';
    g.font = `700 ${wide ? 60 : 76}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, 68);
  }
  function labelTex(text) {
    let tex = textures.get(text);
    if (!tex) {
      const canvas = document.createElement('canvas');
      canvas.width = text.length > 2 ? 384 : 128; canvas.height = 128;
      drawLabel(canvas, text);
      textures.set(text, tex = new CanvasTexture(canvas));
    }
    return tex;
  }
  function sprite(text, parent, x, y, z) {
    let mat = spriteMats.get(text);
    if (!mat) spriteMats.set(text, mat = new SpriteMaterial({ map: labelTex(text) }));
    const sp = new Sprite(mat);
    sp.scale.set(mat.map.image.width > 128 ? 0.96 : 0.32, 0.32, 1);
    sp.position.set(x, y, z);
    parent.add(sp);
    return sp;
  }
  /** Перерисовывает таблички, когда догрузился веб-шрифт. */
  function redrawLabels() {
    textures.forEach((tex, text) => { drawLabel(tex.image, text); tex.needsUpdate = true; });
  }

  return { M, B, geo, mk, createBatch, disposeTree, labelTex, sprite, redrawLabels, labelFont: `700 60px ${FONT}` };
}
