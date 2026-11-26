import { describe, expect, it } from "vitest";
import { createRandom, dequeue, initialTrainingOrder, requeue, shuffle } from "./queue";

describe("createRandom", () => {
  it("même graine → même suite", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const first = Array.from({ length: 20 }, () => a());
    expect(Array.from({ length: 20 }, () => b())).toEqual(first);
  });

  it("graines différentes → suites différentes", () => {
    const a = createRandom(1);
    const b = createRandom(2);
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()));
  });

  it("renvoie des nombres dans [0, 1), y compris pour des graines limites", () => {
    for (const seed of [0, -1, 2 ** 32, 2 ** 53, 1.5]) {
      const random = createRandom(seed);
      for (let i = 0; i < 1000; i++) {
        const value = random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
  });
});

describe("shuffle", () => {
  it("renvoie une permutation sans modifier l'entrée", () => {
    const items = ["a", "b", "c", "d", "e"] as const;
    const result = shuffle(items, createRandom(7));
    expect([...result].sort()).toEqual([...items]);
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("gère les tableaux vides et à un élément", () => {
    expect(shuffle([], createRandom(1))).toEqual([]);
    expect(shuffle([3], createRandom(1))).toEqual([3]);
  });

  it("atteint tous les ordres possibles, de façon à peu près équilibrée", () => {
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 6000; seed++) {
      const key = shuffle([0, 1, 2], createRandom(seed)).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

describe("initialTrainingOrder", () => {
  it("contient toutes les lignes une fois chacune", () => {
    expect([...initialTrainingOrder(8, 123)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("même graine → même ordre", () => {
    expect(initialTrainingOrder(8, 2026)).toEqual(initialTrainingOrder(8, 2026));
  });

  it("l'ordre dépend de la graine", () => {
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => initialTrainingOrder(8, seed).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it("file vide si aucune ligne", () => {
    expect(initialTrainingOrder(0, 1)).toEqual([]);
  });
});

describe("requeue / dequeue", () => {
  it("remet une ligne ratée en fin de file sans modifier la file reçue", () => {
    const queue = [2, 0];
    expect(requeue(queue, 1)).toEqual([2, 0, 1]);
    expect(queue).toEqual([2, 0]);
  });

  it("dequeue renvoie la tête et le reste", () => {
    expect(dequeue([2, 0, 1])).toEqual({ lineIndex: 2, rest: [0, 1] });
    expect(dequeue([1])).toEqual({ lineIndex: 1, rest: [] });
  });

  it("file vide = fin de l'entraînement", () => {
    expect(dequeue([])).toBeUndefined();
  });
});
