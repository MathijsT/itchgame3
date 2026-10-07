import { COMPONENTS, TIERS, rpForYear } from '../data/tech.js';
import { CATEGORIES } from '../data/categories.js';
import { PERKS } from '../data/perks.js';
import {
  MAINSTREAM_LAG, COMMODITY_LAG, EARLY_RESEARCH_MULT,
} from '../data/constants.js';
import { curYear, curYearInt } from './util.js';

const allowedCache = new Map();

/** Tiers of a component that may be used in a category (portable/stationary rules). */
export function allowedTiers(catId, compId) {
  const key = `${catId}:${compId}`;
  let list = allowedCache.get(key);
  if (!list) {
    const portable = CATEGORIES[catId].portable;
    list = COMPONENTS[compId].tiers.filter((t) => (portable ? !t.fixedOnly : !t.portableOnly));
    allowedCache.set(key, list);
  }
  return list;
}

/** The newest tier with tier.year <= year (or the oldest one). */
export function tierAtYear(catId, compId, year) {
  const list = allowedTiers(catId, compId);
  let best = list[0];
  for (const t of list) if (t.year <= year) best = t;
  return best;
}

export const mainstreamTier = (catId, compId, year) => tierAtYear(catId, compId, year - MAINSTREAM_LAG);

/** Tech-year of a typical mainstream product in this category at this time. */
export function refYear(catId, year) {
  let sum = 0;
  for (const [comp, w] of CATEGORIES[catId].slots) sum += w * mainstreamTier(catId, comp, year).year;
  return sum;
}

/** Cost of a component tier at a given time: new tech is pricey, old tech gets cheap. */
export function tierCostAt(state, tier, year) {
  const age = Math.max(0, year - tier.year);
  const aging = Math.max(0.15, Math.exp(-0.18 * age));
  return tier.cost * aging * componentCostMult(state, tier.comp);
}

export function componentCostMult(state, compId) {
  let m = 1;
  for (const e of state.effects) {
    if (e.type === 'cost' && (e.comps === 'all' || e.comps.includes(compId))) m *= e.mult;
  }
  return m;
}

/** Raw bill of materials for a set of components (before focus/perk/manufacturing multipliers). */
export function bomCost(state, catId, components, year) {
  const cat = CATEGORIES[catId];
  let sum = cat.assembly;
  for (const [comp, , cm] of cat.slots) {
    const tier = TIERS[components[comp]];
    if (tier) sum += tierCostAt(state, tier, year) * cm;
  }
  return sum;
}

export const isUnlocked = (state, tierId) => !!state.tech[tierId];

export function tierStatus(state, tier) {
  if (state.tech[tier.id]) return 'unlocked';
  const y = curYearInt(state);
  if (tier.year <= y) return 'available';
  if (tier.year <= y + 2) return 'early';
  return 'future';
}

export function tierResearchCost(state, tier) {
  const ahead = tier.year - curYearInt(state);
  if (ahead <= 0) return tier.rp;
  return Math.round(tier.rp * EARLY_RESEARCH_MULT[Math.min(ahead, 2) - 1]);
}

export function categoryResearchCost(catId) {
  return Math.round(rpForYear(CATEGORIES[catId].year) * 2 / 5) * 5;
}

export function perkResearchCost(perk) {
  return Math.round(rpForYear(perk.year) * perk.mult / 5) * 5;
}

/** Unlocked tiers usable in a category for a slot, newest first. */
export function usableTiers(state, catId, compId) {
  return allowedTiers(catId, compId).filter((t) => state.tech[t.id]).reverse();
}

export function bestUsableTier(state, catId, compId) {
  const list = usableTiers(state, catId, compId);
  return list.length ? list[0] : allowedTiers(catId, compId)[0];
}

/** Make old tech free for everyone. Returns newly unlocked tiers. */
export function applyCommodityTech(state, yearOverride) {
  const limit = (yearOverride ?? curYearInt(state)) - COMMODITY_LAG;
  const unlocked = [];
  for (const comp of Object.values(COMPONENTS)) {
    for (const t of comp.tiers) {
      if (!state.tech[t.id] && t.year <= limit) {
        state.tech[t.id] = true;
        unlocked.push(t);
      }
    }
    // the very first tier of every component is always free
    if (!state.tech[comp.tiers[0].id] && comp.tiers[0].year <= curYear(state)) state.tech[comp.tiers[0].id] = true;
  }
  return unlocked;
}

export function perkEffect(state, key) {
  let v = 0;
  for (const p of PERKS) if (state.perks[p.id] && p.effect[key]) v += p.effect[key];
  return v;
}

/** Components relevant to the categories the player has unlocked. */
export function relevantComponents(state) {
  const set = new Set();
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    if (!state.categories[catId]) continue;
    for (const [comp] of cat.slots) set.add(comp);
  }
  return set;
}
