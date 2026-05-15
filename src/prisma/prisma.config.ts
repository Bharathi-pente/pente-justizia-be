import path from 'node:path';
import 'dotenv/config';

// Prisma schema configuration
export default {
  schema: path.join('prisma', 'schema.prisma'),
};
