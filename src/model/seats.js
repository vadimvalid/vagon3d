// Данные о местах: нумерация, подписи, цены, занятость. Чистые функции без DOM.
import { N, ROWS, BAY_WORD } from '../config.js';

/** Список мест вагона данного типа. */
export function seatList(type) {
  const out = [];
  if (type === 'sit') {
    for (let r = 0; r < ROWS; r++) {
      for (let k = 0; k < 4; k++) {
        out.push({ n: 4 * r + 1 + k, level: 'sit', side: false, win: k === 0 || k === 3, bay: r + 1, slot: k });
      }
    }
    return out;
  }
  for (let i = 0; i < N; i++) {
    const bay = i + 1;
    if (type === 'sv') {
      out.push(
        { n: 2 * i + 1, level: 'lower', side: false, bay, slot: 0 },
        { n: 2 * i + 2, level: 'lower', side: false, bay, slot: 1 },
      );
      continue;
    }
    out.push(
      { n: 4 * i + 1, level: 'lower', side: false, bay, slot: 0 },
      { n: 4 * i + 2, level: 'upper', side: false, bay, slot: 0 },
      { n: 4 * i + 3, level: 'lower', side: false, bay, slot: 1 },
      { n: 4 * i + 4, level: 'upper', side: false, bay, slot: 1 },
    );
    if (type === 'plac') {
      out.push(
        { n: 53 - 2 * i, level: 'lower', side: true, bay },
        { n: 54 - 2 * i, level: 'upper', side: true, bay },
      );
    }
  }
  return out;
}

export function seatLabel(type, s) {
  if (s.level === 'sit') return (s.win ? 'у окна' : 'у прохода') + ', ряд ' + s.bay;
  return (s.level === 'lower' ? 'нижнее' : 'верхнее') + (s.side ? ' боковое' : '') + ', ' + BAY_WORD[type] + ' ' + s.bay;
}

export function price(type, s) {
  if (type === 'sv') return 9800;
  if (type === 'sit') return s.win ? 1600 : 1400;
  if (type === 'kupe') return s.level === 'lower' ? 5200 : 4400;
  if (s.side) return s.level === 'lower' ? 2500 : 2100;
  return s.level === 'lower' ? 2800 : 2300;
}

const rub = new Intl.NumberFormat('ru-RU');
export const money = v => rub.format(v) + '\u00A0₽';

/** Условная занятость: псевдослучайная, но одинаковая для одного и того же вагона. */
export function rollBusy(car, seats) {
  const busy = new Set();
  const rate = 0.18 + ((car * 7) % 5) * 0.11;
  for (const n of seats.keys()) {
    const h = Math.sin(car * 12.9898 + n * 78.233) * 43758.5453;
    if (h - Math.floor(h) < rate) busy.add(n);
  }
  return busy;
}

/** Сколько отсеков (рядов) до ближайшего туалета. */
export function toToilet(type, s) {
  return type === 'sit' ? Math.min(s.bay, ROWS + 1 - s.bay) : Math.min(s.bay, N + 1 - s.bay);
}

export function hasWindow(type, s) {
  if (type === 'sit') return s.win ? 'да' : 'нет';
  return s.side ? 'сбоку' : 'да';
}

export function seatNotes(type, s) {
  const a = [];
  if (type === 'sit') {
    a.push(s.win ? 'У окна, со столиком-подлокотником.' : 'У прохода, легче выйти.');
    a.push('Спинка откидывается, под сиденьем розетка.');
    if (s.bay === 1) a.push('Первый ряд: больше места для ног.');
    if (s.bay === ROWS) a.push('Последний ряд: спинка может не откидываться.');
    return a;
  }
  if (type === 'sv') a.push('Двухместное купе, верхних полок нет.');
  if (s.side && s.level === 'lower') a.push('Днём это два сиденья и столик, на ночь столик раскладывается в полку.');
  else if (s.level === 'lower') a.push('Под полкой ящик для багажа.');
  if (s.level === 'upper') a.push(type === 'plac' ? 'Над местом багажная полка.' : 'Багаж кладут в нишу над дверью.');
  if (s.bay === 1) a.push('Рядом купе проводника.');
  if (s.bay === N) a.push('Рядом туалет.');
  return a;
}
