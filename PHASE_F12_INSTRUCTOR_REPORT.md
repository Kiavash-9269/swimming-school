# PHASE F12 INSTRUCTOR COMPLETE

**Date:** 2026-09-10  
**Scope:** Instructor/Teacher workspace — ownership-safe partial UI only  
**Mode:** Frontend only — Notifications not started — F11 not redone

---

## Final verdict

**PHASE F12 BLOCKED BY BACKEND CONTRACT**

A full secure Instructor “My Classes / My Participants / Dashboard” product cannot be completed without new backend endpoints.  
F12 ships a **truthful partial** workspace: class-scoped attendance that relies on backend `canMarkAttendance` ownership — **without** client-side filtering of the public class catalog.

---

## 1. Backend audit

Inspected: `courses.routes.js`, `courses.service.js`, `instructorAccess.js`, `instructor.model.js`, `attendance.service.js`, `enrollment.routes.js`, `user.model.js` (ROLES), `user360.service.js`, registration360 tests.

## 2. Authentication findings

- Instructors log in as normal **USER** accounts (`/api/auth/login`).
- There is **no** JWT role `TEACHER` / `INSTRUCTOR`.
- Linking is via `Instructor.userId` → User `_id` (optional field on Instructor entity).

## 3. Role findings

| Role | Exists in JWT |
|------|----------------|
| `USER` | yes |
| `ADMIN` | yes |
| `TEACHER` / `INSTRUCTOR` | **no** |

## 4. Instructor ownership findings

Ownership chain that **is** enforced for attendance:

```text
User (JWT USER)
  → Instructor.findOne({ userId, isActive: true })
  → CourseClass.instructorId === Instructor._id
  → canMarkAttendance / assertInstructorOwnsClass
```

Used by:

- `POST /api/enrollments/attendance`
- `GET /api/enrollments/classes/:classId/attendance`

Instructors do **not** get medical/document privileges (confirmed in tests).

## 5. Available APIs (instructor-relevant)

| Method | Path | Auth | Instructor-safe? |
|--------|------|------|------------------|
| `POST` | `/api/enrollments/attendance` | Bearer | yes (ownership) |
| `GET` | `/api/enrollments/classes/:classId/attendance` | Bearer | yes (ownership) |
| `GET` | `/api/courses/classes/:id` | public | read anyone |
| `GET` | `/api/courses/classes/:id/sessions` | public | read anyone |
| `GET` | `/api/courses/classes/:id/capacity` | public | read anyone |
| `GET` | `/api/courses/classes/:id/schedule` | public | read anyone |
| `GET` | `/api/courses/classes` | public | **all classes** — must NOT filter as “My Classes” |
| `GET` | `/api/courses/instructors` | ADMIN | not usable by instructor |

## 6. Missing APIs (required for full teacher product)

| Gap | Needed for |
|-----|------------|
| `GET …/instructors/me` (or equivalent) | Instructor identity without Admin list |
| `GET …/instructors/me/classes` (or scoped list) | Secure My Classes |
| Class roster for instructor | My Participants |
| Instructor dashboard aggregates | Today/upcoming metrics |
| JWT role or claim | Frontend role-aware routing beyond USER |

## 7. Security analysis

| Pattern | Assessment |
|---------|------------|
| Filter public `GET /classes` by `instructorId` in React | **Rejected** — not authorization |
| Use Admin reports with `instructorId` | **Rejected** — ADMIN only |
| Open class by known `classId`, prove access via attendance GET | **Accepted** — backend authoritative |
| Expose Admin lifecycle to instructor UI | **Not done** |

## 8. Capability matrix

| Capability | Status |
|------------|--------|
| Instructor login | PARTIALLY SUPPORTED (as USER) |
| Instructor identity API | BACKEND GAP |
| Instructor → user mapping | PARTIALLY SUPPORTED (entity field; no self-read API) |
| My Classes | BACKEND GAP |
| Class detail | PARTIALLY SUPPORTED (public read + ownership for attendance) |
| My Sessions | BACKEND GAP (sessions public per classId only) |
| Session detail | PARTIALLY SUPPORTED (list fields only) |
| My Participants / roster | BACKEND GAP |
| Attendance list | SUPPORTED (class-scoped, ownership) |
| Mark / update attendance | SUPPORTED (upsert) |
| Attendance history (global) | BACKEND GAP |
| Class schedule / capacity | SUPPORTED (public) |
| Instructor dashboard metrics | BACKEND GAP |
| Class statistics | BACKEND GAP |

## 9. Implemented routes

| Route | Guard | Purpose |
|-------|-------|---------|
| `/instructor` | `RequireAuth` (any authenticated) | Gap notice + open class by ID |
| `/instructor/classes/:classId` | authenticated | Overview/sessions/capacity + ownership probe |
| `/instructor/classes/:classId/attendance` | authenticated | List + mark via F10 contracts |

Not under `/admin/*`.

## 10. Implemented UI

- `InstructorLayout` — distinct from Admin
- Home: explicit backend-gap messaging; **no fake My Classes list**
- Class page: public info + attendance list only if ownership GET succeeds
- Attendance page: session select + participantId + status upsert
- Nav link «فضای مربی» from user shell / app home

## 11. Class workflow

Open by `classId` → public detail/sessions → ownership check via attendance list → attendance page if allowed.  
**No** generate-sessions / publish / cancel / instructor assign in this workspace.

## 12. Participant workflow

**Not implemented** — BACKEND GAP (no instructor roster). Mark form requires known `participantId`.

## 13. Attendance workflow

Reuses F10:

- `listClassAttendance(classId)`
- `markAttendance({ classId, sessionId, participantId, status })`

Statuses: PRESENT | ABSENT | LATE | EXCUSED | UNKNOWN.

## 14. UX improvements

RTL Persian instructor shell; clear gap banners; ownership confirmed/denied states; operational attendance form; no fake dashboard cards.

## 15. Authorization behavior

- Frontend: authenticated users may enter `/instructor` (no fake TEACHER role).
- Backend: attendance ops return 403 if not ADMIN and not linked owner instructor.
- Admin routes remain `roles={["ADMIN"]}`.

## 16–19. Testing

| Check | Result |
|-------|--------|
| Build | **PASS** |
| Lint | **16** pre-existing (14 errors, 2 warnings); **F12 paths: 0** |
| Backend diff | **empty** |
| Dependency diff | **empty** |
| Live instructor credentials | **Not claimed** |

## 20. Known limitations

- Cannot list “my classes” securely
- Cannot discover instructor profile/id as self
- No roster → manual participantId for marking
- Public class reads are not ownership-gated (by design of existing public APIs)
- No notifications

## 21. Required backend gaps (for unblocking F12+)

Minimum recommended contracts:

1. `GET /api/courses/instructors/me` → current Instructor for `req.user`
2. `GET /api/courses/instructors/me/classes` → classes where `instructorId` matches, ownership-enforced
3. `GET /api/enrollments/classes/:classId/roster` (or equivalent) → participants for owners/ADMIN only

Optional: JWT claim/role for UX routing (still not a substitute for #2).

## 22. Exact scorecard

```text
Backend changes: 0
Invented APIs: 0
Fake instructor data: 0
Fake class data: 0
Fake participant data: 0
Fake attendance data: 0
Fake dashboard metrics: 0
New dependencies: 0
Admin regression: 0
Payment changes: 0
Enrollment changes: 0
Compliance changes: 0
Reporting changes: 0
Notifications implementation: 0
```

## 23. Explicit confirmation

```text
backend unchanged
no invented APIs
no client-side “My Classes” filtering
no fake TEACHER JWT role
no notifications
F10/F11 admin paths not rewritten for fake teacher auth
```

## 24. Recommended F13

After backend adds instructor-scoped class list (+ ideally roster / me):

- Complete Instructor My Classes dashboard
- Session-first attendance with roster
- Then Notifications (still deferred)

Do **not** start F13 / Notifications automatically.
