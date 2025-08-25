import { addToCart } from "/js/cart.js";
import { ensureOrderRef, getFileFromInput, getLogoUrlFromTextField, savePendingFile } from "/js/upload.js";

const S = {
  addBtn: "#addToCartBtn",
  noVariation: "#price",
  wood: "#wood-select",
  size: "#size-select",
  flag: "#flag-style",
  phrase: "#phrase-select",
  engraving: "#custom-type",
  engravingText: "#custom-details, #engraving-text",
  logoInput: "#engraving-file",
};

const fmtSelPrice = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return 0;
  const optPrice = el.selectedOptions?.[0]?.getAttribute?.("data-price");
  const elPrice = el.getAttribute?.("data-price");
  const p = optPrice ?? elPrice;
  return p ? parseInt(p, 10) : 0;
};

const getOversizeFee = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return 0;
  const opt = el.selectedOptions?.[0];
  const fee = opt?.getAttribute?.("data-oversize-fee");
  return fee ? parseInt(fee, 10) : 0;
};

const getVal = (sel) => document.querySelector(sel)?.value || "";

function getConfig() {
  const el = document.getElementById("productCfg");
  return {
    id: el?.dataset.id || "unknown",
    title: el?.dataset.title || "Product",
    image: el?.dataset.image?.startsWith("/") ? el.dataset.image : `/${(el?.dataset.image || "").replace(/^\/+/, "")}`,
    weightLb: Number(el?.dataset.weightLb) || 0,
  };
}

function getSelectedOptions() {
  const wood = getVal(S.wood) ?? 0;
  const size = getVal(S.size) ?? 0;
  const flag = getVal(S.flag) ?? 0;
  const phrase = getVal(S.phrase) ?? 0;

  const engravingTextRaw = document.querySelector(S.engravingText)?.value?.trim() || "";
  // If there is no customization selector but the user entered engraving text, treat as customization
  let customization = getVal(S.engraving) || (engravingTextRaw ? "engraving" : "none");
  const engravingText = customization !== "none" ? engravingTextRaw : "";

  return { wood, size, flag, phrase, customization, engravingText };
}

function optionsSummary(o) {
  const parts = [o.wood, o.size, o.flag, o.phrase];
  if (o.customization !== "none" && o.engravingText) parts.push(`Engraving: "${o.engravingText}"`);
  else if (o.customization !== "none") parts.push("Engraving");
  return parts.filter(Boolean).join(" • ");
}

function hasAnyOptions() {
  return [S.wood, S.size, S.flag, S.phrase, S.engraving].some((sel) => document.querySelector(sel));
}

function computeLineItemPriceCents(opts) {
  const base = fmtSelPrice(S.noVariation);
  if (!hasAnyOptions()) {
    if (!Number.isFinite(base) || base <= 0) {
      console.warn("Base price missing or invalid on #price. Set data-price in cents (e.g. 10999).", { base, opts });
    }
    return base;
  }

  const wood = fmtSelPrice(S.wood);
  const size = fmtSelPrice(S.size);
  const flag = fmtSelPrice(S.flag);
  const phrase = fmtSelPrice(S.phrase);
  const engr = fmtSelPrice(S.engraving);

  const total = Number(base) + Number(wood) + Number(size) + Number(flag) + Number(phrase) + Number(engr);

  if (!Number.isFinite(total) || total <= 0) {
    console.warn("Price fell back to 0 - check your option values or data-price attributes.", {
      opts,
      base,
      wood,
      size,
      flag,
      phrase,
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
  const oversizeFeeCents = getOversizeFee(S.size)

  addToCart({
    productId: cfg.id,
    title: cfg.title,
    image: cfg.image,
    weightLb: cfg.weightLb,
    oversizeFeeCents,
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
  (window.tnf?.openMiniCart || (() => { window.location.href = "/cart"; }))();
}

// ----- Price display helpers -----
const centsToUSD = (cents) => {
  const n = Number(cents) || 0;
  return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
};

function renderDisplayPrice() {
  const el = document.querySelector("#price");
  if (!el) return;
  const opts = getSelectedOptions();
  const cents = hasAnyOptions() ? computeLineItemPriceCents(opts) : fmtSelPrice("#price");
  el.textContent = centsToUSD(cents);
}

function init() {
  // Initialize the visible price so we never show $0.00
  renderDisplayPrice();

  // If options exist, keep price in sync as the user changes them
  if (hasAnyOptions()) {
    [S.wood, S.size, S.flag, S.phrase, S.engraving]
      .map((sel) => document.querySelector(sel))
      .filter(Boolean)
      .forEach((node) => node.addEventListener("change", renderDisplayPrice));
  }

  const btn = document.querySelector(S.addBtn);
  if (!btn) {
    console.warn("Add to Cart button not found");
    return;
  }
  btn.addEventListener("click", onAdd);
}

document.readyState !== "loading" ? init() : document.addEventListener("DOMContentLoaded", init);
