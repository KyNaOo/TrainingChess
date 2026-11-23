/**
 * `pnpm content:build` : lit `content/openings/`, valide le contenu et écrit
 * `src/generated/openings.json`.
 *
 * Squelette : la validation (Zod, rejeu des coups PGN avec chessops) arrive
 * avec l'issue #6. Pour l'instant le script produit une liste vide afin que la
 * chaîne `content:build → next build` fonctionne de bout en bout.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outputFile = fileURLToPath(new URL("../src/generated/openings.json", import.meta.url));

async function main(): Promise<void> {
  const openings: unknown[] = [];
  await mkdir(fileURLToPath(new URL("../src/generated/", import.meta.url)), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(openings, null, 2)}\n`);
  console.log(`content:build — ${openings.length} ouverture(s) écrite(s) dans src/generated/openings.json`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
