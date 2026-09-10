# LUMEN — Idées pour la suite

Notes du 9 septembre 2026, issues de notre discussion sur l’évolution du prototype.
**Toutes les pistes ci-dessous ont été mises en œuvre le 9 septembre 2026.** Les
cases cochées renvoient à ce qui existe maintenant dans le jeu ; les remarques en
fin de section signalent ce qui reste ouvert.

## Intention

Renforcer les interactions entre les mécaniques avant de multiplier les niveaux.
Chaque puzzle doit proposer une idée à découvrir et une décision intéressante,
au-delà d’un changement de décor. Privilégier des niveaux courts, puis des défis
qui combinent plusieurs règles.

## Ce qui existe déjà

- Vingt-quatre niveaux : dix en jungle, sept en Atlantide et sept dans le volcan.
- Crocodiles qui bloquent le passage et suivent leur dalle lorsqu’elle glisse.
- Courants qui imposent une direction de sortie sur certaines dalles.
- Dalles fragiles traversées en une course jusqu’à un arrêt stable, puis
  effondrées derrière Lumen pour créer des vides supplémentaires.
- Choix de la destination lorsqu’une dalle peut glisser dans plusieurs vides.
- Carte de progression, carnet de records, indices et annulation des actions.

## Mécaniques ajoutées

### Crocodiles qui patrouillent

- [x] Faire changer les crocodiles de case après chaque déplacement de dalle.
- [x] Permettre au joueur d’anticiper leur position pour profiter du bon moment
      et traverser le passage.

Parcours de patrouille : une ronde fermée de cases voisines, propre au niveau.
Indication du prochain mouvement : un anneau lumineux marque la case visée.
Rencontre avec Lumen ou un vide : le gardien **attend** — il n’entre jamais sur
la case de Lumen ni sur un trou. Sa pierre est verrouillée tant qu’il pèse
dessus, exactement comme celle de Lumen.

### Interrupteurs et portes

- [x] Placer des interrupteurs que Lumen doit atteindre pour ouvrir un passage
      ailleurs sur le plateau — le **levier**, qui reste allumé une fois touché.
- [x] Ajouter des portes qui restent ouvertes uniquement tant qu’un poids
      occupe l’interrupteur — le **sceau à poids** et sa **pierre de lest**.

Le puzzle consiste à organiser les déplacements de Lumen et des pierres pour
maintenir le bon passage ouvert.

### Marées en Atlantide

- [x] Ajouter un levier qui inverse les courants.
- [x] Faire découvrir des chemins immergés lorsque la marée change.

Le levier est une action à part entière : il compte comme un déplacement et
s’annule. Le joueur choisit le bon état du plateau pour poursuivre sa route.

### Réactions en chaîne dans le volcan

- [x] Faire fragiliser les dalles voisines lorsqu’une pierre s’effondre.
- [x] Construire des puzzles où l’on choisit quels passages sacrifier pour
      libérer de l’espace.

Le joueur comprend les conséquences avant de lancer la traversée : en mode
explorer, l’aperçu d’un trajet colore en orange les pierres qui tomberont et en
ambre celles qui se fendront.

### Trésors facultatifs

- [x] Ajouter des reliques accessibles par des détours plus exigeants.
- [x] Permettre de terminer un niveau sans récupérer son trésor.
- [x] Donner une raison de rejouer pour trouver un meilleur itinéraire et
      compléter sa collection.

Chaque relique occupe un cul-de-sac greffé sur la route : elle coûte des pas et
du temps, et ne raccourcit jamais le chemin. Seize passages en possèdent une ;
les huit plateaux les plus denses (canopée, corail, abysses, trident,
obsidienne, forge, caldeira, salle des marées) n’ont pas d’embranchement sûr où
en loger un sans abîmer leur puzzle.

## Ambiance et récompenses

- [x] Une petite scène d’arrivée dans chaque monde.
- [x] Une célébration à la sortie d’un niveau.
- [x] Les reliques récupérées exposées dans le carnet d’expédition.

## Les niveaux ajoutés

Cinq petits niveaux de jungle introduisent les crocodiles mobiles puis les
interrupteurs, et les combinent au dernier :

1. **La ronde du gardien** — la patrouille, et l’attente du bon moment.
2. **La sentinelle** — avancer d’abri en abri derrière un gardien qui tourne.
3. **Le sceau du temple** — le levier et la porte.
4. **Le contrepoids** — livrer la pierre de lest jusqu’au sceau.
5. **La vigie** — le lest et le gardien, à compter ensemble.

Deux niveaux d’Atlantide (**L’heure du reflux**, **L’estran**) et deux niveaux
de volcan (**Les premières fissures**, **Le passage sacrifié**) présentent la
marée et les réactions en chaîne. Ils prolongent leur monde plutôt que de
remplacer un passage existant.

## Préférences à garder en tête

- Priorité au plaisir de jeu, à la variété et à la lisibilité des actions.
- Conserver l’ambiance d’aventure et les particularités de chaque biome.
- Garder des vérifications ciblées, sans consacrer trop de temps aux tests.

## Pistes restées ouvertes

- Loger une relique dans les huit plateaux denses demanderait de retravailler
  leur tracé, pas seulement d’y greffer un cul-de-sac.
- Les épreuves closent chaque monde ; une autre option serait de les intercaler
  selon leur difficulté plutôt que selon leur date d’arrivée.

## Boutique et personnalisation — ajout du 10 septembre 2026

- [x] Six collections fantaisistes avec silhouettes propres : féerie, cosmos, dragons, automates, corsaires et arcade.
- [x] Familiers, traces de pas, auras et parures de portail, en plus des vêtements.
- [x] Grille paginée, vignettes 3D, recherche, rareté, possession, budget et nouveautés.
- [x] Essayage d'une pièce ou d'un ensemble, rotation, marche et vue de détail.
- [x] Cabine visible pendant la navigation sur téléphone.
- [x] Rayon Familiers distinct : 18 compagnons, chats, chiens, tortues, dragons et merveilles.
- [x] Silhouettes cubiques accordées à Lumen, yeux en pixels, articulations raccordées et démarches propres à chaque animal.
- [x] Présentation rapprochée des compagnons avec socle fixe et cadrage stable pendant les animations.
- [x] Compatibilité des anciens achats et portefeuille conservé ; économie fondée sur le choix des pièces.

Bilan et guide d'extension : [docs/boutique.md](docs/boutique.md).


## Boréale — monde IV après le volcan

- [x] Cinq nouveaux passages, niveaux 25 à 29, avec déverrouillage séquentiel.
- [x] Glace : élan tout droit et arrêt obligatoire sur un appui stable.
- [x] Combinaisons progressives avec leviers, lest et ponts sacrifiés.
- [x] Neige, aurores, ruines nordiques et cinq architectures distinctes.
- [x] Posture de glissade, indices et aperçu des arrêts sûrs.
- [x] Relique facultative : la Boussole polaire.

Détails : [docs/boreale.md](docs/boreale.md).


## Passages secrets — piste ouverte du 10 septembre 2026

Un ou deux niveaux par biome cachent un **escalier**. L'emprunter mène à un
passage secret, plus difficile, mieux récompensé. L'escalier n'est pas visible :
il se découvre.

- [ ] Ajouter une troisième destination au moteur, à côté de l'entrée et du
      portail : une descente, posée sous une dalle et non sur un bord.
- [ ] Cacher l'escalier derrière une découverte, sans le signaler sur le plateau.
- [ ] Écrire quatre à huit passages secrets, un ou deux par monde.
- [ ] Récompenser la descente plus que la sortie ordinaire.

### Ce que le moteur permet déjà

L'entrée et le portail sont deux sentinelles, `OUTSIDE = -1` et `FINISH = 16`,
traitées comme des cases par la recherche de chemins. Une descente serait une
troisième sentinelle du même genre : Lumen l'atteint en marchant sur la dalle
qui la porte, quand elle est ouverte. La recherche transporte déjà un sens
d'arrivée pour la glace ; elle saurait aussi porter l'état d'une découverte.

### La découverte : une gravure vue du dessus

Une pierre du plateau porte une gravure sur sa face supérieure, invisible en vue
isométrique et lisible seulement en basculant la caméra à la verticale. Amener
Lumen sur cette dalle ouvre l'escalier.

Ce choix ne demande aucune règle nouvelle : la bascule de vue existe déjà, ne
sert presque à rien, et devient un outil d'exploration. La découverte tient à
l'observation, pas à un balayage systématique ni à une manipulation arbitraire.

Une **rumeur** l'accompagne : à la sortie d'un passage qui en cache un, le carnet
note que quelque chose sonnait creux, sans jamais dire où. Un secret que personne
ne trouve n'est pas un secret, c'est du contenu perdu ; et chercher sans savoir
si l'on cherche pour rien n'est pas agréable.

### L'escalier n'engage pas

Le passage secret est une salle annexe. Une fois vidé, il rend au portail du
niveau d'origine, qu'il reste à franchir. On ne perd donc jamais sa partie en
explorant, ce qui va avec un jeu sans échec ni compte à rebours.

### La récompense

Deux gains, cumulés :

- une **pièce de boutique exclusive**, qu'on ne peut obtenir qu'ainsi — la
  boutique étant déjà le moteur de progression, c'est ce qui donne envie de
  chercher ;
- une **relique d'un rang au-dessus**, exposée à part dans le carnet.

### À préciser lors de la conception

- **Quels niveaux.** Un ou deux par monde, soit quatre à huit passages secrets.
  Plutôt des niveaux déjà maîtrisés que des niveaux d'introduction : on ne
  cherche un secret qu'une fois à l'aise avec la règle du lieu.
- **À quoi ressemble la gravure.** Assez lisible d'en haut pour être trouvée,
  assez discrète pour ne pas se remarquer de biais. À éprouver sur les quatre
  ambiances, la neige et le basalte ne portant pas une marque comme la mousse.
- **La dalle grave-t-elle, ou la case ?** Si la gravure suit la pierre quand elle
  glisse, l'escalier se déplace avec elle — ce qui ajoute un puzzle. Si elle
  appartient à la case, l'escalier reste au même endroit. La première option est
  plus riche, la seconde plus lisible.
- **Le solveur.** Les indices doivent ignorer l'escalier tant qu'il n'est pas
  découvert, sinon ils le vendent.
- **La carte.** Le passage secret apparaît-il une fois trouvé, ou reste-t-il
  absent pour ne rien divulguer aux curieux du carnet ?
