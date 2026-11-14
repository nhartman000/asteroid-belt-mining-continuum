'use strict';
// ---------- Original procedural soundtrack (WebAudio, no samples) ----------
// All melodies here are original compositions for this game (D Dorian / A Mixolydian, heroic minor-to-major lifts).
const mf=m=>440*Math.pow(2,(m-69)/12);
const TRACKS={
 // heroic fanfare build: Dm | Bb | C | D(major lift)
 title:{bpm:112,bars:4,chords:[[50,53,57],[46,50,53],[48,52,55],[50,54,57]],arp:'up16',bassPat:[0,4,8,12],hat:false,lead:'square',leadVol:0.075,padVol:0.05,
  lead2:[[0,62,3],[3,69,3],[6,67,2],[8,65,2],[10,67,2],[12,69,4],[16,70,4],[20,69,2],[22,67,2],[24,65,4],[28,62,4],[32,64,3],[35,67,3],[38,72,2],[40,71,2],[42,72,2],[44,74,4],[48,74,6],[54,78,2],[56,81,8]]},
 // calm exploration for design/console: Dm | G | Am | C (Dorian colour from the major IV)
 calm:{bpm:84,bars:4,chords:[[50,53,57,60],[43,47,50,55],[45,48,52,55],[48,52,55,59]],arp:'gentle8',bassPat:[0,8],hat:false,lead:'triangle',leadVol:0.07,padVol:0.055,
  lead2:[[0,69,4],[6,72,2],[8,74,6],[16,71,4],[20,74,2],[22,76,6],[32,72,4],[36,71,4],[40,69,8],[48,67,4],[52,69,2],[54,72,10]]},
 // energetic swarm/flight: A | G | D | A (Mixolydian I-bVII-IV-I)
 action:{bpm:132,bars:4,chords:[[45,49,52],[43,47,50],[50,54,57],[45,49,52]],arp:'up16',bassPat:[0,2,4,6,8,10,12,14],hat:true,lead:'square',leadVol:0.06,padVol:0.035,
  lead2:[[0,69,2],[2,69,1],[3,71,1],[4,73,2],[6,76,2],[8,74,4],[12,73,2],[14,71,2],[16,74,3],[19,71,3],[22,67,2],[24,69,6],[30,71,2],[32,74,2],[34,73,2],[36,74,2],[38,76,2],[40,78,4],[44,76,4],[48,73,4],[52,76,4],[56,81,6]]}};
const Music={on:false,vol:+(localStorage.getItem('abmc_mvol')??0.55),cur:null,want:null,voices:[],timer:null,noiseBuf:null,
 init(){const c=AUD.ctx;if(!c||this.bus)return;
  this.bus=c.createGain();this.bus.gain.value=this.vol;this.bus.connect(AUD.master);
  // spacey echo: two cross-fed delays through a lowpass (cheap pseudo-reverb + shimmer)
  this.fx=c.createGain();this.fx.gain.value=0.32;const d1=c.createDelay(1),d2=c.createDelay(1),fb1=c.createGain(),fb2=c.createGain(),lp=c.createBiquadFilter();
  d1.delayTime.value=0.27;d2.delayTime.value=0.41;fb1.gain.value=0.33;fb2.gain.value=0.3;lp.type='lowpass';lp.frequency.value=2600;
  this.fx.connect(d1);d1.connect(lp);lp.connect(d2);d2.connect(fb1);fb1.connect(d1);d2.connect(fb2);fb2.connect(this.bus);d1.connect(this.bus);
  const n=c.createBuffer(1,c.sampleRate*0.08,c.sampleRate),dd=n.getChannelData(0);for(let i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;this.noiseBuf=n;
  this.timer=setInterval(()=>this.tick(),90);if(this.want)this.scene(this.want);},
 setVol(v){this.vol=v;localStorage.setItem('abmc_mvol',v);if(this.bus)this.bus.gain.setTargetAtTime(v,AUD.ctx.currentTime,0.1);},
 scene(name){this.want=name;const c=AUD.ctx;if(!c||!this.bus)return;if(this.cur&&this.cur.name===name&&!this.cur.stopAt)return;const now=c.currentTime;
  if(this.cur){const o=this.cur;o.g.gain.cancelScheduledValues(now);o.g.gain.setValueAtTime(o.g.gain.value,now);o.g.gain.linearRampToValueAtTime(0.0001,now+1.6);o.stopAt=now+1.7;this.voices.push(o);}
  const g=c.createGain();g.gain.setValueAtTime(0.0001,now);g.gain.linearRampToValueAtTime(1,now+1.4);g.connect(this.bus);
  this.cur={name,def:TRACKS[name],g,step:0,next:now+0.08};},
 note(dest,f,t,dur,type,vol,att=0.01,send=0.5){const c=AUD.ctx;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(dest);if(send&&this.fx){const s=c.createGain();s.gain.value=send;g.connect(s);s.connect(this.fx);}o.start(t);o.stop(t+dur+0.05);},
 hat(dest,t,vol){const c=AUD.ctx;const s=c.createBufferSource();s.buffer=this.noiseBuf;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=7000;const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);s.connect(f);f.connect(g);g.connect(dest);s.start(t);},
 schedule(tr,until){const D=tr.def,sp=60/D.bpm/4,total=D.bars*16;
  while(tr.next<until){const st=tr.step%total,bar=Math.floor(st/16),inBar=st%16,t=tr.next,ch=D.chords[bar];
   if(inBar===0){ch.forEach(m=>{this.note(tr.g,mf(m+12),t,sp*16*1.05,'sawtooth',D.padVol*0.5,0.5,0.6);this.note(tr.g,mf(m+12)*1.004,t,sp*16*1.05,'triangle',D.padVol,0.6,0.4);});}
   if(D.bassPat.includes(inBar))this.note(tr.g,mf(ch[0]-12),t,sp*1.8,'triangle',0.16,0.005,0);
   if(D.arp==='up16'||(D.arp==='gentle8'&&inBar%2===0)){const tones=[...ch,ch[0]+12,ch[1]+12];const m=tones[(inBar/(D.arp==='gentle8'?2:1))%tones.length|0]+12;this.note(tr.g,mf(m),t,sp*0.9,'triangle',D.arp==='gentle8'?0.035:0.03,0.004,0.55);}
   if(D.hat&&inBar%2===1)this.hat(tr.g,t,0.03);
   for(const [s,m,l] of D.lead2){if(s===st){this.note(tr.g,mf(m),t,sp*l*0.95,D.lead,D.leadVol,0.01,0.55);if(D.lead==='square')this.note(tr.g,mf(m+12),t,sp*l*0.9,'triangle',D.leadVol*0.35,0.01,0.7);}}
   tr.step++;tr.next+=sp;}},
 tick(){const c=AUD.ctx;if(!c||c.state!=='running')return;const until=c.currentTime+0.35;
  if(this.cur)this.schedule(this.cur,until);this.voices=this.voices.filter(v=>{if(c.currentTime>v.stopAt){try{v.g.disconnect();}catch(e){}return false;}this.schedule(v,Math.min(until,v.stopAt));return true;});},
 // one-shots
 jingle(){const c=AUD.ctx;if(!c||!this.bus||AUD.muted)return;const t=c.currentTime+0.02;[67,71,74,79,83].forEach((m,i)=>this.note(this.bus,mf(m+12),t+i*0.07,0.5,'triangle',0.09,0.005,0.8));this.note(this.bus,mf(91),t+0.36,0.9,'sine',0.05,0.01,1);},
 sting(){const c=AUD.ctx;if(!c||!this.bus||AUD.muted)return;const t=c.currentTime+0.02;[[58,62,65],[60,64,67],[62,66,69,74]].forEach((ch,i)=>ch.forEach(m=>{this.note(this.bus,mf(m+12),t+i*0.32,i===2?1.8:0.3,'square',0.05,0.01,0.6);this.note(this.bus,mf(m),t+i*0.32,i===2?2:0.35,'sawtooth',0.03,0.02,0.4);}));this.note(this.bus,mf(38),t+0.64,1.8,'triangle',0.18,0.01,0);}
};
function musicForView(v){return v==='opener'?null:(v==='solar'||v==='swarm'||v==='pov')?'action':'calm';}
