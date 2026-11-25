import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buildOpening, ContentError, type ContentLimits } from "../../src/domain/content/extract";
import { type Opening, openingsSchema } from "../../src/domain/content/schema";

export interface LoadContentResult {
  openings: Opening[];
  errors: string[];
}

/**
 * Lit chaque dossier de `contentDir` (`meta.json` + `lines.pgn`) et le valide
 * avec `buildOpening`. Toutes les erreurs sont collectées pour être affichées
 * d'un coup. Les ouvertures sont triées par popularité.
 */
export async function loadContent(contentDir: string, limits?: ContentLimits): Promise<LoadContentResult> {
  const entries = await readdir(contentDir, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const openings: Opening[] = [];
  const errors: string[] = [];

  for (const folder of folders) {
    try {
      const dir = path.join(contentDir, folder);
      const meta = parseJson(folder, await readFile(path.join(dir, "meta.json"), "utf8"));
      const pgn = await readFile(path.join(dir, "lines.pgn"), "utf8");
      openings.push(buildOpening({ folder, meta, pgn, limits }));
    } catch (error) {
      errors.push(describeError(folder, error));
    }
  }

  checkUniquePopularity(openings, errors);
  openings.sort((a, b) => a.popularity - b.popularity);
  return { openings: openingsSchema.parse(openings), errors };
}

function parseJson(folder: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ContentError(`[${folder}] meta.json n'est pas du JSON valide : ${(error as Error).message}`);
  }
}

function describeError(folder: string, error: unknown): string {
  if (error instanceof ContentError) return error.message;
  if (error instanceof Error && "code" in error && error.code === "ENOENT" && "path" in error) {
    return `[${folder}] fichier manquant : ${path.basename(String(error.path))}`;
  }
  return `[${folder}] ${error instanceof Error ? error.message : String(error)}`;
}

function checkUniquePopularity(openings: Opening[], errors: string[]): void {
  const byRank = new Map<number, string>();
  for (const opening of openings) {
    const other = byRank.get(opening.popularity);
    if (other !== undefined) {
      errors.push(`[${opening.id}] popularity ${opening.popularity} déjà utilisée par « ${other} ».`);
    }
    byRank.set(opening.popularity, opening.id);
  }
}
