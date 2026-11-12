// Google Analytics 4. Подключается, только если при сборке задан VITE_GA_ID (вида G-XXXXXXXXXX),
// и только в продакшен-сборке: локальная разработка в статистику не попадает.
// Скрипт Google грузится, когда браузер освободился, чтобы не тормозить запуск 3D-сцены.

const id = import.meta.env.PROD ? import.meta.env.VITE_GA_ID : '';
const enabled = typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id);

window.dataLayer = window.dataLayer || [];
// gtag ждёт именно объект arguments, массив не подойдёт
function gtag() { window.dataLayer.push(arguments); } // eslint-disable-line prefer-rest-params

export function initAnalytics() {
  if (!enabled) return;
  gtag('js', new Date());
  gtag('config', id);
  const load = () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(s);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}

/** Событие в отчёты GA. Без счётчика ничего не делает. */
export function track(name, params) {
  if (enabled) gtag('event', name, params);
}
