## Context

TiDaTra's root layout (`app/layout.tsx`) is a Next.js Server Component — no `"use client"` directive. It runs on the server and can read `process.env` directly at render time. The Docker image is built with `output: "standalone"` and published to a registry; operators pull the pre-built image, so any variable prefixed `NEXT_PUBLIC_` would be baked in at build time and useless for runtime configuration.

Reading server-side env vars in the Server Component layout is the correct pattern: the resulting `<script>` tags appear in the HTML response sent to the browser, executing the tracker without any client-side bundle change.

## Goals / Non-Goals

**Goals:**
- Support any tracker that ships a `<head>` snippet (Umami, Plausible, Matomo, PostHog, GTM, custom).
- Support GTM's two-part injection (inline `<script>` in head + `<noscript>` after `<body>` opens).
- Zero overhead when env vars are unset.
- No image rebuild required to change or remove the tracker.

**Non-Goals:**
- Validating or sanitising the snippet content — this is operator-controlled configuration, not user input.
- Supporting per-route or per-user tracker variations.
- Providing a UI for managing the snippet.
- Setting a Content-Security-Policy — the app does not currently have one; that is a separate concern.

## Decisions

### D1: Two variables — head and body

**Decision:** `ANALYTICS_HEAD_SNIPPET` (injected into `<head>`) and `ANALYTICS_BODY_SNIPPET` (injected immediately after `<body>` opens).

**Why:** GTM requires a `<script>` block in `<head>` and a `<noscript>` block at the top of `<body>`. A single variable would force operators to pick one location or concatenate both parts into an awkward combined string. Two variables map directly to how every major analytics vendor documents their setup instructions (head section / body section).

**Alternative considered:** A single `ANALYTICS_SNIPPET` placed only in `<head>`. Rejected because it breaks GTM out of the box.

### D2: `dangerouslySetInnerHTML` on wrapper elements

**Decision:** Wrap each snippet in a React element using `dangerouslySetInnerHTML={{ __html: snippet }}`.

```tsx
{headSnippet && (
  <div dangerouslySetInnerHTML={{ __html: headSnippet }} />
)}
```

**Why:** React does not allow injecting raw HTML into JSX directly. `dangerouslySetInnerHTML` is the correct React escape hatch for this use case. The risk is acceptable because the value comes from an operator-controlled environment variable, not from user input or an external API.

**Note on wrapper element:** A plain `<div>` wrapper in `<head>` is technically invalid HTML but renders correctly in all major browsers and does not affect Next.js metadata or functionality. An alternative is a `<>` fragment with `dangerouslySetInnerHTML`, but React requires a DOM element for that prop. This is a known limitation with no clean workaround in React 19.

### D3: No `NEXT_PUBLIC_` prefix

**Decision:** Both variables are server-side only (no `NEXT_PUBLIC_` prefix).

**Why:** `NEXT_PUBLIC_*` variables are substituted into the JS bundle at build time. Since the Docker image is pre-built, these values would be frozen in the image. Server-side env vars are read at container startup, allowing operators to change the snippet by updating `.env` and running `docker compose up -d` — no rebuild needed.

### D4: Silent no-op when unset or empty

**Decision:** If either variable is `undefined` or an empty string, nothing is rendered — no wrapper element, no whitespace, no DOM impact.

**Why:** Keeps the default path identical to today. Operators who do not need analytics pay zero cost.

## Risks / Trade-offs

[Raw HTML injection] → `dangerouslySetInnerHTML` with operator-supplied content. Acceptable: this is an environment variable set by whoever controls the Docker deployment, not user-generated content.

[Invalid HTML] → A `<div>` inside `<head>` is non-conforming HTML. In practice it is harmless — browsers handle it gracefully and Next.js does not validate head content. The alternative (no wrapper) requires a different injection mechanism.

[No CSP headers] → Injecting external scripts or inline JS means any future CSP would need to account for these snippets. This is out of scope but worth noting in the `.env.example` documentation.

[Multiline env var in Docker] → GTM's inline `<script>` contains JS code. In `docker-compose.yml` this must be a single-line string or read from a `.env` file where multiline values can be quoted. Documented in `.env.example`.
