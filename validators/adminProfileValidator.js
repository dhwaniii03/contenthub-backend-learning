import { z } from "zod";

/**
 * Validator schema for updating an admin's profile.
 * Focuses on core profile information only.
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters.")
    .max(255, "Full name must be at most 255 characters.")
    .optional(),
  
  phoneNumber: z
    .string()
    .max(20, "Phone number must be at most 20 characters.")
    .optional(),
  
  bio: z
    .string()
    .max(300, "Bio must be at most 300 characters.")
    .optional(),
});

/**
 * Validator schema for changing a password.
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required."),
  
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long.")
    .max(100, "New password is too long."),
});
