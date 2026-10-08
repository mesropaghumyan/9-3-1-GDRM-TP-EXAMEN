---
title: 'Story 1.3 — Horloge, journal structuré et préférences mockées'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 1.3 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

SystemClock (seul lecteur de Date), JsonLogger/StdoutLogWriter (seul process.stdout), loadConfig(env) validée avec ConfigError, mock InMemoryUserPreferencesProvider et FakeUserPreferencesProvider couverts par une suite de contrat commune. Défaut MUSIC_PROVIDER_ORDER=local tant que les adapters HTTP n'existent pas (Epic 2).

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
