# PHASE F3 — Course Contract Audit

**Source:** `backend/src/modules/courses/*` + `enrollment.service.checkAvailability`  
**Date:** 2026-09-10  
**Rule:** Backend source wins over docs.

---

## Mount

Prefix: `/api/courses` (`app.js`)

Envelope (JSON): `{ success: true, data }` / `{ success: false, error: { code, message, details? } }`

---

## Verified USER discovery APIs (all **public** — no auth)

| Method | Path | Auth | Query / Params | Response `data` |
|--------|------|------|----------------|-----------------|
| GET | `/api/courses/templates` | public | `activeOnly=true\|false` (optional) | `{ items: Template[] }` |
| GET | `/api/courses/templates/:id` | public | `id` ObjectId | `Template` |
| GET | `/api/courses/classes` | public | `status?`, `courseTemplateId?` | `{ items: Class[] }` |
| GET | `/api/courses/classes/:id` | public | `id` | `Class` |
| GET | `/api/courses/classes/:id/capacity` | public | `id` | Capacity snapshot |
| GET | `/api/courses/classes/:id/schedule` | public | `id` | Schedule object |
| GET | `/api/courses/classes/:id/sessions` | public | `id` | `{ items: Session[] }` |

### Not used in F3 (exist but ADMIN or out of scope)

- All POST/PATCH class/template/instructor lifecycle
- `GET /api/courses/instructors` — **ADMIN only**
- Enrollment: eligibility, reservation, waitlist, confirm

### Endpoints that do **not** exist

- Dedicated “featured courses”
- Class search/q pagination beyond filter
- Public instructor detail for class cards

---

## Template fields (`toPublicTemplate`)

`id`, `title`, `description`, `level`, `ageMin`, `ageMax`, `genderRestriction`, `prerequisites[]`, `requiresInsurance`, `requiresMedicalApproval`, `isActive`, `createdAt`, `updatedAt`

## Class fields (`toPublicClass`)

`id`, `courseTemplateId`, `title`, `instructorId`, `startDate`, `endDate`, `daysOfWeek`, `startTime`, `endTime`, `timezone`, `totalSessions`, `price`, `capacity`, `confirmedCount`, `heldCount`, `availableSeats`, `status`, `createdAt`, `updatedAt`

Notes:

- `availableSeats` = `max(0, capacity - confirmedCount - heldCount)` computed **on server** in serializer
- Frontend may **display** `availableSeats` / capacity fields from class OR prefer `/capacity` for `isFull` + `registrationOpen`
- Do **not** invent discount prices

## Capacity (`checkAvailability`)

```
{
  classId, status,
  capacity, confirmed, held, available, isFull,
  registrationOpen
}
```

`registrationOpen` = `status === "REGISTRATION_OPEN"`  
`available` mirrors held+confirmed math  
`isFull` = `available <= 0`

## Schedule (`getClassSchedule`)

Returns class schedule summary (verify shape in service): includes class identity + days/times/dates from class document.

## Session (`toPublicSession`)

`id`, `classId`, `sessionNumber`, `date`, `startTime`, `endTime`, `status`, timestamps

---

## Class status enum (backend)

`DRAFT` · `PUBLISHED` · `REGISTRATION_OPEN` · `REGISTRATION_CLOSED` · `IN_PROGRESS` · `COMPLETED` · `CANCELLED` · `ARCHIVED`

## Session status enum

`SCHEDULED` · `COMPLETED` · `CANCELLED` · `RESCHEDULED`

## listClasses query (`listClassesQuery`)

- `status`: one of CLASS_STATUSES (optional)
- `courseTemplateId`: ObjectId (optional)

F3 product list default: `status=REGISTRATION_OPEN`

---

## Error codes relevant to F3

| Code | When |
|------|------|
| `CLASS_NOT_FOUND` | invalid/missing class id (404) |
| `COURSE_NOT_FOUND` | template missing (404) |
| `VALIDATION_ERROR` | bad query ObjectId/status (400) |

---

## Frontend display guidance

**Show:** title, price (as display IRR from `price`), dates, times, daysOfWeek, capacity fields from `/capacity`, sessions list, template age/gender/requirements if loaded

**Do not assume:** instructor name (public instructor list is ADMIN-only), pagination totals, waitlist position

**CTA F3:** enrollment not implemented — show controlled message / link to future path only if exists (none yet → disabled CTA with clear copy)
