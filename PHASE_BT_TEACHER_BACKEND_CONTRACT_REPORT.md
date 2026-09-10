# PHASE B-T TEACHER BACKEND CONTRACT REPORT

**Date:** 2026-09-10  
**Scope:** Minimum secure Instructor contracts (backend only)  
**Mode:** Backend only — frontend untouched in this phase — Notifications not started

---

## Final Verdict

**PHASE B-T COMPLETE**

---

## Backend Changes

### Modified

- `backend/src/modules/courses/instructorAccess.js`
- `backend/src/modules/courses/courses.service.js`
- `backend/src/modules/courses/courses.controller.js`
- `backend/src/modules/courses/courses.routes.js`
- `backend/src/modules/courses/courses.validation.js`
- `backend/src/modules/enrollments/enrollment.service.js`
- `backend/src/modules/enrollments/enrollment.controller.js`
- `backend/src/modules/enrollments/enrollment.routes.js`

### Created

- `backend/tests/instructorContracts.test.js`
- `PHASE_BT_TEACHER_BACKEND_CONTRACT_REPORT.md`

### Frontend

**0 files changed in this phase** (F12 frontend remains as delivered).

---

## New Contracts

### 1. Instructor self profile

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/api/courses/instructors/me` |
| Auth | Bearer JWT (`authenticate`) |
| Authorization | Active `Instructor` with `userId === req.user._id` and `isActive === true`. **No fabricated ADMIN instructor.** |
| Request | none |
| Response | `toPublicInstructor`: `{ id, userId, name, phone, bio, isActive, createdAt, updatedAt }` |
| Errors | `404 INSTRUCTOR_NOT_FOUND` (unlinked USER / inactive instructor / ADMIN without link) |

### 2. Secure My Classes

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/api/courses/instructors/me/classes` |
| Auth | Bearer JWT |
| Authorization | Ownership derived from linked active Instructor only. **Client `instructorId` is not accepted.** |
| Query | optional `status` (existing `CLASS_STATUSES` enum) |
| Response | `{ items: toPublicClass[] }` — only classes where `CourseClass.instructorId === Instructor._id` |
| Errors | `403 FORBIDDEN` when no active linked instructor; validation 400 for bad query |

### 3. Class roster

| Item | Value |
|------|--------|
| Method | `GET` |
| Path | `/api/enrollments/classes/:classId/roster` |
| Auth | Bearer JWT |
| Authorization | `ADMIN` **or** owning instructor (`assertCanAccessClass`) |
| Request | path `classId` |
| Response | `{ items: [{ enrollmentId, enrollmentStatus, classId, participantId, firstName, lastName, birthDate, gender }] }` |
| Enrollment filter | `ACTIVE`, `PENDING_COMPLIANCE`, `COMPLETED` (same set attendance marking accepts) |
| Errors | `403 FORBIDDEN` (wrong instructor / unlinked); `404 CLASS_NOT_FOUND` |

### Unchanged attendance (F10)

```text
GET  /api/enrollments/classes/:classId/attendance
POST /api/enrollments/attendance
```

Still use `canMarkAttendance` — not replaced.

---

## Ownership Model

```text
JWT user (role USER | ADMIN)
  ↓
Instructor.findOne({ userId, isActive: true })
  ↓
Instructor._id
  ↓
CourseClass.instructorId === Instructor._id
  ↓
me/classes · roster · attendance
```

ADMIN may access roster/attendance for any class without fabricating an Instructor profile for `/instructors/me`.

JWT role **not** extended with `TEACHER` / `INSTRUCTOR` (avoids auth/migration risk). Identity remains `Instructor.userId`.

---

## Security Tests

Suite: `backend/tests/instructorContracts.test.js` — **13/13 PASS**

| Case | Result |
|------|--------|
| same instructor `/me` | PASS |
| same instructor `/me/classes` | PASS |
| same instructor roster | PASS |
| same instructor attendance | PASS |
| cross instructor roster | PASS (403) |
| cross instructor attendance | PASS (403) |
| unlinked user `/me` | PASS (404) |
| unlinked user `/me/classes` | PASS (403) |
| unlinked user roster | PASS (403) |
| inactive instructor `/me` | PASS (404) |
| admin roster | PASS |
| invalid class roster | PASS (404) |
| empty roster | PASS |
| status filter scoped | PASS |

Full backend suite: **17 suites / 149 tests PASS**

---

## Regression

| Area | Evidence |
|------|----------|
| F10 attendance | Ownership isolation re-asserted in B-T tests; full suite PASS |
| F11 course/class admin | Full suite PASS (existing course tests) |
| Enrollment | Full suite PASS |
| Payment | Full suite PASS |
| Compliance | Full suite PASS |
| Reporting | Full suite PASS |

No frontend changes in this phase → no F12 UI regression from B-T.

---

## Final Scorecard

```text
Frontend changes: 0
Invented APIs: 0
Fake instructor data: 0
Fake class data: 0
Fake participant data: 0
Fake attendance data: 0
New dependencies: 0
F10 regression: 0
F11 regression: 0
Payment changes: 0
Enrollment changes: 0
Compliance changes: 0
Reporting changes: 0
Notifications implementation: 0
```

---

## Explicit confirmation

```text
backend contracts for instructor me / my classes / roster exist
ownership isolation proven by tests
no TEACHER JWT role added
F10 attendance endpoints unchanged
frontend not modified
no notifications
```

---

## Recommended next phase

**F13 — Teacher Workspace frontend** consuming:

- `GET /api/courses/instructors/me`
- `GET /api/courses/instructors/me/classes`
- `GET /api/enrollments/classes/:classId/roster`
- existing sessions + attendance APIs

Do **not** start F13 / Notifications automatically.
