// Return all custom-order enquiries for admin.html.
// Auth-gated — requires a valid Supabase JWT.
//
// GET /api/list-enquiries
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // Verify the JWT belongs to a real authenticated user
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!userRes.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sbRes = await fetch(
    `${supabaseUrl}/rest/v1/enquiries?order=created_at.desc&select=*`,
    {
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('list-enquiries error:', err);
    return res.status(500).json({ error: 'Failed to load enquiries' });
  }

  const rows = await sbRes.json();
  return res.status(200).json(rows);
};
