# Security Policy

## Scope

This project handles customer identities, contracts, financial records, invoices, messaging credentials, and property media. Security changes must be treated as production-critical changes.

## Current security boundaries

- PostgreSQL/Drizzle is the server-side persistence layer.
- Dexie/IndexedDB is client-side state and must not be treated as an authorization boundary.
- Bot, SMS, database, and Firebase credentials must remain server-side and must never be committed to Git.
- `bot-settings.json`, `bot-users.json`, `.env`, uploads, and private keys are ignored by Git; deployments must still verify that these paths are not exposed as static assets.

## Production requirements

Before exposing the application to the public internet:

1. Require authenticated access for every non-public API endpoint.
2. Enforce authorization server-side for every resource using the authenticated user's role and tenant/agency scope.
3. Prevent IDOR by checking ownership/scope before reading or mutating customers, contracts, invoices, payments, properties, media, messages, and audit records.
4. Keep all messaging/SMS/POS credentials on the server. Do not accept a privileged provider token from an untrusted browser request.
5. Apply request-size limits and content validation to JSON, uploads, and Base64 media.
6. Restrict CORS to known application origins in production.
7. Add rate limiting to authentication, messaging, webhook-management, upload, and other high-cost endpoints.
8. Use HTTPS and secure, HttpOnly, SameSite session cookies where cookie sessions are used.
9. Keep financial mutations transactional and idempotent where retries are possible.
10. Keep audit records append-only for normal application users.
11. Run dependency security checks in CI and review high/critical advisories before deployment.
12. Back up PostgreSQL and test restoration periodically.

## Secrets and webhooks

Webhook URLs containing bot tokens must be treated as credentials. Prefer provider-supported webhook secrets/verification mechanisms where available. Never log full bot tokens, API keys, passwords, or session secrets.

## Reporting

Do not open a public issue containing credentials, personal information, or an exploitable vulnerability. Remove secrets from logs and commits and report the issue privately to the repository owner.
