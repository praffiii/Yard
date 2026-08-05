export type RateLimitRequest = {
  readonly method: string;
  readonly path: string;
  readonly yardUserId?: string;
  readonly clientIp?: string;
};

export type RateLimitDecision = {
  readonly allowed: boolean;
  readonly retryAfterSeconds?: number;
};

/**
 * Provider-neutral abuse-protection boundary. Authentication and trusted proxy
 * adapters supply actor and client identity when those boundaries exist.
 */
export interface RateLimiter {
  check(request: RateLimitRequest): RateLimitDecision | Promise<RateLimitDecision>;
}

/** The pre-launch API has no limiter store yet; this keeps the seam injectable. */
export const allowAllRateLimiter: RateLimiter = {
  check: () => ({ allowed: true }),
};
