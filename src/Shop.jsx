import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGUE, COLLECTIONS, DEFAULT_LOOK, ITEMS, RARITIES, SLOTS, browseCatalogue, owns } from './cosmetics.js';
import { PET_FAMILIES } from './bestiary.js';
import { walletTotal } from './score.js';
import { createExplorerPreview } from './preview.js';
import { photographItems } from './thumbnails.js';
import './shop.css';

const points = value => value.toLocaleString('fr-FR');
const collectionById = Object.fromEntries(COLLECTIONS.map(collection => [collection.id, collection]));
const petFamilyById = Object.fromEntries(PET_FAMILIES.map(family => [family.id, family]));
/** A familiar answers for its species; everything else for its collection. */
const originOf = piece => (piece.slot === 'pet' && petFamilyById[piece.family])
  || collectionById[piece.collection]
  || { id: 'bestiaire', name: 'Le bestiaire', symbol: '❉', color: '#dfc88f' };
const slotName = Object.fromEntries(CATALOGUE.map(group => [group.slot, group.title]));
const ensemble = collection => Object.fromEntries(Object.values(ITEMS).filter(item => item.collection === collection && item.fresh).map(item => [item.slot, item.id]));
/** The piece the store opens on: one the explorer actually wears, so the card on the left
 *  and the figure above it tell the same story. A bought piece if there is one, else the
 *  hat of the first day. */
const wornPiece = equipped => (SLOTS.map(slot => ITEMS[equipped[slot]]).find(piece => piece?.price > 0)
  || ITEMS[equipped.hat] || ITEMS[DEFAULT_LOOK.hat]).id;

function ExplorerStage({ look, slot, walking, biome, reaction }) {
  const host = useRef(null), view = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try { view.current = createExplorerPreview(host.current, { style: look, biome }); }
    catch { setFailed(true); }
    return () => { view.current?.dispose(); view.current = null; };
  }, [biome]);
  useEffect(() => { view.current?.setStyle(look); }, [look]);
  useEffect(() => { view.current?.focusSlot(slot); }, [slot]);
  useEffect(() => { view.current?.setWalking(walking); }, [walking]);
  useEffect(() => { if (reaction) view.current?.react(reaction.kind); }, [reaction]);
  return <div className="atelier-stage" ref={host} aria-label="Aperçu animé de votre tenue. Faites glisser pour tourner.">{failed && <p>L’aperçu 3D est indisponible sur cet appareil. Les objets restent consultables et équipables.</p>}</div>;
}

export default function Shop({ wardrobe, credits, progress, biome, onBuy, onEquip, onClose }) {
  const equipped = useMemo(() => ({ ...DEFAULT_LOOK, ...wardrobe?.equipped }), [wardrobe?.equipped]);
  const [collection, setCollection] = useState('faerie');
  // The menagerie gets its own room: families of creatures, not collections of clothes.
  const [bestiary, setBestiary] = useState(false), [petFamily, setPetFamily] = useState('all');
  const [slot, setSlot] = useState('all'), [rarity, setRarity] = useState('all');
  const [ownership, setOwnership] = useState('all'), [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured'), [freshOnly, setFreshOnly] = useState(false);
  const [page, setPage] = useState(1), [selected, setSelected] = useState(() => wornPiece(equipped));
  // The changing room opens on the outfit you are wearing. Nothing is tried on until you
  // ask for it, and a trial is never saved.
  const [trial, setTrial] = useState({});
  const [reaction, setReaction] = useState(null);
  const [walking, setWalking] = useState(true), [detail, setDetail] = useState(false);
  const [note, setNote] = useState(''), [thumbnails, setThumbnails] = useState({});
  const dialog = useRef(null), close = useRef(null);
  const look = useMemo(() => ({ ...equipped, ...trial }), [equipped, trial]);
  const item = ITEMS[selected], family = originOf(item);
  const held = owns(wardrobe, item.id), worn = equipped[item.slot] === item.id;
  const result = bestiary
    ? browseCatalogue({ slot: 'pet', family: petFamily, rarity, ownership, query, sort, page, pageSize: 6, freshOnly, wardrobe, balance: credits })
    : browseCatalogue({ collection, slot, rarity, ownership, query, sort, page, pageSize: 6, freshOnly, wardrobe, balance: credits });
  const pageKey = result.items.map(piece => piece.id).join('|');
  const isTrying = Object.keys(trial).some(key => trial[key] !== equipped[key]);
  const petCount = useMemo(() => Object.values(ITEMS).filter(piece => piece.slot === 'pet' && piece.price > 0).length, []);

  useEffect(() => { setPage(1); }, [collection, slot, rarity, ownership, query, sort, freshOnly, bestiary, petFamily]);
  useEffect(() => {
    // One small contact sheet per page; finished images are cached between visits.
    const task = requestAnimationFrame(() => {
      try { setThumbnails(photographItems(pageKey ? pageKey.split('|').map(id => ITEMS[id]) : [])); }
      catch { setThumbnails({}); }
    });
    return () => cancelAnimationFrame(task);
  }, [pageKey]);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const stops = [...dialog.current.querySelectorAll('button:not(:disabled), input, select, summary')].filter(el => el.getClientRects().length);
      const edge = event.shiftKey ? stops[0] : stops.at(-1);
      if (document.activeElement === edge) { event.preventDefault(); (event.shiftKey ? stops.at(-1) : stops[0])?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, []);

  function tryItem(piece) {
    setReaction(null);
    setSelected(piece.id);
    setTrial(previous => ({ ...previous, [piece.slot]: piece.id }));
    setNote('');
    if (piece.slot === 'trail') setWalking(true);
    if (bestiary && piece.slot === 'pet') { setDetail(true); setWalking(true); }
  }
  function openBestiary() {
    // Your own companion greets you here. One you do not have waits on its card to be tried.
    const own = equipped.pet !== 'pet-none';
    const pet = bestiary && item.slot === 'pet' && item.price ? item.id : own ? equipped.pet : 'cat-tabby';
    setBestiary(true); setPetFamily('all'); setQuery(''); setRarity('all'); setOwnership('all'); setFreshOnly(false);
    setSelected(pet); setTrial({}); setDetail(own); setWalking(true); setNote('');
  }
  function choosePetFamily(id) {
    setPetFamily(id);
    const first=Object.values(ITEMS).find(piece=>piece.family===id);
    if(first)tryItem(first);
  }
  function showReaction(kind) {
    tryItem(item); setDetail(true); setWalking(false);
    setReaction({ kind });
  }
  function resetFilters() {
    setCollection('all'); setSlot('all'); setRarity('all'); setOwnership('all'); setQuery(''); setFreshOnly(false);
    // Clearing filters inside the menagerie keeps you in the menagerie.
    setPetFamily('all');
  }
  function acquire() {
    if (held) { onEquip?.(item.id); setNote(`${item.name} équipé. Les autres essais ne sont pas enregistrés.`); }
    else {
      const purchase = onBuy?.(item.id);
      setNote(purchase?.ok ? `${item.name} acheté et équipé. Les autres essais ne sont pas enregistrés.` : purchase?.reason || 'L’achat n’a pas pu aboutir.');
    }
  }

  return <div className="atelier-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`atelier ${bestiary ? 'atelier-menagerie' : ''}`} role="dialog" aria-modal="true" aria-labelledby="atelier-title" ref={dialog} style={{ '--collection': family.color || '#dfc88f' }}>
      <header className="atelier-header">
        <div><p className="atelier-eyebrow">LA BOUTIQUE DE L’EXPÉDITION</p><h2 id="atelier-title">{bestiary ? <>La ménagerie<span>.</span></> : <>Le cabinet des merveilles<span>.</span></>}</h2><p>{bestiary ? `${petCount} familiers · ${PET_FAMILIES.length} familles · chacun son caractère` : `${Object.keys(ITEMS).length} pièces · ${COLLECTIONS.length} collections · essayage gratuit`}</p></div>
        <div className="atelier-purse"><small>CRÉDITS DISPONIBLES</small><strong>✦ {points(credits)}</strong><span>Portefeuille : {points(walletTotal(progress))} pts</span></div>
        <button ref={close} className="atelier-close" onClick={onClose} aria-label="Fermer la boutique">×</button>
      </header>

      <nav className="atelier-rooms" aria-label="Rayons de la boutique">
        <button aria-pressed={!bestiary} onClick={() => { setBestiary(false); setDetail(false); setQuery(''); setRarity('all'); setOwnership('all'); }}><span>✧</span> Tenues & effets</button>
        <button aria-pressed={bestiary} onClick={openBestiary}><span>❉</span> Familiers <em>{petCount}</em></button>
      </nav>
      {!bestiary && <nav className="atelier-collections" aria-label="Collections de la boutique">
        <button aria-pressed={!bestiary && collection === 'all'} onClick={() => { setBestiary(false); setCollection('all'); }}><span aria-hidden="true">✧</span>Toutes les pièces</button>
        {COLLECTIONS.map(family => <button key={family.id} aria-pressed={!bestiary && collection === family.id} onClick={() => { setBestiary(false); setCollection(family.id); }} style={{ '--tab-color': family.color }}><span aria-hidden="true">{family.symbol}</span>{family.name}</button>)}
      </nav>}

      {bestiary && <nav className="atelier-families" aria-label="Familles de familiers">
        <button aria-pressed={petFamily === 'all'} onClick={() => setPetFamily('all')}><b aria-hidden="true">❉</b><span>Tout le bestiaire</span><small>{petCount} compagnons</small></button>
        {PET_FAMILIES.map(kin => <button key={kin.id} aria-pressed={petFamily === kin.id} onClick={() => choosePetFamily(kin.id)}>
          <b aria-hidden="true">{kin.symbol}</b><span>{kin.name}</span><small>{kin.tagline}</small>
        </button>)}
      </nav>}

      <div className="atelier-body">
        <section className="atelier-preview" aria-label="Cabine d’essayage">
          <div className="atelier-stage-heading"><span>{isTrying ? 'ESSAYAGE LIBRE' : 'VOTRE TENUE'}</span><button onClick={() => { setTrial({}); setDetail(false); setNote('Votre tenue équipée a été restaurée dans l’aperçu.'); }}>Ma tenue ↺</button></div>
          <div className="atelier-halo" aria-hidden="true"/>
          <ExplorerStage look={look} slot={detail ? item.slot : null} walking={walking} biome={biome} reaction={reaction}/>
          <div className="atelier-stage-controls"><button aria-label={walking ? 'Arrêter la marche' : 'Faire marcher l’aventurier'} aria-pressed={walking} onClick={() => setWalking(!walking)}>{walking ? 'Ⅱ Pause' : '▷ Marcher'}</button><button aria-label={detail ? 'Voir la tenue complète' : 'Voir le détail de la pièce'} aria-pressed={detail} onClick={() => setDetail(!detail)}>{detail ? '↗ Ensemble' : '⌕ Détail'}</button></div>
          {bestiary && item.slot === 'pet' && item.price > 0 && <div className="atelier-reactions" role="group" aria-label="Faire réagir le familier">
            <span>UN PEU DE CARACTÈRE</span>
            <div>{[['curious', '✧ Curiosité'], ['danger', '! Danger'], ['victory', '♡ Joie']].map(([kind, label]) => <button key={kind} onClick={() => showReaction(kind)}>{label}</button>)}</div>
          </div>}
          <p className="atelier-drag">{bestiary ? 'Faites glisser pour tourner · Pause montre son comportement au repos' : 'Faites glisser pour tourner · les essais ne sont pas sauvegardés'}</p>
          <div className="atelier-selection">
            <p className="atelier-family">{family.symbol} {family.name} <span style={{ color: RARITIES[item.rarity].color }}>{RARITIES[item.rarity].name}</span></p>
            <h3>{item.name}</h3><p className="atelier-story">{item.story}</p>
            <div className="atelier-selected-price"><span>{slotName[item.slot]}</span><strong>{held ? worn ? 'Déjà équipé' : 'Dans votre collection' : `✦ ${points(item.price)}`}</strong></div>
            <button className="atelier-buy" disabled={worn || !held && credits < item.price} onClick={acquire}>{worn ? 'Équipé' : held ? 'Équiper cette pièce' : credits < item.price ? `Il manque ${points(item.price - credits)} crédits` : `Acheter et équiper · ${points(item.price)}`}</button>
            {item.fresh && item.slot !== 'pet' && <button className="atelier-ensemble" onClick={() => { setTrial(previous => ({ ...previous, ...ensemble(item.collection) })); setDetail(false); setNote(`Collection ${family.name} à l’essai. Aucun achat effectué.`); }}>Essayer toute la collection <span>→</span></button>}
            <p className="atelier-note" role="status">{note || (bestiary ? 'Il réagit aux trésors, aux dangers et à vos victoires. Essayage gratuit.' : 'Associez les collections pour inventer votre propre aventurier.')}</p>
          </div>
        </section>

        <section className="atelier-catalogue" aria-label="Catalogue des objets">
          <div className="atelier-filters">
            <label className="atelier-search"><span>{bestiary ? 'Chercher un compagnon' : 'Rechercher une merveille'}</span><input type="search" placeholder={bestiary ? 'Chat, tortue, dragon…' : 'Licorne, dragon, étoiles…'} value={query} onChange={event => setQuery(event.target.value)}/></label>
            {!bestiary && <label><span>Emplacement</span><select value={slot} onChange={event => setSlot(event.target.value)}><option value="all">Tous les objets</option>{CATALOGUE.map(group => <option key={group.slot} value={group.slot}>{group.title}</option>)}</select></label>}
            <label><span>Rareté</span><select value={rarity} onChange={event => setRarity(event.target.value)}><option value="all">Toutes les raretés</option>{Object.entries(RARITIES).map(([id, rarity]) => <option key={id} value={id}>{rarity.name}</option>)}</select></label>
            <label><span>Votre collection</span><select value={ownership} onChange={event => setOwnership(event.target.value)}><option value="all">Toutes les pièces</option><option value="owned">Possédées</option><option value="missing">À découvrir</option><option value="affordable">À votre portée</option></select></label>
            <label><span>Trier par</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Nouveautés d’abord</option><option value="price">Prix croissant</option><option value="rarity">Rareté</option><option value="name">Nom</option></select></label>
          </div>
          <div className="atelier-results"><span role="status">{result.total} pièce{result.total > 1 ? 's' : ''}</span><label><input type="checkbox" checked={freshOnly} onChange={event => setFreshOnly(event.target.checked)}/> Nouveautés</label><button onClick={resetFilters}>Tout afficher</button></div>
          <div className="atelier-grid">
            {result.items.map(piece => <button key={piece.id} className="atelier-item" aria-pressed={piece.id === selected} aria-label={`Essayer ${piece.name}, ${owns(wardrobe, piece.id) ? 'possédé' : `${points(piece.price)} crédits`}`} onClick={() => tryItem(piece)} style={{ '--rarity': RARITIES[piece.rarity].color }}>
              <span className="atelier-item-top"><small>{slotName[piece.slot]}</small>{piece.fresh && <em>NOUVEAU</em>}</span>
              <span className="atelier-thumbnail">{thumbnails[piece.id] ? <img src={thumbnails[piece.id]} alt=""/> : <span aria-hidden="true">{piece.price ? originOf(piece).symbol : '—'}</span>}</span>
              <strong>{piece.name}</strong><span className="atelier-item-bottom"><small>{RARITIES[piece.rarity].name}</small><b>{equipped[piece.slot] === piece.id ? '✓ Équipé' : owns(wardrobe, piece.id) ? '✓ Possédé' : `✦ ${points(piece.price)}`}</b></span>
            </button>)}
            {!result.total && <div className="atelier-empty"><span>⌕</span><h3>Aucune merveille par ici.</h3><p>Essayez un autre mot ou élargissez vos filtres.</p><button onClick={resetFilters}>Voir toutes les pièces</button></div>}
          </div>
          <nav className="atelier-pagination" aria-label="Pages du catalogue"><button disabled={result.page === 1} onClick={() => setPage(result.page - 1)} aria-label="Page précédente">←</button><span>Page <strong>{result.page}</strong> sur {result.pages}</span><button disabled={result.page === result.pages} onClick={() => setPage(result.page + 1)} aria-label="Page suivante">→</button></nav>
          <details className="atelier-economy"><summary>Comment gagner des crédits ?</summary><p>Terminez de nouveaux passages ou améliorez vos meilleurs scores. Rejouer sans battre son record ne rapporte pas de crédits supplémentaires. Votre portefeuille conserve tous vos points ; seul le solde disponible baisse lors d’un achat.</p><p>Choisissez vos pièces préférées : la campagne ne finance pas le catalogue entier. Les raretés sont fixes, sans tirage au sort. Tout peut être essayé gratuitement.</p></details>
        </section>
      </div>
      <footer className="atelier-footer"><span>✧ Des merveilles pour le plaisir.</span> Aucun objet ne modifie les règles, la difficulté ou les records.</footer>
    </section>
  </div>;
}
