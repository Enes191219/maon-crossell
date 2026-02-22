import { getShopifyConfig, upsertShopifyProduct } from "./db";

interface ShopifyProductNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  compareAtPriceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage: { url: string; altText: string | null } | null;
  collections: { nodes: Array<{ title: string; handle: string }> };
  onlineStoreUrl: string | null;
}

const STOREFRONT_QUERY = `
  query GetAllProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        handle
        title
        description
        vendor
        productType
        tags
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        compareAtPriceRange {
          minVariantPrice { amount currencyCode }
        }
        featuredImage { url altText }
        collections(first: 10) {
          nodes { title handle }
        }
        onlineStoreUrl
      }
    }
  }
`;

export async function fetchAndSyncProducts(): Promise<{ synced: number; errors: string[] }> {
  const config = await getShopifyConfig();
  if (!config?.storeDomain || !config?.storefrontAccessToken) {
    return { synced: 0, errors: ["Shopify yapılandırması eksik. Lütfen mağaza bilgilerini girin."] };
  }

  const domain = config.storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const endpoint = `https://${domain}/api/2024-01/graphql.json`;

  let cursor: string | null = null;
  let hasNextPage = true;
  let synced = 0;
  const errors: string[] = [];

  while (hasNextPage) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken,
        },
        body: JSON.stringify({ query: STOREFRONT_QUERY, variables: { cursor } }),
      });

      if (!response.ok) {
        errors.push(`API hatası: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json() as {
        data?: { products?: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ShopifyProductNode[] } };
        errors?: Array<{ message: string }>;
      };

      if (data.errors) {
        errors.push(...data.errors.map((e) => e.message));
        break;
      }

      const products = data.data?.products;
      if (!products) break;

      for (const node of products.nodes) {
        try {
          const shopifyId = node.id.replace("gid://shopify/Product/", "");
          const collections = node.collections.nodes.map((c) => c.title);
          const productUrl = node.onlineStoreUrl ?? `https://${domain}/products/${node.handle}`;

          await upsertShopifyProduct({
            shopifyId,
            handle: node.handle,
            title: node.title,
            description: node.description || null,
            vendor: node.vendor || null,
            productType: node.productType || null,
            tags: node.tags,
            collections,
            priceMin: node.priceRange.minVariantPrice.amount,
            priceMax: node.priceRange.maxVariantPrice.amount,
            compareAtPriceMin: node.compareAtPriceRange.minVariantPrice.amount || null,
            imageUrl: node.featuredImage?.url || null,
            imageAlt: node.featuredImage?.altText || null,
            productUrl,
            isActive: true,
            metaData: null,
          });
          synced++;
        } catch (err) {
          errors.push(`Ürün senkronizasyon hatası (${node.handle}): ${err}`);
        }
      }

      hasNextPage = products.pageInfo.hasNextPage;
      cursor = products.pageInfo.endCursor;
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
    const endpoint = `https://${domain}/api/2024-01/graphql.json`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({
        query: `{ shop { name } }`,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json() as { data?: { shop?: { name: string } }; errors?: Array<{ message: string }> };
    if (data.errors) {
      return { success: false, error: data.errors[0]?.message };
    }

    return { success: true, shopName: data.data?.shop?.name };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
