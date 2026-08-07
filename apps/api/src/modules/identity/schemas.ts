import { Schema } from 'effect';
import { accountStatuses, profilePhotoStatuses } from './database-tables.js';

export const AccountStatusSchema = Schema.Literal(...accountStatuses);
export const ProfilePhotoStatusSchema = Schema.Literal('none', ...profilePhotoStatuses);

export const ViewerProfileSchema = Schema.Struct({
  id: Schema.UUID,
  realName: Schema.NullOr(Schema.String),
  displayName: Schema.NullOr(Schema.String),
  profilePhoto: Schema.Struct({
    status: ProfilePhotoStatusSchema,
  }),
  accountStatus: AccountStatusSchema,
  profileComplete: Schema.Boolean,
});

export type ViewerProfile = Schema.Schema.Type<typeof ViewerProfileSchema>;
