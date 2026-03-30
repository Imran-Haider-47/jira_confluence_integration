import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url().optional(),
  JIRA_WEBHOOK_SECRET: z.string().optional(),
  ATLASSIAN_SITE_URL: z.string().url().optional(),
  ATLASSIAN_EMAIL: z.string().email().optional(),
  ATLASSIAN_API_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  const source = { ...process.env, ...overrides };
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg, null, 2)}`);
  }
  return parsed.data;
}
