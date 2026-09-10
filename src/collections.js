/** Editorial catalogue. Geometry is selected by model; palettes only supply its colours. */
export const RARITIES = {
  common: { name:'Classique', color:'#a5bcae', order:0 },
  rare: { name:'Rare', color:'#85cadb', order:1 },
  epic: { name:'Épique', color:'#c4a2df', order:2 },
  legendary: { name:'Légendaire', color:'#edc581', order:3 },
};
export const COLLECTIONS = [
  {id:'expedition',name:'Les origines',symbol:'⌁',color:'#d7bc88',tagline:'Les compagnons du premier voyage.'},
  {id:'faerie',name:'Clairière enchantée',symbol:'✿',color:'#efa9cd',tagline:'Des ailes de rosée. Une licorne à vos côtés.',fresh:true},
  {id:'astral',name:'Voyage astral',symbol:'☾',color:'#aeb9f3',tagline:'Emportez un morceau de ciel avec vous.',fresh:true},
  {id:'dragon',name:'Le pacte du dragon',symbol:'♜',color:'#efb083',tagline:'Écailles anciennes et petites créatures de feu.',fresh:true},
  {id:'clockwork',name:'Atelier des merveilles',symbol:'⚙',color:'#a2d7c9',tagline:'Des inventions qui ont leur propre caractère.',fresh:true},
  {id:'corsair',name:'Les mers impossibles',symbol:'⚓',color:'#8ad1df',tagline:'Bouteilles de lune et trésors des grands fonds.',fresh:true},
  {id:'arcade',name:'Rêves en pixels',symbol:'◇',color:'#d6a1eb',tagline:'Un clin d’œil aux salles d’arcade et aux héros masqués.',fresh:true},
];
const themes = [
  ['faerie',[0xf1b1d1,0xc8e9de,0xffe2a0],['Corne d’aurore','Ailes de libellule','Baguette des vœux','Licorne de poche','Pétales de rosée','Ronde des champignons','Arche de floraison','Rose des fées'],
    ['Une corne spiralée, deux oreilles et un diadème de fleurs.','Quatre ailes nervurées qui frémissent dans votre dos.','Une étoile au bout d’une branche de nacre.','Une petite licorne ailée, qui vous suit sans toucher aux pierres.','Des pétales se déposent brièvement derrière vos pas.','Un cercle de petits champignons lumineux à vos pieds.','Une couronne fleurie habille le portail de sortie.','Une veste rose tendre, brodée de crème.']],
  ['astral',[0x777ba8,0xbbcfed,0xffe0a1],['Diadème du croissant','Mante des comètes','Astrolabe de poche','Petit Saturne','Poussière d’étoiles','Orbites jumelles','Porte de l’éclipse','Bleu sidéral'],
    ['Un croissant doré flotte au-dessus d’une fine couronne.','Des pans effilés, comme les queues de trois comètes.','Un globe lumineux pris dans ses anneaux de navigation.','Une minuscule planète et sa lune tournent à vos côtés.','Un sillage de petites étoiles s’éteint après votre passage.','Deux orbites inclinées se croisent autour de vos bottes.','Une éclipse cerclée d’étoiles marque la sortie.','Une veste d’encre bleue aux coutures dorées.']],
  ['dragon',[0x71465a,0xb77b58,0xffcb76],['Couronne du wyrm','Ailes du petit dragon','Flamme captive','Dragonnet cuivré','Écailles ardentes','Sceau du wyrm','Gueule des anciens','Écarlate royal'],
    ['Deux grandes cornes recourbées encadrent une crête.','Des membranes tendues entre des doigts d’écaille.','Une flamme gardée dans la mâchoire d’un dragon sculpté.','Un dragon curieux, avec des ailes et une longue queue.','Des écailles cuivrées brillent dans vos traces.','Un cercle d’écailles et de dents, sans effet sur le jeu.','Une mâchoire monumentale encadre le portail.','Un manteau écarlate à la doublure sable.']],
  ['clockwork',[0x538c89,0xc3a06d,0xbdf5df],['Lunettes d’aéronaute','Voilure mécanique','Bobine de Tesla','Automate à ressort','Engrenages éphémères','Mécanisme orbital','Porte des horlogers','Vert de cuivre'],
    ['Deux oculaires ronds et une antenne sur un bonnet de pilote.','Deux ailes articulées autour d’un petit mécanisme de cuivre.','Une bobine de cuivre couronnée d’une sphère électrique.','Deux grands yeux, une antenne et des pieds à ressort.','De petites roues dentées restent un instant derrière vous.','Trois engrenages tournent à des vitesses différentes.','Une roue dentée anime la sortie du temple.','Une veste vert de cuivre pour les inventeurs.']],
  ['corsair',[0x364e71,0x91cbd3,0xe7c791],['Tricorne des brumes','Pavillon des étoiles','Bouteille de lune','Poulpe navigateur','Perles du large','Anneaux de marée','Roue du grand large','Indigo du capitaine'],
    ['Trois bords relevés et une broche de nacre.','Un pavillon à deux pointes, noué derrière le paquetage.','Une bouteille lumineuse suspendue à une poignée de laiton.','Un petit poulpe qui rame dans l’air avec ses tentacules.','Une poignée de perles accompagne chaque foulée.','Des vaguelettes tournent autour de vos pieds.','Une roue de navire prend place autour du portail.','Une veste indigo aux revers de perle.']],
  ['arcade',[0x7b528e,0xe895bf,0x9ff3e0],['Casque du chat cosmique','Écharpe du héros','Cœur supplémentaire','Fantôme malicieux','Pixels voyageurs','Anneau bonus','Passage 8-bits','Violet électrique'],
    ['Des oreilles triangulaires et deux grands écouteurs.','Une longue écharpe à deux rubans qui flottent derrière vous.','Un cœur lumineux en petits blocs au bout d’un bâton.','Un fantôme souriant, tout en marches d’escalier.','Des petits groupes de pixels colorés suivent vos pas.','Huit pixels tournent autour d’un anneau lumineux.','Une porte en blocs, avec un cœur au sommet.','Une veste violette au col menthe.']],
];
const slots=['hat','cape','light','pet','trail','aura','portal','coat'];
const prices=[900,1400,800,1700,350,650,1200,300];
const rarities=['rare','epic','rare','legendary','common','rare','epic','common'];
const coats=[['#bd7599','#e8b0c8','#854661'],['#4b5079','#7982ad','#30334d'],['#883d48','#b3696b','#522831'],['#456e68','#74968a','#2d4641'],['#384e71','#657f9a','#27364d'],['#774c90','#ac7abd','#4c305f']];
export const NEW_ITEMS = themes.flatMap(([theme,colors,names,stories],ti)=>slots.map((slot,i)=>{
  const [primary,secondary,accent]=colors;
  let palette={primary,secondary,accent};
  if(slot==='light') palette={...palette,outer:primary,outerGlow:primary,mid:secondary,midGlow:secondary,core:accent,coreGlow:accent,light:accent};
  if(slot==='coat') {
    const [cloth,light,dark]=coats[ti],trim=`#${accent.toString(16).padStart(6,'0')}`;
    palette={cloth,light,dark,trim,shirt:'#e8dfc6',shirtShade:'#b6ab8d',pocket:light,sleeve:cloth,sleeveLight:light,sleeveDark:dark,cuff:trim};
  }
  return {id:`${theme}-${slot}`,slot,name:names[i],story:stories[i],price:prices[i],palette,
    model:`${theme}-${slot}`,theme,collection:theme,rarity:rarities[i],fresh:true,
    ...(slot==='cape'?{bounds:[1.14,.82,.5]}:{})};
}));
