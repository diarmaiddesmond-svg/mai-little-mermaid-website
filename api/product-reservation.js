// Manage product reservations (reserve + release combined).
//
// POST { action: 'reserve', productId }
//   → 200 { ok: true, reservedUntil }  or  409 { error: 'already_reserved' }
//
// POST { action: 'release', productId }
//   → 200 { ok: true }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Missing productId' });
  if (action !== 'reserve' && action !== 'release') {
    return res.status(400).json({ error: 'action must be reserve or release' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' });

  if (action === 'reserve') {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_product`, {
      method: 'POST',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ p_id: productId }),
    });

    if (!rpcRes.ok) {
      const err = await rpcRes.text();
      console.error('reserve_product RPC error:', err);
      return res.status(500).json({ error: 'Reservation failed' });
    }

    const result = await rpcRes.json();
    if (!result) return res.status(409).json({ error: 'already_reserved' });
    return res.status(200).json({ ok: true, reservedUntil: result });
  }

  // action === 'release'
  await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ reserved_until: null }),
    }
  );
  return res.status(200).json({ ok: true });
};
