/* Thumbnail gallery to main image swap */
function swapImage(img) {
  document.getElementById("main-product-image").src = img.src;
  document.querySelectorAll(".thumbnail-gallery img").forEach((el) => el.classList.remove("selected"));
  img.classList.add("selected");
}

const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

navToggle.addEventListener("click", () => {
  navMenu.classList.toggle("open");
});

/* All products filters */
const items = [...document.querySelectorAll(".product-grid .product-card-link")];
const groups = { cat: "all", theme: "all" };

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button.filter");
  if (!btn) return;

  const group = btn.dataset.group;
  const value = btn.dataset.value;

  document
    .querySelectorAll(`.filter[data-group="${group}"]`)
    .forEach((b) => b.classList.toggle("is-active", b === btn));
  groups[group] = value;

  items.forEach((item) => {
    const card = item.querySelector(".product-card");
    const cat = card.dataset.cat;
    const theme = card.dataset.theme;
    const matchCat = groups.cat === "all" || cat === groups.cat;
    const matchTheme = groups.theme === "all" || theme === groups.theme;
    item.hidden = !(matchCat && matchTheme); // hide the <a>, not the <article>
  });
});
