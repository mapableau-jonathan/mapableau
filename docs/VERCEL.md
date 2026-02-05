# Vercel Deployment Notes

- **Build command**: `npm ci && npm run build`
- **Output**: Next.js App Router; do not use `output: "standalone"` on Vercel (it can cause the site to display code instead of the rendered app).
- **Images**: `next.config.ts` enables AVIF/WebP formats for Vercel Image Optimization.
- **Caching**: Static data under `/public/data` gets `Cache-Control: public, max-age=43200, s-maxage=43200`.
- **Headers**: `vercel.json` applies CORS headers to `/api/*` for production origin.
- **Analytics/Logs**: Use Vercel dashboard for request logs, functions usage, and to manage env vars (`AUTH0_*`, `API_BEARER_TOKEN`, etc.).

### Environment Variables

Configure in Vercel Project Settings → Environment Variables:

- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_ISSUER` (optional)
- `DATABASE_URL`
- `API_BEARER_TOKEN` (for Passport bearer-protected APIs)

### Preview Tips
- Enable “Automatically expose System Environment Variables” so `NEXT_PUBLIC_*` envs are available in preview deployments.
- Staging URL: **https://accessibooks2.vercel.app/**. Promote changes here before production.
- Use Vercel Preview URLs + staging for QA; Next.js builds with `reactStrictMode` to surface issues early.
