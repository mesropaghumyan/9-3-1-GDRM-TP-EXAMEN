---
title: 'Story 3.3 — Annulation et garantie anti-silence'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 3.3 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

WakeUpService : annulation -> FAILED CANCELLED journalisé en warn (signal propagé aux préférences, à la musique et aux canaux, vérifié par fakes) ; panne de chaîne musicale -> FAILED NO_TRACK_AVAILABLE ; seules les erreurs de programmation remontent. Test paramétré exhaustif (192 combinaisons préférences/fournisseurs/canaux/annulation) et analyse statique (aucun catch vide ni promesse flottante, règle no-empty ajoutée à ESLint).

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
