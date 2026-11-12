/** Tiny DOM helper: h('div', { class: 'x', onclick: fn }, child, 'text'). */
type Child = Node | string | null | undefined | false;
type AttrValue = string | number | boolean | EventListener | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

export interface Screen {
  el: HTMLElement;
  title: string;
  destroy?: () => void;
}

export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
