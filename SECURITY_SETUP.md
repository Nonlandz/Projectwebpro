# Security and chat upgrade

The API requires a signed JWT on private routes. The client attaches it automatically. Administrative actions check the user's current database role. Password resets revoke existing sessions.

## Existing PostgreSQL database

From `server`, run:

```
node node_modules/prisma/build/index.js db execute --file prisma/upgrades/20260908_security_chat.sql --schema prisma/schema.prisma
node node_modules/prisma/build/index.js generate
```

The SQL only adds columns, a reset-token table, and indexes. It preserves existing users and messages and can be rerun. The older migration directory contains a MySQL baseline; do not run it against PostgreSQL. For a fresh empty database, use the current Prisma schema with `db push` instead. Restart the API after generating the client.

## Password reset email

For direct Resend delivery, set these variables in `server/.env`:

```dotenv
APP_URL=http://localhost:5173
RESEND_API_KEY=re_your_private_key
RESET_EMAIL_FROM=ExchangeKUB <onboarding@resend.dev>
```

Use your actual frontend URL. Local HTTP is supported on localhost; use HTTPS in production. The Resend test sender can deliver only to the email address associated with your Resend account. Use that same address for your local test account. For other recipients, verify your domain with Resend and change the sender. Keep the API key on the server. Restart the API after changing environment variables. When `RESEND_API_KEY` is set, Resend takes precedence over the webhook.

Alternatively, use a custom email webhook as described below.

Set these server environment variables:

```
APP_URL=https://your-app.example
RESET_EMAIL_WEBHOOK_URL=https://your-email-service.example/send
RESET_EMAIL_WEBHOOK_SECRET=replace-with-a-private-service-secret
```

The configured HTTPS endpoint must accept `POST` JSON `{ "to": "...", "subject": "...", "text": "..." }`, authenticate the Bearer secret, send the email, and return a successful HTTP status. `APP_URL` must be a trusted application URL, not a request header. No reset tokens are returned to clients or logged. Without these settings the old unsafe reset mechanism remains disabled and the UI reports that email is not configured.

Links expire after 30 minutes, are stored as SHA-256 hashes, and are consumed transactionally once. A successful reset invalidates all links and existing sessions for that account. Reset requests and submissions are limited per IP in one server process; a multi-instance deployment should use a shared rate-limit store.

## Behavior and verification

- Public profiles include names, username, and profile image only.
- Public posts are approved posts only; owner and admin lists require authentication.
- Post lists use `limit` (default 20, maximum 100), `offset`, `search`, and `tagId`; admin lists add `scope=admin`.
- Chat lists are paginated. Messages use a `before` message cursor. Unread counts exclude messages deleted for that viewer.
- “Delete for me” hides existing messages only for the current participant. “Unsend” removes only the sender's selected message for both participants.
- Failed sends reuse a unique client request ID so retries do not duplicate already-saved messages.
- The client retains polling every five seconds, pauses it in hidden tabs, and prevents overlapping refreshes.

Run `npm test` in `server` and `npm run build` in `client`. Tests use isolated in-memory doubles; they do not modify real accounts or send email.
