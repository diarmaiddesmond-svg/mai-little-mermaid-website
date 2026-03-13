// Promo code admin management (list + save + delete combined).
// All routes are auth-gated.
//
// GET  → list all promo codes
// POST { action: 'save',   code, discountPercent, active } → upsert
// POST { action: 'delete', id }                            → delete

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server not configured' });

  // Verify JWT
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${token}` },
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Unauthorized' });

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const sbRes = await fetch(
      `${supabaseUrl}/rest/v1/promo_codes?order=created_at.desc&select=*`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    );
    if (!sbRes.ok) {
      console.error('manage-promos list error:', await sbRes.text());
      return res.status(500).json({ error: 'Failed to load promo codes' });
    }
    return res.status(200).json(await sbRes.json());
  }

  const { action } = req.body;

  // ── SAVE (create / update) ────────────────────────────────────────────────
  if (action === 'save') {
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
        body: JSON.stringify({ code: code.trim().toUpperCase(), discount_percent: pct, active }),
      }
    );
    if (!sbRes.ok) {
      console.error('manage-promos save error:', await sbRes.text());
      return res.status(500).json({ error: 'Failed to save promo code' });
    }
    return res.status(200).json({ ok: true });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (action === 'delete') {
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
      console.error('manage-promos delete error:', await sbRes.text());
      return res.status(500).json({ error: 'Failed to delete promo code' });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
