export const OFFICES = [
  { name: 'Garage', desks: 3, rent: 150, cost: 0, projects: 1, desc: 'Where all great hardware companies start.' },
  { name: 'Small Office', desks: 6, rent: 2500, cost: 120000, projects: 1, desc: 'A real office with a real coffee machine.' },
  { name: 'Office Floor', desks: 10, rent: 15000, cost: 1500000, projects: 2, desc: 'Room for two product teams.' },
  { name: 'Corporate HQ', desks: 16, rent: 120000, cost: 25000000, projects: 2, desc: 'Glass, steel and a lobby fountain.' },
  { name: 'Tech Campus', desks: 24, rent: 600000, cost: 300000000, projects: 3, desc: 'Nap pods, a gym and three product teams.' },
];

export const FACTORIES = [
  { name: 'Contract Manufacturing', capacity: 0, discount: 0, upkeep: 0, cost: 0, desc: 'Partners build everything for you at full price.' },
  { name: 'Assembly Line', capacity: 2000, discount: 0.12, upkeep: 2000, cost: 250000, desc: 'Build up to 2K units/week yourself, 12% cheaper.' },
  { name: 'Factory', capacity: 30000, discount: 0.18, upkeep: 40000, cost: 6000000, desc: 'Build up to 30K units/week, 18% cheaper.' },
  { name: 'Mega Factory', capacity: 400000, discount: 0.24, upkeep: 500000, cost: 120000000, desc: 'Build up to 400K units/week, 24% cheaper.' },
  { name: 'Gigafactory', capacity: 5000000, discount: 0.3, upkeep: 6000000, cost: 2500000000, desc: 'Build up to 5M units/week, 30% cheaper.' },
];

export const LABS = [
  { name: 'Workbench', mult: 1.0, upkeep: 0, cost: 0, desc: 'A soldering iron and a dream.' },
  { name: 'Research Lab', mult: 1.25, upkeep: 1000, cost: 80000, desc: '+25% research, +12% development.' },
  { name: 'R&D Center', mult: 1.6, upkeep: 25000, cost: 4000000, desc: '+60% research, +30% development.' },
  { name: 'Advanced Labs', mult: 2.1, upkeep: 300000, cost: 80000000, desc: '+110% research, +55% development.' },
  { name: 'Skunkworks', mult: 2.8, upkeep: 3000000, cost: 1500000000, desc: '+180% research, +90% development.' },
];

export const CAMPAIGNS = [
  { id: 'magazine', name: 'Magazine Ads', year: 1977, cost: 4000, hype: 0.18, brand: 0.3 },
  { id: 'tradeshow', name: 'Trade Show Booth', year: 1977, cost: 15000, hype: 0.3, brand: 1 },
  { id: 'tv', name: 'TV Commercials', year: 1980, cost: 120000, hype: 0.5, brand: 2 },
  { id: 'web', name: 'Web Banner Blitz', year: 1996, cost: 60000, hype: 0.35, brand: 1 },
  { id: 'keynote', name: 'Keynote Launch Event', year: 1998, cost: 1500000, hype: 0.8, brand: 4 },
  { id: 'influencers', name: 'Influencer Campaign', year: 2009, cost: 300000, hype: 0.55, brand: 2 },
];

export const ROLES = {
  engineer: { name: 'Engineer', icon: '🛠️', color: '#5ca8e8', desc: 'Designs products (development points).' },
  researcher: { name: 'Researcher', icon: '🔬', color: '#7bd389', desc: 'Generates research points.' },
  marketer: { name: 'Marketer', icon: '📣', color: '#f6ad55', desc: 'Boosts marketing and brand growth.' },
};
