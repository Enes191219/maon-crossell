import { getShopifyConfig, upsertShopifyProduct } from "./db";

interface ShopifyAdminProduct {
  id: number;
  handle: string;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  tags: string;
  variants: Array<{
    price: string;
    compare_at_price: string | null;
  }>;
  image: { src: string; alt: string | null } | null;
  images: Array<{ src: string; alt: string | null }>;
}

interface ShopifyCollection {
  id: number;
  handle: string;
  title: string;
}

interface ShopifyCollect {
  id: number;
  product_id: number;
  collection_id: number;
}

async function fetchCollectionMap(baseUrl: string, token: string): Promise<Map<number, string[]>> {
  const productCollections = new Map<number, string[]>();

  try {
    // 1. Fetch all custom collections
    const collections: ShopifyCollection[] = [];
    let page_info: string | null = null;
    let hasMore = true;

    // Fetch custom collections
    while (hasMore) {
      const url = page_info
        ? `${baseUrl}/custom_collections.json?limit=250&page_info=${page_info}`
        : `${baseUrl}/custom_collections.json?limit=250`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      });
      if (!res.ok) break;
      const data = await res.json() as { custom_collections: ShopifyCollection[] };
      collections.push(...(data.custom_collections || []));

      // Check Link header for pagination
      const linkHeader = res.headers.get("link");
      if (linkHeader?.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^>&]*)/);
        page_info = match?.[1] ?? null;
      } else {
        hasMore = false;
      }
      if ((data.custom_collections || []).length < 250) hasMore = false;
      await new Promise((r) => setTimeout(r, 250));
    }

    // Fetch smart collections
    hasMore = true;
    page_info = null;
    while (hasMore) {
      const url = page_info
        ? `${baseUrl}/smart_collections.json?limit=250&page_info=${page_info}`
        : `${baseUrl}/smart_collections.json?limit=250`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      });
      if (!res.ok) break;
      const data = await res.json() as { smart_collections: ShopifyCollection[] };
      collections.push(...(data.smart_collections || []));
      if ((data.smart_collections || []).length < 250) hasMore = false;
      await new Promise((r) => setTimeout(r, 250));
    }

    // Build collection ID → title map
    const collectionTitleMap = new Map<number, string>();
    for (const c of collections) {
      collectionTitleMap.set(c.id, c.title);
    }

    // 2. Fetch collects (product-collection associations)
    hasMore = true;
    let sinceId = 0;
    while (hasMore) {
      const url = `${baseUrl}/collects.json?limit=250&since_id=${sinceId}`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      });
      if (!res.ok) break;
      const data = await res.json() as { collects: ShopifyCollect[] };
      const collects = data.collects || [];

      for (const collect of collects) {
        const title = collectionTitleMap.get(collect.collection_id);
        if (title) {
          const existing = productCollections.get(collect.product_id) || [];
          existing.push(title);
          productCollections.set(collect.product_id, existing);
        }
      }

      if (collects.length < 250) {
        hasMore = false;
      } else {
        sinceId = collects[collects.length - 1].id;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  } catch (err) {
    console.error("Koleksiyon bilgisi alınamadı:", err);
  }

  return productCollections;
}

export async function fetchAndSyncProducts(): Promise<{ synced: number; errors: string[] }> {
  const config = await getShopifyConfig();

  // Use adminAccessToken (shpat_) or fall back to storefrontAccessToken
  const token = config?.adminAccessToken || config?.storefrontAccessToken;

  if (!config?.storeDomain || !token) {
    return { synced: 0, errors: ["Shopify yapılandırması eksik. Lütfen mağaza bilgilerini ve Admin API token'ını girin."] };
  }

  const domain = config.storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const apiVersion = "2024-01";
  const baseUrl = `https://${domain}/admin/api/${apiVersion}`;

  // Fetch collection mapping first
  console.log("[Shopify Sync] Koleksiyonlar alınıyor...");
  const collectionMap = await fetchCollectionMap(baseUrl, token);
  console.log(`[Shopify Sync] ${collectionMap.size} ürün-koleksiyon ilişkisi bulundu`);

  let synced = 0;
  const errors: string[] = [];
  let sinceId = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${baseUrl}/products.json?limit=250&since_id=${sinceId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
      });

      if (!response.ok) {
        errors.push(`API hatası: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json() as { products: ShopifyAdminProduct[] };
      const products = data.products || [];

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      for (const product of products) {
        try {
          const prices = product.variants.map((v) => parseFloat(v.price));
          const comparePrices = product.variants
            .map((v) => v.compare_at_price ? parseFloat(v.compare_at_price) : null)
            .filter((p): p is number => p !== null);

          const priceMin = Math.min(...prices).toFixed(2);
          const priceMax = Math.max(...prices).toFixed(2);
          const compareAtPriceMin = comparePrices.length > 0 ? Math.min(...comparePrices).toFixed(2) : null;

          const tags = product.tags ? product.tags.split(", ").filter(Boolean) : [];
          const collections = collectionMap.get(product.id) || [];
          const productUrl = `https://${domain}/products/${product.handle}`;
          const imageUrl = product.image?.src || (product.images?.[0]?.src ?? null);
          const imageAlt = product.image?.alt || (product.images?.[0]?.alt ?? null);

          await upsertShopifyProduct({
            shopifyId: String(product.id),
            handle: product.handle,
            title: product.title,
            description: product.body_html || null,
            vendor: product.vendor || null,
            productType: product.product_type || null,
            tags,
            collections,
            priceMin,
            priceMax,
            compareAtPriceMin,
            imageUrl,
            imageAlt,
            productUrl,
            isActive: true,
            metaData: null,
          });
          synced++;
        } catch (err) {
          errors.push(`Ürün senkronizasyon hatası (${product.handle}): ${err}`);
        }
      }

      // Pagination: use since_id of last product
      sinceId = products[products.length - 1].id;

      // If we got less than 250 products, we're done
      if (products.length < 250) {
        hasMore = false;
      }

      // Rate limit safety
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      errors.push(`Ağ hatası: ${err}`);
      break;
    }
  }

  return { synced, errors };
}

export async function verifyShopifyConnection(
  storeDomain: string,
  storefrontAccessToken: string
): Promise<{ success: boolean; error?: string; shopName?: string }> {
  try {
    const domain = storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

    // Try Admin API first (shpat_ token)
    const adminUrl = `https://${domain}/admin/api/2024-01/shop.json`;
    const response = await fetch(adminUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": storefrontAccessToken,
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json() as { shop?: { name: string } };
    if (data.shop) {
      return { success: true, shopName: data.shop.name };
    }

    return { success: false, error: "Mağaza bilgisi alınamadı" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
