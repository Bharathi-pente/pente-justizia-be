import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix("api");

  // Security - Helmet
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Documentation (only in development)
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Justizia API")
      .setDescription("Multi-tenant legal operations intelligence platform API")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT token from Keycloak",
          in: "header",
        },
        "JWT-auth",
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    console.log(
      "\n📚 Swagger documentation available at: http://localhost:3001/api/docs\n",
    );
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   🚀 Justizia Backend API is running!      │
  │                                             │
  │   Port: ${port}                               │
  │   Environment: ${process.env.NODE_ENV || "development"}              │
  │   API Base: http://localhost:${port}/api       │
  │                                             │
  └─────────────────────────────────────────────┘
  `);
}

bootstrap();
