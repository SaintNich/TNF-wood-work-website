import { getCart, clearCart } from "/js/cart.js";
import { submitPendingUpload, hasPendingFile, ensureOrderRef } from "/js/upload.js";

const APP_ID = window.SQUARE_APP_ID || "";
const LOCATION_ID = window.SQUARE_LOCATION_ID || "";
const fmt = (c) => (Number(c)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});

let quote = null;

const statusEl = document.getElementById('checkoutStatus');

// Small debounce helper (kept local to avoid extra imports)
function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Toggle aria-invalid and write polite status if provided
function setFieldInvalid(el, invalid, msg) {
  if (!el) return;
  if (invalid) {
    el.setAttribute('aria-invalid','true');
    if (msg && statusEl) statusEl.textContent = msg;
  } else {
    el.removeAttribute('aria-invalid');
  }
}

// Validate core checkout fields before payment
function validateCheckoutFields() {
  let ok = true;
  if (statusEl) statusEl.textContent = '';

  const checks = [
    ['#shipName', 'Enter your full name.'],
    ['#checkoutEmail', 'Enter a valid email address.'],
    ['#checkoutPhone', 'Enter a phone number.'],
    ['#shipAddress1', 'Enter your street address.'],
    ['#shipCity', 'Enter your city.'],
    ['#shipState', 'Enter your state.'],
    ['#shipZip', 'Enter your postal code.'],
    ['#shipCountry', 'Enter your country.'],
  ];

  checks.forEach(([sel, msg]) => {
    const el = document.querySelector(sel);
    const value = (el?.value || '').trim();
    const invalid = !value || (sel==='#checkoutEmail' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value));
    setFieldInvalid(el, invalid, invalid ? msg : '');
    if (invalid) ok = false;
  });

  if (!ok && statusEl) statusEl.textContent = statusEl.textContent || 'Please correct the highlighted fields.';
  return ok;
}


function getShippingAddress() {
  const v = (id) => document.getElementById(id)?.value?.trim() || "";
  return {
    name: v("shipName"),
    address1: v("shipAddress1"),
    address2: v("shipAddress2"),
    city: v("shipCity"),
    state: v("shipState"),
    postalCode: v("shipZip"),
    country: "US",
    method: v("shipMethod") || "standard",
  };
}

function renderSummary() {
  const box = document.getElementById('orderSummary'); 
  if (!box) return;

  const items = getCart();
  if (!items.length) { box.innerHTML = '<p>Your cart is empty.</p>'; return; }

  const rows = items.map(i => `
    <div class="row" style="display:flex;justify-content:space-between;gap:12px">
      <div>${i.title} <small style="color:#6b7280">${i.optionsLabel || ''}</small></div>
      <div>${fmt(Number(i.priceCents) * (i.qty||1))}</div>
    </div>`).join('');

  const subtotal = items.reduce((s, i) => s + Number(i.priceCents) * (i.qty || 1), 0);
  const shipping = quote?.shippingCents ?? 0;
  const tax = quote?.taxCents ?? 0;
  const total = quote?.totalCents ?? subtotal + shipping + tax;

  box.innerHTML = `
    <h2>Order summary</h2>
    <div class="card" style="padding:12px;border:1px solid #e5e7eb;border-radius:12px">
      ${rows}
      <hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb" />
      <div class="row" style="display:flex;justify-content:space-between"><strong>Subtotal</strong><strong>${fmt(subtotal)}</strong></div>
      <div class="row" style="display:flex;justify-content:space-between"><span>Shipping</span><strong>${quote ? fmt(shipping) : "—"}</strong></div>
      <div class="row" style="display:flex;justify-content:space-between"><span>Tax</span><strong>${quote ? fmt(tax) : "—"}</strong></div>
      <div class="row" style="display:flex;justify-content:space-between;font-size:1.05rem;margin-top:6px"><strong>Total</strong><strong>${quote ? fmt(total) : fmt(subtotal)}</strong></div>
      <p class="mini-cart-note">${quote ? "Shipping & tax confirmed." : "Enter state and zip to calculate shipping & tax."}</p>
      <p><a href="/cart.html" class="button button--secondary" style="margin-top:8px">Edit in Cart</a></p>
    </div>`;
}

async function initSquare() {
  if (!window.Square) {
    console.error("Square SDK not loaded");
    return null;
  }
  const payments = window.Square.payments(APP_ID, LOCATION_ID);
  const card = await payments.card();
  await card.attach("#card-container");
  return { payments, card };
}

/* function ensureOrderRef(items) {
  return items[0]?.options?.orderRef || crypto.randomUUID();
} */

let quoteAbort;
async function fetchQuote() {
  const items = getCart();
  if (!items.length) return;

  const address = getShippingAddress();
  if (!address.postalCode || address.postalCode.length < 5) {
    quote = null;
    renderSummary();
    return;
  }
  
  try {
    // abort stale in-flight requests
    quoteAbort?.abort();
    quoteAbort = new AbortController();
    if (statusEl) statusEl.textContent = '';
    const res = await fetch("/.netlify/functions/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ 
          productId: i.productId, 
          qty: i.qty, 
          priceCents: Number(i.priceCents),
          weightLb: Number(i.weightLb) || 0,
          oversizeFeeCents: Number(i.oversizeFeeCents) || 0,
        })),
        address,
      }),
    signal: quoteAbort.signal });
    if (!res.ok) throw new Error("Quote failed");
    quote = await res.json();
    renderSummary();
  } catch (e) {
    console.warn("Quote error:", e);
    if (statusEl) statusEl.textContent = 'We couldn\'t fetch shipping right now. Please check your ZIP and try again.';
    quote = null;
    renderSummary();
  }
}

function setPayBusy(busy, label = "Processing…") {
  const payBtn = document.getElementById("payBtn");
  const cartBtn = document.getElementById("cartReturn");
  const shopBtn = document.getElementById("contShop");

  [cartBtn, shopBtn].forEach(b => b && (b.disabled = !!busy));

  if (!payBtn) return;
  if (busy) {
    if (!payBtn.dataset.originalLabel) payBtn.dataset.originalLabel = payBtn.textContent || "Pay Now";
    payBtn.disabled = true;
    payBtn.setAttribute("aria-busy", "true");
    payBtn.textContent = label;
    payBtn.classList.add("is-loading");
  } else {
    payBtn.disabled = false;
    payBtn.setAttribute("aria-busy", "false");
    payBtn.textContent = payBtn.dataset.originalLabel || "Pay Now";
    payBtn.classList.remove("is-loading");
  }
}

async function onPay(card) {
  const items = getCart();
  if (!items.length) { if (statusEl) statusEl.textContent = 'Your cart is empty.'; return; }

  if (!validateCheckoutFields()) { setPayBusy(false); return; }

  const orderRef = items[0]?.options?.orderRef || ensureOrderRef();
  const email = document.getElementById("checkoutEmail")?.value || "";
  const address = getShippingAddress();

  try {
    // 1) Re-quote so client/server totals match
    if (statusEl) statusEl.textContent = 'Calculating shipping…';
    setPayBusy(true, "Calculating…");
    await fetchQuote();

    // 2) Tokenize card
    if (statusEl) statusEl.textContent = 'Processing payment…';
    setPayBusy(true, "Processing…");
    const { status, token, errors } = await card.tokenize();
    if (errors && errors.length && statusEl) statusEl.textContent = errors[0]?.message || 'Card validation error.';
    if (status !== "OK" || !token) {
      console.error("[CLIENT TOKEN ERROR]", { status, errors });
      setPayBusy(false);
      alert("Check your card details.");
      return;
    }

    // 3) Build payload & submit
    const itemsForServer = items.map(i => ({
      productId: i.productId,
      title: i.title,
      qty: i.qty,
      priceCents: Number(i.priceCents),
      weightLb: Number(i.weightLb) || 0,
      oversizeFeeCents: Number(i.oversizeFeeCents) || 0,
      options: i.options,
      optionsLabel: i.optionsLabel || "",
    }));

    const body = { email, orderRef, address, method: address.method, quote, items: itemsForServer, token };

    const res = await fetch("/.netlify/functions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[CHECKOUT ERROR]", out);
      setPayBusy(false);
      alert(out?.error || "Payment failed.");
      return;
    }

    // For your own visibility while testing
    console.log("[ORDER OK]", { orderId: out.orderId, paymentId: out.paymentId });

    const snapshot = {
      orderRef,
      email,
      address,
      items: itemsForServer,
      quote,
      totals: out.totals || null,
      receiptUrl: out.receiptUrl || null,
      createdAt: new Date().toISOString(),
    }
    try {
      sessionStorage.setItem(`tnf_last_order_${orderRef}`, JSON.stringify(snapshot));
    } catch {}

    clearCart();
    // Keep button disabled to prevent double-submits; redirect away
    window.location.href = `/thanks.html?ref=${encodeURIComponent(orderRef)}`;
  } catch (err) {
    console.error(err);
    setPayBusy(false);
    alert("Something went wrong during payment.");
  }
}

function wireAdressListeners() {
  [ "shipState", "shipZip" ]
  .map((id) => document.getElementById(id))
  .filter(Boolean)
  .forEach((el) => el.addEventListener("input", debounce(fetchQuote, 300), { passive: true }));
}

async function init(){
  if (!document.querySelector('#card-container')) return; 
  renderSummary(); 
  wireAdressListeners();
  await fetchQuote();

  const setup = await initSquare(); 
  if (!setup) return;
  const { card } = setup;
  
  document.getElementById('payBtn')?.addEventListener('click', (e) => { e.preventDefault(); onPay(card); });
  window.dataLayer = window.dataLayer || []; 
  window.dataLayer.push({ event:'begin_checkout' });
  window.addEventListener('tnf:cart-updated', () => {
    renderSummary();
    fetchQuote();
  });
}

document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
