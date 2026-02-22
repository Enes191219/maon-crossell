import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB functions
vi.mock("./db", () => ({
  getAllRules: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Cüzdan Kategorisi",
      description: "Cüzdan kategorisindeki ürünleri öner",
      ruleType: "category",
      isActive: true,
      priority: 10,
      categoryValue: "Cüzdan",
      tagValue: null,
      priceRangePercent: null,
      maxProducts: 4,
      displayTitle: "Bunları Da Beğenebilirsiniz",
      displayPosition: "both",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getRuleById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Cüzdan Kategorisi",
    ruleType: "category",
    isActive: true,
    priority: 10,
    categoryValue: "Cüzdan",
    tagValue: null,
    priceRangePercent: null,
    maxProducts: 4,
    displayTitle: "Bunları Da Beğenebilirsiniz",
    displayPosition: "both",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createRule: vi.fn().mockResolvedValue(undefined),
  updateRule: vi.fn().mockResolvedValue(undefined),
  deleteRule: vi.fn().mockResolvedValue(undefined),
  getAllPairings: vi.fn().mockResolvedValue([]),
  createPairing: vi.fn().mockResolvedValue(undefined),
  updatePairing: vi.fn().mockResolvedValue(undefined),
  deletePairing: vi.fn().mockResolvedValue(undefined),
  getAllProducts: vi.fn().mockResolvedValue([
    {
      id: 1,
      shopifyId: "123456",
      handle: "altay-minimal-cuzdan",
      title: "Altay Minimal Cüzdan",
      description: "Zarif deri cüzdan",
      vendor: "Maon",
      productType: "Cüzdan",
      tags: ["Minimal", "Hakiki Deri"],
      collections: ["Cüzdan"],
      priceMin: "599.00",
      priceMax: "599.00",
      compareAtPriceMin: null,
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Altay Minimal Cüzdan",
      productUrl: "https://maon.co/products/altay-minimal-cuzdan",
      isActive: true,
      metaData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getProductById: vi.fn().mockResolvedValue(null),
  getProductByShopifyId: vi.fn().mockResolvedValue(null),
  upsertShopifyProduct: vi.fn().mockResolvedValue(undefined),
  getShopifyConfig: vi.fn().mockResolvedValue(null),
  upsertShopifyConfig: vi.fn().mockResolvedValue({ id: 1 }),
  getAllWidgetSettings: vi.fn().mockResolvedValue({
    widget_title: "Bunları Da Beğenebilirsiniz",
    widget_accent_color: "#C9A84C",
    widget_max_products: "4",
  }),
  getWidgetSetting: vi.fn().mockResolvedValue(null),
  setWidgetSetting: vi.fn().mockResolvedValue(undefined),
  getCrosssellRecommendations: vi.fn().mockResolvedValue([]),
  recordEvent: vi.fn().mockResolvedValue(undefined),
  getAnalyticsSummary: vi.fn().mockResolvedValue({
    impressions: 0,
    clicks: 0,
    addToCarts: 0,
    purchases: 0,
    revenue: 0,
    ctr: 0,
    conversionRate: 0,
  }),
  getDailyAnalytics: vi.fn().mockResolvedValue([]),
  getTopPerformingProducts: vi.fn().mockResolvedValue([]),
  getLlmSuggestions: vi.fn().mockResolvedValue([]),
  saveLlmSuggestions: vi.fn().mockResolvedValue(undefined),
  approveLlmSuggestion: vi.fn().mockResolvedValue(undefined),
  deleteLlmSuggestion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./shopify", () => ({
  fetchAndSyncProducts: vi.fn().mockResolvedValue({ synced: 5, errors: [] }),
  verifyShopifyConnection: vi.fn().mockResolvedValue({ success: true, shopName: "Maon" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            suggestions: [
              { productId: 1, confidence: 0.85, reasoning: "Aynı kategoride tamamlayıcı ürün" },
            ],
          }),
        },
      },
    ],
  }),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@maon.co",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Crosssell Rules API", () => {
  it("admin can list rules", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const rules = await caller.rules.list();
    expect(rules).toHaveLength(1);
    expect(rules[0].name).toBe("Cüzdan Kategorisi");
    expect(rules[0].ruleType).toBe("category");
  });

  it("admin can create a rule", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.rules.create({
      name: "Etiket Bazlı Kural",
      ruleType: "tag",
      tagValue: "Minimal",
      isActive: true,
      priority: 5,
      maxProducts: 4,
      displayPosition: "both",
    });
    expect(result.success).toBe(true);
  });

  it("admin can update a rule", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.rules.update({ id: 1, isActive: false });
    expect(result.success).toBe(true);
  });

  it("admin can delete a rule", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.rules.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot create rules", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rules.create({
      name: "Test",
      ruleType: "category",
      isActive: true,
      priority: 0,
      maxProducts: 4,
      displayPosition: "both",
    })).rejects.toThrow();
  });
});

describe("Widget API", () => {
  it("public can get recommendations", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.widget.getRecommendations({
      shopifyProductId: "123456",
      position: "product_page",
      limit: 4,
    });
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("settings");
    expect(result.settings.title).toBe("Bunları Da Beğenebilirsiniz");
  });

  it("public can track events", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.widget.trackEvent({
      eventType: "impression",
      sourceProductId: "123456",
      pageType: "product_page",
    });
    expect(result.success).toBe(true);
  });

  it("admin can update widget settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.widget.updateSettings({
      widget_title: "Önerilen Ürünler",
      widget_accent_color: "#C9A84C",
    });
    expect(result.success).toBe(true);
  });
});

describe("Analytics API", () => {
  it("admin can get analytics summary", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const summary = await caller.analytics.summary({ days: 30 });
    expect(summary).toHaveProperty("impressions");
    expect(summary).toHaveProperty("clicks");
    expect(summary).toHaveProperty("ctr");
    expect(summary).toHaveProperty("conversionRate");
    expect(summary).toHaveProperty("revenue");
  });

  it("non-admin cannot access analytics", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.analytics.summary({ days: 30 })).rejects.toThrow();
  });
});

describe("Shopify Config API", () => {
  it("admin can save shopify config", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.shopify.saveConfig({
      storeDomain: "maon.co",
      storefrontAccessToken: "test-token",
    });
    expect(result).toBeDefined();
  });

  it("admin can sync products", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.shopify.syncProducts();
    expect(result.synced).toBe(5);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Products API", () => {
  it("admin can list products", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const products = await caller.products.list();
    expect(products).toHaveLength(1);
    expect(products[0].title).toBe("Altay Minimal Cüzdan");
  });
});
