// Полоса состава: выбор вагона.
import { TRAIN, TYPE_NAME, TYPE_ABBR } from '../config.js';
import { $, el } from './dom.js';
import { roving } from './roving.js';

let nav = null;

export function initTrain({ onPick }) {
  const box = $('train');
  TRAIN.forEach((type, i) => {
    const car = i + 1;
    // Имя кнопки складывается из видимого текста и скрытых уточнений: «Вагон 5 Пл, плацкартный».
    box.append(el('button', { type: 'button', className: 'car', dataset: { car }, 'aria-pressed': 'false' },
      el('span', { className: 'vh' }, 'Вагон '),
      el('b', null, String(car)), ' ', el('i', null, TYPE_ABBR[type]),
      el('span', { className: 'vh' }, ', ' + TYPE_NAME[type].toLowerCase())));
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('.car');
    if (b) onPick(+b.dataset.car);
  });
  nav = roving(box, { selector: '.car', current: '[aria-pressed="true"]' });
}

export function syncTrain(car) {
  $('train').querySelectorAll('.car').forEach(b => {
    const on = +b.dataset.car === car;
    b.setAttribute('aria-pressed', String(on));
    if (on) { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); nav?.setCurrent(b); }
  });
}
