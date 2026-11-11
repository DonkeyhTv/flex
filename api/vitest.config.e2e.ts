import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      // The tests replace the database with PGlite; the URL is never used.
      DATABASE_URL: 'postgres://unused@localhost:1/unused',
      DEMO_SEED: 'false',
      // Plain http: the cookie can't be Secure.
      COOKIE_SECURE: 'false',
      // scrypt at its lowest cost, or every sign-in takes 128 MiB and a few hundred ms.
      SCRYPT_LOG_N: '10',
      SIGN_IN_LIMIT: '1000',
    },
  },
});
