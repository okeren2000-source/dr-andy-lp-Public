const ALLOWED_ORIGINS = [
  'https://clinic.dr-andy.co.il',
  'https://lp.dr-andy.co.il',
];

const ZAPIER_URL = 'https://hooks.zapier.com/hooks/catch/1070512/ssbflj/';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const zapierRes = await fetch(ZAPIER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });

  if (!zapierRes.ok) {
    return res.status(502).json({ ok: false, error: 'Upstream error' });
  }

  return res.status(200).json({ ok: true });
}
