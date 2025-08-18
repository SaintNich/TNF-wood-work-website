const charcuteriePricing = {
  oak: { small: 59.99, medium: 64.99, large: 69.99 },
  cedar: { small: 59.99, medium: 64.99, large: 69.99 },
  walnut: { small: 64.99, medium: 69.99, large: 74.99 },
};

const customizationPrices = {
  none: 0,
  text: 10,
  "logo-simple": 15,
  "logo-complex": 25,
};

const woodSelect = document.getElementById("wood-select");
const sizeSelect = document.getElementById("size-select");
const priceDisplay = document.getElementById("price-display");
const customType = document.getElementById("custom-type");
const customDetails = document.getElementById("custom-details");

customType.addEventListener("change", () => {
  customDetails.style.display = customType.value === "none" ? "none" : "flex";
});

function updatePrice() {
  const wood = woodSelect.value;
  const size = sizeSelect.value;
  const price = charcuteriePricing[wood][size];
  const customPrice = customizationPrices[customType.value];
  const totalPrice = price + customPrice;
  priceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
}

// Initialize and listen for changes
woodSelect.addEventListener("change", updatePrice);
sizeSelect.addEventListener("change", updatePrice);
customType.addEventListener("change", updatePrice);
customDetails.addEventListener("change", updatePrice);
updatePrice();

// Square payment integration
(async () => {
  // Read public config from meta tags (safe)
  const appId = document.querySelector('meta[name="square-app-id"]').content;
  const locationId = document.querySelector('meta[name="square-location-id"]').content;

  // 1) Init SDK + mount the card
  const payments = window.Square.payments(appId, locationId);
  const card = await payments.card();
  await card.attach("#card-container");

  // Helpers to read your current product + price from the page
  const productId = "charcuterie-board"; // change per page
  function getDisplayedPrice() {
    const el = document.getElementById("price-display");
    if (!el) return 0;
    const txt = el.textContent || el.innerText || "";
    const match = txt.replace(/[^\d.]/g, ""); // strip $ and text
    return Number(match || 0);
  }
  function getSelectedOptions() {
    // read your size/wood/engraving selects or radios here
    // Example (adapt to your markup IDs):
    const size = document.querySelector("#size")?.value || "";
    const wood = document.querySelector("#wood")?.value || "";
    const engraving = document.querySelector("#engraving")?.value || "";
    return { size, wood, engraving };
  }

  // 2) Handle Buy button
  document.getElementById("buyBtn").addEventListener("click", async () => {
    // Tokenize the card
    const result = await card.tokenize();
    if (result.status !== "OK") {
      alert("Payment error — please check your card details.");
      return;
    }

    const payload = {
      sourceId: result.token,
      productId,
      options: getSelectedOptions(),
      amount: getDisplayedPrice(), // dollars (we’ll verify server-side)
      buyerEmail: document.getElementById("buyer-email")?.value || "",
    };

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

//    if (data.ok) {
      // Optional GA4 event if you’ve installed GA4 sitewide
//      window.gtag?.("event", "purchase", {
//        value: payload.amount,
//        currency: "USD",
//        items: [{ item_name: productId }],
//      });
//      window.location.href = "/thanks.html";
//    } else {
//      alert(data.error || "Something went sideways during payment.");
//    }
  });
})();
