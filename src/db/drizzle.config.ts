import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const required = ['SQL_HOST', 'SQL_DB_NAME', 'SQL_USER', 'SQL_PASSWORD'] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(`Missing SQL environment variables: ${missing.join(', ')}`);
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    host: process.env.SQL_HOST || '',
    port: Number(process.env.SQL_PORT || 5432),
    user: process.env.SQL_USER || '',
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME || '',
    ssl: process.env.SQL_SSL === 'true' ? 'require' : false,
  },
  verbose: true,
  strict: true,
});
