// Created at: 2026-10-16 02:02
/**
 * @fileoverview Criação de Store reativa desacoplada (Pub/Sub unidirecional).
 * Fornece gerenciamento de estado determinístico sem dependências externas.
 */

/**
 * Cria uma nova instância de Store reativa.
 *
 * @template T
 * @param {T} initialState - Estado inicial da store.
 * @returns {{
 *   getState: () => T,
 *   setState: (updater: Partial<T> | ((prevState: T) => Partial<T>)) => void,
 *   subscribe: (listener: (state: T, prevState: T) => void) => () => void,
 *   reset: () => void
 * }}
 */
export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();
  const initialSnapshot = JSON.parse(JSON.stringify(initialState));

  function getState() {
    return state;
  }

  function setState(updater) {
    const prevState = state;
    const partial = typeof updater === "function" ? updater(prevState) : updater;

    if (!partial || typeof partial !== "object") return;

    state = { ...prevState, ...partial };

    for (const listener of listeners) {
      try {
        listener(state, prevState);
      } catch (err) {
        console.error("Erro no listener da Store:", err);
      }
    }
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function reset() {
    setState(JSON.parse(JSON.stringify(initialSnapshot)));
  }

  return {
    getState,
    setState,
    subscribe,
    reset
  };
}
