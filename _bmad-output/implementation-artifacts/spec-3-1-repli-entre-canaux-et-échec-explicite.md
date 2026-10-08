---
title: 'Story 3.1 — Repli entre canaux et échec explicite'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 3.1 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

ChannelDelivery (nouveau collaborateur applicatif, construit par useFactory) : chaque canal tenté une fois avec timeout par tentative, premier succès arrêtant la séquence, attempts et bascules en warn ; WakeUpService en dépend (reste à 5 paramètres). Canal ajouté dans un conteneur enfant utilisé sans toucher WakeUpService.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
