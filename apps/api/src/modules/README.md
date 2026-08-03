# Backend ownership

The backend is a modular monolith. Each directory owns its future commands,
queries, schemas, projections, authorization rules, persistence definitions,
and invariants.

| Module          | Owns                                               | Transport and infrastructure may do                      |
| --------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `identity`      | Account mapping, authentication boundary, profiles | Verify provider credentials and pass an identity context |
| `communities`   | Community lifecycle, membership, invitations       | Parse HTTP input and map responses                       |
| `activities`    | Activity lifecycle, schedule, meeting points       | Adapt external map/provider data                         |
| `participation` | RSVPs, capacity, attendance                        | Provide authenticated actor context                      |
| `discovery`     | Discovery queries, viewport, ranking               | Translate HTTP filters into typed input                  |
| `media`         | Upload instructions, processing, delivery policy   | Talk to R2 and image-processing adapters                 |
| `safety`        | Reports, blocks, moderation actions                | Apply request IDs and safe error mapping                 |
| `notifications` | In-app notifications, preferences, delivery intent | Call email providers after domain work commits           |

`src/http` contains HTTP transport composition. `src/infrastructure` contains
configuration and future provider adapters. `src/runtime` contains process and
Effect composition. No database or provider integration is part of this shell.
