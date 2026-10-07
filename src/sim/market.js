import { CATEGORIES, baseDemand, refPrice } from '../data/categories.js';
import { FACTORIES } from '../data/facilities.js';
import {
  SEGMENTS, PERF_K, BRAND_W, HYPE_W, NOVELTY_W, AGE_PENALTY, NEST_LAMBDA, OUTSIDE_UTILITY, DIFFICULTIES,
  WARRANTY_RATE, PRICE_CEILING,
} from '../data/constants.js';
import { refYear, bomCost, perkEffect } from './tech.js';
import { curYear } from './util.js';

export function demandMult(state, catId) {
  let m = 1;
  for (const e of state.effects) {
    if (e.type === 'demand' && (e.cats === 'all' || e.cats.includes(catId))) m *= e.mult;
  }
  return m;
}

/** Potential buyers per week right now. */
export function marketPotential(state, catId, year = curYear(state)) {
  return baseDemand(catId, year) * demandMult(state, catId) * DIFFICULTIES[state.difficulty].demand;
}

export function ownerBrand(state, owner) {
  if (owner === 'player') return state.company.brand;
  const r = state.rivals[owner];
  return r ? r.brand : 30;
}

export function activeProducts(state, catId) {
  return state.products.filter((p) => p.active && p.category === catId);
}

/** Utility of a product for every segment. */
export function productUtilities(state, p, ctx) {
  const ageWeeks = Math.max(0, state.week - p.launchWeek);
  let base = BRAND_W * (ownerBrand(state, p.owner) - 50) / 50
    + HYPE_W * p.hype
    + NOVELTY_W * Math.exp(-ageWeeks / 10)
    - AGE_PENALTY * ageWeeks / 48;
  if (p.owner === 'player') base += perkEffect(state, 'utility');
  const perfRel = p.techYear - ctx.refY;
  return SEGMENTS.map((seg) => {
    const x = Math.log(p.price / (ctx.refP * seg.priceMult));
    return base
      + seg.alpha * PERF_K * perfRel
      - seg.beta * x - (x > 0 ? PRICE_CEILING * x * x : 0)
      + seg.gamma * (p.quality - 0.6);
  });
}

/**
 * Compute weekly unit sales for a set of products in a category.
 * Returns { potential, units: Map(product -> units), total, bySegment }.
 */
export function simulateCategory(state, catId, products) {
  const year = curYear(state);
  const potential = marketPotential(state, catId, year);
  const units = new Map();
  if (potential <= 0 || products.length === 0) return { potential, units, total: 0 };
  const ctx = { refY: refYear(catId, year), refP: refPrice(catId, year) };
  const utils = products.map((p) => productUtilities(state, p, ctx));
  let total = 0;
  for (const p of products) units.set(p, 0);
  SEGMENTS.forEach((seg, si) => {
    let maxU = -Infinity;
    for (const u of utils) maxU = Math.max(maxU, u[si]);
    let sum = 0;
    const ex = utils.map((u) => { const e = Math.exp(u[si] - maxU); sum += e; return e; });
    const iv = maxU + Math.log(sum);
    const uptake = 1 / (1 + Math.exp(OUTSIDE_UTILITY - NEST_LAMBDA * iv));
    const segUnits = potential * seg.share * uptake;
    products.forEach((p, i) => {
      const u = segUnits * ex[i] / sum;
      units.set(p, units.get(p) + u);
      total += u;
    });
  });
  return { potential, units, total };
}

/** Current unit cost of a player product before manufacturing discounts. */
export function productUnitCost(state, p, year = curYear(state)) {
  return bomCost(state, p.category, p.components, year) * p.costFactor * (1 + perkEffect(state, 'cost')) * playerCostEffect(state);
}

export function playerCostEffect(state) {
  let m = 1;
  for (const e of state.effects) if (e.type === 'playerCost') m *= e.mult;
  return m;
}

export function factoryCapacity(state) {
  const down = state.effects.some((e) => e.type === 'factoryDown');
  return down ? 0 : FACTORIES[state.facilities.factory].capacity;
}

/** Blended manufacturing multiplier given total player units this week. */
export function manufacturingMult(state, totalUnits) {
  const f = FACTORIES[state.facilities.factory];
  const cap = factoryCapacity(state);
  if (totalUnits <= 0) return cap > 0 ? 1 - f.discount : 1;
  const own = Math.min(1, cap / totalUnits);
  return own * (1 - f.discount) + (1 - own);
}

/**
 * Estimate weekly sales and profit of a product at several prices. Works for drafts that are
 * about to launch (no id) and for products already on the market (replaced by the draft).
 * product needs: category, techYear, quality, components, costFactor, hype.
 */
export function estimateLaunch(state, product, prices) {
  const catId = product.category;
  const others = activeProducts(state, catId).filter((p) => !product.id || p.id !== product.id);
  const unitCost = productUnitCost(state, product);
  const cut = CATEGORIES[catId].channel + (1 - product.quality) * WARRANTY_RATE;
  let playerOtherUnits = 0;
  for (const p of state.products) {
    if (p.owner === 'player' && p.active && p.id !== product.id) playerOtherUnits += p.lastUnits || 0;
  }
  return prices.map((price) => {
    const draft = { ...product, price, owner: 'player', launchWeek: product.launchWeek ?? state.week };
    const res = simulateCategory(state, catId, [...others, draft]);
    const units = res.units.get(draft) || 0;
    const mm = manufacturingMult(state, playerOtherUnits + units);
    const profit = units * (price * (1 - cut) - unitCost * mm);
    return { price, units, profit, revenue: units * price, unitCost: unitCost * mm, share: res.total ? units / res.total : 0 };
  });
}

/** Suggested price points for the pricing chart (log spaced around the reference price). */
export function pricePoints(state, catId, unitCost, n = 24) {
  const ref = refPrice(catId, curYear(state));
  const lo = Math.max(unitCost * 0.9, ref * 0.25);
  const hi = Math.max(lo * 2, ref * 3.5);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(niceRound(lo * Math.pow(hi / lo, i / (n - 1))));
  return [...new Set(pts)];
}

export function niceRound(v) {
  if (v < 20) return Math.round(v * 2) / 2;
  if (v < 100) return Math.round(v);
  if (v < 1000) return Math.round(v / 5) * 5;
  if (v < 10000) return Math.round(v / 10) * 10;
  return Math.round(v / 100) * 100;
}

export const categoryRefPrice = (state, catId) => refPrice(catId, curYear(state));
export const categoryOf = (id) => CATEGORIES[id];
