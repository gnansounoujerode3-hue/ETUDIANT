# Cahier des charges — Mise en production complète de Voxa

**Produit :** Voxa — application de révision orale assistée par IA  
**Version du document :** 1.0  
**Date :** 3 novembre 2026  
**Statut cible :** application sécurisée, testée, déployée et exploitable en production  

---

## 1. Objet du cahier des charges

Ce document définit l’ensemble des travaux restant à réaliser pour rendre Voxa pleinement opérationnelle en production. Il couvre le code, l’infrastructure, la base de données, l’intelligence artificielle, la voix, les paiements, la sécurité, les tests, l’exploitation et les obligations juridiques.

L’application est considérée comme « 100 % opérationnelle » lorsque :

- elle est accessible depuis un domaine HTTPS public ;
- un utilisateur peut créer et sécuriser son compte ;
- il peut importer un cours, obtenir des questions, réviser à l’oral ou à l’écrit et consulter sa progression ;
- les abonnements payants fonctionnent réellement ;
- les erreurs, abus et pannes sont correctement gérés ;
- les données sont protégées, sauvegardées et supprimables ;
- les parcours critiques sont couverts par des tests automatiques ;
- le déploiement et la supervision sont reproductibles ;
- les obligations légales applicables sont satisfaites.

---

## 2. Présentation fonctionnelle du produit

Voxa permet à un étudiant de :

1. créer un compte ou se connecter ;
2. importer un fichier PDF, DOCX, PPTX ou TXT, ou coller du texte ;
3. faire analyser et structurer son cours par une IA ;
4. générer des chapitres, questions et flashcards ;
5. lancer une session de révision orale ou écrite ;
6. obtenir une transcription, une note et un retour pédagogique ;
7. retravailler ses lacunes grâce à la répétition espacée ;
8. passer un examen blanc ;
9. suivre ses scores et sa progression ;
10. souscrire une offre Premium.

### Stack actuelle

- Next.js avec App Router ;
- React et TypeScript ;
- PostgreSQL avec Drizzle ORM ;
- Anthropic Claude pour la structuration et l’évaluation ;
- Web Speech API et synthèse vocale du navigateur ;
- OpenAI Whisper comme solution de transcription de secours ;
- Stripe pour les abonnements ;
- interface française et anglaise.

---

## 3. État initial constaté

### Éléments déjà présents

- interface principale et pages métier ;
- inscription et connexion par email/mot de passe ;
- modèle de données PostgreSQL ;
- import et extraction de plusieurs formats ;
- génération de contenu pédagogique ;
- sessions orales et écrites ;
- notation et suivi SM-2 ;
- limites freemium côté serveur ;
- intégration Stripe partielle ;
- internationalisation français/anglais ;
- build Next.js réussi ;
- vérification TypeScript réussie.

### Blocages actuels

- le code est stocké uniquement dans une archive ZIP à la racine du dépôt ;
- aucune base PostgreSQL de production n’est configurée ;
- Google OAuth est seulement un emplacement non implémenté ;
- Stripe active Premium gratuitement si les clés sont absentes ;
- ESLint échoue avec trois erreurs ;
- les dépendances présentent 28 vulnérabilités connues, dont deux critiques ;
- aucun test automatique ni pipeline CI n’est fourni ;
- la sécurité, la supervision et les obligations juridiques restent incomplètes.

---

# 4. Lot 1 — Restructuration du dépôt et qualité du projet

## 4.1 Extraction du projet

### Travaux

- extraire `ai-oral-revision-app.zip` à la racine du dépôt Git ;
- conserver l’archive seulement hors du dépôt ou la supprimer après validation ;
- vérifier l’arborescence et les chemins d’import ;
- ajouter le fichier de verrouillage `package-lock.json` ;
- ajouter un `.gitignore` complet.

### Contenu minimal du `.gitignore`

```gitignore
node_modules/
.next/
out/
.env
.env.*
!.env.example
*.tsbuildinfo
coverage/
playwright-report/
test-results/
.DS_Store
```

### Critères d’acceptation

- `npm ci` fonctionne depuis un clone propre ;
- `npm run build` fonctionne depuis la racine ;
- aucun secret, `node_modules` ou fichier de build n’est versionné ;
- Vercel détecte automatiquement l’application Next.js.

## 4.2 Normalisation des scripts

Ajouter ou valider les scripts suivants :

- `dev` ;
- `build` ;
- `start` ;
- `lint` ;
- `typecheck` ;
- `test` ;
- `test:coverage` ;
- `test:e2e` ;
- `db:generate` ;
- `db:migrate` ;
- `db:studio`.

## 4.3 Correction de la qualité statique

### Travaux

- corriger les trois accès aux références React pendant le rendu dans `session-room.tsx` ;
- supprimer les directives ESLint devenues inutiles ;
- corriger le chargement des polices ;
- supprimer les avertissements restants ;
- activer des règles strictes cohérentes pour React, TypeScript et Next.js.

### Critères d’acceptation

Les commandes suivantes doivent se terminer sans erreur :

```bash
npm run typecheck
npm run lint
npm run build
```

**Priorité : P0 — bloquant.**

---

# 5. Lot 2 — Base de données et persistance

## 5.1 Mise à disposition de PostgreSQL

### Travaux

- créer une base PostgreSQL de production ;
- créer une base séparée de préproduction ;
- utiliser un fournisseur compatible serverless : Supabase, Neon ou équivalent ;
- imposer TLS pour les connexions distantes ;
- configurer le pool de connexions ;
- définir `DATABASE_URL` séparément pour chaque environnement.

## 5.2 Configuration Drizzle

### Travaux

- remplacer l’URL locale écrite en dur dans `drizzle.config.json` par une configuration TypeScript lisant `DATABASE_URL` ;
- générer des migrations versionnées ;
- créer une commande de migration non interactive ;
- documenter la procédure de migration et de retour arrière ;
- ajouter une vérification de compatibilité au déploiement.

## 5.3 Intégrité et transactions

### Travaux

- mettre la création du cours, des chapitres, questions et flashcards dans une transaction ;
- mettre l’enregistrement de réponse, la progression SM-2 et les agrégats dans une transaction ;
- rendre atomiques les vérifications de quotas et la création des ressources ;
- empêcher les doublons de réponses si le parcours ne les autorise pas ;
- ajouter les contraintes `CHECK` utiles : score 0–100, difficulté 1–5, plan et statuts autorisés ;
- ajouter les index nécessaires selon les requêtes réelles ;
- prévoir une stratégie de nettoyage des sessions et tickets expirés.

## 5.4 Sauvegarde et reprise

### Travaux

- activer les sauvegardes automatiques quotidiennes ;
- définir une rétention minimale de 30 jours ;
- tester une restauration complète ;
- documenter le plan de reprise après sinistre ;
- surveiller l’espace, les connexions, les requêtes lentes et les erreurs.

### Critères d’acceptation

- les migrations s’appliquent sur une base vide ;
- les migrations s’appliquent sans perte sur une base existante ;
- un test prouve qu’une transaction échouée ne laisse pas de données partielles ;
- une restauration de sauvegarde est réalisée et documentée ;
- l’application supporte les connexions simultanées prévues sans épuiser le pool.

**Priorité : P0 — bloquant.**

---

# 6. Lot 3 — Authentification et gestion des comptes

## 6.1 Authentification email/mot de passe

### Travaux

- conserver un hachage robuste avec sel ;
- définir une politique de mot de passe ;
- ajouter une protection contre les tentatives répétées ;
- invalider correctement les sessions expirées ;
- permettre la déconnexion de tous les appareils ;
- éviter l’énumération des comptes dans les réponses d’erreur.

## 6.2 Vérification d’adresse email

### Travaux

- choisir un fournisseur d’email transactionnel ;
- envoyer un lien signé à durée limitée ;
- empêcher ou limiter les fonctions sensibles tant que l’email n’est pas vérifié ;
- permettre le renvoi du message avec limite de fréquence.

## 6.3 Mot de passe oublié

### Travaux

- page de demande de réinitialisation ;
- jeton à usage unique et durée limitée ;
- email de réinitialisation ;
- page de choix du nouveau mot de passe ;
- révocation des anciennes sessions après changement.

## 6.4 Google OAuth

### Travaux

- implémenter Google OAuth avec Auth.js, Supabase Auth ou une solution équivalente ;
- configurer les URI de redirection locales, de préproduction et de production ;
- utiliser et vérifier `state` et `nonce` ;
- créer ou rattacher le compte à l’adresse vérifiée ;
- gérer le conflit avec un compte email existant ;
- créer la session applicative après callback ;
- gérer annulation, refus et erreurs du fournisseur.

## 6.5 Espace compte

Ajouter :

- modification du nom ;
- changement de langue ;
- changement d’email avec revérification ;
- changement de mot de passe ;
- liste et révocation des sessions ;
- export des données ;
- suppression définitive du compte avec confirmation ;
- affichage du plan et du statut de facturation.

### Critères d’acceptation

- inscription, vérification, connexion et déconnexion fonctionnent ;
- le parcours « mot de passe oublié » fonctionne intégralement ;
- Google fonctionne réellement et ne retourne plus `501` ;
- les tentatives répétées sont limitées ;
- la suppression du compte supprime ou anonymise toutes les données conformément à la politique publiée.

**Priorité : P0 pour la sécurité email ; P1 pour Google et l’espace compte.**

---

# 7. Lot 4 — Import et gestion des cours

## 7.1 Formats pris en charge

Maintenir : PDF, DOCX, PPTX, TXT et texte collé.

### Travaux

- valider extension, type MIME et taille ;
- fixer une taille maximale explicite ;
- détecter les fichiers corrompus ou chiffrés ;
- mettre à jour `pdfjs-dist` vers une version corrigée ;
- désactiver toute exécution de script contenue dans les PDF ;
- gérer les documents sans texte ;
- ajouter un OCR optionnel pour les PDF scannés ;
- traiter les extractions lourdes sans figer l’interface ;
- afficher une progression et des erreurs compréhensibles.

## 7.2 Gestion du cycle de vie d’un cours

Ajouter :

- renommage ;
- suppression ;
- archivage ;
- réimport ;
- relance de génération après échec ;
- état `processing`, `ready`, `error` ;
- message d’erreur et bouton de reprise ;
- confirmation avant suppression ;
- purge automatique des traitements abandonnés.

## 7.3 Traitement asynchrone

Pour les cours longs :

- déplacer l’analyse IA dans une file de tâches ;
- retourner immédiatement un identifiant de traitement ;
- afficher la progression par polling ou événements serveur ;
- rendre les tâches rejouables et idempotentes ;
- limiter la durée et le nombre de tentatives.

### Critères d’acceptation

- chaque format annoncé est testé avec des fichiers normaux, volumineux et corrompus ;
- un PDF malveillant ne peut pas exécuter de code ;
- l’utilisateur peut supprimer et renommer ses cours ;
- une génération interrompue peut être relancée ;
- aucun traitement ne reste indéfiniment dans un état intermédiaire.

**Priorité : P0 pour la sécurité ; P1 pour le cycle de vie complet.**

---

# 8. Lot 5 — Intelligence artificielle

## 8.1 Configuration

Variables nécessaires :

```env
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

Le modèle doit être disponible pour le compte et la région de déploiement.

## 8.2 Structuration des cours

### Travaux

- utiliser des sorties structurées validées par schéma ;
- vérifier chaque chapitre, question, réponse et flashcard ;
- rejeter ou réparer les réponses JSON invalides ;
- borner les nombres de chapitres et questions ;
- découper proprement les documents trop longs ;
- empêcher le contenu du document de remplacer les instructions système ;
- conserver une référence au passage source si possible ;
- permettre une régénération contrôlée.

## 8.3 Évaluation des réponses

### Travaux

- vérifier que session, cours et question appartiennent au même utilisateur ;
- vérifier que la session n’est pas terminée ;
- contrôler la longueur de la transcription ;
- calibrer les notes sur un jeu d’exemples réels ;
- garantir que le feedback ne révèle pas la réponse en mode examen ;
- ajouter un niveau de confiance ;
- offrir une contestation ou réévaluation si nécessaire.

## 8.4 Résilience et maîtrise des coûts

### Travaux

- délais d’attente ;
- reprises avec temporisation sur erreurs temporaires ;
- coupe-circuit en cas de panne fournisseur ;
- quotas par utilisateur et par plan ;
- plafonds quotidiens et mensuels ;
- suivi des tokens et du coût ;
- mise en cache lorsque pertinent ;
- alertes budgétaires ;
- journalisation sans exposer les documents privés ;
- choix explicite du comportement en cas d’absence de clé IA.

### Décision produit obligatoire

Choisir l’une des politiques suivantes pour le fallback heuristique :

1. **Démo uniquement :** interdit en production ;
2. **Mode dégradé :** autorisé, mais clairement signalé à l’utilisateur ;
3. **Suppression :** service indisponible si l’IA principale est indisponible.

### Critères d’acceptation

- aucun document ne peut injecter de nouvelles instructions système ;
- les sorties invalides ne cassent pas la création du cours ;
- les erreurs fournisseur sont gérées proprement ;
- les coûts par utilisateur et par fonctionnalité sont mesurables ;
- un utilisateur ne peut pas utiliser une question qui ne lui appartient pas ;
- le mode examen ne divulgue aucune correction avant sa fin.

**Priorité : P0 pour les contrôles d’accès et de coûts ; P1 pour la résilience avancée.**

---

# 9. Lot 6 — Voix, transcription et accessibilité audio

## 9.1 Web Speech API

### Travaux

- demander explicitement la permission microphone ;
- gérer permission refusée, absence de microphone et navigateur incompatible ;
- gérer silence, bruit, interruption et changement d’onglet ;
- empêcher l’écoute simultanée avec la synthèse vocale ;
- fournir un indicateur clair d’enregistrement ;
- permettre l’arrêt et la reprise ;
- conserver en permanence le mode écrit de secours.

## 9.2 Whisper

Variable nécessaire :

```env
OPENAI_API_KEY=
```

### Travaux

- limiter la taille et la durée audio ;
- autoriser uniquement les types MIME attendus ;
- limiter la fréquence par utilisateur ;
- fixer un délai d’expiration ;
- ne pas conserver l’audio sauf consentement explicite ;
- documenter le transfert à OpenAI ;
- supprimer les fichiers temporaires ;
- gérer les erreurs et indisponibilités.

## 9.3 Matrice de compatibilité

Tester au minimum :

- Chrome bureau récent ;
- Edge bureau récent ;
- Safari macOS ;
- Safari iOS ;
- Chrome Android ;
- Firefox avec bascule automatique vers le mode compatible ;
- microphone Bluetooth ;
- mobile avec écran verrouillé ou interruption d’appel, dans les limites du navigateur.

### Critères d’acceptation

- aucun navigateur ne bloque totalement la révision : le mode écrit reste disponible ;
- les erreurs microphone sont compréhensibles ;
- les enregistrements dépassant les limites sont rejetés avant envoi ;
- la politique de conservation audio correspond à la politique de confidentialité.

**Priorité : P0 pour les limites audio ; P1 pour la compatibilité complète.**

---

# 10. Lot 7 — Sessions, examen, flashcards et progression

## 10.1 Sécurisation des sessions

### Travaux

- vérifier l’appartenance de la session, du cours et de chaque question ;
- interdire les réponses après clôture ;
- vérifier que la question a été proposée dans la session ;
- empêcher les soumissions répétées accidentelles ;
- assurer l’idempotence des requêtes ;
- recalculer les moyennes de manière transactionnelle.

## 10.2 Mode examen

### Travaux

- définir le nombre de questions et la durée ;
- ne pas afficher de feedback avant la fin ;
- gérer la reprise après rechargement selon une règle explicite ;
- empêcher le client de déclarer arbitrairement la fin ou le score ;
- calculer la note côté serveur ;
- produire un résultat final sur 20 ;
- documenter qu’il s’agit d’un entraînement et non d’une certification officielle.

## 10.3 Répétition espacée

### Travaux

- écrire des tests unitaires complets du SM-2 ;
- définir le traitement des questions jamais vues, échues ou échouées ;
- éviter les conflits en cas de réponses simultanées ;
- permettre la réinitialisation de progression ;
- afficher la prochaine révision et l’historique utile.

## 10.4 Flashcards et lacunes

### Travaux

- enregistrer la progression des flashcards si souhaité ;
- filtrer les lacunes par cours et chapitre ;
- éviter les accès aux données d’un autre utilisateur ;
- fournir des états vides et messages d’erreur ;
- permettre de relancer une session ciblée sur une lacune.

### Critères d’acceptation

- aucune combinaison d’identifiants ne donne accès aux données d’un tiers ;
- le résultat d’examen est calculé côté serveur ;
- une double soumission ne crée pas deux réponses ;
- le SM-2 produit les intervalles attendus sur les cas de test définis.

**Priorité : P0.**

---

# 11. Lot 8 — Abonnements et paiements Stripe

## 11.1 Configuration Stripe

Variables nécessaires :

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_APP_URL=https://domaine.tld
```

### Travaux

- créer le produit et le prix récurrent ;
- configurer les environnements test et production séparément ;
- configurer le webhook HTTPS ;
- vérifier les signatures ;
- associer un client Stripe stable à chaque utilisateur ;
- utiliser le statut réel de la souscription comme source de vérité.

## 11.2 Suppression du Premium gratuit en production

Le comportement actuel activant Premium si les clés sont absentes doit être remplacé :

- autorisé uniquement dans un environnement local explicitement marqué ;
- impossible en préproduction publique et en production ;
- erreur de configuration visible dans les logs, sans avantage accordé.

## 11.3 Événements à traiter

- `checkout.session.completed` ;
- `customer.subscription.created` ;
- `customer.subscription.updated` ;
- `customer.subscription.deleted` ;
- `invoice.paid` ;
- `invoice.payment_failed`.

Chaque traitement doit être idempotent.

## 11.4 Portail client

Ajouter :

- accès au portail Stripe ;
- changement de moyen de paiement ;
- consultation des factures ;
- résiliation ;
- indication de la date de fin ;
- réactivation si autorisée ;
- retour vers l’application.

## 11.5 Règles du plan

Définir précisément :

- nombre de cours gratuits ;
- nombre de sessions par semaine ;
- accès à l’examen ;
- quotas IA et Whisper ;
- politique après résiliation ;
- politique de remboursement ;
- taxes, devise et factures.

### Critères d’acceptation

- aucun utilisateur ne devient Premium sans paiement confirmé, hors environnement local ;
- un paiement réussi active Premium ;
- un paiement échoué produit le statut attendu ;
- une résiliation est synchronisée ;
- rejouer un webhook ne duplique pas les effets ;
- le portail client fonctionne ;
- les tests Stripe sont réalisés en mode test avant passage en production.

**Priorité : P0.**

---

# 12. Lot 9 — Cybersécurité

## 12.1 Mise à jour des dépendances

### Travaux

- mettre à jour Next.js, `pdfjs-dist`, PostCSS et les dépendances transitives ;
- régénérer le verrouillage ;
- examiner les changements majeurs ;
- activer Dependabot ou Renovate ;
- exécuter régulièrement l’audit de vulnérabilités.

### Seuil de livraison

- aucune vulnérabilité critique ;
- aucune vulnérabilité élevée exploitable ;
- toute exception restante doit être documentée, évaluée et approuvée.

## 12.2 Rate limiting et anti-abus

Appliquer des limites à :

- inscription ;
- connexion ;
- réinitialisation de mot de passe ;
- import ;
- génération IA ;
- évaluation ;
- transcription ;
- démarrage de session ;
- statistiques publiques ;
- paiement.

Combiner, selon les cas : IP, compte, appareil, route et période.

## 12.3 CSRF, origine et cookies

### Travaux

- vérifier `Origin`/`Host` sur les opérations mutables ;
- ajouter un mécanisme CSRF si requis ;
- revoir l’usage de `SameSite=None` ;
- limiter l’intégration iframe aux domaines autorisés ;
- définir correctement `Secure`, `HttpOnly`, durée et chemin ;
- appliquer une rotation de session après connexion.

## 12.4 En-têtes de sécurité

Configurer :

- Content-Security-Policy ;
- Strict-Transport-Security ;
- X-Content-Type-Options ;
- Referrer-Policy ;
- Permissions-Policy pour microphone et caméra ;
- politique `frame-ancestors` ;
- protections cross-origin adaptées.

## 12.5 Validation et contrôle d’accès

### Travaux

- valider tous les corps, paramètres et UUID avec un schéma ;
- borner toutes les chaînes, tableaux et fichiers ;
- vérifier la propriété de chaque ressource côté serveur ;
- ne jamais faire confiance au plan, score, mode ou identifiant envoyé par le client ;
- uniformiser les réponses 400, 401, 403, 404, 409 et 429 ;
- éviter les traces et secrets dans les réponses.

## 12.6 Gestion des secrets

- secrets uniquement dans le gestionnaire de la plateforme ;
- aucune clé dans Git ou côté navigateur ;
- clés distinctes par environnement ;
- rotation documentée ;
- droits minimaux ;
- détection automatique de secrets dans la CI.

## 12.7 Audit final

- analyse SAST ;
- audit des dépendances ;
- test OWASP des API ;
- test d’autorisation horizontale ;
- test d’import malveillant ;
- test de paiement ;
- test externe ou revue par un spécialiste avant lancement commercial.

### Critères d’acceptation

- aucun accès horizontal aux données d’un tiers ;
- aucune activation Premium abusive ;
- les routes coûteuses retournent `429` en cas d’abus ;
- les secrets ne sont présents ni dans Git, ni dans les bundles client, ni dans les logs ;
- l’audit final ne contient aucun blocage critique ou élevé non accepté.

**Priorité : P0.**

---

# 13. Lot 10 — Tests et assurance qualité

## 13.1 Tests unitaires

Couvrir au minimum :

- SM-2 ;
- limites freemium ;
- validations ;
- hachage et vérification de mot de passe ;
- parsing des réponses IA ;
- fallback IA ;
- extraction des formats ;
- calcul des scores et moyennes ;
- règles d’abonnement.

## 13.2 Tests d’intégration

Couvrir :

- inscription, connexion, session et déconnexion ;
- vérification email et mot de passe oublié ;
- création et suppression de cours ;
- génération de contenu ;
- démarrage et fin d’une session ;
- évaluation ;
- contrôles d’accès ;
- quotas ;
- webhooks Stripe ;
- transactions et erreurs.

## 13.3 Tests E2E

Parcours obligatoires :

1. création d’un compte ;
2. import d’un cours ;
3. attente de génération ;
4. session écrite ;
5. session orale si navigateur compatible ;
6. consultation des lacunes ;
7. flashcards ;
8. achat Premium en mode Stripe test ;
9. examen blanc ;
10. gestion et suppression du compte.

## 13.4 Tests non fonctionnels

- performance ;
- charge ;
- compatibilité mobile ;
- navigateurs ;
- accessibilité WCAG ;
- sécurité ;
- résilience aux pannes IA, email, base et Stripe.

## 13.5 Objectifs de qualité

- couverture globale recommandée : au moins 80 % sur les modules métier ;
- 100 % des règles de paiement, quotas et autorisation couvertes ;
- zéro test critique instable ;
- zéro erreur console sur les parcours principaux ;
- temps de réponse défini et mesuré pour chaque type de route.

**Priorité : P0 pour les parcours critiques ; P1 pour la couverture étendue.**

---

# 14. Lot 11 — CI/CD et environnements

## 14.1 Environnements

Prévoir :

- local ;
- test automatisé ;
- préproduction ;
- production.

Chaque environnement doit avoir sa base, ses clés, ses webhooks et son URL.

## 14.2 GitHub Actions

À chaque pull request :

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm audit
```

Ajouter :

- détection de secrets ;
- rapport de couverture ;
- tests E2E sur prévisualisation si possible ;
- blocage de fusion si un contrôle obligatoire échoue.

## 14.3 Déploiement

### Travaux

- connecter le dépôt à Vercel ou à l’hébergeur choisi ;
- configurer le domaine et HTTPS ;
- configurer les variables par environnement ;
- appliquer les migrations de manière contrôlée ;
- prévoir un rollback ;
- effectuer des smoke tests après déploiement ;
- ne promouvoir en production qu’un build déjà validé en préproduction.

### Critères d’acceptation

- un commit validé est déployable sans opération manuelle risquée ;
- une PR cassée ne peut pas être fusionnée ;
- le rollback est documenté et testé ;
- aucun secret de production n’est disponible dans les prévisualisations publiques.

**Priorité : P0.**

---

# 15. Lot 12 — Performance, fiabilité et observabilité

## 15.1 Performance

### Travaux

- mesurer les Core Web Vitals ;
- optimiser les bundles et imports lourds ;
- charger les bibliothèques d’extraction uniquement lorsque nécessaire ;
- optimiser les requêtes SQL ;
- paginer les longues listes ;
- limiter les données renvoyées par les API ;
- utiliser cache et CDN uniquement sur les contenus compatibles avec la confidentialité.

## 15.2 Gestion des erreurs

- pages d’erreur adaptées ;
- messages localisés et actionnables ;
- identifiant de corrélation par incident ;
- gestion des erreurs React ;
- aucun détail interne ou secret transmis au client ;
- politique claire de reprise.

## 15.3 Supervision

Ajouter :

- suivi d’erreurs, par exemple Sentry ;
- logs structurés ;
- métriques API et base ;
- suivi des appels et coûts IA ;
- suivi des transcriptions ;
- suivi des webhooks ;
- surveillance de disponibilité ;
- alertes sur erreurs, latence, coûts et échecs de paiement.

## 15.4 Objectifs de service à fixer

Valeurs recommandées à valider :

- disponibilité mensuelle : 99,9 % ;
- pages ordinaires : p95 inférieur à 2 secondes hors réseau utilisateur ;
- API ordinaires : p95 inférieur à 500 ms hors fournisseurs externes ;
- génération IA : retour de progression immédiat, puis résultat selon taille ;
- taux d’erreurs serveur inférieur à 1 % ;
- RPO sauvegarde : 24 heures maximum ;
- RTO restauration : 4 heures maximum.

**Priorité : P1, avec journalisation minimale en P0.**

---

# 16. Lot 13 — UX, responsive et accessibilité

## 16.1 Responsive

Tester et corriger :

- téléphone 320 px et plus ;
- tablette ;
- ordinateur portable ;
- grands écrans ;
- orientations portrait et paysage.

## 16.2 Accessibilité

Objectif : WCAG 2.2 niveau AA sur les parcours principaux.

### Travaux

- navigation complète au clavier ;
- focus visible ;
- labels et descriptions accessibles ;
- annonces d’état pour l’enregistrement et la génération ;
- contraste ;
- tailles tactiles ;
- respect de la réduction des animations ;
- validation de formulaires lisible par lecteur d’écran ;
- solution alternative au microphone ;
- langue de page et changements de langue correctement déclarés.

## 16.3 États d’interface

Chaque écran doit posséder :

- état de chargement ;
- état vide ;
- état d’erreur ;
- état hors ligne si pertinent ;
- confirmation de succès ;
- prévention des doubles clics ;
- reprise après interruption lorsque possible.

### Critères d’acceptation

- les parcours critiques sont utilisables au clavier ;
- aucune erreur critique dans un audit automatisé d’accessibilité ;
- les tests sur mobile réel sont validés ;
- le mode écrit permet d’utiliser le service sans microphone.

**Priorité : P1.**

---

# 17. Lot 14 — Juridique, confidentialité et conformité

## 17.1 Documents à publier

- mentions légales ;
- conditions générales d’utilisation ;
- conditions de vente si abonnement payant ;
- politique de confidentialité ;
- politique de cookies ;
- politique de remboursement et résiliation ;
- contact support et responsable de traitement.

## 17.2 Données personnelles

Documenter :

- finalités ;
- bases légales ;
- catégories de données ;
- destinataires et sous-traitants ;
- transferts internationaux ;
- durées de conservation ;
- mesures de sécurité ;
- droits d’accès, rectification, export et suppression ;
- traitement des voix, transcriptions et documents de cours.

## 17.3 Consentement audio et IA

Avant utilisation :

- informer que la voix peut être transcrite par le navigateur ou OpenAI ;
- indiquer si l’audio est conservé ;
- obtenir le consentement requis ;
- fournir le mode écrit comme alternative ;
- expliquer que l’évaluation IA peut comporter des erreurs.

## 17.4 Cookies

- inventorier les cookies ;
- distinguer cookies nécessaires et optionnels ;
- ne pas déposer d’analytics non essentiels avant consentement ;
- permettre le retrait du consentement.

## 17.5 Mineurs et enseignement

- définir l’âge minimum ;
- prévoir l’autorisation parentale si nécessaire ;
- préciser que Voxa n’est pas un organisme certificateur ;
- interdire les usages illicites et contenus sensibles selon les règles retenues.

### Critères d’acceptation

- les documents sont accessibles depuis toutes les pages ;
- l’export et la suppression des données fonctionnent ;
- la politique publiée correspond au comportement technique réel ;
- les contrats nécessaires avec les sous-traitants sont en place ;
- une validation juridique locale est obtenue avant commercialisation.

**Priorité : P0 avant ouverture publique payante.**

---

# 18. Lot 15 — Administration et support

## 18.1 Administration minimale

Prévoir un espace protégé permettant :

- recherche d’utilisateurs ;
- consultation du plan et du statut de compte ;
- consultation des traitements en erreur ;
- relance contrôlée d’une tâche ;
- gestion des signalements ;
- consultation des métriques sans afficher inutilement les documents privés ;
- suspension d’un compte abusif ;
- traçabilité de chaque action administrative.

## 18.2 Support

- adresse de support ;
- formulaire de contact ;
- FAQ ;
- procédure de signalement d’un paiement ;
- procédure de suppression de données ;
- délais de réponse annoncés ;
- modèles de réponse aux incidents fréquents.

## 18.3 Procédures d’exploitation

Documenter :

- panne de base ;
- panne IA ;
- panne Stripe ;
- fuite ou rotation de clé ;
- webhook bloqué ;
- coût IA anormal ;
- restauration de sauvegarde ;
- incident de sécurité ;
- communication aux utilisateurs.

**Priorité : P1, avec procédure d’incident minimale en P0.**

---

# 19. Variables d’environnement finales

Exemple sans valeurs secrètes :

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.exemple.com

# Base
DATABASE_URL=

# IA
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=

# Sécurité et observabilité
RATE_LIMIT_STORE_URL=
RATE_LIMIT_STORE_TOKEN=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

Les noms exacts pourront être adaptés aux fournisseurs choisis. Toutes les variables obligatoires doivent être validées au démarrage avec un schéma typé.

---

# 20. Plan de réalisation priorisé

## Phase 1 — Socle déployable et sécurité critique

1. extraire le projet à la racine ;
2. ajouter verrouillage et `.gitignore` ;
3. corriger lint et mettre à jour les dépendances ;
4. créer PostgreSQL de préproduction ;
5. créer les migrations ;
6. corriger les contrôles d’accès session/cours/question ;
7. ajouter transactions et validations ;
8. désactiver Premium gratuit hors local ;
9. ajouter rate limiting, limites audio et en-têtes de sécurité ;
10. mettre en place CI et déploiement de préproduction.

**Sortie de phase :** application déployable en préproduction sans vulnérabilité bloquante.

## Phase 2 — Fonctions commerciales et compte complet

1. vérification email ;
2. mot de passe oublié ;
3. Google OAuth ;
4. Stripe complet ;
5. portail client ;
6. gestion du compte ;
7. suppression et export ;
8. gestion complète des cours.

**Sortie de phase :** produit fonctionnel de bout en bout avec abonnement test.

## Phase 3 — Robustesse IA et voix

1. schémas de sortie IA ;
2. protection contre l’injection ;
3. quotas et suivi des coûts ;
4. file de tâches ;
5. validation sécurisée des documents ;
6. Whisper limité et supervisé ;
7. tests navigateurs et mobiles.

**Sortie de phase :** service résilient, prévisible et maîtrisé financièrement.

## Phase 4 — Qualité de production

1. tests unitaires, intégration et E2E ;
2. performance et charge ;
3. observabilité et alertes ;
4. accessibilité ;
5. sauvegarde et restauration ;
6. documentation d’exploitation ;
7. audit de sécurité final.

**Sortie de phase :** candidat de mise en production.

## Phase 5 — Lancement public

1. validation juridique ;
2. domaine et emails de production ;
3. clés Stripe et IA de production ;
4. test final sur production contrôlée ;
5. ouverture progressive ;
6. surveillance renforcée pendant le lancement.

---

# 21. Estimation indicative

L’estimation dépend du niveau de finition, des fournisseurs et du nombre de personnes.

| Lot | Estimation indicative |
|---|---:|
| Dépôt, lint, dépendances, CI | 3 à 6 jours |
| Base, migrations, transactions | 4 à 8 jours |
| Auth complète et Google | 5 à 10 jours |
| Gestion complète des cours | 4 à 8 jours |
| Sécurisation IA et quotas | 5 à 10 jours |
| Voix et compatibilité | 4 à 8 jours |
| Sessions et progression | 3 à 6 jours |
| Stripe complet | 4 à 8 jours |
| Sécurité générale | 5 à 10 jours |
| Tests automatiques | 8 à 15 jours |
| Observabilité et exploitation | 3 à 6 jours |
| Accessibilité et responsive | 4 à 8 jours |
| Juridique et conformité | à valider avec un juriste |

**Ordre de grandeur technique : 8 à 14 semaines pour une personne expérimentée à temps plein**, hors délais externes et validation juridique. Une petite équipe peut paralléliser les lots, mais ne doit pas supprimer les étapes de sécurité et de recette.

Cette estimation n’est pas un devis contractuel.

---

# 22. Définition de « terminé »

Une fonctionnalité n’est terminée que si :

- les exigences et cas limites sont implémentés ;
- les contrôles d’accès sont vérifiés côté serveur ;
- les entrées sont validées ;
- les erreurs sont gérées et traduites ;
- les tests unitaires et/ou d’intégration sont présents ;
- les parcours E2E concernés réussissent ;
- TypeScript, lint et build réussissent ;
- aucune vulnérabilité critique ou élevée non acceptée n’est introduite ;
- l’accessibilité et le responsive sont contrôlés ;
- la documentation est mise à jour ;
- la fonctionnalité est validée en préproduction ;
- les métriques et logs nécessaires existent.

---

# 23. Recette finale obligatoire

## Compte

- [ ] inscription email ;
- [ ] vérification email ;
- [ ] connexion/déconnexion ;
- [ ] Google OAuth ;
- [ ] mot de passe oublié ;
- [ ] changement des informations ;
- [ ] export et suppression.

## Cours

- [ ] import PDF ;
- [ ] import DOCX ;
- [ ] import PPTX ;
- [ ] import TXT ;
- [ ] texte collé ;
- [ ] fichier corrompu ;
- [ ] gros fichier ;
- [ ] renommage/suppression ;
- [ ] reprise après échec.

## IA et révision

- [ ] structuration valide ;
- [ ] questions et flashcards ;
- [ ] session écrite ;
- [ ] session orale ;
- [ ] fallback compatible ;
- [ ] évaluation ;
- [ ] lacunes ;
- [ ] répétition espacée ;
- [ ] examen sans fuite de correction.

## Paiement

- [ ] checkout Stripe test ;
- [ ] activation Premium ;
- [ ] paiement échoué ;
- [ ] renouvellement ;
- [ ] résiliation ;
- [ ] portail client ;
- [ ] webhooks rejoués sans doublon ;
- [ ] impossible d’obtenir Premium gratuitement en production.

## Sécurité

- [ ] accès horizontal impossible ;
- [ ] rate limiting ;
- [ ] CSRF/origine ;
- [ ] cookies et en-têtes ;
- [ ] validation fichiers/audio ;
- [ ] secrets absents du dépôt et du client ;
- [ ] audit dépendances ;
- [ ] audit OWASP.

## Exploitation

- [ ] CI verte ;
- [ ] préproduction validée ;
- [ ] migrations validées ;
- [ ] sauvegarde restaurée ;
- [ ] erreurs et métriques visibles ;
- [ ] alertes testées ;
- [ ] rollback testé ;
- [ ] procédures d’incident disponibles.

## Juridique et accessibilité

- [ ] confidentialité ;
- [ ] CGU/CGV ;
- [ ] cookies ;
- [ ] consentement audio ;
- [ ] droits RGPD ;
- [ ] validation juridique ;
- [ ] audit WCAG 2.2 AA des parcours critiques.

---

# 24. Critère d’autorisation de mise en production

La mise en production publique est autorisée uniquement lorsque :

1. toutes les tâches P0 sont terminées ;
2. la CI est entièrement verte ;
3. les tests critiques réussissent ;
4. aucune vulnérabilité critique ou élevée exploitable ne reste ouverte ;
5. les paiements ont été testés en environnement Stripe test ;
6. les sauvegardes et le rollback ont été testés ;
7. la supervision et les alertes fonctionnent ;
8. les documents juridiques sont publiés et validés ;
9. le responsable produit signe la recette ;
10. un plan de support et de réponse aux incidents est actif.

---

## Conclusion

Voxa possède déjà un socle produit important, mais sa mise en production exige en priorité la restructuration du dépôt, la configuration PostgreSQL, la correction des vulnérabilités, le renforcement des contrôles d’accès, la sécurisation de Stripe, les migrations, le rate limiting et les tests. Le produit ne doit pas être commercialisé avant la validation de tous les éléments P0 et de la recette finale.
