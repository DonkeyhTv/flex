import {
  StandardSchemaValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { trustedOrigins } from './app.module.js';

/** Shared by main.ts and the e2e tests: everything but migrating and listening. */
export function configure(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  // Refuses writes posted from another website's page, on every route.
  app.enableCsrfProtection({ trustedOrigins });
  app.enableShutdownHooks();
  return app;
}
