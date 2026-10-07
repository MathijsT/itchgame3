import { SAVE_VERSION } from '../data/constants.js';

// Rounds floats so saves stay small. Integers (like the RNG state) are untouched.
function replacer(key, value) {
  if (typeof value === 'number' && !Number.isInteger(value)) {
    const a = Math.abs(value);
    if (a >= 1000) return Math.round(value);
    return Math.round(value * 10000) / 10000;
  }
  return value;
}

export function serialize(state) {
  return JSON.stringify(state, replacer);
}

export function deserialize(json) {
  const state = JSON.parse(json);
  if (!state || typeof state !== 'object' || !state.company || state.version !== SAVE_VERSION) {
    throw new Error('Incompatible or corrupt save file.');
  }
  return state;
}
