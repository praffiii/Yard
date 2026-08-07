import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const accountStatuses = ['active', 'suspended', 'deleted'] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const profilePhotoStatuses = ['pending', 'ready', 'failed', 'removed'] as const;
export type ProfilePhotoStatus = (typeof profilePhotoStatuses)[number];

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    authProvider: text('auth_provider').notNull(),
    authSubject: text('auth_subject').notNull(),
    accountStatus: text('account_status').$type<AccountStatus>().notNull().default('active'),
    realName: text('real_name'),
    displayName: text('display_name'),
    profilePhotoKey: text('profile_photo_key'),
    profilePhotoStatus: text('profile_photo_status').$type<ProfilePhotoStatus>(),
    profilePhotoWidth: integer('profile_photo_width'),
    profilePhotoHeight: integer('profile_photo_height'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    unique('users_auth_provider_auth_subject_unique').on(table.authProvider, table.authSubject),
    check('users_auth_provider_non_empty', sql`length(btrim(${table.authProvider})) > 0`),
    check('users_auth_subject_non_empty', sql`length(btrim(${table.authSubject})) > 0`),
    check(
      'users_account_status_check',
      sql`${table.accountStatus} in ('active', 'suspended', 'deleted')`,
    ),
    check(
      'users_profile_photo_status_check',
      sql`${table.profilePhotoStatus} is null or ${table.profilePhotoStatus} in ('pending', 'ready', 'failed', 'removed')`,
    ),
    check(
      'users_ready_profile_photo_check',
      sql`${table.profilePhotoStatus} <> 'ready' or (${table.profilePhotoKey} is not null and ${table.profilePhotoWidth} is not null and ${table.profilePhotoHeight} is not null)`,
    ),
    check(
      'users_profile_photo_width_check',
      sql`${table.profilePhotoWidth} is null or ${table.profilePhotoWidth} > 0`,
    ),
    check(
      'users_profile_photo_height_check',
      sql`${table.profilePhotoHeight} is null or ${table.profilePhotoHeight} > 0`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
