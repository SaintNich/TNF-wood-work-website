// ../js/mini-cart.js
import { getCart, updateQty, removeFromCart, subtotalCents } from "/js/cart.js";

// Simple money util
const fmtUSD = (cents) => (Number(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// --- CHANGE THIS if your default OG image lives elsewhere ---
const DEFAULT_IMG = "/images/og-default.jpg"; // e.g. '/img/og-default.jpg'

// Globals + focus management
const els = {
  overlay: document.getElementById("miniCartOverlay"),
  panel: document.getElementById("miniCart"),
  items: document.getElementById("miniCartItems"),
  subtotal: document.getElementById("miniCartSubtotal"),
  closeBtn: null,
  checkoutBtn: null,
  empty: document.getElementById("miniCartEmpty"),
  actions: document.querySelector(".mini-cart-actions"),
};
let lastFocused = null;

function trapFocus(e) {
  if (e.key !== "Tab") return;
  const focusables = els.panel.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openMiniCart() {
  lastFocused = document.activeElement;
  document.body.classList.add("no-scroll");
  els.overlay.hidden = false;
  els.panel.hidden = false;
  requestAnimationFrame(() => {
    els.overlay.classList.add("active");
    els.panel.classList.add("open");
  });
  els.panel.addEventListener("keydown", trapFocus);
  (els.closeBtn || els.panel.querySelector(".mini-cart-close"))?.focus();
  // GA4: cart_view
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "cart_view" });
  window.dispatchEvent(new CustomEvent('tnf:minicart-open'));
}

function closeMiniCart() {
  els.overlay.classList.remove("active");
  els.panel.classList.remove("open");
  document.body.classList.remove("no-scroll");
  els.panel.removeEventListener("keydown", trapFocus);
  setTimeout(() => {
    els.overlay.hidden = true;
    els.panel.hidden = true;
  }, 200);
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  window.dispatchEvent(new CustomEvent('tnf:minicart-close'));
}

function normalizeImgPath(p) {
  if (!p) return DEFAULT_IMG;
  if (/^https?:\/\//.test(p) || p.startsWith("/")) return p;
  return "/" + p.replace(/^(\.\.\/|\.\/)+/, '').replace(/^\//,'');
}

function render() {
  const cart = getCart();
  const hasItems = cart.length > 0;
  els.empty.hidden = hasItems;
  els.items.hidden = !hasItems;
  els.actions.hidden = !hasItems;
  els.items.innerHTML = "";
  if (!hasItems) {
    els.subtotal.textContent = fmtUSD(0);
    return;
  }
  const frag = document.createDocumentFragment();
  cart.forEach((item) => {
    const li = document.createElement("li");
    li.className = "mini-cart-item";
    li.dataset.id = item.id;

    // Safe image + price handling
    const src = normalizeImgPath(item.image);
    const lineCents = (Number(item.priceCents) || 0) * (item.qty || 1);
    const hasEngr = item.options?.engravingText;
    const hasLogo = !!item.options?.uploadUrl;

    li.innerHTML = `
      <img src="${src}" alt="${item.title}">
      <div>
        <div class="title">${item.title}</div>
        <div class="options">${item.optionsLabel || ""}</div>
        ${item.options?.filePending ? `<div class="options">Logo: attached (will upload at checkout)</div>` : ''}
        ${hasEngr ? `<div class="options">Engraving: "${String(item.options.engravingText).slice(0,60)}"</div>` : ''}
        ${hasLogo ? `<div class="options">Logo: <a href="${item.options.uploadUrl}" target="_blank" rel="noopener">view file</a></div>` : ''}
        <div class="row">
          <div class="qty" aria-label="Quantity controls">
            <button type="button" data-act="dec" aria-label="Decrease quantity">−</button>
            <input type="text" inputmode="numeric" pattern="[0-9]*" value="${item.qty || 1}" aria-label="Quantity">
            <button type="button" data-act="inc" aria-label="Increase quantity">+</button>
            <button type="button" class="remove" data-act="remove" aria-label="Remove item">Remove</button>
          </div>
          <div class="price">${fmtUSD(lineCents)}</div>
        </div>
      </div>`;
    frag.appendChild(li);
  });
  els.items.appendChild(frag);
  els.subtotal.textContent = fmtUSD(subtotalCents());
}

function onItemsClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const li = btn.closest(".mini-cart-item");
  if (!li) return;
  const id = li.dataset.id;
  if (!id) return;
  const input = li.querySelector("input");

  if (btn.dataset.act === "remove") {
    removeFromCart(id);
  } else if (btn.dataset.act === "inc") {
    const q = Math.max(1, parseInt(input.value || "1", 10) + 1);
    updateQty(id, q);
  } else if (btn.dataset.act === "dec") {
    const q = Math.max(0, parseInt(input.value || "1", 10) - 1);
    updateQty(id, q);
  }
}

function onItemsInput(e) {
  const input = e.target.closest("input");
  if (!input) return;
  const li = input.closest(".mini-cart-item");
  if (!li) return;
  const id = li.dataset.id;
  if (!id) return;
  const val = parseInt(input.value.replace(/[^0-9]/g, "") || "0", 10);
  updateQty(id, val);
}

function wire() {
  els.closeBtn = document.querySelector(".mini-cart-close");
  els.checkoutBtn = document.getElementById("miniCartCheckoutBtn");
  els.overlay.addEventListener("click", closeMiniCart);
  els.closeBtn.addEventListener("click", closeMiniCart);
  els.items.addEventListener("click", onItemsClick);
  els.items.addEventListener("input", onItemsInput);

  // Re-render on any cart change
  window.addEventListener("tnf:cart-updated", render);

  // If someone clicks Proceed to Checkout, GA4 begin_checkout
  els.checkoutBtn?.addEventListener("click", () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "begin_checkout" });
  });

  render();
}

document.readyState !== "loading" ? wire() : document.addEventListener("DOMContentLoaded", wire);

// Public API for other scripts (e.g., product-add-to-cart.js)
window.tnf = window.tnf || {};
window.tnf.openMiniCart = openMiniCart;
window.tnf.closeMiniCart = closeMiniCart;
