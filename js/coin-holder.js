const coinHolderPricing = {
  oak: 99.99,
  cedar: 99.99,
  walnut: 114.99,
};

const woodSelect = document.getElementById("wood-select");
const priceDisplay = document.getElementById("price-display");

function updatePrice() {
  const wood = woodSelect.value;
  const price = coinHolderPricing[wood];
  priceDisplay.textContent = `$${price.toFixed(2)}`;
}

// Initialize and listen for changes
woodSelect.addEventListener("change", updatePrice);
updatePrice();
