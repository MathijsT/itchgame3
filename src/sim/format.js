// Number formatting shared by the simulation (for messages) and the UI.

const UNITS = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

export function fmtNum(v, digits = 1) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  for (const [n, s] of UNITS) {
    if (a >= n) {
      const x = v / n;
      const d = Math.abs(x) >= 100 ? 0 : digits;
      return `${x.toFixed(d)}${s}`;
    }
  }
  return a >= 100 || Number.isInteger(v) ? `${Math.round(v)}` : v.toFixed(digits);
}

export function fmtMoney(v, digits = 1) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a < 10000) return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
  return `${sign}$${fmtNum(a, digits)}`;
}

export function fmtPrice(v) {
  if (v >= 100000) return fmtMoney(v);
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

export function fmtPct(v, digits = 0) {
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtSigned(v, fn = fmtNum) {
  return v >= 0 ? `+${fn(v)}` : fn(v);
}
