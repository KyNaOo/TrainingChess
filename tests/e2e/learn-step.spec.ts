import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { moveLabel } from "../../src/domain/chess/notation";
import type { Opening } from "../../src/domain/content/schema";

// Contenu réel, généré par `pnpm content:build` (lancé par `pnpm build` avant les tests).
const openings = JSON.parse(readFileSync(new URL("../../src/generated/openings.json", import.meta.url), "utf8")) as Opening[];
const opening = openings.find((candidate) => candidate.id === "test-opening");
if (opening === undefined) throw new Error("Ouverture de test introuvable dans le contenu généré");
const OPENING = opening;

/** Clique au centre d'une case (échiquier orienté côté Blancs). */
async function clickSquare(page: Page, square: string) {
  const board = page.getByRole("application", { name: "Échiquier" });
  const box = await board.boundingBox();
  if (box === null) throw new Error("Échiquier introuvable");
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]) - 1;
  const size = box.width / 8;
  await page.mouse.click(box.x + (file + 0.5) * size, box.y + (7 - rank + 0.5) * size);
}

async function playUci(page: Page, uci: string) {
  await clickSquare(page, uci.slice(0, 2));
  await clickSquare(page, uci.slice(2, 4));
}

/** Titre de l'encadré d'explication : le dernier coup joué, ou la position de départ. */
const explanationTitle = (page: Page) => page.getByTestId("explanation").locator("p").first();

function labelAt(lineIndex: number, ply: number): string {
  const move = OPENING.lines[lineIndex]?.moves[ply - 1];
  return move === undefined ? "Position de départ" : moveLabel(ply - 1, move.san);
}

/** Joue toute la ligne : attend chaque coup adverse automatique, puis joue le coup du joueur. */
async function solveLine(page: Page, lineIndex: number) {
  const line = OPENING.lines[lineIndex];
  if (line === undefined) throw new Error(`Ligne ${lineIndex} introuvable`);
  for (const [ply, move] of line.moves.entries()) {
    if (move.side !== OPENING.side) continue;
    await expect(explanationTitle(page)).toHaveText(labelAt(lineIndex, ply));
    await playUci(page, move.uci);
  }
  await expect(page.getByText("Ligne terminée.")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/openings/test-opening/");
  await page.getByRole("button", { name: "Commencer à apprendre les lignes" }).click();
  await expect(page.getByRole("application", { name: "Échiquier" })).toBeVisible();
});

test("affiche le nom de la ligne, la progression et attend le coup du joueur", async ({ page }) => {
  await expect(page.getByTestId("line-progress")).toHaveText(`Ligne 1 / ${OPENING.lines.length}`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Giuoco Piano");
  await expect(explanationTitle(page)).toHaveText("Position de départ");
  await expect(page.getByText("À vous de jouer : trouvez le coup suivant.")).toBeVisible();
});

test("bon coup : annonce, explication et annotations, puis coup adverse automatique", async ({ page }) => {
  await playUci(page, "e2e4");
  await expect(page.getByTestId("feedback")).toHaveText("Bon coup : 1. e4");
  await expect(page.getByTestId("feedback")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByTestId("explanation")).toContainText("Le pion prend le centre");

  await expect(explanationTitle(page)).toHaveText("1... e5");
  await expect(page.getByText("À vous de jouer : trouvez le coup suivant.")).toBeVisible();

  // Annotations du coup affiché : case surlignée pour 1. e4, flèche pour 2. Nf3.
  await page.keyboard.press("ArrowLeft");
  await expect(explanationTitle(page)).toHaveText("1. e4");
  await expect(page.locator(".cg-shapes circle")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await playUci(page, "g1f3");
  await expect(page.getByTestId("explanation")).toContainText("attaquant le pion e5");
  await expect(page.locator(".cg-shapes line")).toHaveCount(1);
});

test("mauvais coup : la flèche montre le bon coup, sans pénalité", async ({ page }) => {
  await playUci(page, "d2d4");
  await expect(page.getByTestId("feedback")).toHaveText("Pas tout à fait : la flèche montre le bon coup.");
  await expect(page.getByTestId("feedback")).toHaveAttribute("data-kind", "hint");
  await expect(page.locator(".cg-shapes line")).toHaveCount(1);
  await expect(explanationTitle(page)).toHaveText("Position de départ");

  await playUci(page, "e2e4");
  await expect(page.getByTestId("feedback")).toHaveText("Bon coup : 1. e4");
});

test("navigation ← / → au clavier et aux boutons", async ({ page }) => {
  await playUci(page, "e2e4");
  await expect(explanationTitle(page)).toHaveText("1... e5");
  await expect(page.getByRole("button", { name: "Coup suivant" })).toBeDisabled();

  await page.keyboard.press("ArrowLeft");
  await expect(explanationTitle(page)).toHaveText("1. e4");
  await page.keyboard.press("ArrowLeft");
  await expect(explanationTitle(page)).toHaveText("Position de départ");
  await expect(page.getByRole("button", { name: "Coup précédent" })).toBeDisabled();

  await page.keyboard.press("ArrowRight");
  await expect(explanationTitle(page)).toHaveText("1. e4");
  await page.getByRole("button", { name: "Coup suivant" }).click();
  await expect(explanationTitle(page)).toHaveText("1... e5");
});

test("enchaîne toutes les lignes puis passe à l'entraînement", async ({ page }) => {
  for (const [index, line] of OPENING.lines.entries()) {
    await expect(page.getByTestId("line-progress")).toHaveText(`Ligne ${index + 1} / ${OPENING.lines.length}`);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(line.name);
    await solveLine(page, index);
    if (index < OPENING.lines.length - 1) await page.getByRole("button", { name: "Ligne suivante" }).click();
  }
  await page.getByRole("button", { name: "Passer à l'entraînement" }).click();
  const steps = page.getByRole("navigation", { name: "Étapes de la session" });
  await expect(steps.locator('[aria-current="step"]')).toHaveText("3S'entraîner");
});
