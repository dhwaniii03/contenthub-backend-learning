import eventBus from "../utils/eventBus.js";
import prisma from "../utils/prismaClient.js";
import { sendToAdmins, sendToUser } from "../utils/socket.js";

/**
 * Service to handle notification logic and event processing
 */
class NotificationService {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    // 1. Creation Events
    eventBus.on("data:created", async (payload) => {
      await this.processNotification({
        type: "CREATION",
        ...payload,
      });
    });

    // 2. Deletion Events
    eventBus.on("data:deleted", async (payload) => {
      await this.processNotification({
        type: "DELETION",
        ...payload,
      });
    });

    // 3. Security Events (2FA)
    eventBus.on("auth:2fa_enabled", async (payload) => {
      await this.processNotification({
        type: "SECURITY",
        module: "AUTH",
        title: "2FA Enabled",
        message: "Two-factor authentication has been successfully enabled for your account.",
        ...payload,
      });
    });
  }

  /**
   * Main logic for storing and sending notifications
   */
  async processNotification({ type, module, title, message, data, userId, targetAdmins = true }) {
    try {
      const notificationBase = {
        type,
        module,
        title,
        message,
        data,
      };

      // 1. Determine Recipients
      let recipients = [];
      if (targetAdmins) {
        // Fetch all active admins (includes the person who performed the action)
        const admins = await prisma.user.findMany({
          where: {
            role: "admin",
            isActive: true,
          },
          select: { id: true },
        });
        recipients = admins.map(a => a.id);
      } else if (userId) {
        // Only the specific user (e.g. for security events)
        recipients = [userId];
      }

      // 2. Persist in DB for all recipients
      const creationPromises = recipients.map((id) =>
        prisma.notification.create({
          data: {
            ...notificationBase,
            userId: id,
          },
        })
      );

      await Promise.all(creationPromises);

      // 3. Real-time delivery
      if (targetAdmins) {
        // Broadcast to everyone in the admin room (includes the current user)
        sendToAdmins("new_notification", notificationBase);
      } else if (userId) {
        // Private delivery
        sendToUser(userId, "new_notification", notificationBase);
      }
    } catch (error) {
      console.error("Error processing notification:", error);
    }
  }

}

// Export a singleton instance
const notificationService = new NotificationService();
export default notificationService;
