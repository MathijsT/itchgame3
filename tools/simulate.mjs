// Headless balance simulation: a simple bot plays the whole campaign.
// Usage: node tools/simulate.mjs [--seed N] [--era 1977] [--difficulty normal] [--quiet] [--runs N]

import * as G from '../src/sim/game.js';
import { CATEGORIES, CATEGORY_IDS } from '../src/data/categories.js';
import { curYearInt } from '../src/sim/util.js';
import { fmtMoney, fmtPct } from '../src/sim/format.js';
import { drainToasts } from '../src/sim/news.js';
import { botTurn } from './bot.mjs';
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

function onLaunch(product, est) {
  if (!quiet && process.env.VERBOSE && product.launchWeek < (Number(process.env.VERBOSE) - 1977) * 48) {
    console.log(`  launch ${product.name} ${product.category} $${product.price} q=${product.quality.toFixed(2)} rev=${product.reviewAvg.toFixed(1)} est=${Math.round(est.units)}u`);
  }
}

function run(seed) {
  const state = G.newGame({ seed, era: Number(arg('era', 1977)), difficulty: arg('difficulty', 'normal'), companyName: 'BotCorp' });
  let lastYear = -1;
  const t0 = Date.now();
  while (!state.gameOver) {
    botTurn(state, { naive, onLaunch });
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
