import { describe, expect, it } from "vitest";
import { buildOpening, CONTENT_LIMITS, ContentError, type ContentLimits } from "./extract";

/** Bornes relâchées pour tester l'extraction sur de petits PGN. */
const RELAXED: ContentLimits = { minLines: 1, maxLines: 8, minPlayerMoves: 1, maxPlayerMoves: 14 };

const AFTER_BC4 = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";

function meta(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-opening",
    name: "Ouverture de test",
    eco: ["C50"],
    side: "white",
    level: "beginner",
    popularity: 1,
    keyPosition: AFTER_BC4,
    summary: "Résumé.",
    keyIdeas: ["Idée."],
    pawnStructures: "Structure.",
    typicalPlans: { white: "Plan blanc.", black: "Plan noir." },
    reviewed: false,
    ...overrides,
  };
}

function build(pgn: string, options: { meta?: Record<string, unknown>; limits?: ContentLimits; folder?: string } = {}) {
  return buildOpening({
    folder: options.folder ?? "test-opening",
    meta: meta(options.meta),
    pgn,
    limits: options.limits ?? RELAXED,
  });
}

function buildError(...args: Parameters<typeof build>): string {
  try {
    build(...args);
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return (error as Error).message;
  }
  throw new Error("buildOpening aurait dû échouer");
}

const TWO_LINES_PGN = `
[Event "Test"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 { # Italienne — Le fou vise f7. [%cal Gc4f7] [%csl Rf7] }
3... Bc5 (3... Nf6 { # Deux cavaliers — Les Noirs contre-attaquent e4. } 4. d3 { Protège e4. }) 4. c3 *
`;

describe("buildOpening — extraction des lignes", () => {
  it("transforme chaque feuille de l'arbre en ligne, ligne principale d'abord", () => {
    const opening = build(TWO_LINES_PGN);
    expect(opening.lines.map((line) => line.name)).toEqual(["Italienne", "Deux cavaliers"]);
    expect(opening.lines.map((line) => line.moves.map((move) => move.san))).toEqual([
      ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"],
      ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3"],
    ]);
  });

  it("garde les métadonnées et produit coups UCI, FEN, camp, commentaire, flèches et cases", () => {
    const opening = build(TWO_LINES_PGN);
    expect(opening).toMatchObject({ id: "test-opening", side: "white", reviewed: false });
    expect(opening.lines[0]?.moves[4]).toEqual({
      uci: "f1c4",
      san: "Bc4",
      fen: AFTER_BC4,
      side: "white",
      comment: "Le fou vise f7.",
      arrows: [{ from: "c4", to: "f7", brush: "green" }],
      highlights: [{ square: "f7", brush: "red" }],
    });
    expect(opening.lines[0]?.moves[0]).toMatchObject({ comment: null, arrows: [], highlights: [], side: "white" });
    expect(opening.lines[1]?.moves[6]).toMatchObject({ san: "d3", comment: "Protège e4." });
  });

  it("nomme par défaut une ligne sans commentaire « # »", () => {
    const opening = build("1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *", {
      meta: { keyPosition: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" },
    });
    expect(opening.lines.map((line) => line.name)).toEqual(["Ligne 1", "Ligne 2"]);
  });

  it("autorise plusieurs réponses adverses pour un camp noir", () => {
    const opening = build("1. e4 c6 2. d4 d5 3. e5 (3. Nc3 dxe4) (3. exd5 cxd5) Bf5 *", {
      meta: { side: "black", keyPosition: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2" },
    });
    expect(opening.lines).toHaveLength(3);
    expect(opening.lines.map((line) => line.moves.at(-1)?.san)).toEqual(["Bf5", "dxe4", "cxd5"]);
  });
});

describe("buildOpening — rejets", () => {
  it("rejette un coup illégal avec ouverture, ligne et numéro de coup", () => {
    const message = buildError("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (3... Nf6 4. Bb7) 4. c3 *");
    expect(message).toBe("[test-opening] ligne 2, coup 4. Bb7 : coup illégal.");
  });

  it("numérote un coup noir illégal avec « ... »", () => {
    expect(buildError("1. e4 e5 2. Nf3 Ke6 *")).toBe("[test-opening] ligne 1, coup 2... Ke6 : coup illégal.");
  });

  it("rejette deux coups du joueur sur un même nœud", () => {
    const message = buildError("1. e4 e5 2. Nf3 (2. Bc4) Nc6 3. Bc4 *");
    expect(message).toBe(
      "[test-opening] ligne 1, coup 2. Nf3 : plusieurs coups du joueur au même nœud (Nf3, Bc4) ; un seul est autorisé.",
    );
  });

  it("rejette deux coups du joueur au premier coup des Blancs", () => {
    expect(buildError("1. e4 (1. d4) e5 *")).toContain("plusieurs coups du joueur au même nœud (e4, d4)");
  });

  it("rejette si keyPosition n'est atteinte que dans une variante", () => {
    // Camp noir : les Blancs peuvent avoir plusieurs coups, 3. Bc4 n'est qu'une variante.
    const message = buildError("1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4) a6 *", { meta: { side: "black" } });
    expect(message).toContain("[test-opening] keyPosition n'est pas atteinte dans la ligne principale");
  });

  it("rejette un meta.json invalide en citant le champ", () => {
    expect(buildError(TWO_LINES_PGN, { meta: { side: "red" } })).toMatch(/^\[test-opening\] meta\.json invalide :\n {2}- side/);
  });

  it("rejette un id différent du nom du dossier", () => {
    expect(buildError(TWO_LINES_PGN, { folder: "italian-game" })).toContain("doit être identique au nom du dossier");
  });

  it.each([
    ["aucune partie", ""],
    ["deux parties", `${TWO_LINES_PGN}\n\n${TWO_LINES_PGN}`],
  ])("rejette un PGN avec %s", (_, pgn) => {
    expect(buildError(pgn)).toContain("exactement une partie");
  });

  it("rejette une position de départ personnalisée", () => {
    const pgn = `[SetUp "1"]\n[FEN "${AFTER_BC4}"]\n\n3... Bc5 *`;
    expect(buildError(pgn)).toContain("position initiale");
  });

  it("rejette deux lignes du même nom", () => {
    const pgn = "1. e4 e5 { # Ouverte } (1... c5 { # Ouverte } 2. Nf3) 2. Nf3 Nc6 3. Bc4 *";
    expect(buildError(pgn)).toContain("nom de ligne en double : « Ouverte »");
  });
});

describe("buildOpening — bornes du contenu", () => {
  it("applique par défaut les bornes de CLAUDE.md", () => {
    expect(CONTENT_LIMITS).toEqual({ minLines: 3, maxLines: 8, minPlayerMoves: 6, maxPlayerMoves: 14 });
  });

  it("rejette un nombre de lignes hors bornes", () => {
    expect(buildError(TWO_LINES_PGN, { limits: { ...RELAXED, minLines: 3 } })).toBe(
      "[test-opening] 2 ligne(s) : il en faut entre 3 et 8.",
    );
  });

  it("rejette une ligne trop courte en coups du joueur", () => {
    expect(buildError(TWO_LINES_PGN, { limits: { ...RELAXED, minPlayerMoves: 5 } })).toBe(
      "[test-opening] ligne 1 (« Italienne ») : 4 coup(s) du joueur, il en faut entre 5 et 14.",
    );
  });

  it("rejette une ligne trop longue en coups du joueur", () => {
    expect(buildError(TWO_LINES_PGN, { limits: { ...RELAXED, maxPlayerMoves: 3 } })).toContain(
      "4 coup(s) du joueur, il en faut entre 1 et 3.",
    );
  });
});
