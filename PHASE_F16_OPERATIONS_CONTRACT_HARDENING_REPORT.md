# PHASE F16 OPERATIONS CONTRACT HARDENING REPORT

**Date:** 2026-09-10  
**Scope:** Backend gap closure + capability audit (ADMIN / INSTRUCTOR ops)  
**Mode:** Backend primary; minimal frontend wiring for new contracts only

---

## 1. FINAL VERDICT

**COMPLETE WITH KNOWN LIMITATIONS**

Critical session regeneration integrity fixed. Instructor soft-update/deactivate added. Class lifecycle start/complete/archive added with server-side transition rules. Cancel hardened against active enrollments. Notifications audited as READY FOR F17 (no FE). Enrollment report contracts sufficient (no new list API). Per-session CRUD deferred (MEDIUM).

---

## 2. FULL AUDIT SUMMARY

| Severity | Count |
|----------|-------|
| Critical | 2 (same root: session wipe vs attendance) |
| High | 4 |
| Medium | 4 |
| Low | 2 |

---

## 3. ACTUAL FINDINGS

| ID | Severity | Area | Root cause | Risk | Decision | Status |
|----|----------|------|------------|------|----------|--------|
| F16-01 | CRITICAL | Sessions | `generate-sessions` `deleteMany` with no attendance check | Orphan attendance `sessionId` | Block when attendance exists | **Fixed** |
| F16-02 | CRITICAL | Attendance | Stale session refs after regenerate | Mark fails / report pollution | Same as F16-01 | **Fixed** |
| F16-03 | HIGH | Instructor | No PATCH — cannot update/deactivate/relink | Ops cannot manage teachers | Add PATCH soft update | **Fixed** |
| F16-04 | HIGH | Lifecycle | No route into IN_PROGRESS/COMPLETED/ARCHIVED | Dead enum values | Add start/complete/archive | **Fixed** |
| F16-05 | HIGH | Cancel | Status flip ignoring enrollments | Financial/ops inconsistency | Block cancel with active enrollments | **Fixed** |
| F16-06 | HIGH | Cancel side-effects | No auto refund/notification on cancel | Incomplete cancel product | Defer full cancel cascade | **Deferred** |
| F16-07 | MEDIUM | Instructor | `userId` not unique | Dual active links | Reject second active link | **Fixed** |
| F16-08 | MEDIUM | Sessions | No per-session PATCH/cancel | Limited ops flexibility | Defer; statuses unused | **Deferred** |
| F16-09 | MEDIUM | Notifications | CLASS_CANCELLED type unused by cancel | Soft | Defer to F17+ | **Deferred** |
| F16-10 | MEDIUM | Enrollment list | No `/admin/enrollments` list | Ops use reports | Reports sufficient | **No action** |
| F16-11 | LOW | Instructor list | Always activeOnly | Hard to see inactive | Query `activeOnly=false` | **Fixed** |
| F16-12 | LOW | Notifications FE | Not started | Product gap | F17 | **Deferred** |

---

## 4. INSTRUCTOR MANAGEMENT

### Existing
- `GET/POST /api/courses/instructors` (ADMIN)
- `GET /api/courses/instructors/me` (+ `/me/classes`)

### New
- `PATCH /api/courses/instructors/:id` (ADMIN)
  - Fields: `name`, `phone`, `bio`, `isActive`, `userId` (nullable unlink)
  - Soft deactivate: `isActive: false` (no DELETE)
  - Active `userId` uniqueness enforced (`INSTRUCTOR_USER_LINKED` 409)
- `GET /instructors?activeOnly=false` to include inactive

### Deactivation model
Inactive instructor → `getInstructorForUser` misses → `/me` 404, classes/roster/attendance 403. Assigned classes remain; ADMIN can reassign via class PATCH `instructorId`.

### Authorization
JWT remains USER|ADMIN. Ownership still via `Instructor.userId` + active flag.

---

## 5. CLASS LIFECYCLE

### Enum (unchanged)
`DRAFT`, `PUBLISHED`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ARCHIVED`

### State machine (enforced)

```text
DRAFT → PUBLISHED → REGISTRATION_OPEN ⇄ REGISTRATION_CLOSED → IN_PROGRESS → COMPLETED → ARCHIVED
                 ↘ cancel (if no blocking enrollments) ↗
Any of: DRAFT|PUBLISHED|REGISTRATION_*|IN_PROGRESS → CANCELLED (blocked if active enrollments)
CANCELLED → ARCHIVED
```

### Implemented routes
| Route | Transition |
|-------|------------|
| POST `.../publish` | DRAFT → PUBLISHED |
| POST `.../open-registration` | PUBLISHED\|REGISTRATION_CLOSED → REGISTRATION_OPEN |
| POST `.../close-registration` | REGISTRATION_OPEN → REGISTRATION_CLOSED |
| POST `.../start` | **NEW** REGISTRATION_CLOSED → IN_PROGRESS |
| POST `.../complete` | **NEW** IN_PROGRESS → COMPLETED |
| POST `.../archive` | **NEW** COMPLETED\|CANCELLED → ARCHIVED |
| POST `.../cancel` | → CANCELLED with enrollment guard |

Invalid transition → **409** `INVALID_CLASS_STATUS`  
Cancel with blocking enrollments → **409** `CLASS_HAS_ACTIVE_ENROLLMENTS`

Blocking enrollment statuses: `PENDING`, `PAYMENT_PENDING`, `PAID`, `ACTIVE`, `PENDING_COMPLIANCE`.

---

## 6. SESSION SAFETY

### Model
`ClassSession`: classId, sessionNumber, date, start/end, status (`SCHEDULED|COMPLETED|CANCELLED|RESCHEDULED`)

### Attendance relationship
`AttendanceRecord.sessionId` → ClassSession; unique `(sessionId, participantId)`

### Generation safety

**Can generate-sessions currently destroy sessions with attendance?**

**Before F16: YES**  
**After F16: NO** — blocked with **409** `SESSIONS_HAVE_ATTENDANCE`

Protection: count attendance for existing session IDs; if > 0, refuse; otherwise `deleteMany` + insert allowed.

Per-session CRUD: **not implemented** (MEDIUM / deferred).

---

## 7. ENROLLMENT OPERATIONS

Existing reports `GET /api/admin/reports/enrollments` provide filters, pagination, participant/class/payment fields — **sufficient**.  
No dedicated admin enrollment list endpoint added.  
Detail + activate-compliance remain as in F15.

---

## 8. NOTIFICATION AUDIT

Verified ADMIN queue under `/api/notifications` (list/detail/retry/jobs).  
Delivery statuses, types, pagination present.  
No user inbox / read-state (by design).

**READY FOR F17** (admin notifications/ops UI)  
Notification frontend: **not built in F16**.

---

## 9. SECURITY

| Check | Result |
|-------|--------|
| Instructor ownership | Preserved (active link only) |
| Cross-instructor isolation | Preserved (B-T tests still pass) |
| Inactive instructor | Denied me/classes/roster/attendance |
| Unlinked user | 404/403 as before |
| ADMIN bypass | Roster/attendance/payment as designed |
| No TEACHER JWT role | Confirmed |

---

## 10. TESTING

| Suite | Result |
|-------|--------|
| Focused `operationsHardening.test.js` | **5 passed / 5** |
| Full backend | **18 suites / 154 tests PASS** |
| Frontend build | **PASS** (~14.98s) |
| Frontend lint | **12** problems (pre-existing; no new F16 lint failures) |

---

## 11. REGRESSION

| Phase | Status |
|-------|--------|
| F10 Attendance | Preserved; generate blocked when attendance exists |
| F11 Course/Class/Instructor | Extended with start/complete/archive + instructor PATCH |
| B-T Teacher contracts | Unchanged ownership model |
| F13 Teacher FE | Unaffected |
| F14 Admin UX | Class/instructor pages minimally updated |
| F15 Financial/participant | Unaffected |

---

## 12. FILES CHANGED

### Backend
- `courses.service.js`
- `courses.controller.js`
- `courses.routes.js`
- `courses.validation.js`

### Tests
- `backend/tests/operationsHardening.test.js` (**created**)

### Frontend (contract wiring only)
- `coursesApi.js`
- `courseLabels.js`
- `AdminClassDetailPage.jsx`
- `AdminInstructorsPage.jsx`

### Documentation
- `PHASE_F16_OPERATIONS_CONTRACT_HARDENING_REPORT.md`

### Deleted
- none

---

## 13. EXACT SCORECARD

| Item | Value |
|------|-------|
| Backend changes | yes |
| Frontend changes | yes (minimal) |
| New endpoints | 4 (`PATCH instructors/:id`, `start`, `complete`, `archive`) |
| Modified endpoints | `generate-sessions` (guard), `cancel` (guard), `GET instructors` (activeOnly query) |
| Invented APIs | 0 |
| Fake data | 0 |
| New dependencies | 0 |
| Security regressions | 0 |
| Attendance regressions | 0 (hardened) |
| Payment regressions | 0 |
| Enrollment regressions | 0 |
| Compliance regressions | 0 |
| Teacher regressions | 0 |
| Notification frontend changes | 0 |

---

## Known limitations

1. Cancel does not auto-refund or dispatch `CLASS_CANCELLED` notifications.
2. No per-session edit/cancel API.
3. No dedicated admin enrollment list beyond reports.
4. Notifications frontend deferred to F17.

---

PHASE F16 COMPLETE  
READY FOR NEXT PHASE
