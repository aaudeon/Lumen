# LUMEN · Les chemins oubliés

Un prototype jouable de **taquin d'aventure**, en React, Three.js et Python. Faites glisser les dalles pour guider Lumen de l'entrée à la sortie à travers **24 niveaux dans trois mondes : la jungle, l'Atlantide et le volcan**. Explorez le plateau en 3D sous tous les angles dans une ambiance d'expédition archéologique. Le décor, le personnage, les effets lumineux et les particules sont dessinés dans un canvas WebGL.

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

Le jeu s'ouvre sur une **carte d'expédition** : choisissez l'un des trois mondes, chacun avec sa carte distincte, ses cinq passages d'origine et ses épreuves plus récentes, puis **Explorer**, **Reprendre** ou **Rejouer**. Les passages déjà terminés portent un sceau, la barre de progression compte les niveaux explorés et le **Carnet d'expédition** rassemble vos records. Les vingt-quatre niveaux s'ouvrent **l'un après l'autre** : un cadenas marque les passages encore fermés, et terminer un niveau déverrouille le suivant. Le carnet propose aussi de **recommencer l'aventure à zéro**, ce qui efface tout ce que ce navigateur garde.

Le bouton **Carte** du plateau permet de revenir à l'accueil et de reprendre la partie en cours. Le chronomètre et le rendu 3D se mettent en pause dans l'accueil. Après une victoire, poursuivez vers le niveau suivant ou retrouvez votre progression sur la carte : le niveau 10 mène au 11 en Atlantide, et le 17 au 18 dans le volcan.

1. En mode **déplacer**, cliquez sur une dalle voisine d'un emplacement vide pour la faire glisser. Les flèches sur les dalles indiquent les glissades possibles, uniquement à l'horizontale ou à la verticale. Si plusieurs vides sont voisins de la même dalle, choisissez ensuite celui à utiliser sur le plateau ou avec les boutons proposés.
2. **Une dalle occupée par Lumen est bloquée.** Son emplacement est une contrainte du puzzle : il faut parfois avancer avant de poursuivre le taquin.
3. Passez en mode **explorer** à tout moment. Survolez une dalle accessible pour voir le trajet pointillé, puis cliquez pour faire marcher Lumen jusqu'à cet arrêt sûr. Les ouvertures des dalles doivent se faire face. L'aperçu et les indices tiennent compte des dangers et des courants.
4. Rejoignez la sortie pour terminer le niveau. Les cinq passages de chaque monde introduisent des contraintes propres à leur environnement. La règle du passage apparaît sur la carte et sur le plateau ; **Comment ça marche ?** en rappelle les détails.

Vous pouvez alterner librement entre les deux modes : il n'est pas nécessaire de reconstituer tout le chemin avant d'avancer. **Annuler**, **Recommencer** et **Indice** permettent d'expérimenter. Annuler une marche fait revenir Lumen par son trajet exact, virages compris, et restaure les dalles effondrées lors de cette marche.

### Les dangers et leurs usages

- **Jungle — crocodiles :** Lumen ne peut pas traverser une dalle occupée par un crocodile. La dalle reste mobile : le crocodile voyage avec elle. Déplacez-la pour dégager le passage ou construire un détour.
- **Atlantide — courants :** une dalle marquée d'une flèche impose la direction de sortie de Lumen. Son entrée reste possible par les ouvertures reliées ; construisez le chemin dans le sens du courant.
- **Volcan — dalles fragiles :** Lumen traverse les pierres fissurées en une seule course jusqu'à une dalle stable ou à la sortie. Il ne peut pas s'arrêter sur une pierre fragile. Les dalles s'effondrent derrière lui et laissent de nouveaux vides où faire glisser les pierres restantes. Certains passages demandent ainsi de traverser d'abord, puis de reconstruire la suite du chemin.
- **Jungle — crocodiles en maraude :** dans les épreuves de la jungle, le gardien change de pierre à **chaque dalle déplacée**, le long d'une ronde fixe. Un anneau marque la case qu'il rejoindra ; il attend si elle est vide ou occupée. Sa pierre est verrouillée tant qu'il pèse dessus. Comptez vos déplacements pour passer dans son dos.
- **Jungle — sceaux et portes :** une porte de pierre barre le passage tant que son sceau reste éteint. Un **levier** s'allume dès que Lumen s'y arrête et le reste ; un **sceau à poids** n'est actif que tant que la **pierre de lest** l'occupe. Le puzzle consiste alors à livrer cette pierre au bon endroit.
- **Atlantide — marées :** le levier de marée **inverse tous les courants** et découvre les **dalles immergées**. Il compte comme un déplacement, s'annule, et permet de franchir un palier puis l'autre.
- **Volcan — réactions en chaîne :** une dalle qui s'effondre **lézarde ses voisines fissurées** : elles deviennent fragiles à leur tour. En mode explorer, l'aperçu d'un trajet colore les pierres qui tomberont et celles qui se fendront, pour choisir quels passages sacrifier.
- **Partout — trésors facultatifs :** seize passages cachent une relique dans un cul-de-sac. Elle coûte un détour, ne raccourcit jamais la route, et **le niveau se termine sans elle**. Les reliques rapportées s'affichent dans le carnet d'expédition.

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

Les niveaux terminés, vos records, vos points et votre garde-robe restent enregistrés dans ce navigateur, y compris ceux des trois niveaux d'origine. Une partie en cours reste disponible tant que le serveur Python n'a pas été arrêté.

## Le score et le portefeuille

À la sortie d'un niveau, la course est notée sur cinq parts, puis multipliée par la difficulté du passage :

| Part | Points | Ce qui la remplit |
| --- | --- | --- |
| Passage ouvert | 400 | acquis dès que Lumen franchit le portail |
| Déplacements de dalles | 300 | atteint quand vous égalez le `par` du niveau |
| Pas parcourus | 250 | atteint quand vous égalez le trajet de référence |
| Temps | 250 | atteint sous `30 s + 9 × par + 3 × pas de référence` |
| Trésor rapporté | 200 | bonus, jamais une part du reste |

**Faire mieux que la référence ne rapporte pas plus que l'atteindre** : il n'y a rien à optimiser au-delà de la solution d'auteur. À l'inverse, aucune part ne devient négative — une course lente et prudente garde ses 400 points de passage. Le multiplicateur va de 1 (Initiation, Découverte) à 2,5 (Légende), pour qu'un passage difficile vaille ce qu'il demande.

Le **portefeuille** additionne votre **meilleure course sur chaque niveau**. Rejouer ne peut donc que l'augmenter, et refaire le premier niveau en boucle ne rapporte rien. Il s'affiche en haut de l'écran de jeu, dans l'en-tête de la carte et dans le carnet d'expédition, où chaque passage montre son propre record. Compter large : une campagne jouée sans chercher l'efficacité tourne autour de 32 000 points, une campagne parfaite avec tous les trésors autour de 48 000.

Le barème vit dans [src/score.js](src/score.js), à l'écart de l'interface, et `tests/score.test.js` le vérifie.

## La boutique de l'expédition

Depuis le pied de la carte, ouvrez **Le cabinet des merveilles**. Ses **80 entrées**, dont 8 options de départ gratuites, comprennent les objets d'origine, 18 familiers et six nouvelles collections : **Clairière enchantée**, **Voyage astral**, **Le pacte du dragon**, **Atelier des merveilles**, **Les mers impossibles** et **Rêves en pixels**.

Les **huit emplacements** sont le couvre-chef, la cape ou les ailes, la lumière tenue, la teinture du manteau, le familier, les traces de pas, l'aura et la parure du portail de sortie. Les pièces ont des formes propres : licorne et dragonnet ailés, lunettes d'aéronaute, astrolabe, automate, poulpe, fantôme pixel, ailes, engrenages… Seule la teinture conserve volontairement la forme du vêtement.

- Choisissez une collection, cherchez un nom ou filtrez par emplacement, rareté, possession ou budget. **Six articles par page** gardent la grille courte ; les vignettes photographient les vrais modèles du jeu.
- La cabine s'ouvre sur votre tenue équipée. Touchez une pièce pour l'essayer, ou **Essayer toute la collection** pour porter un ensemble. Vous pouvez mélanger plusieurs collections. Les essais sont gratuits et ne sont pas sauvegardés.
- Faites glisser l'aventurier pour le tourner, faites-le marcher pour voir les animations ou utilisez **Détail** pour observer une pièce. Sur téléphone, la cabine reste visible pendant le défilement du catalogue.
- **Acheter et équiper** ne concerne que la pièce sélectionnée. **Équiper** remet un objet déjà possédé ; **Ma tenue** restaure l'apparence réellement équipée dans l'aperçu. Fermer la boutique abandonne les essais.

Le **portefeuille reste un record qui ne baisse jamais**. Les dépenses sont conservées séparément ; le solde disponible vaut portefeuille moins dépenses. Les achats et les tenues antérieurs restent compatibles.

L'économie privilégie le choix : le catalogue complet coûte **114 100 crédits**, contre un **plafond théorique de 48 440 points** pour les 24 passages et leurs trésors. Un nouvel ensemble coûte **7 300 crédits** ; ses pièces vont de 300 à 1 700 crédits. Les douze animaux supplémentaires coûtent de 1 100 à 6 200 crédits. Les prix des pièces d'origine restent inchangés. Les raretés sont fixes et tous les prix sont visibles, sans tirage au sort. Rejouer sans améliorer son meilleur score ne crée pas de nouveaux crédits.

Tout est **cosmétique**. Les familiers n'agissent pas sur les dalles, les traces s'effacent derrière les pas et la parure reste attachée à la sortie. Les lumières éclairent réellement de leur couleur. Aucun objet ne change les règles, la difficulté, les indices ou les records.

### Le bestiaire

Les familiers ont leur propre rayon, à côté de **Tenues & effets** : un onglet **Familiers**, puis une rangée de familles — chats, chiens, tortues, dragons, et les merveilles venues des collections. Chaque compagnon est modelé et animé dans son propre module, `src/pets/<id>.js`.

Leurs volumes cubiques, yeux en pixels et carapaces à étages suivent le style de l'aventurier. Les pattes ont des raccords aux articulations. L'aperçu rapproche le compagnon seul : son socle et le cadrage restent fixes pendant ses animations et la rotation. **Ensemble** permet de le revoir auprès de Lumen.

Ils ne flottent pas sur place : le gréement leur applique un retard de suivi — ils traînent derrière quand vous partez, reviennent quand vous vous arrêtez — et chaque espèce a sa démarche. Un corgi piétine, un lynx traque, une tortue rentre la tête quand vous pressez le pas, un wyrm ondule. `tests/pets.check.mjs` mesure ces mouvements et **refuse deux créatures dont la signature se ressemble**.

Le fonctionnement, l'économie et l'ajout de collections ou de familiers sont décrits dans [docs/boutique.md](docs/boutique.md).

## Les vingt-quatre passages

Chaque monde garde ses cinq passages d'origine, puis ses **épreuves** : des puzzles courts qui introduisent une règle, puis la combinent.

- **Jungle · niveaux 1 à 10 :** Le premier passage ; Les jardins suspendus ; Le sentier des brumes ; Le temple de la canopée ; La pierre voyageuse — puis La ronde du gardien ; La sentinelle ; Le sceau du temple ; Le contrepoids ; La vigie.
- **Atlantide · niveaux 11 à 17 :** Les portes du lagon ; La salle des marées ; Le labyrinthe de corail ; Les archives des abysses ; Le sanctuaire du trident — puis L'heure du reflux ; L'estran.
- **Volcan · niveaux 18 à 24 :** Le seuil des cendres ; Le pont des braises ; La spirale d'obsidienne ; La forge des anciens ; Le cœur de la caldeira — puis Les premières fissures ; Le passage sacrifié.

Chaque monde s'ouvre sur une courte scène d'arrivée, et chaque sortie de niveau est célébrée.

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
node --test tests/motion.test.js tests/score.test.js tests/cosmetics.test.js
node tests/props.check.mjs
node tests/pets.check.mjs
node tests/layout.check.mjs
npm run build
```

Les tests Python couvrent les règles, les solutions des vingt-quatre niveaux, l'unicité des plateaux, les trois mondes et l'API. Ils vérifient aussi les crocodiles fixes et en maraude, les courants, la marée, les leviers et sceaux à poids, les effondrements en chaîne, le caractère facultatif des reliques, les déplacements avec plusieurs vides et leur annulation. Les tests Node de `tests/score.test.js` vérifient le barème, ses bornes et la somme du portefeuille ; ceux de `tests/cosmetics.test.js` couvrent le catalogue et les achats ; ceux de `tests/motion.test.js` vérifient les virages, le trajet inverse, les courtes marches, les aperçus sûrs et le choix d'un arrêt après une traversée fragile. La dernière commande construit le frontend dans `dist/`.
