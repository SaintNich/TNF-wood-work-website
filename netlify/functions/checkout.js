// netlify/functions/checkout.js
const crypto = require('crypto');
const Square = require('square');
const { Client } = Square; // don't use Environment enum

// ---- price table ----
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
  if (options.size === '16x12') price += 20;
  if (options.size === '20x16') price += 50;
  if (options.wood === 'walnut') price += 25;
  if (options.engraving && options.engraving !== 'none') price += 10;
  return Math.round(price * 100);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // env checks
    const missing = ['SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID','SQUARE_ENV']
      .filter(k => !process.env[k]);
    if (missing.length) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:`Missing env vars: ${missing.join(', ')}` }) };
    }

    // use string env to avoid enum issues
    const envStr = (process.env.SQUARE_ENV || 'SANDBOX').toUpperCase() === 'PRODUCTION'
      ? 'production'
      : 'sandbox';

    const client = new Client({
      environment: envStr,                    // << string, not Environment.Sandbox/Production
      accessToken: process.env.SQUARE_ACCESS_TOKEN
    });

    const { sourceId, productId, options, amount, buyerEmail } = JSON.parse(event.body || '{}');

    // price check
    const expected = computePriceCents(productId, options);
    const clientAmt = Math.round(Number(amount || 0) * 100);
    if (clientAmt !== expected) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:`Price mismatch: client ${clientAmt} vs server ${expected}` }) };
    }

    // optional order (nicer receipt)
    const { result: orderRes } = await client.ordersApi.createOrder({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: [{
          name: productId.replace(/-/g,' '),
          quantity: '1',
          basePriceMoney: { amount: expected, currency: 'USD' }
        }]
      }
    });

    // charge
    const { result: payRes } = await client.paymentsApi.createPayment({
      idempotencyKey: crypto.randomUUID(),
      sourceId,
      locationId: process.env.SQUARE_LOCATION_ID,
      amountMoney: { amount: expected, currency: 'USD' },
      orderId: orderRes.order?.id,
      autocomplete: true,
      buyerEmailAddress: buyerEmail || undefined
    });

    return { statusCode: 200, body: JSON.stringify({ ok:true, paymentId: payRes.payment.id, orderId: orderRes.order?.id }) };
  } catch (err) {
    console.error('Checkout error:', err);
    const detail =
      err?.result?.errors?.[0]?.detail ||
      err?.errors?.[0]?.detail ||
      err?.message || 'Server error';
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: detail }) };
  }
};
