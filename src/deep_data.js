'use strict';
// ---------- Stage 3 data: whole Solar System + interstellar targets ----------
// Planet elements: JPL "Approximate Positions of the Planets" (J2000 mean elements, Standish), rounded.
// a = semi-major axis (AU), e = eccentricity, i = inclination (deg), P = sidereal period (yr). Moon/dwarf facts: NASA Science pages.
const SOL_PLANETS={
 Mercury:{a:0.387,e:0.206,i:7.0,P:0.241,res:'Polar water ice in shadowed craters (MESSENGER). Sunlight is ~6.7× Earth’s.'},
 Venus:{a:0.723,e:0.007,i:3.39,P:0.615,res:'CO₂ atmosphere, ~465 °C surface — no surface mining. Aerobraking/flyby assist only.'},
 Earth:{a:1.0,e:0.017,i:0.0,P:1.0,res:'Home. Launch site for the first TCTA seed drones.'},
 Mars:{a:1.524,e:0.093,i:1.85,P:1.881,res:'Subsurface water ice; CO₂ air → O₂ and methane propellant (MOXIE demonstrated O₂).'},
 Jupiter:{a:5.203,e:0.048,i:1.30,P:11.86,res:'H₂/He gas giant: deep gravity well, intense radiation. Gravity-assist hub.'},
 Saturn:{a:9.537,e:0.054,i:2.49,P:29.46,res:'H₂/He gas giant. Rings are mostly water ice (>90%).'},
 Uranus:{a:19.19,e:0.047,i:0.77,P:84.0,res:'Ice giant: water, ammonia and methane ices. Atmospheric He-3 is FUTURE TECH only.'},
 Neptune:{a:30.07,e:0.009,i:1.77,P:164.8,res:'Ice giant with the strongest winds known. Atmospheric He-3 is FUTURE TECH only.'}};
// Moons — visual offsets from their parent are enlarged for visibility (not to scale).
const SOL_MOONS=[
 {id:'luna',n:'Moon (Luna)',p:'Earth',km:1737,c:'#cfcfcf',off:[0.9,0.35,0.7],res:'Water ice in permanently shadowed polar craters (LCROSS 2009); oxygen in regolith.'},
 {id:'phobos',n:'Phobos',p:'Mars',km:11,c:'#8a7a6a',off:[0.6,0.1,-0.3],res:'Dark, carbon-rich-looking regolith; JAXA MMX will return samples.'},
 {id:'europa',n:'Europa',p:'Jupiter',km:1561,c:'#d9c6a5',off:[3.0,0.3,1.2],res:'Ice shell over a salt-water ocean — protected for astrobiology (no mining). Europa Clipper.'},
 {id:'ganymede',n:'Ganymede',p:'Jupiter',km:2634,c:'#a89a8a',off:[-3.6,0.4,2.4],res:'Largest moon: water-ice crust, subsurface ocean, own magnetic field. ESA JUICE.'},
 {id:'callisto',n:'Callisto',p:'Jupiter',km:2410,c:'#6e655c',off:[1.8,-0.3,-5.0],res:'Ancient icy crust outside the worst radiation — best Jupiter base site (NASA HOPE study).'},
 {id:'titan',n:'Titan',p:'Saturn',km:2575,c:'#e0a84f',off:[4.6,0.6,-1.4],res:'Thick N₂ air, methane/ethane lakes, rich organics. NASA Dragonfly.'},
 {id:'enceladus',n:'Enceladus',p:'Saturn',km:252,c:'#f2f6ff',off:[-2.9,0.3,1.6],res:'Water-ice plumes from a subsurface ocean (Cassini) — easy ice; ocean itself protected.'},
 {id:'triton',n:'Triton',p:'Neptune',km:1353,c:'#d8c7c0',off:[2.3,0.5,-1.2],res:'Nitrogen and water ice, active geysers (Voyager 2); likely a captured Kuiper object.'}];
// Dwarf planets / Kuiper belt objects. nu = displayed true anomaly (deg), w = perihelion direction (deg) — approximate placement.
const SOL_DWARFS=[
 {id:'pluto',n:'Pluto',a:39.48,e:0.249,i:17.1,P:248,w:110,nu:77,km:1188,c:'#d9b99b',res:'N₂, CH₄, CO ices; water-ice mountains (New Horizons 2015).'},
 {id:'eris',n:'Eris',a:67.8,e:0.44,i:44,P:559,w:150,nu:172,km:1163,c:'#e8e8e8',res:'Bright methane-ice surface; ~27% more massive than Pluto; ~96 AU from the Sun today.'},
 {id:'makemake',n:'Makemake',a:45.4,e:0.16,i:29,P:306,w:300,nu:150,km:715,c:'#c98a6a',res:'Methane and ethane ices.'},
 {id:'haumea',n:'Haumea',a:43.1,e:0.19,i:28.2,P:284,w:240,nu:150,km:816,c:'#f0f0f0',res:'Crystalline water-ice surface; spins in ~4 h; has a ring.'},
 {id:'arrokoth',n:'Arrokoth',a:44.6,e:0.04,i:2.45,P:298,w:20,nu:10,km:18,c:'#b5654a',res:'Contact-binary planetesimal; methanol ice and red organics (New Horizons flyby 2019).'}];
// Waystation chain from the belt to the interstellar jump-off.
const DEEP_HUBS=[
 {id:'belt',n:'Belt network',ic:'☄',a:2.7,at:null,where:'Main belt (your Stage 2 waystations)',res:'Water ice + metals → propellant'},
 {id:'jupiter',n:'Jupiter hub',ic:'🟠',a:5.2,at:'callisto',where:'Callisto (low radiation)',res:'Water-ice crust'},
 {id:'saturn',n:'Saturn hub',ic:'🪐',a:9.54,at:'titan',where:'Titan + Enceladus',res:'Methane, N₂, water-ice plumes'},
 {id:'uranus',n:'Uranus hub',ic:'🔵',a:19.19,at:'Uranus',where:'Uranian moons (Titania/Oberon)',res:'Water + ammonia ices'},
 {id:'neptune',n:'Neptune hub',ic:'🔷',a:30.07,at:'triton',where:'Triton',res:'Nitrogen + water ice'},
 {id:'kuiper',n:'Kuiper hub',ic:'❄',a:42,at:'pluto',where:'Pluto / Arrokoth',res:'N₂, CH₄, CO, water ices'},
 {id:'jump',n:'Interstellar jump-off',ic:'🚀',a:120,at:null,where:'~120 AU, at the heliopause (Voyager 1 crossed at ~121 AU)',res:'Probe assembly yard, propellant shipped down the chain'}];
// Star-only target not in the planet table (no confirmed planets): SIMBAD position/distance.
const EXTRA_STARS=[{host:'Alpha Centauri A & B',ly:4.37,l:315.73,b:-0.68,sp:'G2V + K1V',teff:5790,n:0,pl:[],star:1}];
