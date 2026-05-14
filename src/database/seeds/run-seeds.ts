import { AppDataSource } from "../../config/database.config";

async function runSeeds() {
  try {
    await AppDataSource.initialize();
    console.log("Database connection established");

    // Run seeds in order
    console.log("Running seeds...");

    // Add seed functions here when created
    // await seedRoles(AppDataSource);
    // await seedHqAdmin(AppDataSource);

    console.log("All seeds completed successfully");
    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error running seeds:", error);
    process.exit(1);
  }
}

runSeeds();
