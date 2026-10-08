---
title: 'Story 4.3 — Couverture, intégration et Definition of Done'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 4.3 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

Seuils de couverture bloquants confirmés (aucune exclusion), expect.requireAssertions activé et prouvé par un test sur une fixture sans assertion, tests ajoutés pour WakeUpHandler et run (couverture presentation/main), README documente la DoD. Les scénarios d'intégration (3 canaux, bascule iTunes -> MusicBrainz -> Local) existaient déjà (stories 1.6 et 2.4).

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
