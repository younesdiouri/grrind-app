# Sport ensemble — pilote de collecte (#323)

Tranche indépendante du contrat [serveur #329](https://github.com/younesdiouri/grrind-back/issues/329).
Le serveur décidera du sport normalisé, du groupe, du chevauchement, de la proximité et de l’XP.
Le multiplicateur ×1/×2/×3/×4 s’applique après le plafond quotidien ; son supplément ne consomme
pas le budget des autres séances. Cette tranche ne modifie ni import, ancre, clé d’idempotence,
bilan agrégé ni historique. Aucun endpoint, DTO ou enum serveur n’est anticipé.

## Ce que le pilote permet

Sur le development build iPhone : Réglages → Santé → « Sport ensemble · pilote terrain ».
L’écran et la bannière active sont réservés au JS de développement. La configuration native
de localisation est elle aussi réservée à `APP_VARIANT=development`. Aucun build EAS.

1. **Routes d’abord.** Demander explicitement la lecture des workouts et itinéraires Santé.
   Les 50 séances les plus récentes des 30 derniers jours donnent la source, le modèle déclaré
   et le type brut HealthKit. Relire une séance collecte ses routes via `HKWorkoutRouteQuery`,
   par lots natifs, avec horodatage, coordonnées et précision horizontale. Aucun point GPS
   n’est envoyé au JS, affiché ou journalisé. Le compteur n’affirme pas qu’une route est exploitable.
2. **Relecture tardive.** Relire après la synchronisation de la montre, puis après son
   post-traitement éventuel. Aucune ancre d’import ni absence de route n’est mémorisée comme
   définitive. Un échantillon remplacé disparaît du stockage local ; relire le même conserve
   son identifiant local. L’enrichissement automatique et son envoi attendent le contrat.
3. **Téléphone avant la séance.** L’explication précède la permission « Lorsque l’app est
   active ». Démarrage exclusivement au premier plan, sur geste explicite ; aucune demande
   « Toujours ». Core Location poursuit les mises à jour avec `allowsBackgroundLocationUpdates`
   et l’indicateur système ; l’état et le bouton d’arrêt restent visibles dans tout GRRIND.
   La montre/app santé reste nécessaire pour produire le vrai workout.
4. **Arrêt et interruptions.** Arrêt explicite, limite de sécurité 4 h, révocation des droits,
   erreur de localisation non transitoire, erreur disque ou changement de compte arrêtent la
   capture. Après arrêt forcé, redémarrage ou terminaison par iOS, les données écrites sont
   marquées `interrupted` à la prochaine exécution ; le GPS ne redémarre jamais silencieusement.
   Réactiver avant de continuer ; les trous ne sont pas comblés. Un refus ou une précision
   réduite n’affectent pas l’import santé ni l’XP solo.

## Paramètres provisoires à mesurer

Core Location : activité fitness, précision demandée 10 m, filtre de distance désactivé,
pause automatique désactivée. Conservation au plus d’un point par 10 s (aucune cadence réelle
garantie par iOS), aucun point en cache antérieur à l’activation, aucun point futur ou invalide.
La précision réduite reste attachée aux points ; aucun seuil métier de proximité n’est appliqué.
Les routes conservent leurs mesures fournisseur et sont limitées à 20 000 points par route,
avec état explicite `limit` si la limite est atteinte. Ces valeurs ne sont pas des règles serveur.

Le pilote écrit un fichier JSON atomique protégé après le premier déverrouillage, exclu des
sauvegardes, par capture/route. Les écritures sont natives et continuent sans JS ni réseau.
Il conserve les données et l’ID après relance ; le compte borne toutes les lectures. Les points
téléphone restent sans workout associé : leur rapprochement avec les workouts du compte et
leurs bornes sera serveur. Aucun sport, durée de jeu ou bonus n’est déclaré par le téléphone.

Limite du pilote à mesurer : le fichier est réécrit à chaque lot conservé. Avant généralisation,
mesurer batterie/écritures et choisir la cadence définitive ; passer à un journal par lots si
les mesures l’exigent. Les résumés indiquent premier/dernier point, nombre, plus grand trou
**interne** et pire précision ; comparer les bords aux horaires réels de la séance.

Rétention figée : fin du workout + 30 jours pour les routes, début + 30 jours pour le téléphone
(plus strict). Un retry ne repousse jamais l’échéance. Chaque lecture, démarrage du module et
purge retire les fichiers expirés. iOS ne permet pas de garantir une suppression physique à
l’échéance quand l’app ne s’exécute plus ; ils ne sont plus restitués à la prochaine exécution.
Effacer les mesures du compte dès le relevé terrain terminé. L’acquittement utile, la purge
après remise et les lots réseau rejouables seront ajoutés avec le schéma serveur.

## Protocole sur appareils physiques

Ne publier **aucune coordonnée**, capture de carte, identifiant de compte ou trace brute.
Noter modèle exact de montre/téléphone, versions OS, app qui écrit Santé et version, réglages
GPS, mode économie d’énergie, durée et batterie initiale/finale. Le modèle déclaré par HealthKit
ne suffit pas à identifier une montre ; le relever auprès du participant.

| Essai | Procédure | Mesures à relever |
| --- | --- | --- |
| Montre avec GPS | Vraie séance extérieure puis lecture immédiate, après synchro et plus tard | Route présente/absente, délai, compte de points, bords, trou max, précision |
| Montre basique sans GPS | Même séance puis lecture ; vérifier ce que son app écrit réellement | Workout présent, route absente ou route issue du GPS connecté ; aucune compatibilité supposée |
| Capture téléphone | Activer avant la même séance, verrouiller au moins 20 min, rouvrir et arrêter | Points avant/pendant/après verrouillage, trous, précision, batterie |
| Intérieur et immobile | Activité réelle avec workout santé, téléphone posé à proximité | Trous et précision, maintien des mises à jour sans déplacement |
| Droits | Refuser, révoquer pendant la capture, désactiver position précise | Arrêt ou précision dégradée visible ; import solo inchangé |
| Offline | Couper le réseau pendant la séance, arrêter, tuer et relancer | Mesures/ID conservés, aucun GPS relancé, aucun nouveau crédit provoqué par le pilote |
| Interruption | Tuer l’app en pleine capture, rouvrir plus tard | État `interrupted`, fin au dernier point, reprise uniquement sur nouvelle activation |
| Limite | Laisser atteindre 4 h en conditions réelles, écran verrouillé | Arrêt effectif, dernier point ≤ limite, indicateur système éteint |
| Compte | Capturer, se déconnecter, ouvrir un autre compte | Arrêt effectif et aucune preuve de l’autre compte |

Pour la batterie, comparer une séance avec capture à une séance comparable sans capture,
avec le même enregistrement Santé. Faire au moins trois répétitions des cas route et téléphone
avant de conclure à la fiabilité. Une seule Apple Watch ne valide pas les wearables basiques.

Après implémentation de #329 : groupes réels à 2/3/4+, montres/téléphones mélangés, imports
A puis B et B puis A, ami synchronisé tardivement, enrichissement route tardif et retries.
Témoins négatifs : même lieu à un autre horaire, sport différent, simple croisement, distances
supérieures à 100 m, chaîne A–B–C sans proximité A–C, chevauchement insuffisant. Reporter vrais
positifs/négatifs et faux positifs/négatifs **selon les décisions serveur**, jamais déduits ici
des compteurs. Les seuils de cadence/couverture/tolérance aux trous ne se fixent qu’après ce relevé.

Relevé à copier dans #323 (et résultats de détection dans #329) :

| Date / essai | Appareils / OS / app Santé | Conditions / droits | Route / délai | Points / trous / précision | Batterie comparée | Décision serveur / attendu |
| --- | --- | --- | --- | --- | --- | --- |
| Non effectué | — | — | — | — | — | Contrat indisponible |

## Vérifications et suite

`npm run test:health:native` compile et exécute le vrai stockage Swift sur macOS : isolation,
reprise, identifiants stables, rejet de données invalides, limites temporelles et purge.
Le development build iPhone vérifie aussi la compilation HealthKit/Core Location et le pont Expo.
Les mocks ou le Simulator ne prouvent ni les routes présentes sur une montre, ni l’arrière-plan,
ni la batterie. Aucune mesure terrain n’a encore été obtenue par cette implémentation.

Restent après le relevé et le contrat : `api:pull`/`api:generate`, envoi séparé des preuves avec
IDs persistés et retries, enrichissement automatique, acquittement/purge, statuts serveur,
nombre/multiplicateur/XP dans le bilan agrégé, compléments tardifs identifiés et présentés une
seule fois. Le plan B de déclaration sur l’honneur reste désactivé. Pas de carte, suivi permanent,
watchOS ni chantier Android.

Sources consultées : [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[Expo Location SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/location/),
[lecture des routes HealthKit](https://developer.apple.com/documentation/healthkit/reading-route-data),
[arrière-plan Core Location](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background),
[allowsBackgroundLocationUpdates](https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates).
Core Location est utilisé directement dans le module existant pour écrire sans attendre le JS ;
aucune dépendance Expo Location/TaskManager n’est ajoutée pour ce pilote iOS.
