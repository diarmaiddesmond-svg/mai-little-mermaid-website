// Atomically reserve a ready-to-ship product for 10 minutes.
//
// POST { productId }
// Returns 200 { ok: true, reservedUntil: ISO string }
// Returns 409 { error: 'already_reserved' } if the product is unavailable or
//   already held by another user's active reservation.
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

  // Atomically claim the product only if it's available and not currently reserved.
  // We use a raw SQL RPC so we can do a conditional UPDATE and get the new timestamp back.
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_product`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_id: productId }),
  });

  if (!rpcRes.ok) {
    const err = await rpcRes.text();
    console.error('reserve_product RPC error:', err);
    return res.status(500).json({ error: 'Reservation failed' });
  }

  const result = await rpcRes.json();

  // The RPC returns null if the product could not be reserved
  if (!result) {
    return res.status(409).json({ error: 'already_reserved' });
  }

  return res.status(200).json({ ok: true, reservedUntil: result });
};
