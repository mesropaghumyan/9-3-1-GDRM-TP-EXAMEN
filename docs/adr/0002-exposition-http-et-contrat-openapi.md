# ADR 0002 — Exposition HTTP et contrat OpenAPI

- **Statut** : accepté (validation humaine déléguée à l'agent par instruction explicite de l'utilisateur, 2026-10-08)
- **Date** : 2026-10-08

## Contexte

Le TP n'a aucun endpoint. L'utilisateur veut tester facilement les futurs endpoints via OpenAPI. `CLAUDE.md` §1.1 prévoit une Présentation « CLI/HTTP » et interdit tout changement de pile ou paquet sans ADR (§0.4, §4.2).

## Décision

1. **Contrat d'abord** : `docs/api/openapi.yaml` (OpenAPI 3.0.3, écrit à la main, en français) décrit `POST /wake-ups` et `GET /health`. Il est importable tel quel dans Swagger Editor, Postman ou Insomnia.
2. **Serveur** : module `node:http` natif dans `src/presentation/http`, sans framework ni nouveau paquet. Le serveur est démarré uniquement par `src/main/index.ts`. Il appelle `WakeUpUseCase` et ne connaît pas `infrastructure`.
3. **Pas de Swagger UI embarquée** : aucun paquet ajouté. Le serveur sert `GET /openapi.yaml` pour qu'un outil externe le consomme.
4. **Cohérence contrat/code** : un test vérifie que chaque route déclarée dans `openapi.yaml` existe côté serveur et que les valeurs d'énumération (jours, météos, canaux, raisons) sont identiques aux types du code.

## Conséquences

- Aucune dépendance ajoutée : README, SBOM et audit de licences inchangés.
- Le choix d'un framework HTTP ou d'une UI embarquée (`swagger-ui-dist`, Apache-2.0) rouvre cet ADR et l'audit §4.2.
- Le mapping `LUNDI…DIMANCHE` / `SOLEIL…NUAGEUX` reste à la frontière de la Présentation (AD-13) ; le contrat expose les libellés français.
- La route dépend de l'Epic 1 : la story 5.1 démarre quand `WakeUpService.trigger` existe.
