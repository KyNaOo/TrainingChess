import { INITIAL_FEN } from "chessops/fen";
import { describe, expect, it } from "vitest";
import {
  initialPosition,
  isPromotionMove,
  legalDests,
  playSan,
  playUci,
  positionFromFen,
  type SquareName,
  toFen,
} from "./position";

/** Blancs : pion b7 prêt à promouvoir, roques possibles des deux côtés. */
const PROMOTION_AND_CASTLING_FEN = "r3k2r/1P6/8/8/8/8/8/R3K2R w KQkq - 0 1";

function position(fen: string) {
  const result = positionFromFen(fen);
  if (result === undefined) throw new Error(`FEN de test invalide : ${fen}`);
  return result;
}

describe("positions", () => {
  it("part de la position initiale", () => {
    expect(toFen(initialPosition())).toBe(INITIAL_FEN);
  });

  it("charge une position depuis une FEN", () => {
    const fen = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(toFen(position(fen))).toBe(fen);
  });

  it.each(["pas une fen", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w kq - 0 1"])(
    "renvoie undefined pour %s",
    (fen) => {
      expect(positionFromFen(fen)).toBeUndefined();
    },
  );
});

describe("jouer un coup", () => {
  it("joue un coup UCI et renvoie SAN, UCI, FEN et camp", () => {
    const result = playUci(initialPosition(), "e2e4");
    expect(result?.move).toEqual({
      uci: "e2e4",
      san: "e4",
      // Pas de case en passant : aucun pion noir ne peut prendre en e3 (convention chessops/Lichess).
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      side: "white",
    });
  });

  it("écrit la case en passant quand la prise est possible", () => {
    const beforeC4 = position("rnbqkbnr/ppp1pppp/8/8/3p4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3");
    expect(playSan(beforeC4, "c4")?.move.fen).toBe(
      "rnbqkbnr/ppp1pppp/8/8/2Pp4/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 3",
    );
  });

  it("joue un coup SAN et renvoie le même résultat qu'en UCI", () => {
    expect(playSan(initialPosition(), "Nf3")?.move).toEqual(playUci(initialPosition(), "g1f3")?.move);
  });

  it("enchaîne les coups sans modifier la position de départ", () => {
    const start = initialPosition();
    const afterE4 = playSan(start, "e4");
    const afterE5 = afterE4 && playSan(afterE4.position, "e5");
    expect(afterE5?.move).toMatchObject({ san: "e5", uci: "e7e5", side: "black" });
    expect(toFen(start)).toBe(INITIAL_FEN);
  });

  it("ajoute échec et mat au SAN", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
    expect(playUci(position(fen), "d8h4")?.move.san).toBe("Qh4#");
  });

  it.each(["e2e5", "e7e5", "z9z9", "", "e2"])("rejette le coup UCI illégal ou mal formé %j", (uci) => {
    expect(playUci(initialPosition(), uci)).toBeUndefined();
  });

  it.each(["e5", "Nf6", "O-O", "Ke2", "xyz"])("rejette le coup SAN illégal %j", (san) => {
    expect(playSan(initialPosition(), san)).toBeUndefined();
  });

  it.each([
    ["O-O", "e1g1"],
    ["O-O-O", "e1c1"],
  ])("écrit le roque %s en UCI standard (%s)", (san, uci) => {
    const fromSan = playSan(position(PROMOTION_AND_CASTLING_FEN), san);
    expect(fromSan?.move.uci).toBe(uci);
    expect(playUci(position(PROMOTION_AND_CASTLING_FEN), uci)?.move).toEqual(fromSan?.move);
  });

  it("accepte aussi le roque en notation « roi prend tour » (e1h1)", () => {
    expect(playUci(position(PROMOTION_AND_CASTLING_FEN), "e1h1")?.move).toMatchObject({
      san: "O-O",
      uci: "e1g1",
    });
  });
});

describe("promotion", () => {
  it.each([
    ["b7b8q", "b8=Q+"],
    ["b7b8n", "b8=N"],
    ["b7a8r", "bxa8=R+"],
  ])("joue la promotion %s → %s", (uci, san) => {
    const result = playUci(position(PROMOTION_AND_CASTLING_FEN), uci);
    expect(result?.move).toMatchObject({ uci, san });
  });

  it("joue une promotion en SAN", () => {
    expect(playSan(position(PROMOTION_AND_CASTLING_FEN), "bxa8=Q")?.move.uci).toBe("b7a8q");
  });

  it("rejette une promotion sans pièce précisée", () => {
    expect(playUci(position(PROMOTION_AND_CASTLING_FEN), "b7b8")).toBeUndefined();
  });

  it("détecte les coups de promotion", () => {
    const pos = position(PROMOTION_AND_CASTLING_FEN);
    expect(isPromotionMove(pos, "b7", "b8")).toBe(true);
    expect(isPromotionMove(pos, "b7", "a8")).toBe(true);
  });

  it.each<[string, SquareName, SquareName]>([
    ["coup de tour", "a1", "a7"],
    ["coup de pion illégal", "b7", "c8"],
    ["case vide", "c7", "c8"],
  ])("ne détecte pas de promotion : %s", (_, from, to) => {
    expect(isPromotionMove(position(PROMOTION_AND_CASTLING_FEN), from, to)).toBe(false);
  });

  it("ne détecte pas de promotion pour un pion du camp qui n'a pas le trait", () => {
    const blackToMove = position("4k3/1P6/8/8/8/8/6p1/4K3 b - - 0 1");
    expect(isPromotionMove(blackToMove, "b7", "b8")).toBe(false);
    expect(isPromotionMove(blackToMove, "g2", "g1")).toBe(true);
  });

  it("ne détecte pas de promotion pour un pion cloué", () => {
    // Le pion e7 est cloué par la tour e8 sur le roi e1 : il ne peut pas prendre le cavalier d8.
    const pinned = position("3nr3/4P3/8/8/8/8/8/4K2k w - - 0 1");
    expect(isPromotionMove(pinned, "e7", "d8")).toBe(false);
  });
});

describe("legalDests", () => {
  it("donne les destinations légales au format chessground", () => {
    const dests = legalDests(initialPosition());
    expect(dests.get("g1")).toEqual(expect.arrayContaining(["f3", "h3"]));
    expect(dests.get("e2")).toEqual(expect.arrayContaining(["e3", "e4"]));
    expect(dests.has("e1")).toBe(false);
    expect([...dests.values()].flat()).toHaveLength(20);
  });

  it("inclut les deux représentations du roque", () => {
    expect(legalDests(position(PROMOTION_AND_CASTLING_FEN)).get("e1")).toEqual(
      expect.arrayContaining(["g1", "h1", "c1", "a1"]),
    );
  });
});
