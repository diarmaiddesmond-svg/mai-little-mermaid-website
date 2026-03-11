// Mark products as sold after a completed Stripe checkout.
//
// Called by order-success.html with the Stripe session_id.
// Verifies the payment succeeded, then sets available=false in Supabase
// for every ready-to-ship product ID that was in the order.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY        — already set
//   SUPABASE_URL             — your project URL (https://xxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API → service_role key

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  // Verify the session is genuinely paid
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid session' });
  }

  if (session.payment_status !== 'paid') {
    return res.status(400).json({ error: 'Payment not completed' });
  }

  // Get the RTS product IDs we stored in metadata
  const rtsIds = session.metadata?.rts_ids
    ? JSON.parse(session.metadata.rts_ids)
    : [];

  if (rtsIds.length === 0) {
    return res.status(200).json({ ok: true, updated: 0 });
  }

  // Mark each product sold using the service role key (bypasses RLS)
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const ids = rtsIds.join(',');
  const sbRes = await fetch(
    `${supabaseUrl}/rest/v1/products?id=in.(${ids})`,
    {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ available: false }),
    }
  );

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('Supabase error:', err);
    return res.status(500).json({ error: 'Failed to update products' });
  }

  return res.status(200).json({ ok: true, updated: rtsIds.length });
};
