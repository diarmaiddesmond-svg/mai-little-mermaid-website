// Fetch all paid Stripe checkout sessions and merge with Supabase
// fulfillment statuses. Called by admin.html Orders tab.
//
// Requires the caller to pass a valid Supabase access token
// in the Authorization header — this is how we know it's Maile.
//
// Required env vars:
//   STRIPE_SECRET_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured — add STRIPE_SECRET_KEY to Vercel environment variables' });
  }
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  // Auth: validate the Supabase JWT sent from admin.html
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

  // Fetch the last 100 paid checkout sessions with line items expanded
  let sessions;
  try {
    sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.line_items'],
    });
  } catch (e) {
    return res.status(500).json({ error: 'Stripe error: ' + e.message });
  }

  const paid = sessions.data.filter(s => s.payment_status === 'paid');

  // Fetch fulfillment statuses from Supabase orders table
  let statusMap = {};
  if (paid.length > 0) {
    const ids = paid.map(s => s.id).join(',');
    const sbRes = await fetch(
      `${supabaseUrl}/rest/v1/orders?stripe_session_id=in.(${ids})&select=*`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    );
    if (sbRes.ok) {
      const rows = await sbRes.json();
      statusMap = Object.fromEntries(rows.map(r => [r.stripe_session_id, r]));
    }
  }

  const orders = paid.map(s => {
    const db = statusMap[s.id] || {};
    return {
      id: s.id,
      created: s.created,
      customer: s.customer_details || {},
      shipping: s.shipping_details || {},
      lineItems: (s.line_items?.data || []).map(li => ({
        name: li.description || li.price?.product_data?.name || '',
        qty: li.quantity,
        amount: li.amount_total,
        currency: li.currency,
        metadata: li.price?.product_data?.metadata || {},
      })),
      amountTotal: s.amount_total,
      amountSubtotal: s.amount_subtotal,
      currency: s.currency,
      hasMTO: s.metadata?.hasMTO === 'true',
      orderNotes: s.metadata?.order_notes || '',
      rtsIds: s.metadata?.rts_ids ? JSON.parse(s.metadata.rts_ids) : [],
      // Fulfillment from Supabase
      status: db.status || 'new',
      shippedAt: db.shipped_at || null,
      fulfillmentNote: db.fulfillment_note || '',
      dbOrderId: db.id || null,
    };
  });

  return res.status(200).json(orders);
};
