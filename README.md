# LUMEN · Les chemins oubliés

Un prototype jouable de **taquin d'aventure**, en React, Three.js et Python. Faites glisser les dalles, puis les cubes, pour guider Lumen de l'entrée à la sortie à travers **44 niveaux dans six mondes : la jungle, l'Atlantide, le volcan, Boréale, l'espace et les Archives des Échos**. Les 39 premiers passages sont conservés ; les cinq Archives forment un pack à débloquer avec les points du jeu. Le décor, le personnage, les effets lumineux et les particules sont dessinés dans un canvas WebGL.

## Lancer le jeu

**Sous Windows : double-cliquez sur `Lancer-le-jeu.cmd`.** Gardez sa fenêtre ouverte pendant la partie. Le navigateur s'ouvre sur le jeu local : port 8765 par défaut, ou un port voisin jusqu'à 8784 si nécessaire. L'adresse choisie est affichée dans la console.

Sur Windows, macOS ou Linux, depuis le dossier du projet :

```sh
python start.py
```

Utilisez `python3 start.py` si votre système appelle Python `python3`.

Pour jouer avec le dossier `dist/` fourni, il faut seulement **Python 3.10 ou plus récent** et un navigateur récent qui prend en charge WebGL. Le lanceur reconnaît également les runtimes fournis avec Codex sur cette machine. Aucune bibliothèque Python à installer.

Pour construire le jeu après une modification des sources, ou si `dist/` est absent, il faut aussi **Node.js 22.12 ou plus récent avec npm**. Le lanceur télécharge alors les dépendances JavaScript puis construit le jeu : cette première préparation nécessite Internet. Les lancements suivants réutilisent ces fichiers. Le jeu et ses polices fonctionnent ensuite entièrement en local, avec un compte enregistré sur ce serveur. Les fichiers temporaires et le cache npm restent dans `work/`.

Options utiles :

```sh
python start.py --no-browser
python start.py --build
python start.py --port 8766
```

`--no-browser` laisse ouvrir l'adresse manuellement ; `--build` force la reconstruction ; `--port` change le port si celui par défaut est occupé. **Ctrl+C** dans la fenêtre du lanceur arrête le serveur.

## Comment jouer

La connexion est obligatoire : créez un compte avec un pseudo et un mot de passe, puis retrouvez votre carnet. Il n'y a plus d'accès invité, même avec `?dev`. Une ancienne progression locale peut être reprise lors de l'inscription ; la connexion à un compte existant charge uniquement sa propre sauvegarde.

Après connexion, le jeu s'ouvre sur une **carte d'expédition** : retrouvez les six mondes et leurs cartes distinctes, puis **Explorer**, **Reprendre** ou **Rejouer**. Les 39 premiers passages s'ouvrent **l'un après l'autre**. Les Archives des Échos nécessitent l'achat de leur pack à **45 000 points disponibles** dans la boutique, puis progressent dans leur propre ordre. Les records sont sauvegardés sur le compte. Remettre le carnet à zéro efface la progression et la garde-robe, mais conserve les identifiants et les packs achetés.

Le bouton **Carte** du plateau permet de revenir à l'accueil et de reprendre la partie en cours. Le chronomètre et le rendu 3D se mettent en pause dans l'accueil. Après une victoire, poursuivez vers le niveau suivant ou retrouvez votre progression sur la carte : le niveau 10 mène au 11 en Atlantide, le 17 au 18 dans le volcan, le 24 au 25 en Boréale, puis le 29 au 30 dans l'espace.

Six passages cachent un **escalier**. Une pierre du plateau porte une gravure creusée dans sa face supérieure, invisible en perspective : basculez en **vue du dessus** pour la repérer, puis amenez Lumen dessus — elle n'est jamais sur le chemin de la sortie, il faut la glisser jusqu'à un couloir ou lui amener le couloir. La pierre sonne creux, l'escalier s'ouvre, et une carte propose de **descendre** dans une salle annexe, plus difficile, qui garde une relique et un **compagnon qu'aucune boutique ne vend**. On en remonte au portail du niveau d'origine, qu'il reste à franchir : explorer ne fait jamais perdre une partie. À la sortie d'un passage qui cache un escalier, le carnet note que « quelque chose sonnait creux » ; une fois l'escalier trouvé, la carte le marque et le carnet permet d'y redescendre directement.

1. En mode **déplacer**, cliquez sur une dalle voisine d'un emplacement vide pour la faire glisser. Les flèches sur les dalles indiquent les glissades possibles, uniquement à l'horizontale ou à la verticale. Si plusieurs vides sont voisins de la même dalle, choisissez ensuite celui à utiliser sur le plateau ou avec les boutons proposés.
2. **Une dalle occupée par Lumen est bloquée.** Son emplacement est une contrainte du puzzle : il faut parfois avancer avant de poursuivre le taquin.
3. Passez en mode **explorer** à tout moment. Survolez une dalle accessible pour voir le trajet pointillé, puis cliquez pour faire marcher Lumen. Les ouvertures des dalles doivent se faire face. Les trajets exposés à un crocodile sont signalés comme dangereux ; les indices privilégient les chemins sûrs.
4. Rejoignez la sortie pour terminer le niveau. Les cinq passages de chaque monde introduisent des contraintes propres à leur environnement. La règle du passage apparaît sur la carte et sur le plateau ; **Comment ça marche ?** en rappelle les détails.

Vous pouvez alterner librement entre les deux modes : il n'est pas nécessaire de reconstituer tout le chemin avant d'avancer. **Annuler**, **Recommencer** et **Indice** permettent d'expérimenter. Annuler une marche fait revenir Lumen par son trajet exact, virages compris, et restaure les dalles effondrées lors de cette marche.

### Le taquin spatial

Un plateau contient **26 cubes et un vide**, répartis sur trois étages. Un cube voisin peut glisser vers le vide selon les trois axes, sans tourner ni transporter Lumen. Les tunnels se raccordent sur leurs six faces. La vue **Éclaté** sépare les étages et le sélecteur d'étage donne accès au cœur du volume. Les boutons fléchés permettent de monter ou descendre par un tunnel ; au clavier, **Page précédente / Page suivante** ajoutent l'axe vertical aux quatre flèches habituelles. Annulation, indices, trésors, scores et sauvegarde fonctionnent comme dans les autres mondes. Voir [le guide de l'espace](docs/espace.md).

### Les Archives des Échos

Une cité existe en deux époques, **Ruines** et **Apogée**. Sur un chronolithe, faites résonner les pierres : elles gardent leur emplacement, mais leurs chemins changent. Retrouvez les fragments de mémoire dans les deux époques pour ouvrir la sortie. Les reliques se cachent dans la cité ancienne. Les cinq niveaux s'achètent ensemble dans **Boutique → Expéditions**, pour **45 000 points disponibles**. Achat unique, sans paiement réel. Voir [le guide des Échos](docs/echoes.md).

**Essai local :** `?dev` permet de tester les cinq Archives sans achat. Aucun point ni record n'est enregistré pour l'essai d'un pack non acquis. Quitter le mode développeur rétablit le verrou normal.

### Les dangers et leurs usages

**Les lunes : marcher sur la surface.** Après les cinq stations, cinq passages lunaires conservent le taquin cubique mais remplacent les tunnels par des pistes sur les six faces extérieures. Lumen contourne les arêtes et marche tête en bas sous le cube ; le cœur et les faces internes restent interdits. La caméra, le sélecteur de face et **Voir Lumen** permettent d'inspecter ce petit monde opaque. Les stations précédentes gardent leurs tunnels et leur vue éclatée.

- **Jungle — crocodiles :** leur case est accessible, mais Lumen est capturé à son arrivée, même s'il visait une case plus loin. La marche s'arrête au premier crocodile. Après une courte animation, l'écran d'échec propose **Recommencer** ou **Revenir à la carte** ; aucune autre action, y compris Annuler, n'est possible avant de recommencer. Les records acquis restent conservés. La dalle reste mobile : le crocodile voyage avec elle, ce qui permet de dégager un détour.
- **Atlantide — courants :** une dalle marquée d'une flèche impose la direction de sortie de Lumen. Son entrée reste possible par les ouvertures reliées ; construisez le chemin dans le sens du courant.
- **Volcan — dalles fragiles :** Lumen traverse les pierres fissurées en une seule course jusqu'à une dalle stable ou à la sortie. Il ne peut pas s'arrêter sur une pierre fragile. Les dalles s'effondrent derrière lui et laissent de nouveaux vides où faire glisser les pierres restantes. Certains passages demandent ainsi de traverser d'abord, puis de reconstruire la suite du chemin.
- **Jungle — crocodiles en maraude :** dans les épreuves de la jungle, le gardien change de pierre à **chaque dalle déplacée**, le long d'une ronde fixe. Un anneau marque la case qu'il rejoindra ; il attend si elle est vide ou occupée. Sa pierre ne peut pas glisser tant qu'il pèse dessus, mais Lumen peut y entrer et être capturé. Comptez vos déplacements pour passer dans son dos.
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
| Clic molette sur la scène | Changer de mode |
| Entrée | Avancer jusqu'au prochain arrêt sûr, ou déplacer la dalle sélectionnée en mode déplacer |
| Flèches, en déplacement | Sélectionner une dalle ; Entrée pour la faire glisser |
| Flèches, en exploration | Partir dans la direction indiquée jusqu'au prochain arrêt sûr, si le passage existe |
| Z | Annuler la dernière action |
| R | Recommencer le niveau |
| H | Demander un indice |
| M | Activer ou couper l'ambiance sonore |

Le bouton **Avancer** rejoint lui aussi le prochain arrêt sûr. Quand le portail est accessible, il devient **Vers la sortie** et conduit Lumen jusqu'au bout du passage. Pour choisir une autre destination, cliquez sur la dalle accessible souhaitée en mode explorer. Un geste de rotation déplace la caméra ; un clic ou toucher bref actionne la dalle. Les flèches suivent toujours les lignes et colonnes du plateau, quelle que soit la caméra. Le bouton **Vue du dessus** facilite le jeu au clavier.

Les niveaux terminés, vos records, vos points, secrets, achats, tenue et dernier niveau sont sauvegardés automatiquement sur le compte. Une partie en cours reste disponible dans le navigateur d'origine tant que le serveur Python n'a pas été arrêté ; le plateau et son historique ne sont pas persistés dans le fichier JSON.

## Comptes et protection

Le fichier privé `backend/data/accounts.json` est créé au premier compte. Il contient les mots de passe **hachés avec scrypt et un sel individuel**, les sessions et les sauvegardes. Aucune dépendance Python ni base de données externe n'est nécessaire. Le dossier est exclu de Git et inaccessible via Vite ; Python ne sert que `dist/`.

- Toutes les routes de jeu exigent une session valide. Une partie ne peut être lue ou modifiée que par son propriétaire.
- Les sessions durent 30 jours, sont révoquées à la déconnexion et utilisent un cookie `HttpOnly; SameSite=Strict`. Seule l'empreinte du jeton est enregistrée dans le JSON.
- Connexion et inscription : **12 tentatives/minute/IP**, plus **8 connexions/15 minutes/pseudo**. Inscription : **3 tentatives/heure/IP**, avec un plafond global de 30/heure. Un champ piège rejette les formulaires automatisés qui le remplissent.
- L'API est limitée à 600 requêtes/minute/IP, le jeu à 240/minute/compte, les nouvelles parties à 20/minute/compte et les sauvegardes à 120/minute/IP. Les refus renvoient `429` avec `Retry-After`. Les quotas sont en mémoire et repartent à zéro au redémarrage.
- Les envois de progression sont sérialisés, avec une révision qui refuse l'écrasement d'une sauvegarde plus récente. En cas de coupure réseau, une copie locale isolée par compte attend le prochain envoi. Un conflit nécessite de confirmer le rechargement du carnet serveur.
- La remise à zéro efface la progression du compte, pas ses identifiants. Elle attend la confirmation du serveur avant de vider la copie locale.

**Sauvegarde du fichier :** arrêter le serveur, copier `backend/data/accounts.json` vers un emplacement privé, puis redémarrer. Ne pas modifier ce fichier pendant que le serveur tourne. Cette solution vise une petite installation avec **un seul processus Python**, pas plusieurs serveurs partageant le même JSON. Pas de récupération de mot de passe par e-mail ni de classement anti-triche : les scores envoyés par le client ne sont pas certifiés.

**Avant une ouverture sur Internet :** placer le serveur derrière un reverse proxy HTTPS et définir `LUMEN_SECURE_COOKIE=1`. Conserver l'en-tête `Host` public lors du proxy. Ajouter des limites de connexions, de taille et de débit au proxy, et un CAPTCHA/WAF si nécessaire : les quotas et le champ piège ne bloquent pas un bot déterminé ni une attaque distribuée. Le serveur ignore volontairement `X-Forwarded-For` non fiable ; derrière un proxy, ses quotas IP sont donc partagés et le filtrage par IP réelle doit être fait au proxy. Les fichiers statiques de l'écran de connexion restent publics ; les parties et sauvegardes sont privées.

En développement, Vite conserve le `Host` et relaie `/api` vers le port 8765. Pour un autre port, définir `LUMEN_API_TARGET` avant `npm run dev` (par exemple `http://127.0.0.1:8766`).

Tests ciblés : `python -m unittest backend.test_accounts backend.test_engine.ApiTests` et `node --test tests/account.test.js`. Ils utilisent des fichiers JSON temporaires, jamais les comptes réels.

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

Le **portefeuille** additionne votre **meilleure course sur chaque niveau**. Rejouer ne peut donc que l'augmenter, et refaire le premier niveau en boucle ne rapporte rien. Les 39 passages sans pack peuvent rapporter **85 100 points** ; la campagne complète de 44 passages et 32 trésors atteint **96 580 points**, hors passages secrets et avant dépenses.

Le barème vit dans [src/score.js](src/score.js), à l'écart de l'interface, et `tests/score.test.js` le vérifie.

## La boutique de l'expédition

Depuis le pied de la carte, ouvrez **Le cabinet des merveilles**. Ses **80 entrées**, dont 8 options de départ gratuites, comprennent les objets d'origine, 18 familiers et six nouvelles collections : **Clairière enchantée**, **Voyage astral**, **Le pacte du dragon**, **Atelier des merveilles**, **Les mers impossibles** et **Rêves en pixels**.

Les **huit emplacements** sont le couvre-chef, la cape ou les ailes, la lumière tenue, la teinture du manteau, le familier, les traces de pas, l'aura et la parure du portail de sortie. Les pièces ont des formes propres : licorne et dragonnet ailés, lunettes d'aéronaute, astrolabe, automate, poulpe, fantôme pixel, ailes, engrenages… Seule la teinture conserve volontairement la forme du vêtement.

- Choisissez une collection, cherchez un nom ou filtrez par emplacement, rareté, possession ou budget. **Six articles par page** gardent la grille courte ; les vignettes photographient les vrais modèles du jeu.
- La cabine s'ouvre sur votre tenue équipée. Touchez une pièce pour l'essayer, ou **Essayer toute la collection** pour porter un ensemble. Vous pouvez mélanger plusieurs collections. Les essais sont gratuits et ne sont pas sauvegardés.
- Faites glisser l'aventurier pour le tourner, faites-le marcher pour voir les animations ou utilisez **Détail** pour observer une pièce. Sur téléphone, la cabine reste visible pendant le défilement du catalogue.
- **Acheter et équiper** ne concerne que la pièce sélectionnée. **Équiper** remet un objet déjà possédé ; **Ma tenue** restaure l'apparence réellement équipée dans l'aperçu. Fermer la boutique abandonne les essais.

Le **portefeuille reste un record qui ne baisse jamais**. Les dépenses sont conservées séparément ; le solde disponible vaut portefeuille moins dépenses. Les achats et les tenues antérieurs restent compatibles.

L'économie privilégie le choix : le catalogue complet coûte **114 100 crédits**, contre un **plafond théorique de 85 100 points** pour les 39 passages et leurs trésors. Un nouvel ensemble coûte **7 300 crédits** ; ses pièces vont de 300 à 1 700 crédits. Les douze animaux supplémentaires coûtent de 1 100 à 6 200 crédits. Les prix des pièces d'origine restent inchangés. Les raretés sont fixes et tous les prix sont visibles, sans tirage au sort. Rejouer sans améliorer son meilleur score ne crée pas de nouveaux crédits.

Les **tenues et familiers sont cosmétiques**. Le rayon **Expéditions** est distinct : il vend le pack de niveaux des Archives, sans équiper d'objet. Son prix est déduit une seule fois du solde, après confirmation ; le serveur conserve le droit d'accès avec le compte.

### Le bestiaire

Les familiers ont leur propre rayon, à côté de **Tenues & effets** : un onglet **Familiers**, puis une rangée de familles — chats, chiens, tortues, dragons, et les merveilles venues des collections. Chaque compagnon est modelé et animé dans son propre module, `src/pets/<id>.js`.

Leurs volumes cubiques, yeux en pixels et carapaces à étages suivent le style de l'aventurier. Les pattes ont des raccords aux articulations. L'aperçu rapproche le compagnon seul : son socle et le cadrage restent fixes pendant ses animations et la rotation. **Ensemble** permet de le revoir auprès de Lumen.

Une sixième famille, **Trouvailles**, rassemble les six compagnons qui ne se vendent pas : la Salamandre des racines, le Harfang des aurores, la Méduse de l'estran, la Limace de magma, le Phénix éteint et le Renard des glaces. Chacun attend au fond d'un passage secret et rejoint la ménagerie à la sortie de sa salle.

Ils ne flottent pas sur place : le gréement leur applique un retard de suivi — ils traînent derrière quand vous partez, reviennent quand vous vous arrêtez — et chaque espèce a sa démarche. Un corgi piétine, un lynx traque, une tortue rentre la tête quand vous pressez le pas, un wyrm ondule. `tests/pets.check.mjs` mesure ces mouvements et **refuse deux créatures dont la signature se ressemble**.

Le fonctionnement, l'économie et l'ajout de collections ou de familiers sont décrits dans [docs/boutique.md](docs/boutique.md).

## Les quarante-quatre passages

Les trois premiers mondes gardent leurs passages d'origine et leurs **épreuves**. Boréale prolonge cette progression avec cinq passages qui introduisent la glisse puis la combinent aux mécanismes existants.

- **Jungle · niveaux 1 à 10 :** Le premier passage ; Les jardins suspendus ; Le sentier des brumes ; Le temple de la canopée ; La pierre voyageuse — puis La ronde du gardien ; La sentinelle ; Le sceau du temple ; Le contrepoids ; La vigie.
- **Atlantide · niveaux 11 à 17 :** Les portes du lagon ; La salle des marées ; Le labyrinthe de corail ; Les archives des abysses ; Le sanctuaire du trident — puis L'heure du reflux ; L'estran.
- **Volcan · niveaux 18 à 24 :** Le seuil des cendres ; Le pont des braises ; La spirale d'obsidienne ; La forge des anciens ; Le cœur de la caldeira — puis Les premières fissures ; Le passage sacrifié.

- **Boréale · niveaux 25 à 29 :** Le lac miroir ; Les aiguilles du nord ; Le refuge des veilleurs ; Le pont des séracs ; La couronne boréale. Sur la glace, Lumen doit aller tout droit sans s’arrêter. Les derniers niveaux combinent glisse, leviers, lest et effondrements. Voir [le guide de Boréale](docs/boreale.md).

- **Espace · niveaux 30 à 34 :** Le sas orbital ; La station en transit ; Le puits des parallaxes ; L'astrolabe brisé ; Le cœur de la singularité. Cinq volumes 3 × 3 × 3, chacun avec ses tunnels verticaux et sa relique facultative. Voir [le guide de l'espace](docs/espace.md).

- **Espace, Lune · niveaux 35 à 39 :** Le premier clair de Lune ; La mer de la Tranquillité ; La ligne du terminateur ; La face cachée ; La couronne de sélénite. Cinq lunes opaques, des pistes uniquement extérieures et une gravité locale qui suit chaque face. Les cinq stations à tunnels restent inchangées.

- **Archives des Échos · pack, niveaux 40 à 44 :** Le vestibule des heures ; La galerie palimpseste ; Le pont des revers ; La chambre de résonance ; Le dernier souvenir. Deux époques, des chronolithes et des fragments de mémoire. Le pack coûte 45 000 points et reste testable gratuitement en mode développeur local.

- **Passages secrets · six salles annexes :** La crypte des racines (sous La vigie, 10) ; La salle noyée (sous L'estran, 17) ; La veine de magma (sous Le pont des braises, 19) ; Le cœur éteint (sous Le passage sacrifié, 24) ; Le lac sous la glace (sous Le pont des séracs, 28) ; La caverne sous les aurores (sous La couronne boréale, 29). Chacune reprend la règle de son monde en plus dur, cache une relique en cul-de-sac et remet un compagnon exclusif. Voir [les passages secrets](docs/passages-secrets.md).

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

### Le mode dév : tous les passages ouverts

Pour essayer un monde récent sans rejouer la campagne, ajoutez **`?dev`** à l'adresse :

```
http://127.0.0.1:8765/?dev
```

Tous les cadenas s'effacent, la campagne entière devient jouable, et un badge **MODE DÉV** apparaît en haut de l'écran pour qu'une session de test ne passe jamais pour une vraie partie. Le mode tient pour l'onglet : recharger le conserve, fermer l'onglet y met fin. Cliquer le badge, ou charger `?dev=0`, en sort.

Il ne touche à **rien** de ce qui est sauvegardé : progression, records, reliques et portefeuille restent ceux de vos vraies parties, et la carte s'ouvre toujours sur votre frontière réelle, pas sur le dernier niveau. Un passage terminé en mode dév compte comme terminé — c'est précisément ce qui le rend utile. Le déverrouillage étant une règle du client, le mode dév se contente de ne pas l'appliquer ([src/dev-mode.js](src/dev-mode.js) et [src/campaign.js](src/campaign.js)).

## En cas de problème

- **Node ou Python introuvable :** installez les versions indiquées, puis rouvrez le terminal ou le lanceur.
- **Échec du téléchargement initial :** vérifiez la connexion et relancez. Les messages précis restent affichés dans la fenêtre.
- **Port occupé :** sans argument, le lanceur essaie automatiquement les ports 8765 à 8784 et réutilise une instance LUMEN rencontrée. Avec `--port N`, seul ce port est essayé : en cas de conflit, relancez sans `--port` ou choisissez un autre port. Aucun autre programme n'est arrêté.
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
python tests/secrets.check.py
node --test tests/*.test.js
node tests/props.check.mjs
node tests/pets.check.mjs
node tests/layout.check.mjs
npm run build
```

`tests/secrets.check.py` rejoue chaque salle secrète : témoin gagnant avec son par, relique facultative en cul-de-sac, difficulté supérieure à l'hôte, règle du monde sur la route, indices jusqu'au portail. Les tests Python vérifient aussi que la pierre gravée de chaque hôte n'est jamais sur le trajet du témoin, que l'escalier ne s'ouvre qu'en marchant dessus, se referme à l'annulation, et que le portail reste franchissable ensuite.

Les tests Python couvrent les règles, les solutions des vingt-neuf niveaux, l'unicité des plateaux, les quatre mondes et l'API. Ils vérifient aussi les crocodiles fixes et en maraude, les courants, la marée, les leviers et sceaux à poids, les effondrements en chaîne, le caractère facultatif des reliques, les déplacements avec plusieurs vides et leur annulation. Les tests Node de `tests/score.test.js` vérifient le barème, ses bornes et la somme du portefeuille ; ceux de `tests/cosmetics.test.js` couvrent le catalogue et les achats ; ceux de `tests/motion.test.js` vérifient les virages, le trajet inverse, les courtes marches, les aperçus sûrs et le choix d'un arrêt après une traversée fragile. La dernière commande construit le frontend dans `dist/`.
