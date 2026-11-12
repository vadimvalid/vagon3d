// Точка входа. Интерфейс и схема мест работают сразу, 3D-сцена (three.js) догружается отдельным файлом.
import { state, seats, isBusy, small } from './store.js';
import * as app from './app.js';
import { $ } from './ui/dom.js';
import { initTrain, syncTrain } from './ui/train.js';
import { initScheme, renderScheme } from './ui/scheme.js';
import { initCard, renderCard } from './ui/card.js';
import { initControls, showWalk, showTip } from './ui/controls.js';
import { initHelp, helpIsOpen } from './ui/help.js';
import { afterNextPaint } from './util/schedule.js';
import { initAnalytics, track } from './analytics.js';

// Загрузку сцены начинаем первой строкой, чтобы файл качался, пока строится интерфейс.
const sceneModule = import('./scene/index.js');

initTrain({ onPick: car => app.setCar(car) });
initScheme({ onPick: n => app.select(n, { fly: true }), onHover: app.setHover });
initCard({ onView: app.seatView, onCompare: app.compareSelected, onClear: app.clearSelected, onCopy: app.copyLink });
initControls({ onView: app.setView, onToggle: app.toggleOption, onOrbit: app.orbit, onZoom: app.zoom, onWalk: app.walk });
initHelp();
initAnalytics();
$('helpOpen').addEventListener('click', () => track('help_open'));

syncTrain(state.car);
renderScheme();
renderCard();
app.applyHash();

window.addEventListener('hashchange', app.applyHash);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.sel != null && !helpIsOpen()) app.select(null);
});

sceneModule
  // Создание WebGL-контекста надолго занимает основной поток, поэтому сначала даём браузеру показать страницу.
  .then(module => afterNextPaint().then(() => module))
  .then(({ createScene }) => {
    performance.mark('scene:loaded');
    return createScene({
      canvas: $('scene'),
      stage: $('stage'),
      state, seats, isBusy, small,
      on: {
        select: n => app.select(n),
        hover: app.setHover,
        tip: showTip,
        walk: showWalk,
        shell: v => app.setOption('shell', v),
        upper: v => app.setOption('upper', v),
      },
    });
  })
  .then(app.attachScene, app.sceneFailed);
