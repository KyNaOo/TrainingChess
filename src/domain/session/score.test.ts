import { describe, expect, it } from "vitest";
import type { TrainAttempt } from "./machine";
import { computeScore } from "./score";

const attempt = (lineIndex: number, movesRequested: number, movesFoundFirstTry: number, failed = false): TrainAttempt => ({
  lineIndex,
  movesRequested,
  movesFoundFirstTry,
  failed,
});

describe("computeScore", () => {
  it("session parfaite : 100 %, aucune ligne ratée", () => {
    expect(computeScore([attempt(1, 6, 6), attempt(0, 8, 8), attempt(2, 7, 7)])).toEqual({
      movesRequested: 21,
      movesFoundFirstTry: 21,
      successRate: 1,
      failedLines: [],
    });
  });

  it("session avec échecs : les passages répétés comptent dans les coups demandés", () => {
    const score = computeScore([
      attempt(0, 6, 4, true),
      attempt(1, 6, 6),
      attempt(2, 6, 5, true),
      attempt(0, 6, 5, true),
      attempt(2, 6, 6),
      attempt(0, 6, 6),
    ]);
    expect(score.movesRequested).toBe(36);
    expect(score.movesFoundFirstTry).toBe(32);
    expect(score.successRate).toBeCloseTo(32 / 36);
    expect(score.failedLines).toEqual([
      { lineIndex: 0, failures: 2 },
      { lineIndex: 2, failures: 1 },
    ]);
  });

  it("une erreur rattrapée baisse le taux sans rendre la ligne ratée", () => {
    const score = computeScore([attempt(0, 6, 5)]);
    expect(score.successRate).toBeCloseTo(5 / 6);
    expect(score.failedLines).toEqual([]);
  });

  it("à égalité d'échecs, les lignes restent dans l'ordre du contenu", () => {
    const score = computeScore([attempt(3, 6, 5, true), attempt(1, 6, 5, true), attempt(2, 6, 4, true)]);
    expect(score.failedLines.map((line) => line.lineIndex)).toEqual([1, 2, 3]);
  });

  it("aucun coup trouvé du premier coup : 0 %", () => {
    expect(computeScore([attempt(0, 6, 0, true), attempt(0, 6, 6)]).successRate).toBe(0.5);
    expect(computeScore([attempt(0, 6, 0, true)]).successRate).toBe(0);
  });

  it("aucun coup demandé : taux non défini plutôt qu'une division par zéro", () => {
    expect(computeScore([])).toEqual({ movesRequested: 0, movesFoundFirstTry: 0, successRate: null, failedLines: [] });
    expect(computeScore([attempt(0, 0, 0)]).successRate).toBeNull();
  });

  it("ne modifie pas la liste reçue", () => {
    const attempts = [attempt(1, 6, 5, true), attempt(0, 6, 5, true)];
    const snapshot = structuredClone(attempts);
    computeScore(attempts);
    expect(attempts).toEqual(snapshot);
  });
});
