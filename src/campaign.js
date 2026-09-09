export const BIOMES = [
  {
    id: 'jungle', name: 'Jungle', world: 'I', title: 'Le sanctuaire de la jungle',
    headline: 'La jungle garde', emphasis: 'ses secrets.',
    description: 'Sous les racines et la mousse, cinq passages attendent leur prochain voyageur.',
    arrival: 'Explorer la jungle', symbol: '❧',
  },
  {
    id: 'atlantis', name: 'Atlantide', world: 'II', title: 'La cité engloutie',
    headline: 'Sous les vagues,', emphasis: 'une cité oubliée.',
    description: 'Suivez la lumière des coraux, entre colonnes brisées et sanctuaires engloutis.',
    arrival: 'Découvrir l’Atlantide', symbol: '♆',
  },
  {
    id: 'volcano', name: 'Volcan', world: 'III', title: 'Le cœur du volcan',
    headline: 'Là où la terre', emphasis: 'brûle encore.',
    description: 'Au-dessus des coulées de lave, retrouvez les cinq chemins taillés dans l’obsidienne.',
    arrival: 'Entrer dans le volcan', symbol: '△',
  },
];

export const getBiome = id => BIOMES.find(biome => biome.id === id) || BIOMES[0];
