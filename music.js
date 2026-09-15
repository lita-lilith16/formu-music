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
function renderReport(report){
 if(!report||!Array.isArray(report.checks)||!report.rule||!['ready','supplement','hold'].includes(report.status))throw Error('점검 결과 형식을 확인하지 못했습니다. 다시 점검해 주세요.');
 const metricsData=report.metrics||{},box=$('#check-result');box.replaceChildren();box.hidden=false;
 const states={ready:['✓','파일 규격 통과','pass','검사한 파일 항목에서 보완할 사항이 발견되지 않았습니다.'],supplement:['!','보완 필요','fail','현재 적용 기준을 충족하지 못한 항목이 있습니다. 수정 후 다시 점검하세요.'],hold:['Ⅱ','판단 보류','pending','판단하지 못한 항목이나 직접 들어봐야 할 신호가 있습니다. 사유를 먼저 확인하세요.']};
 const [icon,label,tone,description]=states[report.status];
 const banner=el('div',undefined,`decision-banner ${tone}`);
 banner.append(el('p','FILE CHECK / 파일 기술 점검','eyebrow'));
 const heading=el('h3',undefined,'decision-heading');heading.append(el('span',icon,'decision-icon'),el('span',label));banner.append(heading,el('p',description));
 banner.append(el('small','이 라벨은 파일 기술 점검 결과입니다. 유통사의 발매 승인·거절을 뜻하지 않습니다.'));
 box.append(banner);
 const counts={pass:0,supplement:0,hold:0,info:0};report.checks.forEach(c=>{if(c.status in counts)counts[c.status]++;});
 const badges=el('div',undefined,'decision-counts');
 for(const [key,text,css]of [['pass','통과','pass'],['supplement','보완 필요','fail'],['hold','보류','pending'],['info','참고','info']])badges.append(el('span',`${text} ${counts[key]}`,`state-badge ${css}`));
 box.append(badges);
 const scope=el('div',undefined,'inspection-scope');
 const content=el('div');content.append(el('strong','음악·말소리 구분'),el('span','미검사','state-badge info'));
 scope.append(content,el('p','현재는 소리의 내용을 분류하지 않습니다. 음악, 대화 녹음, 테스트 신호도 파일 규격이 같으면 통과할 수 있습니다.'));
 box.append(scope);
 const metrics=el('div',undefined,'result-metrics');
 for(const [k,v]of [['오디오 형식',({pcm_s16le:'PCM · 16 bit',pcm_s24le:'PCM · 24 bit',pcm_s32le:'PCM · 32 bit',pcm_f32le:'PCM · 32 bit float',mp3:'MP3',aac:'AAC',flac:'FLAC'}[metricsData.codec]||metricsData.codec)],['샘플레이트',metricsData.sampleRate?`${(metricsData.sampleRate/1000).toLocaleString('ko-KR')} kHz`:'확인 불가'],['재생 길이',Number.isFinite(metricsData.durationSeconds)?`${metricsData.durationSeconds.toFixed(1)}초`:'확인 불가']]){const n=el('div');n.append(el('small',k),el('strong',v||'확인 불가'));metrics.append(n);}
 box.append(metrics);
 const details=el('details'),sum=el('summary',`전체 점검 항목 ${report.checks.length}개 보기`);details.append(sum);
 const labels={pass:['✓ 통과','pass'],supplement:['! 보완 필요','fail'],hold:['Ⅱ 보류','pending'],info:['참고','info']};
 const rowFor=c=>{const [text,cls]=labels[c.status]||labels.info;const row=el('div',undefined,`check-row status-${cls}`),head=el('div',undefined,'check-row-heading');head.append(el('span',text,`state-badge ${cls}`),el('strong',c.title));row.append(head,el('p',c.detail));return row;};
 const attention=report.checks.filter(c=>c.status==='supplement'||c.status==='hold');
 if(attention.length){const section=el('section',undefined,'attention-checks');section.append(el('h4',`먼저 확인할 항목 ${attention.length}개`));attention.forEach(c=>section.append(rowFor(c)));box.append(section);}
 report.checks.forEach(c=>details.append(rowFor(c)));box.append(details);
 const foot=el('div',undefined,'result-actions');const source=el('a',`${report.rule.name} · ${report.rule.checkedOn} ↗`,'text-link');source.href=report.rule.source;source.target='_blank';source.rel='noopener';
 const next=el('a','발매 준비 기능 시작 소식 받기 ↗','button blue');next.href='#contact';foot.append(source,next);box.append(foot);box.focus({preventScroll:true});
}
$('#audio-form').addEventListener('submit',async e=>{e.preventDefault();if(!selected||checking)return;if(window.location.protocol==='file:'){message($('#check-result'),'로컬 파일(file://)에서는 점검 API가 동작하지 않습니다. 서버(http://127.0.0.1:4198)를 통해 접속해 주세요.');return;}checking=true;$('#analyze').disabled=true;$('#clear-file').disabled=true;$('#audio-file').disabled=true;$('#analyze').textContent='파일을 읽고 있습니다…';message($('#check-result'),'분석 중입니다. 파일 길이에 따라 잠시 걸릴 수 있습니다.');try{await wakeServer();message($('#check-result'),'파일 분석 중입니다. 완료될 때까지 이 화면을 유지해 주세요.');const res=await fetch(API_BASE+'/api/audio-check',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(selected.name)},body:selected,signal:AbortSignal.timeout(100000)});let data;try{data=await res.json();}catch(jsonErr){throw Error(`서버 응답 오류 (HTTP ${res.status}): 점검 API가 연결되지 않았습니다.`);}if(!res.ok||!data.report)throw Error(data?.error||'점검을 완료하지 못했습니다.');renderReport(data.report);}catch(err){message($('#check-result'),err.name==='TimeoutError'?'점검 시간이 초과됐습니다. 더 짧은 파일로 다시 시도해 주세요.':err.message||'연결을 확인해 주세요.');}finally{checking=false;$('#analyze').disabled=false;$('#clear-file').disabled=false;$('#audio-file').disabled=false;$('#analyze').textContent='이 파일 다시 점검 →';}});
const scenes=[['아티스트','음원 한 곡에서\n시작합니다.','아티스트가 파일을 올립니다. 이름·크레딧·이용 권리는 파일만으로 알아낼 수 없어 직접 확인합니다.','artist'],['포뮤','고칠 곳부터\n알려드립니다.','포뮤가 파일 규격과 무음·피크 신호를 점검하고, 확인 완료·보완 필요·판단 보류를 나눠 안내합니다.','formu'],['포뮤','조건을 비교하고,\n자료를 모읍니다.','공개 유통 조건을 비교하고 곡 정보·크레딧·증빙을 준비하는 기능을 개발 중입니다. 공유할 내용은 아티스트가 확인합니다.','formu'],['유통사','받은 자료를 보고,\n검토를 이어갑니다.','제휴 후에는 확인한 제출본과 보완 요청을 연결합니다. 미제휴 유통사는 공식 접수처로 안내하며, 발매 여부는 유통사가 결정합니다.','label']];
let step=-1,trigger=null;
function setStep(n){if(n===step)return;step=n;$('#scene-index').textContent=`0${n+1} / 04`;$('#scene-title').replaceChildren(...scenes[n][1].split('\n').flatMap((s,i)=>i?[document.createElement('br'),document.createTextNode(s)]:[document.createTextNode(s)]));$('#scene-description').textContent=scenes[n][2];$$('.scene').forEach((s,i)=>{s.classList.toggle('is-active',i===n);s.setAttribute('aria-hidden',String(i!==n));s.inert=i!==n;});$$('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===n)));$$('[data-person]').forEach(p=>p.classList.toggle('is-active',p.dataset.person===scenes[n][3]));$('#journey-next').textContent=n===3?'나에게 맞는 이용 방식 보기 ↗':'먼저 내 음원 점검하기 ↗';$('#journey-next').href=n===3?'#pricing':'#check';}
setStep(0);
if(window.gsap&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);gsap.matchMedia().add('(prefers-reduced-motion: no-preference) and (min-height: 651px)',()=>{gsap.from('.hero-copy > :not(.button)',{y:24,opacity:0,duration:.7,stagger:.1,ease:'power2.out',clearProps:'transform,opacity'});trigger=ScrollTrigger.create({trigger:'.journey-scroll',start:'top top',end:'bottom bottom',onUpdate:s=>setStep(Math.min(3,Math.floor(s.progress*4)))});return()=>{trigger=null;};});}
$$('[data-step]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(trigger&&!motion.matches){window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*(n+.15)/4,behavior:'instant'});}setStep(n);});
$$('.price-toggle').forEach(b=>b.onclick=()=>{const open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));document.getElementById(b.getAttribute('aria-controls')).hidden=open;b.firstChild.textContent=open?'포함 기능 보기 ':'내용 닫기 ';b.querySelector('span').textContent=open?'＋':'−';});
$$('[data-role]').forEach(a=>a.onclick=()=>{$(`input[name=role][value=${a.dataset.role}]`).checked=true;});
const dialog=$('#evidence-dialog');$('#open-evidence').onclick=()=>dialog.showModal();$('.dialog-close').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
$('#contact-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]');if(!form.reportValidity())return;button.disabled=true;const data=Object.fromEntries(new FormData(form));try{const response=await fetch(API_BASE+'/api/music-signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,consent:data.consent==='on'})});const result=await apiJson(response);if(!response.ok||result.mode!=='local-preview')throw Error(result.error||'저장 상태를 확인할 수 없습니다.');$('#contact-status').textContent='테스트 서버에 임시 저장했습니다. 운영팀에 신청이 발송되지는 않았습니다.';form.reset();}catch(err){$('#contact-status').textContent=`저장하지 못했습니다. ${err.message}`;}finally{button.disabled=false;$('#contact-status').focus({preventScroll:true});}});
