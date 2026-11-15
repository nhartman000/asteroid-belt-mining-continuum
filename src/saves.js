'use strict';
// ---------- Multi-slot saved games: up to 20 named slots + 1 autosave, stored in localStorage ----------
const SAVE_MAX=20,SAVE_IDX='abmc_saves_idx',SAVE_KEY=id=>'abmc_save_'+id;
const Saves={
 idx(){const l=LS.get(SAVE_IDX,[]);return Array.isArray(l)?l:[];},
 setIdx(l){return this.put(SAVE_IDX,l);},
 put(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}},
 read(id){return LS.get(SAVE_KEY(id),null);},
 migrate(){const ms=LS.get('abmc_mission',null);let n=0;
  if(ms&&ms.s){const id=this.newId();const meta=this.meta(ms.s,'Saved mission (from older version)');meta.when=Date.parse(ms.when)||Date.now();meta.id=id;
   if(this.put(SAVE_KEY(id),{v:2,s:ms.s,player:ms.player})){const l=this.idx();l.unshift(meta);if(this.setIdx(l)){try{localStorage.removeItem('abmc_mission');}catch(e){}n=1;}}}
  try{localStorage.setItem('abmc_saves_migrated','1');}catch(e){}return n;},
 newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);},
 snap(){const o={};for(const k in S){if(k.startsWith('_')||k==='rally')continue;o[k]=S[k];}o.waypoint=null;return{v:2,s:o,player:World.player.p.toArray()};},
 stage(s){const d=s.deep;if(d&&(d.probes&&d.probes.length||d.hubs&&d.hubs.jump))return'deep';if(d&&d.hubs&&Object.keys(d.hubs).length)return'outer';return'belt';},
 meta(s,name){const d=s.deep;const st=this.stage(s);const stats=[];
  stats.push((SCENARIOS[s.design&&s.design.scenario]||{name:'Mission'}).name);stats.push('phase '+s.phase);if(s.day)stats.push('day '+Math.round(s.day));if(s.stats&&s.stats.delivered)stats.push(fmt(s.stats.delivered,1)+' t delivered');if(s.report)stats.push('score '+s.report.score);
  if(d){if(d.yr)stats.push('+'+fmtYr(d.yr));const nc=d.col?Object.keys(d.col).length:0;if(nc)stats.push(nc+' star systems');}
  return{name:name||'Game',when:Date.now(),play:Math.round(s.playSec||0),stage:st,stats:stats.join(' · ')};},
 thumb(){try{const c=document.createElement('canvas');c.width=128;c.height=72;const g=World.renderer.domElement;World.frame(0,performance.now()/1000);const x=c.getContext('2d');const r=g.width/g.height,tr=128/72;let sw=g.width,sh=g.height,sx=0,sy=0;if(r>tr){sw=g.height*tr;sx=(g.width-sw)/2;}else{sh=g.width/tr;sy=(g.height-sh)/2;}x.drawImage(g,sx,sy,sw,sh,0,0,128,72);return c.toDataURL('image/jpeg',0.6);}catch(e){return'';}},
 full(){toast('💾 Device storage is full. Delete or export an old save, then try again.','r');},
 write(id,name,{auto=false,thumb=true}={}){const data=this.snap();const meta=this.meta(data.s,name);meta.id=id;if(auto)meta.auto=true;
  const l=this.idx();const old=l.find(x=>x.id===id);meta.thumb=thumb?this.thumb():(old&&old.thumb)||'';
  if(!this.put(SAVE_KEY(id),data)){if(!auto)this.full();return false;}
  const nl=l.filter(x=>x.id!==id);if(auto)nl.push(meta);else{const i=l.findIndex(x=>x.id===id);if(i>=0)nl.splice(Math.min(i,nl.length),0,meta);else nl.unshift(meta);}
  if(!this.setIdx(nl)){meta.thumb='';const nl2=nl.map(x=>x.id===id?meta:x);if(!this.setIdx(nl2)){if(!auto)this.full();return false;}}return true;},
 manual(){return this.idx().filter(x=>!x.auto);},
 saveNew(name){if(this.manual().length>=SAVE_MAX){toast(`All ${SAVE_MAX} slots are used — overwrite or delete one.`,'y');return false;}const id=this.newId();const ok=this.write(id,name||this.defName());if(ok)toast('💾 Saved as a new game.','g');return ok;},
 defName(){return `${(SCENARIOS[S.design.scenario]||{name:'Mission'}).name} · ${({belt:'Belt',outer:'Outer planets',deep:'Deep space'})[this.stage(S)]}`;},
 overwrite(id){const m=this.idx().find(x=>x.id===id);if(!m)return false;const ok=this.write(id,m.name);if(ok)toast(`💾 Overwrote “${esc(m.name)}”.`,'g');return ok;},
 autosave(){return this.write('auto','Autosave',{auto:true,thumb:false});},
 fixNames(s){if(s&&Array.isArray(s.log))s.log.forEach(l=>{if(l&&typeof l.msg==='string')l.msg=l.msg.replace(/Marauder’s Daughter|Marauder's Daughter/g,'Marauder');});if(s&&s.deep&&s.deep.crew&&!s.deep.ship)delete s.deep.crew;return s;},
 load(id){const d=this.read(id);if(!d||!d.s){toast('That save could not be read.','r');return false;}loadMission(d);return true;},
 rename(id,name){const l=this.idx();const m=l.find(x=>x.id===id);if(!m)return;m.name=(name||'').trim().slice(0,40)||m.name;this.setIdx(l);},
 del(id){try{localStorage.removeItem(SAVE_KEY(id));}catch(e){}this.setIdx(this.idx().filter(x=>x.id!==id));},
 dup(id){if(this.manual().length>=SAVE_MAX){toast(`All ${SAVE_MAX} slots are used.`,'y');return;}const d=this.read(id);const l=this.idx();const m=l.find(x=>x.id===id);if(!d||!m)return;const nid=this.newId();if(!this.put(SAVE_KEY(nid),d)){this.full();return;}const nm={...m,id:nid,auto:false,name:(m.name+' (copy)').slice(0,40),when:Date.now()};const i=l.indexOf(m);l.splice(m.auto?0:i,0,nm);if(!this.setIdx(l))this.full();},
 code(id){const d=this.read(id),m=this.idx().find(x=>x.id===id);return 'OCSAVE1:'+btoa(unescape(encodeURIComponent(JSON.stringify({game:'Operation Cosmoform',name:m?m.name:'Game',save:d}))));},
 exportFile(id){const m=this.idx().find(x=>x.id===id);const blob=new Blob([JSON.stringify({game:'Operation Cosmoform',name:m?m.name:'Game',save:this.read(id)})],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`operation-cosmoform-${(m?m.name:'save').replace(/[^\w-]+/g,'-').slice(0,40)}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);},
 importObj(o){const d=o&&o.save||o;if(!d||!d.s||!d.s.design)throw new Error('bad');if(this.manual().length>=SAVE_MAX){toast(`All ${SAVE_MAX} slots are used — delete one first.`,'y');return false;}const id=this.newId();if(!this.put(SAVE_KEY(id),d)){this.full();return false;}const meta=this.meta(d.s,((o&&o.name)||'Imported game').slice(0,34)+' (imported)');meta.id=id;meta.thumb='';const l=this.idx();l.unshift(meta);if(!this.setIdx(l)){this.full();return false;}toast('📥 Save imported.','g');return true;},
 importCode(c){return this.importObj(JSON.parse(decodeURIComponent(escape(atob(c.trim().replace(/^OCSAVE1:/,'')))))); }
};
function fmtPlay(sec){sec=Math.round(sec||0);const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?`${h} h ${m} min`:m?`${m} min`:`${sec} s`;}
const STAGE_BADGE={belt:['☄','Asteroid belt','b-imp'],outer:['🪐','Outer planets','b-sim'],deep:['🌌','Deep space','b-fut']};
function savesScreen(){const l=Saves.idx();const auto=l.find(x=>x.auto),man=l.filter(x=>!x.auto);
 const card=m=>{const b=STAGE_BADGE[m.stage]||STAGE_BADGE.belt;return`<div class="savecard" data-id="${m.id}">${m.thumb?`<img src="${m.thumb}" alt="">`:`<div class="noimg">${b[0]}</div>`}<div class="si"><b class="sn">${esc(m.name)}</b>${m.auto?' <span class="badge b-cy">AUTO</span>':''}
  <div class="dim">${new Date(m.when).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})} · played ${fmtPlay(m.play)}</div><div><span class="badge ${b[2]}">${b[0]} ${b[1]}</span></div><div class="dim st">${esc(m.stats||'')}</div></div>
  <div class="sa"><button class="btn g" data-act="svLoad" data-id="${m.id}">▶ Load</button>${m.auto?'':`<button class="btn" data-act="svOver" data-id="${m.id}">💾 Overwrite</button><button class="btn" data-act="svRename" data-id="${m.id}">✎ Rename</button>`}<button class="btn" data-act="svDup" data-id="${m.id}">📑 Duplicate</button><button class="btn" data-act="svExport" data-id="${m.id}">⬆ Export</button><span class="sp"></span><button class="btn r svdel" data-act="svDelAsk" data-id="${m.id}" aria-label="Delete ${esc(m.name)}">🗑 Delete</button></div></div>`;};
 showModal(`<h2>💾 Saved games</h2><p class="dim" style="font-size:12px">${man.length}/${SAVE_MAX} slots used, plus autosave. Saves stay on this device (browser storage), including deep-space progress.</p>
 <div class="row"><input type="text" id="svname" maxlength="40" placeholder="Name for a new save" value="${esc(Saves.defName())}" style="flex:1;min-width:150px"><button class="btn solid" data-act="svNew">💾 Save as new</button></div>
 <div class="row" style="margin-top:6px"><button class="btn y" data-act="svNewGame">✦ New game</button><button class="btn" data-act="svImport">📥 Import save</button><button class="btn" data-act="openDesigns">🧬 Designs & share codes</button></div>
 <div class="savelist">${auto?card(auto):''}${man.map(card).join('')||'<p class="dim">No saved games yet. Use “Save as new” above.</p>'}</div>`);}
function svConfirmDelete(id){const m=Saves.idx().find(x=>x.id===id);if(!m)return;showModal(`<h2>🗑 Delete save?</h2><p style="font-size:15px">Delete “<b>${esc(m.name)}</b>”? This can't be undone.</p><div class="row" style="margin-top:14px;justify-content:space-between"><button class="btn solid big" data-act="svList">Cancel</button><button class="btn r" data-act="svDelYes" data-id="${id}">Delete forever</button></div>`,true);}
function svRenameDlg(id){const m=Saves.idx().find(x=>x.id===id);if(!m)return;showModal(`<h2>✎ Rename save</h2><input type="text" id="svren" maxlength="40" value="${esc(m.name)}" style="width:100%"><div class="row" style="margin-top:12px"><button class="btn solid" data-act="svRenameOk" data-id="${id}">Save name</button><button class="btn" data-act="svList">Cancel</button></div>`,true);setTimeout(()=>{const i=$('#svren');i&&i.select();},50);}
function svImportDlg(){showModal(`<h2>📥 Import a save</h2><p class="dim" style="font-size:12px">Choose an exported .json file or paste a save code (starts with OCSAVE1:).</p><label class="btn">📂 Choose file<input type="file" id="svfile" accept=".json,application/json" style="display:none"></label><textarea id="svcode" placeholder="OCSAVE1:…" style="width:100%;min-height:80px;margin-top:8px"></textarea><div class="row" style="margin-top:8px"><button class="btn solid" data-act="svImportCode">Import code</button><button class="btn" data-act="svList">Back</button></div>`,true);
 const f=$('#svfile');f.addEventListener('change',()=>{const file=f.files[0];file&&file.text().then(t=>{try{if(Saves.importObj(JSON.parse(t)))savesScreen();}catch(e){toast('That file is not an Operation Cosmoform save.','r');}});});}
function svExportDlg(id){const m=Saves.idx().find(x=>x.id===id);showModal(`<h2>⬆ Export “${esc(m.name)}”</h2><div class="row"><button class="btn solid" data-act="svExportFile" data-id="${id}">⬇ Download .json file</button><button class="btn" data-act="svCopyCode">📋 Copy save code</button></div><textarea id="svcodeout" readonly style="width:100%;min-height:90px;margin-top:8px">${Saves.code(id)}</textarea><button class="btn" data-act="svList" style="margin-top:8px">◀ Back to saves</button>`);}
