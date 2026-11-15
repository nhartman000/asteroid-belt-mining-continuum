'use strict';
// ---------- Three.js world: one shared scene for all 3D views ----------
const V3=THREE.Vector3;
const World={};
(function(){
const W=World;let renderer,scene,camera;
const tmp=new V3(),tmp2=new V3(),tmp3=new V3();
function canvasTex(sz,fn){const c=document.createElement('canvas');c.width=c.height=sz;fn(c.getContext('2d'),sz);const t=new THREE.CanvasTexture(c);return t;}
const glowTex=canvasTex(128,(g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.2,'rgba(255,255,255,.55)');r.addColorStop(0.5,'rgba(255,255,255,.12)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,s,s);});
const ringTex=canvasTex(128,(g,s)=>{g.strokeStyle='#fff';g.lineWidth=7;g.shadowColor='#fff';g.shadowBlur=10;g.beginPath();g.arc(s/2,s/2,s/2-12,0,Math.PI*2);g.stroke();g.lineWidth=3;g.setLineDash([10,10]);g.beginPath();g.arc(s/2,s/2,s/2-28,0,Math.PI*2);g.stroke();});
function planetTex(base,kind){return canvasTex(256,(g,s)=>{g.fillStyle=base;g.fillRect(0,0,s,s);const r=mulberry(base.length*31+kind.length);
  if(kind==='Jupiter'||kind==='Saturn'){for(let y=0;y<s;y+=6){g.fillStyle=`rgba(${120+r()*100|0},${80+r()*70|0},${40+r()*40|0},${0.25+r()*0.35})`;g.fillRect(0,y,s,3+r()*6);} if(kind==='Jupiter'){g.fillStyle='rgba(190,90,60,.8)';g.beginPath();g.ellipse(s*0.65,s*0.62,18,10,0,0,7);g.fill();}}
  else if(kind==='Earth'){for(let i=0;i<22;i++){g.fillStyle=`rgba(${50+r()*60|0},${120+r()*60|0},${50+r()*30|0},.9)`;g.beginPath();g.ellipse(r()*s,s*0.2+r()*s*0.6,10+r()*30,6+r()*18,r()*3,0,7);g.fill();}g.fillStyle='rgba(255,255,255,.85)';g.fillRect(0,0,s,14);g.fillRect(0,s-14,s,14);for(let i=0;i<30;i++){g.fillStyle='rgba(255,255,255,.35)';g.fillRect(r()*s,r()*s,20+r()*40,3);}}
  else{for(let i=0;i<300;i++){g.fillStyle=`rgba(0,0,0,${r()*0.18})`;g.beginPath();g.arc(r()*s,r()*s,1+r()*6,0,7);g.fill();}}});}
function rockGeo(seed,detail,elong=1){
  const g=new THREE.IcosahedronGeometry(1,detail);const pos=g.attributes.position;const r=mulberry(seed);
  const cr=[];for(let k=0;k<6+detail*5;k++){const d=new V3(r()*2-1,r()*2-1,r()*2-1).normalize();cr.push({d,s:0.12+r()*0.35,h:0.04+r()*0.1});}
  const f1=r()*10,f2=r()*10,f3=r()*10;const cols=new Float32Array(pos.count*3);const v=new V3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).normalize();
    let h=1+0.14*Math.sin(v.x*2.6+f1)*Math.sin(v.y*3.1+f2)*Math.sin(v.z*2.3+f3)+0.05*Math.sin(v.x*8+f2)*Math.sin(v.y*7+f3)*Math.sin(v.z*9+f1);
    for(const c of cr){const dd=v.distanceTo(c.d);if(dd<c.s){const t=dd/c.s;h-=c.h*(1-t*t);if(t>0.75)h+=c.h*0.6*(1-(t-0.75)/0.25);}}
    const sh=clamp(0.75+(h-1)*2.2,0.4,1.15);cols[i*3]=cols[i*3+1]=cols[i*3+2]=sh;
    v.multiplyScalar(h);v.x*=elong;pos.setXYZ(i,v.x,v.y,v.z);}
  g.setAttribute('color',new THREE.BufferAttribute(cols,3));g.computeVertexNormals();return g;}
// point shader (drones, sparks) – size attenuation with min pixel size
const ptVS=`attribute float size;attribute vec3 color;attribute float alpha;uniform float uScale;varying vec3 vC;varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(size*uScale/-mv.z,2.0,46.0);vC=color;vA=alpha;gl_Position=projectionMatrix*mv;}`;
const ptFS=`varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;float a=smoothstep(0.5,0.05,d);float core=smoothstep(0.18,0.0,d);gl_FragColor=vec4(vC*a*1.4+vec3(core*0.9),a*vA);}`;
function ptMat(){return new THREE.ShaderMaterial({uniforms:{uScale:{value:800}},vertexShader:ptVS,fragmentShader:ptFS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});}

W.init=function(){
  const canvas=$('#gl');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  scene=new THREE.Scene();scene.background=new THREE.Color(0x01030a);scene.fog=null;
  camera=new THREE.PerspectiveCamera(55,1,0.05,5000);W.camera=camera;W.scene=scene;W.renderer=renderer;
  scene.add(new THREE.AmbientLight(0x3a4a66,0.55));
  const sunL=new THREE.PointLight(0xfff1dd,1.7,0,0);scene.add(sunL);
  const hemi=new THREE.HemisphereLight(0x88aaff,0x221100,0.18);scene.add(hemi);
  // stars
  {const N=5000,p=new Float32Array(N*3),c=new Float32Array(N*3),sz=new Float32Array(N),al=new Float32Array(N);const r=mulberry(7);
   for(let i=0;i<N;i++){const v=new V3(r()*2-1,r()*2-1,r()*2-1).normalize().multiplyScalar(1800+r()*600);if(r()<0.35)v.y*=0.25;p.set([v.x,v.y,v.z],i*3);const t=r();c.set(t<0.2?[1,0.8,0.6]:t<0.4?[0.7,0.8,1]:[1,1,1],i*3);sz[i]=r()<0.04?14:4+r()*5;al[i]=0.4+r()*0.6;}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('size',new THREE.BufferAttribute(sz,1));g.setAttribute('alpha',new THREE.BufferAttribute(al,1));
   const m=new THREE.ShaderMaterial({uniforms:{uT:{value:0}},vertexShader:`attribute float size;attribute vec3 color;attribute float alpha;uniform float uT;varying vec3 vC;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(0.7+0.3*sin(uT*2.0+position.x*0.13+position.y*0.07));vC=color;vA=alpha;gl_Position=projectionMatrix*mv;}`,
     fragmentShader:ptFS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});W.starMat=m;const st=new THREE.Points(g,m);st.frustumCulled=false;scene.add(st);W.stars=st;
   // milky way band sprites
   for(let k=0;k<26;k++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:new THREE.Color().setHSL(0.6+r()*0.2,0.5,0.25),transparent:true,opacity:0.18,blending:THREE.AdditiveBlending,depthWrite:false}));const a=k/26*Math.PI*2;s.position.set(Math.cos(a)*1700,Math.sin(a*3)*120+400*Math.sin(a),Math.sin(a)*1700);s.scale.setScalar(500+r()*500);scene.add(s);}}
  // sun
  const sun=new THREE.Mesh(new THREE.SphereGeometry(2.2,48,32),new THREE.MeshBasicMaterial({color:0xffe6a0}));scene.add(sun);
  [[16,0xffaa33,0.9],[42,0xff7722,0.35],[90,0xff9944,0.12]].forEach(([s,c,o])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}));sp.scale.setScalar(s);scene.add(sp);});
  // planets + orbits
  W.planets={};
  PLANETS.forEach(p=>{const R=p.a*AU,a=p.ang*Math.PI/180;const m=new THREE.Mesh(new THREE.SphereGeometry(p.r,40,24),new THREE.MeshStandardMaterial({map:planetTex(p.c,p.name),roughness:0.9}));m.position.set(R*Math.cos(a),0,-R*Math.sin(a));scene.add(m);W.planets[p.name]=m;
    if(p.ring){const rg=new THREE.Mesh(new THREE.RingGeometry(p.r*1.3,p.r*2.3,64),new THREE.MeshBasicMaterial({color:0xd9c9a0,side:THREE.DoubleSide,transparent:true,opacity:0.55}));rg.rotation.x=-1.2;m.add(rg);}
    if(p.name==='Earth'){const at=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x66aaff,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false}));at.scale.setScalar(2.2);m.add(at);}
    scene.add(orbitLine(R,0,p.name==='Earth'?0x2f7fff:0x1b3654,p.name==='Earth'?0.6:0.45));});
  // belt
  {const N=7000,p=new Float32Array(N*3),c=new Float32Array(N*3),sz=new Float32Array(N),al=new Float32Array(N);const r=mulberry(11);
   for(let i=0;i<N;i++){const R=(2.1+Math.pow(r(),0.8)*1.2+ (r()-0.5)*0.15)*AU,a=r()*Math.PI*2;p.set([R*Math.cos(a),(r()-0.5)*(r()<0.8?1.2:3.5),R*Math.sin(a)],i*3);const b=0.45+r()*0.4;c.set([b,b*0.92,b*0.82],i*3);sz[i]=0.05+r()*0.12;al[i]=0.5+r()*0.5;}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('size',new THREE.BufferAttribute(sz,1));g.setAttribute('alpha',new THREE.BufferAttribute(al,1));
   W.beltMat=ptMat();W.beltMat.uniforms.uScale.value=600;W.belt=new THREE.Points(g,W.beltMat);scene.add(W.belt);
   const rg=new THREE.Mesh(new THREE.RingGeometry(21,33,128,1),new THREE.MeshBasicMaterial({color:0xffc640,transparent:true,opacity:0.035,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));rg.rotation.x=-Math.PI/2;scene.add(rg);}
  // targets
  W.T={};const rockG=[rockGeo(5,1),rockGeo(9,1,1.5),rockGeo(13,1,1.2)];
  W.rocks=[];const rockMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,color:0x9c948a});
  TARGETS.forEach((t,k)=>{const R=t.a*AU,a=t.ang*Math.PI/180;const pos=new V3(R*Math.cos(a),R*Math.sin(t.i*Math.PI/180)*0.18*(k%2?-1:1),-R*Math.sin(a));
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,color:new THREE.Color(...t.col),roughness:t.metal>0.4?0.45:0.95,metalness:t.metal>0.4?0.55:0.05,flatShading:true});
    const mesh=new THREE.Mesh(rockGeo(100+k*17,4,t.elong||1),mat);mesh.scale.setScalar(t.r);mesh.position.copy(pos);mesh.rotation.set(k,k*2,0);scene.add(mesh);
    const ring=new THREE.Sprite(new THREE.SpriteMaterial({map:ringTex,color:0x3ef0ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));ring.position.copy(pos);ring.scale.setScalar(t.r*3.4);scene.add(ring);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffd9a0,transparent:true,opacity:0.25,depthWrite:false,blending:THREE.AdditiveBlending}));halo.position.copy(pos);halo.scale.setScalar(t.r*5);scene.add(halo);
    const orb=orbitLine(R,t.i,0x3ef0ff,0.0);scene.add(orb);
    // factory structure (hidden until built)
    const fac=new THREE.Group();const tor=new THREE.Mesh(new THREE.TorusGeometry(t.r*1.35,t.r*0.05,10,64),new THREE.MeshBasicMaterial({color:0x5dff8a,transparent:true,opacity:0.9}));tor.rotation.x=Math.PI/2;fac.add(tor);
    for(let j=0;j<6;j++){const b=new THREE.Mesh(new THREE.BoxGeometry(t.r*0.18,t.r*0.12,t.r*0.18),new THREE.MeshStandardMaterial({color:0xb8c4d0,metalness:0.7,roughness:0.3,emissive:0x113322}));const aa=j/6*Math.PI*2;b.position.set(Math.cos(aa)*t.r*1.35,0,Math.sin(aa)*t.r*1.35);fac.add(b);}
    const fg=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x5dff8a,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false}));fg.scale.setScalar(t.r*4.5);fac.add(fg);
    // fuel tank (waystation) glow
    const tank=new THREE.Mesh(new THREE.SphereGeometry(t.r*0.22,20,14),new THREE.MeshStandardMaterial({color:0x9fd8ff,metalness:0.8,roughness:0.2,emissive:0x0a3050}));tank.position.set(0,t.r*1.3,0);fac.add(tank);fac.userData.tank=tank;
    fac.position.copy(pos);fac.scale.setScalar(0.001);fac.visible=false;scene.add(fac);
    const build=new THREE.Mesh(new THREE.TorusGeometry(t.r*1.35,t.r*0.03,6,64),new THREE.MeshBasicMaterial({color:0x5dff8a,wireframe:true,transparent:true,opacity:0}));build.rotation.x=Math.PI/2;build.position.copy(pos);scene.add(build);
    W.T[t.id]={t,pos,mesh,ring,halo,orb,fac,build,spin:0.05+0.1*(k%3)};
    // local rock field
    const r=mulberry(500+k);const nR=t.r>0.4?46:30;
    for(let j=0;j<nR;j++){const d=new V3(r()*2-1,(r()-0.5)*0.5,r()*2-1).normalize();const dist=t.r*1.9+Math.pow(r(),1.3)*(1.2+t.r*3);const s=t.r*(0.025+Math.pow(r(),3)*0.16)+0.006;
      W.rocks.push({tid:t.id,pos:pos.clone().addScaledVector(d,dist),size:s,base:s,ore:1,g:j%3,rot:new THREE.Euler(r()*6,r()*6,r()*6),spin:(r()-0.5)*0.4});}
  });
  W.rockMeshes=rockG.map((g,i)=>{const list=W.rocks.filter(x=>x.g===i);const im=new THREE.InstancedMesh(g,rockMat,list.length);im.userData.list=list;list.forEach((x,j)=>x.ii=j);scene.add(im);return im;});
  W.updateRocks(0);
  // depot / mothership
  {const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,0.7,16),new THREE.MeshStandardMaterial({color:0xd0d8e0,metalness:0.7,roughness:0.35}));body.rotation.z=Math.PI/2;g.add(body);
   const pm=new THREE.MeshStandardMaterial({color:0x1d4fa8,metalness:0.5,roughness:0.4,emissive:0x081a40});[-1,1].forEach(s=>{const p=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.01,0.22),pm);p.position.set(0,0,s*0.32);g.add(p);});
   const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x3ef0ff,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false}));gl.scale.setScalar(1.6);g.add(gl);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.03,8,48),new THREE.MeshBasicMaterial({color:0x3ef0ff}));ring.rotation.y=Math.PI/2;ring.visible=false;g.add(ring);g.userData.ring=ring;
   scene.add(g);W.depot=g;}
  W.launchPos=W.planets.Earth.position.clone().add(new V3(0.9,0.25,0.6));
  W.depot.position.copy(W.launchPos);
  // markers
  const mk=(c,s)=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ringTex,color:c,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.setScalar(s);scene.add(sp);return sp;};
  W.wpMark=mk(0x3ef0ff,0.5);W.rallyMark=mk(0xffc640,0.5);
  W.wpBeam=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x3ef0ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(W.wpBeam);
  // path preview lines
  W.paths=new THREE.Group();scene.add(W.paths);
  // drones
  const NMAX=230;W.NMAX=NMAX;
  {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NMAX*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(NMAX*3),3));g.setAttribute('size',new THREE.BufferAttribute(new Float32Array(NMAX),1));g.setAttribute('alpha',new THREE.BufferAttribute(new Float32Array(NMAX),1));
   W.dMat=ptMat();W.dPts=new THREE.Points(g,W.dMat);W.dPts.frustumCulled=false;scene.add(W.dPts);}
  {const TR=6;W.TR=TR;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NMAX*TR*2*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(NMAX*TR*2*3),3));
   W.trail=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.75,blending:THREE.AdditiveBlending,depthWrite:false}));W.trail.frustumCulled=false;scene.add(W.trail);}
  // sparks
  {const N=700;W.SN=N;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('size',new THREE.BufferAttribute(new Float32Array(N),1));g.setAttribute('alpha',new THREE.BufferAttribute(new Float32Array(N),1));
   W.sMat=ptMat();W.sPts=new THREE.Points(g,W.sMat);W.sPts.frustumCulled=false;scene.add(W.sPts);W.sp=[];for(let i=0;i<N;i++)W.sp.push({p:new V3(),v:new V3(),life:0,max:1,c:[1,1,1],s:0.02});W.spI=0;}
  // POV dust streaks + beam
  {const N=260;W.DN=N;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*6),3));W.dust=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9fdcff,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,depthWrite:false}));W.dust.frustumCulled=false;W.dust.visible=false;scene.add(W.dust);W.dustP=[];for(let i=0;i<N;i++)W.dustP.push(new V3());}
  {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));W.beam=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffc640,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false}));W.beam.frustumCulled=false;W.beam.visible=false;scene.add(W.beam);
   W.beamGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffb030,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));W.beamGlow.visible=false;scene.add(W.beamGlow);}
  // crewed ship
  {const g=new THREE.Group();const hull=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.6,12),new THREE.MeshStandardMaterial({color:0xf0f4ff,metalness:0.6,roughness:0.3}));hull.rotation.z=-Math.PI/2;g.add(hull);
   const eng=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff7a3c,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));eng.position.x=-0.36;eng.scale.setScalar(0.7);g.add(eng);g.userData.eng=eng;
   const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false}));halo.scale.setScalar(2.4);g.add(halo);
   {const tc=document.createElement('canvas');tc.width=512;tc.height=96;const x=tc.getContext('2d');x.font='800 40px ui-monospace,Menlo,monospace';x.textAlign='center';x.textBaseline='middle';x.shadowColor='#3ef0ff';x.shadowBlur=14;x.fillStyle='#ffffff';x.fillText('MARAUDER’S DAUGHTER',256,48);const tl=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(tc),transparent:true,depthWrite:false,depthTest:false}));tl.scale.set(2.4,0.45,1);tl.position.y=0.55;tl.renderOrder=10;g.add(tl);g.userData.label=tl;}
   g.visible=false;scene.add(g);W.ship=g;}
  W.resize();
  W.drones=[];W.player={p:new V3(),v:new V3(),q:new THREE.Quaternion(),init:false,yaw:0,pitch:0};
  W.cam={focus:new V3(),dist:80,theta:0.9,phi:1.05,tw:null,follow:null,auto:0};
  W.resetSwarm();
};
function orbitLine(R,incl,color,op){const pts=[];for(let i=0;i<=256;i++){const a=i/256*Math.PI*2;pts.push(new V3(R*Math.cos(a),R*Math.sin(a)*Math.sin(incl*Math.PI/180)*0.18,R*Math.sin(a)));}
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:true,opacity:op,depthWrite:false}));}
W.resize=function(){const w=window.innerWidth,h=window.innerHeight;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h,false);camera.aspect=w/h;
  camera.fov=w<h?62:50;camera.updateProjectionMatrix();const sc=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360));W.uScale=sc;W.dMat.uniforms.uScale.value=sc;W.sMat.uniforms.uScale.value=sc;W.beltMat.uniforms.uScale.value=sc;};
W.fitDist=function(radius){const vf=camera.fov*Math.PI/180;const hf=2*Math.atan(Math.tan(vf/2)*camera.aspect);return radius/Math.tan(Math.min(vf,hf)/2);};
W.updateRocks=function(t){const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new V3();W.rockMeshes&&W.rockMeshes.forEach(im=>{im.userData.list.forEach(x=>{x.rot.y+=x.spin*0.016;q.setFromEuler(x.rot);s.setScalar(x.size);m4.compose(x.pos,q,s);im.setMatrixAt(x.ii,m4);});im.instanceMatrix.needsUpdate=true;});};
// ---------- camera ----------
const ease=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
W.flyTo=function(focus,dist,dur=1.6,follow=null){const c=W.cam;c.tw={f0:c.focus.clone(),f1:focus.clone(),d0:c.dist,d1:dist,t:0,dur};c.follow=follow;sfx('whoosh');};
W.zoom=function(f){if(View.cur==='deep'){Deep.zoom(f);return;}const c=W.cam;if(View.cur==='solar'&&f>1.001&&c.dist>=1395&&!c.tw){Deep.enter(true);return;}if(c.tw){c.tw.d1*=f;}c.dist=clamp(c.dist*f,W.minDist(),View.cur==='he3'?1500:View.cur==='solar'?1400:600);};
W.minDist=function(){if(View.cur==='solar'&&View.lock)return TMAP[View.lock].r*1.6;if(View.cur==='swarm')return 0.4;return 3;};
W.camUpdate=function(dt){const c=W.cam;
  if(c.tw){c.tw.t+=dt/c.tw.dur;const k=ease(Math.min(1,c.tw.t));if(c.follow){c.tw.f1.copy(c.follow());}c.focus.lerpVectors(c.tw.f0,c.tw.f1,k);c.dist=Math.exp(lerp(Math.log(c.tw.d0),Math.log(c.tw.d1),k));if(c.tw.t>=1)c.tw=null;}
  else if(c.follow){c.focus.lerp(c.follow(),1-Math.exp(-dt*3));}
  c.theta+=c.auto*dt;c.phi=clamp(c.phi,0.15,Math.PI-0.15);
  tmp.setFromSphericalCoords(c.dist,c.phi,c.theta);camera.position.copy(c.focus).add(tmp);camera.up.set(0,1,0);camera.lookAt(c.focus);
  camera.near=clamp(c.dist*0.01,0.004,0.5);camera.far=6000;camera.updateProjectionMatrix();};
// ---------- drones ----------
function rndDir(r=Math.random){return new V3(r()*2-1,r()*2-1,r()*2-1).normalize();}
function mkDrone(g,at,gen=1){const d=mkDrone0(g,at,gen);d.fam=famFor(g);const tn=S.design.studio&&S.design.studio.terraN;d.terra=tn?Math.random()<1/tn:false;return d;}
const FAMRGB={replicator:[1,0.36,0.92],builder:[0.36,1,0.54],miner:[1,0.78,0.25],transport:[0.24,0.94,1]};const TERRARGB=[0.82,1,0.62];
function famFor(g){if(g==='miner')return'miner';if(g==='factory')return'builder';const st=S.design.studio;if(!st)return Math.random()<0.5?'replicator':'transport';let r=0,t=0;PKEYS.forEach(p=>{if(PURPOSES[p].f==='replicator')r+=st.mix[p];if(PURPOSES[p].f==='transport')t+=st.mix[p];});return Math.random()*(r+t||1)<r?'replicator':'transport';}
function mkDrone0(g,at,gen=1){return{g,p:at.clone().addScaledVector(rndDir(),Math.random()*0.4),v:rndDir().multiplyScalar(0.2),off:rndDir().multiplyScalar(0.3+Math.random()*0.7),ax:rndDir(),ph:Math.random()*100,spd:0.6+Math.random()*0.8,
  st:'out',rock:-1,rockT:0,carry:0,hist:[],alive:true,die:0,gen,born:performance.now()};}
W._mk=mkDrone;W.onLaunchQuiet=function(){W.cruise={};GKEYS.forEach(g=>{W.cruise[g]=mkPath(W.launchPos,W.T[groupTarget(g)].pos);});W.depotPath=mkPath(W.launchPos,depotSpot());W.drones.forEach(d=>{if(!d.hist.length)for(let k=0;k<W.TR;k++)d.hist.push(d.p.clone());});};
W.resetSwarm=function(){W.drones=[];const f=S.design.fleet;GKEYS.forEach(g=>{for(let i=0;i<f[g];i++)W.drones.push(mkDrone(g,W.launchPos));});W.drones.forEach(d=>{for(let k=0;k<W.TR;k++)d.hist.push(d.p.clone());});W.depot.position.copy(W.launchPos);W.depotTarget=null;
  TARGETS.forEach(t=>{const o=W.T[t.id];o.fac.visible=false;o.fac.scale.setScalar(0.001);});W.depot.userData.ring.visible=false;W.ship.visible=false;};
W.syncFleet=function(){if(S.phase!=='plan')return;const f=S.design.fleet;GKEYS.forEach(g=>{let cur=W.drones.filter(d=>d.g===g&&d.alive);while(cur.length<f[g]){const d=mkDrone(g,W.launchPos);for(let k=0;k<W.TR;k++)d.hist.push(d.p.clone());W.drones.push(d);cur.push(d);}while(cur.length>f[g]){const d=cur.pop();W.drones.splice(W.drones.indexOf(d),1);}});};
W.spawnDrone=function(g,at){const d=mkDrone(g,at||W.depot.position,Continuum.generation()+1);for(let k=0;k<W.TR;k++)d.hist.push(d.p.clone());W.drones.push(d);burst(d.p,GROUPS[g].rgb,14,0.4);floatText(d.p,'+1 '+GROUPS[g].name+' (gen '+d.gen+')',GROUPS[g].col);sfx('build');return d;};
W.loseDrone=function(g){const c=W.drones.filter(d=>d.alive&&(!g||d.g===g));if(!c.length)return;const d=c[Math.floor(Math.random()*c.length)];d.alive=false;S.groups[d.g].n=Math.max(0,S.groups[d.g].n-1);burst(d.p,[1,0.4,0.3],30,0.6);sfx('boom');floatText(d.p,'DRONE LOST','#ff5470');setTimeout(()=>{const i=W.drones.indexOf(d);if(i>=0)W.drones.splice(i,1);},10);};
W.consumeDrones=function(g,n,tid){let k=0;for(const d of W.drones){if(k>=n)break;if(d.alive&&d.g===g&&(!tid||groupTarget(g)===tid)){d.alive=false;k++;burst(d.p,[0.4,1,0.6],8,0.2);setTimeout(()=>{const i=W.drones.indexOf(d);if(i>=0)W.drones.splice(i,1);},10);}}S.groups[g].n=Math.max(0,S.groups[g].n-k);return k;};
W.aliveCount=()=>W.drones.filter(d=>d.alive).length;
function groupTarget(g){return S.design.multi?S.groups[g].target:S.design.primary;}
W.groupTarget=groupTarget;
W.groupCentroid=function(g){tmp3.set(0,0,0);let n=0;for(const d of W.drones)if(d.alive&&(g==='all'||d.g===g)){tmp3.add(d.p);n++;}return n?tmp3.divideScalar(n).clone():W.launchPos.clone();};
W.onLaunch=function(){const p=W.launchPos;burst(p,[1,0.8,0.4],80,1.2);sfx('launch');flash();W.shake();
  W.cruise={};GKEYS.forEach(g=>{const to=W.T[groupTarget(g)].pos;W.cruise[g]=mkPath(p,to);});W.depotPath=mkPath(p,depotSpot());};
function depotSpot(){const t=W.T[S.design.primary];const R=REGIONS[S.design.region].au*AU;const dir=t.pos.clone().setY(0).normalize();const sp=dir.multiplyScalar(R);sp.y=t.pos.y*0.6;
  if(sp.distanceTo(t.pos)<t.t.r*4)sp.add(new V3(0,t.t.r*3,0));return sp;}
W.depotSpot=depotSpot;
function mkPath(a,b){const mid=a.clone().add(b).multiplyScalar(0.5);const len=a.distanceTo(b);const perp=new V3(-(b.z-a.z),0,b.x-a.x).normalize();mid.addScaledVector(perp,len*0.22);mid.y+=len*0.06;return{a:a.clone(),c:mid,b:b.clone()};}
function bez(P,t,out){const u=1-t;return out.set(u*u*P.a.x+2*u*t*P.c.x+t*t*P.b.x,u*u*P.a.y+2*u*t*P.c.y+t*t*P.b.y,u*u*P.a.z+2*u*t*P.c.z+t*t*P.b.z);}
W.retarget=function(g){if(S.phase==='cruise'&&W.cruise){const f=cruiseF();const from=W.groupCentroid(g);W.cruise[g]={...mkPath(from,W.T[groupTarget(g)].pos),f0:f};}};
function cruiseF(){return clamp((S.day-S.launchDay)/Math.max(1,S.cruiseDays),0,1);}
W.onArrive=function(){W.depot.position.copy(depotSpot());};
W.onFactory=function(tid){Music.jingle();const o=W.T[tid];o.fac.visible=true;o.fac.userData.grow=0;burst(o.pos,[0.4,1,0.6],120,o.t.r*2);W.shake();};
W.onDepotFactory=function(){W.depot.userData.ring.visible=true;burst(W.depot.position,[0.3,0.9,1],80,0.8);};
W.groupStats=function(){const out={miners:{},factory:{},scoutsAt:{},onAt:{},scouts:0,onStation:0,miningTotal:0,flybackDepot:0,byG:{miner:{on:0,n:0},flyback:{on:0,n:0},factory:{on:0,n:0}}};
  for(const d of W.drones){if(!d.alive)continue;const tid=groupTarget(d.g);const T=W.T[tid];const ord=S.groups[d.g].order;out.byG[d.g].n++;
    const dist=d.p.distanceTo(T.pos);const near=dist<T.t.r*(ord==='scout'?7:3.2)+1.2;
    if(d.g==='flyback'&&d.p.distanceTo(W.depot.position)<1.2)out.flybackDepot++;
    if(!near||S.rally||(S.waypoint&&S.waypoint.groups.includes(d.g)))continue;
    if(ord==='scout'){out.scouts++;out.scoutsAt[tid]=(out.scoutsAt[tid]||0)+1;out.byG[d.g].on++;continue;}
    if(ord!=='harvest')continue;out.onStation++;out.onAt[tid]=(out.onAt[tid]||0)+1;out.byG[d.g].on++;
    if(d.g==='miner'){out.miners[tid]=(out.miners[tid]||0)+1;out.miningTotal++;}
    if(d.g==='factory'){out.factory[tid]=(out.factory[tid]||0)+1;}}
  return out;};
// ---------- per-frame drone motion ----------
const goal=new V3(),des=new V3(),acc=new V3();
W.updateDrones=function(dt,t){
  const wpV=S.waypoint?new V3().fromArray(S.waypoint.pos):null;const real=S.design.physics==='real';const steerK=real?1.6:4.2;const cf=S.phase==='cruise'?cruiseF():0;
  const ds=W.drones;const n=ds.length;
  for(let i=0;i<n;i++){const d=ds[i];if(!d.alive)continue;const G=S.groups[d.g];const tid=groupTarget(d.g);const T=W.T[tid];const r=T.t.r;let spd=1.2,k=steerK,jit=0.25,scale=1;
    const inRally=S.rally&&(S.rally.groups.includes(d.g));const inWp=!inRally&&S.waypoint&&S.waypoint.groups.includes(d.g);
    if(inRally){scale=S.rally.scale;goal.copy(S.rally.pos).addScaledVector(d.off,0.11*scale);goal.x+=Math.sin(t*3+d.ph)*0.03*scale;goal.y+=Math.cos(t*2.7+d.ph)*0.03*scale;spd=3.5*scale+0.5;k=7;jit=0.15*scale;}
    else if(inWp){scale=S.waypoint.scale;goal.copy(wpV).addScaledVector(d.off,0.4*scale);spd=2.6*scale+0.6;jit=0.3*scale;}
    else if(S.phase==='plan'){scale=0.8;const b=W.launchPos;const a=t*(d.g==='miner'?0.9:d.g==='flyback'?0.5:0.3)*d.spd+d.ph;
      if(d.g==='miner')goal.copy(b).addScaledVector(d.off,0.55).add(tmp.set(Math.cos(a)*0.35,Math.sin(a*1.3)*0.15,Math.sin(a)*0.35));
      else if(d.g==='flyback')goal.copy(b).add(tmp.set(Math.sin(a)*1.1,Math.sin(a*2)*0.2,Math.sin(a*2)*0.5)).addScaledVector(d.off,0.2);
      else{const aa=i*0.7+t*0.25;goal.copy(b).add(tmp.set(Math.cos(aa)*0.8,0.25+Math.sin(aa*3)*0.05,Math.sin(aa)*0.8)).addScaledVector(d.off,0.08);}
      spd=1.4;jit=0.2;}
    else if(G.order==='return'){goal.copy(W.depot.position).addScaledVector(d.off,0.45);spd=3;}
    else if(G.order==='follow'){goal.copy(W.player.p).addScaledVector(d.off,0.12+r*0.3);spd=2.5;scale=r;}
    else if(S.phase==='cruise'){const P=W.cruise[d.g];const f0=P.f0||0;const ff=clamp((cf-f0)/Math.max(0.001,1-f0),0,1);bez(P,ease(ff),goal);goal.addScaledVector(d.off,0.25+0.35*Math.sin(ff*Math.PI));spd=4;k=steerK*1.2;jit=0.35;}
    else if(G.order==='scout'){scale=r;const a=t*0.25*d.spd+d.ph;tmp.copy(d.off).normalize().applyAxisAngle(d.ax,a);goal.copy(T.pos).addScaledVector(tmp,r*2.6+0.6+0.5*Math.sin(t*0.4+d.ph));spd=1.6;jit=0.25;}
    else{ // harvest roles
      scale=r;
      if(d.g==='miner'){d.rockT-=dt;if(d.rockT<=0){d.rockT=6+Math.random()*10;const loc=W.rocks.filter(x=>x.tid===tid);d.rock=Math.random()<0.45&&loc.length?W.rocks.indexOf(loc[Math.floor(Math.random()*loc.length)]):-1;}
        const a=t*0.5*d.spd+d.ph;tmp.copy(d.off).normalize().applyAxisAngle(d.ax,a);
        if(d.rock>=0){const rk=W.rocks[d.rock];goal.copy(rk.pos).addScaledVector(tmp,rk.size*1.6+0.02);}
        else goal.copy(T.pos).addScaledVector(tmp,r*(1.12+0.08*Math.sin(t*3+d.ph)));
        spd=0.9*r+0.6;jit=0.12;if(d.p.distanceTo(goal)<r*0.3&&Math.random()<dt*0.9)spark(d.p,[1,0.75,0.3]);}
      else if(d.g==='flyback'){
        if(d.st!=='back'){goal.copy(T.pos).addScaledVector(d.off,r*1.5);spd=3.2;if(d.p.distanceTo(T.pos)<r*1.9+0.08){d.st='back';const take=Math.min(S.res.site[tid]||0,0.7*(S.design.sm?S.design.sm.haul:1)*(S.design.objective==='sample'?1.2:1)*(S.phase==='ops'?1:0));if(S.phase==='ops'){S.res.site[tid]-=take;}d.carry=take;if(!take)S.stats.emptyTrips++;}}
        else{goal.copy(W.depot.position).addScaledVector(d.off,0.3);spd=3.2;if(d.p.distanceTo(W.depot.position)<0.4){d.st='out';if(d.carry>0&&S.phase==='ops'){S.res.cargo+=d.carry;S.stats.delivered+=d.carry;if(Math.random()<0.35){floatText(W.depot.position,'+'+fmt(d.carry,1)+' t','#3ef0ff');sfx('deliver');}spark(W.depot.position,[0.3,0.9,1]);}d.carry=0;}}}
      else{const nF=Math.max(1,S.groups.factory.n);const idx=i%nF;const mf=S.mfac[tid];const aa=idx/nF*Math.PI*2+t*(mf&&mf.online?0.35:0.12);
        goal.copy(T.pos).add(tmp.set(Math.cos(aa)*r*1.55,Math.sin(aa*2+d.ph)*r*0.15,Math.sin(aa)*r*1.55));spd=0.8*r+0.5;jit=0.06;if(!(mf&&mf.online)&&d.p.distanceTo(goal)<r*0.4&&Math.random()<dt*0.7)spark(d.p,[0.4,1,0.6]);}
    }
    des.subVectors(goal,d.p);const dist=des.length();des.normalize().multiplyScalar(Math.min(spd,dist*2.4+0.01));
    acc.subVectors(des,d.v).multiplyScalar(k);
    acc.x+=(Math.random()-0.5)*jit*6*Math.max(scale,0.15);acc.y+=(Math.random()-0.5)*jit*6*Math.max(scale,0.15);acc.z+=(Math.random()-0.5)*jit*6*Math.max(scale,0.15);
    // separation (same group, cheap)
    const sr=0.05*Math.max(scale,0.2);for(let j=i+1;j<Math.min(n,i+9);j++){const o=ds[j];tmp2.subVectors(d.p,o.p);const l=tmp2.lengthSq();if(l<sr*sr&&l>1e-9){tmp2.multiplyScalar(0.6/Math.sqrt(l));d.v.addScaledVector(tmp2,dt);o.v.addScaledVector(tmp2,-dt);}}
    d.v.addScaledVector(acc,dt);const vl=d.v.length();if(vl>spd*1.4)d.v.multiplyScalar(spd*1.4/vl);
    d.p.addScaledVector(d.v,dt);if(d.p.x!==d.p.x){d.p.copy(W.depot.position);d.v.set(0,0,0);}
  }
  // write buffers
  const P=W.dPts.geometry.attributes,pa=P.position.array,ca=P.color.array,sa=P.size.array,aa=P.alpha.array;let c=0;
  const L=W.trail.geometry.attributes,lp=L.position.array,lc=L.color.array;let lc_i=0;
  W._hT=(W._hT||0)+dt;const shift=W._hT>0.05;if(shift)W._hT=0;
  for(const d of ds){if(!d.alive||c>=W.NMAX-1)continue;const col=d.terra&&Math.sin(t*3+d.ph)>0.2?TERRARGB:(FAMRGB[d.fam]||GROUPS[d.g].rgb);const sh=0.75+0.25*Math.sin(t*9+d.ph*7);
    pa[c*3]=d.p.x;pa[c*3+1]=d.p.y;pa[c*3+2]=d.p.z;ca[c*3]=col[0]*sh;ca[c*3+1]=col[1]*sh;ca[c*3+2]=col[2]*sh;sa[c]=(d.g==='flyback'&&d.carry>0?0.05:0.035);aa[c]=1;
    if(shift){d.hist.pop();d.hist.unshift(d.p.clone());}else d.hist[0].copy(d.p);
    for(let k=0;k<W.TR-1;k++){const a=d.hist[k],b=d.hist[k+1];const f1=(1-k/W.TR)*0.8,f2=(1-(k+1)/W.TR)*0.8;lp.set([a.x,a.y,a.z,b.x,b.y,b.z],lc_i*6);lc.set([col[0]*f1,col[1]*f1,col[2]*f1,col[0]*f2,col[1]*f2,col[2]*f2],lc_i*6);lc_i++;}
    c++;}
  // player marker
  if(W.player.init&&View.cur!=='pov'){const p=W.player.p;pa[c*3]=p.x;pa[c*3+1]=p.y;pa[c*3+2]=p.z;ca[c*3]=1;ca[c*3+1]=0.35;ca[c*3+2]=0.85;sa[c]=0.06;aa[c]=1;c++;}
  W.dPts.geometry.setDrawRange(0,c);P.position.needsUpdate=P.color.needsUpdate=P.size.needsUpdate=P.alpha.needsUpdate=true;
  W.trail.geometry.setDrawRange(0,lc_i*2);L.position.needsUpdate=L.color.needsUpdate=true;
};
// ---------- sparks ----------
function spark(p,c,v=0.15,s=0.018){const x=W.sp[W.spI];W.spI=(W.spI+1)%W.SN;x.p.copy(p);x.v.copy(rndDir()).multiplyScalar(v*(0.3+Math.random()));x.life=x.max=0.5+Math.random()*0.6;x.c=c;x.s=s;}
function burst(p,c,n,v){for(let i=0;i<n;i++)spark(p,c,v,0.03+Math.random()*0.03);}
W.spark=spark;W.burst=burst;
function updSparks(dt){const A=W.sPts.geometry.attributes;let k=0;for(const x of W.sp){if(x.life<=0)continue;x.life-=dt;x.p.addScaledVector(x.v,dt);x.v.multiplyScalar(0.97);const f=Math.max(0,x.life/x.max);
  A.position.array.set([x.p.x,x.p.y,x.p.z],k*3);A.color.array.set([x.c[0],x.c[1],x.c[2]],k*3);A.size.array[k]=x.s;A.alpha.array[k]=f;k++;}
  W.sPts.geometry.setDrawRange(0,k);A.position.needsUpdate=A.color.needsUpdate=A.size.needsUpdate=A.alpha.needsUpdate=true;}
// ---------- floating text & shake & flash ----------
const fts=[];function floatText(p,txt,col){const ov=View.cur==='solar'?$('#lab-solar'):View.cur==='swarm'?$('#lab-swarm'):null;if(!ov)return;const el=document.createElement('div');el.className='ftxt';el.textContent=txt;el.style.color=col;ov.appendChild(el);fts.push({el,p:p.clone(),t:0});}
W.floatText=floatText;
function updFloat(dt){for(let i=fts.length-1;i>=0;i--){const f=fts[i];f.t+=dt;tmp.copy(f.p).project(camera);const x=(tmp.x*0.5+0.5)*innerWidth,y=(-tmp.y*0.5+0.5)*innerHeight-f.t*50;f.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;f.el.style.opacity=String(1-f.t/1.4);if(f.t>1.4||tmp.z>1){f.el.remove();fts.splice(i,1);}}}
W.shake=function(){document.body.classList.remove('shake');void document.body.offsetWidth;document.body.classList.add('shake');W._shake=0.35;};
function flash(){const f=$('#flash');f.style.transition='none';f.style.opacity='0.85';requestAnimationFrame(()=>{f.style.transition='opacity .8s';f.style.opacity='0';});}
W.flash=flash;
// ---------- per-frame world ----------
W.frame=function(dt,t){
  W.starMat.uniforms.uT.value=t;W.belt.rotation.y+=dt*0.004;
  for(const id in W.T){const o=W.T[id];o.mesh.rotation.y+=dt*o.spin;
    const sel=S.design.targets.includes(id),prim=S.design.primary===id;o.ring.material.opacity=sel?0.55+0.3*Math.sin(t*3):0;o.ring.material.color.set(prim?0xffc640:0x3ef0ff);o.ring.material.rotation=t*0.4;
    o.orb.material.opacity=sel?0.35:0.06;
    const mf=S.mfac[id];o.build.material.opacity=mf&&!mf.online&&mf.progress>0?0.25+0.5*mf.progress:0;o.build.rotation.z+=dt*0.5;
    if(o.fac.visible){o.fac.userData.grow=Math.min(1,(o.fac.userData.grow||0)+dt*0.6);o.fac.scale.setScalar(ease(o.fac.userData.grow));o.fac.rotation.y+=dt*0.25;const ws=S.ways&&S.ways[id];const tk=o.fac.userData.tank;if(tk){const f=ws?clamp(ws.fuel/60,0.15,1.6):0.2;tk.scale.setScalar(0.6+f*0.6);tk.material.emissive.setRGB(0.05,0.2+0.3*f*(0.6+0.4*Math.sin(t*4)),0.35*f);}}}
  // depot motion
  if(S.phase==='cruise'&&W.depotPath)bez(W.depotPath,ease(cruiseF()),W.depot.position);
  W.depot.rotation.y+=dt*0.3;
  // markers
  const wp=S.waypoint,ra=S.rally;
  if(wp){W.wpMark.position.fromArray(wp.pos);W.wpMark.scale.setScalar(wp.scale*(0.45+0.12*Math.sin(t*6)));W.wpMark.material.opacity=0.9;W.wpMark.material.rotation=-t;W.wpBeam.position.copy(W.wpMark.position);W.wpBeam.scale.setScalar(wp.scale*0.6);W.wpBeam.material.opacity=0.6;}
  else{W.wpMark.material.opacity*=0.9;W.wpBeam.material.opacity*=0.9;}
  if(ra){W.rallyMark.position.copy(ra.pos);ra.age=(ra.age||0)+dt;W.rallyMark.scale.setScalar(ra.scale*(0.25+0.6*Math.abs(Math.sin(ra.age*2.5))));W.rallyMark.material.opacity=0.95;W.rallyMark.material.rotation=t*2;}
  else W.rallyMark.material.opacity*=0.85;
  // path previews
  W.updatePaths();
  W.updateDrones(S.paused?dt*0.3:Math.min(dt*Math.min(S.speed,3),0.06),t);updSparks(dt);updFloat(dt);W.updateRocks(t);
  if(typeof Continuum!=='undefined')Continuum.frame(dt,t);
  if(View.cur==='pov')Pov.frame(dt,t);else{W.camUpdate(dt);W.dust.visible=false;W.beam.visible=false;W.beamGlow.visible=false;}
  if(W._shake>0){W._shake-=dt;camera.position.x+=(Math.random()-0.5)*W._shake*0.05*W.cam.dist*0.05;camera.position.y+=(Math.random()-0.5)*W._shake*0.05*W.cam.dist*0.05;}
  if(View.cur==='deep'&&Deep.built)Deep.render(renderer,dt);else renderer.render(scene,camera);
};
let pathKey='';
W.updatePaths=function(){const key=S.phase+'|'+S.design.targets.join(',')+'|'+GKEYS.map(groupTarget).join(',')+'|'+S.design.multi;if(key===pathKey)return;pathKey=key;
  while(W.paths.children.length){const c=W.paths.children.pop();c.geometry.dispose();}
  if(S.phase!=='plan'&&S.phase!=='cruise')return;
  GKEYS.forEach(g=>{const P=mkPath(W.launchPos,W.T[groupTarget(g)].pos);const pts=[];for(let i=0;i<=60;i++)pts.push(bez(P,i/60,new V3()));const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const l=new THREE.Line(geo,new THREE.LineDashedMaterial({color:new THREE.Color(GROUPS[g].col),dashSize:0.4,gapSize:0.3,transparent:true,opacity:0.55}));l.computeLineDistances();W.paths.add(l);});};
W.project=function(p,out){tmp.copy(p).project(camera);out.x=(tmp.x*0.5+0.5)*innerWidth;out.y=(-tmp.y*0.5+0.5)*innerHeight;out.z=tmp.z;out.vis=tmp.z<1&&tmp.z>-1;return out;};
W.screenRay=function(x,y){const v=new V3((x/innerWidth)*2-1,-(y/innerHeight)*2+1,0.5).unproject(camera);return{o:camera.position.clone(),d:v.sub(camera.position).normalize()};};
W.pickTarget=function(x,y,minPx=34){let best=null,bd=1e9;const o={};for(const id in W.T){const T=W.T[id];W.project(T.pos,o);if(!o.vis)continue;
  const edge=W.project(tmp2.copy(T.pos).addScaledVector(camera.up,T.t.r),{});const rpx=Math.hypot(edge.x-o.x,edge.y-o.y);const dd=Math.hypot(o.x-x,o.y-y);if(dd<Math.max(minPx,rpx*1.2)&&dd<bd){bd=dd;best=id;}}return best;};
W.pointOnFocusPlane=function(x,y){const ray=W.screenRay(x,y);const n=new V3();camera.getWorldDirection(n);const t=n.dot(tmp.subVectors(W.cam.focus,ray.o))/n.dot(ray.d);return ray.o.addScaledVector(ray.d,t);};
})();
