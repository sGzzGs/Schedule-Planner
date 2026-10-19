// Created at: 2026-10-16 02:03
import { describe, it, expect, vi } from "vitest";
import { createStore } from "@state/createStore.js";

describe("state/createStore.js - Motor de Store Reativa", () => {
  it("deve inicializar com o estado fornecido", () => {
    const store = createStore({ count: 10, name: "SENAI" });
    expect(store.getState()).toEqual({ count: 10, name: "SENAI" });
  });

  it("deve atualizar estado via objeto parcial", () => {
    const store = createStore({ count: 0, text: "A" });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, text: "A" });
  });

  it("deve atualizar estado via função updater", () => {
    const store = createStore({ count: 5 });
    store.setState(prev => ({ count: prev.count + 2 }));
    expect(store.getState().count).toBe(7);
  });

  it("deve notificar listeners registrados a cada mudança", () => {
    const store = createStore({ active: false });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.setState({ active: true });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ active: true }, { active: false });

    // Cancelar subscrição
    unsubscribe();
    store.setState({ active: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("deve resetar para o estado inicial sem manter mutações", () => {
    const store = createStore({ val: "initial" });
    store.setState({ val: "changed" });
    expect(store.getState().val).toBe("changed");

    store.reset();
    expect(store.getState().val).toBe("initial");
  });
});
