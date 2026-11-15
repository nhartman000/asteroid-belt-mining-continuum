'use strict';
// ---------- random events & team decisions ----------
const EVENTS = [
 {id:'blackout',w:3,title:'Solar conjunction: comms blackout',
  text:()=>`The Sun is passing between Earth and the fleet. Radio signals can’t get through for about ${S.design.systems.relay?8:18} days. Data will pile up in storage${S.design.systems.ai?'; your AI core keeps drones working':' and drones without an AI core slow down'}.`,
  start:()=>{const days=S.design.systems.relay?8:18;mod('blackout',1,days,'Comms blackout');World.shake();},
  opts:[
   {l:'Store data & wait it out',d:'No extra cost. Storage may overflow if scouts keep collecting.',ax:{deadline:0,risk:0,power:1,yield:-1},fx:()=>{}},
   {l:'Pause scouting during blackout',d:'Scouts hold position: less data collected, nothing lost to overflow.',ax:{deadline:-1,risk:1,power:1,yield:0},fx:()=>{mod('data',0.3,14,'Scouting paused');}},
   {l:'Boost transmitter through the glare',d:'Burns power to squeeze some data out (+ some comms, −battery).',ax:{deadline:1,risk:0,power:-1,yield:1},fx:()=>{S.mods=S.mods.filter(x=>x.key!=='blackout');mod('blackout',1,6,'Partial blackout');S.res.battery=Math.max(0,S.res.battery-35);}}]},
 {id:'fault',w:3,title:'Equipment fault: mining rig wear',
  text:()=>'Fine dust is grinding the mining drills. Output is dropping.',
  start:()=>{mod('mine',0.65,40,'Worn drills');},
  opts:[
   {l:'Repair now',d:'Spend $15M and pause mining ~5 days, then full speed.',ax:{deadline:-1,risk:1,power:0,yield:1},fx:()=>{S.res.budget-=15;S.mods=S.mods.filter(x=>x.label!=='Worn drills');mod('mine',0,5,'Repairing drills');}},
   {l:'Run degraded',d:'Keep going at −35% mining for ~40 days. No cost.',ax:{deadline:1,risk:0,power:1,yield:-1},fx:()=>{}},
   {l:'Cannibalize 3 factory drones for parts',d:'Instant fix, but you lose 3 factory drones.',ax:{deadline:1,risk:-1,power:0,yield:1},fx:()=>{S.mods=S.mods.filter(x=>x.label!=='Worn drills');for(let i=0;i<3;i++)World.loseDrone('factory');}}]},
 {id:'deadline',w:2,title:'Mission control moves the deadline',
  text:()=>'A launch-window change on Earth means operations must end 30 days earlier.',
  start:()=>{S.deadline=Math.max(opsDay()+20,S.deadline-30);},
  opts:[
   {l:'Push harder',d:'Overdrive drones: +25% mining & data for 30 days, but more power use and risk.',ax:{deadline:1,risk:-1,power:-1,yield:1},fx:()=>{mod('mine',1.25,30,'Overdrive');mod('data',1.25,30,'Overdrive');mod('power',0.8,30,'Overdrive load');mod('riskRate',1.8,30,'Overdrive');}},
   {l:'Request an extension',d:'Costs $35M of budget to win back 25 days.',ax:{deadline:1,risk:0,power:0,yield:0},fx:()=>{S.res.budget-=35;S.deadline+=25;}},
   {l:'Accept the shorter mission',d:'No extra cost or risk; you simply have less time.',ax:{deadline:-1,risk:1,power:1,yield:0},fx:()=>{}}]},
 {id:'debris',w:2,title:'Debris stream detected',
  text:()=>'Sensors (simulated) show a cloud of small debris crossing the operating area.',
  start:()=>{World.shake();},
  opts:[
   {l:'Retreat to high orbit for 15 days',d:'Safer, but mining and mapping slow down.',ax:{deadline:-1,risk:1,power:0,yield:-1},fx:()=>{mod('mine',0.5,15,'High-orbit retreat');mod('data',0.6,15,'High-orbit retreat');}},
   {l:'Hold position',d:'Keep working. Risk jumps +12%.',ax:{deadline:1,risk:-1,power:0,yield:1},fx:()=>{S.res.risk+=12;}},
   {l:'Disperse the swarm',d:'Spread out: more mapping, a bit more risk, comms strain.',ax:{deadline:0,risk:0,power:0,yield:1},fx:()=>{S.res.risk+=5;mod('data',1.3,15,'Dispersed swarm');mod('comms',0.8,15,'Dispersed swarm');}}]},
 {id:'dust',w:2,title:'Power dip: dust on solar arrays',
  text:()=>'Charged dust is clinging to the arrays. Power generation falls 40% for ~25 days.',
  start:()=>{mod('power',0.6,25,'Dusty arrays');},
  opts:[
   {l:'Shut down scouts',d:'Saves power; less data.',ax:{deadline:0,risk:0,power:1,yield:-1},fx:()=>{mod('data',0.5,25,'Scouts off');S.res.battery=Math.min(100,S.res.battery+20);}},
   {l:'Throttle mining',d:'Saves power; less ore.',ax:{deadline:-1,risk:0,power:1,yield:-1},fx:()=>{mod('mine',0.6,25,'Mining throttled');S.res.battery=Math.min(100,S.res.battery+25);}},
   {l:'Run on batteries',d:'Keep everything on and hope it clears.',ax:{deadline:1,risk:-1,power:-1,yield:1},fx:()=>{S.res.risk+=4;}}]},
 {id:'vein',w:2,title:'Rich deposit spotted',
  text:()=>'Scans (simulated) suggest a rich vein near the target. Do you chase it?',
  start:()=>{},
  opts:[
   {l:'Divert all miners',d:'+60% mining for 25 days, data collection drops.',ax:{deadline:1,risk:0,power:-1,yield:1},fx:()=>{mod('mine',1.6,25,'Rich vein');mod('data',0.6,25,'Miners diverted');}},
   {l:'Send scouts to confirm first',d:'+40% data for 20 days, small mining boost later.',ax:{deadline:-1,risk:1,power:0,yield:1},fx:()=>{mod('data',1.4,20,'Confirming vein');mod('mine',1.2,40,'Confirmed vein');}},
   {l:'Stick to the plan',d:'No change; avoids distraction.',ax:{deadline:0,risk:1,power:1,yield:-1},fx:()=>{}}]}];
const ARRIVAL={id:'arrival',title:'Arrival: choose how close to operate',
  text:()=>`You’ve reached ${TMAP[S.design.primary].name}. Your plan says ${ALTS[S.design.altitude].name} orbit. Lower = better mining & mapping but more risk and station-keeping power.`,
  start:()=>{concept('altitude');},
  opts:[
   {l:'Go low & aggressive',d:'Switch to low orbit: +mining, +mapping, +risk, +power use.',ax:{deadline:1,risk:-1,power:-1,yield:1},fx:()=>{S.design.altitude=1;S.res.risk+=6;S.m=computeMetrics(S.design);}},
   {l:'Keep the planned orbit',d:'Stay the course.',ax:{deadline:0,risk:0,power:0,yield:0},fx:()=>{}},
   {l:'Go high & safe',d:'Switch to high orbit: −risk, less power, slower mining & mapping.',ax:{deadline:-1,risk:1,power:1,yield:-1},fx:()=>{S.design.altitude=3;S.res.risk=Math.max(0,S.res.risk-6);S.m=computeMetrics(S.design);}}]};

function randomEvent(cruise){if(App.opener||App.tour)return;
  const pool=cruise?EVENTS.filter(e=>e.id==='blackout'||e.id==='dust'):EVENTS;
  let tot=pool.reduce((a,e)=>a+e.w,0),r=R()()*tot,ev=pool[0];for(const e of pool){r-=e.w;if(r<=0){ev=e;break;}}
  if(S._decision||S._pendDec)return;
  S.evCount++;ev.start();log(`⚠ ${ev.title}`,'bad');sfx('alert');
  const tile=$('#tiles .tile[data-v="status"]');tile&&tile.classList.add('alerting');
  openDecision(ev);
}
function arrivalDecision(){if(S.phase==='ops')openDecision(ARRIVAL);}

// players for the current team
function players(){return S.team.mode==='solo'?[{name:'You',roles:RKEYS}]:S.team.players;}
function roleOwner(r){return players().findIndex(p=>p.roles.includes(r));}
function openDecision(ev){if(App.opener||App.tour)return;
  if($('#modal').classList.contains('show')&&$('#mbox').querySelector('[data-act^="sv"],#svren,#svcode')){S._pendDec=ev;return;} // don't pop over the Saved games screen; show it when that closes
  S._pendDec=null;
  S._decision={ev,votes:{},t0:performance.now(),viewer:0};
  if(S.team.mode!=='solo')concept('teamwork');
  renderDecision();
}
function renderDecision(){
  const D=S._decision;if(!D)return;const ev=D.ev,ps=players(),solo=S.team.mode==='solo';
  const axChip=(k,v)=>`<span class="ax ${v>0?'p':v<0?'n':'z'}">${AXN[k]} ${v>0?'▲':v<0?'▼':'•'}</span>`;
  const viewer=ps[D.viewer];
  let h=`<h2>⚠ ${esc(ev.title)}</h2><p>${ev.text()}</p>`;
  if(!solo){
    h+=`<div class="lbl">Pass the device · each player reviews their priority & votes</div><div class="hscroll">`+ps.map((p,i)=>`<button class="chip ${i===D.viewer?'on':''}" data-act="decView" data-i="${i}">${D.votes[i]!=null?'✔ ':''}${esc(p.name)} ${p.roles.map(r=>ROLES[r].icon).join('')}</button>`).join('')+`</div>`;
    h+=`<div class="card" style="margin:8px 0"><b style="color:var(--gold)">${esc(viewer.name)}</b> — ${viewer.roles.map(r=>`<div style="font-size:13px;margin-top:3px"><span style="color:${ROLES[r].col}">${ROLES[r].icon} ${ROLES[r].name}:</span> ${ROLES[r].pri} <i style="color:var(--dim)">(watch ${AXN[ROLES[r].axis]})</i></div>`).join('')}</div>`;
  } else h+=`<p style="font-size:12px;color:var(--dim)">Solo mode: you hold all four roles. There’s no single right answer — each option trades one priority for another.</p>`;
  h+=ev.opts.map((o,i)=>{const vs=Object.entries(D.votes).filter(([,v])=>v===i).map(([pi])=>`<span class="vd" style="background:${ROLES[ps[pi].roles[0]].col}">${esc(ps[pi].name)}</span>`).join('');
    const helps=solo?'':viewer.roles.map(r=>o.ax[ROLES[r].axis]>0?`<span class="ax p">helps your ${ROLES[r].short}</span>`:o.ax[ROLES[r].axis]<0?`<span class="ax n">hurts your ${ROLES[r].short}</span>`:'').join('');
    return `<div class="opt" style="margin-bottom:8px"><b>${esc(o.l)}</b><small>${esc(o.d)}</small><div>${Object.entries(o.ax).map(([k,v])=>axChip(k,v)).join('')}${helps}</div><div class="votes">${vs}</div>
    <div class="row" style="margin-top:6px">${solo?`<button class="btn g" data-act="decCommit" data-o="${i}">Choose this</button>`:`<button class="btn" data-act="decVote" data-o="${i}">Vote as ${esc(viewer.name)}</button>`}</div></div>`;}).join('');
  if(!solo){const nv=Object.keys(D.votes).length;const cmdI=roleOwner('cmd');
    const tally=ev.opts.map((_,i)=>Object.values(D.votes).filter(v=>v===i).length);const lead=tally.indexOf(Math.max(...tally));
    h+=`<div class="row" style="justify-content:space-between"><span class="lbl">${nv}/${ps.length} voted · commander: ${esc(ps[cmdI].name)}</span><button class="btn g big" data-act="decCommit" data-o="${D.votes[cmdI]!=null?D.votes[cmdI]:lead}" ${nv?'':'disabled'}>★ Commit team decision</button></div>
    <p style="font-size:12px;color:var(--dim)">Coordination score = agreement + how many role priorities the choice respects + how quickly you decide. It affects drone efficiency and the final report.</p>`;}
  showModal(h,true);
}
function commitDecision(oi){
  const D=S._decision;if(!D)return;const ev=D.ev,o=ev.opts[oi],ps=players(),solo=S.team.mode==='solo';
  const secs=(performance.now()-D.t0)/1000;
  o.fx();
  let rec={day:Math.round(opsDay()),phase:S.phase,title:ev.title,choice:o.l,desc:o.d,ax:o.ax,secs:Math.round(secs)};
  if(!solo){const votes=Object.values(D.votes);const agree=votes.length?votes.filter(v=>v===oi).length/ps.length:0;
    const respected=RKEYS.filter(r=>o.ax[ROLES[r].axis]>=0).length/4;const timely=clamp(1-(secs-25)/90,0.3,1);
    const score=0.45*agree+0.3*respected+0.25*timely;rec={...rec,agree,respected,timely,score,votes:{...D.votes}};S.coord.push(rec);}
  S.decisions.push(rec);
  const hurt=Object.entries(o.ax).filter(([,v])=>v<0).map(([k])=>AXN[k]).join(', ')||'nothing major';
  const help=Object.entries(o.ax).filter(([,v])=>v>0).map(([k])=>AXN[k]).join(', ')||'nothing major';
  log(`🤝 Decision: “${o.l}” — helps ${help}; costs ${hurt}.`,'');
  toast(`<b>Decision committed:</b> ${esc(o.l)}. Helps ${help}; costs ${hurt}.${solo?'':` Coordination ${fmt(rec.score*100)}%.`}`,'g');
  sfx('select');S._decision=null;hideModal();
  $('#tiles .tile[data-v="status"]')?.classList.remove('alerting');
}

// ---------- end + report ----------
function endMission(reason){if(App.opener)return;
  if(S.phase==='ended')return;S.phase='ended';S.endReason=reason;S.report=buildReport();
  sfx(S.report.success?'success':'fail');log(`🏁 Mission ended (${reason}). Score ${S.report.score}.`,S.report.success?'good':'bad');
  if(S.team.mode==='compete'){const tname=S.team.teams[S.team.cur]||'Team';S.team.results[S.team.cur]={team:tname,score:S.report.score,grade:S.report.grade,cargo:S.stats.delivered,data:S.res.dataDown,budget:S.res.budget,risk:S.res.risk,coord:S.report.coordAvg};}
  go('status');setTimeout(()=>{const el=$('#report');el&&el.scrollIntoView({behavior:'smooth'});},300);
}
function buildReport(){
  const d=S.design,m=S.m,sc=SCENARIOS[d.scenario];const g=goalProgress();
  const comp=g.length?g.reduce((a,x)=>a+x.p,0)/g.length:0.5;
  const coordAvg=S.coord.length?S.coord.reduce((a,c)=>a+c.score,0)/S.coord.length:null;
  const eff=clamp(S.res.budget/m.budget,0,1)*0.5+clamp(1-S.res.risk/100,0,1)*0.5;
  let score=Math.round((comp*700+eff*150+(coordAvg==null?0.6:coordAvg)*150)*DIFFS[d.difficulty].score);
  if(S.endReason==='risk')score=Math.round(score*0.6);
  const grade=score>=900?'S':score>=760?'A':score>=600?'B':score>=420?'C':'D';
  const success=g.length?g.every(x=>x.p>=1)&&S.endReason!=='risk':true;
  const why=[],next=[],trade=[];
  const siteLeft=Object.values(S.res.site).reduce((a,b)=>a+b,0);
  const reasonTxt={deadline:'The operations deadline arrived.',budget:'The mission ran out of budget — operations had to stop.',risk:'Risk reached 100%: the fleet suffered too many failures to continue.',manual:'The team ended the mission.'}[S.endReason]||'';
  // causal explanations tied to decisions
  if(S.stats.powerDef>5){why.push(`⚡ Power ran out for ${fmt(S.stats.powerDef)} days, throttling drones. You generated ~${fmt(m.gen,1)} kW at ${m.reg} AU vs ~${fmt(m.demand,1)} kW demand${d.systems.arrays?'':' (no extra solar arrays)'}${d.region==='outer'?' — the outer belt gets the least sunlight':''}.`);next.push('Add extra solar arrays or batteries, stage in a region closer to the Sun, choose nuclear-electric, or fly fewer drones.');}
  if(siteLeft>8){why.push(`🚚 ${fmt(siteLeft,1)} t of mined ore was still sitting at the asteroid at the end. Only ${S.groups.flyback.n} flyback haulers were moving it — and the depot was ${d.region==='near'&&TMAP[d.primary].belt?'very far away':'some distance away'}.`);next.push('Move drones into the Flyback group (Fabrication) or stage the depot closer to your target.');concept('logistics');}
  if(S.stats.overflow>5){why.push(`📡 ${fmt(S.stats.overflow)} GB of data was lost because storage filled faster than the ${fmt(m.dataRate,2)} Mbps link could send it home.`);next.push(d.systems.hga?'Add a relay satellite, or pause scouting during blackouts.':'Pack the high-gain antenna — it more than doubles the data rate.');}
  if(S.stats.blackout>10)why.push(`🌑 Comms were blacked out for ${fmt(S.stats.blackout)} days${d.systems.relay?' (the relay satellite shortened this)':''}.`);
  if(S.res.risk>60||S.endReason==='risk'){why.push(`⚠ Risk climbed to ${fmt(S.res.risk)}% (${S.stats.lost} drones lost). ${ALTS[d.altitude].name} orbit${d.systems.shield?'':', no shielding'} and event choices added up.`);next.push('Try a higher orbit, the debris shield, or choosing safer options in team decisions.');}
  if(S.endReason==='budget'){why.push(`💰 Budget ran out on ops day ${fmt(opsDay())}. Hardware + launch cost $${fmt(m.cost)}M of $${fmt(m.budget)}M, leaving little for daily operations.`);next.push('Pick a cheaper rocket or propulsion, fewer drones, or skip costly systems you don’t need.');}
  const gd=g.find(x=>x.k==='data'&&x.p<1);if(gd){why.push(`🔬 Data fell short (${fmt(gd.val)} of ${gd.v} GB). Collected ${fmt(S.res.dataColl)} GB; the link rate (${fmt(m.dataRate,2)} Mbps, simulated) limited what reached Earth.`);next.push('Use the Scout order more, pack the spectrometer and high-gain antenna.');}
  const gc=g.find(x=>x.k==='coverage'&&x.p<1);if(gc){why.push(`🗺 Mapping reached ${fmt(gc.val)}% of the ${gc.v}% goal. Mapping comes mostly from drones on the Scout order.`);next.push('Switch a group to Scout early (Swarm Operations), or fly lower for sharper images.');}
  const gm=g.find(x=>(x.k==='mfac'||x.k==='mfacN')&&x.p<1);if(gm){why.push('🏭 Not enough mining factories were finished. Factory drones must stay at the asteroid to build.');next.push('Keep Miner Factory drones on Harvest at their asteroid and pack the fabrication kit.');}
  const gcar=g.find(x=>x.k==='cargo'&&x.p<1);if(gcar&&siteLeft<=8){why.push(`⛏ Only ${fmt(S.stats.delivered,1)} t delivered of ${gcar.v} t. Mining output was the bottleneck${d.systems.rigs?'':' (no mining rigs packed)'}.`);next.push('Pack mining rigs, add miners, or build a mining factory to double output.');}
  if(coordAvg!=null){why.push(`🤝 Team coordination averaged ${fmt(coordAvg*100)}% → drone efficiency ×${fmt(coordFactor(),2)}.`);if(coordAvg<0.6)next.push('Discuss before voting and commit faster: split votes and slow decisions lowered efficiency.');}
  if(!why.length)why.push('Systems stayed in balance: power, logistics, comms and risk never became the limiting factor.');
  // trade-off narrative (not right/wrong)
  const pr=PROPS[d.prop];trade.push(`${pr.name} propulsion: cruise took ${m.travel} days (simulated). ${d.prop==='chem'?'Fast, but propellant used up payload capacity.':d.prop==='ion'?'Slower than chemical, but it delivered more payload.':d.prop==='sail'?'No propellant needed, but the slowest option.':'Strong and sun-independent, but expensive and risky.'}`);
  trade.push(`${ALTS[d.altitude].name} orbit: mining ×${ALTS[d.altitude].mine}, image detail ×${ALTS[d.altitude].res}, risk +${ALTS[d.altitude].risk}%.`);
  trade.push(`${LVS[d.lv].name}: ${LVS[d.lv].cap} t capacity for $${LVS[d.lv].cost}M.`);
  trade.push(`Fleet mix: ${S.groups.miner.n} miners / ${S.groups.flyback.n} flyback / ${S.groups.factory.n} factory drones.`);
  if(!next.length)next.push(`Try ${DIFFS.commander.name} difficulty, a different scenario, or a leaner design to raise your score.`);
  return {score,grade,success,comp,coordAvg,reasonTxt,why,next,trade,goals:g,day:Math.round(opsDay()),scn:sc.name,diff:DIFFS[d.difficulty].name,
    res:{budgetStart:m.budget,budgetEnd:S.res.budget,delivered:S.stats.delivered,site:siteLeft,dataColl:S.res.dataColl,dataDown:S.res.dataDown,overflow:S.stats.overflow,powerDef:S.stats.powerDef,blackout:S.stats.blackout,lost:S.stats.lost,built:S.stats.built,peakRisk:S.stats.peakRisk,minedPOV:S.stats.minedPOV}};
}
