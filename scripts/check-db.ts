import { createPool } from '../src/db/index.ts';

const requiredTables = [
  'users', 'customers', 'contracts', 'invoices', 'payments', 'message_logs',
  'audit_logs', 'settings', 'properties', 'areas', 'property_images',
  'property_media', 'property_requests', 'property_shares',
];

async function main() {
  if (process.env.DB_MOCK === 'true') {
    console.log('DB_MOCK=true: schema validation skipped (development only).');
    return;
  }

  const pool = createPool();
  const result = await pool!.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [requiredTables],
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(`Database schema is incomplete. Missing tables: ${missing.join(', ')}`);
  }

  console.log(`PostgreSQL schema validation passed: ${requiredTables.length} required tables found.`);
  await pool!.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
