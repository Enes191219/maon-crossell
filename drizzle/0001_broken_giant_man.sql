CREATE TABLE `crosssell_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` enum('impression','click','add_to_cart','purchase') NOT NULL,
	`source_product_id` varchar(64),
	`target_product_id` varchar(64),
	`rule_id` int,
	`rule_type` varchar(64),
	`session_id` varchar(128),
	`revenue` decimal(10,2),
	`currency` varchar(8) DEFAULT 'TRY',
	`page_type` enum('product_page','cart'),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crosssell_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crosssell_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`rule_type` enum('category','tag','price_range','manual','llm') NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 0,
	`category_value` varchar(255),
	`tag_value` varchar(255),
	`price_range_percent` int,
	`max_products` int NOT NULL DEFAULT 4,
	`display_title` varchar(255) DEFAULT 'Bunları Da Beğenebilirsiniz',
	`display_position` enum('product_page','cart','both') NOT NULL DEFAULT 'both',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crosssell_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_product_id` int NOT NULL,
	`target_product_id` int NOT NULL,
	`confidence` decimal(5,4),
	`reasoning` text,
	`is_approved` boolean NOT NULL DEFAULT false,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`approved_at` timestamp,
	CONSTRAINT `llm_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manual_pairings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_product_id` int NOT NULL,
	`target_product_id` int NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`discount_percent` int,
	`bundle_title` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manual_pairings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopify_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`store_domain` varchar(255) NOT NULL,
	`storefront_access_token` varchar(255),
	`admin_access_token` varchar(255),
	`webhook_secret` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`last_sync_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopify_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopify_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopify_id` varchar(64) NOT NULL,
	`handle` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`vendor` varchar(255),
	`product_type` varchar(255),
	`tags` json,
	`collections` json,
	`price_min` decimal(10,2),
	`price_max` decimal(10,2),
	`compare_at_price_min` decimal(10,2),
	`image_url` text,
	`image_alt` varchar(500),
	`product_url` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`meta_data` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopify_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopify_products_shopify_id_unique` UNIQUE(`shopify_id`)
);
--> statement-breakpoint
CREATE TABLE `widget_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(128) NOT NULL,
	`setting_value` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `widget_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `widget_settings_setting_key_unique` UNIQUE(`setting_key`)
);
