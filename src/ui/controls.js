// Панель вида, кнопки поворота и масштаба, прогулка по проходу, подсказка под курсором.
import { seatLabel } from '../model/seats.js';
import { state, seats } from '../store.js';
import { $ } from './dom.js';
import { announce } from './announce.js';
import { disclosure } from './disclosure.js';
import { roving } from './roving.js';

/** Кнопка-переключатель → [ключ состояния, значение «нажато»]. */
const TOGGLES = {
  tShell: ['shell', 'full'],
  tUpper: ['upper', true],
  tShadow: ['shadows', true],
  tDims: ['dims', true],
  tNight: ['night', true],
};

export function initControls({ onView, onToggle, onOrbit, onZoom, onWalk }) {
  $('views').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) onView(b.dataset.view);
  });
  for (const id of Object.keys(TOGGLES)) $(id).addEventListener('click', () => onToggle(TOGGLES[id][0]));

  // На узком экране переключатели спрятаны в выпадающую панель.
  const tools = $('tools');
  const nav = roving(tools, { selector: 'button' });
  disclosure($('optsBtn'), $('opts'), { dismiss: true, onToggle: nav.refresh });

  $('nav').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.nav;
    if (act === 'left') onOrbit(-0.26);
    else if (act === 'right') onOrbit(0.26);
    else onZoom(act === 'in' ? 0.8 : 1.25);
  });

  [['wBack', -1], ['wFwd', 1]].forEach(([id, step]) => {
    $(id).addEventListener('click', e => {
      if (e.currentTarget.getAttribute('aria-disabled') !== 'true') onWalk(step);
    });
  });
  syncToggles();
}

export function syncToggles() {
  for (const [id, [key, on]] of Object.entries(TOGGLES)) {
    $(id).setAttribute('aria-pressed', String(state[key] === on));
  }
  document.body.classList.toggle('night', state.night);
}

/** Сцена готова или не запустилась: показываем кнопки камеры либо сообщение. */
export function setSceneStatus(ok) {
  $('sceneMsg').hidden = ok;
  $('nav').hidden = !ok;
  if (ok) return;
  $('sceneMsg').textContent = '3D-модель не запустилась: возможно, браузер не дал доступ к WebGL. Схема мест внизу работает.';
  $('sceneMsg').hidden = false;
  $('scene').hidden = true;
  $('hint').hidden = true;
  $('tools').hidden = true;
}

let walkText = '';
export function showWalk({ active, text = '', atStart = false, atEnd = false }) {
  $('walk').hidden = !active;
  if (!active) { walkText = ''; return; }
  $('wPos').textContent = text;
  $('wBack').setAttribute('aria-disabled', String(atStart));
  $('wFwd').setAttribute('aria-disabled', String(atEnd));
  if (text !== walkText) announce('Проход: ' + text);
  walkText = text;
}

export function showTip(n, cx, cy) {
  const tip = $('tip');
  if (n == null || !seats.info.has(n)) { tip.hidden = true; return; }
  const box = $('stage').getBoundingClientRect();
  tip.textContent = `Место ${n}, ${seatLabel(state.type, seats.info.get(n))}`;
  tip.hidden = false;
  tip.style.left = Math.max(8, Math.min(box.width - tip.offsetWidth - 8, cx - box.left + 14)) + 'px';
  tip.style.top = Math.max(8, cy - box.top - 34) + 'px';
}
