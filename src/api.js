// Vercel serverless proxies. The browser never sees GATEWAY_TOKEN:
// it lives only in Vercel's environment variables (server side).

export async function createJob(formData) {
  const r = await fetch('/api/clone', { method: 'POST', body: formData });
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(t.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export async function listJobs() {
  const r = await fetch('/api/jobs');
  if (!r.ok) {
    const t = await r.json().catch(() => ({}));
    throw new Error(t.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export const jobAudioUrl = (id) => `/api/jobs/${encodeURIComponent(id)}/audio`;
