# Life Plans

LifeOS plans are a **personal orientation layer**, not a booking engine.

## LifePlanItem

Normalized read model:

- `id`, `type`, `title`, `subtitle`
- `source`, `sourceId`, `experienceId`, `offeringId`
- `startAt`, `endAt`, `status`, `location`, `image`
- `action` (View / Check In / View Ticket / Open / Pay)
- `metadata` (references only)

### Types

`BOOKING` · `APPOINTMENT` · `TICKET` · `EVENT` · `STAY` · `CLASS` · `RESERVATION` · `PAYMENT` · `TASK` · `OTHER`

### Statuses

`UPCOMING` · `IN_PROGRESS` · `COMPLETED` · `CANCELLED` · `EXPIRED` · `FAILED` · `ATTENTION`

Statuses are derived from authoritative `ActionRecord` / activity where possible.

## Plan grouping

`PersonalPlan` stores a titled group of **references** (JSON), e.g. “Weekend Trip”:

- Friday — Hotel (`sourceId` → external booking)
- Saturday — Spa
- Saturday — Dinner

Each item remains an independent external action. LifeOS only groups them for the person.

`POST /plans/groups` creates a group. No second booking/order system.

## Action state

Plans understand orchestration states via `ActionRecord`:

`OFFERING → PREPARED → CONFIRMATION → CONFIRMED → PROCESSING → COMPLETED → ACTIVITY`

Attention surfaces PENDING / FAILED / payment issues without duplicating notifications.
