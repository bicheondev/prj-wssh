import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  JWT_SECRET: z.string().min(16),
  DATA_PATH: z.string().default('./data/app.db'),
  CREDENTIAL_KEY: z.string().min(32),
  ALLOW_PRIVATE_RANGES: z.string().default('false').transform((v) => v === 'true')
});

export const env = schema.parse(process.env);
