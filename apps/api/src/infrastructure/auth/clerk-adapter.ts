import { verifyToken } from '@clerk/backend';
import type { ClerkAuthConfig } from '../config.js';

export type VerifiedIdentity = {
  readonly subject: string;
};

export type AuthTokenVerifier = {
  verify(token: string): Promise<VerifiedIdentity>;
};

/**
 * Keeps Clerk verification and provider errors behind the API-owned identity
 * boundary. Callers only receive the verified provider subject.
 */
export function createClerkTokenVerifier(config: ClerkAuthConfig): AuthTokenVerifier {
  return {
    async verify(token) {
      const verifiedToken = await verifyToken(token, {
        authorizedParties: [...config.authorizedParties],
        secretKey: config.secretKey,
      });
      const subject = verifiedToken.sub?.trim();

      if (!subject) {
        throw new Error('The Clerk token did not contain a subject');
      }

      return { subject };
    },
  };
}
