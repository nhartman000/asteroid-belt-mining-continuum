'use strict';
// ---------- Guided tutorial: one spotlighted action at a time, with a payoff, then auto-advance ----------
const Tour={i:-1,step:null,flags:{},log:[],t0:0,st0:0,lastAct:0,okAt:0,replayed:false,
 done(){return localStorage.getItem('abmc_tour')==='1'||localStorage.getItem('abmc_opener')==='1';},
 $:s=>document.querySelector(s),
 near(o,k){const p={};World.project(o,p);return p.vis?p:null;},
 ceres(){return World.T.ceres.pos;},
 steps:[
  // --- your swarm: controls (pre-launch preview at the launch station) ---
  {id:'select',txt:'Tap Miners to select them',ok:'Miners selected',g:'tap',view:'swarm',
   el:()=>Tour.$('#sw-groups [data-g="miner"]'),done:()=>S.sel==='miner'},
  {id:'send',txt:'Tap empty space to send them',ok:'They fly to your mark',g:'tap',view:'swarm',allow:'#gl',
   xy:()=>({x:innerWidth*0.72,y:innerHeight*0.30,r:56}),done:()=>Tour.flags.tap},
  {id:'rally',txt:'Press and hold to rally',ok:'The swarm rallies to you',g:'hold',view:'swarm',allow:'#gl',
   xy:()=>({x:innerWidth*0.4,y:innerHeight*0.42,r:60}),done:()=>Tour.flags.rally},
  {id:'zoom',txt:'Two fingers: swipe down to zoom',ok:'Zoom in and out anytime',g:'zoom',view:'swarm',allow:'#gl,#v-swarm .side',side:1,
   xy:()=>({x:innerWidth*0.5,y:innerHeight*0.45,r:80}),enter(){Tour.d0=World.cam.dist;},done:()=>Math.abs(Math.log(World.cam.dist/Tour.d0))>0.3},
  // --- design (Stage 1) ---
  {id:'family',txt:'Tap Ice Harvester to design it',ok:'Ice is rocket fuel',g:'tap',
   enter(){S.waypoint=null;S.rally=null;S.sel='all';Studio.tab='design';Studio.cur='seed';go('studio');},
   el:()=>Tour.$('#studio-body [data-act="stP"][data-k="iceharv"]'),done:()=>Studio.cur==='iceharv'},
  {id:'tcta',txt:'Tap a glowing part — watch it narrow',ok:'',g:'tap',
   enter(){Tour.n0=Studio.D().tau.length;},
   el:()=>Tour.$('#studio-body .txgrid .tx.hl')||Tour.$('#studio-body .txgrid .tx:not(.off)'),
   done:()=>Studio.D().tau.length>Tour.n0,
   okf(){return 'Design space narrowed — TCTA ✓';},
   after(){Studio.autoAll();Studio.tab='mix';App.refresh(true);}},
  {id:'ratio',txt:'Drag to set your fleet size',ok:'Bigger fleet, faster growth',g:'drag',
   enter(){Studio.tab='mix';App.refresh(true);Tour.f0=S.design.fleet.total;},
   el:()=>Tour.$('#studio-body input[data-inp="total"]'),done:()=>S.design.fleet.total!==Tour.f0},
  {id:'launch',txt:'Tap Launch!',ok:'Liftoff!',g:'tap',enter(){App.CRUISE_SEC=2.5;},
   el:()=>Tour.$('#mixLaunch'),done:()=>S.phase!=='plan'},
  // --- watch it work ---
  {id:'land',txt:'Watch: they land and build',ok:'A factory is online',g:'watch',
   enter(){if(View.cur!=='swarm')go('swarm');Tour.lt0=performance.now();Tour.ot0=0;},
   tick(){if(S.phase==='cruise'&&performance.now()-Tour.lt0>2600&&S.day<S.arriveDay-0.02)S.day=S.arriveDay-0.02;if(S.phase==='ops'){if(!Tour._arr){Tour._arr=1;const W=World;W.flyTo(W.T.ceres.pos,W.T.ceres.t.r*7,1.4,()=>W.T.ceres.pos);W.cam.auto=0.05;}const f=S.mfac.ceres;if(!Tour.ot0)Tour.ot0=performance.now();if(!f.online){f.progress=Math.max(f.progress,0.999);if(performance.now()-Tour.ot0>1800){f.online=true;f.progress=1;World.onFactory('ceres');Continuum.onMfac('ceres');}}}},
   pt:()=>S.phase==='ops'?World.T.ceres.pos:World.groupCentroid('all'),done:()=>S.phase==='ops'&&S.mfac.ceres.online},
  {id:'way',txt:'Tap Ceres to see its waystation',ok:'Ice → rocket fuel here',g:'tap',allow:'#gl',near:1,
   pt:()=>World.T.ceres.pos,r:64,done:()=>Tour.flags.tapNear,
   after(){const w=S.ways.ceres||(S.ways.ceres={fuel:0,parts:0,water:0,proc:0});w.fuel=Math.max(w.fuel,260);w.water=Math.max(w.water,200);w.hab={food:1,water:1,air:1,shelter:1,power:1};w._habT=1;
    World.burst(World.T.ceres.pos,[0.4,1,0.6],90,1.2);Music.jingle&&Music.jingle();}},
  {id:'ship',txt:'Tap to send the Marauder',ok:'The crew refuels on the way',g:'tap',
   enter(){go('status');},el:()=>Tour.$('#status-body [data-act="ship"]'),done:()=>S.ship&&S.ship.status==='flying',hold:1600},
  // --- deep space ---
  {id:'deep',txt:'Tap 🌌 to zoom out to the stars',ok:'Welcome to the galaxy',g:'tap',
   enter(){const D=Deep.st();D.sandbox=true;DEEP_HUBS.forEach(h=>D.hubs[h.id]=1);D.tab='target';if(!Object.keys(D.pick).length)Deep.autoPick();Deep.netDirty=1;if(View.cur!=='solar')go('solar');},
   el:()=>Tour.$('#v-solar [data-act="openDeepZ"]'),done:()=>View.cur==='deep',hold:1800},
  {id:'probe',txt:'Tap to launch seed probes',ok:'Probes build new waystations',g:'tap',
   enter(){const D=Deep.st();D.tab='target';const sh=$('#v-deep .deepsheet');sh.classList.remove('min');const tg=sh.querySelector('.sheettog');if(tg)tg.textContent='▾';renderDeep();},
   el:()=>Tour.$('#deep-body [data-act="deepLaunch"]'),done:()=>S.deep&&S.deep.probes.length>0,
   after(){const D=S.deep;D.run=true;D.rate=3000;Deep.tween(60,1.6);},hold:1500},
  // --- home base + save ---
  {id:'home',txt:'Tap Console to go home',ok:'Console is home base',g:'tap',back:1,
   el:()=>Tour.$('#v-'+View.cur+' .topbar .back'),done:()=>View.cur==='console',after(){S.deep&&(S.deep.run=false);}},
  {id:'saves',txt:'Tap Saved games',ok:'',g:'tap',
   el:()=>Tour.$('#v-console [data-act="openSaves"]'),done:()=>!!Tour.$('#mbox .savelist')},
  {id:'save',txt:'Tap Save as new',ok:'Saved! Load it anytime',g:'tap',
   enter(){Tour.sv0=Saves.idx().filter(x=>!x.auto).length;const n=Tour.$('#svname');if(n)n.value='My first swarm';},
   el:()=>Tour.$('#mbox [data-act="svNew"]'),done:()=>Saves.idx().filter(x=>!x.auto).length>Tour.sv0,after(){hideModal();}}],
 ui(){let r=$('#tour');if(r)return r;r=document.createElement('div');r.id='tour';
  r.innerHTML=`<div class="t-spot"></div><div class="t-ring"></div><div class="t-hand"><span class="f1">👆</span><span class="f2">👆</span></div><div class="t-tip"><div class="t-prog"><i></i></div><div class="t-txt"></div></div><button class="t-skip" data-tskip="1" aria-label="Skip tutorial">Skip ▸▸</button><div class="t-done"></div>`;
  document.body.appendChild(r);r.querySelector('.t-skip').addEventListener('click',e=>{e.stopPropagation();Tour.skip();});return r;},
 start(replay){audioInit();hideModal();if(Coach.i>=0){Coach.i=-1;Coach.show();}
  if(replay&&(S.phase!=='plan'||S.deep)){try{Saves.autosave();}catch(e){}this.replayed=Saves.idx().some(x=>x.auto);}else this.replayed=!!replay&&Saves.idx().some(x=>x.auto);
  App.opener=false;Opener.alive++;['op-cap','op-gen','op-prompt','op-hand','op-end','op-title'].forEach(id=>$('#'+id)&&$('#'+id).classList.remove('show'));
  App.tour=true;this.log=[];this.t0=performance.now();this.flags={};this._arr=0;
  S=newState('ceres');S.design.difficulty='cadet';applyDesignToState();World.resetSwarm();World.cam.follow=null;S.speed=1;S.sel='all';
  document.body.classList.add('touring');const r=this.ui();r.classList.add('on');r.querySelector('.t-done').classList.remove('show');
  Music.scene&&Music.scene('calm');go('swarm');this.go(0);},
 go(i){this.i=i;this.flags={};const st=this.steps[i];this.step=st;if(!st){this.complete();return;}
  document.body.classList.toggle('t-side',!!st.side);document.body.classList.toggle('t-back',!!st.back);
  try{st.enter&&st.enter();}catch(e){console.error(e);}
  const r=this.ui();r.querySelector('.t-tip').classList.remove('ok','nudge');r.querySelector('.t-txt').innerHTML=`<b>${st.txt}</b>`;
  r.querySelector('.t-prog i').style.width=(i/this.steps.length*100)+'%';r.querySelector('.t-tip').dataset.n=`${i+1}/${this.steps.length}`;
  r.querySelector('.t-hand').className='t-hand g-'+st.g;r.classList.toggle('watch',st.g==='watch');r.querySelector('.t-ring').className='t-ring';
  this.st0=performance.now();this.lastAct=this.st0;this.okAt=0;this._scrolled=0;},
 target(){const st=this.step;if(!st)return null;
  if(st.el){const e=st.el();if(!e)return null;const b=e.getBoundingClientRect();if(!b.width&&!b.height)return null;return{x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height,el:e};}
  if(st.xy){const p=st.xy();return{x:p.x,y:p.y,w:p.r*2,h:p.r*2,round:1};}
  if(st.pt){const p={};World.project(st.pt(),p);if(!p.vis)return null;const r=st.r||70;return{x:p.x,y:p.y,w:r*2,h:r*2,round:1};}return null;},
 frame(){if(!App.tour||!this.step)return;const st=this.step,r=this.ui(),now=performance.now();
  if(!this.okAt){try{st.tick&&st.tick();}catch(e){}
   let ok=false;try{ok=!!st.done();}catch(e){}if(ok)this.success();
   else if(now-this.lastAct>6000){this.lastAct=now;this.nudge();}}
  else if(now-this.okAt>(st.hold||950)){this.log.push({id:st.id,ms:Math.round(this.okAt-this.st0)});const a=st.after;try{a&&a.call(st);}catch(e){console.error(e);}this.go(this.i+1);return;}
  const t=this.target();const spot=r.querySelector('.t-spot'),ring=r.querySelector('.t-ring'),hand=r.querySelector('.t-hand'),tip=r.querySelector('.t-tip');
  if(t&&t.el&&!this._scrolled){this._scrolled=1;const b=t.el.getBoundingClientRect();if(b.top<70||b.bottom>innerHeight-110||b.left<0||b.right>innerWidth)t.el.scrollIntoView({block:'center',inline:'center'});}
  else if(t&&t.el&&(t.x<0||t.x>innerWidth)&&now-this.st0>400){t.el.scrollIntoView({block:'nearest',inline:'center'});}
  if(!t){spot.style.opacity=0;ring.style.opacity=0;hand.style.opacity=0;tip.style.top='auto';tip.style.bottom='calc(18px + var(--sab,0px))';return;}
  const pad=t.round?0:8,w=Math.max(44,t.w+pad*2),h=Math.max(44,t.h+pad*2);
  for(const e of [spot,ring]){e.style.opacity=1;e.style.width=w+'px';e.style.height=h+'px';e.style.transform=`translate(${t.x-w/2}px,${t.y-h/2}px)`;e.style.borderRadius=t.round?'50%':'14px';}
  hand.style.opacity=this.okAt?0:1;hand.style.transform=`translate(${t.x+(t.round?0:Math.min(w/2-14,30))}px,${t.y+(t.round?6:h/2-12)}px)`;
  const low=t.y>innerHeight*0.5;tip.style.top=low?'calc(64px + var(--sat,0px))':'auto';tip.style.bottom=low?'auto':'calc(18px + var(--sab,0px))';},
 ev(k,a){if(!App.tour||!this.step||this.okAt)return;this.lastAct=performance.now();
  if(k==='tap'){this.flags.tap=1;const st=this.step;if(st.near){const t=this.target();if(t&&a&&Math.hypot(a.x-t.x,a.y-t.y)<Math.max(70,t.w*0.8))this.flags.tapNear=1;else if(a&&a.id==='ceres')this.flags.tapNear=1;}}
  if(k==='rally')this.flags.rally=1;},
 success(){const st=this.step,r=this.ui();this.okAt=performance.now();const tip=r.querySelector('.t-tip');tip.classList.remove('nudge');tip.classList.add('ok');
  const txt=st.okf?st.okf():st.ok;r.querySelector('.t-txt').innerHTML=`✓ ${txt||'Nice!'}`;r.querySelector('.t-ring').className='t-ring burst';sfx('success');navigator.vibrate&&navigator.vibrate(18);},
 nudge(){const r=this.ui(),tip=r.querySelector('.t-tip'),ring=r.querySelector('.t-ring');tip.classList.remove('nudge');ring.classList.remove('nudge');void tip.offsetWidth;tip.classList.add('nudge');ring.classList.add('nudge');sfx('tap');},
 // block taps on things the current step hasn't introduced (never blocks Skip)
 guard(e){if(!App.tour||!Tour.step)return;const t=e.target;if(!t||!t.closest)return;if(t.closest('#tour .t-skip,#tour .t-done'))return;
  if(Tour.okAt){if(e.cancelable)e.preventDefault();e.stopPropagation();return;}
  const st=Tour.step;let ok=false;
  if(st.allow)ok=!!t.closest(st.allow)||(/#gl/.test(st.allow)&&!t.closest('button,input,select,a,label,[data-act],.topbar,.bottom,.deepsheet,#modal'));
  if(!ok&&st.el){const el=st.el();ok=!!(el&&(el===t||el.contains(t)));}
  if(!ok&&st.g==='watch')ok=!t.closest('button,input,select,a,label,[data-act],.topbar,.bottom,.deepsheet,#modal');
  if(!ok){if(e.cancelable)e.preventDefault();e.stopPropagation();if(e.type==='pointerdown'||e.type==='touchstart')Tour.nudge();}},
 bind(){['pointerdown','mousedown','touchstart','click'].forEach(k=>window.addEventListener(k,e=>this.guard(e),{capture:true,passive:false}));},
 complete(){this.step=null;const total=Math.round(performance.now()-this.t0);this.total=total;localStorage.setItem('abmc_tour','1');localStorage.setItem('abmc_opener','1');
  const r=this.ui();['t-spot','t-ring','t-hand','t-tip'].forEach(c=>r.querySelector('.'+c).style.opacity=0);document.body.classList.remove('t-side','t-back');
  const d=r.querySelector('.t-done');d.innerHTML=`<div class="t-big">🎉 You’re ready!</div><p>Select · send · rally · zoom · design · launch · build · refuel · explore · save.</p>
   <button class="btn y big" data-tdone="new">▶ Start my mission</button>${this.replayed?'<button class="btn" data-tdone="back">⟲ Back to my game</button>':''}<p class="dim" style="font-size:12px">Replay anytime: Console › 🎓 Tutorial</p>`;
  d.classList.add('show');Music.jingle&&Music.jingle();d.querySelectorAll('[data-tdone]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();this.finish(b.dataset.tdone);}));},
 finish(how){App.tour=false;this.step=null;this.i=-1;const r=this.ui();r.classList.remove('on','watch');r.querySelector('.t-done').classList.remove('show');
  document.body.classList.remove('touring','t-side','t-back');localStorage.setItem('abmc_tour','1');localStorage.setItem('abmc_opener','1');
  if(S.deep)S.deep.run=false;
  if(how==='back'&&Saves.idx().some(x=>x.auto)){Saves.load('auto');return;}
  S=newState('psyche');applyDesignToState();World.resetSwarm();World.cam.follow=null;App.CRUISE_SEC=24;renderConsole();Studio.tab='design';Studio.cur='seed';go('studio');
  setTimeout(()=>toast(how==='skip'?'Tutorial skipped — replay it from Console › 🎓 Tutorial.':'<b>Stage 1</b>: design your drones, then launch.','g'),300);},
 skip(){if(!App.tour)return;sfx('whoosh');this.log.push({id:'skip',at:this.i});this.finish('skip');}
};
