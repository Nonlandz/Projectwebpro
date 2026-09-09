import test from "node:test";
import assert from "node:assert/strict";
import { deliverReset, resetEmailConfigured } from "../src/password-reset.js";

const env = { APP_URL: "http://localhost:5173", RESEND_API_KEY: "test-key", RESET_EMAIL_FROM: "ExchangeKUB <onboarding@resend.dev>" };

test("Resend delivery sends the configured sender and trusted reset link", async () => {
  assert.equal(resetEmailConfigured(env), true);
  await deliverReset("tester@example.com", "test-token", env, async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    const body = JSON.parse(options.body);
    assert.equal(body.from, env.RESET_EMAIL_FROM);
    assert.deepEqual(body.to, ["tester@example.com"]);
    assert.ok(body.text.includes("http://localhost:5173/#/reset-password?token=test-token"));
    return { ok: true };
  });
});

test("webhook delivery remains supported and provider errors are sanitized", async () => {
  const webhook = { APP_URL: "https://app.example.com", RESET_EMAIL_WEBHOOK_URL: "https://email.example.com/send", RESET_EMAIL_WEBHOOK_SECRET: "test-secret" };
  assert.equal(resetEmailConfigured(webhook), true);
  await assert.rejects(deliverReset("tester@example.com", "test-token", webhook, async (url, options) => {
    assert.equal(url, webhook.RESET_EMAIL_WEBHOOK_URL);
    assert.equal(options.headers.Authorization, "Bearer test-secret");
    assert.equal(JSON.parse(options.body).to, "tester@example.com");
    assert.equal(JSON.parse(options.body).from, undefined);
    return { ok: false };
  }), { message: "Email delivery failed" });
});

test("incomplete or unsafe reset configuration cannot send email", async () => {
  for (const settings of [{}, { ...env, RESET_EMAIL_FROM: "" }, { ...env, APP_URL: "invalid" }, { ...env, APP_URL: "http://public.example.com" }]) {
    assert.equal(resetEmailConfigured(settings), false);
    await assert.rejects(deliverReset("tester@example.com", "token", settings, async () => assert.fail("must not send")));
  }
});
