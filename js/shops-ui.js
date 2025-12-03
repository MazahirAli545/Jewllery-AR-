// Reasoning: Implements SPA-style routing for /shops/:shopId and deep-linked products,
// renders shop headers and product grids, and bridges product AR TRY-ON CTAs into the
// existing try-on studio without breaking the legacy marketplace or AR flows.

(function (window, document) {
  if (!window || !document) return;

  const LuxShopsApi = window.LuxShopsApi || {};
  const LuxShopsData = window.LuxShopsData || {};
  const shops = LuxShopsData.shops || [];

  function findShopByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;
    const target = String(idOrSlug).toLowerCase();
    return (
      shops.find(
        (s) =>
          s.id.toLowerCase() === target ||
          (s.slug || "").toLowerCase() === target
      ) || null
    );
  }

  function findShopByDisplayName(name) {
    if (!name) return null;
    const target = String(name).toLowerCase();
    return (
      shops.find((s) => (s.displayName || "").toLowerCase() === target) || null
    );
  }

  function getContainers() {
    return {
      hero: document.getElementById("hero"),
      marketplace: document.getElementById("marketplace"),
      tryon: document.getElementById("tryon"),
      testimonials: document.getElementById("testimonials"),
      dashboard: document.getElementById("dashboard"),
      shopPage: document.getElementById("shop-page"),
      shopRoot: document.getElementById("shop-page-root"),
      authLogin: document.getElementById("auth-login"),
      authRegister: document.getElementById("auth-register"),
    };
  }

  function showSectionsForHome() {
    const c = getContainers();
    if (!c.hero) return;
    document.body.setAttribute("data-lux-view", "home");
    [c.hero, c.marketplace, c.testimonials, c.dashboard].forEach(function (el) {
      if (el) el.classList.remove("d-none");
    });
    if (c.tryon) c.tryon.classList.add("d-none");
    if (c.shopPage) c.shopPage.classList.add("d-none");
    if (c.authLogin) c.authLogin.classList.add("d-none");
    if (c.authRegister) c.authRegister.classList.add("d-none");
  }

  function showSectionsForShop() {
    const c = getContainers();
    document.body.setAttribute("data-lux-view", "shop");
    [c.hero, c.marketplace, c.testimonials, c.dashboard].forEach(function (el) {
      if (el) el.classList.add("d-none");
    });
    if (c.tryon) c.tryon.classList.add("d-none");
    if (c.shopPage) c.shopPage.classList.remove("d-none");
    if (c.authLogin) c.authLogin.classList.add("d-none");
    if (c.authRegister) c.authRegister.classList.add("d-none");
  }

  function showSectionsForTryon() {
    const c = getContainers();
    document.body.setAttribute("data-lux-view", "tryon");
    [c.hero, c.marketplace, c.testimonials, c.dashboard, c.shopPage].forEach(
      function (el) {
        if (el) el.classList.add("d-none");
      }
    );
    if (c.authLogin) c.authLogin.classList.add("d-none");
    if (c.authRegister) c.authRegister.classList.add("d-none");
    if (c.tryon) c.tryon.classList.remove("d-none");
  }

  function showSectionsForAuth(view) {
    const c = getContainers();
    document.body.setAttribute(
      "data-lux-view",
      view === "register" ? "register" : "login"
    );
    [
      c.hero,
      c.marketplace,
      c.testimonials,
      c.dashboard,
      c.shopPage,
      c.tryon,
    ].forEach(function (el) {
      if (el) el.classList.add("d-none");
    });
    if (view === "login") {
      if (c.authLogin) c.authLogin.classList.remove("d-none");
      if (c.authRegister) c.authRegister.classList.add("d-none");
    } else if (view === "register") {
      if (c.authRegister) c.authRegister.classList.remove("d-none");
      if (c.authLogin) c.authLogin.classList.add("d-none");
    }
  }

  function parseLocation() {
    const path = window.location.pathname || "/";
    const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);

    if (parts[0] === "shops" && parts[1]) {
      const shopId = decodeURIComponent(parts[1]);
      if (parts[2] === "products" && parts[3]) {
        return {
          view: "product",
          shopId: shopId,
          productId: decodeURIComponent(parts[3]),
        };
      }
      return { view: "shop", shopId: shopId };
    }

    if (parts[0] === "tryon") {
      return { view: "tryon" };
    }

    if (parts[0] === "login") {
      return { view: "login" };
    }

    if (parts[0] === "register") {
      return { view: "register" };
    }

    return { view: "home" };
  }

  function updateMetaForShop(shop) {
    if (!shop) return;
    const title = shop.displayName + " – LuxAura Jewellery Shop";
    document.title = title;
    const desc =
      shop.shortDescription ||
      "Curated jewellery designs with AR try-on on LuxAura.";

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    if (ogDesc) ogDesc.setAttribute("content", desc);

    // Simple Schema.org Organization markup for the active shop.
    const existing = document.getElementById("lux-shop-schema");
    if (existing && existing.parentNode)
      existing.parentNode.removeChild(existing);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "lux-shop-schema";
    script.textContent = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "JewelryStore",
        name: shop.displayName,
        description: desc,
        telephone: shop.contact && shop.contact.phone,
        email: shop.contact && shop.contact.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: "",
          addressLocality: shop.location || "",
        },
      },
      null,
      2
    );
    document.head.appendChild(script);
  }

  function renderShopHeader(root, shop) {
    const html =
      '<div class="lux-shop-header d-flex flex-column flex-md-row align-items-start mb-4">' +
      '  <div class="lux-shop-header-banner ' +
      (shop.bannerClass || "") +
      '" aria-hidden="true"></div>' +
      '  <div class="lux-shop-header-body ml-md-4 mt-3 mt-md-0">' +
      '    <h1 class="lux-shop-header-title">' +
      shop.displayName +
      "</h1>" +
      '    <p class="lux-shop-header-location">' +
      (shop.location || "") +
      "</p>" +
      '    <p class="lux-shop-header-rating">' +
      "      <span>" +
      (shop.rating || "–") +
      "★</span>" +
      '      <span class="ml-2">' +
      (shop.ratingCount || 0) +
      " reviews</span>" +
      "    </p>" +
      '    <p class="lux-shop-header-copy">' +
      (shop.shortDescription || "") +
      "</p>" +
      "  </div>" +
      "</div>";

    root.insertAdjacentHTML("beforeend", html);
  }

  function renderShopMeta(root, shop, productStats) {
    const statHtml =
      '<div class="lux-shop-meta-grid mb-4">' +
      '  <div class="lux-shop-meta-card">' +
      "    <h3>Designs</h3>" +
      "    <p>" +
      (shop.designCount || productStats.total || 0) +
      " designs</p>" +
      "  </div>" +
      '  <div class="lux-shop-meta-card">' +
      "    <h3>Policies</h3>" +
      "    <p>" +
      (shop.policies && shop.policies.returns
        ? shop.policies.returns
        : "Easy returns and BIS certification on eligible pieces.") +
      "</p>" +
      "  </div>" +
      '  <div class="lux-shop-meta-card">' +
      "    <h3>Shipping</h3>" +
      "    <p>" +
      (shop.shipping && shop.shipping.info
        ? shop.shipping.info
        : "Insured shipping with secure logistics partners.") +
      "</p>" +
      "  </div>" +
      '  <div class="lux-shop-meta-card">' +
      "    <h3>Hours</h3>" +
      "    <p>" +
      (shop.hours && shop.hours.label
        ? shop.hours.label
        : "Open during standard retail hours") +
      "</p>" +
      "  </div>" +
      "</div>";
    root.insertAdjacentHTML("beforeend", statHtml);
  }

  function renderProductGrid(root, productsPage, shop) {
    const page = productsPage || {
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
    };
    const items = page.items || [];

    const controlsHtml =
      '<div class="lux-card lux-shop-grid-controls mb-3">' +
      '  <div class="d-flex flex-wrap justify-content-between align-items-center mb-2">' +
      '    <div class="lux-shop-controls-summary mb-2 mb-md-0">' +
      '      <span class="lux-shop-controls-label">Showing</span>' +
      "      <strong>" +
      page.total +
      "</strong>" +
      '      <span class="lux-shop-controls-label">designs</span>' +
      "    </div>" +
      '    <div class="lux-shop-controls-sort d-flex align-items-center mb-2 mb-md-0">' +
      '      <label class="mr-2 mb-0" for="lux-shop-sort">Sort by</label>' +
      '      <div class="lux-select-wrapper">' +
      '        <select id="lux-shop-sort" class="lux-select">' +
      '          <option value="popular">Popularity</option>' +
      '          <option value="newest">Newest</option>' +
      '          <option value="price-asc">Price: Low to High</option>' +
      '          <option value="price-desc">Price: High to Low</option>' +
      "        </select>" +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      '  <div class="lux-shop-filters d-flex flex-wrap">' +
      '    <div class="lux-select-wrapper mr-2 mb-2">' +
      '      <select id="lux-filter-category" class="lux-select">' +
      '        <option value="">All categories</option>' +
      '        <option value="necklaces">Necklaces</option>' +
      '        <option value="earrings">Earrings</option>' +
      '        <option value="rings">Rings</option>' +
      '        <option value="mangalsutra">Mangalsutra</option>' +
      "      </select>" +
      "    </div>" +
      '    <div class="lux-select-wrapper mr-2 mb-2">' +
      '      <select id="lux-filter-metal" class="lux-select">' +
      '        <option value="">Any metal</option>' +
      '        <option value="gold">Gold</option>' +
      '        <option value="rose gold">Rose Gold</option>' +
      '        <option value="white gold">White Gold</option>' +
      "      </select>" +
      "    </div>" +
      '    <div class="lux-select-wrapper mb-2">' +
      '      <select id="lux-filter-stone" class="lux-select">' +
      '        <option value="">Any stone</option>' +
      '        <option value="diamond">Diamond</option>' +
      '        <option value="emerald">Emerald</option>' +
      '        <option value="polki">Polki</option>' +
      "      </select>" +
      "    </div>" +
      "  </div>" +
      "</div>";

    const gridStart =
      '<div class="lux-shop-products-grid row" id="lux-shop-products-grid">';
    const gridItems = items
      .map(function (p) {
        const badgeHtml = (p.badges || [])
          .map(function (b) {
            return '<span class="lux-product-badge">' + b + "</span>";
          })
          .join("");
        const stockClass =
          p.stockStatus === "in_stock"
            ? "in-stock"
            : p.stockStatus === "low_stock"
            ? "low-stock"
            : "sold-out";
        const stockLabel =
          p.stockStatus === "in_stock"
            ? "In stock"
            : p.stockStatus === "low_stock"
            ? "Only a few left"
            : "Sold out";

        return (
          '<article class="col-sm-6 col-md-4 mb-4">' +
          '  <div class="lux-product-card" data-product-id="' +
          p.id +
          '">' +
          '    <div class="lux-product-thumb-wrapper">' +
          '      <img class="lux-product-thumb" data-fallback="jewel" src="' +
          p.thumbnail +
          '" alt="' +
          (p.title || "Jewellery design") +
          '" loading="lazy" />' +
          '      <div class="lux-product-badges">' +
          badgeHtml +
          "</div>" +
          "    </div>" +
          '    <div class="lux-product-body">' +
          '      <h3 class="lux-product-title">' +
          p.title +
          "</h3>" +
          '      <p class="lux-product-short">' +
          (p.shortDescription || "") +
          "</p>" +
          '      <div class="lux-product-meta d-flex justify-content-between align-items-center">' +
          '        <span class="lux-product-price">' +
          (p.price && p.price.display ? p.price.display : "") +
          "</span>" +
          '        <span class="lux-product-stock ' +
          stockClass +
          '">' +
          stockLabel +
          "</span>" +
          "      </div>" +
          '      <button type="button" class="btn btn-sm lux-btn-ghost mt-2 lux-product-open" data-product-id="' +
          p.id +
          '">View details &amp; AR try-on</button>' +
          "    </div>" +
          "  </div>" +
          "</article>"
        );
      })
      .join("");
    const gridEnd = "</div>";

    const pagination =
      '<div class="lux-shop-pagination d-flex justify-content-center mt-3">' +
      '  <button type="button" class="btn btn-sm lux-btn-ghost mr-2" id="lux-shop-prev" ' +
      (page.page <= 1 ? "disabled" : "") +
      ">Previous</button>" +
      '  <span class="lux-shop-page-indicator">Page ' +
      page.page +
      " of " +
      page.totalPages +
      "</span>" +
      '  <button type="button" class="btn btn-sm lux-btn-ghost ml-2" id="lux-shop-next" ' +
      (page.page >= page.totalPages ? "disabled" : "") +
      ">Next</button>" +
      "</div>";

    root.insertAdjacentHTML(
      "beforeend",
      controlsHtml + gridStart + gridItems + gridEnd + pagination
    );
  }

  function buildProductModal() {
    if (document.getElementById("lux-product-modal")) return;
    const modal = document.createElement("div");
    modal.id = "lux-product-modal";
    modal.className = "lux-product-modal d-none";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML =
      '<div class="lux-product-modal-backdrop"></div>' +
      '<div class="lux-product-modal-dialog" role="document">' +
      '  <button type="button" class="lux-product-modal-close" aria-label="Close product details">&times;</button>' +
      '  <div class="lux-product-modal-content">' +
      '    <div class="lux-product-modal-gallery" id="lux-product-modal-gallery"></div>' +
      '    <div class="lux-product-modal-body" id="lux-product-modal-body"></div>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(modal);

    modal
      .querySelector(".lux-product-modal-close")
      .addEventListener("click", function () {
        closeProductModal();
      });
    modal
      .querySelector(".lux-product-modal-backdrop")
      .addEventListener("click", function () {
        closeProductModal();
      });
  }

  function openProductModal(product, shop) {
    buildProductModal();
    const modal = document.getElementById("lux-product-modal");
    if (!modal) return;
    const gallery = document.getElementById("lux-product-modal-gallery");
    const body = document.getElementById("lux-product-modal-body");
    if (!gallery || !body) return;

    const galleryHtml =
      '<div class="lux-product-modal-main">' +
      '  <img data-fallback="jewel" src="' +
      (product.gallery && product.gallery[0]) +
      '" alt="' +
      (product.title || "Jewellery design") +
      '" loading="lazy" />' +
      "</div>" +
      '<div class="lux-product-modal-thumbs">' +
      (product.gallery || [])
        .map(function (src, idx) {
          return (
            '<button type="button" class="lux-product-thumb-btn" data-index="' +
            idx +
            '">' +
            '<img data-fallback="jewel" src="' +
            src +
            '" alt="' +
            (product.title || "Jewellery view " + (idx + 1)) +
            '" loading="lazy" />' +
            "</button>"
          );
        })
        .join("") +
      "</div>";

    const price =
      product.price && product.price.display ? product.price.display : "";
    const variantOptions = (product.variants || [])
      .map(function (v) {
        return (
          '<option value="' +
          v.id +
          '">' +
          v.metal +
          " • " +
          v.stone +
          " • " +
          v.size +
          "</option>"
        );
      })
      .join("");

    const bodyHtml =
      '<h2 class="lux-product-modal-title">' +
      product.title +
      "</h2>" +
      '<p class="lux-product-modal-sku">SKU: ' +
      (product.sku || "Pending") +
      "</p>" +
      '<p class="lux-product-modal-shop">Sold by ' +
      (shop.displayName || "") +
      "</p>" +
      '<p class="lux-product-modal-price" data-base-amount="' +
      (product.price && product.price.amount ? product.price.amount : 0) +
      '">' +
      price +
      "</p>" +
      '<div class="lux-product-variants">' +
      '  <label for="lux-product-variant">Metal / stone / size</label>' +
      '  <select id="lux-product-variant" class="form-control form-control-sm">' +
      variantOptions +
      "  </select>" +
      "</div>" +
      '<div class="lux-product-attributes">' +
      "  <div><strong>Weight</strong><span>" +
      (product.weight || "—") +
      "</span></div>" +
      "  <div><strong>Purity</strong><span>" +
      (product.purity || "—") +
      "</span></div>" +
      "  <div><strong>Carat</strong><span>" +
      (product.carat || "—") +
      "</span></div>" +
      "  <div><strong>Delivery</strong><span>" +
      (product.deliveryEstimate || "—") +
      "</span></div>" +
      "</div>" +
      '<div class="lux-product-ctas">' +
      '  <button type="button" class="btn lux-btn-primary lux-product-ar-cta">AR TRY-ON</button>' +
      '  <button type="button" class="btn btn-sm lux-btn-ghost">Add to wishlist</button>' +
      '  <button type="button" class="btn btn-sm lux-btn-ghost">Add to cart</button>' +
      '  <button type="button" class="btn btn-sm lux-btn-ghost">Share</button>' +
      "</div>";

    gallery.innerHTML = galleryHtml;
    body.innerHTML = bodyHtml;

    // Structured data for the active product (Schema.org Product).
    const existing = document.getElementById("lux-product-schema");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    const productSchema = document.createElement("script");
    productSchema.type = "application/ld+json";
    productSchema.id = "lux-product-schema";
    productSchema.textContent = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        image: product.gallery || [product.thumbnail],
        sku: product.sku,
        brand: {
          "@type": "Organization",
          name: shop.displayName,
        },
        offers: {
          "@type": "Offer",
          priceCurrency: product.price && product.price.currency,
          price: product.price && product.price.amount,
          availability:
            product.stockStatus === "in_stock"
              ? "https://schema.org/InStock"
              : product.stockStatus === "low_stock"
              ? "https://schema.org/LimitedAvailability"
              : "https://schema.org/OutOfStock",
        },
      },
      null,
      2
    );
    document.head.appendChild(productSchema);

    // Thumb switcher
    gallery.querySelectorAll(".lux-product-thumb-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const idx = parseInt(this.getAttribute("data-index") || "0", 10);
        const src =
          (product.gallery && product.gallery[idx]) || product.gallery[0];
        const main = gallery.querySelector(".lux-product-modal-main img");
        if (main && src) {
          main.setAttribute("src", src);
        }
      });
    });

    // Variant selection – adjust displayed price based on priceDelta
    const variantSelect = body.querySelector("#lux-product-variant");
    if (variantSelect) {
      variantSelect.addEventListener("change", function () {
        const selectedId = this.value;
        const v = (product.variants || []).find(function (vv) {
          return vv.id === selectedId;
        });
        const priceEl = body.querySelector(".lux-product-modal-price");
        if (!priceEl) return;
        const baseAmount =
          product.price && product.price.amount ? product.price.amount : 0;
        const finalAmount = baseAmount + (v ? v.priceDelta || 0 : 0);
        priceEl.textContent =
          (product.price && product.price.currency === "INR"
            ? "₹" + finalAmount.toLocaleString("en-IN")
            : finalAmount.toString()) || priceEl.textContent;
      });
    }

    // AR TRY-ON CTA
    const arCta = body.querySelector(".lux-product-ar-cta");
    if (arCta) {
      arCta.addEventListener("click", function () {
        openProductTryOn(product, shop);
      });
    }

    modal.classList.remove("d-none");
    document.body.classList.add("lux-modal-open");
  }

  function closeProductModal() {
    const modal = document.getElementById("lux-product-modal");
    if (!modal) return;
    modal.classList.add("d-none");
    document.body.classList.remove("lux-modal-open");
  }

  function openProductTryOn(product, shop) {
    // Bridge product metadata into the existing accessory slider as a synthetic item.
    const list = document.querySelector("#jewelry-list ul");
    if (!list || !product) return;

    let li = document.getElementById("lux-product-accessory");
    if (!li) {
      li = document.createElement("li");
      li.id = "lux-product-accessory";
      list.insertBefore(li, list.firstChild || null);
    }
    li.innerHTML = "";

    const img = document.createElement("img");
    img.src = product.thumbnail || product.assetUrl || "";
    img.alt = product.title || "Jewellery design selected for AR try-on";
    img.setAttribute("data-product-id", product.id);
    img.setAttribute("data-shop-id", product.shopId);
    const anchor =
      (product.anchorConfig && product.anchorConfig.anchorPoint) || "";
    if (anchor) {
      img.setAttribute("data-anchor-point", anchor);
    }
    if (product.anchorConfig && product.anchorConfig.offset) {
      img.setAttribute("data-offset-x", product.anchorConfig.offset.x || 0);
      img.setAttribute("data-offset-y", product.anchorConfig.offset.y || 0);
      img.setAttribute("data-offset-z", product.anchorConfig.offset.z || 0);
    }
    if (product.anchorConfig && product.anchorConfig.baseScale) {
      img.setAttribute("data-base-scale", product.anchorConfig.baseScale);
    }
    if (product.anchorConfig && product.anchorConfig.smoothingAlpha) {
      img.setAttribute(
        "data-smoothing-alpha",
        String(product.anchorConfig.smoothingAlpha)
      );
    }

    const type = (product["3dType"] || "").toLowerCase();
    if (type === "gltf") {
      img.setAttribute("data-3d-type", "gltf");
      img.setAttribute("data-3d-src", product.assetUrl || "");
    } else if (type === "image") {
      img.setAttribute("data-3d-type", "image");
      img.setAttribute("data-image-src", product.assetUrl || product.thumbnail);
    } else {
      img.setAttribute("data-3d-type", "procedural");
      img.setAttribute("data-geometry", "strand");
      img.setAttribute("data-color", "#ffd88b");
    }

    // Fallback scale for face width if baseScale wasn't provided.
    if (
      !img.getAttribute("data-base-scale") &&
      !img.getAttribute("data-scale")
    ) {
      img.setAttribute("data-scale", "0.03");
    }

    // Map product anchor to legacy accessory type for backwards compatibility.
    let accessoryType = "necklace";
    const lowerAnchor = anchor.toLowerCase();
    if (lowerAnchor === "forehead") accessoryType = "forehead";
    else if (lowerAnchor.indexOf("ear") >= 0) accessoryType = "earrings";
    else if (lowerAnchor === "nose") accessoryType = "nose";
    else if (lowerAnchor === "finger") accessoryType = "ring";
    img.setAttribute("data-accessory-type", accessoryType);

    li.appendChild(img);

    if (window.$) {
      window.$("#jewelry-list ul li").removeClass("selected-accessory");
      window.$(li).addClass("selected-accessory");
    }

    // Navigate to the dedicated try-on view, scroll to the studio and open the webcam modal.
    navigateToTryon();
    const tryon = document.getElementById("tryon");
    if (tryon && window.scrollTo) {
      window.scrollTo({
        top: tryon.offsetTop - 72,
        behavior: "smooth",
      });
    }
    const webcamSwitch = document.getElementById("webcam-switch");
    if (webcamSwitch && !webcamSwitch.checked) {
      webcamSwitch.checked = true;
      if (window.$) {
        window.$(webcamSwitch).trigger("change");
      } else {
        const evt = new Event("change");
        webcamSwitch.dispatchEvent(evt);
      }
    }

    closeProductModal();
  }

  function attachProductCardHandlers(shop, productsPage) {
    const grid = document.getElementById("lux-shop-products-grid");
    if (!grid) return;
    grid.addEventListener("click", function (e) {
      const btn = e.target.closest(".lux-product-open");
      if (!btn) return;
      const productId = btn.getAttribute("data-product-id");
      if (!productId) return;
      const items = (productsPage && productsPage.items) || [];
      const product =
        items.find(function (p) {
          return p.id === productId;
        }) || null;
      if (!product) return;
      openProductModal(product, shop);
    });
  }

  function attachPaginationHandlers(shop, currentOptions) {
    const prevBtn = document.getElementById("lux-shop-prev");
    const nextBtn = document.getElementById("lux-shop-next");
    const state = currentOptions || {};

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (state.page <= 1) return;
        renderShopRoute(shop.id, {
          page: state.page - 1,
          filters: state.filters,
          sortBy: state.sortBy,
        });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (state.page >= state.totalPages) return;
        renderShopRoute(shop.id, {
          page: state.page + 1,
          filters: state.filters,
          sortBy: state.sortBy,
        });
      });
    }
  }

  function attachFilterHandlers(shop) {
    const sortSelect = document.getElementById("lux-shop-sort");
    const catFilter = document.getElementById("lux-filter-category");
    const metalFilter = document.getElementById("lux-filter-metal");
    const stoneFilter = document.getElementById("lux-filter-stone");

    function collectFilters() {
      return {
        category: catFilter && catFilter.value ? catFilter.value : "",
        metalType: metalFilter && metalFilter.value ? metalFilter.value : "",
        stoneType: stoneFilter && stoneFilter.value ? stoneFilter.value : "",
      };
    }

    function refresh() {
      const filters = collectFilters();
      const sortBy = sortSelect ? sortSelect.value : "popular";
      renderShopRoute(shop.id, {
        page: 1,
        filters: filters,
        sortBy: sortBy,
      });
    }

    if (sortSelect) sortSelect.addEventListener("change", refresh);
    if (catFilter) catFilter.addEventListener("change", refresh);
    if (metalFilter) metalFilter.addEventListener("change", refresh);
    if (stoneFilter) stoneFilter.addEventListener("change", refresh);
  }

  function renderShopRoute(shopId, options) {
    const containers = getContainers();
    if (!containers.shopRoot) return;
    const root = containers.shopRoot;
    root.innerHTML = "";

    const shop =
      findShopByIdOrSlug(shopId) ||
      (LuxShopsApi._findShopById && LuxShopsApi._findShopById(shopId));
    if (!shop) {
      root.innerHTML =
        "<p>We could not find this shop. Please go back to the marketplace.</p>";
      showSectionsForShop();
      return;
    }

    const opts = options || {};
    const filters = opts.filters || {};
    const sortBy = opts.sortBy || "popular";
    const page = opts.page || 1;

    LuxShopsApi.fetchShopProducts(shop.id, {
      page: page,
      pageSize: 12,
      filters: filters,
      sortBy: sortBy,
    }).then(function (pageResult) {
      showSectionsForShop();
      updateMetaForShop(shop);
      renderShopHeader(root, shop);
      renderShopMeta(root, shop, pageResult);
      renderProductGrid(root, pageResult, shop);
      attachProductCardHandlers(shop, pageResult);
      attachPaginationHandlers(shop, {
        page: pageResult.page,
        totalPages: pageResult.totalPages,
        filters: filters,
        sortBy: sortBy,
      });
      attachFilterHandlers(shop);
    });
  }

  function navigateToShop(shopId, options) {
    const url = "/shops/" + encodeURIComponent(shopId);
    const state = { view: "shop", shopId: shopId };
    if (!options || !options.replace) {
      window.history.pushState(state, "", url);
    } else {
      window.history.replaceState(state, "", url);
    }
    renderShopRoute(shopId, {});
  }

  function navigateToTryon(options) {
    const url = "/tryon";
    const state = { view: "tryon" };
    if (!options || !options.replace) {
      window.history.pushState(state, "", url);
    } else {
      window.history.replaceState(state, "", url);
    }
    showSectionsForTryon();
  }

  function navigateToAuth(view, options) {
    const safeView = view === "register" ? "register" : "login";
    const url = "/" + safeView;
    const state = { view: safeView };
    if (!options || !options.replace) {
      window.history.pushState(state, "", url);
    } else {
      window.history.replaceState(state, "", url);
    }
    showSectionsForAuth(safeView);
  }

  function navigateToProduct(shopId, productId) {
    const url =
      "/shops/" +
      encodeURIComponent(shopId) +
      "/products/" +
      encodeURIComponent(productId);
    const state = { view: "product", shopId: shopId, productId: productId };
    window.history.pushState(state, "", url);
    renderShopRoute(shopId, {});
    // Once shop grid is ready, open the modal for this product.
    LuxShopsApi.fetchShopProducts(shopId, {
      page: 1,
      pageSize: 50,
      sortBy: "popular",
    }).then(function (pageResult) {
      const items = pageResult.items || [];
      const shop =
        findShopByIdOrSlug(shopId) ||
        (LuxShopsApi._findShopById && LuxShopsApi._findShopById(shopId));
      const product =
        items.find(function (p) {
          return p.id === productId;
        }) || null;
      if (product && shop) {
        openProductModal(product, shop);
      }
    });
  }

  function attachMarketplaceCtas() {
    const buttons = document.querySelectorAll("[data-shop-name]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        const name = this.getAttribute("data-shop-name");
        const shop = findShopByDisplayName(name);
        if (!shop) return;
        e.preventDefault();
        e.stopPropagation();
        navigateToShop(shop.id);
      });
    });
  }

  function handleInitialRoute() {
    const route = parseLocation();
    if (route.view === "shop") {
      navigateToShop(route.shopId, { replace: true });
    } else if (route.view === "product") {
      navigateToProduct(route.shopId, route.productId);
    } else if (route.view === "tryon") {
      navigateToTryon({ replace: true });
    } else if (route.view === "login" || route.view === "register") {
      navigateToAuth(route.view, { replace: true });
    } else {
      showSectionsForHome();
    }
  }

  window.addEventListener("popstate", function (e) {
    const state = e.state || parseLocation();
    if (state.view === "shop") {
      renderShopRoute(state.shopId, {});
    } else if (state.view === "product") {
      navigateToProduct(state.shopId, state.productId);
    } else if (state.view === "tryon") {
      showSectionsForTryon();
    } else if (state.view === "login" || state.view === "register") {
      showSectionsForAuth(state.view);
    } else {
      showSectionsForHome();
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    attachMarketplaceCtas();

    // Primary nav routing for top-level views
    document.querySelectorAll("a[data-lux-view]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        const view = this.getAttribute("data-lux-view");
        if (!view) return;
        e.preventDefault();
        if (view === "home") {
          window.history.pushState({ view: "home" }, "", "/");
          showSectionsForHome();
          const targetId = this.getAttribute("href");
          if (targetId && targetId.charAt(0) === "#") {
            const target = document.querySelector(targetId);
            if (target && window.scrollTo) {
              window.scrollTo({
                top: target.offsetTop - 72,
                behavior: "smooth",
              });
            }
          }
        } else if (view === "tryon") {
          navigateToTryon();
        } else if (view === "login") {
          navigateToAuth("login");
        } else if (view === "register") {
          navigateToAuth("register");
        }
      });
    });

    handleInitialRoute();
  });

  window.LuxShopsRouter = {
    openShopById: navigateToShop,
    openShopByName: function (name) {
      const shop = findShopByDisplayName(name);
      if (shop) navigateToShop(shop.id);
    },
    goToTryon: navigateToTryon,
    goToLogin: function () {
      navigateToAuth("login");
    },
    goToRegister: function () {
      navigateToAuth("register");
    },
  };
})(window, document);
