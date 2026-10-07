import { SCRIPTED_EVENTS } from '../data/events.js';
import { WEEKS_PER_YEAR, WEEKS_PER_MONTH } from '../data/constants.js';
import { rand, chance, pick, curYear, dateParts, newId, eraMult } from './util.js';
import { addNews, notify, cue } from './news.js';
import { researchPower } from './staff.js';
import { fmtMoney } from './format.js';

export function scriptedEventsTick(state) {
  const { year, month } = dateParts(state);
  const inMonth = state.week % WEEKS_PER_MONTH === 0;
  if (!inMonth) return;
  for (const ev of SCRIPTED_EVENTS) {
    if (state.firedEvents[ev.id]) continue;
    if (ev.year < year || (ev.year === year && ev.month <= month)) {
      state.firedEvents[ev.id] = true;
      // events far in the past (later start eras) are skipped silently
      if (ev.year < year - 1) continue;
      for (const eff of ev.effects || []) {
        state.effects.push({ ...eff, until: state.week + eff.weeks, source: ev.id });
      }
      addNews(state, `${ev.title}: ${ev.text}`, 'event');
      notify(state, ev.title, 'event', { body: ev.text });
      cue(state, 'event');
    }
  }
}

export function expireEffects(state) {
  state.effects = state.effects.filter((e) => e.until === undefined || e.until > state.week);
}

function playerActiveProducts(state) {
  return state.products.filter((p) => p.owner === 'player' && p.active);
}

function recentRevenue(state, weeks) {
  const h = state.history.weekly;
  let sum = 0;
  for (let i = Math.max(0, h.length - weeks); i < h.length; i++) sum += h[i].revenue;
  return sum;
}

function weeklyRP(state) {
  return Math.max(4, researchPower(state, false));
}

// Random events. make() returns a decision (needs player input) or null (applied immediately).
const RANDOM_EVENTS = [
  {
    kind: 'poach', weight: 3,
    cond: (s) => s.staff.some((x) => !x.founder),
    make: (s) => {
      const target = s.staff.filter((x) => !x.founder).sort((a, b) => b.skill - a.skill)[0];
      const raise = Math.round(target.salary * 0.3);
      return {
        title: 'Headhunter Alert',
        text: `A rival is trying to poach ${target.name} (skill ${Math.round(target.skill)}). Match their offer with a ${fmtMoney(raise)}/week raise?`,
        options: [{ label: `Give a raise (+${fmtMoney(raise)}/wk)` }, { label: `Let ${target.name.split(' ')[0]} go` }],
        data: { staffId: target.id, raise },
      };
    },
  },
  {
    kind: 'investor', weight: 2,
    cond: (s) => s.company.equity > 0.55 && curYear(s) < 2005 && s.company.cash < 3e6 * eraMult(curYear(s)),
    make: (s) => {
      const amount = Math.round(Math.max(150000 * eraMult(curYear(s)), recentRevenue(s, 48) * 0.6) / 1000) * 1000;
      return {
        title: 'Venture Capital Offer',
        text: `An investor offers ${fmtMoney(amount)} in exchange for 10% of your company. Your final score is based on the share of the company you own.`,
        options: [{ label: `Accept ${fmtMoney(amount)}` }, { label: 'Decline' }],
        data: { amount },
      };
    },
  },
  {
    kind: 'supplier', weight: 3,
    cond: (s) => s.lastWeek && s.lastWeek.cogs > 2000 && !s.effects.some((e) => e.type === 'playerCost'),
    make: (s) => {
      const fee = Math.round(s.lastWeek.cogs * 3.5);
      return {
        title: 'Bulk Component Deal',
        text: `A supplier offers a long-term contract: pay ${fmtMoney(fee)} up front and your unit costs drop 8% for a year.`,
        options: [{ label: `Sign (${fmtMoney(fee)})` }, { label: 'No thanks' }],
        data: { fee },
      };
    },
  },
  {
    kind: 'patent', weight: 2,
    cond: (s) => playerActiveProducts(s).length > 0 && recentRevenue(s, 12) > 50000,
    make: (s) => {
      const amount = Math.round(recentRevenue(s, 12) * 0.04 / 100) * 100 + 5000;
      return {
        title: 'Patent Troll',
        text: `A shell company claims your products infringe a vague patent on "a computing box with buttons". Settle for ${fmtMoney(amount)}, or fight in court (about 60% chance to win, but losing costs triple).`,
        options: [{ label: `Settle (${fmtMoney(amount)})` }, { label: 'Fight in court' }],
        data: { amount },
      };
    },
  },
  {
    kind: 'recall', weight: 4,
    cond: (s) => playerActiveProducts(s).some((p) => p.quality < 0.5 && s.week - p.launchWeek < 60),
    make: (s) => {
      const p = playerActiveProducts(s).filter((x) => x.quality < 0.5).sort((a, b) => a.quality - b.quality)[0];
      const cost = Math.round((p.unitsTotal * p.price * 0.08 + 5000) / 100) * 100;
      return {
        title: 'Defect Reports',
        text: `Customers report overheating ${p.name} units. A voluntary recall would cost ${fmtMoney(cost)}. Ignoring it could seriously hurt your reputation.`,
        options: [{ label: `Recall (${fmtMoney(cost)})` }, { label: 'Ignore it' }],
        data: { productId: p.id, cost },
      };
    },
  },
  {
    kind: 'celebrity', weight: 2,
    cond: (s) => playerActiveProducts(s).length > 0 && curYear(s) > 1980,
    make: (s) => {
      const p = playerActiveProducts(s).sort((a, b) => b.launchWeek - a.launchWeek)[0];
      const cost = Math.round(Math.max(20000 * eraMult(curYear(s)), p.lastUnits * p.price * 0.6) / 1000) * 1000;
      return {
        title: 'Celebrity Endorsement',
        text: `A famous pop star wants to be seen using the ${p.name}, for a fee of ${fmtMoney(cost)}.`,
        options: [{ label: `Sign the deal (${fmtMoney(cost)})` }, { label: 'Pass' }],
        data: { productId: p.id, cost },
      };
    },
  },
  {
    kind: 'university', weight: 2,
    cond: () => true,
    make: (s) => {
      const rp = Math.round(weeklyRP(s) * 8);
      const cost = Math.round(rp * 400 * eraMult(curYear(s)) / 1000) * 1000;
      return {
        title: 'University Partnership',
        text: `A university lab offers a joint research program: ${fmtMoney(cost)} for about ${rp} research points.`,
        options: [{ label: `Fund it (${fmtMoney(cost)})` }, { label: 'Decline' }],
        data: { rp, cost },
      };
    },
  },
  {
    kind: 'hackathon', weight: 2,
    cond: (s) => s.staff.length >= 3,
    make: (s) => {
      const cost = Math.round(s.staff.length * 1500 * eraMult(curYear(s)) / 100) * 100;
      return {
        title: 'Hackathon Weekend',
        text: `Your staff want to host a weekend hackathon. Pizza, prizes and venue: ${fmtMoney(cost)}. Everyone would learn a lot.`,
        options: [{ label: `Host it (${fmtMoney(cost)})` }, { label: 'Not now' }],
        data: { cost },
      };
    },
  },
  {
    kind: 'buyout', weight: 1,
    cond: (s) => curYear(s) > 1988 && s.company.cash > 5e6 && !s.flags.buyoutOffered,
    make: (s) => {
      s.flags.buyoutOffered = true;
      const value = Math.round(companyValue(s) * 1.8 / 1e5) * 1e5;
      const buyer = pick(s, ['IBN', 'Macrosoft', 'Sunsong', 'Intol', 'Pear Computer']);
      return {
        title: 'Acquisition Offer',
        text: `${buyer} offers to buy your company for ${fmtMoney(value)}. Accepting ends the game and you walk away with your share.`,
        options: [{ label: `Sell for ${fmtMoney(value)}` }, { label: 'Never!' }],
        data: { value, buyer },
      };
    },
  },
  // immediate events
  {
    kind: 'press', weight: 3,
    cond: (s) => playerActiveProducts(s).length > 0,
    apply: (s) => {
      s.company.brand = Math.min(100, s.company.brand + 2.5);
      addNews(s, `A glowing magazine profile puts ${s.company.name} on the map. Brand +2.5`, 'good');
      notify(s, 'Magazine feature! Brand +2.5', 'good');
    },
  },
  {
    kind: 'eureka', weight: 3,
    cond: (s) => s.staff.some((x) => x.role === 'researcher' || x.founder),
    apply: (s) => {
      const rp = Math.round(weeklyRP(s) * 4);
      s.rp += rp;
      const who = pick(s, s.staff).name;
      addNews(s, `Eureka! ${who} had a breakthrough in the shower. +${rp} RP`, 'good');
      notify(s, `Eureka! +${rp} research points`, 'good');
    },
  },
  {
    kind: 'fire', weight: 2,
    cond: (s) => s.facilities.factory > 0 && !s.effects.some((e) => e.type === 'factoryDown'),
    apply: (s) => {
      s.effects.push({ type: 'factoryDown', until: s.week + 6 });
      addNews(s, 'A fire has shut down your production line for 6 weeks. Partners will cover production at full cost.', 'bad');
      notify(s, 'Factory fire! Production line offline for 6 weeks.', 'bad');
      cue(s, 'bad');
    },
  },
  {
    kind: 'viral', weight: 2,
    cond: (s) => playerActiveProducts(s).length > 0 && curYear(s) > 1995,
    apply: (s) => {
      const p = pick(s, playerActiveProducts(s));
      p.hype = Math.min(2, p.hype + 0.4);
      addNews(s, `A video of the ${p.name} goes viral. Hype +0.4`, 'good');
      notify(s, `${p.name} went viral!`, 'good');
    },
  },
];

export function randomEventsTick(state) {
  if (state.week - state.lastRandomEvent < 14) return;
  if (state.week < 20) return;
  if (!chance(state, 0.03)) return;
  const options = RANDOM_EVENTS.filter((e) => e.cond(state));
  if (!options.length) return;
  const total = options.reduce((a, e) => a + e.weight, 0);
  let r = rand(state) * total;
  let ev = options[0];
  for (const e of options) { r -= e.weight; if (r <= 0) { ev = e; break; } }
  state.lastRandomEvent = state.week;
  if (ev.apply) { ev.apply(state); return; }
  const d = ev.make(state);
  if (!d) return;
  state.decisions.push({ id: newId(state, 'd'), kind: ev.kind, ...d });
  cue(state, 'event');
}

function pay(state, amount, bucket = 'other') {
  state.company.cash -= amount;
  state.thisWeek[bucket] = (state.thisWeek[bucket] || 0) + amount;
}

export function resolveDecision(state, decisionId, optionIndex) {
  const idx = state.decisions.findIndex((d) => d.id === decisionId);
  if (idx < 0) return;
  const d = state.decisions[idx];
  state.decisions.splice(idx, 1);
  const yes = optionIndex === 0;
  const data = d.data || {};
  switch (d.kind) {
    case 'poach': {
      const s = state.staff.find((x) => x.id === data.staffId);
      if (!s) break;
      if (yes) { s.salary += data.raise; notify(state, `${s.name} stays. Loyalty restored.`, 'good'); }
      else { state.staff = state.staff.filter((x) => x.id !== s.id); addNews(state, `${s.name} left for a rival.`, 'bad'); }
      break;
    }
    case 'investor':
      if (yes) {
        state.company.cash += data.amount;
        state.company.equity = Math.max(0.05, state.company.equity * 0.9);
        addNews(state, `Raised ${fmtMoney(data.amount)} from venture capitalists.`, 'good');
        cue(state, 'cash');
      }
      break;
    case 'supplier':
      if (yes) {
        pay(state, data.fee, 'cogs');
        state.effects.push({ type: 'playerCost', mult: 0.92, until: state.week + WEEKS_PER_YEAR });
        notify(state, 'Supplier deal signed: -8% unit costs for a year.', 'good');
      }
      break;
    case 'patent':
      if (yes) pay(state, data.amount);
      else if (chance(state, 0.6)) { addNews(state, 'You won the patent case! The judge was not amused by the troll.', 'good'); notify(state, 'Patent case won!', 'good'); }
      else { pay(state, data.amount * 3); addNews(state, `Lost the patent case. Paid ${fmtMoney(data.amount * 3)}.`, 'bad'); notify(state, 'Patent case lost.', 'bad'); }
      break;
    case 'recall': {
      const p = state.products.find((x) => x.id === data.productId);
      if (yes) {
        pay(state, data.cost);
        state.company.brand = Math.max(0, state.company.brand - 1);
        if (p) p.quality = Math.min(0.99, p.quality + 0.12);
        addNews(state, `Recalled defective ${p ? p.name : 'units'}. Customers appreciate the honesty.`, 'info');
      } else {
        state.company.brand = Math.max(0, state.company.brand - 8);
        if (p) p.hype = Math.max(0, p.hype - 0.5);
        addNews(state, `Outrage over defective ${p ? p.name : 'products'}! Brand -8`, 'bad');
        cue(state, 'bad');
      }
      break;
    }
    case 'celebrity': {
      const p = state.products.find((x) => x.id === data.productId);
      if (yes && p) { pay(state, data.cost, 'marketing'); p.hype = Math.min(2, p.hype + 0.6); state.company.brand = Math.min(100, state.company.brand + 1.5); }
      break;
    }
    case 'university':
      if (yes) { pay(state, data.cost); state.rp += data.rp; }
      break;
    case 'hackathon':
      if (yes) { pay(state, data.cost); for (const s of state.staff) s.skill = Math.min(100, s.skill + 3); notify(state, 'Hackathon done! All staff +3 skill.', 'good'); }
      break;
    case 'buyout':
      if (yes) {
        state.gameOver = { reason: 'sold', value: data.value, buyer: data.buyer, week: state.week };
      } else {
        state.company.brand = Math.min(100, state.company.brand + 2);
      }
      break;
    default:
      break;
  }
}

/** Rough company value used for score and buyout offers. */
export function companyValue(state) {
  const h = state.history.weekly;
  let profit = 0;
  for (let i = Math.max(0, h.length - WEEKS_PER_YEAR); i < h.length; i++) profit += h[i].profit;
  const annualProfit = profit * (WEEKS_PER_YEAR / Math.max(1, Math.min(h.length, WEEKS_PER_YEAR)));
  return Math.max(0, state.company.cash - state.company.loan + state.company.assets * 0.5 + Math.max(0, annualProfit) * 8 + state.company.brand * 5000 * eraMult(curYear(state)));
}
