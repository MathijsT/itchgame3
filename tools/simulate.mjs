// Headless balance simulation: a simple bot plays the whole campaign.
// Usage: node tools/simulate.mjs [--seed N] [--era 1977] [--difficulty normal] [--quiet] [--runs N]

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
import { fmtMoney, fmtPct } from '../src/sim/format.js';
import { hireFee } from '../src/sim/staff.js';
import { drainToasts } from '../src/sim/news.js';
import { serialize, deserialize } from '../src/sim/save.js';

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const quiet = args.includes('--quiet');
// --naive: a casual player who prices at the market's typical price and rarely upgrades
const naive = args.includes('--naive');
const runs = Number(arg('runs', quiet ? 3 : 1));

function bestDesign(state, catId) {
  const components = {};
  for (const [comp] of CATEGORIES[catId].slots) components[comp] = usableTiers(state, catId, comp)[0]?.id || allowedTiers(catId, comp)[0].id;
  return components;
}

function botTurn(state) {
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

  // launch ready projects at the most profitable price
  for (const proj of state.projects.filter((p) => p.status === 'ready')) {
    const draft = { category: proj.category, techYear: proj.result.techYear, quality: proj.result.quality, components: proj.components, costFactor: proj.result.costFactor, hype: 0.35 };
    const uc = productUnitCost(state, draft);
    const est = estimateLaunch(state, draft, pricePoints(state, proj.category, uc));
    est.sort((a, b) => b.profit - a.profit);
    const price = naive ? Math.max(uc * 1.3, refPrice(proj.category, year)) : est[0].price;
    const res = G.launchProduct(state, proj.id, price, []);
    if (res.ok && !quiet && process.env.VERBOSE && curYearInt(state) < Number(process.env.VERBOSE)) console.log(`  launch ${res.product.name} ${proj.category} $${est[0].price} q=${res.product.quality.toFixed(2)} rev=${res.product.reviewAvg.toFixed(1)} est=${Math.round(est[0].units)}u`);
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
      const draft = { category: c, components: bestDesign(state, c), focus: { perf: 4, quality: 4, cost: 2 }, duration: DURATIONS[naive ? 1 : 2].weeks, name: `Bot ${c} ${curYearInt(state)}` };
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

function run(seed) {
  const state = G.newGame({ seed, era: Number(arg('era', 1977)), difficulty: arg('difficulty', 'normal'), companyName: 'BotCorp' });
  let lastYear = -1;
  const t0 = Date.now();
  while (!state.gameOver) {
    botTurn(state);
    G.tick(state);
    drainToasts(state);
    const y = curYearInt(state);
    const early = args.includes('--early') && y < 1986 && state.week % 12 === 0;
    if ((early || (y !== lastYear && (y % 3 === 0 || state.gameOver))) && !quiet) {
      lastYear = y;
      if (early) process.stdout.write(`w${state.week} `);
      const rev = state.history.weekly.slice(-48).reduce((a, w) => a + w.revenue, 0);
      const prof = state.history.weekly.slice(-48).reduce((a, w) => a + w.profit, 0);
      const shares = CATEGORY_IDS.filter((c) => state.market[c]?.units > 0 && state.market[c].shares.player)
        .map((c) => `${CATEGORIES[c].short}:${fmtPct((state.market[c].shares.player || 0) / state.market[c].units)}`).join(' ');
      console.log(`${y} cash=${fmtMoney(state.company.cash)} rev/yr=${fmtMoney(rev)} profit/yr=${fmtMoney(prof)} brand=${state.company.brand.toFixed(0)} staff=${state.staff.length} off=${state.facilities.office} fac=${state.facilities.factory} lab=${state.facilities.lab} rp=${Math.round(state.rp)} prods=${state.products.filter((p) => p.owner === 'player' && p.active).length} ${shares}`);
    }
  }
  const json = serialize(state);
  deserialize(json);
  if (args.includes('--size')) {
    for (const k of Object.keys(state)) console.log(`  ${k}: ${(serialize(state[k] ?? null).length / 1024).toFixed(1)} KB`);
    console.log(`  history.market: ${(JSON.stringify(state.history.market).length / 1024).toFixed(1)} KB, monthly ${(JSON.stringify(state.history.monthly).length / 1024).toFixed(1)} KB`);
  }
  return { state, ms: Date.now() - t0, size: json.length };
}

let failures = 0;
for (let i = 0; i < runs; i++) {
  const seed = Number(arg('seed', 1234)) + i;
  const { state, ms, size } = run(seed);
  const summary = `seed ${seed}: ${state.gameOver.reason} at ${curYearInt(state)}, cash ${fmtMoney(state.company.cash)}, score ${fmtMoney(G.finalScore(state))}, launches ${state.stats.launches}, achievements ${Object.keys(state.achievements).length}, save ${(size / 1024).toFixed(0)} KB, ${ms} ms`;
  console.log(summary);
  if (state.gameOver.reason === 'bankrupt') failures++;
  for (const p of state.products) {
    if (!isFinite(p.price) || !isFinite(p.techYear) || !isFinite(p.unitsTotal)) { console.error('NaN in product', p); failures++; break; }
  }
  if (!isFinite(state.company.cash)) { console.error('NaN cash'); failures++; }
}
if (failures) {
  console.error(`${failures} run(s) failed`);
  process.exit(1);
}
