## 1. Root Layout — Snippet Injection

- [x] 1.1 In `app/layout.tsx`, read `process.env.ANALYTICS_HEAD_SNIPPET` and `process.env.ANALYTICS_BODY_SNIPPET` at the top of the Server Component function
- [x] 1.2 Inject `ANALYTICS_HEAD_SNIPPET` inside `<head>` using `dangerouslySetInnerHTML` (render nothing when empty/unset)
- [x] 1.3 Inject `ANALYTICS_BODY_SNIPPET` immediately after `<body>` opens using `dangerouslySetInnerHTML` (render nothing when empty/unset)

## 2. Docker Configuration

- [x] 2.1 Add `ANALYTICS_HEAD_SNIPPET: ${ANALYTICS_HEAD_SNIPPET:-}` to the `environment:` block in `docker-compose.yml`
- [x] 2.2 Add `ANALYTICS_BODY_SNIPPET: ${ANALYTICS_BODY_SNIPPET:-}` to the `environment:` block in `docker-compose.yml`

## 3. Environment Documentation

- [x] 3.1 Add an `# ─── Analytics (optional) ───` section to `.env.example` documenting both variables with examples for:
  - Umami: single `<script defer src="..." data-website-id="...">` in head, body empty
  - Plausible: single `<script defer data-domain="..." src="...">` in head, body empty
  - GTM: inline `<script>` block in head, `<noscript>` block in body
  - Note about multiline values needing to be on one line or quoted in a `.env` file

## 4. Quality & Lint

- [x] 4.1 Run `pnpm lint` and fix any issues
- [x] 4.2 Verify in the browser (dev server) that a test snippet appears in the page source when the env var is set, and that the page renders normally when unset
