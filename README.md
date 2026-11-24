# Opening Trainer

[![CI](https://github.com/KyNaOo/TrainingChess/actions/workflows/ci.yml/badge.svg)](https://github.com/KyNaOo/TrainingChess/actions/workflows/ci.yml)

Site web gratuit et open source pour **apprendre une ouverture d'échecs en une session**. Pas de compte, pas de connexion : on choisit une ouverture, on comprend ses idées, on apprend ses lignes coup par coup, puis on s'entraîne jusqu'à les maîtriser.

> 🚧 Projet en cours de construction : voir les [issues](https://github.com/KyNaOo/TrainingChess/issues) et les milestones pour la feuille de route.

## Installation locale

Prérequis : Node.js ≥ 22 et [pnpm](https://pnpm.io/installation).

```bash
pnpm install
pnpm dev              # http://localhost:3000
```

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm dev` | Génère le contenu puis lance le serveur de développement |
| `pnpm build` | Génère le contenu puis produit l'export statique dans `out/` |
| `pnpm content:build` | Valide `content/openings/` et écrit `src/generated/openings.json` |
| `pnpm lint` | ESLint (y compris la règle de dépendance `app → features → domain`) |
| `pnpm typecheck` | Vérification TypeScript stricte |
| `pnpm test` | Tests unitaires (Vitest) |
| `pnpm test:e2e` | Tests end-to-end (Playwright) sur l'export statique |

Avant le premier `pnpm test:e2e`, installer le navigateur : `pnpm exec playwright install chromium`.

## Stack

Next.js (App Router, export statique) · TypeScript strict · Tailwind CSS · chessops · chessground · Zustand · Zod · Vitest · Playwright.

Le site est **100 % statique** : aucun backend, aucune base de données, aucun appel d'API au runtime.

## Conventions

- Code en anglais, interface en français.
- Tous les textes affichés vivent dans [`src/lib/strings.ts`](src/lib/strings.ts) : aucun texte en dur dans le JSX (vérifié par la règle ESLint `react/jsx-no-literals` sur `src/app` et `src/features`). Les attributs comme `aria-label` ou `alt` viennent aussi de ce fichier.

## Licence

[GPL-3.0](LICENSE), imposée par [chessground](https://github.com/lichess-org/chessground) et [chessops](https://github.com/niklasf/chessops).
