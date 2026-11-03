# Supabase setup notes

This repository contains migrations and a Next.js application shell. Supabase project setup has not been run because no project URL or credentials are configured.

## Authentication configuration

1. Create a Supabase project and a **private** bucket named `order-files`.
2. Apply migrations `202611020001` through `202611020006` in filename order.
3. In Auth settings, enable email/password sign-in and configure the site's redirect allow-list for local/production app URLs, including `/auth/callback`.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` from `.env.example`. The service key is needed only by server-side invitation actions.
5. Keep public self-registration disabled. Accounts and business memberships are created through invitation/onboarding. Direct client membership insert/update has no policy.
6. Assign the first `super_admin` platform role only through a trusted administrative operation. Never make this assignment client-editable.

## Private order image bucket

The bucket must have **Public bucket** disabled. The current provisional MIME allow-list is JPEG, PNG, WebP and HEIC; it must also be set in the bucket configuration. The maximum file size remains undecided, so choose a bucket limit before enabling uploads.

Object paths must use UUID-derived segments and must not use the original filename:

```text
<business-uuid>/<order-uuid>/<opaque-file-uuid>
```

Create a matching `order_files` metadata row before uploading. The Storage policies verify that the path matches the metadata row and that the signed-in user is a Business Admin for that tenant. Reads are limited to Business Admins and assigned Tailor Staff. There are no direct object update/delete policies. Generate short-lived signed URLs only after server-side authorization. Uploads must not use `upsert`.

## Remaining setup work

- Define a secure invitation and membership acceptance flow (including how the initial Business Admin is provisioned).
- Decide file size/type limits, then set those constraints on the bucket.
- Add a controlled file metadata lifecycle for pending/uploaded/failed states and cleanup of abandoned pending records.
- Provision Super Admin accounts and audit their business metadata/access actions.
- The service role key is read only by server-only `src/lib/supabase/admin.ts`; it must never use a `NEXT_PUBLIC_` variable name or be imported by client components.

## Run the web app locally

Use Node.js 20.9 or later. Install dependencies with `npm install`, copy `.env.example` to `.env.local`, fill in the public Supabase project URL/key and site URL, then run `npm run dev`. This app shell has not yet been built or run in this workspace.
