import { RIVALS, RIVAL_BY_ID } from '../data/rivals.js';
import { CATEGORIES, baseDemand, refPrice } from '../data/categories.js';
import { SEGMENTS, DIFFICULTIES, WEEKS_PER_YEAR } from '../data/constants.js';
import { tierAtYear, bomCost } from './tech.js';
import { rawTechYear } from './design.js';
import { rand, randRange, gauss, pickWeighted, clamp, yearAt, curYear, newId } from './util.js';
import { addNews } from './news.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

export function initRivals(state) {
  state.rivals = {};
  for (const r of RIVALS) {
    state.rivals[r.id] = { id: r.id, brand: r.brand, active: true, gen: {}, next: {}, rev: 0, revHist: [], lowWeeks: 0, acquired: false };
  }
}

function catRange(rival, catId) {
  for (const [c, from, to] of rival.cats) if (c === catId) return [from, to ?? 9999];
  return null;
}

export function rivalInCategory(state, rival, catId, year) {
  if (!state.rivals[rival.id].active) return false;
  const range = catRange(rival, catId);
  if (!range) return false;
  return year >= Math.max(range[0], CATEGORIES[catId].year) && year < range[1] + 1;
}

function rivalProductName(state, rival, catId) {
  const rs = state.rivals[rival.id];
  const n = (rs.gen[catId] || 0) + 1;
  rs.gen[catId] = n;
  const tpl = rival.names?.[catId];
  if (Array.isArray(tpl)) {
    const idx = Math.min(n - 1, tpl.length - 1);
    const k = n - idx;
    if (tpl[idx].includes('{n}')) return tpl[idx].replace('{n}', String(k));
    return k > 1 ? `${tpl[idx]} ${ROMAN[Math.min(ROMAN.length - 1, k - 1)]}` : tpl[idx];
  }
  if (typeof tpl === 'string') return tpl.replace('{n}', String(n));
  const cat = CATEGORIES[catId];
  const words = ['Value', 'Basic', 'Lite', 'Plus', 'Max', 'Neo', 'Super', 'Ultra'];
  return `${words[n % words.length]} ${cat.short} ${100 + n * 10}`;
}

export function createRivalProduct(state, rival, catId, launchWeek) {
  const year = Math.max(CATEGORIES[catId].year, yearAt(state, launchWeek));
  const diff = DIFFICULTIES[state.difficulty];
  const seg = pickWeighted(state, rival.style);
  // competitive pressure: when the player dominates a market, rivals rush newer tech out
  const m = state.market[catId];
  const playerShare = m && m.units > 0 ? (m.shares.player || 0) / m.units : 0;
  const pressure = clamp((playerShare - 0.12) * 3, 0, 1.4);
  const lag = Math.max(-0.1, rival.lag + diff.rivalLag + [2.2, 0.8, 0][seg] + gauss(state) * 0.4) - pressure;
  const target = Math.min(Math.floor(year) + 1, year - lag);
  const components = {};
  for (const [comp] of CATEGORIES[catId].slots) components[comp] = tierAtYear(catId, comp, target).id;
  const quality = clamp(rival.quality + diff.rivalQuality + pressure * 0.05 + gauss(state) * 0.07 + [-0.05, 0, 0.04][seg], 0.2, 0.95);
  const techYear = rawTechYear(catId, components) + (quality - 0.6) * 0.8;
  const unitCost = bomCost(state, catId, components, year) * 0.85;
  const markup = [1.35, 1.7, 2.2][seg] * randRange(state, 0.9, 1.1) * (1 - pressure * 0.08);
  const segRef = refPrice(catId, year) * SEGMENTS[seg].priceMult;
  const price = Math.max(unitCost * 1.1, Math.sqrt(unitCost * markup * segRef));
  return {
    id: newId(state, 'p'),
    owner: rival.id,
    name: rivalProductName(state, rival, catId),
    category: catId,
    components,
    techYear,
    quality,
    costFactor: 0.85,
    unitCost,
    price: Math.round(price),
    launchWeek,
    hype: 0.25 + state.rivals[rival.id].brand / 250,
    active: true,
    segment: seg,
    retireWeek: null,
    lastUnits: 0,
    unitsTotal: 0,
    revenueTotal: 0,
  };
}

function scheduleNext(state, rival, catId, fromWeek) {
  state.rivals[rival.id].next[catId] = Math.round(fromWeek + rival.cadence * randRange(state, 0.8, 1.25));
}

/** Seed markets that already exist at game start. */
export function seedRivalProducts(state) {
  const year = curYear(state);
  for (const rival of RIVALS) {
    for (const [catId] of rival.cats) {
      if (!rivalInCategory(state, rival, catId, year) || baseDemand(catId, year) <= 0) continue;
      const launch = state.week - Math.floor(rand(state) * rival.cadence * 0.8);
      state.products.push(createRivalProduct(state, rival, catId, launch));
      if (rival.cadence < 80 && rand(state) < 0.5) {
        state.products.push(createRivalProduct(state, rival, catId, launch - Math.floor(rival.cadence / 2)));
      }
      scheduleNext(state, rival, catId, launch);
      if (state.rivals[rival.id].next[catId] <= state.week) state.rivals[rival.id].next[catId] = state.week + 4 + Math.floor(rand(state) * 30);
    }
  }
}

export function rivalTick(state) {
  const year = curYear(state);
  for (const rival of RIVALS) {
    const rs = state.rivals[rival.id];
    if (!rs.active) continue;
    for (const [catId] of rival.cats) {
      const inCat = rivalInCategory(state, rival, catId, year) && baseDemand(catId, year) > 0;
      if (!inCat) {
        // exiting the category: wind down remaining products
        for (const p of state.products) {
          if (p.active && p.owner === rival.id && p.category === catId && p.retireWeek === null) p.retireWeek = state.week + 24;
        }
        continue;
      }
      if (rs.next[catId] === undefined) {
        rs.next[catId] = state.week + Math.floor(rand(state) * 12);
        if (state.started && state.categories[catId]) {
          addNews(state, `${rival.name} enters the ${CATEGORIES[catId].name.toLowerCase()} market.`, 'rival');
        }
      }
      if (state.week >= rs.next[catId]) {
        const p = createRivalProduct(state, rival, catId, state.week);
        // retire the previous product in the same segment after an overlap
        for (const q of state.products) {
          if (q.active && q.owner === rival.id && q.category === catId && q.segment === p.segment && q.retireWeek === null) {
            q.retireWeek = state.week + 8;
          }
        }
        state.products.push(p);
        scheduleNext(state, rival, catId, state.week);
        if (state.categories[catId]) {
          addNews(state, `${rival.name} launches the ${p.name} (${CATEGORIES[catId].short}) at $${p.price.toLocaleString('en-US')}.`, 'rival', { cat: catId });
        }
      }
    }
  }
  // retirements and price cuts
  for (const p of state.products) {
    if (!p.active || p.owner === 'player') continue;
    const rival = RIVAL_BY_ID[p.owner];
    const age = state.week - p.launchWeek;
    if (p.retireWeek === null && age > rival.cadence * 3) p.retireWeek = state.week;
    if (p.retireWeek !== null && state.week >= p.retireWeek) p.active = false;
    if (age > 24 && age % 12 === 0) p.price = Math.max(Math.round(p.unitCost * 1.1), Math.round(p.price * 0.95));
  }
  // drop retired rival products from the save after a while
  if (state.week % 12 === 0) {
    state.products = state.products.filter((p) => p.active || p.owner === 'player');
  }
}

/** Weekly brand and health update for rivals, given each rival's revenue share. */
export function rivalHealth(state, rivalRevenue, rivalMarketRevenue) {
  for (const rival of RIVALS) {
    const rs = state.rivals[rival.id];
    if (!rs.active) continue;
    const rev = rivalRevenue[rival.id] || 0;
    const marketRev = rivalMarketRevenue[rival.id] || 0;
    rs.revHist.push(Math.round(rev));
    if (rs.revHist.length > WEEKS_PER_YEAR) rs.revHist.shift();
    const share = marketRev > 0 ? rev / marketRev : 0;
    const target = Math.max(rival.brand * 0.75, 15 + 75 * Math.sqrt(share));
    rs.brand += (target - rs.brand) * 0.006;
    const activeCats = rival.cats.some(([c]) => rivalInCategory(state, rival, c, curYear(state)));
    if (!rival.immortal && activeCats && marketRev > 0) {
      rs.lowWeeks = share < 0.02 ? rs.lowWeeks + 1 : 0;
      if (rs.lowWeeks > 120) {
        rs.active = false;
        for (const p of state.products) if (p.owner === rival.id) p.active = false;
        addNews(state, `${rival.name} has gone bankrupt after years of dwindling sales.`, 'rival');
      }
    }
  }
}

export function rivalValuation(state, rivalId) {
  const rs = state.rivals[rivalId];
  const annual = rs.revHist.reduce((a, b) => a + b, 0) * (WEEKS_PER_YEAR / Math.max(1, rs.revHist.length));
  const era = Math.pow(1.05, Math.max(0, curYear(state) - 1977));
  return Math.round(Math.max(2e6 * era, annual * 1.6 + rs.brand * 2e5 * era));
}
