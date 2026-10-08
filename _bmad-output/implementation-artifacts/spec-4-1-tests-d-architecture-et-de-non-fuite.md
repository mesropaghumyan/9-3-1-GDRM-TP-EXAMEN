---
title: 'Story 4.1 — Tests d'architecture et de non-fuite'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 4.1 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

tests/architecture : règles d'imports (domain/application sans infrastructure, node:*, fetch ; tsyringe borné), dépendances implicites (fetch, process.env/argv/stdout, console, Math.random, Date), non-fuite des DTO (trackViewUrl, artist-credit sous infrastructure/music), aucun new d'une classe d'infrastructure dans application/domain, enregistrements réservés à container.ts, résolution complète du conteneur, durées de vie déclarées (SINGLETON_TOKENS/TRANSIENT_TOKENS) et détecteur de dépendance captive validé sur un cas négatif. Méthodes privées fetch des adapters renommées requestJson.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
