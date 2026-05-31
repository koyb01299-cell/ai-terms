/* ============ 상태 & 저장 ============ */
const KEY="aiTerms_v2";
let DB={known:[],days:[],log:{},goal:20,last:null,voiceURI:null};
try{const s=localStorage.getItem(KEY); if(s)DB=Object.assign(DB,JSON.parse(s));}catch(e){}
let known=new Set(DB.known||[]);
let days=new Set(DB.days||[]);
let log=DB.log||{};
let goal=DB.goal||20;
function save(){try{localStorage.setItem(KEY,JSON.stringify({known:[...known],days:[...days],log,goal,last,voiceURI:savedVoiceURI}));}catch(e){}}

const $=id=>document.getElementById(id);
const $$=(s,el=document)=>Array.from(el.querySelectorAll(s));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const IC_STUDY='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="15" rx="2"/><path d="M8 6V4.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1.5"/></svg>';
const IC_BOOK='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
const IC_CHART='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7" rx="1"/><rect x="10.2" y="6" width="3.5" height="12" rx="1"/><rect x="15.5" y="13" width="3.5" height="5" rx="1"/></svg>';
const ADDED_CATS=new Set(["gen","coreml","ops","biz"]);
const isAdded=t=>ADDED_CATS.has(t[3]);
const SPK='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19.5 5a9 9 0 0 1 0 14"/></svg>';

function dkey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function todayStr(){return dkey(new Date());}
function logStudy(){const t=todayStr();days.add(t);log[t]=(log[t]||0)+1;save();}
function todayCount(){return log[todayStr()]||0;}
function streak(){let n=0,d=new Date();if(!days.has(dkey(d)))d.setDate(d.getDate()-1);while(days.has(dkey(d))){n++;d.setDate(d.getDate()-1);}return n;}

function animateView(root){if(!root)return;root.querySelectorAll(".ring-fg").forEach(c=>{const off=c.getAttribute("data-off");if(off==null)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{c.style.strokeDashoffset=off;}));});}

/* ============ TTS ============ */
let voices=[],chosenVoice=null,curRate=1.0,activeBtn=null;
const sayText=en=>en.replace(/\s*\(.*?\)\s*/g,' ').replace(/\//g,' ').trim();
function loadVoices(){
  const BAD=/albert|bad ?news|bahh|bells|boing|bubbles|cellos|good ?news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|princess|fred|junior|kathy|ralph|espeak|novelty|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|rishi|google[ _]?us[ _]?english[ _]?\d|chrome ?os/i;
  const SAFARI=/\b(samantha|alex|karen|daniel|moira|tessa|veena|aaron|allison|susan|fiona|tom|catherine|arthur|martha|nicky|victoria|nora|ava|evan|joelle|nathan|noelle|zoe|serena|kate|oliver|isha|siri)\b/i;
  const RECPRI=[/^samantha/i,/^ava/i,/^alex/i,/^daniel/i,/^karen/i,/^tom/i,/^victoria/i,/aria.*natural/i,/jenny.*natural/i];
  const isSafari=v=>SAFARI.test(v.name);
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const all=(window.speechSynthesis?speechSynthesis.getVoices():[]);
  let v=all.filter(x=>/^en/i.test(x.lang)&&!BAD.test(x.name)&&(!isIOS||x.localService===true));
  if(!v.length)v=all.filter(x=>/^en/i.test(x.lang)&&!BAD.test(x.name));
  if(!v.length)v=all.filter(x=>/^en/i.test(x.lang));
  const prev=chosenVoice;
  voices=v;
  const sel=$("voiceSel"); if(!sel)return; sel.innerHTML="";
  if(!voices.length){sel.innerHTML="<option>음성 없음</option>";return;}
  // 추천 음성 선정(우선순위 매칭)
  let rec=null;
  for(const p of RECPRI){rec=voices.find(x=>p.test(x.name));if(rec)break;}
  if(!rec)rec=voices.find(isSafari)||voices[0];
  const isRec=x=>x===rec;
  // 정렬: 추천 > Safari > 기타
  voices.sort((a,b)=>{
    const rA=isRec(a)?0:1,rB=isRec(b)?0:1; if(rA!==rB)return rA-rB;
    const sA=isSafari(a)?0:1,sB=isSafari(b)?0:1; if(sA!==sB)return sA-sB;
    const sc=x=>(/natural|online|premium|enhanced/i.test(x.name)?0:1);
    return sc(a)-sc(b);
  });
  // 라벨: 짧게 (이름만, 앞에 ★ 또는 ✓)
  voices.forEach((vx,i)=>{
    const o=document.createElement("option"); o.value=i;
    const pre=isRec(vx)?"★ ":(isSafari(vx)?"✓ ":"");
    o.textContent=pre+vx.name.replace("Microsoft ","").replace(" Online (Natural)"," ✦");
    sel.appendChild(o);
  });
  // 우선순위: 저장된 선택 > 이전 선택 > 추천
  const saved=savedVoiceURI&&voices.find(x=>x.voiceURI===savedVoiceURI);
  chosenVoice=saved||(prev&&voices.includes(prev)?prev:rec);
  sel.value=voices.indexOf(chosenVoice);
}
try{if(window.speechSynthesis){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}}catch(e){}
function speak(text,btn){
  if(!window.speechSynthesis)return;
  speechSynthesis.cancel();
  if(activeBtn)activeBtn.classList.remove("playing");
  if(btn){btn.classList.add("playing");activeBtn=btn;}
  // 자연스러운 호흡을 위해 구두점 단위로 쪼개서 별개 발화로 큐에 올림
  const parts=(sayText(text).match(/[^,.;:!?\u2014\u2013]+[,.;:!?\u2014\u2013]?/g)||[sayText(text)])
    .map(s=>s.trim()).filter(s=>s.length);
  parts.forEach((chunk,idx)=>{
    const u=new SpeechSynthesisUtterance(chunk);
    u.lang=chosenVoice?chosenVoice.lang:"en-US"; if(chosenVoice)u.voice=chosenVoice;
    u.rate=curRate*0.85; u.pitch=1.0;
    if(idx===parts.length-1){
      u.onend=u.onerror=()=>{if(btn)btn.classList.remove("playing");};
    }
    speechSynthesis.speak(u);
  });
}

/* ============ 네비게이션 ============ */
const VIEWS=["home","study","browse","stats"];
const TITLES={home:"홈",study:"학습",browse:"사전",stats:"통계"};
function go(v){
  VIEWS.forEach(x=>$("view-"+x).classList.toggle("on",x===v));
  $$(".tab").forEach(b=>b.classList.toggle("on",b.dataset.v===v));
  window.scrollTo({top:0});
  if(v==="home")renderHome();
  if(v==="study")renderStudy();
  if(v==="browse")renderBrowse();
  if(v==="stats")renderStats();
}

/* ============ 진도 헬퍼 ============ */
const TOTAL=TERMS.length;
function memCount(){return known.size;}
function catCounts(){const m={};for(const k in CATS)m[k]={t:0,k:0};TERMS.forEach((t,i)=>{m[t[3]].t++;if(known.has(i))m[t[3]].k++;});return m;}
function ringSVG(pct,size){
  const R=54,C=2*Math.PI*R,off=C*(1-pct/100);
  return '<svg class="ring" viewBox="0 0 140 140" width="'+size+'" height="'+size+'">'
    +'<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f6b5b"/><stop offset="1" stop-color="#c08a2d"/></linearGradient></defs>'
    +'<circle class="ring-bg" cx="70" cy="70" r="'+R+'"/>'
    +'<circle class="ring-fg" cx="70" cy="70" r="'+R+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+C+'" data-off="'+off+'" transform="rotate(-90 70 70)"/>'
    +'<text x="70" y="68" class="ring-pct">'+pct+'%</text><text x="70" y="90" class="ring-sub">외움</text></svg>';
}

/* ============ 홈 ============ */
function renderHome(){
  const mem=memCount(),pct=TOTAL?Math.round(mem/TOTAL*100):0,remain=TOTAL-mem;
  const _h=new Date().getHours();
  const greet=_h<5?"늦은 밤이에요":_h<12?"좋은 아침이에요":_h<18?"좋은 오후예요":"좋은 저녁이에요";
  const stk=streak();
  const wk=["일","월","화","수","목","금","토"],d=new Date();
  const dt=(d.getMonth()+1)+"월 "+d.getDate()+"일 "+wk[d.getDay()]+"요일";
  const ctaT=remain>0?"오늘의 학습 시작":"복습 시작";
  const ctaS=remain>0?("안 외운 단어 "+remain+"개"):"모두 외웠어요! 전체 복습";
  const ctaA=remain>0?"flash-unknown":"flash-all";
  // 오늘의 단어 (날짜 기반 결정)
  const dayN=(function(){const x=new Date(),s=new Date(x.getFullYear(),0,0);return Math.floor((x-s)/86400000);})();
  const wi=dayN%TOTAL,wt=TERMS[wi];
  // 이어서 학습 (직전 세션)
  let resume="";
  if(last){const mT=last.mode==="flash"?"플래시카드":"퀴즈";const sT=last.scope==="unknown"?"안 외운 단어":"전체";
    resume='<div class="sec-label">이어서 학습</div><button class="resume" data-act="resume"><span class="r-lbl">이어서 학습하기</span><span class="r-meta">'+mT+' · '+sT+'</span><span class="r-arr">→</span></button>';}
  // 카테고리 행
  const cc=catCounts();
  let catRow='';
  for(const k in CATS){const c=cc[k]||{t:0,k:0};catRow+='<button class="cat-chip" data-act="cat-'+k+'"><b>'+CATS[k]+'</b><span>'+c.k+'/'+c.t+'</span></button>';}
  const cell=(act,ic,label)=>'<button class="hub-cell" data-act="'+act+'"><span class="hc-ic">'+ic+'</span><span class="hc-l">'+label+'</span></button>';
  $("view-home").innerHTML=
    '<div class="home-greet"><p class="g-hello">'+greet+' ✦</p><p class="g-date">'+dt+'</p></div>'
    +'<div class="home-progress">'+ringSVG(pct,118)+'<div class="hp-right"><div class="hp-num"><b>'+mem+'</b><span>/'+TOTAL+'</span></div><div class="hp-sub">외운 단어</div><div class="hp-meta"><span>'+(stk>0?"🔥 ":"")+'연속 '+stk+'일</span></div></div></div>'
    +'<button class="cta" data-act="'+ctaA+'">'+ctaT+'<small>'+ctaS+'</small><span class="arr">→</span></button>'
    +resume
    +'<div class="sec-label">오늘의 단어</div>'
    +'<div class="wod"><div class="wod-top"><span class="wod-cat">'+CATS[wt[3]]+'</span><span class="wod-num">No.'+String(wi+1).padStart(2,"0")+(isAdded(wt)?' <span class="ext-badge" title="유튜브 외 추가 단어">+</span>':'')+'</span></div>'
    +'<div class="wod-line"><div class="wod-ko">'+esc(wt[0])+'</div><button class="wod-spk" data-say="'+esc(wt[1])+'" aria-label="발음">'+SPK+'</button></div>'
    +'<div class="wod-en">'+esc(wt[1])+'</div><div class="wod-desc">'+esc(wt[2])+'</div>'
    +'<button class="wod-cta" data-act="cat-'+wt[3]+'">사전에서 이 분류 보기 →</button></div>'
    +'<div class="sec-label">카테고리</div>'
    +'<div class="cat-row">'+catRow+'</div>'
    +'<div class="sec-label">바로가기</div>'
    +'<div class="hub">'+cell("go-study",IC_STUDY,"학습 모드")+cell("go-browse",IC_BOOK,"단어 사전")+cell("go-stats",IC_CHART,"학습 통계")+'</div>';
  const wsp=$("view-home").querySelector(".wod-spk");
  if(wsp)wsp.onclick=(e)=>{e.stopPropagation();speak(wsp.dataset.say,wsp);};
  animateView($("view-home"));
}

/* ============ 학습 허브 ============ */
function renderStudy(){
  const remain=TOTAL-memCount();
  const card=(act,ic,tt,sb)=>'<button class="modecard" data-act="'+act+'"><span class="mc-ic">'+ic+'</span><span class="mc-txt"><b>'+tt+'</b><small>'+sb+'</small></span><span class="mc-arr">→</span></button>';
  $("view-study").innerHTML='<h2 class="vh">무엇을 학습할까요?</h2>'
    +card("flash-unknown",'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="15" rx="2"/><path d="M8 6V4.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1.5"/></svg>',"플래시카드 · 안 외운 단어",remain+"개 · 뒤집어 뜻 확인")
    +card("flash-all",'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="15" rx="2"/><path d="M8 6V4.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-1.5"/></svg>',"플래시카드 · 전체",TOTAL+"개 전체 복습")
    +card("quiz-unknown",'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".7" fill="currentColor"/></svg>',"퀴즈 · 안 외운 단어","4지선다 · 맞히면 외움 처리")
    +card("quiz-all",'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".7" fill="currentColor"/></svg>',"퀴즈 · 전체","전체에서 무작위 출제");
}

/* ============ 사전(목록) ============ */
let activeCat="all",query="";
function matches(t){const inCat=activeCat==="all"||t[3]===activeCat;const q=query.toLowerCase();
  const inQ=!q||t[0].toLowerCase().includes(q)||t[1].toLowerCase().includes(q)||t[2].toLowerCase().includes(q);return inCat&&inQ;}
function renderChips(){
  const cnt={};TERMS.forEach(t=>cnt[t[3]]=(cnt[t[3]]||0)+1);
  let h='<button class="chip '+(activeCat==="all"?"on":"")+'" data-cat="all">전체<span class="c">'+TOTAL+'</span></button>';
  for(const k in CATS)h+='<button class="chip '+(activeCat===k?"on":"")+'" data-cat="'+k+'">'+CATS[k]+'<span class="c">'+(cnt[k]||0)+'</span></button>';
  $("chips").innerHTML=h;
  $$(".chip",$("chips")).forEach(c=>c.onclick=()=>{activeCat=c.dataset.cat;renderChips();renderList();});
}
function renderList(){
  const items=TERMS.map((t,i)=>({t,i})).filter(o=>matches(o.t));
  if(!items.length){$("list").innerHTML='<div class="empty">검색 결과가 없습니다.</div>';return;}
  let h="",last=null;
  items.forEach(({t,i})=>{
    if(t[3]!==last&&activeCat==="all"&&!query){h+='<div class="cat-head">'+CATS[t[3]]+'<span></span></div>';last=t[3];}
    const k=known.has(i);
    h+='<article class="card '+(k?"known":"")+'" data-i="'+i+'"><div class="num">'+String(i+1).padStart(2,"0")+(isAdded(t)?'<span class="ext-badge" title="유튜브 외 추가 단어">+</span>':'')+'</div><div class="entry"><div class="term-line"><span class="ko">'+t[0]+'</span><button class="speak-btn" data-say="'+esc(t[1])+'" aria-label="발음 듣기">'+SPK+'</button></div><div class="en">'+t[1]+'</div><div class="desc">'+t[2]+'</div><button class="know-btn">'+(k?"✓ 외웠어요":"외웠어요?")+'</button><details class="ex"><summary>💼 비즈니스 예문</summary><div class="ex-row them"><span class="ex-tag">상대</span><p class="ex-en">'+esc(EXAMPLES[i][0])+'</p><p class="ex-ko">'+esc(EXAMPLES[i][1])+'</p><button class="ex-spk" data-say="'+esc(EXAMPLES[i][0])+'" aria-label="발음">'+SPK+'</button></div><div class="ex-row you"><span class="ex-tag">나</span><p class="ex-en">'+esc(EXAMPLES[i][2])+'</p><p class="ex-ko">'+esc(EXAMPLES[i][3])+'</p><button class="ex-spk" data-say="'+esc(EXAMPLES[i][2])+'" aria-label="발음">'+SPK+'</button></div></details></div></article>';
  });
  $("list").innerHTML=h;
  $$(".speak-btn,.ex-spk",$("list")).forEach(b=>b.onclick=(e)=>{e.stopPropagation();speak(b.dataset.say,b);});
  $$(".know-btn",$("list")).forEach(b=>b.onclick=function(){const c=this.closest(".card"),i=+c.dataset.i;
    if(known.has(i))known.delete(i);else known.add(i);save();c.classList.toggle("known");this.textContent=known.has(i)?"✓ 외웠어요":"외웠어요?";});
}
function renderBrowse(){renderChips();renderList();}

/* ============ 통계 ============ */
function renderStats(){
  const mem=memCount(),pct=TOTAL?Math.round(mem/TOTAL*100):0,cc=catCounts();
  let rows="";
  for(const k in CATS){const c=cc[k],p=c.t?Math.round(c.k/c.t*100):0;
    rows+='<div class="cp-row"><div class="cp-top"><span>'+CATS[k]+'</span><b>'+c.k+'/'+c.t+' · '+p+'%</b></div><div class="cp-bar"><i style="width:'+p+'%"></i></div></div>';}
  $("view-stats").innerHTML='<h2 class="vh">나의 학습 통계</h2>'
    +'<div class="ringcard center">'+ringSVG(pct,160)+'</div>'
    +'<div class="tiles"><div class="tile"><div class="tv">'+mem+'</div><div class="tl">외운 단어</div></div>'
    +'<div class="tile"><div class="tv">'+(TOTAL-mem)+'</div><div class="tl">남은 단어</div></div>'
    +'<div class="tile"><div class="tv">'+streak()+'<small>일</small></div><div class="tl">연속 학습</div></div></div>'
    +'<h3 class="sec">분류별 진도</h3><div class="catprog">'+rows+'</div>';
  animateView($("view-stats"));
}

/* ============ 세션 & 러너 ============ */
let sess=null;let last=DB.last||null;let savedVoiceURI=DB.voiceURI||null;
function openRunner(){$("runner").classList.add("on");document.body.style.overflow="hidden";}
function closeRunner(){$("runner").classList.remove("on");document.body.style.overflow="";try{speechSynthesis.cancel();}catch(e){}renderHome();}
function startSession(mode,scope){
  last={mode,scope};save();
  let q=TERMS.map((_,i)=>i);
  if(scope==="unknown"){const u=q.filter(i=>!known.has(i));q=u.length?u:q;}
  shuffle(q);
  if(mode==="quiz")q=q.slice(0,Math.min(10,q.length));
  sess={mode,scope,q,pos:0,score:0,flipped:new Set()};
  openRunner();renderRunner();
}
function rnBar(){const n=sess.q.length,cur=Math.min(sess.pos+1,n),p=Math.round((sess.pos)/n*100);
  return '<div class="rn-bar"><button class="rn-x" data-act="close-runner" aria-label="닫기">✕</button><div class="rn-prog"><i style="width:'+p+'%"></i></div><span class="rn-count">'+cur+'/'+n+'</span></div>';}

function renderRunner(){
  if(sess.pos>=sess.q.length){return finishRunner();}
  if(sess.mode==="flash")renderFlash();else renderQuiz();
}
function renderFlash(){
  const idx=sess.q[sess.pos],t=TERMS[idx],n=sess.q.length;
  const k=known.has(idx);
  $("runner").innerHTML=rnBar()
    +'<div class="rn-body"><div class="rn-card" id="rnCard"><div class="rn-face rn-front"><div class="rn-tag">No.'+String(idx+1).padStart(2,"0")+'</div><div class="rn-ko">'+t[0]+'</div><div class="rn-hint">탭하면 정답</div></div>'
    +'<div class="rn-face rn-back"><div class="rn-en">'+t[1]+'</div><div class="rn-desc">'+t[2]+'</div><div class="rn-hint">탭하면 단어</div></div></div></div>'
    +'<div class="rn-foot"><div class="rn-actions"><button class="rn-know '+(k?"on":"")+'" id="rnKnow">'+(k?"✓ 외움":"외우기")+'</button><button class="rn-speak" id="rnSpeak">'+SPK+' 발음</button></div>'
    +'<div class="rn-nav"><button class="rn-btn" id="rnPrev" '+(sess.pos===0?"disabled":"")+'>← 이전</button><button class="rn-btn primary" id="rnNext">'+(sess.pos===n-1?"완료":"다음 →")+'</button></div></div>';
  const card=$("rnCard");
  card.onclick=()=>{const f=card.classList.toggle("flipped");if(f&&!sess.flipped.has(idx)){sess.flipped.add(idx);logStudy();}};
  $("rnSpeak").onclick=e=>{e.stopPropagation();speak(t[1],$("rnSpeak"));};
  $("rnKnow").onclick=()=>{if(known.has(idx))known.delete(idx);else known.add(idx);save();renderFlash();};
  $("rnPrev").onclick=()=>{if(sess.pos>0){sess.pos--;renderRunner();}};
  $("rnNext").onclick=()=>{sess.pos++;renderRunner();};
  let sx=0,sy=0;
  card.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  card.addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){if(dx<0){sess.pos++;renderRunner();}else if(sess.pos>0){sess.pos--;renderRunner();}}},{passive:true});
}
function renderQuiz(){
  const idx=sess.q[sess.pos],t=TERMS[idx],n=sess.q.length;
  const correct=t[1];
  const pool=shuffle(TERMS.map((x,i)=>i).filter(i=>i!==idx));
  const opts=[correct];
  for(const i of pool){if(opts.length>=4)break;if(!opts.includes(TERMS[i][1]))opts.push(TERMS[i][1]);}
  shuffle(opts);
  $("runner").innerHTML=rnBar()
    +'<div class="rn-body quiz"><div class="qz-tag">이 단어의 영어는?</div><div class="qz-q">'+t[0]+' <button class="qz-spk" id="qzSpk" aria-label="발음">'+SPK+'</button></div>'
    +'<div class="qz-opts">'+opts.map(o=>'<button class="qz-opt" data-opt="'+esc(o)+'">'+o+'</button>').join("")+'</div></div>'
    +'<div class="rn-foot"><button class="rn-btn primary" id="qzNext" disabled>'+(sess.pos===n-1?"결과 보기":"다음 →")+'</button></div>';
  $("qzSpk").onclick=()=>speak(correct,$("qzSpk"));
  let answered=false;
  $$(".qz-opt").forEach(b=>b.onclick=()=>{
    if(answered)return;answered=true;logStudy();
    const ok=b.dataset.opt===correct;
    $$(".qz-opt").forEach(x=>{x.classList.add("done");if(x.dataset.opt===correct)x.classList.add("correct");});
    if(ok){b.classList.add("correct");sess.score++;known.add(idx);save();}else{b.classList.add("wrong");}
    speak(correct,null);
    $("qzNext").disabled=false;
  });
  $("qzNext").onclick=()=>{sess.pos++;renderRunner();};
}
function finishRunner(){
  const n=sess.q.length;
  let body;
  if(sess.mode==="quiz"){const sc=sess.score,pc=Math.round(sc/n*100);
    body='<div class="rn-result"><div class="res-emoji">'+(pc>=80?"🎉":pc>=50?"👍":"💪")+'</div><div class="res-big">'+sc+' <span>/ '+n+'</span></div><p class="res-sub">정답률 '+pc+'% · 맞힌 단어는 외움 처리됐어요</p>'
      +'<div class="res-btns"><button class="rn-btn" data-act="retry">다시 풀기</button><button class="rn-btn primary" data-act="close-runner">완료</button></div></div>';
  }else{
    body='<div class="rn-result"><div class="res-emoji">✨</div><div class="res-big">'+n+'<span> 단어</span></div><p class="res-sub">학습 완료! 외운 단어 '+memCount()+'/'+TOTAL+'</p>'
      +'<div class="res-btns"><button class="rn-btn" data-act="retry">다시 보기</button><button class="rn-btn primary" data-act="close-runner">완료</button></div></div>';
  }
  $("runner").innerHTML='<div class="rn-bar"><button class="rn-x" data-act="close-runner">✕</button><div class="rn-prog"><i style="width:100%"></i></div><span class="rn-count">'+n+'/'+n+'</span></div><div class="rn-body">'+body+'</div>';
}

/* ============ 설정 시트 ============ */
function openSheet(){$("sheet").classList.add("open");$("backdrop").classList.add("open");}
function closeSheet(){$("sheet").classList.remove("open");$("backdrop").classList.remove("open");}

/* ============ 이벤트 ============ */
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-act]");if(!a)return;
  const act=a.dataset.act;
  if(act==="flash-unknown")startSession("flash","unknown");
  else if(act==="flash-all")startSession("flash","all");
  else if(act==="quiz-unknown")startSession("quiz","unknown");
  else if(act==="quiz-all")startSession("quiz","all");
  else if(act==="close-runner")closeRunner();
  else if(act==="retry"&&last)startSession(last.mode,last.scope);
  else if(act==="resume"&&last)startSession(last.mode,last.scope);
  else if(act&&act.startsWith("cat-")){activeCat=act.slice(4);query="";const s=$("search");if(s)s.value="";go("browse");}
  else if(act&&act.startsWith("go-"))go(act.slice(3));
});
$$(".tab").forEach(b=>b.onclick=()=>go(b.dataset.v));
$("gearBtn").onclick=openSheet;
$("backdrop").onclick=closeSheet;
$("voiceSel").addEventListener("change",e=>{chosenVoice=voices[+e.target.value]||null;savedVoiceURI=chosenVoice?chosenVoice.voiceURI:null;save();});
$("rate").addEventListener("input",e=>{curRate=+e.target.value;$("rateVal").textContent=curRate.toFixed(2)+"x";});
$("resetBtn").onclick=()=>{if(confirm("외움 표시와 학습 기록을 모두 초기화할까요?")){known.clear();days.clear();log={};last=null;savedVoiceURI=null;save();closeSheet();go("home");}};
$("search").addEventListener("input",e=>{query=e.target.value.trim();renderList();});

/* ============ 시작 ============ */
$("rateVal").textContent=curRate.toFixed(2)+"x";
go("home");
