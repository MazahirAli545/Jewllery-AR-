// Lightweight UI enhancements for the LuxAura marketplace shell.
// Keeps all behaviour progressive and non-breaking for the AR try-on core.

(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Smooth scroll for navbar links (Home, Shops, Try-On, etc.)
  document.querySelectorAll('a.nav-link[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({
        top: target.offsetTop - 72,
        behavior: "smooth",
      });
    });
  });

  // Simple client-side filter stub for the marketplace section.
  // This is wired to data attributes so a future backend can plug in real data.
  const pillRow = document.querySelector(".lux-filter-pill-row");
  const shopGrid = document.querySelector(".lux-shop-grid");
  if (pillRow && shopGrid) {
    pillRow.addEventListener("click", function (e) {
      const pill = e.target.closest(".lux-filter-pill");
      if (!pill) return;

      const filter = pill.textContent.trim().toLowerCase();

      pillRow.querySelectorAll(".lux-filter-pill").forEach(function (el) {
        el.classList.toggle("active", el === pill);
      });

      shopGrid.querySelectorAll("[data-categories]").forEach(function (card) {
        const categories = (card.getAttribute("data-categories") || "")
          .toLowerCase()
          .split(",");
        const isMatch =
          filter === "all" || categories.some((c) => c.indexOf(filter) >= 0);
        card.classList.toggle("d-none", !isMatch);
      });
    });
  }

  // Placeholder action for shop CTA buttons – this ensures a clear UX
  // while backend / routing is still being wired by the product team.
  document.querySelectorAll("[data-shop-name]").forEach(function (button) {
    button.addEventListener("click", function () {
      const name = this.getAttribute("data-shop-name");
      // Non-blocking toast-style message
      if (!name) return;
      const msgId = "lux-toast";
      let toast = document.getElementById(msgId);
      if (!toast) {
        toast = document.createElement("div");
        toast.id = msgId;
        toast.style.position = "fixed";
        toast.style.right = "16px";
        toast.style.bottom = "16px";
        toast.style.zIndex = "2000";
        toast.style.padding = "12px 16px";
        toast.style.borderRadius = "999px";
        toast.style.background =
          "linear-gradient(120deg, rgba(184,134,11,0.96), rgba(255,216,139,0.96))";
        toast.style.color = "#201215";
        toast.style.fontSize = "0.85rem";
        toast.style.boxShadow = "0 10px 28px rgba(0,0,0,0.75)";
        document.body.appendChild(toast);
      }
      toast.textContent =
        name +
        " – storefront and AR catalogue wiring is ready. Connect this CTA to your shop route.";
      toast.style.opacity = "1";
      setTimeout(function () {
        toast.style.transition = "opacity 0.4s ease";
        toast.style.opacity = "0";
      }, 2600);
    });
  });

  // Fallback image handling: ensure broken thumbnails use a soft placeholder
  // that matches the LuxAura jewellery theme, instead of showing a broken icon.
  var FALLBACK_SVG =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>" +
    "<defs>" +
    "<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0%' stop-color='%232b1826'/>" +
    "<stop offset='50%' stop-color='%23cfa676'/>" +
    "<stop offset='100%' stop-color='%23050208'/>" +
    "</linearGradient>" +
    "</defs>" +
    "<rect width='320' height='200' fill='url(%23g)' rx='20' ry='20'/>" +
    "<text x='50%25' y='52%25' text-anchor='middle' " +
    "font-family='Segoe UI, system-ui, sans-serif' font-size='16' " +
    "fill='%23fdf3dd' letter-spacing='2'>" +
    "LUXAURA JEWELS" +
    "</text>" +
    "</svg>";

  function applyFallback(img) {
    if (!img || img.getAttribute("data-fallback-applied") === "1") return;
    img.setAttribute("data-fallback-applied", "1");
    img.src = img.getAttribute("data-fallback-src") || FALLBACK_SVG;
    img.classList.add("lux-img-fallback");
  }

  function wireFallbacks() {
    var imgs = document.querySelectorAll("img[data-fallback='jewel']");
    imgs.forEach(function (img) {
      img.addEventListener("error", function () {
        applyFallback(img);
      });
      // If the image is already in a broken state (e.g. cached 404), fix it.
      if (img.complete && img.naturalWidth === 0) {
        applyFallback(img);
      }
    });
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    wireFallbacks();
  } else {
    document.addEventListener("DOMContentLoaded", wireFallbacks);
  }
})();
