# Deploy ExchangeKUB on Vercel

Deploy this repository as two Vercel projects. Keeping the frontend and API
separate lets the API run as a Vercel Function while Supabase continues to
provide PostgreSQL and image storage.

## 1. Deploy the API

1. In Vercel, choose **Add New → Project** and import this Git repository.
2. Set **Root Directory** to `server`.
3. Keep the detected framework as **Other** and deploy.
4. In **Settings → Environment Variables**, add these values from the local
   server environment. Never commit their real values:

   | Name | Required value |
   | --- | --- |
   | `DATABASE_URL` | Supabase pooler connection string |
   | `DIRECT_URL` | Supabase direct PostgreSQL connection string |
   | `TOKEN` | Long random JWT signing secret |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
   | `SUPABASE_STORAGE_BUCKET` | Storage bucket name, such as `media` |

5. Redeploy, then copy the API URL. It has the form
   `https://your-api-project.vercel.app/api`.

For password-reset emails, also add `APP_URL` after the frontend is deployed.
If email delivery is enabled, add the configured `RESEND_API_KEY` and
`RESET_EMAIL_FROM` values as well.

## 2. Deploy the frontend

1. Create another Vercel project from the same Git repository.
2. Set **Root Directory** to `client`. Vercel detects Vite automatically.
3. Add this production environment variable:

   | Name | Value |
   | --- | --- |
   | `VITE_API_URL` | The API URL copied above, ending in `/api` |

4. Deploy and copy the frontend URL.
5. Set the API project's `APP_URL` to that frontend URL, then redeploy the API
   if password resets are enabled.

## Checks after deployment

- Create an account and log in.
- Upload up to three post images.
- Open a post, start a chat, and verify **View post** opens the right item.
- Request a password reset if email delivery is configured.

The free Vercel Hobby plan is intended for personal, non-commercial projects;
review Vercel plan terms before using it for a commercial marketplace.
