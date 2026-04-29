import prisma from "../../../utils/prismaClient.js";
import bcrypt from "bcryptjs";
import {
  successResponseWithData,
  successResponse,
  unsuccessResponseWithoutData,
  ErrorResponse,
  validationErrorWithData,
  notFoundResponse,
} from "../../../utils/apiResponse.js";
import mediaService from "../../../utils/mediaService.js";
import eventBus from "../../../utils/eventBus.js";

import { updateProfileSchema, changePasswordSchema } from "../../../validators/adminProfileValidator.js";

/**
 * GET /api/admin/profile
 * Fetch the currently logged-in admin's profile information.
 */
export const getAdminProfile = async (req, res) => {
  try {
    // 1. Fetch user data using ID from auth middleware
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        profilePicture: {
          select: { id: true, url: true, name: true, alternativeText: true, size: true }
        },
        role: true,
        isActive: true,
        is2FAEnabled: true,
        bio: true,
        lastLogin: true,
        createdAt: true,
        emailNotifications: true,
        systemAlerts: true,
        contentUpdateNotifications: true,
        platformAnnouncements: true,
      },
    });

    if (!admin) {
      return await notFoundResponse(res, "error_not_found");
    }

    const adminWithSimplifiedMedia = {
      ...admin,
      profilePicture: mediaService.simplifyMedia(admin.profilePicture)
    };

    return await successResponseWithData(res, "success_generic", adminWithSimplifiedMedia);
  } catch (error) {
    console.error("Get admin profile error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * PATCH /api/admin/profile
 * Update the currently logged-in admin's profile information.
 */
export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;

    // 1. Fetch current user data to handle image cleanup
    const existingUser = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!existingUser) {
      return await notFoundResponse(res, "error_not_found");
    }

    // Audit Context
    res.locals.beforeData = existingUser;
    res.locals.entityId = adminId;
    res.locals.entityType = "Admin";

    // 2. Prepare update data - EXPLICITLY ignore 'email' to keep it read-only
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return await validationErrorWithData(res, "error_validation_failed", parsed.error.issues);
    }

    const {
      fullName,
      phoneNumber,
      bio
    } = parsed.data;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (bio !== undefined) updateData.bio = bio;

    // 3. Handle Profile Picture Upload (Hybrid: file or Media ID)
    const profilePictureId = await mediaService.handleMediaField(
      'profilePicture',
      req.body.profilePicture,
      req.files,
      { name: `profile-${adminId}` }
    );

    if (profilePictureId === null) {
      // Explicit removal — disconnect the relation
      updateData.profilePicture = { disconnect: true };
    } else if (profilePictureId) {
      // New Media ID — connect the relation
      updateData.profilePicture = { connect: { id: profilePictureId } };
    }
    // undefined = no change — don't touch the field

    // 4. Execute Update
    const updatedAdmin = await prisma.user.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        profilePicture: {
          select: { id: true, url: true, name: true, alternativeText: true, size: true }
        },
        bio: true,
        lastLogin: true,
        createdAt: true,
      }
    });

    // Audit Context
    res.locals.afterData = updatedAdmin;

    // Format the profile picture (Simplified: id and url only)
    const responseWithSimplifiedMedia = {
      ...updatedAdmin,
      profilePicture: mediaService.simplifyMedia(updatedAdmin.profilePicture)
    };

    eventBus.emit("data:updated", {
      module: "PROFILE",
      title: "Profile Updated",
      message: "Your profile information has been successfully updated.",
      userId: adminId,
      targetAdmins: false // Only send to the user themselves
    });

    return await successResponseWithData(res, "success_profile_updated", responseWithSimplifiedMedia);

  } catch (error) {
    console.error("Update admin profile error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * POST /api/admin/profile/change-password
 * Change the admin's password after verifying the current one.
 */
export const changePassword = async (req, res) => {
  try {
    const adminId = req.user.id;

    // 1. Validation
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return await validationErrorWithData(res, "error_validation_failed", parsed.error.issues);
    }

    const { currentPassword, newPassword } = parsed.data;

    // 2. Fetch admin's current password hash
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { passwordHash: true }
    });

    if (!admin) {
      return await notFoundResponse(res, "error_not_found");
    }

    // 2. Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: adminId },
      data: { passwordHash: newPasswordHash }
    });

    // Audit Context
    res.locals.entityId = adminId;
    res.locals.entityType = "Admin";
    res.locals.metadata = { action_type: "PASSWORD_CHANGE" };

    eventBus.emit("auth:2fa_enabled", { // Using security event type
      module: "AUTH",
      title: "Password Changed",
      message: "Your account password has been changed successfully. If you did not perform this action, please contact support immediately.",
      userId: adminId,
      targetAdmins: false
    });

    return await successResponse(res, "success_updated");

  } catch (error) {
    console.error("Change password error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * PATCH /api/admin/profile/toggle-notification?type=...
 * Toggle a specific notification preference based on the 'type' query parameter.
 */
export const toggleNotification = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { type } = req.query;

    const allowedTypes = [
      "emailNotifications",
      "systemAlerts",
      "contentUpdateNotifications",
      "platformAnnouncements"
    ];

    if (!allowedTypes.includes(type)) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    // 1. Get current value
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { [type]: true }
    });

    if (!admin) {
      return await notFoundResponse(res, "error_not_found");
    }

    // Audit Context
    res.locals.beforeData = admin;
    res.locals.entityId = adminId;
    res.locals.entityType = "Admin";
    res.locals.metadata = { field_toggled: type };

    // 2. Toggle and save
    const updatedAdmin = await prisma.user.update({
      where: { id: adminId },
      data: { [type]: !admin[type] },
      select: { [type]: true }
    });

    // Audit Context
    res.locals.afterData = updatedAdmin;

    return await successResponseWithData(res, "success_updated", { [type]: updatedAdmin[type] });
  } catch (error) {
    console.error("Toggle notification error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
