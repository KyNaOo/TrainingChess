import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ContentLimits } from "../../src/domain/content/extract";
import { loadContent } from "./load-content";

const REAL_CONTENT_DIR = fileURLToPath(new URL("../../content/openings/", import.meta.url));
const RELAXED: ContentLimits = { minLines: 1, maxLines: 8, minPlayerMoves: 1, maxPlayerMoves: 14 };

function meta(id: string, popularity: number) {
  return {
    id,
    name: `Ouverture ${id}`,
    eco: ["C50"],
    side: "white",
    level: "beginner",
    popularity,
    keyPosition: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    summary: "Résumé.",
    keyIdeas: ["Idée."],
    pawnStructures: "Structure.",
    typicalPlans: { white: "Plan blanc.", black: "Plan noir." },
    reviewed: false,
  };
}

describe("loadContent", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "opening-content-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function addOpening(folder: string, files: { meta?: string; pgn?: string }) {
    await mkdir(path.join(dir, folder));
    if (files.meta !== undefined) await writeFile(path.join(dir, folder, "meta.json"), files.meta);
    if (files.pgn !== undefined) await writeFile(path.join(dir, folder, "lines.pgn"), files.pgn);
  }

  it("charge les ouvertures et les trie par popularité", async () => {
    await addOpening("a-opening", { meta: JSON.stringify(meta("a-opening", 2)), pgn: "1. e4 e5 2. Nf3 *" });
    await addOpening("b-opening", { meta: JSON.stringify(meta("b-opening", 1)), pgn: "1. e4 c5 2. Nf3 *" });
    await writeFile(path.join(dir, ".gitkeep"), "");

    const { openings, errors } = await loadContent(dir, RELAXED);
    expect(errors).toEqual([]);
    expect(openings.map((opening) => opening.id)).toEqual(["b-opening", "a-opening"]);
  });

  it("collecte les erreurs de toutes les ouvertures", async () => {
    await addOpening("broken-json", { meta: "{", pgn: "1. e4 *" });
    await addOpening("missing-pgn", { meta: JSON.stringify(meta("missing-pgn", 1)) });
    await addOpening("illegal", { meta: JSON.stringify(meta("illegal", 2)), pgn: "1. e4 e5 2. Ke3 *" });

    const { openings, errors } = await loadContent(dir, RELAXED);
    expect(openings).toEqual([]);
    expect(errors).toEqual([
      expect.stringMatching(/^\[broken-json\] meta\.json n'est pas du JSON valide/),
      "[illegal] ligne 1, coup 2. Ke3 : coup illégal.",
      "[missing-pgn] fichier manquant : lines.pgn",
    ]);
  });

  it("rejette deux ouvertures de même popularité", async () => {
    await addOpening("a-opening", { meta: JSON.stringify(meta("a-opening", 1)), pgn: "1. e4 e5 *" });
    await addOpening("b-opening", { meta: JSON.stringify(meta("b-opening", 1)), pgn: "1. e4 c5 *" });

    const { errors } = await loadContent(dir, RELAXED);
    expect(errors).toEqual(["[b-opening] popularity 1 déjà utilisée par « a-opening »."]);
  });
});

describe("contenu réel", () => {
  it("tout le contenu de content/openings est valide", async () => {
    const { openings, errors } = await loadContent(REAL_CONTENT_DIR);
    expect(errors).toEqual([]);
    for (const opening of openings) expect(opening.lines.length).toBeGreaterThan(0);
  });
});
