---
status: final
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/specs/spec-reveil-musical/SPEC.md
  - _bmad-output/planning-artifacts/architecture/architecture-9-3-1-GDRM-TP-EXAMEN-2026-10-08/ARCHITECTURE-SPINE.md
  - docs/SFD.md
  - docs/STD.md
  - CLAUDE.md
---

# Réveil musical - Epic Breakdown

## Overview

Ce document décompose les exigences de la SPEC et du SFD (tenant lieu de PRD, aucun PRD séparé), les décisions d'architecture (spine AD-1 à AD-14, STD) et les règles de `CLAUDE.md` en epics et stories implémentables. Aucun UX : le périmètre exclut toute interface.

## Requirements Inventory

### Functional Requirements

FR1: `WakeUpService.trigger(userId, day, weather, signal?)` est le point d'entrée unique ; aucun appel météo externe (CAP-1, RG-15).
FR2: La Présentation valide `userId` (non vide) et le jour, convertit `SOLEIL/PLUIE/NEIGE/NUAGEUX` en `SUNNY/RAIN/SNOW/CLOUDY` ; toute entrée invalide lève `InvalidInputError` sans appel aux fournisseurs (AD-13, RG-01).
FR3: Le jour de la semaine est journalisé et n'influence pas le choix du morceau (RG-03).
FR4: Les préférences (morceau par météo, secours, canal préféré) sont obtenues via le port `UserPreferencesProvider`, mocké en infrastructure (CAP-2). Utilisateur inconnu : `FAILED`/`USER_NOT_FOUND` journalisé en erreur (RG-09). Préférences indisponibles : préférences par défaut de la config, réveil dégradé (RG-10).
FR5: `TrackSelectionPolicy` choisit la requête : morceau de la météo du jour, sinon secours utilisateur, sinon liste locale ; les 5 lignes de la table de décision SFD §7 sont respectées (CAP-3, RG-02).
FR6: `FallbackMusicProvider` interroge les fournisseurs dans l'ordre configuré (défaut iTunes, MusicBrainz, local) ; échec, timeout, circuit ouvert, quota ou résultat vide font passer au suivant ; il implémente `MusicProvider` et `TrackResolver` (jamais `null`) (CAP-4, RG-04).
FR7: Adapter iTunes : `GET /search?term=…&media=music&limit=5`, terme encodé, cache par terme normalisé, limiteur ~20 req/min, `trackViewUrl` ignoré (CAP-4).
FR8: Adapter MusicBrainz : `GET /ws/2/recording?query=…&fmt=json`, `User-Agent` identifiable non vide sur chaque requête, cache, ~1 req/s (CAP-4).
FR9: `LocalFallbackMusicProvider` en mémoire, ne peut pas échouer, correspondance par titre normalisé sinon première entrée, déterministe (RG-05).
FR10: Un `Track` ne contient que `title` et `artist` ; aucun champ ni DTO tiers (`trackViewUrl`, `artist-credit`) ne sort de son adapter (RG-06, AD-5).
FR11: Trois canaux simulés (Email, SMS, Push) : mocks à interfaces hétérogènes (`FakeEmailClient`, `FakeSmsGateway`, `FakePushService`) ramenés à `NotificationChannel` par un adapter chacun ; textes en français ; les mocks écrivent via `NotificationSink`, jamais sur la console (CAP-5, SFD §9, RG-14).
FR12: `NotificationChannelResolver` ordonne les canaux : préféré puis ordre de repli configuré (défaut EMAIL, SMS, PUSH) ; chaque canal est tenté une fois avec timeout ; le premier succès arrête ; tous en échec : `FAILED`/`ALL_CHANNELS_FAILED` et log `error` (AD-9, RG-07, RG-08).
FR13: `WakeUpResult` (union `DELIVERED | FAILED`) porte la provenance (`track`, `trackSource`, `providerName`, `channel`, `attempts`, `degraded`, `reason`) ; définition du mode dégradé selon RG-11 (AD-10).
FR14: Journalisation structurée via `Logger` → `LogWriter` (`StdoutLogWriter`) des événements du SFD §10 (début, morceau choisi, bascules fournisseur/canal, fournisseur utilisé, notification simulée, échec), sans donnée personnelle superflue (RG-12, AD-11).
FR15: Annulation : signal déclenché → `FAILED`/`CANCELLED` journalisé en `warn`, signal propagé à tous les appels sortants (RG-13).
FR16: Anti-silence : pour toute combinaison de pannes (musique, canaux, préférences), `trigger` retourne un réveil émis ou un échec explicite journalisé, jamais une exception ni un retour muet (CAP-6, AD-10).
FR17: Gouvernance des dépendances : audit licences et fraîcheur avant tout ajout, `README.md` avec tableau (package, type, version installée, dernière stable, licence, statut, justification), `docs/licenses.csv`, `sbom.cdx.json` commité (CAP-7, AD-14).
FR18: Suite de tests unitaires, contrat, architecture et intégration, sans réseau réel, avec `fetch` bloqué au setup et seuils de couverture bloquants (CAP-8).

### NonFunctional Requirements

NFR1: Fiabilité : aucun silence ni `catch` vide ; un réveil émis ou un échec explicite journalisé pour toute combinaison de pannes.
NFR2: Délais : chaque appel externe a un timeout via `AbortSignal` ; 1 retry maximum (transport et 5xx, jamais 4xx) ; aucune attente infinie.
NFR3: Quota : iTunes respecté par cache + limiteur ; quota atteint = bascule sans appel réseau ; circuit breaker par fournisseur HTTP.
NFR4: Évolutivité : nouveau fournisseur ou canal = 1 adapter + 1 enregistrement dans `container.ts`, 0 modification de l'Application.
NFR5: Conformité légale : licences permissives uniquement (MIT, Apache-2.0, BSD-2/3, ISC, 0BSD, BlueOak-1.0.0) ; transitives incluses ; `npm audit --omit=dev --audit-level=high` vert.
NFR6: Testabilité : aucun réseau, horloge, FS ni `process.env` réels en test ; couverture domain+application ≥ 90 % lignes / 85 % branches, infrastructure ≥ 85 % / 75 %, global ≥ 85 % / 80 %.
NFR7: Déterminisme et dépendances implicites éliminées : pas de `Date`, `Math.random`, `console.*`, `process.env` hors config, singleton de module.
NFR8: Qualité statique : TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`), zéro `any`, ESLint `--max-warnings 0`, Prettier.
NFR9: Langues : code, identifiants et noms de tests en anglais ; documentation, README, ADR et commits (Conventional Commits) en français.

### Additional Requirements

- AD-1 : sens des dépendances entre couches, vérifié par `dependency-cruiser` et `tests/architecture` ; aucun cycle.
- AD-2 : un port par besoin métier dans `src/domain/ports/<Port>.ts` avec son token `Symbol` voisin ; tokens applicatifs dans `src/application/tokens.ts`.
- AD-3 : injection par constructeur, `@inject(TOKEN)` sur chaque paramètre, `private readonly`, 5 paramètres maximum ; `new`, `resolve` et `reflect-metadata` uniquement dans `src/main` (et le setup de test).
- AD-4 : durées de vie déclarées dans `container.ts` seulement ; aucun singleton ne capture un transient (test dédié).
- AD-5 : modèles de domaine immuables et sans décorateur ; DTO tiers privés à leur module infrastructure.
- AD-6/AD-7 : chaîne de résolution terminée par `LocalFallback` ; pannes traduites à la frontière de l'adapter ; JSON validé par garde de type, sans `any`.
- AD-8 : `TtlCache`, `RateLimiter`, `CircuitBreaker` maison dans `infrastructure/resilience`, temps via `Clock`, un jeu par fournisseur (`useFactory`) ; `cockatiel` non ajouté.
- AD-11/AD-12 : `Logger` → `LogWriter` ; `loadConfig(env)` lue une fois dans `main`, validation manuelle, configs typées injectées (`ITUNES_CONFIG`, `MUSICBRAINZ_CONFIG`…) ; ordre des fournisseurs et canaux, `User-Agent`, TTL et timeouts viennent de la config.
- AD-14 / pile : Node 24.x (`.nvmrc`, `engines`), TypeScript 6.0.3, tsyringe 4.10.0, reflect-metadata 0.2.2, Vitest et `@vitest/coverage-v8` 5.0.3, ESLint 10.12.0, typescript-eslint 8.71.1, Prettier 3.9.9, dependency-cruiser 18.5.0, license-checker-rseidelsohn 5.0.1, @cyclonedx/cyclonedx-npm 6.0.1, tsx 4.23.15, @types/node 24.19.1 ; versions épinglées (`save-exact=true`), `ignore-scripts=true`, `npm ci` ; versions re-vérifiées par `npm outdated` à l'installation.
- Pas de starter template : le dépôt ne contient aucun code ; la première story initialise le projet (`package.json`, `.npmrc`, `.nvmrc`, `tsconfig*.json`, ESLint, Prettier, dependency-cruiser, Vitest, scripts npm §5.1).
- Point **Deferred** du spine : vérifier que Vitest 5 / Vite 8 supporte `experimentalDecorators` avec décorateurs de paramètres (`@inject`) ; spike en première story, repli par `useFactory` sans décorateurs (ADR requis, accord humain).
- Valeurs numériques de config (seuils du breaker, TTL, timeouts) fixées à l'implémentation dans `AppConfig`, dans les bornes de `CLAUDE.md` §2.
- Cycle BMAD : statuts `backlog → ready-for-dev → in-progress → review → done` ; `npm run verify` vert avant `review` ; fichier de statut du sprint mis à jour dans le même commit que le changement.
- Scripts `npm run verify` = typecheck, lint, format:check, arch, test, coverage, audit:deps, audit:licenses.

### UX Design Requirements

Sans objet : aucun document UX, le périmètre exclut toute interface utilisateur.

### FR Coverage Map

FR1: Epic 1 - Point d'entrée unique `trigger`, sans appel météo
FR2: Epic 1 - Validation des entrées et mapping de la météo
FR3: Epic 1 - Jour journalisé, sans influence sur le morceau
FR4: Epic 1 (préférences nominales via le port) + Epic 3 (utilisateur inconnu, préférences par défaut)
FR5: Epic 1 - Sélection du morceau (table de décision §7)
FR6: Epic 2 - Chaîne de fournisseurs configurable
FR7: Epic 2 - Adapter iTunes (cache, quota)
FR8: Epic 2 - Adapter MusicBrainz (`User-Agent`, espacement)
FR9: Epic 1 - Liste locale qui ne peut pas échouer
FR10: Epic 1 - `Track` limité à `title` et `artist` (revérifié en Epic 2)
FR11: Epic 1 - Trois canaux simulés et leurs adapters
FR12: Epic 3 - Repli entre canaux
FR13: Epic 1 - `WakeUpResult` avec provenance et mode dégradé
FR14: Epic 1 - Journalisation structurée
FR15: Epic 3 - Annulation propagée
FR16: Epic 3 - Anti-silence exhaustif
FR17: Epic 4 - Inventaire des dépendances, README, SBOM
FR18: Epic 4 - Suite de tests et seuils de couverture (construite story par story)

## Epic List

### Epic 1: Réveil de bout en bout
Un appelant peut déclencher un réveil : le service valide les entrées, lit les préférences mockées, choisit le morceau (météo, puis secours, puis liste locale) et notifie sur le canal préféré (Email, SMS ou Push), avec provenance dans le résultat et trace dans le journal. Inclut l'initialisation du dépôt et le spike `@inject` sous Vitest 5.
**FRs covered:** FR1, FR2, FR3, FR4 (nominal), FR5, FR9, FR10, FR11, FR13, FR14

### Epic 2: Morceaux réels et résilients
Le morceau vient d'iTunes puis de MusicBrainz, avec bascule automatique vers la liste locale, sans dépasser les quotas ni attendre indéfiniment.
**FRs covered:** FR6, FR7, FR8

### Epic 3: Réveil fiable en mode dégradé
Quelle que soit la panne, l'appelant obtient un réveil émis ou un échec explicite et journalisé.
**FRs covered:** FR4 (utilisateur inconnu, préférences par défaut), FR12, FR15, FR16

### Epic 4: Conformité et livraison
Le dépôt est livrable : inventaire des dépendances et licences, README, SBOM, tests d'architecture et d'intégration, seuils de couverture, `npm run verify` vert.
**FRs covered:** FR17, FR18


## Epic 1: Réveil de bout en bout

Un appelant peut déclencher un réveil : le service valide les entrées, lit les préférences mockées, choisit le morceau (météo, puis secours, puis liste locale) et notifie sur le canal préféré (Email, SMS ou Push), avec provenance dans le résultat et trace dans le journal.

### Story 1.1: Socle du projet et spike d'injection

As a développeur,
I want un dépôt outillé et la preuve que `@inject` fonctionne sous Vitest 5,
So that je construis sur une base vérifiée.

**Acceptance Criteria:**

**Given** un dépôt vide
**When** `npm ci` puis `npm run verify` s'exécutent
**Then** typecheck, lint (`--max-warnings 0`), format, `arch`, test et audits passent
**And** `.npmrc` (`save-exact`, `ignore-scripts`), `.nvmrc` 24, `engines` et un `tsconfig` strict avec `experimentalDecorators` sont en place.

**Given** chaque package ajouté
**When** `npm ls`, `npm outdated` et `license-checker --onlyAllow` sont exécutés
**Then** le README contient le tableau des packages (versions issues des commandes), `docs/licenses.csv` et `sbom.cdx.json` sont générés
**And** le tout est dans le même commit.

**Given** un test minimal avec une classe `@injectable()` et un `@inject(TOKEN)` sur un paramètre d'interface
**When** Vitest l'exécute
**Then** la résolution réussit sans `emitDecoratorMetadata`.

**Given** le spike échoue
**When** le constat est fait
**Then** l'exécution s'arrête, un ADR (repli `useFactory`) est ouvert et l'accord humain est attendu avant de continuer.

**Given** un test qui appelle `fetch`
**When** il s'exécute
**Then** il lève une erreur grâce au setup global
**And** les règles `dependency-cruiser` des couches (AD-1) sont actives.

### Story 1.2: Domaine, ports et validation des entrées

As a appelant,
I want que mes entrées invalides soient rejetées clairement,
So that aucun réveil n'est déclenché sur des données fausses.

**Acceptance Criteria:**

**Given** `domain` sans dépendance tierce
**When** les modèles (`Track`, `TrackQuery`, `UserPreferences`, `WeatherType`, `ChannelKind`, `DayOfWeek`, `UserId` brandé) et les ports avec leurs tokens `Symbol` sont créés
**Then** ils sont immuables
**And** le test d'architecture est vert.

**Given** `SOLEIL`, `PLUIE`, `NEIGE` ou `NUAGEUX`
**When** la Présentation les parse
**Then** ils deviennent `SUNNY`, `RAIN`, `SNOW`, `CLOUDY`.

**Given** un `userId` vide ou blanc, un jour inconnu ou une météo inconnue
**When** le parsing s'exécute
**Then** `InvalidInputError` (classe de domaine typée) est levée.

**Given** un `Track`
**When** il est sérialisé
**Then** ses clés sont exactement `title` et `artist`.

### Story 1.3: Horloge, journal structuré et préférences mockées

As a exploitant,
I want un journal structuré sans `console.*` et un service de préférences remplaçable,
So that chaque réveil est tracé et le métier se teste avec des fakes.

**Acceptance Criteria:**

**Given** `Logger` et `LogWriter`
**When** `info`, `warn` ou `error` est appelé
**Then** une ligne JSON `{ event, ...fields }` est écrite via `LogWriter`
**And** `StdoutLogWriter` est la seule référence à `process.stdout`.

**Given** le port `Clock`
**When** `SystemClock` l'implémente
**Then** aucune autre classe n'utilise `Date`.

**Given** `loadConfig(env)` appelé dans `main`
**When** l'environnement est valide
**Then** il renvoie une config typée
**And** une valeur invalide produit une erreur explicite.

**Given** le mock `UserPreferencesProvider`
**When** un utilisateur connu est demandé
**Then** il retourne un morceau par météo, un secours et un canal préféré
**And** un fake injecté dans un test remplace le mock sans modifier le code testé (CAP-2).

### Story 1.4: Choix du morceau et liste locale

As a utilisateur,
I want qu'un morceau soit toujours choisi pour ma météo,
So that mon réveil a toujours de la musique.

**Acceptance Criteria:**

**Given** les 5 lignes de la table SFD §7
**When** `TrackSelectionPolicy` s'exécute
**Then** la requête est le morceau météo, sinon le secours, sinon l'entrée par défaut
**And** `trackSource` vaut `WEATHER`, `USER_FALLBACK` ou `LOCAL_FALLBACK`.

**Given** `LocalFallbackMusicProvider`
**When** un titre est demandé
**Then** il répond par correspondance de titre normalisé, sinon par sa première entrée
**And** il n'utilise ni I/O ni `Math.random`.

**Given** `FallbackMusicProvider` configuré avec la seule liste locale
**When** `resolve` est appelé
**Then** il retourne un `ResolvedTrack` avec le nom du fournisseur, jamais `null`.

**Given** un `FakeMusicProvider` en échec placé devant le local
**When** `resolve` est appelé
**Then** la bascule est journalisée en `warn`
**And** le local répond.

### Story 1.5: Canaux de notification simulés

As a utilisateur,
I want être prévenu par Email, SMS ou Push,
So that je reçois mon réveil sur mon canal préféré.

**Acceptance Criteria:**

**Given** `FakeEmailClient`, `FakeSmsGateway` et `FakePushService` à interfaces hétérogènes
**When** chaque adapter reçoit une `WakeUpNotification`
**Then** il la convertit au format du mock (sujet « Réveil musical », texte en français avec titre et artiste, destinataire = `userId`).

**Given** un mock qui échoue
**When** l'adapter l'appelle
**Then** il lève `NotificationDeliveryError`.

**Given** les mocks
**When** ils enregistrent un envoi simulé
**Then** ils écrivent uniquement via `NotificationSink`, qui délègue au `Logger`, jamais sur la console.

**Given** `NotificationChannelResolver`
**When** `resolve(preferred)` est appelé
**Then** il renvoie le canal préféré puis les autres dans l'ordre de config
**And** la suite `notificationChannelContract` s'applique à chaque canal.

### Story 1.6: Déclenchement d'un réveil nominal

As a appelant,
I want appeler `trigger(userId, jour, météo)` et obtenir un résultat complet,
So that l'utilisateur est réveillé avec son morceau.

**Acceptance Criteria:**

**Given** un utilisateur connu et chacune des 4 météos
**When** `trigger` est appelé
**Then** il retourne `DELIVERED` avec `track`, `trackSource`, `providerName`, `channel`, `attempts` et `degraded=false`
**And** aucun appel météo n'est fait.

**Given** le jour fourni
**When** le réveil démarre
**Then** il apparaît dans le journal de début
**And** il ne change pas le morceau.

**Given** une météo non couverte
**When** `trigger` est appelé
**Then** `trackSource=USER_FALLBACK` et `degraded=false` (RG-11).

**Given** `container.ts`
**When** `resolve(WAKE_UP_USE_CASE)` est appelé
**Then** le graphe se résout sans dépendance captive
**And** aucun `new` d'implémentation concrète n'existe hors `main`.

**Given** le conteneur réel de production
**When** le scénario complet s'exécute (liste locale comme seul fournisseur, aucun `HttpClient` encore enregistré)
**Then** un test d'intégration passe pour chacun des 3 canaux.


## Epic 2: Morceaux réels et résilients

Le morceau vient d'iTunes puis de MusicBrainz, avec bascule automatique vers la liste locale, sans dépasser les quotas ni attendre indéfiniment.

### Story 2.1: Client HTTP et briques de résilience

As a développeur,
I want un client HTTP borné et des briques de résilience pilotées par l'horloge,
So that les adapters ne peuvent ni bloquer ni dépasser un quota.

**Acceptance Criteria:**

**Given** `FetchHttpClient`, seul appelant de `fetch`
**When** `getJson` est appelé
**Then** il applique `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])`
**And** il retourne `{ status, body }`.

**Given** une erreur de transport ou un statut 5xx
**When** la requête échoue
**Then** un seul retry est tenté
**And** un 4xx n'est jamais rejoué
**And** une erreur réseau devient `HttpTransportError`, jamais exposée au-delà d'`infrastructure`.

**Given** `TtlCache`
**When** une clé est relue avant la fin du TTL
**Then** elle est servie du cache
**And** elle expire après le TTL (`FakeClock`).

**Given** `RateLimiter` à fenêtre glissante
**When** le quota est atteint
**Then** il refuse sans appel réseau
**And** la fenêtre se libère avec le temps.

**Given** `CircuitBreaker`
**When** N échecs consécutifs surviennent
**Then** il s'ouvre, passe en demi-ouvert après le délai, puis se referme au premier succès.

**Given** ces composants
**When** ils lisent le temps
**Then** ils passent uniquement par `Clock`
**And** leurs valeurs numériques viennent de la config.

### Story 2.2: Adapter iTunes

As a utilisateur,
I want que mon morceau soit cherché sur iTunes,
So that j'obtiens le vrai titre sans dépasser le quota.

**Acceptance Criteria:**

**Given** la réponse de référence (fixture)
**When** l'adapter est appelé
**Then** il retourne un `Track` avec `title` et `artist` uniquement
**And** `trackViewUrl` est ignoré.

**Given** un second appel identique
**When** l'adapter est appelé
**Then** il est servi par le cache avec 0 requête
**And** le terme est normalisé et encodé (`URLSearchParams`).

**Given** le quota atteint
**When** l'adapter est appelé
**Then** il retourne « indisponible » sans appel réseau.

**Given** un résultat vide, un 429, un 5xx, un timeout, un JSON invalide ou un circuit ouvert
**When** l'adapter est appelé
**Then** il retourne `null` ou `MusicProviderUnavailableError`
**And** aucun type tiers ne remonte.

**Given** la suite `musicProviderContract`
**When** elle s'exécute sur cet adapter
**Then** elle passe
**And** la forme du JSON est validée par garde de type, sans `any`.

### Story 2.3: Adapter MusicBrainz

As a utilisateur,
I want que MusicBrainz prenne le relais quand iTunes ne répond pas,
So that je garde un morceau réel.

**Acceptance Criteria:**

**Given** la réponse de référence
**When** l'adapter est appelé
**Then** il retourne `title` et le nom d'artiste issu de `artist-credit`
**And** `artist-credit` ne sort pas de l'adapter.

**Given** chaque requête
**When** elle est émise
**Then** l'en-tête `User-Agent` est présent et non vide
**And** il est lu de `MUSICBRAINZ_CONFIG`, non écrit en dur.

**Given** deux requêtes rapprochées
**When** elles sont émises
**Then** elles sont espacées d'environ 1 s via `RateLimiter`
**And** un appel identique est servi par le cache.

**Given** les mêmes pannes que pour iTunes
**When** l'adapter est appelé
**Then** elles sont traduites en « indisponible »
**And** la suite de contrat passe.

### Story 2.4: Chaîne de fournisseurs configurable

As a exploitant,
I want que l'ordre des fournisseurs soit une donnée de configuration,
So that je change ou ajoute un fournisseur sans toucher au métier.

**Acceptance Criteria:**

**Given** la config `itunes, musicbrainz, local`
**When** iTunes échoue
**Then** `FallbackMusicProvider` passe à MusicBrainz, puis au local
**And** chaque bascule est journalisée en `warn`.

**Given** iTunes et MusicBrainz en panne
**When** `resolve` est appelé
**Then** le local répond
**And** `degraded=true` et `trackSource=LOCAL_FALLBACK`.

**Given** l'ordre modifié dans la config (`musicbrainz, itunes, local`)
**When** `resolve` est appelé
**Then** le comportement suit sans modification de code.

**Given** `container.ts`
**When** il enregistre les fournisseurs
**Then** adapters, caches, limiteurs et breakers sont des singletons créés par `useFactory`, un jeu par fournisseur
**And** aucune dépendance captive n'existe.

**Given** un test d'intégration avec `FakeHttpClient`
**When** le scénario complet s'exécute
**Then** le basculement iTunes → MusicBrainz → Local est couvert
**And** chaque `Track` sérialisé n'a que `title` et `artist`.


## Epic 3: Réveil fiable en mode dégradé

Quelle que soit la panne, l'appelant obtient un réveil émis ou un échec explicite et journalisé.

### Story 3.1: Repli entre canaux et échec explicite

As a utilisateur,
I want être prévenu sur un autre canal si le mien est en panne,
So that je ne manque pas mon réveil.

**Acceptance Criteria:**

**Given** le canal préféré en panne
**When** `trigger` s'exécute
**Then** le canal suivant de l'ordre de config est tenté (une fois, avec timeout par tentative)
**And** le premier succès arrête la séquence
**And** le résultat est `DELIVERED` avec `degraded=true`.

**Given** chaque tentative de canal
**When** `trigger` se termine
**Then** `attempts` liste (canal, succès ou échec)
**And** chaque bascule est journalisée en `warn` avec sa cause.

**Given** tous les canaux en panne
**When** `trigger` s'exécute
**Then** le résultat est `FAILED` avec `reason=ALL_CHANNELS_FAILED` et le morceau choisi si connu
**And** une erreur est journalisée en `error`.

**Given** un canal ajouté (fake) dans le conteneur de test
**When** `trigger` s'exécute
**Then** il est utilisé sans modifier `WakeUpService`.

### Story 3.2: Utilisateur inconnu et préférences indisponibles

As a exploitant,
I want que ces deux pannes produisent un résultat clair et tracé,
So that je diagnostique sans exception.

**Acceptance Criteria:**

**Given** un utilisateur inconnu
**When** `trigger` s'exécute
**Then** le résultat est `FAILED` avec `reason=USER_NOT_FOUND`
**And** une erreur est journalisée
**And** aucune notification n'est envoyée (RG-09).

**Given** le service de préférences indisponible
**When** `trigger` s'exécute
**Then** les préférences par défaut de la config sont utilisées
**And** le réveil est émis avec `degraded=true`
**And** la bascule est journalisée (RG-10).

**Given** ces deux cas
**When** `trigger` se termine
**Then** aucune exception n'est levée
**And** seules les entrées invalides lèvent `InvalidInputError`, à la frontière (RG-01).

### Story 3.3: Annulation et garantie anti-silence

As a appelant,
I want pouvoir annuler un réveil et être certain qu'aucun cas ne finit en silence,
So that je peux me fier au service.

**Acceptance Criteria:**

**Given** un `AbortSignal` déclenché
**When** `trigger` s'exécute
**Then** le résultat est `FAILED` avec `reason=CANCELLED`, journalisé en `warn`
**And** le signal est propagé aux ports sortants (préférences, musique, canaux), vérifié avec des fakes qui inspectent le signal.

**Given** un test paramétré couvrant toutes les combinaisons de pannes (préférences, chaque fournisseur musical, chaque canal, annulation)
**When** il s'exécute
**Then** chaque cas retourne soit `DELIVERED`, soit `FAILED` avec une `reason` explicite et un log de niveau `error` ou `warn`
**And** aucun retour n'est muet.

**Given** l'analyse statique de `src/`
**When** elle s'exécute
**Then** aucun `catch` vide ni promesse flottante n'existe.


## Epic 4: Conformité et livraison

Le dépôt est livrable : inventaire des dépendances et licences, README, SBOM, tests d'architecture et d'intégration, seuils de couverture, `npm run verify` entièrement vert.

### Story 4.1: Tests d'architecture et de non-fuite

As a reviewer,
I want des tests qui échouent si l'architecture dérive,
So that les règles de `CLAUDE.md` tiennent dans la durée.

**Acceptance Criteria:**

**Given** `tests/architecture/`
**When** la suite s'exécute
**Then** elle vérifie le sens des dépendances (AD-1) et l'absence de cycle
**And** `npm run arch` est vert.

**Given** `domain` et `application`
**When** leurs imports sont analysés
**Then** aucun import de `infrastructure`, `main`, `container`, `fetch`, `node:fs` ou `node:http` n'existe
**And** `tsyringe` n'est importé que dans `application`, `infrastructure` et `main`.

**Given** une recherche statique du code source
**When** elle s'exécute
**Then** `trackViewUrl` et `artist-credit` n'apparaissent que dans `infrastructure/music/**`
**And** aucun `new <Classe d'infrastructure>` n'existe dans `application` ou `domain`.

**Given** le conteneur de production
**When** `resolve(WAKE_UP_USE_CASE)` est appelé
**Then** il ne lève pas
**And** aucun singleton ne capture un transient.

### Story 4.2: Inventaire des dépendances, licences et SBOM

As a responsable conformité,
I want un inventaire vérifié et un SBOM à jour,
So that je prouve qu'aucune licence interdite n'est livrée.

**Acceptance Criteria:**

**Given** l'installation finale
**When** `npm ls --all`, `npm outdated` et `npm audit --omit=dev --audit-level=high` s'exécutent
**Then** leurs sorties alimentent le tableau du README
**And** aucune version ni licence n'est citée de mémoire.

**Given** `license-checker-rseidelsohn --production --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD;BlueOak-1.0.0"`
**When** il s'exécute
**Then** aucune licence hors liste n'est signalée
**And** s'il y en a une, le travail s'arrête et l'escalade humaine est déclenchée.

**Given** le README
**When** il est relu
**Then** il contient une ligne par package direct (installée, dernière stable, licence, statut, justification)
**And** une section « Transitives » (résumé par licence)
**And** une justification écrite pour tout composant douteux (ancien, dernière release > 12 mois, mainteneur unique, par exemple `tsyringe`).

**Given** les dépendances finales
**When** les commandes SBOM s'exécutent
**Then** `docs/licenses.csv` et `sbom.cdx.json` sont régénérés et commités
**And** tout écart d'outil est signalé dans le README.

### Story 4.3: Couverture, intégration et Definition of Done

As a reviewer,
I want une suite verte aux seuils de couverture et un `verify` complet,
So that je valide la livraison.

**Acceptance Criteria:**

**Given** `vitest.config.ts`
**When** la couverture s'exécute
**Then** les seuils bloquants sont domain+application ≥ 90 % lignes et 85 % branches, infrastructure ≥ 85 % et 75 %, global ≥ 85 % et 80 %
**And** aucune exclusion n'est faite sans justification écrite.

**Given** un test sans assertion ou un appel réseau non prévu
**When** la suite s'exécute
**Then** le test sans assertion n'est pas compté
**And** l'appel réseau fait échouer le test.

**Given** `tests/integration/`
**When** la suite s'exécute avec le conteneur réel et seul `HttpClient` remplacé
**Then** le scénario complet est couvert pour chaque canal
**And** le basculement iTunes → MusicBrainz → Local est couvert.

**Given** `npm run verify`
**When** il s'exécute
**Then** typecheck, lint, format, arch, test, coverage, audit:deps et audit:licenses passent
**And** le README ainsi que le fichier de statut du sprint sont à jour.


## Epic 5: Exposition HTTP et contrat OpenAPI

Un testeur peut appeler le service par HTTP et consulter un contrat OpenAPI à jour (décision : ADR 0002, `node:http` natif, aucun paquet ajouté). Dépend de l'Epic 1.

### Story 5.1: Endpoint `POST /wake-ups` conforme à `docs/api/openapi.yaml`

As a testeur,
I want appeler `POST /wake-ups` et lire le contrat OpenAPI,
So that je teste le service sans écrire de code.

**Acceptance Criteria:**

**Given** `docs/api/openapi.yaml`
**When** les tests de cohérence s'exécutent
**Then** chaque chemin déclaré existe côté serveur
**And** les énumérations (jours, météos, canaux, raisons, sources) sont identiques à celles du code.

**Given** un corps JSON valide
**When** `POST /wake-ups` est appelé
**Then** la réponse est 200 avec un `WakeUpResult` (`DELIVERED` ou `FAILED`)
**And** une panne de fournisseur ou de canal ne produit jamais de 5xx muet.

**Given** un jour, une météo ou un `userId` invalide, ou un JSON mal formé
**When** `POST /wake-ups` est appelé
**Then** la réponse est 400 `INVALID_INPUT` sans appel aux fournisseurs.

**Given** `GET /health` et `GET /openapi.yaml`
**When** ils sont appelés
**Then** ils répondent 200, le second avec le contrat.

**Given** la couche `presentation/http`
**When** `npm run arch` s'exécute
**Then** elle n'importe ni `infrastructure` ni `container`.

