## 1. Data Model

- [ ] 1.1 Add `isPublic?: boolean` to the `Series` interface in `lib/types.ts`
- [ ] 1.2 Add `isPublic` to the `SeriesInput` type in `lib/types.ts` (as optional)
- [ ] 1.3 Update `updateSeries` in `lib/db/series-repo.ts` to accept and persist `isPublic`

## 2. Server API — CouchDB Access

- [ ] 2.1 Add `getPublicSeriesData(ownerId: string, seriesId: string)` to `lib/couch.ts`: fetch the series doc, verify `isPublic === true` and `!deletedAt`, then fetch all entries with matching `seriesId`; return `{ series, entries }` or `null`
- [ ] 2.2 Write unit tests for `getPublicSeriesData` in `lib/couch.test.ts` covering public series found, series not public, series deleted, and series not found

## 3. API Route

- [ ] 3.1 Create `app/api/public/[ownerId]/[seriesId]/route.ts` — unauthenticated `GET` handler that calls `getPublicSeriesData` and returns 200 with `{ series, entries }` or 404
- [ ] 3.2 Verify the route returns 404 (not 401) for private/missing series to avoid enumeration

## 4. Public Page

- [ ] 4.1 Create `app/public/[ownerId]/[seriesId]/page.tsx` — Server Component that calls the API route and renders the read-only series view; return `notFound()` if API returns 404
- [ ] 4.2 Add i18n strings for the public page (page title, "read-only view" label, empty-state message) in `lib/i18n/en.ts`
- [ ] 4.3 Create `components/series/public-series-view.tsx` — read-only component rendering series title, description, tags, and entries list (no edit/delete/add-entry controls)

## 5. Series Settings UI — Public Toggle

- [ ] 5.1 Add a "Public" toggle to the series settings/edit form (`components/series/series-form.tsx` or the relevant settings panel)
- [ ] 5.2 Disable the toggle with explanatory text when `series.ownerId === null` (series not yet synced)
- [ ] 5.3 When `isPublic` is true and `ownerId` is set, display the full public URL (`/public/[ownerId]/[seriesId]`) with a copy-to-clipboard button
- [ ] 5.4 Add i18n strings for the toggle label, disabled-state explanation, and copy-link button in `lib/i18n/en.ts`

## 6. Quality & Lint

- [ ] 6.1 Run `pnpm lint` and fix any issues
- [ ] 6.2 Run `pnpm test` and ensure all tests pass
