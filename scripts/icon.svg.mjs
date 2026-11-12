/**
 * App icon: a stick figure holding a dumbbell overhead, orange spine.
 * `pad` = fraction of the canvas kept clear (maskable icons need ~20%).
 */
export function iconSvg({ size = 512, pad = 0.12, rounded = true } = {}) {
  const s = 512;
  const k = 1 - pad * 2;
  const inner = `
    <g transform="translate(${s / 2} ${s / 2}) scale(${k}) translate(${-s / 2} ${-s / 2})">
      <g fill="none" stroke="#ffffff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="256" cy="120" r="44" fill="#0b6b4c"/>
        
        <path d="M160 88 L178 196 L226 206"/>
        <path d="M352 88 L334 196 L286 206"/>
        <path d="M236 330 L200 410 L210 470"/>
        <path d="M276 330 L312 410 L302 470"/>
      </g>
      <path d="M256 190 L256 330" stroke="#ff8f45" stroke-width="40" stroke-linecap="round"/>
      <g fill="#ffffff">
        <rect x="104" y="76" width="200" height="16" rx="8" transform="translate(-10 0)"/>
        <rect x="70" y="50" width="34" height="68" rx="10"/>
        <rect x="380" y="50" width="34" height="68" rx="10" transform="translate(28 0)"/>
        <rect x="300" y="76" width="120" height="16" rx="8"/>
      </g>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" ${rounded ? 'rx="96"' : ''} fill="#0b6b4c"/>${inner}
</svg>`;
}
