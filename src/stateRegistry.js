// Registry global state semua domain yang sedang dipantau
// Dipakai oleh /status command di telegramBot.js

const registry = new Map();

function updateState(domain, state) {
  registry.set(domain, { ...state });
}

function getAll() {
  return [...registry.values()];
}

module.exports = { updateState, getAll };
