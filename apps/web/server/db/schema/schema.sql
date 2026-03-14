-- AgarthaRead - MySQL schema (Drizzle + mysql2 friendly)
-- Target: MySQL 8+

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('user', 'admin', 'author', 'editor') NOT NULL DEFAULT 'user',
  country_code CHAR(2) NOT NULL,
  birth_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_languages (
  user_id INT UNSIGNED NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  PRIMARY KEY (user_id, language_code),
  CONSTRAINT fk_user_languages_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  theme VARCHAR(20) NULL,
  font_size TINYINT UNSIGNED NULL,
  ui_language VARCHAR(10) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_preferences_user_id (user_id),
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(512) NOT NULL,
  device_label VARCHAR(120) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_sessions_session_token (session_token),
  KEY idx_user_sessions_user_id (user_id),
  KEY idx_user_sessions_expires_at (expires_at),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  purpose ENUM('login', 'password_reset') NOT NULL,
  channel ENUM('email') NOT NULL DEFAULT 'email',
  challenge_token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_challenges_token_hash (challenge_token_hash),
  KEY idx_auth_challenges_user_id (user_id),
  KEY idx_auth_challenges_expires_at (expires_at),
  CONSTRAINT fk_auth_challenges_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_publishers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('book', 'comic', 'manga', 'newspaper') NOT NULL,
  fulfillment_type ENUM('digital', 'physical') NOT NULL DEFAULT 'digital',
  publisher_id INT UNSIGNED NULL,
  age_rating_min TINYINT UNSIGNED NOT NULL DEFAULT 0,
  release_date DATE NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  isbn VARCHAR(32) NULL,
  source ENUM('internal', 'api') NOT NULL DEFAULT 'internal',
  external_provider VARCHAR(100) NULL,
  external_id VARCHAR(191) NULL,
  avg_rating DECIMAL(3,2) NULL,
  views_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_catalog_items_type (type),
  KEY idx_catalog_items_publisher_id (publisher_id),
  KEY idx_catalog_items_source (source),
  KEY idx_catalog_items_external (external_provider, external_id),
  CONSTRAINT fk_catalog_items_publisher
    FOREIGN KEY (publisher_id) REFERENCES publishers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_catalog_items_price_nonnegative CHECK (price >= 0),
  CONSTRAINT chk_catalog_items_age_nonnegative CHECK (age_rating_min >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_item_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  content_path VARCHAR(512) NULL,
  content_format ENUM('txt', 'html_like', 'markdown', 'image_sequence') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_item_translations_item_lang (item_id, language_code),
  KEY idx_catalog_item_translations_title (title),
  CONSTRAINT fk_catalog_item_translations_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS series (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  type ENUM('comic', 'manga') NOT NULL,
  PRIMARY KEY (id),
  KEY idx_series_type (type),
  KEY idx_series_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS series_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  series_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  volume_no DECIMAL(5,2) NULL,
  chapter_no INT UNSIGNED NULL,
  entry_order INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_series_entries_series_item (series_id, item_id),
  UNIQUE KEY uq_series_entries_order (series_id, entry_order),
  KEY idx_series_entries_item_id (item_id),
  CONSTRAINT fk_series_entries_series
    FOREIGN KEY (series_id) REFERENCES series(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_series_entries_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  language_code VARCHAR(10) NULL,
  media_type ENUM('cover', 'page', 'image') NOT NULL,
  storage_path VARCHAR(512) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_item_media_item_id (item_id),
  KEY idx_item_media_item_media_type (item_id, media_type),
  CONSTRAINT fk_item_media_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS authors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(60) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_authors_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_authors (
  item_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (item_id, author_id),
  KEY idx_item_authors_author_id (author_id),
  CONSTRAINT fk_item_authors_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_authors_author
    FOREIGN KEY (author_id) REFERENCES authors(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_categories (
  item_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (item_id, category_id),
  KEY idx_item_categories_category_id (category_id),
  CONSTRAINT fk_item_categories_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_categories_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_lists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_lists_user_name (user_id, name),
  CONSTRAINT fk_user_lists_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_list_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  list_id BIGINT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_list_items_list_item (list_id, item_id),
  KEY idx_user_list_items_item_id (item_id),
  CONSTRAINT fk_user_list_items_list
    FOREIGN KEY (list_id) REFERENCES user_lists(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_list_items_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS library_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  source ENUM('saved', 'purchased') NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_library_items_user_item_source (user_id, item_id, source),
  KEY idx_library_items_item_id (item_id),
  CONSTRAINT fk_library_items_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_library_items_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_orders_total_amount_nonnegative CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_item_id (item_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_order_items_unit_price_nonnegative CHECK (unit_price >= 0),
  CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('stripe', 'simulated') NOT NULL,
  provider_tx_id VARCHAR(191) NULL,
  status ENUM('pending', 'succeeded', 'failed') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_payments_order_id (order_id),
  KEY idx_payments_status (status),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_licenses (
  item_id INT UNSIGNED NOT NULL,
  available_copies INT UNSIGNED NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id),
  CONSTRAINT fk_item_licenses_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  rating TINYINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_item_id (item_id),
  KEY idx_comments_user_id (user_id),
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_comments_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_likes (
  user_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id),
  KEY idx_item_likes_item_id (item_id),
  CONSTRAINT fk_item_likes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_likes_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS highlights (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  locator_start VARCHAR(100) NOT NULL,
  locator_end VARCHAR(100) NOT NULL,
  selected_text TEXT NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_highlights_user_item (user_id, item_id),
  CONSTRAINT fk_highlights_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_highlights_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reading_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  locator VARCHAR(120) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reading_progress_user_item (user_id, item_id),
  KEY idx_reading_progress_item_id (item_id),
  CONSTRAINT fk_reading_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reading_progress_item
    FOREIGN KEY (item_id) REFERENCES catalog_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_reading_progress_percentage_range CHECK (percentage >= 0 AND percentage <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (email, username, password_hash, full_name, role, country_code, birth_date) VALUES
('herobrinesonoio@gmail.com', 'the_admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Amministratore Sistema', 'admin', 'IT', '2007-01-23');