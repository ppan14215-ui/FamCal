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

/* Keyframes wie in CSS: kf(t,[[sek,wert],...],ease) interpoliert zwischen Stützpunkten */
const kf=(t,K,ease=INOUT)=>{ if(t<=K[0][0]) return K[0][1]; for(let i=1;i<K.length;i++){ if(t<=K[i][0]){ const [a,va]=K[i-1],[b,vb]=K[i]; const p=ease((t-a)/(b-a)); return va+(vb-va)*p; } } return K[K.length-1][1]; };
const ANT=.2, SETTLE=.45, SHINE=.7;

class Icon3{
  constructor(name,meta){
    this.n=name; this.meta=meta;
    const el=document.createElement("div"); el.className="ic3"; this.el=el;
    const W=meta.L.whole||[192,192,832,832]; this.W=W;
    // Kontaktschatten: liegt außerhalb der Squash-Ebene und reagiert auf die Höhe
    this.shd=document.createElement("div"); this.shd.className="shd";
    const sw=(W[2]-W[0])*.62; this.shd.style.left=pc((W[0]+W[2])/2-sw/2); this.shd.style.width=pc(sw); this.shd.style.top=pc(W[3]-22); this.shd.style.height=pc(46);
    el.appendChild(this.shd);
    this.sq=document.createElement("div"); this.sq.className="ic3s"; this.sq.style.transformOrigin=`${pc((W[0]+W[2])/2)} ${pc(W[3])}`; el.appendChild(this.sq);
    this.inner=document.createElement("div"); this.inner.className="ic3i"; this.sq.appendChild(this.inner);
    this.L={}; this.ov=document.createElementNS(NS,"svg"); this.ov.setAttribute("viewBox","0 0 1024 1024"); this.ov.setAttribute("class","ov"); this.ov.setAttribute("aria-hidden","true");
    this.lift=0;
    this.spec = CHOREO[name] ? CHOREO[name](this) : generic(this);
    if(!this.ov.parentNode) this.inner.appendChild(this.ov);
    // Glanz, der nach der Bewegung einmal über das Icon läuft
    this.sh=document.createElement("div"); this.sh.className="shine"; const u=`url(img/icon-${name}.webp)`; this.sh.style.webkitMaskImage=u; this.sh.style.maskImage=u; this.sq.appendChild(this.sh);
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
    e.style.transformOrigin=`${pc((s.o||[512,512])[0])} ${pc((s.o||[512,512])[1])}`; e.style.transform=tf.join(" "); e.style.opacity=s.op??1; this.lift=Math.max(0,-(s.ty||0)); }
  squash(sx=1,sy=1){ this.sq.style.transform=(sx===1&&sy===1)?"":`scale(${sx},${sy})`; }
  shadow(){ const h=this.lift+(this.extraLift||0); const k=Math.max(.45,1-h/520); this.shd.style.transform=`scale(${k*(this._sqx||1)})`; this.shd.style.opacity=k; }
  shine(p){ this.sh.style.backgroundPosition=`${lerp(130,-30,p)}% 0`; this.sh.style.opacity=p>0&&p<1?1:0; }
  reset(){ cancelAnimationFrame(this.raf); this.raf=null; this.mode=null; this.whole(); this.squash(); this._sqx=1; this.extraLift=0; this.shine(0); this.spec.rest(); this.shadow(); }
  dur(){ return ANT+this.spec.dur+SETTLE+.3; }
  /* Ein Durchgang: Anlauf (in die Knie), Bewegung, Nachfedern, Glanz */
  perform(t){ const D=this.spec.dur;
    let sx=1, sy=1;
    if(t<ANT){ const e=OUT(t/ANT); sx=1+.07*e; sy=1-.1*e; this.spec.rest(); }
    else if(t<ANT+D){ const r=seg(t,ANT,ANT+.18); sx=lerp(1.07,1,OUT(r))-.04*bump(r); sy=lerp(.9,1,OUT(r))+.06*bump(r); this.spec.frame(t-ANT); }
    else { this.spec.frame(D); const q=seg(t,ANT+D,ANT+D+SETTLE); const w=wob(q,1.5); sx=1+.05*w; sy=1-.06*w; }
    this._sqx=sx; this.squash(sx,sy);
    this.shine(seg(t,ANT+D+.05,ANT+D+.05+SHINE)); this.shadow(); }
  play(kind,speed=()=>1){
    this.reset(); this.mode=kind; const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last=performance.now(), t=0;
    const P=this.dur(), CYC=Math.max(3.2,P+.8);
    const step=now=>{ t+=(now-last)/1000*speed(); last=now;
      if(reduce){ const p=clamp(t/.3); this.whole({op:kind==="in"?p:1}); if(p<1) this.raf=requestAnimationFrame(step); else this.reset(); return; }
      if(kind==="in"){ const IN=.45;
        const e=OUT(clamp(t/IN)); this.whole({op:clamp(t/IN*1.6),ty:30*(1-e),o:[512,820]}); this.squash(.94+.06*e,.94+.06*e);
        if(t<IN){ this.spec.rest(); this.shadow(); this.raf=requestAnimationFrame(step); return; }
        this.whole(); const u=t-IN; this.perform(u); if(u<P) this.raf=requestAnimationFrame(step); else this.reset(); return; }
      if(kind==="loop"){ const c=(t+(this.offset||0))%CYC; if(c<P) this.perform(c); else { this.whole(); this.squash(); this.spec.rest(); this.shine(0); this.shadow(); } this.raf=requestAnimationFrame(step); return; }
      this.perform(t); if(t<P) this.raf=requestAnimationFrame(step); else this.reset(); };
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

  /* Papier und Stift: drei Zeilen Schreibschrift, die Spitze folgt der Tinte, zwischen den Zeilen hebt der Stift ab */
  "papier-stift":(ic)=>{
    ic.layer("base","base"); ic.inner.appendChild(ic.ov); ic.layer("stift","stift"); ic.origin("stift",355,730);
    const TIP=[355,730], Lc=[192,364], U=[396,-118], V=[264,408];
    const lines=[[.13,.24,.66],[.13,.42,.56],[.13,.60,.40]].map(([u0,v0,len])=>{ const s=[Lc[0]+U[0]*u0+V[0]*v0, Lc[1]+U[1]*u0+V[1]*v0];
      const ud=[U[0]/412,U[1]/412], nd=[V[0]/486,V[1]/486], Lpx=len*412, n=Math.round(Lpx/3); const pts=[];
      for(let i=0;i<=n;i++){ const w=i/n*Lpx; const wav=-14*Math.abs(Math.sin(w/26*Math.PI))+5; const back=-6*Math.cos(w/26*Math.PI*2);
        pts.push([s[0]+ud[0]*(w+back)+nd[0]*wav, s[1]+ud[1]*(w+back)+nd[1]*wav]); }
      let tot=0; for(let i=1;i<pts.length;i++) tot+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
      const el=svg("path",{d:"M"+pts.map(p=>p.map(v=>v.toFixed(1)).join(" ")).join(" L"),fill:"none",stroke:"#0B4F55","stroke-width":10,"stroke-linecap":"round","stroke-linejoin":"round","stroke-dasharray":tot,"stroke-dashoffset":tot},ic.ov);
      return {pts,tot,el}; });
    // Zeitplan: [Start, Ende] je Zeile
    const T=[[.30,.80],[.98,1.40],[1.58,1.88]], END=2.3;
    const rest=()=>{ ic.set("base"); ic.set("stift"); lines.forEach(l=>{ l.el.setAttribute("stroke-dashoffset",l.tot); l.el.setAttribute("opacity",1); }); };
    const at=(l,w)=>l.pts[Math.round(clamp(w)*(l.pts.length-1))];
    return {dur:END+.5, rest, frame:t=>{
      let x=0,y=0,tilt=0;
      lines.forEach((l,i)=>{ const w=seg(t,T[i][0],T[i][1]); l.el.setAttribute("stroke-dashoffset",l.tot*(1-w)); l.el.setAttribute("opacity",1-seg(t,END+.2,END+.5)); });
      const k=T.findIndex(([a,b])=>t>=a&&t<=b);
      if(k>=0){ const p=at(lines[k],seg(t,T[k][0],T[k][1])); x=p[0]-TIP[0]; y=p[1]-TIP[1]; tilt=5*Math.sin(t*26); }
      else { // Übergänge: zum Zeilenanfang hüpfen, am Ende zurück
        const pos=[[0,0],...T.flatMap((tt,i)=>[[tt[0],at(lines[i],0)],[tt[1],at(lines[i],1)]]),[END,null]];
        let a=null,b=null; for(let i=0;i<pos.length-1;i++){ if(t>=(i?pos[i][0]:0)&&t<pos[i+1][0]){ a=pos[i]; b=pos[i+1]; break; } }
        if(!a){ a=pos[pos.length-2]; b=[END,null]; }
        const A=a[1]? [a[1][0]-TIP[0],a[1][1]-TIP[1]]:[0,0], B=b[1]? [b[1][0]-TIP[0],b[1][1]-TIP[1]]:[0,0];
        const p=MOVE(seg(t,a[0],b[0])); x=lerp(A[0],B[0],p); y=lerp(A[1],B[1],p)-60*bump(seg(t,a[0],b[0])); tilt=-8*bump(seg(t,a[0],b[0])); }
      ic.set("stift",{tx:x,ty:y,rot:tilt});
    }}; },

  /* Kindergeld: die oberste Münze springt hoch, dreht sich in 3D und landet federnd auf dem Stapel */
  "kindergeld":(ic)=>{
    ic.layer("base","base"); ic.layer("coin","eine-muenze"); ic.origin("coin",502,372); ic.origin("base",504,800);
    const sp=[...Array(7)].map(()=>svg("circle",{r:0,fill:"#E9C77B"},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("coin"); sp.forEach(c=>c.setAttribute("r",0)); ic.extraLift=0; };
    return {dur:1.8, rest, frame:t=>{
      const p=seg(t,0,1.6); const y=hop(p,330); const spin=720*INOUT(seg(p,0,.62)); const c=Math.cos(spin*Math.PI/180);
      const land=bump(seg(p,.6,.74));
      ic.set("coin",{ty:y, ry:spin, sy:1-.14*land, sx:1+.08*land, br:.82+.28*Math.abs(c)});
      ic.set("base",{sy:1-.08*land, sx:1+.04*land});
      sp.forEach((c,i)=>{ const q=seg(p,.6,.98); const a=-Math.PI*(.08+.84*i/6); c.setAttribute("cx",502+Math.cos(a)*q*230); c.setAttribute("cy",372+Math.sin(a)*q*150+90*q*q); c.setAttribute("r",q>0&&q<1?11*(1-q):0); });
    }}; },

  /* Elterngeld: wie im Canvas, die Münze springt aus der Ecke, dreht sich einmal um sich selbst (3D) und plumpst zurück */
  "umschlag-euro":(ic)=>{
    ic.layer("base","base"); ic.layer("coin","muenze"); ic.origin("coin",708,590); ic.origin("base",490,690);
    const rest=()=>{ ic.set("base"); ic.set("coin"); };
    return {dur:1.9, rest, frame:t=>{
      // Stützpunkte aus e-coin (3 s Zyklus, 18 %–58 %), in Sekunden ab Bewegungsstart
      const ty=kf(t,[[0,0],[.24,-270],[.48,-310],[.72,-125],[.9,0],[1.05,-30],[1.2,0]]);
      const ry=kf(t,[[0,0],[.24,90],[.48,180],[.72,270],[.9,360]],t=>t);
      const sq=kf(t,[[.84,0],[.9,1],[1.05,-.25],[1.2,0]]);
      const tx=-60*bump(seg(t,0,.9));
      ic.set("coin",{tx,ty,ry,sx:1+.08*sq,sy:1-.08*sq,br:.85+.25*Math.abs(Math.cos(ry*Math.PI/180))});
      const e=kf(t,[[0,0],[.12,1],[.26,-.4],[.4,0],[.86,0],[.94,.8],[1.08,-.3],[1.2,0]]);
      ic.set("base",{sx:1+.05*e,sy:1-.07*e});
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

  /* Erledigt: kein Maskieren. Der Haken springt aus der Scheibe, dreht eine Runde und schlägt federnd ein, die Scheibe gibt nach, Funken */
  "erledigt":(ic)=>{
    ic.layer("base","base"); ic.layer("haken","haken"); ic.origin("haken",530,514); ic.origin("base",512,780);
    const sp=[...Array(8)].map(()=>svg("path",{stroke:"#0B6B6B","stroke-width":14,"stroke-linecap":"round",opacity:0},ic.ov));
    const ring=svg("circle",{cx:512,cy:512,r:0,fill:"none",stroke:"#0B6B6B","stroke-width":10,opacity:0},ic.ov);
    const rest=()=>{ ic.set("base"); ic.set("haken"); sp.forEach(s=>s.setAttribute("opacity",0)); ring.setAttribute("opacity",0); };
    return {dur:1.6, rest, frame:t=>{
      const p=seg(t,0,.75); const y=-300*4*p*(1-p)*(p<1); const rot=-360*INOUT(p); const big=1+.25*bump(p);
            if(t<.75) ic.set("haken",{ty:y,rot,sx:big,sy:big});
      else { const sq=bump(seg(t,.75,.95)), w=wob(seg(t,.95,1.5),1.5); ic.set("haken",{sx:1+.28*sq+.08*w,sy:1-.24*sq-.07*w}); }
      const hit=bump(seg(t,.72,1.0)); ic.set("base",{sx:1+.08*hit,sy:1-.12*hit});
      const q=seg(t,.75,1.3); sp.forEach((el,i)=>{ const a=i/8*Math.PI*2-Math.PI/2; const r1=320+120*OUT(q), r2=r1+60*(1-q);
        el.setAttribute("d",`M${512+Math.cos(a)*r1} ${512+Math.sin(a)*r1} L${512+Math.cos(a)*r2} ${512+Math.sin(a)*r2}`); el.setAttribute("opacity",q>0&&q<1?.9*(1-q):0); });
      const g=seg(t,.75,1.45); ring.setAttribute("r",300+160*OUT(g)); ring.setAttribute("opacity",g>0&&g<1?.5*(1-g):0);
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

  /* Besuch: 1:1 aus dem Canvas (p-lid, p-body, p-steam). Deckel hebt ab, schwebt wackelnd auf dem Dampf, plumpst zurück und federt nach */
  "kochtopf":(ic)=>{
    ic.layer("base","base"); ic.layer("dampf","dampf"); ic.layer("deckel","deckel"); ic.origin("deckel",300,590); ic.origin("base",512,790); ic.origin("dampf",527,364);
    const defs=svg("defs",{},ic.ov); const rg=svg("radialGradient",{id:"stm-"+Math.random().toString(36).slice(2,7),cx:".5",cy:".55",r:".5"},defs);
    svg("stop",{offset:"0","stop-color":"#FFFFFF","stop-opacity":"1"},rg); svg("stop",{offset:".45","stop-color":"#EEEAE3","stop-opacity":".8"},rg); svg("stop",{offset:"1","stop-color":"#EEEAE3","stop-opacity":"0"},rg);
    const puffs=[[-.25,0],[.15,.18],[.4,.36],[0,.54]].map(([dx,dl])=>({dx,dl,el:svg("ellipse",{rx:0,ry:0,fill:`url(#${rg.id})`,opacity:0},ic.ov)}));
    ic.ov.style.zIndex=1; ic.inner.insertBefore(ic.ov, ic.L.deckel.el);
    const rest=()=>{ ic.set("base"); ic.set("deckel"); ic.set("dampf",{op:0}); puffs.forEach(p=>p.el.setAttribute("opacity",0)); };
    const C=3; // Zeiten aus dem 3-s-Zyklus
    return {dur:2.1, rest, frame:t=>{
      const k=v=>v*C/100;
      const ty=kf(t,[[0,0],[k(7),20],[k(21),-300],[k(27),-250],[k(33),-285],[k(40),-265],[k(54),10],[k(58),-40],[k(62),0]]);
      const tx=kf(t,[[0,0],[k(21),-20],[k(27),-10],[k(33),-20],[k(40),-10],[k(54),0]]);
      const rot=kf(t,[[0,0],[k(21),-12],[k(27),-7],[k(33),-11],[k(40),-8],[k(54),1],[k(58),-2],[k(62),.5],[k(66),0]]);
      ic.set("deckel",{tx,ty,rot});
      const bx=kf(t,[[0,1],[k(7),1.05],[k(15),.98],[k(22),1],[k(54),1],[k(57),1.06],[k(62),.99],[k(66),1]]), by=kf(t,[[0,1],[k(7),.94],[k(15),1.03],[k(22),1],[k(54),1],[k(57),.93],[k(62),1.02],[k(66),1]]);
      ic.set("base",{sx:bx,sy:by}); ic.set("dampf",{op:bump(seg(t,k(18),k(62))),ty:-120*seg(t,k(18),k(62)),sx:1+.4*seg(t,k(18),k(62)),sy:1+.4*seg(t,k(18),k(62))});
      puffs.forEach(({dx,dl,el})=>{ const q=seg(t,k(18)+dl*.5,k(62)+dl*.5); const op=q<=0||q>=1?0:(q<.23?q/.23*.95:.95*(1-(q-.23)/.77));
        const s=.4+1.1*q; el.setAttribute("cx",512+dx*160+dx*300*q); el.setAttribute("cy",420-q*360); el.setAttribute("rx",70*s); el.setAttribute("ry",62*s); el.setAttribute("opacity",op); });
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

  /* Erinnerung: gedämpftes Pendel wie im Canvas (s-swing), der Klöppel schlägt nach, Schallbögen */
  "glocke":(ic)=>{
    ic.layer("base","base"); ic.layer("kl","kloeppel"); ic.origin("base",524,215); ic.origin("kl",524,215);
    const arcs=[0,1,2,3].map(i=>svg("path",{fill:"none",stroke:"#0B6B6B","stroke-width":14,"stroke-linecap":"round",opacity:0},ic.ov));
    const rest=()=>{ ic.set("base"); ic.set("kl"); arcs.forEach(a=>a.setAttribute("opacity",0)); };
    const K=[[0,0],[.12,5],[.32,-28],[.56,20],[.78,-12],[.98,7],[1.14,-2.5],[1.3,0]];
    return {dur:1.5, rest, frame:t=>{
      const a=kf(t,K); const lag=kf(Math.max(0,t-.08),K)*1.35;
      ic.set("base",{rot:a}); ic.set("kl",{rot:lag});
      arcs.forEach((el,i)=>{ const side=i%2?1:-1; const st=.3+Math.floor(i/2)*.24+(side>0?.22:0); const q=seg(t,st,st+.55); const r=330+120*q; const cx=524, cy=500;
        const a1=side>0?-.55:Math.PI+.55, a2=side>0?.25:Math.PI-.25;
        el.setAttribute("d",`M${cx+Math.cos(a1)*r} ${cy+Math.sin(a1)*r} A${r} ${r} 0 0 ${side>0?1:0} ${cx+Math.cos(a2)*r} ${cy+Math.sin(a2)*r}`); el.setAttribute("opacity",q>0&&q<1?.8*bump(q):0); });
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
      const pv=piv(L[k],mo.pv||"c"); ic.origin(k,pv[0],pv[1]); parts.push({k,mo}); });
  } else { ic.layer("w","whole"); if(plan.state){ ic.layer("s",plan.state); } }
  const D=Math.max(1.3,...parts.map(p=>(p.mo.dur||1)*1.4));
  const A=1.4, amp=o=>({tx:(o.tx||0)*A,ty:(o.ty||0)*A,rot:(o.rot||0)*A,sx:o.sx==null?null:1+(o.sx-1)*A,sy:o.sy==null?null:1+(o.sy-1)*A,op:o.op});
  const gm=plan.g&&plan.g!=="hop"?G[plan.g]:null, gpv=piv(L.whole,(gm&&gm.pv)||"b");
  // m-hop aus dem Canvas: Absprung, Drehung in der Luft, Landung mit Stauchung, zwei kleine Nachhüpfer
  const HOP=t=>({ty:kf(t,[[0,0],[.39,-300],[.54,-320],[.72,0],[.84,-55],[.96,0]]), rot:kf(t,[[0,0],[.39,-8],[.54,-4],[.72,0]]),
    sx:kf(t,[[0,1],[.39,.94],[.54,1],[.66,1],[.72,1.12],[.84,.97],[.96,1.03],[1.05,1]]), sy:kf(t,[[0,1],[.39,1.08],[.54,1],[.66,1],[.72,.86],[.84,1.04],[.96,.97],[1.05,1]])});
  const hasPart=parts.length>0;
  return {dur:hasPart?D:1.1, rest:()=>{ parts.forEach(p=>ic.set(p.k)); if(ic.L.base) ic.set("base"); if(ic.L.w) ic.set("w"); if(ic.L.s) ic.set("s",{op:0}); ic.whole(); },
    frame:t=>{ const Dd=hasPart?D:1.1, p=clamp(t/Dd);
      parts.forEach(pt=>ic.set(pt.k,amp(pt.mo.once(p))));
      if(gm){ const g=gm.once(p); ic.whole({tx:(g.tx||0)*A,ty:(g.ty||0)*A,rot:(g.rot||0)*A,sx:g.sx,sy:g.sy,o:gpv}); }
      else if(!hasPart||plan.g==="hop"){ const h=HOP(t); ic.whole({...h,o:piv(L.whole,"b")}); }
      if(ic.L.s){ const op=plan.flash? Math.max(bump(seg(p,.1,.35)),bump(seg(p,.45,.7))) : Math.min(1,bump(p)*1.6); ic.set("s",{op}); } } };
}
