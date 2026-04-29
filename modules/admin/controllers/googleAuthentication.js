import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { generateRecoveryCodes } from "../../../utils/recoveryCode.js";
import prisma from "../../../utils/prismaClient.js";
import eventBus from "../../../utils/eventBus.js";

import {
  generateAccessToken,
  generateRefreshToken,
  generateJTI,
  hashToken,
  getSessionExpiry,
} from "../../../utils/generateTokens.js";
import {
  getSessionMetadata,
  getRefreshTokenCookieOptions,
  deactivateMatchingSessions,
} from "../../../utils/sessionHelper.js";
import {
  successResponse,
  successResponseWithData,
  unsuccessResponseWithoutData,
  ErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "../../../utils/apiResponse.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

export const enable2FA = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return unauthorizedResponse(res, "error_unauthorized");
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return notFoundResponse(res, "error_not_found");
    }
    if (user.is2FAEnabled) {
      return unsuccessResponseWithoutData(res, "error_2fa_already_enabled");
    }

    const secret = speakeasy.generateSecret({
      length: 20,
    });
    const base32Secret = secret.base32.replace(/\s+/g, "").toUpperCase();

    const otpauthUrl = speakeasy.otpauthURL({
      secret: base32Secret,
      label: `ContentHub:${user.email}`,
      issuer: "ContentHub",
      encoding: "base32",
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { two_factor_temp_secret: base32Secret },
    });

    const qrCode = await qrcode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2,
    });

    return await successResponseWithData(res, "success_2fa_setup_started", {
      qrCode,
      otpauthUrl,
      secret: base32Secret,
    });
  } catch (error) {
    console.error("Enable 2FA error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

export const verify2FA = async (req, res) => {
  const userId = req.user?.id;
  const { otp } = req.body;

  if (!otp) {
    return unsuccessResponseWithoutData(res, "error_bad_request");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        two_factor_temp_secret: true,
      },
    });
    if (!user?.two_factor_temp_secret) {
      return await unsuccessResponseWithoutData(res, "error_2fa_not_initialized");
    }

    const otpValue = otp?.toString().trim();
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_temp_secret,
      encoding: "base32",
      token: otpValue,
      window: 2,
      algorithm: "sha1",
      digits: 6,
    });
    if (!isValid) {
      return await unsuccessResponseWithoutData(res, "error_invalid_otp");
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        is2FAEnabled: true,
        two_factor_secret: user.two_factor_temp_secret,
        two_factor_temp_secret: null
      },
    });
    const recoveryCodes = await generateRecoveryCodes(userId);

    eventBus.emit("auth:2fa_enabled", {
      userId,
      targetAdmins: false, // Security notification for the user only
    });

    return await successResponseWithData(res, "success_2fa_enabled", {

      recoveryCodes,
    });
  } catch (error) {
    console.error("Verify 2FA error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
export const verify2FAafterlogin = async (req, res) => {
  try {
    const { otp, tempToken } = req.body;
    if (!otp || !tempToken) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }
    let decoded;
    try {
      decoded = jwt.verify(tempToken, ACCESS_TOKEN_SECRET);
      if (decoded.type !== "2fa") {
        return await unsuccessResponseWithoutData(res, "error_invalid_twofa_token");
      }
    } catch (error) {
      return await unauthorizedResponse(res, "error_invalid_twofa_token");
    }
    const userId = decoded.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        two_factor_secret: true,
        is2FAEnabled: true,
      },
    });
    if (!user || !user.is2FAEnabled || !user.two_factor_secret) {
      return unsuccessResponseWithoutData(res, "error_2fa_disabled");
    }
    const otpValue = otp?.toString().trim();
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: otpValue,
      window: 2,
      algorithm: "sha1",
      digits: 6,
    });

    if (!isValid) {
      return unsuccessResponseWithoutData(res, "error_invalid_otp");
    }

    // 4. Update last login and generate final tokens
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      return notFoundResponse(res, "error_not_found");
    }

    const jti = generateJTI();
    const accessToken = generateAccessToken(dbUser, jti);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    // 5. Cleanup existing sessions for same device and create new session in DB
    const metadata = getSessionMetadata(req);
    await deactivateMatchingSessions(dbUser.id, metadata);

    await prisma.session.create({
      data: {
        userId: dbUser.id,
        tokenId: jti,
        refreshTokenHash,
        expiresAt: getSessionExpiry(),
        ...metadata,
      },
    });

    // 6. Set refresh token in HTTP-only secure cookie
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    const { password: _, two_factor_secret: __, ...safeUser } = dbUser;

    return await successResponseWithData(res, "success_2fa_login", {
      user: safeUser,
      accessToken,
    });
  } catch (error) {
    console.error("Verify 2FA login error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
export const verifyRecoveryCode = async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!code || !tempToken) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }
    let decoded;
    try {
      decoded = jwt.verify(tempToken, ACCESS_TOKEN_SECRET);
      if (decoded.type !== "2fa") {
        return await unsuccessResponseWithoutData(res, "error_invalid_twofa_token");
      }
    } catch (error) {
      return await unauthorizedResponse(res, "error_invalid_twofa_token");
    }
    const userId = decoded.userId;
    const recoveryCodes = await prisma.recoveryCode.findMany({
      where: {
        userId,
        isUsed: false,
      },
    });
    let matchedCode = null;
    for (const rc of recoveryCodes) {
      const isMatch = await bcrypt.compare(code, rc.codeHash);
      if (isMatch) {
        matchedCode = rc;
        break;
      }
    }
    if (!matchedCode) {
      return unsuccessResponseWithoutData(res, "error_invalid_recovery_code");
    }
    await prisma.recoveryCode.update({
      where: { id: matchedCode.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      return notFoundResponse(res, "error_not_found");
    }

    const jti = generateJTI();
    const accessToken = generateAccessToken(dbUser, jti);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    // 5. Cleanup existing sessions for same device and create new session in DB
    const metadata = getSessionMetadata(req);
    await deactivateMatchingSessions(dbUser.id, metadata);

    await prisma.session.create({
      data: {
        userId: dbUser.id,
        tokenId: jti,
        refreshTokenHash,
        expiresAt: getSessionExpiry(),
        ...metadata,
      },
    });

    // 6. Set refresh token in HTTP-only secure cookie
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    const { password: _, two_factor_secret: __, ...safeUser } = dbUser;

    return await successResponseWithData(res, "success_recovery_code_login", {
      user: safeUser,
      accessToken,
    });
  } catch (error) {
    console.error("Verify recovery code error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
export const disable2FA = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    // 1. Fetch user and verify password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return await notFoundResponse(res, "error_not_found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return await unsuccessResponseWithoutData(res, "error_invalid_credentials");
    }

    // 2. Perform cleanup in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          is2FAEnabled: false,
          two_factor_secret: null,
          two_factor_temp_secret: null,
        },
      }),
      prisma.recoveryCode.deleteMany({
        where: { userId },
      }),
    ]);

    return await successResponse(res, "success_updated");
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
