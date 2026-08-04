import { hc } from 'hono/client';
import type {
  AppType,
  ProblemCode,
  ProblemDetails,
  ProblemType,
} from '../../../api/src/http/app.js';

export type { ProblemCode, ProblemDetails, ProblemType };

/** Browser-only transport client; API runtime code is used only as a type. */
export function createApiClient(baseUrl: string = import.meta.env.VITE_API_URL ?? '') {
  return hc<AppType>(baseUrl);
}

export const apiClient = createApiClient();

const problemStatuses = new Set<ProblemDetails['status']>([400, 401, 403, 404, 409, 429, 500]);
const problemTypes = new Set<ProblemType>([
  'https://yard.local/problems/conflict',
  'https://yard.local/problems/forbidden',
  'https://yard.local/problems/internal-error',
  'https://yard.local/problems/invalid-request',
  'https://yard.local/problems/not-found',
  'https://yard.local/problems/rate-limited',
  'https://yard.local/problems/unauthenticated',
]);
const problemCodes = new Set<ProblemCode>([
  'conflict',
  'forbidden',
  'internal_error',
  'invalid_request',
  'not_found',
  'rate_limited',
  'route_not_found',
  'unauthenticated',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidationErrors(
  value: unknown,
): value is ReadonlyArray<{ readonly path: string; readonly message: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (error) =>
        isRecord(error) && typeof error.path === 'string' && typeof error.message === 'string',
    )
  );
}

/** Safely narrows an error response to Yard's browser-safe Problem Details shape. */
export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.type === 'string' &&
    problemTypes.has(value.type as ProblemType) &&
    typeof value.title === 'string' &&
    typeof value.status === 'number' &&
    problemStatuses.has(value.status as ProblemDetails['status']) &&
    typeof value.code === 'string' &&
    problemCodes.has(value.code as ProblemCode) &&
    typeof value.requestId === 'string' &&
    (!('detail' in value) || value.detail === undefined || typeof value.detail === 'string') &&
    (!('errors' in value) || value.errors === undefined || isValidationErrors(value.errors))
  );
}

/** Parses only RFC 9457 responses emitted by the Yard API. */
export async function readProblemDetails(response: Response): Promise<ProblemDetails | undefined> {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim();

  if (contentType !== 'application/problem+json') {
    return undefined;
  }

  try {
    const body: unknown = await response.json();
    return isProblemDetails(body) ? body : undefined;
  } catch {
    return undefined;
  }
}
