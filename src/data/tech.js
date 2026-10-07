// Component technologies. Each tier: [name, year, unit cost at introduction ($), flags]
// flags: 'f' = only for stationary products, 'p' = only for portable products.

import { BASE_YEAR, PERF_K } from './constants.js';

/** Research point cost of technology from a given year: steep early, flatter later. */
export function rpForYear(year) {
  const early = 1.13 ** (Math.min(year, 1990) - 1978);
  const late = 1.072 ** Math.max(0, year - 1990);
  return 70 * early * late;
}

const RAW = {
  cpu: {
    name: 'Processor', icon: '🧠', desc: 'Central processing unit. Raw computing power.',
    tiers: [
      ['8-bit 1 MHz', 1975, 60], ['8-bit 2 MHz', 1977, 70], ['8-bit 4 MHz', 1979, 80],
      ['16-bit 5 MHz', 1981, 110], ['16-bit 8 MHz', 1983, 130], ['32-bit 16 MHz', 1986, 180],
      ['32-bit 33 MHz', 1989, 200], ['Pipelined 50 MHz', 1991, 220], ['Superscalar 66 MHz', 1993, 240],
      ['Out-of-Order 150 MHz', 1995, 250], ['SIMD 300 MHz', 1997, 250], ['Deep Pipeline 600 MHz', 1999, 240],
      ['1.4 GHz', 2001, 230], ['3 GHz Hyper-Threaded', 2003, 230], ['64-bit Dual-Core', 2005, 220],
      ['Quad-Core', 2007, 230], ['Quad-Core Turbo', 2009, 220], ['6-Core', 2011, 240],
      ['8-Core', 2014, 260], ['12-Core Chiplet', 2017, 280], ['16-Core Chiplet', 2019, 300],
      ['Hybrid 24-Core', 2021, 320], ['3D-Cache 32-Core', 2023, 350], ['48-Core 2 nm', 2026, 380],
      ['64-Core Backside Power', 2029, 400], ['Photonic 96-Core', 2032, 420], ['Neuromorphic Hybrid', 2035, 450],
      ['Quantum Co-Processor', 2038, 500],
    ],
  },
  soc: {
    name: 'Mobile Chip', icon: '🔋', desc: 'Low-power system-on-chip for portable devices.',
    tiers: [
      ['4-bit Microcontroller', 1980, 10], ['8-bit Low-Power', 1984, 14], ['16-bit Low-Power', 1988, 18],
      ['32-bit RISC 20 MHz', 1992, 22], ['32-bit RISC 100 MHz', 1996, 25], ['RISC 200 MHz', 1999, 28],
      ['App Processor 400 MHz', 2002, 30], ['App Processor 600 MHz', 2005, 32], ['1 GHz Mobile', 2008, 35],
      ['Dual-Core 1.2 GHz', 2010, 38], ['Quad-Core 64-bit', 2012, 40], ['Octa-Core big.LITTLE', 2014, 45],
      ['Neural SoC 10 nm', 2017, 50], ['5 nm Bionic', 2020, 60], ['3 nm AI SoC', 2023, 70],
      ['2 nm Agentic SoC', 2026, 80], ['1.4 nm SoC', 2029, 90], ['Angstrom SoC', 2032, 100],
      ['Photonic Mobile SoC', 2035, 110], ['Bio-Neural SoC', 2038, 120],
    ],
  },
  gfx: {
    name: 'Graphics', icon: '🎨', desc: 'Video and 3D rendering hardware.',
    tiers: [
      ['Text Mode', 1975, 15], ['Color Graphics', 1977, 30], ['Hardware Sprites', 1979, 40],
      ['Bitmap 16-Color', 1982, 50], ['VGA 256-Color', 1987, 60], ['2D Accelerator', 1991, 70],
      ['3D Rasterizer', 1995, 90], ['Hardware T&L', 1999, 110], ['Programmable Shaders', 2001, 130],
      ['Unified Shaders', 2006, 150], ['GPGPU Compute', 2008, 170], ['Tessellation Engine', 2010, 180],
      ['Async Compute', 2014, 200], ['Real-Time Ray Tracing', 2018, 250], ['AI Upscaling', 2020, 280],
      ['Path Tracing', 2023, 320], ['Neural Rendering', 2026, 360], ['Holographic Pipeline', 2030, 400],
      ['Light-Field Engine', 2034, 440], ['Synthetic Reality Core', 2038, 480],
    ],
  },
  mem: {
    name: 'Memory', icon: '💾', desc: 'Working memory (RAM).',
    tiers: [
      ['4 KB SRAM', 1975, 80], ['16 KB DRAM', 1977, 90], ['64 KB DRAM', 1980, 90],
      ['256 KB DRAM', 1983, 100], ['1 MB DRAM', 1986, 110], ['4 MB FPM', 1990, 110],
      ['16 MB EDO', 1994, 100], ['64 MB SDRAM', 1997, 90], ['256 MB DDR', 2000, 80],
      ['1 GB DDR2', 2004, 80], ['4 GB DDR3', 2008, 75], ['8 GB DDR3L', 2011, 70],
      ['16 GB DDR4', 2014, 75], ['32 GB DDR4', 2017, 85], ['32 GB DDR5', 2021, 95],
      ['64 GB DDR5', 2024, 110], ['128 GB DDR6', 2028, 120], ['256 GB CXL Memory', 2032, 130],
      ['1 TB Optical RAM', 2036, 150],
    ],
  },
  storage: {
    name: 'Storage', icon: '📼', desc: 'Where programs and data live.',
    tiers: [
      ['Cassette Tape', 1975, 20], ['5.25" Floppy', 1978, 60], ['3.5" Floppy', 1983, 60],
      ['20 MB Hard Disk', 1985, 120], ['100 MB Hard Disk', 1990, 120], ['1 GB Hard Disk', 1994, 110],
      ['10 GB Hard Disk', 1998, 100], ['80 GB Hard Disk', 2002, 90], ['500 GB Hard Disk', 2006, 80],
      ['128 GB SSD', 2010, 100], ['512 GB SSD', 2014, 90], ['1 TB NVMe', 2017, 90],
      ['2 TB NVMe Gen4', 2020, 100], ['4 TB NVMe Gen5', 2023, 110], ['8 TB Gen6', 2027, 120],
      ['32 TB Holographic', 2032, 140], ['DNA Archive', 2037, 160],
    ],
  },
  display: {
    name: 'Display', icon: '📺', desc: 'The screen. Portables need flat panels.',
    tiers: [
      ['TV Output', 1975, 10, 'f'], ['Monochrome CRT', 1976, 90, 'f'], ['Color CRT', 1980, 140, 'f'],
      ['Monochrome LCD', 1982, 60, 'p'], ['EGA Color CRT', 1984, 160, 'f'], ['VGA CRT', 1987, 180, 'f'],
      ['Backlit LCD', 1989, 120, 'p'], ['Passive Color LCD', 1991, 180, 'p'], ['SVGA CRT', 1992, 170, 'f'],
      ['TFT Active Matrix', 1995, 250], ['XGA TFT', 1998, 220], ['Widescreen LCD', 2003, 200],
      ['LED-Backlit LCD', 2007, 180], ['High-DPI IPS', 2010, 170], ['OLED', 2013, 190],
      ['120 Hz OLED', 2017, 200], ['Micro-LED', 2021, 250], ['Foldable OLED', 2024, 280, 'p'],
      ['Holographic Display', 2029, 320], ['Retinal Projection', 2034, 360],
    ],
  },
  battery: {
    name: 'Battery', icon: '🔌', desc: 'Energy storage for portables.',
    tiers: [
      ['NiCd Pack', 1975, 20], ['NiMH Pack', 1989, 25], ['Li-ion', 1992, 35],
      ['Li-ion High Density', 1998, 35], ['Li-Polymer', 2002, 35], ['Li-Polymer HD', 2007, 35],
      ['Silicon-Anode Li-ion', 2014, 40], ['Graphene-Enhanced', 2019, 45], ['Solid-State', 2024, 55],
      ['Lithium-Sulfur', 2028, 60], ['Nano-Wire Cell', 2032, 70], ['Micro Fusion Cell', 2037, 90],
    ],
  },
  chassis: {
    name: 'Industrial Design', icon: '📐', desc: 'Case materials and build quality.',
    tiers: [
      ['Wood-Grain Plastic', 1975, 40], ['Injection-Molded ABS', 1979, 45], ['Beige Steel Case', 1983, 55],
      ['Compact Mold', 1988, 50], ['Ergonomic Curves', 1993, 50], ['Translucent Plastic', 1997, 55],
      ['Brushed Aluminum', 2002, 70], ['Unibody Aluminum', 2008, 80], ['Glass & Steel', 2012, 90],
      ['Titanium Frame', 2018, 110], ['Ceramic Composite', 2023, 120], ['Self-Healing Polymer', 2028, 130],
      ['Programmable Matter', 2035, 160],
    ],
  },
  input: {
    name: 'Controls & Input', icon: '🕹️', desc: 'Keyboards, controllers, touch and sensors.',
    tiers: [
      ['Membrane Keys', 1975, 15], ['Full-Travel Keys', 1978, 25], ['D-Pad Controls', 1983, 20],
      ['Mouse & GUI', 1985, 30], ['Ergonomic Controls', 1990, 30], ['Resistive Touch', 1994, 35],
      ['Analog & Rumble', 1997, 35], ['Multi-Touch', 2006, 40], ['Motion Sensors', 2009, 40],
      ['Face & Fingerprint ID', 2013, 45], ['Haptic Feedback', 2017, 50], ['Eye Tracking', 2021, 60],
      ['Neural Wristband', 2027, 80], ['Brain-Computer Interface', 2034, 120],
    ],
  },
  media: {
    name: 'Game Media', icon: '💿', desc: 'How games get onto the machine.',
    tiers: [
      ['ROM Cartridge', 1975, 10], ['Bank-Switched Cartridge', 1980, 12], ['Large Cartridge', 1985, 14],
      ['CD-ROM Drive', 1991, 30], ['Fast CD-ROM', 1994, 25], ['DVD Drive', 1999, 30],
      ['Blu-ray Drive', 2005, 45], ['Digital + Hard Drive', 2008, 40], ['Blu-ray + Big HDD', 2013, 45],
      ['NVMe Streaming', 2020, 60], ['Cloud Gaming Link', 2025, 50], ['Holo-Crystal Storage', 2032, 70],
    ],
  },
  conn: {
    name: 'Connectivity', icon: '📡', desc: 'Cellular radios and wireless links.',
    tiers: [
      ['Analog Cellular (1G)', 1983, 80], ['GSM (2G)', 1992, 60], ['GPRS (2.5G)', 2000, 50],
      ['3G', 2003, 55], ['3.5G HSPA', 2007, 50], ['4G LTE', 2010, 50], ['LTE-Advanced', 2014, 45],
      ['5G', 2019, 60], ['5G mmWave', 2022, 60], ['5G-Advanced', 2025, 60], ['6G', 2030, 70],
      ['Satellite Mesh', 2034, 80], ['Quantum-Secure Link', 2038, 90],
    ],
  },
  camera: {
    name: 'Camera', icon: '📷', desc: 'Image sensors and optics.',
    tiers: [
      ['No Camera', 1975, 0], ['VGA Camera', 2000, 15], ['2 MP Camera', 2004, 15],
      ['5 MP Autofocus', 2007, 18], ['8 MP Camera', 2010, 20], ['12 MP Dual', 2015, 30],
      ['48 MP Triple', 2019, 40], ['200 MP Periscope', 2023, 55], ['Computational Pro', 2027, 65],
      ['Light-Field Camera', 2032, 80],
    ],
  },
  node: {
    name: 'Process Node', icon: '🔬', desc: 'Chip manufacturing process. Smaller is faster and cooler.',
    tiers: [
      ['10 µm', 1971, 8], ['6 µm', 1975, 9], ['3 µm', 1978, 10], ['1.5 µm', 1982, 12],
      ['1 µm', 1985, 14], ['800 nm', 1989, 16], ['500 nm', 1993, 18], ['350 nm', 1995, 20],
      ['250 nm', 1997, 22], ['180 nm', 1999, 24], ['130 nm', 2001, 26], ['90 nm', 2004, 28],
      ['65 nm', 2006, 30], ['45 nm', 2008, 32], ['32 nm', 2010, 34], ['22 nm', 2012, 36],
      ['14 nm', 2014, 40], ['10 nm', 2017, 45], ['7 nm', 2018, 55], ['5 nm', 2020, 70],
      ['3 nm', 2022, 85], ['2 nm', 2025, 100], ['1.4 nm', 2028, 120], ['1 nm', 2031, 140],
      ['7 Å', 2034, 160], ['5 Å', 2037, 180],
    ],
  },
  npu: {
    name: 'AI Engine', icon: '🤖', desc: 'Matrix-math engines for neural networks.',
    tiers: [
      ['Tensor Unit', 2016, 600], ['Tensor Cores', 2018, 800], ['Sparse Tensor Cores', 2020, 1000],
      ['Transformer Engine', 2022, 1500], ['FP4 Microscaling', 2024, 2000], ['Wafer-Scale Mesh', 2026, 2500],
      ['Optical Matrix Unit', 2029, 3000], ['Analog In-Memory', 2032, 3500], ['Neuromorphic Fabric', 2035, 4000],
      ['Quantum Tensor Core', 2038, 5000],
    ],
  },
};

export const COMPONENTS = {};
export const TIERS = {};

for (const [compId, c] of Object.entries(RAW)) {
  const tiers = c.tiers.map(([name, year, cost, flags], i) => {
    const t = {
      id: `${compId}.${i}`,
      comp: compId,
      index: i,
      name,
      year,
      cost,
      fixedOnly: flags === 'f',
      portableOnly: flags === 'p',
      rp: Math.max(10, Math.round(rpForYear(year) / 5) * 5),
    };
    TIERS[t.id] = t;
    return t;
  });
  COMPONENTS[compId] = { id: compId, name: c.name, icon: c.icon, desc: c.desc, tiers };
}

export function benchmarkForYear(techYear) {
  return 100 * Math.exp(PERF_K * (techYear - BASE_YEAR));
}
