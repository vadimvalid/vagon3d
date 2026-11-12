// Действия приложения: меняют состояние и раздают обновления интерфейсу и 3D-сцене.
import { TRAIN, TYPE_NAME, APP_NAME } from './config.js';
import { seatLabel, price, money } from './model/seats.js';
import { state, seats, isBusy, loadCar, savePrefs } from './store.js';
import { readHash, writeHash } from './router.js';
import { announce } from './ui/announce.js';
import { syncTrain } from './ui/train.js';
import { renderScheme, syncSeats, revealSeat, seatButton } from './ui/scheme.js';
import { renderCard, setCardScene, reportCopy } from './ui/card.js';
import { syncToggles, setSceneStatus } from './ui/controls.js';
import { track } from './analytics.js';

/** 3D-сцена подключается позже: она грузится отдельным файлом и может не запуститься вовсе. */
let scene = null;
const baseTitle = document.title;

function syncTitle() {
  document.title = state.sel != null
    ? `Место ${state.sel}, вагон ${state.car} · ${APP_NAME}`
    : baseTitle;
}

/**
 * Выбор места.
 * @param {number|null} n
 * @param {object} [o]
 * @param {boolean} [o.fly]  подлететь камерой к месту (выбор со схемы или по ссылке)
 */
export function select(n, { fly = false } = {}) {
  state.sel = n;
  writeHash(state.car, n);
  syncTitle();
  syncSeats();
  renderCard();
  if (n != null) {
    track('seat_select', { car_type: state.type, seat: n, source: fly ? 'scheme' : 'model' });
    if (!fly) revealSeat(n); // выбрали на модели: прокручиваем схему к этому месту
    const s = seats.info.get(n);
    announce(`Место ${n}, ${seatLabel(state.type, s)}, ${isBusy(n) ? 'занято' : money(price(state.type, s))}`);
  } else {
    announce('Выбор снят');
  }
  if (scene) {
    scene.highlight();
    if (fly && n != null) scene.focusSeat(n);
  }
}

export function setHover(n) {
  if (state.hover === n) return;
  state.hover = n;
  syncSeats();
  scene?.highlight();
}

export function setCar(car, { fromHash = false } = {}) {
  loadCar(car);
  syncTrain(car);
  renderScheme();
  renderCard();
  syncTitle();
  if (!fromHash) { writeHash(car, null); track('car_select', { car, car_type: state.type }); }
  savePrefs();
  const total = seats.info.size;
  announce(`Вагон ${car}, ${TYPE_NAME[state.type].toLowerCase()}. Свободно ${total - seats.busy.size} из ${total}`);
  scene?.rebuild();
}

/** Переключатели вида. */
const setters = {
  shell(v) { state.shell = v; scene?.invalidate(); },
  upper(v) { state.upper = v; scene?.invalidate(); },
  shadows(v) { state.shadows = v; scene?.shadows(); },
  dims(v) { state.dims = v; scene?.dims(); },
  night(v) { state.night = v; scene?.night(); },
};
export function setOption(key, value) {
  if (state[key] === value) return;
  setters[key](value);
  syncToggles();
  track('option_toggle', { option: key, value: String(value) });
  savePrefs();
}
export function toggleOption(key) {
  setOption(key, key === 'shell' ? (state.shell === 'full' ? 'cut' : 'full') : !state[key]);
}

export function compareSelected() {
  state.cmp = state.cmp === state.sel ? null : state.sel;
  if (state.cmp != null) track('seat_compare', { car_type: state.type });
  syncSeats();
  renderCard();
  announce(state.cmp != null ? `Место ${state.cmp} отложено для сравнения. Выберите второе место` : 'Сравнение отменено');
}

/** Снять выбор кнопкой в карточке: кнопка исчезает, поэтому фокус возвращаем на место в схеме. */
export function clearSelected() {
  const prev = state.sel;
  select(null);
  if (prev != null) seatButton(prev)?.focus();
}

export async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    reportCopy(true);
    track('share', { method: 'copy_link', content_type: 'seat' });
  } catch {
    reportCopy(false); // нет доступа к буферу (http, file:// или запрет в настройках)
  }
}

export const setView = name => { track('camera_view', { view: name }); scene?.setView(name); };
export const seatView = () => {
  if (state.sel == null) return;
  track('seat_view', { car_type: state.type, seat: state.sel });
  scene?.seatView(state.sel);
};
export const orbit = angle => scene?.orbit(angle, 0);
export const zoom = factor => scene?.zoom(factor);
export const walk = step => scene?.walk(step);

/** Применяет адрес вида #car-5-seat-23. */
export function applyHash() {
  const target = readHash();
  if (!target) return;
  const { car, seat } = target;
  if (car >= 1 && car <= TRAIN.length && car !== state.car) setCar(car, { fromHash: true });
  if (seat !== state.sel) select(seats.info.has(seat) ? seat : null, { fly: seat != null });
}

/** Сцена готова и уже нарисовала первый кадр. */
export function attachScene(api) {
  scene = api;
  setSceneStatus(true);
  setCardScene(true);
  scene.highlight(); // пока сцена запускалась, выбор мог измениться
  if (state.sel != null) scene.focusSeat(state.sel);
}

export function sceneFailed(error) {
  console.error(error);
  setSceneStatus(false);
}
