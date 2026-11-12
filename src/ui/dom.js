// Мелкие помощники для работы с DOM.

export const $ = id => document.getElementById(id);

/** Создаёт элемент: el('button', { className: 'seat', type: 'button' }, 'текст', потомок). */
export function el(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value);
    }
  }
  node.append(...children);
  return node;
}

/** Элемент действительно виден пользователю (не скрыт через display: none или hidden). */
export const isShown = node => node.getClientRects().length > 0;
