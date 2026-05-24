-- Make changes idempotent: modify enum and add column if missing
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','unconfirmed','artist','manager','admin','editor','suspended','banned') NOT NULL DEFAULT 'user';

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `suspended_until` DATETIME NULL AFTER `totp_enabled_at`;

-- Ensure currently suspended users have private lists
UPDATE `user_lists` ul
JOIN `users` u ON ul.user_id = u.id
SET ul.is_public = 0
WHERE u.role = 'suspended';
