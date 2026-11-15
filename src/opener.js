'use strict';
// ---------- Arcade opener: automated mini-run of the whole loop, with optional control prompts ----------
const Opener={alive:0,phase:'',prompt:null,hits:{},
 seen(){return localStorage.getItem('abmc_opener')==='1';},
 open(){hideModal();this.alive++;const tok=this.alive;App.opener=true;this.phase='title';this.hits={};
  S=newState('ceres');S.design.difficulty='cadet';Studio.autoAll();applyDesignToState();World.resetSwarm();S.speed=1;App.CRUISE_SEC=8;
  go('opener');const W=World;W.flyTo(W.launchPos.clone(),3.2,0.01,()=>W.launchPos);W.cam.auto=0.12;W.cam.phi=1.15;
  ['op-cap','op-gen','op-prompt','op-hand','op-end'].forEach(id=>$('#'+id).classList.remove('show'));$('#op-title').className='op-title show';
  if(AUD.ctx&&AUD.ctx.state==='running'){Music.scene('title');}},
 start(){if(this.phase!=='title')return;audioInit();Music.scene('title');this.phase='run';$('#op-title').classList.add('out');setTimeout(()=>$('#op-title').classList.remove('show','out'),800);this.run(this.alive);},
 ok(tok){return tok===this.alive&&App.opener;},
 wait(ms,tok){return new Promise(r=>setTimeout(()=>r(this.ok(tok)),ms));},
 async until(fn,ms,tok){const t0=performance.now();while(this.ok(tok)&&!fn()&&performance.now()-t0<ms)await this.wait(100,tok);return this.ok(tok);},
 cap(t,sub){const el=$('#op-cap');el.classList.remove('show');setTimeout(()=>{el.innerHTML=`${t}${sub?`<small>${sub}</small>`:''}`;el.classList.add('show');},120);},
 follow(f,dist,dur=1.4){World.flyTo(f(),dist,dur,f);World.cam.auto=0.05;},
 async ask(k,text,sub,ms,tok,where){const el=$('#op-prompt'),hand=$('#op-hand');this.prompt={k,where};this.hits[k]=0;
  el.classList.remove('ok');el.querySelector('.op-ptxt').innerHTML=`${text}<small>${sub} · or just watch</small>`;el.classList.add('show');hand.className='op-hand show g-'+(k==='asteroid'?'tap':k);
  const bar=el.querySelector('.op-bar i');const t0=performance.now();
  while(this.ok(tok)&&!this.hits[k]&&performance.now()-t0<ms){bar.style.width=((performance.now()-t0)/ms*100)+'%';await this.wait(60,tok);}
  hand.className='op-hand';if(this.hits[k]&&this.ok(tok)){el.classList.add('ok');el.querySelector('.op-ptxt').innerHTML='✓ NICE! <small>That’s how you command the swarm.</small>';this.okFx();await this.wait(900,tok);}
  el.classList.remove('show');this.prompt=null;return this.ok(tok);},
 okFx(){sfx('success');const d=document.createElement('div');d.className='op-ok';d.textContent='NICE!';$('#v-opener').appendChild(d);setTimeout(()=>d.remove(),950);navigator.vibrate&&navigator.vibrate(20);},
 hit(k){if(this.prompt&&this.prompt.k===k)this.hits[k]=1;},
 frame(){if(View.cur!=='opener')return;const h=$('#op-hand');if(!h.classList.contains('show'))return;let x=innerWidth*0.5,y=innerHeight*0.52;
  if(this.prompt&&this.prompt.where){const o={};World.project(this.prompt.where(),o);if(o.vis){x=o.x;y=o.y+10;}}h.style.transform=`translate(${x}px,${y}px)`;},
 tap(x,y){if(this.phase==='title'){this.start();return;}const id=World.pickTarget(x,y,30);
  if(id){const T=World.T[id];World.flyTo(T.pos,T.t.r*6,1.1,()=>World.T[id].pos);sfx('lock');World.burst(T.pos,[1,0.8,0.3],40,T.t.r);this.hit('asteroid');return;}
  const p=World.pointOnFocusPlane(x,y);const sc=clamp(World.cam.dist*0.09,0.08,3);S.waypoint={pos:p.toArray(),groups:[...GKEYS],scale:sc,t0:performance.now(),reached:0};sfx('waypoint');World.burst(p,[0.3,0.95,1],24,sc*0.6);this.hit('tap');},
 async run(tok){const W=World;const gen=$('#op-gen');
  // 1 · LAUNCH
  this.cap('LAUNCH',`${S.design.fleet.total} drones · 4 families leave Earth`);launchMission();
  this.follow(()=>W.groupCentroid('all'),5,1.2);if(!await this.wait(1600,tok))return;
  if(!await this.ask('tap','TAP to redirect the swarm','A waypoint appears and the drones turn',5000,tok))return;
  this.cap('CRUISE','The swarm streaks to the asteroid belt');
  if(!await this.until(()=>S.phase==='ops',9000,tok))return;if(S.phase!=='ops'){S.day=S.arriveDay;}
  // 2 · ARRIVE
  Music.scene('action');this.cap('ARRIVE · SWARM','Drones spread through the Ceres field');this.follow(()=>W.T.ceres.pos,W.T.ceres.t.r*7,1.6);if(!await this.wait(1500,tok))return;
  if(!await this.ask('hold','HOLD to rally','Drones pack tightly around your finger · release to resume',5000,tok))return;
  // 3 · TRANSFORM
  this.cap('LAND · TRANSFORM','6 drones dock and become a mining factory');S.mfac.ceres.progress=0.999;if(!await this.until(()=>S.mfac.ceres.online,3000,tok))return;
  if(!S.mfac.ceres.online){S.mfac.ceres.online=true;S.mfac.ceres.progress=1;W.onFactory('ceres');Continuum.onMfac('ceres');}
  if(!await this.wait(2000,tok))return;
  // 4 · REPLICATE
  this.cap('REPLICATE','The factory builds new drones from mined ore');gen.classList.add('show');const zoomP=this.ask('zoom','Two-finger swipe ↓ zoom in · ↑ zoom out','Or use the ＋ / − buttons in the game',5000,tok);
  for(let i=0;i<16&&this.ok(tok);i++){const g=GKEYS[i%3];W.spawnDrone(g,W.T.ceres.pos);S.groups[g].n++;S.gen.built++;S.stats.built++;gen.innerHTML=`GEN ${Continuum.generation()+1} ▲<small>+${S.gen.built} drones printed · ${W.aliveCount()} in swarm</small>`;gen.classList.remove('pop');void gen.offsetWidth;gen.classList.add('pop');sfx('deliver');await this.wait(300,tok);}
  if(!await zoomP)return;
  // 5 · EXPAND
  this.cap('EXPAND','Haulers fly a seed payload to Vesta');S.res.cargo=Math.max(S.res.cargo,40);Continuum.seed('vesta');W.flyTo(W.T.ceres.pos.clone().lerp(W.T.vesta.pos,0.5),W.fitDist(10),1.6);W.cam.auto=0.03;
  if(!await this.wait(1200,tok))return;
  if(!await this.ask('asteroid','TAP an asteroid to fly in','The camera locks onto it',5000,tok,()=>W.T.vesta.pos))return;
  this.cap('2ND FACTORY','Seed drones dock at Vesta · the network grows');S.mfac.vesta.progress=0.999;await this.until(()=>S.mfac.vesta.online,3500,tok);if(!this.ok(tok))return;
  if(!S.mfac.vesta.online){S.mfac.vesta.online=true;S.mfac.vesta.progress=1;W.onFactory('vesta');Continuum.onMfac('vesta');}
  W.flyTo(W.T.vesta.pos,W.T.vesta.t.r*7,1.2,()=>W.T.vesta.pos);if(!await this.wait(1800,tok))return;
  // 6 · WAYSTATION + crewed ship
  ['ceres','vesta'].forEach(id=>{const w=S.ways[id]||(S.ways[id]={fuel:0,parts:0,water:0,proc:0});w.fuel=Math.max(w.fuel,id==='ceres'?260:180);w.water=Math.max(w.water,200);w.hab={food:1,water:1,air:1,shelter:1,power:1};w._habT=1;});
  Music.jingle();this.cap('WAYSTATION ONLINE','Ice → H₂/O₂ propellant · habitat ready for crew');W.burst(W.T.ceres.pos,[0.4,1,0.6],120,1.4);if(!await this.wait(1400,tok))return;
  Continuum.dispatch();this.cap('REFUEL','The Marauder tops up along the chain');this.follow(()=>W.ship.position,9,1.2);
  await this.until(()=>S.ship&&S.ship.status==='done',13000,tok);if(!this.ok(tok))return;
  // END
  gen.classList.remove('show');$('#op-cap').classList.remove('show');$('#op-end').classList.add('show');sfx('success');
  if(!await this.wait(4200,tok))return;this.finish(false);},
 finish(skipped){if(!App.opener)return;this.alive++;App.opener=false;localStorage.setItem('abmc_opener','1');
  ['op-cap','op-gen','op-prompt','op-hand','op-end','op-title'].forEach(id=>$('#'+id).classList.remove('show'));this.prompt=null;this.phase='';
  S=newState('psyche');applyDesignToState();World.resetSwarm();World.cam.follow=null;App.CRUISE_SEC=24;renderConsole();Studio.tab='design';go('studio');
  setTimeout(()=>toast(skipped?'Intro skipped — <b>Stage 1</b>: engineer your drone families.':'<b>Stage 1</b>: engineer the drones that make drones.','g'),300);},
 skip(){if(!App.opener)return;audioInit();sfx('whoosh');this.finish(true);},
 bind(){let f4=null;
  const ts=e=>{if(e.touches.length>=4){let x=0,y=0;for(const t of e.touches){x+=t.clientX;y+=t.clientY;}f4={x:x/e.touches.length,y:y/e.touches.length};}};
  const tm=e=>{if(!f4||e.touches.length<4)return;let x=0,y=0;for(const t of e.touches){x+=t.clientX;y+=t.clientY;}x/=e.touches.length;y/=e.touches.length;if(Math.hypot(x-f4.x,y-f4.y)>40){f4=null;if(App.opener)this.skip();}};
  window.addEventListener('touchstart',ts,{passive:true,capture:true});window.addEventListener('touchmove',tm,{passive:true,capture:true});window.addEventListener('touchend',e=>{if(e.touches.length<4)f4=null;},{passive:true,capture:true});
  window.addEventListener('keydown',e=>{if(!App.opener)return;if(e.code==='Escape'||e.code==='Enter'){e.preventDefault();e.stopImmediatePropagation();if(this.phase==='title'&&e.code==='Enter')this.start();else this.skip();}else if(this.phase==='title'&&e.code==='Space'){e.preventDefault();this.start();}},true);}
};
