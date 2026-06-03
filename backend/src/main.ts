import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
    }),
  );

  // CORS
  app.enableCors({
    origin: config.get<string>('ALLOWED_ORIGINS')?.split(',') ?? [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'X-Device-Fingerprint',
      'X-Locale',
      'X-Request-ID',
    ],
    credentials: config.get('CORS_CREDENTIALS') === 'true',
    maxAge: 86400,
  });

  // API versioning: /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CredSaathi API')
    .setDescription(
      `AI-Powered Alternate Credit Scoring Platform\n\n` +
        `Authentication: All endpoints (except /auth) require Bearer JWT.\n` +
        `Versioning: All endpoints prefixed /api/v1/`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Authentication and session management')
    .addServer('http://localhost:3000', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`\n🚀 CredSaathi API running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs\n`);
}
bootstrap();
