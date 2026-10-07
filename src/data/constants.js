// Core tuning constants shared by the simulation and the UI.

export const GAME_TITLE = 'Silicon Garage';
export const GAME_SUBTITLE = 'A Hardware Tycoon';
export const SAVE_VERSION = 1;

export const WEEKS_PER_MONTH = 4;
export const MONTHS_PER_YEAR = 12;
export const WEEKS_PER_YEAR = WEEKS_PER_MONTH * MONTHS_PER_YEAR;
export const BASE_YEAR = 1975; // reference year for performance numbers
export const END_YEAR = 2041; // the campaign ends on Jan 1st of this year

// Performance: one "tech year" is worth exp(PERF_K) in raw performance.
export const PERF_K = 0.3;
// Mainstream products use tech this many years old.
export const MAINSTREAM_LAG = 2;
// Tech older than this many years becomes a free industry standard.
export const COMMODITY_LAG = 6;

// Market model
export const BRAND_W = 0.9;
export const HYPE_W = 0.6;
export const NOVELTY_W = 0.45;
export const AGE_PENALTY = 0.18; // utility lost per year on the market
export const NEST_LAMBDA = 0.6;
export const OUTSIDE_UTILITY = 0.35;
// Extra penalty for pricing above what a segment considers normal: PRICE_CEILING * ln(p/ref)^2
export const PRICE_CEILING = 2.5;

export const SEGMENTS = [
  { id: 'budget', name: 'Budget', share: 0.45, alpha: 0.8, beta: 3.0, gamma: 1.2, priceMult: 0.6 },
  { id: 'mainstream', name: 'Mainstream', share: 0.4, alpha: 1.5, beta: 2.0, gamma: 1.6, priceMult: 1.0 },
  { id: 'enthusiast', name: 'Enthusiast', share: 0.15, alpha: 2.6, beta: 1.0, gamma: 1.9, priceMult: 1.9 },
];

// Development
export const DURATIONS = [
  { weeks: 6, name: 'Rushed' },
  { weeks: 10, name: 'Standard' },
  { weeks: 16, name: 'Thorough' },
  { weeks: 24, name: 'Perfectionist' },
];
// Researching tech before its historical year costs extra: [1 year early, 2 years early]
export const EARLY_RESEARCH_MULT = [2.5, 5];

// Share of each unit's retail price that never reaches you (retailers, carriers, distributors)
// is set per category. Returns & warranty cost (1 - quality) * WARRANTY_RATE of revenue.
export const WARRANTY_RATE = 0.12;

export const LOAN_RATE = 0.09; // per year
export const BANKRUPT_WEEKS = 6;

export const DIFFICULTIES = {
  easy: { name: 'Easy', cash: 2.0, rivalLag: 0.6, rivalQuality: -0.05, brand: 22, demand: 1.15 },
  normal: { name: 'Normal', cash: 1.0, rivalLag: 0, rivalQuality: 0, brand: 15, demand: 1.0 },
  hard: { name: 'Hard', cash: 0.6, rivalLag: -0.35, rivalQuality: 0.05, brand: 8, demand: 0.9 },
};

export const START_ERAS = {
  1977: { year: 1977, name: 'Garage Days (1977)', cash: 50000, office: 0, staff: 0 },
  1992: { year: 1992, name: 'The PC Boom (1992)', cash: 3000000, office: 1, staff: 3 },
  2007: { year: 2007, name: 'Mobile Revolution (2007)', cash: 60000000, office: 2, staff: 5 },
};
