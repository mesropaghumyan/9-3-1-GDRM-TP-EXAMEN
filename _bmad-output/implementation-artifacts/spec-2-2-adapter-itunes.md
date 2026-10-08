---
title: 'Story 2.2 — Adapter iTunes'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 2.2 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

ITunesMusicProvider (cache -> circuit -> quota -> appel), DTO privé validé par garde de type, trackViewUrl ignoré, pannes traduites en null ou MusicProviderUnavailableError, ITUNES_CONFIG, fixture JSON de référence, musicProviderContract étendu aux scénarios de panne.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
