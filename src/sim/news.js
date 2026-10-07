const MAX_NEWS = 160;

/** Persistent news feed entry. type: info | good | bad | rival | event | research */
export function addNews(state, text, type = 'info', extra = {}) {
  state.news.unshift({ week: state.week, text, type, ...extra });
  if (state.news.length > MAX_NEWS) state.news.length = MAX_NEWS;
}

// Transient UI queues live outside the state so they never end up in a save file.
const toasts = new WeakMap();
const cues = new WeakMap();

function queue(map, state) {
  let q = map.get(state);
  if (!q) { q = []; map.set(state, q); }
  return q;
}

/** Transient toast for the UI. */
export function notify(state, text, type = 'info', extra = {}) {
  queue(toasts, state).push({ text, type, ...extra });
}

export function drainToasts(state) {
  const q = queue(toasts, state);
  return q.splice(0, q.length);
}

/** Sound cue for the UI. */
export function cue(state, name) {
  queue(cues, state).push(name);
}

export function drainCues(state) {
  const q = queue(cues, state);
  return q.splice(0, q.length);
}
