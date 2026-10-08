# SFD — Spécifications fonctionnelles détaillées : Réveil musical

> Statut : validé par l'humain · Date : 2026-10-08
> Sources : `docs/TP_EXAMEN.md`, `_bmad-output/specs/spec-reveil-musical/SPEC.md` (CAP-1 à CAP-8).
> Les choix marqués **[VALIDÉ]** étaient des hypothèses de l'architecte, validées par l'humain le 2026-10-08.
> Le « comment » technique est dans `docs/STD.md`.

## 1. Objet et périmètre

Le service « Réveil musical » réveille un utilisateur avec un morceau choisi selon la météo du jour, puis le prévient sur son canal préféré (Email, SMS, Push).

**Dans le périmètre**
- Le déclenchement d'un réveil pour un utilisateur : un appel `trigger(userId, jour, météo)`.
- Le choix du morceau, sa recherche auprès de plusieurs fournisseurs, avec secours local.
- L'envoi simulé de la notification, avec repli entre canaux.
- Le mode dégradé et la traçabilité par journal.
- L'inventaire des dépendances (licences, versions, SBOM) et les tests.

**Hors périmètre**
- L'ordonnancement (heure d'exécution).
- L'appel météo externe : la météo est une entrée.
- L'envoi réel d'email, SMS ou push.
- Les canaux WhatsApp et appel vocal (ajoutables plus tard sans toucher au métier).
- Toute interface utilisateur.

## 2. Acteurs et systèmes externes

| Acteur / système | Rôle |
| --- | --- |
| Ordonnanceur (hors périmètre) | Appelle `trigger` à l'heure choisie par l'utilisateur |
| Utilisateur final | Reçoit le réveil (morceau + notification) |
| Service de préférences (interne, mocké) | Fournit morceaux par météo, morceau de secours, canal préféré |
| iTunes Search API | Fournisseur musical n°1 (sans clé, ~20 req/min) |
| MusicBrainz | Fournisseur musical n°2 (sans clé, `User-Agent` obligatoire) |
| Liste locale | Fournisseur musical de dernier recours, en mémoire |
| Canaux Email / SMS / Push | Mocks qui n'envoient rien |

## 3. Glossaire

| Terme | Définition |
| --- | --- |
| Réveil | Un morceau choisi et une notification émise à l'utilisateur |
| Morceau (`Track`) | Un titre et un artiste, rien d'autre |
| Requête de morceau (`TrackQuery`) | Ce que l'utilisateur a choisi (titre, artiste optionnel) et que l'on cherche chez un fournisseur |
| Mode dégradé | Réveil émis par un chemin de repli (fournisseur, canal ou préférences) |
| Échec explicite | Résultat `FAILED` retourné et journalisé quand aucun réveil n'a pu être émis |
| Provenance | Informations jointes au résultat : fournisseur, canal, dégradé oui/non |

## 4. Données d'entrée et de sortie

### 4.1 Entrées de `trigger`

| Entrée | Valeurs | Validation |
| --- | --- | --- |
| `userId` | chaîne non vide | rejetée si vide ou blanche |
| `jour` | `LUNDI`…`DIMANCHE` | rejeté si inconnu |
| `météo` | `SOLEIL`, `PLUIE`, `NEIGE`, `NUAGEUX` | rejetée si inconnue |
| `signal` (optionnel) | signal d'annulation | — |

Correspondance interne de la météo : `SOLEIL→SUNNY`, `PLUIE→RAIN`, `NEIGE→SNOW`, `NUAGEUX→CLOUDY`. Elle est faite à la frontière d'entrée. Une valeur inconnue produit une erreur typée `InvalidInputError`, jamais un réveil.

### 4.2 Préférences d'un utilisateur (fournies par le service interne)

- un morceau souhaité par type de météo (peut être absent pour certaines météos) ;
- un morceau de secours ;
- un canal préféré (`EMAIL`, `SMS` ou `PUSH`).

### 4.3 Résultat de `trigger` (`WakeUpResult`)

| Champ | `DELIVERED` | `FAILED` |
| --- | --- | --- |
| `status` | `DELIVERED` | `FAILED` |
| `degraded` | oui/non | oui |
| `track` | morceau joué | morceau choisi si connu, sinon absent |
| `trackSource` | `WEATHER`, `USER_FALLBACK` ou `LOCAL_FALLBACK` | idem si connu |
| `providerName` | fournisseur qui a répondu | idem si connu |
| `channel` | canal effectif | absent |
| `attempts` | liste des tentatives de canal (canal, succès/échec) | idem |
| `reason` | absent | `USER_NOT_FOUND`, `ALL_CHANNELS_FAILED` ou `CANCELLED` |

## 5. Règles de gestion

| ID | Règle |
| --- | --- |
| RG-01 | `trigger` est le point d'entrée unique. Il ne lève jamais d'exception pour une panne de fournisseur, de canal ou de préférences : il retourne un `WakeUpResult`. Seules les entrées invalides lèvent `InvalidInputError`, à la frontière d'entrée. |
| RG-02 | Le morceau cherché est celui de l'utilisateur pour la météo du jour. S'il n'existe pas, c'est son morceau de secours. |
| RG-03 | Le jour de la semaine est une entrée tracée dans le journal. Il n'influence pas le choix du morceau (décision de l'humain). |
| RG-04 | La recherche interroge les fournisseurs dans l'ordre configuré (par défaut iTunes, MusicBrainz, liste locale). Un échec, un timeout, un circuit ouvert, un quota atteint ou un résultat vide fait passer au suivant. |
| RG-05 | La liste locale ne peut pas échouer. Si elle ne contient pas le titre demandé, elle retourne sa première entrée. Un morceau est donc toujours trouvé. |
| RG-06 | Un `Track` ne contient que `title` et `artist`. Aucun champ propre à un fournisseur (`trackViewUrl`, `artist-credit`) ne sort de son adapter. |
| RG-07 | Le canal préféré est essayé en premier, puis les autres canaux dans l'ordre configuré (par défaut Email, SMS, Push), **[VALIDÉ]**. Chaque canal est essayé une seule fois, avec un délai maximal. Le premier succès arrête la séquence. |
| RG-08 | Si tous les canaux échouent, le résultat est `FAILED` avec `reason=ALL_CHANNELS_FAILED` et une erreur est journalisée. |
| RG-09 | Utilisateur inconnu : résultat `FAILED` avec `reason=USER_NOT_FOUND`, journalisé en erreur. Aucune notification n'est envoyée car le canal est inconnu. |
| RG-10 | Service de préférences indisponible : on utilise des préférences par défaut de la configuration, et le réveil est marqué dégradé, **[VALIDÉ]**. |
| RG-11 | Un réveil est dégradé si une des conditions suit : fournisseur autre que le premier de la chaîne, canal autre que le préféré, préférences par défaut. Utiliser le morceau de secours de l'utilisateur parce que la météo n'est pas couverte n'est **pas** un mode dégradé : c'est un comportement normal, visible dans `trackSource`. |
| RG-12 | Chaque bascule et chaque échec sont journalisés avec leur cause, sans donnée personnelle superflue. |
| RG-13 | Annulation : si le signal d'annulation est déclenché, le résultat est `FAILED` avec `reason=CANCELLED`, journalisé en avertissement. L'annulation est propagée aux appels sortants. |
| RG-14 | Le destinataire des mocks est l'identifiant utilisateur lui-même (le modèle ne contient pas de coordonnées de contact), **[VALIDÉ]**. |
| RG-15 | Aucun appel météo externe ; aucune dépendance à l'heure de la machine dans la logique. |

## 6. Cas d'usage

### UC-1 — Déclencher un réveil (nominal)

1. L'appelant fournit `userId`, `jour`, `météo`.
2. Le système valide les entrées (RG-01) et journalise le début (userId, jour, météo).
3. Il récupère les préférences de l'utilisateur.
4. Il choisit la requête de morceau (RG-02).
5. Il cherche le morceau chez les fournisseurs dans l'ordre (RG-04).
6. Il construit la notification avec le titre et l'artiste.
7. Il envoie sur le canal préféré (RG-07).
8. Il retourne `DELIVERED`, `degraded=false`, avec la provenance.

### UC-2 — Variantes

| Cas | Comportement attendu |
| --- | --- |
| Météo non couverte | Morceau de secours utilisateur, `trackSource=USER_FALLBACK`, non dégradé |
| iTunes en panne ou quota atteint | Bascule vers MusicBrainz, dégradé |
| iTunes et MusicBrainz en panne | Liste locale, dégradé, `trackSource` indique le secours local |
| Canal préféré en panne | Canal suivant de l'ordre de repli, dégradé |
| Tous canaux en panne | `FAILED`/`ALL_CHANNELS_FAILED`, erreur journalisée |
| Utilisateur inconnu | `FAILED`/`USER_NOT_FOUND`, erreur journalisée |
| Préférences indisponibles | Préférences par défaut, dégradé |
| Annulation | `FAILED`/`CANCELLED` |
| Entrée invalide | `InvalidInputError`, aucun appel aux fournisseurs |

## 7. Table de décision : morceau choisi

| Morceau pour la météo | Morceau de secours | Fournisseurs | Résultat |
| --- | --- | --- | --- |
| présent | — | trouve | Morceau météo, `WEATHER`, fournisseur répondant |
| présent | — | aucun ne trouve | Liste locale, `LOCAL_FALLBACK`, dégradé |
| absent | présent | trouve | Morceau de secours, `USER_FALLBACK` |
| absent | présent | aucun ne trouve | Liste locale, `LOCAL_FALLBACK`, dégradé |
| absent | absent | — | Liste locale (première entrée), `LOCAL_FALLBACK`, dégradé |

## 8. Fournisseurs musicaux : comportement attendu

| Fournisseur | Requête | Contraintes fonctionnelles | Champs utilisés |
| --- | --- | --- | --- |
| iTunes | `GET https://itunes.apple.com/search?term=<morceau>&media=music&limit=5` | Terme encodé ; cache par terme normalisé ; ~20 req/min | `trackName`, `artistName` (le champ `trackViewUrl` est ignoré) |
| MusicBrainz | `GET https://musicbrainz.org/ws/2/recording?query=<morceau>&fmt=json` | `User-Agent` identifiable obligatoire ; cache ; ~1 req/s | `title`, `artist-credit` |
| Liste locale | en mémoire | ne peut pas échouer | — |

Un résultat vide, une erreur réseau, un timeout, un statut 429 ou 5xx, un JSON invalide : tous sont traités comme « fournisseur indisponible » (RG-04).

## 9. Canaux de notification : comportement attendu

| Canal | Mock simulé | Contenu envoyé |
| --- | --- | --- |
| Email | envoi d'un message avec sujet et corps HTML, priorité haute | sujet « Réveil musical », corps avec titre et artiste |
| SMS | envoi d'un texte court à un numéro | texte avec titre et artiste |
| Push | envoi d'une charge utile propre au mock | titre de notification et corps avec titre et artiste |

Les mocks n'envoient rien : ils écrivent dans le journal via une sortie dédiée. Un échec d'un mock est traduit en échec de livraison du canal (RG-07). Le texte visible par l'utilisateur est en français **[VALIDÉ]**.

## 10. Journalisation (exigences fonctionnelles)

| Événement | Niveau | Informations |
| --- | --- | --- |
| Début de réveil | info | userId, jour, météo |
| Morceau choisi | info | source (`WEATHER`/`USER_FALLBACK`) |
| Bascule de fournisseur | warn | fournisseur écarté, cause |
| Fournisseur utilisé | info | nom du fournisseur |
| Notification simulée | info | canal, destinataire, titre |
| Bascule de canal | warn | canal en échec, cause |
| Échec explicite | error | `reason` |

## 11. Exigences non fonctionnelles

| Domaine | Exigence |
| --- | --- |
| Fiabilité | Aucun silence : un réveil émis ou un échec explicite journalisé, pour toute combinaison de pannes |
| Délais | Chaque appel externe a un délai maximal ; aucune attente infinie |
| Quota | iTunes respecté par cache et limiteur de débit |
| Évolutivité | Nouveau fournisseur ou canal = 1 adapter + 1 enregistrement dans le composition root |
| Conformité | Licences permissives uniquement ; inventaire et SBOM à jour |
| Testabilité | Aucun réseau réel en test ; couverture selon `CLAUDE.md` §6.6 |

## 12. Critères d'acceptation

| Capability | Critère |
| --- | --- |
| CAP-1 | `trigger` appelé pour chacune des 4 météos retourne un résultat sans appel météo ; le jour figure dans le journal et ne change pas le morceau |
| CAP-2 | Le service de préférences est remplaçable par un fake sans modifier le code testé |
| CAP-3 | Les 5 lignes de la table du §7 sont couvertes par des tests |
| CAP-4 | Test de contrat par fournisseur ; clés de `Track` strictement `title`+`artist` ; `trackViewUrl` absent hors de l'adapter iTunes ; 2ᵉ appel iTunes identique servi par le cache ; `User-Agent` non vide sur chaque requête MusicBrainz |
| CAP-5 | Test de contrat par canal : conversion vers le format du mock, échec traduit en erreur de livraison ; ajouter un canal ne modifie aucune classe métier |
| CAP-6 | Test exhaustif sur toutes les combinaisons de pannes : jamais de retour muet ; échec total journalisé en erreur |
| CAP-7 | README avec tableau complet, audit de licences sans refus, SBOM commité |
| CAP-8 | Suite verte, seuils de couverture atteints, `fetch` bloqué en test |

## 13. Décisions validées par l'humain

1. Ordre de repli des canaux : préféré puis `EMAIL, SMS, PUSH` (RG-07).
2. Préférences indisponibles : préférences par défaut (RG-10) ou échec explicite.
3. Destinataire des mocks = identifiant utilisateur (RG-14).
4. Texte des notifications en français (§9).
5. Définition du mode dégradé (RG-11).
