import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { bannerPresetEnum } from "./enums";

export const banners = pgTable(
  "banners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    message: text("message").notNull(),
    linkLabel: varchar("link_label", { length: 100 }),
    linkUrl: varchar("link_url", { length: 2048 }),
    backgroundPreset: bannerPresetEnum("background_preset").default("INK").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("banners_is_active_idx").on(table.isActive)]
);
