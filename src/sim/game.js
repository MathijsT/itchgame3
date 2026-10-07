import {
  SAVE_VERSION, WEEKS_PER_YEAR, WEEKS_PER_MONTH, DIFFICULTIES, START_ERAS, LOAN_RATE, BANKRUPT_WEEKS, END_YEAR,
  WARRANTY_RATE,
} from '../data/constants.js';
import { CATEGORIES, CATEGORY_IDS, baseDemand, refPrice } from '../data/categories.js';
import { COMPONENTS, TIERS } from '../data/tech.js';
import { PERKS, PERK_BY_ID } from '../data/perks.js';
import { RIVAL_BY_ID } from '../data/rivals.js';
import { OFFICES, FACTORIES, LABS, CAMPAIGNS } from '../data/facilities.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { clamp, curYear, curYearInt, eraMult, newId, gauss, formatDate } from './util.js';
import {
  applyCommodityTech, tierStatus, tierResearchCost, categoryResearchCost, perkResearchCost,
} from './tech.js';
import {
  makeFounder, makeCandidate, refreshCandidates, weeklyStaff, payroll, devPower, researchPower,
  hireFee, trainCost, deskCount, marketingMult, marketingPower, staffSalary,
} from './staff.js';
import { evaluateDesign, computeReviews } from './design.js';
import {
  simulateCategory, activeProducts, productUnitCost, manufacturingMult, marketPotential,
} from './market.js';
import { initRivals, seedRivalProducts, rivalTick, rivalHealth, rivalValuation } from './rivals.js';
import { scriptedEventsTick, expireEffects, randomEventsTick, companyValue } from './events.js';
import { addNews, notify, cue } from './news.js';
import { fmtMoney } from './format.js';

export { resolveDecision, companyValue } from './events.js';

const emptyLedger = () => ({ revenue: 0, channel: 0, cogs: 0, salaries: 0, rent: 0, upkeep: 0, marketing: 0, dev: 0, interest: 0, other: 0 });

export function newGame(opts = {}) {
  const difficulty = DIFFICULTIES[opts.difficulty] ? opts.difficulty : 'normal';
  const era = START_ERAS[opts.era] || START_ERAS[1977];
  const diff = DIFFICULTIES[difficulty];
  const seed = (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) | 0;
  const state = {
    version: SAVE_VERSION,
    seed,
    rng: seed,
    startYear: 1977,
    week: (era.year - 1977) * WEEKS_PER_YEAR,
    startWeek: (era.year - 1977) * WEEKS_PER_YEAR,
    difficulty,
    company: {
      name: (opts.companyName || 'Garage Labs').slice(0, 32),
      cash: Math.round(era.cash * diff.cash),
      brand: diff.brand + (era.year > 1977 ? 8 : 0),
      loan: 0,
      equity: 1,
      assets: 0,
      reviewRep: 6,
      negativeWeeks: 0,
    },
    facilities: { office: era.office, factory: 0, lab: 0 },
    staff: [],
    candidates: [],
    candidatesWeek: 0,
    tech: {},
    categories: {},
    perks: {},
    rp: 0,
    projects: [],
    products: [],
    rivals: {},
    market: {},
    marketAcc: {},
    effects: [],
    firedEvents: {},
    decisions: [],
    news: [],
    history: { weekly: [], monthly: [], market: {} },
    thisWeek: emptyLedger(),
    lastWeek: null,
    stats: { revenue: 0, profit: 0, units: 0, launches: 0, bestScore: 0, bestProduct: null, peakShare: {} },
    achievements: {},
    tips: {},
    flags: {},
    lastRandomEvent: 0,
    started: false,
    gameOver: null,
  };
  for (const id of CATEGORY_IDS) state.history.market[id] = [];

  // starting knowledge
  for (const comp of Object.values(COMPONENTS)) {
    for (const t of comp.tiers) if (t.year <= era.year - 1) state.tech[t.id] = true;
  }
  applyCommodityTech(state);
  for (const id of CATEGORY_IDS) {
    if (id === 'homecomputer' || id === 'console' || CATEGORIES[id].year <= era.year - 2) state.categories[id] = true;
  }
  for (const p of PERKS) if (p.year <= era.year - 4) state.perks[p.id] = true;
  if (era.office > 0) state.company.assets += OFFICES[era.office].cost;

  state.staff.push(makeFounder(state, opts.founderName));
  const roles = ['engineer', 'researcher', 'engineer', 'marketer', 'researcher'];
  for (let i = 0; i < era.staff; i++) {
    const c = makeCandidate(state, roles[i % roles.length]);
    state.staff.push({ ...c, hiredWeek: state.week });
  }
  refreshCandidates(state);
  initRivals(state);
  seedRivalProducts(state);
  // prime the market snapshot so the UI has data immediately
  marketsTick(state, true);
  state.started = true;
  addNews(state, `${state.company.name} is founded in ${era.year === 1977 ? 'a humble garage' : 'a rented office'}. The future of computing awaits!`, 'good');
  return state;
}

// ---------------------------------------------------------------- weekly tick

export function tick(state) {
  if (state.gameOver) return;
  state.week++;
  const year = curYear(state);
  expireEffects(state);
  scriptedEventsTick(state);
  if (state.week % WEEKS_PER_YEAR === 0) newYear(state);
  rivalTick(state);
  developmentAndResearch(state);
  weeklyStaff(state);
  marketsTick(state, false);
  finances(state, year);
  randomEventsTick(state);
  checkAchievements(state);
  recordHistory(state);
  if (year >= END_YEAR && !state.flags.endless && !state.gameOver) {
    unlock(state, 'legacy');
    state.gameOver = { reason: 'end', week: state.week };
  }
}

function compactOldProducts(state) {
  const retired = state.products.filter((p) => p.owner === 'player' && !p.active);
  for (const p of retired) {
    if (state.week - (p.retireWeek ?? p.launchWeek) > WEEKS_PER_YEAR * 2 && p.history) {
      delete p.history;
      for (const r of p.reviews) delete r.quote;
    }
  }
  if (retired.length > 120) {
    const drop = new Set(retired.sort((a, b) => a.launchWeek - b.launchWeek).slice(0, retired.length - 120));
    state.products = state.products.filter((p) => !drop.has(p));
  }
}

function newYear(state) {
  const y = curYearInt(state);
  compactOldProducts(state);
  if (state.week > state.startWeek + 8) {
    const h = state.history.weekly.slice(-WEEKS_PER_YEAR);
    const rev = h.reduce((a, w) => a + w.revenue, 0);
    const profit = h.reduce((a, w) => a + w.profit, 0);
    notify(state, `${y - 1} in review`, profit >= 0 ? 'good' : 'bad', { body: `Revenue ${fmtMoney(rev)} · profit ${fmtMoney(profit)} · cash ${fmtMoney(state.company.cash)}` });
  }
  const fresh = applyCommodityTech(state);
  if (fresh.length) {
    addNews(state, `${fresh.length} older technologies became free industry standards (e.g. ${fresh[fresh.length - 1].name}).`, 'research');
  }
  const newCats = CATEGORY_IDS.filter((id) => CATEGORIES[id].year === y && !state.categories[id]);
  for (const id of newCats) {
    addNews(state, `A new market is emerging: ${CATEGORIES[id].name}. Research "${CATEGORIES[id].unlockName}" to enter it.`, 'event');
    notify(state, `New market: ${CATEGORIES[id].name}`, 'event', { body: `Research "${CATEGORIES[id].unlockName}" to start building them.` });
  }
  if (y >= 2000) unlock(state, 'y2k');
}

function developmentAndResearch(state) {
  const dev = state.projects.filter((p) => p.status === 'dev');
  const per = dev.length ? devPower(state) / dev.length : 0;
  for (const p of dev) {
    p.dp += per;
    p.weeksDone++;
    if (p.weeksDone >= p.duration) completeProject(state, p);
  }
  state.rp += researchPower(state, dev.length === 0);
}

function completeProject(state, p) {
  const ev = evaluateDesign(state, p, { dp: p.dp });
  p.status = 'ready';
  p.result = {
    techYear: ev.techYear,
    quality: clamp(ev.quality + gauss(state) * 0.04, 0.05, 0.99),
    costFactor: ev.costFactor,
  };
  notify(state, `${p.name} is ready to launch!`, 'good');
  cue(state, 'ready');
}

function marketsTick(state, priming) {
  const rivalRevenue = {};
  const rivalMarketRevenue = {};
  let playerUnits = 0;
  let playerRev = 0;
  let playerMarketRev = 0;
  const playerProducts = [];
  for (const catId of CATEGORY_IDS) {
    const prods = activeProducts(state, catId);
    const res = simulateCategory(state, catId, prods);
    let catRevenue = 0;
    const shares = {};
    let playerIn = false;
    for (const [p, u] of res.units) {
      p.lastUnits = u;
      p.lastRevenue = u * p.price;
      catRevenue += p.lastRevenue;
      shares[p.owner] = (shares[p.owner] || 0) + u;
      if (p.owner === 'player') {
        playerIn = true;
        playerUnits += u;
        playerRev += p.lastRevenue;
        playerProducts.push(p);
      } else if (!priming) {
        rivalRevenue[p.owner] = (rivalRevenue[p.owner] || 0) + p.lastRevenue;
        p.unitsTotal += u;
        p.revenueTotal += p.lastRevenue;
      }
    }
    for (const owner of Object.keys(shares)) {
      if (owner !== 'player') rivalMarketRevenue[owner] = (rivalMarketRevenue[owner] || 0) + catRevenue;
    }
    if (playerIn) playerMarketRev += catRevenue;
    state.market[catId] = { potential: res.potential, units: res.total, revenue: catRevenue, shares };
    if (!priming) {
      const acc = state.marketAcc[catId] || (state.marketAcc[catId] = { total: 0, shares: {} });
      acc.total += res.total;
      for (const [o, u] of Object.entries(shares)) acc.shares[o] = (acc.shares[o] || 0) + u;
    }
  }
  if (priming) return;

  // player sales, manufacturing and hype
  const mm = manufacturingMult(state, playerUnits);
  for (const p of playerProducts) {
    const u = p.lastUnits;
    const unitCost = productUnitCost(state, p) * mm;
    const cogs = u * unitCost;
    const channel = p.lastRevenue * channelRate(p);
    p.unitCostNow = unitCost;
    p.lastProfit = p.lastRevenue - channel - cogs;
    p.unitsTotal += u;
    p.revenueTotal += p.lastRevenue;
    p.profitTotal += p.lastProfit;
    p.peakUnits = Math.max(p.peakUnits, u);
    p.acc = (p.acc || 0) + u;
    if (state.week % WEEKS_PER_MONTH === 0) {
      p.history.push(Math.round(p.acc));
      if (p.history.length > 240) p.history.shift();
      p.acc = 0;
    }
    state.thisWeek.revenue += p.lastRevenue;
    state.thisWeek.channel += channel;
    state.thisWeek.cogs += cogs;
    state.company.cash += p.lastRevenue - channel - cogs;
    state.stats.units += u;
  }
  for (const p of state.products) if (p.active) p.hype *= 0.94;

  // brand
  const share = playerMarketRev > 0 ? playerRev / playerMarketRev : 0;
  const target = 5 + 55 * Math.sqrt(share)
    + Math.min(8, marketingPower(state) * 3)
    + (state.company.reviewRep - 6) * 2
    + perkBrand(state);
  state.company.brand = clamp(state.company.brand + (target - state.company.brand) * 0.008, 0, 100);
  rivalHealth(state, rivalRevenue, rivalMarketRevenue);
}

/** Share of revenue lost to retail/distribution plus returns & warranty. */
export function channelRate(p) {
  return CATEGORIES[p.category].channel + (1 - p.quality) * WARRANTY_RATE;
}

function perkBrand(state) {
  let b = 0;
  for (const p of PERKS) if (state.perks[p.id] && p.effect.brand) b += p.effect.brand;
  return b;
}

export function maxLoan(state) {
  const h = state.history.weekly;
  let rev = 0;
  for (let i = Math.max(0, h.length - WEEKS_PER_YEAR); i < h.length; i++) rev += h[i].revenue;
  return Math.round(Math.max(50000 * eraMult(curYear(state)), rev * 0.4 + state.company.assets * 0.3) / 1000) * 1000;
}

function finances(state, year) {
  const c = state.company;
  const tw = state.thisWeek;
  const salaries = payroll(state);
  const rent = OFFICES[state.facilities.office].rent * Math.pow(1.03, Math.max(0, year - 1977));
  const upkeep = FACTORIES[state.facilities.factory].upkeep + LABS[state.facilities.lab].upkeep;
  const interest = c.loan * LOAN_RATE / WEEKS_PER_YEAR;
  tw.salaries += salaries;
  tw.rent += rent;
  tw.upkeep += upkeep;
  tw.interest += interest;
  c.cash -= salaries + rent + upkeep + interest;

  if (c.cash < 0) {
    const credit = maxLoan(state) - c.loan;
    if (credit > 1000) {
      const amt = Math.min(credit, Math.ceil((-c.cash + 1000) / 1000) * 1000);
      c.loan += amt;
      c.cash += amt;
      notify(state, `Out of cash! Drew ${fmtMoney(amt)} from your credit line.`, 'bad');
    }
  }
  if (c.cash < 0) {
    c.negativeWeeks++;
    if (c.negativeWeeks >= BANKRUPT_WEEKS) {
      state.gameOver = { reason: 'bankrupt', week: state.week };
    } else {
      notify(state, `You are broke! Bankruptcy in ${BANKRUPT_WEEKS - c.negativeWeeks} weeks unless cash goes positive.`, 'bad');
      cue(state, 'bad');
    }
  } else {
    c.negativeWeeks = 0;
  }
}

function recordHistory(state) {
  const tw = state.thisWeek;
  const costs = tw.channel + tw.cogs + tw.salaries + tw.rent + tw.upkeep + tw.marketing + tw.dev + tw.interest + tw.other;
  const rec = { week: state.week, ...tw, profit: tw.revenue - costs, cash: state.company.cash };
  state.history.weekly.push(rec);
  if (state.history.weekly.length > WEEKS_PER_YEAR * 2) state.history.weekly.shift();
  state.lastWeek = rec;
  state.stats.revenue += tw.revenue;
  state.stats.profit += rec.profit;
  state.thisWeek = emptyLedger();

  if (state.week % WEEKS_PER_MONTH === 0) {
    const h = state.history.weekly;
    let rev = 0, profit = 0;
    for (let i = Math.max(0, h.length - WEEKS_PER_MONTH); i < h.length; i++) { rev += h[i].revenue; profit += h[i].profit; }
    state.history.monthly.push({ week: state.week, revenue: rev, profit, cash: state.company.cash, brand: state.company.brand });
  }
  if (state.week % 24 === 0) {
    for (const catId of CATEGORY_IDS) {
      const m = state.marketAcc[catId];
      if (!m || m.total <= 0) continue;
      const shares = {};
      for (const [o, u] of Object.entries(m.shares)) {
        // small players are lumped together to keep saves compact
        const key = o === 'player' || u / m.total >= 0.03 ? o : 'other';
        shares[key] = (shares[key] || 0) + Math.round(u / 24);
      }
      state.history.market[catId].push({ week: state.week, total: Math.round(m.total / 24), shares });
    }
    state.marketAcc = {};
  }
}

// ---------------------------------------------------------------- achievements

export function unlock(state, id) {
  if (state.achievements[id]) return;
  state.achievements[id] = state.week;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (a) {
    notify(state, `Achievement unlocked: ${a.name}`, 'achievement', { icon: a.icon, body: a.desc });
    cue(state, 'achievement');
  }
}

function checkAchievements(state) {
  const c = state.company;
  if (c.cash >= 1e6) unlock(state, 'million');
  if (c.cash >= 1e9) unlock(state, 'billion');
  if (state.week % 4 === 0 && companyValue(state) >= 1e12) unlock(state, 'trillion');
  const cats = new Set();
  for (const p of state.products) {
    if (p.owner !== 'player') continue;
    if (p.active) cats.add(p.category);
    if (p.unitsTotal >= 1e6) unlock(state, 'million_units');
  }
  if (cats.size >= 5) unlock(state, 'diverse');
  for (const catId of cats) {
    const m = state.market[catId];
    if (!m || m.units <= 0) continue;
    const mine = m.shares.player || 0;
    const share = mine / m.units;
    state.stats.peakShare[catId] = Math.max(state.stats.peakShare[catId] || 0, share);
    if (share >= 0.5) unlock(state, 'monopoly');
    const best = Math.max(...Object.entries(m.shares).filter(([o]) => o !== 'player').map(([, u]) => u), 0);
    if (mine > best && m.units > 50) unlock(state, 'leader');
  }
  if (state.facilities.office === OFFICES.length - 1 && state.staff.length >= OFFICES[OFFICES.length - 1].desks) unlock(state, 'full_house');
}

// ---------------------------------------------------------------- player actions
// Every action returns { ok: true, ... } or { error: 'message' }.

function spend(state, amount, bucket) {
  state.company.cash -= amount;
  state.thisWeek[bucket] = (state.thisWeek[bucket] || 0) + amount;
}

export const projectSlots = (state) => OFFICES[state.facilities.office].projects;
export const devProjects = (state) => state.projects.filter((p) => p.status === 'dev');

export function startProject(state, draft) {
  if (!state.categories[draft.category]) return { error: 'That category is not unlocked yet.' };
  if (devProjects(state).length >= projectSlots(state)) return { error: 'All product teams are busy. Upgrade your office for more teams.' };
  for (const [comp] of CATEGORIES[draft.category].slots) {
    if (!state.tech[draft.components[comp]]) return { error: 'You have not researched one of the chosen components.' };
  }
  const ev = evaluateDesign(state, draft, { parallel: devProjects(state).length + 1 });
  if (state.company.cash < ev.tooling) return { error: `Not enough cash for tooling (${fmtMoney(ev.tooling)}).` };
  spend(state, ev.tooling, 'dev');
  const project = {
    id: newId(state, 'j'),
    name: (draft.name || 'Untitled').slice(0, 28),
    category: draft.category,
    components: { ...draft.components },
    focus: { ...draft.focus },
    duration: draft.duration,
    dp: 0,
    weeksDone: 0,
    startWeek: state.week,
    status: 'dev',
    tooling: ev.tooling,
  };
  state.projects.push(project);
  cue(state, 'start');
  return { ok: true, project };
}

export function cancelProject(state, projectId) {
  state.projects = state.projects.filter((p) => p.id !== projectId);
  return { ok: true };
}

export function campaignCost(state, catId, campaign) {
  const value = Math.max(marketPotential(state, catId), baseDemand(catId, CATEGORIES[catId].year + 1)) * refPrice(catId, curYear(state));
  const scale = clamp(Math.sqrt(value / 400000), 0.5, 600);
  return Math.round(campaign.cost * scale / 100) * 100;
}

export const availableCampaigns = (state) => CAMPAIGNS.filter((c) => curYearInt(state) >= c.year);

function applyCampaign(state, product, campaign) {
  const mult = marketingMult(state);
  product.hype = Math.min(2.5, product.hype + campaign.hype * mult * (1 - product.hype / 3));
  state.company.brand = Math.min(100, state.company.brand + campaign.brand * mult * 0.5);
  product.marketingSpent = (product.marketingSpent || 0) + 1;
}

export function launchProduct(state, projectId, price, campaignIds = []) {
  const proj = state.projects.find((p) => p.id === projectId && p.status === 'ready');
  if (!proj) return { error: 'Project not found.' };
  price = Math.max(1, Math.round(price * 100) / 100);
  const campaigns = campaignIds.map((id) => CAMPAIGNS.find((c) => c.id === id)).filter(Boolean);
  const mCost = campaigns.reduce((a, c) => a + campaignCost(state, proj.category, c), 0);
  if (mCost > 0 && state.company.cash < mCost) return { error: 'Not enough cash for that marketing.' };
  const product = {
    id: newId(state, 'p'),
    owner: 'player',
    name: proj.name,
    category: proj.category,
    components: proj.components,
    techYear: proj.result.techYear,
    quality: proj.result.quality,
    costFactor: proj.result.costFactor,
    price,
    launchWeek: state.week,
    hype: 0.3,
    active: true,
    retireWeek: null,
    unitsTotal: 0, revenueTotal: 0, profitTotal: 0,
    lastUnits: 0, lastRevenue: 0, lastProfit: 0, peakUnits: 0,
    history: [],
    reviews: [],
    reviewAvg: 0,
    devWeeks: proj.duration,
  };
  product.unitCostNow = productUnitCost(state, product);
  if (mCost > 0) spend(state, mCost, 'marketing');
  for (const c of campaigns) applyCampaign(state, product, c);
  product.reviews = computeReviews(state, product);
  const avg = product.reviews.reduce((a, r) => a + r.score, 0) / product.reviews.length;
  product.reviewAvg = avg;
  product.hype += Math.max(0, avg - 5) * 0.12;
  const reviewBrand = clamp((avg - 6) * 0.7, -3, 3);
  state.company.brand = clamp(state.company.brand + (reviewBrand > 0 ? reviewBrand * (1 - state.company.brand / 100) : reviewBrand), 0, 100);
  state.company.reviewRep = state.company.reviewRep * 0.6 + avg * 0.4;
  state.products.push(product);
  state.projects = state.projects.filter((p) => p.id !== projectId);
  state.stats.launches++;
  if (avg > state.stats.bestScore) { state.stats.bestScore = avg; state.stats.bestProduct = product.name; }
  unlock(state, 'first_launch');
  if (product.reviews.some((r) => r.score === 10)) unlock(state, 'perfect10');
  if (avg < 4) unlock(state, 'flop');
  addNews(state, `${state.company.name} launches the ${product.name} at $${price.toLocaleString('en-US')}. Reviews average ${avg.toFixed(1)}/10.`, avg >= 7 ? 'good' : avg < 5 ? 'bad' : 'info');
  cue(state, 'launch');
  return { ok: true, product };
}

export function setPrice(state, productId, price) {
  const p = state.products.find((x) => x.id === productId && x.owner === 'player');
  if (!p) return { error: 'Unknown product.' };
  p.price = Math.max(1, Math.round(price * 100) / 100);
  return { ok: true };
}

export function discontinue(state, productId) {
  const p = state.products.find((x) => x.id === productId && x.owner === 'player');
  if (!p) return { error: 'Unknown product.' };
  p.active = false;
  p.retireWeek = state.week;
  addNews(state, `${p.name} has been discontinued after selling ${Math.round(p.unitsTotal).toLocaleString('en-US')} units.`, 'info');
  return { ok: true };
}

export function runCampaign(state, productId, campaignId) {
  const p = state.products.find((x) => x.id === productId && x.owner === 'player' && x.active);
  const c = CAMPAIGNS.find((x) => x.id === campaignId);
  if (!p || !c) return { error: 'Unknown product or campaign.' };
  const cost = campaignCost(state, p.category, c);
  if (state.company.cash < cost) return { error: `Not enough cash (${fmtMoney(cost)}).` };
  spend(state, cost, 'marketing');
  applyCampaign(state, p, c);
  cue(state, 'cash');
  return { ok: true };
}

export function researchTier(state, tierId) {
  const t = TIERS[tierId];
  if (!t) return { error: 'Unknown technology.' };
  const status = tierStatus(state, t);
  if (status === 'unlocked') return { error: 'Already researched.' };
  if (status === 'future') return { error: `Not invented yet (expected ${t.year}).` };
  const cost = tierResearchCost(state, t);
  if (state.rp < cost) return { error: `Need ${cost} RP.` };
  state.rp -= cost;
  state.tech[t.id] = true;
  state.stats.researched = (state.stats.researched || 0) + 1;
  if (status === 'early') unlock(state, 'bleeding_edge');
  notify(state, `Researched ${t.name} (${COMPONENTS[t.comp].name})`, 'research');
  cue(state, 'research');
  return { ok: true };
}

export function researchCategory(state, catId) {
  const cat = CATEGORIES[catId];
  if (!cat || state.categories[catId]) return { error: 'Already unlocked.' };
  if (curYearInt(state) < cat.year) return { error: `Available from ${cat.year}.` };
  const cost = categoryResearchCost(catId);
  if (state.rp < cost) return { error: `Need ${cost} RP.` };
  state.rp -= cost;
  state.categories[catId] = true;
  addNews(state, `${state.company.name} can now build ${cat.name.toLowerCase()}s!`, 'research');
  notify(state, `New category unlocked: ${cat.name}`, 'research');
  cue(state, 'research');
  return { ok: true };
}

export function researchPerk(state, perkId) {
  const perk = PERK_BY_ID[perkId];
  if (!perk || state.perks[perkId]) return { error: 'Already researched.' };
  if (curYearInt(state) < perk.year) return { error: `Available from ${perk.year}.` };
  const cost = perkResearchCost(perk);
  if (state.rp < cost) return { error: `Need ${cost} RP.` };
  state.rp -= cost;
  state.perks[perkId] = true;
  notify(state, `Company upgrade: ${perk.name}`, 'research');
  cue(state, 'research');
  return { ok: true };
}

export function hire(state, candidateId) {
  const c = state.candidates.find((x) => x.id === candidateId);
  if (!c) return { error: 'Candidate no longer available.' };
  if (state.staff.length >= deskCount(state)) return { error: 'No free desks. Upgrade your office.' };
  const fee = hireFee(c);
  if (state.company.cash < fee) return { error: `Hiring fee is ${fmtMoney(fee)}.` };
  spend(state, fee, 'salaries');
  state.staff.push({ ...c, hiredWeek: state.week });
  state.candidates = state.candidates.filter((x) => x.id !== candidateId);
  notify(state, `${c.name} joined as ${c.role}.`, 'good');
  cue(state, 'cash');
  return { ok: true };
}

export function fire(state, staffId) {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s || s.founder) return { error: 'You cannot fire yourself!' };
  spend(state, s.salary * 2, 'salaries');
  state.staff = state.staff.filter((x) => x.id !== staffId);
  return { ok: true };
}

export function setRole(state, staffId, role) {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s || !['engineer', 'researcher', 'marketer'].includes(role)) return { error: 'Invalid.' };
  s.role = role;
  return { ok: true };
}

export function train(state, staffId) {
  const s = state.staff.find((x) => x.id === staffId);
  if (!s) return { error: 'Unknown staff member.' };
  if (s.skill >= 99) return { error: 'Already a master.' };
  if (s.trainedWeek !== undefined && state.week - s.trainedWeek < 12) return { error: 'Training again is possible in a few weeks.' };
  const cost = trainCost(s, curYear(state));
  if (state.company.cash < cost) return { error: `Training costs ${fmtMoney(cost)}.` };
  spend(state, cost, 'salaries');
  s.skill = Math.min(100, s.skill + 5);
  s.trainedWeek = state.week;
  if (!s.founder) s.salary = Math.max(s.salary, Math.round(staffSalary(s.skill, curYear(state)) * 0.95));
  return { ok: true };
}

export function recruitCost(state) {
  return Math.round(staffSalary(50, curYear(state)) * 3);
}

export function recruit(state) {
  const cost = recruitCost(state);
  if (state.company.cash < cost) return { error: `Recruiting costs ${fmtMoney(cost)}.` };
  spend(state, cost, 'other');
  refreshCandidates(state);
  return { ok: true };
}

const FACILITY_TABLES = { office: OFFICES, factory: FACTORIES, lab: LABS };

export function facilityUpgradeCost(state, kind) {
  const table = FACILITY_TABLES[kind];
  const next = table[state.facilities[kind] + 1];
  return next ? next.cost : null;
}

export function upgradeFacility(state, kind) {
  const table = FACILITY_TABLES[kind];
  if (!table) return { error: 'Unknown facility.' };
  const next = table[state.facilities[kind] + 1];
  if (!next) return { error: 'Already at the maximum level.' };
  if (state.company.cash < next.cost) return { error: `Costs ${fmtMoney(next.cost)}.` };
  spend(state, next.cost, 'other');
  state.facilities[kind]++;
  state.company.assets += next.cost;
  if (kind === 'office') unlock(state, 'garage_exit');
  if (kind === 'factory') unlock(state, 'factory');
  addNews(state, `${state.company.name} upgrades to a ${next.name}.`, 'good');
  cue(state, 'upgrade');
  return { ok: true };
}

export function borrow(state, amount) {
  const room = maxLoan(state) - state.company.loan;
  const amt = Math.min(room, Math.round(amount));
  if (amt <= 0) return { error: 'The bank will not lend you more right now.' };
  state.company.loan += amt;
  state.company.cash += amt;
  return { ok: true, amount: amt };
}

export function repay(state, amount) {
  const amt = Math.min(state.company.loan, Math.round(amount), Math.max(0, state.company.cash));
  if (amt <= 0) return { error: 'Nothing to repay.' };
  state.company.loan -= amt;
  state.company.cash -= amt;
  return { ok: true, amount: amt };
}

export function acquireRival(state, rivalId) {
  const rs = state.rivals[rivalId];
  const rival = RIVAL_BY_ID[rivalId];
  if (!rs || !rs.active || rival.immortal) return { error: 'Not available for purchase.' };
  const price = rivalValuation(state, rivalId);
  if (state.company.cash < price) return { error: `You need ${fmtMoney(price)}.` };
  spend(state, price, 'other');
  rs.active = false;
  rs.acquired = true;
  for (const p of state.products) if (p.owner === rivalId) p.active = false;
  state.company.brand = Math.min(100, state.company.brand + Math.min(12, rs.brand * 0.15));
  state.company.assets += price * 0.3;
  addNews(state, `${state.company.name} acquires ${rival.name} for ${fmtMoney(price)}! Their product lines are shut down.`, 'good');
  unlock(state, 'takeover');
  cue(state, 'upgrade');
  return { ok: true };
}

export function continueEndless(state) {
  state.flags.endless = true;
  state.gameOver = null;
}

export function finalScore(state) {
  const value = state.gameOver?.reason === 'sold' ? state.gameOver.value : companyValue(state);
  return Math.round(value * state.company.equity);
}

export function dateLabel(state) {
  return formatDate(state, state.week, true);
}

export function teamSummary(state) {
  const dev = devProjects(state);
  return {
    devPower: devPower(state),
    rpPower: researchPower(state, dev.length === 0),
    parallel: dev.length,
  };
}
