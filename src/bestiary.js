/** The bestiary: familiars, sorted into families the store can browse.
 *
 * Familiars left the combinatorial catalogue on purpose. A companion is not a
 * hat with a different palette — each one is modelled and animated on its own,
 * in `src/pets/<id>.js`, so the store can grow a real menagerie.
 */

export const PET_FAMILIES = [
  { id: 'cats', name: 'Chats', symbol: '≈', tagline: 'Ils vous suivent, mais gardent leurs distances.' },
  { id: 'dogs', name: 'Chiens', symbol: '⌇', tagline: 'Toujours devant, toujours ravis.' },
  { id: 'turtles', name: 'Tortues', symbol: '⌂', tagline: 'Sans hâte. Elles arriveront.' },
  { id: 'dragons', name: 'Dragons', symbol: '♜', tagline: 'Petits, mais convaincus du contraire.' },
  { id: 'wonders', name: 'Merveilles', symbol: '✧', tagline: 'Les compagnons venus des six collections.' },
];

/** `collection` keeps legacy familiars inside the collection that sold them. */
const ROSTER = [
  ['cat-tabby', 'cats', 'Chat tigré', 1200, 'rare',
    'Trotte à votre hauteur, s’assied dès que vous vous arrêtez, et ne cesse jamais de fouetter la queue.',
    { primary: 0xb98a52, secondary: 0xe8d6b4, accent: 0x6d4a2a, eye: 0x8fd07a }],
  ['cat-shadow', 'cats', 'Chat d’ombre', 2200, 'epic',
    'Noir de fumée, les yeux comme deux lanternes. Sa queue s’effiloche en volutes.',
    { primary: 0x2c2a35, secondary: 0x484455, accent: 0x8a7fd0, eye: 0xffd166 }],
  ['cat-lynx', 'cats', 'Lynx de brume', 3400, 'legendary',
    'Plus grand, plus lent, les oreilles couronnées de pinceaux. Il marche comme s’il chassait.',
    { primary: 0xc9c2b4, secondary: 0xf0ece0, accent: 0x6b7d84, eye: 0x76c8d8 }],

  ['dog-corgi', 'dogs', 'Corgi baroudeur', 1400, 'rare',
    'Pattes courtes, allure pressée, queue en drapeau. Il arrive toujours avant vous.',
    { primary: 0xd09a56, secondary: 0xf6ead2, accent: 0x8a5c2c, eye: 0x4a3324 }],
  ['dog-terrier', 'dogs', 'Terrier des fouilles', 1900, 'rare',
    'Hirsute et têtu. Quand vous vous arrêtez, il gratte la pierre à la recherche de quelque chose.',
    { primary: 0x9a8d76, secondary: 0xd8cfb8, accent: 0x5e5344, eye: 0x33291f }],
  ['dog-wolf', 'dogs', 'Louveteau des cimes', 3600, 'legendary',
    'Il ne trotte pas, il rôde. Le museau bas, les épaules hautes, l’œil clair.',
    { primary: 0x6f7684, secondary: 0xb9c1ca, accent: 0x39404c, eye: 0xa8d8ff }],

  ['turtle-mossback', 'turtles', 'Tortue moussue', 1100, 'rare',
    'Une carapace que la forêt a colonisée. Elle avance, à son rythme, et rentre la tête si vous courez.',
    { primary: 0x6f7a4e, secondary: 0x4d5c3a, accent: 0x9fbc63, eye: 0x2b2a20 }],
  ['turtle-gilded', 'turtles', 'Tortue dorée', 2600, 'epic',
    'Écailles serties d’or, démarche de cérémonie. Elle cligne des yeux une fois par siècle.',
    { primary: 0xb08a3e, secondary: 0x6a5326, accent: 0xf0d78a, eye: 0x3a2c14 }],
  ['turtle-isle', 'turtles', 'Tortue-île', 4200, 'legendary',
    'Un arbrisseau pousse sur sa carapace, et une minuscule cascade en descend.',
    { primary: 0x5d6b62, secondary: 0x3f4b45, accent: 0x86c9a8, eye: 0x24302b }],

  ['dragon-ember', 'dragons', 'Dragonneau de braise', 3200, 'epic',
    'Il vole en battant fort, souffle de temps en temps, et retombe toujours un peu trop bas.',
    { primary: 0xa8452f, secondary: 0xe27a3c, accent: 0xffc46b, eye: 0xffe9a8 }],
  ['dragon-frost', 'dragons', 'Dragon de givre', 4400, 'epic',
    'Des ailes de cristal qui tintent. Il laisse une buée froide derrière lui.',
    { primary: 0x6fa8c4, secondary: 0xd6f0fa, accent: 0xa8e4ff, eye: 0xeaf8ff }],
  ['dragon-jade', 'dragons', 'Wyrm de jade', 6200, 'legendary',
    'Sans ailes : il nage dans l’air en ondulant, long comme une phrase.',
    { primary: 0x4f8f6a, secondary: 0x2f5c45, accent: 0xc9e8a8, eye: 0xffd166 }],

  ['faerie-pet', 'wonders', 'Licorne de poche', 1700, 'legendary',
    'Une petite licorne ailée, qui vous suit sans jamais toucher les pierres.',
    { primary: 0xf1b1d1, secondary: 0xc8e9de, accent: 0xffe2a0, eye: 0x7a5c8a }, 'faerie'],
  ['astral-pet', 'wonders', 'Petit Saturne', 1700, 'legendary',
    'Une minuscule planète et sa lune, qui tournent à vos côtés.',
    { primary: 0x8f9bd8, secondary: 0xc3cbf2, accent: 0xffe9b0, eye: 0xffffff }, 'astral'],
  ['dragon-pet', 'wonders', 'Dragonnet cuivré', 1700, 'legendary',
    'Écailles de cuivre et braises dans la gorge, à peine plus gros qu’un chat.',
    { primary: 0x71465a, secondary: 0xb77b58, accent: 0xffcb76, eye: 0xffdca0 }, 'dragon'],
  ['clockwork-pet', 'wonders', 'Automate à ressort', 1700, 'legendary',
    'Deux grands yeux, une antenne, et des pieds à ressort qui ne tiennent pas en place.',
    { primary: 0x7fb8a8, secondary: 0xa2d7c9, accent: 0xffe1a8, eye: 0x2f4a44 }, 'clockwork'],
  ['corsair-pet', 'wonders', 'Poulpe navigateur', 1700, 'legendary',
    'Il rame dans l’air avec ses tentacules, une étoile de mer sur le front.',
    { primary: 0x5f8fa8, secondary: 0x8ad1df, accent: 0xffd9b0, eye: 0x24343d }, 'corsair'],
  ['arcade-pet', 'wonders', 'Fantôme malicieux', 1700, 'legendary',
    'Tout en marches d’escalier, il sourit et traverse les murs qu’il n’y a pas.',
    { primary: 0xb47fd0, secondary: 0xd6a1eb, accent: 0xfff0ff, eye: 0x2b2138 }, 'arcade'],
];

export const BESTIARY = ROSTER.map(([id, family, name, price, rarity, story, palette, collection]) => ({
  id, slot: 'pet', family, name, price, rarity, story,
  // Palettes hold colours only; `resolveLook` supplies the id that selects the model.
  palette,
  creature: id,
  collection: collection || 'bestiaire',
  fresh: true,
}));

export const BESTIARY_BY_FAMILY = PET_FAMILIES.map(family => ({
  ...family,
  items: BESTIARY.filter(item => item.family === family.id),
}));
