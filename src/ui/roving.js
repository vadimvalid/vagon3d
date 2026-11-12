// Одна остановка Tab на группу кнопок, внутри группы фокус переводят стрелки.
import { isShown } from './dom.js';

const nativeFocusgroup = 'focusGroup' in HTMLElement.prototype;

/**
 * @param {HTMLElement} root       контейнер группы
 * @param {object} o
 * @param {string} o.selector      какие элементы внутри считаются пунктами
 * @param {boolean} [o.grid]       двумерная сетка: стрелки ищут ближайший пункт в нужную сторону
 * @param {string} [o.current]     селектор пункта, с которого начинать (например, нажатая кнопка)
 * @returns {{ refresh: () => void, setCurrent: (item: Element | null) => void }}
 */
export function roving(root, { selector, grid = false, current }) {
  // Линейные панели с атрибутом focusgroup браузер обслуживает сам, там замена не нужна.
  if (!grid && nativeFocusgroup && root.hasAttribute('focusgroup')) return { refresh() {}, setCurrent() {} };

  const items = () => [...root.querySelectorAll(selector)].filter(isShown);
  const mark = item => root.querySelectorAll(selector).forEach(b => { b.tabIndex = b === item ? 0 : -1; });

  /** Следит, чтобы в порядке Tab был ровно один видимый пункт. */
  function refresh() {
    const list = items();
    if (!list.length) return;
    const active = document.activeElement;
    mark(
      (list.includes(active) && active) ||
      list.find(b => b.getAttribute('tabindex') === '0') ||
      (current && list.find(b => b.matches(current))) ||
      list[0],
    );
  }

  /** Делает пункт остановкой Tab, если фокус сейчас не внутри группы. */
  function setCurrent(item) {
    if (item && isShown(item) && !root.contains(document.activeElement)) mark(item);
  }

  root.addEventListener('focusin', e => {
    const item = e.target.closest(selector);
    if (item && root.contains(item)) mark(item);
  });

  root.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const item = e.target.closest(selector);
    if (!item || !root.contains(item)) return;
    const list = items();
    const next = grid ? gridTarget(list, item, e.key) : lineTarget(list, item, e.key, root);
    if (!next) return;
    e.preventDefault();
    next.focus();
  });

  // Пункты могут скрываться и появляться при смене ширины окна.
  new ResizeObserver(refresh).observe(root);
  refresh();
  return { refresh, setCurrent };
}

function lineTarget(list, item, key, root) {
  const i = list.indexOf(item), n = list.length;
  const rtl = getComputedStyle(root).direction === 'rtl';
  const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[key];
  if (step) return list[(i + step + n) % n];
  if (key === 'Home') return list[0];
  if (key === 'End') return list[n - 1];
  return null;
}

/** Ближайший пункт в сторону стрелки. Home и End ведут к краям текущего ряда. */
function gridTarget(list, item, key) {
  const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
  const box = b => {
    const r = b.getBoundingClientRect();
    return { b, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  };
  const from = box(item);
  const boxes = list.filter(b => b !== item).map(box);
  if (!dir) {
    if (key !== 'Home' && key !== 'End') return null;
    const row = boxes.filter(o => Math.abs(o.y - from.y) < from.h / 2).sort((a, c) => a.x - c.x);
    const edge = key === 'Home' ? row[0] : row[row.length - 1];
    return edge && (key === 'Home' ? edge.x < from.x : edge.x > from.x) ? edge.b : null;
  }
  const [dx, dy] = dir;
  let best = null, bestScore = Infinity;
  for (const o of boxes) {
    const along = dx ? (o.x - from.x) * dx : (o.y - from.y) * dy;
    const across = dx ? Math.abs(o.y - from.y) : Math.abs(o.x - from.x);
    const limit = dx ? from.h / 2 : from.w / 2;
    if (along < 1 || across > limit) continue; // не в ту сторону или в другом ряду (колонке)
    if (along < bestScore) { bestScore = along; best = o.b; }
  }
  return best;
}
