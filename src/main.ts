import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3000;

  // ✅ Enable CORS for frontend origin
  app.enableCors({
    origin: ['http://localhost:3001'], // your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true, // allow cookies/auth if needed
  });

  await app.listen(port);

  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📋 Clio endpoints:`);
  logger.log(`   GET  http://localhost:${port}/clio/health`);
  logger.log(
    `   GET  http://localhost:${port}/clio/connect          ← open in browser`,
  );
  logger.log(
    `   GET  http://localhost:${port}/clio/callback         ← Clio calls this`,
  );
  logger.log(`   GET  http://localhost:${port}/clio/token-status/:cellId`);
  logger.log(`   GET  http://localhost:${port}/clio/matters/:cellId`);
  logger.log(`   POST http://localhost:${port}/clio/sync/:cellId`);
}

bootstrap().catch((error: any) => {
  const logger = new Logger('Bootstrap');
  logger.error(`❌ Failed to start server: ${error}`);
});
