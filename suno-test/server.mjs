import {inspectAudio} from './audio-check.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=4197,origin=`http://127.0.0.1:${port}`,max=100_000_000;
let busy=false;
http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const send=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));};
 if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await readFile(new URL('./index.html',import.meta.url)));return;}
 if(req.method!=='POST'||!['/api/check','/api/audio-check'].includes(req.url))return send(404,{error:'페이지를 찾을 수 없습니다.'});
 if(req.headers.origin!==origin||(req.url==='/api/check'&&req.headers['x-suno-consent']!=='yes'))return send(403,{error:'Suno 전송 동의가 필요합니다.'});
 if(busy)return send(429,{error:'다른 검사가 진행 중입니다. 완료 후 다시 시도해 주세요.'});
 if(Number(req.headers['content-length'])>max)return send(413,{error:'100 MB 이하 파일을 선택해 주세요.'});
 busy=true;
 try{
 let size=0,chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>max){send(413,{error:'100 MB 제한을 초과했습니다.'});return;}chunks.push(chunk);}
 if(!size)return send(400,{error:'빈 파일은 검사할 수 없습니다.'});
 if(req.url==='/api/audio-check'){let name;try{name=decodeURIComponent(req.headers['x-file-name']||'');}catch{return send(400,{error:'파일 이름을 읽지 못했습니다.'});}const report=await inspectAudio(Buffer.concat(chunks),name);return send(200,{report,checkedAt:new Date().toISOString()});}
 const form=new FormData();form.append('file',new Blob(chunks,{type:'application/octet-stream'}),'audio.bin');chunks=[];
 const upstream=await fetch('https://studio-api.prod.suno.com/api/c2pa/detect',{method:'POST',body:form,signal:AbortSignal.timeout(90000)});
 if(!upstream.ok)return send(upstream.status===429?429:502,{error:upstream.status===429?'Suno 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':`Suno 응답 오류 (${upstream.status}). 검사 결과가 아닙니다.`});
 const data=await upstream.json();
 if(!['verified_suno','no_suno_provenance','inconclusive'].includes(data.verdict))return send(502,{error:'예상하지 못한 응답입니다. 판정을 표시하지 않습니다.'});
 send(200,{data,checkedAt:new Date().toISOString()});
 }catch(e){if(req.url==='/api/audio-check')return send(500,{error:'파일 검사를 완료하지 못했습니다. 다시 시도해 주세요.'});send(502,{error:e.name==='TimeoutError'?'Suno 응답 시간이 초과됐습니다.':'Suno 연결에 실패했습니다. 네트워크를 확인해 주세요.'});}
 finally{busy=false;}
}).listen(port,'127.0.0.1',()=>console.log(origin));
