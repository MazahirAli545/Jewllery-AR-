// Reasoning: Verifies that the new shop routing renders correctly, product details
// can be opened, and AR TRY-ON wiring creates the synthetic accessory node with
// the expected asset and anchor configuration attributes.

const path = require("path");
const fs = require("fs");

function loadIndexHtml() {
  const htmlPath = path.resolve(__dirname, "..", "index.html");
  return fs.readFileSync(htmlPath, "utf8");
}

describe("LuxAura shop routing and AR integration", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = loadIndexHtml();
    // Ensure global window references exist as expected by the browser-oriented scripts.
    global.window = window;
    // Load data + API + UI scripts
    require("../js/shops-data.js");
    require("../js/shops-api.js");
    require("../js/shops-ui.js");
    // Trigger DOMContentLoaded handlers registered inside shops-ui.js
    document.dispatchEvent(new Event("DOMContentLoaded"));
  });

  test("navigates to shop route and renders product grid", async () => {
    window.LuxShopsRouter.openShopById("malabar-heritage-studio");
    // Wait for the mock API (setTimeout) to resolve and DOM to update
    await new Promise((resolve) => setTimeout(resolve, 40));

    const shopPage = document.getElementById("shop-page");
    expect(shopPage).not.toBeNull();
    expect(shopPage.classList.contains("d-none")).toBe(false);

    const grid = document.getElementById("lux-shop-products-grid");
    expect(grid).not.toBeNull();
    const cards = grid.querySelectorAll(".lux-product-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  test("opens product modal and wires AR TRY-ON accessory node", async () => {
    window.LuxShopsRouter.openShopById("malabar-heritage-studio");
    await new Promise((resolve) => setTimeout(resolve, 40));

    const openButtons = document.querySelectorAll(".lux-product-open");
    expect(openButtons.length).toBeGreaterThan(0);
    openButtons[0].click();

    const modal = document.getElementById("lux-product-modal");
    expect(modal).not.toBeNull();
    expect(modal.classList.contains("d-none")).toBe(false);

    const arButton = modal.querySelector(".lux-product-ar-cta");
    expect(arButton).not.toBeNull();
    arButton.click();

    const syntheticLi = document.querySelector(
      "#jewelry-list ul li#lux-product-accessory"
    );
    expect(syntheticLi).not.toBeNull();
    const img = syntheticLi.querySelector("img");
    expect(img).not.toBeNull();
    expect(img.getAttribute("data-product-id")).toBeTruthy();
    expect(img.getAttribute("data-accessory-type")).toBeTruthy();
    expect(img.getAttribute("data-3d-type")).toBeTruthy();
  });
});
