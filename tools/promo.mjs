// Renders itch.io page assets into promo/: a 630x500 cover and 1280x720 gameplay screenshots.
// A bot plays a campaign in Node to produce a realistic mid-game save, which is loaded in Chromium.
// Usage: node tools/promo.mjs   (needs the playwright package and a Chromium)
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import * as G from '../src/sim/game.js';
import { CATEGORIES } from '../src/data/categories.js';
import { PRODUCT_PREFIXES } from '../src/data/names.js';
import { serialize } from '../src/sim/save.js';
import { curYearInt } from '../src/sim/util.js';
import { drainToasts } from '../src/sim/news.js';
import { botTurn } from './bot.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(new URL('..', import.meta.url).pathname);
const out = join(root, 'promo');
await mkdir(out, { recursive: true });

// --- build a mid-game save
let n = 0;
const nameFn = (cat) => `${PRODUCT_PREFIXES[(n++ * 7) % PRODUCT_PREFIXES.length]} ${CATEGORIES[cat].namesSuffix[n % CATEGORIES[cat].namesSuffix.length]}`;
const state = G.newGame({ seed: 4242, companyName: 'Silicon Garage', founderName: 'You' });
while (curYearInt(state) < 1996) {
  botTurn(state, { nameFn });
  G.tick(state);
  drainToasts(state);
}
botTurn(state, { nameFn }); // launch anything that just finished so no dialog pops up on load
state.decisions = [];
state.tips = Object.fromEntries(['rp', 'garage', 'hire', 'old_product', 'cpu', 'broke', 'first_project', 'first_launch', 'office_up'].map((k) => [k, true]));
const save = serialize(state);

// --- serve and shoot
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const file = join(root, path === '/' ? 'index.html' : path);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const hideToasts = '#toasts{display:none!important}';

// cover
{
  const page = await browser.newPage({ viewport: { width: 630, height: 500 } });
  await page.goto(url);
  await page.addStyleTag({ content: `${hideToasts} .title-buttons,.title-foot,.title-blurb{display:none!important} .title-card{padding:36px 28px} .game-title{font-size:58px}` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, 'cover.png') });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url);
await page.evaluate((s) => localStorage.setItem('silicongarage.save.v1', s), save);
await page.reload();
await page.addStyleTag({ content: hideToasts });
await page.click('#btn-continue');
await page.waitForSelector('#game-screen:not([hidden])');
// let the office animate as if the game were running, without advancing time
await page.evaluate(async () => {
  const { SPEEDS } = await import('/src/ui/ctx.js');
  SPEEDS[1] = 1e12;
});
await page.click('.speed-btn[data-speed="1"]');
await page.waitForTimeout(2500);
await page.screenshot({ path: join(out, 'screenshot-1-overview.png') });

await page.click('.tab[data-arg="markets"]');
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'screenshot-2-markets.png') });

await page.click('.speed-btn[data-speed="0"]');
await page.evaluate(async () => {
  const { ctx } = await import('/src/ui/ctx.js');
  const G = await import('/src/sim/game.js');
  const s = ctx.state;
  s.projects = s.projects.filter((p) => p.category !== 'laptop').slice(0, G.projectSlots(s) - 1);
  ctx.render(true);
});
await page.click('[data-action="new-product"]');
await page.click('.cat-card[data-cat="laptop"]');
await page.click('[data-preset="best"]');
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'screenshot-3-designer.png') });
await page.click('[data-start]');

// finish that project instantly to show the launch screen and the reviews
await page.evaluate(async () => {
  const { ctx } = await import('/src/ui/ctx.js');
  const G = await import('/src/sim/game.js');
  const app = await import('/src/ui/app.js');
  const p = ctx.state.projects.find((x) => x.status === 'dev' && x.category === 'laptop');
  p.dp += 4000;
  p.weeksDone = p.duration - 1;
  G.tick(ctx.state);
  while (ctx.state.decisions.length) G.resolveDecision(ctx.state, ctx.state.decisions[0].id, 1);
  app.afterTick();
});
await page.waitForSelector('[data-launch]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'screenshot-4-launch.png') });
await page.click('[data-launch]');
await page.waitForTimeout(3200);
await page.screenshot({ path: join(out, 'screenshot-5-reviews.png') });

await browser.close();
server.close();
console.log(`Wrote promo assets to ${out}`);
