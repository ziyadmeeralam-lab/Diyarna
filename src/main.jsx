import React, {useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import SaudiMap from './SaudiMap';
import {regions,regionIds,categoryIds,getItems,pathFor,ui} from './data/regions';
import assets from './data/assets.json';
import './styles.css';
import './regional-layout.css';

function useRoute() {
  const [path,setPath]=useState(location.pathname);
  useEffect(()=>{const change=()=>setPath(location.pathname);window.addEventListener('popstate',change);return()=>window.removeEventListener('popstate',change);},[]);
  const navigate=useCallback(path=>{if(location.pathname!==path)history.pushState({},'',path);setPath(path);window.scrollTo({top:0,behavior:'instant'});},[]);
  return [path,navigate];
}
function Link({to,navigate,children,...props}) {
  return <a href={to} {...props} onClick={e=>{if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(to);}}}>{children}</a>;
}
function Brand({language,navigate}) {
  // The Arabic identity remains the brand; accessible English name is the approved country name.
  return <Link to="/" navigate={navigate} className="brand" aria-label={ui[language].home}><span lang="ar" aria-hidden={language==='en'?'true':undefined}>ديارنا</span></Link>;
}
function Header({language,setLanguage,region,category,navigate}) {
  const parent=category?pathFor(region):'/';
  return <header className="site-header">
    <div className="header-start">{region||category?<Link to={parent} navigate={navigate} className="back-link"><span aria-hidden="true">{language==='ar'?'→':'←'}</span><span>{category?`${ui[language].backRegion} ${regions[region].name[language]}`:ui[language].backMap}</span></Link>:<Link to="/" navigate={navigate} className="home-link">{ui[language].home}</Link>}</div>
    <Brand language={language} navigate={navigate}/>
    <div className="language-switch" aria-label={language==='ar'?'اللغة':'Language'} dir="ltr"><button type="button" lang="ar" aria-pressed={language==='ar'} onClick={()=>setLanguage('ar')}>العربية</button><span aria-hidden="true">|</span><button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>En</button></div>
  </header>;
}
function Picture({id,name,language,className=''}) {
  const [failed,setFailed]=useState(false);
  const asset=assets[id];
  useEffect(()=>setFailed(false),[id]);
  return asset&&!failed?<img className={className} src={asset.src} alt={name} style={{objectPosition:asset.position||'50% 50%',objectFit:asset.fit||'cover'}} loading="eager" decoding="async" onError={()=>setFailed(true)}/>:<div className={`missing-image ${className}`} role="img" aria-label={`${name} — ${ui[language].unavailable}`}><span>{name}</span></div>;
}
function RegionLanding({region,language,navigate}) {
  return <main id="main" className="regional-main landing-main" tabIndex="-1">
    <div className="page-heading"><h1>{regions[region].name[language]}</h1></div>
    <div className="landing-grid">
      {categoryIds.map(category=>{
        return <article className="niche" key={category}>
          <Link to={pathFor(region,category)} navigate={navigate} className={`niche-image niche-${category}`} tabIndex={-1} aria-hidden="true"><Picture id={`${region}-landing-${category}`} name="" language={language}/></Link>
          <div className="niche-caption"><h2>{ui[language][category]}</h2><Link to={pathFor(region,category)} navigate={navigate} className="more-link" aria-label={`${ui[language].more}: ${ui[language][category]}`}><span>{ui[language].more}</span><span aria-hidden="true">{language==='ar'?'←':'→'}</span></Link></div>
        </article>;
      })}
    </div>
  </main>;
}
function CategoryPage({region,category,language}) {
  return <main id="main" className={`regional-main detail-main ${category}-page`} tabIndex="-1">
    <div className="page-heading"><p>{regions[region].name[language]}</p><h1>{ui[language][category]}</h1></div>
    <div className={`detail-grid ${category}-grid`}>
      {getItems(region,category,language).map(item=><article className={`item-card ${category}-card`} key={item.id}>
        <div className="item-image"><Picture id={item.id} name={item.name} language={language}/></div>
        <div className="item-caption"><h2>{item.name}</h2><p>{item.description}</p></div>
      </article>)}
    </div>
  </main>;
}
function App() {
  const [path,navigate]=useRoute();
  const [language,setLanguage]=useState(()=>{try{return localStorage.getItem('deyarna-language')==='en'?'en':'ar';}catch{return 'ar';}});
  const parts=path.split('/').filter(Boolean);
  const region=parts[0]==='regions'&&regionIds.includes(parts[1])?parts[1]:null;
  const category=region&&categoryIds.includes(parts[2])?parts[2]:null;
  const valid=path==='/'||(region&&parts.length===2)||(region&&category&&parts.length===3);
  useEffect(()=>{
    document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';
    try{localStorage.setItem('deyarna-language',language);}catch{/* Persistence is optional in restricted browsers. */}
    document.title=[category?ui[language][category]:null,region?regions[region].name[language]:ui[language].country,'ديارنا'].filter(Boolean).join(' | ');
  },[language,region,category]);
  useEffect(()=>{if(path!=='/')document.getElementById('main')?.focus({preventScroll:true});},[path]);
  const background=region&&assets[regions[region].background]?.src;
  return <div className={`app ${region?'region-view':'home-view'} ${region||''} ${language}`} style={background?{'--regional-image':`url("${background}")`}:undefined}>
    <a className="skip-link" href="#main">{ui[language].skip}</a>
    <div className="environment" aria-hidden="true"/>
    {region&&<div className="regional-environment" aria-hidden="true"/>}
    <Header language={language} setLanguage={setLanguage} region={region} category={category} navigate={navigate}/>
    {!valid?<main id="main" className="not-found"><h1>{ui[language].notFound}</h1><Link to="/" navigate={navigate}>{ui[language].backMap}</Link></main>:region?(category?<CategoryPage region={region} category={category} language={language}/>:<RegionLanding region={region} language={language} navigate={navigate}/>):<main id="main" className="home-main" tabIndex="-1"><h1>{ui[language].country}</h1><SaudiMap language={language} navigate={navigate}/></main>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
