// enlarge past-build images
const builds = document.querySelectorAll(".build");
const lightBox = document.querySelector(".lightbox");
const closeBtn = document.querySelector(".close-btn");
const ltBoxContent = document.querySelector(".lightbox-content");
const ltBoxPicture = document.querySelector(".lightbox-picture");
const ltBoxCaption = document.querySelector(".lightbox-caption");
const ltBoxTitle = document.querySelector(".lightbox-title");
const ltBoxPara = document.querySelector(".lightbox-para");

builds.forEach((build, index) => {
  build.addEventListener("click", () => {
    const picture = build.querySelector("picture");
    const captionTitle = build.getAttribute("data-title");
    const captionText = build.getAttribute("data-caption");
    lightBox.style.display = "flex";
    lightBox.style.cursor = "pointer";
    ltBoxContent.style.cursor = "default";
    ltBoxPicture.innerHTML = "";
    ltBoxPicture.appendChild(picture.cloneNode(true));

    if (ltBoxCaption) {
      ltBoxTitle.innerText = captionTitle || "";
      ltBoxPara.innerText = captionText || "";
    }
  });

  build.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      build.click();
    };
  });
});

if (lightBox && closeBtn && ltBoxContent && ltBoxPicture) {
  closeBtn.addEventListener("click", () => {
    lightBox.style.display = "none";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      lightBox.style.display = "none";
    };
  });

  lightBox.addEventListener("click", (e) => {
    if (e.target === lightBox) {
      lightBox.style.display = "none";
    };
  });
};