-- Migration: add roles, user preference columns, manager_permissions and artist_requests tables
-- Run this SQL against your MySQL database (e.g. with mysql client)

-- 1) expand users.role enum
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','unconfirmed','artist','manager','admin','editor') NOT NULL DEFAULT 'user';

-- 2) add columns to user_preferences
ALTER TABLE `user_preferences`
  ADD COLUMN `image_size` VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN `account_public` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN `lists_public_by_default` TINYINT(1) NOT NULL DEFAULT 0;

-- 3) create manager_permissions table
CREATE TABLE IF NOT EXISTS `manager_permissions` (
  `user_id` INT UNSIGNED NOT NULL,
  `permission_code` VARCHAR(8) NOT NULL,
  `granted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `granted_by` INT UNSIGNED NULL,
  PRIMARY KEY (`user_id`,`permission_code`),
  INDEX `idx_manager_permissions_user` (`user_id`),
  CONSTRAINT `fk_manager_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4) create artist_requests table
CREATE TABLE IF NOT EXISTS `artist_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `message` TEXT NULL,
  `processed_by` INT UNSIGNED NULL,
  `processed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_artist_requests_user_id` (`user_id`),
  CONSTRAINT `fk_artist_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- End migration
