# Passages secrets

> Ajout du 11 septembre 2026. Six passages de la campagne cachent un escalier ; chacun mène à une salle annexe plus difficile, qui remet une relique et un compagnon qu'aucune boutique ne vend. Ce document décrit la règle, le moteur, l'interface et la façon d'ajouter une salle.

## La règle, vue du joueur

1. **Repérer.** Une pierre du plateau porte une gravure creusée dans sa face supérieure. Rien ne la signale en perspective ; elle ne se lit qu'en **vue du dessus**, où le relief se détache lentement. La gravure appartient à la pierre : elle voyage avec elle quand elle glisse.
2. **Atteindre.** La pierre gravée n'est jamais sur le trajet de la sortie et ne porte qu'une seule ouverture. Il faut la glisser jusqu'à un embranchement du couloir — ou amener le couloir jusqu'à elle — puis y conduire Lumen. C'est la boucle du jeu, appliquée à une cible que le joueur s'est donnée.
3. **Descendre.** La pierre sonne creux, l'escalier s'ouvre et une carte propose de descendre. La salle est une partie à part entière, jouée avec les règles de son monde en plus dur. Sa sortie remet le compagnon, enregistre le score et **remonte au portail de l'hôte**, qu'il reste à franchir. Refuser la carte n'engage à rien : quitter la pierre puis y revenir la propose de nouveau.
4. **Se souvenir.** À la sortie d'un passage qui cache un escalier, le carnet note que « quelque chose sonnait creux ». Une fois l'escalier trouvé, la carte marque le passage d'un « ⌄ » et le carnet permet d'y redescendre directement.

## Les six salles

| Salle | Sous | Monde | Règle | Par (hôte) | Relique | Compagnon |
| --- | --- | --- | --- | ---: | --- | --- |
| La crypte des racines | La vigie (10) | Jungle | crocodiles | 24 (8) | l'Œil de la crypte | Salamandre des racines |
| La salle noyée | L'estran (17) | Atlantide | marée, dalle immergée | 22 (3) | la Larme d'estran | Méduse de l'estran |
| La veine de magma | Le pont des braises (19) | Volcan | fragile, réactions en chaîne | 17 (8) | le Cœur de basalte | Limace de magma |
| Le cœur éteint | Le passage sacrifié (24) | Volcan | fragile, lest et porte | 21 (5) | la Cendre du phénix | Phénix éteint |
| Le lac sous la glace | Le pont des séracs (28) | Boréale | glace, lest et porte | 24 (18) | le Cristal du lac | Renard des glaces |
| La caverne sous les aurores | La couronne boréale (29) | Boréale | glace et levier | 28 (22) | la Plume d'aurore | Harfang des aurores |

Les hôtes sont des passages **déjà maîtrisés**, jamais un niveau d'introduction : on ne cherche un secret qu'une fois à l'aise avec la règle du lieu. Les niveaux dont le trajet occupe les quinze pierres (La spirale d'obsidienne, Le cœur de la caldeira) ne peuvent pas cacher de pierre libre.

## Le moteur (`backend/engine.py`, `backend/hidden/`)

- `Tile.engraved` marque la pierre gravée ; `Level.secret`, `host` et `reward` relient une salle à son hôte et à son compagnon. `Level.public()` expose `secret` (booléen côté hôte), `host` et `reward`.
- `Game.revealed` est sauvegardé dans l'historique : **annuler la marche referme l'escalier**. L'état sert `engraved` par pierre et un bloc `descent` — `level`, `revealed`, `here` (Lumen se tient sur la pierre gravée) — ou `null` pour un niveau sans secret.
- `_walk` ouvre l'escalier la première fois que Lumen arrive sur la pierre gravée ; le message « La pierre sonne creux. Un escalier s'ouvre sous vos pieds. » remplace le message ordinaire.
- `SECRET_SPURS` donne, par hôte : la case d'embranchement, l'identifiant de la **pierre d'ancrage** du couloir (qui gagne une ouverture vers l'embranchement), le côté, et l'identifiant de la **pierre gravée**, qui devient un cul-de-sac à un seul port. `with_secret(level, secrets)` applique la greffe. Les pierres sont désignées par identifiant, pas par case : elles bougent pendant la résolution.
- Un cul-de-sac à un seul port ne peut être réutilisé par aucun couloir, ce qui garde intacts les invariants de rareté de niveaux comme Le pont des braises.
- Les salles vivent dans `backend/hidden/` (le nom `secrets` est pris par la bibliothèque standard), un module par salle exposant `build(make)`. `secret_maker` fournit `make(id, host, biome, name, subtitle, ports, shuffle, *, marks, actions, relic, relic_name, reward, rule, **features)` : difficulté « Secret », témoin = inverse exact du mélange suivi des `actions`, par = `par + len(shuffle)`. Le témoin est rejoué à l'import ; une salle fausse ne se charge pas. `LUMEN_HIDDEN_LENIENT=1` ignore les modules cassés en le signalant.
- `SECRET_LEVELS` est séparé de `LEVELS` : la campagne reste à vingt-neuf passages ; `LEVEL_BY_ID` et le cache des témoins connaissent les deux.

## Le choix des pierres gravées

Un script d'étude a exploré chaque hôte : les pierres hors du trajet de sortie et jamais foulées par une marche du témoin, tous les embranchements possibles du couloir, puis une recherche en largeur sur les glissements des cases libres pour amener la pierre à l'embranchement. Chaque candidat a été prouvé par la rejouée du plan complet — témoin, glissements supplémentaires, marche sur la pierre, marche jusqu'au portail. Le sous-puzzle retenu compte de 4 à 12 glissements : un vrai détour, pas une corvée.

## Le serveur et le client

- `GET /api/levels` renvoie `{ levels, secrets }`. Une salle se joue comme n'importe quel niveau, par `POST /api/game`.
- `src/App.jsx` : `isOpen` ouvre une salle si `progress[hôte].secretFound` ; `persist` remet le compagnon (`grant`) à la victoire d'une salle, enregistre `secretFound`, et propose la carte de descente chaque fois que `descent.here` passe à vrai. `enterSecret()` ouvre la salle et retient la partie de l'hôte (`returnTo`) ; `ascend()` la reprend par `GET /api/game?id=…`, ou en rouvre une si le serveur l'a oubliée (redémarrage, rechargement, descente depuis le carnet).
- `src/scene.js` : la pierre gravée reçoit un glyphe creusé dont l'émission suit la bascule en vue du dessus ; l'escalier (puits, marches, anneau lumineux) n'apparaît que lorsque `descent.revealed` est vrai. L'ouverture déclenche la réaction « curious » du compagnon et un son.
- `src/HomeScreen.jsx` : rumeur, ligne « l'escalier vous attend » cliquable, marque « ⌄ » sur la carte. `src/Shop.jsx` : les trouvailles affichent « ⌄ Trouvaille » et un achat désactivé.
- `src/cosmetics.js` : `purchase` refuse un article `secret` ; `grant(wardrobe, itemId)` l'ajoute et l'équipe sans toucher au portefeuille. `src/score.js` : barème « Secret » au-dessus de « Légende ».
- `src/bestiary.js` : famille **Trouvailles** ; le neuvième champ d'une ligne du `ROSTER` est l'hôte. `src/pets/` : un module par créature. `src/boards.js` : un profil d'architecture par salle.

## Ajouter une salle

1. Choisir un hôte maîtrisé et vérifier qu'il possède une pierre libre : reprendre la logique du script d'étude (`before_exit`, `bring`, preuve par `apply_plan`). Ajouter l'entrée à `SECRET_SPURS`.
2. Écrire `backend/hidden/<id>.py` sur le modèle de `crypte.py`, l'ajouter à `NAMES` dans `backend/hidden/__init__.py`. Le mélange doit rester une suite de glissements légaux depuis le plateau résolu ; les marches intermédiaires, marées et effondrements passent par `actions`.
3. Ajouter le compagnon : une ligne au `ROSTER` (`src/bestiary.js`) avec l'hôte en neuvième champ, un module `src/pets/<id>.js`, une entrée dans `src/pets/index.js`. Un profil de plateau dans `src/boards.js` si la salle a son architecture.
4. Vérifier : `python tests/secrets.check.py <id>`, `python -m unittest discover -s backend`, `node tests/pets.check.mjs <id>`, `node --test tests/*.test.js`.

## Vérification

```sh
python tests/secrets.check.py            # les six salles, strict
python tests/secrets.check.py crypte     # une seule
LUMEN_HIDDEN_LENIENT=1 python tests/secrets.check.py --lenient   # pendant l'écriture
python -m unittest backend.test_engine.SecretTests -v
```

`SecretTests` vérifie que chaque salle se résout et nomme hôte et compagnon ; que chaque hôte cache une pierre gravée à un seul port, jamais foulée par le témoin ; qu'un niveau sans secret n'expose pas de `descent` ; et, par une recherche exhaustive, que la pierre gravée peut être amenée à son embranchement, que marcher dessus ouvre l'escalier, que l'annulation le referme et que le portail reste franchissable.

`tests/secrets.check.py` rejoue aussi le détour vers chaque relique juste avant la dernière marche du témoin, puis vérifie que le portail reste franchissable avec la relique acquise.

### Reprise des contrôles du 11 septembre 2026

- La veine utilise le tracé corrigé à **17 déplacements** : la relique ne sert plus de halte pour contourner les effondrements.
- La limace utilise directement l'alarme déjà lissée par le gréement commun ; une réinitialisation ne laisse plus de déformation dans sa démarche.
- Les 52 tests Python, les 54 tests JavaScript, les six parcours guidés avec détour de relique et le contrôle des 24 compagnons passent.
- Vérification navigateur : six modèles rendus et animés dans la cabine, affichage sans débordement horizontal à 390 pixels ; descente de La vigie vers la crypte, récompense équipée sans dépense, puis retour à la même partie hôte avec le portail accessible et sans réouverture immédiate de la carte de descente.
- Recherche bornée complémentaire : aucune sortie en dix glissements ou moins dans la caverne et le lac profond ; aucune sortie en huit coups ou moins dans la salle noyée. Ces bornes ne prouvent **pas** que leurs pars respectifs de 28, 24 et 22 sont optimaux. L'optimalité globale de ces trois salles reste à établir.
