
/* graceful degradation */
if (!window.gsap) {
  window.gsap = { registerPlugin(){}, from(){}, to(){}, set(){}, timeline:()=>({from:()=>({}),to:()=>({})}), utils:{ toArray:()=>[] } };
  window.ScrollTrigger = { create(o){ if(o&&o.onEnter) o.onEnter(); }, update(){} };
  document.querySelectorAll('.mask>span').forEach(s=>s.style.transform='none');
}
gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = innerWidth < 768;

/* marquee dup */
const mt=document.getElementById('mtrack'); mt.innerHTML=mt.innerHTML.repeat(6);

/* cursor dot + ring */
const cur=document.getElementById('cursor'), ring=document.getElementById('cursorRing');
let rx=0, ry=0, tx=0, ty=0;
document.addEventListener('mousemove',e=>{ tx=e.clientX; ty=e.clientY; cur.style.left=tx+'px'; cur.style.top=ty+'px'; });
(function ringLoop(){ rx+=(tx-rx)*.14; ry+=(ty-ry)*.14; ring.style.left=rx+'px'; ring.style.top=ry+'px'; requestAnimationFrame(ringLoop); })();
document.querySelectorAll('a,button,.g-card,.tier').forEach(el=>{
  el.addEventListener('mouseenter',()=>ring.classList.add('big'));
  el.addEventListener('mouseleave',()=>ring.classList.remove('big'));
});

/* magnetic buttons */
if(!mobile) document.querySelectorAll('.magnet').forEach(b=>{
  b.addEventListener('mousemove',e=>{
    const r=b.getBoundingClientRect();
    b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.22}px,${(e.clientY-r.top-r.height/2)*.32}px)`;
  });
  b.addEventListener('mouseleave',()=>b.style.transform='');
});

/* nav + progress */
addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('scrolled',scrollY>40);
  const h=document.documentElement;
  document.getElementById('prog').style.width=(scrollY/(h.scrollHeight-h.clientHeight)*100)+'%';
},{passive:true});

/* dot nav */
['hero','story','gallery','numbers','pricing','book','faq'].forEach(id=>{
  ScrollTrigger.create({ trigger:'#'+id, start:'top 55%', end:'bottom 55%',
    onToggle:s=>{ if(s.isActive){ document.querySelectorAll('#dots a').forEach(a=>a.classList.toggle('on',a.dataset.s===id)); } }});
});

/* ---------- THREE.JS: REAL MAGIC MIRROR BOOTH ---------- */
if (!reduced && window.THREE) {
  const container=document.getElementById('mirror-canvas');
  const W=()=>container.clientWidth, H=()=>container.clientHeight;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,W()/H(),.1,100);
  camera.position.set(0,.4,8.6);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(W(),H());
  container.appendChild(renderer.domElement);

  function roundedRect(w,h,r){
    const s=new THREE.Shape(); const x=-w/2,y=-h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.absarc(x+w-r,y+r,r,-Math.PI/2,0,false);
    s.lineTo(x+w,y+h-r); s.absarc(x+w-r,y+h-r,r,0,Math.PI/2,false);
    s.lineTo(x+r,y+h); s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI,false);
    s.lineTo(x,y+r); s.absarc(x+r,y+r,r,Math.PI,Math.PI*1.5,false);
    return s;
  }

  function buildBooth(){
    const g=new THREE.Group();
    // frame
    const outer=roundedRect(2.35,4.15,.5);
    const innerShape=roundedRect(2.0,3.8,.42);
    outer.holes=[ new THREE.Path(innerShape.getPoints(48).reverse()) ];
    const frame=new THREE.Mesh(
      new THREE.ExtrudeGeometry(outer,{depth:.16,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:3,curveSegments:40}),
      new THREE.MeshPhongMaterial({color:0x8A6A22,emissive:0x1a1206,specular:0xF4E29A,shininess:60})
    );
    // glass with vertical sheen gradient texture
    const c=document.createElement('canvas'); c.width=256; c.height=512;
    const ctx=c.getContext('2d');
    const gr=ctx.createLinearGradient(0,0,256,512);
    gr.addColorStop(0,'#1c1b20'); gr.addColorStop(.32,'#0c0c0f'); gr.addColorStop(.55,'#17161c'); gr.addColorStop(1,'#08080a');
    ctx.fillStyle=gr; ctx.fillRect(0,0,256,512);
    ctx.fillStyle='rgba(233,204,126,0.05)';
    ctx.beginPath(); ctx.moveTo(40,0); ctx.lineTo(120,0); ctx.lineTo(10,512); ctx.lineTo(-40,512); ctx.fill();
    const glassTex=new THREE.CanvasTexture(c);
    const glass=new THREE.Mesh(new THREE.ShapeGeometry(innerShape,40),
      new THREE.MeshPhongMaterial({map:glassTex,specular:0xE9CC7E,shininess:250}));
    glass.position.z=.06;
    // moving sheen bar inside glass
    const sc=document.createElement('canvas'); sc.width=128; sc.height=16;
    const sctx=sc.getContext('2d'); const sg=sctx.createLinearGradient(0,0,128,0);
    sg.addColorStop(0,'rgba(244,226,154,0)'); sg.addColorStop(.5,'rgba(244,226,154,0.45)'); sg.addColorStop(1,'rgba(244,226,154,0)');
    sctx.fillStyle=sg; sctx.fillRect(0,0,128,16);
    const sheen=new THREE.Mesh(new THREE.PlaneGeometry(.5,3.6),
      new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
    sheen.position.z=.08; sheen.rotation.z=.18;
    g.userData.sheen=sheen; g.add(sheen);
    // bulbs around frame
    const glowC=document.createElement('canvas'); glowC.width=glowC.height=64;
    const gctx=glowC.getContext('2d'); const rad=gctx.createRadialGradient(32,32,2,32,32,30);
    rad.addColorStop(0,'rgba(255,236,190,0.9)'); rad.addColorStop(.4,'rgba(255,224,150,0.28)'); rad.addColorStop(1,'rgba(255,224,150,0)');
    gctx.fillStyle=rad; gctx.fillRect(0,0,64,64);
    const glowTex=new THREE.CanvasTexture(glowC);
    const bulbPts=roundedRect(2.35,4.15,.5).getSpacedPoints(26);
    const bulbs=[];
    bulbPts.forEach((p,i)=>{
      if(i%1!==0) return;
      const b=new THREE.Mesh(new THREE.SphereGeometry(.05,10,10),
        new THREE.MeshBasicMaterial({color:0xFFE9B8}));
      b.position.set(p.x,p.y,.24);
      const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,opacity:.85,depthWrite:false}));
      spr.scale.set(.42,.42,1); spr.position.copy(b.position); spr.position.z=.26;
      g.add(b,spr); bulbs.push({b,spr,ph:Math.random()*Math.PI*2});
    });
    g.userData.bulbs=bulbs;
    // plinth
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.7,.22,.9),
      new THREE.MeshPhongMaterial({color:0x141210,shininess:30}));
    plinth.position.y=-2.3;
    const trim=new THREE.Mesh(new THREE.BoxGeometry(1.74,.035,.94),
      new THREE.MeshPhongMaterial({color:0x8A6A22,specular:0xF4E29A,shininess:80}));
    trim.position.y=-2.18;
    g.add(frame,glass,plinth,trim);
    return g;
  }

  const booth=buildBooth();
  booth.position.y=.35;
  scene.add(booth);

  // faint reflection below
  const refl=buildBooth();
  refl.scale.y=-1; refl.position.y=-4.45;
  refl.traverse(o=>{ if(o.material){ o.material=o.material.clone(); o.material.transparent=true; o.material.opacity=.07; }});
  scene.add(refl);

  // floor glow
  const fc=document.createElement('canvas'); fc.width=fc.height=256;
  const fctx=fc.getContext('2d'); const frad=fctx.createRadialGradient(128,128,10,128,128,128);
  frad.addColorStop(0,'rgba(200,155,60,0.20)'); frad.addColorStop(.5,'rgba(200,155,60,0.06)'); frad.addColorStop(1,'rgba(200,155,60,0)');
  fctx.fillStyle=frad; fctx.fillRect(0,0,256,256);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(fc),transparent:true,depthWrite:false}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-2.05;
  scene.add(floor);

  // gold dust
  const count=mobile?260:650;
  const pGeo=new THREE.BufferGeometry(); const pos=new Float32Array(count*3);
  for(let i=0;i<count*3;i++) pos[i]=(Math.random()-.5)*15;
  pGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const particles=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xE9CC7E,size:.032,transparent:true,opacity:.5}));
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0xffffff,.42));
  const key=new THREE.PointLight(0xF4E29A,.75,60); key.position.set(4,4,6);
  const fill=new THREE.PointLight(0xffffff,.3,60); fill.position.set(-5,-2,4);
  scene.add(key,fill);

  let mx=0,my=0;
  document.addEventListener('mousemove',e=>{ mx=e.clientX/innerWidth-.5; my=e.clientY/innerHeight-.5; });

  const clock=new THREE.Clock();
  (function animate(){
    requestAnimationFrame(animate);
    const t=clock.getElapsedTime();
    // camera parallax (premium feel)
    camera.position.x += (mx*1.1 - camera.position.x)*.045;
    camera.position.y += (.4 - my*.7 - camera.position.y)*.045;
    camera.lookAt(0,0,0);
    booth.rotation.y += ((-.14 + mx*.28) - booth.rotation.y)*.05;
    refl.rotation.y = booth.rotation.y;
    booth.position.y = .35 + Math.sin(t*.8)*.05;
    // bulbs twinkle
    booth.userData.bulbs.forEach((o,i)=>{
      const s=.75+.25*Math.sin(t*2.2+o.ph);
      o.spr.material.opacity=.5+.4*s;
    });
    // sheen sweep
    booth.userData.sheen.position.x = Math.sin(t*.35)*1.1;
    particles.rotation.y=t*.028;
    renderer.render(scene,camera);
  })();

  addEventListener('resize',()=>{ camera.aspect=W()/H(); camera.updateProjectionMatrix(); renderer.setSize(W(),H()); });
  gsap.to(booth.rotation,{y:'-=.5',scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:1.2}});
  gsap.to('#mirror-canvas',{opacity:.12,scrollTrigger:{trigger:'#hero',start:'40% top',end:'bottom top',scrub:true}});
}

/* entry gate: tap -> zoom into the centre -> black -> the site */
const gate=document.getElementById('gate');
let entered=false;
function openCurtains(){
  gsap.to('.mask>span',{y:0,stagger:.14,duration:1,ease:'power4.out',delay:.15});
  gsap.from('.kick,.h-ctas,.h-scroll',{opacity:0,y:20,duration:.8,delay:.5,stagger:.15});
}
function enterSite(){
  if(entered) return; entered=true;
  gate.classList.add('go');
  const hold = reduced ? 120 : 1450;
  setTimeout(function(){
    document.documentElement.classList.remove('gated');
    if(window.initGallery) setTimeout(window.initGallery,60);
    window.scrollTo(0,0);
    if(window.ScrollTrigger) ScrollTrigger.refresh();
    openCurtains();
    gate.classList.add('out');
    setTimeout(function(){ gate.style.display='none'; },700);
  },hold);
}
document.getElementById('gateTap').addEventListener('click',enterSite);
gate.addEventListener('click',enterSite);
document.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' ') enterSite(); });
function typewriter(el,text,speed=24){
  if(reduced){ el.textContent=text; return; }
  let i=0; el.textContent='';
  const t=setInterval(()=>{ el.textContent+=text[i++]; if(i>=text.length) clearInterval(t); },speed);
}

/* split-word reveals for h2 */
document.querySelectorAll('h2.split').forEach(h=>{
  const html=h.innerHTML;
  // wrap plain words only when no nested em splitting complexity: simple fade-slide instead
  gsap.from(h,{opacity:0,y:40,duration:1,ease:'power3.out',scrollTrigger:{trigger:h,start:'top 84%'}});
});
gsap.utils.toArray('.s-kick').forEach(el=>{
  gsap.from(el,{opacity:0,y:20,duration:.8,scrollTrigger:{trigger:el,start:'top 88%'}});
});

/* ---------- story scenes ---------- */
/* 1: spotlight grows, silhouette appears */
const tl1=gsap.timeline({scrollTrigger:{trigger:'#step1',start:'top 65%'}});
tl1.to('#spot',{opacity:1,duration:1.1,ease:'power2.out'})
   .to('#sil',{opacity:1,duration:.8},'-=.4');
/* 2: bulbs light one by one, then name writes */
const mm=document.getElementById('miniMirror');
const positions=[];
for(let i=0;i<12;i++){ positions.push(i); const b=document.createElement('div'); b.className='bulb';
  const t=i/11;
  if(i<6){ b.style.left=(-7)+'px'; b.style.top=(18+i*42)+'px'; }
  else { b.style.right=(-7)+'px'; b.style.top=(18+(i-6)*42)+'px'; }
  mm.appendChild(b);
}
ScrollTrigger.create({trigger:'#step2',start:'top 65%',once:true,onEnter:()=>{
  document.querySelectorAll('#miniMirror .bulb').forEach((b,i)=>setTimeout(()=>b.classList.add('lit'),i*110));
  gsap.to('#mmWel',{opacity:1,duration:.7,delay:1.3});
  gsap.to('#mmName',{opacity:1,duration:1.1,delay:1.6,ease:'power2.out'});
  gsap.to('#mmShot',{opacity:.34,duration:1.4,delay:2.2,ease:'power2.out'});
}});
/* 3: flash + polaroid fan + counter */
ScrollTrigger.create({trigger:'#step3',start:'top 62%',once:true,onEnter:()=>{
  gsap.fromTo('#flash',{opacity:0},{opacity:.95,duration:.09,yoyo:true,repeat:1});
  gsap.fromTo('#p1',{rotation:0,y:40,opacity:0},{rotation:-14,x:-46,y:0,opacity:1,duration:.9,delay:.18,ease:'back.out(1.4)'});
  gsap.fromTo('#p2',{rotation:0,y:40,opacity:0},{rotation:1,y:-12,opacity:1,duration:.9,delay:.30,ease:'back.out(1.4)'});
  gsap.fromTo('#p3',{rotation:0,y:40,opacity:0},{rotation:15,x:46,y:0,opacity:1,duration:.9,delay:.42,ease:'back.out(1.4)'});
  let n=0; const t=setInterval(()=>{ n+=7; if(n>=247){n=247;clearInterval(t);} document.getElementById('phCount').textContent=n+' '+T('photos'); },40);
}});
/* 4: strip prints downward, scrubbed */
gsap.fromTo('#strip',{y:'-100%'},{y:'8%',ease:'none',
  scrollTrigger:{trigger:'#step4',start:'top 75%',end:'top 20%',scrub:1}});

/* ---------- horizontal gallery pin ---------- */
/* Gallery pins and slides sideways while you scroll, on every screen width (phones too).
   Set up once the entry screen is gone, so the page height is real. */
window.initGallery=function(){
  if(window.__galleryMode) return;
  const track=document.getElementById('gtrack');
  if(!track || !(window.gsap && gsap.version && window.ScrollTrigger)) return;
  window.__galleryMode='pin';
  const travel=()=>Math.max(0,track.scrollWidth-innerWidth+40);
  gsap.to(track,{x:()=>-travel(),ease:'none',
    scrollTrigger:{trigger:'#gpin',start:'top top',end:()=>'+='+Math.max(300,travel()+300),scrub:1,pin:true,invalidateOnRefresh:true}});
  ScrollTrigger.refresh();
};

/* quote word reveal */
const q=document.getElementById('qline');
q.innerHTML=q.textContent.split(' ').map(w=>`<span class="qw">${w}</span>`).join(' ');
gsap.to('#quote .qw',{opacity:1,stagger:.05,duration:.5,
  scrollTrigger:{trigger:'#quote',start:'top 70%',end:'top 25%',scrub:1}});

/* counters */
function countUp(el,target){ let c=0; const inc=Math.max(1,target/50);
  const t=setInterval(()=>{ c+=inc; if(c>=target){c=target;clearInterval(t);} el.textContent=Math.floor(c); },24); }
ScrollTrigger.create({trigger:'.stats',start:'top 82%',once:true,
  onEnter:()=>document.querySelectorAll('[data-count]').forEach(el=>countUp(el,+el.dataset.count))});
gsap.from('.stat',{opacity:0,y:36,stagger:.1,duration:.8,scrollTrigger:{trigger:'.stats',start:'top 84%'}});

/* pricing reveals + tilt */
gsap.from('.tier',{opacity:0,y:60,stagger:.14,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.tiers',start:'top 78%'}});
gsap.from('.more,.baq',{opacity:0,y:30,stagger:.12,duration:.8,scrollTrigger:{trigger:'.more-rows',start:'top 86%'}});
if(!mobile) document.querySelectorAll('.card-3d').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const r=card.getBoundingClientRect();
    const dx=(e.clientX-r.left)/r.width-.5, dy=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`perspective(900px) rotateX(${-dy*6}deg) rotateY(${dx*6}deg) translateZ(6px)`;
  });
  card.addEventListener('mouseleave',()=>card.style.transform='');
});

/* book reveal */
gsap.from('#book .kick,#book h2,#book .bk-steps,#book .bk-wrap',{opacity:0,y:36,stagger:.12,duration:.9,
  scrollTrigger:{trigger:'#book',start:'top 68%'}});

/* outline text parallax */
gsap.utils.toArray('.outline-t').forEach(el=>{
  gsap.to(el,{x:-60,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:1}});
});
