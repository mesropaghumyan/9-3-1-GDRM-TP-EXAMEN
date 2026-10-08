---
id: SPEC-reveil-musical
companions:
  - ../../../CLAUDE.md
sources:
  - ../../../docs/TP_EXAMEN.md
---

> **Contrat canonique.** Ce SPEC et les fichiers de `companions:` forment le contrat complet de ce qu'il faut construire, tester et valider. `CLAUDE.md` (companion adopté) porte le détail technique : architecture, ports, tsyringe, résilience, audit, tests.

# Réveil musical

## Why

Mandat de TP noté et produit jeune : « Réveil musical » réveille chaque utilisateur à heure fixe avec un morceau choisi selon le jour et la météo, puis le prévient sur son canal préféré. La feuille de route n'est pas figée : le board doit pouvoir changer de fournisseur musical ou ajouter un canal (WhatsApp, appel vocal) sans tout réécrire. Un précédent produit a vu une dépendance mal vérifiée bloquer une levée de fonds, et un réveil manqué est l'échec produit par excellence.

## Capabilities

- **CAP-1**
  - **intent:** Le système déclenche un réveil à partir d'un ID utilisateur, d'un jour de la semaine et d'un type de météo (`SOLEIL`/`PLUIE`/`NEIGE`/`NUAGEUX`) fournis en entrée, via un point d'entrée unique (`WakeUpService.trigger`).
  - **success:** Un test appelle `trigger` pour chaque type de météo sans aucun appel réseau météo et obtient un résultat de réveil ; le jour fourni apparaît dans le journal sans influencer le morceau choisi.

- **CAP-2**
  - **intent:** Le système obtient, depuis l'ID, le morceau choisi par météo, un morceau de secours et le canal préféré, auprès d'un service interne mocké accédé par interface.
  - **success:** Le service de préférences est remplaçable par un fake dans un test unitaire sans modifier le code testé.

- **CAP-3**
  - **intent:** Le système sélectionne le morceau de l'utilisateur pour la météo du jour, sinon son morceau de secours, sinon un morceau du fallback local.
  - **success:** Trois tests couvrent respectivement météo couverte, météo non couverte et préférences vides, avec le morceau attendu dans chaque cas.

- **CAP-4**
  - **intent:** Le système trouve un morceau auprès de plusieurs fournisseurs interchangeables (iTunes, MusicBrainz, liste locale en dur) dans un ordre de priorité configurable, sans que le métier connaisse leurs détails ni leurs champs propres.
  - **success:** Un test de contrat par fournisseur passe ; un `Track` ne contient que `title` et `artist` ; `trackViewUrl` n'apparaît pas hors de l'adapter iTunes ; un second appel iTunes identique est servi par le cache sans requête ; chaque requête MusicBrainz porte un `User-Agent` non vide.

- **CAP-5**
  - **intent:** Le système prévient l'utilisateur par email, SMS ou push, chaque canal étant simulé par un mock à interface volontairement différente, ramené à une interface commune par un adapter.
  - **success:** Un test de contrat par canal vérifie la conversion de la notification vers le format du mock et la traduction d'un échec en erreur de domaine ; ajouter un canal ne modifie aucune classe métier.

- **CAP-6**
  - **intent:** Le système bascule en mode dégradé lors d'une panne musique ou canal, et finit toujours par un réveil émis ou un échec explicite et journalisé, indiquant fournisseur utilisé, mode dégradé et canal effectif.
  - **success:** Un test exhaustif sur toutes les combinaisons de pannes ne trouve aucun retour muet ; le fallback local garantit un morceau ; si tous les canaux échouent, le résultat d'échec dégradé est retourné et une erreur est journalisée.

- **CAP-7**
  - **intent:** Le projet n'intègre aucun package sans vérification préalable de licence et de fraîcheur, et documente l'inventaire.
  - **success:** Le `README.md` liste chaque package avec licence, version installée, dernière version stable et justification des cas douteux, à partir des commandes d'audit ; l'audit de licences ne signale aucune licence hors liste autorisée ; un SBOM est commité.

- **CAP-8**
  - **intent:** Le projet est livré avec des tests unitaires à bon niveau de couverture, sans réseau réel.
  - **success:** La suite passe et respecte les seuils de couverture de `CLAUDE.md` §6.6 ; un test échoue si un appel réseau non prévu est tenté.

## Constraints

- Aucune classe métier ne connaît un détail technique de fournisseur ou de canal ; aucun `new` d'implémentation concrète hors composition root (IoC/DI par constructeur).
- Pile imposée : Node.js LTS, TypeScript strict, tsyringe, Vitest ; tout changement exige un ADR validé.
- Seules les licences permissives sont acceptées ; copyleft faible = ADR + validation humaine ; copyleft fort, propriétaire ou inconnue = refus. Les dépendances transitives sont soumises à la même règle.
- Versions de packages épinglées ; chaque ajout met à jour README et SBOM dans le même commit.
- Le silence est interdit : un échec de fournisseur ou de canal ne doit jamais empêcher l'émission d'un réveil ni disparaître sans trace.
- iTunes : environ 20 requêtes/minute, à respecter par cache ; MusicBrainz : `User-Agent` identifiable obligatoire.
- Les mocks de notification n'envoient rien et n'écrivent pas directement sur la console.
- Aucun appel réseau réel dans les tests automatisés.
- Livrables : dépôt Git complet, `README.md` avec tableau des packages, tests unitaires.

## Non-goals

- Ordonnancement (choix de l'heure d'exécution).
- Appel météo externe : la météo est une entrée.
- Envoi réel d'email, SMS ou push.
- Canaux WhatsApp et appel vocal (évoqués pour plus tard).
- Interface utilisateur.

## Success signal

Un appel `trigger(userId, jour, météo)` émet toujours un réveil ou un échec explicite journalisé, même avec tous les fournisseurs musicaux et les canaux en panne. Remplacer un fournisseur musical ou ajouter un canal se fait par un adapter et un enregistrement dans le composition root, sans toucher au métier ni aux tests existants.

## Assumptions

- Langues : code et noms de tests en anglais ; documentation, README et commits en français (`CLAUDE.md` §0.6).
- Le jour de la semaine est une entrée tracée dans le journal ; il n'intervient pas dans la sélection du morceau (décision de l'humain).
- « Bon niveau de couverture » de l'énoncé est interprété par les seuils de `CLAUDE.md` §6.6.

- Repli des canaux et journal sans `console.*` : tranchés en phase Architecture (AD-9, AD-11 du spine), validés par l'humain.
