'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const API_BASE=location.hostname==='formu-music.onrender.com'?'https://formu-music-api.onrender.com':'';
$$('a[href="./check"],a[href="./check.html"]').forEach(a=>{a.href=API_BASE+'/check';});
async function apiJson(response){
 const text=await response.text();
 if(!text.trim())throw Error('점검 서버가 결과를 보내지 않았습니다. 잠시 후 다시 시도해 주세요.');
 let data;try{data=JSON.parse(text);}catch{throw Error('점검 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
 return data;
}
async function wakeServer(){
 message($('#check-result'),'점검 서버 연결 중입니다. 첫 연결에는 최대 1분 정도 걸릴 수 있습니다.');
 const r=await fetch(API_BASE+'/api/health',{signal:AbortSignal.timeout(75000)});
 const d=await apiJson(r);if(!r.ok||d.status!=='ok')throw Error('점검 서버를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let selected=null,checking=false;
function message(target,text){target.hidden=false;target.textContent=text;}
function choose(file){if(checking)return;selected=null;$('#check-result').hidden=true;if(file&&(!file.size||file.size>100_000_000)){message($('#check-result'),'0 MB 초과, 100 MB 이하 파일을 선택해 주세요.');file=null;}selected=file;$('#file-label').textContent=file?file.name:'음원 한 곡을 놓아주세요.';$('#file-selected').hidden=!file;$('#file-info').textContent=file?`${(file.size/1e6).toFixed(1)} MB · 분석할 파일`:'';$('#analyze').disabled=!file;$('#analyze').textContent=file?'이 파일 무료 점검 →':'파일 선택 후 점검 시작 →';}
$('#audio-file').addEventListener('change',e=>choose(e.target.files[0]));
$('#clear-file').onclick=()=>{$('#audio-file').value='';choose(null);};
for(const event of ['dragenter','dragover'])$('#dropzone').addEventListener(event,e=>{e.preventDefault();$('#dropzone').classList.add('dragging');});
for(const event of ['dragleave','drop'])$('#dropzone').addEventListener(event,e=>{e.preventDefault();$('#dropzone').classList.remove('dragging');});
$('#dropzone').addEventListener('drop',e=>{if(e.dataTransfer.files.length!==1){message($('#check-result'),'한 번에 음원 한 곡을 선택해 주세요.');return;}choose(e.dataTransfer.files[0]);});
// Selection is held separately so drag-and-drop does not need to modify a native FileList.
$('#audio-form').noValidate=true;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let latestReport=null;
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function renderCriteriaResult(report){
 const container=$('#criteria-my-result');
 if(!container)return;
 if(!report||!report.metrics){
  container.innerHTML='<p class="empty-result-note">파일 점검을 진행하면 기준값과 내 파일의 측정값이 이곳에 나란히 비교되어 표시됩니다.</p>';
  return;
 }
 const m=report.metrics,checks=report.checks||[];
 const cName={pcm_s16le:'WAV (16bit)',pcm_s24le:'WAV (24bit)',pcm_s32le:'WAV (32bit)',mp3:'MP3',flac:'FLAC',aac:'M4A (AAC)',alac:'M4A (ALAC)',aiff:'AIFF'}[m.codec]||(m.codec?String(m.codec).toUpperCase():'확인 불가');
 const sizeMB=m.sizeBytes?(m.sizeBytes/1e6).toFixed(2)+' MB':(selected?(selected.size/1e6).toFixed(2)+' MB':'확인 불가');
 let durText='확인 불가';
 if(Number.isFinite(m.durationSeconds)){
  const s=Math.round(m.durationSeconds),mm=String(Math.floor(s/60)).padStart(2,'0'),ss=String(s%60).padStart(2,'0');
  durText=`${mm}:${ss} (${m.durationSeconds.toFixed(1)}초)`;
 }
 const srText=m.sampleRate?`${(m.sampleRate/1000).toLocaleString('ko-KR')} kHz`:'확인 불가';
 let peakText='미확인';
 if(m.samplePeakDbfs==='-inf')peakText='-inf dBFS (무음)';
 else if(m.samplePeakDbfs!==undefined&&Number.isFinite(Number(m.samplePeakDbfs)))peakText=`${Number(m.samplePeakDbfs).toFixed(2)} dBFS`;

 const formatCheck=checks.find(c=>c.title.includes('접수 파일 형식')||c.title.includes('형식'));
 const formatStatus=formatCheck?formatCheck.status:'info';
 const sizeCheck=checks.find(c=>c.title.includes('파일 크기'));
 const sizeStatus=sizeCheck?sizeCheck.status:'pass';
 const durCheck=checks.find(c=>c.title.includes('트랙 길이')||c.title.includes('재생 길이'));
 const durStatus=durCheck?durCheck.status:'pass';
 const peakCheck=checks.find(c=>c.title.includes('샘플 피크')||c.title.includes('무음')||c.title.includes('피크 레벨'));
 const peakStatus=peakCheck?peakCheck.status:'info';

 const statusLabel={pass:'✓ 충족',supplement:'! 보완',hold:'Ⅱ 확인',info:'참고'};
 const chipClass={pass:'chip-pass',supplement:'chip-fail',hold:'chip-warn',info:'chip-info'};
 const fileName=selected?selected.name:(m.fileName||'점검한 음원 파일');

 container.innerHTML=`<div class="my-compare-sheet"><div class="my-compare-head"><span class="compare-file-label">점검 파일:</span><strong class="compare-file-name">${escapeHtml(fileName)}</strong></div><div class="table-responsive"><table class="sub-compare-table"><thead><tr><th scope="col">구분</th><th scope="col">적용 기준</th><th scope="col">내 파일 측정값</th><th scope="col">충족 여부</th></tr></thead><tbody><tr><th scope="row">형식</th><td>WAV, MP3, FLAC, AIFF, M4A, WMA</td><td><strong>${escapeHtml(cName)}</strong></td><td><span class="status-chip ${chipClass[formatStatus]||'chip-info'}">${statusLabel[formatStatus]||'참고'}</span></td></tr><tr><th scope="row">용량</th><td>100 MB 이하</td><td><strong>${escapeHtml(sizeMB)}</strong></td><td><span class="status-chip ${chipClass[sizeStatus]||'chip-pass'}">${statusLabel[sizeStatus]||'✓ 충족'}</span></td></tr><tr><th scope="row">길이</th><td>5시간 미만 (평균 60초 이상 권장)</td><td><strong>${escapeHtml(durText)}</strong></td><td><span class="status-chip ${chipClass[durStatus]||'chip-pass'}">${statusLabel[durStatus]||'✓ 충족'}</span></td></tr><tr><th scope="row">샘플레이트</th><td>44.1 kHz 이상 권장</td><td><strong>${escapeHtml(srText)}</strong></td><td><span class="status-chip chip-info">참고</span></td></tr><tr><th scope="row">피크 레벨</th><td>0 dBFS 미만 (클리핑 방지)</td><td><strong>${escapeHtml(peakText)}</strong></td><td><span class="status-chip ${chipClass[peakStatus]||'chip-info'}">${statusLabel[peakStatus]||'참고'}</span></td></tr></tbody></table></div></div>`;
}
function openCriteriaModal(report){
 const rep=report||latestReport;
 renderCriteriaResult(rep);
 const dia=$('#criteria-dialog');
 if(dia)dia.showModal();
}
function renderReport(report){
 if(!report||!Array.isArray(report.checks)||!report.rule||!['ready','supplement','hold'].includes(report.status))throw Error('점검 결과 형식을 확인하지 못했습니다. 다시 점검해 주세요.');
 latestReport=report;
 const metricsData=report.metrics||{},box=$('#check-result');box.replaceChildren();box.hidden=false;

 // 1. 상단 파일명 및 문패
 const topBar=el('div',undefined,'sheet-topbar');
 const topMeta=el('div',undefined,'sheet-meta');
 topMeta.append(el('span','FORMU / FILE CHECK','eyebrow-sheet'),el('span','파일 기술 점검','sheet-tag'));
 const fileName=el('div',selected?selected.name:(metricsData.fileName||'음원 파일'),'sheet-filename');
 topBar.append(topMeta,fileName);
 box.append(topBar);

 // 2. 전체 판정 블록
 const verdictBlock=el('div',undefined,`sheet-verdict status-${report.status}`);
 const verdictHeader=el('div',undefined,'verdict-header');
 const statusConfig={
  ready:{title:'파일 규격 통과',badgeText:'✓ 기준 충족',tone:'pass',description:'검사한 파일 항목에서 보완할 사항이 발견되지 않았습니다.',primaryAction:'다른 파일 점검하기 →'},
  supplement:{title:'보완 필요',badgeText:`! ${String(report.checks.filter(c=>c.status==='supplement').length).padStart(2,'0')}개`,tone:'fail',description:'기준을 충족하지 못한 항목을 수정한 뒤 다시 점검하세요.',primaryAction:'수정한 파일 선택하기 →'},
  hold:{title:'판단 보류',badgeText:'Ⅱ 확인 필요',tone:'pending',description:'확인하지 못한 항목이 있습니다. 아래 사유를 확인하세요.',primaryAction:'이 파일 다시 점검하기 →'}
 };
 const cfg=statusConfig[report.status];
 verdictHeader.append(el('h3',cfg.title,'verdict-title'),el('span',cfg.badgeText,`sheet-badge ${cfg.tone}`));
 verdictBlock.append(verdictHeader,el('p',cfg.description,'verdict-desc'),el('p','파일 기술 점검 결과이며, 유통사의 발매 승인·거절을 뜻하지 않습니다.','sheet-disclaimer'));
 box.append(verdictBlock);

 // 3. 3개 파일 정보 행
 const metricsGrid=el('div',undefined,'sheet-metrics');
 const codecName={pcm_s16le:'WAV',pcm_s24le:'WAV (24bit)',pcm_s32le:'WAV (32bit)',mp3:'MP3',flac:'FLAC',aac:'M4A (AAC)',alac:'M4A (ALAC)',aiff:'AIFF'}[metricsData.codec]||(metricsData.codec?String(metricsData.codec).toUpperCase():'확인 불가');
 const srText=metricsData.sampleRate?`${(metricsData.sampleRate/1000).toLocaleString('ko-KR')} kHz`:'확인 불가';
 let durText='확인 불가';
 if(Number.isFinite(metricsData.durationSeconds)){
  const s=Math.round(metricsData.durationSeconds),mm=String(Math.floor(s/60)).padStart(2,'0'),ss=String(s%60).padStart(2,'0');
  durText=`${mm}:${ss}`;
 }
 for(const [val,lbl] of [[codecName,'파일 형식'],[srText,'샘플레이트'],[durText,'재생 길이']]){
  const col=el('div',undefined,'metric-col');col.append(el('strong',val,'metric-val'),el('span',lbl,'metric-lbl'));metricsGrid.append(col);
 }
 box.append(metricsGrid);

 const renderRow=c=>{
  const row=el('div',undefined,`sheet-check-row status-${c.status}`);
  const rowHead=el('div',undefined,'check-head');
  const badgeLabel={supplement:'! 보완 필요',hold:'Ⅱ 확인 필요',pass:'✓ 충족',info:'참고'}[c.status]||'참고';
  const badgeCls={supplement:'fail',hold:'pending',pass:'pass',info:'info'}[c.status]||'info';
  rowHead.append(el('span',badgeLabel,`row-badge ${badgeCls}`),el('strong',c.title,'row-title'));
  row.append(rowHead,el('p',c.detail,'row-detail'));
  return row;
 };

 // 4. 먼저 확인할 항목 (문제 항목)
 const attention=report.checks.filter(c=>c.status==='supplement'||c.status==='hold');
 if(attention.length>0){
  const attentionSec=el('section',undefined,'sheet-attention');
  attentionSec.append(el('h4',`먼저 확인할 항목 ${attention.length}개`,'attention-heading'));
  attention.forEach(c=>attentionSec.append(renderRow(c)));
  box.append(attentionSec);
 }

 // 5. 나머지 점검 항목 (접힌 영역, 문제 항목 중복 제거)
 const remaining=report.checks.filter(c=>c.status!=='supplement'&&c.status!=='hold');
 if(remaining.length>0){
  const remainingDetails=el('details',undefined,'sheet-remaining');
  remainingDetails.append(el('summary',`› 나머지 점검 항목 ${remaining.length}개 보기`,'remaining-summary'));
  remaining.forEach(c=>remainingDetails.append(renderRow(c)));
  box.append(remainingDetails);
 }

 // 6. 기준 및 한계 안내
 const footInfo=el('div',undefined,'sheet-foot-info');
 footInfo.append(el('p','검사 범위: 파일 기술 항목. 음악·말소리 구분과 권리 확인은 미검사.','scope-note'));
 const scopeDetails=el('details',undefined,'scope-details');
 scopeDetails.append(el('summary','검사 범위 자세히','scope-summary'),el('p','현재는 소리의 내용을 분류하지 않습니다. 음악·대화 녹음·테스트 신호도 파일 규격이 같으면 통과할 수 있습니다.','scope-full'));
  const criteriaBtn=el('button','어떤 기준으로 점검했나요? ⓘ','rule-link criteria-trigger');
  criteriaBtn.type='button';
  criteriaBtn.id='sheet-open-criteria';
  criteriaBtn.onclick=()=>openCriteriaModal(report);
  footInfo.append(scopeDetails,criteriaBtn);
  box.append(footInfo);

 // 7. 판정별 다음 행동
 const actionsWrap=el('div',undefined,'sheet-actions');
 const primaryBtn=el('button',cfg.primaryAction,'action-btn');
 primaryBtn.type='button';
 if(report.status==='ready'||report.status==='supplement'){
  primaryBtn.onclick=()=>{
   $('#audio-file').value='';
   choose(null);
   $('#audio-file').click();
  };
 }else{
  primaryBtn.onclick=()=>{$('#audio-form').requestSubmit();};
  const altBtn=el('button','다른 파일 선택하기 →','alt-file-btn');
  altBtn.type='button';
  altBtn.onclick=()=>{
   $('#audio-file').value='';
   choose(null);
   $('#audio-file').click();
  };
  actionsWrap.append(altBtn);
 }
 const signupLink=el('a','발매 준비 기능 소식 받기 ↗','sheet-signup-link');
 signupLink.href='#contact';
 actionsWrap.prepend(primaryBtn);
 actionsWrap.append(signupLink);
 box.append(actionsWrap);

 box.focus({preventScroll:true});
}
$('#audio-form').addEventListener('submit',async e=>{e.preventDefault();if(!selected||checking)return;if(window.location.protocol==='file:'){message($('#check-result'),'로컬 파일(file://)에서는 점검 API가 동작하지 않습니다. 서버(http://127.0.0.1:4198)를 통해 접속해 주세요.');return;}checking=true;$('#analyze').disabled=true;$('#clear-file').disabled=true;$('#audio-file').disabled=true;$('#analyze').textContent='파일을 읽고 있습니다…';message($('#check-result'),'분석 중입니다. 파일 길이에 따라 잠시 걸릴 수 있습니다.');try{await wakeServer();message($('#check-result'),'파일 분석 중입니다. 완료될 때까지 이 화면을 유지해 주세요.');const res=await fetch(API_BASE+'/api/audio-check',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(selected.name)},body:selected,signal:AbortSignal.timeout(100000)});let data;try{data=await res.json();}catch(jsonErr){throw Error(`서버 응답 오류 (HTTP ${res.status}): 점검 API가 연결되지 않았습니다.`);}if(!res.ok||!data.report)throw Error(data?.error||'점검을 완료하지 못했습니다.');renderReport(data.report);}catch(err){message($('#check-result'),err.name==='TimeoutError'?'점검 시간이 초과됐습니다. 더 짧은 파일로 다시 시도해 주세요.':err.message||'연결을 확인해 주세요.');}finally{checking=false;$('#analyze').disabled=false;$('#clear-file').disabled=false;$('#audio-file').disabled=false;$('#analyze').textContent='이 파일 다시 점검 →';}});
const scenes=[['아티스트','음원 한 곡에서\n시작합니다.','아티스트가 파일을 올립니다. 이름·크레딧·이용 권리는 파일만으로 알아낼 수 없어 직접 확인합니다.','artist'],['포뮤','고칠 곳부터\n알려드립니다.','포뮤가 파일 규격과 무음·피크 신호를 점검하고, 확인 완료·보완 필요·판단 보류를 나눠 안내합니다.','formu'],['포뮤','조건을 비교하고,\n자료를 모읍니다.','멤버십에서는 공개 접수 조건을 비교하고 곡 정보·크레딧·증빙을 정리하도록 돕습니다. 개발 중인 기능이며, 공유 전에는 아티스트가 최종 확인합니다.','formu'],['유통사','받은 자료를 보고,\n검토를 이어갑니다.','협력 유통사에는 제출본과 보완 요청을 연결할 예정입니다. 미연계 유통사는 정리한 자료를 내보내 공식 접수처에서 사용합니다. 최종 발매 판단은 유통사가 합니다.','label']];
let step=-1,trigger=null;
function setStep(n){if(n===step)return;step=n;$('#scene-index').textContent=`0${n+1} / 04`;$('#scene-title').replaceChildren(...scenes[n][1].split('\n').flatMap((s,i)=>i?[document.createElement('br'),document.createTextNode(s)]:[document.createTextNode(s)]));$('#scene-description').textContent=scenes[n][2];$$('.scene').forEach((s,i)=>{s.classList.toggle('is-active',i===n);s.setAttribute('aria-hidden',String(i!==n));s.inert=i!==n;});$$('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===n)));$$('[data-person]').forEach(p=>p.classList.toggle('is-active',p.dataset.person===scenes[n][3]));$('#journey-next').textContent=n===3?'나에게 맞는 이용 방식 보기 ↗':'먼저 내 음원 점검하기 ↗';$('#journey-next').href=n===3?'#pricing':'#check';}
setStep(0);
if(window.gsap&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);gsap.matchMedia().add('(prefers-reduced-motion: no-preference) and (min-height: 651px)',()=>{gsap.from('.hero-copy > :not(.button)',{y:24,opacity:0,duration:.7,stagger:.1,ease:'power2.out',clearProps:'transform,opacity'});trigger=ScrollTrigger.create({trigger:'.journey-scroll',start:'top top',end:'bottom bottom',onUpdate:s=>setStep(Math.min(3,Math.floor(s.progress*4)))});return()=>{trigger=null;};});}
$$('[data-step]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(trigger&&!motion.matches){window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*(n+.15)/4,behavior:'instant'});}setStep(n);});
// Keep the control stationary while the record sleeve turns as one surface.
$$('.price-toggle').forEach(button=>{
  const card=button.closest('.price-card');
  const details=document.getElementById(button.getAttribute('aria-controls'));
  const turn=document.createElement('div'); turn.className='price-turn';
  const front=document.createElement('div'); front.className='price-face price-front';
  const back=document.createElement('div'); back.className='price-face price-back';
  const heading=card.querySelector('.price-top');
  const amount=card.querySelector('.price-amount');
  back.append(heading.cloneNode(true),details,amount.cloneNode(true));
  front.append(heading,card.querySelector('.price-vinyl'),amount);
  turn.append(front,back); card.insertBefore(turn,button);
  details.hidden=false;
  back.inert=true; back.setAttribute('aria-hidden','true');
  card.classList.add('flip-ready');
  function setOpen(open){
    card.classList.toggle('is-flipped',open);
    button.setAttribute('aria-expanded',String(open));
    front.inert=open; front.setAttribute('aria-hidden',String(open));
    back.inert=!open; back.setAttribute('aria-hidden',String(!open));
    button.firstChild.textContent=open?'레코드 앞면으로 ':'카드 뒤집어 포함 기능 보기 ';
    button.querySelector('span').textContent=open?'↶':'↗';
  }
  button.onclick=()=>setOpen(button.getAttribute('aria-expanded')!=='true');
  front.addEventListener('click',()=>{setOpen(true);button.focus({preventScroll:true});});
  card.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&card.classList.contains('is-flipped')){
      setOpen(false);button.focus({preventScroll:true});
    }
  });
  setOpen(false);
});
$$('[data-role]').forEach(a=>a.onclick=()=>{$(`input[name=role][value=${a.dataset.role}]`).checked=true;});
const evDialog=$('#evidence-dialog');if(evDialog&&$('#open-evidence'))$('#open-evidence').onclick=()=>evDialog.showModal();
const openCriteriaBtn=$('#open-criteria');if(openCriteriaBtn)openCriteriaBtn.onclick=()=>openCriteriaModal(latestReport);
$$('dialog').forEach(dia=>{
 dia.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>dia.close());
 dia.onclick=e=>{
  if(e.target===dia){
   const r=dia.getBoundingClientRect();
   if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dia.close();
  }
 };
});
$('#contact-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]');if(!form.reportValidity())return;button.disabled=true;const data=Object.fromEntries(new FormData(form));try{const response=await fetch(API_BASE+'/api/music-signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,consent:data.consent==='on'})});const result=await apiJson(response);if(!response.ok||result.mode!=='local-preview')throw Error(result.error||'저장 상태를 확인할 수 없습니다.');$('#contact-status').textContent='테스트 서버에 임시 저장했습니다. 운영팀에 신청이 발송되지는 않았습니다.';form.reset();}catch(err){$('#contact-status').textContent=`저장하지 못했습니다. ${err.message}`;}finally{button.disabled=false;$('#contact-status').focus({preventScroll:true});}});
