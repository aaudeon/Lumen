import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createGameScene } from './scene.js';
import { GameAudio } from './audio.js';
import HomeScreen from './HomeScreen.jsx';
import { BIOMES, getBiome } from './campaign.js';
import { directionalDestination } from './motion.js';
import { getBoardProfile } from './boards.js';

function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
    undo: <><path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14" /></>,
    reset: <><path d="M4 8a9 9 0 1 1-1 8M4 3v5h5" /></>,
    bulb: <><path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7M8 17h8M9 21h6" /><path d="M12 6v5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h7v7h-7z" opacity=".35"/></>,
    foot: <><path d="m9 11-3-1c-3-1-4 4-2 5l3 2c3 1 4-4 2-6ZM16 5l-3-1c-3-1-4 4-2 5l3 2c3 1 4-4 2-6Z"/><path d="m4 19 2 1m6-7 2 1m4-11 2 2" /></>,
    volume: <><path d="M3 9h4l5-4v14l-5-4H3zM16 8a6 6 0 0 1 0 8M19 4a11 11 0 0 1 0 16"/></>,
    mute: <><path d="M3 9h4l5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 3M12 17v.1"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    diamond: <><path d="m12 2 8 10-8 10-8-10Z"/><path d="M12 7v10m-4-5h8"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.diamond}</svg>;
}

async function api(path, body) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Le serveur local ne répond pas.');
  return data;
}
function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing can disable storage. */ } }

function Dialog({ children, onClose, title }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.querySelector('button')?.focus();
    function handle(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
        const first = buttons[0]; const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('keydown', handle); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-scrim" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
      <button className="icon-button close-dialog" onClick={onClose} aria-label="Fermer"><Icon name="close" /></button>
      {children}
    </section>
  </div>;
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [levels, setLevels] = useState([]);
  const [game, setGame] = useState(null);
  const [mode, setMode] = useState('slide');
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('Les ruines s’éveillent…');
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(-2);
  const [selected, setSelected] = useState(-2);
  const [view, setView] = useState('iso');
  const [modal, setModal] = useState(null);
  const [sound, setSound] = useState(false);
  const [progress, setProgress] = useState(() => readSaved('lumen-progress', {}));
  const [ready, setReady] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [winDismissed, setWinDismissed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [slideChoice, setSlideChoice] = useState(-1);
  const sceneHost = useRef(null);
  const scene = useRef(null);
  const audio = useRef(null);
  const live = useRef({});
  const busyRef = useRef(true);
  const requestInFlight = useRef(true);
  const alive = useRef(true);
  const pauseStarted = useRef(Date.now());
  const level = levels.find(l => l.id === game?.levelId);
  const biome = getBiome(level?.biome);
  const boardProfile = getBoardProfile(game?.levelId);
  const worldLevels = levels.filter(item => item.biome === biome.id);
  const chapter = Math.max(0, levels.findIndex(l => l.id === game?.levelId));
  const closeModal = useCallback(() => setModal(null), []);

  function setWorking(value) { busyRef.current = value; setBusy(value); }
  function persist(next) {
    setGame(next);
    save('lumen-session', next.id);
    save('lumen-level', next.levelId);
    if (next.won) {
      setProgress(previous => {
        const best = previous[next.levelId];
        const updated = { ...previous, [next.levelId]: { moves: Math.min(best?.moves ?? Infinity, next.moves), completed: true } };
        save('lumen-progress', updated);
        return updated;
      });
    }
  }
  async function loadLevel(levelId) {
    if (busyRef.current) return;
    setWorking(true);
    requestInFlight.current = true;
    setError(''); setModal(null); setSelected(-2); setSlideChoice(-1); setWinDismissed(false);
    try {
      const next = await api('/api/game', { levelId });
      requestInFlight.current = false;
      persist(next); setMode('slide'); setStartedAt(Date.now()); setElapsed(0);
      setNotice(levels.find(item => item.id === levelId)?.mechanic?.text || 'Déplacez une dalle voisine de la case vide pour ouvrir le chemin.');
      return true;
    } catch (err) { setNotice(err.message); return false; }
    finally { requestInFlight.current = false; setWorking(false); }
  }
  function returnToMap() {
    if (busyRef.current) return;
    pauseStarted.current = Date.now();
    setModal(null); setScreen('home');
  }
  async function startExpedition(levelId) {
    if (busyRef.current) return;
    if (game?.levelId !== levelId || game?.won) {
      if (!await loadLevel(levelId)) return;
    } else if (pauseStarted.current !== null) {
      setStartedAt(previous => previous + Date.now() - pauseStarted.current);
    }
    pauseStarted.current = null;
    setScreen('game');
  }
  async function act(type, index, to) {
    if (busyRef.current || !live.current.game) return;
    if (live.current.game.won && !['undo', 'reset'].includes(type)) return;
    setWorking(true);
    requestInFlight.current = true;
    setSelected(-2);
    setSlideChoice(-1);
    try {
      const next = await api('/api/action', { gameId: live.current.game.id, type, ...(index === undefined ? {} : { index }), ...(to === undefined ? {} : { to }) });
      if (!alive.current) return;
      requestInFlight.current = false;
      setAnimating(Boolean(next.walkPath?.length));
      persist(next);
      setNotice(next.hint?.text || next.message || (type === 'slide' ? 'La pierre glisse. Un nouveau chemin se dessine.' : 'À vous de tracer la suite.'));
      if (!next.walkPath?.length) audio.current?.play(type === 'hint' ? 'hint' : 'slide');
      if (type === 'reset') { setStartedAt(Date.now()); setElapsed(0); setWinDismissed(false); }
      if (!next.won) setWinDismissed(false);
      if (!scene.current) setWorking(false);
    } catch (err) {
      if (!alive.current) return;
      requestInFlight.current = false;
      setNotice(err.message); audio.current?.play('error'); setWorking(false);
    }
  }
  function handleTile(index) {
    const current = live.current;
    if (busyRef.current || !current.game) return;
    if (index >= 0 && index < 16 && !current.game.tiles[index]) {
      if (current.slideChoice >= 0 && current.game.slideOptions?.some(option => option.index === current.slideChoice && option.to === index)) {
        act('slide', current.slideChoice, index);
      } else setNotice('Choisissez d’abord une dalle voisine, puis le vide où la glisser.');
      return;
    }
    if (index === current.game?.hero) {
      setNotice('L’aventurier occupe cette dalle : faites-le avancer pour la libérer.');
      audio.current?.play('error'); return;
    }
    if (index === 16 || index === -1) act('walk', index);
    else if (current.mode === 'slide') {
      const choices = current.game.slideOptions?.filter(option => option.index === index) || [];
      if (choices.length > 1) {
        setSelected(index); setSlideChoice(index);
        setNotice('Plusieurs vides sont voisins : choisissez celui où glisser cette dalle.');
      } else act('slide', index, choices[0]?.to);
    } else act('walk', index);
  }
  function switchMode(next) {
    setMode(next);
    setSelected(-2);
    setSlideChoice(-1);
    setNotice(next === 'slide' ? 'Cliquez sur une dalle éclairée, voisine d’un vide.' : 'Choisissez une dalle stable : Lumen suit le trajet sûr et traverse les fissures sans s’arrêter.');
  }
  async function toggleSound() {
    const enabled = await audio.current?.setEnabled(!live.current.sound);
    setSound(Boolean(enabled));
  }
  live.current = { game, mode, modal, sound, selected, slideChoice, act, handleTile, switchMode, toggleSound, screen };

  useEffect(() => {
    alive.current = true;
    audio.current = new GameAudio();
    async function init() {
      try {
        const data = await api('/api/levels');
        if (!alive.current) return;
        setLevels(data.levels);
        const storedLevel = readSaved('lumen-level', data.levels[0].id);
        const levelId = data.levels.some(l => l.id === storedLevel) ? storedLevel : data.levels[0].id;
        let next;
        const savedId = readSaved('lumen-session', null);
        if (savedId) {
          try { next = await api(`/api/game?id=${encodeURIComponent(savedId)}`); } catch { /* Sessions expire when Python restarts. */ }
        }
        if (!next) next = await api('/api/game', { levelId });
        if (!alive.current) return;
        requestInFlight.current = false;
        persist(next);
        setNotice(data.levels.find(item => item.id === next.levelId)?.mechanic?.text || 'Un passage manque. Faites glisser une dalle vers la case vide.');
        setWorking(false);
      } catch {
        requestInFlight.current = false;
        setError('Le jeu attend son serveur Python. Lancez « Lancer-le-jeu.cmd », puis rechargez cette page.');
        setWorking(false);
      }
    }
    init();
    try {
      scene.current = createGameScene(sceneHost.current, {
        onTile: index => live.current.handleTile(index),
        onHover: setHovered,
        onFootfall: () => audio.current?.play('walk'),
        onCollapse: () => audio.current?.play('collapse'),
        onVictory: () => audio.current?.play('win'),
        onOrbit: () => setView('free'),
        onReady: () => setReady(true),
        onSettled: () => { if (alive.current && !requestInFlight.current) { setWorking(false); setAnimating(false); } },
        onError: setError,
      });
    } catch {
      setError('Le rendu 3D nécessite WebGL. Activez l’accélération graphique du navigateur puis rechargez la page.');
    }
    return () => { alive.current = false; scene.current?.dispose(); audio.current?.dispose(); };
  }, []);
  useEffect(() => { scene.current?.update(game, mode, selected); }, [game, mode, selected]);
  useEffect(() => { scene.current?.setActive(screen === 'game'); }, [screen]);
  useEffect(() => { scene.current?.setView(view); }, [view]);
  useEffect(() => {
    if (game?.won || screen !== 'game') return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt, game?.won, screen]);
  useEffect(() => {
    function keydown(event) {
      const current = live.current;
      if (current.screen !== 'game' || current.modal || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (event.target.closest('button') && ['Enter', ' '].includes(event.key)) return;
      const key = event.key.toLowerCase();
      if ([' ', 'enter', 'z', 'r', 'h', 'm', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      if (event.repeat || busyRef.current) return;
      if (key === ' ') current.switchMode(current.mode === 'slide' ? 'walk' : 'slide');
      else if (key === 'z') current.act('undo');
      else if (key === 'r') current.act('reset');
      else if (key === 'h') current.act('hint');
      else if (key === 'm') current.toggleSound();
      else if (key === 'enter') {
        if (current.selected >= 0 && current.mode === 'slide') current.handleTile(current.selected);
        else current.act('walk');
      } else if (key.startsWith('arrow')) {
        if (!current.game) return;
        const delta = { arrowup: -4, arrowdown: 4, arrowleft: -1, arrowright: 1 }[key];
        const index = current.mode === 'walk' ? current.game.hero : current.selected >= 0 ? current.selected : 0;
        if (current.mode === 'walk' && index === -1) { if (key === 'arrowright') { const target = directionalDestination(current.game, 0); if (target !== null) current.act('walk', target); } return; }
        if (current.mode === 'walk' && index === 0 && key === 'arrowleft') { current.act('walk', -1); return; }
        if (current.mode === 'walk' && index === 15 && key === 'arrowright') { current.act('walk', 16); return; }
        const next = index + delta;
        if (next < 0 || next > 15 || (Math.abs(delta) === 1 && Math.floor(next / 4) !== Math.floor(index / 4))) return;
        if (current.mode === 'walk') {
          const [side, opposite] = { arrowup: ['N', 'S'], arrowdown: ['S', 'N'], arrowleft: ['W', 'E'], arrowright: ['E', 'W'] }[key];
          const target = directionalDestination(current.game, next);
          if (target !== null && current.game.tiles[index]?.ports.includes(side) && current.game.tiles[next]?.ports.includes(opposite)) current.act('walk', target);
          else setNotice('Aucun trajet sûr dans cette direction. Vérifiez les dangers et le sens des courants.');
        }
        else { setSelected(next); setSlideChoice(-1); setNotice(`Dalle, ligne ${Math.floor(next / 4) + 1}, colonne ${next % 4 + 1}. Entrée pour la déplacer.`); }
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const canWalk = game && !game.won && (game.hero === -1 ? game.canEnter : game.reachable.some(i => i !== game.hero) || game.canExit);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  const objective = game?.levelId === 'relais' ? 'Avancez, puis réutilisez les dalles.' : 'Reliez l’entrée au portail de lumière.';
  const mechanic = level?.mechanic;
  const emptyCount = game?.emptyCells?.length || 1;
  const slideDestinations = game?.slideOptions?.filter(option => option.index === slideChoice) || [];
  const hoveredHazard = game?.tiles[hovered]?.hazard;
  const hazardText = hoveredHazard === 'crocodile' ? 'Crocodile · passage interdit, dalle déplaçable' : hoveredHazard === 'current' ? `Courant · sortie vers ${{N:'le nord',E:'l’est',S:'le sud',W:'l’ouest'}[game.tiles[hovered].flow]}` : hoveredHazard === 'fragile' ? 'Dalle fragile · traversez jusqu’à une dalle stable' : '';
  const nextLevel = levels[chapter + 1];
  const nextJourney = nextLevel ? (nextLevel.biome === biome.id ? 'Poursuivre le voyage' : getBiome(nextLevel.biome).arrival) : 'Retrouver la carte';
  const hoverText = hazardText || (hovered === game?.hero ? 'Dalle occupée · déplacement verrouillé' : hovered === 16 ? 'Le portail de lumière · sortie' : hovered >= 0 ? `Ligne ${Math.floor(hovered / 4) + 1} · colonne ${hovered % 4 + 1}${!game?.tiles[hovered] ? ' · vide disponible' : game?.slidable.includes(hovered) ? ' · peut glisser' : game?.reachable.includes(hovered) ? ' · chemin accessible' : ''}` : 'Glissez pour tourner · molette ou pincement pour zoomer');

  return <>
    {screen === 'home' && <HomeScreen levels={levels} progress={progress} currentGame={game} busy={busy} error={error} onStart={startExpedition} onSound={toggleSound} sound={sound}/>}
    <main className="game-shell" data-biome={biome.id} hidden={screen !== 'game'}>
    <div className="grain" aria-hidden="true" />
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); returnToMap(); }} aria-label="Lumen, revenir à la carte">
        <span className="brand-mark"><Icon name="diamond" size={35}/></span>
        <span>LUMEN<small>LES CHEMINS OUBLIÉS</small></span>
      </a>
      <nav className="chapter-nav" aria-label="Chapitres">
        {worldLevels.map(item => <button key={item.id} disabled={busy} className={`chapter-tab ${game?.levelId === item.id ? 'active' : ''}`} onClick={() => loadLevel(item.id)} aria-label={`Niveau ${item.chapter} : ${item.name}`} aria-current={game?.levelId === item.id ? 'step' : undefined}>
          <span>{progress[item.id]?.completed ? <Icon name="check" size={14}/> : String(item.biomeLevel).padStart(2, '0')}</span>
          <i />
        </button>)}
        <span className="chapter-count">{String(chapter + 1).padStart(2, '0')} <em>/ {String(levels.length || 15).padStart(2, '0')}</em></span>
      </nav>
      <div className="top-actions">
        <button className="map-return" disabled={busy} onClick={returnToMap} title="Revenir à la carte" aria-label="Revenir à la carte">← <span>Carte</span></button>
        <button className={`icon-button ${sound ? 'on' : ''}`} title={sound ? 'Couper l’ambiance (M)' : 'Activer l’ambiance (M)'} aria-label={sound ? 'Couper le son' : 'Activer le son'} aria-pressed={sound} onClick={toggleSound}><Icon name={sound ? 'volume' : 'mute'}/></button>
        <button className="icon-button" title="Comment jouer" aria-label="Comment jouer" onClick={() => setModal('help')}><Icon name="help"/></button>
      </div>
    </header>

    <aside className="story-panel">
      <p className="eyebrow"><span/> {biome.name.toUpperCase()} · {level?.biomeLevel || 1} / 5</p>
      <h1>{level?.name || 'Le premier\npassage'}</h1>
      <div className="title-ornament"><i/><Icon name="diamond" size={13}/><i/></div>
      <p className="story">{mechanic?.text || level?.subtitle || biome.description}</p>
      <div className="objective"><span className="tiny-label">{mechanic ? 'LA RÈGLE DU LIEU' : 'VOTRE QUÊTE'}</span>{mechanic ? <button className="rule-summary" onClick={() => setModal('mechanic')}><Icon name="bulb" size={18}/><span><strong>{mechanic.title}</strong><small>Comment ça marche ?</small></span></button> : <p><Icon name="diamond" size={18}/>{objective}</p>}</div>
      <div className="counters">
        <div><strong>{String(game?.moves || 0).padStart(2, '0')}</strong><span>DÉPLACEMENTS</span></div>
        <div><strong>{String(game?.steps || 0).padStart(2, '0')}</strong><span>PAS</span></div>
        <div className="time-counter"><strong>{minutes}<b>:</b>{seconds}</strong><span>TEMPS</span></div>
      </div>
      <div className="level-detail"><span>{level?.difficulty || 'Initiation'}</span><i/><span>Plateau 4 × 4</span></div>
      {progress[game?.levelId]?.completed && <p className="best-score"><Icon name="check" size={13}/> Déjà exploré · record {progress[game.levelId].moves} déplacements</p>}
      <button className="text-button chapter-picker" onClick={() => setModal('levels')}>Les chapitres <Icon name="arrow" size={15}/></button>
    </aside>

    <section className={`world-area ${ready ? 'is-ready' : ''}`} aria-label="Jeu de taquin">
      <div className="world-topline"><span><i/> {boardProfile.name.toUpperCase()}</span><div className="camera-tools"><button className="camera-reset" onClick={() => { setView('iso'); scene.current?.setView('iso'); }} title="Recentrer la caméra" aria-label="Recentrer la caméra"><Icon name="reset" size={15}/></button><button className="view-toggle" onClick={() => setView(view === 'top' ? 'iso' : 'top')} aria-label={view === 'top' ? 'Vue en perspective' : 'Vue du dessus'}><Icon name="eye" size={16}/>{view === 'top' ? 'Vue en perspective' : 'Vue du dessus'}</button></div></div>
      <div className="canvas-host" ref={sceneHost}/>
      <div className="world-caption"><span className="coordinate">360°</span><p>{hoverText}</p><span className="coordinate">4 × 4</span></div>
      {!ready && !error && <div className="loading-world"><Icon name="diamond" size={36}/><p>Les pierres s’éveillent…</p></div>}
      {error && <div className="world-error"><Icon name="help" size={26}/><p>{error}</p><button className="primary-button" onClick={() => location.reload()}>Réessayer</button></div>}
    </section>

    <div className="board-legend"><span><i className="mint"/> Trajet sûr</span><span><i className="gold"/> Aventurier</span><span className={emptyCount > 1 ? 'extra-empty' : ''}><i className="empty"/> {emptyCount > 1 ? `${emptyCount} vides disponibles` : 'Case vide'}</span></div>

    <section className="control-dock" aria-label="Commandes de jeu">
      <div className="mode-controls">
        <span className="tiny-label">À VOUS DE JOUER</span>
        <div className="mode-switch" role="group" aria-label="Mode d’interaction">
          <button className={mode === 'slide' ? 'selected' : ''} onClick={() => switchMode('slide')} aria-pressed={mode === 'slide'}><Icon name="grid" size={18}/> Déplacer les dalles</button>
          <button className={mode === 'walk' ? 'selected' : ''} onClick={() => switchMode('walk')} aria-pressed={mode === 'walk'}><Icon name="foot" size={19}/> Explorer</button>
        </div>
      </div>
      <div className="action-controls">
        <button className="tool-button" disabled={busy || !game?.historyLength} onClick={() => act('undo')} title="Annuler (Z)"><Icon name="undo" size={19}/><span>Annuler</span></button>
        <button className="tool-button" disabled={busy || !game} onClick={() => act('reset')} title="Recommencer (R)"><Icon name="reset" size={19}/><span>Recommencer</span></button>
        <button className={`tool-button ${game?.hint ? 'hint-active' : ''}`} disabled={busy || !game || game.won} onClick={() => act('hint')} title="Un indice (H)"><Icon name="bulb" size={19}/><span>Un indice</span></button>
      </div>
      <button className="primary-button advance-button" disabled={busy || !canWalk} onClick={() => { setMode('walk'); act('walk', game?.canExit ? 16 : undefined); }}><Icon name="foot" size={20}/><span>{game?.canExit ? 'Vers la sortie' : game?.hero === -1 ? 'Entrer sur le chemin' : 'Avancer'}</span><Icon name="arrow" size={18}/></button>
    </section>
    <div className={`status-line ${game?.hint ? 'with-hint' : ''} ${slideDestinations.length > 1 ? 'choosing-empty' : ''}`} role="status" aria-live="polite"><span className="status-dot"/><p>{notice}</p>{slideDestinations.length > 1 ? <div className="empty-options" aria-label="Choisir le vide">{slideDestinations.map(option => <button key={option.to} disabled={busy} onClick={() => act('slide', slideChoice, option.to)}>Vide {Math.floor(option.to/4)+1},{option.to%4+1}</button>)}<button onClick={() => { setSlideChoice(-1); setSelected(-2); setNotice('Choisissez une autre dalle.'); }}>×</button></div> : game?.hint && !game.won && <button disabled={busy} className="text-button" onClick={() => { setMode(game.hint.type === 'walk' ? 'walk' : 'slide'); act(game.hint.type, game.hint.index, game.hint.to); }}>Jouer cet indice <Icon name="arrow" size={14}/></button>}</div>
    <footer className="footer"><span>Un petit voyage, une pierre à la fois.</span><p><kbd>ESPACE</kbd> changer de mode <i/><kbd>ENTRÉE</kbd> avancer <i/><kbd>Z</kbd> annuler</p><span>CONCEPT & EXPLORATION <Icon name="diamond" size={12}/></span></footer>

    {game?.won && !animating && !winDismissed && !modal && <div className="victory-wrap"><section className="victory" role="dialog" aria-label="Chapitre terminé">
      <button className="icon-button victory-close" onClick={() => setWinDismissed(true)} aria-label="Admirer le plateau"><Icon name="close" size={17}/></button>
      <div className="victory-symbol"><Icon name="diamond" size={32}/></div>
      <p className="eyebrow">LE PASSAGE EST OUVERT</p><h2>La lumière vous attend.</h2><p>{game.moves} déplacements · {game.steps} pas · {minutes}:{seconds}</p>
      <button disabled={busy} className="primary-button" onClick={() => nextLevel ? loadLevel(nextLevel.id) : returnToMap()}>{nextJourney}<Icon name="arrow" size={18}/></button>
      <button className="victory-map" disabled={busy} onClick={returnToMap}>Voir ma progression sur la carte →</button>
    </section></div>}

    {modal === 'mechanic' && mechanic && <Dialog onClose={closeModal} title={mechanic.title}>
      <p className="eyebrow">LA RÈGLE DU LIEU · {biome.name.toUpperCase()}</p><h2>{mechanic.title}</h2>
      <p className="mechanic-explanation">{mechanic.text}</p>
      <p className="help-tip"><Icon name="bulb" size={19}/> En mode Explorer, survolez une dalle stable pour voir le trajet sûr. Un indice propose une action adaptée à l’état du plateau.</p>
      <p className="keyboard-note">Les dangers suivent leur dalle quand elle glisse. Annuler restaure aussi les dalles effondrées : vous pouvez essayer une autre stratégie.</p>
      <button className="primary-button" onClick={closeModal}>À moi de jouer <Icon name="arrow" size={18}/></button>
    </Dialog>}
    {modal === 'help' && <Dialog onClose={closeModal} title="Comment jouer">
      <p className="eyebrow">LE GUIDE DU VOYAGEUR</p><h2>Le chemin se construit<br/>sous vos pas.</h2>
      <div className="help-steps">
        <article><span>01</span><div><h3>Déplacez les dalles</h3><p>Cliquez sur une dalle voisine d’un vide pour la glisser. S’il y a plusieurs destinations, choisissez ensuite le vide sur le plateau ou avec les boutons affichés.</p></div><Icon name="grid" size={25}/></article>
        <article><span>02</span><div><h3>Explorez quand vous voulez</h3><p>En mode Explorer, survolez une dalle stable pour voir le trajet, puis cliquez pour le parcourir. « Avancer » rejoint le prochain point d’arrêt sûr.</p></div><Icon name="foot" size={26}/></article>
        <article><span>03</span><div><h3>Votre présence change le puzzle</h3><p>Une dalle occupée est verrouillée. Faites avancer l’aventurier, puis déplacez les pierres libérées. Rejoignez le portail pour terminer.</p></div><Icon name="lock" size={25}/></article>
      </div>
      <div className="hazard-guide"><p><strong>Crocodiles</strong> · Leur dalle peut glisser, mais Lumen ne peut pas la traverser.</p><p><strong>Courants</strong> · La flèche impose la direction de sortie de cette dalle.</p><p><strong>Dalles fragiles</strong> · Rejoignez une dalle stable en une seule course. Les pierres fragiles tombent derrière vous et créent de nouveaux vides.</p></div>
      <p className="help-tip"><Icon name="bulb" size={19}/> Revenez sur vos pas quand le chemin le permet, ou annulez votre action. Un indice montre la prochaine action possible vers une solution.</p>
      <div className="shortcut-list"><span><kbd>ESPACE</kbd> Changer de mode</span><span><kbd>ENTRÉE</kbd> Avancer / déplacer la sélection</span><span><kbd>↑ ↓ ← →</kbd> Choisir une dalle / marcher</span><span><kbd>Z</kbd> Annuler <kbd>R</kbd> Recommencer <kbd>H</kbd> Indice</span></div>
      <p className="keyboard-note">Glissez sur le plateau pour tourner autour. La molette ou le pincement à deux doigts permet de zoomer. Un clic bref joue une dalle. Les flèches suivent les lignes du plateau : la vue du dessus facilite le jeu au clavier.</p>
      <button className="primary-button" onClick={closeModal}>L’aventure commence <Icon name="arrow" size={18}/></button>
    </Dialog>}
    {modal === 'levels' && <Dialog onClose={closeModal} title="Choisir un chapitre">
      <p className="eyebrow">LES CHEMINS OUBLIÉS</p><h2>Trois mondes.<br/>Quinze passages.</h2><p className="dialog-intro">De la canopée aux profondeurs, puis jusqu’au cœur du volcan.</p>
      <div className="level-list">{BIOMES.map(world => <React.Fragment key={world.id}><h3 className="level-world-heading">{world.symbol} {world.name} · monde {world.world}</h3>{levels.filter(item => item.biome === world.id).map(item => <button className={`level-choice ${game?.levelId === item.id ? 'current' : ''}`} key={item.id} disabled={busy} onClick={() => loadLevel(item.id)}><span className="level-numeral">{String(item.chapter).padStart(2, '0')}</span><span><strong>{item.name}</strong><small>{item.difficulty} · passage {item.biomeLevel} / 5</small></span><Icon name={progress[item.id]?.completed ? 'check' : 'arrow'} size={22}/></button>)}</React.Fragment>)}</div>
      <p className="dialog-footnote">Les chapitres sont libres d’accès. Vos records restent dans ce navigateur.</p>
    </Dialog>}
  </main></>;
}
