// Mark products as sold after a completed Stripe checkout,
// clear any reservations, and send an order confirmation email.
//
// Called by order-success.html with the Stripe session_id.
// Verifies the payment succeeded, then sets available=false in Supabase
// for every ready-to-ship product ID that was in the order.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY        — already set
//   SUPABASE_URL             — your project URL (https://xxx.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API → service_role key
//   RESEND_API_KEY           — from resend.com (free tier: 3 000 emails/month)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  // Verify the session is genuinely paid; expand line_items for the email
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey && rtsIds.length > 0) {
    const ids = rtsIds.join(',');
    // Mark sold AND clear reservation in one PATCH
    await fetch(
      `${supabaseUrl}/rest/v1/products?id=in.(${ids})`,
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ available: false, reserved_until: null }),
      }
    );
  }

  // Send order confirmation email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const customerEmail = session.customer_details?.email;

  if (resendKey && customerEmail) {
    const customerName = session.customer_details?.name?.split(' ')[0] || 'there';
    const lineItems = session.line_items?.data || [];

    const itemRows = lineItems.map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8dfc8;font-family:'Georgia',serif;font-size:15px;color:#1a1410;">
          ${item.description || item.price?.product_data?.name || 'Item'}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8dfc8;text-align:right;font-family:Arial,sans-serif;font-size:14px;color:#1a1410;">
          $${((item.amount_total || 0) / 100).toFixed(2)}
        </td>
      </tr>`).join('');

    const total = ((session.amount_total || 0) / 100).toFixed(2);
    const hasMTO = session.metadata?.hasMTO === 'true';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e8dfc8;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#2d5a6b;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:'Georgia',serif;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.6);">Newport, Rhode Island</p>
            <h1 style="margin:8px 0 0;font-family:'Georgia',serif;font-size:26px;font-weight:400;color:#fff;letter-spacing:0.08em;">Mai Little Mermaid</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="margin:0 0 6px;font-family:'Georgia',serif;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#8b7355;">Order Confirmation</p>
            <h2 style="margin:0 0 24px;font-family:'Georgia',serif;font-size:22px;font-weight:400;color:#1a1410;">Thank you, ${customerName} ✨</h2>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#3a3028;">
              Your order has been received and ${hasMTO ? 'I'll start crafting your piece — expect about a week before it ships.' : 'I\'ll have it packed and on its way within 2–3 days.'}
              I handcraft every piece myself from beach-found treasures, so please know each one is made with a lot of love.
            </p>

            <!-- Order items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8dfc8;margin-bottom:24px;">
              ${itemRows}
              <tr>
                <td style="padding:14px 0 0;font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#1a1410;letter-spacing:0.06em;text-transform:uppercase;">Total</td>
                <td style="padding:14px 0 0;text-align:right;font-family:'Georgia',serif;font-size:18px;color:#1a1410;">$${total}</td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#5a4a3a;">
              If you have any questions about your order, just reply to this email — I personally read every message.
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#5a4a3a;">
              With gratitude,<br>
              <span style="font-family:'Georgia',serif;font-size:16px;color:#1a1410;">Maile</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0e8d8;padding:20px 40px;text-align:center;border-top:1px solid #d9cdb8;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;">
              © 2025 Mai Little Mermaid · Newport, Rhode Island
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#8b7355;">
              <a href="https://mailittlemermaid.com" style="color:#4a7c8e;text-decoration:none;">mailittlemermaid.com</a>
              &nbsp;·&nbsp;
              <a href="https://instagram.com/mai.little.mermaid" style="color:#4a7c8e;text-decoration:none;">@mai.little.mermaid</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mai Little Mermaid <orders@mailittlemermaid.com>',
        to: customerEmail,
        subject: `Your order is confirmed ✨ — Mai Little Mermaid`,
        html,
      }),
    }).catch(e => console.error('Resend error:', e));
  }

  return res.status(200).json({ ok: true, updated: rtsIds.length });
};
