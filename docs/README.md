## Accessibility Notes

- Added skip link (`Skip to main content`) and consistent semantic structure so keyboard users can reach main content quickly.
- Login form now uses explicit labels, `<h2 id="login-form-title">` + `aria-describedby`, and ensures error text uses `role="alert"`.
- Color tokens tuned to maintain WCAG 2.1 AA contrast (primary/secondary/foreground/muted).

## Deployment
- Staging environment: [https://accessibooks2.vercel.app/](https://accessibooks2.vercel.app/)
- See `docs/VERCEL.md` for full deployment notes.
