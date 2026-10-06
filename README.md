# Voice Clone Studio

Personal serverless frontend for the self-hosted VoiceStudio voice-cloning
gateway (Oracle ARM64 server). Bilingual EN/ES (EN default), responsive, PWA,
Vercel Analytics, author credit.

## How it works

```
browser → Vercel (static React + /api/* serverless functions)
              → Cloudflare Tunnel (HTTPS) → voice-gateway:3901 (Bearer GATEWAY_TOKEN)
                                            → voicestudio:3900 (admin key, docker net)
```

The browser never sees `GATEWAY_TOKEN`: it lives only in Vercel's environment
variables. `/api/clone` streams the multipart upload straight through to the
gateway (no parsing, no temp files).

## Setup

1. Push this repo to GitHub and import it in Vercel (Vite preset).
2. In Vercel → Project Settings → Environment Variables, set:
   - `GATEWAY_URL` — the tunnel URL, e.g. `https://xxx.trycloudflare.com`
   - `GATEWAY_TOKEN` — the value of `GATEWAY_TOKEN` in the server's
     `~/PROYECTOS/voicestudio/.env`
3. Deploy. Enable **Web Analytics** in the Vercel dashboard (code is included).

## Notes

- Reference samples must stay under ~4 MB (Vercel hobby request-body limit).
  MP3 or mic recordings (WebM) are ideal.
- Each generation takes ~1–2 min on the server's CPU: the UI polls the job
  status every 5 s and shows a player + download link when done.
- The quick tunnel URL changes when the tunnel container restarts; update
  `GATEWAY_URL` accordingly, or switch to a named Cloudflare tunnel later.
- Only clone voices you have the right to use (the consent checkbox +
  statement are mandatory, and the gateway records them per job).
