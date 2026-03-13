// Create or update a promo code.
// Auth-gated.
//
// POST { code, discountPercent, active }
//   code must be unique; if it already exists the row is updated (upsert).

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server not configured' });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${token}` },
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' });

  const { code, discountPercent, active = true } = req.body;

  if (!code || !code.trim()) return res.status(400).json({ error: 'Code is required' });
  const pct = parseInt(discountPercent, 10);
  if (!pct || pct < 1 || pct > 100) return res.status(400).json({ error: 'Discount must be 1–100%' });

  const sbRes = await fetch(
    `${supabaseUrl}/rest/v1/promo_codes?on_conflict=code`,
    {
      method: 'POST',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        code:             code.trim().toUpperCase(),
        discount_percent: pct,
        active,
      }),
    }
  );

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('save-promo-code error:', err);
    return res.status(500).json({ error: 'Failed to save promo code' });
  }

  return res.status(200).json({ ok: true });
};
