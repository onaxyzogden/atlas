# 2026-04-25 — §7 timeline edit/delete row controls


Closes the second deferred item on the regeneration-events UI surface
(create + compare shipped earlier today; mutation API was already live but
had no dashboard buttons).

### Changes
- `apps/web/src/features/regeneration/RegenerationTimelineCard.tsx` —
  per-row "Edit" and "Delete" buttons. Visibility is gated by
  `canModify(event)` = `useProjectRole().canDelete` (owners) **OR**
  `event.authorId === useAuthStore().user.id` (own row). Delete uses
  `window.confirm("Delete \"<title>\"? …")` then dispatches
  `deleteEvent()` via the store; per-row `deletingId` state disables
  every action button on that row while the request is in flight.
- `apps/web/src/features/regeneration/LogEventForm.tsx` — new optional
  `editEvent?` prop. When set, all field state initializers prefill from
  the event, the form swaps the follow-up banner for an "Editing event"
  banner, the submit button reads "Save changes" instead of "Save event",
  and submission flows through `RegenerationEventUpdateInput.safeParse()`
  + `updateEvent(projectId, eventId, …)` instead of create. The
  safeParse branches were split (one inside each `isEdit` arm) to avoid
  the union-type widening that would otherwise drop `title` to
  `string | undefined` and break the create-side type guarantee.
- `apps/web/src/features/regeneration/RegenerationTimeline.module.css`
  — added `.rowActionBtnDanger` (red border + hover) and tightened
  `.rowActionBtn` `:hover` + `:disabled` to wait until not-disabled.
- `apps/web/src/features/soil-ecology/CONTEXT.md` — dropped
  "editing/deleting events from the timeline UI" from the deferred
  list; documented the per-row author-or-owner permission rule.

### Verification
- `npx tsc --noEmit` in `apps/web/` — zero new errors. Pre-existing
  errors in `MapView.tsx` (UIState `rightPanelCollapsed` plumbing) and
  `ZoneSeasonalityRollup.tsx` (TS2532 on a possibly-undefined index)
  are unrelated to this change.
- Browser smoke skipped — preview navigation to the Ecological dashboard
  via DOM events was unreliable in this session. Edit reuses the same
  form whose create path was smoke-tested earlier today; Delete is a
  thin wrapper over an API call already exercised by the API smoke
  curl. Risk is low; flagged here so a follow-up session can do a full
  click-through if needed.
