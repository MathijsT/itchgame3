// Main UI controller: layout rendering, player actions, toasts, menus and game-over screens.
import { CATEGORIES } from '../data/categories.js';
import { OFFICES } from '../data/facilities.js';
import { WEEKS_PER_YEAR, GAME_TITLE } from '../data/constants.js';
import * as G from '../sim/game.js';
import { drainToasts, drainCues } from '../sim/news.js';
import { serialize } from '../sim/save.js';
import { devPower, researchPower, deskCount } from '../sim/staff.js';
import { formatDate, curYearInt } from '../sim/util.js';
import { fmtMoney, fmtNum, fmtPct } from '../sim/format.js';
import { ctx, saveSettings } from './ctx.js';
import { $, $$, esc, patch, bar } from './dom.js';
import { openModal, modalOpen, confirmModal, closeAll } from './modals.js';
import { renderTab, TABS, charts, tabBadges } from './tabs.js';
import { lineChart, shareChart } from './charts.js';
import { drawAvatar, officeName } from './office.js';
import { openNewProduct } from './wizard.js';
import { openLaunch, openPriceModal, openMarketingModal, confirmDiscontinue, openProductDetail } from './launch.js';
import { sfx } from './audio.js';

export const SAVE_KEY = 'silicongarage.save.v1';
const SCORES_KEY = 'silicongarage.scores';

function recordScore(s, score) {
  if (s.flags.scoreRecorded) return loadScores();
  s.flags.scoreRecorded = true;
  const list = loadScores();
  list.push({ name: s.company.name, score, year: curYearInt(s), reason: s.gameOver.reason, difficulty: s.difficulty, start: s.startYear + Math.floor(s.startWeek / WEEKS_PER_YEAR) });
  list.sort((a, b) => b.score - a.score);
  list.length = Math.min(list.length, 10);
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}

export function loadScores() {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]'); } catch { return []; }
}

export function scoresTable(list, highlight) {
  if (!list.length) return '';
  return `<table class="tbl"><tr><th>#</th><th>Company</th><th>Ended</th><th class="num">Score</th></tr>${list.map((e, i) => `
    <tr class="${highlight && e.name === highlight.name && e.score === highlight.score ? 'me' : ''}"><td>${i + 1}</td><td>${esc(e.name)} <span class="tiny muted">${esc(e.difficulty)} · from ${e.start}</span></td>
    <td>${e.year} <span class="tiny muted">${e.reason === 'bankrupt' ? 'bankrupt' : e.reason === 'sold' ? 'sold' : ''}</span></td><td class="num">${fmtMoney(e.score)}</td></tr>`).join('')}</table>`;
}

let lastRender = 0;
let lastTabHtml = '';
let exitToTitle = () => {};

export function initApp({ onExit }) {
  exitToTitle = onExit;
  ctx.render = render;
  ctx.perform = perform;
  ctx.toast = toast;
  ctx.tip = tip;
  ctx.setSpeed = setSpeed;

  $('#tabs').innerHTML = TABS.map((t) => `<button class="tab" role="tab" data-action="tab" data-arg="${t.id}">${t.name}<span class="badge" data-badge="${t.id}" hidden></span></button>`).join('');

  document.addEventListener('click', onClick);
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-action="research-all"]');
    if (el) { ctx.researchAll = el.checked; render(true); }
  });
  $$('.speed-btn').forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
  $('#btn-sound').addEventListener('click', () => {
    ctx.settings.sound = !ctx.settings.sound;
    saveSettings();
    updateSoundIcon();
    if (ctx.settings.sound) sfx('click');
  });
  $('#btn-menu').addEventListener('click', openMenu);
  document.addEventListener('keydown', onKey);
  updateSoundIcon();
}

function updateSoundIcon() {
  $('#btn-sound').textContent = ctx.settings.sound ? '🔊' : '🔇';
}

let lastSpeed = 1;
export function setSpeed(n) {
  if (n > 0) lastSpeed = n;
  ctx.speed = n;
  ctx.paused = n === 0;
  $$('.speed-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === n));
  render(true);
}

function onKey(e) {
  if (!ctx.state || $('#game-screen').hidden) return;
  if (e.target.closest('input, textarea, select')) return;
  if (modalOpen()) return;
  if (e.code === 'Space') { e.preventDefault(); setSpeed(ctx.speed === 0 ? lastSpeed : 0); }
  else if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(Number(e.key));
  else if (e.key === 'n' || e.key === 'N') openNewProduct();
}

// ------------------------------------------------------------------ actions

export function perform(fn, ...args) {
  if (!ctx.state) return null;
  const res = fn(ctx.state, ...args);
  if (res && res.error) {
    toast(res.error, 'bad');
    sfx('bad');
  }
  flushQueues();
  render(true);
  return res;
}

const ACTIONS = {
  tab: (el) => { ctx.tab = el.dataset.arg; lastTabHtml = ''; sfx('click'); render(true); $('#tab-content').scrollTop = 0; },
  'new-product': () => openNewProduct(),
  launch: (el) => openLaunch(el.dataset.id),
  'cancel-project': (el) => {
    const p = ctx.state.projects.find((x) => x.id === el.dataset.id);
    if (p) confirmModal('Cancel development?', `Stop working on <b>${esc(p.name)}</b>? The tooling money is lost.`, 'Cancel project', () => perform(G.cancelProject, p.id), true);
  },
  product: (el) => openProductDetail(el.dataset.id),
  price: (el) => openPriceModal(el.dataset.id),
  marketing: (el) => openMarketingModal(el.dataset.id),
  discontinue: (el) => confirmDiscontinue(el.dataset.id),
  'market-cat': (el) => { ctx.marketCat = el.dataset.arg; render(true); },
  'research-tier': (el) => perform(G.researchTier, el.dataset.id),
  'research-cat': (el) => perform(G.researchCategory, el.dataset.id),
  'research-perk': (el) => perform(G.researchPerk, el.dataset.id),
  'buy-rp': (el) => { const r = perform(G.buyResearch, Number(el.dataset.arg)); if (r && r.ok) toast(`Bought ${fmtNum(r.amount)} RP for ${fmtMoney(r.cost)}.`, 'good'); },
  role: (el) => { perform(G.setRole, el.dataset.id, el.dataset.arg); sfx('click'); },
  train: (el) => { const r = perform(G.train, el.dataset.id); if (r && r.ok) sfx('upgrade'); },
  fire: (el) => {
    const s = ctx.state.staff.find((x) => x.id === el.dataset.id);
    if (s) confirmModal('Fire employee?', `Let <b>${esc(s.name)}</b> go? Severance is two weeks of salary.`, 'Fire', () => perform(G.fire, s.id), true);
  },
  hire: (el) => perform(G.hire, el.dataset.id),
  recruit: () => perform(G.recruit),
  upgrade: (el) => {
    const kind = el.dataset.arg;
    const res = perform(G.upgradeFacility, kind);
    if (res && res.ok && kind === 'office') ctx.tip('office_up', 'More desks means more staff, and bigger offices let you run several product teams at once.');
  },
  borrow: (el) => { const r = perform(G.borrow, Number(el.dataset.arg)); if (r && r.ok) toast(`Borrowed ${fmtMoney(r.amount)}.`, 'good'); },
  repay: (el) => { const r = perform(G.repay, Number(el.dataset.arg)); if (r && r.ok) toast(`Repaid ${fmtMoney(r.amount)}.`, 'good'); },
  acquire: (el) => {
    const id = el.dataset.id;
    confirmModal('Acquire company?', 'Buy this rival outright? Their products will be pulled from the market.', 'Buy them', () => perform(G.acquireRival, id));
  },
  help: () => openHelp(),
};

function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el || !ctx.state) return;
  if (el.tagName === 'INPUT') return;
  if (el.disabled) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) {
    e.stopPropagation();
    fn(el);
  }
}

// ------------------------------------------------------------------ toasts & tips

export function toast(text, type = 'info', body = '', icon = '', ms = 4200) {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="t-title">${icon ? `${icon} ` : ''}${esc(text)}</div>${body ? `<div class="t-body">${esc(body)}</div>` : ''}`;
  box.appendChild(t);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

export function tip(id, text) {
  const s = ctx.state;
  if (!s || s.tips[id]) return;
  s.tips[id] = true;
  toast('Tip', 'info', text, '💡', 9000);
}

function flushQueues() {
  const s = ctx.state;
  if (!s) return;
  for (const t of drainToasts(s)) {
    toast(t.text, t.type, t.body || '', t.icon || '', t.type === 'event' || t.type === 'achievement' ? 7000 : 4200);
  }
  for (const c of drainCues(s)) sfx(c);
}

/** Called after every simulated week. */
export function afterTick() {
  const s = ctx.state;
  flushQueues();
  contextualTips(s);
  if (s.week % 4 === 0) saveGame();
  checkInterrupts();
}

/** Open modals for things that need the player's attention. */
export function checkInterrupts() {
  const s = ctx.state;
  if (!s || modalOpen()) return;
  if (s.gameOver) { saveGame(); showGameOver(); return; }
  if (s.decisions.length) { showDecision(s.decisions[0]); return; }
  const ready = s.projects.find((p) => p.status === 'ready');
  if (ready) openLaunch(ready.id);
}

function contextualTips(s) {
  if (s.rp >= 40 && !s.tips.rp) tip('rp', 'You have research points to spend. Open the Research tab to unlock better components.');
  if (s.company.cash > 150000 && s.facilities.office === 0) tip('garage', 'You can afford a Small Office now (Company tab). More desks mean a bigger team.');
  if (s.stats.launches > 0 && s.staff.length === 1 && s.company.cash > 30000) tip('hire', 'Hire your first employees in the Staff tab. Engineers build better products; researchers unlock new tech.');
  const old = s.products.find((p) => p.owner === 'player' && p.active && s.week - p.launchWeek > 60 && p.lastProfit < 0);
  if (old) tip('old_product', `${old.name} is losing money. Cut its price or discontinue it from the Products tab.`);
  if (curYearInt(s) >= 1979 && !s.categories.cpu_chip) tip('cpu', 'A new market has opened: microprocessors! Unlock it in the Research tab.');
  if (s.company.cash < 0) tip('broke', 'You are out of cash. Borrow from the bank in the Company tab, cut costs, or launch something that sells.');
}

// ------------------------------------------------------------------ rendering

export function render(force = false) {
  const s = ctx.state;
  if (!s) return;
  const now = performance.now();
  if (!force && now - lastRender < 200) return;
  lastRender = now;
  renderTopbar(s);
  renderLeft(s);
  renderTabs(s);
}

function renderTopbar(s) {
  $('#tb-name').textContent = s.company.name;
  $('#tb-date').textContent = formatDate(s, s.week, true);
  const lw = s.lastWeek || { profit: 0 };
  const neg = s.company.cash < 0;
  patch($('#tb-stats'), `
    <div class="stat-pill ${neg ? 'alert' : ''}" title="Cash on hand"><span class="lbl">Cash</span><span class="val ${neg ? 'bad' : 'gold'}">${fmtMoney(s.company.cash)}</span></div>
    <div class="stat-pill" title="Profit last week"><span class="lbl">Profit / wk</span><span class="val ${lw.profit >= 0 ? 'good' : 'bad'}">${lw.profit >= 0 ? '+' : ''}${fmtMoney(lw.profit)}</span></div>
    <div class="stat-pill" title="Research points"><span class="lbl">Research</span><span class="val accent">${Math.floor(s.rp)} <small class="muted">RP</small></span></div>
    <div class="stat-pill" title="Brand reputation (0-100)"><span class="lbl">Brand</span><span class="val">${Math.round(s.company.brand)}</span></div>`);
  $$('.speed-btn').forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === ctx.speed));
}

function renderLeft(s) {
  const slots = G.projectSlots(s);
  const dev = G.devProjects(s);
  const projects = s.projects.map((p) => {
    const cat = CATEGORIES[p.category];
    if (p.status === 'ready') {
      return `<div class="proj ready" data-key="${p.id}"><div class="proj-head"><span class="proj-icon">${cat.icon}</span><span class="proj-name">${esc(p.name)}</span><span class="tag good">Ready</span></div>
        <button class="btn btn-good btn-block" data-action="launch" data-id="${p.id}">🚀 Set price & launch</button></div>`;
    }
    const frac = (p.weeksDone + (ctx.paused ? 0 : ctx.weekFrac)) / p.duration;
    return `<div class="proj" data-key="${p.id}"><div class="proj-head"><span class="proj-icon">${cat.icon}</span><span class="proj-name">${esc(p.name)}</span>
        <button class="btn btn-ghost btn-sm" data-action="cancel-project" data-id="${p.id}" title="Cancel">✕</button></div>
      ${bar(frac, 'lg')}
      <div class="row between tiny muted" style="margin-top:4px"><span>${cat.short} · week ${Math.min(p.weeksDone + 1, p.duration)} of ${p.duration}</span><span>ready ${formatDate(s, p.startWeek + p.duration)}</span></div></div>`;
  }).join('');
  const canStart = dev.length < slots;
  const news = s.news.slice(0, 5).map((n) => `<div class="news-item ${n.type}"><span class="when">${formatDate(s, n.week)}</span>${esc(n.text)}</div>`).join('');
  const badges = tabBadges(s);
  patch($('#left-panel'), `
    <button class="btn btn-primary new-product-btn" data-action="new-product" ${canStart ? '' : 'disabled'} title="${canStart ? 'Design a new product (N)' : 'All product teams are busy'}">＋ New Product</button>
    <div class="tiny muted center" style="margin-top:-4px">${dev.length}/${slots} product team${slots > 1 ? 's' : ''} busy${canStart ? '' : ' · upgrade your office for more'}</div>
    ${projects}
    <div class="team-strip">
      <div class="kpi"><div class="lbl">Design</div><div class="val">${devPower(s).toFixed(1)}</div><div class="sub tiny">DP / week</div></div>
      <div class="kpi"><div class="lbl">Research</div><div class="val">${researchPower(s, dev.length === 0).toFixed(1)}</div><div class="sub tiny">RP / week</div></div>
      <div class="kpi"><div class="lbl">Staff</div><div class="val">${s.staff.length}/${deskCount(s)}</div><div class="sub tiny">desks</div></div>
    </div>
    ${badges.research ? `<button class="btn btn-sm" data-action="tab" data-arg="research">🔬 You can afford new research</button>` : ''}
    <div class="mini-news">${news}</div>`);
  $('#office-label').textContent = `${officeName(s)} · ${formatDate(s)}`;
}

function renderTabs(s) {
  const badges = tabBadges(s);
  $$('#tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.arg === ctx.tab));
  $$('#tabs [data-badge]').forEach((b) => {
    const n = badges[b.dataset.badge];
    b.hidden = !n;
    b.textContent = n || '';
    b.className = `badge ${b.dataset.badge === 'products' ? 'bad' : ''}`;
  });
  const html = renderTab(s, ctx.tab);
  const content = $('#tab-content');
  if (html !== lastTabHtml) {
    patch(content, html);
    lastTabHtml = html;
  }
  for (const c of $$('canvas[data-chart]', content)) {
    const spec = charts[c.dataset.chart];
    if (!spec) continue;
    if (spec.type === 'share') shareChart(c, spec.opts);
    else lineChart(c, spec.opts);
  }
  for (const c of $$('canvas[data-avatar]', content)) {
    if (c.dataset.drawn === c.dataset.avatar) continue;
    const person = s.staff.find((x) => x.id === c.dataset.avatar) || s.candidates.find((x) => x.id === c.dataset.avatar);
    if (person) { drawAvatar(c, person); c.dataset.drawn = c.dataset.avatar; }
  }
}

// ------------------------------------------------------------------ decisions & game over

function showDecision(d) {
  const m = openModal({
    title: d.title,
    icon: '❗',
    closable: false,
    body: `<p>${esc(d.text)}</p>`,
    foot: d.options.map((o, i) => `<button class="btn ${i === 0 ? 'btn-primary' : ''}" data-opt="${i}">${esc(o.label)}</button>`).join(''),
  });
  m.foot.addEventListener('click', (e) => {
    const b = e.target.closest('[data-opt]');
    if (!b) return;
    m.close();
    perform(G.resolveDecision, d.id, Number(b.dataset.opt));
    setTimeout(checkInterrupts, 50);
  });
}

function showGameOver() {
  const s = ctx.state;
  const go = s.gameOver;
  const score = G.finalScore(s);
  let title, intro, icon;
  if (go.reason === 'bankrupt') {
    title = 'Bankrupt!'; icon = '💸';
    intro = `After ${Math.max(1, Math.round((s.week - s.startWeek) / WEEKS_PER_YEAR))} years, ${esc(s.company.name)} has run out of money. The creditors are taking the soldering irons.`;
  } else if (go.reason === 'sold') {
    title = 'Company Sold!'; icon = '🤝';
    intro = `You sold ${esc(s.company.name)} to ${esc(go.buyer)} for ${fmtMoney(go.value)} and retired to a private island.`;
  } else {
    title = 'The End of an Era'; icon = '🏆';
    const where = s.facilities.office > 0 ? `From a garage to a ${OFFICES[s.facilities.office].name.toLowerCase()}` : 'Without ever leaving the garage';
    intro = `It is ${curYearInt(s)}. ${where}, ${esc(s.company.name)} has left its mark on computing history.`;
  }
  const best = Object.entries(s.stats.peakShare).sort((a, b) => b[1] - a[1])[0];
  const scores = recordScore(s, score);
  const m = openModal({
    title, icon, size: 'medium', closable: false,
    body: `<p>${intro}</p>
      <div class="muted small center mt">Final score (company value × your ownership)</div>
      <div class="final-score">${fmtMoney(score)}</div>
      <div class="grid grid-2 mt">
        <div class="kpi"><div class="lbl">Products launched</div><div class="val">${s.stats.launches}</div></div>
        <div class="kpi"><div class="lbl">Units sold</div><div class="val">${fmtNum(s.stats.units)}</div></div>
        <div class="kpi"><div class="lbl">Lifetime revenue</div><div class="val">${fmtMoney(s.stats.revenue)}</div></div>
        <div class="kpi"><div class="lbl">Best market share</div><div class="val">${best ? `${fmtPct(best[1])} <span class="small muted">${CATEGORIES[best[0]].short}</span>` : '—'}</div></div>
        <div class="kpi"><div class="lbl">Best reviewed</div><div class="val" style="font-size:15px">${s.stats.bestProduct ? `${esc(s.stats.bestProduct)} (${s.stats.bestScore.toFixed(1)})` : '—'}</div></div>
        <div class="kpi"><div class="lbl">Achievements</div><div class="val">${Object.keys(s.achievements).length}</div></div>
      </div>
      <h4 class="mt mb">Hall of fame</h4>${scoresTable(scores, { name: s.company.name, score })}`,
    foot: `${go.reason === 'end' ? '<button class="btn" data-continue>Keep playing</button>' : ''}<button class="btn btn-primary" data-newgame>Back to title</button>`,
  });
  sfx(go.reason === 'bankrupt' ? 'bad' : 'achievement');
  const cont = m.foot.querySelector('[data-continue]');
  if (cont) cont.addEventListener('click', () => { G.continueEndless(s); m.close(); saveGame(); render(true); });
  m.foot.querySelector('[data-newgame]').addEventListener('click', () => {
    m.close();
    if (go.reason !== 'end') clearSave();
    exitToTitle();
  });
}

// ------------------------------------------------------------------ saving

let saveWarned = false;

export function saveGame() {
  const s = ctx.state;
  if (!s) return false;
  try {
    localStorage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch (err) {
    console.warn('Save failed', err);
    if (!saveWarned) {
      saveWarned = true;
      toast('Autosave failed', 'bad', 'Your browser blocked or filled up local storage. Use Menu → Export save to keep your progress.', '⚠️', 9000);
    }
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

function openMenu() {
  const m = openModal({
    title: 'Menu',
    icon: '☰',
    body: `<div class="col">
      <button class="btn" data-m="save">💾 Save now</button>
      <button class="btn" data-m="export">📤 Export save (copy text)</button>
      <button class="btn" data-m="help">❓ How to play</button>
      <button class="btn" data-m="title">🏠 Save & return to title</button>
      <div class="divider"></div>
      <div class="tiny muted">Keyboard: Space pause · 1/2/3 game speed · N new product · Esc close dialogs</div>
    </div>`,
    foot: '<button class="btn btn-primary" data-close>Resume</button>',
  });
  m.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const what = b.dataset.m;
    if (what === 'save') {
      const ok = saveGame();
      toast(ok ? 'Game saved.' : 'Could not save (storage full or blocked).', ok ? 'good' : 'bad');
      m.close();
    }
    if (what === 'export') { m.close(); openExport(); }
    if (what === 'help') { m.close(); openHelp(); }
    if (what === 'title') { saveGame(); closeAll(); exitToTitle(); }
  });
}

function openExport() {
  const data = serialize(ctx.state);
  const m = openModal({
    title: 'Export save',
    icon: '📤',
    size: 'medium',
    body: `<p class="small muted">Copy this text somewhere safe. Use "Import Save" on the title screen to restore it.</p><textarea class="input" readonly rows="10">${esc(data)}</textarea>`,
    foot: '<button class="btn" data-dl>Download file</button><button class="btn btn-primary" data-copy>Copy to clipboard</button>',
  });
  m.foot.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(data); toast('Copied!', 'good'); } catch {
      m.body.querySelector('textarea').select(); toast('Select the text and copy it manually.', 'info');
    }
  });
  m.foot.querySelector('[data-dl]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
    a.download = `${ctx.state.company.name.replace(/[^a-z0-9]+/gi, '_')}_${curYearInt(ctx.state)}.sav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

export function openHelp() {
  openModal({
    title: `How to play ${GAME_TITLE}`,
    icon: '❓',
    size: 'medium',
    body: `
      <p>You run a hardware company from 1977 to 2041. Design products, sell them, and grow from a garage into a tech giant.</p>
      <h4 class="mt">The loop</h4>
      <ol>
        <li><b>Design</b> a product with <b>＋ New Product</b>: pick a market, choose components and set the engineering focus and development time.</li>
        <li><b>Launch</b> it when development finishes. Pick a price using the profit chart, add marketing if you can afford it, then read the reviews.</li>
        <li><b>Sell.</b> Products earn money every week, but sales fade as rivals release newer tech. Cut prices or replace old products.</li>
        <li><b>Grow.</b> Hire staff, research new technology, upgrade your office, factory and labs, and enter new markets as they appear.</li>
      </ol>
      <h4 class="mt">What sells</h4>
      <ul>
        <li><b>Performance</b> compared to a typical product of the day. Newer components win, but they cost more.</li>
        <li><b>Price.</b> Budget, mainstream and enthusiast buyers each have their own idea of a fair price.</li>
        <li><b>Quality</b> comes from giving your engineers enough time. Rushed products get bad reviews and more returns.</li>
        <li><b>Brand</b> grows with market share, great reviews, marketing and marketers on staff.</li>
        <li><b>Balance:</b> mixing very old and very new parts creates bottlenecks.</li>
      </ul>
      <h4 class="mt">Tips</h4>
      <ul>
        <li>Engineers who have nothing to build help with research at 75% speed.</li>
        <li>Tech older than 6 years becomes a free industry standard. Prototype research gets you tech up to 2 years early.</li>
        <li>Your own factory makes products cheaper. Without one, contract partners build them at full cost.</li>
        <li>If you run out of cash the bank lends automatically up to your credit limit. Six weeks in the red means bankruptcy.</li>
      </ul>
      <p class="small muted">Keyboard: Space pause · 1/2/3 speed · N new product · Esc close dialogs.</p>`,
    foot: '<button class="btn btn-primary" data-close>Got it</button>',
  });
}

export function resetRenderCache() {
  lastTabHtml = '';
}
