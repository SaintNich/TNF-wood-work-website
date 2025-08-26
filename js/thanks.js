// /js/thanks.js
// Renders the Thank You page from a checkout snapshot and finishes any pending logo upload.

import { submitPendingUpload, hasPendingFile } from "/js/upload.js";

const $ = (sel) => document.querySelector(sel);
const fmtUSD = (c) => (Number(c || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function getOrderRefFromUrl() {
  const qs = new URLSearchParams(location.search);
  return qs.get("ref") || "";
}

function loadSnapshot(orderRef) {
  if (!orderRef) return null;
  const key = `tnf_last_order_${orderRef}`;
  try { return JSON.parse(sessionStorage.getItem(key) || "null"); } catch { return null; }
}

function renderMeta(metaBox, { orderRef, email, createdAt }) {
  const when = createdAt ? new Date(createdAt) : new Date();
  metaBox.innerHTML = `
    <p><strong>Order #</strong> <span class="mono">${orderRef || "pending"}</span></p>
    <p><strong>Date</strong> ${when.toLocaleDateString()}</p>
    <p><strong>Email</strong> <span class="mono">${email || "—"}</span></p>
  `;
}

function renderSummary(summaryBox, snapshot) {
  const items = snapshot?.items || [];
  const totals = snapshot?.totals || snapshot?.quote || null;
  const subtotal = items.reduce((s, i) => s + Number(i.priceCents || 0) * (i.qty || 1), 0);
  const shipping = totals?.shippingCents ?? 0;
  const tax = totals?.taxCents ?? 0;
  const total = totals?.totalCents ?? subtotal + shipping + tax;

  const rows = items.length
    ? items.map((i) => `
        <li class="mini-cart-item">
          <div class="title">${i.title || i.productId}</div>
          ${i.optionsLabel ? `<div class="options">${i.optionsLabel}</div>` : ""}
          <div class="row"><span>Qty ${i.qty || 1}</span><span class="price">${fmtUSD(Number(i.priceCents) * (i.qty || 1))}</span></div>
        </li>`).join("")
    : `<p class="mini-cart-note">We’ve got your order. Your detailed receipt has been emailed.</p>`;

  summaryBox.innerHTML = `
    <h2>Order summary</h2>
    <ul class="mini-cart-items">${rows}</ul>
    <div class="mini-cart-footer">
      <div class="mini-cart-subtotal"><span>Subtotal</span><span>${fmtUSD(subtotal)}</span></div>
      <div class="mini-cart-subtotal"><span>Shipping</span><span>${totals ? fmtUSD(shipping) : "—"}</span></div>
      <div class="mini-cart-subtotal"><span>Tax</span><span>${totals ? fmtUSD(tax) : "—"}</span></div>
      <div class="mini-cart-subtotal"><strong>Total</strong><strong>${fmtUSD(total)}</strong></div>
      <p class="mini-cart-note">${totals ? "Shipping & tax confirmed." : "Shipping & tax are listed on your email receipt."}</p>
      <p>
        ${snapshot?.receiptUrl ? `<a class="button" href="${snapshot.receiptUrl}" target="_blank" rel="noopener">View Receipt</a>` : ""}
        <a class="button button--secondary" href="/">Continue Shopping</a>
      </p>
    </div>
  `;
}

async function handlePendingUpload(orderRef, email) {
  const container = $("#nextSteps");
  if (!container) return;

  const pending = orderRef ? await hasPendingFile(orderRef) : false;
  if (!pending) {
    container.innerHTML = `
      <h3>What happens next</h3>
      <ul class="after-paragraph-list">
        <li>We’ll start prepping your order in the shop.</li>
        <li>If you added customization or uploaded a logo, I’ll email you with any questions or a quick mockup for approval.</li>
        <li>Shipping updates and tracking will be sent to your email.</li>
        <li>Questions? Reach Josh at <a href="mailto:josh@tnfwoodwork.com">josh@tnfwoodwork.com</a>.</li>
      </ul>
    `;
    return;
  }

  container.innerHTML = `
    <h3>What happens next</h3>
    <p class="mini-cart-note" id="uploadStatus"><strong>Customization file:</strong> Receiving your file…</p>
    <ul class="after-paragraph-list">
      <li>We’ll start prepping your order in the shop.</li>
      <li>I’ll review your upload and email you a quick mockup if needed.</li>
      <li>Shipping updates and tracking will be sent to your email.</li>
      <li>Questions? Reach Josh at <a href="mailto:josh@tnfwoodwork.com">josh@tnfwoodwork.com</a>.</li>
    </ul>
  `;

  try {
    await submitPendingUpload(orderRef, { email: email || "" });
    $("#uploadStatus").innerHTML = `<strong>Customization file:</strong> Got it. If anything needs tweaking, I’ll email you a quick mockup.`;
  } catch (e) {
    $("#uploadStatus").innerHTML = `<strong>Customization file:</strong> Upload didn’t complete. Please reply to your order email or try again.`;
  }
}

function pushPurchaseEvent(snapshot) {
  try {
    const items = snapshot?.items || [];
    const totals = snapshot?.totals || snapshot?.quote || null;
    const subtotal = items.reduce((s, i) => s + Number(i.priceCents || 0) * (i.qty || 1), 0);
    window.dataLayer = window.dataLayer || [];
    if (items.length) {
      window.dataLayer.push({
        event: "purchase",
        ecommerce: {
          currency: "USD",
          value: Number((totals?.totalCents ?? subtotal) / 100),
          transaction_id: snapshot?.orderRef || undefined,
          items: items.map((i) => ({
            item_id: i.productId,
            item_name: i.title,
            item_variant: i.optionsLabel || "",
            price: Number(i.priceCents || 0) / 100,
            quantity: i.qty || 1,
          })),
        },
      });
    }
  } catch {}
}

function init() {
  const orderRef = getOrderRefFromUrl();
  const snapshot = loadSnapshot(orderRef) || { orderRef, items: [] };

  const sub = $("#thanksSub");
  if (sub) sub.textContent = "We appreciate your trust. Tracking will hit your inbox as soon as it ships.";

  renderMeta($("#orderMeta"), { orderRef, email: snapshot?.email || "", createdAt: snapshot?.createdAt });
  renderSummary($("#orderSummary"), snapshot);
  handlePendingUpload(orderRef, snapshot?.email || "");
  pushPurchaseEvent(snapshot);
}

(document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init));
