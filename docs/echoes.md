# Les Archives des Echos

Le sixieme et dernier biome ajoute cinq expeditions, numerotees 40 a 44. Les
39 passages precedents, les stations spatiales et les lunes restent disponibles.
La campagne complete compte 44 niveaux et 32 reliques, hors salles secretes.

## Achat Du Pack

Le rayon **Expeditions** de la boutique propose le pack a **45 000 points disponibles**.
Il utilise les points du jeu uniquement, sans paiement reel. Le bouton du monde
verrouille ouvre directement ce rayon. Une confirmation affiche le debit et le
solde restant avant l'achat.

- Le solde est la somme des meilleurs scores moins les depenses deja effectuees.
- Le pack est achete une seule fois et reste lie au compte apres reconnexion.
- L'achat ne change pas la tenue equipee et ne se confond pas avec un objet cosmetique.
- La premiere Archive s'ouvre apres l'achat ; les quatre suivantes se debloquent dans l'ordre.
- Il n'est pas necessaire de terminer toute la campagne pour commencer le pack une fois achete.
- La remise a zero du carnet conserve les packs acquis, mais efface les scores et la garde-robe.

Les 39 niveaux precedents peuvent rapporter jusqu'a **85 100 points**, hors secrets.
Le plafond brut de la campagne complete est de **96 580 points**, avant toute depense.

## Resonance Temporelle

Chaque pierre porte deux configurations de chemins, l'une dans les **Ruines**,
l'autre a l'**Apogee** de la cite. Les positions et l'identite des pierres sont
communes aux deux epoques. Le changement est volontaire : rien ne se transforme
simplement parce que Lumen s'approche ou qu'une pierre glisse.

- Les chronolithes sont les petites pierres entourees d'un anneau mobile. Ils voyagent avec leur dalle.
- Lumen doit atteindre un chronolithe avant de pouvoir changer d'epoque.
- Les boutons Ruines / Apogee, ou la touche E, declenchent la resonance.
- Une resonance compte comme un deplacement. Elle ne transporte pas Lumen.
- Chaque fragment de memoire appartient a une case et a une epoque precises.
- Les fragments sont recuperes a l'arrivee reelle du personnage ; la porte attend le dernier.
- Les reliques facultatives se trouvent a l'Apogee, a l'ecart du chemin principal.
- Annuler restaure les pierres, l'epoque, les fragments, les compteurs et le trajet.

Les derniers passages demandent de revenir dans les ruines apres avoir traverse
des ponts qui n'existent plus. La derniere expedition restitue les fragments de
l'histoire de la cite.

## Passages

| Niveau | Identifiant | Nom |
| --- | --- | --- |
| 40 | `vestibule` | Le vestibule des heures |
| 41 | `palimpseste` | La galerie palimpseste |
| 42 | `revers` | Le pont des revers |
| 43 | `resonance` | La chambre de resonance |
| 44 | `anamnesis` | Le dernier souvenir |

Chaque puzzle possede une solution de reference verifiee. Le solveur d'indices
utilise ces temoins et une recherche bornee ; il ne revendique pas l'optimalite.

## Mode Developpeur

Sur le serveur local, `?dev` ouvre les cinq Archives meme sans achat et sans points.
La boutique propose aussi **Tester en mode developpeur**. L'essai d'un pack non
achete n'accorde ni propriete du pack, ni points, ni records. Le mode normal
(`?dev=off`, ou le bouton pour quitter le mode dev) retablit le verrou d'achat.
Un pack deja achete conserve son fonctionnement normal.

La connexion reste obligatoire. L'exception de test est reservee a un serveur
lie a une adresse de boucle locale et a une requete locale explicite
`X-Lumen-Dev: 1`. Un serveur lie a une interface reseau n'autorise pas ce contournement.

## Donnees Et API

- [backend/packs.py](../backend/packs.py) definit le prix et le catalogue serveur.
- `GET /api/levels` expose `packs` et le `packId` des niveaux concernes.
- `POST /api/account/pack` recoit uniquement `packId`, `revision` et `userId`.
- Le serveur verifie le solde sauvegarde, le compte actif et la revision, puis debite et accorde le pack dans une meme ecriture atomique.
- Un double clic ou une repetition apres une reponse perdue ne debite pas une seconde fois.
- Les droits sont conserves dans les metadonnees du compte, hors de la sauvegarde modifiable de la garde-robe.
- Les lectures, creations et actions des parties du pack verifient les droits, ou l'exception locale de test.
- `packPreview: true` signale un essai developpeur sans achat ; le frontend n'enregistre pas son score.

[backend/echoes.py](../backend/echoes.py) reutilise le moteur du taquin, avec un
graphe de chemins par epoque. [src/scene.js](../src/scene.js) attend les arrivees
pour activer les souvenirs. [src/echo-environment.js](../src/echo-environment.js)
fait apparaitre les arches de la cite ancienne.

Le modele existant reste celui d'un jeu local : les meilleurs scores sont calcules
par le client et sauvegardes par le serveur. L'achat verifie ce carnet sauvegarde ;
il ne constitue pas un nouveau systeme anti-triche competitif.

## Verification

```powershell
python -m unittest backend.test_echoes backend.test_accounts
node --test tests/account.test.js tests/campaign.test.js tests/echoes.test.js
node tests/shop.check.mjs
node tests/progression.check.mjs
```

Les essais navigateur couvrent l'achat, son refus sans solde, la confirmation,
la reconnexion, les deux epoques, les fragments a l'arrivee, la victoire et les
formats ordinateur/mobile. Le parcours developpeur est aussi termine avec un
compte a zero point, puis controle au retour en mode normal.
