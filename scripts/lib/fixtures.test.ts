import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content";

/**
 * Fixtures de `scripts/__fixtures__/` chargées avec les bornes réelles du
 * contenu (3 à 8 lignes, 6 à 14 coups du joueur) : chaque dossier `invalid/`
 * illustre une seule règle enfreinte.
 */
const fixturesDir = (kind: "valid" | "invalid") =>
  fileURLToPath(new URL(`../__fixtures__/${kind}/`, import.meta.url));

describe("fixtures valides", () => {
  it("se chargent sans erreur et donnent une ligne par feuille", async () => {
    const { openings, errors } = await loadContent(fixturesDir("valid"));
    expect(errors).toEqual([]);
    expect(openings.map((opening) => opening.id)).toEqual(["sample-opening"]);
    expect(openings[0]?.lines.map((line) => [line.name, line.moves.at(-1)?.san])).toEqual([
      ["Avance", "Nd7"],
      ["Classique", "Nd7"],
      ["Échange", "Bg4"],
    ]);
  });
});

describe("fixtures invalides", () => {
  it("échouent chacune avec un message précis", async () => {
    const { openings, errors } = await loadContent(fixturesDir("invalid"));
    expect(openings).toEqual([]);
    expect(errors).toEqual([
      "[illegal-move] ligne 1, coup 4... Bb4 : coup illégal.",
      expect.stringMatching(/^\[invalid-meta\] meta\.json invalide :\n {2}- side : /),
      expect.stringMatching(/^\[missing-key-position\] keyPosition n'est pas atteinte dans la ligne principale/),
      "[too-few-lines] 1 ligne(s) : il en faut entre 3 et 8.",
      "[two-player-moves] ligne 1, coup 3... Bf5 : plusieurs coups du joueur au même nœud (Bf5, c5) ; un seul est autorisé.",
    ]);
  });
});
