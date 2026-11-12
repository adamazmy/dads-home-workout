import { type ArmPoints, type Figure, type LegPoints, type Vec, BODY, add, dir, scale } from './skeleton';
import { type DumbbellSpec, type Prop, type Timeline, isDynamicProp } from './timeline';

const NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;
function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, val] of Object.entries(attrs)) node.setAttribute(k, String(val));
  parent?.appendChild(node);
  return node;
}

/** World (cm, y up) → SVG user units (y down). */
const sx = (p: Vec) => p.x.toFixed(2);
const sy = (p: Vec) => (-p.y).toFixed(2);
const pts = (...ps: Vec[]) => ps.map((p) => `${sx(p)},${sy(p)}`).join(' ');

interface Box {
  x1: number;
  x2: number;
  y2: number;
}
const grow = (box: Box, p: Vec, pad = 0) => {
  box.x1 = Math.min(box.x1, p.x - pad);
  box.x2 = Math.max(box.x2, p.x + pad);
  box.y2 = Math.max(box.y2, p.y + pad);
};

function figureBox(f: Figure, box: Box): void {
  for (const p of [
    f.hip, f.shoulder, f.armN.elbow, f.armN.hand, f.armF.elbow, f.armF.hand,
    f.legN.knee, f.legN.heel, f.legN.toe, f.legF.knee, f.legF.heel, f.legF.toe,
  ]) grow(box, p);
  grow(box, f.head, BODY.headR);
}

function chairGeom(p: Extract<Prop, { kind: 'chair' }>) {
  const seat = p.seat ?? 46;
  const depth = p.depth ?? 42;
  const back = p.back ?? 88;
  const s = p.facing === 'right' ? -1 : 1; // direction from the seat front to the backrest
  return { seat, depth, back, front: p.x, rear: p.x + s * depth };
}

function propBox(p: Prop, box: Box): void {
  switch (p.kind) {
    case 'chair': {
      const g = chairGeom(p);
      grow(box, { x: g.front, y: g.back });
      grow(box, { x: g.rear, y: g.back });
      break;
    }
    case 'mat':
    case 'step':
      grow(box, { x: p.x1, y: 0 });
      grow(box, { x: p.x2, y: p.kind === 'step' ? p.h : 0 });
      break;
    case 'lines':
      p.paths.flat().forEach((v) => grow(box, v, 3));
      break;
    case 'circle':
      grow(box, p.c, p.r);
      break;
    case 'cable':
      grow(box, p.from, 4);
      break;
    default:
      break; // body-attached props stay inside the figure's box
  }
}

/** A viewBox that fits the whole movement plus props, floor near the bottom, 4:3. */
export function computeView(tl: Timeline): { x: number; y: number; w: number; h: number } {
  const box: Box = { x1: Infinity, x2: -Infinity, y2: -Infinity };
  const steps = 60;
  for (let i = 0; i < steps; i++) figureBox(tl.sample((tl.duration * i) / steps).figure, box);
  for (const p of tl.anim.props) propBox(p, box);
  const pad = 12;
  let w = box.x2 - box.x1 + pad * 2;
  let h = box.y2 + pad + 10;
  const aspect = 4 / 3;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const cx = (box.x1 + box.x2) / 2;
  return { x: cx - w / 2, y: -(h - 10), w, h };
}

function drawStaticProp(p: Prop, g: SVGGElement): void {
  switch (p.kind) {
    case 'chair': {
      const c = chairGeom(p);
      const legInset = Math.sign(c.rear - c.front) * 3;
      el('path', {
        class: 'prop',
        d: [
          `M${c.front},${-c.seat} L${c.rear},${-c.seat}`, // seat
          `M${c.front + legInset},${-c.seat} L${c.front + legInset},0`, // front leg
          `M${c.rear - legInset},${-c.seat} L${c.rear - legInset},0`, // back leg
          `M${c.rear - legInset},${-c.seat} L${c.rear - legInset + Math.sign(c.rear - c.front) * 4},${-c.back}`, // backrest
        ].join(' '),
      }, g);
      break;
    }
    case 'mat':
      el('rect', { class: 'mat', x: p.x1, y: -2, width: p.x2 - p.x1, height: 2, rx: 1 }, g);
      break;
    case 'step':
      el('rect', { class: 'step', x: p.x1, y: -p.h, width: p.x2 - p.x1, height: p.h, rx: 1.5 }, g);
      break;
    case 'lines':
      for (const path of p.paths) el('polyline', { class: p.style === 'pad' ? 'pad' : 'prop', points: pts(...path) }, g);
      break;
    case 'circle':
      el('circle', { class: p.style === 'pad' ? 'pad-round' : 'pulley', cx: sx(p.c), cy: sy(p.c), r: p.r }, g);
      break;
    default:
      break;
  }
}

interface LimbEls {
  line: SVGPolylineElement;
  end: SVGElement;
}

type DynamicEl =
  | { prop: Extract<Prop, { kind: 'cable' }>; lines: SVGLineElement[] }
  | { prop: Extract<Prop, { kind: 'footplate' }>; line: SVGLineElement }
  | { prop: Extract<Prop, { kind: 'roller' }>; circle: SVGCircleElement };

/** Renders one exercise. Call `update` with each sampled figure. */
export class FigureView {
  readonly svg: SVGSVGElement;
  private readonly arms: Record<'armN' | 'armF', LimbEls>;
  private readonly legs: Record<'legN' | 'legF', LimbEls>;
  private readonly torso: SVGLineElement;
  private readonly neck: SVGLineElement;
  private readonly head: SVGCircleElement;
  private readonly bells: { spec: DumbbellSpec; g: SVGGElement }[] = [];
  private readonly dynamic: DynamicEl[] = [];

  constructor(private readonly tl: Timeline, label: string) {
    const v = computeView(tl);
    this.svg = el('svg', {
      class: 'figure',
      viewBox: `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`,
      role: 'img',
      'aria-label': label,
    });
    const props = el('g', {}, this.svg);
    el('line', { class: 'floor', x1: v.x, x2: v.x + v.w, y1: 0, y2: 0 }, props);
    for (const p of tl.anim.props) if (!isDynamicProp(p)) drawStaticProp(p, props);

    // Body-attached props: behind the far limbs.
    const dyn = el('g', { class: 'dyn' }, this.svg);
    for (const p of tl.anim.props) {
      if (p.kind === 'cable') {
        el('circle', { class: 'pulley', cx: sx(p.from), cy: sy(p.from), r: 3.5 }, dyn);
        const lines = p.to.map(() => el('line', { class: p.style === 'lever' ? 'lever' : `cable${p.depthHint ? ' dashed' : ''}` }, dyn));
        this.dynamic.push({ prop: p, lines });
      } else if (p.kind === 'footplate') {
        this.dynamic.push({ prop: p, line: el('line', { class: 'plate' }, dyn) });
      } else if (p.kind === 'roller') {
        this.dynamic.push({ prop: p, circle: el('circle', { class: 'pad-round', r: p.r }, dyn) });
      }
    }

    const far = el('g', { class: 'far' }, this.svg);
    const mkLeg = (g: SVGGElement): LimbEls => ({
      line: el('polyline', { class: 'limb' }, g),
      end: el('polygon', { class: 'foot' }, g),
    });
    const mkArm = (g: SVGGElement): LimbEls => ({
      line: el('polyline', { class: 'limb' }, g),
      end: el('circle', { class: 'hand', r: 3.2 }, g),
    });
    const legF = mkLeg(far);
    const armF = mkArm(far);
    this.addBells('armF', far);

    const body = el('g', { class: 'near' }, this.svg);
    this.neck = el('line', { class: 'limb' }, body);
    this.torso = el('line', { class: 'torso' }, body);
    this.head = el('circle', { class: 'head', r: BODY.headR }, body);
    const legN = mkLeg(body);
    this.addBells('hip', body);
    const armN = mkArm(body);
    this.addBells('armN', body);
    this.arms = { armN, armF };
    this.legs = { legN, legF };
  }

  private addBells(at: DumbbellSpec['at'], parent: SVGGElement): void {
    for (const spec of this.tl.anim.dumbbells.filter((d) => d.at === at)) {
      const g = el('g', { class: 'bell' }, parent);
      if (spec.view === 'end') {
        el('circle', { class: 'plate', r: 7.5 }, g);
        el('circle', { class: 'hub', r: 2 }, g);
      } else if (spec.view === 'handle') {
        el('line', { class: 'handle', x1: -6, y1: 0, x2: 6, y2: 0 }, g);
        el('circle', { class: 'plate', r: 3.6 }, g);
      } else {
        // Drawn along local "up"; rotated to the handle angle.
        el('line', { class: 'handle', x1: 0, y1: -9, x2: 0, y2: 9 }, g);
        el('rect', { class: 'plate', x: -7.5, y: -16, width: 15, height: 6.5, rx: 1.5 }, g);
        el('rect', { class: 'plate', x: -7.5, y: 9.5, width: 15, height: 6.5, rx: 1.5 }, g);
      }
      this.bells.push({ spec, g });
    }
  }

  update(f: Figure): void {
    const setLine = (l: SVGLineElement, a: Vec, b: Vec) => {
      l.setAttribute('x1', sx(a));
      l.setAttribute('y1', sy(a));
      l.setAttribute('x2', sx(b));
      l.setAttribute('y2', sy(b));
    };
    setLine(this.torso, f.hip, f.shoulder);
    setLine(this.neck, f.shoulder, f.neckTop);
    this.head.setAttribute('cx', sx(f.head));
    this.head.setAttribute('cy', sy(f.head));

    for (const key of ['legN', 'legF'] as const) {
      const l: LegPoints = f[key];
      this.legs[key].line.setAttribute('points', pts(l.root, l.knee, l.ankle));
      this.legs[key].end.setAttribute('points', pts(l.ankle, l.toe, l.heel));
    }
    for (const key of ['armN', 'armF'] as const) {
      const a: ArmPoints = f[key];
      this.arms[key].line.setAttribute('points', pts(a.root, a.elbow, a.wrist));
      this.arms[key].end.setAttribute('cx', sx(a.hand));
      this.arms[key].end.setAttribute('cy', sy(a.hand));
    }
    for (const d of this.dynamic) {
      if ('lines' in d) d.prop.to.forEach((k, i) => setLine(d.lines[i]!, d.prop.from, f[k].hand));
      else if ('line' in d) {
        // A plate just under the sole, a little longer than the foot.
        const { heel, toe } = f[d.prop.limb];
        const along = { x: toe.x - heel.x, y: toe.y - heel.y };
        const len = Math.hypot(along.x, along.y) || 1;
        const u = scale(along, 1 / len);
        const out = { x: u.y, y: -u.x }; // away from the sole
        const a = add(add(heel, scale(u, -8)), scale(out, 2.5));
        const b = add(add(toe, scale(u, 8)), scale(out, 2.5));
        setLine(d.line, a, b);
      } else {
        const leg = f[d.prop.limb];
        const shin = f.pose[d.prop.limb][1];
        const c = add(add(leg.knee, scale({ x: leg.ankle.x - leg.knee.x, y: leg.ankle.y - leg.knee.y }, d.prop.along)), dir(shin + 90, d.prop.r + 3));
        d.circle.setAttribute('cx', sx(c));
        d.circle.setAttribute('cy', sy(c));
      }
    }
    for (const { spec, g } of this.bells) {
      let pos: Vec;
      let angle = 0;
      if (spec.at === 'hip') {
        const [along, fwd] = spec.offset ?? [0, 0];
        pos = add(f.hip, add(dir(f.pose.torso, along), dir(f.pose.torso + 90, fwd)));
      } else {
        pos = f[spec.at].hand;
        const fore = f.pose[spec.at][1];
        angle =
          spec.view === 'grip' ? fore + 90
          : spec.view === 'torso' ? f.pose.torso
          : typeof spec.view === 'number' ? spec.view
          : 0;
      }
      g.setAttribute('transform', `translate(${sx(pos)} ${sy(pos)}) rotate(${angle.toFixed(1)})`);
    }
  }
}
