// Shared UI context: the live game state plus UI-only settings.

export const SPEEDS = [0, 1100, 520, 210]; // ms per in-game week

export const ctx = {
  state: null,
  speed: 1,
  paused: true,
  tab: 'overview',
  marketCat: 'homecomputer',
  researchAll: false,
  weekFrac: 0,
  dirty: true,
  settings: { sound: true },
  /** set by app.js */
  render: () => {},
  perform: () => {},
};

const SETTINGS_KEY = 'silicongarage.settings';

export function loadSettings() {
  try {
    Object.assign(ctx.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
  } catch { /* ignore */ }
}

export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(ctx.settings)); } catch { /* ignore */ }
}
