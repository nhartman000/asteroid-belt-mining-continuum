'use strict';
// ---------- Stage 1: Drone Design Studio, modelled (lightly) on TCTA ----------
// Trajectory-Constrained Transform Algebra (TCTA), Nicholas Hartman / American Milestone Inc. https://github.com/nhartman000/TCTA
// SR=(s,D,C) · T:SR1->SR2 inside Omega(C) · tau=[T1..Tn] · prefix tau_q -Gamma-> G -Psi-> T_G · HDRP O=tanh(R0+g*alpha*(R0-R-1))
const FRAMES=[{n:'Micro',mass:6,cap:40,vol:25,cost:0.08,cl:0.9},{n:'Standard',mass:12,cap:90,vol:60,cost:0.15,cl:0.9},{n:'Heavy',mass:25,cap:180,vol:140,cost:0.3,cl:0.9}];
const PANELS=[0.5,1,2,4,6]; // m^2 of roll-out solar array (1.5 kg/m^2); 28% cells, 1361 W/m^2 at 1 AU, falls off 1/r^2
const PROPT=[{n:'Cold-gas hopper',mass:2,pw:0,vol:2,cost:0.02,cl:0.6},{n:'Small ion',mass:5,pw:60,vol:5,cost:0.1,cl:0.3},{n:'Medium ion',mass:10,pw:140,vol:10,cost:0.18,cl:0.3},{n:'Large ion',mass:18,pw:280,vol:18,cost:0.3,cl:0.3}];
const COMMT=[{n:'UHF patch',mass:0.5,pw:4,vol:1,cost:0.02,cl:0.4},{n:'X-band',mass:2,pw:15,vol:2,cost:0.06,cl:0.2},{n:'High-gain dish',mass:5,pw:35,vol:7,cost:0.12,cl:0.3},{n:'Optical laser',mass:7,pw:55,vol:6,cost:0.25,cl:0.1}];
const RADT=[40,120,240,400]; const RADM=[0.5,2,4,7]; // W of heat rejection, kg
const TOOLS={
 sensor:{n:'Prospector spectrometer + radar',ic:'🔭',mass:3,pw:10,vol:4,cost:0.1,cl:0.2},
 drill:{n:'Drill / scoop + anchor',ic:'⛏',mass:14,pw:100,vol:14,cost:0.1,cl:0.7},
 refinery:{n:'Ice oven + electrolysis cell',ic:'⚗',mass:18,pw:160,vol:24,cost:0.18,cl:0.5},
 fab:{n:'Fabricator (print + mill)',ic:'🖨',mass:20,pw:140,vol:30,cost:0.25,cl:0.6},
 xform:{n:'Transform/docking kit',ic:'🧩',mass:10,pw:16,vol:10,cost:0.06,cl:0.7},
 cargo:{n:'Cargo bay (50 kg)',ic:'📦',mass:8,pw:4,vol:40,cost:0.04,cl:0.9},
 arms:{n:'Construction arms',ic:'🦾',mass:12,pw:50,vol:14,cost:0.1,cl:0.7},
 relay:{n:'Relay transponder',ic:'📡',mass:3,pw:25,vol:4,cost:0.06,cl:0.3}};
const TOOLK=Object.keys(TOOLS);
const FAMILIES={
 replicator:{n:'Replicators',ic:'🧬',g:'flyback',sig:{fab:1,xform:0.5,frame:0.5,power:0.5,thermal:0.3}},
 builder:{n:'Builders',ic:'🏗',g:'factory',sig:{arms:1,frame:0.6,power:0.4,relay:0.3}},
 miner:{n:'Miners',ic:'⛏',g:'miner',sig:{drill:1,sensor:0.5,refinery:0.5,power:0.6,thermal:0.4}},
 transport:{n:'Payload transporters',ic:'📦',g:'flyback',sig:{cargo:1,mob:0.9,frame:0.4}}};
const FKEYS=Object.keys(FAMILIES);
const has=(s,t)=>s.tools.includes(t);
const PURPOSES={
 seed:{f:'replicator',n:'Seed Replicator',ic:'🌱',d:'Full self-copy: slow but needs little from Earth.',req:s=>[['fab',has(s,'fab'),'needs a fabricator'],['arms',has(s,'arms'),'needs arms to assemble its own copy'],['cl',closureOf(s)>=0.62,'≥62% of its mass must be locally makeable (high closure)'],['frame',s.frame>=1,'needs a Standard frame or larger']]},
 fabricator:{f:'replicator',n:'Component Fabricator',ic:'🖨',d:'Prints parts only; needs assemblers.',req:s=>[['fab',has(s,'fab'),'needs a fabricator'],['frame',s.frame>=1,'needs a Standard frame or larger']]},
 assembler:{f:'replicator',n:'Assembler',ic:'🔩',d:'Puts printed parts together into drones.',req:s=>[['arms',has(s,'arms'),'needs construction arms'],['sensor',has(s,'sensor'),'needs a sensor for part inspection']]},
 transformer:{f:'replicator',n:'Transformer',ic:'🧩',d:'Docks and becomes factory structure.',req:s=>[['x',has(s,'xform'),'needs a transform/docking kit'],['frame',s.frame>=1,'needs a Standard frame or larger to bear loads']]},
 facbuilder:{f:'builder',n:'Factory Builder',ic:'🏭',d:'Builds mining factories at the site.',req:s=>[['arms',has(s,'arms'),'needs construction arms'],['frame',s.frame>=1,'needs a Standard frame or larger'],['pw',s.power>=2,'needs ≥2 m² arrays for welding']]},
 waybuilder:{f:'builder',n:'Waystation Builder',ic:'⛽',d:'Builds propellant depots for crewed ships.',req:s=>[['arms',has(s,'arms'),'needs construction arms'],['cargo',has(s,'cargo'),'needs a cargo bay for tank segments']]},
 habbuilder:{f:'builder',n:'Habitat / Shelter Builder',ic:'🏠',d:'Buries modules under regolith for radiation shielding.',req:s=>[['arms',has(s,'arms'),'needs construction arms'],['drill',has(s,'drill'),'needs a drill/scoop to pile shielding regolith']]},
 infra:{f:'builder',n:'Infrastructure (arrays, relays, pads)',ic:'📡',d:'Power, comms relays and landing pads.',req:s=>[['relay',has(s,'relay'),'needs a relay transponder'],['comms',s.comms>=2,'needs a high-gain dish or optical link'],['arms',has(s,'arms'),'needs arms to deploy arrays and pads']]},
 prospector:{f:'miner',n:'Prospector / Scout',ic:'🔭',d:'Finds the richest spots first.',req:s=>[['sensor',has(s,'sensor'),'needs a prospector sensor'],['comms',s.comms>=1,'needs X-band or better to report'],['mob',s.prop>=1,'needs ion propulsion to range']]},
 excavator:{f:'miner',n:'Regolith Excavator',ic:'🪣',d:'Bulk loose rock and soil.',req:s=>[['drill',has(s,'drill'),'needs a drill/scoop'],['cargo',has(s,'cargo'),'needs a bin (cargo bay)']]},
 iceharv:{f:'miner',n:'Ice Harvester',ic:'🧊',d:'Mines water ice — the propellant feedstock.',req:s=>[['drill',has(s,'drill'),'needs a drill'],['rad',s.rad>=1,'needs ≥300 W radiator (thermal control for volatile ice)'],['pw',s.power>=2,'needs ≥2 m² arrays']]},
 mdriller:{f:'miner',n:'Metal (M-type) Driller',ic:'⚙',d:'Cuts nickel-iron for parts and frames.',req:s=>[['drill',has(s,'drill'),'needs a drill'],['pw',s.power>=3,'metal is hard: ≥4 m² arrays'],['frame',s.frame>=1,'needs a Standard frame or larger']]},
 refiner:{f:'miner',n:'Refiner / ISRU Processor',ic:'⚗',d:'Splits water into H₂/O₂ propellant.',req:s=>[['ref',has(s,'refinery'),'needs an ice oven + electrolysis cell'],['pw',s.power>=3,'electrolysis is power hungry: ≥4 m² arrays']]},
 courier:{f:'transport',n:'Light Courier',ic:'✉',d:'Fast, small loads, spare parts.',req:s=>[['cargo',has(s,'cargo'),'needs a cargo bay'],['mob',s.prop>=1,'needs ion propulsion']]},
 hauler:{f:'transport',n:'Heavy Hauler',ic:'🚛',d:'Big ore loads back to the factory.',req:s=>[['cargo',has(s,'cargo'),'needs a cargo bay'],['mob',s.prop>=2,'needs medium ion or better'],['frame',s.frame>=2,'needs a Heavy frame']]},
 tanker:{f:'transport',n:'Fuel Tanker',ic:'🛢',d:'Moves propellant between waystations.',req:s=>[['cargo',has(s,'cargo'),'needs a cargo bay (tank)'],['rad',s.rad>=1,'needs ≥300 W radiator to keep cryo propellant cold'],['mob',s.prop>=2,'needs medium ion or better']]},
 seedcarrier:{f:'transport',n:'Factory-Seed Carrier',ic:'📦',d:'Flies a seed kit to start a new factory.',req:s=>[['cargo',has(s,'cargo'),'needs a cargo bay'],['x',has(s,'xform'),'needs a transform kit to become the seed'],['mob',s.prop>=2,'needs medium ion or better']]}};
const PKEYS=Object.keys(PURPOSES);
const TERRA={mass:12,pw:50,cost:0.1,repSlow:0.12,n:'Terraformer kit (hydroponics, water recycler, O₂ generator, habitat assembler)'};
const SIGAX=['power','mob','comms','thermal','frame',...TOOLK];
const STUDIO_METHOD={name:'TCTA',full:'Trajectory-Constrained Transform Algebra',steps:[
 {id:'sr',k:'SR',n:'Baseline state'},{id:'c',k:'C · D',n:'Constraints & purpose'},{id:'t',k:'T · τ',n:'Transform (iterate)'},{id:'psi',k:'Γ · Ψ · HDRP',n:'Family & projection'},{id:'commit',k:'Ω ✓',n:'Feasibility & commit'}]}; // swap-in point for another named method
const RTMAP={fab:'fab',arms:'arms',x:'xform',sensor:'sensor',drill:'drill',cargo:'cargo',ref:'refinery',relay:'relay'};
function reqTools(p){return PURPOSES[p].req(baseS()).map(q=>RTMAP[q[0]]).filter(Boolean);}
function baseS(){return{frame:0,power:0,prop:0,comms:0,rad:0,tools:[]};}
function cloneS(s){return{...s,tools:[...s.tools]};}
function closureOf(s){if(_skipCl)return 1;let m=0,c=0;const add=(mass,cl)=>{m+=mass;c+=mass*cl;};const F=FRAMES[s.frame];add(F.mass,F.cl);add(PANELS[s.power]*1.5,0.3);add(PROPT[s.prop].mass,PROPT[s.prop].cl);add(COMMT[s.comms].mass,COMMT[s.comms].cl);add(RADM[s.rad],0.9);s.tools.forEach(t=>add(TOOLS[t].mass,TOOLS[t].cl));return c/m;}
// constraint geometry C comes from the mission (target distance, budget per drone)
function studioC(d){const a=activeRef(d.primary).a;return{a,sun:1/(a*a),costCap:1.25,label:`${TMAP[d.primary].name} @ ${fmt(a,2)} AU`};}
function statsOf(s,C){const F=FRAMES[s.frame],P=PROPT[s.prop],K=COMMT[s.comms];
 let mass=F.mass+PANELS[s.power]*1.5+P.mass+K.mass+RADM[s.rad],vol=PANELS[s.power]*1.2+P.vol+K.vol+RADM[s.rad],pw=12+P.pw+K.pw,cost=F.cost+PANELS[s.power]*0.02+P.cost+K.cost+s.rad*0.02;
 s.tools.forEach(t=>{const T=TOOLS[t];mass+=T.mass;vol+=T.vol;pw+=T.pw;cost+=T.cost;});
 const gen=PANELS[s.power]*1361*0.28*C.sun;const heat=pw*0.6;const rej=RADT[s.rad];
 return{mass,vol,pw,gen,heat,rej,cost,cap:F.cap,vcap:F.vol,closure:closureOf(s)};}
function checksOf(st,C){return[
 {k:'mass',n:'Mass',ok:st.mass<=st.cap,v:`${fmt(st.mass)} / ${st.cap} kg`,why:`frame can carry ${st.cap} kg; design is ${fmt(st.mass)} kg — upgrade the frame or drop modules`},
 {k:'vol',n:'Volume',ok:st.vol<=st.vcap,v:`${fmt(st.vol)} / ${st.vcap} L`,why:`modules need ${fmt(st.vol)} L but the frame holds ${st.vcap} L`},
 {k:'power',n:'Power',ok:st.gen>=st.pw,v:`${fmt(st.gen)} / ${fmt(st.pw)} W`,why:`arrays give ${fmt(st.gen)} W at ${fmt(C.a,2)} AU (1/r² sunlight) but modules draw ${fmt(st.pw)} W — add array area first`},
 {k:'thermal',n:'Thermal',ok:st.rej>=st.heat,v:`${fmt(st.rej)} / ${fmt(st.heat)} W`,why:`~${fmt(st.heat)} W of waste heat but radiators reject ${st.rej} W — add a bigger radiator`},
 {k:'cost',n:'Unit cost',ok:st.cost<=C.costCap,v:`$${fmt(st.cost,2)}M / $${C.costCap}M`,why:`unit cost $${fmt(st.cost,2)}M exceeds the per-drone cap $${C.costCap}M`}];}
function admissible(s,C){return checksOf(statsOf(s,C),C).every(c=>c.ok);}
// transforms
function transformsFor(s){const L=[];const ax=[['frame','Frame',FRAMES.length-1,'frame'],['power','Arrays',PANELS.length-1,'power'],['prop','Propulsion',PROPT.length-1,'mob'],['comms','Comms',COMMT.length-1,'comms'],['rad','Radiator',RADT.length-1,'thermal']];
 ax.forEach(([k,n,mx,sg])=>{if(s[k]<mx)L.push({id:k+'+',n:`${n} ▲`,sg,dir:1,ap:x=>{x[k]++;}});if(s[k]>0)L.push({id:k+'-',n:`${n} ▼`,sg,dir:-1,ap:x=>{x[k]--;}});});
 TOOLK.forEach(t=>{const has=s.tools.includes(t);L.push({id:(has?'-':'+')+t,n:`${has?'Remove':'Add'} ${TOOLS[t].ic} ${TOOLS[t].n.split(' (')[0]}`,sg:t,dir:has?-1:1,tool:t,ap:x=>{if(has)x.tools=x.tools.filter(y=>y!==t);else x.tools.push(t);}});});return L;}
function applyT(s,T){const x=cloneS(s);T.ap(x);return x;}
function tierName(k,v){return k==='frame'?FRAMES[v].n:k==='power'?PANELS[v]+' m²':k==='prop'?PROPT[v].n:k==='comms'?COMMT[v].n:k==='rad'?RADT[v]+' W':v;}
// Omega(C) enumeration and family subsets T_G (cached per C)
let _skipCl=false;
function reqSpec(p){if(PURPOSES[p]._spec)return PURPOSES[p]._spec;_skipCl=true;const tools=reqTools(p);const mx={frame:2,power:4,prop:3,comms:3,rad:3,tools};const sp={tools:TOOLK.reduce((m,t,i)=>tools.includes(t)?m|(1<<i):m,0),minCl:p==='seed'?0.62:0};
 ['frame','power','prop','comms','rad'].forEach(k=>{let v=0;while(v<mx[k]){const t={...mx,tools,[k]:v};if(PURPOSES[p].req(t).every(q=>q[1]))break;v++;}sp[k]=v;});_skipCl=false;return(PURPOSES[p]._spec=sp);}
const _om={};function omega(C){const key=fmt(C.a,3);if(_om[key])return _om[key];const res={total:0,fam:{},sub:{}};FKEYS.forEach(p=>res.fam[p]=0);PKEYS.forEach(p=>res.sub[p]=0);
 const TM=[];for(let m=0;m<256;m++){let ms=0,v=0,pw=0,c=0,cm=0;TOOLK.forEach((t,i)=>{if(m&(1<<i)){const T=TOOLS[t];ms+=T.mass;v+=T.vol;pw+=T.pw;c+=T.cost;cm+=T.mass*T.cl;}});TM.push([ms,v,pw,c,cm]);}
 const specs=PKEYS.map(p=>[p,reqSpec(p),PURPOSES[p].f]);
 for(let f=0;f<3;f++)for(let p=0;p<5;p++)for(let pr=0;pr<4;pr++)for(let c=0;c<4;c++)for(let r=0;r<4;r++){const F=FRAMES[f],P=PROPT[pr],K=COMMT[c];
  const bm=F.mass+PANELS[p]*1.5+P.mass+K.mass+RADM[r],bv=PANELS[p]*1.2+P.vol+K.vol+RADM[r],bp=12+P.pw+K.pw,bc=F.cost+PANELS[p]*0.02+P.cost+K.cost+r*0.02;
  const bcm=F.mass*F.cl+PANELS[p]*1.5*0.3+P.mass*P.cl+K.mass*K.cl+RADM[r]*0.9;const gen=PANELS[p]*1361*0.28*C.sun,rej=RADT[r];
  for(let m=0;m<256;m++){const t=TM[m];const ms=bm+t[0],pw=bp+t[2];if(ms>F.cap||bv+t[1]>F.vol||gen<pw||rej<pw*0.6||bc+t[3]>C.costCap)continue;res.total++;const cl=(bcm+t[4])/ms;const hit={};
   for(const [k,sp,fam] of specs){if((m&sp.tools)===sp.tools&&f>=sp.frame&&p>=sp.power&&pr>=sp.prop&&c>=sp.comms&&r>=sp.rad&&cl>=sp.minCl){res.sub[k]++;hit[fam]=1;}}for(const fm in hit)res.fam[fm]++;}}
 return(_om[key]=res);}
// Gamma: invariant signature of the prefix; Psi: family resolution by cosine similarity to family prototypes
function gammaSig(tau){const v={};SIGAX.forEach(a=>v[a]=0);tau.forEach(t=>{v[t.sg]=(v[t.sg]||0)+t.dir;});return v;}
function psi(sig){const n=x=>Math.sqrt(SIGAX.reduce((a,k)=>a+(x[k]||0)**2,0))||1;const sn=n(sig);const sc=FKEYS.map(p=>{const pr=FAMILIES[p].sig;return[p,SIGAX.reduce((a,k)=>a+(sig[k]||0)*(pr[k]||0),0)/(sn*n(pr))];}).sort((a,b)=>b[1]-a[1]);
 const [top,second]=sc;const resolved=top[1]>=0.5&&top[1]-second[1]>=0.12;return{ranked:sc,fam:resolved?top[0]:null,conf:top[1],margin:top[1]-second[1]};}
// HDRP register vector: normalised design-state features
function regVec(st,s){return[st.mass/st.cap,st.pw/Math.max(1,st.gen),st.heat/Math.max(1,st.rej),st.closure,st.cost/1.25];}
const REGN=['Mass use','Power use','Heat load','Closure','Cost use'];
function hdrp(D){const R0=D.R0,R1=D.R1||D.R0;const T=R0.map((x,i)=>x-R1[i]);const O=R0.map((x,i)=>Math.tanh(x+D.g*1.0*T[i]));return{T,O};}
// performance of a committed design (per drone, game-scaled)
function perf(p,s,C){const st=statsOf(s,C);const H=t=>s.tools.includes(t);const P=PURPOSES[p];const g=Math.min(st.gen,st.pw*1.5);
 const o={mine:0,ice:0,haul:0,refine:0,fab:0,asm:0,seedrep:0,build:0,way:0,hab:0,comp:0,scout:0,relay:0,mass:st.mass,cost:st.cost,closure:st.closure};
 if(p==='prospector')o.scout=1+s.comms*0.2;
 if(p==='excavator')o.mine=0.012+0.0001*g;
 if(p==='iceharv'){o.mine=0.01+0.000125*g;o.ice=1;}
 if(p==='mdriller')o.mine=0.014+0.000125*g;
 if(p==='refiner')o.refine=0.000125*g;
 if(p==='fabricator')o.fab=0.008*clamp(st.gen/140,0.5,2);
 if(p==='assembler')o.asm=0.006*(1+s.frame*0.3);
 if(p==='seed')o.seedrep=0.003*clamp(st.gen/140,0.5,2)*(0.4+st.closure);
 if(p==='transformer')o.comp=1+s.frame*0.4;
 if(p==='facbuilder')o.build=0.0012*(1+s.frame*0.5);
 if(p==='waybuilder')o.way=0.0012*(1+s.frame*0.4);
 if(p==='habbuilder')o.hab=0.002*(1+s.frame*0.4);
 if(p==='infra')o.relay=1+s.comms*0.3;
 if(P.f==='transport')o.haul=0.15*[0.12,0.22,0.35,0.5][s.prop]*(1+s.frame*0.25)*(p==='courier'?0.7:p==='tanker'?0.6:p==='seedcarrier'?0.5:1);
 return o;}
const SUM=(mx,P,k)=>PKEYS.reduce((a,p)=>a+mx[p]*(P[p][k]||0),0);
const Studio={
 tab:'design',cur:'seed',
 ensure(d){if(d.studio&&d.studio.drones)return d.studio;const dr={};PKEYS.forEach(p=>dr[p]={s:baseS(),tau:[],branches:[],committed:false,g:0.6});
  d.studio={drones:dr,mix:{seed:4,fabricator:8,assembler:6,transformer:8,facbuilder:6,waybuilder:6,habbuilder:3,infra:3,prospector:5,excavator:6,iceharv:10,mdriller:4,refiner:7,courier:4,hauler:12,tanker:4,seedcarrier:4},terraN:20,committed:false};this.normMix(d);return d.studio;},
 D(){return this.ensure(S.design).drones[this.cur];},
 C(){return studioC(S.design);},
 apply(id){if(S.phase!=='plan')return toast('Designs are locked after launch.','y');const D=this.D(),C=this.C();const T=transformsFor(D.s).find(t=>t.id===id);if(!T)return;const s2=applyT(D.s,T);
  if(!admissible(s2,C)){const bad=checksOf(statsOf(s2,C),C).filter(c=>!c.ok)[0];sfx('error');return toast(`<b>Transform blocked</b> — leaves Ω(C): ${bad.why}.`,'r');}
  const st0=statsOf(D.s,C),st1=statsOf(s2,C);D.R1=regVec(st0,D.s);D.R0=regVec(st1,s2);
  if(D.lastO){const E=Math.hypot(...D.lastO.map((o,i)=>o-Math.tanh(D.R0[i])));const dE=E-(D.lastE||E);const T2=D.R0.map((x,i)=>x-D.R1[i]);const sg=Math.sign(T2.reduce((a,x,i)=>a+x*D.lastO[i],0))||1;D.g=clamp(D.g*1.0-0.1*dE*sg,0,1);D.lastE=E;}
  const fam0=psi(gammaSig(D.tau)).fam;
  D.s=s2;D.tau.push({id:T.id,n:T.n,sg:T.sg,dir:T.dir});const fam1=psi(gammaSig(D.tau)).fam;if(fam1&&fam1!==fam0){Music.jingle();toast(`Ψ resolved → <b>${FAMILIES[fam1].ic} ${FAMILIES[fam1].n}</b> family. Design space narrowed.`,'g');}D.committed=false;S.design.studio.committed=false;D.lastO=hdrp(D).O;sfx('build');App.refresh(true);},
 undo(){const D=this.D();if(!D.tau.length)return;D.tau.pop();this.replay(D);sfx('back');App.refresh(true);},
 branch(k){const D=this.D();if(k>=D.tau.length)return;D.branches.unshift(D.tau.slice(k));D.branches=D.branches.slice(0,3);D.tau=D.tau.slice(0,k);this.replay(D);toast(`Branched at step ${k}. The old path is kept as a faded branch.`,'');App.refresh(true);},
 replay(D){const C=this.C();let s=baseS(),prev=null;for(const t of D.tau){const T=transformsFor(s).find(x=>x.id===t.id);if(!T)break;prev=s;s=applyT(s,T);}D.s=s;D.committed=false;S.design.studio.committed=false;
  D.R0=regVec(statsOf(s,C),s);D.R1=prev?regVec(statsOf(prev,C),prev):D.R0;D.lastO=null;},
 reset(){const D=this.D();if(D.tau.length)D.branches.unshift(D.tau);D.tau=[];this.replay(D);App.refresh(true);},
 // auto: pick the lightest admissible design meeting the purpose, then walk toward it one admissible transform at a time
 autoPath(p,quiet){const d=S.design;const D=d.studio.drones[p],C=studioC(d);let best=null,bm=1e9;
  for(let f=0;f<3;f++)for(let pw=0;pw<5;pw++)for(let pr=0;pr<4;pr++)for(let c=0;c<4;c++)for(let r=0;r<4;r++){const tools=reqTools(p);const s={frame:f,power:pw,prop:pr,comms:c,rad:r,tools};if(!admissible(s,C)||!PURPOSES[p].req(s).every(q=>q[1]))continue;const st=statsOf(s,C);const sc=st.mass+st.cost*80-(st.gen-st.pw)*0.02;if(sc<bm){bm=sc;best=s;}}
  if(!best)return false;let guard=0;
  while(guard++<40){const s=D.s;const moves=[];['frame','rad','power','comms','prop'].forEach(k=>{if(s[k]<best[k])moves.push(k+'+');});best.tools.forEach(t=>{if(!s.tools.includes(t))moves.push('+'+t);});s.tools.forEach(t=>{if(!best.tools.includes(t))moves.push('-'+t);});['frame','rad','power','comms','prop'].forEach(k=>{if(s[k]>best[k])moves.push(k+'-');});
   if(!moves.length)break;const ok=moves.find(id=>{const T=transformsFor(s).find(x=>x.id===id);return T&&admissible(applyT(s,T),C);});if(!ok)break;
   const T=transformsFor(s).find(x=>x.id===ok);const prev=D.s;D.s=applyT(s,T);D.tau.push({id:T.id,n:T.n,sg:T.sg,dir:T.dir});D.R1=regVec(statsOf(prev,C),prev);D.R0=regVec(statsOf(D.s,C),D.s);}
  return PURPOSES[p].req(D.s).every(q=>q[1]);},
 commitOne(p,quiet){const d=S.design,D=d.studio.drones[p],C=studioC(d);const ch=checksOf(statsOf(D.s,C),C);const rq=PURPOSES[p].req(D.s);
  if(!ch.every(c=>c.ok)){if(!quiet)toast('Not physically possible yet: '+ch.filter(c=>!c.ok).map(c=>c.why).join('; '),'r');return false;}
  if(!rq.every(q=>q[1])){if(!quiet)toast('Possible, but does not do its job yet: '+rq.filter(q=>!q[1]).map(q=>q[2]).join('; '),'y');return false;}
  D.committed=true;if(!quiet){sfx('success');toast(`<b>${PURPOSES[p].n} committed.</b> τ has ${D.tau.length} transforms.`,'g');const nx=PKEYS.find(k=>!d.studio.drones[k].committed&&d.studio.mix[k]>0);if(nx){this.cur=nx;}}this.sync();return true;},
 autoAll(){const d=S.design;this.ensure(d);PKEYS.forEach(p=>{const D=d.studio.drones[p];if(!D.committed){if(!PURPOSES[p].req(D.s).every(q=>q[1])||!admissible(D.s,studioC(d)))this.autoPath(p,true);this.commitOne(p,true);}});this.sync();},
 allCommitted(d){const st=this.ensure(d);return PKEYS.every(p=>st.mix[p]===0||st.drones[p].committed);},
 normMix(d){const st=d.studio,mx=st.mix;let tot=PKEYS.reduce((a,p)=>a+mx[p],0);if(!tot){mx.miner=1;tot=1;}const N=d.fleet.total;let acc=0;const raw=PKEYS.map(p=>[p,mx[p]/tot*N]);raw.forEach(([p,v])=>{mx[p]=Math.floor(v);acc+=mx[p];});
  raw.sort((a,b)=>(b[1]%1)-(a[1]%1));for(let i=0;acc<N;i++){mx[raw[i%raw.length][0]]++;acc++;}},
 setMix(p,v){const d=S.design,mx=d.studio.mix,N=d.fleet.total;v=clamp(Math.round(v),0,N);const others=PKEYS.filter(k=>k!==p);let rest=N-v;const ot=others.reduce((a,k)=>a+mx[k],0);
  others.forEach(k=>{mx[k]=ot?Math.floor(mx[k]/ot*rest):Math.floor(rest/others.length);});mx[p]=v;let s=PKEYS.reduce((a,k)=>a+mx[k],0);let i=0;while(s<N){mx[others[i%others.length]]++;s++;i++;}this.sync();},
 // map subtypes -> the three visible swarm groups and mission multipliers
 mapFleet(d){const st=this.ensure(d),mx=st.mix;if(PKEYS.reduce((a,p)=>a+mx[p],0)!==d.fleet.total)this.normMix(d);const f={miner:0,flyback:0,factory:0};PKEYS.forEach(p=>f[FAMILIES[PURPOSES[p].f].g]+=mx[p]);d.fleet.miner=f.miner;d.fleet.flyback=f.flyback;d.fleet.factory=f.factory;},
 sync(){const d=S.design,st=this.ensure(d),mx=st.mix;this.mapFleet(d);
  st.committed=this.allCommitted(d);const pv=this.preview(d);d.sm=pv.mult;d.droneMass=pv.avgMass;d.terraN=st.terraN;
  const cl=PKEYS.filter(p=>PURPOSES[p].f==='replicator'&&mx[p]>0);if(cl.length)d.rep.closure=Math.round(cl.reduce((a,p)=>a+closureOf(st.drones[p].s)*mx[p],0)/cl.reduce((a,p)=>a+mx[p],0)*100);
  if(S.phase==='plan'){applyDesignToState();World.syncFleet&&World.syncFleet();}},
 terraCount(d){const N=d.studio.terraN;return N?Math.floor(d.fleet.total/N):0;},
 // live preview: one simulated year of the ratio (game-scaled model, not a prediction)
 preview(d){const st=this.ensure(d),C=studioC(d),mx=st.mix,N0=d.fleet.total;const P={};PKEYS.forEach(p=>P[p]=perf(p,st.drones[p].s,C));const ice=TMAP[d.primary].ice;
  const terr=this.terraCount(d),tfrac=terr/Math.max(1,N0);const repSlow=1/(1+TERRA.repSlow*tfrac*10);
  const scoutB=1+0.35*Math.min(1,SUM(mx,P,'scout')/Math.max(1,N0*0.06));const commsB=Math.min(1,0.75+0.25*SUM(mx,P,'relay')/Math.max(1,N0*0.04));
  let scale=1,icePool=0,site=0,stock=0,prop=0,way=0,fac=0,built=0,hab=0,kits=d.rep.kits;const vit=(100-d.rep.closure)/100;const series=[];const lim={mining:0,hauling:0,replication:0,refining:0};
  const iceShare=Math.min(1,(mx.iceharv*1.5+0.3*(mx.excavator+mx.mdriller))/Math.max(1,mx.iceharv+mx.excavator+mx.mdriller));
  for(let day=0;day<=365;day++){const k=scale*commsB;const mine=SUM(mx,P,'mine')*k*scoutB;site+=mine;const haulCap=SUM(mx,P,'haul')*k;const hauled=Math.min(site,haulCap);site-=hauled;stock+=hauled;
   const iceMined=mx.iceharv*P.iceharv.mine*k*scoutB;site-=Math.min(site,iceMined);icePool+=iceMined*Math.min(0.9,Math.max(ice,0.03)*3);const refCap=SUM(mx,P,'refine')*k;const r=Math.min(refCap,icePool);icePool-=r;prop+=r*0.9;
   const fabCap=(Math.min(SUM(mx,P,'fab'),SUM(mx,P,'asm')*1.3)+SUM(mx,P,'seedrep'))*k*repSlow;const made=Math.max(0,Math.min(fabCap,stock/2.5,vit>0?kits/vit:1e9));stock-=made*2.5;kits-=made*vit;built+=made;scale=(N0+built)/N0;
   fac=Math.min(1,fac+(SUM(mx,P,'build')+SUM(mx,P,'comp')*0.0004)*k*0.45);way=Math.min(1,way+(fac>=1?SUM(mx,P,'way')*k*0.5:SUM(mx,P,'way')*k*0.1));
   hab=Math.min(1,hab+(SUM(mx,P,'hab')*0.5+terr*0.0009)*k*(way>0.3?0.5:0.05));
   lim.mining+=mine;lim.hauling+=haulCap;lim.replication+=fabCap*2.5;lim.refining+=refCap;
   if(day%15===0)series.push([day,N0+built,prop,stock]);}
  const warn=[];const mineN=mx.excavator+mx.iceharv+mx.mdriller;
  if(!mineN)warn.push('No miners: nothing gets mined.');else if(lim.hauling<lim.mining*0.6)warn.push('Hauling is the bottleneck: ore piles up at the site. More transporters or bigger cargo bays.');
  if(!(mx.seed||(mx.fabricator&&mx.assembler)))warn.push('No working replication chain: needs Seed Replicators, or Fabricators + Assemblers together.');
  else if(mx.fabricator&&!mx.assembler)warn.push('Fabricators print parts but no Assemblers put them together.');
  else if(lim.replication>lim.hauling*1.5)warn.push('Replicators are starved of ore: they idle waiting for transporters.');
  if(vit>0&&kits/vit<built+1)warn.push('Electronics “vitamins” run out: raise closure or ship more kits.');
  if(!mx.refiner)warn.push('No refiners: waystations make no propellant.');
  if(!mx.iceharv&&ice>0.05)warn.push('No Ice Harvesters: refiners get little water to split.');
  if(!(mx.facbuilder+mx.transformer))warn.push('No Factory Builders or Transformers: mining factories never get built.');
  if(!mx.waybuilder)warn.push('No Waystation Builders: depots for crewed ships are slow to appear.');
  if(!terr&&!mx.habbuilder)warn.push('No terraformers or habitat builders: crewed ships cannot stop (life support not ready).');
  if(!(mx.infra))warn.push('No infrastructure relays: comms-limited efficiency (−25%).');
  if(tfrac>0.08)warn.push(`Many terraformers (1 in ${st.terraN}): their kits add mass and slow replication ${fmt((1-repSlow)*100)}%.`);
  const avgMass=PKEYS.reduce((a,p)=>a+mx[p]*P[p].mass,0)/Math.max(1,N0)+tfrac*TERRA.mass;
  const mult={mine:clamp(SUM(mx,P,'mine')*scoutB*commsB/Math.max(0.01,N0*0.3*0.03),0.3,2),haul:clamp(SUM(mx,P,'haul')/Math.max(0.01,N0*0.2*0.05),0.3,2),
   fab:clamp((Math.min(SUM(mx,P,'fab'),SUM(mx,P,'asm')*1.3)+SUM(mx,P,'seedrep'))*repSlow/Math.max(0.001,N0*0.12*0.006),0.3,2),build:clamp((SUM(mx,P,'build')+SUM(mx,P,'comp')*0.0004+SUM(mx,P,'way')*0.5)/Math.max(0.0001,N0*0.1*0.0015),0.3,2),
   refine:clamp(SUM(mx,P,'refine')/Math.max(0.001,N0*0.07*0.02)*(0.5+iceShare*0.5),0.3,2),comms:Math.round((commsB-0.75)*40),hab:(SUM(mx,P,'hab')*0.5+terr*0.0009)/Math.max(0.0005,N0*0.03*0.002*0.5+0.0009*N0/20)};
  return{pop:N0+built,built,prop,stock,way,fac,hab,series,warn,mult,avgMass,P,terr,repSlow};}
};
// ---------- UI ----------
function renderStudio(){const d=S.design,st=Studio.ensure(d);const el=$('#studio-body');if(!el)return;const tab=Studio.tab;
 const tabs=`<div class="row stabs">${[['design','① Design drones'],['mix','② Fleet mix'],['method','TCTA method']].map(([k,n])=>`<button class="chip ${tab===k?'on':''}" data-act="stTab" data-k="${k}">${n}</button>`).join('')}</div>`;
 let body='';
 if(tab==='design'){const p=Studio.cur,D=st.drones[p],C=Studio.C(),s=D.s,sx=statsOf(s,C),ch=checksOf(sx,C),rq=PURPOSES[p].req(s);const sig=gammaSig(D.tau),ps=psi(sig),om=omega(C);
  const fam=ps.fam;const R=fam?om.total/Math.max(1,om.fam[fam]):1;const hp=D.R0?hdrp(D):null;
  const Ts=transformsFor(s).map(T=>{const s2=applyT(s,T);const c2=checksOf(statsOf(s2,C),C);const ok=c2.every(c=>c.ok);const bad=c2.find(c=>!c.ok);const toward=((FAMILIES[fam||PURPOSES[p].f].sig[T.sg]||0)*T.dir>0)||(T.tool&&T.dir>0&&reqTools(p).includes(T.tool)&&!s.tools.includes(T.tool));
   return`<button class="tx ${ok?'':'off'} ${ok&&toward?'hl':''}" data-act="stT" data-id="${T.id}" title="${ok?'Admissible':esc('Blocked: '+bad.n)}">${T.n}${ok?'':`<small>✕ ${bad.n}</small>`}</button>`;}).join('');
  body=`<div class="lbl">Purpose (domain <i>D</i>) — design one drone for each job, family by family</div>${FKEYS.map(f=>`<div class="famline"><b style="color:${GROUPS[FAMILIES[f].g].col}">${FAMILIES[f].ic} ${FAMILIES[f].n}</b><div class="hscroll">${PKEYS.filter(k=>PURPOSES[k].f===f).map(k=>`<button class="chip ${k===p?'on':''}" data-act="stP" data-k="${k}" style="${st.drones[k].committed?'border-color:var(--green)':''}">${PURPOSES[k].ic} ${PURPOSES[k].n.split(' (')[0]} ${st.drones[k].committed?'✓':''}</button>`).join('')}</div></div>`).join('')}<p style="font-size:12px;margin:2px 0 6px"><b>${PURPOSES[p].ic} ${PURPOSES[p].n}</b> — ${PURPOSES[p].d}</p>
  <div class="steprail">${STUDIO_METHOD.steps.map((x,i)=>`<span class="${i<=(D.committed?4:D.tau.length?(fam?3:2):1)?'on':''}"><i>${x.k}</i>${x.n}</span>`).join('')}</div>
  <div class="card"><h4>SR = (s, <i>D</i>, <i>C</i>) · current design state <span class="badge b-sim">GAME MODEL</span></h4>
   <div class="srgrid"><div><span>Frame</span><b>${FRAMES[s.frame].n}</b></div><div><span>Arrays</span><b>${PANELS[s.power]} m²</b></div><div><span>Propulsion</span><b>${PROPT[s.prop].n}</b></div><div><span>Comms</span><b>${COMMT[s.comms].n}</b></div><div><span>Radiator</span><b>${RADT[s.rad]} W</b></div><div><span>Tools</span><b>${s.tools.map(t=>TOOLS[t].ic).join(' ')||'none'}</b></div></div>
   <p style="font-size:12px;margin:6px 0 0"><i>D</i> = <b>${PURPOSES[p].n}</b> (${FAMILIES[PURPOSES[p].f].n} family) · <i>C</i> = ${C.label}, sunlight ${fmt(C.sun*100)}% of Earth’s, unit-cost cap $${C.costCap}M.</p></div>
  <div class="card"><h4>Ω(<i>C</i>) feasibility — is it physically possible?</h4>${ch.map(c=>`<div class="chk ${c.ok?'ok':'no'}"><b>${c.ok?'✔':'✕'} ${c.n}</b><span>${c.v}</span>${c.ok?'':`<small>${c.why}</small>`}</div>`).join('')}
   <h4 style="margin-top:8px"><i>D</i> requirements — does it do its job?</h4>${rq.map(q=>`<div class="chk ${q[1]?'ok':'no'}"><b>${q[1]?'✔':'○'}</b><span>${q[2].replace(/^needs/,'Needs')}</span></div>`).join('')}
   <div class="lbl" style="margin-top:4px">Closure (locally makeable mass): <b style="color:var(--green)">${fmt(sx.closure*100)}%</b></div></div>
  <div class="card"><h4>T · transforms <small style="color:var(--dim)">greyed = would leave Ω(<i>C</i>) · glowing = consistent with ${fam?'resolved family':'this purpose'}</small></h4><div class="txgrid">${Ts}</div>
   <div class="row" style="margin-top:6px"><button class="btn" data-act="stUndo" ${D.tau.length?'':'disabled'}>↶ Undo</button><button class="btn" data-act="stReset">⟲ Baseline</button><button class="btn y" data-act="stAuto">✨ Suggest a path</button></div></div>
  <div class="card"><h4>τ · design trajectory <small style="color:var(--dim)">tap a step to branch from it</small></h4><div class="tau"><span class="tn0">SR₀ baseline</span>${D.tau.map((t,i)=>`<button class="tstep" data-act="stBranch" data-k="${i}">T${i+1} ${esc(t.n)}</button>`).join('<i>→</i>')}</div>
   ${D.branches.length?`<div class="tau ghost">${D.branches.map(b=>`<span>⑂ ${b.map(t=>esc(t.n)).join(' → ')}</span>`).join('<br>')}</div>`:''}</div>
  <div class="card"><h4>Γ → Ψ · family resolution (OGSI) & HDRP projection</h4>
   <div class="row" style="justify-content:space-between"><span class="badge ${fam?'b-cy':'b-sim'}">Ψ → T<sub>G</sub>: ${fam?FAMILIES[fam].ic+' '+FAMILIES[fam].n+' family':'unresolved (prefix too short / ambiguous)'}</span><span class="badge b-imp">R = |Ω|/|T<sub>G</sub>| = ${fmt(om.total)} / ${fam?fmt(om.fam[fam]):fmt(om.total)} → narrowed ${fmt(R,1)}×</span></div>
   <div class="famrow">${ps.ranked.map(([k,v])=>`<div><span>${FAMILIES[k].ic} ${FAMILIES[k].n}</span><div class="bar"><i style="width:${clamp(v,0,1)*100}%"></i></div></div>`).join('')}</div>
   ${fam&&fam!==PURPOSES[p].f?`<p class="warnline">Your trajectory is converging on the <b>${FAMILIES[fam].n}</b> family, but ${PURPOSES[p].n} belongs to ${FAMILIES[PURPOSES[p].f].n}. Allowed — but check the <i>D</i> requirements.</p>`:''}<div class="lbl">Subtype space: ${fmt(om.sub[p])} admissible ${PURPOSES[p].n} designs (narrowed ${fmt(om.total/Math.max(1,om.sub[p]),1)}× from Ω)</div>
   <div class="lbl" style="margin-top:6px">HDRP Φ · registers R₀ (now) vs R₋₁ (previous), ghost = projected next step O = tanh(R₀ + g·α·ΔT), g=${fmt(D.g,2)}</div>
   ${D.R0?REGN.map((n,i)=>`<div class="hd"><span>${n}</span><div class="bar"><i style="width:${clamp(Math.tanh(D.R0[i]),0,1)*100}%"></i><em style="left:${clamp(hp.O[i],0,1)*100}%"></em></div><b>${hp.T[i]>0.005?'▲':hp.T[i]<-0.005?'▼':'·'}</b></div>`).join(''):'<p style="font-size:12px">Apply a transform to start the registers.</p>'}
  </div>
  <button class="btn g big" data-act="stCommit" style="width:100%">${D.committed?'✔ Committed — re-commit after changes':'Commit this '+PURPOSES[p].n+' design'}</button>`;}
 else if(tab==='mix'){const pv=Studio.preview(d),mx=st.mix;const W=300,H=90;const ser=pv.series;const mxP=Math.max(...ser.map(r=>r[1]),1),mxF=Math.max(...ser.map(r=>r[2]),1);
  const line=(k,m,col)=>`<polyline fill="none" stroke="${col}" stroke-width="2" points="${ser.map(r=>`${r[0]/365*W},${H-4-r[k]/m*(H-12)}`).join(' ')}"/>`;
  body=`<div class="card"><h4>Fleet ratio — ${d.fleet.total} drones at launch</h4><div class="meter"><div class="mh"><span>Total drones</span><b>${d.fleet.total}</b></div><input type="range" min="30" max="160" step="2" value="${d.fleet.total}" data-inp="total"></div>
   ${FKEYS.map(f=>{const ks=PKEYS.filter(k=>PURPOSES[k].f===f);const tot=ks.reduce((a,k)=>a+mx[k],0);return `<div class="famhd"><b style="color:${GROUPS[FAMILIES[f].g].col}">${FAMILIES[f].ic} ${FAMILIES[f].n}</b><span>${tot} · ${fmt(tot/d.fleet.total*100)}% · flies as ● ${GROUPS[FAMILIES[f].g].name}</span></div>`+ks.map(p=>`<div class="meter"><div class="mh"><span>${PURPOSES[p].ic} ${PURPOSES[p].n} ${st.drones[p].committed?'':'<small style="color:var(--gold)">(not committed)</small>'}</span><b>${mx[p]}</b></div><input type="range" min="0" max="${d.fleet.total}" value="${mx[p]}" data-inp="mix_${p}"></div>`).join('');}).join('')}
   <div class="famhd"><b style="color:#9dff6a">🌿 Terraformer module</b><span>${st.terraN?`1 in ${st.terraN} → ${Studio.terraCount(d)} drones`:'off'}</span></div>
   <div class="meter"><div class="mh"><span>Every Nth drone also carries a ${TERRA.n} (+${TERRA.mass} kg, +${TERRA.pw} W, slower to replicate)</span><b>${st.terraN?'1/'+st.terraN:'off'}</b></div><input type="range" min="0" max="6" step="1" value="${[0,50,30,20,10,5,3].indexOf(st.terraN)<0?3:[0,50,30,20,10,5,3].indexOf(st.terraN)}" data-inp="terraN"></div>
   <p style="font-size:11.5px;color:var(--dim)">Sliders always sum to the fleet. Each job is flown by one of the three visible swarm groups (colour dot).</p></div>
  <div class="card"><h4>Live preview · one simulated year <span class="badge b-sim">SIMULATED · GAME MODEL</span></h4>
   <svg viewBox="0 0 ${W} ${H}" class="pvsvg">${line(1,mxP,'#5dff8a')}${line(2,mxF,'#3ef0ff')}${line(3,Math.max(...ser.map(r=>r[3]),1),'#ffc640')}</svg>
   <div class="lbl"><span style="color:var(--green)">● drones</span> <span style="color:var(--cyan)">● propellant</span> <span style="color:var(--gold)">● ore stock</span></div>
   <div class="grid2"><div class="gauge"><span>Drones after 1 yr</span><b style="color:var(--green)">${fmt(pv.pop)}</b></div><div class="gauge"><span>Built by replication</span><b>${fmt(pv.built)}</b></div><div class="gauge"><span>Propellant made</span><b style="color:var(--cyan)">${fmt(pv.prop,1)} t</b></div><div class="gauge"><span>First mining factory</span><b>${fmt(pv.fac*100)}%</b></div><div class="gauge"><span>First waystation</span><b>${fmt(pv.way*100)}%</b></div><div class="gauge"><span>Habitat readiness</span><b style="color:#9dff6a">${fmt(pv.hab*100)}%</b></div></div>
   ${pv.warn.map(w=>`<div class="warnline">⚠ ${w}</div>`).join('')||'<div class="okline">No obvious bottleneck in this model — the trade-offs will show in operations.</div>'}
   <p style="font-size:11.5px;color:var(--dim)">Mission effect of your designs + ratio: mining ×${fmt(pv.mult.mine,2)}, hauling ×${fmt(pv.mult.haul,2)}, replication ×${fmt(pv.mult.fab,2)}, building ×${fmt(pv.mult.build,2)}, propellant ×${fmt(pv.mult.refine,2)}, habitat ×${fmt(pv.mult.hab,2)}, comms ${pv.mult.comms>=0?'+':''}${pv.mult.comms}%. Average drone ${fmt(pv.avgMass)} kg.</p></div>
  <div class="row" style="margin-bottom:12px">${st.committed?'<div class="okline" style="flex:1">✔ All drone designs committed — Stage 1 complete.</div>':`<button class="btn y" data-act="stAutoAll">✨ Auto-design the remaining drones</button>`}<button class="btn solid" data-act="open" data-v="arch">Mission Architecture ▶</button></div>`;}
 else{body=`<div class="card"><h4>The TCTA design method</h4>
  <p>This stage uses <b>Trajectory-Constrained Transform Algebra (TCTA)</b>, by <b>Nicholas Hartman / American Milestone Inc.</b> (<a href="https://github.com/nhartman000/TCTA" target="_blank" rel="noopener">github.com/nhartman000/TCTA ↗</a>), as the game’s design method. TCTA is a research framework; here it is applied lightly as a game mechanic, not as a validated engineering tool.</p>
  <div class="chk ok"><b>SR</b><span><b>State representation</b> (s, <i>D</i>, <i>C</i>): the drone’s modules <i>s</i>, the job it is for <i>D</i>, and the limits <i>C</i> from the mission and the target asteroid.</span></div>
  <div class="chk ok"><b>T</b><span><b>Transform</b>: one design action (add a tool, upgrade arrays…). Allowed only if the result stays inside the admissible space Ω(<i>C</i>): mass, volume, power, heat and cost all fit.</span></div>
  <div class="chk ok"><b>τ</b><span><b>Trajectory</b>: the ordered path of transforms from the baseline drone to your design. Order matters — you often must add power before a drill.</span></div>
  <div class="chk ok"><b>Γ, Ψ</b><span><b>Invariant projection Γ</b> reads a signature from the first few steps; <b>OGSI Ψ</b> (Orthogonal Gestalt Symmetry Identification) matches it to a design family. The game counts every admissible design and shows how much the family narrows the search: R = |Ω(<i>C</i>)| / |T<sub>G</sub>|.</span></div>
  <div class="chk ok"><b>HDRP</b><span><b>Hartman Dual-Register Predictor</b>: keeps the present (R₀) and previous (R₋₁) design state; the change ΔT = R₀ − R₋₁ projects the next step O = tanh(R₀ + g·α·ΔT), drawn as a ghost marker.</span></div>
  </div><div class="card"><h4>🌿 Living off the land (terraformer module)</h4><p><b>ISRU</b> (in-situ resource utilization) means using what is already there: asteroid ice becomes water, oxygen and rocket propellant. <b>Bioregenerative life support</b> grows food with hydroponics and lets plants help recycle air and water, as tested on the ISS (Veggie). <b>Regolith shielding</b>: burying a habitat under a few metres of loose rock blocks much of the space radiation. In this game each waystation gets a life-support readiness meter (food, water, air, shelter, power); crewed ships only stop where it is high enough. All values are <span class="badge b-sim">SIMULATED</span>.</p><p style="font-size:12px;color:var(--dim)">Stats and module numbers are illustrative, game-scaled values (solar power uses the real 1/r² falloff; everything else is simplified). Prefix family resolution can fail or be ambiguous — the game shows “unresolved” when it is.</p></div>`;}
 el.innerHTML=tabs+body;}
