import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

import { userRoleEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    // The other way in. Stored the way OnecodeSoft wants it and the way
    // `normalizeBdPhoneE164` produces it -- `8801XXXXXXXXX`, thirteen digits,
    // no `+` -- because this string is the account key: two spellings of one
    // number would be two accounts. Null for everybody who signed up with an
    // email and never linked a handset.
    phoneNumber: varchar("phone_number", { length: 32 }),
    phoneNumberVerified: boolean("phone_number_verified").default(false).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }),
    role: userRoleEnum("role").default("STUDENT").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    profileCompleted: boolean("profile_completed").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    // The administrator's override on the two-device limit. Off by default:
    // the limit is the policy, and this is the exception somebody has to
    // decide to make -- a student with a shared family laptop, an account
    // used from a classroom machine.
    multiDeviceAllowed: boolean("multi_device_allowed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(table.email),
    // Postgres counts nulls as distinct in a unique index, so this constrains
    // the people who have a number without demanding one from anybody else.
    uniqueIndex("users_phone_number_unique_idx").on(table.phoneNumber),
    uniqueIndex("users_slug_unique_idx").on(table.slug)
  ]
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
    guardianName: varchar("guardian_name", { length: 255 }),
    guardianPhone: varchar("guardian_phone", { length: 32 }),
    institution: varchar("institution", { length: 255 }),
    classOrGrade: varchar("class_or_grade", { length: 64 }),
    address: text("address"),
    profilePhoto: text("profile_photo"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("student_profiles_user_id_unique_idx").on(table.userId),
    index("student_profiles_user_id_idx").on(table.userId)
  ]
);

export const teacherProfiles = pgTable(
  "teacher_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }),
    bio: text("bio"),
    qualifications: text("qualifications"),
    specializations: text("specializations"),
    profilePhoto: text("profile_photo"),
    socialLinks: text("social_links"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("teacher_profiles_user_id_unique_idx").on(table.userId),
    index("teacher_profiles_user_id_idx").on(table.userId)
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    // Who vouched for this identity, not which button was pressed. Better Auth
    // looks an OAuth account up by (issuer, accountId) -- `provider_id` is only
    // a label. Google's is `https://accounts.google.com`; a method with no
    // issuer of its own gets a synthetic one, so an email/password row is
    // `local:credential`. Without the column every lookup throws and the
    // callback dies as a bare `?error=internal_server_error`.
    issuer: varchar("issuer", { length: 255 }).notNull(),
    accountId: varchar("provider_account_id", { length: 255 }).notNull(),
    password: text("password_hash"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("accounts_provider_unique_idx").on(table.providerId, table.accountId),
    // The pair Better Auth reads an OAuth callback with. Load-bearing twice
    // over: without it every sign-in scans the table, and a second row under
    // one issuer's subject would be a second account for one person.
    uniqueIndex("accounts_issuer_account_id_unique_idx").on(table.issuer, table.accountId),
    index("accounts_user_id_idx").on(table.userId)
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    // The client's own persistent id, copied off the request that opened this
    // session. Null for anything that sent no header -- an old build, a
    // script -- and the device limit counts those as a device each.
    deviceId: varchar("device_id", { length: 64 }),
    impersonatedBy: uuid("impersonated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("sessions_token_unique_idx").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
    // The device limit reads every live session of one user on every sign-in.
    index("sessions_user_id_expires_at_idx").on(table.userId, table.expiresAt)
  ]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    // `text`, not varchar(255): Better Auth stores the whole OAuth state here as
    // JSON -- the callback URL, the PKCE verifier, the expiry. A sign-in whose
    // callback is "/dashboard" fits; "/dashboard/profile-complete", which is
    // where the sign-up button sends people, does not, and Postgres refused the
    // insert with "value too long for type character varying(255)". The button
    // then did nothing at all, because the failure was a 500 on the request
    // that was meant to return the Google URL.
    value: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    // Deliberately not unique. Better Auth's phone plugin stores a sign-in OTP
    // here as `"123456:0"` and inserts a fresh row per request rather than
    // updating one, so two people asking for a code at the same time can draw
    // the same six digits -- under a unique index that is a constraint
    // violation on a path the caller has already been charged an SMS for.
    // Nothing looks a verification up by this column; `identifier` is the key.
    index("verification_tokens_token_idx").on(table.value),
    index("verification_tokens_identifier_idx").on(table.identifier)
  ]
);
