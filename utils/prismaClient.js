import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const basePrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Using Prisma Extensions for optimized authorship and logging
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      // In the future, we can add global filters or automatic field injections here
      async $allOperations({ model, operation, args, query }) {
        // You can add logic here to intercept all queries
        return query(args);
      },
    },
  },
});

export default prisma;
