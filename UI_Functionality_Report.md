## LuxAura – Virtual Jewellery Try-On Marketplace

### 1. High-Level Overview

- **Purpose**: A demo multi-vendor marketplace for luxury jewellery with a live AR try-on studio. Users can browse curated shops, open per-brand storefronts, and preview necklaces / forehead jewellery (and later earrings, rings, nose pins) directly on their face using the webcam or an uploaded photo.
- **Tech Stack (frontend only)**:
  - **UI/Layout**: HTML5, Bootstrap 4, custom CSS (`virtual-glasses.css`)
  - **AR / 3D**: `three.js`, `OrbitControls`, `GLTFLoader`, TensorFlow.js face-landmarks model, `webcam-easy`
  - **Behaviour**:
    - Vanilla JS (`index.html` inline script, `lux-ui.js`)
    - ES modules (`virtual-glasses.js`)
    - jQuery (for webcam + AR controls)
    - SPA-style shop routing and data layer (`shops-data.js`, `shops-api.js`, `shops-ui.js`)

---

### 2. UI Structure (Page Sections & Layout)

#### 2.1 Header / Navigation (`<header.lux-header>`)

- **Components**:
  - Sticky navbar (`.lux-header .lux-navbar`) with brand label `LuxAura`.
  - Navigation links: **Home**, **Shops**, **Try-On Studio**, **Stories**, **My Account**.
- **Behaviour**:
  - `lux-ui.js` adds **smooth scroll** for links targeting sections (`a.nav-link[href^="#"]`).
- **UX Notes**:
  - Sticky, blurred background and soft gold border create a premium look.
  - Navigation is non-intrusive and stays accessible while scrolling.

#### 2.2 Hero / Landing Section (`#hero`)

- **Content**:
  - Main headline: “Try Premium Jewellery Live in AR”.
  - Subcopy explains necklaces, earrings, maang-tikkas, rings.
  - Badges: _Real-time face landmarks_, _Multi-vendor catalogue_, _HD product zoom_.
  - Right-side card “Trending Today” listing a few sample products.
- **Primary CTAs**:
  - **Launch Try-On Studio** → anchors to `#tryon`.
  - **Browse Jewellery Marketplace** → anchors to `#marketplace`.
- **Styling**:
  - Uses `.lux-hero`, `.lux-hero-title`, `.lux-hero-highlight`, `.lux-hero-meta` from `virtual-glasses.css` for a gradient background and high-contrast hero copy.

#### 2.3 Marketplace Section (`#marketplace`)

- **Layout**:
  - Section title and subtitle describing multi-vendor marketplace.
  - Filter pills (`.lux-filter-pill-row`) for **All**, **Necklaces**, **Earrings**, **Rings**.
  - Grid of three sample shops (`.lux-shop-card` inside `.lux-shop-grid`), each:
    - Banner (`.lux-shop-banner-*` gradient background).
    - Shop name, stats (design count & rating), description.
    - CTA button with `data-shop-name` attribute.
- **Dynamic Behaviour (via `lux-ui.js` + `shops-ui.js`)**:
  - **Filter Pills**:
    - Clicking a pill updates active state and filters cards by `data-categories` attribute.
    - Matching is case-insensitive; “All” shows everything.
  - **Shop CTAs (multi-vendor shop routing)**:
    - Buttons with `data-shop-name` call `LuxShopsRouter.openShopByName(name)` from `shops-ui.js`.
    - This performs SPA-style navigation to `/shops/:shopId`, hides the hero/marketplace/testimonials/dashboard, and shows the dedicated **Shop Page** (`#shop-page`) while keeping the Try-On Studio visible.

#### 2.4 Dedicated Shop Page (`#shop-page`)

- **Purpose**: Per-vendor storefront that can be deep-linked (`/shops/:shopId`) and extended to real backend data.
- **Layout (rendered dynamically by `shops-ui.js`)**:
  - **Shop header**:
    - Banner (`.lux-shop-header-banner`), shop name, rating + review count, location, short description.
  - **Shop metadata grid** (`.lux-shop-meta-grid`):
    - Cards for **Designs**, **Policies**, **Shipping**, **Hours** driven by `LuxShopsData.shops[*]`.
  - **Products grid** (`.lux-shop-products-grid`):
    - Cards (`.lux-product-card`) showing thumbnail, title, short description, price, badges, and stock status (in stock / low stock / sold out).
  - **Controls**:
    - Sorting select (`#lux-shop-sort`): Popularity, Newest, Price: Low→High, Price: High→Low.
    - Filters: category (`#lux-filter-category`), metal (`#lux-filter-metal`), stone (`#lux-filter-stone`).
    - Pagination controls (`#lux-shop-prev`, `#lux-shop-next`, `.lux-shop-page-indicator`).
- **Product detail modal (opened from each product card)**:
  - Full gallery: main image + clickable thumbnails.
  - Product metadata: title, SKU, selling shop, price (with variant-based adjustments), weight, purity, carat, delivery estimate.
  - Variant selector (`#lux-product-variant`) for metal/stone/size combinations.
  - CTAs: **AR TRY-ON**, Add to wishlist, Add to cart, Share.
  - Injects Schema.org **Product** structured data into `<head>` for SEO.

#### 2.5 AR Try-On Studio Shell (`#tryon`)

This section wraps the actual AR application (webcam + 3D rendering).

- **Heading**:

  - Title: “Live AR Try-On Studio”.
  - Subtitle explains using camera/photo to preview jewellery, currently focused on **necklaces** & **forehead accessories**, with hooks for more.

- **Core Container**: `<main id="virtual-glasses-app">`
  - **Webcam Toggle Block (`#webcam-control`)**:
    - Contains a custom switch input `#webcam-switch`.
    - Caption `#webcam-caption` text changes between “Try it On” and “on”.
  - **Static Image / Canvas Container (`#image-container`)**:
    - `#canvas`: HTML canvas where `three.js` renders 3D accessories on top of webcam frames.
    - `.loading` overlay with spinner, shown while the TensorFlow model lazily loads.
    - **Jewellery slider** (`#jewelry-slider`):
      - Left/right arrows (`#arrowLeft`, `#arrowRight`) for scrolling.
      - Horizontal list (`#jewelry-list ul li`) of accessory thumbnails.
      - The currently active item has `.selected-accessory`.
      - Each `<img>` has data attributes describing the accessory and how to render it (see Section 3.3).
      - Shop AR CTAs inject a synthetic list item (`#lux-product-accessory`) into this slider with per-product anchor/asset metadata.
  - **Error Banner**:
    - `#errorMsg` alert area (`role="alert"`, `aria-live="assertive"`) used when webcam fails or permissions are denied.
  - **Modal / Webcam Container**:
    - `.md-modal` overlay container for webcam live preview, annotated as a dialog for accessibility.
    - Inside it, `#webcam-container` holds the `<video id="webcam">` element.
    - `.md-overlay` darkens the background when webcam is active.
    - **AR Controls Row (`.lux-ar-controls`)**:
      - Source buttons: **Camera** (`#lux-ar-source-camera`) and **Upload Photo** (`#lux-ar-source-upload`), with a hidden file input (`#lux-ar-upload-input`) for selecting an image as background.
      - **Flip Camera** (`#lux-ar-flip-camera`): switches between front/rear camera where supported.
      - **Brightness slider** (`#lux-ar-brightness`): adjusts preview brightness via CSS filter on webcam/canvas.
      - **Save Snapshot** (`#lux-ar-save-snapshot`): captures a frame, stores try-on metadata in `localStorage` and offers a PNG download.

#### 2.6 Testimonials (`#testimonials`) and Dashboard Previews (`#dashboard`)

- **Testimonials**:
  - Three cards (`.lux-testimonial`) with quote text and author (bride, stylist, store owner).
  - Purely static content for social proof.
- **Dashboard Stubs**:
  - Two lists describing future **User Dashboard** and **Admin Panel** features:
    - Saved try-ons, wishlists, orders, subscriptions.
    - Shop management, product approvals, analytics, performance tracking.
  - No dynamic JS yet – they are placeholders for future product work.

#### 2.7 Footer

- Text indicating:
  - Dynamic year (`#luxYear`) set by a small inline script in `index.html`.
  - Disclaimer that this is a demo build ready to be wired to a backend.

---

### 3. Core Functionality & Working

This section maps the UI pieces above to the JavaScript that powers them.

#### 3.1 High-Level Flow (Marketplace, Shops & Try-On)

1. **Page load**:

   - `virtual-glasses.js` runs `setup3dScene`, `setup3dCamera`, and `setupAccessoryMesh` once the DOM is ready.
   - `lux-ui.js` wires smooth scrolling and marketplace filtering.
   - `shops-data.js` exposes in-memory shop and product catalogues.
   - `shops-api.js` provides a mock REST-like client (`LuxShopsApi`) over that data.
   - `shops-ui.js` registers routing (`/shops/:shopId`, `/shops/:shopId/products/:productId`), builds the Shop Page UI, and connects marketplace CTAs to the router.

2. **User navigates to a shop**:

   - Clicking a shop CTA or visiting `/shops/:shopId`:
     - Hides hero/marketplace/testimonials/dashboard, shows `#shop-page` and keeps `#tryon` visible.
     - Calls `LuxShopsApi.fetchShop` + `fetchShopProducts` to load shop metadata and a product page.
     - Renders header, meta cards, product grid, filters, and pagination.

3. **User opens product details**:

   - Clicking “View details & AR try-on”:
     - Opens a modal with gallery, attributes, variants, and CTAs.
     - Injects Schema.org `Product` JSON-LD into `<head>` for SEO.

4. **User initiates AR TRY-ON from a product**:

   - Clicking **AR TRY-ON** in the product modal:
     - Injects a synthetic slider entry (`#lux-product-accessory`) containing per-product `3dType`, `assetUrl`, and `anchorConfig` attributes.
     - Scrolls to `#tryon`, toggles `#webcam-switch` on, and starts the AR studio.

5. **User toggles “Try it On” directly**:

   - Checking `#webcam-switch` without going via a product still opens the AR studio using whichever accessory is selected in the slider (legacy behaviour preserved).

6. **Face detection loop**:

   - On first AR start, `virtual-glasses.js` lazily loads TensorFlow + face-landmarks-detection via `ensureFaceMeshDependencies`.
   - Once the model is ready, `detectFaces()` runs in a loop using `requestAnimFrame`:
     - For each frame, estimates face landmarks from the webcam or uploaded image.
     - For each detected face, positions/scales accessories based on landmark anchors and per-product `anchorConfig` overrides.

7. **Accessory selection**:

   - Clicking any thumbnail in the slider (including injected product accessories) updates `.selected-accessory`, clears old groups, and recreates meshes.

8. **User turns off webcam**:
   - Unchecking `#webcam-switch`:
     - Stops webcam, cancels animation frame loop, and switches back to the static `#image-container`.
     - Calls `cameraStopped()` to restore scroll/overlay state.

---

### 4. Detailed JavaScript Behaviour

#### 4.1 `virtual-glasses.js` – AR & 3D Logic

- **Dependencies**:
  - `three` (imported via ES module and `importmap`).
  - `OrbitControls` for interactive 3D view in non-video mode.
  - `GLTFLoader` for loading `.gltf` jewellery assets.
  - Global `Webcam` (from `webcam-easy`) and **lazily-loaded** `faceLandmarksDetection` (TensorFlow model).
  - jQuery for DOM selection and event wiring.

##### 4.1.1 State Variables

- **Webcam / Detection**:
  - `webcamElement`, `canvasElement`: DOM nodes.
  - `webcam`: `new Webcam(webcamElement, "user")`.
  - `isVideo`: true when webcam mode is active (vs static canvas mode).
  - `model`: loaded face landmarks model.
  - `cameraFrame`: current `requestAnimFrame` handle.
  - `detectFace`, `clearAccessories`: flags controlling detection loop and clearing of 3D groups.
- **3D Scene**:
  - `scene`, `camera`, `renderer`, `obControls` (Orbit controls for non-webcam preview).
  - `accessoryArray`: holds 3D groups for each detected face.
- **Smoothing**:
  - `lastTransforms` (WeakMap) and `SMOOTHING_ALPHA` implement temporal smoothing to reduce jitter in accessory position/scale.
  - Per-product overrides are supported via `data-smoothing-alpha` attributes injected on slider items.

##### 4.1.2 Anchor Configuration (`getAnchorConfig` + per-product overrides)

- **Purpose**:
  - Maps high-level accessory types (`necklace`, `forehead`, `earrings`, `nose`, `ring`) to specific face landmark indices plus offset.
- **Examples**:
  - `forehead` / `maang-tikka` → landmark index `10`, offsetY `-10`.
  - `necklace` / `mangalsutra` / `chain` → `neckBase` landmark (index `152`).
  - `earrings` → left/right temple landmarks.
  - Even though hands are not tracked, `ring` uses a chin/neck-based anchor for demo purposes.
- **Per-product anchorConfig**:
  - Each injected product image can specify:
    - `data-anchor-point` (semantic anchor: `neck`, `forehead`, `leftEar`, `rightEar`, `nose`, `finger`).
    - `data-offset-x`, `data-offset-y`, `data-offset-z`.
    - `data-base-scale` (preferred over legacy `data-scale`).
    - `data-smoothing-alpha` (to tune jitter/snap feel per SKU).
  - `drawAccessories` reads these attributes and maps them to face landmarks before applying smoothing.

##### 4.1.3 Webcam Toggle, AR Controls and Accessory Selection

- `#webcam-switch.change`:

  - On enable:
    - Shows modal, starts webcam, sets `isVideo = true`.
    - Calls:
      - `cameraStarted()` (UI changes, scroll lock, show webcam).
      - `switchSource()` to move the rendering canvas and slider into the webcam container.
      - `startVTGlasses()` to load the ML model and start detection.
  - On disable:
    - Stops webcam and detection loop, clears accessory groups, resets UI via `cameraStopped()`, and switches back to non-video mode.

- **AR controls row**:

  - `#lux-ar-brightness`:
    - Adjusts `filter: brightness()` on `#webcam` and `#canvas` for better visibility in varied lighting.
  - `#lux-ar-flip-camera`:
    - Stops the webcam, flips the underlying `Webcam` facing mode, and restarts capture, resuming detection.
  - `#lux-ar-source-upload` + `#lux-ar-upload-input`:
    - Lets the user upload a static photo; sets it as background on `#image-container` and stops the live camera to avoid confusion.
  - `#lux-ar-source-camera`:
    - Clears any uploaded background and (re)enables the live camera if it is off.
  - `#lux-ar-save-snapshot`:
    - Uses `webcam.snap()` to capture a PNG frame.
    - Persists snapshot metadata (image data URL, `productId`, `shopId`, `anchorPoint`, timestamp) into `localStorage["luxTryOnSnapshots"]`.
    - Triggers a client-side PNG download for easy sharing/saving.

- **Accessory slider**:
  - `#arrowLeft` / `#arrowRight` adjust `margin-left` of the `<ul>` to scroll items horizontally.
  - `#jewelry-list ul li.click`:
    - Changes `.selected-accessory`.
    - Updates `selectedAccessory` reference.
    - Clears and re-creates meshes for the newly chosen accessory.

##### 4.1.4 Model Loading & Face Detection (Lazy-loaded TensorFlow)

- `startVTGlasses()`:

  - Shows `.loading` overlay.
  - Calls `ensureFaceMeshDependencies()` which:
    - Dynamically injects `<script>` tags for TensorFlow core, converter, WebGL/CPU backends, and face-landmarks-detection **only when AR is first used**.
    - Caches the loading Promise so subsequent AR sessions reuse the same bundle.
  - Once dependencies are ready, loads the face landmarks model.
  - Sets `detectFace = isVideo && webcam.facingMode === "user"`.
  - Starts detection loop by calling `detectFaces()`.
  - Hides the loading overlay when done (success or error).

- `detectFaces()`:
  - Uses `model.estimateFaces` on `webcamElement`.
  - Handles an empty or falsy face array gracefully.
  - For non-empty results:
    - Calls `drawAccessories(faces)` then schedules next animation frame if `detectFace` is true.

##### 4.1.5 Drawing and Positioning Accessories

- `drawAccessories(faces)`:
  - Ensures the number of accessory groups matches face count.
  - For each face:
    - Reads accessory metadata from the selected thumbnail:
      - `data-accessory-type`
      - `data-anchor-point`
      - `data-offset-x`, `data-offset-y`, `data-offset-z`
      - `data-base-scale` or `data-scale`
      - `data-smoothing-alpha`
    - Determines anchor configuration via `getAnchorConfig` plus any per-product anchor overrides.
    - Computes **face width** using distance between left and right cheek landmarks – used to scale jewellery proportionally.
    - Builds a **target transform** (x, y, z, scale) based on anchor coordinates, offsets, and camera position.
    - Smooths transitions with `lastTransforms` and either the global `SMOOTHING_ALPHA` or a per-product override.
    - Updates the accessory group’s **position, scale, and rotation**.
    - Renders the scene with `renderer.render(scene, camera)`.

##### 4.1.6 Scene & Mesh Setup

- `setup3dScene()`:

  - Creates a `THREE.Scene` and transparent `WebGLRenderer` (`alpha: true`).
  - Adds front and back spotlights to work well with metallic jewellery materials.

- `setup3dCamera()`:

  - **Video mode**:
    - Uses a PerspectiveCamera aligned with the video element, positions it based on video width/height so 3D overlays line up with the face.
    - Renderer size matches video dimensions, with transparent background.
  - **Non-video mode**:
    - Standard perspective camera facing the origin with `OrbitControls` for manual rotation/zoom.
    - Used as a standalone 3D preview when webcam is off.
  - Ensures a point light is attached to the camera and calls `setup3dAnimate()`.

- `setupAccessoryMesh()`:

  - Reads `data-3d-type` from the currently selected accessory:
    - **`gltf`**:
      - Uses `GLTFLoader` to load `data-3d-src`, wraps it in a `THREE.Group`, and pushes to `accessoryArray`.
      - Falls back to a procedural group if loading fails.
    - **`image`**:
      - Uses `TextureLoader` to build a plane with transparent material from `data-image-src`.
    - **`procedural` (default)**:
      - Calls `buildAccessoryGroup()` to construct meshes from scratch.

- `buildAccessoryGroup()`:
  - Reads `data-geometry` and `data-color` from the selected accessory.
  - Supported procedural shapes:
    - `strand`: torus necklace with bead decorations.
    - `choker`: thicker torus nearer to the neck.
    - `pendant`: cylinder “stem” plus glowing gem sphere.
    - `drop`: cone + sphere for drop-shaped pendant/maang-tikka.
    - `torus` (default): general loop necklace.
  - Uses `MeshStandardMaterial` with high `metalness` and low `roughness` to simulate jewellery.

---

#### 4.2 `webcam-ui-lib.js` – Webcam UI State Helpers

- **`displayError(err)`**:
  - Optionally sets inner HTML of `#errorMsg` and reveals it.
- **`cameraStarted()`**:
  - Hides error, sets caption to “on”, toggles `.webcam-on` class.
  - Shows `.webcam-container`, hides any scroll-to-top widget.
  - Scrolls to top and disables body vertical scroll to focus on AR view.
- **`cameraStopped(doScroll)`**:
  - Resets webcam UI to “Try it On”, hides webcam container and modal.
  - Optionally scrolls back to `#virtual-glasses-app` if `doScroll` is true.
- **Capture helpers (`beforeTakePhoto`, `afterTakePhoto`, `removeCapture`)**:
  - Control flash animation, show/hide photo controls and download/resume buttons.
  - These are partially wired in the AR UI and can be extended to support actual photo capture & saving.
- **RequestAnimationFrame polyfills**:
  - Exposes `window.requestAnimFrame` and `window.cancelAnimationFrame` for old browsers.

---

#### 4.3 `lux-ui.js` – Marketplace & Shell Enhancements

- **Smooth Scroll Navigation**:
  - All `.nav-link` anchors to page sections perform animated scroll with an offset for header height.
- **Marketplace Filters**:
  - Click events on `.lux-filter-pill`:
    - Toggle `.active` pill.
    - Show/hide shop cards by checking if `data-categories` contains the selected pill text.
- **Shop CTAs**:
  - Buttons with `data-shop-name` now have their behaviour handled by `shops-ui.js`, which intercepts clicks and performs SPA navigation to the appropriate shop route rather than just showing a toast.

---

#### 4.4 `shops-data.js` – In-Memory Shops & Products

- **Purpose**:
  - Provides a realistic, structured dataset for shops and products, used both by the UI and as a contract for backend integration.
- **Exports**:
  - `LuxShopsData.shops`: array of shop objects (id, slug, displayName, bannerClass, rating, designCount, policies, shipping, hours, categories, etc.).
  - `LuxShopsData.productsByShop`: map from `shopId` to array of product objects.
  - `LuxShopsData.sampleProduct`: a canonical product describing the expected shape, including:
    - `3dType` (`"gltf"`, `"image"`, `"procedural"`).
    - `assetUrl` (3D model or image path).
    - `anchorConfig` (anchorPoint, offset `{x,y,z}`, baseScale, rotation `{x,y,z}`, smoothingAlpha).
    - `variants` (with `priceDelta` for each variant).

---

#### 4.5 `shops-api.js` – Mock Shop/Product API Client

- **Purpose**:
  - Mimics REST endpoints (`/api/shops/:shopId`, `/api/shops/:shopId/products`) on the client.
  - Allows the SPA flow to be wired now and swapped to a real backend later with minimal changes.
- **Core functions**:
  - `fetchShop(shopId)`:
    - Normalises `shopId` or slug and returns the matching shop from `LuxShopsData.shops` after a small timeout.
  - `fetchShopProducts(shopId, options)`:
    - Accepts `filters` (category, metalType, stoneType, minPrice, maxPrice), `sortBy` (popular, newest, price-asc, price-desc), `page`, and `pageSize`.
    - Applies filtering, sorting, and pagination over `productsByShop[shopId]`.
    - Returns `{ items, page, pageSize, total, totalPages }`.
- **Exports**:
  - `window.LuxShopsApi` with `fetchShop`, `fetchShopProducts`, and internal helpers for testing.

---

#### 4.6 `shops-ui.js` – SPA Routing, Shop Page & Product AR Bridge

- **Routing**:

  - Parses `window.location.pathname` into views:
    - `/` → `view: "home"`.
    - `/shops/:shopId` → `view: "shop"`.
    - `/shops/:shopId/products/:productId` → `view: "product"`.
  - Uses History API (`pushState`, `replaceState`, `popstate`) to support back/forward navigation between home, shop, and product views.

- **Section visibility**:

  - **Home view**:
    - Shows hero, marketplace, testimonials, dashboard; hides `#shop-page`.
  - **Shop/product view**:
    - Hides hero, marketplace, testimonials, dashboard; shows `#shop-page` and keeps Try-On Studio visible.

- **Shop rendering**:

  - `renderShopRoute(shopId, options)`:
    - Uses `LuxShopsApi.fetchShop` + `fetchShopProducts` to render:
      - Header (`.lux-shop-header`).
      - Meta cards (`.lux-shop-meta-grid`).
      - Product grid (`.lux-shop-products-grid`) with cards and AR-ready CTAs.
      - Sorting, filters, and pagination controls.
    - Attaches handlers for:
      - Product card open buttons (to show product modal).
      - Pagination (prev/next page).
      - Filters + sort (re-renders products with new criteria).

- **Product modal**:

  - Built once via `buildProductModal`, then populated by `openProductModal(product, shop)`:
    - Renders main image + thumbnails, attributes, variants, CTAs.
    - Handles thumb switching and variant-based price adjustments.
    - Injects or updates a `<script id="lux-product-schema" type="application/ld+json">` block with Schema.org `Product` markup.

- **AR TRY-ON bridge**:

  - `openProductTryOn(product, shop)`:
    - Creates/updates a slider item `#lux-product-accessory` with:
      - `data-product-id`, `data-shop-id`.
      - `data-anchor-point`, `data-offset-x/y/z`, `data-base-scale`, `data-smoothing-alpha`.
      - Appropriate `data-3d-type` + asset attributes for `gltf` / `image` / `procedural` modes.
      - A compatible `data-accessory-type` (necklace / forehead / earrings / nose / ring) for legacy code paths.
    - Marks it as `.selected-accessory` (via jQuery if available).
    - Scrolls to the Try-On Studio and toggles `#webcam-switch` on, which starts the AR pipeline.

- **Public router API**:
  - `window.LuxShopsRouter`:
    - `openShopById(shopId)` – navigate SPA-style to a shop.
    - `openShopByName(name)` – lookup by display name and navigate.

---

### 5. Styling & UX Considerations (`virtual-glasses.css`)

- **Visual Theme**:
  - Dark, gradient-rich background conveying a luxury brand feel.
  - Use of **Playfair Display** for headings and gold tones (`#ffd88b`, `#b8860b`) for premium highlights.
- **Sections**:
  - `.lux-section` and `.lux-section-alt` alternate subtle gradient backgrounds for visual rhythm.
  - Cards (`.lux-shop-card`, `.lux-testimonial`, `.lux-product-card`, `.lux-shop-meta-card`) use rounded corners, soft borders, and strong drop shadows for depth.
- **Try-On Controls**:
  - `#jewelry-slider` pinned to bottom with semi-transparent black background.
  - `.selected-accessory` uses a blue outline to clearly indicate the active choice.
  - `.lux-ar-controls` provides a compact, premium control bar for Camera/Upload, Flip, Brightness, and Save Snapshot actions.
  - Responsive media queries adjust slider size, thumbnails, and loading spinners for mobile/tablet.
- **Webcam Modal**:
  - `.md-modal` and `#webcam-container` ensure the live camera feed fills the available viewport while the jewellery slider and AR controls remain accessible at the bottom.

---

### 6. Extension Points & How to Add Features

- **Add New Jewellery Types**:

  - In HTML (`#jewelry-list`) or via `shops-ui.js`’s injected product entries:
    - Add new `<li><img ...></li>` with:
      - `data-accessory-type` (e.g., `earrings`, `nose`, `ring`) for legacy mapping.
      - `data-anchor-point` (e.g., `leftEar`, `nose`, `finger`) for explicit anchor control.
      - `data-3d-type` (`gltf`, `image`, or `procedural`) and associated asset attributes.
      - Geometry / colour attributes for procedural (`data-geometry`, `data-color`, `data-scale` or `data-base-scale`, `data-offset-x/y/z`, `data-smoothing-alpha`).
  - Anchoring behaviour is already wired via `getAnchorConfig` plus override logic.

- **Connect Shops to Real Routes / Backend**:

  - Replace mock `LuxShopsApi` implementations with real REST/GraphQL calls that return the same JSON shapes as `shops-data.js`.
  - Marketplace cards can be generated server-side or from an API and keep the same `data-shop-name` + `data-categories` interface so existing filters and routing still work.

- **Persist Try-Ons / Screenshots**:
  - Reuse `webcam.snap()` and the metadata currently stored in `localStorage["luxTryOnSnapshots"]`.
  - POST snapshots and configs to a backend user profile when authentication is available.
  - Extend dashboard stubs to display persisted try-ons and allow deletion/sharing.

---

### 7. Summary

- **UI**: Premium, SPA-style layout with hero, marketplace, dedicated per-shop storefronts, AR studio, testimonials, and dashboard preview sections.
- **Functionality**: Live AR try-on implemented via webcam feed + lazily-loaded TensorFlow face landmarks + `three.js` overlays, with jewellery carousels and product-level AR entry points.
- **Working**: The system anchors 3D or image-based jewellery models to specific face landmarks using per-product `anchorConfig`, scales them to face width, and smoothly updates position per frame, while shop and product flows remain backend-agnostic but ready for real APIs and deep linking.
