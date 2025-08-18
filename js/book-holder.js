const bookHolderPricing = {
  oak: 49.99,
  cedar: 49.99,
  walnut: 54.99,
};

const woodSelect = document.getElementById("wood-select");
const priceDisplay = document.getElementById("price-display");

function updatePrice() {
  const wood = woodSelect.value;
  const price = bookHolderPricing[wood];
  priceDisplay.textContent = `$${price.toFixed(2)}`;
}

// Initialize and listen for changes
woodSelect.addEventListener("change", updatePrice);
updatePrice();
