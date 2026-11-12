// Помощники планирования: не держать основной поток дольше, чем нужно.

/** Уступить основной поток, чтобы браузер обработал ввод и отрисовку. */
export function yieldToMain() {
  if ('scheduler' in window && 'yield' in window.scheduler) return window.scheduler.yield();
  return new Promise(resolve => setTimeout(resolve, 0));
}

/** Дождаться, пока браузер покажет текущий кадр, и только потом продолжить тяжёлую работу. */
export function afterNextPaint() {
  return new Promise(resolve => requestAnimationFrame(() => yieldToMain().then(resolve)));
}
