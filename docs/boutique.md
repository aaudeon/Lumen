# Boutique et collections

Livraison du 10 septembre 2026, issue de la passation de session. La boutique contient **80 entrées** : les 16 d'origine, 4 nouvelles options gratuites « sans effet », 48 pièces réparties en 6 collections et 12 animaux supplémentaires. Il y a 72 achats possibles et 8 options gratuites. Le catalogue est prêt à croître sans allonger sa grille : une page montre au maximum six articles.

## Les collections

| Collection | Formes et motifs |
| --- | --- |
| Clairière enchantée | Corne de licorne, ailes de libellule, baguette étoilée, licorne ailée, pétales, champignons, fleurs |
| Voyage astral | Croissant et étoiles, mante à trois pans, astrolabe, petit Saturne, orbites, porte de l'éclipse |
| Le pacte du dragon | Cornes, ailes dentelées, flamme captive, dragonnet, écailles, sceau et crocs |
| Atelier des merveilles | Lunettes d'aéronaute, ailes mécaniques, bobine électrique, automate, rouages |
| Les mers impossibles | Tricorne, pavillon, bouteille lumineuse, poulpe, perles et roue de navigateur |
| Rêves en pixels | Casque à oreilles, écharpe double, cœur, petit fantôme, pixels et passage 8-bits |

Chaque collection a huit pièces, une par emplacement. Les objets d'origine restent disponibles sous **Les origines**, avec leurs identifiants et prix historiques. Les teintures repeignent la veste, la chemise et les manches ; les autres emplacements produisent de la géométrie distincte. Les collections peuvent être mélangées.

Les familiers ont quitté ce tableau : ils forment désormais un rayon à part, décrit plus bas. Ils ne participent pas aux règles. Les traces utilisent un stock fixe de 18 particules, apparaissent à l'appui du pied et disparaissent après 1,15 seconde. Sur le plateau, elles restent dans l'espace du monde ; elles ne suivent pas le personnage. Les auras tournent autour des pieds. La parure du portail reste à la sortie ; la cabine la présente derrière le personnage pour l'essayage.

## Le bestiaire

Les familiers ne sont plus une case du tableau combinatoire. Un compagnon n'est pas un chapeau d'une autre couleur : chacun est modelé et animé dans son propre module, `src/pets/<id>.js`, et le catalogue les range par **espèce** plutôt que par collection.

| Famille | Compagnons |
| --- | --- |
| Chats | Chat tigré, Chat d'ombre, Lynx de brume |
| Chiens | Corgi baroudeur, Terrier des fouilles, Louveteau des cimes |
| Tortues | Tortue moussue, Tortue dorée, Tortue-île |
| Dragons | Dragonneau de braise, Dragon de givre, Wyrm de jade |
| Merveilles | Les six compagnons venus des collections, remodelés |

Le rayon **Familiers** a son propre onglet, à côté de **Tenues & effets**, et une rangée de familles qui remplace les collections. Y entrer montre le compagnon seul en mouvement dans la cabine. **Pause** montre son comportement au repos ; **Ensemble** le replace auprès de Lumen.

Les 18 modèles suivent désormais les volumes cubiques de l'aventurier : blocs légèrement chanfreinés, yeux en pixels, carapaces construites par étages et raccords aux genoux. Les silhouettes et animations propres à chaque espèce sont conservées. `src/pets/voxel-shapes.js` fournit les volumes communs sans imposer de squelette commun.

En vue de détail, le socle appartient à la scène fixe. La rotation se fait autour du point de présentation du compagnon ; le retard de suivi du jeu ne déplace pas ce point. La caméra garde un cadrage constant, indépendant des membres qui bougent, pour éviter que la présentation ne se décale ou ne zoome pendant la marche.

### Le contrat d'un familier

Le gréement possède le **placement**, la créature possède son **corps**. `src/explorer.js` tient un point d'attache qui applique le retard de suivi — le compagnon traîne derrière quand Lumen part, revient quand il s'arrête — et ajoute le vol stationnaire aux espèces volantes. Le module de la créature n'anime que ses propres membres, en coordonnées locales.

```js
export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  // ... modelage
  return {
    ground: true,            // marche au sol ; false = vole
    home: [-.62, 0, -.16],   // position de repos relative à Lumen
    scale: 1,
    animate(time, { moving, speed, footfall, dt }) { /* uniquement le corps */ },
  };
}
```

`src/pets/kit.js` fournit de quoi articuler un animal : `limb()` construit une patte à hanche, genou et pied posé ; `chain()` construit une queue, un cou ou un corps de serpent qu'on fait onduler ; `eyes()` pose des yeux avec pupille ; `trot()` répartit une allure diagonale sur quatre pattes. `src/pets/cat-tabby.js` sert de référence.

### Pourquoi ce découpage

La première ménagerie partageait une seule boucle d'animation : six créatures différentes flottaient de deux centimètres, à l'identique. Le joueur l'a vu immédiatement. Séparer les modules force chaque espèce à définir sa propre signature de mouvement, et `tests/pets.check.mjs` refuse celles qui se ressemblent.

## Navigation et essayage

L'écran utilise des onglets de collection, une recherche insensible aux accents, des filtres d'emplacement, de rareté et de possession, ainsi qu'une vue « à votre portée ». Le filtre Nouveautés masque les objets historiques. Le tri propose nouveautés, prix, nom et rareté. La pagination est bornée, y compris si un filtre réduit le nombre de résultats.

Un clic ou toucher sélectionne une pièce et l'ajoute à l'essai courant. **Essayer toute la collection** remplit les huit emplacements pour la prévisualisation seulement. **Ma tenue** revient aux objets effectivement équipés. Un achat équipe seulement l'objet sélectionné ; les autres pièces essayées restent temporaires. Fermer la boutique abandonne l'essayage. La touche Échap ferme la fenêtre, le clavier reste dans la boutique et le focus revient au bouton d'ouverture.

La cabine possède son propre aperçu 3D, avec rotation par glissement, marche et cadrage de détail. Elle reste visible pendant le défilement du catalogue sur téléphone. Les vignettes sont rendues à partir des mêmes modèles : un contexte WebGL temporaire photographie seulement la page visible, puis est libéré. Les images sont mises en cache en mémoire pour les consultations suivantes.

## Économie retenue

Le barème et les règles du portefeuille ne changent pas. Une victoire rapporte selon les cinq parts et le multiplicateur existants. Le portefeuille additionne les meilleurs scores ; le solde disponible soustrait les dépenses cumulées. Il n'y a pas de récompense répétable à l'infini pour un niveau déjà maîtrisé.

| Mesure au 10 septembre 2026 | Crédits / points |
| --- | ---: |
| Plafond théorique des 24 niveaux, trésors inclus | 48 440 |
| Catalogue historique | 34 900 |
| Une nouvelle collection complète | 7 300 |
| Les six nouvelles collections | 43 800 |
| Les douze animaux supplémentaires | 35 400 |
| Tout le catalogue | 114 100 |

Le plafond est une borne du barème : toutes les parts au maximum et tous les trésors. Ce n'est pas la promesse d'un itinéraire qui atteigne simultanément ces objectifs. Les valeurs ont été calculées avec `scoreRun` et les métadonnées de `/api/levels`.

La progression consiste à **choisir ses objets favoris**. Une bonne campagne finance plusieurs ensembles, mais pas toutes les pièces, surtout si des achats historiques ont déjà été effectués. Les essais sont toujours gratuits. Pas de nouvelle monnaie, de tirage au sort, de changement des records ou de multiplication des gains.

| Nouvelle pièce | Rareté | Prix |
| --- | --- | ---: |
| Teinture | Classique | 300 |
| Traces de pas | Classique | 350 |
| Aura | Rare | 650 |
| Lumière | Rare | 800 |
| Couvre-chef | Rare | 900 |
| Parure de portail | Épique | 1 200 |
| Cape / ailes | Épique | 1 400 |
| Familier de collection | Légendaire | 1 700 |
| Animal supplémentaire | Rare à légendaire | 1 100 à 6 200 |

Les prix historiques ne sont pas recalculés. Une rareté décrit ici une catégorie cosmétique affichée ; elle ne donne aucune probabilité d'obtention.

## Où modifier le contenu

- `src/bestiary.js` : familles, noms, histoires, raretés, prix et palettes des familiers. `src/pets/` : un module par créature, `index.js` pour le registre, `kit.js` pour la boîte à outils.
- `src/collections.js` : collections, noms, histoires, raretés, prix, palettes et modèles des autres pièces.
- `src/cosmetics.js` : catalogue unifié, compatibilité de la garde-robe, achats, équipement, filtrage et pagination.
- `src/fantasy-gear.js` : géométrie et animation des six nouvelles familles. `src/gear.js` conserve les modèles historiques et la propriété des ressources.
- `src/explorer.js` : points d'attache, marche et déclenchement des traces. `src/scene.js` fournit les groupes du monde et du portail.
- `src/Shop.jsx` et `src/shop.css` : interface et essayage temporaire ; `HomeScreen.jsx` ouvre le panneau.
- `src/preview.js` : caméra et aperçu autonome ; `src/thumbnails.js` : photographies des pièces.

Pour ajouter un familier : une ligne dans le `ROSTER` de `bestiary.js`, un fichier `src/pets/<id>.js` suivant le contrat, une ligne dans `src/pets/index.js`, puis `node tests/pets.check.mjs <id>`. Pour ajouter une famille entière, ajouter sa fiche à `PET_FAMILIES` — l'onglet la reprend automatiquement.

Pour ajouter une collection, définir sa fiche et ses huit noms/histoires/palettes dans `collections.js`, puis ses silhouettes dans `fantasy-gear.js`. Les nouvelles pièces doivent avoir un identifiant stable. Conserver les identifiants déjà enregistrés pour ne pas perdre d'achats. Une variante qui change seulement la couleur n'est pas une nouvelle silhouette.

## Vérifications de cette livraison

- 30 tests Node : tests existants plus migration de la garde-robe, nouveaux achats, filtres, familles de familiers et pagination d'un catalogue synthétique de 243 entrées.
- Le contrôle `tests/pets.check.mjs` mesure, pour chaque familier, où chaque maille voyage réellement pendant une seconde, au repos puis en marche. Il refuse une créature inerte, trop sommaire, hors gabarit, qui n'utilise pas toute sa palette, qui ignore que Lumen se déplace, ou **dont la signature de mouvement ressemble à celle d'une autre**.
- Le contrôle `tests/props.check.mjs` construit toutes les pièces, vérifie leurs couleurs sur leurs propres matériaux visibles, les teintures dessinées, le dégagement des capes sur 24 poses et celui des familiers pendant la marche.
- Il vérifie aussi la disparition des traces, leur ancrage dans le monde, l'attache au portail et la libération unique des géométries et matériaux, y compris les particules cachées.
- Compilation Vite et inspection dans le navigateur, au format courant et sur téléphone 390 × 844 : cabine, images, recherche, filtres, essayage et pagination.

Commandes à lancer depuis la racine du projet :

```sh
node --test tests/*.test.js
node tests/props.check.mjs
node tests/pets.check.mjs
npm run build
```

Le moteur Python et ses règles n'ont pas été modifiés dans cette refonte.
