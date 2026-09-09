# Supabase images

Uploads pass through the existing Express login and owner checks, then go to Supabase. PostgreSQL stores object paths. Existing image endpoints redirect to cloud images or serve local originals until migrated. New uploads never write to disk.

## Configure

1. Create a **public** Storage bucket named `media`. Anyone with an image URL can read it, including pending post photos. Use it only for public photos and avatars.
2. Set the bucket file limit to 5 MB and allowed MIME types to `image/jpeg`, `image/png`, `image/webp`.
3. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=media` to the existing `server/.env`; see `server/.env.example`. Preserve existing database and login settings. Never put the service-role key in the frontend or source control.
4. Keep anonymous/browser INSERT, UPDATE and DELETE disabled. The server uses its service-role key; the app's JWT is not a Supabase Auth session.

## Upgrade existing PostgreSQL database

From `server`, run the additive SQL, generate Prisma, and restart the API:

```powershell
node node_modules/prisma/build/index.js db execute --file prisma/upgrades/20260909_cloud_images.sql --schema prisma/schema.prisma
node node_modules/prisma/build/index.js generate
npm run dev
```

Prisma loads `server/.env`. For a fresh empty database only, `npm run db:push` creates the whole schema. Do not run old MySQL migrations against PostgreSQL.

## Copy local images

Use Node 20.12+ from `server`, after applying the SQL. Preview first:

```powershell
node --env-file=.env scripts/migrate-images.js
node --env-file=.env scripts/migrate-images.js --apply
```

The script uploads the newest image per existing post/user, skips records already in cloud storage, and saves the path. It preserves all local originals and can be rerun. Copy uploads from other deployments to this server's uploads directory before migrating them.

Replacements use new URLs to avoid stale CDN copies. Old cloud images are removed after the database reference changes; deleting a post removes its cloud image. Failed cleanup logs an object path for manual retry. Local originals remain for recovery.

## Verify

Run `npm test` in `server`. Once configured, upload a post photo and avatar, refresh, and check the `media` bucket. The API image endpoint should redirect to Supabase. Live cloud verification requires valid credentials.

References: [Upload guidance](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [server access controls](https://supabase.com/docs/guides/storage/security/access-control).
