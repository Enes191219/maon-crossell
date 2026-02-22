import { and, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  CrosssellEvent,
  CrosssellRule,
  InsertUser,
  LlmSuggestion,
  ManualPairing,
  ShopifyConfig,
  ShopifyProduct,
  crosssellEvents,
  crosssellRules,
  llmSuggestions,
  manualPairings,
  shopifyConfig,
  shopifyProducts,
  users,
  widgetSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    values[field] = value ?? null;
    updateSet[field] = value ?? null;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Shopify Config helpers ───────────────────────────────────────────────────

export async function getShopifyConfig(): Promise<ShopifyConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shopifyConfig).where(eq(shopifyConfig.isActive, true)).limit(1);
  return result[0];
}

export async function upsertShopifyConfig(data: {
  storeDomain: string;
  storefrontAccessToken?: string;
  adminAccessToken?: string;
  webhookSecret?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await getShopifyConfig();
  if (existing) {
    await db.update(shopifyConfig).set({ ...data, updatedAt: new Date() }).where(eq(shopifyConfig.id, existing.id));
  } else {
    await db.insert(shopifyConfig).values({ ...data, isActive: true });
  }
  return getShopifyConfig();
}

// ─── Shopify Products helpers ─────────────────────────────────────────────────

export async function upsertShopifyProduct(data: Omit<ShopifyProduct, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(shopifyProducts)
    .values(data)
    .onConflictDoUpdate({
      target: shopifyProducts.shopifyId,
      set: {
        title: data.title,
        description: data.description,
        vendor: data.vendor,
        productType: data.productType,
        tags: data.tags,
        collections: data.collections,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        compareAtPriceMin: data.compareAtPriceMin,
        imageUrl: data.imageUrl,
        imageAlt: data.imageAlt,
        productUrl: data.productUrl,
        isActive: data.isActive,
        metaData: data.metaData,
        updatedAt: new Date(),
      },
    });
}

export async function getAllProducts(activeOnly = true): Promise<ShopifyProduct[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(shopifyProducts).where(eq(shopifyProducts.isActive, true)).orderBy(shopifyProducts.title);
  }
  return db.select().from(shopifyProducts).orderBy(shopifyProducts.title);
}

export async function getProductByShopifyId(shopifyId: string): Promise<ShopifyProduct | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shopifyProducts).where(eq(shopifyProducts.shopifyId, shopifyId)).limit(1);
  return result[0];
}

export async function getProductById(id: number): Promise<ShopifyProduct | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shopifyProducts).where(eq(shopifyProducts.id, id)).limit(1);
  return result[0];
}

// ─── Crosssell Rules helpers ──────────────────────────────────────────────────

export async function getAllRules(activeOnly = false): Promise<CrosssellRule[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db
      .select()
      .from(crosssellRules)
      .where(eq(crosssellRules.isActive, true))
      .orderBy(desc(crosssellRules.priority));
  }
  return db.select().from(crosssellRules).orderBy(desc(crosssellRules.priority));
}

export async function getRuleById(id: number): Promise<CrosssellRule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(crosssellRules).where(eq(crosssellRules.id, id)).limit(1);
  return result[0];
}

export async function createRule(data: Omit<CrosssellRule, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return;
  await db.insert(crosssellRules).values(data);
}

export async function updateRule(id: number, data: Partial<Omit<CrosssellRule, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crosssellRules).set({ ...data, updatedAt: new Date() }).where(eq(crosssellRules.id, id));
}

export async function deleteRule(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crosssellRules).where(eq(crosssellRules.id, id));
}

// ─── Manual Pairings helpers ──────────────────────────────────────────────────

export async function getAllPairings(): Promise<ManualPairing[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(manualPairings).orderBy(desc(manualPairings.priority));
}

export async function getPairingsForProduct(sourceProductId: number): Promise<ManualPairing[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(manualPairings)
    .where(and(eq(manualPairings.sourceProductId, sourceProductId), eq(manualPairings.isActive, true)))
    .orderBy(desc(manualPairings.priority));
}

export async function createPairing(data: Omit<ManualPairing, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) return;
  await db.insert(manualPairings).values(data);
}

export async function updatePairing(id: number, data: Partial<Omit<ManualPairing, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) return;
  await db.update(manualPairings).set({ ...data, updatedAt: new Date() }).where(eq(manualPairings.id, id));
}

export async function deletePairing(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(manualPairings).where(eq(manualPairings.id, id));
}

// ─── LLM Suggestions helpers ──────────────────────────────────────────────────

export async function getLlmSuggestions(approvedOnly = false): Promise<LlmSuggestion[]> {
  const db = await getDb();
  if (!db) return [];
  if (approvedOnly) {
    return db.select().from(llmSuggestions).where(eq(llmSuggestions.isApproved, true));
  }
  return db.select().from(llmSuggestions).orderBy(desc(llmSuggestions.generatedAt));
}

export async function saveLlmSuggestions(
  suggestions: Array<{ sourceProductId: number; targetProductId: number; confidence: string; reasoning: string }>
) {
  const db = await getDb();
  if (!db) return;
  if (suggestions.length === 0) return;
  await db.insert(llmSuggestions).values(suggestions);
}

export async function approveLlmSuggestion(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(llmSuggestions)
    .set({ isApproved: true, approvedAt: new Date() })
    .where(eq(llmSuggestions.id, id));
}

export async function deleteLlmSuggestion(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(llmSuggestions).where(eq(llmSuggestions.id, id));
}

// ─── Crosssell Engine ─────────────────────────────────────────────────────────

export async function getCrosssellRecommendations(
  shopifyProductId: string,
  position: "product_page" | "cart",
  limit = 4
): Promise<ShopifyProduct[]> {
  const db = await getDb();
  if (!db) return [];

  const sourceProduct = await getProductByShopifyId(shopifyProductId);
  if (!sourceProduct) return [];

  const rules = await getAllRules(true);
  const recommendations: Map<number, ShopifyProduct> = new Map();

  for (const rule of rules) {
    if (rule.displayPosition !== "both" && rule.displayPosition !== position) continue;
    if (recommendations.size >= limit) break;

    const ruleProducts = await getProductsByRule(rule, sourceProduct, limit - recommendations.size);
    for (const p of ruleProducts) {
      if (!recommendations.has(p.id)) {
        recommendations.set(p.id, p);
      }
    }
  }

  // Fill with manual pairings if not enough
  if (recommendations.size < limit) {
    const manualResults = await getPairingsForProduct(sourceProduct.id);
    for (const pairing of manualResults) {
      if (recommendations.size >= limit) break;
      const product = await getProductById(pairing.targetProductId);
      if (product && !recommendations.has(product.id)) {
        recommendations.set(product.id, product);
      }
    }
  }

  // Fill with LLM suggestions if still not enough
  if (recommendations.size < limit) {
    const llmApproved = await getLlmSuggestions(true);
    for (const suggestion of llmApproved) {
      if (recommendations.size >= limit) break;
      if (suggestion.sourceProductId !== sourceProduct.id) continue;
      const product = await getProductById(suggestion.targetProductId);
      if (product && !recommendations.has(product.id)) {
        recommendations.set(product.id, product);
      }
    }
  }

  return Array.from(recommendations.values()).slice(0, limit);
}

async function getProductsByRule(
  rule: CrosssellRule,
  sourceProduct: ShopifyProduct,
  limit: number
): Promise<ShopifyProduct[]> {
  const db = await getDb();
  if (!db) return [];

  switch (rule.ruleType) {
    case "category": {
      if (!sourceProduct.collections || sourceProduct.collections.length === 0) return [];
      const allProducts = await getAllProducts(true);
      return allProducts
        .filter(
          (p) =>
            p.id !== sourceProduct.id &&
            p.collections &&
            p.collections.some((c) => sourceProduct.collections?.includes(c))
        )
        .slice(0, limit);
    }
    case "tag": {
      if (!sourceProduct.tags || sourceProduct.tags.length === 0) return [];
      const allProducts = await getAllProducts(true);
      return allProducts
        .filter(
          (p) =>
            p.id !== sourceProduct.id &&
            p.tags &&
            p.tags.some((t) => sourceProduct.tags?.includes(t))
        )
        .slice(0, limit);
    }
    case "price_range": {
      const percent = rule.priceRangePercent ?? 30;
      const price = parseFloat(sourceProduct.priceMin ?? "0");
      if (price === 0) return [];
      const minPrice = price * (1 - percent / 100);
      const maxPrice = price * (1 + percent / 100);
      const allProducts = await getAllProducts(true);
      return allProducts
        .filter((p) => {
          if (p.id === sourceProduct.id) return false;
          const pPrice = parseFloat(p.priceMin ?? "0");
          return pPrice >= minPrice && pPrice <= maxPrice;
        })
        .slice(0, limit);
    }
    default:
      return [];
  }
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export async function recordEvent(data: Omit<CrosssellEvent, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return;
  await db.insert(crosssellEvents).values(data);
}

export async function getAnalyticsSummary(days = 30) {
  const db = await getDb();
  if (!db) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db
    .select()
    .from(crosssellEvents)
    .where(gte(crosssellEvents.createdAt, since));

  const impressions = events.filter((e) => e.eventType === "impression").length;
  const clicks = events.filter((e) => e.eventType === "click").length;
  const addToCarts = events.filter((e) => e.eventType === "add_to_cart").length;
  const purchases = events.filter((e) => e.eventType === "purchase").length;
  const revenue = events
    .filter((e) => e.eventType === "purchase" && e.revenue)
    .reduce((sum, e) => sum + parseFloat(e.revenue ?? "0"), 0);

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;

  return { impressions, clicks, addToCarts, purchases, revenue, ctr, conversionRate, days };
}

export async function getDailyAnalytics(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await db
    .select()
    .from(crosssellEvents)
    .where(gte(crosssellEvents.createdAt, since))
    .orderBy(crosssellEvents.createdAt);

  const byDay: Record<string, { date: string; impressions: number; clicks: number; purchases: number; revenue: number }> = {};
  for (const event of events) {
    const day = event.createdAt.toISOString().split("T")[0];
    if (!byDay[day]) byDay[day] = { date: day, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
    if (event.eventType === "impression") byDay[day].impressions++;
    if (event.eventType === "click") byDay[day].clicks++;
    if (event.eventType === "purchase") {
      byDay[day].purchases++;
      byDay[day].revenue += parseFloat(event.revenue ?? "0");
    }
  }
  return Object.values(byDay);
}

export async function getTopPerformingProducts(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await db
    .select()
    .from(crosssellEvents)
    .where(and(gte(crosssellEvents.createdAt, since), eq(crosssellEvents.eventType, "purchase")));

  const productRevenue: Record<string, number> = {};
  for (const event of events) {
    if (!event.targetProductId) continue;
    productRevenue[event.targetProductId] = (productRevenue[event.targetProductId] ?? 0) + parseFloat(event.revenue ?? "0");
  }

  return Object.entries(productRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([shopifyId, revenue]) => ({ shopifyId, revenue }));
}

// ─── Widget Settings helpers ──────────────────────────────────────────────────

export async function getWidgetSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(widgetSettings).where(eq(widgetSettings.settingKey, key)).limit(1);
  return result[0]?.settingValue ?? null;
}

export async function setWidgetSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(widgetSettings)
    .values({ settingKey: key, settingValue: value })
    .onConflictDoUpdate({ target: widgetSettings.settingKey, set: { settingValue: value, updatedAt: new Date() } });
}

export async function getAllWidgetSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const settings = await db.select().from(widgetSettings);
  return Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue ?? ""]));
}
