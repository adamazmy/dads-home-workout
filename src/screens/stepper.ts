import { h } from '../lib/dom';
import { icon } from '../lib/icons';

export interface StepperOptions {
  /** Visible label, e.g. "reps" or "kg per dumbbell". */
  label: string;
  value: number | null;
  step: number;
  min: number;
  max: number;
  /** Where "+" starts from when there is no value yet (e.g. the lightest dumbbell). */
  startAt?: number;
  /** Allow "no value" (e.g. no weight recorded). */
  allowEmpty?: boolean;
  onChange: (v: number | null) => void;
}

/** Big −/+ buttons around a number field (tap the number to type it). */
export function stepper(o: StepperOptions): HTMLElement {
  let value = o.value;
  const id = `st-${Math.random().toString(36).slice(2, 8)}`;
  const decimals = o.step % 1 ? 1 : 0;
  const clamp = (v: number) => Math.min(o.max, Math.max(o.min, Math.round(v / (o.step < 1 ? 0.5 : 1)) * (o.step < 1 ? 0.5 : 1)));

  const input = h('input', {
    id,
    class: 'stepper-value',
    type: 'number',
    inputmode: decimals ? 'decimal' : 'numeric',
    min: o.min,
    max: o.max,
    step: o.step < 1 ? 0.5 : decimals ? 0.5 : 1,
    placeholder: '–',
  });
  const less = h('button', { class: 'stepper-btn', type: 'button', 'aria-label': `Less – ${o.label}` }, icon('minus', 30));
  const more = h('button', { class: 'stepper-btn', type: 'button', 'aria-label': `More – ${o.label}` }, icon('plus', 30));

  const show = () => {
    input.value = value === null ? '' : String(value);
    less.disabled = value === null || (value <= o.min && !o.allowEmpty);
  };
  const set = (v: number | null) => {
    value = v === null ? null : clamp(v);
    show();
    o.onChange(value);
  };

  less.addEventListener('click', () => {
    if (value === null) return;
    const next = value - o.step;
    set(o.allowEmpty && next <= 0 ? null : next);
  });
  more.addEventListener('click', () => set(value === null ? (o.startAt ?? o.step) : value + o.step));
  input.addEventListener('change', () => {
    const n = Number(input.value.replace(',', '.'));
    set(input.value.trim() === '' || !Number.isFinite(n) || (o.allowEmpty && n <= 0) ? (o.allowEmpty ? null : o.min) : n);
  });
  show();

  return h(
    'div',
    { class: 'stepper', role: 'group', 'aria-labelledby': `${id}-l` },
    less,
    h('div', { class: 'stepper-mid' }, input, h('label', { id: `${id}-l`, for: id, class: 'stepper-label' }, o.label)),
    more,
  );
}
