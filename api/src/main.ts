import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { configure } from './configure.js';

async function migrateDatabase(): Promise<void> {
  const db = drizzle(process.env.DATABASE_URL!);
  await migrate(db, {
    migrationsFolder:
      process.env.MIGRATIONS_DIR ?? join(process.cwd(), 'drizzle'),
  });
  await db.$client.end();
}

async function bootstrap() {
  await migrateDatabase();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configure(app);
  // Behind the web server's nginx (and the host's, in production): count the
  // visitor's address, not the proxy's, for rate limiting.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 0));

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Flex API')
      .setDescription(
        'Desk booking for a hybrid office. Sign in with POST /api/auth/sign-in: the session cookie does the rest.',
      )
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
