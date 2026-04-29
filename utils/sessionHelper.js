import { UAParser } from "ua-parser-js";
import prisma from "./prismaClient.js";

/**
 * Extracts device, OS, browser and IP information from request.
 * @param {import('express').Request} req 
 * @returns {object} { device, os, browser, ipAddress }
 */
export const getSessionMetadata = (req) => {
  const uaString = req.headers["user-agent"];
  const parser = new UAParser(uaString);
  const result = parser.getResult();

  // Extract IP - handle proxy forwarding
  const ipAddress = (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    ""
  ).split(",")[0].trim();

  // Format device info
  // If device type is missing, we check if it's desktop (common in ua-parser-js)
  const deviceType = result.device.type || "desktop";
  const deviceVendor = result.device.vendor ? `${result.device.vendor} ` : "";
  const deviceModel = result.device.model || "";
  const finalDevice = `${deviceVendor}${deviceModel}`.trim() || deviceType;

  return {
    device: finalDevice,
    os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
    browser: `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
    ipAddress: ipAddress,
  };
};

/**
 * Common cookie options for refresh tokens.
 */
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/admin/auth", // Allow both refresh and logout
});

/**
 * Deactivates any existing and active sessions for the same user on the same browser/OS.
 * @param {string} userId 
 * @param {object} metadata { browser, os }
 */
export const deactivateMatchingSessions = async (userId, { browser, os }) => {
  await prisma.session.updateMany({
    where: {
      userId,
      browser,
      os,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });
};
