import { z } from 'zod';

export const env = z.object({
  PORT: z.coerce.number().default(8080),
  DATA_PATH: z.string().default('./data/app.db'),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  ADMIN_ALLOW_PRIVATE_NETWORKS: z.enum(['true','false']).default('false').transform(v=>v==='true'),
  MAX_SESSIONS_PER_USER: z.coerce.number().default(4),
  SSH_CONNECT_TIMEOUT_MS: z.coerce.number().default(15000)
}).parse(process.env);
