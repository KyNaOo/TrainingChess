import { expect, test } from "@playwright/test";

const KEY_POSITION = "Position caractéristique : Ouverture de test (Partie italienne)";

test.beforeEach(async ({ page }) => {
  await page.goto("/openings/test-opening/");
});

test("la page d'une ouverture affiche son nom et le camp joué", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ouverture de test (Partie italienne)");
  await expect(page.getByText("Vous jouez les Blancs")).toBeVisible();
  await expect(page).toHaveTitle(/Ouverture de test/);
});

test("Comprendre : présentation, position caractéristique et indicateur d'étape", async ({ page }) => {
  const steps = page.getByRole("navigation", { name: "Étapes de la session" });
  await expect(steps.getByRole("listitem")).toHaveText(["1Comprendre", "2Apprendre", "3S'entraîner"]);
  await expect(steps.locator('[aria-current="step"]')).toHaveText("1Comprendre");

  await expect(page.getByText(/Ouverture minimale qui sert à faire tourner/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Idées clés" })).toBeVisible();
  await expect(page.getByText("Le fou c4 vise f7", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Structures de pions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plans typiques" })).toBeVisible();
  await expect(page.getByText("Blancs (votre camp)")).toBeVisible();

  const keyPosition = page.getByRole("img", { name: KEY_POSITION });
  await expect(keyPosition).toBeVisible();
  await expect(keyPosition.locator("piece.bishop.white")).toHaveCount(2);
  await expect(page.locator(".cg-wrap")).toHaveClass(/orientation-white/);
});

test("le bouton mène à l'étape Apprendre, et un rechargement recommence la session", async ({ page }) => {
  await page.getByRole("button", { name: "Commencer à apprendre les lignes" }).click();
  const steps = page.getByRole("navigation", { name: "Étapes de la session" });
  await expect(steps.locator('[aria-current="step"]')).toHaveText("2Apprendre");
  await expect(page.getByRole("application", { name: "Échiquier" })).toBeVisible();
  await expect(page.getByRole("img", { name: KEY_POSITION })).toHaveCount(0);

  await page.reload();
  await expect(steps.locator('[aria-current="step"]')).toHaveText("1Comprendre");
  await expect(page.getByRole("img", { name: KEY_POSITION })).toBeVisible();
});

test("un id inconnu affiche une 404 propre avec un lien vers les ouvertures", async ({ page }) => {
  const response = await page.goto("/openings/n-existe-pas/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await page.getByRole("link", { name: "Retour aux ouvertures" }).click();
  await expect(page).toHaveURL(/\/$/);
});
