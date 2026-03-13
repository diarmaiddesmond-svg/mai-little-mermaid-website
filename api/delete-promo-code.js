// Delete a promo code by ID.
// Auth-gated.
//
// POST { id }

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

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const sbRes = await fetch(
    `${supabaseUrl}/rest/v1/promo_codes?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer':        'return=minimal',
      },
    }
  );

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('delete-promo-code error:', err);
    return res.status(500).json({ error: 'Failed to delete promo code' });
  }

  return res.status(200).json({ ok: true });
};
