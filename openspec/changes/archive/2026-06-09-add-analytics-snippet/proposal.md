## Why

TiDaTra is self-hosted via Docker. Operators who want to add analytics (Umami, Plausible, PostHog, GTM, Matomo, or any custom tracker) currently have no way to inject the required script tags without modifying the source and rebuilding the image. A single configuration option lets operators drop in any tracking snippet without touching code.

## What Changes

- Two optional environment variables — `ANALYTICS_HEAD_SNIPPET` and `ANALYTICS_BODY_SNIPPET` — accept raw HTML snippets.
- When set, the head snippet is injected into `<head>` and the body snippet immediately after `<body>` opens, on every page.
- When both are unset or empty, the app behaves identically to today with zero overhead.
- `.env.example` and `docker-compose.yml` are updated to document and pass through these variables.

## Capabilities

### New Capabilities

- `analytics-snippet-injection`: Allows operators to inject arbitrary HTML snippets (script tags, noscript tags, inline JS) into the page shell via environment variables, enabling any third-party analytics or tracking tool without rebuilding the Docker image.

### Modified Capabilities

<!-- No existing capabilities change. -->

## Impact

- **`app/layout.tsx`**: Server Component reads `process.env.ANALYTICS_HEAD_SNIPPET` and `process.env.ANALYTICS_BODY_SNIPPET`; injects them via `dangerouslySetInnerHTML` when non-empty.
- **`docker-compose.yml`**: Two new optional env var pass-throughs (both default to empty).
- **`.env.example`**: New section documenting the two vars with examples for Umami, Plausible, and GTM.
- **No build-time changes**: Variables are server-side (no `NEXT_PUBLIC_` prefix), so they are read at container startup — no image rebuild required to change the tracker.
- **No client-side bundle change**: The layout is a Server Component; the snippet is rendered server-side into the HTML response.
