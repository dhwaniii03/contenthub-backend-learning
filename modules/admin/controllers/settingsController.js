import prisma from "../../../utils/prismaClient.js";
import {
  successResponse,
  successResponseWithData,
  unsuccessResponseWithoutData,
  ErrorResponse,
} from "../../../utils/apiResponse.js";
import { deleteFile } from "../../../utils/fileHelper.js";

/**
 * Get all global settings
 */
export const getGlobalSettings = async (req, res) => {
  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { id: 1 },
      select: {
        general: true,
        seo: true,
        preferences: true,
      },
    });

    if (!settings) {
      return successResponseWithData(res, "Settings retrieved", {
        general: {},
        seo: {},
        preferences: {},
      });
    }

    return successResponseWithData(
      res,
      "Settings retrieved successfully",
      settings,
    );
  } catch (error) {
    console.error("Get settings error:", error);
    return ErrorResponse(res, "Internal server error");
  }
};

/**
 * Update General Settings (Site Name, Email, Logo, Favicon)
 */
export const updateGeneralSettings = async (req, res) => {
  const { siteName, siteDescription, contactEmail } = req.body;

  try {
    // 1. Get current settings to handle file deletions
    const currentSettings = await prisma.globalSettings.findUnique({
      where: { id: 1 },
    });
    const existingGeneral = currentSettings?.general || {};

    // Audit Context: capture before state
    res.locals.beforeData = currentSettings;
    res.locals.entityId = "1";
    res.locals.entityType = "GlobalSettings";

    // 2. Initialize the new general object with text fields
    const general = {
      siteName: siteName !== undefined ? siteName : existingGeneral.siteName,
      siteDescription:
        siteDescription !== undefined
          ? siteDescription
          : existingGeneral.siteDescription,
      contactEmail:
        contactEmail !== undefined
          ? contactEmail
          : existingGeneral.contactEmail,
      logo: existingGeneral.logo, // Start with the existing file path
      favicon: existingGeneral.favicon, // Start with the existing file path
    };

    // 3. Handle LOGO
    if (req.files && req.files.logo && req.files.logo[0]) {
      // CASE A: NEW FILE UPLOADED
      if (existingGeneral.logo) deleteFile(existingGeneral.logo);
      general.logo = req.files.logo[0].path.replace(/\\/g, "/");
    } else if (
      req.body.logo === "null" ||
      req.body.logo === null ||
      req.body.logo === ""
    ) {
      // CASE B: EXPLICIT REMOVAL (including Swagger's "Send empty value")
      if (existingGeneral.logo) deleteFile(existingGeneral.logo);
      general.logo = null;
    }
    // CASE C: DO NOTHING (FALLBACK TO INITIALIZED EXISTING LOGO)

    // 4. Handle FAVICON
    if (req.files && req.files.favicon && req.files.favicon[0]) {
      // CASE A: NEW FILE UPLOADED
      if (existingGeneral.favicon) deleteFile(existingGeneral.favicon);
      general.favicon = req.files.favicon[0].path.replace(/\\/g, "/");
    } else if (
      req.body.favicon === "null" ||
      req.body.favicon === null ||
      req.body.favicon === ""
    ) {
      // CASE B: EXPLICIT REMOVAL (including Swagger's "Send empty value")
      if (existingGeneral.favicon) deleteFile(existingGeneral.favicon);
      general.favicon = null;
    }
    // CASE C: DO NOTHING (FALLBACK TO INITIALIZED EXISTING FAVICON)

    // 5. Upsert the singleton record
    const updatedSettings = await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: { general },
      create: {
        id: 1,
        general,
        seo: {},
        preferences: {},
      },
    });

    // Audit Context: capture after state
    res.locals.afterData = updatedSettings;

    return successResponseWithData(
      res,
      "General settings updated successfully",
      updatedSettings.general,
    );
  } catch (error) {
    console.error("Update general settings error:", error);
    return ErrorResponse(res, "Internal server error");
  }
};

/**
 * Update SEO Settings
 */
export const updateSeoSettings = async (req, res) => {
  const { metaTitle, metaDescription, keywords } = req.body;

  try {
    const currentSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
    res.locals.beforeData = currentSettings;
    res.locals.entityId = "1";
    res.locals.entityType = "GlobalSettings";

    const seo = { metaTitle, metaDescription, keywords };

    await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: { seo },
      create: {
        id: 1,
        general: {},
        seo,
        preferences: {},
      },
    });

    // Audit Context: capture after state
    const updatedSeoSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
    res.locals.afterData = updatedSeoSettings;

    return successResponse(res, "SEO settings updated successfully");
  } catch (error) {
    console.error("Update SEO settings error:", error);
    return ErrorResponse(res, "Internal server error");
  }
};

/**
 * Update Platform Preferences (Feature Toggles)
 */
export const updatePreferences = async (req, res) => {
  const preferences = req.body; // Expecting an object of toggles

  try {
    const currentSettings = await prisma.globalSettings.findUnique({ where: { id: 1 } });
    res.locals.beforeData = currentSettings;
    res.locals.entityId = "1";
    res.locals.entityType = "GlobalSettings";

    await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: { preferences },
      create: {
        id: 1,
        general: {},
        seo: {},
        preferences,
      },
    });

    // Audit Context: capture after state
    const updatedPreferences = await prisma.globalSettings.findUnique({ where: { id: 1 } });
    res.locals.afterData = updatedPreferences;

    return successResponseWithData(
      res,
      "Preferences updated successfully",
      preferences,
    );
  } catch (error) {
    console.error("Update preferences error:", error);
    return ErrorResponse(res, "Internal server error");
  }
};
/**
 * Reset All Settings (General, SEO, Preferences AND Languages)
 */
export const resetAllSettings = async (req, res) => {
  try {
    const currentSettings = await prisma.globalSettings.findUnique({
      where: { id: 1 },
    });
    const existingGeneral = currentSettings?.general || {};

    // Audit Context: capture before state
    res.locals.beforeData = currentSettings;
    res.locals.entityId = "1";
    res.locals.entityType = "GlobalSettings";

    // 1. Delete physical files if they exist
    if (existingGeneral.logo) deleteFile(existingGeneral.logo);
    if (existingGeneral.favicon) deleteFile(existingGeneral.favicon);

    // 2. Perform all resets in a transaction
    await prisma.$transaction([
      // Reset GlobalSettings row
      prisma.globalSettings.upsert({
        where: { id: 1 },
        update: {
          general: {},
          seo: {},
          preferences: {},
        },
        create: {
          id: 1,
          general: {},
          seo: {},
          preferences: {},
        },
      }),
      // Delete all languages except English
      prisma.language.deleteMany({
        where: { languageCode: { not: "en" } },
      }),
      // Ensure English is default and active
      prisma.language.updateMany({
        where: { languageCode: "en" },
        data: { isDefault: true, isActive: true },
      }),
    ]);

    return successResponse(
      res,
      "All settings and languages have been reset successfully",
    );
  } catch (error) {
    console.error("Reset all settings error:", error);
    return ErrorResponse(res, "Internal server error");
  }
};
