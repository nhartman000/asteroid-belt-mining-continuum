'use strict';
// ---------- Stage 3 · Deep Space: outer Solar System chain → interstellar seed probes → galaxy map ----------
// Scene units in the galaxy map are light-years. Sun at origin; +X toward the Galactic Center; +Y toward the North Galactic Pole.
const dEase=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const LY_AU=63241.08, R0_LY=26670; // Sun–Galactic Center ≈ 8.18 kpc (GRAVITY 2019)
const GC_POS=new THREE.Vector3(R0_LY,0,0);
function galPos(ly,l,b){const L=l*Math.PI/180,B=b*Math.PI/180;return new THREE.Vector3(ly*Math.cos(B)*Math.cos(L),ly*Math.sin(B),-ly*Math.cos(B)*Math.sin(L));}
function plType(p){const R=p.R,M=p.M;if(R!=null)return R<1.6?'rocky':R<4?'sub':R<8?'nep':'giant';if(M!=null)return M<5?'rocky':M<20?'sub':M<50?'nep':'giant';return 'sub';}
const PLT={rocky:{n:'Rocky',c:'#ffb36b'},sub:{n:'Super-Earth / sub-Neptune',c:'#ffe066'},nep:{n:'Neptune-like',c:'#6fc3ff'},giant:{n:'Gas giant',c:'#c58bff'},star:{n:'Star only (no confirmed planets)',c:'#ffffff'}};
const DPROPS={
 nep:{n:'Nuclear-electric',ic:'⚛',ve:0.0003,vmin:0.0003,vmax:0.003,v0:0.001,tag:'NEAR-TERM REFERENCE',ref:'Reactor-powered ion/plasma drive, exhaust ≈90 km/s (0.0003 c). Voyager 1 coasts at only 0.0057% c.'},
 fusion:{n:'Fusion pulse',ic:'💥',ve:0.033,vmin:0.01,vmax:0.15,v0:0.05,tag:'FUTURE TECH',ref:'Project Daedalus (British Interplanetary Society, 1978): D-He3 pellet fusion, exhaust ≈0.033 c, flyby of Barnard’s Star at 12% c. Here the probe also brakes, so Δv = 2v.'},
 sail:{n:'Laser sail + magsail brake',ic:'⛵',ve:0,vmin:0.01,vmax:0.2,v0:0.1,tag:'FUTURE TECH',ref:'Breakthrough Starshot: a ~100 GW ground laser pushes gram-scale sails to ~20% c. A seed factory weighs far more, so this assumes a much larger beam array; braking with a magnetic sail (Zubrin & Andrews) adds decades.'}};
const DSCALES=[{id:'solar',n:'☀ Solar',d:0},{id:'nb',n:'✦ Neighborhood',d:28},{id:'arm',n:'🌀 Orion Arm',d:3200},{id:'mw',n:'🌌 Milky Way',d:140000}];
function fmtYr(y){y=Math.max(0,y);if(y<100)return y.toFixed(y<10?1:0)+' yr';if(y<1000)return Math.round(y)+' yr · '+(y/100).toFixed(1)+' centuries';if(y<1e6)return fmt(Math.round(y))+' yr · '+(y/1000).toFixed(y<1e4?1:0)+' millennia';return (y/1e6).toFixed(y<1e7?2:1)+' million yr';}
function fmtLy(d){return d<0.05?fmt(d*LY_AU)+' AU':d<10?d.toFixed(2)+' ly':fmt(Math.round(d))+' ly';}
const Deep={
 sys:null,solar:{},built:false,cam:null,scene:null,dist:28,focus:new THREE.Vector3(),lock:null,tw:null,enterT:0,labels:[],armL:[],_rt:0,_key:'',
 init(){if(this.sys)return;
  this.sys=[...EXO,...EXTRA_STARS].map((s,k)=>{const pls=s.pl.map(p=>({...p,t:plType(p),hz:p.T!=null&&p.T>=175&&p.T<=320}));
   const types=pls.map(p=>p.t);const hz=pls.filter(p=>p.hz).length,rocky=types.filter(t=>t==='rocky').length,giant=types.filter(t=>t==='giant').length;
   let val=s.star?1.5:0;pls.forEach(p=>{val+=({rocky:2.5,sub:1.4,nep:1,giant:1.8})[p.t]*(p.T!=null&&p.T>1200?0.4:1)+(p.hz?3:0);});
   const pulsar=/^PSR/.test(s.host);const hot=pls.length&&pls.every(p=>p.T!=null&&p.T>700);
   const fam=pulsar?['☢','Pulsar system — hostile radiation']:hz?['🌍','Habitable-zone candidate']:giant&&!rocky?['⛽','Gas-giant depot (speculative)']:hot?['🔥','Hostile hot worlds']:['🪨','Stepping stone'];
   const dom=s.star?'star':pls.reduce((a,p)=>({giant:3,nep:2,sub:1,rocky:0})[p.t]>({giant:3,nep:2,sub:1,rocky:0})[a]?p.t:a,'rocky');
   const pt=hz?pls.find(p=>p.hz).t:dom;
   return{...s,k,id:'s'+k,pls,hz,rocky,giant,val:val*(pulsar?0.3:1),fam,type:s.star?'star':pt,pos:galPos(s.ly,s.l,s.b)};});
  // SWEEPS-4 and SWEEPS-11 share a distance estimate — nudge one so both stay visible.
  this.sys.forEach((s,i)=>this.sys.slice(0,i).forEach(o=>{if(o.pos.distanceTo(s.pos)<1)s.pos.x+=60;}));},
 st(){if(!S.deep)S.deep={yr:0,rate:10,run:false,tab:'chain',hubs:{},hubT:{},sandbox:false,prop:'fusion',v:0.05,tmax:500,pick:{},probes:[],col:{},front:null,crew:null,crewN:0,log:[],sel:null,seen:0};return S.deep;},
 log(m){const D=this.st();D.log.unshift({y:D.yr,m});if(D.log.length>40)D.log.length=40;},
 // ---------- solar-system additions (moons, dwarfs, Kuiper belt, outward chain) ----------
 initSolar(){const W=World,sc=W.scene,V=THREE.Vector3;this.init();const o=this.solar;o.moons={};o.dwarfs={};
  SOL_MOONS.forEach(m=>{const P=W.planets[m.p];const r=clamp(Math.cbrt(m.km/1737)*0.16,0.05,0.24);const me=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),new THREE.MeshStandardMaterial({color:m.c,roughness:1,emissive:m.c,emissiveIntensity:0.12}));me.position.copy(P.position).add(new V(...m.off));sc.add(me);o.moons[m.id]=me;});
  SOL_DWARFS.forEach(d=>{const I=d.i*Math.PI/180,w=d.w*Math.PI/180;const pt=nu=>{const r=d.a*(1-d.e*d.e)/(1+d.e*Math.cos(nu))*AU;const a=nu+w;const q=r*Math.sin(a);return new V(r*Math.cos(a),q*Math.sin(I),-q*Math.cos(I));};
   const pts=[];for(let k=0;k<=160;k++)pts.push(pt(k/160*Math.PI*2));const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x4a5a7a,transparent:true,opacity:0.35}));sc.add(ln);
   const r=clamp(Math.cbrt(d.km/1188)*0.9,0.35,0.9);const me=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),new THREE.MeshStandardMaterial({color:d.c,roughness:1,emissive:d.c,emissiveIntensity:0.35}));me.position.copy(pt(d.nu*Math.PI/180));sc.add(me);o.dwarfs[d.id]=me;});
  {const N=2600,p=new Float32Array(N*3),r=mulberry(77);for(let i=0;i<N;i++){const R=(30+Math.pow(r(),0.7)*20+(r()<0.12?r()*25:0))*AU,a=r()*Math.PI*2;p.set([R*Math.cos(a),(r()-0.5)*R*0.12,R*Math.sin(a)],i*3);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const pm=new THREE.Points(g,new THREE.PointsMaterial({color:0xa9c2e8,size:1.6,sizeAttenuation:true,transparent:true,opacity:0.55,depthWrite:false}));pm.frustumCulled=false;sc.add(pm);o.kuiper=pm;}
  // jump-off marker
  {const m=new THREE.Mesh(new THREE.OctahedronGeometry(3.2),new THREE.MeshBasicMaterial({color:0x3ef0ff,wireframe:true}));m.position.copy(this.hubPos('jump'));sc.add(m);o.jumpM=m;
   const hp=new THREE.Mesh(new THREE.RingGeometry(120*AU-2,120*AU+2,160),new THREE.MeshBasicMaterial({color:0x3ef0ff,transparent:true,opacity:0.08,side:THREE.DoubleSide}));hp.rotation.x=-Math.PI/2;sc.add(hp);}
  o.chain=new THREE.Group();sc.add(o.chain);this.redrawChain();
  const ov=$('#lab-solar');o.lab=[];const add=(n,cls,get,min,max)=>{const b=document.createElement('div');b.className='plab '+cls;b.textContent=n;ov.appendChild(b);o.lab.push({b,get,min,max});};
  ['Earth','Jupiter','Saturn','Uranus','Neptune','Mars','Venus','Mercury'].forEach(n=>add(n,'pl',()=>W.planets[n].position,0,1e9));
  SOL_DWARFS.forEach(d=>add(d.n,'dw',()=>o.dwarfs[d.id].position,60,1e9));
  SOL_MOONS.forEach(m=>add(m.n.split(' (')[0],'mo',()=>o.moons[m.id].position,0,45));
  add('🚀 Jump-off · 120 AU','hub',()=>o.jumpM.position,150,1e9);add('Kuiper belt','dw',()=>new V(-45*AU*0.7,0,45*AU*0.7),150,1e9);},
 hubPos(id){const W=World,V=THREE.Vector3,o=this.solar;const h=DEEP_HUBS.find(x=>x.id===id);
  if(id==='belt'){const b=typeof Continuum!=='undefined'&&Continuum.built?Continuum.built():[];if(b.length&&W.T[b[b.length-1]])return W.T[b[b.length-1]].pos.clone();return W.T.ceres?W.T.ceres.pos.clone():new V(27,0,0);}
  if(id==='jump'){const p=o.dwarfs&&o.dwarfs.pluto?o.dwarfs.pluto.position.clone().setY(0).normalize():new V(1,0,0);return p.multiplyScalar(120*AU);}
  if(o.moons&&o.moons[h.at])return o.moons[h.at].position.clone();if(o.dwarfs&&o.dwarfs[h.at])return o.dwarfs[h.at].position.clone();if(W.planets[h.at])return W.planets[h.at].position.clone();return new V(h.a*AU,0,0);},
 redrawChain(){const o=this.solar;if(!o.chain)return;while(o.chain.children.length){const c=o.chain.children.pop();c.geometry.dispose();c.material.dispose();}
  const D=this.st();for(let i=0;i<DEEP_HUBS.length-1;i++){const a=this.hubPos(DEEP_HUBS[i].id),b=this.hubPos(DEEP_HUBS[i+1].id);const done=this.hubDone(DEEP_HUBS[i+1].id),act=!done&&this.hubActive(i+1);
   const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineDashedMaterial({color:done?0x5dff8a:act?0xffc640:0x3ef0ff,dashSize:done?6:3,gapSize:done?1:4,transparent:true,opacity:done?0.9:act?0.85:0.3}));l.computeLineDistances();o.chain.add(l);}},
 // ---------- chain progression ----------
 beltDone(){const D=this.st();return D.sandbox||!!S.report||(typeof Continuum!=='undefined'&&Continuum.built&&Continuum.built().length>0);},
 hubDone(id){if(id==='belt')return this.beltDone();return !!this.st().hubs[id];},
 hubActive(i){return i>0&&this.hubDone(DEEP_HUBS[i-1].id)&&!this.hubDone(DEEP_HUBS[i].id)&&this.st().run;},
 hubPlan(i){const h=DEEP_HUBS[i],p=DEEP_HUBS[i-1];const am=(h.a+p.a)/2;const hoh=0.5*Math.pow(am,1.5);const tr=hoh*0.4;const fission=h.a>5;const build=fission?7+Math.sqrt(h.a):5;return{hoh,tr,build,dur:tr+build,solar:100/(h.a*h.a),fission};},
 chainDone(){return this.hubDone('jump');},
 // ---------- interstellar math ----------
 vOf(){const D=this.st(),P=DPROPS[D.prop];return clamp(D.v,P.vmin,P.vmax);},
 brakeYr(v){return this.st().prop==='sail'?Math.max(5,v*400):0;},
 massRatio(v){const P=DPROPS[this.st().prop];return P.ve?Math.exp(2*v/P.ve):1;},
 feas(s,fromLy){const v=this.vOf(),d=fromLy!=null?fromLy:s.ly;const trip=d/v+this.brakeYr(v);const mr=this.massRatio(v);const D=this.st();const ok=trip<=D.tmax&&mr<=100;return{trip,mr,ok,why:mr>100?'mass ratio '+fmt(mr)+' > 100':trip>D.tmax?'trip '+fmtYr(trip)+' > limit':'',score:ok?s.val*(1-0.5*trip/D.tmax):0};},
 buildYr(){const D=this.st();return D.prop==='sail'?55:D.prop==='nep'?70:45;},
 hop(){return this.vOf()*this.st().tmax;},
 waveV(){const h=8,v=this.vOf();return h/(h/v+this.buildYr());},
 autoPick(){const D=this.st();D.pick={};this.sys.map(s=>[s,this.feas(s)]).filter(x=>x[1].ok).sort((a,b)=>b[1].score-a[1].score).slice(0,3).forEach(([s])=>D.pick[s.id]=1);},
 launch(){const D=this.st();const ids=Object.keys(D.pick).filter(id=>D.pick[id]&&!D.col[id]&&!D.probes.some(p=>p.to===id&&!p.done));if(!ids.length){toast('Pick at least one admissible, unclaimed target first.','y');return;}
  const v=this.vOf();ids.forEach(id=>{const s=this.byId(id);D.probes.push({from:null,to:id,t0:D.yr,t1:D.yr+s.ly/v+this.brakeYr(v),v,done:0});});D.pick={};D.run=true;D.seen=1;if(D.rate<100)D.rate=100;
  this.log(`🚀 ${ids.length} seed probe${ids.length>1?'s':''} launched at ${(v*100).toFixed(1)}% c`);sfx('launch');toast(`🚀 <b>${ids.length} TCTA seed probe${ids.length>1?'s':''}</b> away. Each one builds a factory on arrival and sends more probes.`);this.netDirty=1;App.refresh(true);},
 followShip(){const D=this.st();if(!D.ship)return;this.lockShip=true;this.lock=null;if(this.dist>40)this.tween(14,1.2);App.refresh(true);},
 byId(id){return this.sys.find(s=>s.id===id);},
 // ---------- the uncrewed Marauder's Daughter: waystation-to-waystation interstellar route ----------
 SHIP_RANGE:9,SVC_YR:3,
 legDepots(D,fromId,toId){return(D.depots||[]).filter(d=>d.from===fromId&&d.to===toId).sort((a,b)=>a.f-b.f);},
 stopPos(st){return st.k==='sun'?new THREE.Vector3():st.k==='col'?this.byId(st.id).pos.clone():new THREE.Vector3().fromArray(st.pos);},
 stopReadyT(st){const D=this.st();if(st.k==='sun')return 0;if(st.k==='col'){const c=D.col[st.id];return c?c.ready:1e12;}const d=(D.depots||[]).find(x=>x.id===st.id);return d?d.ready:1e12;},
 shipTargets(){const D=this.st();return this.sys.filter(s=>D.col[s.id]&&D.col[s.id].via==='probe');},
 shipTarget(){const D=this.st();const T=this.shipTargets();if(!T.length)return null;const sel=D.sel&&T.find(s=>s.id===D.sel);if(sel)return sel;const rd=T.filter(s=>D.yr>=D.col[s.id].ready);return (rd.length?rd:T).slice().sort((a,b)=>a.ly-b.ly)[0];},
 buildRoute(tgt){const D=this.st();const path=[];let id=tgt.id,g=0;while(id&&g++<60){path.unshift(id);id=D.col[id]&&D.col[id].from;}
  const stops=[{k:'sun',id:'sun',n:'Jump-off waystation (120 AU)'}];let prev=null;
  path.forEach(cid=>{this.legDepots(D,prev,cid).forEach(d=>stops.push({k:'dep',id:d.id,n:d.n,pos:d.pos}));stops.push({k:'col',id:cid,n:this.byId(cid).host+' waystation'});prev=cid;});return stops;},
 shipGo(){const D=this.st();if(D.ship&&!D.ship.done)return;const tgt=this.shipTarget();if(!tgt){toast('The uncrewed Marauder’s Daughter needs a probe-built colony waystation to fly to.','y');return;}
  const v=Math.min(this.vOf(),0.05);const stops=this.buildRoute(tgt);
  D.ship={to:tgt.id,v,stops,i:0,mode:'svc',left:this.SVC_YR,fuel:100,wear:0,spares:100,t0:D.yr,done:0,served:0,waited:0,warn:{}};D.shipN=(D.shipN||0)+1;D.run=true;
  this.log(`🛰 Uncrewed Marauder’s Daughter departs for ${tgt.host}: ${stops.length-1} waystation hops at ${(v*100).toFixed(1)}% c`);sfx('launch');
  toast(`🛰 <b>The Marauder’s Daughter</b> flies <b>UNCREWED · autonomous</b> to <b>${esc(tgt.host)}</b>, hopping ${stops.length-1} waystations for refuel, repair and resupply.`);this.netDirty=1;App.refresh(true);},
 crewGo(){this.shipGo();},
 shipTick(D,t0,t1){const sh=D.ship;if(!sh||sh.done)return 0;let T=t0,ch=0,g=0;
  while(T<t1-1e-9&&!sh.done&&g++<400){const st=sh.stops[sh.i];
   if(sh.mode==='svc'){const rt=this.stopReadyT(st);
    if(T<rt){const w=Math.min(t1,rt)-T;sh.waited+=w;sh.wear=Math.min(100,sh.wear+w*0.25);sh.waiting=1;if(!sh.warn['w'+sh.i]){sh.warn['w'+sh.i]=1;this.log(`⏳ Marauder’s Daughter holding at ${st.n}: waystation still being built (wear rising)`);ch=1;}T+=w;continue;}
    sh.waiting=0;const s=Math.min(t1-T,sh.left);const k=s/sh.left;sh.fuel+=(100-sh.fuel)*k;sh.wear-=sh.wear*k;sh.spares+=(100-sh.spares)*k;sh.left-=s;T+=s;
    if(sh.left<=1e-9){sh.served++;ch=1;if(sh.i>0)this.log(`🔧 Serviced at ${st.n}: refuelled, repaired, resupplied`);
     if(sh.i===sh.stops.length-1){sh.done=1;sh.t1=T;this.log(`🎉 Uncrewed Marauder’s Daughter reached ${this.byId(sh.to).host} after ${sh.stops.length-1} hops`);toast(`🎉 <b>The Marauder’s Daughter</b> (uncrewed) reached <b>${esc(this.byId(sh.to).host)}</b>: ${sh.served-1} waystation services kept it fuelled and repaired.`,'g');Music.sting&&Music.sting();sfx('success');break;}
     sh.mode='cruise';const L=this.stopPos(st).distanceTo(this.stopPos(sh.stops[sh.i+1]));sh.legL=L;sh.legT=L/sh.v;sh.left=sh.legT;}
    continue;}
   const s=Math.min(t1-T,sh.left);const ly=s*sh.v;sh.fuel=Math.max(0,sh.fuel-ly/this.SHIP_RANGE*100);sh.wear=Math.min(100,sh.wear+ly*1.6);sh.spares=Math.max(0,sh.spares-ly*1.2);sh.left-=s;T+=s;
   if(sh.fuel<25&&!sh.warn['f'+sh.i]){sh.warn['f'+sh.i]=1;ch=1;this.log(`⚠ Low fuel on the leg to ${sh.stops[sh.i+1].n}`);}
   if(sh.left<=1e-9){sh.i++;sh.mode='svc';sh.left=sh.i===sh.stops.length-1?this.SVC_YR*0.5:this.SVC_YR;ch=1;}}
  return ch;},
 shipPos(){const D=this.st(),sh=D.ship;if(!sh)return null;const a=this.stopPos(sh.stops[sh.i]);if(sh.mode==='svc'||sh.done)return a;const b=this.stopPos(sh.stops[sh.i+1]);return a.lerp(b,clamp(1-sh.left/sh.legT,0,1));},
 shipStatus(){const sh=this.st().ship;if(!sh)return'';if(sh.done)return'arrived';const st=sh.stops[sh.i];if(sh.mode==='svc')return sh.waiting?`holding at ${st.n} (waystation not ready)`:`servicing at ${st.n}: refuel + repair ${Math.round((1-sh.left/(sh.i===sh.stops.length-1?this.SVC_YR*0.5:this.SVC_YR))*100)}%`;return`cruising to ${sh.stops[sh.i+1].n}`;},
 tick(dt){const D=S.deep;if(!D||!D.run)return;const ddt=Math.min(dt,0.1)*D.rate;D.yr+=ddt;let ch=0;
  for(let i=1;i<DEEP_HUBS.length;i++){const h=DEEP_HUBS[i];if(D.hubs[h.id])continue;if(!this.hubDone(DEEP_HUBS[i-1].id))break;if(!D.hubT[h.id])D.hubT[h.id]={t0:D.yr,dur:this.hubPlan(i).dur};
   if(D.yr>=D.hubT[h.id].t0+D.hubT[h.id].dur){D.hubs[h.id]=1;ch=1;this.log(`${h.ic} ${h.n} online · ${h.where}`);toast(`${h.ic} <b>${h.n}</b> online at ${h.where}.${h.id==='jump'?' Interstellar seed probes unlocked!':''}`,'g');sfx('build');if(h.id==='jump'){Music.sting&&Music.sting();D.tab='target';if(!Object.keys(D.pick).length)this.autoPick();}}break;}
  const bt=this.buildYr(),hop=this.hop(),v=this.vOf();
  D.probes.forEach(p=>{if(p.done||D.yr<p.t1)return;p.done=1;ch=1;if(!D.col[p.to]){D.col[p.to]={arr:p.t1,ready:p.t1+bt,sent:0,via:'probe',from:p.from||null};this.addDepots(D,p);const s=this.byId(p.to);this.log(`🏭 Probe arrived at ${s.host} (${fmtLy(s.ly)}) — building factory + waystations`);}});
  this.sys.forEach(s=>{const c=D.col[s.id];if(!c||c.sent||D.yr<c.ready)return;c.sent=1;ch=1;
   if(!D.front){D.front={t0:c.ready,r0:s.ly};this.log(`🌊 First colony ready at ${s.host}: the replication wave begins`);toast(`🌊 <b>${esc(s.host)}</b> colony ready — its factories build new probes. The wave spreads!`,'g');Music.sting&&Music.sting();}
   const cand=this.sys.filter(o=>o!==s&&!D.col[o.id]&&!D.probes.some(p=>p.to===o.id&&!p.done)).map(o=>[o,o.pos.distanceTo(s.pos)]).filter(x=>x[1]<=hop).sort((a,b)=>a[1]-b[1]).slice(0,2);
   cand.forEach(([o,d])=>D.probes.push({from:s.id,to:o.id,t0:D.yr,t1:D.yr+d/v+this.brakeYr(v),v,done:0}));});
  if(D.front){const R=this.frontR();this.sys.forEach(s=>{if(!D.col[s.id]&&s.ly<=R){const arr=D.front.t0+(s.ly-D.front.r0)/this.waveV();D.col[s.id]={arr,ready:arr+bt,sent:1,via:'wave'};ch=1;}});}
  if(this.shipTick(D,D.yr-ddt,D.yr))ch=1;
  if(ch){this.netDirty=1;this.redrawChain();}},
 addDepots(D,p){D.depots=D.depots||[];const a=p.from?this.byId(p.from).pos:new THREE.Vector3(),b=this.byId(p.to).pos;const L=a.distanceTo(b);const n=Math.ceil(L/7);for(let k=1;k<n;k++){const f=k/n;const q=a.clone().lerp(b,f);D.depots.push({id:'d'+D.depots.length,from:p.from||null,to:p.to,f,pos:q.toArray().map(x=>+x.toFixed(4)),ready:p.t0+(p.t1-p.t0)*f+12,n:'Relay depot '+(D.depots.length+1)});}},
 frontR(){const D=this.st();if(!D.front)return 0;return Math.min(80000,D.front.r0+Math.max(0,D.yr-D.front.t0)*this.waveV());},
 starsReached(R){if(R<=0)return 0;const n=0.004;const v=R<500?4/3*Math.PI*R*R*R:Math.PI*R*R*1000*Math.exp(-R/60000);return Math.min(2e11,v*n);},
 // ---------- galaxy scene ----------
 build(){if(this.built)return;this.built=true;this.init();const sc=new THREE.Scene();this.scene=sc;this.cam=new THREE.PerspectiveCamera(55,1,0.0001,4e5);
  const VS=`attribute float size;attribute vec3 color;uniform float uFront;uniform float uPx;varying vec3 vC;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;float f=(uFront>0.0&&length(position)<uFront)?1.0:0.0;vC=mix(color,vec3(0.3,1.0,0.5)*max(0.6,length(color)),f*0.85);gl_PointSize=size*uPx;}`;
  const FS=`varying vec3 vC;void main(){vec2 q=gl_PointCoord-0.5;float d=length(q);float a=smoothstep(0.5,0.05,d);gl_FragColor=vec4(vC*a,a);}`;
  const px=Math.min(2,window.devicePixelRatio||1);this.uni={uFront:{value:0},uPx:{value:px}};
  const mk=(P,C,Z)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.setAttribute('size',new THREE.BufferAttribute(Z,1));const m=new THREE.ShaderMaterial({uniforms:this.uni,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});const p=new THREE.Points(g,m);p.frustumCulled=false;return p;};
  // procedural Milky Way: 4 log-spiral arms (12° pitch) + Orion Spur + bar/bulge + thin disk
  const r=mulberry(4242),gs=()=>{let u=0;for(let k=0;k<4;k++)u+=r();return (u-2)/0.58;};const P=[],C=[],Z=[];const tp=Math.tan(12*Math.PI/180);
  const put=(x,y,z,c,s)=>{P.push(x,y,z);C.push(...c);Z.push(s);};
  const arms=[[33100,[0.55,0.7,1]],[21700,[0.7,0.8,1]],[15900,[0.6,0.72,1]],[11600,[0.75,0.7,1]]];this.arms=[];
  arms.forEach(([rr,c],ai)=>{for(let k=0;k<4600;k++){const R=7000+Math.pow(r(),0.85)*50000;const th=Math.PI+Math.log(R/rr)/tp;const w=900+R*0.025;const x=R0_LY+R*Math.cos(th)+gs()*w,z=R*Math.sin(th)+gs()*w,y=gs()*(230+R*0.004);const br=0.35+r()*0.5;put(x,y,z,c.map(v=>v*br),1.2+r()*1.6);}});
  for(let k=0;k<1800;k++){const R=23500+r()*6500;const th=Math.PI+Math.log(R/R0_LY)/Math.tan(10*Math.PI/180);const x=R0_LY+R*Math.cos(th)+gs()*500,z=R*Math.sin(th)+gs()*500,y=gs()*200;const br=0.35+r()*0.4;put(x,y,z,[0.75*br,0.85*br,br],1.2+r()*1.4);}
  for(let k=0;k<5200;k++){const u=gs()*5200,v=gs()*1900,a=27*Math.PI/180;const x=R0_LY-(u*Math.cos(a)-v*Math.sin(a)),z=u*Math.sin(a)+v*Math.cos(a),y=gs()*1300*Math.exp(-Math.abs(u)/5000);const br=0.45+r()*0.5;put(x,y,z,[br,br*0.82,br*0.55],1.3+r()*2);}
  for(let k=0;k<6000;k++){const R=-Math.log(1-r()*0.98)*11000+800,th=r()*Math.PI*2;put(R0_LY+R*Math.cos(th),gs()*350,R*Math.sin(th),[0.32,0.34,0.42].map(v=>v*(0.5+r())),1+r());}
  const gal=mk(new Float32Array(P),new Float32Array(C),new Float32Array(Z));sc.add(gal);this.gal=gal;
  // illustrative local stars within ~60 ly (NOT catalog data) + Oort cloud shell
  {const P=[],C=[],Z=[];for(let k=0;k<700;k++){const d=Math.cbrt(r())*60,v=galPos(d,r()*360,Math.asin(2*r()-1)*180/Math.PI);const t=r();const c=t<0.75?[1,0.62,0.45]:t<0.93?[1,0.9,0.75]:[0.75,0.85,1];const br=0.35+r()*0.35;P.push(v.x,v.y,v.z);C.push(...c.map(x=>x*br));Z.push(1.4+r()*1.2);}
   for(let k=0;k<1600;k++){const d=0.03+Math.pow(r(),0.6)*1.55,v=galPos(d,r()*360,Math.asin(2*r()-1)*180/Math.PI);P.push(v.x,v.y,v.z);C.push(0.08,0.1,0.15);Z.push(1);}
   for(let k=0;k<1500;k++){const R=(30+Math.pow(r(),0.7)*20)/LY_AU,a=r()*Math.PI*2;P.push(R*Math.cos(a),(r()-0.5)*R*0.12,R*Math.sin(a));C.push(0.45,0.55,0.7);Z.push(1.3);}
   sc.add(mk(new Float32Array(P),new Float32Array(C),new Float32Array(Z)));}
  // planet orbits at true scale (AU → ly) + heliopause ring
  [...PLANETS.map(p=>[p.a,0x2a4a70]),[120,0x3ef0ff]].forEach(([a,c])=>{const R=a/LY_AU;const pts=[];for(let k=0;k<=96;k++){const t=k/96*Math.PI*2;pts.push(new THREE.Vector3(R*Math.cos(t),0,R*Math.sin(t)));}sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:c,transparent:true,opacity:0.5,depthTest:false})));});
  // catalog systems
  {const N=this.sys.length+1,P=new Float32Array(N*3),C=new Float32Array(N*3),Z=new Float32Array(N);this.sys.forEach((s,i)=>{P.set([s.pos.x,s.pos.y,s.pos.z],i*3);Z[i]=s.star?7:8;});P.set([0,0,0],(N-1)*3);C.set([1,0.9,0.55],(N-1)*3);Z[N-1]=12;
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.setAttribute('size',new THREE.BufferAttribute(Z,1));
   const m=new THREE.ShaderMaterial({uniforms:{uFront:{value:0},uPx:this.uni.uPx},vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});const pp=new THREE.Points(g,m);pp.frustumCulled=false;pp.renderOrder=5;sc.add(pp);this.sysPts=pp;this.recolor();}
  // soft glow for the galaxy disk at large scale
  {const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');const gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);const tex=new THREE.CanvasTexture(cv);
   this.glowM=new THREE.SpriteMaterial({map:tex,color:0x8899cc,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
   const core=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,color:0xffd9a0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));core.position.copy(GC_POS);core.scale.setScalar(16000);sc.add(core);this.core=core;
   for(let k=0;k<70;k++){const R=6000+r()*45000,ai=k%4,th=Math.PI+Math.log(R/arms[ai][0])/tp;const s=new THREE.Sprite(this.glowM);s.position.set(R0_LY+R*Math.cos(th),0,R*Math.sin(th));s.scale.setScalar(5000+r()*6000);sc.add(s);}}
  // frontier sphere, probe lines, probe dots, waystation rings, ship marker
  this.front=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:0x5dff8a,wireframe:true,transparent:true,opacity:0.09,depthTest:false}));this.front.visible=false;sc.add(this.front);
  this.net=new THREE.Group();sc.add(this.net);
  {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(300*3),3));this.dots=new THREE.Points(g,new THREE.PointsMaterial({color:0x3ef0ff,size:6,sizeAttenuation:false,transparent:true,depthTest:false}));this.dots.frustumCulled=false;sc.add(this.dots);}
  {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(3),3));g.setDrawRange(0,0);this.stations=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:{uPx:this.uni.uPx},vertexShader:'uniform float uPx;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=15.0*uPx;}',fragmentShader:'void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.42,d)*smoothstep(0.26,0.34,d);gl_FragColor=vec4(vec3(0.24,0.94,1.0)*a,a);}',transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending}));this.stations.frustumCulled=false;this.stations.renderOrder=6;sc.add(this.stations);}
  {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(3),3));this.crewDot=new THREE.Points(g,new THREE.PointsMaterial({color:0xffc640,size:11,sizeAttenuation:false,transparent:true,depthTest:false}));this.crewDot.frustumCulled=false;this.crewDot.visible=false;sc.add(this.crewDot);}
  // labels
  const ov=$('#lab-deep');this.labels=this.sys.map(s=>{const b=document.createElement('button');b.className='tlabel dl';b.dataset.act='deepSel';b.dataset.id=s.id;b.style.display='none';ov.appendChild(b);return b;});
  const sunL=document.createElement('div');sunL.className='plab sun';sunL.textContent='☀ Sun';ov.appendChild(sunL);this.sunL=sunL;
  this.armL=[['Perseus Arm',33100],['Sagittarius–Carina Arm',21700],['Scutum–Centaurus Arm',15900],['Norma Arm',11600]].map(([n,rr],i)=>{const R=[40000,30000,24000,19000][i];const th=Math.PI+Math.log(R/rr)/tp;return{n,p:new THREE.Vector3(R0_LY+R*Math.cos(th),0,R*Math.sin(th))};});
  this.armL.push({n:'Orion Spur (we are here)',p:new THREE.Vector3(1500,0,-2500),near:1},{n:'Galactic Center · Sgr A*',p:GC_POS.clone()},{n:'Central bar',p:new THREE.Vector3(R0_LY-4200,0,2200)});
  this.armL.forEach(a=>{const d=document.createElement('div');d.className='plab arm';d.textContent=a.n;ov.appendChild(d);a.el=d;});},
 recolor(){if(!this.sysPts)return;const D=this.st(),C=this.sysPts.geometry.attributes.color;this.sys.forEach((s,i)=>{const c=D.col[s.id];let col;if(c)col=D.yr>=c.ready?[0.36,1,0.54]:[0.2,0.75,0.95];else col=new THREE.Color(PLT[s.type].c).toArray();C.setXYZ(i,...col);});C.needsUpdate=true;},
 rebuildNet(){const D=this.st();while(this.net.children.length){const c=this.net.children.pop();c.geometry.dispose();c.material.dispose();}
  const segs=[],segsD=[];D.probes.forEach(p=>{const a=p.from?this.byId(p.from).pos:new THREE.Vector3(),b=this.byId(p.to).pos;(p.done?segsD:segs).push(a.x,a.y,a.z,b.x,b.y,b.z);});
  const L=(arr,c,o)=>{if(!arr.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(arr),3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:c,transparent:true,opacity:o,depthTest:false}));l.frustumCulled=false;this.net.add(l);};
  L(segsD,0x5dff8a,0.55);L(segs,0x3ef0ff,0.35);if(D.ship){const r=[];const P=D.ship.stops.map(st=>this.stopPos(st));for(let i=0;i<P.length-1;i++)r.push(P[i].x,P[i].y,P[i].z,P[i+1].x,P[i+1].y,P[i+1].z);L(r,0xffc640,0.85);}
  const sp=[];this.sys.forEach(s=>{if(D.col[s.id])sp.push(s.pos.x,s.pos.y,s.pos.z);});(D.depots||[]).forEach(d=>sp.push(...d.pos));const g=this.stations.geometry;g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(sp.length?sp:[0,0,0]),3));g.setDrawRange(0,sp.length/3);this.recolor();},
 show(on){const el=$('#lab-deep');if(el)el.style.display=on?'':'none';},
 enter(fromSolar){this.build();this.netDirty=1;const D=this.st();this.enterT=performance.now();this.lock=null;this.tw=null;
  if(fromSolar){this.dist=0.004;this.focus.set(0,0,0);this.tween(9,2.2);}else if(this.dist<0.01)this.dist=28;go('deep');},
 tween(d1,dur){this.tw={d0:this.dist,d1,t:0,dur:dur||1.2};},
 scaleTo(id){if(id==='solar'){this.exitToSolar();return;}const s=DSCALES.find(x=>x.id===id);this.lock=null;this.lockShip=false;this.tween(s.d,1.4);World.cam.phi=id==='mw'?0.55:id==='arm'?0.8:1.0;sfx('tap');},
 exitToSolar(){go('solar');const W=World;W.cam.dist=1300;W.flyTo(new THREE.Vector3(0,0,0),420,1.6);},
 zoom(f){if(this.tw){this.tw.d1*=Math.pow(f,2.4);}this.dist=clamp(this.dist*Math.pow(f,2.4),0.0018,240000);
  if(this.dist<=0.0018&&f<1&&performance.now()-this.enterT>900)this.exitToSolar();},
 scaleName(){const d=this.dist;return d<0.05?'Solar System':d<2?'Oort Cloud':d<150?'Solar Neighborhood':d<12000?'Orion Arm':'Milky Way';},
 render(renderer,dt){const W=World,c=W.cam;if(this.tw){this.tw.t+=dt/this.tw.dur;const k=dEase(Math.min(1,this.tw.t));this.dist=Math.exp(lerp(Math.log(this.tw.d0),Math.log(this.tw.d1),k));if(this.tw.t>=1)this.tw=null;}
  const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);const k=sm((Math.log10(this.dist)-3.4)/1.3);const lp=this.lockShip&&S.deep&&S.deep.ship?this.shipPos():this.lock?this.byId(this.lock).pos.clone():null;const tgt=lp?lp.multiplyScalar(1-k).addScaledVector(GC_POS,k*0.8):GC_POS.clone().multiplyScalar(k);this.focus.lerp(tgt,1-Math.exp(-dt*4));
  const cam=this.cam;const sz=renderer.getSize(new THREE.Vector2());cam.aspect=sz.x/Math.max(1,sz.y);const v=new THREE.Vector3().setFromSphericalCoords(this.dist,c.phi,c.theta);cam.position.copy(this.focus).add(v);cam.up.set(0,1,0);cam.lookAt(this.focus);const top=this._hudB||0,bot=this._sheetT||sz.y;const yc=(top+bot)/2;const off=clamp(sz.y/2-yc,-sz.y*0.3,sz.y*0.3);if(Math.abs(off)>2)cam.setViewOffset(sz.x,sz.y,0,off,sz.x,sz.y);else cam.clearViewOffset();cam.near=Math.max(1e-6,this.dist*0.01);cam.far=4e5;cam.updateProjectionMatrix();
  const D=this.st();const R=this.frontR();this.uni.uFront.value=R;this.front.visible=R>0;if(R>0)this.front.scale.setScalar(R);
  this.glowM.opacity=0.07*sm((Math.log10(this.dist)-3.3)/1.2);this.core.material.opacity=0.5*sm((Math.log10(this.dist)-3.6)/1.0);
  if(this.netDirty){this.netDirty=0;this.rebuildNet();}
  const pa=this.dots.geometry.attributes.position;let n=0;D.probes.forEach(p=>{if(p.done||n>=300)return;const a=p.from?this.byId(p.from).pos:new THREE.Vector3(),b=this.byId(p.to).pos;const t=clamp((D.yr-p.t0)/(p.t1-p.t0),0,1);pa.setXYZ(n++,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);});pa.needsUpdate=true;this.dots.geometry.setDrawRange(0,n);
  if(D.ship&&!D.ship.done){const q=this.shipPos();this.crewDot.geometry.attributes.position.setXYZ(0,q.x,q.y,q.z);this.crewDot.geometry.attributes.position.needsUpdate=true;this.crewDot.visible=true;this.crewDot.material.size=D.ship.mode==='svc'?11+4*Math.sin(performance.now()/180):11;}else this.crewDot.visible=false;
  if(D.run&&((this._rc=(this._rc||0)+1)%20===0))this.recolor();
  renderer.render(this.scene,cam);},
 project(p,o){const v=p.clone().project(this.cam);const sz=World.renderer.getSize(new THREE.Vector2());o.x=(v.x+1)/2*sz.x;o.y=(1-v.y)/2*sz.y;o.vis=v.z<1&&v.z>-1&&o.x>-20&&o.x<sz.x+20&&o.y>-20&&o.y<sz.y+20;return o;},
 tap(x,y){if(!this.built)return;let best=null,bd=30;const o={};this.sys.forEach(s=>{this.project(s.pos,o);if(!o.vis)return;const d=Math.hypot(o.x-x,o.y-y);if(d<bd){bd=d;best=s;}});if(best)this.select(best.id);},
 select(id){const D=this.st();D.sel=id;this.lockShip=false;D.tab='info';const s=this.byId(id);this.lock=id;if(this.dist>s.ly*3+20||this.dist>9000)this.tween(Math.max(6,Math.min(s.ly*0.6,3000)),1.3);sfx('select');App.refresh(true);},
 updLabels(){const v=View.cur;if(v==='solar'&&this.solar.lab)this.solLabels();if(v!=='deep'||!this.built)return;
  const D=this.st(),o={};const sh=document.querySelector('#v-deep .deepsheet');const top=sh?sh.getBoundingClientRect().top:1e9;this._sheetT=sh?top:0;const hd=document.querySelector('#v-deep .deeptop');const hb=hd?hd.getBoundingClientRect().bottom:96;this._hudB=hb;const placed=[];const free=(x,y,w)=>{for(const p of placed)if(Math.abs(p[0]-x)<(w+p[2])/2&&Math.abs(p[1]-y)<22)return false;placed.push([x,y,w]);return true;};
  this.project(new THREE.Vector3(),o);const sv=o.vis&&o.y<top-6&&o.y>hb+8;this.sunL.textContent=this.dist>2500?'☀ You are here':'☀ Sun';this.sunL.style.display=sv?'':'none';if(sv){this.sunL.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,-160%)`;free(o.x,o.y,60);}
  if(!this.shipL){this.shipL=document.createElement('div');this.shipL.className='shipl';$('#lab-deep').appendChild(this.shipL);this.depL=[];}
  {const sh=D.ship;let vis=false;if(sh&&!sh.done){this.project(this.shipPos(),o);vis=o.vis&&o.y<top-6&&o.y>hb+8;if(vis){free(o.x,o.y+26,200);const h=`🛰 MARAUDER’S DAUGHTER · <b>UNCREWED</b><small>${esc(this.shipStatus())}</small><span class="bars"><i style="--v:${sh.fuel}%;--c:var(--cyan)">⛽ ${Math.round(sh.fuel)}%</i><i style="--v:${100-sh.wear}%;--c:${sh.wear>70?'var(--red)':'var(--green)'}">🔧 hull ${Math.round(100-sh.wear)}%</i><i style="--v:${sh.spares}%;--c:var(--gold)">📦 ${Math.round(sh.spares)}%</i></span>`;if(this.shipL._h!==h){this.shipL.innerHTML=h;this.shipL._h=h;}this.shipL.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,22px)`;}}this.shipL.style.display=vis?'':'none';}
  {const deps=D.depots||[];while(this.depL.length<Math.min(deps.length,60)){const d=document.createElement('div');d.className='plab dep';$('#lab-deep').appendChild(d);this.depL.push(d);}
   this.depL.forEach((el,i)=>{const d=deps[i];let vis=false;if(d&&this.dist<90){this.project(new THREE.Vector3().fromArray(d.pos),o);vis=o.vis&&o.y<top-6&&o.y>hb+8&&free(o.x,o.y,150);if(vis){const t=`◇ ${d.n} · ${D.yr>=d.ready?'⛽ fuel + 🔧 spares':'🛠 building'}`;if(el._t!==t){el._t=t;el.textContent=t;}el.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,-150%)`;}}el.style.display=vis?'':'none';});}
  const ord=[...this.sys].sort((a,b)=>(b.id===D.sel)-(a.id===D.sel)||(!!D.col[b.id])-(!!D.col[a.id])||a.ly-b.ly);
  ord.forEach(s=>{const b=this.labels[s.k];this.project(s.pos,o);let vis=o.vis&&o.y<top-6&&o.y>hb+8;const nm=s.host;const w=nm.length*7+34;if(vis)vis=free(o.x,o.y,w);b.style.display=vis?'flex':'none';if(!vis)return;b.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,-150%)`;
   const c=D.col[s.id];const h=`<i class="gd" style="background:${c?(D.yr>=c.ready?'var(--green)':'var(--cyan)'):PLT[s.type].c}"></i>${esc(nm)} <small>${fmtLy(s.ly)}${c?(D.yr>=c.ready?' · ⛽🔧📦 waystation':' · 🛠 building'):''}</small>`;if(b._h!==h){b.innerHTML=h;b._h=h;}b.classList.toggle('sel',s.id===D.sel);b.style.pointerEvents=this.dist>8000?'none':'';});
  this.armL.forEach(a=>{this.project(a.p,o);const vis=o.vis&&o.y<top-6&&o.y>hb+8&&(a.near?this.dist>2500&&this.dist<90000:this.dist>12000);const v2=vis&&free(o.x,o.y+20,a.n.length*8);a.el.style.display=v2?'':'none';if(v2)a.el.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,-50%)`;});
  const sb=$('#deep-scale');if(sb){const t=`${this.scaleName()} · view ≈ ${fmtLy(this.dist*1.04)} across`;if(sb._t!==t){sb._t=t;sb.textContent=t;}}
  const yb=$('#deep-yr');if(yb){const t=`+${fmtYr(D.yr)}`;if(yb._t!==t){yb._t=t;yb.textContent=t;}}},
 solLabels(){const o={},W=World;const sh=document.querySelector('#v-solar .bottom');const top=sh?sh.getBoundingClientRect().top:1e9;const d=W.cam.dist;
  const placed=[];this.solar.lab.forEach(L=>{const vis0=d>=L.min&&d<=L.max;if(!vis0){if(L.b.style.display!=='none')L.b.style.display='none';return;}W.project(L.get(),o);let vis=o.vis&&o.y<top-6&&o.y>70;if(vis){for(const q of placed)if(Math.abs(q[0]-o.x)<60&&Math.abs(q[1]-o.y)<16){vis=false;break;}if(vis)placed.push([o.x,o.y]);}L.b.style.display=vis?'':'none';if(vis)L.b.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,40%)`;});},
 frame(dt){this.tick(dt);}
};
function renderDeep(){const el=$('#deep-body');if(!el)return;const Dp=Deep;Dp.init();const D=Dp.st();
 const now=performance.now();if(document.activeElement&&document.activeElement.type==='range'&&el.contains(document.activeElement))return;
 const rates=[1,10,100,1000,1e4,1e5,1e6];
 const head=`<div class="row deephead"><b id="deep-yr" class="mono">+${fmtYr(D.yr)}</b><button class="chip ${D.run?'on':''}" data-act="deepRun">${D.run?'⏸':'▶'}</button><div class="hscroll rates">${rates.map(r=>`<button class="chip ${D.rate===r?'on':''}" data-act="deepRate" data-v="${r}">${r>=1000?fmt(r/1000)+'k':r} yr/s</button>`).join('')}</div></div>
 <div class="hscroll" style="margin:4px 0">${[['chain','🛰 Solar chain'],['target','🎯 TCTA targets'],['net','🌊 Network & ship'],['info','🪐 System']].map(([k,n])=>`<button class="chip tab ${D.tab===k?'on':''}" data-act="deepTab" data-v="${k}">${n}</button>`).join('')}</div>`;
 let body='';
 if(D.tab==='chain'){const rows=DEEP_HUBS.map((h,i)=>{const done=Dp.hubDone(h.id);let st,pl=i?Dp.hubPlan(i):null;if(done)st='<b style="color:var(--green)">✔ online</b>';else if(i&&Dp.hubDone(DEEP_HUBS[i-1].id)&&D.hubT[h.id]){const t=D.hubT[h.id];st=`<b style="color:var(--gold)">${Math.round(clamp((D.yr-t.t0)/t.dur,0,1)*100)}%</b>`;}else st='<span class="dim">pending</span>';
   return`<div class="hubrow"><span class="hi">${h.ic}</span><div><b>${h.n}</b> ${st}<div class="dim">${h.where} · ${h.a} AU · sunlight ${(100/(h.a*h.a)).toFixed(h.a>9?2:1)}%${pl?` · transfer ${fmtYr(pl.tr)} (Hohmann ${fmtYr(pl.hoh)}) + build ${fmtYr(pl.build)}${pl.fission?' · ⚛ fission power (solar too weak)':''}`:''}</div><div class="dim">${h.res} · radio delay ${fmt(h.a*8.317)} min</div></div></div>`;}).join('');
  body=`<div class="card"><h4>🛰 Waystation chain: belt → outer planets → interstellar jump-off</h4><p class="dim" style="font-size:12px">Each hub turns local ice into propellant for the next leg, just like your belt waystations. Transfers use faster-than-Hohmann trajectories (more Δv). Times are estimates · <span class="badge b-sim">SIMULATED</span></p>${rows}
  ${Dp.chainDone()?'<button class="btn" data-act="deepTab" data-v="target">🎯 Choose star targets ▸</button>':!Dp.beltDone()?`<p class="dim" style="font-size:12px">Your belt network isn't built yet. Build a waystation in Stage 2 (or finish a mission), or try a sandbox belt.</p><button class="btn ghost" data-act="deepSandbox">☄ Use a simulated belt network (sandbox)</button>`:D.run?'<p class="dim" style="font-size:12px">Chain extending… raise the time rate to watch centuries pass.</p>':'<button class="btn" data-act="deepChain">▶ Extend the chain outward</button>'}</div>`;}
 if(D.tab==='target'){const v=Dp.vOf(),P=DPROPS[D.prop];const rows=Dp.sys.map(s=>[s,Dp.feas(s)]).sort((a,b)=>(b[1].ok-a[1].ok)||(b[1].score-a[1].score)||(a[0].ly-b[0].ly));const adm=rows.filter(x=>x[1].ok).length,pk=Object.keys(D.pick).filter(k=>D.pick[k]).length;
  body=`<div class="card"><h4>🎯 TCTA star targeting · Ω → C → Ψ → R</h4>
  <div class="hscroll">${Object.entries(DPROPS).map(([k,p])=>`<button class="chip ${D.prop===k?'on':''}" data-act="deepProp" data-v="${k}">${p.ic} ${p.n}</button>`).join('')}</div>
  <p style="font-size:12px;margin:6px 0"><span class="badge ${P.tag==='FUTURE TECH'?'b-fut':'b-imp'}">${P.tag}</span> ${P.ref}</p>
  <label class="sl">Cruise speed <b>${(v*100).toFixed(v<0.01?2:1)}% c</b><input type="range" data-inp="deepV" min="${Math.log(P.vmin)}" max="${Math.log(P.vmax)}" step="0.01" value="${Math.log(v)}"></label>
  <label class="sl">Max trip time <b>${fmtYr(D.tmax)}</b><input type="range" data-inp="deepT" min="${Math.log(50)}" max="${Math.log(20000)}" step="0.01" value="${Math.log(D.tmax)}"></label>
  <div class="dim" style="font-size:12px">Rocket equation, accelerate + brake: mass ratio = e<sup>2v/vₑ</sup> = <b>${P.ve?fmt(Dp.massRatio(v)):'≈1 (beam-pushed)'}</b>${P.ve?` (vₑ = ${(P.ve*100).toFixed(2)}% c)`:''} · admissible if ≤ 100 and within the trip limit. Hop range from each colony: <b>${fmtLy(Dp.hop())}</b>.</div>
  <div class="funnel"><span>Ω all systems <b>${Dp.sys.length}</b></span>›<span>C admissible <b>${adm}</b></span>›<span>R picked <b>${pk}</b></span><span class="dim">narrowed ${adm?fmt(Dp.sys.length/Math.max(1,pk||adm)):'∞'}×</span></div>
  <div class="row"><button class="btn ghost" data-act="deepAuto">✨ Auto-pick best 3</button><button class="btn" data-act="deepLaunch" ${Dp.chainDone()?'':'disabled'}>🚀 Launch seed probes</button></div>${Dp.chainDone()?'':'<p class="dim" style="font-size:12px">Finish the waystation chain to the jump-off first (🛰 tab).</p>'}
  <div class="tlist">${rows.map(([s,f])=>{const c=D.col[s.id],flying=D.probes.some(p=>p.to===s.id&&!p.done);return`<div class="trow ${f.ok?'':'no'}"><button class="chip ${D.pick[s.id]?'on':''}" data-act="deepPick" data-id="${s.id}" ${f.ok&&!c&&!flying?'':'disabled'}>${c?'🏭':flying?'🛸':D.pick[s.id]?'✔':'＋'}</button><div><b data-act="deepSel" data-id="${s.id}">${esc(s.host)}</b> <span class="dim">${fmtLy(s.ly)} · ${s.fam[0]} ${s.fam[1]}</span><div class="dim">${f.ok?`trip ${fmtYr(f.trip)} · mass ratio ${fmt(f.mr)} · value ${s.val.toFixed(1)}`:'✕ '+f.why}</div></div></div>`;}).join('')}</div></div>`;}
 if(D.tab==='net'){const cols=Dp.sys.filter(s=>D.col[s.id]),ready=cols.filter(s=>D.yr>=D.col[s.id].ready);const fl=D.probes.filter(p=>!p.done).length;const R=Dp.frontR(),wv=Dp.waveV();
  const sh=D.ship,tg=Dp.shipTarget();const bar=(v,c)=>`<div class="bar" style="height:6px"><i style="width:${clamp(v,0,100)}%;background:${c}"></i></div>`;
  const shS=sh?(sh.done?`🎉 Arrived at <b>${esc(Dp.byId(sh.to).host)}</b> after ${fmtYr(sh.t1-sh.t0)} · ${sh.served-1} services${sh.waited>0.5?` · held ${fmtYr(sh.waited)} for unfinished waystations`:''}`:`<b>${esc(Dp.shipStatus())}</b> · hop ${sh.i}/${sh.stops.length-1}`):'Docked at the jump-off waystation';
  const route=sh?sh.stops.map((st,i)=>{const rt=Dp.stopReadyT(st);const ic=st.k==='sun'?'🚀':st.k==='col'?'🏭':'◇';const state=i<sh.i||(i===sh.i&&sh.done)?'<b style="color:var(--green)">✔ serviced</b>':i===sh.i?(sh.mode==='svc'?(sh.waiting?'<b style="color:var(--red)">⏳ waiting — not built yet</b>':'<b style="color:var(--gold)">🔧 servicing</b>'):'<b style="color:var(--green)">✔ serviced</b>'):D.yr>=rt?'<span class="dim">ready</span>':'<span style="color:var(--gold)">🛠 under construction</span>';return`<div class="hubrow"><span class="hi">${ic}</span><div>${esc(st.n)} ${state}<div class="dim">${st.k==='col'?'Shipyard: propellant, spare parts, repair drones, maintenance':st.k==='dep'?'Relay depot: propellant + spares cache (braked pod, SPECULATIVE)':'Solar-system jump-off: full refit'}</div></div></div>`;}).join(''):'';
  body=`<div class="card"><h4>🌊 Von Neumann replication wave</h4><div class="statg"><div><b>${D.probes.length}</b><span>probes launched</span></div><div><b>${fl}</b><span>in flight</span></div><div><b>${cols.length}/${Dp.sys.length}</b><span>catalog systems reached</span></div><div><b>${ready.length}</b><span>colonies building probes</span></div></div>
  <p style="font-size:12px">Wave front: <b>${R?fmtLy(R):'not started'}</b> from the Sun · front speed ≈ <b>${(wv*100).toFixed(2)}% c</b> (8 ly hops + ${Dp.buildYr()} yr factory bootstrap) · crossing the Milky Way (~100,000 ly) ≈ <b>${fmtYr(1e5/wv)}</b>.${R?` Est. stars inside the front: <b>${fmt(Dp.starsReached(R))}</b> <span class="badge b-sim">ESTIMATE</span>`:''}</p>
  <p class="dim" style="font-size:12px">Light-time: news from a colony takes as many years as it is light-years away — Proxima’s first report arrives 4.2 yr after it is sent. Colony resources are <span class="badge b-sim">SPECULATIVE · SIMULATED</span>.</p></div>
  <div class="card"><h4>🛰 The Marauder’s Daughter <span class="badge b-cy">UNCREWED · autonomous</span></h4><p style="font-size:12px">No humans aboard in deep space. The ship is a robotic freighter that hops waystation to waystation along the probe network; each stop refuels, repairs and resupplies it. Legs are at most ~7 ly because its tank holds ~${Dp.SHIP_RANGE} ly of cruise. <span class="badge b-fut">FUTURE TECH</span></p><p style="font-size:12px">${shS}</p>
  ${sh&&!sh.done?`<div class="shipg"><span>⛽ Fuel ${Math.round(sh.fuel)}%</span>${bar(sh.fuel,sh.fuel<25?'var(--red)':'var(--cyan)')}<span>🔧 Hull ${Math.round(100-sh.wear)}%</span>${bar(100-sh.wear,sh.wear>70?'var(--red)':'var(--green)')}<span>📦 Spares ${Math.round(sh.spares)}%</span>${bar(sh.spares,sh.spares<25?'var(--red)':'var(--gold)')}</div>${sh.fuel<25?'<div class="warnline">⚠ Low fuel: must reach the next waystation</div>':''}${sh.wear>70?'<div class="warnline">⚠ Heavy wear: overdue for repair</div>':''}${sh.waiting?'<div class="warnline">⏳ Waystation unfinished: holding position, wear rising</div>':''}`:''}
  <div class="row"><button class="btn" data-act="deepCrew" ${(sh&&!sh.done)||!tg?'disabled':''}>🛰 Send uncrewed to ${tg?esc(tg.host):'(no colony yet)'}</button>${sh&&!sh.done?'<button class="btn ghost" data-act="deepFollow">🎥 Follow ship</button>':''}</div>${route?`<div style="margin-top:6px">${route}</div>`:''}</div>
  <div class="card"><h4>📜 Log</h4>${D.log.slice(0,8).map(l=>`<div class="dim" style="font-size:12px">+${fmtYr(l.y)} · ${esc(l.m)}</div>`).join('')||'<span class="dim">Nothing yet.</span>'}</div>`;}
 if(D.tab==='net'&&D.ship&&!D.ship.done){const i=body.indexOf('<div class="card"><h4>🛰 The Marauder');const j=body.indexOf('<div class="card"><h4>📜 Log');if(i>0&&j>i)body=body.slice(i,j)+body.slice(0,i)+body.slice(j);}
 if(D.tab==='info'){const s=D.sel&&Dp.byId(D.sel);if(!s)body=`<div class="card"><h4>🪐 Tap a star system</h4><p class="dim">Tap any labeled system on the map. Colors: <span style="color:${PLT.rocky.c}">● rocky</span> <span style="color:${PLT.sub.c}">● super-Earth/sub-Neptune</span> <span style="color:${PLT.nep.c}">● Neptune-like</span> <span style="color:${PLT.giant.c}">● gas giant</span> <span style="color:var(--green)">● colonized</span>.</p></div>`;
  else{const f=Dp.feas(s),c=D.col[s.id];body=`<div class="card"><h4>${s.fam[0]} ${esc(s.host)} <span class="dim">${s.sp?esc(s.sp):''}</span></h4>
  <div class="dim" style="font-size:12px">${fmtLy(s.ly)} · galactic l ${s.l.toFixed(1)}°, b ${s.b.toFixed(1)}° · signal delay ${fmtYr(s.ly)} each way · ${s.fam[1]}</div>
  <div style="font-size:12px;margin:4px 0">${s.star?'No confirmed planets — a stepping-stone star for asteroid/comet resources (speculative).':s.pls.map(p=>`• <b>${esc(p.n)}</b> — ${PLT[p.t].n}${p.R!=null?`, ${p.R.toFixed(2)} R⊕`:''}${p.M!=null?`, ${p.M.toFixed(p.M<10?2:0)} M⊕`:''}${p.P!=null?`, orbit ${p.P<2?p.P.toFixed(2):fmt(p.P)} d`:''}${p.a!=null?` (${p.a<0.1?p.a.toFixed(3):p.a.toFixed(2)} AU)`:''}${p.T!=null?`, T<sub>eq</sub> ≈ ${Math.round(p.T)} K${p.hz?' 🌍':''}`:''} · ${esc(p.m)} ${p.y}`).join('<br>')}</div>
  <div style="font-size:12px">Probe trip at ${(Dp.vOf()*100).toFixed(1)}% c (${DPROPS[D.prop].n}): <b>${fmtYr(f.trip)}</b> · mass ratio ${fmt(f.mr)} ${f.ok?'✔ admissible':'✕ '+f.why}${c?` · ${D.yr>=c.ready?'🏭 colony ready':'🛠 building (ready +'+fmtYr(c.ready)+')'} via ${c.via}`:''}</div>
  <p style="font-size:11px" class="dim"><span class="badge b-imp">IMPORTED · NASA Exoplanet Archive snapshot ${EXO_SNAPSHOT}</span> ${s.star?'(star from SIMBAD)':''} · resources <span class="badge b-sim">SPECULATIVE · SIMULATED</span></p></div>`;}}
 el.innerHTML=head+body+`<p class="dim disc" style="font-size:11px;margin:6px 2px">Interstellar propulsion is FUTURE TECH; nothing here is flight-certified. Planet data: NASA Exoplanet Archive; galaxy arms are a procedural model.</p>`;}
