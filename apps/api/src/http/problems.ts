import type { Context } from 'hono';
import { Schema } from 'effect';
import type { ApiEnv } from './request-context.js';

export const problemTypes = {
  conflict: 'https://yard.local/problems/conflict',
  forbidden: 'https://yard.local/problems/forbidden',
  internalError: 'https://yard.local/problems/internal-error',
  invalidRequest: 'https://yard.local/problems/invalid-request',
  notFound: 'https://yard.local/problems/not-found',
  rateLimited: 'https://yard.local/problems/rate-limited',
  unauthenticated: 'https://yard.local/problems/unauthenticated',
} as const;

export const problemCodes = {
  conflict: 'conflict',
  forbidden: 'forbidden',
  internalError: 'internal_error',
  invalidRequest: 'invalid_request',
  notFound: 'not_found',
  rateLimited: 'rate_limited',
  routeNotFound: 'route_not_found',
  unauthenticated: 'unauthenticated',
} as const;

const problemTypeValues = [
  problemTypes.conflict,
  problemTypes.forbidden,
  problemTypes.internalError,
  problemTypes.invalidRequest,
  problemTypes.notFound,
  problemTypes.rateLimited,
  problemTypes.unauthenticated,
] as const;

const problemCodeValues = [
  problemCodes.conflict,
  problemCodes.forbidden,
  problemCodes.internalError,
  problemCodes.invalidRequest,
  problemCodes.notFound,
  problemCodes.rateLimited,
  problemCodes.routeNotFound,
  problemCodes.unauthenticated,
] as const;

const ProblemTypeSchema = Schema.Literal(...problemTypeValues);
const ProblemCodeSchema = Schema.Literal(...problemCodeValues);

const ProblemStatusSchema = Schema.Literal(400, 401, 403, 404, 409, 429, 500);

const ProblemValidationErrorSchema = Schema.Struct({
  path: Schema.String,
  message: Schema.String,
});

export const ProblemDetailsSchema = Schema.Struct({
  type: ProblemTypeSchema,
  title: Schema.String,
  status: ProblemStatusSchema,
  code: ProblemCodeSchema,
  requestId: Schema.String,
  detail: Schema.optional(Schema.String),
  errors: Schema.optional(Schema.Array(ProblemValidationErrorSchema)),
});

export type ProblemDetails = Schema.Schema.Type<typeof ProblemDetailsSchema>;
export type ProblemType = Schema.Schema.Type<typeof ProblemTypeSchema>;
export type ProblemCode = Schema.Schema.Type<typeof ProblemCodeSchema>;
export type ProblemStatus = Schema.Schema.Type<typeof ProblemStatusSchema>;

export type ValidationIssue = {
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
  readonly message?: string;
};

type ProblemDefinition = Omit<ProblemDetails, 'requestId'>;

export function problemResponse(c: Context<ApiEnv>, definition: ProblemDefinition) {
  const requestId = c.get('requestId');
  const problem = Schema.decodeUnknownSync(ProblemDetailsSchema)({
    ...definition,
    requestId,
  });

  return c.json(problem, definition.status, {
    'Content-Type': 'application/problem+json',
    'X-Request-ID': requestId,
  });
}

export function validationProblem(c: Context<ApiEnv>, issues: readonly ValidationIssue[]) {
  return problemResponse(c, {
    type: problemTypes.invalidRequest,
    title: 'Bad Request',
    status: 400,
    code: problemCodes.invalidRequest,
    detail: 'Request validation failed.',
    errors: issues.map((issue) => ({
      path: formatIssuePath(issue.path),
      message: 'Invalid value',
    })),
  });
}

export function problemForStatus(c: Context<ApiEnv>, status: number) {
  switch (status) {
    case 400:
      return problemResponse(c, {
        type: problemTypes.invalidRequest,
        title: 'Bad Request',
        status: 400,
        code: problemCodes.invalidRequest,
        detail: 'The request could not be processed.',
      });
    case 401:
      return problemResponse(c, {
        type: problemTypes.unauthenticated,
        title: 'Unauthorized',
        status: 401,
        code: problemCodes.unauthenticated,
      });
    case 403:
      return problemResponse(c, {
        type: problemTypes.forbidden,
        title: 'Forbidden',
        status: 403,
        code: problemCodes.forbidden,
      });
    case 404:
      return problemResponse(c, {
        type: problemTypes.notFound,
        title: 'Not Found',
        status: 404,
        code: problemCodes.notFound,
      });
    case 409:
      return problemResponse(c, {
        type: problemTypes.conflict,
        title: 'Conflict',
        status: 409,
        code: problemCodes.conflict,
      });
    case 429:
      return problemResponse(c, {
        type: problemTypes.rateLimited,
        title: 'Too Many Requests',
        status: 429,
        code: problemCodes.rateLimited,
      });
    default:
      return problemResponse(c, {
        type: problemTypes.internalError,
        title: 'Internal Server Error',
        status: 500,
        code: problemCodes.internalError,
      });
  }
}

export function routeNotFoundProblem(c: Context<ApiEnv>) {
  return problemResponse(c, {
    type: problemTypes.notFound,
    title: 'Not Found',
    status: 404,
    code: problemCodes.routeNotFound,
  });
}

function formatIssuePath(path: ValidationIssue['path']) {
  if (!path || path.length === 0) {
    return '$';
  }

  return path
    .map((segment) => {
      if (typeof segment === 'object' && segment !== null && 'key' in segment) {
        return String(segment.key);
      }

      return String(segment);
    })
    .join('.');
}
