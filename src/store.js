// Состояние приложения и сохранение настроек.
import { TRAIN, DEFAULT_CAR, STORAGE_KEY } from './config.js';
import { seatList, rollBusy } from './model/seats.js';

/** Слабое устройство: сенсорный экран или маленькое окно. Влияет только на значения по умолчанию. */
export const small =
  window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 760;

function loadPrefs() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {}; // хранилище недоступно (file://, приватный режим) или данные испорчены
  }
}

const saved = loadPrefs();
const startCar = Number.isInteger(saved.car) && saved.car >= 1 && saved.car <= TRAIN.length ? saved.car : DEFAULT_CAR;

export const state = {
  car: startCar,
  type: TRAIN[startCar - 1],
  sel: null,      // выбранное место
  hover: null,    // место под курсором или в фокусе
  cmp: null,      // место, отложенное для сравнения
  dims: saved.dims === true,
  night: saved.night === true,
  shell: saved.shell === 'full' ? 'full' : 'cut',
  upper: saved.upper !== false,
  shadows: typeof saved.shadows === 'boolean' ? saved.shadows : !small,
};

/** Места текущего вагона (номер → описание) и множество занятых номеров. */
export const seats = { info: new Map(), busy: new Set() };

export const isBusy = n => seats.busy.has(n);

/** Переключает модель на другой вагон: сбрасывает выбор, пересчитывает места и занятость. */
export function loadCar(car) {
  state.car = car;
  state.type = TRAIN[car - 1];
  state.sel = state.hover = state.cmp = null;
  seats.info = new Map(seatList(state.type).map(s => [s.n, s]));
  seats.busy = rollBusy(car, seats.info);
}

export function savePrefs() {
  const { car, upper, shell, shadows, dims, night } = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ car, upper, shell, shadows, dims, night }));
  } catch {
    // приватный режим или переполнение: работаем без сохранения
  }
}

loadCar(startCar);
