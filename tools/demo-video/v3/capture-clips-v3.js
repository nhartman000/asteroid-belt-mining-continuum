// Operation Cosmoform demo v3: cinematic re-shoot. Each run records one clip as 1080x1920 JPEG frames.
const {chromium}=require('playwright');const fs=require('fs');
const ONLY=process.argv[2];const SECS=+process.argv[3]||3;const OUT='/workspace/video3/frames/'+ONLY+'/';const FPS=30,DT=1000/FPS;
const OPENER=['title','swarm','factory','ship'].includes(ONLY);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const VW=405,VH=720;const ctx=await b.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:1080/405,isMobile:true,hasTouch:true});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.clock.install({time:new Date('2026-11-15T12:00:00')});
await p.addInitScript(o=>{localStorage.clear();if(!o)localStorage.setItem('abmc_opener','1');localStorage.setItem('abmc_mute','1');localStorage.setItem('abmc_tips','0');},OPENER);
const ev=(f,a)=>p.evaluate(f,a);
await p.goto('http://localhost:8765/asteroid-belt-mining-continuum.html');
for(let i=0;i<100&&!(await ev(()=>window.__ABMC_READY));i++)await p.clock.runFor(100);
await p.clock.pauseAt((await ev(()=>Date.now()))+3000);
await ev(()=>{const st=document.createElement('style');st.textContent=`
body.vid .op-skip,body.vid .op-hint4b,body.vid .op-hint4,body.vid #op-cap,body.vid #op-prompt,body.vid #op-hand,body.vid .op-gen,body.vid #toasts,body.vid #coach{display:none!important}
body.clean #v-solar .topbar,body.clean #v-solar .bottom,body.clean #v-solar .side,body.clean #v-solar .hint,body.clean #lab-solar .tlabel,body.clean #infocard{display:none!important}
body.clean #v-deep .topbar,body.clean #v-deep .deeptop,body.clean #v-deep .side{display:none!important}
body.clean #v-deep .deepsheet{opacity:0!important;transform:translateY(130vh)!important;transition:none!important}
body.nodl #lab-deep .tlabel{display:none!important}
#vend{position:fixed;inset:0;z-index:997;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;padding:24px;background:radial-gradient(circle at 50% 45%,rgba(2,6,16,.25),rgba(2,6,16,.82))}
#vend .t{font:900 46px/1.02 ui-monospace,Menlo,monospace;letter-spacing:.05em;background:linear-gradient(180deg,#fff,#7ff7ff 40%,#5dff8a 70%,#ffc640);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 16px rgba(62,240,255,.7))}
#vend .g{font:800 18px/1.35 ui-monospace,Menlo,monospace;color:#fff}
#vend .u{font:800 13.5px/1.3 ui-monospace,Menlo,monospace;color:#3ef0ff;word-break:break-all;padding:10px 12px;border:2px solid #3ef0ff;border-radius:12px;background:rgba(2,10,24,.8)}
#vend .p{font:800 22px ui-monospace,Menlo,monospace;color:#5dff8a;text-shadow:0 0 12px #5dff8a}
#vend .n{position:absolute;bottom:26px;left:16px;right:16px;font:500 11px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#d8e2ee}`;document.head.appendChild(st);
 const e=document.createElement('div');e.id='vend';e.innerHTML=`<div class="t">OPERATION<br>COSMOFORM</div><div class="g">Drones that build drones.<br>Waystations from the belt<br>to the stars.</div><div class="p">▶ PLAY FREE ON YOUR PHONE</div><div class="u">nhartman000.github.io/<br>asteroid-belt-mining-continuum-play/</div><div class="n">NASA Space Apps Challenge entry · not affiliated with or endorsed by NASA</div>`;document.body.appendChild(e);
 document.body.classList.add('vid');
 window.__anim=dt=>{for(const a of document.getAnimations()){if(a.__v===undefined){a.__v=+(a.currentTime||0);}a.pause();a.__v+=dt;a.currentTime=a.__v;}};
 const R=World.renderer;const orig=R.render.bind(R);R.render=(s,c)=>{if(!window.__skip)orig(s,c);};
 const oc=World.camUpdate;World.camUpdate=function(dt){oc(dt);if(window.__dir){window.__dir(World.camera,window.__t||0);World.camera.updateProjectionMatrix();}};
 window.__E=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;window.__L=(a,b,k)=>a+(b-a)*k;window.__X=(a,b,k)=>Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*k);});
const step=async(ms)=>{await p.clock.runFor(ms);await ev(d=>window.__anim(d),ms);};
const ff=async(cond,maxMs=30000,each)=>{await ev(()=>window.__skip=true);let t=0;while(t<maxMs&&!(await ev(cond))){if(each)await ev(each);await step(100);t+=100;}await ev(()=>window.__skip=false);await step(34);if(t>=maxMs)console.log('ff timeout',cond.toString());return t;};
const rec=async(secs,fn)=>{fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});const n=Math.round(secs*FPS);const t0=Date.now();
 for(let i=0;i<n;i++){await ev(t=>window.__t=t,i/FPS);if(fn)await fn(i,n);await step(DT);await p.screenshot({path:OUT+String(i).padStart(4,'0')+'.jpg',type:'jpeg',quality:92});}
 console.log('clip',ONLY,n,'frames',((Date.now()-t0)/1000).toFixed(0)+'s');};
const dec=()=>{if(S._decision)commitDecision(0);hideModal();};
const deepSetup=async(targetYr)=>{await ev(()=>{hideModal();const D=Deep.st();D.sandbox=true;D.run=true;D.rate=1e4;});
 await ff(()=>Deep.chainDone(),20000);await ev(()=>{Deep.autoPick();Deep.launch();S.deep.rate=1000;});};
await step(500);
if(ONLY==='title'){await rec(SECS);}
else if(OPENER){await ev(()=>Opener.start());
 if(ONLY==='swarm'){await ff(()=>document.querySelector('#op-cap').textContent.startsWith('ARRIVE'),45000);await step(900);
  await ev(()=>{window.__dir=(c,t)=>{const k=__E(Math.min(1,t/2.4));const C=World.groupCentroid('all');const r=__X(14,1.9,k),a=0.9+0.35*t,h=__L(5,0.22,k);c.position.set(C.x+r*Math.cos(a),C.y+h,C.z+r*Math.sin(a));c.lookAt(C.x,C.y+__L(0,0.05,k),C.z);c.near=0.01;};});await rec(SECS);}
 if(ONLY==='factory'){await ff(()=>document.querySelector('#op-cap').textContent.startsWith('LAND'),45000);await step(600);
  await ev(()=>{window.__dir=(c,t)=>{const T=World.T.ceres;const P=T.pos,r0=T.t.r;const k=__E(Math.min(1,t/2.6));const r=__X(r0*1.25,r0*3.2,k),a=2.2+0.25*t;c.position.set(P.x+r*Math.cos(a),P.y+r*0.32,P.z+r*Math.sin(a));c.lookAt(P);c.near=0.01;};});await rec(SECS);}
 if(ONLY==='ship'){await ff(()=>document.querySelector('#op-cap').textContent.startsWith('REFUEL'),60000);await step(200);
  await ev(()=>{window.__dir=(c,t)=>{const s=World.ship.position;const a=-0.6+0.18*t,r=__L(2.4,3.6,Math.min(1,t/4));c.position.set(s.x+r*Math.cos(a),s.y-0.35+0.1*t,s.z+r*Math.sin(a));c.lookAt(s.x,s.y+0.25,s.z);c.near=0.01;};});await rec(SECS);console.log('ship',await ev(()=>S.ship.status));}
}else{
 await ev(()=>{hideModal();document.body.classList.add('clean');});
 if(ONLY==='flyA'){await ev(()=>{go('solar');World.cam.tw=null;World.cam.auto=0;});await step(300);
  await ev(()=>{const C=World.T.ceres.pos.clone();window.__dir=(c,t)=>{const k=__E(Math.min(1,t/1.7));const f=C.clone().multiplyScalar(1-k);const d=__X(16,1390,k),ph=__L(1.15,0.95,k),th=1.0+0.4*t;const v=new THREE.Vector3().setFromSphericalCoords(d,ph,th);c.position.copy(f).add(v);c.lookAt(f);c.near=Math.max(0.01,d*0.005);World.cam.dist=d;World.cam.focus.copy(f);World.cam.phi=ph;World.cam.theta=th;};});await rec(SECS);}
 if(ONLY==='flyB'||ONLY==='end'){await deepSetup();await ff(ONLY==='end'?()=>S.deep.yr>420000:()=>S.deep.yr>260000,60000,()=>{S.deep.rate=2e5;});await ev(()=>{S.deep.run=false;document.body.classList.add('nodl');Deep.enter(false);Deep.tw=null;});
  if(ONLY==='flyB')await ev(()=>{Deep.dist=0.004;window.__dir=(c,t)=>{const k=Math.min(1,t/2.3);Deep.dist=__X(0.004,150000,__E(k));World.cam.phi=__L(1.0,0.6,__E(k));World.cam.theta=0.5+0.35*t;};});
  else await ev(()=>{document.getElementById('vend').style.display='flex';Deep.dist=135000;window.__dir=(c,t)=>{Deep.dist=__L(135000,120000,Math.min(1,t/5));World.cam.phi=0.62;World.cam.theta=1.2+0.07*t;};});
  await step(200);await rec(SECS);}
 if(ONLY==='deepship'){await deepSetup();
  await ff(()=>Deep.shipTargets().some(s=>s.ly>8&&S.deep.yr>=S.deep.col[s.id].ready),60000);
  await ev(()=>{const t=Deep.shipTargets().filter(s=>s.ly>8).sort((a,b)=>a.ly-b.ly)[0];S.deep.sel=t.id;S.deep.rate=10;Deep.shipGo();Deep.enter(false);});
  await ff(()=>{const s=S.deep.ship;return s&&s.mode==='svc'&&s.i>0&&!s.waiting;},60000);
  await ev(()=>{S.deep.rate=0.5;Deep.lockShip=true;Deep.tw=null;Deep.dist=7;window.__dir=(c,t)=>{Deep.dist=__X(7,1.8,__E(Math.min(1,t/3.6)));World.cam.phi=__L(1.2,1.0,Math.min(1,t/3.4));World.cam.theta=0.4+0.12*t;};});
  await step(1500);console.log('labels',await ev(()=>{const l=Deep.shipL;return l?[l.style.display,l.style.transform,l.textContent.slice(0,60),getComputedStyle(document.getElementById('lab-deep')).display,document.querySelectorAll('#lab-deep>*').length]:'none';}));await rec(SECS);console.log('svc',await ev(()=>Deep.shipStatus()));}
}
console.log('errors',errs.length?errs:'none');await b.close();})().catch(e=>{console.error('FAIL',e);process.exit(1);});
