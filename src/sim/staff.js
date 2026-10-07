import { FIRST_NAMES, LAST_NAMES, STAFF_COLORS, SKIN_TONES, HAIR_COLORS } from '../data/names.js';
import { OFFICES, LABS } from '../data/facilities.js';
import { rand, randInt, pick, clamp, curYear, eraMult, newId } from './util.js';
import { perkEffect } from './tech.js';

export const MAX_SKILL = 100;

export function staffSalary(skill, year) {
  const base = 600 * eraMult(year); // fully loaded weekly cost
  return Math.round(base * (0.5 + Math.pow(skill / 50, 1.5) * 0.7));
}

export const hireFee = (c) => c.salary * 4;
export const trainCost = (s, year) => Math.round(staffSalary(Math.max(30, s.skill), year) * 8);

function makePerson(state) {
  return {
    name: `${pick(state, FIRST_NAMES)} ${pick(state, LAST_NAMES)}`,
    shirt: pick(state, STAFF_COLORS),
    skin: pick(state, SKIN_TONES),
    hair: pick(state, HAIR_COLORS),
    hairStyle: randInt(state, 0, 3),
  };
}

export function makeFounder(state, name) {
  return {
    id: 'founder',
    ...makePerson(state),
    name: name || 'You',
    role: 'engineer',
    skill: 50,
    salary: 0,
    founder: true,
    hiredWeek: state.week,
    shirt: '#9f7aea',
  };
}

export function makeCandidate(state, role) {
  const roles = ['engineer', 'engineer', 'researcher', 'researcher', 'marketer'];
  const r = role || pick(state, roles);
  const prestige = state.company.brand * 0.25 + state.facilities.office * 3;
  const skill = Math.round(clamp(18 + rand(state) * 38 + prestige + (rand(state) < 0.1 ? 15 : 0), 12, 96));
  return {
    id: newId(state, 'c'),
    ...makePerson(state),
    role: r,
    skill,
    salary: staffSalary(skill, curYear(state)),
  };
}

export function refreshCandidates(state) {
  state.candidates = [makeCandidate(state, 'engineer'), makeCandidate(state, 'researcher'), makeCandidate(state), makeCandidate(state)];
  state.candidatesWeek = state.week;
}

export const deskCount = (state) => OFFICES[state.facilities.office].desks;

export function labMult(state) {
  return LABS[state.facilities.lab].mult;
}

/** Development points per week from all engineers. */
export function devPower(state) {
  let p = 0;
  for (const s of state.staff) if (s.role === 'engineer') p += s.skill / 10;
  const lab = 1 + (labMult(state) - 1) * 0.5;
  return p * lab * (1 + perkEffect(state, 'dp'));
}

/** Research points per week. Idle engineers tinker at 75% speed. */
export function researchPower(state, engineersIdle) {
  let p = 0;
  for (const s of state.staff) {
    if (s.role === 'researcher') p += s.skill / 10;
    else if (s.role === 'engineer' && engineersIdle) p += s.skill / 13.3;
  }
  return p * labMult(state) * (1 + perkEffect(state, 'rp'));
}

/** Sum of marketer skill / 100. */
export function marketingPower(state) {
  let p = 0;
  for (const s of state.staff) if (s.role === 'marketer') p += s.skill / 100;
  return p;
}

export function marketingMult(state) {
  return 1 + Math.min(1.5, marketingPower(state) * 0.35) + perkEffect(state, 'marketing');
}

export function weeklyStaff(state) {
  const year = curYear(state);
  for (const s of state.staff) {
    s.skill = Math.min(MAX_SKILL, s.skill + 0.05 * (1 - s.skill / 110));
    // yearly raise to market rate
    if (!s.founder && (state.week - s.hiredWeek) % 48 === 0 && state.week !== s.hiredWeek) {
      s.salary = Math.max(s.salary, staffSalary(s.skill, year));
    }
  }
  if (state.week - state.candidatesWeek >= 12) refreshCandidates(state);
}

export function payroll(state) {
  return state.staff.reduce((a, s) => a + s.salary, 0);
}
