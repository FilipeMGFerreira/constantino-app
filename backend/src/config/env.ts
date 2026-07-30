import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/** Strip BOM, wrapping quotes and whitespace from Render/dashboard pastes. */
function cleanEnvString(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z
    .string()
    .min(1)
    .transform(cleanEnvString)
    .refine(
      (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
      'MONGODB_URI must start with mongodb:// or mongodb+srv:// (check quotes/spaces in Render)'
    ),
  JWT_SECRET: z.string().min(8).transform(cleanEnvString),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:4200').transform(cleanEnvString),
  FRONTEND_URL: z.string().default('http://localhost:4200').transform(cleanEnvString),
  CRON_SECRET: z.string().default('constantino-cron-secret').transform(cleanEnvString),
  ENABLE_CRON: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  const raw = process.env.MONGODB_URI;
  if (raw !== undefined) {
    console.error(
      'MONGODB_URI raw preview:',
      JSON.stringify(raw.slice(0, 24)),
      `(len=${raw.length})`
    );
  } else {
    console.error('MONGODB_URI is missing on this service');
  }
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

console.log(
  'Env OK — Mongo scheme:',
  env.MONGODB_URI.startsWith('mongodb+srv://') ? 'mongodb+srv' : 'mongodb'
);
