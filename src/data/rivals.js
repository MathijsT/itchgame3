// Rival companies. Any resemblance to real companies is purely parodic.
// cats: [categoryId, fromYear, toYear?]
// lag: how many years behind the tech frontier their products are (lower = stronger)
// style: probability of targeting budget / mainstream / premium

export const RIVALS = [
  {
    id: 'pear', name: 'Pear Computer', color: '#ff6b6b', brand: 45, quality: 0.78, lag: 0.35, cadence: 64,
    style: [0.05, 0.45, 0.5],
    cats: [['homecomputer', 1977], ['laptop', 1989], ['phone', 2007], ['tablet', 2010], ['wearable', 2015], ['vr', 2024]],
    names: {
      homecomputer: ['Pear II', 'Pear III', 'Pear Lisa', 'Pearintosh', 'Pearintosh II', 'Pearintosh SE', 'Pear Quadra', 'Power Pear', 'iPear', 'iPear G4', 'iPear G5', 'Pear Studio {n}'],
      laptop: ['PearBook', 'PearBook Duo', 'iBook', 'PearBook Pro', 'PearBook Air', 'PearBook Pro {n}'],
      phone: 'pPhone {n}', tablet: 'pPad {n}', wearable: 'Pear Watch S{n}', vr: 'Pear Vision {n}',
    },
  },
  {
    id: 'kommodor', name: 'Kommodor', color: '#6fa8ff', brand: 42, quality: 0.55, lag: 1.0, cadence: 52,
    style: [0.6, 0.4, 0], cats: [['homecomputer', 1977, 1994], ['console', 1990, 1994]],
    names: { homecomputer: ['PET 2001', 'VIC-20', 'K-64', 'K-128', 'Amigo 500', 'Amigo 2000', 'Amigo 1200', 'Amigo 4000'], console: ['Amigo CD32'] },
  },
  {
    id: 'tandi', name: 'Tandi', color: '#c7a26b', brand: 38, quality: 0.5, lag: 1.4, cadence: 56,
    style: [0.7, 0.3, 0], cats: [['homecomputer', 1977, 1993], ['laptop', 1985, 1993]],
    names: { homecomputer: 'TRS-{n}0', laptop: 'Tandi Model {n}00' },
  },
  {
    id: 'atarri', name: 'Atarri', color: '#ff9f43', brand: 50, quality: 0.6, lag: 0.6, cadence: 70,
    style: [0.3, 0.6, 0.1], cats: [['console', 1977, 1996], ['homecomputer', 1979, 1992], ['handheld', 1989, 1995]],
    names: { console: ['VCS 2600', '5200', '7800', 'XE System', 'Jaguar', 'Jaguar CD'], homecomputer: ['Atarri 400', 'Atarri 800', 'Atarri ST', 'Atarri TT'], handheld: 'Lynx {n}' },
  },
  {
    id: 'magnavux', name: 'Magnavux', color: '#9b8cff', brand: 35, quality: 0.5, lag: 1.2, cadence: 60,
    style: [0.7, 0.3, 0], cats: [['console', 1977, 1984]],
    names: { console: 'Odyssey {n}' },
  },
  {
    id: 'ibn', name: 'IBN', color: '#4f7cff', brand: 72, quality: 0.75, lag: 0.8, cadence: 80,
    style: [0.05, 0.55, 0.4], cats: [['homecomputer', 1981, 2005], ['laptop', 1992, 2005]],
    names: { homecomputer: ['IBN PC', 'IBN PC/XT', 'IBN PC/AT', 'IBN PS/2', 'IBN PS/ValuePoint', 'IBN Aptiva', 'IBN NetVista', 'IBN ThinkCentre {n}'], laptop: 'ThinkPat {n}00' },
  },
  {
    id: 'intol', name: 'Intol', color: '#3cc4ff', brand: 55, quality: 0.8, lag: 0.2, cadence: 56,
    style: [0.2, 0.5, 0.3], cats: [['cpu_chip', 1979], ['ai_chip', 2019], ['gpu_card', 2022]],
    names: { cpu_chip: ['8086', '80286', '80386', '80486', 'Pentiom', 'Pentiom Pro', 'Pentiom II', 'Pentiom III', 'Pentiom 4', 'Kore 2', 'Kore i7', 'Kore Ultra {n}'], ai_chip: 'Gaudy {n}', gpu_card: 'Ark A{n}' },
  },
  {
    id: 'amb', name: 'AMB', color: '#ff4f81', brand: 38, quality: 0.68, lag: 0.6, cadence: 60,
    style: [0.45, 0.45, 0.1], cats: [['cpu_chip', 1982], ['gpu_card', 2006], ['ai_chip', 2023]],
    names: { cpu_chip: ['Am286', 'Am386', 'Am486', 'K5', 'K6', 'Athlan', 'Athlan 64', 'Phenon', 'Bulldozr', 'Ryzan {n}'], gpu_card: 'Radian HD {n}000', ai_chip: 'Instink MI{n}00' },
  },
  {
    id: 'nintando', name: 'Nintando', color: '#ff3b3b', brand: 52, quality: 0.84, lag: 1.3, cadence: 110,
    style: [0.25, 0.65, 0.1], cats: [['console', 1985], ['handheld', 1989]],
    names: { console: ['NES', 'Super NES', 'Nintando 64', 'GameBlock', 'Wee', 'Wee U', 'Swotch', 'Swotch 2', 'Swotch {n}'], handheld: ['Game Kid', 'Game Kid Color', 'Game Kid Advance', 'NDS', 'N3DS', 'Swotch Lite', 'Pocket {n}'] },
  },
  {
    id: 'seega', name: 'Seega', color: '#2f80ed', brand: 45, quality: 0.65, lag: 0.5, cadence: 90,
    style: [0.3, 0.6, 0.1], cats: [['console', 1986, 2001], ['handheld', 1990, 1997]],
    names: { console: ['Master Setup', 'Mega Driv', 'Seega CD', 'Saturnus', 'Dreamkast'], handheld: ['Game Gears', 'Nomadd'] },
  },
  {
    id: 'sonny', name: 'Sonny', color: '#a0a8ff', brand: 60, quality: 0.78, lag: 0.3, cadence: 120,
    style: [0.1, 0.6, 0.3], cats: [['console', 1994], ['handheld', 2004, 2014], ['laptop', 1997, 2014], ['phone', 2001, 2022], ['vr', 2016]],
    names: { console: 'PlayBox {n}', handheld: ['PBP', 'PB Vita'], laptop: 'VAYO {n}', phone: 'Experia {n}', vr: 'PlayBox VR{n}' },
  },
  {
    id: 'macrosoft', name: 'Macrosoft', color: '#43d17a', brand: 62, quality: 0.7, lag: 0.3, cadence: 130,
    style: [0.1, 0.6, 0.3], cats: [['console', 2001], ['tablet', 2012], ['laptop', 2015]],
    names: { console: ['XBlock', 'XBlock 360', 'XBlock One', 'XBlock Series X', 'XBlock Next {n}'], tablet: 'Surfface {n}', laptop: 'Surfface Book {n}' },
  },
  {
    id: 'nvydia', name: 'Nvydia', color: '#76b900', brand: 40, quality: 0.8, lag: 0.15, cadence: 52,
    style: [0.2, 0.45, 0.35], cats: [['gpu_card', 1995], ['ai_chip', 2016]],
    names: { gpu_card: ['NV1', 'Riva 128', 'Riva TNT', 'GeForse 256', 'GeForse 2', 'GeForse 3', 'GeForse FX', 'GeForse 6800', 'GeForse 8800', 'GTX 480', 'GTX 980', 'RTX 2080', 'RTX 4090', 'Titan {n}'], ai_chip: ['P100', 'V100', 'A100', 'H100', 'B200', 'R{n}00'] },
  },
  {
    id: 'rati', name: 'Rati Technologies', color: '#e2463e', brand: 42, quality: 0.68, lag: 0.5, cadence: 56,
    style: [0.35, 0.5, 0.15], cats: [['gpu_card', 1995, 2006]],
    names: { gpu_card: ['Rage', 'Rage Pro', 'Rage 128', 'Radian 7500', 'Radian 9700', 'Radian X800', 'Radian X1900'] },
  },
  {
    id: 'fourdfx', name: '4Dfx Interactive', color: '#ffd166', brand: 35, quality: 0.75, lag: 0.2, cadence: 60,
    style: [0.1, 0.5, 0.4], cats: [['gpu_card', 1996, 2001]],
    names: { gpu_card: ['Voodun', 'Voodun 2', 'Voodun 3', 'Voodun 5'] },
  },
  {
    id: 'nokla', name: 'Nokla', color: '#1d6fe0', brand: 45, quality: 0.75, lag: 0.6, cadence: 40,
    style: [0.45, 0.4, 0.15], cats: [['phone', 1990, 2014]],
    names: { phone: 'Nokla {n}210' },
  },
  {
    id: 'motorolla', name: 'Motorolla', color: '#5ac8fa', brand: 55, quality: 0.65, lag: 0.6, cadence: 48,
    style: [0.35, 0.45, 0.2], cats: [['phone', 1990]],
    names: { phone: ['DynaTAK', 'MicroTAK', 'StarTAK', 'RAZZR', 'Droyd', 'Moto Z{n}'] },
  },
  {
    id: 'sunsong', name: 'Sunsong', color: '#1428a0', brand: 35, quality: 0.72, lag: 0.4, cadence: 40,
    style: [0.35, 0.4, 0.25], cats: [['phone', 1995], ['laptop', 2000], ['tablet', 2011], ['wearable', 2014], ['vr', 2016, 2020]],
    names: { phone: 'Galaxie S{n}', laptop: 'Galaxie Book {n}', tablet: 'Galaxie Tab {n}', wearable: 'Galaxie Watch {n}', vr: 'Gear VR{n}' },
  },
  {
    id: 'compac', name: 'Compac', color: '#d94848', brand: 45, quality: 0.65, lag: 0.6, cadence: 52,
    style: [0.35, 0.5, 0.15], cats: [['homecomputer', 1983, 2002], ['laptop', 1986, 2002]],
    names: { homecomputer: 'Deskpro {n}86', laptop: 'Armadia {n}' },
  },
  {
    id: 'dull', name: 'Dull', color: '#2e9bd6', brand: 30, quality: 0.6, lag: 0.8, cadence: 44,
    style: [0.55, 0.4, 0.05], cats: [['homecomputer', 1985], ['laptop', 1990]],
    names: { homecomputer: 'OptiPlux {n}', laptop: 'Latitood {n}' },
  },
  {
    id: 'hb', name: 'Hewlett-Backard', color: '#0096d6', brand: 55, quality: 0.65, lag: 0.8, cadence: 52,
    style: [0.4, 0.45, 0.15], cats: [['homecomputer', 1980], ['laptop', 1995]],
    names: { homecomputer: 'HB Vectra {n}', laptop: 'HB Pavillion {n}' },
  },
  {
    id: 'lemovo', name: 'Lemovo', color: '#e2231a', brand: 40, quality: 0.62, lag: 0.7, cadence: 48,
    style: [0.5, 0.4, 0.1], cats: [['homecomputer', 2005], ['laptop', 2005], ['tablet', 2013], ['phone', 2014]],
    names: { homecomputer: 'IdeaCenter {n}', laptop: 'ThinkPat X{n}', tablet: 'Yoga Tab {n}', phone: 'Lemovo K{n}' },
  },
  {
    id: 'toshibo', name: 'Toshibo', color: '#ff6f61', brand: 45, quality: 0.65, lag: 0.7, cadence: 52,
    style: [0.4, 0.5, 0.1], cats: [['laptop', 1986, 2018]],
    names: { laptop: 'Satelite {n}' },
  },
  {
    id: 'blackberi', name: 'BlackBeri', color: '#8d8d8d', brand: 50, quality: 0.7, lag: 0.8, cadence: 52,
    style: [0.1, 0.6, 0.3], cats: [['phone', 1999, 2016]],
    names: { phone: 'BlackBeri {n}' },
  },
  {
    id: 'huawai', name: 'Huawai', color: '#cf0a2c', brand: 30, quality: 0.68, lag: 0.4, cadence: 40,
    style: [0.4, 0.4, 0.2], cats: [['phone', 2010], ['tablet', 2014], ['wearable', 2015], ['laptop', 2018]],
    names: { phone: 'Huawai P{n}', tablet: 'MediaPad {n}', wearable: 'Huawai Watch {n}', laptop: 'MateBook {n}' },
  },
  {
    id: 'shaomi', name: 'Shaomi', color: '#ff6900', brand: 28, quality: 0.6, lag: 0.7, cadence: 36,
    style: [0.75, 0.25, 0], cats: [['phone', 2011], ['wearable', 2014], ['tablet', 2018]],
    names: { phone: 'Mi {n}', wearable: 'Mi Band {n}', tablet: 'Mi Pad {n}' },
  },
  {
    id: 'gargle', name: 'Gargle', color: '#fbbc05', brand: 60, quality: 0.72, lag: 0.3, cadence: 52,
    style: [0.15, 0.6, 0.25], cats: [['tablet', 2012, 2019], ['phone', 2016], ['ai_chip', 2017], ['wearable', 2022]],
    names: { tablet: 'Nexxus {n}', phone: 'Pixol {n}', ai_chip: 'TPU v{n}', wearable: 'Pixol Watch {n}' },
  },
  {
    id: 'fitbyte', name: 'Fitbyte', color: '#00b0b9', brand: 40, quality: 0.6, lag: 0.8, cadence: 40,
    style: [0.5, 0.45, 0.05], cats: [['wearable', 2013, 2021]],
    names: { wearable: 'Fitbyte Charge {n}' },
  },
  {
    id: 'okulus', name: 'Okulus', color: '#a855f7', brand: 40, quality: 0.7, lag: 0.3, cadence: 90,
    style: [0.3, 0.55, 0.15], cats: [['vr', 2016]],
    names: { vr: ['Rift', 'Rift S', 'Quest', 'Quest 2', 'Quest 3', 'Quest {n}'] },
  },
  {
    id: 'valv', name: 'Valv', color: '#c3d1e0', brand: 50, quality: 0.72, lag: 0.5, cadence: 150,
    style: [0.1, 0.5, 0.4], cats: [['vr', 2019], ['handheld', 2022]],
    names: { vr: 'Index {n}', handheld: 'Steam Dekk {n}' },
  },
  {
    id: 'cerebrus', name: 'Cerebrus', color: '#f97316', brand: 25, quality: 0.75, lag: 0.2, cadence: 70,
    style: [0, 0.4, 0.6], cats: [['ai_chip', 2019]],
    names: { ai_chip: 'WSE-{n}' },
  },
  {
    id: 'clones', name: 'No-Name Clones', color: '#6b7280', brand: 18, quality: 0.42, lag: 2.6, cadence: 30,
    style: [1, 0, 0], immortal: true,
    cats: [['homecomputer', 1980], ['console', 1980], ['cpu_chip', 1984], ['laptop', 1990], ['handheld', 1992], ['phone', 1996], ['gpu_card', 1998], ['tablet', 2012], ['wearable', 2015], ['vr', 2019]],
    names: {},
  },
];

export const RIVAL_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.id, r]));
