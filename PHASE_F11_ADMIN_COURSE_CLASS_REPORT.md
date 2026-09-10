# PHASE F11 ADMIN COURSE CLASS COMPLETE

**Date:** 2026-09-10  
**Scope:** Admin Course Template + Class + Instructor management (frontend only)  
**Mode:** Frontend only — Notifications not started — Teacher panel not implemented

---

## Final verdict

**READY FOR NEXT PHASE** / **PHASE F11 COMPLETE**

---

## 1. Audit findings

Backend “Course” = **CourseTemplate**.  
Backend “Class” = **CourseClass** with lifecycle transitions.  
Sessions are generated in bulk; no per-session CRUD.  
JWT roles are only `USER` | `ADMIN`. Instructor is a separate entity with optional `userId` link (not a TEACHER role).

---

## 2. Backend contracts discovered

Mount: `/api/courses`

### Templates (Course)

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| `GET` | `/templates` | public | — | query `activeOnly=true`; `{ items }` — **no pagination** |
| `GET` | `/templates/:id` | public | — | public template |
| `POST` | `/templates` | Bearer | ADMIN | body: title, description, level, ageMin/Max, genderRestriction, prerequisites[], requiresInsurance, requiresMedicalApproval, isActive |
| `PATCH` | `/templates/:id` | Bearer | ADMIN | partial update incl. `isActive` |
| — | delete/archive endpoint | — | — | **BACKEND GAP** |

### Classes

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| `GET` | `/classes` | public | — | query `status`, `courseTemplateId`; `{ items }` — **no pagination** |
| `GET` | `/classes/:id` | public | — | includes capacity counters |
| `GET` | `/classes/:id/capacity` | public | — | `{ capacity, confirmed, held, available, isFull, registrationOpen, status }` |
| `GET` | `/classes/:id/schedule` | public | — | schedule snapshot |
| `GET` | `/classes/:id/sessions` | public | — | `{ items }` |
| `POST` | `/classes` | Bearer | ADMIN | creates **DRAFT** |
| `PATCH` | `/classes/:id` | Bearer | ADMIN | instructor reassignment via `instructorId`; price only applied when DRAFT |
| `POST` | `/classes/:id/publish` | ADMIN | DRAFT → PUBLISHED |
| `POST` | `/classes/:id/open-registration` | ADMIN | PUBLISHED \| REGISTRATION_CLOSED → REGISTRATION_OPEN |
| `POST` | `/classes/:id/close-registration` | ADMIN | REGISTRATION_OPEN → REGISTRATION_CLOSED |
| `POST` | `/classes/:id/cancel` | ADMIN | → CANCELLED (allowed from several statuses) |
| `POST` | `/classes/:id/generate-sessions` | ADMIN | deletes existing sessions, regenerates |
| — | hard delete / archive action | — | — | **BACKEND GAP** (ARCHIVED enum exists; no archive route) |

### Instructors

| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| `GET` | `/instructors` | Bearer | ADMIN | active instructors only (service default) |
| `POST` | `/instructors` | Bearer | ADMIN | `{ userId?, name, phone, bio, isActive }` |
| — | PATCH/DELETE instructor | — | — | **BACKEND GAP** |

### Sessions

| Supported | Not supported |
|-----------|---------------|
| list, generate (bulk replace) | create/update/delete/cancel single session |

### Errors commonly surfaced

`COURSE_NOT_FOUND`, `CLASS_NOT_FOUND`, `INSTRUCTOR_NOT_FOUND`, `INVALID_CLASS_STATUS` (409), `SESSION_GENERATION_FAILED` (400), validation 400, 401/403/429.

---

## 3. Capabilities supported (frontend)

| Area | Status |
|------|--------|
| Course list / detail / create / edit | yes |
| Course deactivate via `isActive` | yes |
| Course hard delete | not supported by backend |
| Class list / detail / create / edit | yes |
| Class lifecycle publish/open/close/cancel | yes |
| Capacity / schedule / sessions view | yes |
| Session generate (with confirm) | yes |
| Instructor list / create / assign on class | yes |
| Link to F10 attendance (`?classId=`) | yes |
| Notifications | not in F11 |

---

## 4. Capabilities missing (backend gaps)

- Hard delete course/class
- Archive class endpoint (despite `ARCHIVED` status enum)
- Per-session CRUD / cancel
- Instructor update/deactivate API
- JWT `TEACHER` / `INSTRUCTOR` role
- Server pagination/search for templates & classes
- Dedicated Admin participants/enrollments list for a class (not in `/api/courses`)

---

## 5. Routes created/modified

| Route | Purpose |
|-------|---------|
| `/admin/courses` | template list |
| `/admin/courses/new` | create template |
| `/admin/courses/:courseId` | detail + classes |
| `/admin/courses/:courseId/edit` | edit template |
| `/admin/classes` | class list |
| `/admin/classes/new` | create class |
| `/admin/classes/:classId` | class detail + lifecycle + sessions |
| `/admin/classes/:classId/edit` | edit + instructor assign |
| `/admin/instructors` | list/create instructors |
| `/admin` | home CTAs updated |
| Admin nav | دوره‌ها / کلاس‌ها / مربیان |

All under `RequireAuth roles={["ADMIN"]}`.

---

## 6–7. Files

### Created

- `frontend/src/features/courses/components/AdminCourseUi.jsx`
- `frontend/src/pages/admin/AdminCoursesPage.jsx`
- `frontend/src/pages/admin/AdminCourseNewPage.jsx`
- `frontend/src/pages/admin/AdminCourseDetailPage.jsx`
- `frontend/src/pages/admin/AdminCourseEditPage.jsx`
- `frontend/src/pages/admin/AdminClassesPage.jsx`
- `frontend/src/pages/admin/AdminClassNewPage.jsx`
- `frontend/src/pages/admin/AdminClassDetailPage.jsx`
- `frontend/src/pages/admin/AdminClassEditPage.jsx`
- `frontend/src/pages/admin/AdminInstructorsPage.jsx`
- `PHASE_F11_ADMIN_COURSE_CLASS_REPORT.md`

### Modified

- `frontend/src/features/courses/coursesApi.js` — ADMIN write/lifecycle methods
- `frontend/src/features/courses/courseLabels.js` — labels/helpers
- `frontend/src/App.jsx`
- `frontend/src/layouts/ProductAppLayout.jsx`
- `frontend/src/pages/AdminHomePage.jsx`
- `FRONTEND_IMPLEMENTATION_SPEC.md`

### Backend

**0 changes**

---

## 8. Course management implementation

Templates via real `/courses/templates*` with forms matching Zod fields. No fake delete — deactivate with `isActive`. Course detail lists classes filtered by `courseTemplateId`.

## 9. Class management implementation

List filters use exact `status` + `courseTemplateId`. Create starts DRAFT. Detail exposes lifecycle actions + capacity from `/capacity` + link to attendance. Edit supports instructor reassignment via `instructorId`.

## 10. Session management implementation

View sessions from `GET .../sessions`. Generate via `POST .../generate-sessions` with explicit confirmation (destructive replace). No invented per-session editors.

## 11. Instructor findings (for F12)

| Question | Finding |
|----------|---------|
| TEACHER JWT role? | **No** — only `USER`, `ADMIN` |
| Instructor entity? | **Yes** — `/courses/instructors` |
| Ownership? | `Instructor.userId` optional; `canMarkAttendance` allows ADMIN or linked instructor of class |
| Assignment? | Via class `instructorId` on create/PATCH |
| Teacher panel ready? | Partially — attendance mark exists; no teacher-scoped class list API beyond ownership checks |

## 12. UX improvements

Admin nav first-class Courses/Classes/Instructors; hierarchy Course → Classes → Class detail → Sessions/Attendance; confirm banners for cancel/regenerate; status pills; RTL Persian forms; empty/loading/error states.

## 13. Authorization behavior

Frontend: Admin routes behind `RequireAuth roles={["ADMIN"]}`.  
Backend remains authoritative for ADMIN writes and instructor access.

## 14–18. Testing

| Check | Result |
|-------|--------|
| Build | **PASS** (`npm run build`) |
| Lint | **16 problems (14 errors, 2 warnings)** pre-existing; **F11 paths: 0** |

| Backend diff | **empty** |
| Dependency diff | **empty** |
| Manual live Admin verification | **Not claimed** — no dedicated live credential run in this session for every mutation |

## 19. Known limitations

- Client-side title/level filter on templates only (server has no search)
- No server pagination for courses/classes
- Instructor list is active-only (backend default)
- No class enrollment roster UI (no dedicated course API)
- Session statuses shown read-only

## 20. Remaining backend gaps

See section 4. Most relevant for F12: no JWT teacher role; instructor panel would build on `userId` link + `canMarkAttendance` / class ownership.

## 21. Exact scorecard

```text
Backend changes: 0
Invented APIs: 0
Fake/mock course data: 0
Fake/mock class data: 0
Fake/mock instructor data: 0
Fake/mock session data: 0
New dependencies: 0
Payment changes: 0
Enrollment changes: 0
Compliance changes: 0
Reservation changes: 0
Attendance backend changes: 0
Reporting changes: 0
Notifications implementation: 0
```

## 22. Explicit confirmation

```text
backend unchanged
no invented APIs
no fake/mock course/class/instructor/session data
no new dependencies
no notifications
no full Teacher panel
F10 attendance not rewritten
```

## 23. Recommended next phase

**F12 — Teacher / Instructor panel** (scoped to existing ownership + attendance contracts), **or** Admin enrollments/participants-by-class if contracts exist outside `/api/courses`, **or** Notifications when audited.

Do **not** start the next phase automatically.
