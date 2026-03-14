# Modello Logico Relazionale — AgarthaRead

> Convenzioni: **attributo** = chiave primaria (PK) &nbsp;|&nbsp; *attributo* = chiave esterna (FK)

---

## Utenti e autenticazione

**users** (**id**, email, username, password_hash, full_name, role, country_code, birth_date, created_at, updated_at)

**user_languages** (**user_id*, **language_code**)

**user_preferences** (**id**, *user_id*, theme, font_size, ui_language, updated_at)

**user_sessions** (**id**, *user_id*, session_token, ip, user_agent, device_label, expires_at, created_at)

**auth_challenges** (**id**, *user_id*, purpose, channel, challenge_token_hash, expires_at, consumed_at, created_at)

---

## Catalogo contenuti

**publishers** (**id**, name)

**catalog_items** (**id**, type, fulfillment_type, *publisher_id*, age_rating_min, release_date, price, currency, isbn, source, external_provider, external_id, avg_rating, views_count, created_at, updated_at)

**catalog_item_translations** (**id**, *item_id*, language_code, title, description, content_path, content_format)

**authors** (**id**, full_name, role)

**item_authors** (***item_id**, ***author_id**)

**categories** (**id**, name)

**item_categories** (***item_id**, ***category_id**)

---

## Serie (fumetti e manga)

**series** (**id**, name, type)

**series_entries** (**id**, *series_id*, *item_id*, volume_no, chapter_no, entry_order)

---

## Media

**item_media** (**id**, *item_id*, language_code, media_type, storage_path, mime_type, sort_order)

---

## Libreria e liste utente

**user_lists** (**id**, *user_id*, name, is_system, created_at)

**user_list_items** (**id**, *list_id*, *item_id*, added_at)

**library_items** (**id**, *user_id*, *item_id*, source, added_at)

---

## Ordini e pagamenti

**orders** (**id**, *user_id*, status, total_amount, created_at)

**order_items** (**id**, *order_id*, *item_id*, unit_price, quantity)

**payments** (**id**, *order_id*, provider, provider_tx_id, status, paid_at)

**item_licenses** (***item_id**, available_copies, updated_at)

---

## Interazione utente

**comments** (**id**, *user_id*, *item_id*, body, rating, created_at, updated_at)

**item_likes** (***user_id**, ***item_id**, created_at)

**highlights** (**id**, *user_id*, *item_id*, language_code, locator_start, locator_end, selected_text, note, created_at)

**reading_progress** (**id**, *user_id*, *item_id*, language_code, locator, percentage, last_read_at)
