import { describe, expect, it } from "vitest";
import { initialPosition, playSan } from "@/domain/chess/position";
import type { Line } from "@/domain/content/schema";
import type { SessionContext } from "@/domain/session/machine";
import { initialTrainingOrder } from "@/domain/session/queue";
import { startOpponentAutoplay, type Timers } from "./autoplay";
import { createSessionStore } from "./store";

function line(name: string, sans: string[]): Line {
  let position = initialPosition();
  const moves = sans.map((san) => {
    const result = playSan(position, san);
    if (result === undefined) throw new Error(`Coup illégal dans le test : ${san}`);
    position = result.position;
    return { ...result.move, comment: null, arrows: [], highlights: [] };
  });
  return { name, moves };
}

const CONTEXT: SessionContext = {
  side: "white",
  lines: [line("A", ["e4", "e5", "Nf3"]), line("B", ["e4", "c5", "Nf3"]), line("C", ["e4", "e6", "d4"])],
};

/** Fausse horloge : les minuteries ne partent que sur `tick()`. */
function fakeTimers() {
  let nextHandle = 1;
  const pending = new Map<number, { callback: () => void; delayMs: number }>();
  const timers: Timers = {
    setTimeout: (callback, delayMs) => {
      const handle = nextHandle++;
      pending.set(handle, { callback, delayMs });
      return handle;
    },
    clearTimeout: (handle) => {
      pending.delete(handle);
    },
  };
  const tick = () => {
    const due = [...pending.values()];
    pending.clear();
    for (const timer of due) timer.callback();
  };
  return { timers, pending, tick };
}

describe("createSessionStore", () => {
  it("démarre sur l'intro et délègue chaque événement au réducteur", () => {
    const store = createSessionStore(CONTEXT, { seed: 1 });
    expect(store.getState().state).toEqual({ phase: "intro" });
    store.getState().dispatch({ type: "start-learning" });
    store.getState().dispatch({ type: "play", uci: "e2e4" });
    expect(store.getState().state).toMatchObject({ phase: "learn", lineIndex: 0, ply: 1 });
  });

  it("ne notifie pas les abonnés quand l'événement est ignoré", () => {
    const store = createSessionStore(CONTEXT, { seed: 1 });
    let notifications = 0;
    store.subscribe(() => notifications++);
    store.getState().dispatch({ type: "advance" });
    expect(notifications).toBe(0);
  });

  it("startTraining mélange la file avec la graine injectée", () => {
    const store = createSessionStore(CONTEXT, { seed: 42 });
    store.getState().dispatch({ type: "start-learning" });
    store.getState().startTraining();
    const state = store.getState().state;
    if (state.phase !== "train") throw new Error("phase attendue : train");
    expect([state.current.lineIndex, ...state.queue]).toEqual(initialTrainingOrder(3, 42));
  });

  it("chaque store a son propre état (une session par page)", () => {
    const a = createSessionStore(CONTEXT, { seed: 1 });
    const b = createSessionStore(CONTEXT, { seed: 1 });
    a.getState().dispatch({ type: "start-learning" });
    expect(b.getState().state).toEqual({ phase: "intro" });
  });
});

describe("startOpponentAutoplay", () => {
  it("joue le coup adverse après le délai, puis attend le joueur", () => {
    const store = createSessionStore(CONTEXT, { seed: 1 });
    const { timers, pending, tick } = fakeTimers();
    startOpponentAutoplay(store, timers, 300);

    store.getState().dispatch({ type: "start-learning" });
    expect(pending.size).toBe(0);

    store.getState().dispatch({ type: "play", uci: "e2e4" });
    expect([...pending.values()].map((timer) => timer.delayMs)).toEqual([300]);
    tick();
    expect(store.getState().state).toMatchObject({ ply: 2 });
    expect(pending.size).toBe(0);
  });

  it("joue d'emblée le premier coup quand l'adversaire a les Blancs", () => {
    const store = createSessionStore({ ...CONTEXT, side: "black" }, { seed: 1 });
    store.getState().dispatch({ type: "start-learning" });
    const { timers, tick } = fakeTimers();
    startOpponentAutoplay(store, timers);
    tick();
    expect(store.getState().state).toMatchObject({ ply: 1 });
  });

  it("annule le coup programmé si l'état change avant l'échéance", () => {
    const store = createSessionStore(CONTEXT, { seed: 1 });
    const { timers, pending } = fakeTimers();
    startOpponentAutoplay(store, timers);
    store.getState().dispatch({ type: "start-learning" });
    store.getState().dispatch({ type: "play", uci: "e2e4" });
    expect(pending.size).toBe(1);
    store.getState().dispatch({ type: "back" });
    expect(pending.size).toBe(0);
  });

  it("ne rejoue pas le coup adverse après un retour en arrière", () => {
    const store = createSessionStore(CONTEXT, { seed: 1 });
    const { timers, pending, tick } = fakeTimers();
    startOpponentAutoplay(store, timers);
    store.getState().dispatch({ type: "start-learning" });
    store.getState().dispatch({ type: "play", uci: "e2e4" });
    tick();
    store.getState().dispatch({ type: "back" });
    expect(store.getState().state).toMatchObject({ ply: 1 });
    expect(pending.size).toBe(0);
  });

  it("le désabonnement annule le coup en attente et arrête l'autoplay", () => {
    const store = createSessionStore(CONTEXT, { seed: 1 });
    const { timers, pending } = fakeTimers();
    const stop = startOpponentAutoplay(store, timers);
    store.getState().dispatch({ type: "start-learning" });
    store.getState().dispatch({ type: "play", uci: "e2e4" });
    stop();
    expect(pending.size).toBe(0);
    store.getState().dispatch({ type: "back" });
    store.getState().dispatch({ type: "play", uci: "e2e4" });
    expect(pending.size).toBe(0);
  });
});
