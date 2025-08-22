import { getCart, updateQty, removeFromCart, subtotalCents } from "/js/cart.js";

const fmt = (c) => (Number(c) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const els = {
  list: document.getElementById("cartItems"),
  subtotal: document.getElementById("cartSubtotal"),
  checkout: document.getElementById("cartCheckoutBtn"),
  empty: document.getElementById("cartEmpty"),
  section: document.getElementById("cartSection"),
};

function normalizeImgPath(p) {
  if (!p) return "/images/og-default.jpg";
  if (/^https?:\/\//.test(p) || p.startsWith("/")) return p;
  return "/" + p.replace(/^\/+/, "");
}

function render() {
  const cart = getCart();
  els.list.innerHTML = "";

  const hasItems = cart.length > 0;
  els.empty.hidden = hasItems;
  els.section.hidden = !hasItems;
  els.checkout?.classList.toggle("disabled", !hasItems);

  if (!hasItems) {
    els.subtotal.textContent = fmt(0);
    return;
  }

  const frag = document.createDocumentFragment();

  cart.forEach((item) => {
    const li = document.createElement("li");
    li.className = "mini-cart-item";
    li.dataset.id = item.id;

    const src = normalizeImgPath(item.image);
    const lineCents = Number(item.priceCents) * (item.qty || 1);

    li.innerHTML = `
      <img src="${src}" alt="${item.title}">
      <div>
        <div class="title">${item.title}</div>
        <div class="options">${item.optionsLabel || ""}</div>
        ${
          item.options?.engravingText
            ? `<div class="options">Engraving: "${String(item.options.engravingText).slice(0, 60)}"</div>`
            : ""
        }
        <div class="row">
          <div class="qty" aria-label="Quantity controls">
            <button type="button" data-act="dec" aria-label="Decrease quantity">−</button>
            <input type="text" inputmode="numeric" pattern="[0-9]*" value="${item.qty || 1}" aria-label="Quantity">
            <button type="button" data-act="inc" aria-label="Increase quantity">+</button>
            <button type="button" class="remove" data-act="remove" aria-label="Remove item">Remove</button>
          </div>
          <div class="price">${fmt(lineCents)}</div>
        </div>
      </div>
    `;

    frag.appendChild(li);
  });

  els.list.appendChild(frag);
  els.subtotal.textContent = fmt(subtotalCents());
}

function onListClick(e) {
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

function onListInput(e) {
  const input = e.target.closest("input");
  if (!input) return;
  const li = input.closest(".mini-cart-item") || input.closest("li");
  if (!li) return;
  const id = li.dataset.id;
  if (!id) return;
  const val = parseInt((input.value || "").replace(/[^0-9]/g, "") || "0", 10);
  updateQty(id, val);
}

function init() {
  if (!els.list) {
    console.warn("TNF cart-page: #cartItems not found");
    return;
  }
  els.list.addEventListener("click", onListClick);
  els.list.addEventListener("input", onListInput);
  window.addEventListener("tnf:cart-updated", render);
  render();

  // GA4 cart_view
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "cart_view" });

  // GA4 begin_checkout when clicking Proceed to Checkout
  els.checkout?.addEventListener("click", () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "begin_checkout" });
  });
}

document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
