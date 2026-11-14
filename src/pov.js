'use strict';
// ---------- First-person drone flight ----------
const PTYPES={scout:{name:'Scout',spd:0.55,acc:0.9,turn:2.0,hold:2,mine:0.25,pw:0.5,desc:'Fast & agile, tiny hold'},
              miner:{name:'Miner',spd:0.32,acc:0.5,turn:1.5,hold:6,mine:0.8,pw:0.9,desc:'Strong drill, medium hold'},
              hauler:{name:'Hauler',spd:0.2,acc:0.28,turn:0.9,hold:20,mine:0.35,pw:0.7,desc:'Slow, huge cargo hold'}};
const Pov={joy:{x:0,y:0},thrust:false,brake:false,mine:false,keys:{},near:null,lastHud:0,
 enter(){const P=World.player,d=S.design;const T=World.T[d.primary];
  if(!P.init||P.p.distanceTo(T.pos)>T.t.r*20+4){const rocks=World.rocks.filter(r=>r.tid===d.primary).sort((a,b)=>a.pos.distanceTo(T.pos)-b.pos.distanceTo(T.pos));const rk=rocks[Math.min(2,rocks.length-1)];
    const out=new V3().subVectors(rk.pos,T.pos).normalize();P.p.copy(rk.pos).addScaledVector(out,rk.size*3+0.05*Math.max(T.t.r,0.22)).add(new V3(0,rk.size*1.5,0));P.v.set(0,0,0);
    const look=new V3().subVectors(rk.pos,P.p).normalize();P.yaw=Math.atan2(-look.x,-look.z);P.pitch=Math.asin(clamp(look.y,-1,1));P.init=true;this.msg('Rock ahead — hold MINE');}
  World.dust.visible=true;this.renderTypes();concept('payload');},
 exit(){loopSound('mine',false);loopSound('thr',false);World.beam.visible=false;World.beamGlow.visible=false;},
 scale(){const P=World.player;let best=null,bd=1e9;for(const id in World.T){const T=World.T[id];const d=P.p.distanceTo(T.pos)-T.t.r;if(d<bd){bd=d;best=T;}}return{T:best,dist:bd};},
 frame(dt,t){const P=World.player,ty=PTYPES[S.pov.type],cam=World.camera,real=S.design.physics==='real';
  const {T,dist}=this.scale();const L=Math.max(T.t.r,0.22);
  // input
  let jx=this.joy.x,jy=this.joy.y;const k=this.keys;if(k.ArrowLeft||k.KeyA)jx=-1;if(k.ArrowRight||k.KeyD)jx=1;if(k.ArrowUp||k.KeyW)jy=-1;if(k.ArrowDown||k.KeyS)jy=1;
  const thr=(this.thrust||k.Space)&&S.pov.power>0,brk=this.brake||k.ShiftLeft||k.ShiftRight||k.KeyX,mine=(this.mine||k.KeyE||k.KeyF)&&S.pov.power>0;
  P.yaw-=jx*ty.turn*dt;P.pitch=clamp(P.pitch-jy*ty.turn*0.8*dt,-1.35,1.35);
  P.q.setFromEuler(new THREE.Euler(P.pitch,P.yaw,-jx*0.18,'YXZ'));
  const fwd=new V3(0,0,-1).applyQuaternion(P.q);
  if(thr){P.v.addScaledVector(fwd,ty.acc*L*dt);S.pov.power-=ty.pw*4*dt;}
  if(brk)P.v.multiplyScalar(Math.exp(-3*dt));
  if(!real)P.v.multiplyScalar(Math.exp(-0.6*dt));
  const vmax=ty.spd*L*(real?1.6:1);if(P.v.length()>vmax)P.v.setLength(vmax);
  P.p.addScaledVector(P.v,dt);
  // collisions: asteroid body + rocks
  const toT=new V3().subVectors(P.p,T.pos);const minR=T.t.r*1.04+0.004;if(toT.length()<minR){toT.setLength(minR);P.p.copy(T.pos).add(toT);const n=toT.normalize();const vn=P.v.dot(n);if(vn<0)P.v.addScaledVector(n,-1.6*vn);if(Math.abs(vn)>0.02*L){World.shake();sfx('bump');this.msg('⚠ IMPACT — careful!');}}
  // nearest mineable rock in front
  let best=null,bs=1e9;const range=0.07*L+0.02;
  for(const rk of World.rocks){if(rk.tid!==T.t.id)continue;const v=new V3().subVectors(rk.pos,P.p);const dd=v.length()-rk.size;
    if(dd<rk.size*0.9){v.setLength(rk.size*0.9+0.002);P.p.copy(rk.pos).sub(v);P.v.multiplyScalar(-0.3);}
    if(dd<range*2.5){const dot=v.normalize().dot(fwd);if(dot>0.55&&dd<bs){bs=dd;best={rk,dd};}}}
  const bodyD=dist;const bodyDir=new V3().subVectors(T.pos,P.p).normalize();if(bodyD<range*2.5&&bodyDir.dot(fwd)>0.6&&bodyD<bs){best={body:T,dd:bodyD};bs=bodyD;}
  this.near=best;const inRange=best&&best.dd<range;
  // mining
  const mineOn=mine&&inRange&&S.pov.hold<ty.hold;
  if(mineOn){const amt=ty.mine*dt*(S.design.systems.rigs?1.3:1);S.pov.hold=Math.min(ty.hold,S.pov.hold+amt);S.pov.power-=ty.pw*6*dt;
    const tp=best.rk?best.rk.pos.clone().addScaledVector(new V3().subVectors(P.p,best.rk.pos).normalize(),best.rk.size):P.p.clone().addScaledVector(bodyDir,bodyD);
    if(best.rk){best.rk.size=Math.max(best.rk.base*0.35,best.rk.size-best.rk.base*0.04*dt);if(best.rk.size<=best.rk.base*0.36&&!best.rk.dep){best.rk.dep=1;World.burst(tp,[1,0.7,0.3],40,0.05*L);sfx('boom');const r=best.rk;setTimeout(()=>{r.size=r.base;r.dep=0;},25000);}}
    const src=P.p.clone().addScaledVector(fwd,0.004).add(new V3(0,-0.003,0).applyQuaternion(P.q));const a=World.beam.geometry.attributes.position;a.setXYZ(0,src.x,src.y,src.z);a.setXYZ(1,tp.x,tp.y,tp.z);a.needsUpdate=true;
    World.beam.visible=true;World.beam.material.opacity=0.6+0.4*Math.random();World.beamGlow.visible=true;World.beamGlow.position.copy(tp);World.beamGlow.scale.setScalar(0.03*L*(0.8+Math.random()*0.5));
    if(Math.random()<0.7)World.spark(tp,[1,0.75,0.3],0.06*L,0.006);}
  else{World.beam.visible=false;World.beamGlow.visible=false;}
  loopSound('mine',mineOn,140);loopSound('thr',thr,70);
  if(mine&&!inRange&&Math.random()<dt*2)this.msg(best?'Move closer to mine':'No rock in range — aim at a rock');
  if(mine&&S.pov.hold>=ty.hold)this.msg('HOLD FULL — tap TRANSFER');
  S.pov.power=clamp(S.pov.power+dt*(thr||mineOn?0:6),0,100);
  // camera
  cam.position.copy(P.p);cam.quaternion.copy(P.q);const sp=P.v.length()/vmax;cam.fov=(innerWidth<innerHeight?64:54)+sp*8;cam.near=0.0015;cam.far=6000;cam.updateProjectionMatrix();
  if(World._shake>0){cam.position.x+=(Math.random()-0.5)*0.003*L;cam.position.y+=(Math.random()-0.5)*0.003*L;}
  // dust streaks
  const B=0.35*L,D=World.dustP,a=World.dust.geometry.attributes.position;const vv=P.v.clone().multiplyScalar(0.12);
  for(let i=0;i<D.length;i++){const p=D[i];if(p.lengthSq()===0||p.distanceTo(P.p)>B){p.copy(P.p).add(new V3((Math.random()-0.5)*2*B,(Math.random()-0.5)*2*B,(Math.random()-0.5)*2*B));if(P.v.lengthSq()>1e-8)p.addScaledVector(P.v.clone().normalize(),B*0.8);}
    a.setXYZ(i*2,p.x,p.y,p.z);a.setXYZ(i*2+1,p.x-vv.x-0.0004,p.y-vv.y,p.z-vv.z);}a.needsUpdate=true;World.dust.material.opacity=0.2+sp*0.6;
  // HUD (10 Hz)
  if(t-this.lastHud>0.1){this.lastHud=t;this.hud(T,dist,sp,vmax,inRange,best);}
 },
 msg(s){const el=$('#povmsg');el.textContent=s;clearTimeout(this._mt);this._mt=setTimeout(()=>el.textContent='',1400);},
 hud(T,dist,sp,vmax,inRange,best){const ty=PTYPES[S.pov.type];const kmU=activeRef(T.t.id).D/(2*T.t.r);const P=World.player;
  const spd=P.v.length()/Math.max(T.t.r,0.22)*40;const dd=Math.max(0,dist)*kmU;
  $('#pov-ro').innerHTML=`<div class="ro"><span>SPEED</span><b>${fmt(spd,1)}</b><span>m/s sim</span></div>
   <div class="ro"><span>POWER</span><b style="color:${S.pov.power<20?'var(--red)':'var(--green)'}">${fmt(S.pov.power)}%</b><div class="bar"><i class="${S.pov.power<20?'bad':''}" style="width:${S.pov.power}%"></i></div></div>
   <div class="ro"><span>HOLD</span><b style="color:var(--gold)">${fmt(S.pov.hold,1)}/${ty.hold} t</b><div class="bar"><i class="warn" style="width:${S.pov.hold/ty.hold*100}%"></i></div></div>
   <div class="ro"><span>${T.t.name.toUpperCase()}</span><b style="color:var(--cyan)">${dd<10?fmt(dd,2):fmt(dd)}</b><span>km</span></div>`;
  $('#xhair').classList.toggle('lock',!!inRange);const rm=$('#rockmark');
  if(best&&best.rk){const o=World.project(best.rk.pos,{});rm.style.display=o.vis?'block':'none';rm.style.left=o.x+'px';rm.style.top=o.y+'px';rm.style.borderColor=inRange?'var(--gold)':'var(--cyan)';}else rm.style.display='none';},
 renderTypes(){$('#pov-types').innerHTML=Object.entries(PTYPES).map(([k,v])=>`<button class="chip ${S.pov.type===k?'on':''}" data-act="povType" data-t="${k}" title="${v.desc}">${k==='scout'?'🛩':k==='miner'?'⛏':'📦'} ${v.name}</button>`).join('')+'<br>'+
   `<span class="badge ${S.phase==='plan'?'b-sim':'b-cy'}">${S.phase==='plan'?'PRE-LAUNCH TRAINING SIM':'LIVE MISSION (simulated)'}</span><div class="hint" style="width:100%">${PTYPES[S.pov.type].desc} · Stick steer · THRUST · MINE (hold, aim) · TRANSFER · keys WASD Space Shift E T 1-3</div>`;},
 transfer(){const h=S.pov.hold;if(h<=0)return this.msg('Hold is empty — mine a rock first');S.pov.hold=0;
  Coach.transferred=true;if(S.phase==='ops'){S.res.cargo+=h;S.stats.delivered+=h;S.stats.minedPOV+=h;toast(`📦 Transferred <b>${fmt(h,1)} t</b> to the depot via flyback relay. Shared cargo updated.`,'g');log(`Pilot transferred ${fmt(h,1)} t (${PTYPES[S.pov.type].name}).`);}
  else toast(`📦 ${fmt(h,1)} t transferred — <b>training run</b>, not counted until the mission is in operations.`,'y');
  sfx('success');World.burst(World.player.p,[0.3,1,0.6],30,0.02);}
};
function bindPov(){
  const joy=$('#joy'),knob=joy.querySelector('i');let jid=null;
  const setJ=(x,y)=>{const r=joy.getBoundingClientRect();let dx=(x-(r.left+r.width/2))/(r.width/2),dy=(y-(r.top+r.height/2))/(r.height/2);const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}Pov.joy.x=dx;Pov.joy.y=dy;knob.style.transform=`translate(${dx*42}px,${dy*42}px)`;};
  const rel=()=>{Pov.joy.x=Pov.joy.y=0;knob.style.transform='';jid=null;};
  joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(e.pointerId);setJ(e.clientX,e.clientY);audioInit();});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)setJ(e.clientX,e.clientY);});
  joy.addEventListener('pointerup',rel);joy.addEventListener('pointercancel',rel);
  const hold=(id,key)=>{const el=$(id);const on=e=>{e.preventDefault();Pov[key]=true;el.classList.add('act');audioInit();};const off=()=>{Pov[key]=false;el.classList.remove('act');};
    el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointerleave',off);el.addEventListener('pointercancel',off);};
  hold('#pb-thrust','thrust');hold('#pb-brake','brake');hold('#pb-mine','mine');
  $('#pb-xfer').addEventListener('pointerdown',e=>{e.preventDefault();Pov.transfer();$('#pb-xfer').classList.add('act');setTimeout(()=>$('#pb-xfer').classList.remove('act'),150);});
  window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;Pov.keys[e.code]=true;
    if(View.cur==='pov'){if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();if(e.code==='KeyT')Pov.transfer();if(e.code==='Digit1')setPovType('scout');if(e.code==='Digit2')setPovType('miner');if(e.code==='Digit3')setPovType('hauler');}
    if(View.cur==='swarm'){const m={KeyF:'follow',KeyC:'scout',KeyH:'harvest',KeyR:'return'};if(m[e.code])setOrder(m[e.code]);}
    if(e.code==='Escape'&&View.cur!=='console')go('console');});
  window.addEventListener('keyup',e=>{Pov.keys[e.code]=false;});
}
function setPovType(t){S.pov.type=t;S.pov.hold=Math.min(S.pov.hold,PTYPES[t].hold);Pov.renderTypes();sfx('select');Pov.msg(PTYPES[t].name.toUpperCase()+' — '+PTYPES[t].desc);}
