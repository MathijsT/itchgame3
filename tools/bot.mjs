// A simple scripted player used by the balance simulator and the promo screenshot tool.
import * as G from '../src/sim/game.js';
import { CATEGORIES, CATEGORY_IDS, refPrice } from '../src/data/categories.js';
import { COMPONENTS } from '../src/data/tech.js';
import { PERKS } from '../src/data/perks.js';
import { OFFICES, FACTORIES, LABS } from '../src/data/facilities.js';
import { DURATIONS } from '../src/data/constants.js';
import { evaluateDesign } from '../src/sim/design.js';
import { estimateLaunch, pricePoints, productUnitCost } from '../src/sim/market.js';
import { usableTiers, tierStatus, tierResearchCost, categoryResearchCost, perkResearchCost, allowedTiers } from '../src/sim/tech.js';
import { curYear, curYearInt } from '../src/sim/util.js';
import { hireFee } from '../src/sim/staff.js';

function bestDesign(state, catId) {
  const components = {};
  for (const [comp] of CATEGORIES[catId].slots) components[comp] = usableTiers(state, catId, comp)[0]?.id || allowedTiers(catId, comp)[0].id;
  return components;
}

/**
 * Play one week of decisions. opts.naive: price at the market's typical price, one project at a time.
 * opts.onLaunch(product, estimate) is called after each launch.
 */
export function botTurn(state, opts = {}) {
  const naive = !!opts.naive;
  const year = curYear(state);
  // research: categories first, then the cheapest relevant tier, then perks
  for (const catId of CATEGORY_IDS) {
    if (!state.categories[catId] && curYearInt(state) >= CATEGORIES[catId].year && state.rp >= categoryResearchCost(catId)) {
      G.researchCategory(state, catId);
    }
  }
  const relevant = new Set();
  for (const catId of CATEGORY_IDS) if (state.categories[catId]) for (const [c] of CATEGORIES[catId].slots) relevant.add(c);
  const candidates = [];
  for (const comp of relevant) for (const t of COMPONENTS[comp].tiers) {
    const st = tierStatus(state, t);
    if (st === 'available' || (st === 'early' && state.rp > tierResearchCost(state, t) * 2)) candidates.push(t);
  }
  candidates.sort((a, b) => b.year - a.year || a.rp - b.rp);
  for (const t of candidates) if (state.rp >= tierResearchCost(state, t) * 1.0) G.researchTier(state, t.id);
  for (const p of PERKS) if (!state.perks[p.id] && curYearInt(state) >= p.year && state.rp >= perkResearchCost(p) * 1.5) G.researchPerk(state, p.id);
  // rich companies sponsor research with spare cash (keeps a year of operating costs in reserve)
  if (!naive && state.week % 12 === 0 && state.rp < 2000) {
    const spare = state.company.cash - (state.lastWeek ? (state.lastWeek.revenue - state.lastWeek.profit) * 48 : 0);
    if (spare > 0) G.buyResearch(state, Math.min(5000, Math.floor((spare * 0.25) / G.rpPrice(state))));
  }

  // launch ready projects at the most profitable price
  for (const proj of state.projects.filter((p) => p.status === 'ready')) {
    const draft = { category: proj.category, techYear: proj.result.techYear, quality: proj.result.quality, components: proj.components, costFactor: proj.result.costFactor, hype: 0.35 };
    const uc = productUnitCost(state, draft);
    const est = estimateLaunch(state, draft, pricePoints(state, proj.category, uc));
    est.sort((a, b) => b.profit - a.profit);
    const price = naive ? Math.max(uc * 1.3, refPrice(proj.category, year)) : est[0].price;
    const res = G.launchProduct(state, proj.id, price, []);
    if (res.ok && opts.onLaunch) opts.onLaunch(res.product, est[0]);
  }

  // discontinue old, unprofitable products
  for (const p of state.products) {
    if (p.owner === 'player' && p.active && state.week - p.launchWeek > 30 && p.lastProfit < 0) G.discontinue(state, p.id);
    // a newer own product in the same category replaces older ones
    if (p.owner === 'player' && p.active && state.week - p.launchWeek > 100) G.discontinue(state, p.id);
  }

  // start projects in the categories with the biggest market value where we are weakest
  const slots = Math.min(naive ? 1 : 9, G.projectSlots(state) - G.devProjects(state).length);
  if (slots > 0) {
    const busy = new Set(state.projects.map((p) => p.category));
    const cats = CATEGORY_IDS.filter((c) => state.categories[c] && !busy.has(c) && state.market[c]?.potential > 0)
      .map((c) => {
        const mine = state.products.filter((p) => p.owner === 'player' && p.active && p.category === c);
        const newest = mine.reduce((a, p) => Math.max(a, p.launchWeek), -999);
        const value = state.market[c].potential * refPrice(c, year);
        return { c, value, age: state.week - newest };
      })
      .filter((x) => x.age > 40)
      .sort((a, b) => b.value - a.value);
    for (const { c } of cats.slice(0, slots)) {
      const name = opts.nameFn ? opts.nameFn(c) : `Bot ${c} ${curYearInt(state)}`;
      const draft = { category: c, components: bestDesign(state, c), focus: { perf: 4, quality: 4, cost: 2 }, duration: DURATIONS[naive ? 1 : 2].weeks, name };
      const ev = evaluateDesign(state, draft);
      if (state.company.cash > ev.tooling * 1.5) G.startProject(state, draft);
    }
  }

  // hiring
  const cash = state.company.cash;
  const weeklyCost = state.lastWeek ? state.lastWeek.salaries + state.lastWeek.rent + state.lastWeek.upkeep : 1000;
  if (state.staff.length < OFFICES[state.facilities.office].desks && cash > weeklyCost * 40) {
    const best = [...state.candidates].sort((a, b) => b.skill - a.skill)[0];
    if (best && cash > hireFee(best) * 10) G.hire(state, best.id);
  }
  // facilities
  for (const [kind, table] of [['office', OFFICES], ['lab', LABS], ['factory', FACTORIES]]) {
    const next = table[state.facilities[kind] + 1];
    if (!next) continue;
    const need = kind === 'factory' ? (state.lastWeek?.cogs || 0) > next.upkeep * 4 : true;
    if (need && cash > next.cost * (naive ? 10 : 3)) G.upgradeFacility(state, kind);
  }
  // resolve decisions: always decline (option 1) except supplier deals
  while (state.decisions.length) {
    const d = state.decisions[0];
    G.resolveDecision(state, d.id, d.kind === 'supplier' || d.kind === 'poach' ? 0 : 1);
  }
}

