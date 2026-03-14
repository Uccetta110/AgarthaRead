import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  role: mysqlEnum("role", ["user", "admin", "author", "editor"])
    .notNull()
    .default("user"),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  birthDate: date("birth_date").notNull(),
  avatarDir: varchar("avatar_dir", { length: 255 }).default("1.png"),
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const userLanguages = mysqlTable(
  "user_languages",
  {
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    languageCode: varchar("language_code", { length: 10 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.languageCode] })],
);

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  theme: varchar("theme", { length: 20 }),
  fontSize: int("font_size"),
  uiLanguage: varchar("ui_language", { length: 10 }),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const userSessions = mysqlTable(
  "user_sessions",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    ip: varchar("ip", { length: 45 }).notNull(),
    userAgent: varchar("user_agent", { length: 512 }).notNull(),
    deviceLabel: varchar("device_label", { length: 120 }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_user_sessions_user_id").on(table.userId),
    index("idx_user_sessions_expires_at").on(table.expiresAt),
  ],
);

export const authChallenges = mysqlTable(
  "auth_challenges",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    purpose: mysqlEnum("purpose", ["login", "password_reset"]).notNull(),
    channel: mysqlEnum("channel", ["email"]).notNull().default("email"),
    challengeTokenHash: varchar("challenge_token_hash", { length: 255 })
      .notNull()
      .unique(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    consumedAt: datetime("consumed_at", { mode: "date" }),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_auth_challenges_user_id").on(table.userId),
    index("idx_auth_challenges_expires_at").on(table.expiresAt),
  ],
);

export const publishers = mysqlTable("publishers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull().unique(),
});

export const catalogItems = mysqlTable(
  "catalog_items",
  {
    id: int("id").autoincrement().primaryKey(),
    type: mysqlEnum("type", ["book", "comic", "manga", "newspaper"]).notNull(),
    fulfillmentType: mysqlEnum("fulfillment_type", ["digital", "physical"])
      .notNull()
      .default("digital"),
    publisherId: int("publisher_id").references(() => publishers.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    ageRatingMin: int("age_rating_min").notNull().default(0),
    releaseDate: date("release_date"),
    price: decimal("price", { precision: 10, scale: 2 })
      .notNull()
      .default("0.00"),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    isbn: varchar("isbn", { length: 32 }),
    source: mysqlEnum("source", ["internal", "api"])
      .notNull()
      .default("internal"),
    externalProvider: varchar("external_provider", { length: 100 }),
    externalId: varchar("external_id", { length: 191 }),
    avgRating: decimal("avg_rating", { precision: 3, scale: 2 }),
    viewsCount: int("views_count").notNull().default(0),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_catalog_items_type").on(table.type),
    index("idx_catalog_items_publisher_id").on(table.publisherId),
    index("idx_catalog_items_source").on(table.source),
    index("idx_catalog_items_external").on(
      table.externalProvider,
      table.externalId,
    ),
  ],
);

export const catalogItemTranslations = mysqlTable(
  "catalog_item_translations",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    languageCode: varchar("language_code", { length: 10 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    contentPath: varchar("content_path", { length: 512 }),
    contentFormat: mysqlEnum("content_format", [
      "txt",
      "html_like",
      "markdown",
      "image_sequence",
    ]).notNull(),
  },
  (table) => [
    uniqueIndex("uq_catalog_item_translations_item_lang").on(
      table.itemId,
      table.languageCode,
    ),
    index("idx_catalog_item_translations_title").on(table.title),
  ],
);

export const series = mysqlTable(
  "series",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["comic", "manga"]).notNull(),
  },
  (table) => [
    index("idx_series_type").on(table.type),
    index("idx_series_name").on(table.name),
  ],
);

export const seriesEntries = mysqlTable(
  "series_entries",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    seriesId: int("series_id")
      .notNull()
      .references(() => series.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    volumeNo: decimal("volume_no", { precision: 5, scale: 2 }),
    chapterNo: int("chapter_no"),
    entryOrder: int("entry_order").notNull(),
  },
  (table) => [
    uniqueIndex("uq_series_entries_series_item").on(
      table.seriesId,
      table.itemId,
    ),
    uniqueIndex("uq_series_entries_order").on(table.seriesId, table.entryOrder),
    index("idx_series_entries_item_id").on(table.itemId),
  ],
);

export const itemMedia = mysqlTable(
  "item_media",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    languageCode: varchar("language_code", { length: 10 }),
    mediaType: mysqlEnum("media_type", ["cover", "page", "image"]).notNull(),
    storagePath: varchar("storage_path", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_item_media_item_id").on(table.itemId),
    index("idx_item_media_item_media_type").on(table.itemId, table.mediaType),
  ],
);

export const authors = mysqlTable(
  "authors",
  {
    id: int("id").autoincrement().primaryKey(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    role: varchar("role", { length: 60 }).notNull(),
  },
  (table) => [index("idx_authors_full_name").on(table.fullName)],
);

export const itemAuthors = mysqlTable(
  "item_authors",
  {
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    authorId: int("author_id")
      .notNull()
      .references(() => authors.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.authorId] }),
    index("idx_item_authors_author_id").on(table.authorId),
  ],
);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const itemCategories = mysqlTable(
  "item_categories",
  {
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    categoryId: int("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.categoryId] }),
    index("idx_item_categories_category_id").on(table.categoryId),
  ],
);

export const userLists = mysqlTable(
  "user_lists",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    isSystem: int("is_system").notNull().default(0),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_user_lists_user_name").on(table.userId, table.name),
  ],
);

export const userListItems = mysqlTable(
  "user_list_items",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    listId: bigint("list_id", { mode: "number" })
      .notNull()
      .references(() => userLists.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    addedAt: datetime("added_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_user_list_items_list_item").on(table.listId, table.itemId),
    index("idx_user_list_items_item_id").on(table.itemId),
  ],
);

export const libraryItems = mysqlTable(
  "library_items",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    source: mysqlEnum("source", ["saved", "purchased"]).notNull(),
    addedAt: datetime("added_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_library_items_user_item_source").on(
      table.userId,
      table.itemId,
      table.source,
    ),
    index("idx_library_items_item_id").on(table.itemId),
  ],
);

export const orders = mysqlTable(
  "orders",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    status: mysqlEnum("status", ["pending", "paid", "failed", "cancelled"])
      .notNull()
      .default("pending"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_orders_user_id").on(table.userId),
    index("idx_orders_status").on(table.status),
  ],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => orders.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    quantity: int("quantity").notNull().default(1),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_item_id").on(table.itemId),
  ],
);

export const payments = mysqlTable(
  "payments",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => orders.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    provider: mysqlEnum("provider", ["stripe", "simulated"]).notNull(),
    providerTxId: varchar("provider_tx_id", { length: 191 }),
    status: mysqlEnum("status", ["pending", "succeeded", "failed"])
      .notNull()
      .default("pending"),
    paidAt: datetime("paid_at", { mode: "date" }),
  },
  (table) => [
    index("idx_payments_order_id").on(table.orderId),
    index("idx_payments_status").on(table.status),
  ],
);

export const itemLicenses = mysqlTable("item_licenses", {
  itemId: int("item_id")
    .primaryKey()
    .references(() => catalogItems.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  availableCopies: int("available_copies").notNull(),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const comments = mysqlTable(
  "comments",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    body: text("body").notNull(),
    rating: int("rating"),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_comments_item_id").on(table.itemId),
    index("idx_comments_user_id").on(table.userId),
  ],
);

export const itemLikes = mysqlTable(
  "item_likes",
  {
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId] }),
    index("idx_item_likes_item_id").on(table.itemId),
  ],
);

export const highlights = mysqlTable(
  "highlights",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    languageCode: varchar("language_code", { length: 10 }).notNull(),
    locatorStart: varchar("locator_start", { length: 100 }).notNull(),
    locatorEnd: varchar("locator_end", { length: 100 }).notNull(),
    selectedText: text("selected_text").notNull(),
    note: text("note"),
    createdAt: datetime("created_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_highlights_user_item").on(table.userId, table.itemId)],
);

export const readingProgress = mysqlTable(
  "reading_progress",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    itemId: int("item_id")
      .notNull()
      .references(() => catalogItems.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    languageCode: varchar("language_code", { length: 10 }).notNull(),
    locator: varchar("locator", { length: 120 }).notNull(),
    percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
    lastReadAt: datetime("last_read_at", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("uq_reading_progress_user_item").on(table.userId, table.itemId),
    index("idx_reading_progress_item_id").on(table.itemId),
  ],
);
