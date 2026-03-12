// Save a custom-order enquiry from shop.html → Supabase enquiries table.
//
// POST { name, email, pieceType, metals, materials, message }
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, pieceType, metals, materials, message } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const sbRes = await fetch(`${supabaseUrl}/rest/v1/enquiries`, {
    method: 'POST',
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      name:       name       || null,
      email,
      piece_type: pieceType  || null,
      metals:     metals     || null,
      materials:  materials  || null,
      message:    message    || null,
      status:     'new',
    }),
  });

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('submit-enquiry error:', err);
    return res.status(500).json({ error: 'Failed to save enquiry' });
  }

  return res.status(200).json({ ok: true });
};
