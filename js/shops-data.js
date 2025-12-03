// Reasoning: Centralised, typed-like shop and product metadata used by the SPA shop routes,
// product detail modal and AR integration; keeps UI rendering and API stubs in sync without
// introducing a real backend dependency for this demo.

(function (window) {
  if (!window) return;

  /**
   * A single realistic product JSON example used both by the demo UI and as
   * documentation for backend / CMS integration.
   */
  const sampleProduct = {
    id: "malabar-heritage-polki-necklace",
    shopId: "malabar-heritage-studio",
    slug: "heritage-polki-emerald-necklace",
    title: "Heritage Polki Emerald Necklace Set",
    shortDescription:
      "Temple-inspired Polki choker with detachable emerald drops and matching earrings.",
    description:
      "Handcrafted in 22KT yellow gold with uncut Polki diamonds and Zambian emerald drops. Includes matching earrings. Designed for bridal and heirloom wear.",
    price: {
      currency: "INR",
      amount: 285000,
      display: "₹2,85,000",
    },
    badges: ["New", "Best seller", "AR ready"],
    stockStatus: "in_stock",
    category: "necklaces",
    metalType: "22KT Yellow Gold",
    stoneType: "Polki, Emerald",
    weight: "86.5 g",
    purity: "22KT",
    carat: "Polki",
    sku: "MAL-HER-NEC-001",
    deliveryEstimate: "7–10 business days",
    rating: 4.9,
    ratingCount: 128,
    createdAt: "2024-10-01T00:00:00.000Z",
    thumbnail: "3dmodel/necklace/18966323.jpg",
    gallery: [
      "3dmodel/necklace/18966323.jpg",
      "3dmodel/glasses-03/glasses_03.png",
    ],
    "3dType": "image",
    assetUrl: "3dmodel/necklace/18966323.jpg",
    anchorConfig: {
      anchorPoint: "neck",
      offset: { x: 0, y: 35, z: 0 },
      baseScale: 0.8,
      rotation: { x: 0, y: Math.PI, z: 0 },
      smoothingAlpha: 0.25,
    },
    variants: [
      {
        id: "malabar-heritage-polki-necklace-yellow",
        metal: "22KT Yellow Gold",
        stone: "Polki, Emerald",
        size: "Free size",
        priceDelta: 0,
      },
      {
        id: "malabar-heritage-polki-necklace-rose",
        metal: "18KT Rose Gold",
        stone: "Polki, Emerald",
        size: "Free size",
        priceDelta: -15000,
      },
    ],
  };

  const shops = [
    {
      id: "malabar-heritage-studio",
      slug: "malabar-heritage-studio",
      displayName: "Malabar Heritage Studio",
      bannerClass: "lux-shop-banner-1",
      rating: 4.9,
      ratingCount: 322,
      shortDescription:
        "Temple-inspired gold, Kundan and Polki sets crafted for weddings and heirloom collections.",
      location: "Kozhikode, Kerala · Ships pan-India",
      contact: {
        phone: "+91-80-1234-5678",
        email: "concierge@malabarheritage.example",
      },
      designCount: 68,
      policies: {
        returns: "7-day exchange on unworn pieces",
        certification:
          "BIS Hallmarked · IGI / GIA certificates where applicable",
      },
      shipping: {
        info: "Insured shipping via secure courier partners",
        regions: ["India"],
      },
      hours: {
        label: "Today 11:00 AM – 8:30 PM IST",
        timezone: "Asia/Kolkata",
      },
      heroImageAlt:
        "Heritage Polki bridal necklace from Malabar Heritage Studio",
      categories: ["necklaces", "earrings", "bridal"],
    },
    {
      id: "zoya-signature-fine-jewellery",
      slug: "zoya-signature-fine-jewellery",
      displayName: "Zoya Signature Fine Jewellery",
      bannerClass: "lux-shop-banner-2",
      rating: 4.8,
      ratingCount: 210,
      shortDescription:
        "Diamond solitaires, halo studs and bracelets with minimalist European finishes.",
      location: "Mumbai, Maharashtra · Global shipping on request",
      contact: {
        phone: "+91-22-5555-7890",
        email: "care@zoyasignature.example",
      },
      designCount: 42,
      policies: {
        returns: "10-day return on ready pieces, custom orders final sale",
        certification: "All diamonds certified by IGI / GIA",
      },
      shipping: {
        info: "Insured shipping, express options for metro cities",
        regions: ["India", "International (select regions)"],
      },
      hours: {
        label: "Today 11:00 AM – 9:00 PM IST",
        timezone: "Asia/Kolkata",
      },
      heroImageAlt: "Diamond halo stud earrings from Zoya Signature",
      categories: ["earrings", "rings", "bracelets"],
    },
    {
      id: "aara-gold-boutique",
      slug: "aara-gold-boutique",
      displayName: "Aara Gold Boutique",
      bannerClass: "lux-shop-banner-3",
      rating: 4.7,
      ratingCount: 156,
      shortDescription:
        "Everyday mangalsutras, stackable rings and nose pins with contemporary silhouettes.",
      location: "Bengaluru, Karnataka · Ships across India",
      contact: {
        phone: "+91-80-9900-1122",
        email: "hello@aaragold.example",
      },
      designCount: 30,
      policies: {
        returns: "Exchange within 5 days on unworn pieces",
        certification: "BIS Hallmarked",
      },
      shipping: {
        info: "Standard and express options available",
        regions: ["India"],
      },
      hours: {
        label: "Today 10:30 AM – 8:00 PM IST",
        timezone: "Asia/Kolkata",
      },
      heroImageAlt: "Modern mangalsutra from Aara Gold Boutique",
      categories: ["mangalsutra", "nose pins", "rings"],
    },
  ];

  const productsByShop = {
    "malabar-heritage-studio": [
      sampleProduct,
      {
        id: "malabar-maangtikka-01",
        shopId: "malabar-heritage-studio",
        slug: "kundan-polki-maang-tikka",
        title: "Kundan Polki Maang Tikka",
        shortDescription:
          "Classic Kundan Polki maang tikka with cascading pearls for sangeet and wedding ceremonies.",
        description:
          "Traditional maang tikka handcrafted in 22KT yellow gold with Kundan Polki diamonds and pearl strings. Adjustable back chain included.",
        price: {
          currency: "INR",
          amount: 52000,
          display: "₹52,000",
        },
        badges: ["AR ready"],
        stockStatus: "in_stock",
        category: "maang-tikka",
        metalType: "22KT Yellow Gold",
        stoneType: "Polki, Pearls",
        weight: "22.3 g",
        purity: "22KT",
        carat: "Polki",
        sku: "MAL-HER-MT-001",
        deliveryEstimate: "5–7 business days",
        rating: 4.8,
        ratingCount: 64,
        createdAt: "2024-09-20T00:00:00.000Z",
        thumbnail: "3dmodel/glasses-01/glasses_01.png",
        gallery: ["3dmodel/glasses-01/glasses_01.png"],
        "3dType": "gltf",
        assetUrl: "3dmodel/jewelry-maang-01/scene.gltf",
        anchorConfig: {
          anchorPoint: "forehead",
          offset: { x: 0, y: -15, z: 0 },
          baseScale: 0.9,
          rotation: { x: 0, y: Math.PI, z: 0 },
          smoothingAlpha: 0.22,
        },
        variants: [
          {
            id: "malabar-maangtikka-01-default",
            metal: "22KT Yellow Gold",
            stone: "Polki, Pearls",
            size: "Free size",
            priceDelta: 0,
          },
        ],
      },
    ],
    "zoya-signature-fine-jewellery": [
      {
        id: "zoya-emerald-halo-studs",
        shopId: "zoya-signature-fine-jewellery",
        slug: "emerald-halo-stud-earrings",
        title: "Emerald Halo Stud Earrings",
        shortDescription:
          "Round-cut emeralds framed with a diamond halo in 18KT white gold.",
        description:
          "Signature halo studs with Zambian emerald centres and full-cut diamonds, set in 18KT white gold for everyday luxury.",
        price: {
          currency: "INR",
          amount: 145000,
          display: "₹1,45,000",
        },
        badges: ["New"],
        stockStatus: "low_stock",
        category: "earrings",
        metalType: "18KT White Gold",
        stoneType: "Emerald, Diamond",
        weight: "12.2 g",
        purity: "18KT",
        carat: "0.96 ctw diamonds",
        sku: "ZOY-SIG-ER-021",
        deliveryEstimate: "6–9 business days",
        rating: 4.9,
        ratingCount: 45,
        createdAt: "2024-11-10T00:00:00.000Z",
        thumbnail: "3dmodel/glasses-02/glasses_02.png",
        gallery: ["3dmodel/glasses-02/glasses_02.png"],
        "3dType": "image",
        assetUrl: "3dmodel/glasses-02/glasses_02.png",
        anchorConfig: {
          anchorPoint: "leftEar",
          offset: { x: -5, y: -5, z: 0 },
          baseScale: 0.06,
          rotation: { x: 0, y: Math.PI, z: 0 },
          smoothingAlpha: 0.3,
        },
        variants: [
          {
            id: "zoya-emerald-halo-studs-white",
            metal: "18KT White Gold",
            stone: "Emerald, Diamond",
            size: "Standard",
            priceDelta: 0,
          },
          {
            id: "zoya-emerald-halo-studs-yellow",
            metal: "18KT Yellow Gold",
            stone: "Emerald, Diamond",
            size: "Standard",
            priceDelta: -8000,
          },
        ],
      },
    ],
    "aara-gold-boutique": [
      {
        id: "aara-rose-mangalsutra-01",
        shopId: "aara-gold-boutique",
        slug: "rose-gold-bar-mangalsutra",
        title: "Rose Gold Bar Mangalsutra",
        shortDescription:
          "Minimalist bar mangalsutra in 18KT rose gold with black beads.",
        description:
          "Contemporary mangalsutra with a slim 18KT rose gold bar, black beads and adjustable chain length for everyday wear.",
        price: {
          currency: "INR",
          amount: 48000,
          display: "₹48,000",
        },
        badges: ["Everyday"],
        stockStatus: "in_stock",
        category: "mangalsutra",
        metalType: "18KT Rose Gold",
        stoneType: "Black beads",
        weight: "18.8 g",
        purity: "18KT",
        carat: "",
        sku: "AAR-MAN-NEC-003",
        deliveryEstimate: "4–6 business days",
        rating: 4.6,
        ratingCount: 39,
        createdAt: "2024-08-12T00:00:00.000Z",
        thumbnail: "3dmodel/glasses-06/glasses_06.png",
        gallery: ["3dmodel/glasses-06/glasses_06.png"],
        "3dType": "procedural",
        assetUrl: "",
        anchorConfig: {
          anchorPoint: "neck",
          offset: { x: 0, y: 28, z: 0 },
          baseScale: 0.03,
          rotation: { x: 0, y: Math.PI, z: 0 },
          smoothingAlpha: 0.25,
        },
        variants: [
          {
            id: "aara-rose-mangalsutra-01-default",
            metal: "18KT Rose Gold",
            stone: "Black beads",
            size: "16 inch",
            priceDelta: 0,
          },
        ],
      },
    ],
  };

  window.LuxShopsData = {
    shops,
    productsByShop,
    sampleProduct,
  };
})(window);
