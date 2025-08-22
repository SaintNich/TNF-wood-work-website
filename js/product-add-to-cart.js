import { addToCart } from "/js/cart.js";
import { ensureOrderRef, getFileFromInput, getLogoUrlFromTextField, savePendingFile } from "/js/upload.js";

const S = {
  addBtn: "#addToCartBtn",
  noVariation: "#price",
  wood: "#wood-select", 
  size: "#size-select",
  flag: "#flag-style", 
  engraving: "#custom-type",
  engravingText: "#custom-details, #engraving-text",
  logoInput: "#engraving-file"
};

const fmtSelPrice = sel => {
  const el = document.querySelector(sel);
  if (!el) return 0;
  const optPrice = el.selectedOptions?.[0]?.getAttribute?.("data-price");
  const elPrice = el.getAttribute?.("data-price");
  const p = optPrice ?? elPrice;
  return p ? parseInt(p, 10) : 0;
}

const getVal = sel => document.querySelector(sel)?.value || '';

function getConfig() {
  const el = document.getElementById('productCfg');
  return {
    id: el?.dataset.id || 'unknown',
    title: el?.dataset.title || 'Product',
    image: el?.dataset.image.startsWith('/') ? el.dataset.image: `/${(el?.dataset.image||'').replace(/^\/+/,'')}`
  };
}

function getSelectedOptions() {
  const wood = getVal(S.wood) ?? 0;
  const size = getVal(S.size) ?? 0;
  const flag = getVal(S.flag) ?? 0;
  const engravingTextRaw = document.querySelector(S.engravingText)?.value?.trim() || "";
  let customization = getVal(S.engraving) || (engravingTextRaw ? "engraving" : "none");
  const engravingText = customization !== "none" ? (getVal(S.engravingText) || "").trim() : "";
  return { wood, size, flag, customization, engravingText };
}

function optionsSummary(o) {
  const parts = [o.wood, o.size, o.flag];
  if (o.customization !== "none" && o.engravingText) parts.push(`Engraving: "${o.engravingText}"`);
  else if (o.customization !== "none") parts.push("Engraving");
  return parts.filter(Boolean).join(" • ");
}

function hasAnyOptions() {
  return [S.wood, S.size, S.engraving].some((sel) => document.querySelector(sel));
}

function computeLineItemPriceCents(opts) {
  const base = fmtSelPrice(S.noVariation);
  if (!hasAnyOptions()) {
    if (!Number.isFinite(base) || base <= 0) {
      console.warn("Base price missing or invalid on #price. Set data-price in cents.", { base, opts });
    }
    return base;
  }
  const wood = fmtSelPrice(S.wood);
  const size = fmtSelPrice(S.size);
  const engr = fmtSelPrice(S.engraving);
  const total = Number(base) + Number(wood) + Number(size) + Number(engr);
  if (!Number.isFinite(total) || total <= 0) {
    console.warn("Price fell back to 0 - check your option values or data-price attributes.", {
      opts,
      base,
      wood,
      size,
      engr,
    });
  }
  return total;
}

function onAdd(e) {
  e.preventDefault();
  const cfg = getConfig();
  const opts = getSelectedOptions();
  const orderRef = ensureOrderRef();
  const file = getFileFromInput(S.logoInput);
  if (file) { savePendingFile(file, orderRef).catch(console.warn); }
  
  const priceCents = computeLineItemPriceCents(opts, cfg);

  addToCart({
    productId: cfg.id,
    title: cfg.title,
    image: cfg.image,
    options: { 
      ...opts,
      orderRef,
      filePending: !!file
    },
    optionsLabel: optionsSummary(opts),
    priceCents,
    qty: 1,
  });

  // GA4: add_to_cart (optional)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "add_to_cart",
    ecommerce: {
      currency: "USD",
      value: priceCents / 100,
      items: [
        {
          item_id: cfg.id,
          item_name: cfg.title,
          item_variant: optionsSummary(opts),
          price: priceCents / 100,
          quantity: 1,
        },
      ],
    },
  });

  // Open mini-cart if available; fallback to /cart
  (
    window.tnf?.openMiniCart ||
    (() => {
      window.location.href = "/cart";
    })
  )();
}

function init() {
  const btn = document.querySelector(S.addBtn);
  if (!btn) {
    console.warn("Add to Cart button not found");
    return;
  }
  btn.addEventListener("click", onAdd);
}

document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
