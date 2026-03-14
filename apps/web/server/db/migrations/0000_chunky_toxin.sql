CREATE TABLE `auth_challenges` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`purpose` enum('login','password_reset') NOT NULL,
	`channel` enum('email') NOT NULL DEFAULT 'email',
	`challenge_token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`consumed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auth_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_challenges_challenge_token_hash_unique` UNIQUE(`challenge_token_hash`)
);
--> statement-breakpoint
CREATE TABLE `authors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`full_name` varchar(150) NOT NULL,
	`role` varchar(60) NOT NULL,
	CONSTRAINT `authors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalog_item_translations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`language_code` varchar(10) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`content_path` varchar(512),
	`content_format` enum('txt','html_like','markdown','image_sequence') NOT NULL,
	CONSTRAINT `catalog_item_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_catalog_item_translations_item_lang` UNIQUE(`item_id`,`language_code`)
);
--> statement-breakpoint
CREATE TABLE `catalog_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('book','comic','manga','newspaper') NOT NULL,
	`fulfillment_type` enum('digital','physical') NOT NULL DEFAULT 'digital',
	`publisher_id` int,
	`age_rating_min` int NOT NULL DEFAULT 0,
	`release_date` date,
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`isbn` varchar(32),
	`source` enum('internal','api') NOT NULL DEFAULT 'internal',
	`external_provider` varchar(100),
	`external_id` varchar(191),
	`avg_rating` decimal(3,2),
	`views_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`body` text NOT NULL,
	`rating` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`language_code` varchar(10) NOT NULL,
	`locator_start` varchar(100) NOT NULL,
	`locator_end` varchar(100) NOT NULL,
	`selected_text` text NOT NULL,
	`note` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_authors` (
	`item_id` int NOT NULL,
	`author_id` int NOT NULL,
	CONSTRAINT `item_authors_item_id_author_id_pk` PRIMARY KEY(`item_id`,`author_id`)
);
--> statement-breakpoint
CREATE TABLE `item_categories` (
	`item_id` int NOT NULL,
	`category_id` int NOT NULL,
	CONSTRAINT `item_categories_item_id_category_id_pk` PRIMARY KEY(`item_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `item_licenses` (
	`item_id` int NOT NULL,
	`available_copies` int NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `item_licenses_item_id` PRIMARY KEY(`item_id`)
);
--> statement-breakpoint
CREATE TABLE `item_likes` (
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `item_likes_user_id_item_id_pk` PRIMARY KEY(`user_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `item_media` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`language_code` varchar(10),
	`media_type` enum('cover','page','image') NOT NULL,
	`storage_path` varchar(512) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `item_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `library_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`source` enum('saved','purchased') NOT NULL,
	`added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `library_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_library_items_user_item_source` UNIQUE(`user_id`,`item_id`,`source`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`order_id` bigint NOT NULL,
	`item_id` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`status` enum('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
	`total_amount` decimal(10,2) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`order_id` bigint NOT NULL,
	`provider` enum('stripe','simulated') NOT NULL,
	`provider_tx_id` varchar(191),
	`status` enum('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
	`paid_at` datetime,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publishers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	CONSTRAINT `publishers_id` PRIMARY KEY(`id`),
	CONSTRAINT `publishers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_id` int NOT NULL,
	`language_code` varchar(10) NOT NULL,
	`locator` varchar(120) NOT NULL,
	`percentage` decimal(5,2) NOT NULL,
	`last_read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `reading_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_reading_progress_user_item` UNIQUE(`user_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('comic','manga') NOT NULL,
	CONSTRAINT `series_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `series_entries` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`series_id` int NOT NULL,
	`item_id` int NOT NULL,
	`volume_no` decimal(5,2),
	`chapter_no` int,
	`entry_order` int NOT NULL,
	CONSTRAINT `series_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_series_entries_series_item` UNIQUE(`series_id`,`item_id`),
	CONSTRAINT `uq_series_entries_order` UNIQUE(`series_id`,`entry_order`)
);
--> statement-breakpoint
CREATE TABLE `user_languages` (
	`user_id` int NOT NULL,
	`language_code` varchar(10) NOT NULL,
	CONSTRAINT `user_languages_user_id_language_code_pk` PRIMARY KEY(`user_id`,`language_code`)
);
--> statement-breakpoint
CREATE TABLE `user_list_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`list_id` bigint NOT NULL,
	`item_id` int NOT NULL,
	`added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_list_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_list_items_list_item` UNIQUE(`list_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `user_lists` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_system` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_lists_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_lists_user_name` UNIQUE(`user_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`theme` varchar(20),
	`font_size` int,
	`ui_language` varchar(10),
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`ip` varchar(45) NOT NULL,
	`user_agent` varchar(512) NOT NULL,
	`device_label` varchar(120),
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` varchar(255),
	`full_name` varchar(120) NOT NULL,
	`role` enum('user','admin','author','editor') NOT NULL DEFAULT 'user',
	`country_code` varchar(2) NOT NULL,
	`birth_date` date NOT NULL,
	`avatar_dir` varchar(255) DEFAULT '1.png',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `auth_challenges` ADD CONSTRAINT `auth_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `catalog_item_translations` ADD CONSTRAINT `catalog_item_translations_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD CONSTRAINT `catalog_items_publisher_id_publishers_id_fk` FOREIGN KEY (`publisher_id`) REFERENCES `publishers`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `highlights` ADD CONSTRAINT `highlights_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `highlights` ADD CONSTRAINT `highlights_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_authors` ADD CONSTRAINT `item_authors_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_authors` ADD CONSTRAINT `item_authors_author_id_authors_id_fk` FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_categories` ADD CONSTRAINT `item_categories_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_categories` ADD CONSTRAINT `item_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_licenses` ADD CONSTRAINT `item_licenses_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_likes` ADD CONSTRAINT `item_likes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_likes` ADD CONSTRAINT `item_likes_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `item_media` ADD CONSTRAINT `item_media_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `library_items` ADD CONSTRAINT `library_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `library_items` ADD CONSTRAINT `library_items_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reading_progress` ADD CONSTRAINT `reading_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reading_progress` ADD CONSTRAINT `reading_progress_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `series_entries` ADD CONSTRAINT `series_entries_series_id_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `series_entries` ADD CONSTRAINT `series_entries_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user_languages` ADD CONSTRAINT `user_languages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user_list_items` ADD CONSTRAINT `user_list_items_list_id_user_lists_id_fk` FOREIGN KEY (`list_id`) REFERENCES `user_lists`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user_list_items` ADD CONSTRAINT `user_list_items_item_id_catalog_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `catalog_items`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user_lists` ADD CONSTRAINT `user_lists_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_auth_challenges_user_id` ON `auth_challenges` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_auth_challenges_expires_at` ON `auth_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_authors_full_name` ON `authors` (`full_name`);--> statement-breakpoint
CREATE INDEX `idx_catalog_item_translations_title` ON `catalog_item_translations` (`title`);--> statement-breakpoint
CREATE INDEX `idx_catalog_items_type` ON `catalog_items` (`type`);--> statement-breakpoint
CREATE INDEX `idx_catalog_items_publisher_id` ON `catalog_items` (`publisher_id`);--> statement-breakpoint
CREATE INDEX `idx_catalog_items_source` ON `catalog_items` (`source`);--> statement-breakpoint
CREATE INDEX `idx_catalog_items_external` ON `catalog_items` (`external_provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_item_id` ON `comments` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_user_id` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_highlights_user_item` ON `highlights` (`user_id`,`item_id`);--> statement-breakpoint
CREATE INDEX `idx_item_authors_author_id` ON `item_authors` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_item_categories_category_id` ON `item_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_item_likes_item_id` ON `item_likes` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_item_media_item_id` ON `item_media` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_item_media_item_media_type` ON `item_media` (`item_id`,`media_type`);--> statement-breakpoint
CREATE INDEX `idx_library_items_item_id` ON `library_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_item_id` ON `order_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_user_id` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_payments_order_id` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reading_progress_item_id` ON `reading_progress` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_series_type` ON `series` (`type`);--> statement-breakpoint
CREATE INDEX `idx_series_name` ON `series` (`name`);--> statement-breakpoint
CREATE INDEX `idx_series_entries_item_id` ON `series_entries` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_user_list_items_item_id` ON `user_list_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_user_id` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_expires_at` ON `user_sessions` (`expires_at`);