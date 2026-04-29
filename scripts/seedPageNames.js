import 'dotenv/config';
import prisma from '../utils/prismaClient.js';

export async function seedPageNames() {
  try {
    const pages = [
      { pageName: 'Homepage' },
      { pageName: 'Feature' },
      { pageName: 'System' },
    ];

    for (const page of pages) {
      await prisma.pageName.upsert({
        where: { pageName: page.pageName },
        update: {},
        create: page,
      });
    }

    console.log('🌱 Page names seeded successfully.');
  } catch (error) {
    console.error('❌ Failed to seed page names:', error);
  } finally {
    if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
      await prisma.$disconnect();
    }
  }
}

// If running directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedPageNames();
}
