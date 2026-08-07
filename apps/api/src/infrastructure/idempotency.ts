export type IdempotencyClaimInput = Readonly<{
  actorId: string;
  operation: string;
  key: string;
  requestFingerprint: string;
}>;

export type IdempotencyReplay = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Readonly<Record<string, unknown>> | null;
}>;

export type IdempotencyClaim =
  | Readonly<{ kind: 'claimed'; reservationId: string }>
  | Readonly<{ kind: 'replay'; response: IdempotencyReplay }>
  | Readonly<{ kind: 'conflict' }>;

/**
 * Storage seam for durable mutation replay state. Implementations must claim a
 * key and compare its request fingerprint atomically with the domain change.
 */
export interface IdempotencyStore {
  claim(input: IdempotencyClaimInput): IdempotencyClaim | Promise<IdempotencyClaim>;
  complete(
    input: Readonly<{
      reservationId: string;
      response: IdempotencyReplay;
    }>,
  ): void | Promise<void>;
}
