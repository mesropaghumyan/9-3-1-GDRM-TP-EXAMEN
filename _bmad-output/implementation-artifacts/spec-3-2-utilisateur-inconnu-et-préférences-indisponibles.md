---
title: 'Story 3.2 — Utilisateur inconnu et préférences indisponibles'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 3.2 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

PreferencesResolver (construit par useFactory) : utilisateur inconnu -> FAILED USER_NOT_FOUND journalisé en error sans notification (RG-09) ; service indisponible -> préférences par défaut de la config (AppConfig.defaultPreferences) et réveil dégradé (RG-10). FailureReason étend l'union avec NO_TRACK_AVAILABLE (SFD et OpenAPI mis à jour) pour ne laisser aucune exception de panne.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
