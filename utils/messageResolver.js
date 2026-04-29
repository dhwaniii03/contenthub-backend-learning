import prisma from './prismaClient.js';

/**
 * Resolves a system key to its translated content based on language code.
 * Falls back to English, then to the key name itself if no translation found.
 */
export const resolveMessage = async (keyName, langCode = 'en') => {
  try {
    const key = await prisma.systemKey.findUnique({
      where: { name: keyName },
      include: {
        translations: {
          where: {
            languageCode: { in: [langCode, 'en'] },
            status: 'PUBLISHED'
          }
        }
      }
    });

    if (!key || !key.translations.length) {
      return keyName; // Fallback to key name if not found in DB
    }

    // Attempt to find requested language
    const requestedTranslation = key.translations.find(t => t.languageCode === langCode);
    if (requestedTranslation && requestedTranslation.content) {
      return requestedTranslation.content;
    }

    // Fallback to English
    const englishTranslation = key.translations.find(t => t.languageCode === 'en');
    if (englishTranslation && englishTranslation.content) {
      return englishTranslation.content;
    }

    return keyName;
  } catch (error) {
    console.error(`Error resolving message key "${keyName}":`, error);
    return keyName;
  }
};
