import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function component(api) {
  const source = readFileSync(new URL("../../client/src/views/Chat.vue", import.meta.url), "utf8").split("<script>")[1].split("</script>")[0].replace(/^import .*;$/gm, "").replace("export default", "result =");
  const context = { axios: api, assetUrl: url => url, Layout: {}, Nav: {}, localStorage: { getItem: () => '{"id":"alice"}' }, document: { hidden: false }, result: null };
  vm.runInNewContext(source, context);
  const definition = context.result;
  const instance = { ...definition.data(), $nextTick: async () => {}, $refs: {}, activeUser: { id: "bob" } };
  for (const [name, method] of Object.entries(definition.methods)) instance[name] = method.bind(instance);
  instance.markVisibleRead = async () => {};
  return instance;
}
test("polling preserves older-message scroll position but follows messages near the bottom", async () => {
  const chat = component({ get: async () => ({ data: [{ id: "m", createdAt: "2026-09-08T00:00:00Z" }] }) });
  const element = { scrollTop: 100, scrollHeight: 1000, clientHeight: 300 };
  chat.$refs.messageList = element;
  await chat.loadMessages(); assert.equal(element.scrollTop, 100);
  element.scrollTop = 680;
  await chat.loadMessages(); assert.equal(element.scrollTop, 1000);
});
test("failed sends retain the draft and retry the same request ID", async () => {
  const sent = []; let fail = true;
  const chat = component({ post: async (_, body) => { sent.push(body); if (fail) throw new Error("offline"); } });
  chat.loadMessages = async () => {}; chat.loadConversations = async () => {};
  chat.draft = "hello";
  const payload = { content: "hello", recipientId: "bob", clientId: "unique-client-request" };
  await chat.submitMessage(payload);
  assert.equal(chat.draft, "hello"); assert.equal(chat.failedMessage, payload); assert.equal(chat.sending, false);
  fail = false; await chat.retryMessage();
  assert.equal(sent[0], sent[1]); assert.equal(chat.draft, ""); assert.equal(chat.failedMessage, null);
});
test("a stale response cannot overwrite a newly selected thread", async () => {
  let resolve;
  const chat = component({ get: () => new Promise(done => { resolve = done; }) });
  const loading = chat.loadMessages();
  chat.requestVersion++; chat.messages = [{ id: "new-thread" }];
  resolve({ data: [{ id: "old-thread" }] }); await loading;
  assert.equal(chat.messages[0].id, "new-thread");
});
