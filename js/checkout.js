// ../js/checkout.js
import { getCart, clearCart } from "/js/cart.js";
import { submitPendingUpload, hasPendingFile } from "/js/upload.js";

const APP_ID = window.SQUARE_APP_ID || "";
const LOCATION_ID = window.SQUARE_LOCATION_ID || "";
const fmt = (c) => (Number(c)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});

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

  const total = items.reduce((s,i)=>s + Number(i.priceCents)*(i.qty||1),0);

  box.innerHTML = `
    <h2>Order summary</h2>
    <div class="card" style="padding:12px;border:1px solid #e5e7eb;border-radius:12px">
      ${rows}
      <hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb" />
      <div class="row" style="display:flex;justify-content:space-between">
        <strong>Subtotal</strong><strong>${fmt(total)}</strong>
      </div>
      <p class="mini-cart-note">Shipping & tax calculated at payment.</p>
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

function ensureOrderRef(items) {
  return items[0]?.options?.orderRef || crypto.randomUUID();
}

async function onPay(card) {
  const items = getCart();
  if (!items.length) {
    alert("Your cart is empty.");
    return;
  }
  const orderRef = ensureOrderRef(items);
  const email = document.getElementById("checkoutEmail")?.value || "";

  const { status, token, errors } = await card.tokenize();
  if (status !== "OK") {
    console.error(errors);
    alert("Check your card details.");
    return;
  }

  // >>> Client payload lives here <<<
  const body = {
    email,
    orderRef,
    items: items.map((i) => ({
      productId: i.productId,
      title: i.title,
      qty: i.qty,
      priceCents: Number(i.priceCents),
      options: i.options,
    })),
    token,
  };

  const res = await fetch("/.netlify/functions/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(out);
    alert("Payment failed.");
    return;
  }

  // ...inside success branch:
  try {
    if (await hasPendingFile(orderRef)) {
        await submitPendingUpload(orderRef, { email });
    }
  } catch (e) {
    console.warn('Upload submit error:', e);
  }

  clearCart();
  window.location.href = `/thanks.html?ref=${encodeURIComponent(orderRef)}`;
}

async function init(){
  if (!document.querySelector('#card-container')) return; 
  renderSummary();                    
  const setup = await initSquare(); if (!setup) return;
  const { card } = setup;
  document.getElementById('payBtn')?.addEventListener('click', (e) => { e.preventDefault(); onPay(card); });
  window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event:'begin_checkout' });
  window.addEventListener('tnf:cart-updated', renderSummary);
}

document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
