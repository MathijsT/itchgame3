// Company-wide upgrades bought with research points.
// effect keys: dp (dev speed mult add), rp (research mult add), cost (unit cost mult add),
// quality (flat), utility (flat market appeal), marketing (campaign mult add), brand (brand target add)

export const PERKS = [
  { id: 'cad', name: 'CAD Workstations', year: 1979, mult: 3, desc: '+15% development speed.', effect: { dp: 0.15 } },
  { id: 'method', name: 'Scientific Method', year: 1979, mult: 3, desc: '+15% research points.', effect: { rp: 0.15 } },
  { id: 'focus_groups', name: 'Focus Groups', year: 1981, mult: 3, desc: 'Products are a bit more appealing to buyers.', effect: { utility: 0.1 } },
  { id: 'qa_lab', name: 'QA Lab', year: 1982, mult: 4, desc: '+5% product quality.', effect: { quality: 0.05 } },
  { id: 'lean', name: 'Lean Manufacturing', year: 1984, mult: 4, desc: '-5% unit costs.', effect: { cost: -0.05 } },
  { id: 'ad_agency', name: 'In-House Ad Agency', year: 1986, mult: 4, desc: '+25% marketing effectiveness.', effect: { marketing: 0.25 } },
  { id: 'six_sigma', name: 'Six Sigma', year: 1988, mult: 4, desc: '+4% product quality.', effect: { quality: 0.04 } },
  { id: 'agile', name: 'Agile Workflows', year: 1991, mult: 4, desc: '+15% development speed.', effect: { dp: 0.15 } },
  { id: 'supply_chain', name: 'Supply Chain Software', year: 1993, mult: 4, desc: '-5% unit costs.', effect: { cost: -0.05 } },
  { id: 'supercomputer', name: 'Supercomputer Cluster', year: 1995, mult: 4, desc: '+20% research points.', effect: { rp: 0.2 } },
  { id: 'global_dist', name: 'Global Distribution', year: 1996, mult: 4, desc: 'Products are more appealing worldwide.', effect: { utility: 0.15 } },
  { id: 'ambassadors', name: 'Brand Ambassadors', year: 1998, mult: 4, desc: 'Brand reputation grows higher.', effect: { brand: 4 } },
  { id: 'robotics', name: 'Robotic Assembly', year: 2000, mult: 4, desc: '-6% unit costs.', effect: { cost: -0.06 } },
  { id: 'auto_test', name: 'Automated Testing', year: 2003, mult: 4, desc: '+5% product quality.', effect: { quality: 0.05 } },
  { id: 'viral', name: 'Viral Marketing', year: 2008, mult: 4, desc: '+30% marketing effectiveness.', effect: { marketing: 0.3 } },
  { id: 'cloud_sim', name: 'Cloud Simulation', year: 2010, mult: 4, desc: '+20% development speed.', effect: { dp: 0.2 } },
  { id: 'green', name: 'Sustainability Program', year: 2013, mult: 4, desc: 'Brand reputation grows higher.', effect: { brand: 4 } },
  { id: 'ai_design', name: 'AI-Assisted Design', year: 2022, mult: 4, desc: '+30% development speed.', effect: { dp: 0.3 } },
  { id: 'ai_research', name: 'AI Research Agents', year: 2024, mult: 4, desc: '+30% research points.', effect: { rp: 0.3 } },
  { id: 'digital_twin', name: 'Digital Twin Factories', year: 2027, mult: 4, desc: '-7% unit costs.', effect: { cost: -0.07 } },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));
