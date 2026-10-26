/* Icons v3: Ebenen als <img> im 1024er Raster, Transformationen in Prozent, echte 3D-Drehungen,
   darüber eine SVG-Zeichenebene für Tinte, Sandkörner, Dampf und Funken. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const lerp=(a,b,p)=>a+(b-a)*p;
function bez(x1,y1,x2,y2){ const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  const X=t=>((ax*t+bx)*t+cx)*t, Y=t=>((ay*t+by)*t+cy)*t, dX=t=>(3*ax*t+2*bx)*t+cx;
  return x=>{ if(x<=0) return 0; if(x>=1) return 1; let t=x; for(let i=0;i<8;i++){ const d=dX(t); if(Math.abs(d)<1e-6) break; t-=(X(t)-x)/d; } return Y(clamp(t)); }; }
const OUT=bez(.23,1,.32,1), MOVE=bez(.77,0,.175,1), INOUT=bez(.45,0,.55,1);
const spring=(p,f=1.5,d=6)=>p<=0?0:p>=1?1:1-Math.exp(-d*p)*Math.cos(2*Math.PI*f*p);
const bump=p=>Math.sin(Math.PI*clamp(p));
const wob=(p,n=2)=>Math.sin(Math.PI*2*n*clamp(p))*(1-clamp(p));
/* Wurf mit Aufprall: Höhe h, landet bei p=split, danach zwei kleiner werdende Hüpfer */
const hop=(p,h=1)=>{ if(p<.62){ const q=p/.62; return -h*4*q*(1-q); } if(p<.84){ const q=(p-.62)/.22; return -h*.22*4*q*(1-q); } const q=(p-.84)/.16; return -h*.06*4*q*(1-q); };
const NS="http://www.w3.org/2000/svg";
const pc=v=>(v/10.24).toFixed(3)+"%";

class Icon3{
  constructor(name,meta){
    this.n=name; this.meta=meta;
    const el=document.createElement("div"); el.className="ic3"; this.el=el;
    this.inner=document.createElement("div"); this.inner.className="ic3i"; el.appendChild(this.inner);
    this.L={}; this.ov=document.createElementNS(NS,"svg"); this.ov.setAttribute("viewBox","0 0 1024 1024"); this.ov.setAttribute("class","ov"); this.ov.setAttribute("aria-hidden","true");
    this.spec = CHOREO[name] ? CHOREO[name](this) : generic(this);
    this.inner.appendChild(this.ov);
    this.raf=null; this.reset();
  }
  layer(k,src,{under=false}={}){ const i=document.createElement("img"); i.src=`img/icon-${this.n}${src==="whole"?"":"__"+src}.webp`; i.alt=""; i.draggable=false; i.className="ly";
    this.inner.appendChild(i); this.L[k]={el:i,o:[512,512]}; return this.L[k]; }
  origin(k,x,y){ this.L[k].o=[x,y]; this.L[k].el.style.transformOrigin=`${pc(x)} ${pc(y)}`; }
  set(k,s={}){ const l=this.L[k]; if(!l) return; const e=l.el;
    const tf=[]; if(s.tx||s.ty) tf.push(`translate(${pc(s.tx||0)},${pc(s.ty||0)})`);
    if(s.rx) tf.push(`rotateX(${s.rx}deg)`); if(s.ry) tf.push(`rotateY(${s.ry}deg)`); if(s.rot) tf.push(`rotate(${s.rot}deg)`);
    if(s.sx!=null||s.sy!=null) tf.push(`scale(${s.sx??1},${s.sy??1})`);
    e.style.transform=tf.join(" ");
    e.style.opacity = s.op??1;
    e.style.clipPath = s.clip? `inset(${pc(s.clip[0])} ${pc(1024-s.clip[1])} ${pc(1024-s.clip[2])} ${pc(s.clip[3])})` : "";
    e.style.filter = s.br!=null? `brightness(${s.br})` : "";
    e.style.visibility = s.hide? "hidden":"visible"; }
  whole(s={}){ const e=this.inner; const tf=[]; if(s.tx||s.ty) tf.push(`translate(${pc(s.tx||0)},${pc(s.ty||0)})`); if(s.rot) tf.push(`rotate(${s.rot}deg)`); if(s.sx!=null||s.sy!=null) tf.push(`scale(${s.sx??1},${s.sy??1})`);
    e.style.transformOrigin=`${pc((s.o||[512,512])[0])} ${pc((s.o||[512,512])[1])}`; e.style.transform=tf.join(" "); e.style.opacity=s.op??1; }
  reset(){ cancelAnimationFrame(this.raf); this.raf=null; this.mode=null; this.whole(); this.spec.rest(); }
  dur(){ return this.spec.dur; }
  play(kind,speed=()=>1){
    this.reset(); this.mode=kind; const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t0=performance.now(), last=t0, t=0;
    const D=this.spec.dur, IN=.45, GAP=1.1;
    const step=now=>{ t+=(now-last)/1000*speed(); last=now;
      if(reduce){ const p=clamp(t/.3); this.whole({op:kind==="in"?p:1}); if(p<1) this.raf=requestAnimationFrame(step); else this.reset(); return; }
      if(kind==="in"){
        const e=OUT(clamp(t/IN)); this.whole({op:clamp(t/IN*1.6),ty:24*(1-e),sx:.92+.08*e,sy:.92+.08*e,o:[512,820]});
        if(t>IN*.6) this.spec.frame(t-IN*.6); else this.spec.rest();
        if(t<IN*.6+D) this.raf=requestAnimationFrame(step); else this.reset(); return; }
      if(kind==="loop"){ const c=t%(D+GAP); if(c<D) this.spec.frame(c); else this.spec.rest(); this.raf=requestAnimationFrame(step); return; }
      this.spec.frame(t); if(t<D) this.raf=requestAnimationFrame(step); else this.reset(); };
    this.raf=requestAnimationFrame(step); }
}

/* ---------- Hilfen für die Zeichenebene ---------- */
function svg(tag,attrs,parent){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); parent&&parent.appendChild(e); return e; }
function stack(ic,order,keys){ // Reihenfolge laut Manifest
  if(order==="parts-first"){ keys.parts.forEach(k=>ic.layer(k,k)); ic.layer("base","base"); } else { ic.layer("base","base"); keys.parts.forEach(k=>ic.layer(k,k)); } }

/* ---------- Choreografien ---------- */
const CHOREO = {
  /* Sanduhr: Glas dreht sich, dann rieselt der Sand oben ab und häuft sich unten an */
  "spaeter":(ic)=>{
    ic.layer("base","base"); ic.layer("sTop","sand"); ic.layer("sBot","sand");
    const g=svg("g",{},ic.ov); const stream=svg("rect",{x:510,y:532,width:6,height:0,rx:3,fill:"#D8C29E"},g);
    const grains=[...Array(9)].map(()=>svg("circle",{r:4.5,fill:"#CDB48C",opacity:0},g));
    const NECK=540, TOPMAX=374, TOPEND=468, BOTFULL=600, BOTEMPTY=760;
    const rest=()=>{ ic.whole(); ic.set("base"); ic.set("sTop",{clip:[0,1024,NECK,0]}); ic.set("sBot",{clip:[NECK,1024,1024,0]}); stream.setAttribute("height",0); grains.forEach(c=>c.setAttribute("opacity",0)); };
    return {dur:3.0, rest, frame:t=>{
      const f=seg(t,0,.75);
      if(t<.75){ const r=180*MOVE(f); ic.whole({rot:r,o:[511,506]}); ic.set("sTop",{clip:[0,1024,NECK,0]}); ic.set("sBot",{clip:[NECK,1024,1024,0]}); stream.setAttribute("height",0); grains.forEach(c=>c.setAttribute("opacity",0)); return; }
      ic.whole(); const p=seg(t,.8,2.85), q=OUT(p);
      const topY=lerp(TOPMAX,TOPEND,INOUT(p)), botY=lerp(BOTEMPTY,BOTFULL,OUT(p));
      ic.set("sTop",{clip:[topY,1024,NECK,0]}); ic.set("sBot",{clip:[botY,1024,1024,0]});
      const on=t>.85&&t<2.9; stream.setAttribute("height",on?Math.max(0,botY-532):0); stream.setAttribute("opacity",on?.9:0);
      grains.forEach((c,i)=>{ const ph=((t*1.6+i/grains.length)%1); const y=532+ph*(botY-532); c.setAttribute("cx",513+Math.sin(i*7.3+t*9)*3); c.setAttribute("cy",y); c.setAttribute("opacity",on?(.85*(1-ph*.3)):0); });
    }}; },

  /* Kalender: oberstes Blatt klappt nach oben über die Ringe weg, darunter liegt der neue Tag */
  "kalender":(ic)=>{
    ic.layer("base","base"); ic.layer("next","blatt"); ic.layer("page","blatt"); ic.origin("page",512,366);
    const dot=svg("ellipse",{cx:470,cy:600,rx:0,ry:0,fill:"#0B6B6B",opacity:.9},ic.ov);
    const rest=()=>{ ic.set("base"); ic.set("next"); ic.set("page"); dot.setAttribute("rx",0); dot.setAttribute("ry",0); };
    return {dur:1.6, rest, frame:t=>{
      const p=seg(t,.05,1.0), e=MOVE(p); const a=-178*e;
      ic.set("page",{rx:a, br:1-.25*Math.sin(Math.PI*p), op:p>.85?1-seg(p,.85,1):1, hide:p>=1});
      ic.set("next",{br:.88+.12*seg(t,.4,1)});
      const d=OUT(seg(t,1.0,1.45)); const s=d*(1+.25*bump(seg(t,1.0,1.45))); dot.setAttribute("rx",26*s); dot.setAttribute("ry",22*s);
    }}; },

  /* Papier und Stift: der Stift schreibt eine Zeile Schreibschrift, die Tinte entsteht unter der Spitze */
  "papier-stift":(ic)=>{
    ic.layer("base","base"); const ink=svg("path",{fill:"none",stroke:"#0B4F55","stroke-width":9,"stroke-linecap":"round","stroke-linejoin":"round",opacity:.85},ic.ov);
    ic.layer("stift","stift"); ic.inner.appendChild(ic.ov); // Tinte unter den Stift legen
    ic.inner.insertBefore(ic.ov, ic.L.stift.el);
    const TIP=[355,730]; const P0=[300,470], D=[1,-.298], N=[.28,.96]; const L=330;
    const pts=[]; for(let i=0;i<=240;i++){ const s=i/240; const w=s*L, loop=Math.sin(s*Math.PI*2*5.5);
      const off=-26*Math.abs(Math.sin(s*Math.PI*5.5))+ (s>.5&&s<.56? 0:0); const back=-10*Math.cos(s*Math.PI*2*5.5);
      pts.push([P0[0]+D[0]*(w+back)+N[0]*off, P0[1]+D[1]*(w+back)+N[1]*off]); }
    ink.setAttribute("d","M"+pts.map(p=>p.map(v=>v.toFixed(1)).join(" ")).join(" L"));
    const len=ink.getTotalLength? null:null; let total=0; for(let i=1;i<pts.length;i++) total+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    ink.setAttribute("stroke-dasharray",total);
    const rest=()=>{ ic.set("base"); ic.set("stift"); ink.setAttribute("stroke-dashoffset",total); ink.setAttribute("opacity",.85); };
    return {dur:2.6, rest, frame:t=>{
      const lift=OUT(seg(t,0,.35)); const w=seg(t,.35,2.15); const back=OUT(seg(t,2.15,2.6));
      const idx=Math.round(w*(pts.length-1)); const pt=pts[idx];
      let x,y;
      if(t<.35){ x=lerp(0,pts[0][0]-TIP[0],lift); y=lerp(0,pts[0][1]-TIP[1],lift)-40*bump(seg(t,0,.35)); }
      else if(t<2.15){ x=pt[0]-TIP[0]; y=pt[1]-TIP[1]; }
      else { x=lerp(pts.at(-1)[0]-TIP[0],0,back); y=lerp(pts.at(-1)[1]-TIP[1],0,back)-50*bump(seg(t,2.15,2.6)); }
      const tilt=t>.35&&t<2.15? 4*Math.sin(t*22):0;
      ic.set("stift",{tx:x,ty:y,rot:tilt}); ic.origin("stift",TIP[0],TIP[1]);
      ink.setAttribute("stroke-dashoffset", total*(1-w)); ink.setAttribute("opacity", .85*(1-seg(t,2.4,2.6)*0));
    }}; },

  /* Kindergeld: die oberste Münze springt hoch, dreht sich und landet federnd auf dem Stapel */
  "kindergeld":(ic)=>{
    ic.layer("base","base"); ic.layer("coin","eine-muenze"); ic.origin("coin",502,372); ic.origin("base",504,800);
    const sp=[...Array(5)].map(()=>svg("circle",{r:0,fill:"#E9C77B"},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("coin"); sp.forEach(c=>c.setAttribute("r",0)); };
    return {dur:1.7, rest, frame:t=>{
      const p=seg(t,0,1.5); const y=hop(p,260); const spin=720*OUT(seg(p,0,.62));
      const land=bump(seg(p,.6,.72));
      ic.set("coin",{ty:y, sx:Math.max(.08,Math.abs(Math.cos(spin*Math.PI/180))), sy:1-.12*land, br:Math.cos(spin*Math.PI/180)<0?.82:1});
      ic.set("base",{sy:1-.06*land, sx:1+.03*land});
      sp.forEach((c,i)=>{ const q=seg(p,.6,.95); const a=-Math.PI*(.15+.7*i/4); c.setAttribute("cx",502+Math.cos(a)*q*190); c.setAttribute("cy",372+Math.sin(a)*q*120); c.setAttribute("r",q>0&&q<1?9*(1-q):0); });
    }}; },

  /* Elterngeld: die Münze hüpft aus der Ecke, dreht sich in der Luft und plumpst zurück */
  "umschlag-euro":(ic)=>{
    ic.layer("base","base"); ic.layer("coin","muenze"); ic.origin("coin",708,590); ic.origin("base",490,690);
    const rest=()=>{ ic.set("base"); ic.set("coin"); };
    return {dur:1.6, rest, frame:t=>{
      const p=seg(t,0,1.45); const y=hop(p,300); const x=-70*bump(seg(p,0,.62)); const spin=540*OUT(seg(p,0,.62));
      const c=Math.cos(spin*Math.PI/180); const land=bump(seg(p,.6,.72));
      ic.set("coin",{tx:x,ty:y,sx:Math.max(.08,Math.abs(c)),sy:1-.1*land,br:c<0?.8:1});
      ic.set("base",{sy:1-.05*land,sx:1+.02*land});
    }}; },

  /* U-Heft: die rechte Seite blättert um die Bindung nach links */
  "u-heft":(ic)=>{
    ic.layer("seite2","seite"); ic.layer("base","base"); ic.layer("seite","seite"); ic.origin("seite",414,526);
    // parts-first: Seite liegt unter dem Umschlag; die blätternde Kopie liegt oben
    const rest=()=>{ ic.set("seite2"); ic.set("base"); ic.set("seite",{hide:true}); };
    return {dur:1.5, rest, frame:t=>{
      const p=seg(t,.05,1.2), e=MOVE(p);
      ic.set("seite",{ry:-175*e, br:1-.3*Math.sin(Math.PI*p), op:1-seg(p,.88,1)});
    }}; },

  /* Jahresring: die Perle läuft eine Runde, der Ring atmet beim Ankommen */
  "jahresring":(ic)=>{
    ic.layer("base","base"); ic.layer("perle","perle"); ic.origin("base",509,507);
    const m=ic.meta.L, [x0,y0,x1,y1]=m.base, cx=(x0+x1)/2, cy=(y0+y1)/2-6, rx=(x1-x0)/2*.8, ry=(y1-y0)/2*.74;
    const [px,py]=[(m.perle[0]+m.perle[2])/2,(m.perle[1]+m.perle[3])/2]; const a0=Math.atan2((py-cy)/ry,(px-cx)/rx);
    const trail=svg("path",{fill:"none",stroke:"#0B6B6B","stroke-width":10,"stroke-linecap":"round",opacity:0},ic.ov);
    ic.inner.insertBefore(ic.ov, ic.L.perle.el);
    const rest=()=>{ ic.set("base"); ic.set("perle"); trail.setAttribute("opacity",0); };
    return {dur:2.0, rest, frame:t=>{
      const p=seg(t,0,1.6), e=INOUT(p); const a=a0+2*Math.PI*e;
      const X=cx+rx*Math.cos(a), Y=cy+ry*Math.sin(a);
      ic.set("perle",{tx:X-px,ty:Y-py,sx:1+.12*Math.sin(a),sy:1+.12*Math.sin(a)});
      const pts=[]; for(let k=0;k<=24;k++){ const aa=a-(k/24)*Math.min(1.2,e*6.3*.4); pts.push([cx+rx*Math.cos(aa),cy+ry*Math.sin(aa)]); }
      trail.setAttribute("d","M"+pts.map(q=>q.map(v=>v.toFixed(1)).join(" ")).join(" L")); trail.setAttribute("opacity",.35*bump(p));
      const arr=bump(seg(t,1.55,1.95)); ic.set("base",{sx:1+.03*arr,sy:1+.03*arr});
    }}; },

  /* Karten: die oberste Karte fliegt mit Schwung weg, dann kommt die nächste nach vorn */
  "karten":(ic)=>{
    ic.layer("base","base"); ic.layer("top","oberste-karte"); ic.origin("top",600,700); ic.origin("base",490,600);
    const rest=()=>{ ic.set("base"); ic.set("top"); };
    return {dur:1.5, rest, frame:t=>{
      const o=OUT(seg(t,.0,.55)); const back=seg(t,.7,1.45);
      if(t<.65) ic.set("top",{tx:380*o,ty:-90*o,rot:28*o,op:1-seg(t,.3,.6)});
      else ic.set("top",{ty:-60*(1-spring(back,1.2,6)),op:OUT(back),sx:.94+.06*spring(back),sy:.94+.06*spring(back)});
      ic.set("base",{ty:-14*bump(seg(t,.2,.8)),rot:-2*bump(seg(t,.2,.8))});
    }}; },

  /* Übernehmen: die Karte schwebt heran und die Hand schließt sich um sie */
  "hand-nimmt":(ic)=>{
    stack(ic,"parts-first",{parts:["karte"]}); ic.origin("karte",520,520); ic.origin("base",420,700);
    const rest=()=>{ ic.set("base"); ic.set("karte"); };
    return {dur:1.3, rest, frame:t=>{
      const q=spring(seg(t,0,1.1),1.1,5.5);
      ic.set("karte",{tx:180*(1-q),ty:-170*(1-q),rot:-24*(1-q),op:clamp(t*5)});
      const grip=bump(seg(t,.45,.85)); ic.set("base",{rot:-5*grip,ty:-10*grip});
    }}; },

  /* Eingang: der Brief fällt von oben ins Fach, das Fach federt */
  "eingang":(ic)=>{
    stack(ic,"parts-first",{parts:["oberer-brief"]}); ic.origin("oberer-brief",560,420); ic.origin("base",512,746);
    const rest=()=>{ ic.set("base"); ic.set("oberer-brief"); };
    return {dur:1.3, rest, frame:t=>{
      const p=seg(t,0,.6); const fall=-360*(1-MOVE(p)); const sw=10*Math.sin(p*Math.PI*2)*(1-p);
      ic.set("oberer-brief",{ty:fall,tx:40*(1-p),rot:sw,op:clamp(t*6)});
      const land=seg(t,.58,1.2); ic.set("base",{sy:1-.07*wob(land,1.5),sx:1+.04*wob(land,1.5)});
    }}; },

  /* Erledigt: der Haken zeichnet sich von links nach rechts, dann ein kurzer Plopp mit Funken */
  "erledigt":(ic)=>{
    ic.layer("base","base"); ic.layer("haken","haken"); ic.origin("haken",520,520); ic.origin("base",512,512);
    const sp=[...Array(6)].map(()=>svg("path",{stroke:"#0B6B6B","stroke-width":10,"stroke-linecap":"round",opacity:0},ic.ov));
    const [x0,y0,x1,y1]=ic.meta.L.haken;
    const rest=()=>{ ic.set("base"); ic.set("haken"); sp.forEach(s=>s.setAttribute("opacity",0)); };
    return {dur:1.1, rest, frame:t=>{
      const d=MOVE(seg(t,0,.5)); ic.set("haken",{clip:[y0-30,x0+(x1-x0+40)*d,y1+30,x0-20], sx:1+.12*bump(seg(t,.48,.75)), sy:1+.12*bump(seg(t,.48,.75))});
      ic.set("base",{sx:1-.04*bump(seg(t,.45,.7)),sy:1-.04*bump(seg(t,.45,.7))});
      const q=seg(t,.5,.95); sp.forEach((s,i)=>{ const a=-Math.PI/2+(i-2.5)*.55; const r1=330+90*OUT(q), r2=r1+40*(1-q);
        s.setAttribute("d",`M${512+Math.cos(a)*r1} ${512+Math.sin(a)*r1} L${512+Math.cos(a)*r2} ${512+Math.sin(a)*r2}`); s.setAttribute("opacity",q>0&&q<1?.8*(1-q):0); });
    }}; },

  /* Brief gelesen: der Marker zieht eine Linie, darunter erscheint die Markierung */
  "brief-gelesen":(ic)=>{
    ic.layer("base","base"); const hl=svg("path",{d:"M300 420 L560 352",fill:"none",stroke:"#9CC9B9","stroke-width":30,"stroke-linecap":"round",opacity:.75,"stroke-dasharray":270,"stroke-dashoffset":270},ic.ov);
    ic.layer("marker","marker"); ic.inner.insertBefore(ic.ov, ic.L.marker.el); ic.origin("marker",396,664);
    const TIP=[396,664];
    const rest=()=>{ ic.set("base"); ic.set("marker"); hl.setAttribute("stroke-dashoffset",270); };
    return {dur:1.8, rest, frame:t=>{
      const a=OUT(seg(t,0,.35)), w=INOUT(seg(t,.35,1.2)), b=OUT(seg(t,1.25,1.75));
      const S=[300,420], E=[560,352];
      let x,y; if(t<.35){ x=lerp(0,S[0]-TIP[0],a); y=lerp(0,S[1]-TIP[1],a)-30*bump(a);} else if(t<1.25){ x=lerp(S[0],E[0],w)-TIP[0]; y=lerp(S[1],E[1],w)-TIP[1]; } else { x=lerp(E[0]-TIP[0],0,b); y=lerp(E[1]-TIP[1],0,b)-40*bump(b); }
      ic.set("marker",{tx:x,ty:y,rot:t>.35&&t<1.25?-3:0}); hl.setAttribute("stroke-dashoffset",270*(1-w));
    }}; },

  /* Scannen: Kamera duckt sich, Blitz, Lichtkranz */
  "kamera-scan":(ic)=>{
    ic.layer("w","whole"); ic.layer("s","state-blitz"); ic.origin("w",512,768);
    const ring=svg("circle",{cx:690,cy:330,r:0,fill:"none",stroke:"#FFF4C9","stroke-width":18,opacity:0},ic.ov);
    const glow=svg("circle",{cx:690,cy:330,r:0,fill:"#FFFBE8",opacity:0},ic.ov);
    const rest=()=>{ ic.set("w"); ic.set("s",{op:0}); ring.setAttribute("opacity",0); glow.setAttribute("opacity",0); };
    return {dur:1.2, rest, frame:t=>{
      const press=bump(seg(t,0,.3)); ic.set("w",{sy:1-.06*press,sx:1+.03*press}); ic.set("s",{op:bump(seg(t,.25,.7)),sy:1-.06*press,sx:1+.03*press});
      const f=seg(t,.28,.9); glow.setAttribute("r",60+200*OUT(f)); glow.setAttribute("opacity",.85*(1-f)*(f>0));
      ring.setAttribute("r",80+300*OUT(f)); ring.setAttribute("opacity",.9*(1-f)*(f>0));
    }}; },

  /* Besuch: Deckel klappert, Dampf steigt in Schwaden */
  "kochtopf":(ic)=>{
    ic.layer("base","base"); ic.layer("deckel","deckel"); ic.layer("dampf","dampf"); ic.origin("deckel",510,520); ic.origin("dampf",527,362);
    const puffs=[...Array(4)].map(()=>svg("circle",{r:0,fill:"#FFFFFF",opacity:0},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("deckel"); ic.set("dampf"); puffs.forEach(c=>c.setAttribute("opacity",0)); };
    return {dur:2.0, rest, frame:t=>{
      const r=seg(t,.1,1.4); const j=Math.sin(t*48)*(1-r)*(r>0);
      ic.set("deckel",{ty:-26*Math.abs(Math.sin(t*16))*(1-r)*(r>0),rot:4*j});
      ic.set("dampf",{ty:-40*seg(t,0,2),op:1-seg(t,1.4,2),sx:1+.3*seg(t,0,2)});
      puffs.forEach((c,i)=>{ const q=seg(t,.2+i*.3,1.2+i*.3); c.setAttribute("cx",520+Math.sin(q*6+i)*24); c.setAttribute("cy",250-q*170); c.setAttribute("r",(14+i*4)*(.4+q)); c.setAttribute("opacity",q>0&&q<1?.75*bump(q):0); });
    }}; },

  /* Geschenk: Deckel springt auf, Konfetti fliegt */
  "geschenk":(ic)=>{
    ic.layer("base","base"); ic.layer("deckel","deckel"); ic.origin("deckel",300,560); ic.origin("base",512,830);
    const cols=["#0B6B6B","#F2C9C4","#C9D9E6","#A9BBA3","#E9C77B"];
    const conf=[...Array(14)].map((_,i)=>svg("rect",{width:16,height:24,rx:4,fill:cols[i%5],opacity:0},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("deckel"); conf.forEach(c=>c.setAttribute("opacity",0)); };
    return {dur:1.8, rest, frame:t=>{
      const up=seg(t,.15,1.4); const y=hop(up,170); const rot=-22*bump(seg(up,0,.62));
      const sq=bump(seg(t,0,.18)); ic.set("base",{sy:1-.08*sq+.04*bump(seg(t,.18,.35)),sx:1+.05*sq});
      ic.set("deckel",{ty:y-6*sq,rot});
      conf.forEach((c,i)=>{ const q=seg(t,.25,1.6); const a=-Math.PI/2+(i/13-.5)*2.2; const v=330+(i*37)%140;
        const x=512+Math.cos(a)*v*q, yy=430+Math.sin(a)*v*q+520*q*q; c.setAttribute("x",x); c.setAttribute("y",yy);
        c.setAttribute("transform",`rotate(${q*720*(i%2?1:-1)} ${x+8} ${yy+12})`); c.setAttribute("opacity",q>0&&q<1?1-seg(q,.7,1):0); });
    }}; },

  /* Erinnerung: die Glocke schwingt, der Klöppel schlägt nach, Schallbögen */
  "glocke":(ic)=>{
    ic.layer("base","base"); ic.layer("kl","kloeppel"); ic.origin("base",524,215); ic.origin("kl",524,215);
    const arcs=[0,1].map(i=>svg("path",{fill:"none",stroke:"#0B6B6B","stroke-width":12,"stroke-linecap":"round",opacity:0},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("kl"); arcs.forEach(a=>a.setAttribute("opacity",0)); };
    return {dur:1.6, rest, frame:t=>{
      const p=seg(t,0,1.5); const a=24*wob(p,2.5); const lag=30*wob(seg(t,.08,1.58),2.5);
      ic.set("base",{rot:a}); ic.set("kl",{rot:lag});
      arcs.forEach((el,i)=>{ const side=i?1:-1; const q=seg(t,.1+i*.12,.8+i*.12); const r=360+70*q; const cx=524, cy=520;
        const a1=side>0?-.5:Math.PI+.5, a2=side>0?.3:Math.PI-.3;
        el.setAttribute("d",`M${cx+Math.cos(a1)*r} ${cy+Math.sin(a1)*r} A${r} ${r} 0 0 ${side>0?1:0} ${cx+Math.cos(a2)*r} ${cy+Math.sin(a2)*r}`); el.setAttribute("opacity",q>0&&q<1?.7*bump(q):0); });
    }}; },

  /* Nachricht: die zweite Blase ploppt auf, darin tippen drei Punkte */
  "chat":(ic)=>{
    ic.layer("base","base"); ic.layer("b2","zweite-blase"); ic.origin("b2",520,700);
    const dots=[0,1,2].map(i=>svg("circle",{cx:590+i*52,cy:520,r:0,fill:"#FFFFFF"},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("b2"); dots.forEach(d=>d.setAttribute("r",0)); };
    return {dur:2.0, rest, frame:t=>{
      const q=spring(seg(t,0,.7),1.2,6); ic.set("b2",{sx:.6+.4*q,sy:.6+.4*q,op:clamp(t*5),ty:30*(1-q)});
      const on=t>.5&&t<1.8; dots.forEach((d,i)=>{ const b=Math.max(0,Math.sin((t-.5)*9-i*.9)); d.setAttribute("r",on?17:0); d.setAttribute("cy",520-18*b); d.setAttribute("opacity",on?.9*(1-seg(t,1.6,1.8)):0); });
    }}; },

  /* Zwei Spuren: die mittlere Pille fällt in die Lücke, die beiden Seiten weichen kurz aus */
  "zwei-spuren":(ic)=>{
    ic.layer("base","base"); ic.layer("pille","mittlere-pille"); ic.origin("pille",511,646); ic.origin("base",512,798);
    const rest=()=>{ ic.set("base"); ic.set("pille"); };
    return {dur:1.3, rest, frame:t=>{
      const p=seg(t,0,.55); const y=-320*(1-MOVE(p)); ic.set("pille",{ty:y,op:clamp(t*6),sy:1+.12*(p<1?1-p:0)-.14*bump(seg(t,.55,.75)),sx:1+.1*bump(seg(t,.55,.75))});
      const w=seg(t,.5,1.25); ic.set("base",{sx:1+.05*wob(w,1.5),sy:1-.03*wob(w,1.5)});
    }}; }
};

/* ---------- Standard für die übrigen Icons: die v1-Bewegungen, etwas lebendiger ---------- */
function generic(ic){
  const m=ic.meta, plan=PLAN[ic.n]||{g:"hop"}, L=m.L;
  const motions=[plan.part&&plan, plan.extra].filter(Boolean);
  const parts=[];
  if(motions.length && L.base!==undefined){
    const keys=Object.keys(L).filter(k=>k!=="whole"&&k!=="base"&&!k.startsWith("state"));
    if(m.o==="parts-first"){ keys.forEach(k=>ic.layer(k,k)); ic.layer("base","base"); } else { ic.layer("base","base"); keys.forEach(k=>ic.layer(k,k)); }
    keys.forEach(k=>{ const mp=motions.find(x=>x.part===k); if(!mp) return; const mo=M[mp.m]({base:L.base||L.whole,part:L[k]},...(mp.args||[]));
      const pv=piv(L[k],mo.pv||"c"); ic.origin(k,pv[0],pv[1]); parts.push({k,mo,clipBB:mp.m==="draw"?L[k]:null}); });
  } else { ic.layer("w","whole"); if(plan.state){ ic.layer("s",plan.state); } }
  const gm=plan.g?G[plan.g]:null, gpv=piv(L.whole,(gm&&gm.pv)||"b");
  const D=Math.max(1.0,...parts.map(p=>(p.mo.dur||1)*1.15));
  const conv=(o,p)=>{ const s={tx:o.tx,ty:o.ty,rot:o.rot,sx:o.sx,sy:o.sy,op:o.op};
    if(o.clip!=null&&p.clipBB){ const [x0,y0,x1,y1]=p.clipBB; s.clip=[y0-30,x0+(x1-x0+40)*o.clip,y1+30,x0-20]; } return s; };
  return {dur:D, rest:()=>{ parts.forEach(p=>ic.set(p.k)); if(ic.L.base) ic.set("base"); if(ic.L.w) ic.set("w"); if(ic.L.s) ic.set("s",{op:0}); },
    frame:t=>{ const p=clamp(t/D);
      parts.forEach(pt=>ic.set(pt.k,conv(pt.mo.once(p),pt)));
      if(gm){ const g=gm.once(p); ic.whole({...g,o:gpv}); }
      else { const sq=1-.05*bump(seg(p,0,.15))+.03*bump(seg(p,.12,.35)); ic.whole({sx:sq,sy:sq,o:piv(L.whole,"b")}); }
      if(ic.L.s){ const op=plan.flash? Math.max(bump(seg(p,.1,.35)),bump(seg(p,.45,.7))) : Math.min(1,bump(p)*1.6); ic.set("s",{op}); } } };
}
