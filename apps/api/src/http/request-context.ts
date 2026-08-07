export type ApiEnv = Readonly<{
  Variables: Readonly<{
    requestId: string;
    /** Verified provider subject; the identity module must map it to a Yard user. */
    verifiedAuthSubject?: string;
    /** Internal Yard user ID set only after identity resolution, never by auth middleware. */
    yardUserId?: string;
    clientIp?: string;
  }>;
}>;
