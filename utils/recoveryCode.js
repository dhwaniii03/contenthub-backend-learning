import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "./prismaClient.js";

function generateRandomCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export const generateRecoveryCodes = async (userId) => {
  const plainCodes = Array.from({ length: 5 }, generateRandomCode);

  const hashedData = await Promise.all(
    plainCodes.map(async (code) => ({
      userId,
      codeHash: await bcrypt.hash(code, 10),
    })),
  );

  // Use a transaction to ensure old codes are deleted and new ones are created atomically
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({
      where: { userId },
    }),
    prisma.recoveryCode.createMany({
      data: hashedData,
    }),
  ]);

  return plainCodes;
};
