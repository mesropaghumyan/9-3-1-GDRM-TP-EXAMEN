---
title: 'Story 1.5 — Canaux de notification simulés'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
---

## Intent

Implémenter la story 1.5 de `_bmad-output/planning-artifacts/epics.md` (critères d'acceptation Given/When/Then de la story, SFD, STD et architecture spine font foi).

## Implementation Notes

Mocks FakeEmailClient/FakeSmsGateway/FakePushService à interfaces hétérogènes, un adapter par canal (conversion + NotificationDeliveryError), écriture via NotificationSink→Logger, ChannelResolver (préféré puis ordre de config), buildWakeUpNotification (texte français), suite notificationChannelContract. Les mocks sont exportés par l'index de leur module pour que le composition root les enregistre.

Validation : `npm run verify` vert ; porte QA = CI `verify` de la pull request.
