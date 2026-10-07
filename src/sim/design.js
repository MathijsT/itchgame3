import { CATEGORIES } from '../data/categories.js';
import { TIERS, benchmarkForYear } from '../data/tech.js';
import { PERF_K } from '../data/constants.js';
import { REVIEWERS, REVIEW_QUOTES } from '../data/names.js';
import { refPrice } from '../data/categories.js';
import { mainstreamTier, refYear, bomCost, perkEffect } from './tech.js';
import { devPower } from './staff.js';
import { clamp, curYear, gauss, pick } from './util.js';

export function focusShares(focus) {
  const p = Math.max(0, focus.perf), q = Math.max(0, focus.quality), c = Math.max(0, focus.cost);
  const sum = p + q + c;
  if (sum <= 0) return { perf: 1 / 3, quality: 1 / 3, cost: 1 / 3 };
  return { perf: p / sum, quality: q / sum, cost: c / sum };
}

/** Development points needed for a well-made product: steep early, flatter later. */
export function requiredDP(catId, year) {
  const early = 1.2 ** Math.max(0, Math.min(year, 1990) - 1977);
  const late = 1.035 ** Math.max(0, year - 1990);
  return CATEGORIES[catId].reqBase * early * late;
}

/** How even the components are relative to a mainstream product. */
export function balanceOf(catId, components, year) {
  const cat = CATEGORIES[catId];
  const devs = [];
  let mean = 0;
  for (const [comp, w] of cat.slots) {
    const tier = TIERS[components[comp]];
    const d = tier.year - mainstreamTier(catId, comp, year).year;
    devs.push([d, w]);
    mean += d * w;
  }
  let v = 0;
  for (const [d, w] of devs) v += w * (d - mean) * (d - mean);
  const std = Math.sqrt(v);
  const penalty = Math.max(0, std - 2.5) * 0.35;
  let label = 'Excellent';
  if (std > 4) label = 'Severe bottleneck';
  else if (std > 2.5) label = 'Unbalanced';
  else if (std > 1.5) label = 'Good';
  return { std, penalty, label };
}

export function rawTechYear(catId, components) {
  let sum = 0;
  for (const [comp, w] of CATEGORIES[catId].slots) sum += w * TIERS[components[comp]].year;
  return sum;
}

function immatureCount(catId, components, year) {
  let n = 0;
  for (const [comp] of CATEGORIES[catId].slots) if (TIERS[components[comp]].year >= Math.floor(year)) n++;
  return n;
}

export function toolingCost(catId, unitCost, year) {
  return Math.round(2000 + CATEGORIES[catId].toolMult * unitCost * Math.pow(1.04, Math.max(0, year - 1977)));
}

/**
 * Evaluate a design draft. `dpOverride` = actual development points (at completion),
 * otherwise the current team is used to estimate.
 */
export function evaluateDesign(state, draft, opts = {}) {
  const year = opts.year ?? curYear(state);
  const catId = draft.category;
  const f = focusShares(draft.focus);
  const req = requiredDP(catId, year);
  const parallel = opts.parallel ?? 1;
  const dp = opts.dp ?? (devPower(state) / Math.max(1, parallel)) * draft.duration;
  const r = dp / req;
  const rEff = Math.min(1, r);

  const raw = rawTechYear(catId, draft.components);
  const bal = balanceOf(catId, draft.components, year);
  const perfBonus = (f.perf - 1 / 3) * 1.5 * rEff;
  const techYear = raw + perfBonus - bal.penalty;
  const perfRel = techYear - refYear(catId, year);

  const immature = immatureCount(catId, draft.components, year);
  const quality = clamp(
    0.1 + 0.75 * (1 - Math.exp(-1.1 * r)) + (f.quality - 1 / 3) * 0.25 + perkEffect(state, 'quality') - 0.02 * immature,
    0.05, 0.99,
  );

  const costFactor = 1 - (f.cost - 1 / 3) * 0.25 * rEff;
  const bom = bomCost(state, catId, draft.components, year);
  const unitCost = bom * costFactor * (1 + perkEffect(state, 'cost'));
  const tooling = toolingCost(catId, unitCost, year);

  return {
    raw, techYear, perfBonus, perfRel, balance: bal, quality, costFactor, unitCost, tooling,
    req, dp, ratio: r, immature, benchmark: benchmarkForYear(techYear),
    perfVsMarket: Math.exp(PERF_K * perfRel) - 1,
  };
}

/** Score a product for the press. Returns [{outlet, score, quote}]. */
export function computeReviews(state, product) {
  const year = curYear(state);
  const catId = product.category;
  const perfRel = product.techYear - refYear(catId, year);
  const fair = refPrice(catId, year) * Math.exp(PERF_K * 1.2 * perfRel);
  const perfPart = clamp(perfRel, -3, 2.5) * 0.75;
  const valuePart = clamp(-1.6 * Math.log(product.price / fair), -2.2, 2);
  const qualityPart = (product.quality - 0.65) * 5;
  let innovation = 0;
  for (const tierId of Object.values(product.components)) {
    if (TIERS[tierId] && TIERS[tierId].year >= Math.floor(year)) { innovation = 0.4; break; }
  }
  // sameness penalty: another of your products in this category launched recently with similar tech
  let samey = 0;
  for (const p of state.products) {
    if (p.owner === 'player' && p.id !== product.id && p.category === catId &&
        state.week - p.launchWeek < 30 && Math.abs(p.techYear - product.techYear) < 0.6) samey = -0.8;
  }
  const base = 4.9 + perfPart + valuePart + qualityPart + innovation + samey;
  return REVIEWERS.map((outlet) => {
    const score = Math.round(clamp(base + gauss(state) * 0.6, 1, 10));
    return { outlet, score, quote: pick(state, REVIEW_QUOTES[score]) };
  });
}
