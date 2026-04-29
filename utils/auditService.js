import prisma from './prismaClient.js';

/**
 * Logs an action to the audit_logs table.
 * Designed to be a centralized point for all system activity tracking.
 * 
 * @param {Object} params
 * @param {string} [params.userId] - The ID of the user performing the action
 * @param {string} [params.sessionId] - The session ID (jti)
 * @param {string} params.action - The action type (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} [params.module] - The functional module (e.g., 'AUTH', 'COLLECTION')
 * @param {string} [params.entityType] - The affected entity name
 * @param {string} [params.entityId] - The ID of the affected entity
 * @param {string} [params.description] - Human readable description
 * @param {Object} [params.changes] - Before/After snapshot of data
 * @param {Object} [params.metadata] - Extra context (errors, flags, etc.)
 * @param {Object} [params.req] - Express request object to extract IP and User-Agent
 * @param {string} [params.status] - SUCCESS or FAILED
 */
export const logAudit = async ({
  userId,
  sessionId,
  action,
  module,
  entityType,
  entityId,
  description,
  changes,
  metadata,
  req,
  status = "SUCCESS"
}) => {
  try {
    const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress;
    const userAgent = req?.headers['user-agent'];

    await prisma.auditLog.create({
      data: {
        userId,
        sessionId,
        action,
        module,
        entityType,
        entityId,
        description,
        changes: changes || undefined,
        metadata: metadata || undefined,
        ipAddress,
        userAgent,
        status
      }
    });
  } catch (error) {
    console.error("Audit Logging Error:", error);
  }
};
