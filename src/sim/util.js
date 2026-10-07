import { WEEKS_PER_YEAR, WEEKS_PER_MONTH } from '../data/constants.js';

// ---- Seeded RNG (mulberry32), state lives in the save so runs are reproducible ----
export function rand(state) {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randRange = (s, a, b) => a + rand(s) * (b - a);
export const randInt = (s, a, b) => a + Math.floor(rand(s) * (b - a + 1));
export const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
export const chance = (s, p) => rand(s) < p;
export function gauss(s) {
  const u = Math.max(1e-9, rand(s));
  const v = rand(s);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function pickWeighted(s, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(s) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- Time ----
/** Fractional calendar year for a given week index. */
export const yearAt = (state, week) => state.startYear + week / WEEKS_PER_YEAR;
export const curYear = (state) => yearAt(state, state.week);
export const curYearInt = (state) => Math.floor(curYear(state));

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateParts(state, week = state.week) {
  const year = state.startYear + Math.floor(week / WEEKS_PER_YEAR);
  const inYear = ((week % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
  const month = Math.floor(inYear / WEEKS_PER_MONTH);
  const wk = (inYear % WEEKS_PER_MONTH) + 1;
  return { year, month, wk };
}

export function formatDate(state, week = state.week, withWeek = false) {
  const { year, month, wk } = dateParts(state, week);
  return withWeek ? `${MONTH_NAMES[month]} ${year}, W${wk}` : `${MONTH_NAMES[month]} ${year}`;
}

/** General price-level multiplier used for salaries, rents and fees. */
export const eraMult = (year) => Math.pow(1.045, Math.max(0, year - 1977));

export function newId(state, prefix) {
  state.nextId = (state.nextId || 1) + 1;
  return `${prefix}${state.nextId}`;
}
