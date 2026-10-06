// POST /api/clone — forwards the multipart body untouched to the gateway,
// adding the secret Bearer token. bodyParser disabled: we stream the raw
// request through so file uploads need no parsing here.

export const config = { api: { bodyParser: false } };

function env() {
  const { GATEWAY_URL, GATEWAY_TOKEN } = process.env;
  if (!GATEWAY_URL || !GATEWAY_TOKEN) return null;
  return { url: GATEWAY_URL.replace(/\/$/, ''), token: GATEWAY_TOKEN };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const cfg = env();
  if (!cfg) return res.status(500).json({ error: 'server misconfigured: set GATEWAY_URL and GATEWAY_TOKEN' });
  try {
    const r = await fetch(`${cfg.url}/api/clone`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': req.headers['content-type'] || 'application/octet-stream',
      },
      body: req,
      duplex: 'half',
    });
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: 'gateway unreachable', detail: String(e.message || e).slice(0, 200) });
  }
}
