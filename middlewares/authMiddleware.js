import jwt from 'jsonwebtoken';
import { unauthorizedResponse, ErrorResponse } from '../utils/apiResponse.js';
import prisma from '../utils/prismaClient.js';

/**
 * Global Middleware to verify JWT Access Token
 */
export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Authentication required. Token missing.');
    }

    const token = authHeader.split(' ')[1];

    // 1. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return unauthorizedResponse(res, 'Invalid or expired session token.');
    }

    // 1b. Security Check: Reject temporary 2FA tokens from accessing protected routes
    if (!decoded.id || decoded.type === '2fa') {
      return unauthorizedResponse(res, 'Invalid session context. Please complete login or provide a valid access token.');
    }

    // 2. Database check (Ensure user exists, is active, AND session is valid)
    const [user, session] = await Promise.all([
      prisma.user.findUnique({ where: { id: decoded.id } }),
      prisma.session.findUnique({
        where: { tokenId: decoded.jti },
        select: { isActive: true },
      }),
    ]);

    if (!user || !user.isActive) {
      return unauthorizedResponse(res, "Unauthorized or inactive account.");
    }

    if (!session || !session.isActive) {
      return unauthorizedResponse(res, "error_token_expired");
    }

    // 3. Attach user data and session context to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tokenId: decoded.jti,
    };

    next();
  } catch (error) {
    console.error('Global Auth Middleware Error:', error);
    return ErrorResponse(res, 'Internal authentication error.');
  }
};

/**
 * Authorization Middleware Factory (RBAC)
 * @param  {...string} roles - Array of allowed roles
 */
export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    // This depends on the 'auth' middleware being called first
    if (!req.user) {
      return ErrorResponse(res, 'Authorization failed: No user context found.');
    }

    if (!roles.includes(req.user.role)) {
      return unauthorizedResponse(res, `Access denied: ${roles.join(' or ')} role required.`);
    }

    next();
  };
};
