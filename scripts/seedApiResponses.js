import 'dotenv/config';
import prisma from '../utils/prismaClient.js';

export async function seedApiResponses() {
  try {
    // 1. Ensure "System" PageName exists
    const systemPage = await prisma.pageName.upsert({
      where: { pageName: 'System' },
      update: {},
      create: { pageName: 'System' },
    });

    const language = await prisma.language.findFirst({ where: { languageCode: 'en' } });
    if (!language) {
      // Seed English if missing
      await prisma.language.create({
        data: { languageCode: 'en', languageName: 'English', countryCode: 'US', isDefault: true }
      });
    }

    const responses = [
      // Success Keys
      { name: 'success_generic', content: 'Operation successful' },
      { name: 'success_created', content: 'Resource created successfully' },
      { name: 'success_updated', content: 'Resource updated successfully' },
      { name: 'success_deleted', content: 'Resource deleted successfully' },
      { name: 'success_login', content: 'Login successful' },
      { name: 'success_profile_updated', content: 'Profile updated successfully' },
      { name: 'success_content_created', content: 'Content created successfully' },
      { name: 'success_content_updated', content: 'Content updated successfully' },
      { name: 'success_content_deleted', content: 'Content soft-deleted successfully' },
      { name: 'success_2fa_setup_started', content: '2FA setup started successfully' },
      { name: 'success_2fa_enabled', content: 'Two-factor authentication enabled successfully' },
      { name: 'success_2fa_login', content: '2FA login successful' },
      { name: 'success_recovery_code_login', content: 'Login successful using recovery code' },

      // Error Keys - Auth
      { name: 'error_unauthorized', content: 'Unauthorized access', type: 'ERROR' },
      { name: 'error_invalid_credentials', content: 'Invalid email or password', type: 'ERROR' },
      { name: 'error_account_disabled', content: 'Your account has been disabled', type: 'ERROR' },
      { name: 'error_token_expired', content: 'Your session has expired. Please log in again.', type: 'ERROR' },
      { name: 'error_forbidden', content: 'You do not have permission to perform this action', type: 'ERROR' },

      // Error Keys - General / Validation
      { name: 'error_internal_server', content: 'A system error occurred. Please try again later.', type: 'ERROR' },
      { name: 'error_not_found', content: 'The requested resource was not found', type: 'ERROR' },
      { name: 'error_bad_request', content: 'Invalid request parameters or missing fields', type: 'ERROR' },
      { name: 'error_validation_failed', content: 'Validation failed. Please check your input.', type: 'ERROR' },
      { name: 'error_already_exists', content: 'A resource with this name already exists', type: 'ERROR' },
      { name: 'error_conflict', content: 'A conflict occurred while processing the request', type: 'ERROR' },
      { name: 'error_2fa_already_enabled', content: 'Two-factor authentication is already enabled', type: 'ERROR' },
      { name: 'error_2fa_not_initialized', content: 'Two-factor authentication is not initialized', type: 'ERROR' },
      { name: 'error_invalid_otp', content: 'The authentication code entered is invalid', type: 'ERROR' },
      { name: 'error_2fa_disabled', content: 'Two-factor authentication is disabled', type: 'ERROR' },
      { name: 'error_invalid_recovery_code', content: 'Invalid recovery code', type: 'ERROR' },
      { name: 'error_invalid_twofa_token', content: 'Invalid or expired two-factor authentication token', type: 'ERROR' },
      { name: 'error_inactive_content_type', content: 'This content type is currently inactive', type: 'ERROR' },
      { name: 'error_media_not_allowed', content: 'Media uploads are disabled for this content type', type: 'ERROR' },
      { name: 'error_tags_not_allowed', content: 'Tags are disabled for this content type', type: 'ERROR' },
      { name: 'error_missing_id', content: 'Required ID is missing', type: 'ERROR' },
    ];

    for (const res of responses) {
      const key = await prisma.systemKey.upsert({
        where: { name: res.name },
        update: {
          pageNameId: systemPage.id,
          type: res.type || 'TEXT',
          isPredefined: true,
        },
        create: {
          name: res.name,
          pageNameId: systemPage.id,
          type: res.type || 'TEXT',
          isPredefined: true,
        },
      });

      // Add English translation
      await prisma.systemTranslation.upsert({
        where: {
          keyId_languageCode: {
            keyId: key.id,
            languageCode: 'en',
          },
        },
        update: { content: res.content },
        create: {
          keyId: key.id,
          languageCode: 'en',
          content: res.content,
          status: 'PUBLISHED',
        },
      });
    }

    console.log('🌱 API Response keys seeded successfully.');
  } catch (error) {
    console.error('❌ Failed to seed API response keys:', error);
  } finally {
    if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
      await prisma.$disconnect();
    }
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedApiResponses();
}
