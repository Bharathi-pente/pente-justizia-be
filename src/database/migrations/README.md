# Database Migrations

This folder contains TypeORM migrations for the Justizia platform.

## Generate a new migration

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

## Run pending migrations

```bash
npm run migration:run
```

## Revert last migration

```bash
npm run migration:revert
```

## Migration naming convention

Use descriptive names with timestamp prefix (auto-generated):
- `1234567890-CreateUsersTable.ts`
- `1234567891-AddCellIdToUsers.ts`
- `1234567892-CreateCasesTable.ts`
