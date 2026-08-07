import { hc } from 'hono/client';
import type {
  AppType,
  ProblemCode,
  ProblemDetails,
  ProblemType,
} from '../../../api/src/http/app.js';

export type { ProblemCode, ProblemDetails, ProblemType };

export type SessionTokenProvider = () => Promise<string | null>;

/** Safe error metadata for an unsuccessful browser-to-API response. */
export class ApiRequestError extends Error {
  readonly code?: ProblemCode;

  constructor(
    readonly status: number,
    problem?: Pick<ProblemDetails, 'code'>,
  ) {
    super(`API request failed (${problem?.code ?? status})`);
    this.name = 'ApiRequestError';
    this.code = problem?.code;
  }
}

export function readWebApiUrl(value: string | undefined = import.meta.env.VITE_API_URL) {
  const apiUrl = value?.trim();

  if (!apiUrl) {
    throw new Error('VITE_API_URL is required for browser-to-API requests');
  }

  try {
    const parsedUrl = new URL(apiUrl);

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new Error('VITE_API_URL must be an absolute HTTP or HTTPS URL');
  }

  return apiUrl;
}

/** Browser-only transport client; API runtime code is used only as a type. */
export function createApiClient(baseUrl?: string, getToken?: SessionTokenProvider) {
  return hc<AppType>(readWebApiUrl(baseUrl), {
    headers: getToken
      ? async (): Promise<Record<string, string>> => {
          const token = (await getToken())?.trim();
          const headers: Record<string, string> = {};

          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          return headers;
        }
      : undefined,
  });
}

/** Creates an anonymous client for public API resources. */
export function createPublicApiClient(baseUrl?: string) {
  return createApiClient(baseUrl);
}

const problemStatusValues: ReadonlyArray<ProblemDetails['status']> = [
  400, 401, 403, 404, 409, 429, 500,
];
const problemTypeValues: ReadonlyArray<ProblemType> = [
  'https://yard.local/problems/conflict',
  'https://yard.local/problems/forbidden',
  'https://yard.local/problems/internal-error',
  'https://yard.local/problems/invalid-request',
  'https://yard.local/problems/not-found',
  'https://yard.local/problems/rate-limited',
  'https://yard.local/problems/unauthenticated',
];
const problemCodeValues: ReadonlyArray<ProblemCode> = [
  'conflict',
  'forbidden',
  'internal_error',
  'invalid_request',
  'not_found',
  'rate_limited',
  'route_not_found',
  'unauthenticated',
];

type ValidationError = Readonly<{
  path: string;
  message: string;
}>;

function isKnownValue(values: ReadonlyArray<string | number>, value: unknown) {
  return values.some((allowed) => allowed === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidationError(value: unknown): value is ValidationError {
  return isRecord(value) && typeof value.path === 'string' && typeof value.message === 'string';
}

function isValidationErrors(value: unknown): value is ReadonlyArray<ValidationError> {
  return Array.isArray(value) && value.every(isValidationError);
}

function hasOptionalString(record: Record<string, unknown>, key: string) {
  return !(key in record) || record[key] === undefined || typeof record[key] === 'string';
}

function hasOptionalValidationErrors(record: Record<string, unknown>) {
  return !('errors' in record) || record.errors === undefined || isValidationErrors(record.errors);
}

/** Safely narrows an error response to Yard's browser-safe Problem Details shape. */
export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isKnownValue(problemTypeValues, value.type) &&
    typeof value.title === 'string' &&
    isKnownValue(problemStatusValues, value.status) &&
    isKnownValue(problemCodeValues, value.code) &&
    typeof value.requestId === 'string' &&
    hasOptionalString(value, 'detail') &&
    hasOptionalValidationErrors(value)
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
