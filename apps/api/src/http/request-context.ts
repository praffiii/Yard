export type ApiEnv = {
  Variables: {
    requestId: string;
    /** Trusted Clerk subject set by authentication middleware, never a request header. */
    actorId?: string;
    clientIp?: string;
  };
};
