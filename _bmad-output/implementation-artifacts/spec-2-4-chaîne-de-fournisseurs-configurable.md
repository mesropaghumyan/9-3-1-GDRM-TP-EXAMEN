---
title: 'Story 2.4 — Chaîne de fournisseurs configurable'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 2.4 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

container.ts enregistre FetchHttpClient et les adapters iTunes/MusicBrainz (singletons créés par useFactory, un cache/limiteur/breaker par fournisseur) ; ordre par défaut itunes, musicbrainz, local ; tests d'intégration avec FakeHttpClient (bascule iTunes -> MusicBrainz -> Local, ordre modifié par la config). Les tests d'Epic 1 fixent MUSIC_PROVIDER_ORDER=local, et le test 'adapter non enregistré' est retiré car son hypothèse n'existe plus. Délai du test dependency-cruiser relevé (processus enfant lent en parallèle).

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
