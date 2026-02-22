import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// Core user table
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Shopify store configuration
export const shopifyConfig = mysqlTable("shopify_config", {
  id: int("id").autoincrement().primaryKey(),
  storeDomain: varchar("store_domain", { length: 255 }).notNull(),
  storefrontAccessToken: varchar("storefront_access_token", { length: 255 }),
  adminAccessToken: varchar("admin_access_token", { length: 255 }),
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ShopifyConfig = typeof shopifyConfig.$inferSelect;

// Shopify products cache
export const shopifyProducts = mysqlTable("shopify_products", {
  id: int("id").autoincrement().primaryKey(),
  shopifyId: varchar("shopify_id", { length: 64 }).notNull().unique(),
  handle: varchar("handle", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  vendor: varchar("vendor", { length: 255 }),
  productType: varchar("product_type", { length: 255 }),
  tags: json("tags").$type<string[]>(),
  collections: json("collections").$type<string[]>(),
  priceMin: decimal("price_min", { precision: 10, scale: 2 }),
  priceMax: decimal("price_max", { precision: 10, scale: 2 }),
  compareAtPriceMin: decimal("compare_at_price_min", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  imageAlt: varchar("image_alt", { length: 500 }),
  productUrl: varchar("product_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  metaData: json("meta_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ShopifyProduct = typeof shopifyProducts.$inferSelect;

// Crosssell rules
export const crosssellRules = mysqlTable("crosssell_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: mysqlEnum("rule_type", ["category", "tag", "price_range", "manual", "llm"]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: int("priority").default(0).notNull(),
  // Category rule: match products in same collection
  categoryValue: varchar("category_value", { length: 255 }),
  // Tag rule: match products with same tag
  tagValue: varchar("tag_value", { length: 255 }),
  // Price range rule: match products within X% of price
  priceRangePercent: int("price_range_percent"),
  // Display settings
  maxProducts: int("max_products").default(4).notNull(),
  displayTitle: varchar("display_title", { length: 255 }).default("Bunları Da Beğenebilirsiniz"),
  displayPosition: mysqlEnum("display_position", ["product_page", "cart", "both"]).default("both").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CrosssellRule = typeof crosssellRules.$inferSelect;

// Manual product pairings
export const manualPairings = mysqlTable("manual_pairings", {
  id: int("id").autoincrement().primaryKey(),
  sourceProductId: int("source_product_id").notNull(),
  targetProductId: int("target_product_id").notNull(),
  priority: int("priority").default(0).notNull(),
  discountPercent: int("discount_percent"),
  bundleTitle: varchar("bundle_title", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ManualPairing = typeof manualPairings.$inferSelect;

// LLM-generated suggestions
export const llmSuggestions = mysqlTable("llm_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  sourceProductId: int("source_product_id").notNull(),
  targetProductId: int("target_product_id").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  reasoning: text("reasoning"),
  isApproved: boolean("is_approved").default(false).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

export type LlmSuggestion = typeof llmSuggestions.$inferSelect;

// Crosssell events (analytics)
export const crosssellEvents = mysqlTable("crosssell_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: mysqlEnum("event_type", ["impression", "click", "add_to_cart", "purchase"]).notNull(),
  sourceProductId: varchar("source_product_id", { length: 64 }),
  targetProductId: varchar("target_product_id", { length: 64 }),
  ruleId: int("rule_id"),
  ruleType: varchar("rule_type", { length: 64 }),
  sessionId: varchar("session_id", { length: 128 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("TRY"),
  pageType: mysqlEnum("page_type", ["product_page", "cart"]),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CrosssellEvent = typeof crosssellEvents.$inferSelect;

// Widget settings
export const widgetSettings = mysqlTable("widget_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("setting_key", { length: 128 }).notNull().unique(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WidgetSetting = typeof widgetSettings.$inferSelect;
