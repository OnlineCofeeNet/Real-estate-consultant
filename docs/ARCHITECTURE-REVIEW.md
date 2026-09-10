# Architecture Review

## Findings

### High priority
- `server.ts` still contains bot and SMS endpoints outside the authenticated database router. These endpoints must use the same server-side authentication/RBAC boundary before production exposure.
- CORS is configured broadly in `server.ts`; it should be restricted to an explicit allow-list.
- Bot credentials are handled by server runtime state and must remain server-side secrets; browser requests should not be able to select arbitrary provider tokens.

### Medium priority
- `Contracts.tsx` is a large multi-responsibility component containing calculation, persistence, messaging, printing, and UI concerns.
- Financial entities are stored with free-text status/method fields and do not yet have a complete database-level state model.
- `contracts.contractNumber` is checked for duplicates in application code but should also have a database unique constraint after existing data is verified.
- Invoice numbering is generated in client code in the current contract screen and should eventually be centralized on the server.
- Backup manager currently exposes placeholder functions; backup/restore should be implemented and tested rather than silently doing nothing.

### Good current controls
- Server authentication and RBAC are present for database API routes.
- Session signing uses HMAC and constant-time signature comparison.
- Production requires `AUTH_SECRET`.
- API rate limiting and security headers are present.
- Contract completion is transactional.
- Runtime bot state is excluded from source control.
- CI performs typecheck and production build verification.

## Recommended implementation order
1. Secure all bot/SMS server routes and restrict CORS.
2. Add integration tests for auth/RBAC and financial operations.
3. Add database constraints/migrations and server-side invoice numbering.
4. Implement tested backup/restore.
5. Refactor `Contracts.tsx` into services/hooks/components.
6. Add POS provider abstraction and idempotent payment transaction handling.
