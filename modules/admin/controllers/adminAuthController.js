import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../../utils/prismaClient.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generate2FAToken,
  generateJTI,
  hashToken,
  getSessionExpiry,
} from "../../../utils/generateTokens.js";
import {
  successResponseWithData,
  unauthorizedResponse,
  unsuccessResponseWithoutData,
  ErrorResponse,
  successResponse,
  notFoundResponse,
} from "../../../utils/apiResponse.js";
import {
  getSessionMetadata,
  getRefreshTokenCookieOptions,
  deactivateMatchingSessions,
} from "../../../utils/sessionHelper.js";
import { sendEmail } from "../../../utils/emailService.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validation
    if (!email || !password) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    // 2. Find admin
    const admin = await prisma.user.findUnique({ where: { email } });

    if (!admin || admin.role !== "admin") {
      return await unsuccessResponseWithoutData(
        res,
        "error_invalid_credentials",
      );
    }

    // Check if account is active
    if (!admin.isActive) {
      return await unauthorizedResponse(res, "error_unauthorized");
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return await unsuccessResponseWithoutData(
        res,
        "error_invalid_credentials",
      );
    }

    // 4. If 2FA is enabled, return a temporary token and wait for second-factor verification.
    if (admin.is2FAEnabled) {
      const tempToken = generate2FAToken(admin.id);
      return await successResponseWithData(res, "success_2fa_required", {
        twoFactorRequired: true,
        tempToken,
        user: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
        },
      });
    }

    // 5. Update last login and generate tokens for normal login
    await prisma.user.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const jti = generateJTI();
    const accessToken = generateAccessToken(admin, jti);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    // 6. Cleanup existing sessions for same device and store new session in DB
    const metadata = getSessionMetadata(req);
    await deactivateMatchingSessions(admin.id, metadata);

    await prisma.session.create({
      data: {
        userId: admin.id,
        tokenId: jti,
        refreshTokenHash,
        expiresAt: getSessionExpiry(),
        ...metadata,
      },
    });

    // 7. Set refresh token in HTTP-only secure cookie
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    // Audit Context
    res.locals.sessionId = jti;
    res.locals.entityId = admin.id;
    res.locals.dynamicDescription = `Admin logged in: ${admin.email}`;
    res.locals.dynamicMetadata = { email: admin.email };

    return await successResponseWithData(res, "success_login", {
      accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    const admin = await prisma.user.findUnique({ where: { email } });

    if (!admin || admin.role !== "admin") {
      return await notFoundResponse(res, "error_not_found");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    await prisma.token.upsert({
      where: { token: hashedToken },
      update: { token: hashedToken, expiresAt },
      create: {
        userId: admin.id,
        token: hashedToken,
        expiresAt,
        type: "PASSWORD_RESET",
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}?token=${resetToken}`;
    await sendEmail("PASSWORD_RESET", admin.email, {
      name: admin.fullName || "Admin",
      reset_link: resetUrl,
    });

    return await successResponse(res, "success_created");
  } catch (error) {
    console.error("Forgot password error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const verifyResetToken = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const storedToken = await prisma.token.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.type !== "PASSWORD_RESET") {
      return await unauthorizedResponse(res, "error_token_expired");
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.token.delete({ where: { id: storedToken.id } });
      return await unauthorizedResponse(res, "error_token_expired");
    }

    return await successResponseWithData(res, "success_generic", {
      email: storedToken.user.email,
    });
  } catch (error) {
    console.error("Verify token error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const storedToken = await prisma.token.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.type !== "PASSWORD_RESET") {
      return await unauthorizedResponse(res, "error_token_expired");
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.token.delete({ where: { id: storedToken.id } });
      return await unauthorizedResponse(res, "error_token_expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash },
    });
    await prisma.token.deleteMany({
      where: { userId: storedToken.userId, type: "PASSWORD_RESET" },
    });

    return await successResponse(res, "success_updated");
  } catch (error) {
    console.error("Reset password error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.cookies;

  try {
    if (!refreshToken) {
      return await unauthorizedResponse(res, "error_token_expired");
    }

    const hashedRT = hashToken(refreshToken);

    // Find active session in DB
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash: hashedRT,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session || !session.user || !session.user.isActive) {
      return await unauthorizedResponse(res, "error_token_expired");
    }

    // Generate a new access token using the SAME jti
    const accessToken = generateAccessToken(session.user, session.tokenId);

    return await successResponseWithData(res, "success_generic", {
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      const hashedRT = hashToken(refreshToken);
      await prisma.session.updateMany({
        where: { refreshTokenHash: hashedRT },
        data: { isActive: false },
      });
    }

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    // Audit Context
    res.locals.sessionId = req.user?.tokenId;
    res.locals.dynamicDescription = `User logged out`;

    return await successResponse(res, "success_generic");
  } catch (error) {
    console.error("Logout error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        tokenId: true,
        device: true,
        os: true,
        browser: true,
        ipAddress: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: {
        lastActiveAt: "desc",
      },
    });

    // Add isCurrent flag by comparing with the tokenId from the current active request
    const sessionsWithCurrent = sessions.map((s) => ({
      ...s,
      isCurrent: s.tokenId === req.user.tokenId,
    }));

    return await successResponseWithData(
      res,
      "success_generic",
      sessionsWithCurrent,
    );
  } catch (error) {
    console.error("Get sessions error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const revokeSession = async (req, res) => {
  const { tokenId } = req.body;

  try {
    if (!tokenId) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    // Ensure users can only revoke their own sessions
    const session = await prisma.session.findFirst({
      where: {
        tokenId,
        userId: req.user.id,
      },
    });

    if (!session) {
      return await notFoundResponse(res, "error_not_found");
    }

    await prisma.session.update({
      where: { tokenId },
      data: { isActive: false },
    });

    return await successResponse(res, "success_generic");
  } catch (error) {
    console.error("Revoke session error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const logoutAllSessions = async (req, res) => {
  try {
    await prisma.session.updateMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      data: { isActive: false },
    });

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    return await successResponse(res, "success_generic");
  } catch (error) {
    console.error("Logout All error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
