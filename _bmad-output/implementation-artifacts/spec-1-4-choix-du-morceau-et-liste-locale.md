---
title: 'Story 1.4 — Choix du morceau et liste locale'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 1.4 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

TrackSelectionPolicy pure (WEATHER, USER_FALLBACK, LOCAL_FALLBACK), LocalFallbackMusicProvider (titre normalisé sinon première entrée, déterministe), FallbackMusicProvider composite implémentant MusicProvider et TrackResolver avec bascule journalisée en warn. Contrat musicProviderContract introduit.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
