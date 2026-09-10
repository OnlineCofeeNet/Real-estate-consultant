# Security Review

## Current protections
- Server-side authentication and role-based authorization are enforced for database API routes.
- Session signatures use HMAC-SHA256 with constant-time comparison.
- Production requires `AUTH_SECRET`.
- API rate limiting and security headers are enabled.
- Contract completion uses a database transaction and rejects duplicate contract numbers at the endpoint.
- Runtime bot state files are ignored and no longer tracked in the repository.
- CI verifies TypeScript and the production build.

## Remaining priorities
1. Move bot/SMS routes behind the same server-side authorization middleware.
2. Replace open CORS with an allow-list driven by `CORS_ORIGIN`.
3. Move bot credentials entirely to server-side secret storage; never accept bot tokens from browser request bodies.
4. Replace token-bearing webhook URLs with provider-supported secret verification where available.
5. Add database-level unique constraints for contract and invoice numbers after checking existing production data for duplicates.
6. Add integration tests for authentication, RBAC, contract completion, payments, and messaging authorization.
7. Refactor large page components such as `Contracts.tsx` into calculation, persistence, messaging, and presentation modules.
8. Remove obsolete one-off patch scripts after confirming they are no longer part of the deployment workflow.
