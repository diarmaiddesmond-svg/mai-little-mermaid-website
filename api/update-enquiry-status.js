// Update the status of a custom-order enquiry.
// Called by admin.html when Maile acts on an enquiry.
//
// POST { enquiryId, status }
// status: 'new' | 'replied' | 'declined'
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!userRes.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { enquiryId, status } = req.body;

  if (!enquiryId || !status) {
    return res.status(400).json({ error: 'Missing enquiryId or status' });
  }

  if (!['new', 'replied', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const sbRes = await fetch(
    `${supabaseUrl}/rest/v1/enquiries?id=eq.${enquiryId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ status }),
    }
  );

  if (!sbRes.ok) {
    const err = await sbRes.text();
    console.error('update-enquiry-status error:', err);
    return res.status(500).json({ error: 'Failed to update enquiry' });
  }

  return res.status(200).json({ ok: true });
};
