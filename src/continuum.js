'use strict';
// ---------- The Continuum: drones that build drones, waystations that make propellant, crewed-ship refuel chain ----------
const SHIP={dry:120,tank:300,isp:450}; // crewed transfer ship (illustrative design), H2/O2 engine Isp ~450 s
const G0=9.80665;
const Continuum={
 initState(s){s.ways={};s.gen={built:0,initial:s.design.fleet.total};s.vit=0;s.ship={status:'idle',stop:0,log:[],refuels:[]};s.flags={arch:false,solar:false,swarm:false,pov:false};},
 vitaminsKit(d){return d.rep?d.rep.kits:40;},
 closure(d){return d.rep?d.rep.closure:60;},
 doublings(){const g=S.gen;return Math.floor(Math.log2(1+g.built/Math.max(1,g.initial)));},
 generation(){return 1+this.doublings();},
 factories(){return (S.dfac.online?1:0)+Object.values(S.mfac).filter(x=>x.online).length;},
 // per-day ops logic (called from simStep)
 day(dd,pEff,cf){
  const d=S.design;
  // waystation production: ore -> water/metal -> propellant & parts
  for(const tid in S.mfac){const mf=S.mfac[tid];if(!mf.online)continue;const w=S.ways[tid]||(S.ways[tid]={fuel:0,parts:0,water:0,proc:0});
    const t=TMAP[tid];const take=Math.min(S.res.site[tid],1.6*(d.sm?d.sm.refine:1)*(d.systems.fab?1.4:1)*pEff*cf*dd);S.res.site[tid]-=take;w.proc+=take;
    const water=take*t.ice, metal=take*t.metal, rock=take-water-metal;
    // electrolysis needs power: throttled by pEff already; water->H2+O2 propellant (~89% O2 / 11% H2 by mass, 100% mass conversion minus losses)
    w.water+=water;w.fuel+=water*0.9+rock*0.08; // dry rock: some oxygen from regolith (molten regolith electrolysis, low yield)
    w.parts+=metal*0.7;
    // terraformer life support: food (hydroponics), water (recycling), air (O2 from electrolysis), shelter (regolith-buried habitat), power
    const H=w.hab||(w.hab={food:0,water:0,air:0,shelter:0,power:0});const hr=0.014*clamp(d.sm?d.sm.hab:0.3,0,2.5)*cf*dd;const wet=w.water>1?1:0.3;
    H.food=Math.min(1,H.food+hr*wet*0.9);H.water=Math.min(1,H.water+hr*wet*1.2);H.air=Math.min(1,H.air+hr*wet);H.shelter=Math.min(1,H.shelter+hr*0.8);H.power=Math.min(1,H.power+hr*1.3*pEff);
    if(!w._habT&&this.ready(tid)){w._habT=1;Music.jingle();log(`🌿 ${TMAP[tid].name} waystation is now habitable: the Marauder can stop here.`,'good');toast(`<b>${TMAP[tid].name} habitat ready</b> — life support passes the crew-stop threshold.`,'g');}}
  // replication: each factory builds drones from delivered ore + Earth "vitamins" (chips) not made locally
  const nf=this.factories();
  if(nf>0){S.prodTimer+=dd*nf*(d.sm?d.sm.fab:1)*(d.systems.fab?1.6:1)*pEff*cf/(1+this.closure(d)/200);
    const vitNeed=(100-this.closure(d))/100; // kits per drone
    while(S.prodTimer>=9){S.prodTimer-=9;
      if(World.aliveCount()>=World.NMAX-6){if(!S._capWarn){S._capWarn=1;toast('<b>Swarm at display cap</b> — extra production is stockpiled as spare parts.','y');}break;}
      if(S.res.cargo<2.5){if(!S._oreWarn){S._oreWarn=1;toast('<b>Replication stalled:</b> not enough delivered ore (needs 2.5 t per drone). Haulers are the bottleneck.','y');concept('logistics');}break;}
      if(S.vit<vitNeed){if(!S._vitWarn){S._vitWarn=1;toast('<b>Replication stalled:</b> out of Earth-made electronics (“vitamins”). Higher local manufacturing (closure) needs fewer.','r');concept('replication');}break;}
      S.res.cargo-=2.5;S.vit-=vitNeed;S.gen.built++;S.stats.built++;
      const src=S.dfac.online?null:World.T[Object.keys(S.mfac).find(k=>S.mfac[k].online)].pos;
      World.spawnDrone(S.prodGroup,src);S.groups[S.prodGroup].n++;
      const dbl=this.doublings();if(dbl>(S._dbl||0)){S._dbl=dbl;toast(`<b>Population doubled!</b> The swarm has doubled ${dbl}× through self-replication.`,'g');log(`🧬 Swarm population doubling #${dbl}.`,'good');concept('replication');}
    }}
 },
 onMfac(tid){const n=World.consumeDrones('factory',Math.min(6,Math.max(0,S.groups.factory.n-2)),tid);log(`🔧 ${n} factory drones docked and became part of the ${TMAP[tid].name} waystation.`,'good');S.ways[tid]=S.ways[tid]||{fuel:0,parts:0,water:0,proc:0};concept('isru');},
 onDfac(){const n=World.consumeDrones('flyback',Math.min(4,Math.max(0,S.groups.flyback.n-4)));log(`🔧 ${n} flyback drones transformed into drone-factory components.`,'good');},
 seed(tid){if(S.phase!=='ops')return toast('Seeding new waystations is possible during operations.','y');if(S.res.cargo<15)return toast('Need 15 t of delivered ore to seed a new waystation.','y');
   if(S.mfac[tid].online)return toast(TMAP[tid].name+' already has a waystation.','y');
   S.res.cargo-=15;if(!S.design.targets.includes(tid))S.design.targets.push(tid);if(!S.design.multi){S.design.multi=true;GKEYS.forEach(g=>S.groups[g].target=S.design.primary);}
   S.groups.factory.target=tid;S.mfac[tid].progress=Math.max(S.mfac[tid].progress,0.25);World.retarget('factory');World.burst(World.depot.position,[0.4,1,0.6],40,0.6);
   log(`🌱 Seed payload sent to ${TMAP[tid].name}: factory drones re-tasked to build a new waystation.`,'good');toast(`<b>Seeding ${TMAP[tid].name}</b> — factory drones are flying the seed payload there.`,'g');sfx('launch');App.refresh();},
 HAB_MIN:0.5,
 readiness(tid){const w=S.ways[tid];if(!w||!w.hab)return 0;const H=w.hab;return Math.min(H.food,H.water,H.air,H.shelter,H.power);},
 ready(tid){return this.readiness(tid)>=this.HAB_MIN;},
 // ---- crewed ship refuel chain ----
 dvFromProp(m){return SHIP.isp*G0/1000*Math.log((SHIP.dry+m)/SHIP.dry);},
 propForDv(dv){return SHIP.dry*(Math.exp(dv*1000/(SHIP.isp*G0))-1);},
 chain(){return Object.keys(S.mfac).filter(k=>S.mfac[k].online&&this.ready(k)).sort((a,b)=>tA(a)-tA(b));},
 built(){return Object.keys(S.mfac).filter(k=>S.mfac[k].online).sort((a,b)=>tA(a)-tA(b));},
 shipCalc(){const base=this.dvFromProp(SHIP.tank);let extra=0;const stops=[];
   for(const tid of this.chain()){const f=Math.min(SHIP.tank,(S.ways[tid]||{}).fuel||0);const dv=this.dvFromProp(f);extra+=dv;stops.push({tid,fuel:f,dv});}
   const total=base+extra;const needEarth=this.propForDv(total);
   const dests=[['Mars (transfer)',1.52,1.85],['Ceres',2.77,10.6],['Psyche',2.93,3.1],['Hygiea',3.15,3.8],['Jupiter (transfer)',5.2,1.3]].map(([n,a,i])=>{const e=dvEstimate(a,i,1);const need=e.dep+Math.sqrt(e.arr*e.arr+e.plane*e.plane);return{n,need,withC:total>=need,without:base>=need};});
   return{base,extra,total,needEarth,ratio:needEarth/SHIP.tank,stops,dests};},
 dispatch(){if(S.ship.status==='flying')return;const ch=this.chain();if(!ch.length)return toast(this.built().length?'No waystation is habitable yet — crews can only stop where life support (food, water, air, shelter, power) is ≥50%. Add terraformers or habitat builders.':'Build at least one waystation (mining factory) first — the ship needs somewhere to refuel.','y');
   S.ship={status:'flying',stop:0,seg:0,t:0,route:[World.launchPos.clone(),...ch.map(id=>World.T[id].pos.clone().add(new THREE.Vector3(0,TMAP[id].r*2,0))),World.planets.Jupiter.position.clone().multiplyScalar(0.62)],refuels:[],ids:ch};
   World.ship.visible=true;World.ship.position.copy(S.ship.route[0]);log('👩‍🚀 The Marauder (crewed ship) departs Earth on the automated refuel chain.','good');toast('<b>Crewed ship launched!</b> Watch it refuel at each waystation.','g');sfx('launch');
   if(View.cur==='solar'||View.cur==='swarm'){World.cam.follow=()=>World.ship.position;World.flyTo(World.ship.position,View.cur==='solar'?14:6,1.4,()=>World.ship.position);}},
 frame(dt,t){const sh=S.ship;if(!sh||sh.status!=='flying')return;const R=sh.route;const a=R[sh.seg],b=R[sh.seg+1];if(!b){sh.status='done';const c=this.shipCalc();S.shipResult=c;Music.sting();log(`🏁 The Marauder completed the chain: Δv budget ${fmt(c.total,1)} km/s vs ${fmt(c.base,1)} km/s without waystations.`,'good');toast(`<b>Refuel chain complete!</b> Δv ${fmt(c.total,1)} km/s vs ${fmt(c.base,1)} km/s from Earth alone.`,'g');sfx('success');return;}
   sh.t+=dt/(App.opener?1.6:3.2);const k=Math.min(1,sh.t);const e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;World.ship.position.lerpVectors(a,b,e);World.ship.lookAt(b);World.ship.rotateY(-Math.PI/2);
   World.ship.userData.eng.material.opacity=0.6+0.4*Math.sin(t*30);
   if(sh.t>=1){sh.t=0;sh.seg++;const id=sh.ids[sh.seg-1];if(id&&sh.seg<=sh.ids.length){const w=S.ways[id];const f=Math.min(SHIP.tank,w.fuel);w.fuel-=f;sh.refuels.push({id,f});World.burst(World.ship.position,[0.6,0.9,1],50,0.5);World.floatText(World.ship.position,`⛽ +${fmt(f,1)} t propellant @ ${TMAP[id].name}`,'#5dff8a');sfx('build');log(`⛽ Ship refueled at ${TMAP[id].name}: +${fmt(f,1)} t (autonomous transfer).`,'good');}}},
 stages(){const f=S.flags||{};const mOn=Object.values(S.mfac).filter(x=>x.online).length;return[
   {n:'Design drones (TCTA)',done:!!(S.design.studio&&S.design.studio.committed),hint:'Drone Design Studio: design every drone type and set the fleet ratio.'},
   {n:'Launch & pick the best site',done:S.phase==='ops'||S.phase==='ended',hint:'Solar System: compare site scores; launch.'},
   {n:'Land, swarm & transform',done:mOn>=1,hint:'Factory drones dock together into a mining factory / waystation.'},
   {n:'Mine & replicate',done:S.gen.built>=5,hint:'Drone factories turn delivered ore into new drones.'},
   {n:'Expand: seed new factories',done:mOn>=2,hint:'Fabrication → Seed a new waystation with haulers.'},
   {n:'Refuel the Marauder',done:S.ship&&S.ship.status==='done',hint:'Status → Dispatch the Marauder (crewed ship) along the chain.'}];},
 siteScore(id){const r=activeRef(id),t=TMAP[id];const e=dvEstimate(r.a,r.i,1);const dv=e.arr+e.plane*0.5;const sun=1/(r.a*r.a);
   const fuel=t.ice,parts=t.metal;const s=clamp(fuel*2.2+parts*0.9+sun*0.35-dv*0.035+0.25,0,1);return{s,dv,sun,fuel,parts};}
};
