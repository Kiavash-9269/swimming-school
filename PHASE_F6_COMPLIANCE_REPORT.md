# PHASE F6 COMPLIANCE COMPLETE

**Date:** 2026-09-10  
**Scope:** PENDING_COMPLIANCE UX + participant insurance/medical upload & status  
**Mode:** Frontend only

---

## Final verdict

**READY FOR NEXT PHASE**

---

## Backend contract discovered

Compliance is **participant-scoped** under `/api/enrollments` (not enrollment-scoped upload).

### USER APIs used

| Method | Path | Auth | Body / notes | Response |
|--------|------|------|--------------|----------|
| `GET` | `/enrollments/:id` | Bearer | — | enrollment incl. `status`, `participantId`, `paymentId`, `eligibilitySnapshot` |
| `GET` | `/payments/:id` | Bearer | — | payment public fields |
| `GET` | `/enrollments/participants/:participantId/insurance` | Bearer + ownership | — | `{ items: InsurancePublic[] }` |
| `GET` | `/enrollments/participants/:participantId/medical` | Bearer + ownership | — | `{ items: MedicalPublic[] }` |
| `GET` | `/enrollments/participants/:participantId/medical-profile` | Bearer + ownership | — | profile or `{ approvalStatus: "NONE" }` |
| `PUT` | `/enrollments/participants/:participantId/medical-profile` | Bearer + ownership | `{ hasMedicalCondition?, allergies?, medications?, notes? }` — USER cannot set `approvalStatus` | profile |
| `POST` | `/enrollments/participants/:participantId/insurance/upload` | Bearer + ownership | multipart field **`file`**; optional `providerName`, `policyRef`, `startDate`, `expiresAt` | `{ record, storage: { persisted: true } }` · status `PENDING` |
| `POST` | `/enrollments/participants/:participantId/medical/upload` | Bearer + ownership | multipart **`file`**; optional `documentType`, `expiresAt` | same · `PENDING` |

Also exist (not required for core F6 UI, available):

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `.../insurance` JSON | metadata submit; USER status must be `PENDING` |
| `POST` | `.../medical` JSON | same |
| `GET` | `/enrollments/documents/{insurance\|medical}/:documentId` | metadata |
| `GET` | `.../content` | binary download |
| Admin review / `activate-compliance` | ADMIN only | **out of USER F6** |

### Document constraints (backend)

- MIME: `application/pdf`, `image/jpeg`, `image/png`
- Max size: 5 MiB (`DOCUMENT_TOO_LARGE` / 413)
- Errors: `FILE_REQUIRED`, `INVALID_FILE_TYPE`, `UPLOAD_ERROR`, `FORBIDDEN`, `PARTICIPANT_NOT_FOUND`, `DOCUMENT_NOT_FOUND`

### Status values

`COMPLIANCE_STATUSES`: `PENDING` | `APPROVED` | `REJECTED` | `EXPIRED`  
Medical profile `approvalStatus`: `NONE` | `PENDING` | `APPROVED` | `REJECTED` | `EXPIRED`

Eligibility snapshot reasons (when present): `INSURANCE_REQUIRED`, `MEDICAL_APPROVAL_REQUIRED`, …

### Unavailable / not invented

- USER self-approve documents  
- USER activate enrollment after docs (admin `activate-compliance`)  
- Enrollment-level document endpoints  
- Fake upload / fake local APPROVED  

---

## Implemented frontend flow

```text
Payment SUCCESS
    ↓
ACTIVE → «ثبت‌نام با موفقیت انجام شد»

Payment SUCCESS
    ↓
PENDING_COMPLIANCE
    ↓
Compliance UI (/app/enrollments/:enrollmentId/compliance)
    ↓
GET enrollment + payment + insurance/medical lists + medical profile
    ↓
Upload insurance/medical (multipart file) when needed
    ↓
authoritative PENDING (await admin review)
```

---

## Routes

| Path | Notes |
|------|--------|
| `/app/enrollments/:enrollmentId/compliance` | **added** · RequireAuth |
| `/app/payments/:paymentId/result` | updated CTA for PENDING_COMPLIANCE |
| Register zero-amount success | link to compliance when pending |

---

## Files

### Created
- `frontend/src/pages/app/AppEnrollmentCompliancePage.jsx`
- `PHASE_F6_COMPLIANCE_REPORT.md`

### Modified
- `frontend/src/features/enrollments/enrollmentsApi.js`
- `frontend/src/features/enrollments/enrollmentLabels.js`
- `frontend/src/pages/app/AppPaymentResultPage.jsx`
- `frontend/src/pages/app/AppClassRegisterPage.jsx`
- `frontend/src/App.jsx`
- `FRONTEND_IMPLEMENTATION_SPEC.md`

---

## Scorecard

```text
Backend changes: 0
Invented APIs: 0
Dependencies: 0
New payment gateway: 0
Reservation GET: 0
Reservation DELETE: 0
Direct enrollment-create: 0
```

---

## Compliance capabilities

| Capability | Implemented |
|------------|-------------|
| insurance list + status | ✅ |
| medical documents list + status | ✅ |
| medical profile read/update | ✅ |
| multipart upload insurance/medical | ✅ (`apiUpload`, field `file`) |
| verification/status from server | ✅ (PENDING/APPROVED/REJECTED/EXPIRED) |
| PENDING_COMPLIANCE UX | ✅ |
| Admin review / activate | ❌ (correctly out of USER scope) |
| Document binary download UI | ❌ (endpoint exists; not required for submit flow) |

---

## Testing

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **FAIL** — 16 pre-existing; **0** F6 path hits |
| `git diff -- backend/` | **empty** |
| Manual matrix | Not executed against live backend in this session (no test DB/auth run here). Cases 1–15 require running API + seeded PENDING_COMPLIANCE / document states. |

---

## Known limitations

- Enrollment stays `PENDING_COMPLIANCE` until **admin** reviews docs and/or runs activate-compliance — USER upload alone does not flip to `ACTIVE`.
- Eligibility for insurance/medical uses **APPROVED** documents with date rules; profile alone is insufficient.
- No `GET /enrollments/me` in this phase — compliance page is reached via enrollment id from payment/result or register success.
- JSON-only submit without file is not the primary UX (upload preferred); metadata-only path still exists on backend.

---

## Explicit confirmation

```text
backend unchanged
no invented APIs
no fake upload
no fake compliance status
no payment changes (beyond PENDING_COMPLIANCE messaging/CTA)
no reservation changes
```

---

## Recommended next phase

**My Enrollments:** `GET /api/enrollments/me` + enrollment detail + optional `POST /:id/cancel` — do not start automatically.
