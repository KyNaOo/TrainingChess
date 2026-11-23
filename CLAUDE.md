# CLAUDE.md — Opening Trainer

Site web gratuit et open source pour **apprendre une ouverture d'échecs en une session**. Pas de compte, pas de connexion : on arrive, on choisit une ouverture populaire dans un tableau de bord, et on enchaîne la théorie puis la pratique sur l'échiquier.

Projet portfolio : la qualité du code, des tests et de la documentation compte autant que les fonctionnalités.

## Parcours utilisateur (le produit entier)

1. **Tableau de bord** (`/`) : grille des ouvertures populaires. Chaque carte affiche le nom, le camp joué (Blancs/Noirs), le niveau, le nombre de lignes et un mini-échiquier de la position caractéristique. Filtres par camp et niveau, recherche par nom.
2. **Clic sur une ouverture** (`/openings/[id]`) → la session démarre directement, en trois étapes :
   - **Comprendre** : présentation courte de l'ouverture (idées clés, structures de pions, plans typiques).
   - **Apprendre** : parcours guidé de chaque ligne, coup par coup. L'utilisateur joue lui-même ses coups sur l'échiquier ; chaque coup est accompagné de son explication, de flèches et de cases surlignées.
   - **S'entraîner** : l'échiquier joue les coups adverses, l'utilisateur doit retrouver les siens sans aide. Les lignes ratées reviennent en fin de file jusqu'à être réussies.
3. **Écran de fin** : taux de réussite, lignes les plus ratées, boutons « Recommencer » et « Choisir une autre ouverture ».

Rien d'autre. Toute fonctionnalité qui sort de ce parcours doit être refusée ou placée dans la section « Bonus ».

## Principes directeurs

1. **Site 100 % statique.** Aucun backend, aucune base de données, aucune authentification, aucun appel d'API au runtime. Tout le contenu est dans le dépôt et compilé au build.
2. **L'état de session vit en mémoire.** Recharger la page recommence la session : c'est voulu.
3. **Le contenu est la valeur du site.** Les lignes et les explications doivent être justes. Un coup faux ou une explication approximative est un bug bloquant.
4. **Le domaine d'abord.** La logique d'échecs et de session est du TypeScript pur, sans dépendance à React, couverte par des tests unitaires.
5. **Petit mais fini.** Mieux vaut 3 ouvertures impeccables que 15 bâclées.

## Stack

| Rôle | Choix |
|---|---|
| Framework | Next.js (App Router) en export statique (`output: 'export'`) + TypeScript strict |
| Gestionnaire de paquets | pnpm |
| Style | Tailwind CSS |
| Règles d'échecs + PGN | `chessops` (bibliothèque de Lichess : règles, SAN/UCI, parsing PGN avec variantes et commentaires, compatibilité chessground) |
| Échiquier | `@lichess-org/chessground` |
| État de session | Zustand |
| Validation du contenu | Zod |
| Tests | Vitest (unitaires), Playwright (e2e) |
| Déploiement | Vercel ou GitHub Pages (offre gratuite) |

Licence du dépôt : **GPL-3.0** (imposée par chessground et chessops).

Pas de Supabase, pas d'API Lichess au runtime, pas de Stockfish dans le parcours principal. Ne pas ajouter de dépendance sans justification claire.

## Commandes

```bash
pnpm dev             # serveur de développement
pnpm build           # build de contenu + export statique
pnpm content:build   # PGN → JSON validé (échoue si un coup est illégal)
pnpm lint
pnpm typecheck
pnpm test            # Vitest
pnpm test:e2e        # Playwright
```

Avant de considérer une tâche terminée : `pnpm lint && pnpm typecheck && pnpm test && pnpm content:build` doivent passer.

## Architecture

```
content/
  openings/
    italian-game/
      meta.json         # métadonnées + présentation (étape « Comprendre »)
      lines.pgn         # lignes annotées (étapes « Apprendre » et « S'entraîner »)
    caro-kann/
    ...
scripts/
  build-content.ts      # parse les PGN, valide, génère src/generated/openings.json
src/
  app/
    page.tsx            # tableau de bord
    openings/[id]/      # session (generateStaticParams sur toutes les ouvertures)
  domain/               # TS pur, AUCUN import React/Next
    chess/              # helpers autour de chessops
    content/            # types + schémas Zod du contenu, extraction des lignes
    session/            # machine à états de la session, file d'entraînement, score
  features/
    board/              # wrapper chessground (interactif + mode miniature)
    dashboard/
    session/            # étapes Comprendre / Apprendre / S'entraîner / Fin
  lib/
  generated/            # sortie de content:build (ignorée par git)
tests/
  e2e/
```

Règle de dépendance : `app` → `features` → `domain`. `domain` ne dépend de rien d'autre que `chessops` et `zod`.

## Format du contenu

### `meta.json`

```json
{
  "id": "italian-game",
  "name": "Partie italienne",
  "eco": ["C50", "C53", "C54"],
  "side": "white",
  "level": "beginner",
  "popularity": 1,
  "keyPosition": "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  "summary": "Deux à trois phrases d'accroche.",
  "keyIdeas": ["Idée 1", "Idée 2", "Idée 3"],
  "pawnStructures": "Paragraphe court.",
  "typicalPlans": { "white": "…", "black": "…" },
  "reviewed": false
}
```

### `lines.pgn`

Une seule partie PGN par ouverture, avec la ligne principale et les variantes, au format des études Lichess (on peut rédiger dans une étude Lichess puis exporter le PGN) :

- commentaire `{ … }` après un coup = explication affichée dans l'étape « Apprendre » ;
- `[%cal Ge2e4,Rd8d1]` = flèches (G vert, R rouge, Y jaune, B bleu) ;
- `[%csl Gd5]` = cases surlignées ;
- un tag `[LineName "Giuoco Pianissimo"]` n'existe pas en PGN : nommer une ligne via un commentaire qui commence par `#` sur son premier coup, ex. `{ # Giuoco Pianissimo — Les Blancs jouent d3 et un jeu lent. }`.

### Règles de contenu

- Chaque **feuille** de l'arbre PGN = une **ligne** à apprendre et à s'entraîner.
- Aux nœuds où c'est au camp de l'utilisateur de jouer, **un seul coup** est autorisé (sinon l'entraînement est ambigu). Le script de build échoue sinon. Les nœuds adverses peuvent avoir plusieurs réponses.
- Lignes de **6 à 14 coups** du joueur, **3 à 8 lignes** par ouverture.
- Uniquement de la **théorie établie et courante**. Pas de nouveautés exotiques, pas de lignes douteuses présentées comme bonnes. Si un coup adverse est une erreur (piège), le dire explicitement dans le commentaire.
- Commentaires **originaux**, en français, 1 à 3 phrases, orientés « pourquoi » (idée, plan, menace) plutôt que « quoi ».
- Ne jamais copier de commentaires issus de livres, cours payants ou sites tiers.
- `reviewed` passe à `true` uniquement après relecture humaine par un joueur compétent. Le contenu rédigé par une IA doit rester `reviewed: false` et afficher un badge discret « Contenu en cours de relecture ».

### Script `content:build`

1. Lit chaque dossier de `content/openings/`.
2. Valide `meta.json` avec Zod.
3. Parse `lines.pgn` avec chessops et **rejoue chaque coup** : le build échoue avec un message précis (ouverture, ligne, numéro de coup) si un coup est illégal ou si la règle « un seul coup du joueur par nœud » est violée.
4. Vérifie que `keyPosition` est atteinte dans la ligne principale.
5. Écrit un JSON normalisé dans `src/generated/` : pour chaque ligne, la liste ordonnée des coups (UCI + SAN + FEN après le coup + commentaire + flèches + cases).

## Logique de session (`domain/session/`)

Une machine à états pure, testable sans React :

```
intro → learn(lineIndex, ply) → train(queue, current, attempts) → summary
```

- **Apprendre** : on parcourt les lignes dans l'ordre. Les coups adverses sont joués automatiquement après un court délai. Pour les coups du joueur, l'échiquier attend le coup ; un mauvais coup affiche la flèche du bon coup sans pénalité.
- **S'entraîner** :
  - file initiale = toutes les lignes, ordre mélangé (graine injectable pour les tests) ;
  - la ligne est rejouée depuis la position initiale ; le joueur doit trouver chacun de ses coups ;
  - 1re erreur sur un coup → message « Pas tout à fait », nouvel essai ; 2e erreur → la flèche montre le bon coup, il faut le jouer, et la ligne est marquée ratée et remise **en fin de file** ;
  - la session se termine quand chaque ligne a été réussie une fois sans erreur.
- **Score** : coups trouvés du premier coup / coups demandés, plus la liste des lignes ratées au moins une fois.
- Le temps et l'aléatoire sont injectés en paramètres : aucun `Date.now()` ni `Math.random()` caché dans `domain/`.

## Échiquier

- Orientation automatique selon le camp de l'ouverture.
- Seuls les coups légaux sont proposés (`chessgroundDests` de chessops).
- Gérer la **promotion** proprement même si elle est rare en ouverture.
- Navigation clavier dans l'étape Apprendre : ← / → pour reculer et avancer.
- Mode miniature non interactif (`viewOnly`) pour les cartes du tableau de bord.
- Fonctionne au toucher sur mobile.

## Conventions de code

- TypeScript `strict`, pas de `any`.
- Noms de code en **anglais**, textes d'interface en **français**, centralisés dans un fichier de chaînes.
- Pas de logique métier dans le JSX.
- Accessibilité : contrastes suffisants, labels ARIA, annonces `aria-live` pour « Bon coup » et « Pas tout à fait ».
- Commits au format Conventional Commits.

## Tests

**Unitaires (Vitest)**, obligatoires pour `domain/` et `scripts/` :
- extraction des lignes d'un PGN avec variantes ;
- rejet d'un PGN avec coup illégal ou avec deux coups du joueur sur un même nœud ;
- machine à états de session : bon coup, une erreur, deux erreurs → ligne remise en file, fin de session ;
- calcul du score ;
- un test qui charge **tout le contenu réel** et vérifie qu'il est valide.

**E2E (Playwright)**, au minimum : tableau de bord → clic sur une ouverture → finir l'étape Apprendre → réussir une ligne et en rater une à l'entraînement → écran de fin.

## Roadmap

**Phase 1 — Fondations** : setup, CI GitHub Actions (lint, typecheck, tests, content:build), wrapper chessground, script `content:build` avec une ouverture de test.

**Phase 2 — Session complète sur 1 ouverture** : Partie italienne (Blancs), les 4 étapes de bout en bout, tests e2e, déploiement.

**Phase 3 — Tableau de bord + contenu** : grille, filtres, recherche. Ajouter Défense Caro-Kann (Noirs) et Gambit Dame (Blancs).

**Phase 4 — Plus d'ouvertures** (une à la fois, chacune relue) : Partie espagnole, Défense sicilienne, Défense française, Système de Londres, Défense scandinave, Défense est-indienne, Partie anglaise.

### Bonus (seulement quand les phases 1 à 4 sont finies)

- Mémoriser dans `localStorage` les ouvertures terminées et le meilleur score, pour afficher un badge sur le tableau de bord. Accès toujours entouré de `try/catch`, le site doit fonctionner si le stockage est indisponible.
- Script hors ligne qui récupère une fois les statistiques de l'opening explorer Lichess (avec un token personnel en variable d'environnement, jamais commité, une requête à la fois, pause d'une minute en cas de 429) pour afficher « joué dans X % des parties » à côté des coups. Les données sont commitées en JSON : aucun appel au runtime.
- Script de vérification qui passe chaque position du contenu à Stockfish (Node) et signale les coups du joueur dont l'évaluation chute fortement, pour aider la relecture.

## Définition de « terminé »

- lint, typecheck, tests et `content:build` passent ;
- la logique métier a des tests unitaires ;
- fonctionne sur mobile ;
- le README est à jour si le comportement visible a changé.

## À ne pas faire

- Pas de backend, de base de données, d'authentification ni d'appel d'API au runtime.
- Pas de coup « de mémoire » non vérifié : tout coup du contenu passe par `content:build`.
- Ne pas passer `reviewed` à `true` sur du contenu non relu par un humain.
- Ne pas ajouter de comptes, de répétition espacée entre sessions ou d'éditeur de répertoire : hors périmètre.

## README (à maintenir)

GIF de démo, lien vers le site en ligne, schéma d'architecture, explication des choix (site statique, contenu en PGN validé au build, machine à états de session testable), guide « Ajouter une ouverture », instructions d'installation locale, licence GPL-3.0.
