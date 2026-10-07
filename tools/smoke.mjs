// Browser smoke test: serves the game, plays through the first product launch with Playwright,
// fast-forwards decades of game time and fails on any console/page error.
// Usage: node tools/smoke.mjs [--shots DIR]   (needs the `playwright` package)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = await import('playwright'));
}

const root = resolve(new URL('..', import.meta.url).pathname);
const shotsIdx = process.argv.indexOf('--shots');
const shots = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const file = join(root, path === '/' ? 'index.html' : path);
    if (!file.startsWith(root)) throw new Error('bad path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const shot = async (name) => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`) }); };

try {
  await page.goto(url);
  await page.waitForSelector('#btn-new');
  await page.waitForTimeout(400);
  await shot('01-title');
  await page.click('#btn-new');
  await page.fill('#ng-company', 'Smoke Test Inc');
  await shot('02-newgame');
  await page.click('[data-go]');
  await page.waitForSelector('#game-screen:not([hidden])');
  await shot('03-welcome');
  await page.click('.modal-foot [data-close]');
  await page.click('[data-action="new-product"]');
  await page.waitForSelector('.cat-card[data-cat="homecomputer"]');
  await shot('04-categories');
  await page.click('.cat-card[data-cat="homecomputer"]');
  await page.waitForSelector('[data-start]');
  await page.click('[data-preset="best"]');
  await page.click('[data-dur="10"]');
  await shot('05-designer');
  await page.click('[data-start]');
  await page.click('.speed-btn[data-speed="3"]');
  await page.waitForSelector('[data-launch]', { timeout: 20000 });
  await page.waitForTimeout(300);
  await shot('06-launch');
  await page.click('[data-launch]');
  await page.waitForSelector('.review.show');
  await page.waitForTimeout(2800);
  await shot('07-reviews');
  await page.click('.modal-foot [data-close]');

  // visit every tab
  for (const tab of ['overview', 'products', 'markets', 'research', 'staff', 'company', 'finance']) {
    await page.click(`.tab[data-arg="${tab}"]`);
    await page.waitForTimeout(250);
    await shot(`08-tab-${tab}`);
  }

  // exercise the management actions with some extra cash and research points
  await page.click('.speed-btn[data-speed="0"]');
  await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    ctx.state.company.cash += 2e6;
    ctx.state.rp += 2000;
    ctx.render(true);
  });
  await page.click('.tab[data-arg="products"]');
  await page.click('[data-action="price"]');
  await page.click('[data-pp]');
  await page.waitForTimeout(150);
  await shot('20-price');
  await page.click('.modal-foot [data-ok]');
  await page.click('[data-action="marketing"]');
  await page.click('[data-run-camp="magazine"]');
  await shot('21-marketing');
  await page.click('.modal-foot [data-close]');
  await page.click('tr[data-action="product"]');
  await page.waitForTimeout(150);
  await shot('22-product');
  await page.click('.modal-head [data-close]');

  await page.click('.tab[data-arg="markets"]');
  await page.click('[data-action="market-cat"][data-arg="console"]');
  await page.waitForTimeout(150);
  await shot('23-market-console');

  await page.click('.tab[data-arg="research"]');
  await page.click('[data-action="research-tier"]');
  await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    ctx.state.week = Math.max(ctx.state.week, 2 * 48 + 4); // 1979: first company upgrades
    ctx.render(true);
  });
  await page.click('[data-action="research-perk"]');
  await page.click('[data-action="research-all"]');
  await page.waitForTimeout(150);
  await shot('24-research');

  await page.click('.tab[data-arg="staff"]');
  await page.click('[data-action="hire"]');
  await page.click('[data-action="hire"]');
  await page.click('[data-action="role"][data-arg="researcher"]');
  await page.click('[data-action="train"]');
  await page.click('[data-action="recruit"]');
  await page.waitForTimeout(150);
  await shot('25-staff');

  await page.click('.tab[data-arg="company"]');
  await page.click('[data-action="upgrade"][data-arg="office"]');
  await page.click('[data-action="upgrade"][data-arg="lab"]');
  await page.click('[data-action="borrow"]');
  await page.click('[data-action="repay"]');
  await page.waitForTimeout(150);
  await shot('26-company');

  const checks = await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    const s = ctx.state;
    return { staff: s.staff.length, office: s.facilities.office, lab: s.facilities.lab, researched: s.stats.researched, perks: Object.keys(s.perks).length, loan: s.company.loan };
  });
  if (checks.staff < 3 || checks.office < 1 || checks.lab < 1 || !checks.researched || !checks.perks) {
    throw new Error(`management actions did not apply: ${JSON.stringify(checks)}`);
  }

  // a second product with two parallel teams is not possible in a small office, but designing again is
  await page.click('[data-action="new-product"]');
  await page.click('.cat-card[data-cat="console"]');
  await page.click('[data-preset="budget"]');
  await page.click('[data-start]');
  await page.click('.speed-btn[data-speed="3"]');
  await page.waitForSelector('[data-launch]', { timeout: 30000 });
  await page.click('[data-camp="magazine"]');
  await page.click('[data-launch]');
  await page.waitForSelector('.review.show');
  await page.click('.modal-foot [data-close]');

  // fast-forward through history using the live modules, auto-resolving anything that pops up
  const result = await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    const G = await import('/src/sim/game.js');
    const app = await import('/src/ui/app.js');
    const modals = await import('/src/ui/modals.js');
    const s = ctx.state;
    s.company.cash += 5e6;
    let launches = 0;
    for (let i = 0; i < 48 * 30 && !s.gameOver; i++) {
      G.tick(s);
      while (s.decisions.length) G.resolveDecision(s, s.decisions[0].id, 1);
      for (const p of s.projects.filter((x) => x.status === 'ready')) { G.launchProduct(s, p.id, 999, []); launches++; }
      if (i % 48 === 0) { app.afterTick(); modals.closeAll(); app.render(true); }
    }
    modals.closeAll();
    app.render(true);
    return { week: s.week, cash: s.company.cash, launches, gameOver: s.gameOver };
  });
  console.log('fast-forward:', JSON.stringify(result));
  for (const tab of ['overview', 'markets', 'company']) {
    await page.click(`.tab[data-arg="${tab}"]`);
    await page.waitForTimeout(250);
    await shot(`09-late-${tab}`);
  }
  await page.click('#btn-menu');
  await page.waitForTimeout(200);
  await shot('10-menu');
  await page.click('[data-m="title"]');
  await page.waitForSelector('#title-screen:not([hidden])');

  // reload the page and continue from the autosave
  await page.reload();
  await page.waitForSelector('#btn-continue:not([hidden])');
  await page.click('#btn-continue');
  await page.waitForSelector('#game-screen:not([hidden])');
  const resumed = await page.evaluate(async () => (await import('/src/ui/ctx.js')).ctx.state.company.name);
  if (resumed !== 'Smoke Test Inc') throw new Error(`continue loaded the wrong save: ${resumed}`);

  // a decision event pops up and can be answered
  await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    const app = await import('/src/ui/app.js');
    ctx.state.decisions.push({ id: 'dtest', kind: 'university', title: 'Test Decision', text: 'Pick one', options: [{ label: 'Yes' }, { label: 'No' }], data: { rp: 10, cost: 1 } });
    app.checkInterrupts();
  });
  await page.waitForSelector('[data-opt="0"]');
  await shot('11-decision');
  await page.click('[data-opt="0"]');

  // the campaign ends in 2041 and offers to keep playing
  await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    ctx.state.week = (2041 - 1977) * 48 - 2;
  });
  await page.click('.speed-btn[data-speed="3"]');
  await page.waitForSelector('[data-continue]', { timeout: 10000 });
  await shot('12-the-end');
  await page.click('[data-continue]');
  await page.waitForTimeout(600);
  const endless = await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    return { over: ctx.state.gameOver, endless: ctx.state.flags.endless };
  });
  if (endless.over || !endless.endless) throw new Error('keep playing did not resume the game');

  // bankruptcy returns to the title screen
  await page.evaluate(async () => {
    const { ctx } = await import('/src/ui/ctx.js');
    const s = ctx.state;
    s.company.cash = -1e15;
    s.company.loan = 1e15;
  });
  await page.waitForSelector('[data-newgame]', { timeout: 15000 });
  await shot('13-bankrupt');
  await page.click('[data-newgame]');
  await page.waitForSelector('#title-screen:not([hidden])');
} catch (err) {
  errors.push(`test: ${err.message}`);
  await shot('error');
}

await browser.close();
server.close();
if (errors.length) {
  console.error('FAILED');
  for (const e of errors) console.error(' ', e);
  process.exit(1);
}
console.log('smoke test passed');
