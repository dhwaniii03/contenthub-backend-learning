import 'dotenv/config';
import prisma from '../utils/prismaClient.js';

export async function seedLanguage() {
  try {
    const existingDefault = await prisma.language.findFirst({
      where: { isDefault: true },
    });

    if (existingDefault) {
      console.log('🌍 Default language already exists. Skipping seed.');
      return;
    }

    const language = await prisma.language.upsert({
      where: { languageCode: 'en' },
      update: { isDefault: true },
      create: {
        languageCode: 'en',
        languageName: 'English',
        countryCode: 'US',
        isDefault: true,
        isActive: true,
        isRTL: false,
        sortOrder: 1,
      },
    });

    console.log(`🌱 Default language seeded successfully: ${language.languageName} (${language.languageCode})`);
  } catch (error) {
    console.error('❌ Failed to seed language:', error);
  }
}
