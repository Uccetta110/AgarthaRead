ALTER TABLE `auth_challenges` MODIFY COLUMN `purpose` enum('login','password_reset','email_verify','account_delete') NOT NULL;--> statement-breakpoint
ALTER TABLE `auth_challenges` MODIFY COLUMN `channel` enum('email','totp') NOT NULL DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `auth_challenges` ADD `otp_code_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `auth_challenges` ADD `attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `two_factor_method` enum('none','email','totp') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_secret` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled_at` datetime;