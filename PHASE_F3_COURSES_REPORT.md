# PHASE F3 — COURSES & CLASS DISCOVERY REPORT

**Date:** 2026-09-10  
**Scope:** User-facing course/class discovery only  
**Next:** F4 (not started)

---

## 1. Scope

Implemented:

- Real class list (`REGISTRATION_OPEN`)
- Class detail
- Capacity / schedule / sessions / template (secondary)
- Product routes under `/app`
- Loading / empty / error UX

Not implemented: Participants, eligibility, reservation, waitlist, checkout, payment, documents, admin CRUD, reports, notifications, attendance.

---

## 2–3. Backend APIs verified

See `PHASE_F3_COURSE_CONTRACT_AUDIT.md`.

| Frontend Call | Backend | Status |
|---------------|---------|--------|
| `GET /courses/classes?status=REGISTRATION_OPEN` | `courses.routes` public | VERIFIED |
| `GET /courses/classes/:id` | public | VERIFIED |
| `GET /courses/classes/:id/capacity` | → `checkAvailability` | VERIFIED |
| `GET /courses/classes/:id/schedule` | public | VERIFIED |
| `GET /courses/classes/:id/sessions` | public | VERIFIED |
| `GET /courses/templates/:id` | public | VERIFIED |
| `GET /courses/templates` | available in API layer; list page uses classes filter | VERIFIED (helper) |

Invented APIs: **0**

---

## 4–6. Files

### Created
- `PHASE_F3_COURSE_CONTRACT_AUDIT.md`
- `PHASE_F3_COURSES_REPORT.md`
- `frontend/src/features/courses/coursesApi.js`
- `frontend/src/features/courses/courseLabels.js`
- `frontend/src/features/courses/components/ClassCard.jsx`
- `frontend/src/pages/app/AppCoursesPage.jsx`
- `frontend/src/pages/app/AppClassDetailPage.jsx`

### Modified
- `frontend/src/App.jsx` — routes
- `frontend/src/layouts/ProductAppLayout.jsx` — nav «کلاس‌ها»
- `frontend/src/pages/AppHomePage.jsx` — CTA to courses
- `frontend/src/services/api/index.js` — note
- `FRONTEND_IMPLEMENTATION_SPEC.md` — F3 status line

### Deleted
- none

---

## 7. Routes added

| Path | Guard | Page |
|------|-------|------|
| `/app/courses` | RequireAuth | AppCoursesPage |
| `/app/courses/:classId` | RequireAuth | AppClassDetailPage |

Note: Discovery APIs are **public** on backend; product shell still requires login (consistent with `/app`).

Marketing `/courses` (static WhatsApp) unchanged.

---

## 8–11. UI behavior

| State | Behavior |
|-------|----------|
| Loading | `SectionLoader` |
| Empty list | `EmptyState` |
| Error list | `ErrorState` + retry + AbortController |
| Detail 404 / bad id | ErrorState + back link |
| Capacity | Prefer `/capacity` (`available`, `held`, `isFull`, `registrationOpen`) |
| Schedule | `/schedule` with class fallback fields |
| Sessions | list or empty |
| Secondary fail | amber banner; page stays up |
| Enrollment CTA | Disabled — «به‌زودی» (no fake reservation) |

---

## 12. Auth behavior

- Routes under `RequireAuth`
- API calls do not send auth (public endpoints)
- No auth architecture rewrite

---

## 13. Explicitly NOT implemented

Participants · Eligibility · Reservation · Waitlist · Checkout · Payment · Documents · Admin course CRUD · Reports · Notifications · Attendance

---

## 14. Backend changes

**NO** — `git diff -- backend/` empty for this phase.

---

## 15. Invented APIs

**0**

---

## 16. Dependencies

**none added**

---

## 17–18. Validation

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **FAIL** (pre-existing only; no F3 path errors) |

---

## 19. Manual verification checklist

| Flow | Expected |
|------|----------|
| `/app/courses` | loads REGISTRATION_OPEN classes (needs backend + data) |
| Detail | class + capacity/schedule/sessions |
| Empty DB | EmptyState |
| Bad ObjectId | invalid id message |
| Retry | reloads |
| CTA enroll | disabled |

Environment: backend on `:4000` required for live data.

---

## 20. Known limitations

- Product discovery requires login even though APIs are public
- Instructor name not shown (public instructor list is ADMIN-only)
- No pagination on class list (backend has none)
- List shows only `REGISTRATION_OPEN` (by design)
- Marketing `/courses` still static

---

## 21. F4 handoff

Next phase: **Participants** (CRUD + ownership), then eligibility/reservation.

Do not start F4 in this session.

---

# PHASE F3 COMPLETE

**FINAL VERDICT: READY FOR F4**
