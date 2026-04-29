import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./prismaClient.js";

let io;

/**
 * Initialize Socket.io with the HTTP server
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });


  // Authentication Middleware for Socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const [user, session] = await Promise.all([
        prisma.user.findUnique({ where: { id: decoded.id } }),
        prisma.session.findUnique({
          where: { tokenId: decoded.jti },
          select: { isActive: true },
        }),
      ]);

      if (!user || !user.isActive || !session || !session.isActive) {
        return next(new Error("Authentication error: Invalid or inactive session"));
      }

      // Attach user info to socket
      socket.user = { id: user.id, role: user.role };
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id} (${socket.id})`);

    // Join a private room for targeted notifications
    socket.join(`user_${socket.user.id}`);

    // Join an admin room for system-wide updates
    if (socket.user.role === "admin") {
      socket.join("admin_room");
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

/**
 * Get the initialized Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

/**
 * Send notification to a specific user
 */
export const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

/**
 * Send notification to all admins
 */
export const sendToAdmins = (event, data) => {
  if (io) {
    io.to("admin_room").emit(event, data);
  }
};
