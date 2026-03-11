// Stripe Checkout Session — Vercel/Netlify serverless function
//
// Setup:
//   1. npm install stripe  (inside /api or at repo root)
//   2. Set STRIPE_SECRET_KEY in your hosting environment variables
//      (Vercel: Project Settings → Environment Variables)
//   3. Set STRIPE_WEBHOOK_SECRET if you want to handle post-payment webhooks
//
// The frontend (cart.html) POSTs cart items here and receives a Stripe
// Checkout URL to redirect the customer to.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items, promoDiscount = 0, successUrl, cancelUrl } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  // Build Stripe line items from cart
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
        description: [
          item.metal,
          item.colour,
          item.isMTO ? 'Made to Order · ~1 week lead time' : 'Ready to Ship · Ships in 2–3 days',
        ].join(' · '),
        // Add product metadata so Maile can see order details in Stripe dashboard
        metadata: {
          type: item.type,
          metal: item.metal,
          colour: item.colour,
          isMTO: item.isMTO ? 'true' : 'false',
        },
      },
      unit_amount: Math.round(item.price * 100), // Stripe uses cents
    },
    quantity: item.qty,
  }));

  // Apply promo discount as a coupon if active
  const discounts = [];
  if (promoDiscount > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: promoDiscount * 100, // cents
      currency: 'usd',
      duration: 'once',
      name: 'OCEAN10',
    });
    discounts.push({ coupon: coupon.id });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      discounts: discounts.length > 0 ? discounts : undefined,
      success_url: successUrl || `${req.headers.origin}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin}/cart.html`,
      shipping_address_collection: {
        allowed_countries: ['US', 'IE', 'GB', 'CA', 'AU', 'NZ', 'DE', 'FR'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 800, currency: 'usd' },
            display_name: 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
      ],
      metadata: {
        source: 'mai-little-mermaid-website',
        hasMTO: items.some(i => i.isMTO) ? 'true' : 'false',
      },
      // Optional: collect customer email for order confirmation
      customer_creation: 'always',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
