// Launch flow (pricing + marketing), press reviews, and per-product management dialogs.
import { CATEGORIES, refPrice } from '../data/categories.js';
import { COMPONENTS, TIERS, benchmarkForYear } from '../data/tech.js';
import { PERF_K } from '../data/constants.js';
import { refYear } from '../sim/tech.js';
import { estimateLaunch, pricePoints, productUnitCost, niceRound } from '../sim/market.js';
import {
  launchProduct, setPrice, discontinue, runCampaign, campaignCost, availableCampaigns,
} from '../sim/game.js';
import { curYear, formatDate } from '../sim/util.js';
import { fmtMoney, fmtNum, fmtPct, fmtPrice } from '../sim/format.js';
import { ctx } from './ctx.js';
import { openModal, confirmModal } from './modals.js';
import { esc, stars, bar, patch } from './dom.js';
import { lineChart } from './charts.js';
import { sfx } from './audio.js';

function perfVsMarket(state, p) {
  return Math.exp(PERF_K * (p.techYear - refYear(p.category, curYear(state)))) - 1;
}

/**
 * Shared pricing widget. product: launch draft or an existing product.
 * Returns { html, mount(el, onChange) , get price() }.
 */
function pricingWidget(state, product, initialPrice) {
  const uc = productUnitCost(state, product);
  const prices = pricePoints(state, product.category, uc, 36);
  const est = estimateLaunch(state, product, prices);
  let best = est[0];
  for (const e of est) if (e.profit > best.profit) best = e;
  const ref = refPrice(product.category, curYear(state));
  let price = initialPrice ?? best.price;
  const lo = prices[0], hi = prices[prices.length - 1];
  const toSlider = (p) => Math.round((Math.log(p / lo) / Math.log(hi / lo)) * 1000);
  const fromSlider = (v) => niceRound(lo * Math.pow(hi / lo, v / 1000));

  const html = `
    <div class="grid grid-2">
      <div>
        <div class="row between"><h4>Price</h4>
          <div class="row">
            <button class="btn btn-sm" data-pp="${niceRound(ref * 0.6)}">Budget</button>
            <button class="btn btn-sm" data-pp="${niceRound(ref)}">Mainstream</button>
            <button class="btn btn-sm" data-pp="${niceRound(ref * 1.9)}">Premium</button>
            <button class="btn btn-sm btn-good" data-pp="${best.price}">Max profit</button>
          </div></div>
        <div class="row mt">
          <input type="range" min="0" max="1000" step="1" data-price-slider class="grow">
          <div class="row" style="width:130px"><span class="muted">$</span><input class="input num" data-price-input type="number" min="1" step="1" style="width:110px"></div>
        </div>
        <div class="mt" data-price-stats></div>
      </div>
      <div>
        <h4>Estimated weekly profit by price</h4>
        <canvas class="chart" data-price-chart></canvas>
        <div class="legend"><span><i class="dot" style="background:#3ddc84"></i>Weekly profit</span><span><i class="dot" style="background:#39d0ff"></i>Units sold (scaled)</span><span class="tiny">Click the chart to pick a price</span></div>
      </div>
    </div>`;

  function statsHtml() {
    const e = estimateLaunch(state, product, [price])[0];
    const margin = price - e.unitCost;
    return `<div class="grid grid-2">
      <div class="kpi"><div class="lbl">Units / week</div><div class="val">${fmtNum(e.units)}</div><div class="sub">${fmtPct(e.share, 1)} market share</div></div>
      <div class="kpi"><div class="lbl">Profit / week</div><div class="val ${e.profit >= 0 ? 'good' : 'bad'}">${fmtMoney(e.profit)}</div><div class="sub">Revenue ${fmtMoney(e.revenue)}</div></div>
    </div>
    <div class="spec-row mt"><span class="k">Unit cost / gross margin per unit</span><span class="v">${fmtMoney(e.unitCost)} / <span class="${margin > 0 ? 'good' : 'bad'}">${fmtMoney(margin)}</span></span></div>
    <div class="spec-row"><span class="k">Retailers & returns take</span><span class="v">${fmtPct(CATEGORIES[product.category].channel + (1 - product.quality) * 0.12)} of the price</span></div>
    ${price < e.unitCost ? '<div class="hint bad">You are selling below cost!</div>' : ''}
    <div class="tiny muted mt">Estimates assume today's market. Sales fade as the product ages and rivals launch newer models.</div>`;
  }

  return {
    html,
    get price() { return price; },
    mount(root, onChange) {
      const slider = root.querySelector('[data-price-slider]');
      const input = root.querySelector('[data-price-input]');
      const canvas = root.querySelector('[data-price-chart]');
      const stats = root.querySelector('[data-price-stats]');
      const draw = () => {
        const idx = est.reduce((bi, e, i) => (Math.abs(Math.log(e.price / price)) < Math.abs(Math.log(est[bi].price / price)) ? i : bi), 0);
        const maxU = Math.max(...est.map((e) => e.units), 1);
        const maxP = Math.max(...est.map((e) => Math.abs(e.profit)), 1);
        lineChart(canvas, {
          series: [
            { color: '#3ddc84', data: est.map((e) => e.profit), fill: true },
            { color: '#39d0ff', data: est.map((e) => (e.units / maxU) * maxP), width: 1.5 },
          ],
          yFormat: (v) => fmtMoney(v, 0),
          xLabel: (i) => fmtPrice(est[i].price),
          highlight: idx,
          markerLabel: fmtPrice(price),
          secondHighlight: est.indexOf(best),
        });
      };
      const set = (p, from) => {
        price = Math.max(1, Math.round(p));
        if (from !== 'slider') slider.value = toSlider(price);
        if (from !== 'input') input.value = price;
        patch(stats, statsHtml());
        draw();
        if (onChange) onChange(price);
      };
      slider.addEventListener('input', () => set(fromSlider(Number(slider.value)), 'slider'));
      input.addEventListener('change', () => set(Number(input.value) || price, 'input'));
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pp]');
        if (b) { set(Number(b.dataset.pp)); sfx('click'); }
      });
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const f = Math.max(0, Math.min(1, (e.clientX - rect.left - 54) / (rect.width - 64)));
        set(est[Math.round(f * (est.length - 1))].price);
      });
      set(price);
      // redraw once layout settles (modal animation)
      setTimeout(draw, 60);
    },
  };
}

function campaignsHtml(state, catId, checkbox) {
  const list = availableCampaigns(state);
  return list.map((c) => {
    const cost = campaignCost(state, catId, c);
    const control = checkbox
      ? `<input type="checkbox" data-camp="${c.id}">`
      : `<button class="btn btn-sm" data-run-camp="${c.id}" ${state.company.cash < cost ? 'disabled' : ''}>Run</button>`;
    return `<label class="row between" style="padding:6px 0;border-bottom:1px solid var(--line)">
      <span class="row">${checkbox ? control : ''}<span><b>${esc(c.name)}</b><br><span class="tiny muted">Hype +${Math.round(c.hype * 100)}% · Brand +${c.brand}</span></span></span>
      <span class="row"><span class="num">${fmtMoney(cost)}</span>${checkbox ? '' : control}</span></label>`;
  }).join('');
}

export function openLaunch(projectId) {
  const state = ctx.state;
  const proj = state.projects.find((p) => p.id === projectId && p.status === 'ready');
  if (!proj) return;
  const draft = {
    category: proj.category,
    techYear: proj.result.techYear,
    quality: proj.result.quality,
    components: proj.components,
    costFactor: proj.result.costFactor,
    hype: 0.35,
  };
  const cat = CATEGORIES[proj.category];
  const vs = perfVsMarket(state, draft);
  const widget = pricingWidget(state, draft);
  const m = openModal({
    title: `${proj.name} is ready!`,
    icon: cat.icon,
    size: 'wide',
    closable: false,
    kind: 'launch',
    body: `
      <div class="grid grid-4 mb">
        <div class="kpi"><div class="lbl">Category</div><div class="val" style="font-size:16px">${cat.icon} ${esc(cat.short)}</div></div>
        <div class="kpi"><div class="lbl">Performance</div><div class="val ${vs >= 0 ? 'good' : 'bad'}">${vs >= 0 ? '+' : ''}${fmtPct(vs)}</div><div class="sub">vs. typical product</div></div>
        <div class="kpi"><div class="lbl">Quality</div><div class="val">${stars(draft.quality)}</div><div class="sub">${Math.round(draft.quality * 100)}%</div></div>
        <div class="kpi"><div class="lbl">Benchmark</div><div class="val">${fmtNum(benchmarkForYear(draft.techYear))}</div></div>
      </div>
      ${widget.html}
      <div class="divider"></div>
      <div class="row between"><h4>Launch marketing (optional)</h4><span class="small muted">Cash: ${fmtMoney(state.company.cash)}</span></div>
      <div data-camps>${campaignsHtml(state, proj.category, true)}</div>`,
    foot: `<button class="btn btn-danger" data-scrap>Scrap project</button><span class="spacer"></span><span class="small" data-mcost></span><button class="btn btn-primary btn-lg" data-launch>🚀 Launch</button>`,
  });
  widget.mount(m.body);
  const selected = () => [...m.body.querySelectorAll('[data-camp]:checked')].map((x) => x.dataset.camp);
  const updateCost = () => {
    const cost = selected().reduce((a, id) => a + campaignCost(state, proj.category, availableCampaigns(state).find((c) => c.id === id)), 0);
    m.foot.querySelector('[data-mcost]').textContent = cost ? `Marketing: ${fmtMoney(cost)}` : '';
  };
  m.body.addEventListener('change', (e) => { if (e.target.dataset.camp) updateCost(); });
  m.foot.querySelector('[data-launch]').addEventListener('click', () => {
    const res = ctx.perform(launchProduct, proj.id, widget.price, selected());
    if (res && res.ok) {
      m.close();
      showReviews(res.product);
    }
  });
  m.foot.querySelector('[data-scrap]').addEventListener('click', () => {
    confirmModal('Scrap project?', `${esc(proj.name)} will be thrown away. The tooling money is lost.`, 'Scrap it', () => {
      state.projects = state.projects.filter((p) => p.id !== proj.id);
      m.close();
      ctx.render();
    }, true);
  });
}

export function showReviews(product) {
  const avg = product.reviewAvg;
  const m = openModal({
    title: `Reviews are in: ${product.name}`,
    icon: '📰',
    size: 'medium',
    body: `<div class="review-grid">${product.reviews.map((r) => `
        <div class="review"><div class="outlet">${esc(r.outlet)}</div>
        <div class="score score-${r.score}">${r.score}</div><div class="quote">“${esc(r.quote || '')}”</div></div>`).join('')}</div>
      <div class="center mt" data-summary style="opacity:0;transition:opacity .4s">
        <div class="muted small">Average score</div>
        <div class="big-meter score-${Math.round(avg)}">${avg.toFixed(1)} / 10</div>
        <div class="small muted">${avg >= 8.5 ? 'A smash hit! Your brand gets a big boost.' : avg >= 7 ? 'Well received. Customers are interested.' : avg >= 5 ? 'Mixed reception. It will need a good price to sell.' : 'Ouch. Critics hated it. Your brand takes a hit.'}</div>
      </div>`,
    foot: '<button class="btn btn-primary" data-close>Continue</button>',
  });
  const cards = [...m.body.querySelectorAll('.review')];
  cards.forEach((c, i) => setTimeout(() => { c.classList.add('show'); sfx('review', product.reviews[i].score); }, 350 + i * 550));
  setTimeout(() => {
    const s = m.body.querySelector('[data-summary]');
    if (s) s.style.opacity = 1;
    if (avg >= 8.5) sfx('achievement');
  }, 350 + cards.length * 550);
  ctx.tip('first_launch', 'Your product is on sale! Check the Products tab to adjust its price or run marketing, and the Markets tab to see how you stack up.');
}

export function openPriceModal(productId) {
  const state = ctx.state;
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const widget = pricingWidget(state, p, p.price);
  const m = openModal({
    title: `Set price: ${p.name}`,
    icon: '🏷️',
    size: 'wide',
    body: `<p class="small muted">Current price ${fmtMoney(p.price)}. Price cuts help ageing products keep selling.</p>${widget.html}`,
    foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-ok>Apply price</button>',
  });
  widget.mount(m.body);
  m.foot.querySelector('[data-ok]').addEventListener('click', () => {
    const res = ctx.perform(setPrice, p.id, widget.price);
    if (res && res.ok) { m.close(); ctx.toast(`${p.name} now costs ${fmtMoney(widget.price)}.`, 'good'); }
  });
}

export function openMarketingModal(productId) {
  const state = ctx.state;
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const m = openModal({
    title: `Marketing: ${p.name}`,
    icon: '📣',
    body: `<p class="small muted">Campaigns add hype (sales boost that fades over a few months) and a little brand reputation.
      Current hype: <b>${Math.round(p.hype * 100)}%</b>. Cash: <b>${fmtMoney(state.company.cash)}</b></p><div data-list>${campaignsHtml(state, p.category, false)}</div>`,
    foot: '<button class="btn" data-close>Done</button>',
  });
  m.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-run-camp]');
    if (!b) return;
    const res = ctx.perform(runCampaign, p.id, b.dataset.runCamp);
    if (res && res.ok) {
      ctx.toast('Campaign launched! Hype is up.', 'good');
      m.setBody(`<p class="small muted">Current hype: <b>${Math.round(p.hype * 100)}%</b>. Cash: <b>${fmtMoney(ctx.state.company.cash)}</b></p><div data-list>${campaignsHtml(ctx.state, p.category, false)}</div>`);
    }
  });
}

export function confirmDiscontinue(productId) {
  const p = ctx.state.products.find((x) => x.id === productId);
  if (!p) return;
  confirmModal('Discontinue product?', `Stop selling <b>${esc(p.name)}</b>? This cannot be undone.`, 'Discontinue', () => {
    ctx.perform(discontinue, p.id);
  }, true);
}

export function openProductDetail(productId) {
  const state = ctx.state;
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const cat = CATEGORIES[p.category];
  const vs = perfVsMarket(state, p);
  const comps = cat.slots.map(([comp]) => {
    const t = TIERS[p.components?.[comp]];
    return t ? `<div class="spec-row"><span class="k">${COMPONENTS[comp].icon} ${esc(COMPONENTS[comp].name)}</span><span class="v">${esc(t.name)} <span class="muted">(${t.year})</span></span></div>` : '';
  }).join('');
  const reviews = (p.reviews || []).map((r) => `<span class="tag" title="${esc(r.quote || '')}">${esc(r.outlet)}: <b class="score-${r.score}">${r.score}</b></span>`).join(' ');
  const m = openModal({
    title: p.name,
    icon: cat.icon,
    size: 'medium',
    body: `
      <div class="grid grid-4 mb">
        <div class="kpi"><div class="lbl">Price</div><div class="val">${fmtPrice(p.price)}</div></div>
        <div class="kpi"><div class="lbl">Units / wk</div><div class="val">${fmtNum(p.lastUnits)}</div></div>
        <div class="kpi"><div class="lbl">Profit / wk</div><div class="val ${p.lastProfit >= 0 ? 'good' : 'bad'}">${fmtMoney(p.lastProfit)}</div></div>
        <div class="kpi"><div class="lbl">Total sold</div><div class="val">${fmtNum(p.unitsTotal)}</div></div>
      </div>
      <h4>Monthly unit sales</h4>
      <canvas class="chart short" data-hist></canvas>
      <div class="grid grid-2 mt">
        <div>
          <div class="spec-row"><span class="k">Launched</span><span class="v">${formatDate(state, p.launchWeek)}</span></div>
          <div class="spec-row"><span class="k">Performance vs market</span><span class="v ${vs >= 0 ? 'good' : 'bad'}">${vs >= 0 ? '+' : ''}${fmtPct(vs)}</span></div>
          <div class="spec-row"><span class="k">Quality</span><span class="v">${stars(p.quality)}</span></div>
          <div class="spec-row"><span class="k">Hype</span><span class="v">${Math.round(p.hype * 100)}%</span></div>
          <div class="spec-row"><span class="k">Unit cost now</span><span class="v">${fmtMoney(p.unitCostNow || 0)}</span></div>
          <div class="spec-row"><span class="k">Lifetime revenue</span><span class="v">${fmtMoney(p.revenueTotal)}</span></div>
          <div class="spec-row"><span class="k">Lifetime profit</span><span class="v ${p.profitTotal >= 0 ? 'good' : 'bad'}">${fmtMoney(p.profitTotal)}</span></div>
        </div>
        <div>${comps}</div>
      </div>
      <div class="mt row wrap">${reviews}</div>`,
    foot: p.active ? `<button class="btn btn-danger" data-disc>Discontinue</button><span class="spacer"></span>
      <button class="btn" data-mkt>📣 Marketing</button><button class="btn btn-primary" data-price>🏷️ Change price</button>` : '<button class="btn" data-close>Close</button>',
  });
  setTimeout(() => {
    const c = m.body.querySelector('[data-hist]');
    const data = [...(p.history || [])];
    if (c) lineChart(c, { series: [{ color: '#39d0ff', data, fill: true }], yFormat: (v) => fmtNum(v, 0), xLabel: (i) => formatDate(state, p.launchWeek + (i + 1) * 4), empty: 'Sales history appears after the first month' });
  }, 40);
  if (p.active) {
    m.foot.querySelector('[data-price]').addEventListener('click', () => { m.close(); openPriceModal(p.id); });
    m.foot.querySelector('[data-mkt]').addEventListener('click', () => { m.close(); openMarketingModal(p.id); });
    m.foot.querySelector('[data-disc]').addEventListener('click', () => { m.close(); confirmDiscontinue(p.id); });
  }
}

export { bar };
