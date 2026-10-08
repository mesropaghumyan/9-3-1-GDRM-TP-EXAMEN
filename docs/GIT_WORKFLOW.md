# Workflow git : issue, branche, pull request

> Dépôt GitHub (`origin`), branche de base `master`. Outils : `git` et `gh` (authentifié), aucun package npm.
> Les scripts sont dans `scripts/git/`. Ils ne fusionnent jamais : la fusion reste une décision humaine après validation QA (`CLAUDE.md` §5.2).

## Vue d'ensemble

```
epics.md ──sync-issues──▶ issue [Epic N] + issues [Story N.M]  (labels, jalon par epic)
                                   │
              start-story N.M ─────┤  branche feature/<issue>-story-N-M-<slug> depuis master, liée à l'issue
                                   │  TDD, commits Conventional, sprint-status.yaml mis à jour
              finish-story ────────┤  npm run verify, push, pull request vers master ("Closes #issue")
                                   │
                    revue QA ──────┘  fusion squash par un humain → l'issue se ferme → story done
```

## Mise en place (une fois)

1. Committer et pousser sur `master` : `epics.md`, `sprint-status.yaml`, `docs/`, `scripts/git/`, `.github/`. Les branches de story partent de `origin/master` et doivent contenir ces fichiers.
2. `scripts/git/sync-issues.sh --dry-run` pour prévisualiser, puis `scripts/git/sync-issues.sh`.
   - Crée les libellés (`epic`, `story`, `epic-N`, `in-progress`, `review`), un jalon par epic, une issue par epic et par story.
   - Chaque issue de story contient le récit et les critères d'acceptation de `epics.md`. L'issue d'epic reçoit une liste de suivi des stories.
   - Idempotent : relançable après une modification de `epics.md`, il n'ajoute que les issues manquantes (il ne met pas à jour les issues existantes).
3. Recommandé, à faire dans les réglages GitHub : protéger `master` (pull request obligatoire, fusion squash uniquement, suppression des branches fusionnées).

## Cycle d'une story

| Étape | Commande | Effet |
|---|---|---|
| Démarrer | `scripts/git/start-story.sh 1.1` | Refuse si l'arbre n'est pas propre ou l'issue fermée ; avertit si une story précédente de l'epic est ouverte ; crée la branche sur `origin` depuis `master`, la lie à l'issue (`gh issue develop`), la checkout, assigne l'issue et pose `in-progress`. |
| Développer | commits à la main | TDD rouge, vert, refactor ; un commit = un changement cohérent ; messages en français, Conventional Commits (`feat:`, `test:`…) ; `sprint-status.yaml` mis à jour dans le même commit. |
| Terminer | `scripts/git/finish-story.sh` | Exige une branche de story, un arbre propre et au moins un commit en avance ; lance `npm run verify` (DoD §5.1) ; pousse ; ouvre la pull request vers `master` avec `Closes #issue`, le modèle `.github/pull_request_template.md` et le libellé `review`. Options : `--type fix\|test\|refactor\|docs\|chore` (défaut `feat`), `--draft`, `--skip-verify` (à éviter). |
| Valider | revue QA sur la pull request | Cases QA du modèle cochées. |
| Fusionner | bouton « Squash and merge » | Le titre de la PR devient le message de commit sur `master` (`feat(story-1.1): …`). L'issue se ferme, la case de l'epic se coche. |

Nommage : branche `feature/<n° issue>-story-<N>-<M>-<slug>` ; titre de PR `<type>(story-N.M): <titre de la story>`.

## Correspondance avec les statuts BMAD

| Statut `sprint-status.yaml` | Signal GitHub |
|---|---|
| `backlog`, `ready-for-dev` | issue ouverte, sans libellé de progression |
| `in-progress` | libellé `in-progress`, branche créée |
| `review` | pull request ouverte, libellé `review` |
| `done` | pull request fusionnée après validation QA, issue fermée |

Une régression détectée en revue renvoie la story en `in-progress` : remettre le libellé `in-progress` et corriger sur la même branche.

## Limites connues

- Les issues sont créées une fois depuis `epics.md` ; une modification ultérieure d'une story doit être répercutée à la main dans l'issue.
- Le dépôt est public : les issues et pull requests sont visibles de tous.
- Pas de CI GitHub pour l'instant : `npm run verify` est exécuté en local par `finish-story.sh`. Une CI pourra être ajoutée une fois `package.json` créé (Story 1.1), via une action épinglée par version.
