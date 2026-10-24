/* Periodic Playground — app logic: layouts, 3D stage, legend, modal atom, quiz, effects */
(() => {
const RAW = PP.RAW, FAM = PP.FAM, STATES = PP.STATES, sets = PP.sets;
function famOf(z){
  for (const k in sets) if (sets[k].includes(z)) return k;
  if (z>=57&&z<=71) return 'lanth';
  if (z>=89&&z<=103) return 'act';
  return 'transition';
}
function stateOf(z){
  if ([1,2,7,8,9,10,17,18,36,54,86].includes(z)) return 'gas';
  if (z===35||z===80) return 'liquid';
  if (z>=100) return 'unknown';
  return 'solid';
}
function posOf(z){
  const ends=[2,10,18,36,54,86,118]; let p=0; while(z>ends[p]) p++;
  const start = p ? ends[p-1]+1 : 1, i = z-start, per = p+1;
  if (per===1) return {row:1,col:z===1?1:18};
  if (per<=3) return {row:per,col:i<2?i+1:i+11};
  if (per<=5) return {row:per,col:i+1};
  if (i<2) return {row:per,col:i+1};
  if (i<=16) return {row:per+2.5,col:i+1};
  return {row:per,col:i-13};
}
// electron configuration (Madelung order, a few known exceptions)
const ORDER=['1s','2s','2p','3s','3p','4s','3d','4p','5s','4d','5p','6s','4f','5d','6p','7s','5f','6d','7p'];
const CAP={s:2,p:6,d:10,f:14};
const EXC={24:{'4s':1,'3d':5},29:{'4s':1,'3d':10},42:{'5s':1,'4d':5},46:{'5s':0,'4d':10},47:{'5s':1,'4d':10},79:{'6s':1,'5d':10}};
function config(z){
  let left=z; const c={};
  for(const o of ORDER){ if(left<=0) break; const n=Math.min(CAP[o[1]],left); c[o]=n; left-=n; }
  if (EXC[z]) Object.assign(c,EXC[z]);
  return c;
}
const SUP='⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup=n=>String(n).split('').map(d=>SUP[d]).join('');
function shellsOf(c){ const s=[]; for(const k in c){ const n=+k[0]; s[n-1]=(s[n-1]||0)+c[k]; } return Array.from(s,v=>v||0); }
function confStr(z){
  const c=config(z); const nob=[86,54,36,18,10,2].find(n=>n<z);
  let pre='', base={};
  if(nob){ base=config(nob); pre='['+EL[nob-1].sym+'] '; }
  return pre+ORDER.filter(o=>c[o] && c[o]!==base[o]).map(o=>o+sup(c[o])).join(' ');
}

const EL = RAW.map((line,i)=>{
  const [sym,name,mass,emo,ex]=line.split('|'); const z=i+1;
  return {z,sym,name,massStr:mass,mass:parseFloat(mass),synthetic:!mass.includes('.'),emo,ex,fam:famOf(z),state:stateOf(z),...posOf(z)};
});

const $=s=>document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=$('#scene'), stage=$('#stage');
const PX=70, PY=82;

/* ---------- build tiles ---------- */
const tiles=[];
EL.forEach(e=>{
  const t=document.createElement('div');
  t.className='tile'; t.tabIndex=0; t.setAttribute('role','button');
  t.setAttribute('aria-label',`${e.name}, ${e.sym}, number ${e.z}`);
  t.dataset.z=e.z;
  t.innerHTML=`<div class="face"><div class="num">${e.z}<span>${e.state==='gas'?'g':e.state==='liquid'?'l':''}</span></div><div class="sym">${e.sym}</div><div><div class="nm${e.name.length>10?' long':''}">${e.name}</div><div class="ms">${e.synthetic?'('+e.massStr+')':(+e.mass).toFixed(e.mass<100?3:2)}</div></div></div>`;
  scene.appendChild(t); tiles.push(t); e.el=t;
});
const ph=[{row:6,col:3,txt:'57–71',fam:'lanth'},{row:7,col:3,txt:'89–103',fam:'act'}].map(p=>{
  const t=document.createElement('div'); t.className='tile ph'; t.setAttribute('aria-hidden','true');
  t.style.setProperty('--c',`var(${FAM[p.fam].v})`);
  t.innerHTML=`<div class="face">${p.txt}</div>`; scene.appendChild(t); p.el=t; return p;
});
const peek=document.createElement('div'); peek.className='peek';
peek.innerHTML=`<div class="p-tile" id="pTile"><span class="n"></span><span class="s"></span><span class="m"></span></div><div class="p-body"><span class="p-cat" id="pCat"></span><div class="p-name" id="pName"></div><p class="p-ex" id="pEx"></p><p class="p-tip" id="pTip"></p></div>`;
scene.appendChild(peek);

/* ---------- layouts ---------- */
const tableXY=(row,col)=>({x:(col-9.5)*PX,y:(row-5.25)*PY,z:0,ry:0,rx:0});
const N=EL.length, GA=Math.PI*(3-Math.sqrt(5));
const LAYOUT={
  table:i=>tableXY(EL[i].row,EL[i].col),
  sphere:i=>{ const R=430, lat=Math.asin(1-2*(i+.5)/N), lon=i*GA;
    return {x:R*Math.cos(lat)*Math.sin(lon), y:-R*Math.sin(lat), z:R*Math.cos(lat)*Math.cos(lon), ry:lon*180/Math.PI, rx:lat*180/Math.PI}; },
  helix:i=>{ const a=i*(2*Math.PI/18), R=520; return {x:R*Math.sin(a), y:(i-N/2)*5.3, z:R*Math.cos(a), ry:a*180/Math.PI, rx:0}; },
  cube:i=>({x:(i%5-2)*150, y:(Math.floor(i/5)%5-2)*140, z:(Math.floor(i/25)-2)*220, ry:0, rx:0})
};
const NEED={table:[1290,880],sphere:[1000,1000],helix:[1150,820],cube:[900,900]};
const tf=p=>`translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,${p.z.toFixed(1)}px) rotateY(${p.ry.toFixed(2)}deg) rotateX(${p.rx.toFixed(2)}deg)`;

let view='table', fit=1, zoom=1, panX=0, panY=0, rx=0, ry=0, trx=0, tryy=0, tableBase=0, par={x:0,y:0}, dragging=false;

function sizeStage(){
  const w=stage.clientWidth;
  const fw=Math.min(1,(w-20)/NEED.table[0]);
  let h=NEED.table[1]*fw+20;
  if(view!=='table') h=Math.max(h,Math.min(innerHeight*.74,780));
  h=Math.max(h,300);
  stage.style.height=h+'px';
  const [nw,nh]=NEED[view];
  fit=Math.min((w-20)/nw,(h-20)/nh,1.05);
}
function applyLayout(stagger){
  tiles.forEach((t,i)=>{
    t.style.transitionDelay = stagger ? (stagger==='intro' ? ((EL[i].col*22)+(EL[i].row*30))+'ms' : (i*4)+'ms') : '0ms';
    t.style.transform=tf(LAYOUT[view](i));
  });
  const isT=view==='table';
  ph.forEach(p=>{ p.el.style.transform=tf(isT?tableXY(p.row,p.col):{x:0,y:0,z:-1600,ry:0,rx:0}); p.el.classList.toggle('off',!isT); });
  const pc=tableXY(2,7.5);
  peek.style.transform = isT ? `translate3d(${pc.x}px,${pc.y}px,0)` : `translate3d(0,0,-2000px) scale(.3)`;
  peek.classList.toggle('off',!isT);
  $('#hint').textContent = isT ? 'Drag to move around. Hover a tile to peek.' : 'Drag to spin it. Click any tile to open it.';
}
function setView(v){
  view=v; document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));
  zoom=1; panX=panY=0;
  if(v==='table'){ tableBase=Math.round(ry/360)*360; trx=0; tryy=tableBase; }
  else { trx=-14; tryy=ry+40; }
  sizeStage(); applyLayout(true);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));

// intro: scatter then fly in
tiles.forEach(t=>{ t.style.transition='none'; t.style.transform=`translate3d(${(Math.random()-.5)*3000}px,${(Math.random()-.5)*2000}px,${-2500+Math.random()*3000}px) rotateY(${Math.random()*720}deg) rotateX(${Math.random()*360}deg)`; });
sizeStage();
requestAnimationFrame(()=>requestAnimationFrame(()=>{
  tiles.forEach(t=>t.style.transition='');
  applyLayout(reduce?false:'intro');
  setTimeout(()=>tiles.forEach(t=>t.style.transitionDelay='0ms'),2200);
}));
addEventListener('resize',()=>sizeStage());

function loop(){
  if(view!=='table' && !dragging && !reduce) tryy+=0.14;
  if(view==='table'){ trx=-par.y*5; tryy=tableBase+par.x*6; }
  rx+=(trx-rx)*.08; ry+=(tryy-ry)*.08;
  const s=fit*zoom;
  scene.style.transform=`translate(${panX}px,${panY}px) scale3d(${s},${s},${s}) rotateX(${rx}deg) rotateY(${ry}deg)`;
  requestAnimationFrame(loop);
}
loop();

/* ---------- pointer: drag, parallax, tilt ---------- */
let down=null, suppressClick=false;
stage.addEventListener('pointerdown',e=>{ if(e.target.closest('.stage-ctrl')) return; down={x:e.clientX,y:e.clientY,px:panX,py:panY,ry:tryy,rx:trx,moved:false,id:e.pointerId}; });
stage.addEventListener('pointermove',e=>{
  const r=stage.getBoundingClientRect();
  par.x=((e.clientX-r.left)/r.width-.5)*2; par.y=((e.clientY-r.top)/r.height-.5)*2;
  if(down){
    const dx=e.clientX-down.x, dy=e.clientY-down.y;
    if(!down.moved && Math.hypot(dx,dy)>6){ down.moved=true; dragging=true; stage.classList.add('dragging'); try{stage.setPointerCapture(down.id)}catch(_){} }
    if(down.moved){
      if(view==='table'){ panX=down.px+dx; panY=down.py+dy; }
      else { tryy=down.ry+dx*.35; trx=Math.max(-70,Math.min(70,down.rx-dy*.35)); }
    }
  }
  const t=e.target.closest('.tile:not(.ph)');
  if(t){ const b=t.getBoundingClientRect(); const fx=(e.clientX-b.left)/b.width-.5, fy=(e.clientY-b.top)/b.height-.5;
    t.firstChild.style.setProperty('--ty',(fx*30)+'deg'); t.firstChild.style.setProperty('--tx',(-fy*30)+'deg'); }
});
const endDrag=()=>{ if(down&&down.moved){ suppressClick=true; setTimeout(()=>suppressClick=false,50);} down=null; dragging=false; stage.classList.remove('dragging'); };
stage.addEventListener('pointerup',endDrag); stage.addEventListener('pointercancel',endDrag);
stage.addEventListener('pointerleave',()=>{ if(!down){ par.x=par.y=0; } });
stage.addEventListener('wheel',e=>{ if(e.ctrlKey||view!=='table'&&e.altKey){ e.preventDefault(); zoom=Math.max(.4,Math.min(4,zoom*(e.deltaY<0?1.1:.9))); } },{passive:false});
$('#zin').onclick=()=>zoom=Math.min(4,zoom*1.3);
$('#zout').onclick=()=>zoom=Math.max(.4,zoom/1.3);
$('#zreset').onclick=()=>{ zoom=1; panX=panY=0; if(view!=='table'){trx=-14;} };

scene.addEventListener('click',e=>{
  if(suppressClick) return;
  const t=e.target.closest('.tile:not(.ph)'); if(!t) return;
  const z=+t.dataset.z;
  if(quiz) return quizPick(z,t);
  openModal(z);
});
scene.addEventListener('keydown',e=>{ const t=e.target.closest('.tile:not(.ph)'); if(t&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); quiz?quizPick(+t.dataset.z,t):openModal(+t.dataset.z);} });
scene.addEventListener('pointerover',e=>{ const t=e.target.closest('.tile:not(.ph)'); if(t) setPeek(EL[t.dataset.z-1]); });
scene.addEventListener('focusin',e=>{ const t=e.target.closest('.tile:not(.ph)'); if(t) setPeek(EL[t.dataset.z-1]); });

/* ---------- colors ---------- */
let colorMode='family';
function colorFor(e){
  if(colorMode==='family') return `var(${FAM[e.fam].v})`;
  if(colorMode==='state') return `var(${STATES[e.state].v})`;
  const t=Math.log(e.mass)/Math.log(295);
  const h=160-t*250, hh=(h+360)%360;
  return `hsl(${hh.toFixed(0)} 82% ${68+Math.sin(t*3)*4}%)`;
}
function recolor(){ EL.forEach(e=>e.el.style.setProperty('--c',colorFor(e))); buildLegend(); setPeek(lastPeek); }
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{ colorMode=b.dataset.color; document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',x===b)); locked=null; recolor(); highlight(); });

/* ---------- legend + highlight ---------- */
let hover=null, locked=null;
const legend=$('#legend');
function buildLegend(){
  legend.innerHTML='';
  const note=document.createElement('p'); note.className='legend-note';
  if(colorMode==='mass'){
    legend.innerHTML=`<span class="chip" style="cursor:default">Light <span class="gradbar"></span> Heavy</span>`;
    note.innerHTML='<strong>Weight.</strong> Mint tiles are featherweights like hydrogen; purple ones are giants like oganesson, about 290 times heavier.';
    legend.appendChild(note); return;
  }
  const src=colorMode==='family'?FAM:STATES, key=colorMode==='family'?'fam':'state';
  for(const k in src){
    const n=EL.filter(e=>e[key]===k).length;
    const c=document.createElement('button'); c.className='chip'; c.style.setProperty('--c',`var(${src[k].v})`);
    c.setAttribute('aria-pressed',locked===k); c.innerHTML=`<i></i>${src[k].label} <b>${n}</b>`;
    c.onmouseenter=()=>{hover=k; showNote(k); highlight();};
    c.onmouseleave=()=>{hover=null; showNote(locked); highlight();};
    c.onfocus=c.onmouseenter; c.onblur=c.onmouseleave;
    c.onclick=()=>{ locked=locked===k?null:k; legend.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x===c&&locked===k)); showNote(locked||k); highlight(); };
    legend.appendChild(c);
  }
  legend.appendChild(note);
  function showNote(k){ note.innerHTML = k ? `<strong>${src[k].label}.</strong> ${src[k].d}` : 'Hover a family to light it up. Click to keep it lit.'; }
  showNote(locked);
}
function highlight(){
  const q=$('#q').value.trim().toLowerCase();
  let match=null;
  if(q){ match=e=>e.sym.toLowerCase()===q||e.name.toLowerCase().includes(q)||String(e.z)===q||e.ex.toLowerCase().includes(q); }
  else { const k=hover||locked; if(k&&colorMode!=='mass'){ const key=colorMode==='family'?'fam':'state'; match=e=>e[key]===k; } }
  EL.forEach(e=>{ const m=match?match(e):null; e.el.classList.toggle('hi',m===true); e.el.classList.toggle('dim',m===false); });
}
$('#q').addEventListener('input',highlight);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const h=EL.find(x=>x.el.classList.contains('hi')); if(h) openModal(h.z);} });

/* ---------- peek ---------- */
let lastPeek=null;
function setPeek(e){
  lastPeek=e;
  const pt=$('#pTile');
  if(!e){
    pt.style.setProperty('--c','var(--pop)');
    pt.querySelector('.n').textContent='?'; pt.querySelector('.s').textContent='Hi!'; pt.querySelector('.m').textContent='';
    $('#pCat').textContent='Welcome'; $('#pCat').style.setProperty('--c','var(--pop)');
    $('#pName').textContent='Pick an element';
    $('#pEx').innerHTML='<span class="emo">👆</span> Hover any tile to see where you meet it in real life.';
    $('#pTip').textContent='Click a tile to watch its atom spin.'; return;
  }
  pt.style.setProperty('--c',colorFor(e));
  pt.querySelector('.n').textContent=e.z; pt.querySelector('.s').textContent=e.sym; pt.querySelector('.m').textContent=e.synthetic?`(${e.massStr})`:e.massStr;
  $('#pCat').textContent=FAM[e.fam].label; $('#pCat').style.setProperty('--c',`var(${FAM[e.fam].v})`);
  $('#pName').textContent=e.name;
  $('#pEx').innerHTML=`<span class="emo">${e.emo}</span><span>${e.ex}</span>`;
  $('#pTip').textContent=`${STATES[e.state].label} at room temperature · ${shellsOf(config(e.z)).length} electron shells · click to open`;
}

/* ---------- modal + atom ---------- */
const modal=$('#modal'), card=$('#card'), cv=$('#atom'), ctx=cv.getContext('2d');
let cur=null, atomRAF=0, A={ax:-.4,ay:0,dragging:false,excite:0,photons:[],nuc:[],last:0};
function openModal(z,dir){
  cur=EL[z-1]; const e=cur;
  card.style.setProperty('--c',colorFor(e)==='var(--c-unknown)'?'var(--c-unknown)':`var(${FAM[e.fam].v})`);
  if(colorMode!=='family') card.style.setProperty('--c',colorFor(e));
  const t=$('#mTile'); t.querySelector('.n').textContent=e.z; t.querySelector('.s').textContent=e.sym; t.querySelector('.m').textContent=e.synthetic?`(${e.massStr})`:e.massStr;
  $('#mCat').textContent=FAM[e.fam].label; $('#mCat').style.setProperty('--c',`var(${FAM[e.fam].v})`);
  $('#mName').textContent=e.name; $('#mEmo').textContent=e.emo; $('#mEx').textContent=e.ex;
  const neu=Math.round(e.mass)-e.z;
  const grp = e.row>7 ? 'f-block' : e.col;
  $('#mStats').innerHTML=`<div><dt>Atomic mass</dt><dd>${e.synthetic?'('+e.massStr+')':e.massStr} u</dd></div>
    <div class="p"><dt>Protons</dt><dd>${e.z}</dd></div><div class="ne"><dt>Neutrons</dt><dd>${neu}</dd></div>
    <div class="e"><dt>Electrons</dt><dd>${e.z}</dd></div><div><dt>State</dt><dd>${STATES[e.state].label}</dd></div>
    <div><dt>Period · Group</dt><dd>${Math.round(e.row>7?e.row-2.5:e.row)} · ${grp}</dd></div>`;
  const sh=shellsOf(config(e.z));
  $('#mShells').innerHTML=sh.map((n,i)=>`<span class="shell" style="animation-delay:${i*90}ms"><b>${i+1}</b>${n} e⁻</span>`).join('');
  $('#mConf').textContent=confStr(e.z);
  buildAtom(e);
  if(modal.hidden){ modal.hidden=false; card.classList.remove('turnL','turnR'); card.style.animation='none'; card.offsetWidth; card.style.animation=''; startAtom(); $('.x').focus({preventScroll:true}); }
  else if(dir){ card.classList.remove('turnL','turnR'); card.offsetWidth; card.classList.add(dir>0?'turnR':'turnL'); }
  burst(innerWidth/2, innerHeight/2, 26, true);
}
function closeModal(){ modal.hidden=true; cancelAnimationFrame(atomRAF); if(cur) cur.el.focus({preventScroll:true}); }
modal.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeModal(); });
$('#prev').onclick=()=>openModal(cur.z===1?118:cur.z-1,-1);
$('#next').onclick=()=>openModal(cur.z===118?1:cur.z+1,1);
addEventListener('keydown',e=>{ if(modal.hidden) return; if(e.key==='Escape') closeModal(); if(e.key==='ArrowRight') $('#next').click(); if(e.key==='ArrowLeft') $('#prev').click(); });
const canSpeak='speechSynthesis' in window;
if(!canSpeak) $('#say').hidden=true;
$('#say').onclick=()=>{ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(`${cur.name}. Number ${cur.z}.`); u.rate=.9; u.pitch=1.15; speechSynthesis.speak(u);}catch(_){ toast("Your browser can't speak right now."); } };

function buildAtom(e){
  const neu=Math.max(0,Math.round(e.mass)-e.z);
  const total=Math.min(e.z+neu,70), pRatio=e.z/(e.z+neu||1);
  const R=Math.cbrt(total)*6.2;
  A.nuc=[]; for(let i=0;i<total;i++){ // fibonacci ball in sphere
    const r=R*Math.cbrt((i+.5)/total), la=Math.asin(1-2*((i*0.618)%1)), lo=i*GA;
    A.nuc.push({x:r*Math.cos(la)*Math.cos(lo),y:r*Math.sin(la),z:r*Math.cos(la)*Math.sin(lo),p:Math.random()<pRatio,ph:Math.random()*6});
  }
  A.shells=shellsOf(config(e.z)).map((n,k)=>({n,tx:.35+k*.62,ty:k*1.13,sp:(1.3-k*.12)*(k%2?-1:1)}));
  A.excite=.8; A.photons=[];
}
function rot(p,ax,ay){ // rotate around X then Y
  let {x,y,z}=p; let c=Math.cos(ax),s=Math.sin(ax); [y,z]=[y*c-z*s,y*s+z*c];
  c=Math.cos(ay); s=Math.sin(ay); [x,z]=[x*c+z*s,-x*s+z*c]; return {x,y,z};
}
function startAtom(){
  const fit=()=>{ const d=devicePixelRatio||1, w=cv.clientWidth; cv.width=w*d; cv.height=w*d; ctx.setTransform(d,0,0,d,0,0); A.size=w; };
  fit(); if(!A.ro){ A.ro=new ResizeObserver(fit); A.ro.observe(cv); }
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const P=css('--c-alkali'), Nn=css('--c-transition'), E=css('--pop');
  const tick=ts=>{
    const t=ts/1000, S=A.size||300, cx=S/2, cy=S/2;
    if(!A.dragging && !reduce) A.ay+=0.006;
    A.excite*=0.965;
    ctx.clearRect(0,0,S,S);
    const ringCol=getComputedStyle(card).getPropertyValue('--c').trim()||'#fff';
    const nsh=A.shells.length, rmin=S*0.14, rmax=S*0.46;
    const proj=p=>{ const q=rot(p,A.ax,A.ay); const f=700/(700+q.z); return {x:cx+q.x*f,y:cy+q.y*f,z:q.z,f}; };
    const electrons=[];
    A.shells.forEach((sh,k)=>{
      const r=(nsh===1?rmin*1.4:rmin+(rmax-rmin)*k/(nsh-1))*(1+A.excite*.35);
      const shellPt=a=>{ let p={x:r*Math.cos(a),y:r*Math.sin(a),z:0}; let c=Math.cos(sh.tx),s=Math.sin(sh.tx); p={x:p.x,y:p.y*c,z:p.y*s}; c=Math.cos(sh.ty); s=Math.sin(sh.ty); return {x:p.x*c+p.z*s,y:p.y,z:-p.x*s+p.z*c}; };
      ctx.beginPath();
      for(let i=0;i<=72;i++){ const q=proj(shellPt(i/72*Math.PI*2)); i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y); }
      ctx.strokeStyle=ringCol; ctx.globalAlpha=.28+A.excite*.5; ctx.lineWidth=1.4; ctx.stroke(); ctx.globalAlpha=1;
      const spd=reduce?0:sh.sp*(1+A.excite*4);
      for(let j=0;j<sh.n;j++){ const q=proj(shellPt(t*spd+j*Math.PI*2/sh.n)); electrons.push(q);
        if(A.excite>.3 && Math.random()<.04) A.photons.push({x:q.x,y:q.y,vx:(q.x-cx)*.03+(Math.random()-.5),vy:(q.y-cy)*.03+(Math.random()-.5),life:1,h:Math.random()*360}); }
    });
    const drawE=q=>{ const r=Math.max(1.8,3.6*q.f); ctx.beginPath(); ctx.arc(q.x,q.y,r*2.4,0,7); ctx.fillStyle='rgba(255,212,59,.18)'; ctx.fill(); ctx.beginPath(); ctx.arc(q.x,q.y,r,0,7); ctx.fillStyle=E; ctx.fill(); };
    electrons.filter(q=>q.z>0).forEach(drawE);
    // nucleus
    const nb=A.nuc.map(n=>{ const j=Math.sin(t*6+n.ph)*.6*(1+A.excite*3); return {...proj({x:n.x+j,y:n.y-j,z:n.z}),p:n.p}; }).sort((a,b)=>b.z-a.z);
    const br=Math.max(3.2,S*0.016);
    nb.forEach(n=>{ const r=br*n.f; const g=ctx.createRadialGradient(n.x-r*.35,n.y-r*.35,r*.1,n.x,n.y,r); g.addColorStop(0,'#fff'); g.addColorStop(.35,n.p?P:Nn); g.addColorStop(1,'rgba(0,0,0,.35)'); ctx.beginPath(); ctx.arc(n.x,n.y,r,0,7); ctx.fillStyle=g; ctx.fill(); });
    electrons.filter(q=>q.z<=0).forEach(drawE);
    // photons
    A.photons=A.photons.filter(p=>(p.life-=0.02)>0);
    A.photons.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; ctx.beginPath(); ctx.arc(p.x,p.y,3*p.life+1,0,7); ctx.fillStyle=`hsla(${p.h},95%,70%,${p.life})`; ctx.fill(); });
    atomRAF=requestAnimationFrame(tick);
  };
  cancelAnimationFrame(atomRAF); atomRAF=requestAnimationFrame(tick);
}
let ad=null;
cv.addEventListener('pointerdown',e=>{ ad={x:e.clientX,y:e.clientY,ax:A.ax,ay:A.ay,m:false}; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove',e=>{ if(!ad) return; const dx=e.clientX-ad.x,dy=e.clientY-ad.y; if(Math.hypot(dx,dy)>4){ad.m=true;A.dragging=true;} if(ad.m){A.ay=ad.ay+dx*.01;A.ax=Math.max(-1.4,Math.min(1.4,ad.ax+dy*.01));} });
cv.addEventListener('pointerup',e=>{ if(ad&&!ad.m){ A.excite=1; const r=cv.getBoundingClientRect(); burst(e.clientX,e.clientY,18); } ad=null; A.dragging=false; });

/* ---------- confetti / fx ---------- */
const fx=$('#fx'), fctx=fx.getContext('2d'); let parts=[], fxOn=false;
function sizeFx(){ const d=devicePixelRatio||1; fx.width=innerWidth*d; fx.height=innerHeight*d; fctx.setTransform(d,0,0,d,0,0); }
sizeFx(); addEventListener('resize',sizeFx);
const CANDY=['#ff6b6b','#ffa94d','#ffe066','#63e6be','#5cb8ff','#b197fc','#f783ac','#c0eb75'];
function burst(x,y,n=40,soft){
  if(reduce) return;
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=(soft?3:5)+Math.random()*(soft?5:9);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(soft?2:4),r:Math.random()*Math.PI,vr:(Math.random()-.5)*.4,s:4+Math.random()*6,c:CANDY[i%8],life:1,sh:Math.random()<.5}); }
  if(!fxOn){ fxOn=true; requestAnimationFrame(fxTick); }
}
function fxTick(){
  fctx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>(p.life-=.012)>0 && p.y<innerHeight+20);
  parts.forEach(p=>{ p.vy+=.25; p.vx*=.98; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
    fctx.save(); fctx.translate(p.x,p.y); fctx.rotate(p.r); fctx.globalAlpha=Math.min(1,p.life*1.5); fctx.fillStyle=p.c;
    if(p.sh) fctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); else { fctx.beginPath(); fctx.arc(0,0,p.s/2.4,0,7); fctx.fill(); }
    fctx.restore(); });
  if(parts.length) requestAnimationFrame(fxTick); else { fxOn=false; fctx.clearRect(0,0,innerWidth,innerHeight); }
}

/* ---------- background bubbles & molecules ---------- */
const bg=$('#bg'), bctx=bg.getContext('2d'); let bubbles=[], mouse={x:0,y:0};
function sizeBg(){ const d=Math.min(devicePixelRatio||1,2); bg.width=innerWidth*d; bg.height=innerHeight*d; bctx.setTransform(d,0,0,d,0,0);
  bubbles=Array.from({length:Math.round(innerWidth/38)},(_,i)=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:3+Math.random()*18,v:.15+Math.random()*.5,c:CANDY[i%8],d:.3+Math.random(),mol:i%6===0,a:Math.random()*6})); }
sizeBg(); addEventListener('resize',sizeBg);
addEventListener('pointermove',e=>{ mouse.x=e.clientX/innerWidth-.5; mouse.y=e.clientY/innerHeight-.5; });
function bgTick(){
  bctx.clearRect(0,0,innerWidth,innerHeight);
  bubbles.forEach(b=>{
    if(!reduce){ b.y-=b.v; b.a+=.01; if(b.y<-40){ b.y=innerHeight+40; b.x=Math.random()*innerWidth; } }
    const x=b.x-mouse.x*40*b.d, y=b.y-mouse.y*40*b.d;
    bctx.globalAlpha=.16*b.d;
    if(b.mol){ const L=b.r*1.8; const pts=[[0,0],[Math.cos(b.a)*L,Math.sin(b.a)*L],[Math.cos(b.a+2.1)*L,Math.sin(b.a+2.1)*L]];
      bctx.strokeStyle=b.c; bctx.lineWidth=2; bctx.beginPath(); pts.slice(1).forEach(p=>{bctx.moveTo(x,y);bctx.lineTo(x+p[0],y+p[1]);}); bctx.stroke();
      pts.forEach((p,i)=>{ bctx.beginPath(); bctx.arc(x+p[0],y+p[1],i?b.r*.45:b.r*.7,0,7); bctx.fillStyle=i?'#fff7ec':b.c; bctx.fill(); }); }
    else { bctx.beginPath(); bctx.arc(x,y,b.r,0,7); bctx.fillStyle=b.c; bctx.fill(); }
  });
  bctx.globalAlpha=1;
  if(!reduce) requestAnimationFrame(bgTick);
}
bgTick();

/* ---------- quiz ---------- */
let quiz=null;
const POOL=EL.filter(e=>e.z<=56||[74,78,79,80,82,86,92,94].includes(e.z)).map(e=>e.z);
const qb=$('#quizbar');
function toast(msg){ document.querySelectorAll('.toast').forEach(t=>t.remove()); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
function startQuiz(){
  if(view!=='table') setView('table');
  $('#q').value=''; locked=null; hover=null; highlight();
  const picks=[...POOL].sort(()=>Math.random()-.5).slice(0,10);
  quiz={picks,i:0,score:0,streak:0,miss:0,hint:false};
  qb.hidden=false; renderQuiz();
  stage.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
}
function renderQuiz(){
  if(quiz.i>=quiz.picks.length){
    const stars=quiz.score>=9?'★★★':quiz.score>=6?'★★☆':'★☆☆';
    qb.innerHTML=`<div class="q">You found <em>${quiz.score}/10</em> <span style="color:var(--pop)">${stars}</span></div><span class="qhint">${quiz.score>=9?'Element master! Mendeleev would be proud.':quiz.score>=6?'Great work. One more round to beat it?':'Every chemist starts somewhere. Try again!'}</span><button class="candy" style="--c:var(--pop)" id="qAgain">Play again</button><button class="btn" id="qQuit">Done</button>`;
    $('#qAgain').onclick=startQuiz; $('#qQuit').onclick=endQuiz;
    burst(innerWidth/2,innerHeight/3,120); return;
  }
  const e=EL[quiz.picks[quiz.i]-1];
  qb.innerHTML=`<div class="q">Find <em>${e.name}</em></div><span class="qstat">Round <b>${quiz.i+1}</b>/10 · Score <b>${quiz.score}</b> · Streak <b>${quiz.streak}</b>${quiz.streak>=3?' 🔥':''}</span><span class="qhint" id="qHint">${quiz.hint?`${e.emo} ${e.ex}`:''}</span><button class="btn" id="qH">${quiz.hint?'Hint shown':'Hint'}</button><button class="btn" id="qQuit">Quit</button>`;
  $('#qH').onclick=()=>{ quiz.hint=true; renderQuiz(); };
  $('#qQuit').onclick=endQuiz;
}
function quizPick(z,t){
  const target=quiz.picks[quiz.i]; if(!target) return;
  if(z===target){
    const b=t.getBoundingClientRect(); burst(b.left+b.width/2,b.top+b.height/2,60);
    t.classList.remove('win'); t.offsetWidth; t.classList.add('win'); setTimeout(()=>t.classList.remove('win'),900);
    quiz.score+=quiz.miss?0:1; quiz.streak=quiz.miss?0:quiz.streak+1;
    toast(quiz.miss?`There it is: ${EL[z-1].name} (${EL[z-1].sym})`:['Nailed it!','Boom! Correct!','Science genius!','Yes! You found it!'][Math.floor(Math.random()*4)]);
    quiz.i++; quiz.miss=0; quiz.hint=false; setTimeout(renderQuiz,500);
  } else {
    quiz.miss++; quiz.streak=0;
    t.classList.remove('shake'); t.offsetWidth; t.classList.add('shake'); setTimeout(()=>t.classList.remove('shake'),500);
    const e=EL[z-1], tg=EL[target-1];
    toast(`That's ${e.name} (${e.sym}). ${tg.name} has number ${quiz.miss>=2?tg.z:(tg.z>z?'higher':'lower')}${quiz.miss>=2?'':' than '+z}.`);
    if(quiz.miss>=3){ tg.el.classList.add('hi'); setTimeout(()=>tg.el.classList.remove('hi'),1500); }
    renderQuiz();
  }
}
function endQuiz(){ quiz=null; qb.hidden=true; highlight(); }
$('#quizBtn').onclick=()=>quiz?endQuiz():startQuiz();

/* ---------- dice + tries ---------- */
$('#dice').onclick=()=>{
  if(quiz) return;
  const order=[...Array(12)].map(()=>EL[Math.floor(Math.random()*N)]);
  let k=0; const step=()=>{ EL.forEach(e=>e.el.classList.remove('hi')); const e=order[k]; e.el.classList.add('hi'); setPeek(e);
    if(++k<order.length) setTimeout(step,60+k*12); else setTimeout(()=>{ e.el.classList.remove('hi'); openModal(e.z); },350); };
  step();
};
document.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{
  const k=b.dataset.try;
  stage.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});
  if(k==='state'){ document.querySelector('[data-color="state"]').click(); locked='liquid'; buildLegend(); highlight(); }
  if(k==='noble'){ document.querySelector('[data-color="family"]').click(); locked='noble'; buildLegend(); highlight(); }
  if(k==='sphere') setView('sphere');
  if(k==='atom') setTimeout(()=>openModal(79),400);
});

recolor(); setPeek(null);
})();
