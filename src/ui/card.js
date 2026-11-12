// Карточка выбранного места поверх модели. Разметка постоянная, меняется только содержимое:
// так фокус не теряется, когда карточка обновляется.
import { TYPE_NAME, BAY_WORD } from '../config.js';
import { seatLabel, price, money, seatNotes, toToilet, hasWindow } from '../model/seats.js';
import { state, seats, isBusy } from '../store.js';
import { $, el } from './dom.js';
import { disclosure } from './disclosure.js';

let more = null;

export function initCard({ onView, onCompare, onClear, onCopy }) {
  $('cardView').addEventListener('click', onView);
  $('cardCompare').addEventListener('click', onCompare);
  $('cardClear').addEventListener('click', onClear);
  $('cardCopy').addEventListener('click', onCopy);
  more = disclosure($('cardMoreBtn'), $('cardMore'));
}

/** Кнопка «Вид с места» появляется, когда 3D-сцена готова. */
export function setCardScene(ready) {
  $('cardView').hidden = !ready;
}

export function renderCard() {
  const type = state.type;
  const s = state.sel != null ? seats.info.get(state.sel) : null;
  $('cardEmpty').hidden = !!s;
  $('cardBody').hidden = !s;
  $('card').classList.toggle('is-empty', !s);
  if (!s) return;

  $('cardPlate').textContent = s.n;
  $('cardTitle').textContent = 'Место ' + s.n;
  $('cardKind').textContent = seatLabel(type, s);
  $('cardPrice').textContent = money(price(type, s));
  $('cardUnit').textContent = `· вагон ${state.car}, ${TYPE_NAME[type].toLowerCase()}`;
  $('cardBusy').hidden = !isBusy(s.n);
  $('cardNotes').replaceChildren(...seatNotes(type, s).map(text => el('li', null, text)));

  const other = state.cmp != null && state.cmp !== s.n ? seats.info.get(state.cmp) : null;
  $('cardCmp').replaceChildren(...(other ? [compareTable(other, s)] : []));
  if (other) more.set(true); // на узком экране таблица спрятана за «Подробности»: раскрываем
  $('cardCompare').textContent =
    state.cmp === s.n ? 'Отменить сравнение' : state.cmp != null ? 'Сравнить с этим' : 'Сравнить';
}

function compareTable(a, b) {
  const type = state.type, word = BAY_WORD[type];
  const rows = [
    ['Что это', seatLabel(type, a), seatLabel(type, b)],
    ['Цена', money(price(type, a)), money(price(type, b))],
    ['Статус', isBusy(a.n) ? 'занято' : 'свободно', isBusy(b.n) ? 'занято' : 'свободно'],
    ['До туалета', `${toToilet(type, a)} ${word}`, `${toToilet(type, b)} ${word}`],
    ['Окно', hasWindow(type, a), hasWindow(type, b)],
  ];
  return el('table', { className: 'cmp-table' },
    el('caption', null, `Сравнение мест ${a.n} и ${b.n}`),
    el('thead', null, el('tr', null,
      el('td'),
      el('th', { scope: 'col' }, 'Место ' + a.n),
      el('th', { scope: 'col' }, 'Место ' + b.n))),
    el('tbody', null, ...rows.map(([name, x, y]) =>
      el('tr', null, el('th', { scope: 'row' }, name), el('td', null, x), el('td', null, y)))),
  );
}

/* ---- отклик на копирование ссылки: подсказка рядом с кнопкой, она же живая область ---- */
let tipTimer = 0;
let lastTip = '';

export function reportCopy(ok) {
  const tip = $('copyTip');
  let text = ok ? 'Скопировано' : 'Не скопировалось';
  if (text === lastTip) text += '\u00A0'; // иначе VoiceOver промолчит на повторе
  lastTip = text;
  clearTimeout(tipTimer);
  tip.textContent = '';
  requestAnimationFrame(() => {
    tip.textContent = text;
    tip.toggleAttribute('data-show', true);
  });
  tipTimer = setTimeout(() => {
    tip.removeAttribute('data-show');
    tip.textContent = '';
  }, 2400);
}
