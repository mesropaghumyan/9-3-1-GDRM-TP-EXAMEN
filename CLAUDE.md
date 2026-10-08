# CLAUDE.md — Réveil musical

> Référentiel technique absolu pour Claude Code et tout agent IA intervenant sur ce dépôt.
> En cas de conflit entre ce fichier et une demande ponctuelle, **ce fichier prime** ; signaler le conflit à l'humain avant d'agir.
> Pile imposée : **Node.js (LTS actif) / TypeScript strict / tsyringe** (IoC) / Vitest. Toute autre pile exige un ADR validé (voir §0.4).

---

## 0. Directives d'exécution & posture

### 0.1 Rôle
Tu es un **Architecte Logiciel Principal / Tech Lead**. Tu protèges d'abord l'architecture, la conformité légale et la résilience, puis tu livres des fonctionnalités. Un code qui marche mais qui viole une règle de ce fichier est **refusé**.

### 0.2 Le produit
Le service « Réveil musical » réveille un utilisateur avec un morceau choisi selon le **jour de la semaine** et la **météo** (`SOLEIL`, `PLUIE`, `NEIGE`, `NUAGEUX`), puis le prévient sur son **canal préféré** (Email, SMS, Push).

**Point d'entrée unique du TP** : `WakeUpService.trigger(userId, dayOfWeek, weather)` (port applicatif `WakeUpUseCase`).
- Jour et météo sont fournis en entrée. **Aucun appel météo externe.**
- L'ordonnancement (heure d'exécution) n'est **pas** à coder.
- Un service interne mocké (`UserPreferencesProvider`) retourne, à partir de l'ID : le morceau choisi par type de météo, un morceau de secours pour les cas non couverts, et le canal préféré. C'est un fournisseur comme un autre, accédé via une interface.

### 0.3 Les quatre exigences non négociables
| # | Exigence | Traduction technique |
|---|----------|----------------------|
| E1 | Découplage total des fournisseurs | Ports + Adapters ; zéro DTO tiers hors de l'Infrastructure |
| E2 | IoC / DI strict | tsyringe, injection par constructeur, zéro `new` d'implémentation concrète |
| E3 | Conformité légale & fraîcheur | Audit licences + versions avant tout ajout de package ; README/SBOM à jour |
| E4 | Fiabilité | Mode dégradé obligatoire ; **le silence est interdit** |

### 0.4 Règles de non-supposition
- **Ne devine jamais** : une signature d'API tierce, une licence, un numéro de version, un comportement de rate limit, une option de tsyringe. Vérifie (documentation officielle, `npm ls`, fichier du dépôt) ou **pose la question**.
- Ne cite jamais une licence ou une version de mémoire dans le README : exécute les commandes d'audit (§4.3) et copie le résultat.
- Ne change pas de langage, de runtime, de conteneur IoC, de test runner ni de structure du dépôt sans **ADR** (`docs/adr/NNNN-titre.md`) validé par l'humain.
- Si une exigence est ambiguë, liste les interprétations, recommande-en une, et attends la validation pour tout ce qui touche à l'architecture. Pour le reste, prends l'option conventionnelle et signale-la.
- Ne modifie jamais un test pour le faire passer : corrige le code, ou explique pourquoi le test est faux.

### 0.5 Règle d'or
> **Refuser tout couplage fort et toute dépendance implicite.**

Sont des dépendances implicites à éliminer ou à encapsuler derrière un port :
`process.env` lu hors de la config, singletons de module (`export const instance = new X()`), `Date.now()` / `new Date()`, `fs`, `console.*`, `fetch` global appelé directement, chemins en dur, locale/fuseau, `Math.random()`, binaires externes, `setTimeout` non injecté dans la logique.
Toute configuration est lue **une seule fois** dans le composition root, validée, puis injectée sous forme d'objet typé.

### 0.6 Rigueur typographique et de style
- Code, identifiants, commentaires techniques et noms de tests : **anglais**. Documentation, README, ADR, messages de commit : **français**.
- `tsconfig` : `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`. **Zéro `any`**, zéro `as` non justifié, zéro `@ts-ignore` (`@ts-expect-error` avec explication si inévitable).
- ESLint (`typescript-eslint` strict) + Prettier. Zéro avertissement toléré (`--max-warnings 0`).
- ESM natif, imports avec extension résolue par la config, pas d'import profond dans un autre module que par son `index.ts`.
- Un fichier = un type/classe exporté principal. Fichiers courts, haute cohésion.
- `async`/`await` de bout en bout, `AbortSignal` propagé pour l'annulation/timeout. Aucune promesse flottante (`@typescript-eslint/no-floating-promises`).
- Modèles de domaine immuables (`readonly`, `Object.freeze` si nécessaire). Erreurs typées (classes d'erreur de domaine), jamais `throw "string"`.
- Commentaires : le **pourquoi** (contrainte légale, rate limit, choix d'architecture), pas la paraphrase du code.
- Commits : Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`), un commit = un changement cohérent.

---

## 1. Architecture & patterns d'isolement

### 1.1 Couches
Une couche ne dépend que de celle du dessous ; jamais l'inverse. Le Domaine ne dépend de rien.

```
┌──────────────────────────────────────────────────────────────┐
│ Présentation   src/presentation   (point d'entrée / CLI/HTTP)│
├──────────────────────────────────────────────────────────────┤
│ Application    src/application    (cas d'usage, politiques)  │
├──────────────────────────────────────────────────────────────┤
│ Domaine        src/domain         (modèles purs + PORTS)     │
├──────────────────────────────────────────────────────────────┤
│ Infrastructure src/infrastructure (ADAPTERS, DTO tiers)      │
└──────────────────────────────────────────────────────────────┘
          src/main = composition root (seul à connaître tout)
```

Précision (Ports & Adapters) : les **ports** (interfaces) sont définis par le Domaine/Application et l'**Infrastructure les implémente**.

Règles de dépendance (appliquées par `dependency-cruiser`, §6.4) :
| Source | Peut importer | Ne peut JAMAIS importer |
|---|---|---|
| `domain` | `domain` uniquement (+ types natifs) | `application`, `infrastructure`, `presentation`, `main`, `tsyringe`, `reflect-metadata`, tout package tiers |
| `application` | `domain`, `tsyringe` (décorateurs uniquement) | `infrastructure`, `presentation`, `main`, DTO tiers |
| `infrastructure` | `domain`, `application` (ports), `tsyringe` (décorateurs) | `presentation`, `main` |
| `presentation` | `application`, `domain` | `infrastructure` |
| `main` (composition root) | tout | — |

> **Choix d'architecture** : `tsyringe` est autorisé dans `application` et `infrastructure` **uniquement** pour les décorateurs `@injectable()` et `@inject()`. Le Domaine reste pur (aucun décorateur). Si l'on souhaite un Application totalement pur, enregistrer les classes via `useFactory` dans le composition root (alternative à valider par ADR).

### 1.2 Structure cible du dépôt
```
.
├── CLAUDE.md
├── README.md                    # tableau licences / versions / fraîcheur (obligatoire)
├── sbom.cdx.json                # généré (§4.4)
├── package.json  package-lock.json  .npmrc  .nvmrc
├── tsconfig.json  tsconfig.build.json
├── eslint.config.js  .prettierrc  .dependency-cruiser.cjs  vitest.config.ts
├── _bmad/                       # méthode BMAD (voir §5.2)
├── docs/
│   ├── adr/
│   ├── SFD.md                   # spécifications fonctionnelles détaillées
│   └── STD.md                   # spécifications techniques détaillées = document d'architecture
├── src/
│   ├── domain/
│   │   ├── model/               # Track, TrackQuery, UserPreferences, WeatherType, ChannelKind...
│   │   ├── ports/               # MusicProvider, NotificationChannel, UserPreferencesProvider, Clock, Logger...
│   │   └── errors/
│   ├── application/
│   │   ├── WakeUpService.ts     # Facade / cas d'usage
│   │   ├── TrackSelectionPolicy.ts
│   │   ├── FallbackMusicProvider.ts   # Composite/Chain (Strategy)
│   │   └── tokens.ts            # tokens d'injection (ou domain/ports/tokens.ts)
│   ├── infrastructure/
│   │   ├── music/{itunes,musicbrainz,local}/
│   │   ├── notifications/{email,sms,push}/   # mocks + adapters
│   │   ├── preferences/         # mock du service interne
│   │   ├── http/                # HttpClient adapter sur fetch, timeout
│   │   ├── resilience/          # TtlCache, RateLimiter, CircuitBreaker (maison, via Clock)
│   │   ├── logging/             # JsonLogger, StdoutLogWriter, LoggerNotificationSink
│   │   └── config/              # schéma + chargement de la config
│   ├── presentation/
│   └── main/
│       ├── container.ts         # SEUL fichier qui configure tsyringe (register/resolve)
│       └── index.ts             # import 'reflect-metadata' en 1re ligne
└── tests/
    ├── unit/{domain,application}/
    ├── contract/                # suites de contrat par port + une par adapter
    ├── architecture/            # non-fuite des DTO, sens des dépendances
    ├── integration/             # conteneur réel, HTTP fakes
    ├── fixtures/                # réponses JSON de référence
    └── fakes/                   # fakes/stubs réutilisables (écrits à la main)
```

### 1.3 Boundary, Seam, Ports & Adapters
- **Boundary** : toute frontière entre le métier stable et le monde extérieur instable (API, canal, service interne, horloge, HTTP, journal) est une **interface** définie côté Domaine/Application.
- **Seam** : chaque boundary est un point de couture. On y injecte un fake/stub en test **sans modifier** le code testé. Pas de seam = code non conforme.
- **Un port = un besoin métier**, pas un reflet de l'API tierce. Nommage métier : `MusicProvider.find(query)`, jamais `searchITunes`.
- **Un adapter = un fournisseur**, avec : (1) ses DTO privés (non exportés par l'`index.ts` du module), (2) son client HTTP injecté, (3) son mapping DTO → modèle de domaine, (4) sa traduction des erreurs techniques en erreurs/résultats de domaine.
- **Tokens d'injection** : les interfaces TypeScript n'existent pas à l'exécution. Chaque port a un token `Symbol` exporté à côté de lui :

```ts
// src/domain/ports/MusicProvider.ts
export interface MusicProvider {
  readonly name: string;
  find(query: TrackQuery, signal?: AbortSignal): Promise<Track | null>;
}
export const MUSIC_PROVIDER = Symbol('MusicProvider');
```

- **Ports minimaux attendus** (signatures validées en phase Architect, détail dans `docs/STD.md` §3.2) :

```ts
interface WakeUpUseCase { trigger(userId: UserId, day: DayOfWeek, weather: WeatherType, signal?: AbortSignal): Promise<WakeUpResult>; }
interface UserPreferencesProvider { get(userId: UserId, signal?: AbortSignal): Promise<UserPreferences>; }
interface MusicProvider { readonly name: string; find(q: TrackQuery, signal?: AbortSignal): Promise<Track | null>; }
interface NotificationChannel { readonly kind: ChannelKind; send(n: WakeUpNotification, signal?: AbortSignal): Promise<void>; }
interface NotificationChannelResolver { resolve(preferred: ChannelKind): readonly NotificationChannel[]; } // ordre = préféré puis replis
interface Clock { now(): Date; }
interface Logger { info(...); warn(...); error(...); }
interface HttpClient { getJson(url: string, opts: { headers?: Record<string,string>; timeoutMs: number; signal?: AbortSignal }): Promise<HttpResponse>; }
// Ports ajoutés et validés par l'Architect (STD.md §3.2) :
interface TrackResolver { resolve(q: TrackQuery, signal?: AbortSignal): Promise<ResolvedTrack>; } // ne retourne jamais null ; implémenté par FallbackMusicProvider
interface NotificationSink { record(entry: SimulatedDelivery): void; }  // les mocks de canaux n'écrivent que par lui
interface LogWriter { write(line: string): void; }                      // seul point de sortie du journal (StdoutLogWriter)
```

`WakeUpService` dépend de `TrackResolver` (et non de `MusicProvider`) afin de connaître la provenance du morceau. `FallbackMusicProvider` implémente les deux ports.

- **Modèles de domaine purs** : `Track { title; artist }`, `TrackQuery`, `UserPreferences`, `WakeUpNotification`, `WeatherType`, `ChannelKind`, `WakeUpResult`. Immuables, sans décorateur, sans type tiers.
- **Mappage des libellés d'entrée** `SOLEIL/PLUIE/NEIGE/NUAGEUX` → `WeatherType` : à la frontière d'entrée (Présentation) uniquement, avec validation (valeur inconnue → erreur typée).
- **Validation d'entrée** (userId non vide, jour valide) aux frontières ; invariants du domaine dans des fonctions/constructeurs de fabrication.

### 1.4 Patterns GoF : règles d'application
| Pattern | Où | Règle |
|---|---|---|
| **Adapter** | Un par API/mock : `ITunesMusicProvider`, `MusicBrainzMusicProvider`, `EmailChannelAdapter`, `SmsChannelAdapter`, `PushChannelAdapter` | Chaque adapter implémente un **port du Domaine** et enveloppe un client/SDK à l'interface différente. Le mapping vers le modèle de domaine se fait **dans** l'adapter. |
| **Strategy** | Fournisseurs de musique (ordre de priorité), canaux de notification (selon préférence) | Les stratégies sont interchangeables **par configuration/DI**, sans modifier le métier. Ajouter WhatsApp ou un appel vocal = **1 adapter + 1 enregistrement dans `container.ts`**, 0 modification de l'Application. |
| **Factory** | `NotificationChannelResolver` ; `useFactory` de tsyringe | La factory est **injectée** (recevant `NotificationChannel[]` par token multi-valeur). Les `useFactory` du composition root sont les seuls endroits où une construction explicite est tolérée. |
| **Facade** | `WakeUpService` | Orchestre : préférences → choix du morceau → recherche (chaîne de fournisseurs) → résolution du canal → envoi. Ne contient ni détail HTTP, ni détail de canal. |
| **Composite/Chain** (variante de Strategy) | `FallbackMusicProvider` | Implémente `MusicProvider`, délègue à une liste ordonnée de fournisseurs avec timeouts et bascule. |

Un pattern résout un problème de couplage **réel**. S'il n'en résout pas, ne l'ajoute pas.

### 1.5 Règle absolue de l'IoC (tsyringe)
1. **Aucun `new` d'implémentation concrète** dans `domain`, `application`, `infrastructure` ni `presentation`. Les dépendances se reçoivent **par le constructeur**, typées par **interface**, avec **`@inject(TOKEN)` explicite sur chaque paramètre** :

```ts
@injectable()
export class WakeUpService implements WakeUpUseCase {
  constructor(
    @inject(USER_PREFERENCES_PROVIDER) private readonly preferences: UserPreferencesProvider,
    @inject(MUSIC_PROVIDER) private readonly music: MusicProvider,
    @inject(NOTIFICATION_CHANNEL_RESOLVER) private readonly channels: NotificationChannelResolver,
    @inject(LOGGER) private readonly logger: Logger,
  ) {}
}
```

2. **Ne jamais dépendre de `emitDecoratorMetadata` pour résoudre une dépendance** (Vitest/esbuild ne l'émet pas ; il casse aussi avec des interfaces). Toujours `@inject(TOKEN)`. `experimentalDecorators` activé dans `tsconfig`.
3. `import 'reflect-metadata'` **une seule fois**, première ligne de `src/main/index.ts` (et du setup de test).
4. **Exceptions autorisées au `new`** (liste fermée) : modèles de domaine/value objects/DTO, erreurs (`throw new XxxError`), `Map`/`Set`/`Date`/`URL`/`AbortController`, objets de test dans `tests/`, et **`src/main/container.ts`** (enregistrements `useClass` / `useFactory` / `useValue`).
5. **Interdits** : service locator (`container.resolve` ou import de `container` hors de `src/main`), `static` à état, singleton de module, injection par propriété/setter (sauf besoin optionnel justifié), appel direct à `fetch` hors de l'adapter `HttpClient`, `@autoInjectable()` (il masque la résolution).
6. **Constructeurs explicites** : paramètres `private readonly`, pas plus de **5 paramètres** ; au-delà, la classe a trop de responsabilités → la découper.
7. **Durées de vie tsyringe** (déclarées dans `container.ts`, pas par `@singleton()` dans le métier) :
   | Durée | API tsyringe | À utiliser pour | Exemples ici |
   |---|---|---|---|
   | Transient (défaut) | `register(token, { useClass })` | Sans état, léger | Adapters de canaux, mappers, `WakeUpService` |
   | Singleton | `registerSingleton(token, Class)` | Sans état partagé ou état thread-safe partagé, cache, config | Cache TTL iTunes, `LocalFallbackMusicProvider`, `HttpClient`, `Logger`, `Clock`, config |
   | Container-scoped | `Lifecycle.ContainerScoped` | Une instance par (child-)conteneur | Contexte de requête si exposé via HTTP (child container par requête) |
   | Resolution-scoped | `Lifecycle.ResolutionScoped` | Une instance par graphe de résolution | Éviter sauf besoin documenté |
   - **Piège (dépendance captive)** : un Singleton ne doit jamais recevoir une dépendance de durée de vie plus courte. Test dédié (§6.4).
   - Plusieurs implémentations d'un même port : enregistrer chacune sous un token distinct, ou utiliser un token multi-valeur résolu via `resolveAll(TOKEN)` **dans le composition root uniquement** pour construire l'`NotificationChannelResolver`/la chaîne de fournisseurs (via `useFactory`).
8. Le temps passe par le port `Clock` ; les timeouts par `AbortSignal.timeout()` / paramètre injecté. Jamais `new Date()` / `Date.now()` dans la logique.
9. Un test d'architecture (§6.4) **échoue** si `application`/`domain` importe `infrastructure` ou `container`, ou si un `new <ClasseInfrastructure>` y apparaît.

---

## 2. Fournisseurs externes & résilience

### 2.1 Musique

**Chaîne de priorité (configurable)** : `iTunes → MusicBrainz → LocalFallback`. L'ordre est une donnée de configuration, pas du code.

| Fournisseur | Appel | Contraintes à respecter |
|---|---|---|
| **iTunes Search API** | `GET https://itunes.apple.com/search?term=<morceau>&media=music&limit=5` | Sans clé. **~20 req/min** : respecter via **cache** (clé = terme normalisé, TTL configurable) + limiteur de débit. Champs DTO : `trackName`, `artistName`, `trackViewUrl`. **`trackViewUrl` ne doit jamais sortir de l'adapter.** Encoder le terme (`encodeURIComponent` / `URLSearchParams`). |
| **MusicBrainz** | `GET https://musicbrainz.org/ws/2/recording?query=<morceau>&fmt=json` | **`User-Agent` identifiable obligatoire** (`NomApp/version ( contact )`), sinon rejet. Fourni par la config injectée, jamais en dur dans la logique. Champs DTO : `title`, `artist-credit`. Cache et courtoisie (≈ 1 req/s). |
| **LocalFallback** | Liste de morceaux codée en dur, en mémoire | **Ne peut pas échouer** (pas d'I/O). Garantit qu'un `Track` est toujours retourné. Dernier maillon de la chaîne, toujours enregistré. |

Règles communes aux adapters HTTP :
- Passage par le port `HttpClient` (adapter sur `fetch` natif de Node) : timeout court (ex. 3 s) via `AbortSignal`, nombre de retries borné, jamais d'attente infinie.
- Traduire toute erreur technique (réseau, timeout, JSON invalide, 429/5xx, résultat vide) en « fournisseur indisponible » (`null` ou `MusicProviderUnavailableError`). **Aucune erreur/type tiers ne remonte.**
- Valider la forme du JSON reçu à l'entrée de l'adapter (garde de type ou schéma, sans `any`) avant mapping.
- **DTO tiers non exportés** par l'`index.ts` du module. Mapping DTO → `Track` dans l'adapter. Un `Track` ne contient que `title` et `artist`.
- Aucune URL, `User-Agent`, TTL ou ordre de fournisseurs en dur dans la logique : objet de config typé injecté (`ITUNES_CONFIG`, `MUSICBRAINZ_CONFIG`).

### 2.2 Canaux de notification (mocks)

Trois mocks aux **interfaces volontairement hétérogènes**, ramenés à `NotificationChannel` par des adapters :

| Mock (Infrastructure, non exporté) | Interface simulée (exemple, volontairement différente) | Adapter |
|---|---|---|
| `FakeEmailClient` | `sendMail(to: string, subject: string, html: string, highPriority: boolean): void` | `EmailChannelAdapter` |
| `FakeSmsGateway` | `push(phoneNumber: string, text: string): Promise<boolean>` | `SmsChannelAdapter` |
| `FakePushService` | `dispatch(payload: PushPayload): Promise<{ ok: boolean; id: string }>` (payload propre au mock) | `PushChannelAdapter` |

- Les mocks **n'envoient rien** : ils écrivent via un port (`NotificationSink`/`Logger`), jamais `console.log` direct.
- L'adapter convertit `WakeUpNotification` (domaine) vers le format du mock, et les échecs du mock vers `NotificationDeliveryError`.
- Ajouter un canal = nouvel adapter + valeur de `ChannelKind` + enregistrement dans `container.ts`. **Aucune** modification de `WakeUpService`.

### 2.3 Anti-silence : circuit breaker & fallback
**Invariant : `trigger()` aboutit toujours à un réveil émis ou à un échec dégradé explicite et journalisé.** Aucun chemin de code ne se termine sans morceau ni notification, ni ne ferme une erreur avec un `catch` vide.

1. **Musique** : `FallbackMusicProvider` essaie chaque fournisseur dans l'ordre. En cas d'échec, timeout, circuit ouvert ou résultat vide, il passe au suivant. Le `LocalFallback` termine toujours la chaîne.
2. **Choix du morceau** (Application) : morceau de l'utilisateur pour la météo du jour → sinon morceau de secours utilisateur → sinon `LocalFallback`.
3. **Circuit breaker** par fournisseur HTTP : ouverture après N échecs consécutifs, demi-ouverture après un délai. Circuit ouvert = bascule immédiate, sans appel réseau. Implémentation : petite classe maison derrière un port (préférée, zéro dépendance) **ou** `cockatiel` (MIT) si validé via §4.2.
4. **Rate limit iTunes** : le cache sert d'abord ; si le quota est atteint, ne pas appeler (bascule directe), ne pas échouer.
5. **Canal** : si le canal préféré échoue, essayer les autres canaux selon une politique configurable. Si tous échouent, journaliser en `error` **et** retourner un `WakeUpResult` d'échec dégradé explicite.
6. Le `WakeUpResult` indique la **provenance** (fournisseur utilisé, mode dégradé oui/non, canal effectif). Ce sont des types de domaine, pas des DTO tiers.
7. Journalisation structurée via le port `Logger` de chaque bascule, **sans donnée personnelle superflue**.

---

## 3. (Domaine — modèle)
- `WeatherType`: union littérale `'SUNNY' | 'RAIN' | 'SNOW' | 'CLOUDY'` (ou `enum` const) ; libellés d'entrée mappés en Présentation.
- `UserPreferences`: `{ trackByWeather: ReadonlyMap<WeatherType, TrackQuery>; fallbackTrack: TrackQuery; preferredChannel: ChannelKind }`.
- `Track`: `{ readonly title: string; readonly artist: string }` — **rien d'autre**.
- Types « brandés » pour `UserId` (pas de `string` nu partout) si cela clarifie les signatures.

---

## 4. Gouvernance des dépendances, licences & SBOM

### 4.1 Matrice de validation des licences
| Famille | Licences | Décision |
|---|---|---|
| **Permissive** | MIT, Apache-2.0, BSD-2/3-Clause, ISC, 0BSD, BlueOak-1.0.0 | ✅ **Autorisée** |
| **Copyleft faible** | LGPL-2.1/3.0, MPL-2.0, EPL-2.0 | ⚠️ **Validation humaine explicite + ADR** |
| **Copyleft fort** | GPL-2.0/3.0, **AGPL-3.0**, SSPL, BSL | ⛔ **Refus catégorique** sans validation écrite explicite |
| **Propriétaire / commerciale / inconnue** | EULA, « SEE LICENSE IN… », `UNLICENSED`, absente ou non identifiable | ⛔ **Refus** (une licence introuvable = refus) |

Points de vigilance npm : une licence peut changer d'une version majeure à l'autre (vérifier la **version exacte** installée) ; une expression SPDX `(A OR B)` n'est acceptable que si **au moins une** branche est permissive ; surveiller les packages à mainteneur unique, abandonnés ou récemment transférés (risque supply chain).

### 4.2 Règles d'ajout d'un package
1. **Avant** `npm install` : vérifier licence, date de dernière version stable, mainteneurs, vulnérabilités connues, nombre de dépendances transitives, et se demander si Node natif (`fetch`, `AbortSignal`, `node:test`, `URL`) ou 20 lignes de code suffisent. **Moins de dépendances = moins de risque.**
2. Versions **épinglées exactement** : `.npmrc` avec `save-exact=true`. Pas de `^`/`~`/`*`/`latest`. Versions **stables** uniquement (pas de `-beta`/`-rc`/`-next` sans ADR).
3. `package-lock.json` toujours commité ; installation reproductible avec `npm ci`. Champ `engines` + `.nvmrc` pour la version de Node.
4. Séparer `dependencies` (runtime) et `devDependencies` (outils/tests). L'audit de licences de production (`--production`) est la référence légale du produit livré ; les devDependencies sont aussi vérifiées.
5. Chaque ajout met à jour le **tableau du README** (§4.5) et le SBOM dans le même commit.
6. Les dépendances **transitives** sont auditées avec la même matrice que les directes.
7. Un composant qui « pose question » (copyleft, version ancienne, dernière release > 12 mois, mainteneur unique) reçoit une **justification écrite** dans le README.
8. Désactiver l'exécution de scripts d'installation non nécessaires (`ignore-scripts=true` dans `.npmrc` si le projet le permet). Ne jamais exécuter de script d'une source non fiable.

**Dépendances attendues (liste de départ, à confirmer par audit)**
| Rôle | Candidat | Remarque |
|---|---|---|
| IoC | `tsyringe` + `reflect-metadata` | Imposé. Vérifier licence et fraîcheur réelles (projet à rythme de release lent : justifier si ancien) |
| Tests | `vitest`, `@vitest/coverage-v8` | |
| Lint/format | `eslint`, `typescript-eslint`, `prettier` | |
| Architecture | `dependency-cruiser` | Règles de couches |
| Typage | `typescript`, `@types/node` | |
| Audit licences | `license-checker-rseidelsohn` (ou équivalent) | |
| SBOM | `@cyclonedx/cyclonedx-npm` | |
| Résilience (option) | `cockatiel` | Seulement si le circuit breaker maison est jugé insuffisant |

### 4.3 Commandes d'audit
```bash
# Inventaire direct + transitif
npm ls --all
npm ls --all --omit=dev                 # périmètre production

# Fraîcheur : versions obsolètes
npm outdated

# Vulnérabilités connues
npm audit
npm audit --omit=dev --audit-level=high # doit être vert avant livraison

# Licences : liste, synthèse, et échec sur licence interdite
npx license-checker-rseidelsohn --production --summary
npx license-checker-rseidelsohn --production --csv --out docs/licenses.csv
npx license-checker-rseidelsohn --production \
  --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD;BlueOak-1.0.0"
```
Si un outil n'est pas disponible dans la version installée, **ne pas inventer la sortie** : le signaler, utiliser l'équivalent documenté et noter l'écart dans le README. Toute licence remontée par `--onlyAllow` hors liste = blocage et escalade humaine.

### 4.4 SBOM
```bash
npx @cyclonedx/cyclonedx-npm --omit dev --output-format JSON --output-file sbom.cdx.json
```
Le SBOM est régénéré à chaque modification de dépendance et commité.

### 4.5 Tableau obligatoire dans le README
```markdown
| Package | Type | Version installée | Dernière stable | Licence | Statut | Justification |
|---------|------|-------------------|-----------------|---------|--------|---------------|
| tsyringe | Direct (runtime) | x.y.z | x.y.z | MIT | ✅ À jour | Conteneur IoC imposé |
```
- Colonnes **Version installée** / **Dernière stable** : issues de `npm ls` / `npm outdated`, jamais de mémoire.
- Colonne **Statut** : ✅ À jour / ⚠️ En retard (justifier) / ⛔ Refusé.
- Une ligne par package direct ; section dédiée « Transitives » (résumé par licence + liste complète dans `docs/licenses.csv`).

---

## 5. Commandes de développement & workflows

### 5.1 Scripts npm attendus (`package.json`)
```bash
npm ci                          # installation reproductible
npm run build                   # tsc -p tsconfig.build.json
npm run start                   # node dist/main/index.js
npm run dev                     # exécution en développement (tsx / ts-node, à valider)
npm run lint                    # eslint . --max-warnings 0
npm run format:check            # prettier --check .
npm run typecheck               # tsc --noEmit
npm run arch                    # depcruise src --config .dependency-cruiser.cjs
npm run test                    # vitest run (unit + contract + architecture + integration)
npm run test:unit               # vitest run tests/unit
npm run test:contract           # vitest run tests/contract
npm run test:integration        # vitest run tests/integration
npm run test:watch              # vitest
npm run coverage                # vitest run --coverage
npm run audit:deps              # npm audit --omit=dev --audit-level=high
npm run audit:licenses          # license-checker --onlyAllow ...
npm run sbom                    # cyclonedx-npm ...
npm run verify                  # enchaîne toute la Definition of Done
```

**Definition of Done (DoD)**, tous verts avant tout commit (`npm run verify`) :
`typecheck` ✔ · `lint` ✔ · `format:check` ✔ · `arch` ✔ · `test` ✔ · `coverage` ≥ seuils ✔ · `audit:deps` ✔ · `audit:licenses` ✔ · README/SBOM à jour si dépendances modifiées ✔.

### 5.2 Intégration BMAD-METHOD™
Le dossier **`_bmad/`** contient la méthode (agents, workflows, config) ; les artefacts de pilotage (brief, PRD, architecture, epics, stories, statuts de sprint) sont produits aux emplacements définis par la config de `_bmad/`. **Lis `_bmad/` (config et manifestes) au démarrage de session** et respecte les chemins qu'il définit. Si les noms d'agents, de commandes ou de statuts diffèrent de ceux cités ici, **`_bmad/` fait foi** ; ne les invente pas.

**Rôles et responsabilités**
| Rôle | Responsabilité sur ce projet | Produit |
|---|---|---|
| **Analyst** | Clarifie besoins métier et contraintes (E1–E4), risques fournisseurs | Brief / besoins validés |
| **Architect** | Définit boundaries, ports, adapters, tokens et durées de vie tsyringe, stratégie de résilience ; **garant de ce fichier** | `docs/SFD.md`, `docs/STD.md`, ADR |
| **Developer** | Implémente en TDD une story à la fois, dans les frontières définies | Code + tests |
| **QA** | Valide critères d'acceptation, non-régression, non-fuite DTO, absence d'appel réseau en test, conformité licences | Rapport de revue / go–no-go |

**Cycle de vie obligatoire d'une tâche** (aucune étape ne peut être sautée)
1. **Analyse** : comprendre le besoin, relire E1–E4, identifier les impacts. Aucune écriture de code.
2. **Validation architecture/boundaries** : quels ports/tokens, quels adapters, quelle durée de vie, quel impact licences. Si un nouveau port ou package est requis → ADR + **accord humain** avant de coder.
3. **Test d'abord (TDD, rouge)** : écrire le test qui échoue, via un seam (fake injecté).
4. **Implémentation minimale (vert)**, puis **refactor** en gardant les tests verts.
5. **Contrôle de non-régression** : suite complète + tests d'architecture + audit (DoD §5.1).
6. **Revue QA**, mise à jour des artefacts et du statut.

**Statuts de tâche** (transitions strictes) :
`backlog → ready-for-dev → in-progress → review → done`
- `ready-for-dev` seulement si analyse + architecture sont validées.
- `review` seulement si la DoD est entièrement verte.
- `done` seulement après validation QA. Une régression renvoie en `in-progress`.
- Mettre à jour le fichier de statut du sprint défini par `_bmad/` **dans le même commit** que le changement.

**Workflow d'interaction** : lance les agents/workflows par les commandes exposées par ton installation BMAD (consulte `_bmad/` ou l'aide du framework pour la liste à jour), une story à la fois, en conservant un contexte propre entre deux phases. Respecte strictement les **frontières modulaires** décrites par BMAD et `docs/STD.md` : un agent Developer ne modifie pas les ports du Domaine sans repasser par l'Architect.

---

## 6. Stratégie de test & assurance qualité

### 6.1 Principes
- **Aucun appel réseau réel** dans les tests automatisés. Jamais. Les adapters HTTP sont testés via un `FakeHttpClient` injecté (port `HttpClient`). Le setup global de test **bloque `fetch`** (stub qui lève une erreur sur toute requête non prévue) pour garantir l'absence de réseau.
- Pas de dépendance à l'horloge, au système de fichiers réel, à `process.env` : `FakeClock`, sinks en mémoire, config passée en objet.
- Tests rapides, déterministes, indépendants. Timers contrôlés (`vi.useFakeTimers`) pour TTL/circuit breaker.
- Nommage : `describe('<Unit>')` / `it('<scenario> -> <expected>')`. Structure Arrange / Act / Assert.
- **Fakes écrits à la main** dans `tests/fakes/`, injectés **par constructeur**. Pour instancier le SUT en test unitaire : `new WakeUpService(fakeA, fakeB, …)` (autorisé dans `tests/`) ou un conteneur de test isolé (`container.createChildContainer()`) avec tokens remplacés par des fakes.
- `import 'reflect-metadata'` dans le fichier de setup Vitest ; `experimentalDecorators` activé dans le tsconfig de test.
- Ne jamais muter le conteneur global entre tests : utiliser un child container ou `container.clearInstances()` en `afterEach`.

### 6.2 Tests unitaires (Application / Domaine)
Couvrir au minimum pour `WakeUpService` et ses politiques :
- morceau choisi selon jour + météo (chaque `WeatherType`) ;
- météo non couverte → morceau de secours utilisateur ;
- fournisseur 1 en panne → bascule fournisseur 2 ; tous en panne → `LocalFallback` ;
- canal préféré en panne → canal de repli ; tous en panne → échec dégradé explicite et journalisé ;
- **invariant anti-silence** : pour toute combinaison de pannes (test paramétré/exhaustif), un réveil est émis ou un échec explicite est retourné, jamais un retour muet ;
- utilisateur inconnu / préférences vides / entrées invalides (cas limites) ;
- annulation (`AbortSignal`) propagée.

### 6.3 Tests de contrat par adaptateur
Chaque adapter est testé contre le **contrat de son port**, avec une suite de contrat réutilisable (fonction `musicProviderContract(factory)` / `notificationChannelContract(factory)` exécutée pour chaque implémentation) :
- **Music** : réponse nominale → `Track` correct ; résultat vide → `null` ; 429/5xx/timeout/JSON invalide → « indisponible », jamais d'erreur tierce ; **iTunes** : deuxième appel identique servi par le **cache** (0 requête) et respect du quota ; **MusicBrainz** : l'en-tête `User-Agent` est **présent et non vide** sur chaque requête.
- **Notification** : `WakeUpNotification` bien converti vers le format du mock ; échec du mock → `NotificationDeliveryError`.
- Les réponses JSON de référence sont des **fixtures** versionnées dans `tests/fixtures/` (incluant le champ `trackViewUrl` pour prouver qu'il est ignoré).

### 6.4 Tests d'architecture & de non-fuite des DTO
Dans `tests/architecture/` (+ `npm run arch` avec `dependency-cruiser`) :
- Règles de couches du §1.1 vérifiées (pas d'import interdit, **aucune dépendance circulaire**).
- `domain` et `application` n'importent ni `infrastructure`, ni `main`, ni `container`, ni `fetch`/`node:fs`/`node:http`.
- `tsyringe` n'est importé que dans `application`/`infrastructure` (décorateurs) et `main` (configuration) ; `container` n'est importé que dans `src/main`.
- **Non-fuite des DTO** : le résultat de chaque `MusicProvider` est sérialisé et **ne contient que `title` et `artist`** (`Object.keys` strictement égal) ; aucune occurrence de `trackViewUrl` / `artist-credit` hors de `infrastructure/music/**` (recherche statique dans le code source).
- Aucun fichier d'`application`/`domain` ne contient `new <Classe d'infrastructure>` (analyse statique ou règle ESLint `no-restricted-syntax`).
- Le conteneur de production se résout intégralement (`resolve(WAKE_UP_USE_CASE)` ne lève pas) et aucune dépendance captive n'existe (Singleton → durée plus courte).

### 6.5 Tests d'intégration (sans réseau)
Composer le conteneur réel (`src/main/container.ts`) en remplaçant uniquement `HttpClient` par un fake : vérifier le scénario complet `trigger()` pour chaque canal et le basculement complet iTunes → MusicBrainz → Local.

### 6.6 Objectifs de couverture (Vitest + v8, seuils bloquants dans `vitest.config.ts`)
| Périmètre | Lignes | Branches |
|---|---|---|
| `domain` + `application` | **≥ 90 %** | **≥ 85 %** |
| `infrastructure` (adapters) | **≥ 85 %** | ≥ 75 % |
| Global | **≥ 85 %** | ≥ 80 % |

La couverture est une condition nécessaire, pas suffisante : un test sans assertion ne compte pas. Ne jamais exclure de code de la couverture sans justification écrite.

---

## 7. Interdits récapitulatifs (check-list de relecture)
- [ ] Un `new` d'implémentation concrète hors `container.ts` ou hors liste fermée (§1.5)
- [ ] Un paramètre de constructeur sans `@inject(TOKEN)`, ou une résolution reposant sur `emitDecoratorMetadata`
- [ ] `container.resolve` / import de `container` hors de `src/main` (service locator)
- [ ] Un type tiers ou `trackViewUrl` visible dans `domain`/`application`
- [ ] Un package ajouté sans audit licence/fraîcheur, sans version exacte, ou sans mise à jour README/SBOM
- [ ] Une licence GPL/AGPL/propriétaire/inconnue
- [ ] Un chemin de code qui peut finir sans réveil émis (silence) ou un `catch` vide
- [ ] Un test qui appelle le vrai réseau
- [ ] `any`, `@ts-ignore`, `Date.now()`/`new Date()`, `console.*`, `process.env` hors config, singleton de module, promesse flottante
- [ ] URL, `User-Agent`, TTL ou ordre des fournisseurs codés en dur dans la logique
- [ ] Un Singleton qui capture une dépendance de durée de vie plus courte
- [ ] Une transition de statut BMAD sautée, ou du code écrit avant validation de l'architecture
- [ ] Un test modifié pour faire passer le code