import {
  boolean,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const ruleTypeEnum = pgEnum("rule_type", ["category", "tag", "price_range", "manual", "llm"]);
export const displayPositionEnum = pgEnum("display_position", ["product_page", "cart", "both"]);
export const eventTypeEnum = pgEnum("event_type", ["impression", "click", "add_to_cart", "purchase"]);
export const pageTypeEnum = pgEnum("page_type", ["product_page", "cart"]);

// Core user table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Shopify store configuration
export const shopifyConfig = pgTable("shopify_config", {
  id: serial("id").primaryKey(),
  storeDomain: varchar("store_domain", { length: 255 }).notNull(),
  storefrontAccessToken: varchar("storefront_access_token", { length: 255 }),
  adminAccessToken: varchar("admin_access_token", { length: 255 }),
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ShopifyConfig = typeof shopifyConfig.$inferSelect;

// Shopify products cache
export const shopifyProducts = pgTable("shopify_products", {
  id: serial("id").primaryKey(),
  shopifyId: varchar("shopify_id", { length: 64 }).notNull().unique(),
  handle: varchar("handle", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  vendor: varchar("vendor", { length: 255 }),
  productType: varchar("product_type", { length: 255 }),
  tags: json("tags").$type<string[]>(),
  collections: json("collections").$type<string[]>(),
  priceMin: numeric("price_min", { precision: 10, scale: 2 }),
  priceMax: numeric("price_max", { precision: 10, scale: 2 }),
  compareAtPriceMin: numeric("compare_at_price_min", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  imageAlt: varchar("image_alt", { length: 500 }),
  productUrl: varchar("product_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  metaData: json("meta_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ShopifyProduct = typeof shopifyProducts.$inferSelect;

// Crosssell rules
export const crosssellRules = pgTable("crosssell_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: ruleTypeEnum("rule_type").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  categoryValue: varchar("category_value", { length: 255 }),
  tagValue: varchar("tag_value", { length: 255 }),
  priceRangePercent: integer("price_range_percent"),
  maxProducts: integer("max_products").default(4).notNull(),
  displayTitle: varchar("display_title", { length: 255 }).default("Bunları Da Beğenebilirsiniz"),
  displayPosition: displayPositionEnum("display_position").default("both").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CrosssellRule = typeof crosssellRules.$inferSelect;

// Manual product pairings
export const manualPairings = pgTable("manual_pairings", {
  id: serial("id").primaryKey(),
  sourceProductId: integer("source_product_id").notNull(),
  targetProductId: integer("target_product_id").notNull(),
  priority: integer("priority").default(0).notNull(),
  discountPercent: integer("discount_percent"),
  bundleTitle: varchar("bundle_title", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ManualPairing = typeof manualPairings.$inferSelect;

// LLM-generated suggestions
export const llmSuggestions = pgTable("llm_suggestions", {
  id: serial("id").primaryKey(),
  sourceProductId: integer("source_product_id").notNull(),
  targetProductId: integer("target_product_id").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  reasoning: text("reasoning"),
  isApproved: boolean("is_approved").default(false).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

export type LlmSuggestion = typeof llmSuggestions.$inferSelect;

// Crosssell events (analytics)
export const crosssellEvents = pgTable("crosssell_events", {
  id: serial("id").primaryKey(),
  eventType: eventTypeEnum("event_type").notNull(),
  sourceProductId: varchar("source_product_id", { length: 64 }),
  targetProductId: varchar("target_product_id", { length: 64 }),
  ruleId: integer("rule_id"),
  ruleType: varchar("rule_type", { length: 64 }),
  sessionId: varchar("session_id", { length: 128 }),
  revenue: numeric("revenue", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("TRY"),
  pageType: pageTypeEnum("page_type"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CrosssellEvent = typeof crosssellEvents.$inferSelect;

// Widget settings
export const widgetSettings = pgTable("widget_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 128 }).notNull().unique(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WidgetSetting = typeof widgetSettings.$inferSelect;
