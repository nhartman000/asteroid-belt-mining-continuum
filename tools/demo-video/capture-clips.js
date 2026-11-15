// Operation Cosmoform demo v2: clean real-gameplay clips (captions are composited later)
const {chromium}=require('playwright');const fs=require('fs');
const ONLY=process.argv[2];const OUT='/workspace/video2/frames/'+ONLY+'/';const FPS=30,DT=1000/FPS;
const OPENER=['title','launch','tap','hold','factory','zoom','expand','ship'].includes(ONLY);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const VW=405,VH=720;const ctx=await b.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:1080/405,isMobile:true,hasTouch:true});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.clock.install({time:new Date('2026-11-14T12:00:00')});
await p.addInitScript(o=>{if(o)localStorage.removeItem('abmc_opener');else localStorage.setItem('abmc_opener','1');localStorage.setItem('abmc_mute','1');localStorage.setItem('abmc_tips','0');},OPENER);
const cdp=await ctx.newCDPSession(p);const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i}))});
const ev=(f,a)=>p.evaluate(f,a);
await p.goto('http://localhost:8765/asteroid-belt-mining-continuum.html');
for(let i=0;i<100&&!(await ev(()=>window.__ABMC_READY));i++)await p.clock.runFor(100);
await p.clock.pauseAt((await ev(()=>Date.now()))+3000);
await ev(()=>{const st=document.createElement('style');st.textContent=`
.vt{position:fixed;z-index:998;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:4px solid #fff;background:rgba(62,240,255,.35);box-shadow:0 0 22px #3ef0ff;pointer-events:none;display:none}
body.vid .op-skip,body.vid .op-hint4b,body.vid .op-hint4,body.vid #op-cap,body.vid #op-prompt{display:none!important}
body.vid .op-gen{top:120px!important}
body.vnt #toasts{display:none!important}
body.vnh #op-hand{display:none!important}
#vend{position:fixed;inset:0;z-index:997;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;padding:24px;background:radial-gradient(circle at 50% 45%,rgba(2,6,16,.3),rgba(2,6,16,.85))}
#vend .t{font:900 46px/1.02 ui-monospace,Menlo,monospace;letter-spacing:.05em;background:linear-gradient(180deg,#fff,#7ff7ff 40%,#5dff8a 70%,#ffc640);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 16px rgba(62,240,255,.7))}
#vend .g{font:800 19px/1.3 ui-monospace,Menlo,monospace;color:#fff}
#vend .u{font:800 13.5px/1.3 ui-monospace,Menlo,monospace;color:#3ef0ff;word-break:break-all;padding:10px 12px;border:2px solid #3ef0ff;border-radius:12px;background:rgba(2,10,24,.8)}
#vend .n{font:800 15px ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#ffc640}
#vend .p{font:800 22px ui-monospace,Menlo,monospace;color:#5dff8a;text-shadow:0 0 12px #5dff8a}`;document.head.appendChild(st);
 for(let i=0;i<2;i++){const t=document.createElement('div');t.className='vt';t.id='vt'+i;document.body.appendChild(t);}
 const e=document.createElement('div');e.id='vend';e.innerHTML=`<div class="t">OPERATION<br>COSMOFORM</div><div class="g">Drones that build drones,<br>paving the path for humans.</div><div class="p">▶ PLAY FREE ON YOUR PHONE</div><div class="u">nhartman000.github.io/<br>asteroid-belt-mining-continuum-play/</div><div class="n">NASA SPACE APPS CHALLENGE</div>`;document.body.appendChild(e);
 document.body.classList.add('vid','vnt');
 window.__anim=dt=>{for(const a of document.getAnimations()){if(a.__v===undefined){a.__v=+(a.currentTime||0);}a.pause();a.__v+=dt;a.currentTime=a.__v;}};
 const R=World.renderer;const orig=R.render.bind(R);R.render=(s,c)=>{if(!window.__skip)orig(s,c);};});
const step=async(ms)=>{await p.clock.runFor(ms);await ev(d=>window.__anim(d),ms);};
const ff=async(cond,maxMs=30000,each)=>{await ev(()=>window.__skip=true);let t=0;while(t<maxMs&&!(await ev(cond))){if(each)await ev(each);await step(100);t+=100;}await ev(()=>window.__skip=false);await step(34);if(t>=maxMs)console.log('ff timeout',cond.toString());return t;};
const tch=(pts)=>ev(pts=>{for(let i=0;i<2;i++){const t=document.getElementById('vt'+i);const q=pts&&pts[i];if(!q)t.style.display='none';else{t.style.display='block';t.style.left=q[0]+'px';t.style.top=q[1]+'px';}}},pts);
const rec=async(secs,fn)=>{fs.mkdirSync(OUT,{recursive:true});const n=Math.round(secs*FPS);const t0=Date.now();
 for(let i=0;i<n;i++){if(fn)await fn(i,n);await step(DT);await p.screenshot({path:OUT+String(i).padStart(4,'0')+'.jpg',type:'jpeg',quality:92});}
 console.log('clip',ONLY,n,'frames',((Date.now()-t0)/1000).toFixed(0)+'s');};
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const dec=()=>{if(S._decision)commitDecision(0);hideModal();};
await step(500);
if(ONLY==='title'){await rec(3.0);}
else if(OPENER){await ev(()=>Opener.start());
 if(ONLY==='launch'){await ev(()=>document.body.classList.add('vnh'));await step(450);await rec(2.0);}
 if(ONLY==='tap'){await ff(()=>Opener.prompt&&Opener.prompt.k==='tap',8000);const x=VW*0.62,y=VH*0.42;
  await rec(1.5,async i=>{if(i===6){await tch([[x,y]]);await touch('touchStart',[[x,y]]);}if(i===9)await touch('touchEnd',[]);if(i===18)await tch(null);});}
 if(ONLY==='hold'){await ff(()=>Opener.prompt&&Opener.prompt.k==='hold',25000);const hx=VW*0.45,hy=VH*0.46;
  await rec(1.5,async i=>{if(i===2){await tch([[hx,hy]]);await touch('touchStart',[[hx,hy]]);}if(i>14&&i<44){const x=hx+Math.sin((i-14)/8)*40,y=hy+Math.cos((i-14)/9)*25-25;await tch([[x,y]]);await touch('touchMove',[[x,y]]);}});}
 if(ONLY==='factory'){await ev(()=>document.body.classList.add('vnh'));await ff(()=>document.querySelector('#op-cap').textContent.startsWith('LAND'),45000);await rec(4.0);}
 if(ONLY==='zoom'){await ff(()=>Opener.prompt&&Opener.prompt.k==='zoom',25000);await step(300);
  await rec(1.6,async i=>{const k=Math.min(1,Math.max(0,(i-4)/30));const a=[[150,250+k*220],[255,250+k*220]];if(i===4){await tch(a);await touch('touchStart',a);}else if(i>4&&i<=34){await tch(a);await touch('touchMove',a);}if(i===36){await touch('touchEnd',[]);await tch(null);}});}
 if(ONLY==='expand'){await ev(()=>document.body.classList.add('vnh'));await ff(()=>document.querySelector('#op-cap').textContent.startsWith('EXPAND'),40000);await rec(2.0);}
 if(ONLY==='ship'){await ev(()=>document.body.classList.add('vnh'));await ff(()=>document.querySelector('#op-cap').textContent.startsWith('WAYSTATION'),40000);await step(300);await rec(3.6);console.log('ship',await ev(()=>S.ship.status+' '+S.ship.refuels.length));}
}else{
 await ev(()=>hideModal());
 if(ONLY==='studio'){await ev(()=>{document.body.classList.remove('vnt');Studio.tab='design';go('studio');});await step(800);
  await ev(()=>{for(const id of ['frame+','power+','power+','+fab']){const e=document.querySelector(`#v-studio [data-act="stT"][data-id="${id}"]`);e&&e.click();}document.querySelectorAll('#toasts .toast').forEach(t=>t.remove());document.querySelector('#v-studio .panelbody').scrollTop=0;});
  await step(1200);await ev(()=>document.querySelectorAll('#toasts .toast').forEach(t=>t.remove()));
  const pb='#v-studio .panelbody';let y0=0,y1=0;
  const yTx=await ev(s=>{const pb=document.querySelector(s);const t=pb.querySelector('.tx');return t.getBoundingClientRect().top-pb.getBoundingClientRect().top+pb.scrollTop-170;},pb);
  await rec(3.6,async i=>{
   if(i>=22&&i<=40)await ev(([s,y])=>document.querySelector(s).scrollTop=y,[pb,yTx*ease((i-22)/18)]);
   if(i===44)await ev(s=>{const o=document.querySelector(s+' .tx.off');o&&o.click();},pb);
   if(i===56)await ev(s=>{const e=document.querySelector(s+' [data-act="stT"][data-id="+arms"]');e&&e.click();},pb);
   if(i===62)await ev(s=>{const e=document.querySelector(s+' [data-act="stT"][data-id="rad+"]');e&&e.click();},pb);
   if(i===66){y0=await ev(s=>document.querySelector(s).scrollTop,pb);y1=await ev(s=>{const pb=document.querySelector(s);const t=[...pb.querySelectorAll('.badge.b-imp')].find(x=>x.textContent.includes('narrowed'));return t.getBoundingClientRect().top-pb.getBoundingClientRect().top+pb.scrollTop-300;},pb);}
   if(i>=66&&i<=86)await ev(([s,y])=>document.querySelector(s).scrollTop=y,[pb,y0+(y1-y0)*ease((i-66)/20)]);});}
 if(ONLY==='mix'){await ev(()=>{Studio.autoAll();Studio.tab='mix';go('studio');});await step(800);await ev(()=>{document.querySelector('#v-studio .panelbody').scrollTop=0;});
  const keys=await ev(()=>[...document.querySelectorAll('#v-studio [data-inp^="mix_"]')].map(e=>e.dataset.inp));console.log('mix keys',keys.length);
  const setv=(k,v)=>ev(([k,v])=>{const e=document.querySelector(`#v-studio [data-inp="${k}"]`);if(!e)return;e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},[k,v]);
  const base=await ev(()=>Object.fromEntries([...document.querySelectorAll('#v-studio [data-inp^="mix_"]')].map(e=>[e.dataset.inp,+e.value])));
  await rec(4.0,async i=>{if(i%6===0&&i<100){const k=keys[(i/6)%Math.min(keys.length,6)|0];const e=base[k];await setv(k,Math.max(0,e+(((i/6)%2)?6:-4)));}
   if(i===60){const y=await ev(()=>{const pb=document.querySelector('#v-studio .panelbody');const t=pb.querySelector('[data-inp="terraN"]');return t?t.getBoundingClientRect().top-pb.getBoundingClientRect().top+pb.scrollTop-260:0;});globalThis._ty=y;}
   if(i>=60&&i<=80)await ev(([y,k])=>document.querySelector('#v-studio .panelbody').scrollTop=y*k,[globalThis._ty,(i-60)/20]);
   if(i===88)await setv('terraN',3);if(i===104)await setv('terraN',2);});}
 if(ONLY==='solar'){await ev(()=>go('solar'));await step(1400);await ev(()=>selectTarget('ceres'));await step(200);await rec(2.4);}
 if(ONLY==='panels'||ONLY==='he3'){await ev(()=>{startDemo();S.speed=8;});await ff(()=>S.phase==='ops'&&S.day-S.arriveDay>40,120000,dec);await ev(()=>{S.speed=1;hideModal();Coach.i=-1;Coach.show();});
  if(ONLY==='panels'){await ev(()=>go('status'));await step(1200);await rec(2.4);}
  else{await ev(()=>{if(S._decision)commitDecision(0);endMission('manual');hideModal();go('he3');});await step(2200);await rec(2.6,async i=>{if(i===12||i===34)await ev(k=>{const e=document.querySelector(`#v-he3 [data-act="he3Toggle"][data-id="${k}"]`);e&&e.click();},i===12?'moon':'jupiter');});}}
 if(ONLY==='end'){await ev(()=>{go('opener');['op-cap','op-gen','op-prompt','op-hand','op-end','op-title'].forEach(id=>document.getElementById(id).classList.remove('show'));World.flyTo(new THREE.Vector3(0,0,0),World.fitDist(30),0.01);World.cam.auto=0.12;World.cam.phi=1.1;document.getElementById('vend').style.display='flex';});await step(300);await rec(6.0);}
}
console.log('errors',errs.length?errs:'none');await b.close();})().catch(e=>{console.error('FAIL',e);process.exit(1);});
