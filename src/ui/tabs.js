// Main tab views. Each returns an HTML string; charts are described in `charts` and drawn after patching.
import { CATEGORIES, CATEGORY_IDS, refPrice, baseDemand } from '../data/categories.js';
import { COMPONENTS } from '../data/tech.js';
import { PERKS } from '../data/perks.js';
import { RIVALS, RIVAL_BY_ID } from '../data/rivals.js';
import { OFFICES, FACTORIES, LABS, ROLES } from '../data/facilities.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { PERF_K, WEEKS_PER_YEAR, LOAN_RATE, BANKRUPT_WEEKS } from '../data/constants.js';
import {
  refYear, tierStatus, tierResearchCost, categoryResearchCost, perkResearchCost, relevantComponents, allowedTiers,
} from '../sim/tech.js';
import {
  devPower, researchPower, marketingMult, payroll, deskCount, hireFee, trainCost,
} from '../sim/staff.js';
import { marketPotential, factoryCapacity } from '../sim/market.js';
import { maxLoan, companyValue, devProjects, recruitCost } from '../sim/game.js';
import { rivalValuation, rivalInCategory } from '../sim/rivals.js';
import { curYear, curYearInt, formatDate } from '../sim/util.js';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from '../sim/format.js';
import { esc, stars, bar } from './dom.js';
import { ctx } from './ctx.js';

export const TABS = [
  { id: 'overview', name: 'Overview' },
  { id: 'products', name: 'Products' },
  { id: 'markets', name: 'Markets' },
  { id: 'research', name: 'Research' },
  { id: 'staff', name: 'Staff' },
  { id: 'company', name: 'Company' },
  { id: 'finance', name: 'Finance' },
];

/** Chart specs collected during rendering, drawn by app.js after the DOM is patched. */
export const charts = {};

const ownerName = (o) => (o === 'player' ? ctx.state.company.name : RIVAL_BY_ID[o]?.name || 'Others');
const ownerColor = (o) => (o === 'player' ? '#39d0ff' : RIVAL_BY_ID[o]?.color || '#6b7280');

function perfVs(state, p) {
  return Math.exp(PERF_K * (p.techYear - refYear(p.category, curYear(state)))) - 1;
}

function pctCls(v, good = 0.1, bad = -0.1) {
  return v > good ? 'good' : v < bad ? 'bad' : '';
}

function sumWeeks(state, n, key) {
  const h = state.history.weekly;
  let s = 0;
  for (let i = Math.max(0, h.length - n); i < h.length; i++) s += h[i][key] || 0;
  return s;
}

// ------------------------------------------------------------------ overview

function overview(state) {
  const c = state.company;
  const lw = state.lastWeek || { revenue: 0, profit: 0 };
  const mine = state.products.filter((p) => p.owner === 'player' && p.active).sort((a, b) => b.lastRevenue - a.lastRevenue);
  const monthly = state.history.monthly.slice(-120);
  charts.ov = {
    type: 'line',
    opts: {
      series: [
        { color: '#39d0ff', data: monthly.map((m) => m.revenue), fill: true },
        { color: '#3ddc84', data: monthly.map((m) => m.profit) },
      ],
      yFormat: (v) => fmtMoney(v, 0),
      xLabel: (i) => formatDate(state, monthly[i].week),
      empty: 'Your revenue history will appear here',
    },
  };
  const steps = [
    ['Design your first product', state.stats.launches > 0 || state.projects.length > 0],
    ['Launch it and read the reviews', state.stats.launches > 0],
    ['Hire your first employee', state.staff.length > 1],
    ['Research a new technology', (state.stats.researched || 0) > 0],
    ['Move out of the garage', state.facilities.office > 0],
  ];
  const showSteps = state.stats.launches < 4 && steps.some((s) => !s[1]);
  const news = state.news.slice(0, 14).map((n) => `<div class="news-item ${n.type}"><span class="when">${formatDate(state, n.week)}</span>${esc(n.text)}</div>`).join('');
  return `
    <div class="grid grid-4 mb">
      <div class="kpi"><div class="lbl">Cash</div><div class="val ${c.cash < 0 ? 'bad' : ''}">${fmtMoney(c.cash)}</div><div class="sub">${c.loan > 0 ? `Loan ${fmtMoney(c.loan)}` : 'No debt'}</div></div>
      <div class="kpi"><div class="lbl">Revenue / week</div><div class="val">${fmtMoney(lw.revenue)}</div><div class="sub">${fmtMoney(sumWeeks(state, WEEKS_PER_YEAR, 'revenue'))} last 12 months</div></div>
      <div class="kpi"><div class="lbl">Profit / week</div><div class="val ${lw.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(lw.profit)}</div><div class="sub">${fmtMoney(sumWeeks(state, WEEKS_PER_YEAR, 'profit'))} last 12 months</div></div>
      <div class="kpi"><div class="lbl">Brand reputation</div><div class="val">${Math.round(c.brand)}<span class="small muted"> / 100</span></div>${bar(c.brand / 100, c.brand > 60 ? 'good' : c.brand < 25 ? 'warn' : '')}</div>
    </div>
    ${showSteps ? `<div class="card mb"><div class="card-title"><h3>🧭 Getting started</h3><button class="btn btn-sm" data-action="help">How to play</button></div>
      <div class="col">${steps.map(([t, done]) => `<div class="row ${done ? 'good' : ''}">${done ? '✅' : '⬜'} ${t}</div>`).join('')}</div></div>` : ''}
    <div class="grid grid-2">
      <div class="card"><div class="card-title"><h3>Monthly revenue & profit</h3>
        <div class="legend"><span><i class="dot" style="background:#39d0ff"></i>Revenue</span><span><i class="dot" style="background:#3ddc84"></i>Profit</span></div></div>
        <canvas class="chart" data-chart="ov"></canvas></div>
      <div class="card"><div class="card-title"><h3>Best sellers</h3><button class="btn btn-sm" data-action="tab" data-arg="products">All products</button></div>
        ${mine.length ? `<table class="tbl"><tr><th>Product</th><th class="num">Units/wk</th><th class="num">Profit/wk</th></tr>
          ${mine.slice(0, 6).map((p) => `<tr class="clickable" data-action="product" data-id="${p.id}"><td>${CATEGORIES[p.category].icon} ${esc(p.name)}</td><td class="num">${fmtNum(p.lastUnits)}</td><td class="num ${p.lastProfit >= 0 ? 'good' : 'bad'}">${fmtMoney(p.lastProfit)}</td></tr>`).join('')}</table>`
    : '<div class="empty">Nothing on sale yet. Hit <b>New Product</b> to design your first machine!</div>'}
      </div>
    </div>
    <div class="card mt"><div class="card-title"><h3>Industry news</h3></div><div class="mini-news">${news}</div></div>`;
}

// ------------------------------------------------------------------ products

function products(state) {
  const active = state.products.filter((p) => p.owner === 'player' && p.active).sort((a, b) => b.launchWeek - a.launchWeek);
  const retired = state.products.filter((p) => p.owner === 'player' && !p.active).sort((a, b) => b.launchWeek - a.launchWeek);
  const rows = active.map((p) => {
    const m = state.market[p.category];
    const share = m && m.units ? p.lastUnits / m.units : 0;
    const vs = perfVs(state, p);
    const age = (state.week - p.launchWeek) / WEEKS_PER_YEAR;
    return `<tr class="clickable" data-action="product" data-id="${p.id}" data-key="${p.id}">
      <td><div><b>${CATEGORIES[p.category].icon} ${esc(p.name)}</b></div><div class="tiny muted">${formatDate(state, p.launchWeek)} · ${age < 1 ? `${Math.round(age * 48)} wk` : `${age.toFixed(1)} yr`} old · reviews ${p.reviewAvg.toFixed(1)}</div></td>
      <td class="num">${fmtPrice(p.price)}</td>
      <td class="num">${fmtNum(p.lastUnits)}</td>
      <td class="num ${p.lastProfit >= 0 ? 'good' : 'bad'}">${fmtMoney(p.lastProfit)}</td>
      <td class="num">${fmtPct(share, 1)}</td>
      <td class="num ${pctCls(vs)}">${vs >= 0 ? '+' : ''}${fmtPct(vs)}</td>
      <td>${stars(p.quality)}</td>
      <td style="min-width:70px">${bar(p.hype / 1.5, 'warn', `Hype ${Math.round(p.hype * 100)}%`)}</td>
      <td class="nowrap right">
        <button class="btn btn-sm" data-action="price" data-id="${p.id}" title="Change price">🏷️</button>
        <button class="btn btn-sm" data-action="marketing" data-id="${p.id}" title="Marketing">📣</button>
        <button class="btn btn-sm btn-danger" data-action="discontinue" data-id="${p.id}" title="Discontinue">✕</button>
      </td></tr>`;
  }).join('');
  const aging = active.filter((p) => perfVs(state, p) < -0.3 && p.lastProfit < 0);
  return `
    <div class="row between mb"><h2>Products on sale</h2><button class="btn btn-primary" data-action="new-product">+ New Product</button></div>
    ${aging.length ? `<div class="hint warn mb">${aging.map((p) => esc(p.name)).join(', ')} ${aging.length > 1 ? 'are' : 'is'} outdated and losing money. Consider cutting the price or discontinuing.</div>` : ''}
    ${active.length ? `<div class="table-wrap"><table class="tbl"><tr><th>Product</th><th class="num">Price</th><th class="num">Units/wk</th><th class="num">Profit/wk</th><th class="num">Share</th><th class="num">Perf.</th><th>Quality</th><th>Hype</th><th></th></tr>${rows}</table></div>`
    : '<div class="empty">No products on the market.</div>'}
    <details class="mt" ${retired.length ? '' : 'hidden'}><summary class="muted" style="cursor:pointer">Product history (${retired.length} retired)</summary>
      <table class="tbl mt"><tr><th>Product</th><th>Launched</th><th class="num">Units sold</th><th class="num">Lifetime profit</th><th class="num">Reviews</th></tr>
      ${retired.slice(0, 60).map((p) => `<tr class="clickable" data-action="product" data-id="${p.id}"><td>${CATEGORIES[p.category].icon} ${esc(p.name)}</td><td>${formatDate(state, p.launchWeek)}</td><td class="num">${fmtNum(p.unitsTotal)}</td><td class="num ${p.profitTotal >= 0 ? 'good' : 'bad'}">${fmtMoney(p.profitTotal)}</td><td class="num">${p.reviewAvg.toFixed(1)}</td></tr>`).join('')}
      </table></details>`;
}

// ------------------------------------------------------------------ markets

function markets(state) {
  const year = curYear(state);
  const cats = CATEGORY_IDS.filter((id) => curYearInt(state) >= CATEGORIES[id].year);
  if (!cats.includes(ctx.marketCat)) ctx.marketCat = cats[0];
  const catId = ctx.marketCat;
  const cat = CATEGORIES[catId];
  const m = state.market[catId] || { units: 0, shares: {}, potential: 0, revenue: 0 };
  const chips = cats.map((id) => `<button class="btn btn-sm ${id === catId ? 'btn-primary' : ''}" data-action="market-cat" data-arg="${id}">${CATEGORIES[id].icon} ${CATEGORIES[id].short}${state.categories[id] ? '' : ' 🔒'}</button>`).join('');
  const owners = Object.entries(m.shares).sort((a, b) => b[1] - a[1]);
  const leaderboard = owners.map(([o, u], i) => {
    const share = m.units ? u / m.units : 0;
    return `<div class="row" style="padding:4px 0" data-key="${o}"><span class="num dim" style="width:18px">${i + 1}</span><i class="dot" style="background:${ownerColor(o)}"></i>
      <span class="grow ${o === 'player' ? 'accent' : ''}" style="font-weight:${o === 'player' ? 700 : 500}">${esc(ownerName(o))}</span>
      <span style="width:38%">${bar(share, o === 'player' ? '' : 'warn')}</span><span class="num right" style="width:56px">${fmtPct(share, 1)}</span></div>`;
  }).join('');
  const prods = state.products.filter((p) => p.active && p.category === catId).sort((a, b) => b.lastUnits - a.lastUnits);
  const rows = prods.map((p) => {
    const vs = perfVs(state, p);
    return `<tr class="${p.owner === 'player' ? 'me clickable' : ''}" ${p.owner === 'player' ? `data-action="product" data-id="${p.id}"` : ''}>
      <td><div class="row"><i class="dot" style="background:${ownerColor(p.owner)}"></i><b>${esc(p.name)}</b></div><div class="tiny muted">${esc(ownerName(p.owner))} · ${formatDate(state, p.launchWeek)}</div></td>
      <td class="num">${fmtPrice(p.price)}</td>
      <td class="num ${pctCls(vs)}">${vs >= 0 ? '+' : ''}${fmtPct(vs)}</td>
      <td>${stars(p.quality)}</td>
      <td class="num">${fmtNum(p.lastUnits)}</td>
      <td class="num">${fmtPct(m.units ? p.lastUnits / m.units : 0, 1)}</td></tr>`;
  }).join('');
  // share history
  const hist = state.history.market[catId] || [];
  const ownerSet = new Set();
  for (const h of hist) for (const o of Object.keys(h.shares)) ownerSet.add(o);
  const histOwners = [...ownerSet].sort((a, b) => (a === 'player' ? -1 : b === 'player' ? 1 : 0));
  charts.mk = {
    type: 'share',
    opts: {
      series: histOwners.map((o) => ({ color: ownerColor(o), data: hist.map((h) => h.shares[o] || 0), highlight: o === 'player' })),
      xLabel: (i) => formatDate(state, hist[i].week),
    },
  };
  const potentialNow = marketPotential(state, catId);
  const lastYear = baseDemand(catId, year - 1);
  const growth = lastYear > 0 ? baseDemand(catId, year) / lastYear - 1 : 0;
  const effects = state.effects.filter((e) => e.type === 'demand' && (e.cats === 'all' || e.cats.includes(catId)));
  const myShare = m.units ? (m.shares.player || 0) / m.units : 0;
  return `
    <div class="row wrap mb">${chips}</div>
    <div class="row between mb"><h2>${cat.icon} ${esc(cat.name)} market</h2>${state.categories[catId] ? '' : `<span class="tag warn">Research “${esc(cat.unlockName)}” to compete here</span>`}</div>
    <div class="grid grid-4 mb">
      <div class="kpi"><div class="lbl">Potential buyers</div><div class="val">${fmtNum(potentialNow)}<span class="small muted">/wk</span></div><div class="sub ${growth >= 0 ? 'good' : 'bad'}">${growth >= 0 ? '▲' : '▼'} ${fmtPct(Math.abs(growth))} per year</div></div>
      <div class="kpi"><div class="lbl">Units sold</div><div class="val">${fmtNum(m.units)}<span class="small muted">/wk</span></div><div class="sub">${fmtMoney(m.revenue)}/wk total sales</div></div>
      <div class="kpi"><div class="lbl">Typical price</div><div class="val">${fmtMoney(refPrice(catId, year))}</div><div class="sub">mainstream buyers</div></div>
      <div class="kpi"><div class="lbl">Your share</div><div class="val ${myShare > 0 ? 'accent' : ''}">${fmtPct(myShare, 1)}</div><div class="sub">peak ${fmtPct(state.stats.peakShare[catId] || 0, 1)}</div></div>
    </div>
    ${effects.map((e) => `<div class="hint ${e.mult < 1 ? 'bad' : ''} mb">${e.mult < 1 ? '📉' : '📈'} Market conditions: demand ×${e.mult.toFixed(2)} until ${formatDate(state, e.until)}</div>`).join('')}
    <div class="grid grid-2">
      <div class="card"><div class="card-title"><h3>Market share (units, this week)</h3></div>${leaderboard || '<div class="empty">No products on this market yet.</div>'}</div>
      <div class="card"><div class="card-title"><h3>Share history</h3></div><canvas class="chart" data-chart="mk"></canvas>
        <div class="legend">${histOwners.slice(0, 10).map((o) => `<span><i class="dot" style="background:${ownerColor(o)}"></i>${esc(ownerName(o))}</span>`).join('')}</div></div>
    </div>
    <div class="card mt"><div class="card-title"><h3>Products on sale</h3><span class="tiny muted">Perf. = performance vs. a typical product today</span></div>
      ${rows ? `<div class="table-wrap"><table class="tbl"><tr><th>Product</th><th class="num">Price</th><th class="num">Perf.</th><th>Quality</th><th class="num">Units/wk</th><th class="num">Share</th></tr>${rows}</table></div>` : '<div class="empty">Nobody sells these yet.</div>'}
    </div>`;
}

// ------------------------------------------------------------------ research

function research(state) {
  const y = curYearInt(state);
  const rpw = researchPower(state, devProjects(state).length === 0);
  const relevant = relevantComponents(state);
  const pending = CATEGORY_IDS.filter((id) => !state.categories[id]);
  const newCats = pending.filter((id) => y >= CATEGORIES[id].year - 1).map((id) => {
    const cat = CATEGORIES[id];
    const cost = categoryResearchCost(id);
    const exists = y >= cat.year;
    return `<div class="card perk-card" data-key="cat-${id}"><div class="row"><span style="font-size:22px">${cat.icon}</span><b class="grow">${esc(cat.unlockName)}</b></div>
      <div class="small muted">Lets you build ${esc(cat.name.toLowerCase())}s.</div>
      ${exists ? `<button class="btn btn-sm ${state.rp >= cost ? 'btn-primary' : ''}" data-action="research-cat" data-id="${id}" ${state.rp >= cost ? '' : 'disabled'}>Research · ${cost} RP</button>`
    : `<span class="tag">Emerges in ${cat.year}</span>`}</div>`;
  }).join('');
  const later = pending.filter((id) => y < CATEGORIES[id].year - 1).map((id) => `${CATEGORIES[id].icon} ${esc(CATEGORIES[id].name)} (${CATEGORIES[id].year})`).join(' · ');

  const comps = Object.values(COMPONENTS).filter((c) => ctx.researchAll || relevant.has(c.id));
  const techRows = comps.map((c) => {
    const tiers = c.tiers;
    const lastUnlocked = tiers.reduce((a, t, i) => (state.tech[t.id] ? i : a), -1);
    const chips = [];
    tiers.forEach((t, i) => {
      const st = tierStatus(state, t);
      if (st === 'unlocked' && i < lastUnlocked - 1) return;
      if (st === 'future' && chips.filter((x) => x.st === 'future').length >= 2) return;
      chips.push({ t, st });
    });
    const html = chips.map(({ t, st }) => {
      const cost = tierResearchCost(state, t);
      const poor = (st === 'available' || st === 'early') && state.rp < cost;
      const label = st === 'unlocked' ? `✓ ${t.year}` : st === 'future' ? `${t.year}` : st === 'early' ? `⚗ prototype · ${cost} RP` : `${cost} RP`;
      const title = st === 'early' ? 'Research before it officially exists: costs extra, gives you an edge.' : st === 'future' ? `Expected around ${t.year}` : '';
      const action = (st === 'available' || st === 'early') && !poor ? `data-action="research-tier" data-id="${t.id}"` : '';
      return `<span class="tech-chip ${st} ${poor ? 'poor' : ''}" ${action} title="${esc(title)}"><span>${esc(t.name)}</span><span class="tc-y">${label}</span></span>`;
    }).join('');
    return `<div class="tech-row" data-key="${c.id}"><div><b>${c.icon} ${esc(c.name)}</b><div class="tiny muted">${esc(c.desc)}</div></div><div class="tech-chips">${html}</div></div>`;
  }).join('');

  const perks = PERKS.map((p) => {
    const owned = !!state.perks[p.id];
    const cost = perkResearchCost(p);
    const avail = y >= p.year;
    return `<div class="card perk-card ${owned ? 'owned' : ''}" data-key="perk-${p.id}"><div class="row"><b class="grow">${esc(p.name)}</b>${owned ? '<span class="tag good">Owned</span>' : ''}</div>
      <div class="small muted">${esc(p.desc)}</div>
      ${owned ? '' : avail ? `<button class="btn btn-sm ${state.rp >= cost ? 'btn-primary' : ''}" data-action="research-perk" data-id="${p.id}" ${state.rp >= cost ? '' : 'disabled'}>Research · ${cost} RP</button>` : `<span class="tag">Available ${p.year}</span>`}</div>`;
  }).join('');

  return `
    <div class="grid grid-3 mb">
      <div class="kpi"><div class="lbl">Research points</div><div class="val accent">${Math.floor(state.rp)}</div><div class="sub">+${rpw.toFixed(1)} per week</div></div>
      <div class="kpi"><div class="lbl">Researchers</div><div class="val">${state.staff.filter((s) => s.role === 'researcher').length}</div><div class="sub">Idle engineers also research at 75% speed</div></div>
      <div class="kpi"><div class="lbl">Lab</div><div class="val" style="font-size:16px">${LABS[state.facilities.lab].name}</div><div class="sub">×${LABS[state.facilities.lab].mult} research</div></div>
    </div>
    <div class="hint mb">New technologies appear each year. Researching them lets you build faster products. Technology older than 6 years becomes a free industry standard. ⚗ Prototype tech can be researched up to 2 years early at a premium.</div>
    ${newCats ? `<h3 class="mb">New markets</h3><div class="grid grid-auto mb">${newCats}</div>` : ''}
    ${later ? `<div class="small muted mb">Coming later: ${later}</div>` : ''}
    <div class="row between mb"><h3>Technology</h3><label class="small muted row"><input type="checkbox" data-action="research-all" ${ctx.researchAll ? 'checked' : ''}> Show components for locked markets</label></div>
    <div class="card mb">${techRows}</div>
    <h3 class="mb">Company upgrades</h3>
    <div class="grid grid-auto">${perks}</div>`;
}

// ------------------------------------------------------------------ staff

function staffTab(state) {
  const year = curYear(state);
  const desks = deskCount(state);
  const roleBtns = (s) => Object.entries(ROLES).map(([id, r]) => `<button class="${s.role === id ? 'active' : ''}" data-action="role" data-id="${s.id}" data-arg="${id}" title="${r.name}: ${r.desc}">${r.icon}</button>`).join('');
  const cards = state.staff.map((s) => `
    <div class="card staff-card" data-key="${s.id}">
      <canvas class="avatar" width="20" height="20" data-avatar="${s.id}"></canvas>
      <div class="grow">
        <div class="row"><b>${esc(s.name)}</b>${s.founder ? '<span class="tag accent">Founder</span>' : ''}<span class="spacer"></span><div class="role-ctl">${roleBtns(s)}</div></div>
        <div class="row small"><span class="muted" style="width:72px">${ROLES[s.role].name}</span><span class="grow">${bar(s.skill / 100, s.skill > 75 ? 'good' : '')}</span><span class="num" style="width:28px">${Math.floor(s.skill)}</span></div>
        <div class="row tiny muted"><span>${s.founder ? 'Owner (no salary)' : `${fmtMoney(s.salary)}/wk`}</span><span class="spacer"></span>
          <button class="btn btn-sm" data-action="train" data-id="${s.id}" ${s.skill >= 99 ? 'disabled' : ''}>Train +5 (${fmtMoney(trainCost(s, year))})</button>
          ${s.founder ? '' : `<button class="btn btn-sm btn-danger" data-action="fire" data-id="${s.id}">Fire</button>`}</div>
      </div>
    </div>`).join('');
  const full = state.staff.length >= desks;
  const cands = state.candidates.map((c) => `
    <div class="card staff-card" data-key="${c.id}">
      <canvas class="avatar" width="20" height="20" data-avatar="${c.id}"></canvas>
      <div class="grow">
        <div class="row"><b>${esc(c.name)}</b><span class="tag">${ROLES[c.role].icon} ${ROLES[c.role].name}</span></div>
        <div class="row small"><span class="muted" style="width:72px">Skill</span><span class="grow">${bar(c.skill / 100, c.skill > 75 ? 'good' : '')}</span><span class="num" style="width:28px">${c.skill}</span></div>
        <div class="row tiny muted"><span>${fmtMoney(c.salary)}/wk · fee ${fmtMoney(hireFee(c))}</span><span class="spacer"></span>
          <button class="btn btn-sm btn-primary" data-action="hire" data-id="${c.id}" ${full || state.company.cash < hireFee(c) ? 'disabled' : ''}>Hire</button></div>
      </div>
    </div>`).join('');
  return `
    <div class="grid grid-4 mb">
      <div class="kpi"><div class="lbl">Desks</div><div class="val">${state.staff.length} / ${desks}</div><div class="sub">${OFFICES[state.facilities.office].name}</div></div>
      <div class="kpi"><div class="lbl">Development</div><div class="val">${devPower(state).toFixed(1)}</div><div class="sub">design points / week</div></div>
      <div class="kpi"><div class="lbl">Research</div><div class="val">${researchPower(state, false).toFixed(1)}</div><div class="sub">research points / week</div></div>
      <div class="kpi"><div class="lbl">Payroll</div><div class="val">${fmtMoney(payroll(state))}</div><div class="sub">per week · marketing ×${marketingMult(state).toFixed(2)}</div></div>
    </div>
    <div class="hint mb">🛠️ Engineers design products, 🔬 researchers earn research points and 📣 marketers boost campaigns and brand. Click the icons to reassign people at any time.</div>
    <h3 class="mb">Your team</h3>
    <div class="grid grid-2 mb">${cards}</div>
    <div class="row between mb"><h3>Candidates</h3><div class="row"><span class="tiny muted">New applicants every 12 weeks</span>
      <button class="btn btn-sm" data-action="recruit">Headhunt now (${fmtMoney(recruitCost(state))})</button></div></div>
    ${full ? '<div class="hint warn mb">Every desk is taken. Upgrade your office (Company tab) to hire more people.</div>' : ''}
    <div class="grid grid-2">${cands || '<div class="empty">No candidates right now.</div>'}</div>`;
}

// ------------------------------------------------------------------ company

function facilityCard(state, kind, title, icon, table, describe) {
  const lvl = state.facilities[kind];
  const cur = table[lvl];
  const next = table[lvl + 1];
  return `<div class="card fac-card">
    <div class="row"><span style="font-size:22px">${icon}</span><div class="grow"><div class="tiny muted">${title}</div><b>${esc(cur.name)}</b></div></div>
    <div class="fac-level">${table.map((_, i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</div>
    <div class="small">${describe(cur)}</div>
    ${next ? `<div class="divider" style="margin:4px 0"></div><div class="small"><b>Next: ${esc(next.name)}</b><br><span class="muted">${describe(next)}</span></div>
      <button class="btn ${state.company.cash >= next.cost ? 'btn-primary' : ''}" data-action="upgrade" data-arg="${kind}" ${state.company.cash >= next.cost ? '' : 'disabled'}>Upgrade · ${fmtMoney(next.cost)}</button>`
    : '<span class="tag good">Maximum level</span>'}
  </div>`;
}

function company(state) {
  const y = curYear(state);
  const c = state.company;
  const ml = maxLoan(state);
  const room = Math.max(0, ml - c.loan);
  const fac = [
    facilityCard(state, 'office', 'Office', '🏢', OFFICES, (o) => `${o.desks} desks · ${o.projects} product team${o.projects > 1 ? 's' : ''} · rent ${fmtMoney(o.rent)}/wk`),
    facilityCard(state, 'factory', 'Production', '🏭', FACTORIES, (f) => (f.capacity ? `Builds ${fmtNum(f.capacity)} units/wk ${Math.round(f.discount * 100)}% cheaper · upkeep ${fmtMoney(f.upkeep)}/wk` : f.desc)),
    facilityCard(state, 'lab', 'Research', '🧪', LABS, (l) => (l.cost ? `${l.desc} · upkeep ${fmtMoney(l.upkeep)}/wk` : l.desc)),
  ].join('');
  const capNow = factoryCapacity(state);
  const myUnits = state.products.filter((p) => p.owner === 'player' && p.active).reduce((a, p) => a + p.lastUnits, 0);
  const rivals = RIVALS.filter((r) => state.rivals[r.id].active && r.cats.some(([cat]) => rivalInCategory(state, r, cat, y))).map((r) => {
    const rs = state.rivals[r.id];
    const rev = rs.revHist.reduce((a, b) => a + b, 0) * (WEEKS_PER_YEAR / Math.max(1, rs.revHist.length));
    const val = rivalValuation(state, r.id);
    const cats = r.cats.filter(([cat]) => rivalInCategory(state, r, cat, y)).map(([cat]) => CATEGORIES[cat].icon).join(' ');
    return `<tr data-key="${r.id}"><td><div class="row"><i class="dot" style="background:${r.color}"></i><b>${esc(r.name)}</b></div></td><td>${cats}</td>
      <td style="min-width:80px">${bar(rs.brand / 100, '', `Brand ${Math.round(rs.brand)}`)}</td><td class="num">${fmtMoney(rev)}</td><td class="num">${r.immortal ? '—' : fmtMoney(val)}</td>
      <td class="right">${r.immortal ? '' : `<button class="btn btn-sm" data-action="acquire" data-id="${r.id}" ${c.cash >= val ? '' : 'disabled'}>Acquire</button>`}</td></tr>`;
  }).join('');
  const gone = RIVALS.filter((r) => !state.rivals[r.id].active).map((r) => `${esc(r.name)}${state.rivals[r.id].acquired ? ' (acquired by you)' : ''}`);
  const ach = ACHIEVEMENTS.map((a) => `<div class="ach ${state.achievements[a.id] !== undefined ? 'got' : ''}" title="${esc(a.desc)}"><span class="ach-icon">${a.icon}</span><div><b>${esc(a.name)}</b><div class="tiny muted">${esc(a.desc)}</div></div></div>`).join('');
  return `
    <h3 class="mb">Facilities</h3>
    <div class="grid grid-3 mb">${fac}</div>
    <div class="small muted mb">Production this week: ${fmtNum(myUnits)} units · own capacity ${fmtNum(capNow)} units/wk${myUnits > capNow ? ' (the rest is built by contract partners at full price)' : ''}.</div>
    <div class="grid grid-2 mb">
      <div class="card"><div class="card-title"><h3>🏦 Bank</h3><span class="tiny muted">${Math.round(LOAN_RATE * 100)}% interest per year</span></div>
        <div class="spec-row"><span class="k">Outstanding loan</span><span class="v">${fmtMoney(c.loan)}</span></div>
        <div class="spec-row"><span class="k">Credit limit</span><span class="v">${fmtMoney(ml)}</span></div>
        <div class="row wrap mt">
          <button class="btn btn-sm" data-action="borrow" data-arg="${Math.round(room * 0.25)}" ${room > 1000 ? '' : 'disabled'}>Borrow ${fmtMoney(room * 0.25)}</button>
          <button class="btn btn-sm" data-action="borrow" data-arg="${Math.round(room)}" ${room > 1000 ? '' : 'disabled'}>Borrow ${fmtMoney(room)}</button>
          <button class="btn btn-sm" data-action="repay" data-arg="${Math.round(c.loan)}" ${c.loan > 0 && c.cash > 0 ? '' : 'disabled'}>Repay all</button>
        </div>
        <div class="tiny muted mt">If you run out of cash the bank draws on your credit line automatically. ${BANKRUPT_WEEKS} weeks in the red means bankruptcy.</div>
      </div>
      <div class="card"><div class="card-title"><h3>📈 Company value</h3></div>
        <div class="big-meter">${fmtMoney(companyValue(state))}</div>
        <div class="spec-row"><span class="k">Your ownership</span><span class="v">${fmtPct(c.equity)}</span></div>
        <div class="spec-row"><span class="k">Products launched</span><span class="v">${state.stats.launches}</span></div>
        <div class="spec-row"><span class="k">Best reviewed</span><span class="v">${state.stats.bestProduct ? `${esc(state.stats.bestProduct)} (${state.stats.bestScore.toFixed(1)})` : '—'}</span></div>
        <div class="spec-row"><span class="k">Lifetime revenue</span><span class="v">${fmtMoney(state.stats.revenue)}</span></div>
      </div>
    </div>
    <div class="card mb"><div class="card-title"><h3>🏁 Competitors</h3><span class="tiny muted">Buying a rival shuts down its products and boosts your brand</span></div>
      <div class="table-wrap"><table class="tbl"><tr><th>Company</th><th>Markets</th><th>Brand</th><th class="num">Revenue/yr</th><th class="num">Price tag</th><th></th></tr>${rivals}</table></div>
      ${gone.length ? `<div class="tiny muted mt">Gone: ${gone.join(', ')}</div>` : ''}
    </div>
    <h3 class="mb">Achievements (${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length})</h3>
    <div class="grid grid-auto">${ach}</div>`;
}

// ------------------------------------------------------------------ finance

function finance(state) {
  const rows = [
    ['Revenue', 'revenue', 1], ['Retailers & returns', 'channel', -1], ['Cost of goods', 'cogs', -1], ['Salaries & hiring', 'salaries', -1],
    ['Rent', 'rent', -1], ['Facility upkeep', 'upkeep', -1], ['Marketing', 'marketing', -1], ['Product tooling', 'dev', -1],
    ['Interest', 'interest', -1], ['Other', 'other', -1],
  ];
  const cols = [1, 4, WEEKS_PER_YEAR];
  const body = rows.map(([label, key, sign]) => `<tr><td>${label}</td>${cols.map((n) => {
    const v = sumWeeks(state, n, key) * sign;
    return `<td class="num ${v < 0 ? 'bad' : ''}">${fmtMoney(v)}</td>`;
  }).join('')}</tr>`).join('');
  const profitRow = `<tr><td><b>Profit</b></td>${cols.map((n) => { const v = sumWeeks(state, n, 'profit'); return `<td class="num ${v >= 0 ? 'good' : 'bad'}"><b>${fmtMoney(v)}</b></td>`; }).join('')}</tr>`;
  const monthly = state.history.monthly.slice(-240);
  charts.fin = {
    type: 'line',
    opts: {
      series: [{ color: '#ffd166', data: monthly.map((m) => m.cash), fill: true }],
      yFormat: (v) => fmtMoney(v, 0),
      xLabel: (i) => formatDate(state, monthly[i].week),
    },
  };
  charts.fin2 = {
    type: 'line',
    opts: {
      series: [
        { color: '#39d0ff', data: monthly.map((m) => m.revenue) },
        { color: '#3ddc84', data: monthly.map((m) => m.profit) },
      ],
      yFormat: (v) => fmtMoney(v, 0),
      xLabel: (i) => formatDate(state, monthly[i].week),
    },
  };
  return `
    <div class="card mb"><div class="card-title"><h3>Income statement</h3></div>
      <div class="table-wrap"><table class="tbl"><tr><th></th><th class="num">Last week</th><th class="num">Last 4 weeks</th><th class="num">Last 12 months</th></tr>${body}${profitRow}</table></div></div>
    <div class="grid grid-2">
      <div class="card"><div class="card-title"><h3>Cash</h3></div><canvas class="chart" data-chart="fin"></canvas></div>
      <div class="card"><div class="card-title"><h3>Monthly revenue & profit</h3><div class="legend"><span><i class="dot" style="background:#39d0ff"></i>Revenue</span><span><i class="dot" style="background:#3ddc84"></i>Profit</span></div></div><canvas class="chart" data-chart="fin2"></canvas></div>
    </div>`;
}

export function renderTab(state, tab) {
  switch (tab) {
    case 'products': return products(state);
    case 'markets': return markets(state);
    case 'research': return research(state);
    case 'staff': return staffTab(state);
    case 'company': return company(state);
    case 'finance': return finance(state);
    default: return overview(state);
  }
}

export function tabBadges(state) {
  const b = {};
  const y = curYearInt(state);
  let n = 0;
  for (const id of CATEGORY_IDS) if (!state.categories[id] && y >= CATEGORIES[id].year && state.rp >= categoryResearchCost(id)) n++;
  const relevant = relevantComponents(state);
  for (const comp of relevant) {
    for (const t of allowedTiers(Object.keys(CATEGORIES).find((c) => state.categories[c] && CATEGORIES[c].slots.some(([s]) => s === comp)), comp)) {
      if (tierStatus(state, t) === 'available' && state.rp >= tierResearchCost(state, t)) { n++; break; }
    }
  }
  if (n) b.research = n;
  const loss = state.products.filter((p) => p.owner === 'player' && p.active && p.lastProfit < 0).length;
  if (loss) b.products = loss;
  return b;
}

