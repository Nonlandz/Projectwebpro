import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

export function createAuth(db = prisma, optional = false) {
  return async (req, res, next) => {
    try {
      const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
      if (!match) return optional ? next() : res.status(401).json({ message: "Please sign in" });
      const claims = jwt.verify(match[1], process.env.TOKEN, { algorithms: ["HS256"] });
      const user = await db.user.findUnique({ where: { id: claims.id }, select: { id: true, role: true, sessionVersion: true } });
      if (!user || (claims.sessionVersion ?? 0) !== user.sessionVersion) return res.status(401).json({ message: "Session expired. Please sign in again" });
      req.user = user;
      next();
    } catch { res.status(401).json({ message: "Session expired. Please sign in again" }); }
  };
}
export const authenticate = createAuth();
export const optionalAuthenticate = createAuth(prisma, true);
export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access required" });
  next();
}
export const ownParam = (name) => (req, res, next) => {
  if (req.params[name] !== req.user.id) return res.status(403).json({ message: "Access denied" });
  next();
};
