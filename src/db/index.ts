import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';
const useMockDatabase = process.env.DB_MOCK === 'true';

if (isProduction && useMockDatabase) {
  throw new Error('DB_MOCK=true is not allowed in production. Configure PostgreSQL instead.');
}

function requireDatabaseConfig() {
  const required = ['SQL_HOST', 'SQL_USER', 'SQL_PASSWORD', 'SQL_DB_NAME'] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing PostgreSQL configuration: ${missing.join(', ')}`);
  }
}

export const createPool = () => {
  if (useMockDatabase) return undefined;
  requireDatabaseConfig();

  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      port: Number(process.env.SQL_PORT || 5432),
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: Number(process.env.SQL_POOL_MAX || 10),
      connectionTimeoutMillis: Number(process.env.SQL_CONNECTION_TIMEOUT_MS || 15000),
      idleTimeoutMillis: Number(process.env.SQL_IDLE_TIMEOUT_MS || 30000),
      ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }

  return global._postgresPool;
};

const createMockDatabase = () => {
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };

  return new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp })
      : async () => [],
  });
};

export const db: any = useMockDatabase
  ? createMockDatabase()
  : drizzle(createPool()!, { schema });

if (useMockDatabase) {
  console.warn('[DEV ONLY] DB_MOCK=true: database operations are mocked and are not persisted.');
}
