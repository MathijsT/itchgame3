// Minimal canvas charts (line, area, stacked share), HiDPI aware.

function setup(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 160;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h };
}

const AXIS = '#5f6b94';
const GRID = 'rgba(52, 65, 107, 0.45)';
const FONT = '11px ui-monospace, Menlo, Consolas, monospace';

function niceTicks(min, max, count = 4) {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

/**
 * opts: { series: [{ color, data: number[], fill?: bool, width? }], yFormat, xLabel(i) -> string,
 *         xTicks: number, highlight: index, markerLabel }
 */
export function lineChart(canvas, opts) {
  const { g, w, h } = setup(canvas);
  const padL = opts.padLeft ?? 54, padR = 10, padT = 10, padB = opts.xLabel ? 22 : 8;
  const n = Math.max(...opts.series.map((s) => s.data.length), 0);
  if (n < 2) {
    g.fillStyle = AXIS; g.font = FONT; g.textAlign = 'center';
    g.fillText(opts.empty || 'Not enough data yet', w / 2, h / 2);
    return;
  }
  let min = Infinity, max = -Infinity;
  for (const s of opts.series) for (const v of s.data) { if (v < min) min = v; if (v > max) max = v; }
  if (opts.zero !== false) { min = Math.min(0, min); max = Math.max(0, max); }
  const { lo, hi, ticks } = niceTicks(min, max, 4);
  const X = (i) => padL + (i / (n - 1)) * (w - padL - padR);
  const Y = (v) => padT + (1 - (v - lo) / (hi - lo || 1)) * (h - padT - padB);
  g.font = FONT; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (const t of ticks) {
    g.strokeStyle = t === 0 ? AXIS : GRID; g.lineWidth = 1;
    g.beginPath(); g.moveTo(padL, Math.round(Y(t)) + 0.5); g.lineTo(w - padR, Math.round(Y(t)) + 0.5); g.stroke();
    g.fillStyle = AXIS; g.fillText(opts.yFormat ? opts.yFormat(t) : String(t), padL - 6, Y(t));
  }
  if (opts.xLabel) {
    g.textAlign = 'center'; g.textBaseline = 'top';
    const count = opts.xTicks ?? 5;
    for (let k = 0; k < count; k++) {
      const i = Math.round((k / (count - 1)) * (n - 1));
      g.fillStyle = AXIS; g.fillText(opts.xLabel(i), Math.min(w - 24, Math.max(padL + 16, X(i))), h - padB + 6);
    }
  }
  for (const s of opts.series) {
    if (s.data.length < 2) continue;
    if (s.fill) {
      g.beginPath();
      g.moveTo(X(0), Y(Math.max(lo, 0)));
      s.data.forEach((v, i) => g.lineTo(X(i), Y(v)));
      g.lineTo(X(s.data.length - 1), Y(Math.max(lo, 0)));
      g.closePath();
      const grad = g.createLinearGradient(0, padT, 0, h - padB);
      grad.addColorStop(0, hexA(s.color, 0.35)); grad.addColorStop(1, hexA(s.color, 0.02));
      g.fillStyle = grad; g.fill();
    }
    g.beginPath();
    s.data.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))));
    g.strokeStyle = s.color; g.lineWidth = s.width || 2; g.lineJoin = 'round'; g.stroke();
  }
  if (opts.highlight !== undefined && opts.highlight >= 0) {
    const i = opts.highlight;
    const s = opts.series[0];
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(X(i), padT); g.lineTo(X(i), h - padB); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(X(i), Y(s.data[i]), 4, 0, Math.PI * 2); g.fill();
    if (opts.markerLabel) {
      g.font = 'bold 11px system-ui, sans-serif'; g.textBaseline = 'bottom';
      g.textAlign = X(i) > w - 90 ? 'right' : 'left';
      g.fillText(opts.markerLabel, X(i) + (g.textAlign === 'left' ? 6 : -6), Math.max(padT + 14, Y(s.data[i]) - 6));
    }
  }
  if (opts.secondHighlight !== undefined && opts.secondHighlight >= 0) {
    const i = opts.secondHighlight;
    g.strokeStyle = 'rgba(255, 209, 102, 0.6)'; g.setLineDash([2, 4]);
    g.beginPath(); g.moveTo(X(i), padT); g.lineTo(X(i), h - padB); g.stroke(); g.setLineDash([]);
  }
}

/** Stacked 100% area chart. series: [{color, data}] where data are absolute values per x. */
export function shareChart(canvas, opts) {
  const { g, w, h } = setup(canvas);
  const padL = 36, padR = 8, padT = 8, padB = opts.xLabel ? 22 : 8;
  const n = Math.max(...opts.series.map((s) => s.data.length), 0);
  if (n < 2) {
    g.fillStyle = AXIS; g.font = FONT; g.textAlign = 'center';
    g.fillText(opts.empty || 'Market history builds up over time', w / 2, h / 2);
    return;
  }
  const totals = new Array(n).fill(0);
  for (const s of opts.series) s.data.forEach((v, i) => { totals[i] += v || 0; });
  const X = (i) => padL + (i / (n - 1)) * (w - padL - padR);
  const Y = (f) => padT + (1 - f) * (h - padT - padB);
  const base = new Array(n).fill(0);
  for (const s of opts.series) {
    g.beginPath();
    for (let i = 0; i < n; i++) g.lineTo(X(i), Y(base[i] + (totals[i] ? (s.data[i] || 0) / totals[i] : 0)));
    for (let i = n - 1; i >= 0; i--) g.lineTo(X(i), Y(base[i]));
    g.closePath();
    g.fillStyle = hexA(s.color, s.highlight ? 0.95 : 0.7); g.fill();
    if (s.highlight) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
    for (let i = 0; i < n; i++) base[i] += totals[i] ? (s.data[i] || 0) / totals[i] : 0;
  }
  g.font = FONT; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = AXIS;
  for (const f of [0, 0.5, 1]) g.fillText(`${f * 100}%`, padL - 4, Y(f));
  if (opts.xLabel) {
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let k = 0; k < 5; k++) {
      const i = Math.round((k / 4) * (n - 1));
      g.fillText(opts.xLabel(i), Math.min(w - 20, Math.max(padL + 14, X(i))), h - padB + 6);
    }
  }
}

export function hexA(hex, a) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
