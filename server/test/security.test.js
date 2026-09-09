import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { createAuth, adminOnly } from "../src/middleware/auth.js";
import { createChatRouter } from "../src/chat-router.js";
import { issueReset, consumeReset } from "../src/password-reset.js";
import { deletePost, pageArgs } from "../src/shared.js";
import { prisma } from "../src/db.js";
import posts from "../src/post.js";
import users from "../src/user.js";
import tags from "../src/tag.js";

process.env.TOKEN = "test-only-secret-never-used-in-production";
const account = { id: "alice", role: "customer", sessionVersion: 0 };
const authDb = { user: { findUnique: async ({ where }) => where.id === "alice" ? account : null } };
const token = (claims = {}) => jwt.sign({ id: "alice", sessionVersion: 0, ...claims }, process.env.TOKEN, { expiresIn: "1h" });
async function withServer(router, action) {
  const app = express(); app.use(express.json()); app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const request = (path, method = "GET", body, bearer = token()) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  try { await action(request); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('category requests use authenticated identity and only admins can approve once', async () => {
  const originalUser = prisma.user.findUnique, originalFind = prisma.tag.findFirst;
  const originalCreate = prisma.categoryRequest.create, originalTransaction = prisma.$transaction;
  let submitted, reviewed = false, created = 0;
  prisma.user.findUnique = authDb.user.findUnique;
  prisma.tag.findFirst = async () => null;
  prisma.categoryRequest.create = async ({ data }) => { submitted = data; return { id: 'r', ...data }; };
  prisma.$transaction = async action => action({
    categoryRequest: {
      updateMany: async () => { if (reviewed) return { count: 0 }; reviewed = true; return { count: 1 }; },
      findUnique: async () => ({ id: 'r', name: 'Furniture' }),
    },
    tag: { findFirst: async () => null, create: async () => { created++; } },
  });
  try {
    await withServer(tags, async request => {
      assert.equal((await request('/requests', 'POST', { name: 'Furniture' }, null)).status, 401);
      assert.equal((await request('/requests', 'POST', { name: '  ' })).status, 400);
      assert.equal((await request('/requests', 'POST', { name: ' Furniture ', userId: 'bob' })).status, 201);
      assert.equal(submitted.userId, 'alice');
      assert.equal(submitted.normalizedName, 'furniture');
      assert.equal((await request('/requests')).status, 403);
      assert.equal((await request('/requests/r', 'PUT', { status: 'approved' })).status, 403);
      account.role = 'admin';
      assert.equal((await request('/requests/r', 'PUT', { status: 'bad' })).status, 400);
      assert.equal((await request('/requests/r', 'PUT', { status: 'approved' })).status, 200);
      assert.equal((await request('/requests/r', 'PUT', { status: 'approved' })).status, 409);
      assert.equal(created, 1);
    });
  } finally {
    account.role = 'customer'; prisma.user.findUnique = originalUser; prisma.tag.findFirst = originalFind;
    prisma.categoryRequest.create = originalCreate; prisma.$transaction = originalTransaction;
  }
});

test("authentication rejects missing, tampered, expired, revoked and nonexistent sessions", async () => {
  const router = express.Router(); router.use(createAuth(authDb)); router.get("/", (req, res) => res.json(req.user));
  await withServer(router, async request => {
    assert.equal((await request("/", "GET", undefined, null)).status, 401);
    assert.equal((await request("/", "GET", undefined, token() + "x")).status, 401);
    assert.equal((await request("/", "GET", undefined, jwt.sign({ id: "alice" }, process.env.TOKEN, { expiresIn: -1 }))).status, 401);
    assert.equal((await request("/", "GET", undefined, token({ sessionVersion: 5 }))).status, 401);
    assert.equal((await request("/", "GET", undefined, token({ id: "missing" }))).status, 401);
    assert.equal((await request("/")).status, 200);
  });
});

test("admin checks the current database role, not a claimed token role", async () => {
  const router = express.Router(); router.use(createAuth(authDb), adminOnly); router.put("/", (req, res) => res.sendStatus(204));
  await withServer(router, async request => { assert.equal((await request("/", "PUT", {}, token({ role: "admin" }))).status, 403); });
});

test("chat permissions, private deletion, sender identity and retry deduplication", async () => {
  let deleted, hidden, created, postQuery;
  const db = {
    user: { findUnique: async () => ({ id: "bob" }) },
    post: { findFirst: async query => { postQuery = query; return query.where.id === "approved-post" ? { id: "approved-post" } : null; } },
    message: {
      deleteMany: async ({ where }) => { deleted = where; return { count: where.id === "alice-message" ? 1 : 0 }; },
      updateMany: async query => { hidden = query; return { count: 2 }; },
      findUnique: async ({ where }) => created?.clientId === where.clientId ? created : null,
      create: async ({ data }) => { created = { id: "new", ...data }; return created; },
    },
  };
  await withServer(createChatRouter(db, createAuth(authDb)), async request => {
    assert.equal((await request("/alice/bob", "GET", undefined, null)).status, 401);
    assert.equal((await request("/bob/charlie")).status, 403);
    assert.equal((await request("/messages/bob-message", "DELETE")).status, 404);
    assert.equal(deleted.senderId, "alice");
    assert.equal((await request("/messages/alice-message", "DELETE")).status, 204);
    assert.equal((await request("/conversations/bob", "DELETE")).status, 204);
    assert.deepEqual(hidden.data, { hiddenFor: { push: "alice" } });
    assert.deepEqual(hidden.where.OR, [{ senderId: "alice", recipientId: "bob" }, { senderId: "bob", recipientId: "alice" }]);
    const payload = { senderId: "mallory", recipientId: "bob", content: "hello", clientId: "unique-client-request-123" };
    assert.equal((await request("/", "POST", payload)).status, 201);
    assert.equal(created.senderId, "alice");
    assert.equal((await request("/", "POST", payload)).status, 200);
    assert.equal((await request("/", "POST", { ...payload, content: "different" })).status, 409);
    assert.equal((await request("/", "POST", { ...payload, content: "x".repeat(1001) })).status, 400);
    const contextual = { recipientId: "bob", content: "Is this still available?", postId: "approved-post", clientId: "contextual-message-123" };
    assert.equal((await request("/", "POST", contextual)).status, 201);
    assert.equal(created.postId, "approved-post");
    assert.deepEqual(postQuery.where, { id: "approved-post", userId: "bob", status: "approve" });
    assert.equal((await request("/", "POST", { ...contextual, postId: "other-post", clientId: "invalid-context-123" })).status, 404);
  });
});

test("thread paging and read receipts are scoped to the authenticated viewer", async () => {
  let query, read;
  const db = { message: { findMany: async args => { query = args; return []; }, updateMany: async args => { read = args; return { count: 1 }; } } };
  await withServer(createChatRouter(db, createAuth(authDb)), async request => {
    assert.equal((await request("/alice/bob?limit=10000")).status, 200);
    assert.equal(query.take, 100);
    assert.deepEqual(query.where.NOT, { hiddenFor: { has: "alice" } });
    assert.equal((await request("/read/bob", "POST", { ids: ["message"] })).status, 204);
    assert.equal(read.where.recipientId, "alice"); assert.equal(read.where.senderId, "bob");
  });
});

function resetDb() {
  let records = []; let user = { id: "alice", email: "alice@example.test", password: "old", sessionVersion: 0 };
  const db = {
    user: {
      findUnique: async ({ where }) => where.email === user.email ? user : null,
      update: async ({ data }) => { user = { ...user, password: data.password, sessionVersion: user.sessionVersion + 1 }; },
    },
    passwordReset: {
      create: async ({ data }) => { records.push({ id: String(records.length), ...data }); },
      findUnique: async ({ where }) => records.find(record => record.tokenHash === where.tokenHash),
      deleteMany: async ({ where }) => { const before = records.length; records = records.filter(record => !(where.id ? record.id === where.id && record.expiresAt > where.expiresAt.gt : record.userId === where.userId)); return { count: before - records.length }; },
    },
    $transaction: async fn => { const snapshot = structuredClone({ records, user }); try { return await fn(db); } catch (error) { records = snapshot.records; user = snapshot.user; throw error; } },
    state: () => ({ records, user }),
  }; return db;
}
test("reset tokens are hashed, expire, are single-use and revoke sessions", async () => {
  const db = resetDb(); let raw;
  await issueReset(db, "alice@example.test", async (email, token) => { raw = token; });
  assert.equal(raw.length, 64);
  assert.equal(db.state().records[0].tokenHash, createHash("sha256").update(raw).digest("hex"));
  assert.notEqual(db.state().records[0].tokenHash, raw);
  await consumeReset(db, raw, "new-password-123");
  assert.equal(db.state().user.sessionVersion, 1);
  assert.ok(await bcrypt.compare("new-password-123", db.state().user.password));
  await assert.rejects(consumeReset(db, raw, "another-password"), /invalid or expired/);
  await issueReset(db, "alice@example.test", async (_, token) => { raw = token; });
  db.state().records[0].expiresAt = new Date(0);
  await assert.rejects(consumeReset(db, raw, "another-password"), /invalid or expired/);
  let sent = false; await issueReset(db, "unknown@example.test", async () => { sent = true; }); assert.equal(sent, false);
});

test("failed password updates roll back token consumption", async () => {
  const db = resetDb(); let raw;
  await issueReset(db, "alice@example.test", async (_, value) => { raw = value; });
  db.user.update = async () => { throw new Error("database unavailable"); };
  await assert.rejects(consumeReset(db, raw, "new-password-123"), /database unavailable/);
  assert.equal(db.state().records.length, 1); assert.equal(db.state().user.password, "old");
});

test("post deletion removes dependencies atomically and rejects other owners", async () => {
  let state = { post: true, comments: true, favorites: true }; let fail = false;
  const db = {
    post: { findUnique: async () => ({ userId: "alice" }), delete: async () => { if (fail) throw new Error("delete failed"); state.post = false; } },
    comment: { deleteMany: async () => { state.comments = false; } }, postFav: { deleteMany: async () => { state.favorites = false; } },
    $transaction: async fn => { const snapshot = { ...state }; try { return await fn(db); } catch (error) { state = snapshot; throw error; } },
  };
  await assert.rejects(deletePost(db, "p", { id: "bob" }), /Access denied/);
  assert.deepEqual(state, { post: true, comments: true, favorites: true });
  fail = true; await assert.rejects(deletePost(db, "p", account), /delete failed/);
  assert.deepEqual(state, { post: true, comments: true, favorites: true });
  fail = false; await deletePost(db, "p", account);
  assert.deepEqual(state, { post: false, comments: false, favorites: false });
});

test("public post filtering, owner scopes and moderation are enforced by routes", async () => {
  const originalUser = prisma.user.findUnique, originalPosts = prisma.post.findMany, originalUpdate = prisma.post.update;
  const originalUpdateMany = prisma.post.updateMany;
  let approvalWrite;
  prisma.post.updateMany = async args => { approvalWrite = args; return { count: 1 }; };
  let query, updates = 0;
  prisma.user.findUnique = authDb.user.findUnique;
  prisma.post.findMany = async args => { query = args; return []; };
  prisma.post.update = async () => { updates++; return {}; };
  try {
    await withServer(posts, async request => {
      assert.equal((await request("/?search=chair&limit=5", "GET", undefined, null)).status, 200);
      assert.equal(query.where.status, "approve"); assert.equal(query.take, 5); assert.ok(query.where.OR.length);
      assert.equal((await request("/?scope=admin")).status, 403);
      assert.equal((await request("/?userId=bob")).status, 403);
      assert.equal((await request("/p", "PUT", { status: "approve" })).status, 403);
      assert.equal(updates, 0);
      assert.equal(approvalWrite, undefined);
      account.role = "admin";
      assert.equal((await request("/p", "PUT", { status: "invalid" })).status, 400);
      assert.equal((await request("/p", "PUT", { status: "approve" })).status, 200);
      assert.equal(updates, 1);
      assert.deepEqual(approvalWrite.where, { id: 'p', approvedAt: null });
      assert.ok(approvalWrite.data.approvedAt instanceof Date);
      assert.equal(approvalWrite.data.status, 'approve');
    });
  } finally { account.role = "customer"; prisma.user.findUnique = originalUser; prisma.post.findMany = originalPosts; prisma.post.update = originalUpdate; prisma.post.updateMany = originalUpdateMany; }
});

test("public profiles expose names and phone but exclude private account details", async () => {
  const original = prisma.user.findUnique; let select;
  prisma.user.findUnique = async args => { select = args.select; return { id: "alice", UserInfo: { username: "alice" } }; };
  try { await withServer(users, async request => {
    assert.equal((await request("/profile/alice", "GET", undefined, null)).status, 200);
    assert.equal(select.password, undefined); assert.equal(select.email, undefined);
    assert.equal(select.UserInfo.select.firstName, true); assert.equal(select.UserInfo.select.lastName, true);
    assert.equal(select.UserInfo.select.phone, true); assert.equal(select.UserInfo.select.address, undefined);
    assert.equal(select.UserInfo.select.username, undefined);
  }); } finally { prisma.user.findUnique = original; }
});

test("only database-verified administrators receive full profile details", async () => {
  const original = prisma.user.findUnique; const selects = [];
  prisma.user.findUnique = async args => {
    if (args.select?.sessionVersion) return account;
    selects.push(args.select);
    return { id: "alice", UserInfo: { username: "alice", phone: "0123456789", address: "Bangkok" } };
  };
  try { await withServer(users, async request => {
    assert.equal((await request("/profile/alice", "GET")).status, 200);
    assert.equal(selects.at(-1).UserInfo.select.phone, true);
    assert.equal(selects.at(-1).UserInfo.select.address, undefined);
    assert.equal((await request("/profile/bob", "GET")).status, 200);
    assert.equal(selects.at(-1).UserInfo.select.phone, true);
    assert.equal(selects.at(-1).email, undefined);
    const forgedRole = await request("/profile/bob", "GET", undefined, token({ role: "admin" }));
    assert.equal((await forgedRole.json()).canViewAllDetails, false);
    assert.equal(selects.at(-1).UserInfo.select.address, undefined);
    account.role = "admin";
    const adminResponse = await request("/profile/bob", "GET");
    assert.equal(adminResponse.status, 200);
    assert.equal(adminResponse.headers.get("cache-control"), "private, no-store");
    assert.equal((await adminResponse.json()).canViewAllDetails, true);
    assert.equal(selects.at(-1).email, true);
    assert.equal(selects.at(-1).role, true);
    assert.equal(selects.at(-1).UserInfo.select.address, true);
    assert.equal(selects.at(-1).UserInfo.select.username, true);
    assert.equal(selects.at(-1).password, undefined);
    assert.equal(selects.at(-1).sessionVersion, undefined);
  }); } finally { account.role = "customer"; prisma.user.findUnique = original; }
});

test("pagination bounds are safe", () => {
  assert.deepEqual(pageArgs({ limit: "100000", offset: "-5" }), { take: 100, skip: 0 });
  assert.deepEqual(pageArgs({}), { take: 20, skip: 0 });
});
