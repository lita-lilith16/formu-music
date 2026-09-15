import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const source='https://support.distrokid.com/hc/en-us/articles/360013647753-What-Audio-File-Formats-Can-I-Upload';
const formats={'.wav':['wav'],'.mp3':['mp3'],'.m4a':['mov','mp4','m4a'],'.flac':['flac'],'.aiff':['aiff'],'.aif':['aiff'],'.wma':['asf']};
export async function inspectAudio(bytes,name){
 const dir=await mkdtemp(join(tmpdir(),'formu-audio-'));
 const path=join(dir,'input.bin');
 const checks=[];
 const add=(status,title,detail)=>checks.push({status,title,detail});
 const report={rule:{name:'DistroKid 공개 파일 기준',checkedOn:'2026-09-15',source},checks,metrics:{},status:'hold'};
 try{
  await writeFile(path,bytes,{mode:0o600});
  let probe;
  try{const {stdout}=await exec('ffprobe',['-v','error','-protocol_whitelist','file,pipe','-format_whitelist','wav,mp3,mov,flac,aiff,asf,ogg','-show_format','-show_streams','-of','json',path],{timeout:15000,maxBuffer:2_000_000});probe=JSON.parse(stdout);}catch{add('hold','파일 해석 보류','파일을 해석하지 못했습니다. 손상·지원하지 않는 형식·분석 환경 문제일 수 있습니다. 원본을 다시 내보내거나 다른 파일로 확인해 주세요.');return report;}
  const streams=probe.streams.filter(s=>s.codec_type==='audio');
  if(streams.length!==1){add('hold','오디오 트랙 확인 필요',`오디오 스트림이 ${streams.length}개입니다. 단일 음원 파일로 다시 확인해 주세요.`);return report;}
  const a=streams[0],duration=Number(a.duration||probe.format.duration),ext=extname(name).toLowerCase();
  const containers=probe.format.format_name.split(',');
  const bits=Number(a.bits_per_raw_sample||a.bits_per_sample)||null;
  report.metrics={codec:a.codec_name,sampleRate:Number(a.sample_rate)||null,bitDepth:bits,channels:a.channels,durationSeconds:Number.isFinite(duration)?duration:null,sizeBytes:bytes.length,bitrate:Number(a.bit_rate||probe.format.bit_rate)||null};
  if(!formats[ext])add('supplement','접수 파일 형식 보완','이 기준의 접수 형식은 WAV·MP3·M4A·FLAC·AIFF·WMA입니다. 원본에서 지원 형식으로 내보내세요. 확장자만 바꾸지 마세요.');
  else if(!formats[ext].some(f=>containers.includes(f)))add('supplement','확장자와 실제 형식 불일치','파일 이름의 확장자와 실제 컨테이너가 다릅니다. 원본에서 올바른 형식으로 다시 내보내세요.');
  else add('pass','접수 파일 형식',`${ext.slice(1).toUpperCase()} · 실제 파일 형식과 확장자가 일치합니다.`);
  if(/[\\/:*?"'<>|]/.test(name))add('supplement','파일 이름 보완','파일명에 사용할 수 없는 문자가 있습니다: \\ / : * ? " \' < > |');else add('pass','파일 이름','공식 안내에 명시된 금지 문자가 없습니다.');
  if(!Number.isFinite(duration)||duration<=0)add('hold','재생 길이 확인 필요','유효한 재생 길이를 읽지 못했습니다.');
  else if(duration>=18000)add('supplement','트랙 길이 초과','이 기준은 트랙당 5시간 미만입니다.');
  else if(duration<60)add('hold','짧은 트랙 — 앨범 구성 확인 필요',`${duration.toFixed(1)}초입니다. 단독 싱글이면 평균 60초 조건을 충족하지 못합니다. 여러 곡 앨범이라면 전체 트랙의 평균 길이를 확인해야 합니다.`);
  else add('pass','트랙 길이',`${duration.toFixed(1)}초 · 트랙당 5시간 미만 조건을 충족합니다.`);
  add('pass','파일 크기',`${(bytes.length/1e6).toFixed(2)} MB · 공식 접수 상한 1 GB 이내입니다. 포뮤 테스트 업로드 상한은 별도로 100 MB입니다.`);
  add('info','앨범 조건은 별도 확인','앨범 합계 10시간 이하, 평균 트랙 길이 60초 이상 여부는 전체 수록곡이 있어야 확인할 수 있습니다.');
  const lossy=['mp3','aac','wmav1','wmav2','opus','vorbis'].includes(a.codec_name);
  add('info','음질 정보',`${report.metrics.sampleRate?report.metrics.sampleRate/1000+' kHz':'샘플레이트 미확인'} · ${bits?bits+' bit':'비트 깊이 해당 없음/미확인'} · ${a.channels||'?'}채널. ${lossy?'손실 압축 파일입니다. 허용 형식이어도 원본 품질의 복원 여부는 알 수 없습니다.':'이 값만으로 원본 음질이나 업샘플링 여부를 보증하지 않습니다.'}`);
  try{
   const {stderr}=await exec('ffmpeg',['-hide_banner','-nostdin','-v','info','-xerror','-protocol_whitelist','file,pipe','-format_whitelist','wav,mp3,mov,flac,aiff,asf,ogg','-i',path,'-map','0:a:0','-vn','-af','astats=metadata=0:reset=0','-f','null','-'],{timeout:60000,maxBuffer:2_000_000});
   const peaks=[...stderr.matchAll(/Peak level dB:\s*(-?inf|[-\d.]+)/g)];
   const peak=peaks.at(-1)?.[1];
   add('pass','전체 파일 디코딩','파일 전체를 끝까지 디코딩했습니다. 청취 품질 평가와는 다릅니다.');
   if(peak==='-inf'){report.metrics.samplePeakDbfs='-inf';add('hold','무음 — 청취 확인 필요','전체 분석에서 신호가 확인되지 않았습니다. 재생을 확인하고 원본 음원을 다시 내보내세요.');}
   else if(peak!==undefined&&Number.isFinite(Number(peak))){report.metrics.samplePeakDbfs=Number(peak);if(Number(peak)>=0)add('hold','피크 레벨 — 청취 확인 필요',`샘플 피크 ${Number(peak).toFixed(2)} dBFS. 0 dBFS에 닿거나 초과했습니다. 왜곡을 확정한 결과는 아니며, 원본 재생과 마스터 레벨을 확인해 주세요.`);else add('pass','샘플 피크',`${Number(peak).toFixed(2)} dBFS · 0 dBFS 미만입니다. 실제 청감·트루피크·이미 발생한 왜곡은 별도 확인이 필요합니다.`);}
   else add('hold','신호 분석 보류','피크 결과를 읽지 못했습니다. 정상 판정으로 처리하지 않습니다.');
  }catch(e){add('hold','전체 재생 검사 보류',e.killed?'분석 제한 시간(60초)을 초과했습니다. 파일 오류로 단정하지 않습니다.':'끝까지 디코딩하지 못했습니다. 원본 재생·손상 여부를 확인해 주세요.');}
  report.status=checks.some(c=>c.status==='supplement')?'supplement':checks.some(c=>c.status==='hold')?'hold':'ready';
  return report;
 }finally{await rm(dir,{recursive:true,force:true});}
}
