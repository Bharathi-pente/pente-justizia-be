import { registerAs } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/../database/migrations/*{.ts,.js}"],
  synchronize: false, // Always false — use migrations
  logging: process.env.NODE_ENV === "development",
  ssl: {
    rejectUnauthorized: false, // For Aiven PostgreSQL
  },
};

export default registerAs("database", () => dataSourceOptions);

// Export DataSource for TypeORM CLI
export const AppDataSource = new DataSource(dataSourceOptions);
