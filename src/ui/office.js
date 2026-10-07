// Procedural pixel-art office. Logical resolution 384x216, scaled up with crisp pixels.
import { OFFICES } from '../data/facilities.js';
import { curYearInt } from '../sim/util.js';
import { ctx } from './ctx.js';

const W = 384;
const H = 216;
const WALL = 78;

let particles = [];

function r(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Desk positions and drawing scale for each office size (small offices get bigger sprites).
function layout(n) {
  const perRow = n <= 3 ? 3 : n <= 6 ? 3 : n <= 10 ? 5 : n <= 16 ? 6 : 8;
  const rows = Math.ceil(n / perRow);
  const k = n <= 3 ? 2 : n <= 6 ? 1.5 : n <= 10 ? 1.25 : 1;
  const ys = rows === 1 ? [118] : rows === 2 ? (k > 1.3 ? [104, 160] : [110, 162]) : [102, 140, 178];
  const desks = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const col = i % perRow;
    const spacing = (W - 40) / inRow;
    desks.push({ x: Math.round(20 + spacing * (col + 0.5)), y: ys[row], i, k });
  }
  return desks;
}

// ------------------------------------------------------------------ rooms

function drawGarage(g, t) {
  r(g, 0, 0, W, WALL, '#5d616d');
  for (let y = 0; y < WALL; y += 8) {
    r(g, 0, y, W, 1, '#53575f');
    for (let x = (y / 8) % 2 ? 0 : 12; x < W; x += 24) r(g, x, y, 1, 8, '#53575f');
  }
  // garage door
  r(g, 248, 10, 124, WALL - 10, '#8d939e');
  for (let y = 14; y < WALL; y += 7) r(g, 248, y, 124, 1, '#6e737d');
  r(g, 244, 8, 132, 3, '#3e4149');
  // pegboard with tools
  r(g, 16, 16, 86, 40, '#8b6b4a');
  for (let x = 20; x < 100; x += 6) for (let y = 20; y < 54; y += 6) r(g, x, y, 1, 1, '#6c5238');
  r(g, 24, 22, 3, 18, '#c0c4cc'); r(g, 22, 22, 7, 3, '#c0c4cc'); // wrench
  r(g, 40, 24, 12, 4, '#d94848'); r(g, 44, 28, 3, 12, '#3a3a3a'); // hammer
  r(g, 62, 22, 2, 20, '#e8c24a'); r(g, 70, 26, 14, 10, '#4a6fa5'); // ruler & box
  // shelf with boxes
  r(g, 120, 30, 70, 3, '#6c5238');
  r(g, 124, 18, 14, 12, '#c79a5b'); r(g, 140, 22, 12, 8, '#a87c45'); r(g, 160, 16, 20, 14, '#3f8c6a');
  // hanging bulb
  r(g, 210, 0, 1, 20, '#222');
  const flicker = 0.85 + 0.15 * Math.sin(t / 300);
  g.fillStyle = `rgba(255, 230, 150, ${0.12 * flicker})`;
  g.beginPath(); g.arc(210, 24, 40, 0, Math.PI * 2); g.fill();
  r(g, 207, 20, 7, 7, '#ffe9a0');
  // floor
  r(g, 0, WALL, W, H - WALL, '#4b505c');
  r(g, 0, WALL, W, 3, '#3a3e47');
  g.fillStyle = 'rgba(20, 22, 28, 0.35)';
  g.beginPath(); g.ellipse(300, 196, 30, 7, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(60, 205, 18, 4, 0, 0, Math.PI * 2); g.fill();
}

function windowWithSky(g, x, y, w, h, t, city) {
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#5fb3ff'); grad.addColorStop(1, '#bfe3ff');
  g.fillStyle = grad; g.fillRect(x, y, w, h);
  // clouds drift
  const cx = ((t / 120) % (w + 40)) - 20;
  r(g, x + cx, y + 6, 14, 4, 'rgba(255,255,255,0.85)');
  r(g, x + ((cx + w / 2) % (w + 20)), y + 14, 10, 3, 'rgba(255,255,255,0.7)');
  if (city) {
    for (let i = 0; i < w; i += 7) {
      const bh = 8 + Math.floor(hash(i + x) * (h * 0.6));
      r(g, x + i, y + h - bh, 6, bh, '#5a6f96');
      for (let wy = y + h - bh + 2; wy < y + h - 2; wy += 4) r(g, x + i + 2, wy, 1, 1, '#cfe2ff');
    }
  }
  r(g, x - 2, y - 2, w + 4, 2, '#e9edf3'); r(g, x - 2, y + h, w + 4, 3, '#e9edf3');
  r(g, x - 2, y, 2, h, '#e9edf3'); r(g, x + w, y, 2, h, '#e9edf3');
  r(g, x + w / 2 - 1, y, 2, h, '#e9edf3');
}

function plant(g, x, y, s = 1) {
  r(g, x - 5 * s, y, 10 * s, 9 * s, '#b5653a');
  r(g, x - 6 * s, y, 12 * s, 2 * s, '#c8794a');
  g.fillStyle = '#3f9b5a';
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.ellipse(x + (i - 2.5) * 3 * s, y - 6 * s - (i % 2) * 4 * s, 3 * s, 6 * s, (i - 2.5) * 0.3, 0, Math.PI * 2); g.fill();
  }
}

function logoText(g, text, x, y, color, size = 10) {
  g.font = `bold ${size}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function drawSmallOffice(g, t, name) {
  r(g, 0, 0, W, WALL, '#cdbd9c');
  r(g, 0, WALL - 6, W, 6, '#9d8b69');
  windowWithSky(g, 150, 12, 84, 40, t, false);
  r(g, 262, 14, 92, 46, '#f4f6f8'); r(g, 262, 14, 92, 2, '#a7adb7'); r(g, 262, 58, 92, 3, '#a7adb7');
  // whiteboard scribbles
  r(g, 270, 22, 40, 1, '#3b6fd6'); r(g, 270, 28, 30, 1, '#3b6fd6'); r(g, 270, 34, 50, 1, '#d64b3b');
  g.strokeStyle = '#2f9e5b'; g.beginPath(); g.moveTo(320, 48); g.lineTo(330, 40); g.lineTo(338, 44); g.lineTo(348, 26); g.stroke();
  r(g, 30, 18, 60, 30, '#2b3550'); logoText(g, name.slice(0, 10), 60, 33, '#39d0ff', 9);
  r(g, 0, WALL, W, H - WALL, '#4f5d80');
  for (let y = WALL; y < H; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < W; x += 24) r(g, x, y, 12, 12, '#53628a');
  plant(g, 360, 80, 1.3);
}

function drawOfficeFloor(g, t, name) {
  r(g, 0, 0, W, WALL, '#dfe4ec');
  for (let i = 0; i < 3; i++) windowWithSky(g, 24 + i * 120, 10, 96, 48, t, true);
  r(g, 0, WALL - 5, W, 5, '#b6bdc9');
  r(g, 0, WALL, W, H - WALL, '#8a6a4a');
  for (let y = WALL; y < H; y += 6) {
    r(g, 0, y, W, 1, '#7a5c3f');
    for (let x = ((y * 7) % 40); x < W; x += 40) r(g, x, y, 1, 6, '#7a5c3f');
  }
  plant(g, 12, 82, 1.2); plant(g, 372, 82, 1.2);
  logoText(g, name.slice(0, 14), W / 2, 68, '#3b4a70', 8);
}

function drawHQ(g, t, name) {
  const grad = g.createLinearGradient(0, 0, 0, WALL);
  grad.addColorStop(0, '#16203a'); grad.addColorStop(1, '#22304f');
  g.fillStyle = grad; g.fillRect(0, 0, W, WALL);
  for (let x = 0; x < W; x += 48) r(g, x, 0, 2, WALL, '#2f3f66');
  const glow = 0.6 + 0.4 * Math.sin(t / 700);
  g.shadowColor = '#39d0ff'; g.shadowBlur = 8 * glow;
  logoText(g, name.toUpperCase().slice(0, 18), W / 2, 34, '#39d0ff', 14);
  g.shadowBlur = 0;
  r(g, 0, WALL, W, H - WALL, '#c9cfdb');
  for (let x = 0; x < W; x += 32) r(g, x, WALL, 1, H - WALL, '#b8bfcd');
  for (let y = WALL; y < H; y += 32) r(g, 0, y, W, 1, '#b8bfcd');
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, WALL, W, 10);
  plant(g, 14, 84, 1.4); plant(g, 370, 84, 1.4);
}

function drawCampus(g, t, name) {
  r(g, 0, 0, W, WALL, '#f2f4f8');
  const colors = ['#ff6b6b', '#ffb547', '#ffd166', '#3ddc84', '#39d0ff', '#7c5cff'];
  colors.forEach((c, i) => r(g, 0, 50 + i * 3, W, 3, c));
  windowWithSky(g, 20, 8, 70, 36, t, true);
  windowWithSky(g, 294, 8, 70, 36, t, true);
  const glow = 0.7 + 0.3 * Math.sin(t / 500);
  g.shadowColor = '#7c5cff'; g.shadowBlur = 10 * glow;
  logoText(g, name.slice(0, 16), W / 2, 26, '#7c5cff', 15);
  g.shadowBlur = 0;
  r(g, 0, WALL, W, H - WALL, '#d9b88f');
  for (let y = WALL; y < H; y += 5) r(g, 0, y, W, 1, '#cfac82');
  // bean bags
  g.fillStyle = '#ff6b6b'; g.beginPath(); g.ellipse(14, 206, 10, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#39d0ff'; g.beginPath(); g.ellipse(370, 206, 10, 6, 0, 0, Math.PI * 2); g.fill();
  plant(g, 8, 84, 1.2); plant(g, 376, 84, 1.2);
}

// ------------------------------------------------------------------ furniture & people

function monitor(g, x, y, year, t, working) {
  if (year < 1984) {
    r(g, x - 7, y - 13, 14, 12, '#d8cfb8'); r(g, x - 5, y - 11, 10, 7, '#0b1a0e');
    if (working) for (let i = 0; i < 3; i++) r(g, x - 4, y - 10 + i * 2, 2 + ((t / 200 + i * 3 + x) % 6), 1, '#4cff7a');
    r(g, x - 9, y - 2, 18, 3, '#cfc5ab');
  } else if (year < 2000) {
    r(g, x - 8, y - 15, 16, 13, '#d9d2c0'); r(g, x - 6, y - 13, 12, 9, '#1d3d8f');
    if (working) for (let i = 0; i < 3; i++) r(g, x - 5, y - 12 + i * 3, 3 + ((t / 220 + i * 5 + x) % 7), 1, '#e6ecff');
    r(g, x - 3, y - 2, 6, 2, '#b9b19c');
  } else if (year < 2012) {
    r(g, x - 9, y - 14, 18, 11, '#1b1d22'); r(g, x - 8, y - 13, 16, 9, '#2a5a9e');
    if (working) for (let i = 0; i < 3; i++) r(g, x - 7, y - 12 + i * 3, 3 + ((t / 220 + i * 5 + x) % 9), 1, '#bfe0ff');
    r(g, x - 1, y - 3, 2, 3, '#1b1d22'); r(g, x - 4, y - 1, 8, 1, '#1b1d22');
  } else {
    const dual = year >= 2020;
    const draw = (mx) => {
      r(g, mx - 9, y - 14, 18, 11, '#0e0f12'); r(g, mx - 8, y - 13, 16, 9, '#141a2a');
      if (working) {
        const cols = ['#ff79c6', '#8be9fd', '#50fa7b', '#f1fa8c'];
        for (let i = 0; i < 3; i++) r(g, mx - 7 + (i % 2) * 2, y - 12 + i * 3, 3 + ((t / 220 + i * 5 + mx) % 9), 1, cols[(i + Math.floor(mx)) % 4]);
      }
      r(g, mx - 1, y - 3, 2, 3, '#9aa0aa');
    };
    if (dual) { draw(x - 9); draw(x + 9); } else draw(x);
  }
}

function desk(g, x, y, lvl) {
  const top = lvl === 0 ? '#9c7a52' : lvl >= 3 ? '#f2f2f2' : '#c9a67a';
  const side = lvl === 0 ? '#7a5c3a' : lvl >= 3 ? '#cfd3db' : '#a9865a';
  r(g, x - 17, y, 34, 7, top);
  r(g, x - 17, y + 7, 34, 3, side);
  r(g, x - 16, y + 10, 2, 7, side); r(g, x + 14, y + 10, 2, 7, side);
}

function chair(g, x, y) {
  r(g, x - 7, y + 10, 14, 10, '#2c2f3a');
  r(g, x - 6, y + 10, 12, 1, '#3a3e4c');
  r(g, x - 1, y + 20, 2, 3, '#2c2f3a');
  r(g, x - 5, y + 23, 10, 1, '#2c2f3a');
}

function person(g, s, x, y, t, i, working) {
  const bob = working && Math.floor(t / 600 + hash(i) * 10) % 5 === 0 ? 1 : 0;
  chair(g, x, y);
  // body
  r(g, x - 6, y + 4 + bob, 12, 11, s.shirt);
  r(g, x - 6, y + 4 + bob, 12, 2, shade(s.shirt));
  // arms typing
  const a = working ? Math.floor(t / 140 + i) % 2 : 0;
  r(g, x - 8, y + 5 + bob - a, 2, 6, s.shirt);
  r(g, x + 6, y + 5 + bob - (1 - a), 2, 6, s.shirt);
  // head from behind
  r(g, x - 4, y - 4 + bob, 8, 8, s.skin);
  r(g, x - 4, y - 4 + bob, 8, 6, s.hair);
  if (s.hairStyle === 1) r(g, x - 5, y - 3 + bob, 10, 9, s.hair);
  if (s.hairStyle === 2) r(g, x - 2, y - 7 + bob, 4, 3, s.hair);
  if (s.hairStyle === 3) { r(g, x - 4, y - 4 + bob, 8, 3, s.skin); r(g, x - 4, y - 1 + bob, 8, 3, s.hair); }
  if (s.founder) { r(g, x - 5, y - 6 + bob, 10, 3, '#7c5cff'); r(g, x - 5, y - 4 + bob, 12, 1, '#5b3fd6'); }
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.floor(v * 0.75));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

function spawnParticles(desks, state) {
  if (ctx.paused || !ctx.state || ctx.state.gameOver) return;
  const devActive = state.projects.some((p) => p.status === 'dev');
  for (const d of desks) {
    if (!d.staff || Math.random() > 0.004 * (ctx.speed || 1)) continue;
    const role = d.staff.role;
    const sym = role === 'researcher' ? ['💡', '⚛', '+RP'] : role === 'marketer' ? ['$', '★', '♥'] : devActive ? ['{ }', '</>', '⚙'] : ['…', '☕'];
    const color = role === 'researcher' ? '#7bd389' : role === 'marketer' ? '#ffb547' : '#5ca8e8';
    particles.push({ x: d.x + (Math.random() * 10 - 5), y: d.y - 18 * d.k, text: sym[Math.floor(Math.random() * sym.length)], color, life: 1 });
  }
}

export function drawOffice(canvas, state, t) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const lvl = state.facilities.office;
  const year = curYearInt(state);
  const name = state.company.name;
  if (lvl === 0) drawGarage(g, t);
  else if (lvl === 1) drawSmallOffice(g, t, name);
  else if (lvl === 2) drawOfficeFloor(g, t, name);
  else if (lvl === 3) drawHQ(g, t, name);
  else drawCampus(g, t, name);

  const desks = layout(OFFICES[lvl].desks);
  state.staff.forEach((s, i) => { if (desks[i]) desks[i].staff = s; });
  const devActive = state.projects.some((p) => p.status === 'dev');
  const running = !ctx.paused && !state.gameOver;
  for (const d of desks) {
    const working = running && d.staff && (d.staff.role !== 'engineer' || devActive || Math.floor(t / 2000 + d.i) % 3 !== 0);
    g.save();
    g.translate(d.x, d.y);
    g.scale(d.k, d.k);
    monitor(g, 0, 0, year, t, !!d.staff && running);
    desk(g, 0, 0, lvl);
    if (d.staff) person(g, d.staff, 0, 5, t, d.i, working);
    else chair(g, 0, 5);
    g.restore();
  }

  spawnParticles(desks, state);
  g.font = 'bold 9px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.y -= 0.25;
    p.life -= 0.008;
    g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    g.fillStyle = p.color;
    g.fillText(p.text, p.x, p.y);
  }
  g.globalAlpha = 1;
}

export function officeName(state) {
  return OFFICES[state.facilities.office].name;
}

/** Small avatar for staff cards. */
export function drawAvatar(canvas, s) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 20, 20);
  r(g, 0, 0, 20, 20, '#212b4d');
  r(g, 4, 13, 12, 7, s.shirt);
  r(g, 6, 4, 8, 9, s.skin);
  r(g, 6, 3, 8, 3, s.hair);
  if (s.hairStyle === 1) { r(g, 5, 3, 2, 9, s.hair); r(g, 13, 3, 2, 9, s.hair); }
  if (s.hairStyle === 2) r(g, 8, 1, 4, 2, s.hair);
  if (s.hairStyle === 3) r(g, 6, 3, 8, 1, s.skin);
  r(g, 8, 8, 1, 1, '#1b1b1b'); r(g, 11, 8, 1, 1, '#1b1b1b');
  r(g, 9, 11, 2, 1, '#9a5a4a');
  if (s.founder) { r(g, 5, 1, 10, 3, '#7c5cff'); r(g, 13, 3, 4, 1, '#5b3fd6'); }
}

// ------------------------------------------------------------------ title background

let traces = null;

export function drawTitleBg(canvas, t) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); traces = null; }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0b1020';
  g.fillRect(0, 0, w, h);
  const step = 24;
  if (!traces) {
    traces = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < Math.floor((w * h) / 9000); k++) {
      let x = Math.floor(rnd() * (w / step)) * step, y = Math.floor(rnd() * (h / step)) * step;
      const pts = [[x, y]];
      let dir = Math.floor(rnd() * 4);
      for (let s = 0; s < 6 + rnd() * 10; s++) {
        if (rnd() < 0.35) dir = (dir + (rnd() < 0.5 ? 1 : 3)) % 4;
        const len = step * (1 + Math.floor(rnd() * 3));
        x += [len, 0, -len, 0][dir]; y += [0, len, 0, -len][dir];
        pts.push([x, y]);
      }
      traces.push({ pts, speed: 0.04 + rnd() * 0.08, offset: rnd() * 1000, hue: rnd() < 0.7 ? '#39d0ff' : '#a48bff' });
    }
  }
  g.lineWidth = 2;
  for (const tr of traces) {
    g.strokeStyle = 'rgba(57, 208, 255, 0.10)';
    g.beginPath();
    tr.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
    for (const [x, y] of [tr.pts[0], tr.pts[tr.pts.length - 1]]) {
      g.fillStyle = 'rgba(57, 208, 255, 0.25)';
      g.fillRect(x - 3, y - 3, 6, 6);
    }
    // travelling pulse
    let total = 0;
    const segs = [];
    for (let i = 1; i < tr.pts.length; i++) {
      const [x0, y0] = tr.pts[i - 1], [x1, y1] = tr.pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      segs.push([x0, y0, x1, y1, len]); total += len;
    }
    let d = ((t * tr.speed + tr.offset * 10) % (total + 200)) - 100;
    if (d < 0 || d > total) continue;
    for (const [x0, y0, x1, y1, len] of segs) {
      if (d <= len) {
        const px = x0 + ((x1 - x0) * d) / len, py = y0 + ((y1 - y0) * d) / len;
        g.shadowColor = tr.hue; g.shadowBlur = 12;
        g.fillStyle = tr.hue;
        g.beginPath(); g.arc(px, py, 2.5, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
        break;
      }
      d -= len;
    }
  }
}
