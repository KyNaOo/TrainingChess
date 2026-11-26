import { describe, expect, it } from "vitest";
import { moveLabel, uciSquares } from "./notation";

describe("moveLabel", () => {
  it("numérote les coups blancs et noirs", () => {
    expect(moveLabel(0, "e4")).toBe("1. e4");
    expect(moveLabel(1, "e5")).toBe("1... e5");
    expect(moveLabel(4, "Bc4")).toBe("3. Bc4");
    expect(moveLabel(15, "d5")).toBe("8... d5");
  });
});

describe("uciSquares", () => {
  it("extrait les cases d'un coup UCI, promotion comprise", () => {
    expect(uciSquares("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(uciSquares("e1g1")).toEqual({ from: "e1", to: "g1" });
    expect(uciSquares("b7b8n")).toEqual({ from: "b7", to: "b8" });
  });

  it("refuse un coup mal formé", () => {
    expect(uciSquares("e2")).toBeUndefined();
    expect(uciSquares("i2e4")).toBeUndefined();
    expect(uciSquares("e2e4k")).toBeUndefined();
  });
});
