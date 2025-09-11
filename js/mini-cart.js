// ../js/mini-cart.js
import { getCart, updateQty, removeFromCart, subtotalCents } from "/js/cart.js";

// Simple money util
const fmtUSD = (cents) =>
  (Number(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// --- CHANGE THIS if your default OG image lives elsewhere ---
const DEFAULT_IMG = "/images/og-default.jpg"; // e.g. '/img/og-default.jpg'

// Globals + focus management
const els = {
  overlay: document.getElementById("miniCartOverlay"),
  panel: document.getElementById("miniCart"),
  items: document.getElementById("miniCartItems"),
  subtotal: document.getElementById("miniCartSubtotal"),
  closeBtn: null, // assign in wire()
  checkoutBtn: null,
  empty: document.getElementById("miniCartEmpty"),
  actions: document.querySelector(".mini-cart-actions"),
};
let lastFocused = null;

// Utils
const focusableSel = [
  'a[href]', 'area[href]', 'button:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', 'details>summary:first-of-type',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function getFocusable(root) {
  return [...root.querySelectorAll(focusableSel)]
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

function trapFocus(e) {
  if (e.key !== "Tab") return;
  const nodes = getFocusable(els.panel);
  if (!nodes.length) return;
  const first = nodes[0], last = nodes[nodes.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    last.focus(); e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus(); e.preventDefault();
  }
}

function setInert(inert) {
  // Hide the background from AT and prevent scroll
  document.body.classList.toggle("no-scroll", inert);
  document.querySelector("main")?.setAttribute("aria-hidden", inert ? "true" : "false");
  document.querySelector("header")?.setAttribute("aria-hidden", inert ? "true" : "false");
  document.querySelector("footer")?.setAttribute("aria-hidden", inert ? "true" : "false");
}

function onEsc(e) {
  if (e.key === "Escape") closeMiniCart();
}

function openMiniCart() {
  if (!els.overlay || !els.panel) return;
  lastFocused = document.activeElement;

  setInert(true);
  els.overlay.hidden = false;
  els.panel.hidden = false;

  // animate in (optional: add/remove CSS transitions)
  requestAnimationFrame(() => {
    els.overlay.classList.add("active");
    els.panel.classList.add("open");
  });

  els.panel.addEventListener("keydown", trapFocus);
  document.addEventListener("keydown", onEsc);

  (els.closeBtn || els.panel.querySelector(".mini-cart-close"))?.focus();

  // Update header toggle aria-expanded if present
  const headerCartLink = document.getElementById("headerCartLink");
  headerCartLink?.setAttribute("aria-expanded", "true");

  // GA4: cart_view
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "cart_view" });

  window.dispatchEvent(new CustomEvent("tnf:minicart-open"));
}

function closeMiniCart() {
  if (!els.overlay || !els.panel) return;

  els.overlay.classList.remove("active");
  els.panel.classList.remove("open");

  // Hide after CSS transition (keep in sync with your CSS duration)
  setTimeout(() => {
    els.overlay.hidden = true;
    els.panel.hidden = true;
  }, 200);

  els.panel.removeEventListener("keydown", trapFocus);
  document.removeEventListener("keydown", onEsc);
  setInert(false);

  // Update header toggle aria-expanded if present
  const headerCartLink = document.getElementById("headerCartLink");
  headerCartLink?.setAttribute("aria-expanded", "false");

  // restore focus
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();

  window.dispatchEvent(new CustomEvent("tnf:minicart-close"));
}

function normalizeImgPath(p) {
  if (!p) return DEFAULT_IMG;
  if (/^https?:\/\//.test(p) || p.startsWith("/")) return p;
  return "/" + p.replace(/^(\.\.\/|\.\/)+/, "").replace(/^\//, "");
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
      <img src="${src}" alt="${item.title}" loading="lazy" decoding="async" width="64" height="64">
      <div>
        <div class="title">${item.title}</div>
        <div class="options">${item.optionsLabel || ""}</div>
        ${item.options?.filePending ? `<div class="options">Logo: attached (will upload at checkout)</div>` : ""}
        ${hasEngr ? `<div class="options">Engraving: "${String(item.options.engravingText).slice(0,60)}"</div>` : ""}
        ${hasLogo ? `<div class="options">Logo: <a href="${item.options.uploadUrl}" target="_blank" rel="noopener">view file</a></div>` : ""}
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
  // Assign dynamic refs now that DOM is ready
  els.closeBtn = document.querySelector(".mini-cart-close");
  els.checkoutBtn = document.getElementById("miniCartCheckoutBtn");

  els.overlay?.addEventListener("click", closeMiniCart);
  els.closeBtn?.addEventListener("click", closeMiniCart);
  els.items?.addEventListener("click", onItemsClick);
  els.items?.addEventListener("input", onItemsInput);

  // Re-render on any cart change
  window.addEventListener("tnf:cart-updated", render);

  // If someone clicks Proceed to Checkout, GA4 begin_checkout
  els.checkoutBtn?.addEventListener("click", () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "begin_checkout" });
  });

  render();
}

document.readyState !== "loading"
  ? wire()
  : document.addEventListener("DOMContentLoaded", wire);

// Public API for other scripts (e.g., product-add-to-cart.js)
window.tnf = window.tnf || {};
window.tnf.openMiniCart = openMiniCart;
window.tnf.closeMiniCart = closeMiniCart;
