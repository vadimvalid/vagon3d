// Схема мест под моделью.
import { N, ROWS, BAY_WORD } from '../config.js';
import { seatLabel, price, money } from '../model/seats.js';
import { state, seats, isBusy } from '../store.js';
import { $, el } from './dom.js';
import { roving } from './roving.js';

let nav = null;

export function initScheme({ onPick, onHover }) {
  const scheme = $('scheme');
  const seatOf = e => e.target.closest('.seat');
  scheme.addEventListener('click', e => { const b = seatOf(e); if (b) onPick(+b.dataset.n); });
  scheme.addEventListener('pointerover', e => { const b = seatOf(e); onHover(b ? +b.dataset.n : null); });
  scheme.addEventListener('pointerleave', () => onHover(null));
  scheme.addEventListener('focusin', e => { const b = seatOf(e); if (b) onHover(+b.dataset.n); });
  scheme.addEventListener('focusout', () => onHover(null));
  nav = roving(scheme, { selector: '.seat', grid: true, current: '[aria-pressed="true"]' });
}

const cap = text => el('div', { className: 'cap' }, text);
const aisle = () => el('div', { className: 'aisle' });

function row(nums) {
  const type = state.type;
  return el('div', { className: 'row' }, ...nums.map(n => {
    const s = seats.info.get(n);
    const solid = s.level === 'lower' || (s.level === 'sit' && s.win);
    return el('button', {
      type: 'button', className: 'seat ' + (solid ? 'low' : 'up'), dataset: { n },
      'aria-pressed': 'false',
      'aria-label': `Место ${n}, ${seatLabel(type, s)}, ${isBusy(n) ? 'занято' : money(price(type, s))}`,
    }, String(n));
  }));
}

function bay(index, word, ...rows) {
  return el('div', { className: 'bay', role: 'group', 'aria-label': `${word} ${index}` },
    el('div', { className: 'bay-n', 'aria-hidden': 'true' }, String(index)), ...rows);
}

export function renderScheme() {
  const scheme = $('scheme'), type = state.type;
  const parts = [cap('Проводник, туалет')];
  if (type === 'sit') {
    for (let r = 0; r < ROWS; r++) {
      parts.push(bay(r + 1, 'ряд', row([4 * r + 1, 4 * r + 2]), aisle(), row([4 * r + 3, 4 * r + 4])));
    }
  } else {
    for (let i = 0; i < N; i++) {
      const rows = type === 'sv'
        ? [row([2 * i + 1, 2 * i + 2])]
        : [row([4 * i + 2, 4 * i + 4]), row([4 * i + 1, 4 * i + 3])];
      rows.push(aisle());
      if (type === 'plac') rows.push(row([53 - 2 * i, 54 - 2 * i]));
      parts.push(bay(i + 1, BAY_WORD[type], ...rows));
    }
  }
  parts.push(cap('Туалет'));
  scheme.replaceChildren(...parts);

  $('legLow').textContent = type === 'sit' ? 'у окна' : 'нижнее';
  $('legUp').textContent = type === 'sit' ? 'у прохода' : 'верхнее';
  $('legAisle').textContent = type === 'sit' ? 'проход' : type === 'plac' ? 'проход, под ним боковые' : 'коридор';
  $('free').textContent = `свободно ${seats.info.size - seats.busy.size} из ${seats.info.size}`;
  syncSeats();
  nav?.refresh();
}

/** Переносит состояние (выбрано, под курсором, занято, отложено для сравнения) на кнопки. */
export function syncSeats() {
  $('scheme').querySelectorAll('.seat').forEach(b => {
    const n = +b.dataset.n;
    b.setAttribute('aria-pressed', String(n === state.sel));
    b.classList.toggle('hot', n === state.hover);
    b.classList.toggle('busy', isBusy(n));
    b.classList.toggle('cmp', n === state.cmp);
  });
  if (state.sel != null) nav?.setCurrent(seatButton(state.sel));
}

export const seatButton = n => $('scheme').querySelector(`.seat[data-n="${n}"]`);

export function revealSeat(n) {
  seatButton(n)?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
