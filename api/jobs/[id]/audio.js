// GET /api/jobs/[id]/audio — stream the finished MP3 (proxy with secret token).

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
  const { id } = req.query;
  if (!id || /[^a-zA-Z0-9_-]/.test(String(id))) return res.status(400).json({ error: 'bad id' });
  try {
    const r = await fetch(`${cfg.url}/api/jobs/${encodeURIComponent(String(id))}/audio`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!r.ok) {
      const text = await r.text();
      res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(200);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buf.length);
    return res.send(buf);
  } catch {
    return res.status(502).json({ error: 'gateway unreachable' });
  }
}
