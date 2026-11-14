'use strict';
// ---------- View manager, toasts, modal, concepts ----------
const View={cur:'console',lock:null,track:'fleet'};
const VIEWS={solar:'Solar System & Targets',swarm:'Swarm Operations',pov:'Individual Drone POV',fab:'Drone Fabrication',arch:'Mission Architecture',status:'Mission Status & Debrief'};
function toast(html,cls=''){if(App.opener)return;const el=document.createElement('div');el.className='toast '+cls;el.innerHTML=html;$('#toasts').appendChild(el);setTimeout(()=>{el.style.transition='opacity .4s';el.style.opacity='0';setTimeout(()=>el.remove(),400);},cls==='r'?5000:3600);while($('#toasts').children.length>2)$('#toasts').firstChild.remove();}
function showModal(html,sticky=false){$('#mbox').innerHTML=(sticky?'':'<button class="ib" style="float:right" data-act="closeModal" aria-label="Close">✕</button>')+html;$('#modal').classList.add('show');$('#modal').dataset.sticky=sticky?'1':'';}
function hideModal(){$('#modal').classList.remove('show');}
function concept(k){if(App.opener)return;if(!S.concepts)S.concepts={};if(S.concepts[k]||localStorage.getItem('abmc_tips')==='0')return;const c=CONCEPTS[k];if(!c)return;
  const now=Date.now();if(now-(window._lastC||0)<9000){return;}window._lastC=now;S.concepts[k]=1;setTimeout(()=>toast(`💡 <b>${c.t}</b> — ${c.x.split('. ')[0]}. <button data-act="concept" data-k="${k}">Learn more</button>`,''),400);}
function conceptModal(k){const c=CONCEPTS[k];showModal(`<h2>💡 ${c.t}</h2><p>${c.x}</p>${conceptNow(k)}<p><a href="${c.l}" target="_blank" rel="noopener">Learn more (NASA) ↗</a></p>`);}
function conceptNow(k){if(!S.m)return'';const m=S.m,d=S.design;const L=s=>`<div class="card"><div class="lbl">In your mission (simulated / computed)</div><p>${s}</p></div>`;
  if(k==='orbit')return L(`Half a transfer orbit from 1 AU to ${fmt(tA(d.primary),2)} AU takes ≈ ${fmt(m.hoh)} days (Hohmann formula). With ${PROPS[d.prop].name} your cruise is ${m.travel} days.`);
  if(k==='power')return L(`At ${m.reg} AU sunlight is ${fmt(100*m.fall,0)}% of Earth’s in this model. You generate ~${fmt(m.gen,1)} kW vs ~${fmt(m.demand,1)} kW demand.`);
  if(k==='comms')return L(`Signal light-time to Earth ≈ ${fmt(m.lightMin,0)} min one way. Data rate ≈ ${fmt(m.dataRate,2)} Mbps (simulated link model).`);
  if(k==='payload')return L(`Payload ${fmt(m.mass,1)} t vs deliverable ${fmt(m.deliverable,1)} t.`);
  if(k==='refuel'&&S.ways){const c=Continuum.shipCalc();return L(`Your chain: ${fmt(c.total,1)} km/s total Δv vs ${fmt(c.base,1)} km/s on Earth fuel alone.`);}
  return'';}
function topbar(title){return `<button class="back" data-act="back" aria-label="Back to Console">◀ Console</button><div class="ttl">${title}<small class="scnline">—</small></div><span class="badge b-sim dsrc" data-act="openData">DATA</span><div class="clock clk">T+0 d<small>PLAN</small></div><button class="ib mute" data-act="mute">🔊</button><button class="ib pausebtn" data-act="pause">⏸</button>`;}
function go(v){
  const prev=View.cur;View.cur=v;$$('.view').forEach(el=>el.classList.toggle('active',el.id==='v-'+v));
  $('#dim').classList.toggle('off',v==='solar'||v==='swarm'||v==='pov'||v==='he3'||v==='opener');
  if(v==='he3'||He3.built)He3.show(v==='he3');
  if(v!=='console')S.flags&&(S.flags[v]=true);
  const W=World,c=W.cam;c.auto=0;c.follow=null;
  if(v==='console'||v==='fab'||v==='arch'||v==='status'||v==='studio')cinematic();
  if(v==='solar'){if(View.lock){const T=W.T[View.lock];W.flyTo(T.pos,T.t.r*5,1.2,()=>W.T[View.lock].pos);c.auto=0.06;}else W.flyTo(new V3(0,0,0),W.fitDist(36),1.2);if(c.phi>1.3||c.phi<0.6)c.phi=1.0;}
  if(v==='swarm'){swarmCam(true);}
  if(v==='he3'){W.flyTo(new V3(0,0,0),W.fitDist(200),1.6);c.phi=0.75;c.auto=0.02;}
  if(v==='pov')Pov.enter();else Pov.exit&&Pov.exit();
  sfx(v==='console'?'back':'open');const mv=musicForView(v);if(mv)Music.scene(mv);App.refresh(true);
  if(v==='solar'&&!S.concepts.orbitHint){S.concepts.orbitHint=1;}
  if(prev!==v)window.scrollTo(0,0);
}
function cinematic(){const W=World,c=W.cam;if(S.phase==='plan'){W.flyTo(new V3(0,0,0),W.fitDist(30),1.4);c.auto=0.03;}else{const f=()=>W.groupCentroid('all');W.flyTo(f(),W.fitDist(S.phase==='cruise'?6:4),1.4,f);c.auto=0.05;}c.phi=1.1;}
function swarmCam(fly){const W=World;const g=S.sel;const tid=g==='all'?S.design.primary:W.groupTarget(g);const r=TMAP[tid].r;
  let dist=S.phase==='plan'?4.5:S.phase==='cruise'?7:r*9+2.4;
  const f=View.track==='fleet'?()=>W.groupCentroid(g):()=>W.T[W.groupTarget(g==='all'?'miner':g)].pos;
  if(fly)W.flyTo(f(),dist,1.3,f);else{W.cam.follow=f;}}
function selGroups(){return S.sel==='all'?[...GKEYS]:[S.sel];}

// ---------- input: touch + mouse (rotate, two-finger swipe zoom, tap, hold) ----------
const Gs={down:false,x0:0,y0:0,x:0,y:0,t0:0,moved:false,hold:null,two:false,ay:0,pd:0};
function canvasInput(){
  const cv=$('#gl');
  const startSingle=(x,y)=>{Gs.down=true;Gs.x0=Gs.x=x;Gs.y0=Gs.y=y;Gs.t0=performance.now();Gs.moved=false;clearTimeout(Gs.hold);
    if(View.cur==='swarm'||View.cur==='opener')Gs.hold=setTimeout(()=>{if(!Gs.moved&&Gs.down&&!Gs.two)startRally(x,y);},380);};
  const moveSingle=(x,y)=>{if(!Gs.down)return;const dx=x-Gs.x,dy=y-Gs.y;Gs.x=x;Gs.y=y;if(Math.hypot(x-Gs.x0,y-Gs.y0)>9){Gs.moved=true;}
    if(S.rally&&(View.cur==='swarm'||View.cur==='opener')){S.rally.pos.copy(World.pointOnFocusPlane(x,y));return;}
    if(Gs.moved){clearTimeout(Gs.hold);const c=World.cam;c.theta-=dx*0.0065;c.phi-=dy*0.0055;c.auto=0;}};
  const endSingle=()=>{if(!Gs.down)return;Gs.down=false;clearTimeout(Gs.hold);if(S.rally){endRally();return;}if(!Gs.moved&&performance.now()-Gs.t0<380)tap(Gs.x0,Gs.y0);};
  cv.addEventListener('touchstart',e=>{e.preventDefault();audioInit();const t=e.touches;
    if(t.length===1&&!Gs.two)startSingle(t[0].clientX,t[0].clientY);
    if(t.length===2){Gs.two=true;Gs.down=false;clearTimeout(Gs.hold);if(S.rally)endRally();Gs.ay=(t[0].clientY+t[1].clientY)/2;Gs.pd=Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}},{passive:false});
  cv.addEventListener('touchmove',e=>{e.preventDefault();const t=e.touches;
    if(Gs.two&&t.length>=2){const ay=(t[0].clientY+t[1].clientY)/2,pd=Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
      const dy=ay-Gs.ay; // swipe DOWN (dy>0) => zoom IN ; swipe UP => zoom OUT
      let f=Math.exp(-dy*0.007);const pr=Gs.pd/Math.max(1,pd);if(Math.abs(pr-1)>0.015&&Math.abs(pd-Gs.pd)>Math.abs(dy)*1.5)f*=pr; // optional pinch
      World.zoom(f);if(App.opener&&Math.abs(dy)>1)Opener.hit('zoom');Gs.ay=ay;Gs.pd=pd;if(Math.abs(dy)>1)showZoomHint(dy>0);}
    else if(t.length===1&&!Gs.two)moveSingle(t[0].clientX,t[0].clientY);},{passive:false});
  cv.addEventListener('touchend',e=>{e.preventDefault();if(e.touches.length===0){if(Gs.two){Gs.two=false;return;}endSingle();}},{passive:false});
  cv.addEventListener('touchcancel',()=>{Gs.two=false;Gs.down=false;clearTimeout(Gs.hold);if(S.rally)endRally();});
  cv.addEventListener('mousedown',e=>{audioInit();startSingle(e.clientX,e.clientY);});
  window.addEventListener('mousemove',e=>{if(Gs.down)moveSingle(e.clientX,e.clientY);});
  window.addEventListener('mouseup',()=>endSingle());
  cv.addEventListener('wheel',e=>{e.preventDefault();if(App.opener)Opener.hit('zoom');World.zoom(Math.exp(e.deltaY*0.0012));},{passive:false});
}
let zhT=0;function showZoomHint(inn){const now=performance.now();if(now-zhT<600)return;zhT=now;const el=$('#v-'+View.cur+' .hint');if(el){el.innerHTML=inn?'🔍 <b>Zooming IN</b> (two-finger swipe down)':'🔭 <b>Zooming OUT</b> (two-finger swipe up)';clearTimeout(el._t);el._t=setTimeout(()=>App.refresh(),1500);}}
function tap(x,y){
  if(View.cur==='opener'){Opener.tap(x,y);return;}
  if(View.cur==='solar'){const id=World.pickTarget(x,y);if(id)selectTarget(id);return;}
  if(View.cur==='swarm'){const id=World.pickTarget(x,y,26);if(id){assignTo(id);return;}
    const p=World.pointOnFocusPlane(x,y);const sc=clamp(World.cam.dist*0.09,0.08,3);S.waypoint={pos:p.toArray(),groups:selGroups(),scale:sc,t0:performance.now(),reached:0};
    sfx('waypoint');World.burst(p,[0.3,0.95,1],18,sc*0.6);toast(`📍 Waypoint set — ${selGroups().map(g=>GROUPS[g].name).join(', ')} redirecting.`);App.refresh();}
}
function startRally(x,y){const p=World.pointOnFocusPlane(x,y);if(App.opener)Opener.hit('hold');S.rally={pos:p,groups:selGroups(),scale:clamp(World.cam.dist*0.09,0.08,3),age:0};S.waypoint=null;Coach.rallied=true;sfx('rally');navigator.vibrate&&navigator.vibrate(30);App.refresh();
  const b=$('#sw-banner');b.textContent='🟡 RALLY — drones gathering tightly. Release to resume.';}
function endRally(){S.rally=null;sfx('select');toast('Rally released — drones resume their assignments.');App.refresh();}
function selectTarget(id){
  const d=S.design;const locked=S.phase!=='plan';
  if(!d.targets.includes(id)){if(d.multi){d.targets.push(id);}else if(!locked){d.targets=[id];d.primary=id;}}
  if(!d.multi&&!locked){d.primary=id;}
  applyDesignToState();View.lock=id;const T=World.T[id];World.flyTo(T.pos,T.t.r*5,1.6,()=>World.T[View.lock].pos);World.cam.auto=0.06;sfx('lock');renderInfo(id);App.refresh();
  if(S.design.targets.length>1)concept('deltav');}
function assignTo(id){const d=S.design;const gs=selGroups();
  if(!d.targets.includes(id)){if(S.phase==='plan'||d.multi){if(!d.multi&&S.phase==='plan'){d.targets=[id];d.primary=id;}else d.targets.push(id);}else{toast('Switch to multi-target mode to send groups to a second asteroid.','y');return;}}
  if(!d.multi){d.primary=id;}
  gs.forEach(g=>{S.groups[g].target=id;if(S.groups[g].order==='return'||S.groups[g].order==='follow')S.groups[g].order='harvest';});
  S.waypoint=null;applyDesignToState();gs.forEach(g=>World.retarget(g));
  if(S.phase==='ops'&&d.physics==='real'){S.res.budget-=4*gs.length;S.stats.retargets++;concept('deltav');toast(`Retargeting costs delta-v: −$${4*gs.length}M (More Realistic model).`,'y');}
  sfx('lock');World.burst(World.T[id].pos,[1,0.8,0.3],30,TMAP[id].r*1.5);toast(`🎯 ${gs.map(g=>GROUPS[g].name).join(', ')} → <b>${TMAP[id].name}</b>`,'g');log(`${gs.map(g=>GROUPS[g].name).join(', ')} assigned to ${TMAP[id].name}.`);
  swarmCam(false);App.refresh();}
// ---------- target labels ----------
const Labels={};
function buildLabels(){['solar','swarm'].forEach(v=>{const ov=$('#lab-'+v);Labels[v]=TARGETS.map(t=>{const b=document.createElement('button');b.className='tlabel';b.dataset.act=v==='solar'?'pickT':'assignT';b.dataset.id=t.id;ov.appendChild(b);return b;});});}
const _o={};
function updateLabels(){const v=View.cur;if(v!=='solar'&&v!=='swarm')return;const d=S.design;
  Labels[v].forEach((b,k)=>{const t=TARGETS[k];World.project(World.T[t.id].pos,_o);
    const show=_o.vis&&(v==='solar'||d.targets.includes(t.id)||World.cam.dist<30);b.style.display=show?'flex':'none';if(!show)return;
    b.style.transform=`translate(${_o.x}px,${_o.y}px) translate(-50%,-150%)`;
    const sel=d.targets.includes(t.id),prim=d.primary===t.id;const cls='tlabel'+(sel?' sel':'')+(prim?' prim':'');if(b.className!==cls)b.className=cls;
    const dots=GKEYS.filter(g=>World.groupTarget(g)===t.id&&sel).map(g=>`<i class="gd" style="background:${GROUPS[g].col}"></i>`).join('');const mf=S.mfac[t.id].online?'⛽':'';
    const h=`${prim?'★ ':sel?'✓ ':''}${t.name}${mf}${dots}`;if(b._h!==h){b.innerHTML=h;b._h=h;}});}
// ---------- solar info card ----------
function sensor(id){const r=activeRef(id),t=TMAP[id];const rn=mulberry(Math.floor(S.day)+id.length*13);const Teq=278*Math.pow(1-(r.albedo||0.1),0.25)/Math.sqrt(r.a);
  return{temp:Teq+(rn()-0.5)*4,ice:clamp(t.ice*100+(rn()-0.5)*6,0,100),metal:clamp(t.metal*100+(rn()-0.5)*6,0,100),reg:+(0.5+rn()*3+(t.r>0.4?2:0)).toFixed(1)};}
function renderInfo(id){const el=$('#infocard');if(!id){el.style.display='none';return;}const t=TMAP[id],r=activeRef(id),sn=sensor(id),ss=Continuum.siteScore(id);const d=S.design;
  const kind=r.kind==='sim'?'b-sim':r.kind==='live'?'b-cy':'b-imp';const sel=d.targets.includes(id);
  el.style.display='block';el.innerHTML=`<div class="row" style="justify-content:space-between"><h3>${t.name}</h3><button class="ib" data-act="closeInfo" style="width:34px;height:34px">✕</button></div>
  <div style="font-size:11px;color:var(--dim)">${esc(r.full||t.name)} · ${esc(r.spec||t.type)} · a ${fmt(r.a,2)} AU · D ${fmt(r.D,r.D<5?2:0)} km</div><div class="badge ${kind}" style="display:inline-block;margin:3px 0">${esc(r.src)}</div>
  <details><summary style="cursor:pointer;color:var(--cyan);font-size:12px;margin:4px 0">About · orbit data · sensors ▾</summary><p style="margin:6px 0">${t.blurb}</p>
  
  <div class="kv"><span>Semi-major axis a</span><b>${fmt(r.a,3)} AU</b><span>Eccentricity e</span><b>${fmt(r.e,3)}</b><span>Inclination i</span><b>${fmt(r.i,2)}°</b><span>Orbital period</span><b>${fmt(r.per)} d (${fmt(r.per/365.25,2)} yr)</b><span>Diameter</span><b>${fmt(r.D,r.D<5?2:0)} km</b><span>Albedo</span><b>${r.albedo??'—'}</b><span>Rotation</span><b>${fmt(r.rot,2)} h</b>${r.density?`<span>Density</span><b>${fmt(r.density,2)} g/cm³</b>`:''}</div>
  <div class="badge b-sim" style="display:inline-block">SIMULATED SENSOR · not a measurement</div>
  <div class="kv"><span>Surface temp (Teq model)</span><b>${fmt(sn.temp)} K</b><span>Water-ice signal</span><b>${fmt(sn.ice)}%</b><span>Metal signal</span><b>${fmt(sn.metal)}%</b><span>Regolith depth</span><b>${sn.reg} m</b></div>
  </details><div class="lbl">Waystation site score (game model)</div><div class="bar"><i style="width:${ss.s*100}%"></i></div>
  <div style="font-size:11.5px;color:var(--dim);margin:3px 0">Propellant potential ${fmt(ss.fuel*100)}% · metals ${fmt(ss.parts*100)}% · sunlight ${fmt(ss.sun*100)}% of Earth · arrival Δv ≈ ${fmt(ss.dv,1)} km/s</div>
  <div style="font-size:12px;margin:4px 0">Visited: ${t.visited}. ${(MISSIONS[id]||[]).map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join(' · ')}</div>
  <div class="row" style="margin-top:6px">${S.phase==='plan'?`<button class="btn y" data-act="setPrimary" data-id="${id}">★ Primary</button>`:''}${d.multi||S.phase==='plan'?`<button class="btn" data-act="toggleTarget" data-id="${id}">${sel?'− Remove':'+ Add target'}</button>`:''}${S.phase==='ops'&&!S.mfac[id].online?`<button class="btn g" data-act="seed" data-id="${id}">🌱 Seed waystation</button>`:''}</div>
  ${d.multi&&sel?`<div class="lbl" style="margin-top:6px">Assign a group here</div><div class="row">${GKEYS.map(g=>`<button class="chip ${S.groups[g].target===id?'on':''}" style="color:${GROUPS[g].col}" data-act="assignG" data-g="${g}" data-id="${id}"><span class="dot"></span>${GROUPS[g].name}</button>`).join('')}</div>`:''}`;}
