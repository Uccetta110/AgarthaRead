-- Migration: add bio column to users
ALTER TABLE `users`
  ADD COLUMN `bio` TEXT NULL;
