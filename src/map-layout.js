export const MAP_REGIONS = {
  jungle: {
    route: [[210, 745], [490, 720], [785, 750], [765, 530], [485, 510], [215, 540], [240, 320], [515, 305], [790, 315], [510, 140]],
  },
  atlantis: {
    route: [[190, 740], [500, 740], [800, 600], [550, 440], [220, 440], [350, 200], [720, 180]],
  },
  volcano: {
    route: [[210, 740], [200, 510], [240, 280], [500, 160], [790, 280], [790, 520], [580, 740]],
  },
  boreal: {
    route: [[230, 760], [650, 620], [350, 450], [710, 300], [500, 140]],
  },
};

/** Les bornes HTML et le chemin peint partagent le meme repere, meme apres un ajout de niveaux. */
export function mapStops(biomeId, count) {
  const route = (MAP_REGIONS[biomeId] || MAP_REGIONS.jungle).route;
  if (count <= 0) return [];
  if (count === 1) return [{ x: route[0][0], y: route[0][1] }];
  return Array.from({ length: count }, (_, index) => {
    const position = index * (route.length - 1) / (count - 1);
    const segment = Math.min(Math.floor(position), route.length - 2);
    const fraction = position - segment;
    const start = route[segment];
    const end = route[segment + 1];
    return { x: start[0] + (end[0] - start[0]) * fraction, y: start[1] + (end[1] - start[1]) * fraction };
  });
}

const smoothStep = (low, high, value) => {
  const fraction = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return fraction * fraction * (3 - 2 * fraction);
};

/** Un relief deterministe permet au decor et aux bornes de partager exactement le meme sol. */
export function terrainHeight(biome, horizontal, vertical) {
  const ripple = Math.sin(horizontal * .027 + Math.cos(vertical * .018)) * .035
    + Math.sin(vertical * .043 + horizontal * .016) * .021;
  const ellipse = (centerX, centerY, radiusX, radiusY) => Math.hypot((horizontal - centerX) / radiusX, (vertical - centerY) / radiusY);
  let coast;
  let height;
  if (biome === 'atlantis') {
    coast = Math.min(...MAP_REGIONS.atlantis.route.map(([centerX, centerY], index) =>
      ellipse(centerX, centerY, index === 6 ? 160 : 128, index === 6 ? 125 : 102))) + ripple * 2;
    height = .28 + .3 * Math.sin(horizontal * .015) ** 2;
  } else if (biome === 'volcano') {
    coast = ellipse(505, 450, 425, 390) + ripple;
    const crater = ellipse(515, 425, 210, 205);
    const rim = Math.exp(-(((crater - 1.03) / .3) ** 2));
    height = .38 + rim * 2.4 + .2 * Math.sin(horizontal * .026 + vertical * .018);
    height *= smoothStep(.45, .82, crater);
    if (crater < .5) height = -.3;
    const breach = Math.abs(horizontal - (520 + (vertical - 440) * .5));
    if (vertical > 470 && breach < 22) height = Math.min(height, .05);
  } else if (biome === 'boreal') {
    coast = Math.min(...MAP_REGIONS.boreal.route.map(([centerX, centerY]) => ellipse(centerX, centerY, 190, 153))) + ripple * 1.8;
    const ridge = Math.exp(-(((horizontal - 480 - Math.sin(vertical * .011) * 110) / 110) ** 2));
    height = .48 + ridge * (1.4 + .7 * Math.sin(vertical * .021) ** 2);
  } else {
    coast = ellipse(505, 450, 425, 390) + ripple
      + Math.sin(Math.atan2(vertical - 450, horizontal - 505) * 5) * .055;
    height = .52 + .32 * Math.sin(horizontal * .009) * Math.cos(vertical * .014)
      + Math.exp(-((horizontal - 530) ** 2 + (vertical - 175) ** 2) / 25000) * 1.2;
    const river = Math.abs(horizontal - (365 + Math.sin(vertical * .013) * 54));
    if (vertical > 370 && vertical < 730) height *= smoothStep(10, 31, river);
  }
  const arrivals = (MAP_REGIONS[biome] || MAP_REGIONS.jungle).route;
  coast = Math.min(coast, ...arrivals.map(([centerX, centerY]) => ellipse(centerX, centerY, 95, 82)));
  return -.65 + (1 - smoothStep(.88, 1.06, coast)) * (height + .65);
}