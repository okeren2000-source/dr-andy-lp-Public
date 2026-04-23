const ALLOWED_ORIGINS = [
  'https://clinic.dr-andy.co.il',
  'https://lp.dr-andy.co.il',
];

const ZAPIER_URL = 'https://hooks.zapier.com/hooks/catch/1070512/ssbflj/';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const RECAPTCHA_SCORE_THRESHOLD = 0.5;

async function verifyRecaptcha(token, ip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  console.log('[recaptcha] secret set:', !!secret, '| token present:', !!token);
  if (!secret) return true; // skip if not configured

  if (!token) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (ip) params.set('remoteip', ip);

  const verifyRes = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!verifyRes.ok) {
    console.error('[recaptcha] siteverify HTTP error:', verifyRes.status);
    return false;
  }
  const data = await verifyRes.json();
  console.log('[recaptcha] result:', JSON.stringify(data));
  return data.success === true && data.score >= RECAPTCHA_SCORE_THRESHOLD;
}

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

  // Body may arrive as a raw string (text/plain) due to no-cors fetch mode
  let body = req.body;
  console.log('[submit] body type:', typeof body, '| content-type:', req.headers['content-type']);
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { recaptcha_token, ...zapierPayload } = body;

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || '';
  const isHuman = await verifyRecaptcha(recaptcha_token, clientIp);
  if (!isHuman) {
    return res.status(403).json({ ok: false, error: 'reCAPTCHA failed' });
  }

  const zapierRes = await fetch(ZAPIER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zapierPayload),
  });

  if (!zapierRes.ok) {
    return res.status(502).json({ ok: false, error: 'Upstream error' });
  }

  return res.status(200).json({ ok: true });
}
