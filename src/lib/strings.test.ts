import { describe, expect, it } from "vitest";
import { strings } from "./strings";

function leaves(value: unknown, path: string): Array<[string, unknown]> {
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`));
  }
  return [[path, value]];
}

describe("strings", () => {
  it.each(leaves(strings, "strings"))("%s est une chaîne non vide sans espace superflu", (_, value) => {
    expect(typeof value).toBe("string");
    expect((value as string).trim()).toBe(value);
    expect(value).not.toBe("");
  });

  it("couvre les deux camps et les trois niveaux", () => {
    expect(Object.keys(strings.sides)).toEqual(["white", "black"]);
    expect(Object.keys(strings.levels)).toEqual(["beginner", "intermediate", "advanced"]);
  });
});
