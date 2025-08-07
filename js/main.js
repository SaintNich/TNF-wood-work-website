function swapImage(img) {
  document.getElementById("main-product-image").src = img.src;
  document
    .querySelectorAll(".thumbnail-gallery img")
    .forEach((el) => el.classList.remove("selected"));
  img.classList.add("selected");
}

const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
})