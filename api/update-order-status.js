// Update (or create) the fulfillment status of an order in Supabase.
// Called by admin.html when Maile marks an order as packed or shipped.
//
// POST { stripeSessionId, status, fulfillmentNote }
// status: 'new' | 'packed' | 'shipped'
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: validate Supabase JWT
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!userRes.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { stripeSessionId, status, fulfillmentNote = '' } = req.body;

  if (!stripeSessionId || !status) {
    return res.status(400).json({ error: 'Missing stripeSessionId or status' });
  }

  if (!['new', 'packed', 'shipped'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const payload = {
    stripe_session_id: stripeSessionId,
    status,
    fulfillment_note: fulfillmentNote,
    ...(status === 'shipped' ? { shipped_at: new Date().toISOString() } : {}),
  };

  // Upsert — creates the record if it doesn't exist yet
  const sbRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('Supabase upsert error:', err);
    return res.status(500).json({ error: 'Failed to update order' });
  }

  return res.status(200).json({ ok: true });
};
