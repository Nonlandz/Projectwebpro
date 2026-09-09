import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
const digest = (token) => createHash("sha256").update(token).digest("hex");
export async function issueReset(db, email, deliver) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;
  const token = randomBytes(32).toString("hex");
  await db.passwordReset.create({ data: { tokenHash: digest(token), userId: user.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  await deliver(email, token);
}
export async function consumeReset(db, token, password) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error("Invalid reset link or password (8–72 bytes required)");
  const passwordHash = await bcrypt.hash(password, 10);
  await db.$transaction(async (tx) => {
    const reset = await tx.passwordReset.findUnique({ where: { tokenHash: digest(token) } });
    if (!reset || reset.expiresAt <= new Date()) throw new Error("Reset link is invalid or expired");
    const used = await tx.passwordReset.deleteMany({ where: { id: reset.id, expiresAt: { gt: new Date() } } });
    if (used.count !== 1) throw new Error("Reset link is invalid or expired");
    await tx.user.update({ where: { id: reset.userId }, data: { password: passwordHash, sessionVersion: { increment: 1 } } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
  });
}
export function resetEmailConfigured(env = process.env) {
  try {
    const app = new URL(env.APP_URL);
    if (app.protocol !== "https:" && !(app.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(app.hostname))) return false;
    if (env.RESEND_API_KEY) return Boolean(env.RESET_EMAIL_FROM?.trim());
    return Boolean(env.RESET_EMAIL_WEBHOOK_SECRET && new URL(env.RESET_EMAIL_WEBHOOK_URL).protocol === "https:");
  } catch { return false; }
}
export async function deliverReset(email, token, env = process.env, send = fetch) {
  if (!resetEmailConfigured(env)) throw new Error("Password reset email is not configured");
  const url = new URL(env.APP_URL);
  url.hash = `/reset-password?token=${token}`;
  const resend = Boolean(env.RESEND_API_KEY);
  const response = await send(resend ? "https://api.resend.com/emails" : env.RESET_EMAIL_WEBHOOK_URL, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${resend ? env.RESEND_API_KEY : env.RESET_EMAIL_WEBHOOK_SECRET}` },
    body: JSON.stringify({ ...(resend ? { from: env.RESET_EMAIL_FROM } : {}), to: resend ? [email] : email, subject: "Reset your ExchangeKUB password", text: `Reset your password: ${url.href}\nThis link expires in 30 minutes.` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
const attempts = new Map();
export function resetRateLimit(req, res, next) {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  attempts.set(key, entry);
  if (++entry.count > 10) return res.status(429).json({ message: "Too many attempts. Please try again later" });
  next();
}
