'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const state={started:true,confirmed:false,policy:1,split:false,receipt:false};
 function announce(message){$('live-status').textContent=message;}
 function update(){
  for(const key of ['split','receipt']){
   const hint=$(key+'-hint');
   hint.textContent=state.confirmed?'시연 확인이 고정되었습니다.':state[key]?'✓ 확인 내용을 반영했습니다.':$(key+'-check').disabled?'위 근거 자료를 열면 확인란이 활성화됩니다.':'확인 가능 · 자료의 관계를 검토한 뒤 선택해 주세요.';
  }
  const remaining=Number(!state.split)+Number(!state.receipt);
  $('pending-count').textContent=state.confirmed?'시연 제출본 확정':remaining?`확인 ${remaining}개 남음`:'확정할 준비가 됐습니다';
  $('confirm').disabled=remaining>0||state.confirmed;
  $('confirm').textContent=state.confirmed?'시연 확정 완료':'시연 제출본 확정';
  $('confirm-help').textContent=state.confirmed?'v1.1의 시연 확인 기록을 고정했습니다. 실제 발매 승인이 아닙니다.':remaining?'각 근거를 연 뒤 확인란을 선택하면 확정할 수 있습니다.':'확인한 예시 제출본을 고정해 보세요.';
  $('download').hidden=!state.confirmed;document.querySelector('.review-contact').hidden=!state.confirmed;
  $('split-state').textContent=state.split?'✓ 담당자 확인 완료 · 시연':'! 참여자 합의 확인 필요';
  $('receipt-state').textContent=state.receipt?'✓ 담당자 확인 완료 · 시연':'! 곡·생성 시점과의 관계 확인 필요';
  $('split-state').classList.toggle('done',state.split);
  $('receipt-state').classList.toggle('done',state.receipt);
  for(let i=1;i<=3;i++)$('step'+i).removeAttribute('aria-current');
  $('step'+(!state.started?1:state.confirmed?3:2)).setAttribute('aria-current','step');
 }
 $('start').addEventListener('click',()=>{state.started=true;$('welcome').hidden=true;$('review').hidden=false;update();$('review-heading').focus();});
 for(const key of ['split','receipt']){
  $(key+'-proof').addEventListener('toggle',()=>{if($(key+'-proof').open&&!state.confirmed){$(key+'-check').disabled=false;update();}});
  $(key+'-check').addEventListener('change',()=>{state[key]=$(key+'-check').checked;update();announce($('pending-count').textContent);});
 }
 $('confirm').addEventListener('click',()=>{
  if(!state.split||!state.receipt)return;
  state.confirmed=true;for(const key of ['split','receipt'])$(key+'-check').disabled=true;
  update();announce('시연 제출본 v1.1을 확정했습니다. 실제 유통 승인이 아닙니다.');
 });
 $('policy').addEventListener('click',()=>{
  state.policy++;state.confirmed=false;state.receipt=false;$('receipt-check').checked=false;$('receipt-check').disabled=true;$('receipt-proof').open=false;
  $('split-check').disabled=false;$('policy-note').hidden=false;$('policy-note').textContent=`! 기준 변경 시연: 증빙에 적용된 예시 기준이 v${state.policy}로 바뀌었습니다. 증빙을 다시 열고 관련 확인을 진행해 주세요.`;
  update();announce('증빙 기준이 변경되어 해당 확인이 무효화됐습니다. 지분 확인과 이전 제출본은 유지됩니다.');$('receipt-proof').querySelector('summary').focus();
 });
 $('reset').addEventListener('click',()=>{
  Object.assign(state,{started:true,confirmed:false,policy:1,split:false,receipt:false});
  for(const key of ['split','receipt']){$(key+'-check').checked=false;$(key+'-check').disabled=true;$(key+'-proof').open=false;}
  $('policy-note').hidden=true;$('welcome').hidden=true;$('review').hidden=false;update();$('review-heading').focus();
 });
 $('download').addEventListener('click',()=>{
  if(!state.confirmed)return;
  const data={synthetic:true,realDistributionApproval:false,version:'v1.1',title:'Blue Hour',policyVersion:state.policy,credits:[{name:'김창작',share:60},{name:'이보컬',share:40}],demoReview:{split:state.split,receipt:state.receipt},note:'합성 자료로 만든 UI 시연 결과. 실제 권리 증빙, 검수 또는 발매 승인 아님.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='formu-music-synthetic-v1.1.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('합성 시연 JSON을 내려받았습니다.');
 });
 update();
})();


(()=>{
 const byId=id=>document.getElementById(id);
 document.querySelectorAll('[data-role-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const id=a.dataset.roleLink==='team'?'panel-team':'artist';if(id==='panel-team')byId('start').click();history.replaceState(null,'','#'+id);byId(id).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
 const chapters=[['v1.0 / 유통 신청','아티스트 신청','neutral','아티스트가 유통사에 신청합니다.','공개 신청 폼 또는 계정에서 제출합니다. 사전 심사와 계약은 회사별로 순서가 다릅니다.'],['v1.0 / 접수·검토','유통팀 검토','neutral','유통팀이 접수된 자료를 확인합니다.','음원·아트워크·발매정보와 필요한 증빙을 검토합니다. 자료 부족 시 보완을 요청할 수 있습니다.'],['v1.0 → v1.1 / 보완','재검토 필요','modified','요청받은 자료를 아티스트가 보완합니다.','합성 예시: 50/50 지분을 합의 자료에 맞춰 60/40으로 수정하고 이용 증빙을 추가합니다.'],['v1.1 / 담당자 확인','담당자 검토','approved','유통팀이 변경된 자료와 근거를 확인합니다.','담당자 확인, 플랫폼 전달, 실제 발매는 서로 다른 상태입니다. 포뮤가 권리를 인증하지 않습니다.']];

 function chapter(i,focus=false){chapters.forEach((_,n)=>{const b=byId('chapter-'+n);b.setAttribute('aria-selected',String(i===n));b.tabIndex=i===n?0:-1;});const d=chapters[i];byId('chapter-panel').setAttribute('aria-labelledby','chapter-'+i);byId('chapter-panel').dataset.stage=i;byId('chapter-version').textContent=d[0];byId('chapter-state').textContent=d[1];byId('chapter-state').className='chip '+d[2];byId('chapter-title').textContent=d[3];byId('chapter-copy').textContent=d[4];if(focus)byId('chapter-'+i).focus();}
 chapter(0);
 chapters.forEach((_,i)=>byId('chapter-'+i).addEventListener('click',()=>chapter(i)));
 document.querySelector('.chapter-list').addEventListener('keydown',e=>{const i=chapters.findIndex((_,n)=>byId('chapter-'+n).getAttribute('aria-selected')==='true');if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();chapter(e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowDown'?1:3))%4,true);}});
 const scene=document.querySelector('.disc-scene');if(matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches){scene.addEventListener('pointermove',e=>{const r=scene.getBoundingClientRect();scene.style.setProperty('--tilt-x',((e.clientY-r.top)/r.height-.5)*-10+'deg');scene.style.setProperty('--tilt-y',((e.clientX-r.left)/r.width-.5)*16+'deg');});scene.addEventListener('pointerleave',()=>{scene.style.setProperty('--tilt-x','0deg');scene.style.setProperty('--tilt-y','0deg');});}
 const sections=['top','handoff','demo','pilot'].map(byId);let queued=false;
 function updateNav(){queued=false;let active=sections[0];for(const section of sections){if(section.getBoundingClientRect().top<=180)active=section;}document.querySelectorAll('[data-section]').forEach(a=>{if(a.dataset.section===active.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateNav);}},{passive:true});updateNav();
})();

(()=>{const scene=document.querySelector('.disc-scene'),button=document.getElementById('assemble'),status=document.getElementById('assembly-status');button.addEventListener('click',()=>{const active=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(active));scene.classList.toggle('is-assembled',active);button.innerHTML=active?'흩어진 자료 보기 <span>↙</span>':'자료 모아보기 <span>↗</span>';status.textContent=active?'음원·크레딧·증빙이 연결된 제출본 예시입니다.':'흩어진 세 자료를 하나의 제출본으로.';});if(!matchMedia('(prefers-reduced-motion:reduce)').matches){let pending=false;addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(()=>{scene.style.setProperty('--scroll-turn',Math.min(scrollY/35,18)+'deg');pending=false;});}},{passive:true});}})();

(()=>{const dialog=document.getElementById('case-dialog');let opener;const cases={workflow:{source:'공개 사례 / Tarka Labs',title:'흩어진 음악 유통 업무를 연결하는 문제',steps:['별도 로그인·사이트 이동','SSO·통합 방식 비교','기성 플랫폼 선택'],copy:'Tarka Labs의 익명 음악 유통 고객은 웹앱·AudioSalad·Tipalti 등으로 나뉜 로그인과 사이트 이동 문제를 겪었습니다. 통합 방식 세 가지를 비교한 뒤 기성 플랫폼을 선택했다고 설명합니다. 접점 분산의 사례이며 포뮤의 보완 검수 효과를 입증하지는 않습니다.',question:'우리 고객은 보완 요청과 파일 대조에 실제로 얼마나 시간을 쓰며, 기존 도구보다 줄일 수 있을까요?',url:'https://tarkalabs.com/works/music-distribution-discovery/'},metadata:{source:'공개 제품 자료 / Revelator',title:'메타데이터 점검은 이미 경쟁 기능입니다',steps:['크레딧·필수 정보','Metadata Inspector','누락·오류 점검'],copy:'Revelator는 2024 업데이트에서 보컬·작곡가·프로듀서 등의 필수 크레딧 검증과 Metadata Inspector의 오류 탐지·데이터 검증 기능을 소개합니다. 기본 정보 점검은 이미 제공되는 기능이므로, 포뮤는 재제출 비교와 증빙 확인에서 추가 가치를 검증해야 합니다.',question:'기존 점검으로 해결되지 않는 재제출 비교와 증빙 확인 업무가 있으며, 팀이 추가 비용을 지불할까요?',url:'https://revelator.com/newsroom/revelator-2024-product-updates-smarter-tools-for-music-businesses'}};document.querySelectorAll('[data-case]').forEach(button=>button.addEventListener('click',()=>{opener=button;const c=cases[button.dataset.case];document.getElementById('case-source').textContent=c.source;document.getElementById('case-title').textContent=c.title;document.getElementById('case-copy').textContent=c.copy;document.getElementById('case-question').textContent=c.question;document.getElementById('case-original').href=c.url;document.getElementById('case-graphic').replaceChildren(...c.steps.map((text,i)=>{const el=document.createElement('div');const n=document.createElement('small');n.textContent=String(i+1).padStart(2,'0');const strong=document.createElement('strong');strong.textContent=text;el.append(n,strong);return el;}));dialog.showModal();}));dialog.querySelector('.case-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>opener?.focus());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});})();

if(window.gsap&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);gsap.matchMedia().add('(prefers-reduced-motion: no-preference)',()=>{gsap.from('.role-record',{rotation:-18,y:24,duration:.7,stagger:.12,ease:'power2.out',scrollTrigger:{trigger:'.role-entry',start:'top 85%',once:true}});});}

/* Spatial interaction: cards respond to selection; the same files travel through the workflow. */
(()=>{if(!window.gsap||!window.ScrollTrigger)return;gsap.matchMedia().add('(prefers-reduced-motion: no-preference)',()=>{const cleanups=[];const cards=document.querySelectorAll('.role-card');cards.forEach(card=>{const move=e=>{if(!matchMedia('(hover:hover)').matches)return;const r=card.getBoundingClientRect();gsap.to(card,{rotationY:((e.clientX-r.left)/r.width-.5)*7,rotationX:((e.clientY-r.top)/r.height-.5)*-5,transformPerspective:1000,duration:.45,ease:'power2.out'});};const leave=()=>gsap.to(card,{rotationX:0,rotationY:0,duration:.6,ease:'power3.out'});card.addEventListener('pointermove',move);card.addEventListener('pointerleave',leave);cleanups.push(()=>{card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',leave);gsap.set(card,{clearProps:'transform'});});});gsap.fromTo('.release-sleeve',{y:0},{y:-55,scrollTrigger:{trigger:'.hero-stage',start:'top top',end:'bottom top',scrub:1}});gsap.fromTo('.note-a',{y:0},{y:-30,scrollTrigger:{trigger:'.hero-stage',start:'top top',end:'bottom top',scrub:1.2}});const files=[...document.querySelectorAll('.file-shelf>div')];const poses=[[[-45,10,-12],[0,-12,3],[45,12,14]],[[-20,0,-4],[0,0,0],[20,0,4]],[[-30,4,-6],[0,-18,0],[32,-26,8]],[[0,0,0],[0,0,0],[0,0,0]]];document.querySelectorAll('.chapter-list button').forEach((button,i)=>{const click=()=>{gsap.killTweensOf(files);files.forEach((file,n)=>gsap.to(file,{x:poses[i][n][0],y:poses[i][n][1],rotation:poses[i][n][2],duration:.65,delay:n*.055,ease:'power3.out'}));gsap.fromTo('.chapter-caption',{opacity:.4,y:12},{opacity:1,y:0,duration:.4,ease:'power2.out'});};button.addEventListener('click',click);cleanups.push(()=>button.removeEventListener('click',click));});return()=>cleanups.forEach(fn=>fn());});})();

/* Scroll-driven artist preparation. Hidden role panels never retain scroll space. */
(()=>{
 const root=document.querySelector('.artist-film'),section=document.getElementById('artist'),panel=document.getElementById('panel-artist');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const titles=['아티스트가 유통을 신청합니다.','유통팀 접수함에 신청이 도착합니다.','유통팀이 필요한 보완을 요청합니다.','아티스트가 지분과 증빙을 보완합니다.','보완본 v1.1을 다시 제출합니다.','유통팀이 바뀐 두 자료를 검토합니다.'];
 const copies=['이 시연은 발매자료 접수 이후의 흐름을 보여줍니다. 신규 아티스트 수락·계약 절차는 유통사마다 다릅니다.','최초 제출은 50/50 지분, 이용 증빙 미첨부 상태입니다. 이후 보완본과 비교할 기준으로 남습니다.','합의 자료와 지분의 일치 여부, 해당 곡의 이용 증빙을 요청합니다.','합의 자료에 맞춰 60/40으로 수정하고 영수증을 추가합니다. 음악 파일은 그대로 유지합니다.','수정된 자료가 기존 신청에 연결됩니다. 이전 버전도 비교를 위해 남습니다.','다음 화면에서 근거를 열고 확인하세요. 이 시연은 실제 유통 승인이나 저작권 인증을 하지 않습니다.'];
 const buttons=[...root.querySelectorAll('.film-chapters button')],cta=document.getElementById('film-handoff');let last=-1,queued=false;
 const clamp=n=>Math.max(0,Math.min(1,n));
 const viewport=root.querySelector('.film-stage');
 const groups=[['.film-intake'],['.film-initial'],['.film-request'],['.film-revision'],['.film-resubmit'],['.film-received']].map(selectors=>{
  const scene=document.createElement('div');scene.className='film-scene';
  selectors.forEach(selector=>scene.append(root.querySelector(selector)));viewport.append(scene);return scene;
 });
 function render(progress){
  const stage=Math.min(5,Math.floor(progress*6));root.dataset.film=stage;
  root.style.setProperty('--film-progress',progress);
  if(stage!==last){
   const direction=stage>last?1:-1;last=stage;
   const jobs=[['제출 항목을 한곳에 모읍니다.','유통팀이 정한 접수 항목에 맞춰 음원·정보·증빙을 받는 공간입니다.'],['신청을 하나의 검토 건으로 묶습니다.','누가 보낸 어떤 곡인지, 최초 제출 자료를 함께 확인합니다.'],['보완 요청을 해당 자료에 연결합니다.','무엇을 왜 고쳐야 하는지, 요청과 대상 항목을 함께 남깁니다.'],['요청과 수정 내용을 이어줍니다.','아티스트가 어떤 요청에 답했는지 같은 신청 안에서 확인합니다.'],['이전 제출본과 보완본을 보관합니다.','v1.0을 덮어쓰지 않고 v1.1을 연결해 변경 이력을 남깁니다.'],['바뀐 자료와 근거를 함께 보여줍니다.','담당자가 이전·이후 값과 증빙을 비교합니다. 최종 판단은 유통팀이 합니다.']];
   document.getElementById('formu-job-title').textContent=jobs[stage][0];document.getElementById('formu-job-copy').textContent=jobs[stage][1];

   groups.forEach((scene,i)=>{scene.getAnimations().forEach(animation=>animation.cancel());scene.hidden=i!==stage;scene.inert=i!==stage;});
   if(!reduced.matches)groups[stage].animate([{transform:`translateX(${direction*40}px)`},{transform:'translateX(0)'}],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)'});
   document.getElementById('film-title').textContent=titles[stage];document.getElementById('film-copy').textContent=copies[stage];document.getElementById('film-count').textContent=(stage+1)+' / 6';buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)));
  }
  const teamActive=[1,2,5].includes(stage);
  document.getElementById('cast-team').classList.toggle('is-active',teamActive);
  document.getElementById('cast-artist').classList.toggle('is-active',!teamActive);
  document.getElementById('cast-team-state').textContent=teamActive?(stage===2?'진행 중 · 보완 요청':'진행 중 · 자료 검토'):'신청·보완본 대기';
  document.getElementById('cast-artist-state').textContent=teamActive?'검토·요청 확인 대기':stage===0?'진행 중 · 신청 작성':stage===3?'진행 중 · 자료 수정':'진행 중 · 재제출';
  const token=document.getElementById('transfer-token'),local=clamp(progress*6-stage);
  token.hidden=![0,2,4].includes(stage);token.textContent=stage===2?'← 보완 요청':stage===0?'최초 제출 →':'보완본 →';token.style.left=((stage===2?1-local:local)*76+12)+'%';
  cta.hidden=stage!==5;cta.textContent='유통 검토본 확인하기 →';root.classList.toggle('film-complete',stage===5);

 }
 function distance(){return Math.max(1,section.offsetHeight-innerHeight);}
 function update(){queued=false;if(panel.hidden||reduced.matches||innerHeight<=850)return;render(clamp((90-section.getBoundingClientRect().top)/distance()));}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
 function go(i){if(reduced.matches||innerHeight<=850){render(i===4?1:(i+1.1)/6);return;}const target=scrollY+section.getBoundingClientRect().top-90+distance()*(i===4?1:(i+1.1)/6);scrollTo({top:target,behavior:'smooth'});}
 buttons.forEach((b,i)=>b.addEventListener('click',()=>go(i-1)));
 document.getElementById('film-reset').addEventListener('click',()=>go(-1));
 cta.addEventListener('click',()=>{document.getElementById('start').click();history.replaceState(null,'','#panel-team');const heading=document.getElementById('review-section-title');heading.focus({preventScroll:true});heading.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});});

 new MutationObserver(()=>{if(!panel.hidden){render(0);schedule();}window.ScrollTrigger?.refresh();}).observe(panel,{attributes:true,attributeFilter:['hidden']});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduced.addEventListener('change',()=>{render(0);schedule();});render(0);schedule();
})();

// Hover rotates only the record; explicit activation controls the sleeve.
document.querySelectorAll('.record-price').forEach(card=>{
 const button=card.querySelector('.record-flip'),front=card.querySelector('.record-front'),back=card.querySelector('.record-back');
 function show(open){card.classList.toggle('is-flipped',open);button.setAttribute('aria-expanded',String(open));front.inert=open;back.inert=!open;button.firstChild.textContent=open?'앞면으로 돌아가기 ':'클릭해서 이용 조건 보기 ';}
 card.addEventListener('click',e=>{if(e.target.closest('a'))return;show(!card.classList.contains('is-flipped'));});
 card.addEventListener('keydown',e=>{if(e.key==='Escape'){show(false);button.focus()}});
 show(false);
});

document.querySelectorAll('[data-contact-role]').forEach(a=>a.addEventListener('click',()=>{document.querySelector(`#music-contact input[value="${a.dataset.contactRole}"]`).checked=true;}));
document.getElementById('music-contact').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type=submit]'),status=document.getElementById('contact-status');if(!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form));button.disabled=true;status.textContent='접수 중입니다…';
 try{const response=await fetch('/api/music-signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok||!result.success)throw Error();status.textContent='사전 신청이 접수되었습니다. 남겨주신 이메일로 진행 가능 여부를 안내합니다.';form.reset();}
 catch{status.textContent='접수되지 않았습니다. 현재 서버 연결을 확인할 수 없습니다. 입력 내용은 유지되며 잠시 후 다시 시도해 주세요.';}
 finally{button.disabled=false;status.focus({preventScroll:true});}
});

 document.getElementById('welcome').hidden=true;document.getElementById('review').hidden=false;
