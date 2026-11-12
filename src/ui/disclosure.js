// Раскрывающийся блок: кнопка с aria-expanded показывает и прячет панель.
// Сама видимость задаётся в CSS по атрибуту data-open, поэтому на широком экране панель может быть видна всегда.

/**
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} panel
 * @param {object} [o]
 * @param {boolean} [o.dismiss]   закрывать по Esc, по клику мимо и при уходе фокуса (для выпадающих панелей)
 * @param {() => void} [o.onToggle]
 */
export function disclosure(button, panel, { dismiss = false, onToggle } = {}) {
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  function set(open) {
    if (open === isOpen()) return;
    button.setAttribute('aria-expanded', String(open));
    panel.toggleAttribute('data-open', open);
    onToggle?.(open);
  }
  button.addEventListener('click', () => set(!isOpen()));

  if (dismiss) {
    const onKey = e => {
      if (e.key !== 'Escape' || !isOpen()) return;
      e.stopPropagation(); // иначе тот же Esc заодно снимет выбор места
      const hadFocus = panel.contains(document.activeElement);
      set(false);
      if (hadFocus) button.focus();
    };
    button.addEventListener('keydown', onKey);
    panel.addEventListener('keydown', onKey);
    // клик или переход фокуса за пределы панели закрывает её, чтобы она не заслоняла то, что под ней
    const outside = e => {
      if (isOpen() && !panel.contains(e.target) && !button.contains(e.target)) set(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
  }
  return { set, isOpen };
}
