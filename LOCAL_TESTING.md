# Local Testing Guide

## Quick Start

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env.local` file:
```env
SESSION_PASSWORD=your-secret-key-minimum-32-characters-long-for-production
APP_BASE_URL=http://localhost:3000
```

3. Start development server:
```bash
pnpm dev
```

## Testing Session Endpoints

### 1. Seed Dev Session

```bash
curl -X POST http://localhost:3000/api/dev/seed-session \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -v
```

Expected response:
```json
{
  "ok": true,
  "user": {
    "id": "dev-user",
    "email": "dev@mapable.local",
    "name": "Dev User",
    "provider": "dev",
    "roles": ["participant"],
    "verificationStatus": "unverified"
  }
}
```

The response will include a `Set-Cookie` header with `mapable.sid`. Save it using `-c cookies.txt` for subsequent requests.

### 2. Get Current User

```bash
curl http://localhost:3000/api/me \
  -b cookies.txt \
  -v
```

Expected response (after seeding):
```json
{
  "user": {
    "id": "dev-user",
    "email": "dev@mapable.local",
    "name": "Dev User",
    "provider": "dev",
    "roles": ["participant"],
    "verificationStatus": "unverified"
  }
}
```

Expected response (without session):
```json
{
  "error": "Unauthorized"
}
```
Status: 401

### 3. Logout

```bash
curl -X POST http://localhost:3000/api/logout \
  -b cookies.txt \
  -v
```

Expected response:
```json
{
  "ok": true
}
```

### 4. Verify Session Cleared

```bash
curl http://localhost:3000/api/me \
  -b cookies.txt \
  -v
```

Expected response:
```json
{
  "error": "Unauthorized"
}
```
Status: 401

## Browser Testing

1. Visit `http://localhost:3000/login`
2. Click "Seed Dev Session" button (only visible in development)
3. Should redirect to `/dashboard` with session set
4. Open browser dev tools → Application → Cookies
5. Verify `mapable.sid` cookie is set
6. Visit `http://localhost:3000/api/me` (should return user)
7. Test logout via `POST /api/logout`

## Expected Behavior

- ✅ `POST /api/dev/seed-session` sets `mapable.sid` cookie
- ✅ `GET /api/me` returns user when authenticated
- ✅ `GET /api/me` returns 401 when not authenticated
- ✅ `POST /api/logout` clears session
- ✅ After logout, `GET /api/me` returns 401
- ✅ Cookie is HTTP-only (cannot be accessed via JavaScript)
- ✅ Cookie is secure in production (HTTPS only)
- ✅ Cookie has SameSite=Lax for CSRF protection

## Troubleshooting

### "Session not persisting"
- Check `SESSION_PASSWORD` is set in `.env.local`
- Verify cookie is being sent (check Network tab → Request Headers)
- Check browser isn't blocking cookies
- Verify cookie name is `mapable.sid`

### "401 Unauthorized after seeding"
- Check if cookie is being sent with request
- Verify session was saved (check `Set-Cookie` header in seed response)
- Try clearing cookies and re-seeding

### "Internal Server Error"
- Check server logs for errors
- Verify `SESSION_PASSWORD` is at least 32 characters
- Check `lib/session.ts` is imported correctly
