# Espace : les cubes de l'infini

Le cinquieme biome prolonge la campagne apres Boreale. Les cinq stations a tunnels
(30 a 34) sont conservees et suivies de cinq passages lunaires de surface (35 a 39).
Chacun garde sa relique facultative. La progression et les comptes existants
restent compatibles ; aucune sauvegarde n'est reinitialisee.

## Stations A Tunnels

- Un volume de 3 x 3 x 3 contient 26 cubes et un emplacement vide.
- Un cube partageant une face avec le vide peut y glisser sur X, Y ou Z.
- Les cubes ne tournent pas : c'est un taquin en volume, sans rotation de tranches.
- Le cube portant Lumen reste immobile.
- Les tunnels se raccordent par des ouvertures reciproques sur six faces.
- Lumen peut monter, descendre, revenir en arriere et traverser plusieurs etages.
- Le sas d'entree est rattache au cube 0 ; le sas de sortie au cube 26.
- Les reliques sont ramassees a l'arrivee sur leur cube, pas au debut du trajet.

### Commandes

**Volume** garde le cube assemble ; **Eclate** espace ses trois etages. Le selecteur
d'etage n'affecte que la vue : les cubes caches restent presents dans les regles.
Il permet de viser le coeur du volume sans cliquer sur un cube situe devant.

Un clic en mode deplacement fait glisser un cube voisin du vide. En mode Explorer,
il choisit une destination reliee par les tunnels. La camera reste libre en orbite.
Les quatre fleches pilotent le plan horizontal ; Page precedente / Page suivante
ajoutent l'axe vertical. Deux boutons fleches permettent aussi de monter et descendre.
Les controles de vue attendent la fin d'un deplacement.

### Passages

| Niveau | Identifiant | Passage | Melange de reference |
| --- | --- | --- | --- |
| 30 | `orbite` | Le sas orbital | 3 glissements |
| 31 | `transit` | La station en transit | 6 glissements |
| 32 | `parallaxe` | Le puits des parallaxes | 11 glissements |
| 33 | `astrolabe` | L'astrolabe brise | 16 glissements |
| 34 | `singularite` | Le coeur de la singularite | 20 glissements |

## Lunes De Surface

Les nouvelles lunes sont opaques et craterisees. Le taquin reste un volume de
26 cubes et un vide, mais les pistes n'existent pour Lumen que sur les six faces
externes : 54 emplacements de surface potentiels, que le vide peut interrompre.

- Une position de marche identifie un cube ET sa face.
- Les pistes de deux cubes voisins doivent se raccorder dans leur plan commun.
- Sur une arete du grand cube, une piste peut continuer sur la face voisine.
- Lumen pivote avec la normale du sol. Sous la Lune, il marche tete en bas par rapport au decor, les pieds toujours tournes vers la roche.
- L'animation contourne les aretes par un arc exterieur, jamais une diagonale traversant le solide.
- Le coeur et les faces tournees vers une cavite ne sont pas praticables, meme lorsqu'un cube manquant les rend visibles.
- Le cube portant Lumen reste immobile, quelle que soit la face parcourue.
- Le tresor attend l'arrivee sur sa face ; annuler retrace aussi les passages d'arete et restaure les objets.

### Commandes Lunaires

Le selecteur de face et la camera orbitale donnent acces au dessus, aux quatre
cotes et au dessous, sans masquer de cubes. **Voir Lumen** recentre sur sa face.
Un clic en mode deplacement vise un cube entier ; en mode Explorer, il vise la
face exterieure cliquee. Les fleches suivent les axes de la face du personnage,
comme dans son point de vue de face. Les commandes verticales et la vue eclatee
restent propres aux stations a tunnels.

### Passages Lunaires

| Niveau | Identifiant | Passage | Melange de reference |
| --- | --- | --- | --- |
| 35 | `clairdelune` | Le premier clair de Lune | 3 glissements |
| 36 | `tranquillite` | La mer de la Tranquillite | 6 glissements |
| 37 | `terminateur` | La ligne du terminateur | 11 glissements |
| 38 | `facecachee` | La face cachee | 16 glissements |
| 39 | `selenite` | La couronne de selenite | 20 glissements |

Chaque melange est reversible et possede une solution verifiee. Ces nombres sont
des parcours de reference, pas des minimums prouves : un raccourci peut exister.
Les indices combinent ces solutions connues avec une recherche bornee ; si son
budget est epuise, ils peuvent proposer d'annuler plutot qu'inventer une solution.

## Implementation

- [backend/space.py](../backend/space.py) definit la geometrie, les niveaux et `SpaceGame`.
- [backend/server.py](../backend/server.py) expose `CAMPAIGN_LEVELS` et choisit le moteur.
- [src/volume.js](../src/volume.js) partage les coordonnees entre commandes et scene.
- [src/space-scene.js](../src/space-scene.js) rend les cubes, les tunnels et la carte orbitale.
- [src/scene.js](../src/scene.js) conserve l'interface publique et selectionne le rendu adapte.
- [backend/lunar.py](../backend/lunar.py) ajoute le graphe de surface et `LunarGame`.
- [src/lunar.js](../src/lunar.js) calcule les reperes, les arcs et la gravite locale.
- [src/lunar-scene.js](../src/lunar-scene.js) rend la roche opaque et les chemins externes.

L'API conserve les actions habituelles. L'etat spatial ajoute `boardKind: "volume"`,
`size: 3`, `depth: 3`, `cellCount: 27` et `finishIndex: 27`. L'indice d'un cube est
`x + 3*z + 9*y`. Les ouvertures `U` et `D` completent `N`, `E`, `S`, `W`.
Les etats de jeu et les regles des quatre autres mondes ne changent pas.

L'etat lunaire utilise `boardKind: "surface"`, `region: "moon"` et
`finishIndex: 162`. Les actions `slide` continuent d'utiliser les indices de cube
0 a 26. Les actions `walk` utilisent `cube * 6 + face`, ou -1 pour l'entree et
162 pour la sortie. L'ordre des faces est `N, E, S, W, U, D`. `heroCube` sert au
verrouillage du cube et `heroFace` nomme le sol sous Lumen. Les pistes appartiennent
aux `faces` de chaque cube ; `walkRoutes` conserve les parcours complets par face.
La recherche d'indices spatiale est partagee, mais interroge le graphe propre a
chaque moteur : aucun indice lunaire ne peut utiliser un tunnel interieur.

## Verification

```powershell
python -m unittest discover -s backend -p test_space.py
python -m unittest discover -s backend -p test_lunar.py
node --test tests/volume.test.js
node --test tests/lunar.test.js
node tests/progression.check.mjs
```

Les tests couvrent les six voisins, les limites de chaque etage, les tunnels
verticaux, l'immobilisation du cube occupe, les coups invalides, l'annulation,
les cinq solutions, les indices et les tresors. L'API est aussi testee par une
partie complete. Les controles navigateur couvrent desktop/mobile, vue eclatee,
coupe centrale, clic 3D, deplacements verticaux et transition vers un ancien biome.

Les tests lunaires couvrent les 54 portions de surface, leurs voisins reciproques,
les cinq solutions, les indices, les cavites interdites et le cube occupe. Le rendu
est verifie sur ordinateur et mobile : opacite, orientation sous le cube, clic de
face, tresor a l'arrivee, annulation, victoire et aller-retour vers les deux autres
types de plateau.

est verifie sur ordinateur et mobile : opacite, orientation sous le cube, clic de
