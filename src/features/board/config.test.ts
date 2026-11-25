import { INITIAL_FEN } from "chessops/fen";
import { describe, expect, it } from "vitest";
import { type BoardView, buildBoardConfig, moveToUci, needsPromotionChoice, toShapes } from "./config";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const PROMOTION_FEN = "r3k2r/1P6/8/8/8/8/8/R3K2R w KQkq - 0 1";
const FOOLS_MATE = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

function view(overrides: Partial<BoardView> = {}): BoardView {
  return {
    fen: INITIAL_FEN,
    orientation: "white",
    playerColor: "white",
    viewOnly: false,
    arrows: [],
    highlights: [],
    lastMove: null,
    ...overrides,
  };
}

describe("buildBoardConfig", () => {
  it("rend les pièces du joueur jouables quand c'est son tour", () => {
    const config = buildBoardConfig(view());
    expect(config).toMatchObject({ fen: INITIAL_FEN, orientation: "white", turnColor: "white", check: false });
    expect(config.movable?.color).toBe("white");
    expect(config.movable?.dests?.get("e2")).toEqual(expect.arrayContaining(["e3", "e4"]));
    expect(config.blockTouchScroll).toBe(true);
  });

  it("bloque l'échiquier quand c'est au tour de l'adversaire", () => {
    const config = buildBoardConfig(view({ fen: AFTER_E4, lastMove: "e2e4" }));
    expect(config.turnColor).toBe("black");
    expect(config.movable?.color).toBeUndefined();
    expect(config.movable?.dests?.size).toBe(0);
    expect(config.lastMove).toEqual(["e2", "e4"]);
  });

  it("oriente l'échiquier côté Noirs", () => {
    const config = buildBoardConfig(view({ fen: AFTER_E4, orientation: "black", playerColor: "black" }));
    expect(config.orientation).toBe("black");
    expect(config.movable?.color).toBe("black");
  });

  it("signale l'échec et bloque une position terminée", () => {
    const config = buildBoardConfig(view({ fen: FOOLS_MATE }));
    expect(config.check).toBe("white");
    expect(config.movable?.color).toBeUndefined();
  });

  it("mode miniature : lecture seule, sans coordonnées, animation ni dessin", () => {
    const config = buildBoardConfig(view({ viewOnly: true }));
    expect(config).toMatchObject({ viewOnly: true, coordinates: false, blockTouchScroll: false });
    expect(config.animation?.enabled).toBe(false);
    expect(config.drawable?.enabled).toBe(false);
    expect(config.movable?.color).toBeUndefined();
  });

  it("efface le dernier coup quand il n'y en a pas", () => {
    const config = buildBoardConfig(view());
    expect("lastMove" in config && config.lastMove === undefined).toBe(true);
  });

  it("rejette une FEN invalide", () => {
    expect(() => buildBoardConfig(view({ fen: "pas une fen" }))).toThrow("FEN invalide");
  });
});

describe("toShapes", () => {
  it("convertit flèches et cases en formes chessground", () => {
    expect(
      toShapes([{ from: "c4", to: "f7", brush: "green" }], [{ square: "f7", brush: "red" }]),
    ).toEqual([
      { orig: "f7", brush: "red" },
      { orig: "c4", dest: "f7", brush: "green" },
    ]);
  });
});

describe("moveToUci", () => {
  it("renvoie le coup UCI d'un déplacement légal", () => {
    expect(moveToUci(INITIAL_FEN, "g1", "f3")).toBe("g1f3");
  });

  it("renvoie undefined pour un déplacement illégal", () => {
    expect(moveToUci(INITIAL_FEN, "e2", "e5")).toBeUndefined();
  });

  it("normalise le roque « roi prend tour »", () => {
    expect(moveToUci(PROMOTION_FEN, "e1", "h1")).toBe("e1g1");
    expect(moveToUci(PROMOTION_FEN, "e1", "a1")).toBe("e1c1");
  });

  it.each([
    ["queen", "b7b8q"],
    ["rook", "b7b8r"],
    ["bishop", "b7b8b"],
    ["knight", "b7b8n"],
  ] as const)("ajoute la pièce de promotion (%s)", (role, uci) => {
    expect(moveToUci(PROMOTION_FEN, "b7", "b8", role)).toBe(uci);
  });

  it("refuse une promotion sans pièce", () => {
    expect(moveToUci(PROMOTION_FEN, "b7", "b8")).toBeUndefined();
  });
});

describe("needsPromotionChoice", () => {
  it("détecte un pion qui atteint la dernière rangée", () => {
    expect(needsPromotionChoice(PROMOTION_FEN, "b7", "b8")).toBe(true);
    expect(needsPromotionChoice(PROMOTION_FEN, "b7", "a8")).toBe(true);
  });

  it("ignore les autres coups", () => {
    expect(needsPromotionChoice(PROMOTION_FEN, "a1", "a7")).toBe(false);
    expect(needsPromotionChoice(INITIAL_FEN, "e2", "e4")).toBe(false);
  });
});
