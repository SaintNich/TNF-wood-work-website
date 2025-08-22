const CART_KEY = "tnf_cart_v1";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("tnf:cart-updated", { detail: { cart } }));
}

export function addToCart(item) {
  const cart = getCart();
  const idx = cart.findIndex(
    (c) => c.productId === item.productId && JSON.stringify(c.options) === JSON.stringify(item.options)
  );
  if (idx > -1) cart[idx].qty += item.qty || 1;
  else cart.push({ ...item, id: crypto.randomUUID(), qty: item.qty || 1 });
  saveCart(cart);
}

export function updateQty(lineId, qty) {
  const cart = getCart();
  const i = cart.findIndex((c) => c.id === lineId);
  if (i === -1) return;
  const q = Math.max(0, parseInt(qty || 0, 10));
  if (q <= 0) {
    cart.splice(i, 1);
  } else {
    cart[i].qty = q;
  }
  saveCart(cart);
}

export function removeFromCart(lineId) {
  const cart = getCart().filter((c) => c.id !== lineId);
  saveCart(cart);
}

export function getCartCount() {
  return getCart().reduce((n, i) => n + (i.qty || 1), 0);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function subtotalCents() {
  return getCart().reduce((s, i) => s + (i.priceCents * (i.qty || 1)), 0);
}
