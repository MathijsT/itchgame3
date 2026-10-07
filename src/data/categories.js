// Product categories: what you can build, what goes in it, and how big the market is.
// slots: [componentId, weight, costMult]
// demand: [year, potential buyers per week] keyframes (log-interpolated)
// price: [year, reference mainstream price] keyframes

export const CATEGORIES = {
  homecomputer: {
    name: 'Desktop Computer', short: 'Desktop', icon: '🖥️', year: 1977, portable: false, channel: 0.3,
    unlockName: 'Personal Computing', reqBase: 40, toolMult: 25, assembly: 50,
    slots: [['cpu', 0.3, 1], ['mem', 0.18, 1], ['storage', 0.14, 1], ['gfx', 0.14, 1], ['display', 0.08, 1], ['input', 0.08, 1], ['chassis', 0.08, 1]],
    demand: [[1977, 300], [1978, 800], [1980, 2500], [1982, 8000], [1984, 22000], [1987, 60000], [1990, 220000], [1995, 800000], [2000, 1800000], [2005, 2400000], [2010, 2500000], [2015, 1900000], [2020, 1700000], [2030, 1500000], [2041, 1400000]],
    price: [[1977, 1200], [1985, 1500], [1995, 1600], [2005, 900], [2015, 800], [2030, 900], [2041, 950]],
    namesSuffix: ['PC', 'Station', 'Desk', 'Pro', 'Tower', 'One'],
  },
  console: {
    name: 'Game Console', short: 'Console', icon: '🎮', year: 1977, portable: false, channel: 0.3,
    unlockName: 'Home Video Games', reqBase: 40, toolMult: 40, assembly: 20,
    slots: [['cpu', 0.16, 0.5], ['gfx', 0.32, 1], ['mem', 0.14, 0.6], ['media', 0.14, 1], ['input', 0.12, 0.6], ['chassis', 0.12, 0.5]],
    demand: [[1977, 1500], [1980, 6000], [1982, 18000], [1985, 15000], [1990, 80000], [1995, 180000], [2000, 350000], [2006, 700000], [2010, 900000], [2015, 800000], [2020, 1000000], [2030, 1000000], [2041, 1000000]],
    price: [[1977, 200], [1990, 180], [1995, 300], [2000, 300], [2006, 450], [2013, 400], [2020, 500], [2041, 550]],
    namesSuffix: ['Box', 'Station', 'System', 'Cube', 'Entertainment System', 'Arcade'],
  },
  cpu_chip: {
    name: 'Microprocessor', short: 'CPU', icon: '🔲', year: 1979, portable: false, channel: 0.15,
    unlockName: 'Microprocessor Design', reqBase: 35, toolMult: 250, assembly: 5,
    slots: [['node', 0.45, 1], ['cpu', 0.55, 0.35]],
    demand: [[1979, 1000], [1982, 6000], [1985, 25000], [1990, 120000], [1995, 500000], [2000, 1000000], [2010, 1300000], [2020, 1200000], [2041, 1100000]],
    price: [[1979, 200], [1990, 300], [2000, 250], [2010, 250], [2020, 350], [2030, 400], [2041, 420]],
    namesSuffix: ['Core', 'X', 'Chip', 'Engine', 'Thread', 'Zen'],
  },
  laptop: {
    name: 'Laptop', short: 'Laptop', icon: '💻', year: 1985, portable: true, channel: 0.3,
    unlockName: 'Portable Computing', reqBase: 55, toolMult: 35, assembly: 80,
    slots: [['cpu', 0.22, 1], ['mem', 0.12, 1], ['storage', 0.1, 1], ['display', 0.18, 1], ['battery', 0.14, 1], ['input', 0.1, 1], ['chassis', 0.14, 1]],
    demand: [[1985, 1000], [1988, 8000], [1990, 30000], [1995, 200000], [2000, 500000], [2005, 1300000], [2010, 3400000], [2015, 3300000], [2020, 4200000], [2030, 4000000], [2041, 3800000]],
    price: [[1985, 3000], [1995, 2500], [2005, 1200], [2012, 900], [2020, 1000], [2030, 1100], [2041, 1150]],
    namesSuffix: ['Book', 'Note', 'Air', 'Go', 'Blade', 'Folio'],
  },
  handheld: {
    name: 'Handheld Console', short: 'Handheld', icon: '🕹️', year: 1988, portable: true, channel: 0.3,
    unlockName: 'Handheld Gaming', reqBase: 35, toolMult: 40, assembly: 15,
    slots: [['soc', 0.28, 1], ['display', 0.22, 0.4], ['battery', 0.16, 0.5], ['media', 0.12, 1], ['input', 0.1, 0.6], ['chassis', 0.12, 0.5]],
    demand: [[1988, 10000], [1990, 80000], [1995, 120000], [2000, 250000], [2005, 450000], [2010, 350000], [2015, 180000], [2020, 350000], [2030, 300000], [2041, 300000]],
    price: [[1988, 100], [1998, 90], [2004, 150], [2011, 250], [2017, 300], [2022, 400], [2041, 420]],
    namesSuffix: ['Boy', 'Pocket', 'Go', 'Portable', 'Lynx', 'Deck'],
  },
  phone: {
    name: 'Mobile Phone', short: 'Phone', icon: '📱', year: 1990, portable: true, channel: 0.35,
    unlockName: 'Cellular Telephony', reqBase: 45, toolMult: 60, assembly: 15,
    slots: [['soc', 0.2, 1], ['display', 0.15, 0.3], ['battery', 0.15, 0.4], ['conn', 0.2, 1], ['camera', 0.1, 1], ['input', 0.1, 0.4], ['chassis', 0.1, 0.4]],
    demand: [[1990, 10000], [1992, 40000], [1995, 200000], [1998, 2000000], [2000, 7000000], [2005, 15000000], [2008, 22000000], [2012, 30000000], [2016, 32000000], [2020, 28000000], [2041, 27000000]],
    price: [[1990, 1500], [1995, 500], [2000, 200], [2006, 200], [2010, 350], [2015, 400], [2020, 500], [2041, 560]],
    namesSuffix: ['Phone', 'Talk', 'Fone', 'Mobile', 'Flip', 'Edge'],
  },
  gpu_card: {
    name: 'Graphics Card', short: 'GPU', icon: '🎴', year: 1995, portable: false, channel: 0.2,
    unlockName: '3D Accelerators', reqBase: 45, toolMult: 150, assembly: 15,
    slots: [['node', 0.3, 1], ['gfx', 0.5, 0.8], ['mem', 0.2, 0.8]],
    demand: [[1995, 20000], [1997, 80000], [2000, 200000], [2005, 550000], [2010, 750000], [2015, 800000], [2020, 900000], [2041, 900000]],
    price: [[1995, 200], [2000, 250], [2010, 250], [2018, 450], [2022, 600], [2030, 700], [2041, 720]],
    namesSuffix: ['Force', 'Voodoo', 'Radiance', 'Titan', 'Arc', 'Fury'],
  },
  tablet: {
    name: 'Tablet', short: 'Tablet', icon: '📲', year: 2009, portable: true, channel: 0.3,
    unlockName: 'Tablet Computing', reqBase: 50, toolMult: 40, assembly: 20,
    slots: [['soc', 0.25, 1], ['display', 0.25, 0.6], ['battery', 0.15, 0.6], ['storage', 0.1, 0.3], ['input', 0.1, 0.6], ['chassis', 0.15, 0.6]],
    demand: [[2009, 10000], [2010, 300000], [2012, 2500000], [2014, 4500000], [2018, 3200000], [2025, 3000000], [2041, 2800000]],
    price: [[2009, 600], [2015, 400], [2025, 450], [2041, 500]],
    namesSuffix: ['Pad', 'Tab', 'Slate', 'Canvas', 'Sheet'],
  },
  wearable: {
    name: 'Smartwatch', short: 'Watch', icon: '⌚', year: 2013, portable: true, channel: 0.3,
    unlockName: 'Wearable Tech', reqBase: 40, toolMult: 50, assembly: 10,
    slots: [['soc', 0.2, 0.5], ['display', 0.15, 0.1], ['battery', 0.25, 0.2], ['input', 0.2, 0.5], ['chassis', 0.2, 0.4]],
    demand: [[2013, 20000], [2015, 400000], [2018, 1500000], [2022, 2500000], [2030, 3500000], [2041, 4000000]],
    price: [[2013, 200], [2015, 300], [2025, 350], [2041, 350]],
    namesSuffix: ['Watch', 'Band', 'Pulse', 'Fit', 'Ring'],
  },
  vr: {
    name: 'VR Headset', short: 'VR', icon: '🥽', year: 2015, portable: true, channel: 0.3,
    unlockName: 'Virtual Reality', reqBase: 55, toolMult: 50, assembly: 25,
    slots: [['display', 0.3, 0.6], ['soc', 0.2, 1], ['input', 0.25, 1], ['chassis', 0.1, 0.6], ['battery', 0.15, 0.6]],
    demand: [[2015, 5000], [2016, 40000], [2020, 180000], [2024, 300000], [2030, 800000], [2041, 2000000]],
    price: [[2015, 600], [2020, 400], [2024, 500], [2041, 600]],
    namesSuffix: ['Vision', 'Rift', 'Visor', 'Lens', 'Quest'],
  },
  ai_chip: {
    name: 'AI Accelerator', short: 'AI Chip', icon: '🤖', year: 2016, portable: false, channel: 0.1,
    unlockName: 'AI Accelerators', reqBase: 70, toolMult: 40, assembly: 200,
    slots: [['node', 0.3, 3], ['npu', 0.45, 1], ['mem', 0.25, 8]],
    demand: [[2016, 500], [2019, 3000], [2022, 15000], [2024, 60000], [2028, 150000], [2035, 300000], [2041, 400000]],
    price: [[2016, 5000], [2020, 10000], [2023, 25000], [2030, 30000], [2041, 32000]],
    namesSuffix: ['Tensor', 'Neuron', 'Cortex', 'Synapse', 'Brain'],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

for (const id of CATEGORY_IDS) CATEGORIES[id].id = id;

function interp(keys, year, logScale) {
  if (year < keys[0][0]) return null;
  if (year >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [y0, v0] = keys[i];
    const [y1, v1] = keys[i + 1];
    if (year >= y0 && year < y1) {
      const f = (year - y0) / (y1 - y0);
      if (logScale) return Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * f);
      return v0 + (v1 - v0) * f;
    }
  }
  return keys[keys.length - 1][1];
}

/** Potential buyers per week (before events and difficulty). */
export function baseDemand(catId, year) {
  const v = interp(CATEGORIES[catId].demand, year, true);
  if (v === null) return 0;
  // markets that appear mid-game ramp in during their first year
  const start = CATEGORIES[catId].demand[0][0];
  if (start <= 1977) return v;
  return v * Math.min(1, 0.25 + (year - start) * 0.75);
}

export function refPrice(catId, year) {
  const keys = CATEGORIES[catId].price;
  const v = interp(keys, year, true);
  return v === null ? keys[0][1] : v;
}
