import React, {useEffect, useRef, useState} from 'react';
import {regionIds, regions, ui, pathFor} from './data/regions';
import {geographicLayers, layerIds, project} from './data/layers';

export function LayerIcon({type}) {
  const paths = {
    mountains: <><path d="m2 20 7-15 5 10 3-7 5 12Z"/><path d="m6.5 10 2.5 2 2-2"/></>,
    oases: <><path d="M12 22V9M12 9C7 3 3 5 2 9c5-2 7-1 10 0Zm0 0c4-6 9-4 10 0-4-2-7-1-10 0ZM7 22h10M12 9c-1-4 0-6 3-7"/></>,
    deserts: <><path d="M2 17c5 0 6-10 12-10 4 0 6 4 8 6M2 21c7 0 11-7 20-7M12 12l5 3"/></>,
    coasts: <><path d="M2 7c3-4 7 4 10 0s7 4 10 0M2 13c3-4 7 4 10 0s7 4 10 0M2 19c3-4 7 4 10 0s7 4 10 0"/></>,
    heritage: <><path d="M4 22V8h4V3h3v5h3V3h3v5h3v14ZM10 22v-6a2 2 0 0 1 4 0v6"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

function FlatMap({features, layers, language, hovered, onHover, navigate}) {
  const p=c=>{const [x,y]=project(c);return [(x+10)*40,(8-y)*40];};
  const points=coords=>coords.map(c=>p(c).join(',')).join(' ');
  return <svg className="flat-map" viewBox="0 0 800 680" role="img" aria-label={ui[language].map}>
    {features.flatMap((feature,i)=>feature.polygons.map((polygon,j)=><path key={`${i}-${j}`} d={polygon.map(r=>'M'+r.map(c=>p(c).join(',')).join('L')+'Z').join(' ')} className={feature.id ? `active-region ${hovered===feature.id?'is-hovered':''}`:''} onMouseEnter={()=>onHover(feature.id)} onMouseLeave={()=>onHover(null)} onClick={()=>feature.id&&navigate(pathFor(feature.id))}/>))}
    {layers.map(id=><g key={id} className={`flat-layer ${id}`} fill={geographicLayers[id].color} stroke={geographicLayers[id].color} pointerEvents="none">
      {(geographicLayers[id].paths||[]).map((line,i)=><polyline key={i} points={points(line)} fill="none" strokeWidth={id==='mountains'?13:5}/>) }
      {(geographicLayers[id].areas||[]).map((area,i)=><polygon key={i} points={points(area)} opacity=".7"/>)}
      {(geographicLayers[id].points||[]).map((c,i)=><circle key={i} cx={p(c)[0]} cy={p(c)[1]} r={id==='oases'?13:7} fillOpacity=".6" strokeWidth="3"/>)}
    </g>)}
  </svg>;
}

export default function SaudiMap({language, navigate}) {
  const canvas=useRef(null),scene=useRef(null),labels=useRef({});
  const [features,setFeatures]=useState(null),[fallback,setFallback]=useState(false),[error,setError]=useState(false);
  const [layers,setLayers]=useState([]),[hovered,setHovered]=useState(null),[ready,setReady]=useState(false);
  const currentLayers=useRef(layers);currentLayers.current=layers;
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/data/saudi-regions.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Map data unavailable');return r.json();}).then(setFeatures).catch(e=>{if(e.name!=='AbortError')setError(true);});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(!features||fallback)return;
    let active=true;
    import('./MapScene').then(({createMapScene})=>{
      if(!active)return;
      try {
        scene.current=createMapScene({canvas:canvas.current,features,labels:labels.current,onHover:setHovered,onSelect:id=>navigate(pathFor(id)),onFailure:()=>setFallback(true)});
        scene.current.setLayers(currentLayers.current);setReady(true);
      } catch {setFallback(true);}
    }).catch(()=>active&&setFallback(true));
    return()=>{active=false;scene.current?.dispose();scene.current=null;};
  },[features,fallback,navigate]);
  useEffect(()=>scene.current?.setLayers(layers),[layers]);
  const hover=id=>{setHovered(id);scene.current?.hover(id);};
  return <section className="map-experience" aria-label={ui[language].map}>
    <div className={`map-stage ${fallback?'is-fallback':''}`}>
      {!fallback&&<canvas ref={canvas} className="map-canvas" aria-hidden="true"/>}
      {fallback&&features&&<FlatMap features={features} layers={layers} language={language} hovered={hovered} onHover={hover} navigate={navigate}/>}
      {(!ready&&!fallback&&!error)&&<p className="map-loading" role="status">{ui[language].loading}</p>}
      <nav className={`map-labels ${!ready&&!fallback?'loading-labels':''} ${error?'error-labels':''}`} aria-label={ui[language].map}>
        {regionIds.map(id=>{
          const [x,y]=project(regions[id].coordinate);
          const style=fallback?{left:`${(x+10)/20*100}%`,top:`${(8-y)/17*100}%`}:undefined;
          return <a key={id} ref={node=>{labels.current[id]=node;}} href={pathFor(id)} className={`map-label ${hovered===id?'is-active':''}`} style={style} onClick={e=>{e.preventDefault();navigate(pathFor(id));}} onMouseEnter={()=>hover(id)} onMouseLeave={()=>hover(null)} onFocus={()=>hover(id)} onBlur={()=>hover(null)}>{regions[id].name[language]}</a>;
        })}
      </nav>
    </div>
    <div className="map-toolbar" role="group" aria-label={ui[language].layers}>
      {layerIds.map(id=><button key={id} type="button" aria-pressed={layers.includes(id)} onClick={()=>setLayers(current=>current.includes(id)?current.filter(v=>v!==id):[...current,id])}><LayerIcon type={id}/><span>{ui[language][id]}</span></button>)}
    </div>
    <p className="map-note">{ui[language].schematic}</p>
  </section>;
}
