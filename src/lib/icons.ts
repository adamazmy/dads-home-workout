/** Inline stroke icons (24×24 grid, currentColor). Decorative: always aria-hidden. */
const PATHS = {
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3.2"/>',
  swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  walk: '<circle cx="13" cy="4" r="1.8" fill="currentColor"/><path d="M10 21l2.5-6 2.5 2.5V21M12.5 15l-1-5.5 3.5 2.5 2.5.5M11.5 9.5L8 11.5 7 14.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 12.5l3.2 3.2L17 9" stroke="var(--on-check, #fff)"/>',
  home: '<path d="M3.5 11L12 4l8.5 7v9.5h-5.5v-6h-6v6H3.5z" fill="currentColor" stroke-linejoin="round"/>',
  chart: '<path d="M5 20v-6M10.5 20V10M16 20V5" stroke-width="3"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/><circle cx="12" cy="12" r="6.6"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-width="3"/>',
  minus: '<path d="M5 12h14" stroke-width="3"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 2.8-5.6 3.7-9.3 2.3 1.4 3.3 3.4 3.3 5.4 1-.6 1.7-1.8 1.9-3 2.1 1.8 4.1 4.3 4.1 7 0 3.5-2.6 6.1-6.5 6.1z"/>',
  warning: '<path d="M12 3.5L22 20.5H2z"/><path d="M12 10v4.5M12 17.5v.01"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function iconSvg(name: IconName, size = 24): string {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

export function icon(name: IconName, size = 24): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'icon-wrap';
  span.innerHTML = iconSvg(name, size);
  return span;
}
