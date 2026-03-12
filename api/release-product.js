// Release a product reservation (e.g. when removed from cart).
//
// POST { productId }
// Returns 200 { ok: true }
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'Missing productId' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ reserved_until: null }),
    }
  );

  return res.status(200).json({ ok: true });
};
