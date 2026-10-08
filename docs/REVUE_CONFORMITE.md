# Revue de conformité au TP « Réveil musical »

Revue réalisée le 2026-10-08 sur `master` après l'épic 5. Chaque point renvoie à une preuve vérifiable dans le dépôt (test, commande ou fichier).

## 1. Énoncé du TP (`docs/TP_EXAMEN.md`)

| Exigence du TP | Verdict | Preuve |
| --- | --- | --- |
| Point d'entrée : ID utilisateur, jour, météo `SOLEIL/PLUIE/NEIGE/NUAGEUX`, aucun appel météo externe | ✅ | `WakeUpService.trigger` ; CLI `npx tsx src/main/index.ts alice LUNDI SOLEIL` ; `POST /wake-ups` ; `tests/unit/presentation/parseWakeUpInput.spec.ts` |
| Service interne mocké (morceau par météo, secours, canal préféré) accédé par une interface | ✅ | port `UserPreferencesProvider`, mock `InMemoryUserPreferencesProvider`, contrat `tests/contract/userPreferencesProvider.spec.ts` |
| Plusieurs sources de musique interchangeables par configuration | ✅ | `FallbackMusicProvider` + `MUSIC_PROVIDER_ORDER` ; `tests/integration/musicChain.integration.spec.ts` (ordre modifié sans toucher au code) |
| iTunes : cache + quota ~20 req/min, `trackViewUrl` ne fuit pas | ✅ | `tests/contract/itunesMusicProvider.spec.ts` ; `tests/architecture/staticRules.spec.ts` (non-fuite) ; essai réel : `providerName: itunes` |
| MusicBrainz : `User-Agent` identifiable sur chaque requête | ✅ | `tests/contract/musicbrainzMusicProvider.spec.ts` ; `loadConfig` refuse un User-Agent vide ; essai réel : `providerName: musicbrainz` |
| Fallback local codé en dur, jamais d'échec | ✅ | `LocalFallbackMusicProvider` (en mémoire, déterministe, sans `Math.random`) |
| Mocks email, SMS, push à interfaces volontairement différentes, ramenés à une interface commune par des adaptateurs | ✅ | `FakeEmailClient.sendMail(...)`, `FakeSmsGateway.push(...)`, `FakePushService.dispatch(payload)` ; `tests/contract/notificationChannels.spec.ts` ; sortie par le journal, jamais `console` |
| Nouveaux canaux (WhatsApp, appel vocal) sans tout réécrire | ✅ | 1 adapter + 1 enregistrement dans `container.ts` ; `tests/integration/wakeUp.integration.spec.ts` (canal ajouté dans un conteneur enfant) |
| Fiabilité : panne fournisseur ou canal jamais silencieuse | ✅ | `tests/unit/application/antiSilence.spec.ts` (192 combinaisons) ; résultat `FAILED` explicite + journal `error`/`warn` |
| Légal : licence et fraîcheur vérifiées avant tout composant | ✅ | README (tableau, composants qui posent question, commandes d'audit), `docs/licenses.csv`, `docs/licenses-dev.csv`, `sbom.cdx.json`, ADR 0001 |
| **Aucune classe métier ne connaît un détail de fournisseur ou de canal** | ✅ | `.dependency-cruiser.cjs` (couches) + `tests/architecture/staticRules.spec.ts` |
| **Aucune implémentation concrète instanciée (`new`)** | ✅ (corrigé pendant la revue) | `new` uniquement dans `src/main/container.ts` ; test `no new of a concrete implementation anywhere in src except container.ts` |
| Livrable : dépôt Git | ✅ | historique de PR #21 à #44+, CI GitHub |
| Livrable : README (package, licence, version installée, dernière stable, justification) | ✅ | `README.md` |
| Livrable : tests unitaires, bon niveau de couverture | ✅ | 436 tests ; couverture globale ≈ 98 % lignes ; seuils bloquants dans `vitest.config.ts` |

## 2. `CLAUDE.md`

| Règle | Verdict | Remarque |
| --- | --- | --- |
| TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`), zéro `any`, zéro `@ts-ignore` | ✅ | `tsconfig.json` ; aucun `any` ; les `as` restants (`UserId`, `Buffer`, élargissement de type) portent un commentaire « Why » |
| ESLint `--max-warnings 0`, Prettier | ✅ | `npm run lint`, `npm run format:check` |
| `@inject(TOKEN)` explicite, pas de `emitDecoratorMetadata` | ✅ | spike `tests/unit/spike/injection.spec.ts` |
| Pas de service locator, `tsyringe` borné aux couches autorisées | ✅ | `tests/architecture/staticRules.spec.ts` |
| Pas de dépendance captive | ✅ | `tests/architecture/container.spec.ts` (détecteur validé sur un cas négatif) |
| Dépendances implicites (`Date`, `process.env`, `console`, `fetch`, `Math.random`) encapsulées | ✅ | tests statiques + règles ESLint |
| `catch` jamais vide, aucune promesse flottante | ✅ | `no-empty` + `no-floating-promises` + `tests/architecture/staticAnalysis.spec.ts` |
| Aucun réseau réel en test, `fetch` bloqué | ✅ | `tests/setup.ts` ; `tests/unit/spike/fetch-blocked.spec.ts` |
| Un test sans assertion échoue | ✅ | `expect.requireAssertions` + `tests/unit/spike/requireAssertions.spec.ts` |
| Licences : permissives en production | ✅ | `npm run audit:licenses` (MIT, Apache-2.0, 0BSD) |
| Versions épinglées, `package-lock.json`, `.npmrc` | ✅ | `save-exact`, `ignore-scripts`, `engine-strict` |
| Commits Conventional, langue : code anglais, docs françaises | ✅ | historique Git |
| Cycle BMAD, statuts `sprint-status.yaml` | ✅ avec réserve | tous les épics `done` ; voir réserve 3 |
| « Un fichier = un type exporté principal » | ⚠️ écart assumé | voir réserve 1 |

## 3. Réserves et écarts assumés (à connaître avant la remise)

1. **Fichiers à plusieurs exports.** Les ports exportent l'interface et son token `Symbol` ensemble (imposé par `CLAUDE.md` §1.3) ; les types du domaine exportent aussi leur tableau de constantes ; `AppConfig.ts` et `tokens.ts` regroupent des types de configuration et des jetons. C'est une lecture souple de la règle, pour la cohésion.
2. **Dépendances en retard, justifiées.** `typescript` 6.0.3 (la 7.0.2 est incompatible avec `typescript-eslint` 8.71.1) et `@types/node` 24.19.1 (cible Node 24). `lightningcss` est sous MPL-2.0 en dépendance transitive de développement (ADR 0001), absent du livrable.
3. **Validation « humaine » déléguée.** Les ADR 0001 et 0002 et le passage des stories à `done` ont été validés par l'agent sur instruction explicite de l'utilisateur, pas par une revue humaine ligne à ligne. La CI GitHub (`verify`) est la porte QA automatique.
4. **Revue de code multi-agents non exécutée.** La commande `/code-review` n'a pas été lancée ; la revue ci-dessus est manuelle et factuelle.
5. **Divergences de conception** par rapport au STD initial : voir `docs/STD.md` §9.
6. **Réseau réel.** Le CLI et le serveur appellent iTunes et MusicBrainz par défaut ; `MUSIC_PROVIDER_ORDER=local` désactive tout appel sortant. Le contact du `User-Agent` par défaut est l'URL du dépôt ; à remplacer par un vrai contact via `MUSICBRAINZ_USER_AGENT`.
