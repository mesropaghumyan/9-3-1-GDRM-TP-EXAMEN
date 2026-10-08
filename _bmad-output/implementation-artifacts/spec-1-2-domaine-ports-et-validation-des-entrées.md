---
title: 'Story 1.2 — Domaine, ports et validation des entrées'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 1.2 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

Modèles de domaine immuables, erreurs typées, ports avec tokens Symbol, parsing des entrées (SOLEIL→SUNNY, LUNDI→MONDAY…) à la frontière Présentation. ResolvedTrack porte skippedProviders/isLocalFallback (écart documenté vs STD §3.1).

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
