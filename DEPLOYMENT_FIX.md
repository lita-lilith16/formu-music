# 2026-09-15: Static deployment audio API repair

Root cause: formu-music was deployed as Render Static Site. HTML/JS were delivered, but /api/health returned HTTP404 and POST /api/audio-check returned HTTP200 with an empty body. /check was not an executable server route.

- Preserve https://formu-music.onrender.com/ as the landing.
- Created Free Docker Web Service formu-music-api (srv-dakhnv0u01pc73f6ic40).
- Backend: https://formu-music-api.onrender.com/ . Docker installs FFmpeg/FFprobe.
- Frontend music.js selects this API origin only for the public static hostname; local development stays same-origin.
- CORS permits this landing origin. Removed wildcard permission for unrelated Render origins.
- /check, check.html, check/index.html fallback tool uses the correct API origin.
- Before uploading the landing checks server readiness; cold-start message displayed.
- Unknown or empty responses are errors, not audio verdicts.
- Removed built-in admin secret fallback; admin API disabled unless ADMIN_TOKEN is explicitly configured. No existing signup records were read.
- data/ excluded from Docker context. Public contact remains test-only ephemeral storage, not operational lead collection.

Verification: local ready WAV / broken WAV hold; CORS allow/deny; unauthenticated admin401; Suno route200. Public browser uploaded a synthetic65s WAV and rendered PCM16bit,44100Hz,65.0seconds with file criteria confirmed. No personal music was used for tests.

Free service has cold starts and single-job concurrency. This is a prototype deployment, not production scale assurance. No paid compute plan selected.
