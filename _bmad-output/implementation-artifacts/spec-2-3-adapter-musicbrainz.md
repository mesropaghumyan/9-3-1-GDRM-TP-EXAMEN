---
title: 'Story 2.3 — Adapter MusicBrainz'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 2.3 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

MusicBrainzMusicProvider (User-Agent lu de MUSICBRAINZ_CONFIG, artist-credit privé, cadence ~1 req/s via RateLimiter, cache, circuit), MUSICBRAINZ_USER_AGENT validé non vide par loadConfig, fixture de référence, suite de contrat.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
