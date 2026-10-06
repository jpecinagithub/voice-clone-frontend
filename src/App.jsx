import { useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { STR, CONSENT_STATEMENT } from './i18n.js';
import { createJob, listJobs, jobAudioUrl } from './api.js';
import './styles.css';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel hobby request-body limit
const LANGS = [
  ['es', 'Español'], ['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['pt', 'Português'], ['ca', 'Català'], ['eu', 'Euskara'], ['gl', 'Galego'],
];

function fmtTime(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('vcf-lang') || 'en');
  const t = STR[lang] || STR.en;

  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [speakLang, setSpeakLang] = useState('es');
  const [refText, setRefText] = useState('');
  const [consent, setConsent] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioLabel, setAudioLabel] = useState('');
  const [recording, setRecording] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const fileRef = useRef(null);

  useEffect(() => { localStorage.setItem('vcf-lang', lang); }, [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const refresh = async () => {
    try {
      setJobs(await listJobs());
    } catch (e) {
      // silent on poll; surfaced on manual actions
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const active = jobs.some((j) => j.status === 'queued' || j.status === 'processing');
    if (!active) return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [jobs]);

  const pickFile = (f) => {
    setError('');
    if (!f) return;
    if (f.size > MAX_BYTES) { setError(t.fileTooBig); return; }
    setAudioFile(f);
    setAudioLabel(f.name);
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const f = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
        setAudioFile(f);
        setAudioLabel(t.recorded);
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setError('Microphone unavailable');
    }
  };
  const stopRecording = () => { recRef.current?.stop(); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!audioFile || !name.trim() || !text.trim() || !refText.trim() || !consent) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioFile);
      fd.append('name', name.trim());
      fd.append('text', text.trim());
      fd.append('language', speakLang);
      fd.append('ref_text', refText.trim());
      fd.append('consent_text', CONSENT_STATEMENT[lang] || CONSENT_STATEMENT.en);
      const job = await createJob(fd);
      setJobs((js) => [job, ...js]);
      setText('');
    } catch (e2) {
      setError(`${t.submitError}: ${e2.message}`);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = audioFile && name.trim() && text.trim() && refText.trim() && consent && !busy;

  const badge = (s) => `badge b-${s}`;

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>{t.appTitle}</h1>
          <p className="sub">{t.subtitle}</p>
        </div>
        <div className="langsw">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? 'on' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
      </header>

      <main>
        <section className="card">
          <h2>{t.newJob}</h2>
          <form onSubmit={submit}>
            <label>{t.voiceName}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.voiceNamePh} maxLength={60} />
            </label>

            <div className="field">
              <span className="flabel">{t.refAudio}</span>
              <div className="audiorow">
                <input ref={fileRef} type="file" accept="audio/*" hidden
                  onChange={(e) => pickFile(e.target.files?.[0])} />
                <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
                  {t.chooseFile}
                </button>
                <span className="or">{t.orRecord}</span>
                {!recording
                  ? <button type="button" className="btn ghost" onClick={startRecording}>{t.startRec}</button>
                  : <button type="button" className="btn danger" onClick={stopRecording}>{t.stopRec} ⏺ {t.recording}</button>}
              </div>
              {audioLabel && <div className="filechip">🎙 {audioLabel}</div>}
            </div>

            <label>{t.refText}
              <input value={refText} onChange={(e) => setRefText(e.target.value)} placeholder={t.refTextPh} />
              <small>{t.refTextHint}</small>
            </label>

            <label>{t.text}
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.textPh} rows={3} maxLength={2000} />
            </label>

            <label>{t.language}
              <select value={speakLang} onChange={(e) => setSpeakLang(e.target.value)}>
                {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>

            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t.consent}</span>
            </label>

            {error && <div className="err">{error}</div>}
            <button className="btn primary" disabled={!canSubmit}>
              {busy ? t.submitting : t.submit}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>{t.jobs}</h2>
          {jobs.length === 0 && <p className="muted">{t.noJobs}</p>}
          <ul className="jobs">
            {jobs.map((j) => (
              <li key={j.id} className="job">
                <div className="jhead">
                  <strong>{j.name}</strong>
                  <span className={badge(j.status)}>{t[j.status] || j.status}</span>
                </div>
                <div className="jmeta">{fmtTime(j.created_at)}</div>
                {j.status === 'done' && (
                  <div className="jdone">
                    <audio controls preload="none" src={jobAudioUrl(j.id)} />
                    <a className="btn ghost sm" href={jobAudioUrl(j.id)} download={`${j.name}.mp3`}>{t.download}</a>
                  </div>
                )}
                {j.status === 'error' && <div className="err sm">{j.error}</div>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <About t={t} />

      <footer>{t.footer}</footer>
      <Analytics />
    </div>
  );
}

function About({ t }) {
  return (
    <section className="card">
      <h2>{t.aboutTitle}</h2>
      <p className="muted">{t.aboutLead}</p>
      <h3>{t.howTitle}</h3>
      <ol className="steps">
        {t.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <h3>{t.stackTitle}</h3>
      <dl className="stack">
        {t.stack.map(([k, v]) => (
          <div key={k} className="srow"><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
