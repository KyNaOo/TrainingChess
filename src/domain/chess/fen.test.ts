import { INITIAL_FEN } from "chessops/fen";
import { describe, expect, it } from "vitest";
import { isLegalFen } from "./fen";

describe("isLegalFen", () => {
  it.each([
    INITIAL_FEN,
    "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  ])("accepte %s", (fen) => {
    expect(isLegalFen(fen)).toBe(true);
  });

  it.each([
    ["chaîne vide", ""],
    ["texte quelconque", "pas une fen"],
    ["placement seul, sans les autres champs", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"],
    ["rangée trop longue", "rnbqkbnr/ppppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
    ["camp au trait invalide", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1"],
    ["roi blanc absent", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w kq - 0 1"],
    ["camp qui n'a pas le trait en échec", "4k3/8/8/8/8/8/8/K3R3 w - - 0 1"],
    ["pions sur la première rangée", "rnbqkbnr/pppppppp/8/8/8/8/8/PNBQKBNR w Qkq - 0 1"],
  ])("rejette : %s", (_, fen) => {
    expect(isLegalFen(fen)).toBe(false);
  });
});
