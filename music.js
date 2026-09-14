'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const state={started:false,confirmed:false,policy:1,split:false,receipt:false};
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
  $('download').hidden=!state.confirmed;
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
  Object.assign(state,{started:false,confirmed:false,policy:1,split:false,receipt:false});
  for(const key of ['split','receipt']){$(key+'-check').checked=false;$(key+'-check').disabled=true;$(key+'-proof').open=false;}
  $('policy-note').hidden=true;$('welcome').hidden=false;$('review').hidden=true;update();$('start').focus();
 });
 $('download').addEventListener('click',()=>{
  if(!state.confirmed)return;
  const data={synthetic:true,realDistributionApproval:false,version:'v1.1',title:'Blue Hour',policyVersion:state.policy,credits:[{name:'김창작',share:60},{name:'이보컬',share:40}],demoReview:{split:state.split,receipt:state.receipt},note:'합성 자료로 만든 UI 시연 결과. 실제 권리 증빙, 검수 또는 발매 승인 아님.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='formu-music-synthetic-v1.1.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('합성 시연 JSON을 내려받았습니다.');
 });
 update();
})();
