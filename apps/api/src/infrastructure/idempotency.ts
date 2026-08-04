export type IdempotencyClaimInput = {
  readonly actorId: string;
  readonly operation: string;
  readonly key: string;
  readonly requestFingerprint: string;
};

export type IdempotencyReplay = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Readonly<Record<string, unknown>> | null;
};

export type IdempotencyClaim =
  | { readonly kind: 'claimed'; readonly reservationId: string }
  | { readonly kind: 'replay'; readonly response: IdempotencyReplay }
  | { readonly kind: 'conflict' };

/**
 * Storage seam for durable mutation replay state. Implementations must claim a
 * key and compare its request fingerprint atomically with the domain change.
 */
export interface IdempotencyStore {
  claim(input: IdempotencyClaimInput): IdempotencyClaim | Promise<IdempotencyClaim>;
  complete(input: {
    readonly reservationId: string;
    readonly response: IdempotencyReplay;
  }): void | Promise<void>;
}
