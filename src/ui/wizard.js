// New product designer: pick a category, choose components, tune focus, start development.
import { CATEGORIES, CATEGORY_IDS, refPrice } from '../data/categories.js';
import { COMPONENTS } from '../data/tech.js';
import { DURATIONS } from '../data/constants.js';
import { PRODUCT_PREFIXES } from '../data/names.js';
import { evaluateDesign, focusShares } from '../sim/design.js';
import { usableTiers, allowedTiers, tierStatus, tierResearchCost, categoryResearchCost, mainstreamTier, tierCostAt } from '../sim/tech.js';
import { activeProducts, manufacturingMult, marketPotential } from '../sim/market.js';
import { startProject, devProjects, projectSlots, researchCategory } from '../sim/game.js';
import { curYear, curYearInt, formatDate } from '../sim/util.js';
import { RIVAL_BY_ID } from '../data/rivals.js';
import { fmtMoney, fmtNum, fmtPct } from '../sim/format.js';
import { ctx } from './ctx.js';
import { openModal } from './modals.js';
import { esc, patch, stars, bar } from './dom.js';
import { sfx } from './audio.js';

const lastDrafts = {};

export function randomProductName(catId) {
  const cat = CATEGORIES[catId];
  const p = PRODUCT_PREFIXES[Math.floor(Math.random() * PRODUCT_PREFIXES.length)];
  const s = cat.namesSuffix[Math.floor(Math.random() * cat.namesSuffix.length)];
  const n = Math.random() < 0.5 ? ` ${Math.floor(Math.random() * 9 + 1) * (Math.random() < 0.5 ? 100 : 10)}` : Math.random() < 0.5 ? ' X' : '';
  return `${p} ${s}${n}`;
}

export function openNewProduct() {
  const state = ctx.state;
  if (devProjects(state).length >= projectSlots(state)) {
    ctx.toast('All product teams are busy. A bigger office adds more teams.', 'bad');
    return;
  }
  const m = openModal({ title: 'New Product: choose a market', icon: '🛠️', size: 'wide', body: categoryPickerHtml(state) });
  m.body.addEventListener('click', (e) => {
    const card = e.target.closest('[data-cat]');
    if (card && !card.classList.contains('locked')) {
      sfx('click');
      m.close();
      openDesigner(card.dataset.cat);
      return;
    }
    const unlock = e.target.closest('[data-unlock]');
    if (unlock) {
      const res = ctx.perform(researchCategory, unlock.dataset.unlock);
      if (res && res.ok) m.setBody(categoryPickerHtml(ctx.state));
    }
  });
}

function categoryPickerHtml(state) {
  const year = curYear(state);
  const cards = CATEGORY_IDS.map((id) => {
    const cat = CATEGORIES[id];
    const unlocked = !!state.categories[id];
    const exists = curYearInt(state) >= cat.year;
    const market = state.market[id];
    const prods = activeProducts(state, id);
    const mine = prods.filter((p) => p.owner === 'player').length;
    const rivals = new Set(prods.filter((p) => p.owner !== 'player').map((p) => p.owner));
    let leader = '';
    if (market && market.units > 0) {
      const top = Object.entries(market.shares).sort((a, b) => b[1] - a[1])[0];
      if (top) leader = top[0] === 'player' ? 'You' : RIVAL_BY_ID[top[0]]?.name || '';
    }
    const busy = state.projects.some((p) => p.category === id);
    let footer;
    if (unlocked) {
      footer = `<div class="row wrap small"><span class="tag accent">${fmtNum(marketPotential(state, id))} buyers/wk</span><span class="tag">~${fmtMoney(refPrice(id, year))}</span>${mine ? `<span class="tag good">${mine} on sale</span>` : ''}${busy ? '<span class="tag warn">in development</span>' : ''}</div>
        <div class="tiny muted">${rivals.size} competitor${rivals.size === 1 ? '' : 's'}${leader ? ` · leader: ${esc(leader)}` : ''}</div>`;
    } else if (exists) {
      const cost = categoryResearchCost(id);
      footer = `<div class="small muted">Requires research: <b>${esc(cat.unlockName)}</b></div>
        <button class="btn btn-sm ${state.rp >= cost ? 'btn-primary' : ''}" data-unlock="${id}" ${state.rp >= cost ? '' : 'disabled'}>Research (${cost} RP)</button>`;
    } else {
      footer = `<div class="small muted">This market emerges around <b>${cat.year}</b>.</div>`;
    }
    return `<div class="cat-card ${unlocked ? '' : 'locked'}" ${unlocked ? `data-cat="${id}" role="button" tabindex="0"` : ''}>
      <div class="cat-icon">${cat.icon}</div>
      <div class="cat-name">${esc(cat.name)}</div>
      ${footer}
    </div>`;
  }).join('');
  return `<p class="muted small mb">Pick what to build. Bigger markets mean more potential sales, but also tougher competition.</p><div class="cat-grid">${cards}</div>`;
}

function defaultDraft(state, catId) {
  const prev = lastDrafts[catId];
  const components = {};
  for (const [comp] of CATEGORIES[catId].slots) {
    const best = usableTiers(state, catId, comp)[0];
    components[comp] = best ? best.id : allowedTiers(catId, comp)[0].id;
  }
  return {
    category: catId,
    name: randomProductName(catId),
    components,
    focus: prev ? { ...prev.focus } : { perf: 5, quality: 5, cost: 5 },
    duration: prev ? prev.duration : DURATIONS[1].weeks,
  };
}

function openDesigner(catId) {
  const state = ctx.state;
  const cat = CATEGORIES[catId];
  const draft = defaultDraft(state, catId);
  const m = openModal({
    title: `Design a ${cat.name}`,
    icon: cat.icon,
    size: 'wide',
    body: `<div class="designer">
        <div class="design-left">${designLeftHtml(state, draft)}</div>
        <div class="spec card" id="spec"></div>
      </div>`,
    foot: `<button class="btn" data-back>← Back</button><span class="foot-summary" id="foot-summary"></span><span class="spacer"></span><span class="small bad" id="start-hint"></span><button class="btn btn-primary" data-start>Start Development</button>`,
  });
  const update = () => {
    const ev = evaluateDesign(state, draft, { parallel: devProjects(state).length + 1 });
    patch(m.body.querySelector('#spec'), specHtml(state, draft, ev));
    const startBtn = m.foot.querySelector('[data-start]');
    const hint = m.foot.querySelector('#start-hint');
    const tooPoor = state.company.cash < ev.tooling;
    startBtn.disabled = tooPoor;
    startBtn.textContent = `Start Development (${fmtMoney(ev.tooling)})`;
    hint.textContent = tooPoor ? `You need ${fmtMoney(ev.tooling)} for tooling.` : '';
    m.foot.querySelector('#foot-summary').innerHTML = `<span>Perf <b>${ev.perfVsMarket >= 0 ? '+' : ''}${fmtPct(ev.perfVsMarket)}</b></span>
      <span>Quality <b>${Math.round(ev.quality * 100)}%</b></span><span>Unit cost <b>${fmtMoney(ev.unitCost * manufacturingMult(state, 1))}</b></span>`;
    for (const btn of m.body.querySelectorAll('[data-tier]')) {
      btn.classList.toggle('active', draft.components[btn.dataset.slot] === btn.dataset.tier);
    }
    for (const btn of m.body.querySelectorAll('[data-dur]')) btn.classList.toggle('active', Number(btn.dataset.dur) === draft.duration);
    const shares = focusShares(draft.focus);
    for (const k of ['perf', 'quality', 'cost']) {
      const out = m.body.querySelector(`[data-focus-out="${k}"]`);
      if (out) out.textContent = fmtPct(shares[k]);
    }
  };
  m.body.addEventListener('click', (e) => {
    const tierBtn = e.target.closest('[data-tier]');
    if (tierBtn && !tierBtn.classList.contains('locked')) {
      draft.components[tierBtn.dataset.slot] = tierBtn.dataset.tier;
      sfx('click');
      update();
      return;
    }
    const dur = e.target.closest('[data-dur]');
    if (dur) { draft.duration = Number(dur.dataset.dur); sfx('click'); update(); return; }
    if (e.target.closest('[data-dice]')) {
      draft.name = randomProductName(catId);
      m.body.querySelector('#pname').value = draft.name;
      return;
    }
    const preset = e.target.closest('[data-preset]');
    if (preset) {
      applyPreset(state, draft, preset.dataset.preset);
      m.body.querySelector('.design-left').innerHTML = designLeftHtml(state, draft);
      sfx('click');
      update();
    }
  });
  m.body.addEventListener('input', (e) => {
    if (e.target.id === 'pname') draft.name = e.target.value;
    if (e.target.dataset.focus) { draft.focus[e.target.dataset.focus] = Number(e.target.value); update(); }
  });
  m.foot.querySelector('[data-back]').addEventListener('click', () => { m.close(); openNewProduct(); });
  m.foot.querySelector('[data-start]').addEventListener('click', () => {
    if (!draft.name.trim()) draft.name = randomProductName(catId);
    const res = ctx.perform(startProject, draft);
    if (res && res.ok) {
      lastDrafts[catId] = { focus: { ...draft.focus }, duration: draft.duration };
      m.close();
      ctx.toast(`Development of ${draft.name} has started!`, 'good');
      ctx.tip('first_project', 'Your team is building it now. Watch the progress bar on the left; you will set a price when it is done.');
    }
  });
  update();
}

function applyPreset(state, draft, preset) {
  const catId = draft.category;
  const year = curYear(state);
  for (const [comp] of CATEGORIES[catId].slots) {
    const usable = usableTiers(state, catId, comp);
    if (!usable.length) continue;
    if (preset === 'best') draft.components[comp] = usable[0].id;
    else if (preset === 'budget') {
      // a couple of years behind mainstream: cheap, proven tech
      const target = mainstreamTier(catId, comp, year - 1).year;
      const pick = usable.find((t) => t.year <= target) || usable[usable.length - 1];
      draft.components[comp] = pick.id;
    } else if (preset === 'balanced') {
      const target = mainstreamTier(catId, comp, year + 1.5).year;
      const pick = usable.find((t) => t.year <= target) || usable[usable.length - 1];
      draft.components[comp] = pick.id;
    }
  }
  if (preset === 'budget') draft.focus = { perf: 2, quality: 4, cost: 8 };
  if (preset === 'balanced') draft.focus = { perf: 5, quality: 5, cost: 5 };
  if (preset === 'best') draft.focus = { perf: 8, quality: 5, cost: 1 };
}

function designLeftHtml(state, draft) {
  const catId = draft.category;
  const cat = CATEGORIES[catId];
  const year = curYear(state);
  const rows = cat.slots.map(([comp, w, cm]) => {
    const c = COMPONENTS[comp];
    const usable = usableTiers(state, catId, comp);
    const next = allowedTiers(catId, comp).find((t) => !state.tech[t.id] && tierStatus(state, t) !== 'future');
    const buttons = usable.map((t) => {
      const cost = tierCostAt(state, t, year) * cm;
      return `<button class="tier-btn" data-slot="${comp}" data-tier="${t.id}" title="${esc(t.name)} (${t.year})">
        <div class="tn">${esc(t.name)}</div><div class="ti">${t.year} · ${fmtMoney(cost)}</div></button>`;
    }).join('');
    const lockedBtn = next ? `<button class="tier-btn locked" title="Research this in the Research tab">
        <div class="tn">🔒 ${esc(next.name)}</div><div class="ti">${next.year} · ${tierResearchCost(state, next)} RP</div></button>` : '';
    return `<div class="slot-row">
      <div class="slot-name">${c.icon} ${esc(c.name)}<small>${Math.round(w * 100)}% of performance</small></div>
      <div class="tier-pick">${lockedBtn}${buttons}</div>
    </div>`;
  }).join('');
  const durs = DURATIONS.map((d) => `<button data-dur="${d.weeks}"><b>${d.name}</b><small>${d.weeks} weeks · ready ${formatDate(state, state.week + d.weeks)}</small></button>`).join('');
  return `
    <div class="row mb">
      <div class="field grow"><label for="pname">Product name</label><input id="pname" class="input" maxlength="28" value="${esc(draft.name)}"></div>
      <button class="btn" data-dice title="Random name" style="align-self:flex-end">🎲</button>
    </div>
    <div class="row between"><h4>Components</h4>
      <div class="row"><span class="tiny muted">Presets:</span>
        <button class="btn btn-sm" data-preset="budget" title="Older, cheaper parts">Budget</button>
        <button class="btn btn-sm" data-preset="balanced" title="Current-generation parts">Balanced</button>
        <button class="btn btn-sm" data-preset="best" title="Newest parts you own">Cutting edge</button></div></div>
    <div class="mb">${rows}</div>
    <h4 class="mb">Engineering focus</h4>
    <div class="col mb">
      ${focusSlider('perf', 'Performance', draft.focus.perf, 'Squeeze more speed out of the parts.')}
      ${focusSlider('quality', 'Reliability', draft.focus.quality, 'Fewer defects and returns, better reviews.')}
      ${focusSlider('cost', 'Cost savings', draft.focus.cost, 'Cheaper to manufacture.')}
    </div>
    <h4 class="mb">Development time</h4>
    <div class="seg-ctl">${durs}</div>`;
}

function focusSlider(key, label, value, title) {
  return `<div class="slider-row" title="${esc(title)}"><span>${label}</span>
    <input type="range" min="0" max="10" step="1" value="${value}" data-focus="${key}"><span class="num right" data-focus-out="${key}"></span></div>`;
}

function specHtml(state, draft, ev) {
  const year = curYear(state);
  const ref = refPrice(draft.category, year);
  const vs = ev.perfVsMarket;
  const vsCls = vs > 0.15 ? 'good' : vs < -0.15 ? 'bad' : 'warn';
  const balCls = ev.balance.std > 4 ? 'bad' : ev.balance.std > 2.5 ? 'warn' : 'good';
  const mm = manufacturingMult(state, 1);
  const unit = ev.unitCost * mm;
  const ratioCls = ev.ratio >= 1.4 ? 'good' : ev.ratio >= 0.8 ? 'warn' : 'bad';
  const parallel = devProjects(state).length;
  return `
    <div>
      <div class="tiny muted">BENCHMARK SCORE</div>
      <div class="big-meter">${fmtNum(ev.benchmark)}</div>
      <div class="${vsCls} small"><b>${vs >= 0 ? '+' : ''}${fmtPct(vs)}</b> vs. a typical ${esc(CATEGORIES[draft.category].short.toLowerCase())} today</div>
    </div>
    <div class="divider" style="margin:4px 0"></div>
    <div class="spec-row"><span class="k">Component balance</span><span class="v ${balCls}">${ev.balance.label}</span></div>
    ${ev.balance.penalty > 0 ? '<div class="hint warn">Some parts are far older than others and hold the product back. Pick parts from similar eras.</div>' : ''}
    <div class="spec-row"><span class="k">Expected quality</span><span class="v">${stars(ev.quality)} ${Math.round(ev.quality * 100)}%</span></div>
    <div>
      <div class="spec-row"><span class="k">Design effort</span><span class="v ${ratioCls}">${fmtNum(ev.dp)} / ${fmtNum(ev.req)} DP</span></div>
      ${bar(Math.min(1, ev.ratio / 2), ratioCls)}
      <div class="tiny muted" style="margin-top:4px">${ev.ratio < 0.8 ? 'Your engineers are stretched thin. Give them more time or hire more engineers.' : ev.ratio < 1.4 ? 'Decent. More time or engineers will polish it further.' : 'Plenty of engineering time for a polished product.'}${parallel ? ` Shared with ${parallel} other project${parallel > 1 ? 's' : ''}.` : ''}</div>
    </div>
    ${ev.immature ? `<div class="tiny muted">⚠ ${ev.immature} brand-new part${ev.immature > 1 ? 's' : ''}: a little riskier, but reviewers love innovation.</div>` : ''}
    <div class="divider" style="margin:4px 0"></div>
    <div class="spec-row"><span class="k">Unit cost</span><span class="v">${fmtMoney(unit)}</span></div>
    <div class="spec-row"><span class="k">Typical retail price</span><span class="v">${fmtMoney(ref)}</span></div>
    <div class="spec-row"><span class="k">Tooling (paid now)</span><span class="v">${fmtMoney(ev.tooling)}</span></div>
    <div class="spec-row"><span class="k">Cash</span><span class="v ${state.company.cash < ev.tooling ? 'bad' : ''}">${fmtMoney(state.company.cash)}</span></div>
    <div class="hint">You set the price at launch. Products priced near ${fmtMoney(ref * 0.6)} target budget buyers, ~${fmtMoney(ref)} mainstream, ${fmtMoney(ref * 1.9)}+ enthusiasts.</div>`;
}
