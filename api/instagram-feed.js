// Serve the 5 most recent Instagram posts.
//
// GET /api/instagram-feed
//   → 200 [{ id, url, permalink, type }]
//   Response is cached 1 hour at the CDN edge (s-maxage=3600).
//
// GET /api/instagram-feed?action=refresh
//   → 200 { access_token, expires_in }
//   Call this once every ~50 days to keep the token alive.
//   Update INSTAGRAM_ACCESS_TOKEN in your Vercel env vars with the
//   returned access_token value.
//
// Required env var:
//   INSTAGRAM_ACCESS_TOKEN  — long-lived token from Meta Developer Console
//
// How to get a long-lived token (one-time setup):
//   1. Go to developers.facebook.com → My Apps → Create App → Consumer
//   2. Add "Instagram Basic Display" product
//   3. Add your @mai.little.mermaid account as a test user
//   4. Use the Token Generator in the product dashboard to get a short-lived token
//   5. Exchange it for a long-lived token (60-day expiry):
//      curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token \
//        &client_secret=YOUR_APP_SECRET \
//        &access_token=SHORT_LIVED_TOKEN"
//   6. Save the returned token as INSTAGRAM_ACCESS_TOKEN in Vercel env vars

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'INSTAGRAM_ACCESS_TOKEN not configured' });
  }

  // ── TOKEN REFRESH ──────────────────────────────────────────────────────────
  if (req.query.action === 'refresh') {
    const r = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
    );
    if (!r.ok) {
      console.error('Instagram token refresh failed:', await r.text());
      return res.status(502).json({ error: 'Token refresh failed' });
    }
    const data = await r.json();
    // data.access_token is the new token — save it to your Vercel env var
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    });
  }

  // ── FETCH FEED ─────────────────────────────────────────────────────────────
  const fields = 'id,media_url,permalink,thumbnail_url,media_type';
  const igUrl  = `https://graph.instagram.com/me/media?fields=${fields}&limit=5&access_token=${token}`;

  const igRes = await fetch(igUrl);
  if (!igRes.ok) {
    console.error('Instagram API error:', await igRes.text());
    return res.status(502).json({ error: 'Instagram API error' });
  }

  const { data } = await igRes.json();

  // Cache at the CDN edge for 1 hour; serve stale for up to 24 h while revalidating
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  return res.status(200).json(
    data.map(p => ({
      id:        p.id,
      // Videos expose thumbnail_url instead of media_url for a static preview
      url:       p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      permalink: p.permalink,
      type:      p.media_type,
    }))
  );
};
