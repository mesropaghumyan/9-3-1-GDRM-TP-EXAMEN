---
title: 'Story 4.2 — Inventaire des dépendances, licences et SBOM'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 4.2 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

Audit rejoué (npm ls, npm outdated, npm audit, license-checker --onlyAllow, SBOM) : aucune dépendance ajoutée depuis la story 1.1, aucun écart de licence. README complété (composants qui posent question : tsyringe >12 mois, reflect-metadata, tslib, mainteneurs uniques ; tableau des commandes d'audit et écarts d'outil), licences et SBOM régénérés.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
