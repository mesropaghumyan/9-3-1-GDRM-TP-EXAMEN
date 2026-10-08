---
title: 'Story 1.6 — Déclenchement d'un réveil nominal'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 1.6 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

WakeUpService (facade, 5 paramètres @inject), WakeUpHandler (présentation), container.ts (seul câblage, durées de vie documentées), run.ts/index.ts (CLI: userId jour météo), tests unitaires, d'intégration (conteneur réel, 3 canaux, point d'entrée en ligne de commande). Boucle de repli de canaux déjà présente ; utilisateur inconnu/annulation/timeouts restent à traiter en Epic 3.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
