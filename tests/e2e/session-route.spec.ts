import { expect, type Page, test } from "@playwright/test";

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

test("la page d'une ouverture affiche son nom et un échiquier orienté selon le camp", async ({ page }) => {
  await page.goto("/openings/test-opening/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ouverture de test (Partie italienne)");
  await expect(page.getByText("Vous jouez les Blancs")).toBeVisible();
  await expect(page.getByRole("application", { name: "Échiquier" })).toBeVisible();
  await expect(page.locator(".cg-wrap")).toHaveClass(/orientation-white/);
  await expect(page).toHaveTitle(/Ouverture de test/);
});

test("la session repart de zéro au rechargement", async ({ page }) => {
  await page.goto("/openings/test-opening/");
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "intro");
  await page.reload();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "intro");
});

test("aucun coup n'est jouable tant que la session n'a pas commencé", async ({ page }) => {
  await page.goto("/openings/test-opening/");
  await expect(page.locator("cg-board").first()).toBeVisible();
  await clickSquare(page, "e2");
  await clickSquare(page, "e4");
  await expect(page.locator("cg-board piece.pawn.white").filter({ hasNot: page.locator(".ghost") })).toHaveCount(8);
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "intro");
});

test("un id inconnu affiche une 404 propre avec un lien vers les ouvertures", async ({ page }) => {
  const response = await page.goto("/openings/n-existe-pas/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await page.getByRole("link", { name: "Retour aux ouvertures" }).click();
  await expect(page).toHaveURL(/\/$/);
});
