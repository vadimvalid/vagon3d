// Окно справки на родном <dialog>: браузер сам держит фокус внутри и закрывает по Esc.
import { $ } from './dom.js';

export function initHelp() {
  const dialog = $('help');
  $('helpOpen').addEventListener('click', () => dialog.showModal());
  $('helpClose').addEventListener('click', () => dialog.close());

  // Закрытие по клику мимо окна даёт атрибут closedby="any". Где его ещё нет, делаем то же вручную.
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    });
  }
}

export const helpIsOpen = () => $('help').open;
