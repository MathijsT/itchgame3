// Scripted industry events. month is 0-based.
// effects: { type: 'demand', cats: [...] | 'all', mult, weeks } or { type: 'cost', comps: [...] | 'all', mult, weeks }

export const SCRIPTED_EVENTS = [
  { id: 'trinity', year: 1977, month: 5, title: 'The Home Computer Trinity', text: 'Three affordable home computers hit the shelves this year. Analysts think this "personal computer" fad might actually last.' },
  { id: 'ibn_pc', year: 1981, month: 7, title: 'IBN Enters the PC Market', text: 'Industry giant IBN launches its own personal computer. Businesses are suddenly paying attention.', effects: [{ type: 'demand', cats: ['homecomputer'], mult: 1.2, weeks: 96 }] },
  { id: 'crash83', year: 1983, month: 5, title: 'Video Game Crash!', text: 'A flood of low-quality games has crushed consumer trust. Console sales are collapsing.', effects: [{ type: 'demand', cats: ['console'], mult: 0.35, weeks: 100 }] },
  { id: 'gui', year: 1984, month: 0, title: 'The GUI Revolution', text: 'Mouse-driven graphical interfaces are the hot new thing. "Mouse & GUI" input tech will matter soon.' },
  { id: 'mem_war', year: 1985, month: 3, title: 'Memory Chip Price War', text: 'Overcapacity in DRAM fabs sends memory prices tumbling.', effects: [{ type: 'cost', comps: ['mem'], mult: 0.7, weeks: 48 }] },
  { id: 'dram_short', year: 1988, month: 2, title: 'DRAM Shortage', text: 'Trade disputes squeeze the memory supply. Memory costs soar.', effects: [{ type: 'cost', comps: ['mem'], mult: 1.5, weeks: 48 }] },
  { id: 'www', year: 1991, month: 7, title: 'The World Wide Web', text: 'A physicist in Geneva publishes something called the "World Wide Web". Probably nothing.' },
  { id: 'internet', year: 1995, month: 7, title: 'The Internet Goes Mainstream', text: 'Everyone wants to get online. PC and laptop demand is surging.', effects: [{ type: 'demand', cats: ['homecomputer', 'laptop'], mult: 1.2, weeks: 96 }] },
  { id: 'dotcom', year: 1998, month: 0, title: 'Dot-Com Boom', text: 'Venture capital is flowing freely and every business needs computers.', effects: [{ type: 'demand', cats: ['homecomputer', 'laptop', 'cpu_chip'], mult: 1.25, weeks: 140 }] },
  { id: 'dotcom_crash', year: 2001, month: 2, title: 'Dot-Com Crash', text: 'The bubble has burst. Corporate IT spending is frozen.', effects: [{ type: 'demand', cats: ['homecomputer', 'laptop', 'cpu_chip'], mult: 0.75, weeks: 72 }] },
  { id: 'smartphone', year: 2007, month: 0, title: 'The Smartphone Revolution', text: 'Touchscreen phones with real web browsers are here. Multi-touch input is suddenly essential for phones.' },
  { id: 'gfc', year: 2008, month: 8, title: 'Global Financial Crisis', text: 'Banks are failing and consumers are tightening their belts.', effects: [{ type: 'demand', cats: 'all', mult: 0.8, weeks: 72 }] },
  { id: 'floods', year: 2011, month: 9, title: 'Hard Drive Factory Floods', text: 'Floods knock out a big chunk of the world\'s hard drive production.', effects: [{ type: 'cost', comps: ['storage'], mult: 1.6, weeks: 36 }] },
  { id: 'crypto', year: 2017, month: 5, title: 'Crypto Mining Craze', text: 'Miners are buying every graphics card they can find.', effects: [{ type: 'demand', cats: ['gpu_card'], mult: 1.8, weeks: 36 }] },
  { id: 'crypto_crash', year: 2018, month: 3, title: 'Crypto Winter', text: 'Coin prices crash and used mining cards flood the market.', effects: [{ type: 'demand', cats: ['gpu_card'], mult: 0.7, weeks: 24 }] },
  { id: 'pandemic', year: 2020, month: 2, title: 'The World Works From Home', text: 'A pandemic sends everyone home. Laptops, consoles and webcams are flying off the shelves.', effects: [{ type: 'demand', cats: ['laptop', 'homecomputer', 'console', 'tablet'], mult: 1.3, weeks: 72 }] },
  { id: 'chip_short', year: 2021, month: 0, title: 'Global Chip Shortage', text: 'Supply chains are snarled. Component costs are up across the board.', effects: [{ type: 'cost', comps: 'all', mult: 1.3, weeks: 72 }] },
  { id: 'gen_ai', year: 2023, month: 0, title: 'The Generative AI Boom', text: 'Chatbots are everywhere and every company wants AI compute.', effects: [{ type: 'demand', cats: ['ai_chip'], mult: 1.6, weeks: 144 }] },
  { id: 'quantum', year: 2029, month: 4, title: 'Quantum Advantage Achieved', text: 'Researchers demonstrate a useful quantum computation. The hype machine is spinning up.' },
  { id: 'spatial', year: 2032, month: 6, title: 'Spatial Computing Goes Mainstream', text: 'Lightweight headsets finally go mainstream.', effects: [{ type: 'demand', cats: ['vr'], mult: 1.4, weeks: 96 }] },
];
