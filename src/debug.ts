/** Dev-only page: every keyframe and mid-transition of every exercise, for the pose check. */
import './styles/app.css';
import { checkFigure } from './anim/checks';
import { FigureView } from './anim/render';
import { Timeline } from './anim/timeline';
import * as anims from './data/animations';

const params = new URLSearchParams(location.search);
if (params.get('theme')) document.documentElement.dataset.theme = params.get('theme')!;
const only = params.get('only');
const mids = params.get('mids') !== '0';
const cellW = params.get('w');
if (cellW) document.documentElement.style.setProperty('--cell-w', `${cellW}px`);

const grid = document.getElementById('grid')!;
grid.className = 'debug-grid';
for (const [name, anim] of Object.entries(anims)) {
  if (only && name !== only) continue;
  const tl = new Timeline(anim);
  const row = document.createElement('section');
  row.className = 'debug-row';
  row.innerHTML = `<h2>${name}</h2>`;
  const cells: { t: number; title: string }[] = [];
  tl.frames.forEach((f, i) => {
    if (mids && f.kf.dur > 0.05) cells.push({ t: f.startTime + f.kf.dur / 2, title: `→${i} mid` });
    cells.push({ t: f.startTime + f.kf.dur + 0.001, title: `kf${i}` });
  });
  for (const c of cells) {
    const s = tl.sample(c.t);
    const view = new FigureView(tl, name);
    view.update(s.figure);
    const issues = checkFigure(s.figure, anim.plane);
    const cell = document.createElement('figure');
    cell.className = issues.length ? 'debug-cell bad' : 'debug-cell';
    const cap = document.createElement('figcaption');
    cap.textContent = `${c.title}: ${s.label}${issues.length ? ' ⚠ ' + issues.join('; ') : ''}`;
    cell.append(view.svg, cap);
    row.append(cell);
  }
  grid.append(row);
}
document.body.dataset.ready = '1';
