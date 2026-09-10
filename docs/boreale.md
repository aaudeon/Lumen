# Boréale — monde IV

Cinq passages prolongent la campagne après **Le passage sacrifié**, dernier niveau du volcan. Ils portent les numéros **25 à 29**. Le déverrouillage existant reste séquentiel : terminer le niveau 24 ouvre le lac miroir, puis chaque victoire ouvre la suite. Les identifiants des 24 niveaux précédents et le format de sauvegarde sont conservés.

## La règle de la glace

Une dalle bleue conserve la direction avec laquelle Lumen y entre. Il ne peut **ni tourner ni s’arrêter** dessus, même si plusieurs couloirs y convergent. Un virage nécessite une dalle stable. Si la ligne ne débouche pas sur un arrêt sûr, la traversée est refusée avant le départ.

Les dalles gelées peuvent glisser vers un vide comme les autres pierres. Elles ne s’effondrent pas. Les ponts fissurés, eux, gardent leur règle d’effondrement ; leur motif de fissures les distingue des pistes bleues. La présence de Lumen continue à immobiliser sa dalle.

La recherche de chemins mémorise le sens d’arrivée sur chaque dalle gelée. Cela permet d’explorer correctement un même croisement depuis deux directions sans autoriser de virage. Le serveur fournit ces trajets au survol, aux flèches du clavier et au système d’indices. L’annulation restaure les ponts, les leviers et les pierres de lest.

## Progression

| Niveau | Passage | Défi principal | Déplacements de référence |
| --- | --- | --- | ---: |
| 25 | Le lac miroir | Distinguer la ligne de glisse et les appuis où tourner | 8 |
| 26 | Les aiguilles du nord | Préparer un zigzag, avec plusieurs approches des croisements gelés | 12 |
| 27 | Le refuge des veilleurs | Quitter le chemin du portail, atteindre deux leviers, puis revenir | 16 |
| 28 | Le pont des séracs | Sacrifier un pont, replacer une piste gelée, déplacer le lest et activer un levier | 18 |
| 29 | La couronne boréale | Combiner glace, pont fragile, deux leviers et sceau à poids | 22 |

Ces références sont des parcours démontrés, pas des minima. Le premier passage introduit la règle ; la difficulté suivante vient des combinaisons et de l’ordre des actions. Le refuge contient une relique facultative, **la Boussole polaire**, dans une impasse.

## Ambiance

Palette de nuit indigo, neige ivoire, glace turquoise et lumière chaude de l’aventurier. Les aurores se déplacent derrière une chaîne de sommets enneigés ; des flocons tombent autour des ruines. Les matériaux sont dessinés à 256 pixels avec filtrage, sans filtre de pixellisation sur l’écran.

Les cinq architectures ont des proportions distinctes : terrasses du lac, défilé d’aiguilles, refuge à toit enneigé, piliers au-dessus d’une crevasse et couronne à arche de glace. Des corniches de neige et des stalactites occupent les bords ; le centre des cases reste lisible. Lumen adopte une posture d’équilibre sur la glace et n’y joue pas les pas de course.

## Fichiers et vérifications

- `backend/boreal.py` : plateaux, mélanges fixes et solutions démontrées.
- `backend/engine.py` : élan, arrêts sûrs, messages et intégration de la campagne.
- `src/boreal-environment.js` : montagnes, aurores et neige.
- `src/boreal-board.js`, `boards.js`, `board-textures.js` : architectures et matériaux.
- `src/hazards.js`, `scene.js`, `explorer.js` : pistes de glace et posture de glissade.
- `campaign.js`, `HomeScreen.jsx`, `home.css` : quatrième monde, carte et déverrouillage.

Les 47 tests Python passent : solutions des 29 passages, indices jusqu’à la sortie, deux arrivées distinctes sur un croisement de glace, refus atomique d’un virage ou d’un arrêt interdit, annulation et conditions du dernier sanctuaire. Compilation et vérification visuelle du monde dans le navigateur.

L’atelier visuel `work/boreal-preview.html` utilise des données de progression uniquement en mémoire. Il ne touche ni au portefeuille ni aux sauvegardes. Pour le compiler temporairement : `node node_modules/vite/bin/vite.js build --config work/boreal.vite.js --configLoader native`, puis ouvrir `/work/boreal-preview.html`. Une compilation normale du jeu retire cet aperçu de `dist/`.

La campagne compte désormais **29 passages et 17 reliques**. Le plafond théorique du barème passe de 48 440 à **62 980 points**, sans changement des taux ni des prix de la boutique.
