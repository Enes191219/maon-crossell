CREATE TYPE "public"."display_position" AS ENUM('product_page', 'cart', 'both');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('impression', 'click', 'add_to_cart', 'purchase');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('product_page', 'cart');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('category', 'tag', 'price_range', 'manual', 'llm');--> statement-breakpoint
CREATE TABLE "crosssell_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" "event_type" NOT NULL,
	"source_product_id" varchar(64),
	"target_product_id" varchar(64),
	"rule_id" integer,
	"rule_type" varchar(64),
	"session_id" varchar(128),
	"revenue" numeric(10, 2),
	"currency" varchar(8) DEFAULT 'TRY',
	"page_type" "page_type",
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosssell_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"rule_type" "rule_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"category_value" varchar(255),
	"tag_value" varchar(255),
	"price_range_percent" integer,
	"max_products" integer DEFAULT 4 NOT NULL,
	"display_title" varchar(255) DEFAULT 'Bunları Da Beğenebilirsiniz',
	"display_position" "display_position" DEFAULT 'both' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_product_id" integer NOT NULL,
	"target_product_id" integer NOT NULL,
	"confidence" numeric(5, 4),
	"reasoning" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "manual_pairings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_product_id" integer NOT NULL,
	"target_product_id" integer NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"discount_percent" integer,
	"bundle_title" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_domain" varchar(255) NOT NULL,
	"storefront_access_token" varchar(255),
	"admin_access_token" varchar(255),
	"webhook_secret" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"shopify_id" varchar(64) NOT NULL,
	"handle" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"vendor" varchar(255),
	"product_type" varchar(255),
	"tags" json,
	"collections" json,
	"price_min" numeric(10, 2),
	"price_max" numeric(10, 2),
	"compare_at_price_min" numeric(10, 2),
	"image_url" text,
	"image_alt" varchar(500),
	"product_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"meta_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shopify_products_shopify_id_unique" UNIQUE("shopify_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "widget_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(128) NOT NULL,
	"setting_value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "widget_settings_setting_key_unique" UNIQUE("setting_key")
);
