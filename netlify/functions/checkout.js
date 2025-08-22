// netlify/functions/checkout.js
const crypto = require("crypto");
const { Client, Environment } = require("square/legacy");

// ---- price table (server-authoritative) ----
// Keep this in sync with your site pricing. You can expand per product as needed.
const PRODUCTS = {
  "charcuterie-board": { base: 59.99 },
  "drill-sergeant-hat-display": { base: 109.99 },
  "wall-mounted-challenge-coin-holder": { base: 99.99 },
  "us-flag-challenge-coin-display": { base: 149.99 },
  "triangular-book-holder": { base: 49.99 },
  "wooden-entry-sign": { base: 84.99 },
};

// Normalize option names coming from the client
function norm(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

// Compute ONE line item price (in cents) on the server
function computePriceCents(productId, options = {}) {
  const p = PRODUCTS[productId];
  if (!p) throw new Error(`Unknown product: ${productId}`);

  let price = p.base; // dollars

  // Sizes (example rules; tweak to match your real options)
  const size = norm(options.size);
  if (size === "16x12" || size === "medium") price += 20;
  if (size === "20x16" || size === "large") price += 50;

  // Wood
  const wood = norm(options.wood);
  if (wood === "walnut") price += 25;

  // Engraving selected?
  const customization = norm(options.customization || options.engraving);
  if (customization && customization !== "none") price += 10;

  return Math.round(price * 100);
}

// Pretty note for the Square line item
function lineNoteFromOptions(o = {}) {
  const bits = [];
  if (o.wood) bits.push(`Wood: ${o.wood}`);
  if (o.size) bits.push(`Size: ${o.size}`);
  if (o.engravingText) bits.push(`Engraving: "${String(o.engravingText).slice(0, 120)}"`);
  if (o.uploadUrl) bits.push(`Logo URL: ${o.uploadUrl}`);
  if (o.orderRef) bits.push(`Ref: ${o.orderRef}`);
  return bits.join(" | ");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Env checks
    const missing = ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_ENV"].filter((k) => !process.env[k]);
    if (missing.length) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: `Missing env vars: ${missing.join(", ")}` }) };
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENV === "PRODUCTION" ? Environment.Production : Environment.Sandbox,
    });

    const body = JSON.parse(event.body || "{}");

    // Backward compatibility: accept either `token` or older `sourceId`
    const sourceId = body.token || body.sourceId;
    const buyerEmail = body.email || body.buyerEmail || undefined;
    const orderRef = body.orderRef || crypto.randomUUID();

    // Accept either the new cart shape or the legacy single-item shape
    const items =
      Array.isArray(body.items) && body.items.length
        ? body.items
        : body.productId
        ? [
            {
              productId: body.productId,
              title: body.productId.replace(/-/g, " "),
              qty: 1,
              priceCents: Math.round(Number(body.amount || 0) * 100),
              options: body.options || {},
            },
          ]
        : [];

    if (!sourceId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing card token" }) };
    }
    if (!items.length) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "No items provided" }) };
    }

    // Validate / normalize line items server-side
    const lineItems = items.map((i) => {
      const expected = computePriceCents(i.productId, i.options || {});
      const finalAmount = expected; // authoritative server price
      return {
        name: i.title || i.productId.replace(/-/g, " "),
        quantity: String(i.qty || 1),
        basePriceMoney: { amount: finalAmount, currency: "USD" },
        note: lineNoteFromOptions(i.options),
      };
    });

    const orderAmount = lineItems.reduce((sum, li) => sum + Number(li.basePriceMoney.amount) * Number(li.quantity), 0);

    // Create Order (nicer receipt + notes)
    const { result: orderRes } = await client.ordersApi.createOrder({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: orderRef, // ties to your Netlify upload + emails
        lineItems,
      },
    });

    // Charge
    const { result: payRes } = await client.paymentsApi.createPayment({
      idempotencyKey: crypto.randomUUID(),
      sourceId,
      locationId: process.env.SQUARE_LOCATION_ID,
      amountMoney: { amount: orderAmount, currency: "USD" },
      orderId: orderRes.order?.id,
      autocomplete: true,
      buyerEmailAddress: buyerEmail,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        paymentId: payRes.payment.id,
        orderId: orderRes.order?.id,
        orderRef,
      }),
    };
  } catch (err) {
    console.error("Checkout error:", err);
    const detail = err?.result?.errors?.[0]?.detail || err?.errors?.[0]?.detail || err?.message || "Server error";
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: detail }) };
  }
};
