import prisma from '../../../utils/prismaClient.js';
import {
  successResponse,
  successResponseWithData,
  unsuccessResponseWithoutData,
  ErrorResponse,
  notFoundResponse,
  validationErrorWithData,
} from '../../../utils/apiResponse.js';
import ISO6391 from 'iso-639-1';
import { LANGUAGE_COUNTRIES } from '../../../scripts/defaultLanguageData.js';

/**
 * GET /api/admin/languages
 */
export const getLanguages = async (req, res) => {
  try {
    const languages = await prisma.language.findMany({ orderBy: { languageName: 'asc' } });
    return await successResponseWithData(res, 'success_generic', languages);
  } catch (error) {
    console.error('Get languages error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * POST /api/admin/languages
 */
export const addLanguage = async (req, res) => {
  const { languageName, languageCode, countryCode, isDefault } = req.body;
  try {
    const normLangName = languageName.trim();
    const submittedCode = languageCode.trim().toUpperCase();
    const submittedCountry = countryCode.trim().toUpperCase();

    const expectedCode = ISO6391.getCode(normLangName);
    if (!expectedCode) return await unsuccessResponseWithoutData(res, 'error_bad_request');

    if (expectedCode.toUpperCase() !== submittedCode) return await unsuccessResponseWithoutData(res, 'error_bad_request');

    const validCountries = LANGUAGE_COUNTRIES[expectedCode.toUpperCase()] || [];
    if (!validCountries.includes(submittedCountry)) return await unsuccessResponseWithoutData(res, 'error_bad_request');

    const normLangCode = expectedCode.toLowerCase();
    const normCountryCode = submittedCountry;

    const existing = await prisma.language.findUnique({ where: { languageCode: normLangCode } });
    if (existing) return await unsuccessResponseWithoutData(res, 'error_already_exists');

    const rtlCodes = ['ar', 'ur'];
    const isRTL = rtlCodes.includes(normLangCode);

    if (isDefault) {
      await prisma.language.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const newLanguage = await prisma.language.create({
      data: { languageName: normLangName, languageCode: normLangCode, countryCode: normCountryCode, isDefault: !!isDefault, isActive: true, isRTL }
    });

    // Audit Context
    res.locals.afterData = newLanguage;
    res.locals.entityId = newLanguage.id;
    res.locals.entityType = 'Language';

    return await successResponseWithData(res, 'success_created', newLanguage);
  } catch (error) {
    console.error('Add language error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * PATCH /api/admin/languages/set-default
 */
export const setDefaultLanguage = async (req, res) => {
  const { newDefaultId, oldDefaultId } = req.body;
  if (!newDefaultId) return await validationErrorWithData(res, 'error_bad_request', [{ path: 'newDefaultId', message: 'Required' }]);

  try {
    const newLang = await prisma.language.findUnique({ where: { id: newDefaultId } });
    if (!newLang) return await notFoundResponse(res, 'error_not_found');

    // Audit Context: capture old default before change
    const oldDefault = await prisma.language.findFirst({ where: { isDefault: true } });
    res.locals.beforeData = oldDefault;
    res.locals.entityId = newDefaultId;
    res.locals.entityType = 'Language';

    await prisma.$transaction([
      prisma.language.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      ...(oldDefaultId ? [prisma.language.update({ where: { id: oldDefaultId }, data: { isDefault: false } })] : []),
      prisma.language.update({ where: { id: newDefaultId }, data: { isDefault: true, isActive: true } })
    ]);

    const updated = await prisma.language.findUnique({ where: { id: newDefaultId } });

    // Audit Context
    res.locals.afterData = updated;

    return await successResponseWithData(res, 'success_updated', updated);
  } catch (error) {
    console.error('Swap language error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * DELETE /api/admin/languages/:id
 */
export const deleteLanguage = async (req, res) => {
  const { id } = req.params;
  try {
    const language = await prisma.language.findUnique({ where: { id } });
    if (!language) return await notFoundResponse(res, 'error_not_found');
    if (language.isDefault) return await unsuccessResponseWithoutData(res, 'error_forbidden');
    if (language.languageCode === 'en') return await unsuccessResponseWithoutData(res, 'error_forbidden');

    // Audit Context
    res.locals.beforeData = language;
    res.locals.entityId = id;
    res.locals.entityType = 'Language';

    await prisma.language.delete({ where: { id } });
    return await successResponse(res, 'success_deleted');
  } catch (error) {
    console.error('Delete language error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};
