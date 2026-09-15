# Formu audio preflight prototype

2026-09-15. Local only: http://127.0.0.1:4197/

Run `node server.mjs` from this folder. Requires Node with native fetch/FormData, ffprobe and ffmpeg on PATH.

## Implemented
- POST /api/audio-check: binary upload, 100 MB app limit, same-origin check, single concurrent inspection. No Suno transfer.
- Temporary private file, removed in finally after analysis. Unexpected process termination can leave a temp directory; not a production storage system.
- ffprobe actual container, codec, duration, channels, sample rate, bit depth where available.
- ffmpeg full decoding and astats sample peak. Limits: probe 15 seconds, decode 60 seconds. Timeout/parse failure is HOLD.
- DistroKid public file rules retrieved 2026-09-15: supported containers/extension match, prohibited filename characters, <5 hours per track, <=1 GB. Separate app upload limit 100 MB.
- <60 second track: HOLD, requires album context; single-track release cannot meet 60 second mean duration. Album total <=10 hours and mean >=60 seconds not measured without full album.
- Signal checks are Formu review signals, not official rejection rules: silence and sample peak >=0 dBFS trigger HOLD. Peak does not prove clipping, true peak or perceptual quality.
- Source: https://support.distrokid.com/hc/en-us/articles/360013647753-What-Audio-File-Formats-Can-I-Upload
- Ready means only checked single-file conditions met, not release approval or quality certification. Lossy source history, mastering, rights, genre, full album and editorial review remain outside scope.
- Suno source API remains optional and consent-gated. User-selected paid/free/unknown labels are self-declared, session-only, verified_suno only.

## Validation
Real synthetic WAV fixtures: 61s ordinary tone -> ready; 1s tone -> hold; 61s silence -> hold; full-scale alternating samples -> hold; WAV with MP3 extension -> supplement; prohibited filename -> supplement; invalid binary -> hold. JavaScript syntax checked.
Browser file chooser -> actual local endpoint -> rendered results tested using synthetic test-tone.wav. No user audio was uploaded to Suno during this change.

## Handoff boundaries
Do not call sample peak a loudness or true peak measurement. Do not infer paid subscription from Suno credentials. Do not treat this single distributor profile as a universal upload policy. Pricing, partner submissions and server persistence are not implemented here.
