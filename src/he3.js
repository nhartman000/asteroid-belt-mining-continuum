'use strict';
// ---------- Post-game bonus: Helium-3 Engineering Round (FUTURE TECH) ----------
// Approximate literature values; scores are an illustrative teaching model, not a resource assessment.
const HE3_SITES=[
 {id:'moon',n:'Moon · mare regolith',ic:'🌕',kind:'Lunar regolith',a:1,aS:0.35,ab:'≈1–20 ppb by mass, highest in titanium-rich mare soils (Apollo samples). Implanted by the solar wind over billions of years.',
  eS:0.35,ex:'Heat soil to ~700 °C to release the gas: at ~10 ppb that is ~100 million tonnes of regolith per tonne of He-3.',dvx:5.9,dvn:'≈5.9 km/s from low Earth orbit to the lunar surface',pS:0.8,pw:'Full 1 AU sunlight, but 14-day lunar nights',ltxt:'1.3 s'},
 {id:'jupiter',n:'Jupiter · atmospheric scoop',ic:'🪐',kind:'Gas giant',a:5.2,aS:0.9,ab:'Galileo probe: ³He/⁴He ≈ 1.7×10⁻⁴; helium is ~24% of the mass → roughly tens of ppm He-3. Plentiful.',
  eS:0.05,ex:'A scoop must skim at ~42 km/s cloud-top orbital speed (escape 59.5 km/s) inside intense radiation belts.',orb:42,pS:0.15,pw:'~4% of Earth sunlight — needs nuclear power',ltxt:'~35–52 min'},
 {id:'saturn',n:'Saturn · atmospheric scoop',ic:'🪐',kind:'Gas giant',a:9.54,aS:0.75,ab:'Helium fraction lower and less certain than Jupiter’s; similar ³He/⁴He ratio assumed.',
  eS:0.25,ex:'Cloud-top orbital speed ~25 km/s (escape 35.5 km/s); milder radiation than Jupiter.',orb:25,pS:0.08,pw:'~1% of Earth sunlight — nuclear power',ltxt:'~70–90 min'},
 {id:'uranus',n:'Uranus · atmospheric scoop',ic:'🔵',kind:'Ice giant',a:19.2,aS:0.8,ab:'Helium ~15% by mass (estimated). Often proposed as the most practical gas-giant He-3 source.',
  eS:0.5,ex:'Cloud-top orbital speed ~15 km/s (escape 21.3 km/s) — the shallowest gravity well of the giants.',orb:15,pS:0.03,pw:'~0.3% of Earth sunlight — nuclear power',ltxt:'~2.7 h'},
 {id:'neptune',n:'Neptune · atmospheric scoop',ic:'🔵',kind:'Ice giant',a:30.1,aS:0.8,ab:'Similar to Uranus (estimated).',
  eS:0.45,ex:'Cloud-top orbital speed ~16.6 km/s (escape 23.5 km/s); extremely far.',orb:16.6,pS:0.02,pw:'~0.1% of Earth sunlight — nuclear power',ltxt:'~4.2 h'},
 {id:'ceres',n:'Ceres · regolith (asteroid)',ic:'☄',kind:'Asteroid',a:2.77,aS:0.02,ab:'Trace and poorly constrained: solar wind is ~8× weaker at 2.8 AU (1/r²) and small bodies hold little implanted gas. Effectively negligible.',
  eS:0.3,ex:'Same regolith heating as the Moon, for far less gas.',pS:0.13,pw:'~13% of Earth sunlight',ltxt:'~25–30 min'},
 {id:'psyche',n:'Psyche · metal asteroid',ic:'☄',kind:'Asteroid',a:2.92,aS:0.01,ab:'Metal-rich surface; no known He-3 reserve. Negligible.',eS:0.25,ex:'Little loose regolith to process.',pS:0.12,pw:'~12% of Earth sunlight',ltxt:'~25–30 min'},
 {id:'bennu',n:'Bennu · near-Earth asteroid',ic:'☄',kind:'Asteroid',a:1.13,aS:0.01,ab:'Tiny rubble pile (~0.5 km); negligible He-3.',eS:0.3,ex:'Very little material in total.',pS:0.78,pw:'~78% of Earth sunlight',ltxt:'~10 min'}];
const He3={objs:{},route:null,lines:null,labels:[],built:false,
 st(){return S.he3||(S.he3={linked:{},isp:20000});},
 unlocked(){return !!S.report;},
 pos(id){const W=World,V=THREE.Vector3;if(id==='moon')return W.planets.Earth.position.clone().add(new V(0.9,0.35,0.7));if(W.planets[id[0].toUpperCase()+id.slice(1)])return W.planets[id[0].toUpperCase()+id.slice(1)].position.clone();if(this.objs[id])return this.objs[id].position.clone();if(W.T[id])return W.T[id].pos.clone();return new V();},
 build(){if(this.built)return;this.built=true;const sc=World.scene;
  [['uranus',19.2,1.4,'#7fd8e8',35],['neptune',30.1,1.35,'#4a6cf0',-160]].forEach(([id,a,r,c,ang])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,20),new THREE.MeshStandardMaterial({color:c,roughness:0.8,emissive:c,emissiveIntensity:0.25}));if(World.planets[id[0].toUpperCase()+id.slice(1)])return;const R=a*AU,A=ang*Math.PI/180;m.position.set(R*Math.cos(A),0,-R*Math.sin(A));m.visible=false;sc.add(m);this.objs[id]=m;
   const g=new THREE.BufferGeometry().setFromPoints(Array.from({length:181},(_,i)=>{const t=i/180*Math.PI*2;return new THREE.Vector3(R*Math.cos(t),0,R*Math.sin(t));}));const o=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x335577,transparent:true,opacity:0.35}));o.visible=false;sc.add(o);this.objs[id+'_orb']=o;});
  
  this.lines=new THREE.Group();sc.add(this.lines);
  const ov=$('#lab-he3');this.labels=HE3_SITES.map(s=>{const b=document.createElement('button');b.className='tlabel he3l';b.dataset.act='he3Toggle';b.dataset.id=s.id;ov.appendChild(b);return b;});},
 show(on){this.build();['uranus','neptune','uranus_orb','neptune_orb'].forEach(k=>{if(this.objs[k])this.objs[k].visible=on;});this.lines.visible=on;if(on)this.redraw();},
 routePts(){const W=World;const ch=Continuum.built();return[W.launchPos.clone(),...ch.map(id=>W.T[id].pos.clone()),W.planets.Jupiter.position.clone().multiplyScalar(0.62)];},
 nearest(p){const R=this.routePts();let best=null,bd=1e9;for(let i=0;i<R.length-1;i++){const a=R[i],b=R[i+1];const ab=b.clone().sub(a);const t=clamp(p.clone().sub(a).dot(ab)/ab.lengthSq(),0,1);const q=a.clone().addScaledVector(ab,t);const d=q.distanceTo(p);if(d<bd){bd=d;best=q;}}return{q:best,d:bd};},
 score(s){const p=this.pos(s.id);const nr=this.nearest(p);const routeS=Math.exp(-nr.d/25);let dv=s.dvx;if(dv==null){const e=dvEstimate(s.a,0,1);dv=e.dep+e.arr+(s.orb||0);}const dvS=Math.exp(-dv/15);const lt=Math.sqrt(s.a*s.a+1)*8.317;const cS=Math.exp(-lt/60);
  const rest=0.3*s.eS+0.25*routeS+0.2*dvS+0.1*s.pS+0.15*cS;const total=Math.sqrt(s.aS)*rest;return{total,routeS,dvS,cS,dv,dist:nr.d/AU,near:nr.q,p};},
 redraw(){if(!this.lines)return;while(this.lines.children.length){const c=this.lines.children.pop();c.geometry.dispose();}
  const R=this.routePts();const rg=new THREE.BufferGeometry().setFromPoints(R);const rl=new THREE.Line(rg,new THREE.LineDashedMaterial({color:0xc58bff,dashSize:1.2,gapSize:0.6}));rl.computeLineDistances();this.lines.add(rl);
  const L=this.st().linked;HE3_SITES.forEach(s=>{if(!L[s.id])return;const sc=this.score(s);const g=new THREE.BufferGeometry().setFromPoints([sc.near,sc.p]);const col=sc.total>0.3?0x5dff8a:sc.total>0.15?0xffc640:0xff5470;const l=new THREE.Line(g,new THREE.LineDashedMaterial({color:col,dashSize:0.8,gapSize:0.4}));l.computeLineDistances();this.lines.add(l);});},
 toggle(id){if(!this.unlocked())return;const L=this.st().linked;L[id]=!L[id];if(!L[id])delete L[id];this.redraw();const s=HE3_SITES.find(x=>x.id===id);const sc=this.score(s);sfx(L[id]?'build':'back');
  if(L[id]){World.burst(sc.p,[0.77,0.55,1],40,0.6);if(s.kind==='Asteroid')toast(`💡 <b>${s.n}</b> scores poorly: asteroids hold almost no helium-3. The solar wind is weak out here and small bodies keep little implanted gas.`,'y');}
  App.refresh(true);},
 updLabels(){if(View.cur!=='he3'||!this.labels.length)return;const L=this.st().linked;const o={};const sh=document.querySelector('#v-he3 .he3sheet');const top=sh?sh.getBoundingClientRect().top:1e9;HE3_SITES.forEach((s,k)=>{const b=this.labels[k];World.project(this.pos(s.id),o);o.vis=o.vis&&o.y<top-6&&o.y>70;b.style.display=o.vis?'flex':'none';if(!o.vis)return;b.style.transform=`translate(${o.x}px,${o.y}px) translate(-50%,-150%)`;
  const sc=this.score(s);const h=`${L[s.id]?'🔗':'＋'} ${s.ic} ${s.n.split(' ·')[0]} <i class="sc" style="color:${sc.total>0.3?'var(--green)':sc.total>0.15?'var(--gold)':'var(--red)'}">${fmt(sc.total*100)}</i>`;if(b._h!==h){b.innerHTML=h;b._h=h;b.classList.toggle('on',!!L[s.id]);}});},
 calc(){const L=this.st().linked;const sel=HE3_SITES.filter(s=>L[s.id]);const sc=Continuum.shipCalc();const supply=clamp(sel.reduce((a,s)=>a+this.score(s).total,0)/0.45,0,1);
  const fuels=[SHIP.tank,...sc.stops.map(x=>x.fuel)];const seg=(isp,dry)=>fuels.reduce((a,f)=>a+isp*G0/1000*Math.log((dry+f)/dry),0);
  const chem=sc.total,ion=seg(3000,SHIP.dry+30),fusFull=seg(this.st().isp,SHIP.dry+80);const fus=supply*fusFull+(1-supply)*chem;
  const dests=[['Mars',1.52],['Ceres',2.77],['Jupiter',5.2],['Saturn',9.54],['Uranus',19.2],['Neptune',30.1]].map(([n,a])=>{const e=dvEstimate(a,0,1);return{n,need:e.dep+e.arr};});
  return{sel,supply,chem,ion,fus,fusFull,dests,stops:sc.stops.length};}
};
function renderHe3(){const el=$('#he3-body');if(!el)return;
 if(!He3.unlocked()){el.innerHTML=`<div class="card"><h4>⚛ Helium-3 Engineering Round · locked</h4><p>Finish a mission and read its debrief to unlock this bonus round. The main game runs on asteroid water ice; this round asks a future-tech “what if”.</p><button class="btn" data-act="back">◀ Console</button></div>`;return;}
 const st=He3.st(),c=He3.calc();const sorted=[...HE3_SITES].map(s=>[s,He3.score(s)]).sort((a,b)=>b[1].total-a[1].total);const L=st.linked;
 const bar=(v,col)=>`<div class="bar" style="height:5px"><i style="width:${clamp(v,0,1)*100}%;background:${col}"></i></div>`;
 el.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><span class="badge" style="border-color:#c58bff;color:#d9b3ff">FUTURE TECH · D-He3 fusion not yet demonstrated</span><span class="lbl">Tap sites on the map or below to link them to the crewed route (purple)</span></div>
 <div class="hscroll" style="margin-top:6px">${sorted.map(([s,x])=>`<button class="chip ${L[s.id]?'on':''}" data-act="he3Toggle" data-id="${s.id}">${L[s.id]?'🔗':'＋'} ${s.ic} ${s.n.split(' ·')[0]} · ${fmt(x.total*100)}</button>`).join('')}</div>
 ${c.sel.length?c.sel.map(s=>{const x=He3.score(s);return`<div class="card he3c"><h4>${s.ic} ${s.n} <span class="lbl">${s.kind}</span> <b style="float:right;color:${x.total>0.3?'var(--green)':x.total>0.15?'var(--gold)':'var(--red)'}">${fmt(x.total*100)}/100</b></h4>
  <div class="he3g"><span>He-3 abundance</span>${bar(s.aS,'#c58bff')}<span>Extraction ease</span>${bar(s.eS,'#ffc640')}<span>Near the route (${fmt(x.dist,1)} AU off)</span>${bar(x.routeS,'#3ef0ff')}<span>Δv access ≈ ${fmt(x.dv,1)} km/s</span>${bar(x.dvS,'#5dff8a')}<span>Power</span>${bar(s.pS,'#ffe08a')}<span>Comms (${s.ltxt} one-way)</span>${bar(x.cS,'#7fd8ff')}</div>
  <p style="font-size:12px;margin:6px 0 0"><b>Where:</b> ${s.ab}<br><b>Extraction:</b> ${s.ex}${s.dvn?'<br><b>Δv:</b> '+s.dvn:''}<br><b>Power:</b> ${s.pw}</p></div>`;}).join(''):'<div class="card"><p>No sites linked yet. Start with the one you think is best — then try an asteroid and see why it scores low.</p></div>'}
 <div class="card"><h4>Projected Δv for the Marauder’s Daughter · rocket equation <span class="badge b-sim">MODEL</span></h4>
  <div class="meter"><div class="mh"><span>Conceptual fusion exhaust Isp (literature range 10⁴–10⁵ s)</span><b>${fmt(st.isp)} s</b></div><input type="range" min="10000" max="100000" step="5000" value="${st.isp}" data-inp="he3isp"></div>
  <div class="meter"><div class="mh"><span>He-3 supply readiness from linked sites</span><b>${fmt(c.supply*100)}%</b></div>${bar(c.supply,'#c58bff')}</div>
  <table class="tb"><tr><th>Engine</th><th>Isp</th><th>Δv with your chain</th></tr>
   <tr><td>Chemical H₂/O₂ (ice propellant)</td><td>450 s</td><td>${fmt(c.chem,1)} km/s</td></tr>
   <tr><td>Solar-electric ion (water/ice propellant)</td><td>3,000 s</td><td>${fmt(c.ion,1)} km/s</td></tr>
   <tr><td>⚛ D-He3 fusion · FUTURE TECH</td><td>${fmt(st.isp)} s</td><td style="color:#d9b3ff">${fmt(c.fus,0)} km/s${c.supply<1?` <small>(fusion on ${fmt(c.supply*100)}% of burns)</small>`:''}</td></tr></table>
  <table class="tb" style="margin-top:6px"><tr><th>Destination (Hohmann Δv)</th><th>Chem</th><th>Ion</th><th>Fusion</th></tr>${c.dests.map(x=>`<tr><td>${x.n} · ${fmt(x.need,1)} km/s</td><td>${c.chem>=x.need?'✅':'❌'}</td><td>${c.ion>=x.need?'✅':'❌'}</td><td>${c.fus>=x.need?'✅':'❌'}</td></tr>`).join('')}</table>
  <p style="font-size:11.5px;color:var(--dim)">Δv = Isp·g₀·ln(wet/dry), summed over the tank plus each refuel at your ${c.stops} waystation${c.stops===1?'':'s'}; asteroid water is the reaction mass for all three. Assumed dry mass: 120 t (chemical), +30 t power plant (ion), +80 t reactor and radiators (fusion). High-Isp engines push gently, so trip time and power-to-mass limit them more than Δv; this table ignores that.</p></div>
 <div class="card"><h4>💡 Why helium-3, where it really is, and why it is still future tech</h4>
  <p><b>Why He-3:</b> fusing deuterium with helium-3 releases energy mostly as charged protons instead of neutrons. Less neutron radiation means less shielding and damage, and charged particles can in principle be steered by magnets straight into thrust or electricity.</p>
  <p><b>Where it is:</b> the Sun’s solar wind carries He-3. Earth’s magnetic field and atmosphere block it, so there is almost none here. The airless Moon has soaked it into its soil at parts-per-billion levels. Gas giants kept their original helium, so their atmospheres hold far more, but behind deep gravity wells. Asteroids are small and farther from the Sun, so they hold almost none.</p>
  <p><b>Why future tech:</b> D-He3 needs several times hotter plasma than deuterium–tritium fusion. No reactor has yet produced net power from D-He3. (D-T laser fusion reached target gain above 1 at NIF in 2022, but that is not a power plant.) Some D-D side reactions still make neutrons.</p>
  <p style="font-size:12px"><a href="https://en.wikipedia.org/wiki/Helium-3" target="_blank" rel="noopener">Helium-3 overview ↗</a> · <a href="https://lasers.llnl.gov/science/achieving-fusion-ignition" target="_blank" rel="noopener">LLNL: fusion ignition at NIF ↗</a> · <a href="https://ntrs.nasa.gov/citations/19940011955" target="_blank" rel="noopener">NASA NTRS: He-3 inventory of lunar samples ↗</a> · <a href="https://ntrs.nasa.gov/citations/20150006724" target="_blank" rel="noopener">NASA NTRS: lunar &amp; outer-planet resource utilization ↗</a></p></div>`;}
