import { z } from "zod";

const password = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password is required",
  })
  .min(8, "Password must be at least 8 characters");

const email = z.string().email("Invalid email format");

const token = z
  .string({
    required_error: "Token is required",
  })
  .min(1, "Token is required");

export const loginSchema = z.object({
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const verifyResetTokenSchema = z.object({
  token,
});

export const resetPasswordSchema = z.object({
  token,
  newPassword: password,
});

export const refreshTokenSchema = z.object({
  refreshToken: token,
});
  