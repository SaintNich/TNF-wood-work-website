import { getCartCount } from "/js/cart.js";

function updateCount() {
  const el = document.getElementById("headerCartCount");
  if (!el) return;
  const n = getCartCount();
  el.textContent = String(n);
  el.classList.toggle("is-zero", n === 0);
}

function initHeaderCart() {
  const link = document.getElementById("headerCartLink");
  if (link) {
    link.addEventListener("click", (e) => {
      // On checkout page, don't open the slideout; let people stay focused
      if (document.body.classList.contains("is-checkout")) return;
      if (window.tnf && typeof window.tnf.openMiniCart === "function") {
        e.preventDefault();
        window.tnf.openMiniCart();
      }
    });
  }
  updateCount();
  window.addEventListener("tnf:cart-updated", updateCount);

  // Reflect a11y state if mini‑cart emits open/close
  window.addEventListener("tnf:minicart-open", () => link?.setAttribute("aria-expanded", "true"));
  window.addEventListener("tnf:minicart-close", () => link?.setAttribute("aria-expanded", "false"));
}

document.readyState !== "loading" ? initHeaderCart() : document.addEventListener("DOMContentLoaded", initHeaderCart);
