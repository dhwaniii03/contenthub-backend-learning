import { logAudit } from '../utils/auditService.js';

/**
 * withAudit supports two usage patterns:
 *
 * Pattern 1 — Wrap a handler directly (used in authRoutes):
 *   withAudit(login, { action: 'LOGIN', module: 'AUTH' })
 *   Returns a single Express middleware function.
 *
 * Pattern 2 — Inline middleware factory (used in collection/profile/settings routes):
 *   router.post('/', withAudit({ action: 'CREATE', module: 'COLLECTION' }), handler)
 *   Returns an Express middleware that runs AFTER the handler has already run.
 *
 * In Pattern 2, the middleware runs BEFORE the controller. To log AFTER,
 * we override res.json to capture the response and log after send.
 */
export const withAudit = (handlerOrConfig, config) => {
  // Pattern 1: withAudit(fn, config) — wraps a handler
  if (typeof handlerOrConfig === 'function') {
    const handler = handlerOrConfig;
    return async (req, res, next) => {
      try {
        await handler(req, res, next);

        const {
          beforeData,
          afterData,
          entityId,
          dynamicDescription,
          dynamicMetadata,
          sessionId,
          entityType,
        } = res.locals;

        logAudit({
          userId: req.user?.id,
          sessionId: sessionId || req.user?.tokenId,
          action: config.action,
          module: config.module,
          entityType: entityType || config.entityType,
          entityId,
          description: dynamicDescription || config.description,
          changes: (beforeData || afterData) ? { before: beforeData, after: afterData } : undefined,
          metadata: dynamicMetadata,
          req,
          status: 'SUCCESS',
        });
      } catch (error) {
        logAudit({
          userId: req.user?.id,
          sessionId: res.locals.sessionId || req.user?.tokenId,
          action: config.action,
          module: config.module,
          entityType: config.entityType,
          description: `Error: ${config.description || config.action}`,
          metadata: {
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
          req,
          status: 'FAILED',
        });
        next(error);
      }
    };
  }

  // Pattern 2: withAudit(config) — inline middleware, runs before controller
  // We hook into res.json to fire-and-forget the audit log after the response is sent.
  const cfg = handlerOrConfig;
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Call the original json so the response is sent
      const result = originalJson(body);

      // After response, fire-and-forget the audit log
      const {
        beforeData,
        afterData,
        entityId,
        dynamicDescription,
        dynamicMetadata,
        sessionId,
        entityType,
      } = res.locals;

      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

      logAudit({
        userId: req.user?.id,
        sessionId: sessionId || req.user?.tokenId,
        action: cfg.action,
        module: cfg.module,
        entityType: entityType || cfg.entityType,
        entityId,
        description: dynamicDescription || cfg.description,
        changes: (beforeData || afterData) ? { before: beforeData, after: afterData } : undefined,
        metadata: dynamicMetadata,
        req,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
      });

      return result;
    };

    next();
  };
};
