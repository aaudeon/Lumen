/** Registry of familiars. One module per creature, one entry here.
 *
 * A builder receives (tools, root, palette) and returns a spec:
 *   { ground, home:[x,y,z], scale?, animate(time, {moving, speed, footfall, dt}) }
 * The rig owns placement and the follow-lag; the creature owns its own body.
 */
import catTabby from './cat-tabby.js';
import catShadow from './cat-shadow.js';
import catLynx from './cat-lynx.js';
import dogCorgi from './dog-corgi.js';
import dogTerrier from './dog-terrier.js';
import dogWolf from './dog-wolf.js';
import turtleMossback from './turtle-mossback.js';
import turtleGilded from './turtle-gilded.js';
import turtleIsle from './turtle-isle.js';
import dragonEmber from './dragon-ember.js';
import dragonFrost from './dragon-frost.js';
import dragonJade from './dragon-jade.js';
import faeriePet from './faerie-pet.js';
import astralPet from './astral-pet.js';
import dragonPet from './dragon-pet.js';
import clockworkPet from './clockwork-pet.js';
import corsairPet from './corsair-pet.js';
import arcadePet from './arcade-pet.js';

export const PETS = {
  'cat-tabby': catTabby,
  'cat-shadow': catShadow,
  'cat-lynx': catLynx,
  'dog-corgi': dogCorgi,
  'dog-terrier': dogTerrier,
  'dog-wolf': dogWolf,
  'turtle-mossback': turtleMossback,
  'turtle-gilded': turtleGilded,
  'turtle-isle': turtleIsle,
  'dragon-ember': dragonEmber,
  'dragon-frost': dragonFrost,
  'dragon-jade': dragonJade,
  'faerie-pet': faeriePet,
  'astral-pet': astralPet,
  'dragon-pet': dragonPet,
  'clockwork-pet': clockworkPet,
  'corsair-pet': corsairPet,
  'arcade-pet': arcadePet,
};

export function buildCreature(tools, root, palette) {
  const build = PETS[palette?.creature || palette?.id];
  return build ? build(tools, root, palette) : null;
}
