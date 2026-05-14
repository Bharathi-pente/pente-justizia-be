# Database Seeds

This folder contains seed scripts for initial data setup.

## Running seeds

```bash
npm run seed
```

## Seed files

Seeds are run in alphabetical order:
- `01-roles.seed.ts` - Create initial roles
- `02-hq-admin.seed.ts` - Create default HQ admin user
- `03-demo-cells.seed.ts` - Create demo cells (development only)

## Creating a new seed

Create a new TypeScript file following the pattern:

```typescript
import { DataSource } from 'typeorm';

export async function seedName(dataSource: DataSource) {
  // Your seed logic here
}
```

Then add it to `run-seeds.ts`.
