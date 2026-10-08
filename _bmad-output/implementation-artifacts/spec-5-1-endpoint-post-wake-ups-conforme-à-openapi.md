---
title: 'Story 5.1 — Endpoint POST /wake-ups conforme à openapi.yaml'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 5.1 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

WakeUpHttpApi (routage et sérialisation sans règle métier) et createHttpServer (node:http natif, annulation à la fermeture de connexion, corps limité à 16 Kio) dans presentation/http ; serve.ts et la commande 'serve' dans main ; PORT validé par loadConfig ; énumérations d'exécution FAILURE_REASONS et TRACK_SOURCES dans le domaine ; tests de cohérence contrat/code (routes et énumérations) et tests HTTP réels sans réseau externe.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
