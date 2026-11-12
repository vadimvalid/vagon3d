// Геометрия вагона в метрах. Ось X вдоль вагона, Z поперёк, Y вверх.
export const N = 9;                       // отсеков (купе) в спальном вагоне
export const BAY = 1.9;                   // шаг отсека
export const HALF = (N * BAY) / 2;        // половина длины пассажирской части
export const END = 3.2;                   // служебная зона с каждого конца
export const L = 2 * HALF + 2 * END;      // длина кузова
export const W = 3.0;                     // ширина
export const H = 2.6;                     // высота от пола до крыши
export const T = 0.03;                    // толщина стенки

// Сидячий вагон
export const ROWS = 18;
export const PITCH = 0.92;

export const BAY_WORD = { plac: 'отсек', kupe: 'купе', sv: 'купе', sit: 'ряд' };
export const TYPE_NAME = { plac: 'Плацкартный', kupe: 'Купейный', sv: 'СВ', sit: 'Сидячий' };
export const TYPE_ABBR = { plac: 'Пл', kupe: 'Куп', sv: 'СВ', sit: 'Сид' };

// Состав поезда: тип каждого вагона по порядку от локомотива.
export const TRAIN = ['sv', 'kupe', 'kupe', 'kupe', 'plac', 'plac', 'plac', 'plac', 'sit', 'sit'];
export const DEFAULT_CAR = 5;

export const STORAGE_KEY = 'vagon3d:v1';
export const APP_NAME = 'Вагон 3D';
