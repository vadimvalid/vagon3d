// Единая «вежливая» живая область: сообщения для программ экранного доступа.
import { $ } from './dom.js';

let timer = 0;
let last = '';

/** Озвучивает короткое сообщение. Частые вызовы схлопываются: звучит последнее. */
export function announce(text) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    // VoiceOver пропускает сообщение, если оно дословно совпадает с предыдущим.
    if (text === last) text += '\u00A0';
    last = text;
    $('live').textContent = text;
  }, 150);
}
