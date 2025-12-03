// Reasoning: Provides a thin, promise-based client API that mimics REST endpoints
// (/api/shops/:shopId and /api/shops/:shopId/products) using in-memory data so
// the SPA flow can be wired now and pointed to a real backend later without
// changing the UI code.

(function (window) {
  if (!window) return;
  const data = window.LuxShopsData || {};
  const shops = data.shops || [];
  const productsByShop = data.productsByShop || {};

  function normaliseShopId(idOrSlug) {
    if (!idOrSlug) return null;
    const target = String(idOrSlug).toLowerCase();
    const found =
      shops.find(
        (s) =>
          s.id.toLowerCase() === target ||
          (s.slug || "").toLowerCase() === target
      ) || null;
    return found ? found.id : null;
  }

  function findShopById(idOrSlug) {
    const id = normaliseShopId(idOrSlug);
    if (!id) return null;
    return shops.find((s) => s.id === id) || null;
  }

  function listProductsForShop(shopId) {
    const id = normaliseShopId(shopId);
    if (!id) return [];
    return productsByShop[id] || [];
  }

  function applyFilters(products, filters) {
    if (!filters) return products;
    return products.filter(function (p) {
      if (filters.category && p.category !== filters.category) return false;
      if (
        filters.metalType &&
        p.metalType.toLowerCase().indexOf(filters.metalType.toLowerCase()) ===
          -1
      )
        return false;
      if (
        filters.stoneType &&
        p.stoneType.toLowerCase().indexOf(filters.stoneType.toLowerCase()) ===
          -1
      )
        return false;
      if (filters.minPrice && p.price && p.price.amount < filters.minPrice)
        return false;
      if (filters.maxPrice && p.price && p.price.amount > filters.maxPrice)
        return false;
      return true;
    });
  }

  function applySort(products, sortKey) {
    if (!sortKey) return products;
    const arr = products.slice();
    switch (sortKey) {
      case "price-asc":
        arr.sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0));
        break;
      case "price-desc":
        arr.sort((a, b) => (b.price?.amount || 0) - (a.price?.amount || 0));
        break;
      case "newest":
        arr.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        break;
      case "popular":
        arr.sort(
          (a, b) =>
            (b.rating || 0) * (b.ratingCount || 0) -
            (a.rating || 0) * (a.ratingCount || 0)
        );
        break;
      default:
        break;
    }
    return arr;
  }

  function paginate(products, page, pageSize) {
    const size = pageSize || 12;
    const p = page || 1;
    const start = (p - 1) * size;
    const end = start + size;
    return {
      items: products.slice(start, end),
      page: p,
      pageSize: size,
      total: products.length,
      totalPages: Math.max(1, Math.ceil(products.length / size)),
    };
  }

  /**
   * Simulated client call for GET /api/shops/:shopId
   */
  function fetchShop(shopId) {
    return new Promise(function (resolve) {
      const shop = findShopById(shopId);
      // Small timeout to emulate network without slowing tests considerably.
      setTimeout(function () {
        resolve(shop);
      }, 10);
    });
  }

  /**
   * Simulated client call for GET /api/shops/:shopId/products
   * Supports basic filter and sort params.
   */
  function fetchShopProducts(shopId, options) {
    const opts = options || {};
    const filters = opts.filters || {};
    const sortBy = opts.sortBy || "popular";
    const page = opts.page || 1;
    const pageSize = opts.pageSize || 12;

    return new Promise(function (resolve) {
      const all = listProductsForShop(shopId);
      const filtered = applyFilters(all, filters);
      const sorted = applySort(filtered, sortBy);
      const paginated = paginate(sorted, page, pageSize);
      setTimeout(function () {
        resolve(paginated);
      }, 10);
    });
  }

  window.LuxShopsApi = {
    fetchShop: fetchShop,
    fetchShopProducts: fetchShopProducts,
    _findShopById: findShopById,
    _listProductsForShop: listProductsForShop,
  };
})(window);
