import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import './home.css';
import { BIOMES, frontierLevel, getBiome, isOpen as passageOpen } from './campaign.js';
import { DEV_MODE, exitDevMode } from './dev-mode.js';
import { walletTotal } from './score.js';
import Shop from './Shop.jsx';
import { mapStops } from './map-layout.js';
import { createMapScene } from './map-scene.js';

/** Dev mode lifts every padlock; otherwise the campaign rules decide. */
const isOpen = (levels, progress, levelId) => passageOpen(levels, progress, levelId, DEV_MODE);

function IslandMap({ selected, progress, levels, onSelect, biome, locked }) {
  const canvasRef = useRef(null);
  const [positions, setPositions] = useState([]);
  useEffect(() => {
    return createMapScene(canvasRef.current, biome.id, mapStops(biome.id, levels.length), levels.map(level=>Boolean(progress[level.id]?.completed)), setPositions);
  }, [biome.id, levels.length, progress]);
  return <div className="expedition-map" aria-label={`Carte : ${biome.name}`}>
    <canvas key={biome.id} ref={canvasRef} aria-hidden="true"/>
    <div className="map-compass" aria-hidden="true"><span>N</span>✧</div>
    {levels.map((level,index)=>{
      const done=progress[level.id]?.completed;const shut=locked(level.id);const active=selected===level.id;const at=positions[index];
      const treasure=level.relicName&&progress[level.id]?.relic;
      return <button key={level.id} disabled={shut} className={`map-stop ${done?'completed':''} ${active?'chosen':''} ${shut?'locked':''}`} style={{left:`${at?.x??50}%`,top:`${at?.y??50}%`,visibility:at?'visible':'hidden'}} onClick={()=>onSelect(level.id)} aria-pressed={active} aria-label={`Niveau ${level.chapter} : ${level.name}${shut?`, verrouillé — terminez le niveau ${level.chapter-1}`:done?', terminé':''}`}>
        {active&&<span className="map-you">{done?'À REVISITER':'VOTRE DESTINATION'}</span>}
        <span className="map-stop-number">{shut?<i className="lock-mark" aria-hidden="true"/>:done?'✓':String(level.chapter).padStart(2,'0')}</span>
        {progress[level.id]?.secretFound&&<b className="map-secret" title="Un escalier découvert" aria-hidden="true">⌄</b>}
        <span className="map-stop-caption"><small>PASSAGE {level.biomeLevel} / {levels.length}</small><strong>{level.name}</strong>{shut?<em className="stop-locked">Terminez le niveau {level.chapter-1}</em>:done&&<em>Exploré{treasure?' · ✦':''}</em>}</span>
      </button>;
    })}
    <div className="map-fireflies" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${20+(i*17)%65}%`,top:`${15+(i*23)%65}%`,animationDelay:`${i*-.7}s`}}/>)}</div>
  </div>;
}


export default function HomeScreen({levels,secrets=[],progress,currentGame,busy,error,onStart,onSound,sound,wardrobe,credits=0,onBuy,onEquip,onReset,accountControl,connected=false}) {
  /** The secret room a passage hides, if the player has found its staircase. */
  const roomOf=id=>secrets.find(room=>room.host===id);
  /** Where a traveller lands: the run in progress if it is still open, else the frontier. */
  const startPoint=()=>(!currentGame?.won&&currentGame?.levelId&&isOpen(levels,progress,currentGame.levelId)
    ? currentGame.levelId : frontierLevel(levels,progress)?.id);
  const [selected,setSelected]=useState(startPoint);
  const [panel,setPanel]=useState(null);
  const [confirmReset,setConfirmReset]=useState(false);
  const closeButton = useRef(null);
  const previousFocus = useRef(null);
  useEffect(()=>{if(!levels.length||busy)return;
    if(!selected||!isOpen(levels,progress,selected))setSelected(startPoint());},[levels,selected,currentGame,progress,busy]);
  useEffect(()=>{setConfirmReset(false);},[panel]);
  useEffect(()=>{
    if(!panel||panel==='store')return;
    previousFocus.current=document.activeElement;closeButton.current?.focus();
    const key=event=>{
      if(event.key==='Escape')setPanel(null);
      if(event.key!=='Tab')return;
      const dialog=closeButton.current?.closest('.home-modal');
      const stops=[...(dialog?.querySelectorAll('button:not(:disabled)')||[])];
      if(!stops.length)return;
      const edge=event.shiftKey?stops[0]:stops.at(-1);
      if(document.activeElement===edge){event.preventDefault();(event.shiftKey?stops.at(-1):stops[0]).focus();}
    };
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previousFocus.current?.focus();};
  },[panel]);
  const level=levels.find(item=>item.id===selected);
  const biome=getBiome(level?.biome||currentGame?.biome);
  const worldLevels=levels.filter(item=>item.biome===biome.id);
  const worldCompleted=worldLevels.filter(item=>progress[item.id]?.completed).length;
  const completed=levels.filter(item=>progress[item.id]?.completed).length;
  const total=levels.length||29;
  const relics=levels.filter(item=>item.relicName);
  const found=relics.filter(item=>progress[item.id]?.relic).length;
  const wallet=walletTotal(progress);
  const points=value=>value.toLocaleString('fr-FR');
  const SoundIcon=sound?Volume2:VolumeX;
  const soundAction=sound?'Couper le son':'Activer le son';
  const resuming=Boolean(currentGame && currentGame.levelId===selected && currentGame.historyLength>0 && !currentGame.won);
  const done=progress[selected]?.completed;
  const shut=Boolean(levels.length)&&!isOpen(levels,progress,selected);
  function selectWorld(id) {
    const candidates=levels.filter(item=>item.biome===id&&isOpen(levels,progress,item.id));
    if(!candidates.length)return;
    const current=candidates.find(item=>item.id===currentGame?.levelId);
    const next=current&&!currentGame.won&&currentGame.historyLength ? current : candidates.find(item=>!progress[item.id]?.completed)||candidates.at(-1);
    setSelected(next.id);
  }
  return <main className="expedition-home" data-biome={biome.id}>
    <div className="home-ambient" aria-hidden="true"/>
    <header className="home-header">
      <div className="home-brand"><span>✧</span><div>LUMEN<small>LES CHEMINS OUBLIÉS</small></div></div>
      <nav className="biome-tabs" aria-label="Mondes de l’expédition">{BIOMES.map(world=>{
        const count=levels.filter(item=>item.biome===world.id&&progress[item.id]?.completed).length;
        const size=levels.filter(item=>item.biome===world.id).length||5;
        // A world opens with its first passage, and the previous world's last one unlocks it.
        const gate=levels.find(item=>item.biome===world.id);
        const shutWorld=Boolean(levels.length)&&!isOpen(levels,progress,gate?.id);
        return <button key={world.id} data-world={world.id} className={shutWorld?'locked':''} aria-pressed={biome.id===world.id} disabled={busy||!levels.length||shutWorld} onClick={()=>selectWorld(world.id)} title={shutWorld?'Ce monde s’ouvre à la fin du monde précédent.':undefined}><span aria-hidden="true">{world.symbol}</span><strong>{world.name}<small>{shutWorld?'verrouillé':`${count} / ${size} explorés`}</small></strong>{shutWorld?<i className="lock-mark" aria-hidden="true"/>:count===size?<i aria-hidden="true">✓</i>:null}</button>;
      })}</nav>
      <div className="home-header-actions"><span className="home-wallet" title={`Crédits disponibles : ${points(credits)} · portefeuille : ${points(wallet)} pts, un record qui ne baisse jamais`}><em>✦</em><strong>{points(credits)}</strong><small>CRÉDITS</small></span><button type="button" className="home-sound-toggle" onClick={onSound} aria-label={soundAction} aria-pressed={sound} title={soundAction}><SoundIcon size={19} strokeWidth={1.8} aria-hidden="true"/></button><button onClick={()=>setPanel('help')} aria-label="Comment jouer">?</button>{DEV_MODE&&<button className="dev-badge" onClick={exitDevMode} title="Mode dév : tous les passages sont ouverts. Cliquez pour en sortir."><i aria-hidden="true"/>MODE DÉV<span>quitter</span></button>}</div>
    </header>
    <section className="home-intro"><p className="home-kicker">MONDE {biome.world} · {worldLevels.length || 5} PASSAGES À RETROUVER</p><h1>{biome.headline} <br/><em>{biome.emphasis}</em></h1><p>{biome.description}</p><div className="expedition-progress"><div><span>{biome.title.toUpperCase()}</span><strong>{worldCompleted}<small> / {worldLevels.length||5}</small></strong></div><div className="home-progress-track" role="progressbar" aria-label={`Passages explorés : ${biome.name}`} aria-valuenow={worldCompleted} aria-valuemin={0} aria-valuemax={worldLevels.length||5}><i style={{width:`${worldCompleted/(worldLevels.length||5)*100}%`}}/></div><small>{worldCompleted===worldLevels.length&&worldCompleted?'Ce monde vous a livré tous ses secrets.':'passages explorés · à votre rythme'}</small></div></section>
    <IslandMap selected={selected} progress={progress} levels={worldLevels} onSelect={setSelected} biome={biome} locked={id=>!isOpen(levels,progress,id)}/>
    <section className="expedition-card" aria-label="Destination sélectionnée"><div className="destination-icon" aria-hidden="true">{shut?<i className="lock-mark" aria-hidden="true"/>:done?'✦':biome.symbol}</div><div className="destination-info"><p>NIVEAU {level?.chapter||1} / {total} <span>· {level?.difficulty||'Initiation'}</span></p><h2>{level?.name||'Préparation du voyage…'}</h2><p className="destination-description">{level?.subtitle||biome.description}</p>{level?.mechanic && <div className="mechanic-tag" title={level.mechanic.text}><span aria-hidden="true">◆</span>{level.mechanic.title}</div>}{level?.relicName && <div className={`relic-tag ${progress[selected]?.relic?'found':''}`}><span aria-hidden="true">{progress[selected]?.relic?'✦':'✧'}</span>{progress[selected]?.relic?level.relicName:`Un trésor caché : ${level.relicName}`}</div>}<small>{shut?`Passage verrouillé · terminez d’abord le niveau ${(level?.chapter||2)-1}`:done?`✓ Exploré · record : ${progress[selected].moves} déplacements${progress[selected].score?` · ${points(progress[selected].score)} pts`:''}`:resuming?`Expédition en cours · ${currentGame.moves} déplacements`:'Un nouveau passage à découvrir'}</small></div><button className="home-play" disabled={busy||!level||!!error||shut} onClick={()=>onStart(selected)}><span>{busy?'Préparation…':shut?'Verrouillé':resuming?'Reprendre':done?'Rejouer':'Explorer'}<small>{shut?'TERMINEZ LE PASSAGE PRÉCÉDENT':resuming?'L’AVENTURE CONTINUE':`${biome.name.toUpperCase()} · PASSAGE ${level?.biomeLevel||1} / ${worldLevels.length||5}`}</small></span>{shut?<i className="lock-mark" aria-hidden="true"/>:<b aria-hidden="true">→</b>}</button></section>
    {error&&<div className="home-error" role="alert">{error}<button onClick={()=>location.reload()}>Réessayer</button></div>}
    <footer className="home-footer"><button className="home-shop-open" onClick={()=>setPanel('store')}><span aria-hidden="true">✧</span> Boutique de l’expédition <em className="wallet-count">{points(credits)} crédits</em></button><button onClick={()=>setPanel('journal')}><span aria-hidden="true">▤</span> Carnet d’expédition <em>{completed} / {total}</em>{relics.length>0&&<em className="relic-count">✦ {found} / {relics.length}</em>}<em className="wallet-count">{points(wallet)} pts</em></button><p>Jungle → Atlantide → Volcan → Boréale</p>{accountControl || <span className="home-local">● SAUVEGARDÉ SUR CET APPAREIL</span>}</footer>
    {panel==='store'?<Shop wardrobe={wardrobe} credits={credits} progress={progress} biome={biome.id} onBuy={onBuy} onEquip={onEquip} onClose={()=>setPanel(null)}/>:panel&&<div className="home-modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setPanel(null);}}><section className="home-modal" role="dialog" aria-modal="true" aria-label={panel==='journal'?'Carnet d’expédition':'Comment jouer'}><button ref={closeButton} className="home-modal-close" onClick={()=>setPanel(null)} aria-label="Fermer">×</button><p className="home-kicker">LES NOTES DU VOYAGEUR</p><h2>{panel==='journal'?'Votre carnet d’expédition':'Un chemin, une pierre à la fois.'}</h2>{panel==='journal'?<><p className="home-modal-intro">{completed} passage{completed>1?'s':''} retrouvé{completed>1?'s':''} sur {total}{relics.length>0?`, et ${found} relique${found>1?'s':''} sur ${relics.length} rapportée${found>1?'s':''}`:''}. {connected?'Carnet lié à votre compte.':'Carnet invité de cet appareil.'}</p><p className="journal-wallet"><span>PORTEFEUILLE</span><strong>{points(wallet)}</strong><small>points · la somme de votre meilleur passage sur chaque niveau</small></p><div className="journal-levels">{levels.map((item,i)=>{
      const shutRow=!isOpen(levels,progress,item.id);
      return <article key={item.id} className={`${progress[item.id]?.relic?'has-relic':''} ${shutRow?'locked':''}`}><span>{shutRow?<i className="lock-mark" aria-hidden="true"/>:progress[item.id]?.completed?'✦':String(i+1).padStart(2,'0')}</span><div><h3>{item.name}</h3><p>{shutRow?`Verrouillé · terminez le niveau ${i}`:progress[item.id]?.completed?`Exploré · meilleur parcours : ${progress[item.id].moves} déplacements`:currentGame?.levelId===item.id&&currentGame.historyLength?'Expédition en cours':'À découvrir'}</p>{progress[item.id]?.score>0&&<p className="journal-score">{points(progress[item.id].score)} points</p>}{item.relicName&&!shutRow&&<p className="journal-relic">{progress[item.id]?.relic?`✦ ${item.relicName}`:`✧ ${item.relicName} · encore sur place`}</p>}{(()=>{
        // A passage that hides a room says so once finished; the room itself appears once found.
        const room=roomOf(item.id);if(!room||shutRow)return null;
        const found=progress[item.id]?.secretFound,cleared=progress[room.id]?.completed;
        if(found)return <button type="button" className={`journal-secret ${cleared?'cleared':''}`} disabled={busy} onClick={()=>onStart(room.id)} title={cleared?'Redescendre dans cette salle':'Descendre l’escalier'}><span aria-hidden="true">⌄</span> {room.name}{cleared?` · exploré${progress[room.id].relic?' · ✦ '+room.relicName:''}${progress[room.id].score?' · '+points(progress[room.id].score)+' pts':''}`:' · l’escalier vous attend'}<em>{cleared?'y redescendre':'descendre'} →</em></button>;
        if(progress[item.id]?.completed)return <p className="journal-secret rumour"><span aria-hidden="true">⌄</span> Quelque chose sonnait creux dans ce passage.</p>;
        return null;})()}</div><small>{item.difficulty}</small></article>;
    })}</div><p className="home-modal-note">{DEV_MODE?'Mode dév : tous les passages sont ouverts, y compris ceux que la campagne n’a pas encore déverrouillés. Vos records, eux, restent ceux de vos vraies parties.':'Les passages s’ouvrent l’un après l’autre : terminez un niveau pour déverrouiller le suivant.'} Les reliques sont facultatives — un niveau se termine sans elles.</p>
    <div className="journal-reset">{confirmReset
      ? <><p>Niveaux terminés, records, points et garde-robe : tout sera effacé, et l’aventure repartira du niveau 01. C’est définitif.</p><div className="journal-reset-actions"><button className="journal-reset-go" onClick={onReset}>Oui, tout effacer</button><button onClick={()=>setConfirmReset(false)}>Annuler</button></div></>
      : <button className="journal-reset-open" onClick={()=>setConfirmReset(true)}><span aria-hidden="true">↺</span> Recommencer l’aventure à zéro</button>}</div></>:<ol className="home-guide"><li><strong>Faites glisser les pierres.</strong><p>Une dalle voisine du vide peut s’y déplacer. Assemblez les chemins pour ouvrir le passage.</p></li><li><strong>Explorez à tout moment.</strong><p>En mode Explorer, touchez une dalle reliée pour y conduire Lumen. Sa présence verrouille la dalle qu’il occupe.</p></li><li><strong>Rejoignez le portail.</strong><p>Avancez, libérez les pierres, puis construisez la suite. Les indices et l’annulation vous accompagnent.</p></li></ol>}</section></div>}
  </main>;
}
