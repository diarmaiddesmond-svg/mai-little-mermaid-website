// Validate a promo code and return the discount percentage.
// Called by cart.html when the customer hits Apply.
// Public endpoint — no auth required.
//
// POST { code }
// Returns { valid: true, discountPercent: 10, code: "OCEAN10" }
//      or { valid: false }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const sbRes = await fetch(
    `${supabaseUrl}/rest/v1/promo_codes?code=eq.${encodeURIComponent(code.toUpperCase())}&active=eq.true&select=code,discount_percent`,
    {
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!sbRes.ok) return res.status(200).json({ valid: false });

  const rows = await sbRes.json();
  if (!rows.length) return res.status(200).json({ valid: false });

  return res.status(200).json({
    valid:           true,
    code:            rows[0].code,
    discountPercent: rows[0].discount_percent,
  });
};
