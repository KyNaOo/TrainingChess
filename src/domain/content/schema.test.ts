import { describe, expect, it } from "vitest";
import {
  type OpeningMeta,
  lineSchema,
  moveSchema,
  openingMetaSchema,
  openingSchema,
} from "./schema";

const validMeta: OpeningMeta = {
  id: "italian-game",
  name: "Partie italienne",
  eco: ["C50", "C53", "C54"],
  side: "white",
  level: "beginner",
  popularity: 1,
  keyPosition: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  summary: "Une ouverture classique qui vise le centre et la case f7.",
  keyIdeas: ["Développer vite", "Viser f7", "Préparer c3 et d4"],
  pawnStructures: "Centre ouvert ou fermé selon la poussée d4.",
  typicalPlans: { white: "Préparer d4 avec c3.", black: "Contester le centre avec ...d5." },
  reviewed: false,
};

const validMove = {
  uci: "e2e4",
  san: "e4",
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  side: "white",
  comment: "Occupe le centre et libère le fou et la dame.",
  arrows: [{ from: "e2", to: "e4", brush: "green" }],
  highlights: [{ square: "d5", brush: "red" }],
};

/** Chemins des erreurs Zod, ex. `["side", "keyPosition"]`. */
function errorPaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("openingMetaSchema", () => {
  it("accepte un meta.json valide", () => {
    expect(openingMetaSchema.parse(validMeta)).toEqual(validMeta);
  });

  it.each(Object.keys(validMeta))("rejette un meta.json sans le champ %s", (field) => {
    const meta: Record<string, unknown> = { ...validMeta };
    delete meta[field];
    expect(errorPaths(openingMetaSchema.safeParse(meta))).toContain(field);
  });

  it("rejette une FEN syntaxiquement invalide", () => {
    const result = openingMetaSchema.safeParse({ ...validMeta, keyPosition: "pas une fen" });
    expect(errorPaths(result)).toEqual(["keyPosition"]);
  });

  it("rejette une FEN décrivant une position illégale", () => {
    const noWhiteKing = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w kq - 0 1";
    expect(errorPaths(openingMetaSchema.safeParse({ ...validMeta, keyPosition: noWhiteKing }))).toEqual([
      "keyPosition",
    ]);
  });

  it.each([
    ["side", "blancs"],
    ["side", "both"],
    ["level", "expert"],
    ["level", "Beginner"],
  ])("rejette %s = %s (hors énumération)", (field, value) => {
    expect(errorPaths(openingMetaSchema.safeParse({ ...validMeta, [field]: value }))).toEqual([field]);
  });

  it.each([
    ["id", "Italian Game"],
    ["eco", []],
    ["eco", ["C5"]],
    ["popularity", 0],
    ["popularity", 1.5],
    ["name", "   "],
    ["keyIdeas", []],
    ["reviewed", "false"],
  ])("rejette %s = %j", (field, value) => {
    const paths = errorPaths(openingMetaSchema.safeParse({ ...validMeta, [field]: value }));
    expect(paths.some((path) => path === field || path.startsWith(`${field}.`))).toBe(true);
  });

  it("rejette un camp manquant dans typicalPlans", () => {
    const result = openingMetaSchema.safeParse({ ...validMeta, typicalPlans: { white: "…" } });
    expect(errorPaths(result)).toEqual(["typicalPlans.black"]);
  });

  it("rejette un champ inconnu (faute de frappe)", () => {
    const result = openingMetaSchema.safeParse({ ...validMeta, reveiwed: true });
    expect(result.success).toBe(false);
  });
});

describe("schéma du JSON généré", () => {
  it("accepte un coup complet, avec ou sans commentaire", () => {
    expect(moveSchema.safeParse(validMove).success).toBe(true);
    expect(moveSchema.safeParse({ ...validMove, comment: null, arrows: [], highlights: [] }).success).toBe(true);
  });

  it.each([
    ["uci", "e4"],
    ["uci", "e7e8k"],
    ["fen", "pas une fen"],
    ["side", "w"],
    ["comment", ""],
    ["arrows", [{ from: "e2", to: "e9", brush: "green" }]],
    ["arrows", [{ from: "e2", to: "e4", brush: "purple" }]],
    ["highlights", [{ square: "z1", brush: "red" }]],
  ])("rejette un coup avec %s = %j", (field, value) => {
    expect(errorPaths(moveSchema.safeParse({ ...validMove, [field]: value }))[0]).toMatch(
      new RegExp(`^${field}`),
    );
  });

  it("rejette une ligne sans coup", () => {
    expect(lineSchema.safeParse({ name: "Giuoco Piano", moves: [] }).success).toBe(false);
  });

  it("accepte une ouverture complète : meta + lignes", () => {
    const opening = { ...validMeta, lines: [{ name: "Giuoco Piano", moves: [validMove] }] };
    expect(openingSchema.parse(opening)).toEqual(opening);
  });

  it("rejette une ouverture sans ligne", () => {
    expect(errorPaths(openingSchema.safeParse({ ...validMeta, lines: [] }))).toEqual(["lines"]);
  });
});
