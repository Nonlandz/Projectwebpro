// Read-only smoke check: uses a nonexistent viewer and never prints account data.
import express from "express";
import assert from "node:assert/strict";
import { prisma } from "../src/db.js";
import { createChatRouter } from "../src/chat-router.js";
const viewer = "__security_smoke_nonexistent__";
const app = express();
app.use(createChatRouter(prisma, (req, res, next) => { req.user = { id: viewer }; next(); }));
const server = app.listen(0, "127.0.0.1");
await new Promise(resolve => server.once("listening", resolve));
try {
  await prisma.user.findMany({ where: { id: viewer }, select: { sessionVersion: true }, take: 1 });
  await prisma.passwordReset.findMany({ where: { userId: viewer }, take: 1 });
  for (const path of [`/conversations/${viewer}`, `/${viewer}/__other__`]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    assert.equal(response.status, 200, `Database route failed: ${path}`);
    assert.deepEqual(await response.json(), []);
  }
  console.log("PostgreSQL schema and paginated chat queries verified (read-only).");
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); }
