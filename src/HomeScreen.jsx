import React, { useEffect, useRef, useState } from 'react';
import './home.css';
import { BIOMES, getBiome } from './campaign.js';
import { walletTotal } from './score.js';
import Shop from './Shop.jsx';

const stops = [{x:30,y:83}, {x:63,y:66}, {x:32,y:49}, {x:65,y:33}, {x:46,y:17},
  {x:19,y:70}, {x:14,y:47}, {x:24,y:27}, {x:52,y:41}, {x:78,y:49}];
const mapPalettes = {
  jungle: {sand:'#beae73',cliff:'#615c3b',ground:['#6e9660','#477a56','#305d47'],trail:'#c4b78a',water:['#204f4a','#66b2a0'],waterEdge:'#8aa17b',stream:'#82bdaa',sea:'MER DES BRUMES',coast:'CÔTE ÉMERAUDE'},
  atlantis: {sand:'#aac0b3',cliff:'#36606b',ground:['#528986','#336b76','#2c5267'],trail:'#b2d4cd',water:['#123e66','#4caaba'],waterEdge:'#689ca6',stream:'#90d9e1',sea:'ABYSSES DE NACRE',coast:'ARCHIPEL ENGLOUTI'},
  volcano: {sand:'#928074',cliff:'#352e37',ground:['#69616a','#4c424b','#342f3a'],trail:'#bea18d',water:['#e54b2f','#ffb64e'],waterEdge:'#231f2c',stream:'#fb753b',sea:'MER DE CENDRES',coast:'FAILLES ARDENTES'},
};

function IslandMap({ selected, progress, levels, onSelect, biome }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const colors = mapPalettes[biome.id];
    function paint() {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = bounds.width * ratio; canvas.height = bounds.height * ratio;
      ctx.setTransform(canvas.width / 1000, 0, 0, canvas.height / 900, 0, 0);
      ctx.clearRect(0, 0, 1000, 900);
      const ellipse = (x,y,rx,ry,color) => { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill(); };
      const island = () => { ctx.beginPath();ctx.moveTo(174,694);ctx.bezierCurveTo(100,550,236,434,253,327);ctx.bezierCurveTo(279,203,381,128,482,112);ctx.bezierCurveTo(607,63,726,183,734,294);ctx.bezierCurveTo(748,376,853,432,841,554);ctx.bezierCurveTo(822,685,743,803,608,819);ctx.bezierCurveTo(425,883,235,828,174,694);ctx.closePath(); };
      // Shallow water, sandstone cliffs, and a soft painted canopy.
      for(let i=5;i>0;i--) ellipse(505,556,300+i*20,248+i*20,`rgba(85,167,144,${.012+i*.003})`);
      ctx.save();ctx.translate(0,40);island();ctx.fillStyle='#112d2a';ctx.shadowColor='#061c20';ctx.shadowBlur=42;ctx.fill();ctx.restore();
      ctx.save();ctx.translate(0,22);island();ctx.fillStyle=colors.cliff;ctx.fill();ctx.restore();
      island();ctx.fillStyle=colors.sand;ctx.fill();
      ctx.save();ctx.translate(510,466);ctx.scale(.963,.973);ctx.translate(-510,-466);island();
      const ground=ctx.createLinearGradient(250,120,750,860);colors.ground.forEach((color,i)=>ground.addColorStop(i/2,color));ctx.fillStyle=ground;ctx.fill();ctx.restore();
      // A lagoon and a small waterfall on the eastern coast.
      ctx.beginPath();ctx.moveTo(648,570);ctx.bezierCurveTo(757,509,823,563,776,665);ctx.bezierCurveTo(757,721,678,738,643,672);ctx.bezierCurveTo(612,637,602,599,648,570);ctx.fillStyle=colors.waterEdge;ctx.fill();
      ctx.save();ctx.translate(698,633);ctx.scale(.86,.83);ctx.translate(-698,-633);
      ctx.beginPath();ctx.moveTo(648,570);ctx.bezierCurveTo(757,509,823,563,776,665);ctx.bezierCurveTo(757,721,678,738,643,672);ctx.bezierCurveTo(612,637,602,599,648,570);
      const water=ctx.createLinearGradient(640,570,760,720);water.addColorStop(0,colors.water[0]);water.addColorStop(1,colors.water[1]);ctx.fillStyle=water;ctx.fill();ctx.restore();
      ctx.strokeStyle='#b5d7ae55';ctx.lineWidth=3;
      for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(710,616+i*14,24+i*4,4,0,0,Math.PI);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(746,723);ctx.quadraticCurveTo(790,763,770,816);ctx.strokeStyle=colors.stream;ctx.lineWidth=14;ctx.stroke();ctx.strokeStyle='#d4e6bb99';ctx.lineWidth=3;ctx.stroke();
      // The expedition trail follows the landmarks from shore to sanctuary.
      const route = () => {ctx.beginPath();ctx.moveTo(300,727);ctx.bezierCurveTo(360,760,690,680,630,574);ctx.bezierCurveTo(600,530,230,570,320,421);ctx.bezierCurveTo(400,365,715,400,650,277);ctx.bezierCurveTo(640,202,435,250,460,133);};
      ctx.lineCap='round';route();ctx.strokeStyle=colors.cliff;ctx.lineWidth=25;ctx.stroke();route();ctx.strokeStyle=colors.trail;ctx.lineWidth=17;ctx.stroke();
      ctx.setLineDash([2,16]);route();ctx.lineWidth=3;ctx.strokeStyle='#f0dfaa';ctx.stroke();ctx.setLineDash([]);
      // Seeded trees stay in place when the map is resized.
      let seed=719;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
      function tree(x,y,size){
        if(biome.id==='atlantis') {
          ellipse(x+5,y+4,size*.65,size*.2,'#19364b70');ctx.strokeStyle=x%3>1?'#d399ba':'#76babe';ctx.lineCap='round';ctx.lineWidth=4;
          for(let branch=-2;branch<=2;branch++){ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+branch*size*.3,y-size*.25,x+branch*size*.25,y-size*(.7-Math.abs(branch)*.13));ctx.stroke();ellipse(x+branch*size*.25,y-size*(.7-Math.abs(branch)*.13),3,3,'#c4d4c4');}return;
        }
        if(biome.id==='volcano') {
          ellipse(x+5,y+4,size*.7,size*.25,'#20233280');ctx.fillStyle='#302e3a';ctx.beginPath();ctx.moveTo(x-size*.6,y);ctx.lineTo(x-size*.25,y-size*.6);ctx.lineTo(x+size*.16,y-size*.77);ctx.lineTo(x+size*.55,y-size*.12);ctx.closePath();ctx.fill();ctx.fillStyle='#605765';ctx.beginPath();ctx.moveTo(x-size*.25,y-size*.6);ctx.lineTo(x+size*.16,y-size*.77);ctx.lineTo(x+size*.12,y-size*.1);ctx.fill();if(size>37){ctx.strokeStyle='#f4936266';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-size*.5);ctx.lineTo(x+3,y-size*.25);ctx.stroke();}return;
        }
        ellipse(x+7,y+9,size*.76,size*.35,'#18392e50');ctx.fillStyle='#6c6740';ctx.fillRect(x-3,y-size*.55,6,size*.65);
        ellipse(x,y-size*.45,size*.62,size*.55,'#214b38');ellipse(x-size*.21,y-size*.67,size*.49,size*.48,'#366946');ellipse(x+size*.17,y-size*.91,size*.43,size*.42,'#598253');ellipse(x+size*.12,y-size*1.06,size*.26,size*.22,'#80a169');
      }
      const patches=[[297,354,75,95],[645,285,66,78],[770,475,39,67],[330,570,82,65],[493,757,76,24],[230,659,30,56],[540,134,48,23],[724,757,36,25]];
      for(const [cx,cy,rx,ry] of patches){const trees=[];for(let i=0;i<12;i++)trees.push([cx+(random()-.5)*rx*2,cy+(random()-.5)*ry*2,19+random()*23]);trees.sort((a,b)=>a[1]-b[1]);trees.forEach(t=>tree(...t));}
      function temple(x,y,size){
        ellipse(x+10,y+9,size*.72,size*.22,'#18392e70');
        for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#ada36e':'#c1b482';ctx.fillRect(x-size*.65+i*size*.1,y-i*size*.14,size*1.3-i*size*.2,size*.18);}
        ctx.fillStyle='#d9c696';ctx.fillRect(x-size*.26,y-size*.75,size*.52,size*.38);ctx.fillStyle='#324c38';ctx.fillRect(x-size*.1,y-size*.61,size*.2,size*.25);
        ctx.fillStyle='#829267';ctx.fillRect(x-size*.55,y-size*.03,size*.23,size*.08);ctx.fillRect(x+size*.12,y-size*.51,size*.23,size*.06);
      }
      temple(470,172,65);temple(665,405,42);
      if(biome.id==='atlantis') {
        for(const [x,y,h] of [[365,350,57],[406,371,43],[754,429,55],[713,439,34]]){ellipse(x+7,y+6,15,6,'#183c5966');ctx.fillStyle='#aacac4';ctx.fillRect(x-6,y-h,12,h);ctx.fillStyle='#dddec6';ctx.fillRect(x-11,y-h-5,22,7);ctx.fillRect(x-11,y-2,22,7);ctx.strokeStyle='#557e86';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-h+6);ctx.lineTo(x,y-7);ctx.stroke();}
        for(let i=0;i<5;i++){ctx.strokeStyle='#b5ecdd22';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(505,485+i*70,240-i*12,16,0,0,Math.PI);ctx.stroke();}
      }
      if(biome.id==='volcano') {
        // A smoking caldera and lava fissures make this map more than a recolour.
        const smoke=ctx.createRadialGradient(731,543,6,731,543,90);smoke.addColorStop(0,'#bab0b526');smoke.addColorStop(1,'#bab0b500');ellipse(731,543,85,100,smoke);
        ctx.strokeStyle='#ff9a43';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(708,590);ctx.lineTo(690,623);ctx.lineTo(724,650);ctx.lineTo(733,689);ctx.stroke();
        ctx.lineWidth=2;ctx.strokeStyle='#ffb56d66';for(const [x,y] of [[260,596],[382,291],[502,816]]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+23,y-14);ctx.lineTo(x+16,y-33);ctx.lineTo(x+40,y-48);ctx.stroke();}
      }
      // Canvas camp: a tent, a fire and a moored boat at the first landing.
      ctx.fillStyle='#d7bc83';ctx.beginPath();ctx.moveTo(248,734);ctx.lineTo(293,658);ctx.lineTo(333,734);ctx.closePath();ctx.fill();ctx.fillStyle='#394f38';ctx.beginPath();ctx.moveTo(281,733);ctx.lineTo(294,697);ctx.lineTo(309,733);ctx.fill();
      ellipse(246,754,14,5,'#e6b85f66');ctx.fillStyle='#f4ce7c';ctx.beginPath();ctx.moveTo(237,752);ctx.lineTo(247,728);ctx.lineTo(254,752);ctx.fill();
      ctx.save();ctx.translate(244,820);ctx.rotate(-.4);ellipse(0,0,47,13,'#102e2b88');ellipse(0,-8,40,10,'#bc9560');ellipse(0,-10,30,5,'#5e6246');ctx.restore();
      // Cartographic details around the coast.
      ctx.strokeStyle='#a9c0a62b';ctx.lineWidth=1;
      for(const [x,y] of [[109,401],[842,229],[875,730],[342,114]]){ctx.beginPath();ctx.moveTo(x-18,y);ctx.lineTo(x+18,y);ctx.moveTo(x,y-18);ctx.lineTo(x,y+18);ctx.stroke();}
      ctx.font='12px sans-serif';ctx.letterSpacing='3px';ctx.fillStyle='#b0bec677';ctx.fillText(colors.sea,74,855);ctx.save();ctx.translate(872,355);ctx.rotate(-Math.PI/2);ctx.fillText(colors.coast,0,0);ctx.restore();
    }
    const observer = new ResizeObserver(paint);observer.observe(canvas);paint();
    return ()=>observer.disconnect();
  }, [biome.id]);
  return <div className="expedition-map" aria-label={`Carte : ${biome.name}`}>
    <canvas ref={canvasRef} aria-hidden="true"/>
    <div className="map-compass" aria-hidden="true"><span>N</span>✧</div>
    {levels.map((level,index)=>{
      const done=progress[level.id]?.completed;const active=selected===level.id;const at=stops[index%stops.length];
      const treasure=level.relicName&&progress[level.id]?.relic;
      return <button key={level.id} className={`map-stop ${done?'completed':''} ${active?'chosen':''}`} style={{left:`${at.x}%`,top:`${at.y}%`}} onClick={()=>onSelect(level.id)} aria-pressed={active} aria-label={`Niveau ${level.chapter} : ${level.name}${done?', terminé':''}`}>
        {active&&<span className="map-you">{done?'À REVISITER':'VOTRE DESTINATION'}</span>}
        <span className="map-stop-number">{done?'✓':String(level.chapter).padStart(2,'0')}</span>
        <span className="map-stop-caption"><small>PASSAGE {level.biomeLevel} / {levels.length}</small><strong>{level.name}</strong>{done&&<em>Exploré{treasure?' · ✦':''}</em>}</span>
      </button>;
    })}
    <div className="map-fireflies" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${20+(i*17)%65}%`,top:`${15+(i*23)%65}%`,animationDelay:`${i*-.7}s`}}/>)}</div>
  </div>;
}


export default function HomeScreen({levels,progress,currentGame,busy,error,onStart,onSound,sound,wardrobe,credits=0,onBuy,onEquip}) {
  const [selected,setSelected]=useState((!currentGame?.won&&currentGame?.levelId)||levels.find(level=>!progress[level.id]?.completed)?.id||levels[0]?.id);
  const [panel,setPanel]=useState(null);
  const closeButton = useRef(null);
  const previousFocus = useRef(null);
  useEffect(()=>{if(!selected&&levels.length&&!busy)setSelected((!currentGame?.won&&currentGame?.levelId)||levels.find(level=>!progress[level.id]?.completed)?.id||levels[0].id);},[levels,selected,currentGame,progress,busy]);
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
  const total=levels.length||24;
  const relics=levels.filter(item=>item.relicName);
  const found=relics.filter(item=>progress[item.id]?.relic).length;
  const wallet=walletTotal(progress);
  const points=value=>value.toLocaleString('fr-FR');
  const resuming=Boolean(currentGame && currentGame.levelId===selected && currentGame.historyLength>0 && !currentGame.won);
  const done=progress[selected]?.completed;
  function selectWorld(id) {
    const candidates=levels.filter(item=>item.biome===id);
    const current=candidates.find(item=>item.id===currentGame?.levelId);
    const next=current&&!currentGame.won&&currentGame.historyLength ? current : candidates.find(item=>!progress[item.id]?.completed)||candidates[0];
    if(next)setSelected(next.id);
  }
  return <main className="expedition-home" data-biome={biome.id}>
    <div className="home-ambient" aria-hidden="true"/>
    <header className="home-header">
      <div className="home-brand"><span>✧</span><div>LUMEN<small>LES CHEMINS OUBLIÉS</small></div></div>
      <nav className="biome-tabs" aria-label="Mondes de l’expédition">{BIOMES.map(world=>{
        const count=levels.filter(item=>item.biome===world.id&&progress[item.id]?.completed).length;
        const size=levels.filter(item=>item.biome===world.id).length||5;
        return <button key={world.id} data-world={world.id} aria-pressed={biome.id===world.id} disabled={busy||!levels.length} onClick={()=>selectWorld(world.id)}><span aria-hidden="true">{world.symbol}</span><strong>{world.name}<small>{count} / {size} explorés</small></strong>{count===size&&<i aria-hidden="true">✓</i>}</button>;
      })}</nav>
      <div className="home-header-actions"><span className="home-wallet" title={`Crédits disponibles : ${points(credits)} · portefeuille : ${points(wallet)} pts, un record qui ne baisse jamais`}><em>✦</em><strong>{points(credits)}</strong><small>CRÉDITS</small></span><button onClick={onSound} aria-label={sound?'Couper le son':'Activer le son'} aria-pressed={sound}>{sound?'♫':'♪'}<span>{sound?'Son activé':'Son coupé'}</span></button><button onClick={()=>setPanel('help')} aria-label="Comment jouer">?</button></div>
    </header>
    <section className="home-intro"><p className="home-kicker">MONDE {biome.world} · {worldLevels.length || 5} PASSAGES À RETROUVER</p><h1>{biome.headline} <br/><em>{biome.emphasis}</em></h1><p>{biome.description}</p><div className="expedition-progress"><div><span>{biome.title.toUpperCase()}</span><strong>{worldCompleted}<small> / {worldLevels.length||5}</small></strong></div><div className="home-progress-track" role="progressbar" aria-label={`Passages explorés : ${biome.name}`} aria-valuenow={worldCompleted} aria-valuemin={0} aria-valuemax={worldLevels.length||5}><i style={{width:`${worldCompleted/(worldLevels.length||5)*100}%`}}/></div><small>{worldCompleted===worldLevels.length&&worldCompleted?'Ce monde vous a livré tous ses secrets.':'passages explorés · à votre rythme'}</small></div></section>
    <IslandMap selected={selected} progress={progress} levels={worldLevels} onSelect={setSelected} biome={biome}/>
    <section className="expedition-card" aria-label="Destination sélectionnée"><div className="destination-icon" aria-hidden="true">{done?'✦':biome.symbol}</div><div className="destination-info"><p>NIVEAU {level?.chapter||1} / {total} <span>· {level?.difficulty||'Initiation'}</span></p><h2>{level?.name||'Préparation du voyage…'}</h2><p className="destination-description">{level?.subtitle||biome.description}</p>{level?.mechanic && <div className="mechanic-tag" title={level.mechanic.text}><span aria-hidden="true">◆</span>{level.mechanic.title}</div>}{level?.relicName && <div className={`relic-tag ${progress[selected]?.relic?'found':''}`}><span aria-hidden="true">{progress[selected]?.relic?'✦':'✧'}</span>{progress[selected]?.relic?level.relicName:`Un trésor caché : ${level.relicName}`}</div>}<small>{done?`✓ Exploré · record : ${progress[selected].moves} déplacements${progress[selected].score?` · ${points(progress[selected].score)} pts`:''}`:resuming?`Expédition en cours · ${currentGame.moves} déplacements`:'Un nouveau passage à découvrir'}</small></div><button className="home-play" disabled={busy||!level||!!error} onClick={()=>onStart(selected)}><span>{busy?'Préparation…':resuming?'Reprendre':done?'Rejouer':'Explorer'}<small>{resuming?'L’AVENTURE CONTINUE':`${biome.name.toUpperCase()} · PASSAGE ${level?.biomeLevel||1} / ${worldLevels.length||5}`}</small></span><b aria-hidden="true">→</b></button></section>
    {error&&<div className="home-error" role="alert">{error}<button onClick={()=>location.reload()}>Réessayer</button></div>}
    <footer className="home-footer"><button className="home-shop-open" onClick={()=>setPanel('store')}><span aria-hidden="true">✧</span> Boutique de l’expédition <em className="wallet-count">{points(credits)} crédits</em></button><button onClick={()=>setPanel('journal')}><span aria-hidden="true">▤</span> Carnet d’expédition <em>{completed} / {total}</em>{relics.length>0&&<em className="relic-count">✦ {found} / {relics.length}</em>}<em className="wallet-count">{points(wallet)} pts</em></button><p>Jungle → Atlantide → Volcan · les épreuves closent chaque monde</p><span className="home-local">● SAUVEGARDÉ SUR CET APPAREIL</span></footer>
    {panel==='store'?<Shop wardrobe={wardrobe} credits={credits} progress={progress} biome={biome.id} onBuy={onBuy} onEquip={onEquip} onClose={()=>setPanel(null)}/>:panel&&<div className="home-modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setPanel(null);}}><section className="home-modal" role="dialog" aria-modal="true" aria-label={panel==='journal'?'Carnet d’expédition':'Comment jouer'}><button ref={closeButton} className="home-modal-close" onClick={()=>setPanel(null)} aria-label="Fermer">×</button><p className="home-kicker">LES NOTES DU VOYAGEUR</p><h2>{panel==='journal'?'Votre carnet d’expédition':'Un chemin, une pierre à la fois.'}</h2>{panel==='journal'?<><p className="home-modal-intro">{completed} passage{completed>1?'s':''} retrouvé{completed>1?'s':''} sur {total}{relics.length>0?`, et ${found} relique${found>1?'s':''} sur ${relics.length} rapportée${found>1?'s':''}`:''}. Vos records restent dans ce navigateur.</p><p className="journal-wallet"><span>PORTEFEUILLE</span><strong>{points(wallet)}</strong><small>points · la somme de votre meilleur passage sur chaque niveau</small></p><div className="journal-levels">{levels.map((item,i)=><article key={item.id} className={progress[item.id]?.relic?'has-relic':''}><span>{progress[item.id]?.completed?'✦':String(i+1).padStart(2,'0')}</span><div><h3>{item.name}</h3><p>{progress[item.id]?.completed?`Exploré · meilleur parcours : ${progress[item.id].moves} déplacements`:currentGame?.levelId===item.id&&currentGame.historyLength?'Expédition en cours':'À découvrir'}</p>{progress[item.id]?.score>0&&<p className="journal-score">{points(progress[item.id].score)} points</p>}{item.relicName&&<p className="journal-relic">{progress[item.id]?.relic?`✦ ${item.relicName}`:`✧ ${item.relicName} · encore sur place`}</p>}</div><small>{item.difficulty}</small></article>)}</div><p className="home-modal-note">Tous les chapitres sont ouverts : choisissez votre propre itinéraire. Les reliques sont facultatives — un niveau se termine sans elles.</p></>:<ol className="home-guide"><li><strong>Faites glisser les pierres.</strong><p>Une dalle voisine du vide peut s’y déplacer. Assemblez les chemins pour ouvrir le passage.</p></li><li><strong>Explorez à tout moment.</strong><p>En mode Explorer, touchez une dalle reliée pour y conduire Lumen. Sa présence verrouille la dalle qu’il occupe.</p></li><li><strong>Rejoignez le portail.</strong><p>Avancez, libérez les pierres, puis construisez la suite. Les indices et l’annulation vous accompagnent.</p></li></ol>}</section></div>}
  </main>;
}
