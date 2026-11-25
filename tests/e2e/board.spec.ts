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

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/board/");
  await expect(page.locator("cg-board").first()).toBeVisible();
});

test("joue un coup et le programme répond", async ({ page }) => {
  const moves = page.getByTestId("moves");
  await clickSquare(page, "e2");
  await clickSquare(page, "e4");
  await expect(moves).toHaveText(/^e2e4 \S+$/);
});

test("refuse un coup illégal", async ({ page }) => {
  await clickSquare(page, "e2");
  await clickSquare(page, "e5");
  await expect(page.getByTestId("moves")).toHaveText("aucun");
});

test("demande la pièce de promotion", async ({ page }) => {
  await page.getByRole("button", { name: "Position de promotion" }).click();
  await clickSquare(page, "b7");
  await clickSquare(page, "b8");
  const dialog = page.getByRole("dialog", { name: "Promotion : choisir une pièce" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cavalier" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("moves")).toHaveText(/^b7b8n/);
});

test("affiche une miniature en lecture seule", async ({ page }) => {
  await expect(page.getByRole("img", { name: "Échiquier miniature : Partie italienne" })).toBeVisible();
});
