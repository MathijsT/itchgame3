// Boot: title screen, new-game setup, save loading and the real-time game loop.
import { START_ERAS, DIFFICULTIES } from './data/constants.js';
import * as G from './sim/game.js';
import { deserialize } from './sim/save.js';
import { ctx, SPEEDS, loadSettings } from './ui/ctx.js';
import { $, esc } from './ui/dom.js';
import { openModal, modalOpen, closeAll } from './ui/modals.js';
import {
  initApp, render, afterTick, checkInterrupts, setSpeed, saveGame, hasSave, SAVE_KEY, openHelp, resetRenderCache,
  loadScores, scoresTable,
} from './ui/app.js';
import { drawOffice, drawTitleBg } from './ui/office.js';
import { sfx } from './ui/audio.js';

loadSettings();

const titleScreen = $('#title-screen');
const gameScreen = $('#game-screen');
const officeCanvas = $('#office');
const titleCanvas = $('#title-bg');

function showTitle() {
  ctx.state = null;
  closeAll();
  gameScreen.hidden = true;
  titleScreen.hidden = false;
  $('#btn-continue').hidden = !hasSave();
  $('#btn-scores').hidden = loadScores().length === 0;
}

$('#btn-scores').addEventListener('click', () => {
  openModal({ title: 'Hall of Fame', icon: '🏆', size: 'medium', body: scoresTable(loadScores()), foot: '<button class="btn btn-primary" data-close>Close</button>' });
});

function startWithState(state) {
  ctx.state = state;
  ctx.tab = 'overview';
  resetRenderCache();
  titleScreen.hidden = true;
  gameScreen.hidden = false;
  setSpeed(0);
  render(true);
  saveGame();
}

initApp({ onExit: showTitle });

$('#btn-continue').addEventListener('click', () => {
  try {
    const state = deserialize(localStorage.getItem(SAVE_KEY));
    startWithState(state);
    sfx('start');
    setTimeout(checkInterrupts, 100);
  } catch (err) {
    console.error(err);
    openModal({ title: 'Could not load save', body: `<p>${esc(err.message)}</p>`, foot: '<button class="btn btn-primary" data-close>OK</button>' });
  }
});

$('#btn-howto').addEventListener('click', openHelp);

$('#btn-new').addEventListener('click', () => {
  const eras = Object.values(START_ERAS);
  const m = openModal({
    title: 'Found your company',
    icon: '🚀',
    size: 'medium',
    body: `
      <div class="grid grid-2">
        <div class="field"><label for="ng-company">Company name</label><input id="ng-company" class="input" maxlength="32" value="Garage Labs" autofocus></div>
        <div class="field"><label for="ng-founder">Your name</label><input id="ng-founder" class="input" maxlength="24" value="You"></div>
      </div>
      <div class="field mt"><label>Starting era</label><div class="seg-ctl" data-group="era">
        ${eras.map((e, i) => `<button data-val="${e.year}" class="${i === 0 ? 'active' : ''}"><b>${e.year}</b><small>${esc(e.name.replace(/ \(\d+\)/, ''))}</small></button>`).join('')}
      </div><div class="tiny muted" style="margin-top:4px">1977 is the full campaign. Later eras start with more cash, staff and older tech already known.</div></div>
      <div class="field mt"><label>Difficulty</label><div class="seg-ctl" data-group="difficulty">
        ${Object.entries(DIFFICULTIES).map(([id, d]) => `<button data-val="${id}" class="${id === 'normal' ? 'active' : ''}"><b>${d.name}</b><small>${id === 'easy' ? 'More cash, weaker rivals' : id === 'hard' ? 'Less cash, sharper rivals' : 'The intended experience'}</small></button>`).join('')}
      </div></div>
      ${hasSave() ? '<div class="hint warn mt">Starting a new company replaces your current saved game. Export it from the in-game menu first if you want to keep it.</div>' : ''}`,
    foot: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-go>Start</button>',
  });
  const choice = { era: 1977, difficulty: 'normal' };
  m.body.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-ctl button');
    if (!b) return;
    const group = b.parentElement.dataset.group;
    choice[group] = group === 'era' ? Number(b.dataset.val) : b.dataset.val;
    for (const x of b.parentElement.children) x.classList.toggle('active', x === b);
    sfx('click');
  });
  const go = () => {
    const state = G.newGame({
      companyName: m.body.querySelector('#ng-company').value.trim() || 'Garage Labs',
      founderName: m.body.querySelector('#ng-founder').value.trim() || 'You',
      era: choice.era,
      difficulty: choice.difficulty,
    });
    m.close();
    startWithState(state);
    sfx('start');
    welcome(state);
  };
  m.foot.querySelector('[data-go]').addEventListener('click', go);
  m.body.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
});

function welcome(state) {
  openModal({
    title: `Welcome to ${state.company.name}!`,
    icon: '🏠',
    body: `<p>It is ${state.startYear + Math.floor(state.week / 48)} and you have <b>$${Math.round(state.company.cash).toLocaleString('en-US')}</b> to your name.</p>
      <p>Click <b>＋ New Product</b> to design your first machine. When it is ready you pick a price and the press weighs in.</p>
      <p>The game is paused. Use the ▶ buttons at the top (or Space) to let time run.</p>
      <p class="small muted">Rivals like Pear Computer, Kommodor and Atarri are already selling. Good luck!</p>`,
    foot: '<button class="btn" data-help>How to play</button><button class="btn btn-primary" data-close>Let\'s build!</button>',
    onMount(el) {
      el.querySelector('[data-help]').addEventListener('click', () => openHelp());
    },
  });
}

// import a save from a file or pasted text
$('#btn-import').addEventListener('click', () => {
  const m = openModal({
    title: 'Import save',
    icon: '📥',
    size: 'medium',
    body: '<p class="small muted">Paste exported save text below, or load a .sav file.</p><textarea class="input" rows="8" id="import-text"></textarea>',
    foot: '<button class="btn" data-file>Load file…</button><span class="spacer"></span><button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-ok>Import</button>',
  });
  const load = (text) => {
    try {
      const state = deserialize(text.trim());
      m.close();
      startWithState(state);
      setTimeout(checkInterrupts, 100);
    } catch (err) {
      ctx.toast(`Import failed: ${err.message}`, 'bad');
    }
  };
  m.foot.querySelector('[data-ok]').addEventListener('click', () => load(m.body.querySelector('#import-text').value));
  m.foot.querySelector('[data-file]').addEventListener('click', () => {
    const input = $('#file-input');
    input.value = '';
    input.onchange = () => {
      const f = input.files[0];
      if (!f) return;
      f.text().then(load);
    };
    input.click();
  });
});

// ------------------------------------------------------------------ main loop

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(250, now - last);
  last = now;
  const s = ctx.state;
  if (s && !gameScreen.hidden) {
    const running = !ctx.paused && !modalOpen() && !s.gameOver && ctx.speed > 0;
    if (running) {
      const ms = SPEEDS[ctx.speed];
      acc += dt;
      let steps = 0;
      while (acc >= ms && steps < 3) {
        acc -= ms;
        G.tick(s);
        afterTick();
        steps++;
        if (modalOpen() || s.gameOver) { acc = 0; break; }
      }
      ctx.weekFrac = Math.min(1, acc / ms);
      render();
    } else {
      acc = 0;
      ctx.weekFrac = 0;
    }
    drawOffice(officeCanvas, s, now);
  } else if (!titleScreen.hidden) {
    drawTitleBg(titleCanvas, now);
  }
  requestAnimationFrame(frame);
}

window.addEventListener('pagehide', () => { if (ctx.state) saveGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ctx.state) {
    saveGame();
    if (ctx.speed) setSpeed(0);
  }
});

showTitle();
requestAnimationFrame(frame);
