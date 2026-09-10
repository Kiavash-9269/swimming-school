# PHASE F5 AUDIT COMPLETE

**Date:** 2026-09-10  
**Mode:** AUDIT / CONTRACT DISCOVERY ONLY  
**Source of truth:** backend enrollment module (not FRONTEND_IMPLEMENTATION_SPEC alone)

---

### Verdict

**READY FOR F5 IMPLEMENTATION**

Backend already exposes production-backed eligibility, availability, reservation, and waitlist APIs under `/api/enrollments`. Frontend has participants + courses discovery but **no** eligibility/reservation UI or API client methods.

Contract gap is **frontend missing**, not backend missing, for the F5 core path.

---

## 1. Backend APIs discovered (F5-relevant)

**Mount:** `app.use("/api/enrollments", …)` → prefix `/api/enrollments`  
**Envelope:** `{ success, data }` / `{ success: false, error: { code, message, details? } }`  
**Production-backed:** yes — used by `backend/tests/enrollment.test.js`, `concurrency.test.js`, `phase9.audit.test.js`

### Core F5 USER APIs

| Method | Path | Auth | Body / params | Response `data` (key fields) | Notable errors |
|--------|------|------|---------------|------------------------------|----------------|
| `POST` | `/eligibility/check` | Bearer | `{ classId, participantId }` (ObjectIds) | `{ eligible, reasons[], age, evaluatedAt, ruleVersion }` | `CLASS_NOT_FOUND` 404; ownership via `assertParticipantOwned` → `PARTICIPANT_NOT_FOUND` / `FORBIDDEN` |
| `GET` | `/classes/:classId/availability` | Bearer | path `classId` | `{ classId, status, capacity, confirmed, held, available, isFull, registrationOpen }` | `CLASS_NOT_FOUND` 404; **expires held reservations first** |
| `POST` | `/reservations` | Bearer + rate limit | `{ classId, participantId, idempotencyKey? }` (+ optional `Idempotency-Key` header) | `{ id, classId, participantId, status, expiresAt }` **201** | `REGISTRATION_CLOSED`, `ENROLLMENT_ALREADY_EXISTS`, `ELIGIBILITY_FAILED`, `SCHEDULE_CONFLICT`, `COURSE_FULL`, ownership errors |
| `POST` | `/waitlist` | Bearer + rate limit | `{ classId, participantId }` | `{ id, classId, position, status }` **201** | `REGISTRATION_CLOSED`, `COURSE_NOT_FULL`, `ELIGIBILITY_FAILED`, `SCHEDULE_CONFLICT`, `ENROLLMENT_ALREADY_EXISTS`, `WAITLIST_CONFLICT` |

### Adjacent (exist; **out of minimal F5** unless Prompt 2 expands)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/confirm` | Starts **checkout/payment** from `reservationId` → billing |
| `POST` | `/payments/callback` | Payment verification / activation |
| `GET` | `/me` | List my enrollments |
| `GET` | `/:id` | Get enrollment (owner or ADMIN) |
| `POST` | `/:id/cancel` | Cancel enrollment; may promote waitlist |
| Compliance / insurance / medical / documents | many under `/participants/...` | Affect eligibility reasons; UI is later phase |
| Admin activate-compliance, discounts, attendance, user360 | ADMIN or later | Not F5 USER start |

### Explicitly NOT FOUND

| Expected | Reality |
|----------|---------|
| `GET /reservations/:id` | **NOT FOUND** — no fetch/list reservation endpoint |
| `DELETE /reservations` hard cancel | **NOT FOUND** — hold expires server-side (`RESERVATION_HOLD_SECONDS`, default 900); cancel path is via enrollment cancel after confirm |
| Public unauthenticated eligibility | **NOT FOUND** — all above require `authenticate` |
| Direct `POST /enrollments` create | **NOT FOUND** — enrollment created via confirm/checkout or waitlist join |

---

## 2. Eligibility contract

**API:** `POST /api/enrollments/eligibility/check` — **FOUND**  
**Service:** `eligibility.service.js` · `RULE_VERSION = "eligibility-v1"`  
**Controller:** loads owned participant + class + template, then `checkEligibility`

### Rules (exact reason codes)

| Reason | Trigger | Source |
|--------|---------|--------|
| `PARTICIPANT_INACTIVE` | `participant.isActive === false` | eligibility.service |
| `INVALID_BIRTH_DATE` | `assertValidBirthDate` fails | age util |
| `AGE_NOT_ALLOWED` | age outside `template.ageMin`–`ageMax` | template |
| `GENDER_NOT_ALLOWED` | `template.genderRestriction` not `ANY` and ≠ participant gender | template |
| `PREREQUISITE_NOT_COMPLETED` | no `COMPLETED` enrollment on classes of prerequisite template | template.prerequisites |
| `INSURANCE_REQUIRED` | `template.requiresInsurance` and no valid APPROVED insurance covering asOf (+ ideally class start); fake/non-persisted storageKey ignored | InsuranceRecord |
| `MEDICAL_APPROVAL_REQUIRED` | `template.requiresMedicalApproval` and no valid APPROVED medical | MedicalDocument |

**Not treated as eligibility fail in this service:** capacity / waitlist / schedule conflict (those are reservation/waitlist layer). Class status soft-comment only; reservation enforces `REGISTRATION_OPEN`.

**Response:** does **not** throw on ineligible — returns `eligible: false` + `reasons`.  
**Reservation/waitlist:** throw `400 ELIGIBILITY_FAILED` with `details.reasons` if not eligible.

---

## 3. Reservation / enrollment contract

### Entities

| Entity | Role |
|--------|------|
| **Reservation** | Separate model; `HELD` → seat in `heldCount`; expires → `EXPIRED` + decrement held |
| **Enrollment** | Created at **confirm/checkout** (or `WAITLISTED` on waitlist join); not created by reservation alone |
| **WaitlistEntry** | When class full; unique active (class, participant); position unique per class |

### Reservation lifecycle (create)

1. Expire stale holds for class  
2. Idempotency: same `idempotencyKey` returns existing reservation  
3. `assertParticipantOwned` (active + owner)  
4. Class must be `REGISTRATION_OPEN` else `REGISTRATION_CLOSED`  
5. Block if active/waitlisted enrollment for same class+participant → `ENROLLMENT_ALREADY_EXISTS`  
6. `checkEligibility` → else `ELIGIBILITY_FAILED`  
7. `checkScheduleConflict` → else `SCHEDULE_CONFLICT`  
8. Atomic seat: `confirmedCount + heldCount < capacity` then `$inc heldCount` else `COURSE_FULL`  
9. Create `Reservation` `status=HELD`, `expiresAt = now + RESERVATION_HOLD_SECONDS`  
10. On create failure (incl. duplicate HELD unique index): release held seat  

**Statuses:** `HELD | CONFIRMED | EXPIRED | RELEASED`

### Capacity

`available = max(0, capacity - confirmedCount - heldCount)`  
`isFull = available <= 0`  
Concurrency: atomic `findOneAndUpdate` with `$expr` (covered by concurrency tests).

### Waitlist

Only if full (`COURSE_NOT_FULL` if seats remain). Re-checks eligibility + schedule. Creates waitlist entry + best-effort `Enrollment` status `WAITLISTED`. Promotion (internal / cancel path) may auto-`createReservation`.

### Payment dependency

**Reservation create:** no payment.  
**Confirm:** creates payment / gateway via `checkout.service` — **later phase**.

---

## 4. Participant ↔ class relationship

```
User (owner)
  └─ Participant (_id = participantId)
       └─ Reservation (classId + participantId + userId) [HELD]
            └─ confirm → Enrollment (classId + participantId + userId + reservationId) + Payment
       └─ OR WaitlistEntry → Enrollment WAITLISTED → promote → Reservation
```

| Link | Identifier |
|------|------------|
| Participant | Mongo ObjectId `participantId` |
| Class | Mongo ObjectId `classId` (CourseClass) |
| Course template | via `courseClass.courseTemplateId` (eligibility age/gender/prereq/compliance flags) |

**Duplicate prevention:** unique partial index on enrollment (class+participant) for active-like statuses; unique HELD reservation (class+participant); waitlist unique active (class+participant).

---

## 5. Frontend current state

| Area | Status |
|------|--------|
| Participant list/create/detail/edit/deactivate | **EXISTS** (F4) |
| Course/class list + detail + public capacity | **EXISTS** (F3) — `/courses/classes/:id/capacity` |
| Authenticated `/enrollments/.../availability` client | **NOT IMPLEMENTED** |
| Eligibility UI / API client | **NOT IMPLEMENTED** |
| Reservation UI / API client | **NOT IMPLEMENTED** |
| Waitlist UI / API client | **NOT IMPLEMENTED** |
| Enrollment confirm / payment UI | **NOT IMPLEMENTED** |
| Class detail CTA | **EXISTS as disabled** “شروع ثبت‌نام — به‌زودی” |
| Routes for enroll/reserve | **NOT IMPLEMENTED** |
| `features/enrollments` or similar | **NOT IMPLEMENTED** |
| `services/api/index.js` | comments only — domain APIs live under `features/*` |

**Classification**

| Item | Label |
|------|--------|
| Eligibility / reservation / waitlist / availability APIs | **BACKEND EXISTS / FRONTEND MISSING** |
| Confirm / payment / compliance upload UX | **BACKEND EXISTS / FRONTEND MISSING** (later phases) |
| Invented frontend-only enrollment APIs | **N/A** — none present |

---

## 6. Gap analysis

### A. Backend already available
Eligibility check, availability (auth), reservation create (+ idempotency), waitlist join, ownership on participant, capacity concurrency, eligibility re-check on reserve/waitlist, schedule conflict, enrollment list/get/cancel, confirm/payment (adjacent).

### B. Backend missing (for F5 UX)
- GET/list reservation by id  
- USER cancel of HELD reservation without enrollment  
- Reactivate / hard-delete participants (already F4)  

None of these block implementing “check eligibility → create hold / waitlist” using existing APIs.

### C. Frontend already available
Auth shell, ProductAppLayout, participants CRUD UX, courses discovery, Loading/Error/Empty/Forbidden/Toast, `apiRequest`.

### D. Frontend missing
Eligibility check flow, participant picker for a class, availability refresh for enrollment, reservation create + `expiresAt` timer UX, waitlist when full, API module, routes, enabling class CTA, mapping `reasons` / error codes to Persian UI.

### E. Contract ambiguities
1. **F5 vs confirm:** “Reservation start” ends at HELD reservation; `POST /confirm` is checkout — do not invent a separate enroll API.  
2. **Two capacity endpoints:** public F3 `/courses/classes/:id/capacity` vs auth F5 `/enrollments/classes/:id/availability` (latter expires holds first — prefer for enroll flow).  
3. **Eligibility soft on class status** vs reservation hard `REGISTRATION_OPEN`.  
4. Templates requiring insurance/medical: eligibility fails until compliance records exist (compliance UI later).

### F. Security / ownership
- All F5 APIs require auth.  
- Participant must be **owned and active** (`assertParticipantOwned`); other user’s id → `403 FORBIDDEN`; inactive → `404 PARTICIPANT_NOT_FOUND`.  
- Enrollment get/cancel: owner or ADMIN.  
- Frontend must not trust client-only ownership.

### G. Capacity / concurrency
Atomic hold increment; expire-before-check; duplicate HELD unique index; waitlist position retry; covered by concurrency/phase9 tests (when DB available).

### H. Dependencies on later phases
- Confirm + payment callback → checkout  
- Insurance/medical upload/review → compliance  
- Notifications on waitlist promote  
- Admin document review / activate-compliance  

F5 can still ship: show ineligibility reasons including `INSURANCE_REQUIRED` / `MEDICAL_APPROVAL_REQUIRED` without implementing document modules.

---

## 7. Exact implementation boundary for Prompt 2

### In scope (smallest safe F5)
1. Feature API module consuming **only**:
   - `POST /enrollments/eligibility/check`
   - `GET /enrollments/classes/:classId/availability`
   - `POST /enrollments/reservations`
   - `POST /enrollments/waitlist` (when `isFull`)
2. UX: from class detail (and/or participant) → select owned participant → check eligibility → if eligible and seats → create reservation (show hold/`expiresAt`); if full → offer waitlist; surface error codes/reasons.
3. Reuse F2/F3/F4 primitives; RequireAuth routes only.
4. Idempotency key on reservation (≥8 chars) recommended.

### Out of scope (do not implement in F5)
- `POST /confirm`, payment callback, gateway UI  
- Insurance/medical/document upload & admin review  
- Attendance, discounts, admin 360, reports  
- Invented GET reservation / fake poll endpoints  
- Backend changes  

### Files likely to modify (Prompt 2 — not this audit)
- `frontend/src/features/enrollments/*` (new) or similar  
- `frontend/src/pages/app/AppClassDetailPage.jsx` (enable CTA / flow entry)  
- Possibly new pages/routes under `/app/...`  
- `frontend/src/App.jsx`  
- Nav only if a dedicated enroll hub is added (optional)  
- Docs: `FRONTEND_IMPLEMENTATION_SPEC.md`, F5 report  

### Must NOT modify
- `backend/**` (expected diff empty)  
- Marketing `/courses`  
- Unrelated F1–F4 foundations except intentional CTA wiring  

### APIs to consume / not invent
**Consume:** the four core APIs above (+ existing participants/classes).  
**Do not invent:** reservation GET, direct enrollment create, client-side amount, fake eligibility.

### Tests to reuse (backend — do not change)
- `backend/tests/enrollment.test.js` — eligibility + reserve + confirm flow  
- `backend/tests/concurrency.test.js` — `COURSE_FULL`, waitlist promote  
- `backend/tests/phase9.audit.test.js` — waitlist uniqueness  

---

## 8. Test / build status

| Check | Result |
|-------|--------|
| `npm test --prefix backend -- --testPathPatterns=enrollment` | **FAIL** — env: Mongo test DB name `undefined` / hook timeout (`Refusing test operations on non-test database`). **Pre-existing environment**, not an F5 code defect. |
| Frontend build | Not re-run this audit (no source changes); F4 previously **PASS**. |
| Backend source changes this prompt | **0** |
| Frontend source changes this prompt | **0** |

---

## 9. Files inspected

- `backend/src/modules/enrollments/enrollment.routes.js`
- `backend/src/modules/enrollments/enrollment.controller.js`
- `backend/src/modules/enrollments/enrollment.validation.js`
- `backend/src/modules/enrollments/enrollment.service.js`
- `backend/src/modules/enrollments/eligibility.service.js`
- `backend/src/modules/enrollments/enrollment.model.js`
- `backend/src/modules/enrollments/reservation.model.js`
- `backend/src/modules/enrollments/waitlist.model.js`
- `backend/src/modules/enrollments/participant.service.js` (ownership)
- `backend/src/modules/enrollments/user360.service.js` (`toPublicEnrollment`)
- `backend/src/modules/courses/domain.constants.js`
- `backend/src/app.js` (mount)
- `backend/src/config/env.js` (hold/offer seconds)
- `backend/tests/enrollment.test.js` (partial)
- `frontend/src/pages/app/AppClassDetailPage.jsx` (CTA)
- `frontend/src/features/courses/coursesApi.js` / `courseLabels.js`
- `frontend/src/services/api/index.js`
- Grep: frontend eligibility/reservation (none product UI)

---

## 10. Files changed

**MUST BE 0 for source.**

| Kind | Count |
|------|-------|
| Backend source | **0** |
| Frontend source | **0** |
| Dependencies added | **0** |
| Invented APIs | **0** |
| Audit doc only | `PHASE_F5_AUDIT_REPORT.md` (this file) |

---

## CRITICAL FINAL CHECK

| Item | Value |
|------|--------|
| Backend source changes | **0** |
| Frontend source changes | **0** |
| Dependencies added | **0** |
| Invented APIs | **0** |
| Implementation started | **No** |

**Do not proceed to F5 implementation in this prompt.**
