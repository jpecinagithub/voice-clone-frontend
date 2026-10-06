// GET /api/jobs — list jobs (proxy with secret token).

function env() {
  const { GATEWAY_URL, GATEWAY_TOKEN } = process.env;
  if (!GATEWAY_URL || !GATEWAY_TOKEN) return null;
  return { url: GATEWAY_URL.replace(/\/$/, ''), token: GATEWAY_TOKEN };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const cfg = env();
  if (!cfg) return res.status(500).json({ error: 'server misconfigured' });
  try {
    const r = await fetch(`${cfg.url}/api/jobs`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    return res.send(text);
  } catch {
    return res.status(502).json({ error: 'gateway unreachable' });
  }
}
