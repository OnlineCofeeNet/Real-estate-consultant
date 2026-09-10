# Production Checklist

Before deploying the application:

- Set `NODE_ENV=production`.
- Set a strong, unique `AUTH_SECRET` in the deployment secret store.
- Set `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, and `SQL_DB_NAME` through secrets/environment variables.
- Set `CORS_ORIGIN` to the exact trusted frontend origin(s).
- Do not commit `bot-settings.json`, `bot-users.json`, database files, or `.env` files.
- Verify database backups and restore procedures before the first production migration.
- Run `npm ci`, `npm run lint`, and `npm run build`.
- Review bot/SMS credentials and webhook configuration before enabling messaging.
