---
title: 'Story 2.1 — Client HTTP et briques de résilience'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 2.1 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

FetchHttpClient (seul appelant de fetch, timeout par tentative, 1 retry sur transport/5xx, jamais sur 4xx, HttpTransportError interne), TtlCache, RateLimiter à fenêtre glissante et CircuitBreaker pilotés par Clock, valeurs http/breaker dans AppConfig, FakeHttpClient de test.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
