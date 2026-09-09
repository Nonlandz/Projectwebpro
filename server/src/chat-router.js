import express from "express";
import { prisma } from "./db.js";
import { authenticate, ownParam } from "./middleware/auth.js";
import { publicUser, pageArgs } from "./shared.js";
const chatPost = { select: { id: true, title: true, imagePath: true, Images: { select: { id: true }, orderBy: { createdAt: "asc" } } } };
const publicChatMessage = message => message?.Post ? { ...message, Post: { ...message.Post, hasLegacyImage: Boolean(message.Post.imagePath), imagePath: undefined } } : message;
export function createChatRouter(db = prisma, auth = authenticate) {
  const router = express.Router();
  router.use(auth);
  const thread = (userId, otherUserId) => ({ OR: [{ senderId: userId, recipientId: otherUserId }, { senderId: otherUserId, recipientId: userId }], NOT: { hiddenFor: { has: userId } } });
  router.delete("/messages/:messageId", async (req, res) => {
    try {
      const result = await db.message.deleteMany({ where: { id: req.params.messageId, senderId: req.user.id } });
      if (!result.count) return res.status(404).json({ message: "Message not found or you cannot unsend it" });
      res.sendStatus(204);
    } catch { res.status(500).json({ message: "Failed to unsend message" }); }
  });
  router.delete("/conversations/:otherUserId", async (req, res) => {
    try {
      await db.message.updateMany({ where: thread(req.user.id, req.params.otherUserId), data: { hiddenFor: { push: req.user.id } } });
      res.sendStatus(204);
    } catch { res.status(500).json({ message: "Failed to delete conversation" }); }
  });
  router.get("/conversations/:userId", ownParam("userId"), async (req, res) => {
    try {
      const userId = req.user.id;
      const { take, skip } = pageArgs(req.query);
      const rows = await db.$queryRaw`
        SELECT * FROM (
          SELECT DISTINCT ON ("otherId") * FROM (
            SELECT "id", "createdAt", CASE WHEN "senderId" = ${userId} THEN "recipientId" ELSE "senderId" END AS "otherId",
              COUNT(*) FILTER (WHERE "recipientId" = ${userId} AND "readAt" IS NULL) OVER
                (PARTITION BY CASE WHEN "senderId" = ${userId} THEN "recipientId" ELSE "senderId" END)::int AS "unreadCount"
            FROM "Message" WHERE ("senderId" = ${userId} OR "recipientId" = ${userId}) AND NOT (${userId} = ANY("hiddenFor"))
          ) visible ORDER BY "otherId", "createdAt" DESC, "id" DESC
        ) latest ORDER BY "createdAt" DESC, "id" DESC LIMIT ${take} OFFSET ${skip}`;
      const messages = await db.message.findMany({ where: { id: { in: rows.map(row => row.id) } }, include: { sender: { select: publicUser }, recipient: { select: publicUser }, Post: chatPost } });
      res.json(rows.flatMap(row => {
        const message = publicChatMessage(messages.find(item => item.id === row.id));
        return message ? [{ otherUser: message.senderId === userId ? message.recipient : message.sender, lastMessage: message, unreadCount: row.unreadCount }] : [];
      }));
    } catch { res.status(500).json({ message: "Failed to load conversations" }); }
  });
  router.get("/:userId/:otherUserId", ownParam("userId"), async (req, res) => {
    try {
      const where = thread(req.user.id, req.params.otherUserId);
      if (req.query.before) {
        const cursor = await db.message.findFirst({ where: { ...where, id: String(req.query.before) } });
        if (!cursor) return res.json([]);
        where.AND = [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }];
      }
      const messages = await db.message.findMany({ where, take: pageArgs(req.query).take, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { Post: chatPost } });
      res.json(messages.reverse().map(publicChatMessage));
    } catch { res.status(500).json({ message: "Failed to load messages" }); }
  });
  router.post("/read/:otherUserId", async (req, res) => {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(id => typeof id === "string").slice(0, 100) : [];
      await db.message.updateMany({ where: { id: { in: ids }, senderId: req.params.otherUserId, recipientId: req.user.id, readAt: null, NOT: { hiddenFor: { has: req.user.id } } }, data: { readAt: new Date() } });
      res.sendStatus(204);
    } catch { res.status(500).json({ message: "Failed to mark messages as read" }); }
  });
  router.post("/sync/:otherUserId", async (req, res) => {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids.filter(id => typeof id === "string").slice(0, 100) : [];
      const messages = await db.message.findMany({ where: { ...thread(req.user.id, req.params.otherUserId), id: { in: ids } }, include: { Post: chatPost } });
      res.json(messages.map(publicChatMessage));
    } catch { res.status(500).json({ message: "Failed to refresh message history" }); }
  });
  router.post("/", async (req, res) => {
    try {
      const { recipientId, content, clientId, postId } = req.body;
      if (typeof recipientId !== "string" || typeof content !== "string" || !content.trim() || content.length > 1000 || typeof clientId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(clientId) || (postId !== undefined && typeof postId !== "string")) return res.status(400).json({ message: "Recipient, message (1–1000 characters), and request ID are required" });
      if (recipientId === req.user.id) return res.status(400).json({ message: "You cannot message yourself" });
      const existing = await db.message.findUnique({ where: { clientId } });
      if (existing) {
        if (existing.senderId !== req.user.id || existing.recipientId !== recipientId || existing.content !== content.trim()) return res.status(409).json({ message: "Request ID already used" });
        return res.json(existing);
      }
      const recipient = await db.user.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (!recipient) return res.status(404).json({ message: "Recipient not found" });
      if (postId) {
        const post = await db.post.findFirst({ where: { id: postId, userId: recipientId, status: "approve" }, select: { id: true } });
        if (!post) return res.status(404).json({ message: "This post is no longer available for chat" });
      }
      const message = await db.message.create({ data: { senderId: req.user.id, recipientId, content: content.trim(), clientId, ...(postId ? { postId } : {}) } });
      res.status(201).json(message);
    } catch { res.status(500).json({ message: "Failed to send message. Please retry." }); }
  });
  return router;
}
export default createChatRouter();
