export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  STAGE: process.env.NEXT_PUBLIC_STAGE || 'dev',
  ENV: process.env.NEXT_PUBLIC_ENV || 'development',
} as const;
