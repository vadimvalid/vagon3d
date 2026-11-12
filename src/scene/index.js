// 3D-сцена вагона. Рисует только по требованию: пока ничего не меняется, кадры не запрашиваются.
import {
  DirectionalLight, Group, HemisphereLight, LinearSRGBColorSpace, PCFShadowMap, PerspectiveCamera,
  PointLight, Raycaster, Scene, Spherical, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { N, BAY, HALF, L, W, H, PITCH, BAY_WORD } from '../config.js';
import { afterNextPaint, yieldToMain } from '../util/schedule.js';
import { createKit, LIGHT } from './kit.js';
import { buildShell } from './shell.js';
import { buildInterior } from './interior.js';

const V = (x, y, z) => new Vector3(x, y, z);
const FOV = 40;

/**
 * Создаёт сцену. Работа разбита на этапы с паузами между ними: создание WebGL-контекста,
 * корпус, интерьер, компиляция шейдеров. Так страница успевает реагировать на ввод, пока сцена запускается.
 *
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} o.stage      контейнер, по которому меряется размер
 * @param {object} o.state           общее состояние приложения (только чтение)
 * @param {object} o.seats           { info: Map, busy: Set } текущего вагона
 * @param {(n:number)=>boolean} o.isBusy
 * @param {boolean} o.small          слабое устройство: карта теней поменьше
 * @param {object} o.on              обратные вызовы в приложение
 */
export async function createScene({ canvas, stage, state, seats, isBusy, small, on }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  // Синхронная проверка шейдеров тормозит первый кадр; в продакшене она не нужна.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  await yieldToMain();

  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // Солнце неподвижно, поэтому карту теней обновляем только когда меняется сама модель.
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  const cam = new PerspectiveCamera(FOV, 1, 0.05, 400);
  const ctl = new OrbitControls(cam, canvas);
  ctl.dampingFactor = 0.09;
  ctl.minDistance = 0.05; ctl.maxDistance = 150; ctl.maxPolarAngle = Math.PI * 0.62;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  ctl.enableDamping = !reduced;
  motion.addEventListener('change', e => { reduced = e.matches; ctl.enableDamping = !reduced; });

  /* ---- свет ---- */
  const hemi = new HemisphereLight(0xffffff, 0x8a9088, 0.62 * LIGHT);
  const sun = new DirectionalLight(0xffffff, 0.5 * LIGHT);
  sun.position.set(10, 24, 14);
  sun.castShadow = state.shadows;
  const mapSize = small ? 1024 : 2048;
  sun.shadow.mapSize.set(mapSize, mapSize);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 4, far: 70 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  const fill = new DirectionalLight(0xffffff, 0.14 * LIGHT);
  fill.position.set(-10, 8, -14);
  const nightLamps = [-6, -2, 2, 6].map(x => {
    const lamp = new PointLight(0xffd9a0, 0, 7.5, 0.6);
    lamp.position.set(x, H - 0.25, 0);
    lamp.visible = false;
    return lamp;
  });
  scene.add(hemi, sun, fill, ...nightLamps);

  const kit = createKit();
  const { M, B, mk, sprite } = kit;
  const { shell, plates } = buildShell(kit, scene);
  await yieldToMain();

  /* ---- цикл отрисовки по требованию ---- */
  let raf = 0, lost = false, compiled = false, shadowKey = '';
  function invalidate() {
    if (!raf && !lost && compiled) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    let again = false;
    if (fly) {
      const k = Math.min(1, (now - fly.s) / fly.ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cam.position.lerpVectors(fly.p0, fly.p1, e);
      ctl.target.lerpVectors(fly.t0, fly.t1, e);
      cam.fov = fly.f0 + (fly.f1 - fly.f0) * e;
      cam.updateProjectionMatrix();
      if (k === 1) fly = null; else again = true;
    }
    if (ctl.update()) again = true; // инерция после перетаскивания ещё не затухла
    const roofTarget = state.shell === 'cut' ? 0 : 1;
    if (M.roof.opacity !== roofTarget) {
      const d = roofTarget - M.roof.opacity;
      M.roof.opacity = reduced || Math.abs(d) < 0.03 ? roofTarget : M.roof.opacity + d * 0.2;
      again = M.roof.opacity !== roofTarget || again;
    }
    render();
    if (again) invalidate();
  }
  function render() {
    const cut = state.shell === 'cut', p = cam.position;
    M.roof.depthWrite = M.roof.opacity > 0.97;
    shell.roof.visible = M.roof.opacity > 0.02;
    // в разрезе прячем ту стену, что между камерой и салоном
    shell.wp.visible = !(cut && p.z > W / 2); shell.wn.visible = !(cut && p.z < -W / 2);
    shell.ep.visible = !(cut && p.x > L / 2); shell.en.visible = !(cut && p.x < -L / 2);
    const ghost = cut && p.z > 0.5;
    M.corr.opacity = M.door.opacity = ghost ? 0.16 : 1;
    M.corr.depthWrite = M.door.depthWrite = !ghost;
    if (gCorr) gCorr.userData.pass = ghost;
    if (gUpper) gUpper.visible = state.upper;
    const selRec = state.sel != null ? recs.get(state.sel) : null;
    const dim = cut && selRec && selRec.level === 'lower';
    M.berthUp.opacity = M.pillowUp.opacity = dim ? 0.2 : 1;
    M.shelf.opacity = dim ? 0.12 : cut ? 0.35 : 1;
    M.berthUp.depthWrite = M.pillowUp.depthWrite = !dim;
    M.shelf.depthWrite = !cut;
    M.blanket.opacity = M.roll.opacity = dim ? 0.2 : 1;
    M.blanket.depthWrite = M.roll.depthWrite = !dim;
    if (gCeil) gCeil.visible = shell.roof.visible;

    const key = [buildId, state.shadows, state.upper, shell.roof.visible, shell.wp.visible, shell.wn.visible, shell.ep.visible, shell.en.visible].join();
    if (key !== shadowKey) { shadowKey = key; renderer.shadowMap.needsUpdate = true; }
    renderer.render(scene, cam);
  }

  /* ---- интерьер по типу вагона ---- */
  let interior = null, gUpper = null, gCorr = null, gCeil = null, recs = new Map();
  let buildId = 0, buildPending = false, builtCar = 0;
  function build() {
    buildPending = false;
    builtCar = state.car;
    if (interior) { kit.disposeTree(interior.root); scene.remove(interior.root); }
    interior = buildInterior(kit, state.type, seats.info, isBusy);
    ({ gUpper, gCorr, gCeil, recs } = interior);
    scene.add(interior.root);
    buildId++;
    highlight();
    if (mode === 'walk') goWalk(walkI, 0, true);
    invalidate();
  }
  /** Пересборка после смены вагона. Откладывается до следующего кадра, чтобы сначала обновился интерфейс. */
  function rebuild() {
    if (buildPending) return;
    buildPending = true;
    afterNextPaint().then(flush);
  }
  function flush() { if (buildPending) build(); }

  function highlight() {
    flush();
    recs.forEach(r => {
      const m = r.n === state.sel ? M.sel : r.n === state.hover ? M.hov : isBusy(r.n) ? M.busy : null;
      r.meshes.forEach(x => { x.material = m || x.userData.base; });
    });
    const tex = kit.labelTex(String(state.car));
    plates.forEach(p => { p.material.map = tex; });
    updateDims();
    invalidate();
  }

  /* ---- размеры выбранного места ---- */
  let gDim = null, dimKey = '';
  function updateDims(force) {
    const key = [state.dims, state.sel, state.type, buildId].join();
    if (!force && key === dimKey) return;
    dimKey = key;
    if (gDim) { scene.remove(gDim); gDim = null; }
    const r = state.sel != null ? recs.get(state.sel) : null;
    invalidate();
    if (!state.dims || !r) return;
    gDim = new Group();
    gDim.userData.pass = true; // линейки не мешают кликать по местам
    scene.add(gDim);
    const bar = (len, axis, x, y, z) => {
      const g = axis === 'x' ? B(len, 0.012, 0.012) : axis === 'z' ? B(0.012, 0.012, len) : B(0.012, len, 0.012);
      mk(g, M.sel, gDim, x, y, z).castShadow = false;
    };
    const m2 = v => v.toFixed(2).replace('.', ',') + ' м';
    const c = r.center;
    if (state.type === 'sit') {
      bar(0.52, 'z', c.x, 0.56, c.z); sprite(m2(0.52), gDim, c.x, 0.68, c.z);
      bar(PITCH, 'x', c.x + PITCH / 2, 0.3, c.z); sprite(m2(PITCH), gDim, c.x + PITCH / 2, 0.42, c.z);
      bar(0.9, 'z', c.x, 0.1, 0); sprite(m2(0.9) + ' проход', gDim, c.x, 0.24, 0);
      return;
    }
    const plac = state.type === 'plac';
    const len = r.side ? 1.78 : plac ? 1.7 : 1.9, wid = r.side ? 0.56 : 0.6;
    bar(len, r.side ? 'x' : 'z', c.x, c.y + 0.12, c.z);
    sprite(m2(len), gDim, c.x, c.y + 0.26, c.z);
    bar(wid, r.side ? 'z' : 'x', c.x, c.y + 0.12, c.z + (r.side ? 0 : 0.5));
    sprite(m2(wid), gDim, c.x + (r.side ? 0.55 : 0), c.y + 0.26, c.z + (r.side ? 0 : 0.5));
    if (r.level === 'lower') {
      bar(1.0, 'y', c.x, c.y + 0.5, c.z - 0.6); sprite(m2(1.0) + ' до верха', gDim, c.x, c.y + 1.05, c.z - 0.6);
    } else {
      bar(0.55, 'y', c.x, c.y + 0.3, c.z - 0.6); sprite(m2(0.55) + ' до полки', gDim, c.x, c.y + 0.62, c.z - 0.6);
    }
    const aw = plac ? 0.52 : 0.78, az = plac ? 0.9 : 1.0;
    bar(aw, 'z', c.x, 0.1, az); sprite(m2(aw) + ' проход', gDim, c.x, 0.25, az);
  }

  /* ---- ночь ---- */
  function applyNight() {
    const n = state.night;
    nightLamps.forEach(lamp => { lamp.visible = n; lamp.intensity = n ? 0.4 * LIGHT : 0; });
    hemi.intensity = (n ? 0.16 : 0.62) * LIGHT;
    hemi.color.setHex(n ? 0xffeccc : 0xffffff);
    hemi.groundColor.setHex(n ? 0x1d2630 : 0x8a9088);
    sun.intensity = (n ? 0.07 : 0.5) * LIGHT;
    fill.intensity = (n ? 0.04 : 0.14) * LIGHT;
    M.glass.color.setHex(n ? 0x1b2630 : 0xa9cdd2);
    M.glass.opacity = n ? 0.75 : 0.3;
    M.lamp.color.setHex(n ? 0xffe9b0 : 0xfff1c9);
    M.inner.color.setHex(n ? 0xb8ad92 : 0xe4e0cf);
    M.body.color.setHex(n ? 0x16332a : 0x2b5a47);
    invalidate();
  }

  /* ---- камера ---- */
  let fly = null;
  function flyTo(p, t, ms, fov = FOV) {
    invalidate();
    if (reduced || ms === 0) {
      cam.position.copy(p); ctl.target.copy(t); cam.fov = fov; cam.updateProjectionMatrix(); fly = null;
      return;
    }
    fly = { p0: cam.position.clone(), t0: ctl.target.clone(), f0: cam.fov, p1: p.clone(), t1: t.clone(), f1: fov, s: performance.now(), ms: ms || 750 };
  }
  ctl.addEventListener('start', () => { fly = null; on.tip(null); });
  ctl.addEventListener('change', invalidate);

  /** Дистанция, с которой вагон целиком помещается по ширине окна. */
  function fitDistance() {
    const v = FOV * Math.PI / 360, h = Math.atan(Math.tan(v) * cam.aspect);
    return Math.min(135, (L / 2 + 1.5) / Math.tan(h));
  }

  let mode = 'orbit', walkI = 0;
  const walkX = i => i === 0 ? -HALF - 0.4 : i === N + 1 ? HALF + 0.4 : -HALF + (i - 0.5) * BAY;
  function goWalk(i, ms, keep) {
    walkI = Math.max(0, Math.min(N + 1, i));
    mode = 'walk';
    on.shell('full');
    const base = state.type === 'plac' ? 0.56 : state.type === 'sit' ? 0 : 1.0;
    const atEnd = walkI === 0 || walkI === N + 1;
    const p = V(walkX(walkI), 1.6, atEnd && state.type === 'sit' ? 0.62 : base);
    const dir = keep ? ctl.target.clone().sub(cam.position) : V(1, -0.08, -0.06);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    flyTo(p, p.clone().add(dir.normalize().multiplyScalar(0.15)), ms, 72);
    const word = state.type === 'sit' ? 'ряды ' + (2 * walkI - 1) + '–' + 2 * walkI : BAY_WORD[state.type] + ' ' + walkI;
    const text = walkI === 0 ? 'у купе проводника' : walkI === N + 1 ? 'у туалета' : word;
    on.walk({ active: true, text, atStart: walkI <= 0, atEnd: walkI >= N + 1 });
  }
  function leaveWalk(nextMode) {
    mode = nextMode;
    on.walk({ active: false });
  }
  function setView(name, ms) {
    const d = fitDistance();
    if (name === 'in') { goWalk(0, ms, false); return; }
    leaveWalk('orbit');
    if (name === 'out') { on.shell('full'); flyTo(V(-0.42, 0.3, 0.86).normalize().multiplyScalar(d * 1.15), V(0, 0.6, 0), ms); }
    if (name === 'cut') { on.shell('cut'); flyTo(V(-0.3, 0.62, 0.72).normalize().multiplyScalar(d * 1.12), V(0, 0.2, 0), ms); }
    if (name === 'top') { on.shell('cut'); flyTo(V(0, d + 3, 0.02), V(0, 0, 0), ms); }
  }
  function focusSeat(n) {
    flush();
    const r = recs.get(n);
    if (!r) return;
    leaveWalk('orbit');
    on.shell('cut');
    if (r.level === 'upper') on.upper(true);
    flyTo(V(r.center.x + 0.5, r.center.y + 4.6, r.center.z + 3.2), r.center);
  }
  function seatView(n) {
    flush();
    const r = recs.get(n);
    if (!r) return;
    leaveWalk('seat');
    on.shell('full'); on.upper(true);
    flyTo(r.eye, r.eye.clone().add(r.dir.clone().normalize().multiplyScalar(0.15)), 900, 78);
  }

  /** Поворот камеры вокруг цели: кнопки на экране и стрелки клавиатуры. */
  const sph = new Spherical();
  function orbit(dTheta, dPhi) {
    fly = null;
    const off = cam.position.clone().sub(ctl.target);
    sph.setFromVector3(off);
    sph.theta += dTheta;
    sph.phi = Math.min(ctl.maxPolarAngle, Math.max(0.05, sph.phi + dPhi));
    cam.position.copy(ctl.target).add(off.setFromSpherical(sph));
    invalidate();
  }
  /** Масштаб: множитель расстояния до цели, меньше единицы приближает. */
  function zoom(factor) {
    fly = null;
    const off = cam.position.clone().sub(ctl.target);
    off.setLength(Math.min(ctl.maxDistance, Math.max(ctl.minDistance, off.length() * factor)));
    cam.position.copy(ctl.target).add(off);
    invalidate();
  }

  /* ---- выбор мышью и пальцем ---- */
  const ray = new Raycaster(), ndc = new Vector2(), targets = [];
  function pick(ev) {
    flush();
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    targets.length = 0;
    scene.traverseVisible(o => {
      if (o.isMesh && !o.userData.pass && !(o.parent && o.parent.userData.pass)) targets.push(o);
    });
    const hit = ray.intersectObjects(targets, false)[0];
    return hit && hit.object.userData.seat != null ? hit.object.userData.seat : null;
  }
  let down = null, moveQueued = false, lastMove = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || e.button !== 0) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return; // это было перетаскивание, а не клик
    const n = pick(e);
    if (n != null) on.select(n);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    lastMove = e;
    if (moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(() => {
      moveQueued = false;
      const n = pick(lastMove);
      on.hover(n);
      on.tip(n, lastMove.clientX, lastMove.clientY);
      canvas.classList.toggle('over-seat', n != null);
    });
  });
  canvas.addEventListener('pointerleave', () => { on.hover(null); on.tip(null); canvas.classList.remove('over-seat'); });
  canvas.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const rot = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    const factor = e.key === '+' || e.key === '=' ? 0.87 : e.key === '-' || e.key === '−' ? 1.15 : 0;
    if (!rot && !factor) return;
    e.preventDefault();
    if (rot) orbit(rot[0], rot[1]); else zoom(factor);
  });

  /* ---- размер, потеря контекста, шрифты ---- */
  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    // setSize очищает холст: рисуем сразу, иначе при изменении размера окна картинка мигает
    if (compiled && !lost) { ctl.update(); render(); }
  }
  new ResizeObserver(resize).observe(stage);

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf); raf = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    shadowKey = '';
    invalidate();
  });

  if (document.fonts && document.fonts.load) {
    document.fonts.load(kit.labelFont, 'Проводник 0123456789').then(() => { kit.redrawLabels(); invalidate(); }, () => {});
  }

  resize();
  applyNight();
  build();
  setView(state.shell === 'full' ? 'out' : 'cut', 0);
  performance.mark('scene:built');
  await yieldToMain();

  // Шейдеры компилируются в фоне, не занимая основной поток; первый кадр рисуем, когда они готовы.
  await renderer.compileAsync(scene, cam).catch(() => {});
  if (builtCar !== state.car) build(); // пока сцена запускалась, пользователь успел сменить вагон
  compiled = true;
  ctl.update();
  render();
  performance.mark('scene:first-frame');

  return {
    rebuild,
    highlight,
    focusSeat,
    seatView,
    setView,
    orbit,
    zoom,
    invalidate,
    night: applyNight,
    dims: () => updateDims(true),
    shadows: () => { sun.castShadow = state.shadows; invalidate(); },
    walk: step => { if (mode === 'walk') goWalk(walkI + step, 450, true); },
  };
}
