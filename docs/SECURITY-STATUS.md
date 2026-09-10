# Security Status

Last reviewed: 2026-09-10

## Implemented
- Server authentication with signed sessions.
- Role-based authorization for database API resources.
- Password hashing with PBKDF2-SHA256 and per-user salts.
- Constant-time session signature verification.
- Production `AUTH_SECRET` requirement.
- API rate limiting and security response headers.
- Atomic contract/invoice/payment completion.
- Duplicate contract-number check in the completion endpoint.
- Runtime bot state removed from source control and ignored by Git.
- CI workflow for typecheck and production build.

## Not yet production-complete
- Bot/SMS routes in `server.ts` still need authentication/RBAC integration.
- CORS should be restricted to a configured origin allow-list.
- Bot tokens should never be accepted from arbitrary browser request bodies.
- Webhook secret verification should be strengthened.
- Database-level uniqueness/migrations and financial state constraints remain.
- Automated integration/E2E tests are still required.
- Backup/restore functionality requires a real implementation and restore test.
