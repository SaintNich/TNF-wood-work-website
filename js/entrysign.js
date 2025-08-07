const charcuteriePricing = {
  oak: { small: 84.99, medium: 89.99, large: 94.99 },
  cedar: { small: 84.99, medium: 89.99, large: 94.99 },
  walnut: { small: 94.99, medium: 102.49, large: 109.99 },
};

const customizationPrices = {
  none: 0,
  text: 0,
  "logo-simple": 10,
  "logo-complex": 25,
};

const woodSelect = document.getElementById("wood-select");
const sizeSelect = document.getElementById("size-select");
const priceDisplay = document.getElementById("price-display");
const customType = document.getElementById("custom-type");
const customDetails = document.getElementById("custom-details");

customType.addEventListener("change", () => {
  customDetails.style.display = customType.value === "none" ? "none" : "block";
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
