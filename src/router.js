// Адрес вида #car-5-seat-23 открывает конкретное место.

const PATTERN = /^#car-(\d+)(?:-seat-(\d+))?$/;

/** Разбирает хэш адреса. Возвращает null, если он не про вагон. */
export function readHash() {
  const m = PATTERN.exec(location.hash);
  return m ? { car: +m[1], seat: m[2] ? +m[2] : null } : null;
}

/** Записывает вагон и место в адрес, не добавляя шаг в историю браузера. */
export function writeHash(car, seat) {
  const hash = seat != null ? `#car-${car}-seat-${seat}` : `#car-${car}`;
  if (location.hash === hash) return;
  try {
    history.replaceState(history.state, '', hash);
  } catch {
    // file:// в некоторых браузерах запрещает replaceState: адрес просто не обновится
  }
}
