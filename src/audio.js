'use strict';
// ---------- WebAudio synth SFX (no files) ----------
const AUD={sfxVol:+(localStorage.getItem('abmc_svol')??1),sfxG:null,ctx:null,muted:localStorage.getItem('abmc_mute')==='1',master:null,mine:null,thr:null,amb:null};
function audioInit(){
  if(AUD.ctx){if(AUD.ctx.state==='suspended')AUD.ctx.resume();return;}try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;AUD.ctx=new C();
  AUD.master=AUD.ctx.createGain();AUD.master.gain.value=AUD.muted?0:0.55;AUD.master.connect(AUD.ctx.destination);
  AUD.sfxG=AUD.ctx.createGain();AUD.sfxG.gain.value=AUD.sfxVol;AUD.sfxG.connect(AUD.master);Music.init();
  }catch(e){AUD.ctx=null;}
}
function setMute(m){AUD.muted=m;localStorage.setItem('abmc_mute',m?'1':'0');if(AUD.master)AUD.master.gain.value=m?0:0.55;$$('.mute').forEach(b=>{b.textContent=m?'🔇':'🔊';b.classList.toggle('on',m);});}
function tone(f,dur,type='sine',vol=0.2,slide=0,delay=0){const c=AUD.ctx;if(!c||AUD.muted)return;const t=c.currentTime+delay;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(AUD.sfxG);o.start(t);o.stop(t+dur+0.05);}
function noise(dur,vol=0.2,fq=800,delay=0,q=1){const c=AUD.ctx;if(!c||AUD.muted)return;const t=c.currentTime+delay;const b=c.createBuffer(1,c.sampleRate*dur,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(fq,t);f.Q.value=q;f.frequency.exponentialRampToValueAtTime(fq*0.3,t+dur);const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(AUD.sfxG);s.start(t);}
function sfx(n){if(!AUD.ctx||AUD.muted)return;switch(n){
 case'tap':tone(880,0.06,'square',0.05);break;
 case'open':tone(440,0.08,'triangle',0.12);tone(880,0.12,'triangle',0.1,0,0.06);break;
 case'back':tone(660,0.08,'triangle',0.1);tone(330,0.12,'triangle',0.08,0,0.06);break;
 case'select':tone(523,0.09,'sine',0.15);tone(784,0.14,'sine',0.13,0,0.07);break;
 case'lock':tone(1200,0.05,'square',0.06);tone(1600,0.05,'square',0.06,0,0.08);tone(2000,0.12,'sine',0.08,0,0.16);break;
 case'waypoint':tone(990,0.1,'sine',0.12,-300);break;
 case'rally':tone(220,0.5,'sawtooth',0.08,220);noise(0.4,0.06,1200);break;
 case'whoosh':noise(0.8,0.25,2400,0,0.7);break;
 case'launch':noise(2.5,0.45,600,0,0.5);tone(60,2.2,'sawtooth',0.18,-30);tone(440,0.2,'square',0.06,440,0.1);break;
 case'alert':tone(740,0.14,'square',0.1);tone(740,0.14,'square',0.1,0,0.22);tone(560,0.2,'square',0.1,0,0.44);break;
 case'success':[523,659,784,1047].forEach((f,i)=>tone(f,0.25,'triangle',0.13,0,i*0.1));break;
 case'fail':[392,330,262].forEach((f,i)=>tone(f,0.35,'sawtooth',0.08,0,i*0.18));break;
 case'build':tone(300,0.1,'square',0.08);tone(450,0.1,'square',0.08,0,0.1);tone(900,0.3,'triangle',0.12,0,0.2);break;
 case'deliver':tone(1318,0.07,'sine',0.06);break;
 case'bump':noise(0.25,0.3,300);tone(90,0.2,'sine',0.25,-40);break;
 case'boom':noise(0.6,0.3,500);break;
}}
function loopSound(key,on,freq=180){const c=AUD.ctx;if(!c)return;if(on&&!AUD[key]&&!AUD.muted){const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type=key==='mine'?'sawtooth':'triangle';o.frequency.value=freq;f.type='lowpass';f.frequency.value=key==='mine'?1400:500;g.gain.value=key==='mine'?0.05:0.06;
  const l=c.createOscillator(),lg=c.createGain();l.frequency.value=key==='mine'?28:7;lg.gain.value=key==='mine'?40:15;l.connect(lg);lg.connect(o.frequency);l.start();o.connect(f);f.connect(g);g.connect(AUD.sfxG);o.start();AUD[key]={o,g,l};}
  else if(!on&&AUD[key]){const x=AUD[key];x.g.gain.setTargetAtTime(0,c.currentTime,0.05);setTimeout(()=>{try{x.o.stop();x.l.stop();}catch(e){}},200);AUD[key]=null;}}
function setSfxVol(v){AUD.sfxVol=v;localStorage.setItem('abmc_svol',v);if(AUD.sfxG)AUD.sfxG.gain.value=v;}
