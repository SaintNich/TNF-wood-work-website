/* Thumbnail gallery to main image swap */
document.addEventListener('DOMContentLoaded', () => {
  const pic = document.getElementById('productPicture');
  const img = document.getElementById('main-product-image');
  const gallery = document.querySelector('.thumbnail-gallery');
  if (!pic || !img || !gallery) return;

  const sAvif = pic.querySelector('source[type="image/avif"]');
  const sWebp = pic.querySelector('source[type="image/webp"]');

  function setSources(base, alt) {
    if (sAvif) {
      sAvif.setAttribute('srcset',
        `${base}@400.avif 400w, ${base}@800.avif 800w, ${base}@1080.avif 1080w`);
    }
    if (sWebp) {
      sWebp.setAttribute('srcset',
        `${base}@400.webp 400w, ${base}@800.webp 800w, ${base}@1080.webp 1080w`);
    }

    // Update fallback <img>. Set srcset first, then src.
    img.setAttribute('srcset',
      `${base}@400.jpg 400w, ${base}@800.jpg 800w, ${base}@1080.jpg 1080w`);
    img.setAttribute('src', `${base}@800.jpg`);
    if (alt) img.setAttribute('alt', alt);
  }

  gallery.addEventListener('click', (e) => {
    // Look for an element with data-base (button or its child img)
    const el = e.target.closest('[data-base]');
    if (!el || !gallery.contains(el)) return;

    const base = el.dataset.base;
    const alt  = el.dataset.alt || el.querySelector('img')?.alt || '';
    if (!base) return;

    setSources(base, alt);

    // Update selection affordance (applies to the clickable element)
    gallery.querySelectorAll('.thumb').forEach(t => {
      t.classList.remove('selected');
      t.removeAttribute('aria-current');
    });
    const thumb = el.classList.contains('thumb') ? el : el.closest('.thumb');
    if (thumb) {
      thumb.classList.add('selected');
      thumb.setAttribute('aria-current', 'true');
    }
  });
});


/* Nav Toggle to Hamburger for smaller screens */
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

if (navToggle && navMenu) {
  // initialize aria state
  navToggle.setAttribute("aria-expanded", "false");

  const setOpen = (open) => {
    navMenu.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navMenu.hidden = !open;
  };

  // open/close on button click
  navToggle.addEventListener("click", () => {
    setOpen(!navMenu.classList.contains("open"));
  });

  // close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // close when a menu link is clicked (good mobile UX)
  navMenu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
}

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

// Customization
const customType = document.getElementById("custom-type");
const customDetails = document.getElementById("custom-details");

customType.addEventListener("change", () => {
  customDetails.style.display = customType.value === "none" ? "none" : "flex";
});

// aria-invalid if field fails
const contactForm = document.querySelector('form[action="/thanks-contact.html"]');
const statusEl = document.getElementById('contactStatus');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    let ok = true;
    const name = contactForm.querySelector('#name');
    const email = contactForm.querySelector('#email');
    const message = contactForm.querySelector('#message');

    // reset
    [name, email, message].forEach(f => f && f.removeAttribute('aria-invalid'));
    statusEl.textContent = '';

    if (!name.value.trim()) { name.setAttribute('aria-invalid','true'); ok = false; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) { email.setAttribute('aria-invalid','true'); ok = false; }
    if (!message.value.trim()) { message.setAttribute('aria-invalid','true'); ok = false; }

    if (!ok) {
      e.preventDefault();
      statusEl.textContent = 'Please correct the highlighted fields.';
      // Move focus to first invalid field
      (contactForm.querySelector('[aria-invalid="true"]') || contactForm).focus();
    }
  });
}

