'use strict';
// ---------- utils ----------
const $ = (s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const _NF={};const fmt=(v,d=0)=>(_NF[d]||(_NF[d]=new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}))).format(Number(v));
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- design + metrics ----------
function newDesign(scn='psyche'){const sc=SCENARIOS[scn];return{scenario:scn,difficulty:(window.S&&S.design&&S.design.difficulty)||'specialist',targets:[...sc.targets],primary:sc.primary,multi:!!sc.multi,objective:sc.objective,region:sc.region,lv:scn==='apophis'?'titan':'titan',prop:scn==='apophis'?'chem':'ion',
  systems:{hga:true,arrays:true,spectro:scn==='psyche'||scn==='apophis',rigs:scn!=='apophis',fab:scn==='ceres'||scn==='multi',shield:scn==='bennu',batt:false,ai:false,relay:false},
  fleet:{total:108,miner:34,flyback:33,factory:33},altitude:2,physics:'simple',rep:{closure:60,kits:40},name:''};}
function refVals(id){return activeRef(id);}
function tA(id){return +refVals(id).a||TMAP[id].a;}
function tI(id){return +refVals(id).i||TMAP[id].i;}
// Hohmann transfer delta-v (heliocentric, km/s). Departure burn assumed provided by launch vehicle; spacecraft pays arrival + plane change (combined, approx.)
function dvEstimate(a2,inclDeg,nT){const VE=29.78,r1=1,r2=a2;const at=(r1+r2)/2;
  const dv1=Math.abs(VE*(Math.sqrt(r2/at)-1));const v2=VE/Math.sqrt(r2);const dv2=Math.abs(v2*(1-Math.sqrt(r1/at)));
  const plane=2*v2*Math.sin(inclDeg*Math.PI/360);const arr=Math.sqrt(dv2*dv2+plane*plane);const extra=(nT-1)*1.2;
  return {dep:dv1,arr:dv2,plane,total:arr+0.5+extra,extra};}
function hohmannDays(r1,r2){return 0.5*Math.pow((r1+r2)/2,1.5)*365.25;}
function computeMetrics(d){
  const sc=SCENARIOS[d.scenario],df=DIFFS[d.difficulty],lv=LVS[d.lv],pr=PROPS[d.prop],alt=ALTS[d.altitude];
  const real=d.physics==='real';
  const a=Math.max(...d.targets.map(tA)); const aP=tA(d.primary);
  const reg=REGIONS[d.region].au;
  let mass=1.0,pwSys=0,cost=lv.cost+pr.cost;
  for(const k in SYSTEMS) if(d.systems[k]){mass+=SYSTEMS[k].m;cost+=SYSTEMS[k].cost; if(SYSTEMS[k].pw>0)pwSys+=SYSTEMS[k].pw;}
  const n=d.fleet.total; mass+=n*(d.droneMass||30)/1000; cost+=n*1.0; const rep=d.rep||{closure:60,kits:40}; mass+=0.5+rep.closure*0.012+rep.kits*0.02; cost+=rep.kits*0.5+rep.closure*0.6;
  // delta-v + rocket equation (More Realistic) or simple fractions (Simplified)
  const incl=Math.max(...d.targets.map(id=>tI(id)));
  const dv=dvEstimate(a,incl,d.targets.length);
  const ISP={chem:320,ion:3000,sail:0,nep:4000}[d.prop];
  let deliverable;
  if(real){
    if(d.prop==='sail')deliverable=lv.cap*0.9;
    else{const ve=ISP*9.80665/1000;deliverable=lv.cap*Math.exp(-dv.total/ve)*0.92-(d.prop==='nep'?2:0);}
    deliverable=Math.max(0,deliverable);
  } else deliverable=lv.cap*pr.frac*(1-clamp(incl/200,0,0.15))*(d.targets.length>1?0.92:1);
  // power at operations (scales with distance from Sun)
  const fall=real?1/(reg*reg):1/reg;
  let gen=(18+(d.systems.arrays?14:0))*fall*(d.prop==='sail'?1.15:1)+(d.prop==='nep'?20:0);
  const demand=1.5+pwSys+n*0.015+alt.pw;
  // comms: margin falls with distance
  const dist=Math.max(reg,aP);
  let comms=clamp(62+(d.systems.hga?22:0)+(d.systems.relay?12:0)+(d.sm?d.sm.comms:0)+alt.comms-(real?20*Math.log10(dist*dist):6*dist),5,100);
  const dataRate=0.6*(d.systems.hga?3:1)*(d.systems.relay?1.3:1)/(real?dist*dist:dist)*(comms/100)*1.6; // Mbps (simulated)
  let travel=real?hohmannDays(1,a):(80+110*Math.abs(a-1));const hoh=hohmannDays(1,a);
  let tm=pr.tmult; if(d.prop==='sail')tm*=1+0.15*Math.max(0,a-1);
  travel=travel*tm+(d.targets.length>1?30*(d.targets.length-1):0);
  const opsCost=0.22*(1+n/120); const budget=sc.budget*df.budget;
  const totalCost=cost+opsCost*(travel*0.3);
  let risk=8+(1-lv.rel)*300+pr.risk+alt.risk+(incl>20?6:0)+(d.targets.length>1?4:0)-(d.systems.shield?9:0)-(d.systems.ai?3:0)+(mass>deliverable?25:0)+(real?4:0);
  risk=clamp(risk*df.risk,1,95);
  const deadline=Math.round(sc.deadline*df.dead);
  const w=[];
  if(mass>deliverable)w.push(['bad','payload',`Payload ${fmt(mass,1)} t is over the ${fmt(deliverable,1)} t the ${lv.name} + ${pr.name} can deliver. Remove systems/drones or pick a bigger rocket.`]);
  if(demand>gen)w.push(['warn','power',`Operations need ${fmt(demand,1)} kW but you generate ~${fmt(gen,1)} kW at ${reg} AU. Batteries will drain and equipment will throttle.`]);
  if(totalCost>budget)w.push(['bad','budget',`Launch + hardware cost $${fmt(totalCost)}M exceeds the $${fmt(budget)}M budget.`]);
  if(comms<35)w.push(['warn','comms',`Weak comms margin (${fmt(comms)}%). Data will trickle home slowly.`]);
  if(risk>45)w.push(['warn','risk',`High risk (${fmt(risk)}%). Consider shields, a higher orbit or a more reliable rocket.`]);
  const stOk=Studio.allCommitted(d);if(!stOk)w.unshift(['bad','studio','Stage 1 not finished: design and commit every drone type in your fleet mix (Drone Design Studio).']);
  if(d.fleet.flyback<n*0.15&&d.scenario!=='apophis')w.push(['warn','logistics','Very few flyback haulers: mined ore may pile up at the asteroid.']);
  const lightMin=Math.sqrt(aP*aP+1)*8.317;
  return {dv,ISP,hoh,lightMin,incl,mass,deliverable,gen,demand,comms,dataRate,travel:Math.round(travel),cost:totalCost,budget,budgetLeft:budget-totalCost,risk,deadline,opsCost,reg,aP,dist,fall,
    valid:mass<=deliverable&&totalCost<=budget&&d.targets.length>0&&stOk,warnings:w,altKm:Math.round(TMAP[d.primary].D*[0,0.15,0.6,1.8][d.altitude]+[0,1,4,12][d.altitude])};
}

// ---------- mission state ----------
let S=null;
function newState(scn){
  const prev=S;
  const s={v:3,seed:(Math.random()*1e9)|0,phase:'plan',day:0,launchDay:0,arriveDay:0,cruiseDays:0,deadline:0,
    design:newDesign(scn||'psyche'),m:null,
    res:{battery:100,budget:0,cargo:0,dataColl:0,dataDown:0,dataBuf:0,comms:0,risk:0,site:{}},
    coverage:{},mfac:{},dfac:{progress:0,online:false},prodGroup:'miner',prodTimer:0,
    groups:{miner:{target:null,order:'harvest',n:34},flyback:{target:null,order:'harvest',n:33},factory:{target:null,order:'harvest',n:33}},
    sel:'all',waypoint:null,rally:null,log:[],mods:[],decisions:[],coord:[],history:[],speed:1,paused:false,
    pov:{type:'miner',hold:0,power:100,mined:0},
    data:prev?prev.data:{mode:'snapshot',label:'',date:'',imp:{}},
    team:prev?prev.team:{mode:'solo',players:[{name:'Player 1',roles:['cmd','flight','eng','sci']}],teams:['Team A','Team B'],cur:0,results:[]},
    stats:{powerDef:0,blackout:0,lost:0,built:0,overflow:0,peakRisk:0,retargets:0,minedPOV:0,delivered:0,emptyTrips:0},
    report:null,concepts:prev?prev.concepts:{},goalsDone:false,evCount:0,tutorialDone:prev?prev.tutorialDone:false};
  Continuum.initState(s);TARGETS.forEach(t=>{s.res.site[t.id]=0;s.coverage[t.id]=0;s.mfac[t.id]={progress:0,online:false};});
  return s;
}
function applyDesignToState(){
  const d=S.design;Studio.mapFleet(d);S.m=computeMetrics(d);
  const f=d.fleet; S.groups.miner.n=f.miner;S.groups.flyback.n=f.flyback;S.groups.factory.n=f.factory;
  if(!d.multi){GKEYS.forEach(g=>S.groups[g].target=d.primary);}
  else GKEYS.forEach((g,i)=>{if(!S.groups[g].target||!d.targets.includes(S.groups[g].target))S.groups[g].target=d.targets[i%d.targets.length];});
  if(S.phase==='plan'){S.res.budget=S.m.budget;S.res.risk=S.m.risk;S.res.comms=S.m.comms;}
}
function rebalanceFleet(d,changed){ // keep sum == total
  const f=d.fleet;let sum=f.miner+f.flyback+f.factory;let diff=f.total-sum;const others=GKEYS.filter(k=>k!==changed);
  let guard=0;while(diff!==0&&guard++<500){for(const k of others){if(diff>0){f[k]++;diff--;}else if(diff<0&&f[k]>0){f[k]--;diff++;}if(diff===0)break;}}
}
const R=()=>S._rng||(S._rng=mulberry(S.seed));
function log(msg,type=''){S.log.unshift({d:Math.floor(S.day),msg,type});if(S.log.length>120)S.log.pop();}
function mod(key,mult,days,label){S.mods.push({key,mult,until:S.day+days,label});}
function modMult(key){let m=1;for(const x of S.mods)if(x.key===key&&x.until>S.day)m*=x.mult;return m;}
function opsDay(){return S.phase==='ops'||S.phase==='ended'?Math.max(0,S.day-S.arriveDay):0;}
function coordFactor(){if(S.team.mode==='solo'||!S.coord.length)return 1;const a=S.coord.reduce((x,c)=>x+c.score,0)/S.coord.length;return 0.85+0.3*a;}
function objBonus(k){return S.design.objective===k;}

// ---------- launch ----------
function launchMission(){
  applyDesignToState();
  const m=S.m;
  S.phase='cruise';S.launchDay=S.day;S.cruiseDays=m.travel;S.arriveDay=S.day+m.travel;S.deadline=m.deadline;
  S.res.budget=m.budget-(m.cost-m.opsCost*(m.travel*0.3));S.vit=Continuum.vitaminsKit(S.design);S.gen={built:0,initial:S.design.fleet.total};S.res.risk=m.risk;S.res.comms=m.comms;S.res.battery=100;
  log(`🚀 Launch! ${LVS[S.design.lv].name} with ${PROPS[S.design.prop].name} propulsion. Cruise ≈ ${m.travel} days (simulated).`,'good');
  // launch reliability roll -> anomaly adds risk rather than instant loss (arcade)
  if(R()()>LVS[S.design.lv].rel){S.res.risk+=12;log('⚠ Launch anomaly: upper stage under-performed. Risk +12%.','bad');}
  World.onLaunch();
  concept('orbit');
}
// ---------- daily simulation ----------
function simStep(dd){
  if(S.phase==='cruise'){
    S.day+=dd;
    const m=S.m;
    S.res.budget-=m.opsCost*0.3*dd;
    if(S.design.prop==='ion'){/* ion runs on power during cruise */ }
    if(S.day-S.launchDay>S.cruiseDays*0.3&&!App.demo&&R()()<DIFFS[S.design.difficulty].ev*0.5*dd)randomEvent(true);
    if(S.day>=S.arriveDay){S.day=S.arriveDay;S.phase='ops';log('🛰 Fleet arrived. Operations begin — drones are spreading through the field.','good');sfx('success');toast(`<b>Arrival!</b> Drones are populating the asteroid field.`,'g');World.onArrive();setTimeout(()=>arrivalDecision(),900);}
    return;
  }
  if(S.phase!=='ops')return;
  S.day+=dd;
  const d=S.design,m=S.m,alt=ALTS[d.altitude],cf=coordFactor();
  const cnt=World.groupStats(); // counts on station per group per target
  // ---- power ----
  const gen=m.gen*modMult('power');
  const active=World.aliveCount();
  const miningOn=cnt.miningTotal>0;
  const demand=m.demand-d.fleet.total*0.015+active*0.015+(miningOn&&d.systems.rigs?0:-0)+(S.groups.miner.order==='harvest'?0.5:0);
  const cap=d.systems.batt?200:100;
  S.res.battery=clamp(S.res.battery+(gen-demand)*dd*(100/cap)*1.4,0,100);
  let pEff=1; if(S.res.battery<=0.5&&demand>gen){pEff=clamp(gen/demand,0.2,1);S.stats.powerDef+=dd; if(!S._pwWarn){S._pwWarn=1;toast('<b>Power deficit!</b> Batteries empty — equipment throttled to '+fmt(pEff*100)+'%.','r');concept('power');sfx('alert');}}
  else if(S.res.battery>20)S._pwWarn=0;
  S._pEff=pEff;S._gen=gen;S._demand=demand;
  // ---- mining ----
  let oreTotal=0;
  for(const tid in cnt.miners){
    const n=cnt.miners[tid];if(!n)continue;
    let rate=0.032*n*(d.systems.rigs?1.6:1)*alt.mine*pEff*cf*modMult('mine')*(S.mfac[tid].online?2.2:1)*(objBonus('mine')?1.15:1)*(d.sm?d.sm.mine:1);
    if(!d.systems.ai&&S._blackout)rate*=0.6;
    const t=TMAP[tid];rate*=0.6+t.metal*0.6+t.ice*0.8;
    S.res.site[tid]+=rate*dd;oreTotal+=rate;
  }
  S._oreRate=oreTotal;if(S.phase==='ops'&&!oreTotal&&S.groups.miner.order!=='harvest'&&opsDay()>12&&!S._scoutWarn){S._scoutWarn=1;toast('<b>No ore is being mined:</b> miners are on <b>'+S.groups.miner.order+'</b>. Swarm → Miners → Harvest.','y');}
  // ---- factories ----
  for(const tid in cnt.factory){
    const n=cnt.factory[tid];const mf=S.mfac[tid];if(!n||mf.online)continue;
    mf.progress+=n*0.0005*(d.sm?d.sm.build:1)*(d.systems.fab?1.8:1)*pEff*cf*(objBonus('factory')?1.3:1)*dd;
    if(mf.progress>=1){mf.progress=1;mf.online=true;log(`🏭 Mining factory online at ${TMAP[tid].name}! Mining there ×2.2.`,'good');toast(`<b>Mining factory online</b> at ${TMAP[tid].name}`,'g');sfx('build');World.onFactory(tid);Continuum.onMfac(tid);}
  }
  if(!S.dfac.online){
    const nf=cnt.flybackDepot; if(nf>0&&S.res.cargo>=10){S.dfac.progress+=Math.sqrt(nf)*0.0035*(d.systems.fab?1.8:1)*pEff*cf*(objBonus('factory')?1.3:1)*dd;
      if(S.dfac.progress>=1){S.dfac.progress=1;S.dfac.online=true;S.res.cargo-=10;log('🏗 Drone factory online at the depot (used 10 t ore). It now builds new drones from delivered ore.','good');toast('<b>Drone factory online!</b> New drones will be built from ore.','g');sfx('build');World.onDepotFactory();Continuum.onDfac();}}
  }
  Continuum.day(dd,pEff,cf);
  // ---- data & comms ----
  const scouts=cnt.scouts,others=cnt.onStation;
  let coll=(scouts*0.09+others*0.012)*(d.systems.spectro?1.7:1)*alt.res*cf*(objBonus('survey')?1.3:1)*pEff*modMult('data');
  S.res.dataColl+=coll*dd;S.res.dataBuf+=coll*dd;
  for(const tid in cnt.scoutsAt){const n=cnt.scoutsAt[tid];if(!n)continue;const t=TMAP[tid];S.coverage[tid]=clamp(S.coverage[tid]+n*0.022*alt.res*(d.systems.spectro?1.3:1)*cf*dd/Math.sqrt(t.r*3),0,100);}
  for(const tid in cnt.onAt){const n=cnt.onAt[tid];if(!n)continue;S.coverage[tid]=clamp(S.coverage[tid]+n*0.0012*alt.res*dd,0,100);}
  S._blackout=S.mods.some(x=>x.key==='blackout'&&x.until>S.day);
  const commsNow=S._blackout?0:m.comms*modMult('comms');S.res.comms=commsNow;
  if(S._blackout)S.stats.blackout+=dd;
  const down=Math.min(S.res.dataBuf,m.dataRate*10.8*(commsNow/m.comms||0)*modMult('comms')*dd);
  S.res.dataBuf-=down;S.res.dataDown+=down;
  const store=d.systems.spectro?160:120; if(S.res.dataBuf>store){S.stats.overflow+=S.res.dataBuf-store;S.res.dataBuf=store;if(!S._ofWarn){S._ofWarn=1;toast('<b>Data storage full</b> — new data is being lost. Your data rate is the bottleneck.','y');concept('comms');}}
  // ---- budget & risk ----
  S.res.budget-=m.opsCost*(active/100)*dd*modMult('cost');
  const df=DIFFS[d.difficulty];
  S.res.risk=clamp(S.res.risk+0.025*dd*(alt.risk/6+0.4)*(d.systems.shield?0.55:1)*df.risk*modMult('riskRate')/cf,0,100);
  S.stats.peakRisk=Math.max(S.stats.peakRisk,S.res.risk);
  if(R()()<S.res.risk/100*0.012*dd&&active>12){World.loseDrone();S.stats.lost++;}
  // ---- events ----
  if(R()()<df.ev*dd)randomEvent(false);
  // ---- history ----
  if(!S._lastH||S.day-S._lastH>=4){S._lastH=S.day;S.history.push([Math.round(opsDay()),Math.round(S.res.battery),Math.round(S.res.cargo),Math.round(S.res.dataDown),Math.round(S.res.risk),Math.round(S.res.budget)]);if(S.history.length>200)S.history.shift();}
  // ---- end conditions ----
  const g=goalProgress();
  if(!S.goalsDone&&g.length&&g.every(x=>x.p>=1)){S.goalsDone=true;sfx('success');toast('<b>All objectives met!</b> <button data-act="endMission">End & debrief</button> or keep operating for a higher score.','g');log('✅ All objectives met.','good');}
  if(opsDay()>=S.deadline)endMission('deadline');
  else if(S.res.budget<=0){S.res.budget=0;endMission('budget');}
  else if(S.res.risk>=100)endMission('risk');
}
function goalProgress(){
  const sc=SCENARIOS[S.design.scenario];
  return sc.goals.map(g=>{let val=0;
    if(g.k==='data')val=S.res.dataDown;
    else if(g.k==='coverage')val=S.coverage[g.tid];else if(g.k==='mfac')val=S.mfac[g.tid].online?1:0;
    else if(g.k==='mfacN')val=Object.values(S.mfac).filter(x=>x.online).length;else if(g.k==='dfac')val=S.dfac.online?1:0;
    else if(g.k==='riskBelow'){val=S.res.risk;return{...g,val,p:S.phase==='plan'?0:(val<g.v?1:0)};}
    if(g.k==='cargo')val=S.stats.delivered;
    return{...g,val,p:clamp(val/g.v,0,1)};});
}
