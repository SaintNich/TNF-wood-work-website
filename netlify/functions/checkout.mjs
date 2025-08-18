import crypto from 'crypto';
// Depending on the SDK version you install, the import is either 'square' or '@square/square'
import { Client, Environment } from 'square';

const client = new Client({
  environment: process.env.SQUARE_ENV === 'PRODUCTION' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});

// Basic product/price table (server is the source of truth)
const PRODUCTS = {
  'charcuterie-board': { base: 59.99 },
  'drill-sergeant-hat-display': { base: 109.99 },
  'wall-mounted-challenge-coin-holder': { base: 99.99 },
  'us-flag-challenge-coin-display': { base: 149.99 },
  'triangular-book-holder': { base: 49.99 },
  'wooden-entry-sign': { base: 84.99 }
};

function computePriceCents(productId, options = {}) {
  const p = PRODUCTS[productId];
  if (!p) throw new Error('Unknown product');
  let price = p.base;

  // Add your option math here (examples):
  // size
  if (options.size === '16x12') price += 20;
  if (options.size === '20x16') price += 50;
  // wood
  if (options.wood === 'walnut') price += 25;
  // engraving
  if (options.engraving && options.engraving !== 'none') price += 10;

  return Math.round(price * 100); // cents
}

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { sourceId, productId, options, amount, buyerEmail } = JSON.parse(event.body || '{}');

    // Compute authoritative price server-side
    const expected = computePriceCents(productId, options);
    const clientAmt = Math.round(Number(amount || 0) * 100);
    if (clientAmt !== expected) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Price mismatch. Refresh and try again.' }) };
    }

    // Optional: create an Order for nicer receipts
    const { result: orderRes } = await client.ordersApi.createOrder({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: [{
          name: productId.replace(/-/g, ' '),
          quantity: '1',
          basePriceMoney: { amount: expected, currency: 'USD' }
        }]
      }
    });

    // Charge
    const { result: payRes } = await client.paymentsApi.createPayment({
      idempotencyKey: crypto.randomUUID(),
      sourceId,
      locationId: process.env.SQUARE_LOCATION_ID,
      amountMoney: { amount: expected, currency: 'USD' },
      orderId: orderRes.order?.id,
      autocomplete: true,
      buyerEmailAddress: buyerEmail || undefined
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, paymentId: payRes.payment.id, orderId: orderRes.order?.id })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Server error' }) };
  }
}
