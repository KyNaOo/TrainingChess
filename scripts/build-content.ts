/**
 * `pnpm content:build` : lit `content/openings/`, valide chaque ouverture
 * (Zod + rejeu de chaque coup PGN avec chessops) et écrit
 * `src/generated/openings.json`. Échoue au moindre problème de contenu.
 *
 * La logique vit dans `src/domain/content/extract.ts` ; ce script n'est qu'un
 * point d'entrée (lecture des fichiers, écriture du JSON).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadContent } from "./lib/load-content";

const contentDir = fileURLToPath(new URL("../content/openings/", import.meta.url));
const outputDir = fileURLToPath(new URL("../src/generated/", import.meta.url));
const outputFile = fileURLToPath(new URL("../src/generated/openings.json", import.meta.url));

async function main(): Promise<void> {
  const { openings, errors } = await loadContent(contentDir);

  if (errors.length > 0) {
    console.error(`content:build — ${errors.length} erreur(s) de contenu :\n`);
    for (const error of errors) console.error(`✗ ${error}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(openings, null, 2)}\n`);
  for (const opening of openings) {
    console.log(`✓ ${opening.id} — ${opening.lines.length} ligne(s)`);
  }
  console.log(`content:build — ${openings.length} ouverture(s) écrite(s) dans src/generated/openings.json`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
