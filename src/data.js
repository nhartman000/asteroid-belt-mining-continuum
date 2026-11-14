'use strict';
// ---------- Reference data (approximate public values; labeled as such in UI) ----------
const AU = 10; // scene units per AU
const SBDB = n => 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=' + encodeURIComponent(n);
const TARGETS = [
 {id:'ceres',name:'Ceres',a:2.77,e:0.076,i:10.6,D:939,rot:9.07,type:'C-type · dwarf planet',albedo:0.09,density:2.16,ang:28,r:0.9,col:[0.56,0.54,0.52],metal:0.05,ice:0.32,
  blurb:'Largest body in the belt and a dwarf planet. NASA’s Dawn spacecraft found bright salt deposits and evidence of water ice below the surface.',res:'Water ice, hydrated clays',visited:'Dawn orbiter (2015–2018)'},
 {id:'vesta',name:'Vesta',a:2.36,e:0.089,i:7.1,D:525,rot:5.34,type:'V-type (basaltic)',albedo:0.42,density:3.46,ang:72,r:0.62,col:[0.66,0.62,0.56],metal:0.18,ice:0.02,
  blurb:'A bright, rocky protoplanet with a huge south-pole impact basin. Its crust is volcanic basalt. Dawn orbited it in 2011–2012.',res:'Basalt, iron-rich rock',visited:'Dawn orbiter (2011–2012)'},
 {id:'pallas',name:'Pallas',a:2.77,e:0.23,i:34.8,D:512,rot:7.81,type:'B-type',albedo:0.16,density:2.9,ang:118,r:0.56,col:[0.5,0.52,0.56],metal:0.08,ice:0.12,
  blurb:'Big and steeply tilted: its orbit is inclined ~35°, so reaching it costs a lot of extra energy (delta-v).',res:'Hydrated silicates',visited:'Not yet visited'},
 {id:'psyche',name:'Psyche',a:2.92,e:0.13,i:3.1,D:222,rot:4.2,type:'M-type (metal-rich)',albedo:0.15,density:3.9,ang:-18,r:0.46,col:[0.62,0.6,0.58],metal:0.6,ice:0,
  blurb:'May be the exposed core of an early planet, rich in iron and nickel. NASA’s Psyche spacecraft launched in 2023 and is due to arrive in 2029.',res:'Iron-nickel metal',visited:'NASA Psyche (arrival ~2029)'},
 {id:'hygiea',name:'Hygiea',a:3.14,e:0.11,i:3.8,D:434,rot:13.8,type:'C-type',albedo:0.07,density:2.0,ang:160,r:0.52,col:[0.42,0.42,0.43],metal:0.04,ice:0.25,
  blurb:'Fourth-largest belt object, dark and carbon-rich, in the outer belt where sunlight is weaker.',res:'Carbon compounds, ice',visited:'Not yet visited'},
 {id:'eros',name:'Eros',a:1.46,e:0.22,i:10.8,D:16.8,rot:5.27,type:'S-type (stony)',albedo:0.25,density:2.67,ang:12,r:0.26,elong:2.1,col:[0.66,0.55,0.42],metal:0.15,ice:0,
  blurb:'Peanut-shaped near-Earth asteroid. NEAR Shoemaker orbited and then touched down on it in 2001.',res:'Silicates, some metal',visited:'NEAR Shoemaker (2000–2001)'},
 {id:'bennu',name:'Bennu',a:1.13,e:0.2,i:6.0,D:0.49,rot:4.3,type:'B-type (carbon-rich)',albedo:0.044,density:1.19,ang:-48,r:0.17,col:[0.36,0.35,0.35],metal:0.02,ice:0.06,
  blurb:'Small “rubble-pile” near-Earth asteroid. OSIRIS-REx collected a sample that landed on Earth in September 2023.',res:'Carbon, hydrated minerals',visited:'OSIRIS-REx (sample returned 2023)'},
 {id:'apophis',name:'Apophis',a:0.92,e:0.19,i:3.3,D:0.34,rot:30.6,type:'Sq-type (stony)',albedo:0.35,density:3.2,ang:48,r:0.16,elong:1.4,col:[0.6,0.55,0.48],metal:0.1,ice:0,
  blurb:'Near-Earth asteroid that will pass very close to Earth (safely) on 13 April 2029. OSIRIS-APEX plans to study it after the flyby.',res:'Stony silicates',visited:'OSIRIS-APEX (planned 2029)'},
];
TARGETS.forEach((t,k)=>{t.belt=t.a>2;t.link=SBDB(t.name);});
const TMAP = Object.fromEntries(TARGETS.map(t=>[t.id,t]));
const PLANETS = [
 {name:'Mercury',a:0.39,r:0.22,c:'#9b938a',ang:140},{name:'Venus',a:0.72,r:0.4,c:'#e6c98f',ang:250},
 {name:'Earth',a:1.0,r:0.45,c:'#3a7bd5',ang:0},{name:'Mars',a:1.52,r:0.32,c:'#c1440e',ang:205},
 {name:'Jupiter',a:5.2,r:2.2,c:'#d8b48a',ang:100},{name:'Saturn',a:9.5,r:1.9,c:'#e3cf9c',ang:-120,ring:true}];
const GROUPS = {
 miner:{name:'Miners',col:'#ffc640',rgb:[1,0.78,0.25],role:'Travel to asteroids and mine ore.'},
 flyback:{name:'Flyback',col:'#3ef0ff',rgb:[0.24,0.94,1],role:'Haul ore back and build/support drone factories.'},
 factory:{name:'Miner Factory',col:'#5dff8a',rgb:[0.36,1,0.54],role:'Establish mining factories on asteroids.'}};
const GKEYS = ['miner','flyback','factory'];
const ORDERS = {follow:'Follow your piloted lead drone',scout:'Spread out to explore & map',harvest:'Do the group’s main job',return:'Return to the depot'};
const REGIONS = {
 near:{name:'Near-Earth staging',au:1.1,desc:'Close to Earth: strong sunlight, fast comms, but far from main-belt targets.'},
 inner:{name:'Inner belt',au:2.2,desc:'Good sunlight and comms; closest belt staging point.'},
 middle:{name:'Middle belt',au:2.7,desc:'Balanced: near Ceres, Pallas and Psyche.'},
 outer:{name:'Outer belt',au:3.2,desc:'Near Hygiea. Sunlight is ~1/10 of Earth’s — solar power drops a lot.'}};
const LVS = {
 kestrel:{name:'Kestrel Light',cap:4,cost:70,rel:0.97,desc:'Small, cheap rocket. 4 t to Earth escape.'},
 condor:{name:'Condor Medium',cap:9,cost:120,rel:0.985,desc:'Workhorse rocket. 9 t to Earth escape.'},
 titan:{name:'Titan Heavy',cap:18,cost:210,rel:0.98,desc:'Heavy lifter. 18 t to Earth escape.'},
 colossus:{name:'Colossus Super-Heavy',cap:40,cost:380,rel:0.95,desc:'Huge, newer design: lots of mass, a bit riskier.'}};
const PROPS = {
 chem:{name:'Chemical',frac:0.55,tmult:1.0,pw:0,cost:20,risk:3,desc:'Fast big burns, but propellant eats payload.'},
 ion:{name:'Ion (solar-electric)',frac:0.8,tmult:1.35,pw:6,cost:60,risk:4,desc:'Very efficient, gentle thrust: slower, needs power.'},
 sail:{name:'Solar sail',frac:0.9,tmult:1.9,pw:0,cost:40,risk:8,desc:'No propellant at all; weak and slow, worse far from the Sun.'},
 nep:{name:'Nuclear-electric',frac:0.85,tmult:1.1,pw:-20,cost:180,risk:12,desc:'Reactor powers ion engines: strong & independent of sunlight, costly.'}};
const SYSTEMS = {
 hga:{name:'High-gain antenna',m:0.3,pw:1.5,cost:15,desc:'Doubles+ data rate; better comms margin.'},
 arrays:{name:'Extra solar arrays',m:0.4,pw:-14,cost:20,desc:'+14 kW at 1 AU (less farther out).'},
 spectro:{name:'Spectrometer suite',m:0.2,pw:0.8,cost:25,desc:'More science data per scan.'},
 rigs:{name:'Mining rigs',m:1.2,pw:2.5,cost:30,desc:'+60% ore mining rate.'},
 fab:{name:'Fabrication kit',m:1.0,pw:2,cost:35,desc:'Builds factories ~80% faster.'},
 shield:{name:'Radiation & debris shield',m:0.8,pw:0,cost:15,desc:'Lowers risk build-up.'},
 batt:{name:'Extra batteries',m:0.5,pw:0,cost:10,desc:'Doubles stored energy for power dips.'},
 ai:{name:'Autonomy AI core',m:0.1,pw:0.6,cost:20,desc:'Drones keep working during comms blackouts.'},
 relay:{name:'Relay satellite',m:0.3,pw:0.5,cost:18,desc:'Shortens comms blackouts; +comms margin.'}};
const OBJECTIVES = {
 survey:{name:'Science survey',desc:'Mapping & data count extra (+30% data).'},
 mine:{name:'Ore mining',desc:'Mining output counts extra (+15% ore).'},
 factory:{name:'Build factories',desc:'Factories build faster (+30%).'},
 sample:{name:'Sample return',desc:'Flyback deliveries are more efficient (+20%).'}};
const ALTS = {1:{name:'Low',mine:1.25,res:1.3,risk:12,pw:1.5,comms:-3},2:{name:'Medium',mine:1,res:1,risk:4,pw:0.6,comms:0},3:{name:'High',mine:0.8,res:0.75,risk:0,pw:0.2,comms:5}};
const DIFFS = {
 cadet:{name:'Cadet',budget:1.3,dead:1.2,ev:0.006,risk:0.7,score:0.8},
 specialist:{name:'Specialist',budget:1,dead:1,ev:0.013,risk:1,score:1},
 commander:{name:'Commander',budget:0.82,dead:0.88,ev:0.022,risk:1.35,score:1.3}};
const SCENARIOS = {
 psyche:{name:'Psyche Metal Survey',icon:'🛰',desc:'Map the metal-rich asteroid Psyche, downlink science data, and bring back metal samples.',primary:'psyche',targets:['psyche'],objective:'survey',region:'middle',deadline:280,budget:700,
  goals:[{k:'data',label:'Downlink science data',v:450,u:'GB'},{k:'coverage',label:'Map Psyche surface',v:80,u:'%',tid:'psyche'},{k:'cargo',label:'Deliver metal samples',v:25,u:'t'}]},
 ceres:{name:'Ceres Water-Ice Factory',icon:'💧',desc:'Set up a mining factory on Ceres and stockpile water ice at the depot.',primary:'ceres',targets:['ceres'],objective:'factory',region:'middle',deadline:320,budget:750,
  goals:[{k:'mfac',label:'Mining factory online at Ceres',v:1,u:'',tid:'ceres'},{k:'cargo',label:'Deliver water ice',v:140,u:'t'},{k:'dfac',label:'Drone factory online at depot',v:1,u:''}]},
 bennu:{name:'Bennu Sample Return',icon:'🧪',desc:'Map Bennu, collect carbon-rich material and haul it to the depot without taking big risks.',primary:'bennu',targets:['bennu'],objective:'sample',region:'near',deadline:240,budget:600,
  goals:[{k:'cargo',label:'Deliver samples',v:40,u:'t'},{k:'coverage',label:'Map Bennu',v:60,u:'%',tid:'bennu'},{k:'riskBelow',label:'Keep risk under 45%',v:45,u:'%'}]},
 apophis:{name:'Apophis Rapid Response',icon:'⚡',desc:'Apophis is approaching Earth. Get there fast and gather as much data as possible before the deadline.',primary:'apophis',targets:['apophis'],objective:'survey',region:'near',deadline:120,budget:520,
  goals:[{k:'data',label:'Downlink science data',v:170,u:'GB'},{k:'coverage',label:'Map Apophis',v:70,u:'%',tid:'apophis'}]},
 multi:{name:'Multi-Target Swarm Expansion',icon:'🐝',desc:'Spread the swarm across Vesta, Pallas and Hygiea, build two mining factories and a drone factory.',primary:'vesta',targets:['vesta','pallas','hygiea'],multi:true,objective:'mine',region:'middle',deadline:360,budget:950,
  goals:[{k:'mfacN',label:'Mining factories online',v:2,u:''},{k:'cargo',label:'Deliver ore',v:220,u:'t'},{k:'dfac',label:'Drone factory online',v:1,u:''}]},
 sandbox:{name:'Sandbox',icon:'🧰',desc:'No objectives, huge budget, no deadline. Experiment freely.',primary:'ceres',targets:['ceres'],objective:'mine',region:'middle',deadline:99999,budget:5000,goals:[]}};
const ROLES = {
 cmd:{name:'Mission Commander',short:'CMD',icon:'★',col:'#ffc640',axis:'deadline',pri:'Hit the objectives before the deadline.'},
 flight:{name:'Flight Operations',short:'FLT',icon:'✈',col:'#3ef0ff',axis:'risk',pri:'Keep the drones safe — keep risk low.'},
 eng:{name:'Engineering',short:'ENG',icon:'⚙',col:'#5dff8a',axis:'power',pri:'Protect power and equipment health.'},
 sci:{name:'Science & Resources',short:'SCI',icon:'🔬',col:'#ff5ad8',axis:'yield',pri:'Maximize data, comms and resource yield.'}};
const RKEYS = ['cmd','flight','eng','sci'];
const AXN = {deadline:'⏱ Schedule',risk:'⚠ Safety',power:'⚡ Power',yield:'📡 Data/Yield'};
const LINKS = [
 ['JPL Solar System Dynamics','https://ssd.jpl.nasa.gov/'],
 ['NASA: Asteroids overview','https://science.nasa.gov/solar-system/asteroids/'],
 ['JPL Small-Body Database lookup','https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html'],
 ['NASA Psyche mission','https://science.nasa.gov/mission/psyche/'],
 ['NASA OSIRIS-REx (Bennu)','https://science.nasa.gov/mission/osiris-rex/'],
 ['NASA Dawn (Ceres & Vesta)','https://science.nasa.gov/mission/dawn/'],
 ['NASA Basics of Space Flight','https://science.nasa.gov/learn/basics-of-space-flight/'],
 ['NASA Deep Space Network','https://www.nasa.gov/communicating-with-missions/dsn/']];
const CONCEPTS = {
 orbit:{t:'Orbits & travel time',x:'Spacecraft don’t fly straight lines — they ride orbits around the Sun. A common route (a Hohmann transfer) takes half an orbit, so targets farther from the Sun take much longer to reach. Efficient engines like ion drives usually take even longer, but save propellant.',l:'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/'},
 payload:{t:'Payload mass',x:'Every kilogram you launch needs propellant to push it. A rocket can only send so much mass toward the belt. More drones and tools = more capability, but only if the rocket can lift them.',l:'https://science.nasa.gov/learn/basics-of-space-flight/'},
 power:{t:'Power limits',x:'Solar panels make less power farther from the Sun — at 3 AU, sunlight is about 1/9 as strong as at Earth. If equipment needs more power than you make, batteries drain and machines must slow down.',l:'https://science.nasa.gov/learn/basics-of-space-flight/'},
 comms:{t:'Data rate & communications',x:'Data reaches Earth by radio. The farther away you are, the weaker the signal, so the data rate drops. Collect more than you can send and your storage fills up — extra data is lost.',l:'https://www.nasa.gov/communicating-with-missions/dsn/'},
 altitude:{t:'Orbital altitude',x:'Orbiting low gives sharper images and easier mining, but needs constant corrections and raises collision risk. A high orbit is safer and cheaper to hold, but you see less detail.',l:'https://science.nasa.gov/learn/basics-of-space-flight/chapter5-1/'},
 budget:{t:'Budget',x:'Rockets, instruments and every day of operations cost money. Running out of budget ends the mission, even if the hardware still works.',l:'https://science.nasa.gov/solar-system/asteroids/'},
 risk:{t:'Risk',x:'Risk is the chance that something goes wrong: a failed launch, a collision, a fault. Shields, safer orbits and careful flying lower it, but cost mass, money or time.',l:'https://science.nasa.gov/solar-system/asteroids/'},
 deltav:{t:'Delta-v (changing course)',x:'Every change of speed or direction costs propellant (“delta-v”). Changing targets mid-mission or reaching a steeply tilted orbit (like Pallas) costs extra.',l:'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/'},
 logistics:{t:'Logistics: miners vs haulers',x:'Mining ore is only half the job. If nobody hauls it back, it piles up at the asteroid. Balance miners with flyback haulers.',l:'https://science.nasa.gov/solar-system/asteroids/'},
 replication:{t:'Self-replication & its limits',x:'A factory that builds drones that build more factories grows exponentially: 1→2→4→8. But growth stops at the first bottleneck: raw material delivery, power, or parts that can’t be made locally (like computer chips, called “vitamins”). The fraction you can make locally is called closure.',l:'https://ntrs.nasa.gov/citations/19830007077'},
 isru:{t:'Using local resources (ISRU)',x:'In-situ resource utilization means making what you need where you are. Water ice can be split by electricity into hydrogen and oxygen — rocket propellant. Splitting water takes at least ~4.4 kWh per kg (theoretical minimum), so propellant plants need lots of power.',l:'https://www.nasa.gov/overview-in-situ-resource-utilization/'},
 refuel:{t:'Refueling & the rocket equation',x:'The rocket equation: Δv = exhaust speed × ln(full mass ÷ empty mass). Because of the logarithm, carrying more fuel gives diminishing returns — doubling Δv needs far more than double the propellant. Refueling along the way “resets” the equation at each stop.',l:'https://science.nasa.gov/learn/basics-of-space-flight/'},
 teamwork:{t:'Team trade-offs',x:'Real missions are run by teams with different priorities. There is rarely a single right answer — good teams discuss, agree, and decide quickly.',l:'https://science.nasa.gov/learn/basics-of-space-flight/'}};
// ---------- missions, stories, data sources ----------
const MISSIONS = {
 ceres:[['NASA Dawn mission','https://science.nasa.gov/mission/dawn/'],['NASA: Ceres','https://science.nasa.gov/dwarf-planets/ceres/']],
 vesta:[['NASA Dawn mission','https://science.nasa.gov/mission/dawn/']],
 pallas:[['JPL SBDB: Pallas',SBDB('Pallas')]],
 psyche:[['NASA Psyche mission','https://science.nasa.gov/mission/psyche/']],
 hygiea:[['JPL SBDB: Hygiea',SBDB('Hygiea')]],
 eros:[['NASA NEAR Shoemaker','https://science.nasa.gov/mission/near-shoemaker/']],
 bennu:[['NASA OSIRIS-REx','https://science.nasa.gov/mission/osiris-rex/']],
 apophis:[['NASA OSIRIS-APEX','https://science.nasa.gov/mission/osiris-apex/']]};
const STORY = {
 psyche:['2031. NASA’s Psyche orbiter has spent two years mapping a world that may be the exposed iron core of a shattered protoplanet.','Its open data — gravity, magnetic and spectral maps — point to metal-rich regions. Your continuum fleet is the next step: a swarm that can map at close range and bring back real metal samples.','Your job: plan a mission that can get there, see clearly, and send the data home.'],
 ceres:['Dawn’s open data revealed bright salt deposits in Occator Crater and signs of water ice beneath Ceres’ surface.','Water is the most valuable resource in deep space: it’s drinking water, air, and rocket propellant. A factory on Ceres could refuel the whole belt.','Your job: establish a mining factory and stockpile ice at the depot.'],
 bennu:['In 2023 OSIRIS-REx dropped a capsule into the Utah desert carrying rock and dust from Bennu — about 120 grams of pristine material from the early solar system.','Bennu turned out to be a loose rubble pile; the spacecraft’s sampling arm sank into the surface. Careful flying matters here.','Your job: map Bennu, collect material and haul it to the depot without taking big risks.'],
 apophis:['On 13 April 2029, Apophis will pass closer to Earth than many satellites — safely, but close enough to be seen by eye.','OSIRIS-APEX will study how Earth’s gravity shakes it. Planetary-defense science needs data fast.','Your job: a rapid-response swarm that maps Apophis and downlinks data before the window closes.'],
 multi:['The belt holds millions of bodies. JPL’s Small-Body Database tracks well over a million of them.','No single spacecraft can work them all — but a self-replicating swarm might.','Your job: spread the swarm across Vesta, Pallas and Hygiea, build factories and start the continuum.'],
 sandbox:['No deadline. No objectives. A huge budget.','Use this to test ideas: what happens with 150 drones in the outer belt on solar power? With chemical rockets in the realistic model?','Experiment freely — the debrief will still explain what happened.']};
const SOURCES = [
 ['JPL Small-Body Database API (orbital elements, physical parameters; bundled snapshot fetched 2026-11-14)','https://ssd-api.jpl.nasa.gov/doc/sbdb.html'],
 ['JPL Small-Body Database Lookup','https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html'],
 ['JPL Solar System Dynamics','https://ssd.jpl.nasa.gov/'],
 ['NASA Science: Asteroids','https://science.nasa.gov/solar-system/asteroids/'],
 ['NASA Dawn (Ceres, Vesta)','https://science.nasa.gov/mission/dawn/'],
 ['NASA Psyche','https://science.nasa.gov/mission/psyche/'],
 ['NASA OSIRIS-REx (Bennu)','https://science.nasa.gov/mission/osiris-rex/'],
 ['NASA OSIRIS-APEX (Apophis)','https://science.nasa.gov/mission/osiris-apex/'],
 ['NASA NEAR Shoemaker (Eros)','https://science.nasa.gov/mission/near-shoemaker/'],
 ['NASA Basics of Space Flight (orbits, Hohmann transfers, rocket equation)','https://science.nasa.gov/learn/basics-of-space-flight/'],
 ['NASA Deep Space Network (communications)','https://www.nasa.gov/communicating-with-missions/dsn/']];
// active reference values for a target, with provenance label
function activeRef(id){
  const t=TMAP[id],snap=SBDB_SNAPSHOT.data[id];const mode=(typeof S!=='undefined'&&S&&S.data)?S.data.mode:'snapshot';
  const fromSnap=()=>({a:+snap.a,e:+snap.e,i:+snap.i,per:+snap.per_d,D:+snap.diameter_km,albedo:+snap.albedo,rot:+snap.rot_per_h,density:snap.density?+snap.density:null,spec:[snap.spec_B,snap.spec_T].filter(Boolean).join(' / ')||'—',full:snap.fullname,
    kind:'imp',src:`IMPORTED · JPL SBDB snapshot ${SBDB_SNAPSHOT.date}`});
  if(mode==='sim'){const r=mulberry(id.length*977+3);const j=v=>v*(0.9+r()*0.2);
    return {a:t.a,e:t.e,i:t.i,per:Math.round(365.25*Math.pow(t.a,1.5)),D:+j(t.D).toFixed(1),albedo:+j(t.albedo).toFixed(3),rot:+j(t.rot).toFixed(2),density:+j(t.density).toFixed(2),spec:t.type,full:t.name,kind:'sim',src:'SIMULATED · built-in game model (not measurements)'};}
  if((mode==='user'||mode==='live')&&S.data.imp[id]){const u=S.data.imp[id];const b=fromSnap();
    return {...b,...Object.fromEntries(Object.entries(u).filter(([,v])=>v!=null&&v!=='')),kind:mode==='live'?'live':'imp',src:(mode==='live'?'LIVE · ':'IMPORTED · ')+S.data.label};}
  return fromSnap();
}
