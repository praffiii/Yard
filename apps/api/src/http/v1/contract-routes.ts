import { sValidator } from '@hono/standard-validator';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { Schema } from 'effect';
import { validationProblem } from '../problems.js';
import type { ApiEnv } from '../request-context.js';

const contractProbeBodySchema = Schema.Struct({
  message: Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(120)),
});

const contractProbeQuerySchema = Schema.Struct({
  page: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 50))),
});

const contractProbeParamSchema = Schema.Struct({
  resourceId: Schema.UUID,
});

const contractProbeHeaderSchema = Schema.Struct({
  'idempotency-key': Schema.optional(Schema.NonEmptyTrimmedString.pipe(Schema.maxLength(255))),
});

const ContractProbeBody = Schema.standardSchemaV1(contractProbeBodySchema);
const ContractProbeQuery = Schema.standardSchemaV1(contractProbeQuerySchema);
const ContractProbeParam = Schema.standardSchemaV1(contractProbeParamSchema);
const ContractProbeHeaders = Schema.standardSchemaV1(contractProbeHeaderSchema);

const ContractProbeResponseSchema = Schema.Struct({
  idempotencyKeyPresent: Schema.Boolean,
  kind: Schema.Literal('contract_probe'),
  message: Schema.String,
  page: Schema.Number,
  resourceId: Schema.UUID,
});

export type ContractProbeResponse = Schema.Schema.Type<typeof ContractProbeResponseSchema>;

/**
 * Test-only transport fixture. It exercises the API boundary without adding a
 * product resource or mutation endpoint to the shipped /v1 surface.
 */
export const contractFixtureRoutes = new Hono<ApiEnv>().post(
  '/:resourceId',
  sValidator('json', ContractProbeBody, (result, c: Context<ApiEnv>) =>
    result.success ? undefined : validationProblem(c, result.error),
  ),
  sValidator('query', ContractProbeQuery, (result, c: Context<ApiEnv>) =>
    result.success ? undefined : validationProblem(c, result.error),
  ),
  sValidator('param', ContractProbeParam, (result, c: Context<ApiEnv>) =>
    result.success ? undefined : validationProblem(c, result.error),
  ),
  sValidator('header', ContractProbeHeaders, (result, c: Context<ApiEnv>) =>
    result.success ? undefined : validationProblem(c, result.error),
  ),
  (c) => {
    const body = c.req.valid('json');
    const query = c.req.valid('query');
    const params = c.req.valid('param');
    const headers = c.req.valid('header');
    const response = Schema.decodeUnknownSync(ContractProbeResponseSchema)({
      idempotencyKeyPresent: headers['idempotency-key'] !== undefined,
      kind: 'contract_probe',
      message: body.message,
      page: query.page ?? 1,
      resourceId: params.resourceId,
    });

    return c.json(response);
  },
);
