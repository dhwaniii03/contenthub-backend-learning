import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaClient.js';

const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@contenthub.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
  fullName: process.env.ADMIN_FULL_NAME || 'Super Admin',
  role: 'admin',
};

export async function seedAdmin() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (existingAdmin) {
      console.log(' Admin already exists. Skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

    const admin = await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN.email,
        passwordHash,
        fullName: DEFAULT_ADMIN.fullName,
        role: DEFAULT_ADMIN.role,
        isActive: true,
      },
    });

    console.log(`🌱 Admin seeded successfully: ${admin.email}`);
  } catch (error) {
    console.error('❌ Failed to seed admin:', error);
  } finally {
    if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
      await prisma.$disconnect();
    }
  }
}


