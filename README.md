# LUMEN · Les chemins oubliés

Un prototype jouable de **taquin d'aventure**, en React, Three.js et Python. Faites glisser les dalles pour guider Lumen de l'entrée à la sortie à travers **15 niveaux dans trois mondes : la jungle, l'Atlantide et le volcan**. Explorez le plateau en 3D sous tous les angles dans une ambiance d'expédition archéologique. Le décor, le personnage, les effets lumineux et les particules sont dessinés dans un canvas WebGL.

## Lancer le jeu

**Sous Windows : double-cliquez sur `Lancer-le-jeu.cmd`.** Gardez sa fenêtre ouverte pendant la partie. Le navigateur s'ouvre sur [le jeu local](http://127.0.0.1:8765).

Sur Windows, macOS ou Linux, depuis le dossier du projet :

```sh
python start.py
```

Utilisez `python3 start.py` si votre système appelle Python `python3`.

Pour jouer avec le dossier `dist/` fourni, il faut seulement **Python 3.10 ou plus récent** et un navigateur récent qui prend en charge WebGL. Le lanceur reconnaît également les runtimes fournis avec Codex sur cette machine. Aucune bibliothèque Python à installer.

Pour construire le jeu après une modification des sources, ou si `dist/` est absent, il faut aussi **Node.js 22.12 ou plus récent avec npm**. Le lanceur télécharge alors les dépendances JavaScript puis construit le jeu : cette première préparation nécessite Internet. Les lancements suivants réutilisent ces fichiers. Le jeu et ses polices fonctionnent ensuite entièrement en local, sans compte. Les fichiers temporaires et le cache npm restent dans `work/`.

Options utiles :

```sh
python start.py --no-browser
python start.py --build
python start.py --port 8766
```

`--no-browser` laisse ouvrir l'adresse manuellement ; `--build` force la reconstruction ; `--port` change le port si celui par défaut est occupé. **Ctrl+C** dans la fenêtre du lanceur arrête le serveur.

## Comment jouer

Le jeu s'ouvre sur une **carte d'expédition** : choisissez l'un des trois mondes, chacun avec sa carte distincte et ses cinq passages, puis **Explorer**, **Reprendre** ou **Rejouer**. Les passages déjà terminés portent un sceau, la barre de progression compte les niveaux explorés et le **Carnet d'expédition** rassemble vos records. Les quinze niveaux restent libres d'accès.

Le bouton **Carte** du plateau permet de revenir à l'accueil et de reprendre la partie en cours. Le chronomètre et le rendu 3D se mettent en pause dans l'accueil. Après une victoire, poursuivez vers le niveau suivant ou retrouvez votre progression sur la carte : le niveau 5 mène au 6 en Atlantide, et le 10 au 11 dans le volcan.

1. En mode **déplacer**, cliquez sur une dalle voisine d'un emplacement vide pour la faire glisser. Les flèches sur les dalles indiquent les glissades possibles, uniquement à l'horizontale ou à la verticale. Si plusieurs vides sont voisins de la même dalle, choisissez ensuite celui à utiliser sur le plateau ou avec les boutons proposés.
2. **Une dalle occupée par Lumen est bloquée.** Son emplacement est une contrainte du puzzle : il faut parfois avancer avant de poursuivre le taquin.
3. Passez en mode **explorer** à tout moment. Survolez une dalle accessible pour voir le trajet pointillé, puis cliquez pour faire marcher Lumen jusqu'à cet arrêt sûr. Les ouvertures des dalles doivent se faire face. L'aperçu et les indices tiennent compte des dangers et des courants.
4. Rejoignez la sortie pour terminer le niveau. Les cinq passages de chaque monde introduisent des contraintes propres à leur environnement. La règle du passage apparaît sur la carte et sur le plateau ; **Comment ça marche ?** en rappelle les détails.

Vous pouvez alterner librement entre les deux modes : il n'est pas nécessaire de reconstituer tout le chemin avant d'avancer. **Annuler**, **Recommencer** et **Indice** permettent d'expérimenter. Annuler une marche fait revenir Lumen par son trajet exact, virages compris, et restaure les dalles effondrées lors de cette marche.

### Les dangers et leurs usages

- **Jungle — crocodiles :** Lumen ne peut pas traverser une dalle occupée par un crocodile. La dalle reste mobile : le crocodile voyage avec elle. Déplacez-la pour dégager le passage ou construire un détour.
- **Atlantide — courants :** une dalle marquée d'une flèche impose la direction de sortie de Lumen. Son entrée reste possible par les ouvertures reliées ; construisez le chemin dans le sens du courant.
- **Volcan — dalles fragiles :** Lumen traverse les pierres fissurées en une seule course jusqu'à une dalle stable ou à la sortie. Il ne peut pas s'arrêter sur une pierre fragile. Les dalles s'effondrent derrière lui et laissent de nouveaux vides où faire glisser les pierres restantes. Certains passages demandent ainsi de traverser d'abord, puis de reconstruire la suite du chemin.

La traversée des dalles fragiles est automatique une fois l'arrêt choisi : préparez un trajet continu vers un endroit sûr avant de partir. **Il n'y a pas de compte à rebours** ni de clics rapides à enchaîner. L'effondrement change les possibilités de déplacement du taquin.

| Commande | Action |
| --- | --- |
| Clic ou toucher bref sur une dalle | Glisser la dalle ou marcher, selon le mode |
| Glisser la souris ou le doigt sur la scène | Tourner librement autour du plateau |
| Molette ou pincement à deux doigts | Zoomer ou dézoomer |
| Bouton de réinitialisation de la caméra | Retrouver la perspective de départ |
| Vue du dessus | Observer les connexions à la verticale |
| Espace | Changer de mode |
| Entrée | Avancer jusqu'au prochain arrêt sûr, ou déplacer la dalle sélectionnée en mode déplacer |
| Flèches, en déplacement | Sélectionner une dalle ; Entrée pour la faire glisser |
| Flèches, en exploration | Partir dans la direction indiquée jusqu'au prochain arrêt sûr, si le passage existe |
| Z | Annuler la dernière action |
| R | Recommencer le niveau |
| H | Demander un indice |
| M | Activer ou couper l'ambiance sonore |

Le bouton **Avancer** rejoint lui aussi le prochain arrêt sûr. Quand le portail est accessible, il devient **Vers la sortie** et conduit Lumen jusqu'au bout du passage. Pour choisir une autre destination, cliquez sur la dalle accessible souhaitée en mode explorer. Un geste de rotation déplace la caméra ; un clic ou toucher bref actionne la dalle. Les flèches suivent toujours les lignes et colonnes du plateau, quelle que soit la caméra. Le bouton **Vue du dessus** facilite le jeu au clavier.

Les niveaux terminés et vos records restent enregistrés dans ce navigateur, y compris ceux des trois niveaux d'origine. Une partie en cours reste disponible tant que le serveur Python n'a pas été arrêté.

## Les quinze passages

- **Jungle · niveaux 1 à 5 :** Le premier passage ; Les jardins suspendus ; Le sentier des brumes ; Le temple de la canopée ; La pierre voyageuse.
- **Atlantide · niveaux 6 à 10 :** Les portes du lagon ; La salle des marées ; Le labyrinthe de corail ; Les archives des abysses ; Le sanctuaire du trident.
- **Volcan · niveaux 11 à 15 :** Le seuil des cendres ; Le pont des braises ; La spirale d'obsidienne ; La forge des anciens ; Le cœur de la caldeira.

## Développement

Le frontend React orchestre l'interface et la scène Three.js. Le serveur Python utilise uniquement la bibliothèque standard, expose l'API sous `/api` et sert le frontend construit dans `dist/`. Par défaut, il écoute uniquement sur `127.0.0.1`.

Pour modifier le jeu avec le rechargement automatique, lancez deux terminaux dans le dossier du projet :

```sh
python backend/server.py --host 127.0.0.1 --port 8765
```

```sh
npm install
npm run dev
```

Ouvrez l'adresse affichée par Vite. Pour reconstruire et jouer avec le serveur Python seul, arrêtez les deux serveurs puis utilisez `python start.py --build`.

Le lanceur reconstruit aussi automatiquement le frontend lorsqu'un fichier source est plus récent que la dernière construction.

## En cas de problème

- **Node ou Python introuvable :** installez les versions indiquées, puis rouvrez le terminal ou le lanceur.
- **Échec du téléchargement initial :** vérifiez la connexion et relancez. Les messages précis restent affichés dans la fenêtre.
- **Port occupé :** arrêtez l'autre serveur ou utilisez `--port 8766`. Une instance LUMEN déjà active est réutilisée.
- **Scène vide :** vérifiez que WebGL et l'accélération graphique sont disponibles dans votre navigateur.

Ce dossier contient le projet source complet et une version construite dans `dist/`. Pour le déplacer vers un autre ordinateur, gardez `dist/` pour jouer avec Python seul ; les dossiers générés `node_modules/`, `work/` et `__pycache__/` peuvent être omis. Sans `dist/`, le lanceur reconstruit le jeu avec Node.js.

## Bibliothèques et polices

Le jeu utilise React, React DOM, Scheduler et Three.js sous licence MIT, ainsi que les polices DM Sans et Manrope sous licence SIL Open Font License 1.1. Le dossier `licenses/` conserve les copies intégrales des licences et leurs mentions d'origine pour les composants distribués avec le jeu.

## Rendu et animation

Les six textures rétro du décor sont peintes par petites cases de 32 × 32 pixels dans `src/textures.js` : pierre, mousse, grès, écorce, feuilles et terre. Le rendu de la scène reste **adouci par l'anticrénelage MSAA**, sans filtre qui pixellise toute l'image. Les contours du personnage et des feuillages sont plus fins, avec une lueur douce autour des sources lumineuses. Les cartes d'accueil sont dessinées dans un canvas 2D adapté à la résolution de l'écran.

Chaque monde possède son décor 3D : végétation et ruines dans la jungle ; colonnes, coraux, eau et bulles en Atlantide ; basalte, lave et braises dans le volcan. L'éclairage et les couleurs du plateau accompagnent ces ambiances.

`src/explorer.js` contient le personnage articulé et ses textures de visage/vêtements : marche des jambes et genoux, mouvement opposé des bras, balancement du sac, respiration, clignement des yeux et flamme animée. Les pas suivent la distance réellement parcourue. `src/motion.js` gère une marche continue qui suit chaque virage, sans couper à travers les dalles, ainsi que les aperçus de trajet. La scène émet de la poussière aux pas et attend la fin du trajet avant d'autoriser l'action suivante.

## Vérification

```sh
python -m unittest discover -s backend -v
node --test tests/motion.test.js
npm run build
```

Les tests Python couvrent les règles, les solutions des quinze niveaux, l'unicité des plateaux, les trois mondes et l'API. Ils vérifient aussi les crocodiles, les courants, les effondrements, les déplacements avec plusieurs vides et leur annulation. Les tests Node de `tests/motion.test.js` vérifient les virages, le trajet inverse, les courtes marches, les aperçus sûrs et le choix d'un arrêt après une traversée fragile. La dernière commande construit le frontend dans `dist/`.
