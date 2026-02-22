ALTER TABLE `crosssell_events` MODIFY COLUMN `metadata` json;--> statement-breakpoint
ALTER TABLE `shopify_products` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `shopify_products` MODIFY COLUMN `collections` json;--> statement-breakpoint
ALTER TABLE `shopify_products` MODIFY COLUMN `meta_data` json;