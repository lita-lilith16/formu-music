import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {inspectAudio} from './suno-test/audio-check.mjs';

const port = Number(process.env.PORT || process.env.FORMU_PREVIEW_PORT || 4198);
const host = process.env.HOST || '0.0.0.0';
const root = new URL('./', import.meta.url);
const max = 100_000_000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
let busy = false;

const routes = {
  '/': ['index.html', 'text/html'],
  '/music.css': ['music.css', 'text/css'],
  '/music.js': ['music.js', 'text/javascript'],
  '/tokens.css': ['tokens.css', 'text/css'],
  '/symbol.svg': ['symbol.svg', 'image/svg+xml'],
  '/vendor/gsap.min.js': ['vendor/gsap.min.js', 'text/javascript'],
  '/vendor/ScrollTrigger.min.js': ['vendor/ScrollTrigger.min.js', 'text/javascript'],
  '/check': ['check/index.html', 'text/html'],
  '/check/': ['check/index.html', 'text/html'],
  '/check.html': ['check.html', 'text/html'],
  '/assets/formu-og-v1.png': ['assets/formu-og-v1.png', 'image/png'],
  '/suno-test/index.html': ['suno-test/index.html', 'text/html']
};

function isValidOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Same-origin or non-browser request
  try {
    const originUrl = new URL(origin);
    const hostHeader = req.headers.host;
    if (hostHeader && originUrl.host === hostHeader) return true;
    if (origin === 'https://formu-music.onrender.com') return true;
    if (process.env.FORMU_ALLOWED_ORIGINS) {
      const allowed = process.env.FORMU_ALLOWED_ORIGINS.split(',').map(s => s.trim());
      if (allowed.includes(origin)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.headers.origin && isValidOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Suno-Consent');
  }
  if (req.method === 'OPTIONS') { res.writeHead(isValidOrigin(req) ? 204 : 403); return res.end(); }

  const send = (status, data) => {
    res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify(data));
  };

  const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const path = parsedUrl.pathname;

  try {
    // Health check
    if (req.method === 'GET' && (path === '/health' || path === '/api/health')) {
      return send(200, {status: 'ok', uptime: process.uptime(), checkedAt: new Date().toISOString()});
    }

    // Static assets
    if ((req.method === 'GET' || req.method === 'HEAD') && routes[path]) {
      const [file, type] = routes[path];
      const contentType = type.startsWith('image/') && type !== 'image/svg+xml' ? type : `${type}; charset=utf-8`;
      res.writeHead(200, {'Content-Type': contentType});
      if (req.method === 'HEAD') return res.end();
      return res.end(await readFile(new URL(file, root)));
    }

    // Admin API: View signups
    if (req.method === 'GET' && path === '/api/admin/signups') {
      const token = req.headers['x-admin-token'];
      if (!token || token !== ADMIN_TOKEN) {
        return send(401, {error: '관리자 인증이 필요합니다.'});
      }
      const dir = new URL('./data/', root);
      const file = new URL('music-preview-signups.json', dir);
      try {
        const rows = JSON.parse(await readFile(file, 'utf8'));
        return send(200, {success: true, total: rows.length, rows});
      } catch (e) {
        if (e.code === 'ENOENT') return send(200, {success: true, total: 0, rows: []});
        throw e;
      }
    }

    // Admin API: Delete signup
    if (req.method === 'DELETE' && path.startsWith('/api/admin/signups/')) {
      const token = req.headers['x-admin-token'];
      if (!token || token !== ADMIN_TOKEN) {
        return send(401, {error: '관리자 인증이 필요합니다.'});
      }
      const targetEmail = decodeURIComponent(path.replace('/api/admin/signups/', ''));
      const dir = new URL('./data/', root);
      const file = new URL('music-preview-signups.json', dir);
      try {
        let rows = JSON.parse(await readFile(file, 'utf8'));
        const before = rows.length;
        rows = rows.filter(r => r.email !== targetEmail);
        await writeFile(file, JSON.stringify(rows, null, 2), {mode: 0o600});
        return send(200, {success: true, deleted: before - rows.length});
      } catch (e) {
        return send(500, {error: '삭제 중 오류가 발생했습니다.'});
      }
    }

    // POST APIs
    if (req.method !== 'POST' || !['/api/audio-check', '/api/check', '/api/music-signup'].includes(path)) {
      return send(404, {error: '페이지를 찾을 수 없습니다.'});
    }

    // Origin check
    if (!isValidOrigin(req)) {
      return send(403, {error: '유효한 요청 출처가 아닙니다.'});
    }

    const isSignup = path === '/api/music-signup';
    const limit = isSignup ? 8192 : max;

    if (Number(req.headers['content-length']) > limit) {
      return send(413, {error: '요청 용량 제한을 초과했습니다.'});
    }

    if (busy) {
      return send(429, {error: '다른 점검 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.'});
    }

    if (path === '/api/check' && req.headers['x-suno-consent'] !== 'yes') {
      return send(403, {error: 'Suno 외부 전송 동의가 필요합니다.'});
    }

    busy = true;
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) return send(413, {error: '요청 용량 제한을 초과했습니다.'});
        chunks.push(chunk);
      }
      if (!size) return send(400, {error: '빈 요청입니다.'});
      const bytes = Buffer.concat(chunks);

      if (isSignup) {
        let data;
        try {
          data = JSON.parse(bytes);
        } catch {
          return send(400, {error: '입력 형식을 확인해 주세요.'});
        }
        if (
          data.consent !== true ||
          !['artist', 'team'].includes(data.role) ||
          typeof data.email !== 'string' ||
          data.email.length > 254 ||
          !/^\S+@\S+\.\S+$/.test(data.email) ||
          typeof (data.name || '') !== 'string' ||
          (data.name || '').length > 100
        ) {
          return send(400, {error: '이메일과 필수 동의 항목을 확인해 주세요.'});
        }

        const dir = new URL('./data/', root);
        const file = new URL('music-preview-signups.json', dir);
        await mkdir(dir, {recursive: true, mode: 0o700});

        let rows = [];
        try {
          rows = JSON.parse(await readFile(file, 'utf8'));
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
        }

        // Retain for 180 days only
        rows = rows.filter(r => Date.now() - Date.parse(r.at) < 180 * 86400000);
        rows.push({
          role: data.role,
          email: data.email,
          name: data.name || '',
          at: new Date().toISOString(),
          mode: 'local-preview'
        });

        await writeFile(file, JSON.stringify(rows, null, 2), {mode: 0o600});
        return send(200, {success: true, mode: 'local-preview'});
      }

      if (path === '/api/audio-check') {
        let name;
        try {
          name = decodeURIComponent(req.headers['x-file-name'] || 'audio.wav');
        } catch {
          return send(400, {error: '파일 이름을 읽지 못했습니다.'});
        }
        const report = await inspectAudio(bytes, name);
        return send(200, {report, checkedAt: new Date().toISOString()});
      }

      // Suno C2PA detection
      const form = new FormData();
      form.append('file', new Blob([bytes]), 'audio.bin');
      const response = await fetch('https://studio-api.prod.suno.com/api/c2pa/detect', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(90000)
      });
      if (!response.ok) {
        return send(response.status === 429 ? 429 : 502, {
          error: `Suno 응답 오류 (${response.status}). 검사 결과가 아닙니다.`
        });
      }
      const data = await response.json();
      if (!['verified_suno', 'no_suno_provenance', 'inconclusive'].includes(data.verdict)) {
        return send(502, {error: '응답 형식을 확인하지 못해 판정을 보류했습니다.'});
      }
      return send(200, {data, checkedAt: new Date().toISOString()});
    } finally {
      busy = false;
    }
  } catch (e) {
    console.error(e.name, e.message);
    if (!res.headersSent) send(500, {error: '처리를 완료하지 못했습니다. 다시 시도해 주세요.'});
  }
}).listen(port, host, () => console.log(`Formu Music server listening on ${host}:${port}`));
