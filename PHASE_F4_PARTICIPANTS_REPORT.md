# PHASE F4 — PARTICIPANTS REPORT

**Date:** 2026-09-10  
**Scope:** USER participant list / create / detail / edit / deactivate  
**Next:** F5 (not started)

---

## 1. Scope

Implemented authenticated participant management against real `/api/enrollments/participants*` APIs.

Not implemented: eligibility, reservation, waitlist, checkout, payment, documents, medical, insurance, admin search, hard DELETE.

---

## 2. Backend contract audit

See `PHASE_F4_PARTICIPANT_CONTRACT_AUDIT.md`.

---

## 3. APIs used

| Frontend | Backend | Auth |
|----------|---------|------|
| `listParticipants` | `GET /api/enrollments/participants` | Bearer |
| `createParticipant` | `POST /api/enrollments/participants` | Bearer |
| `getParticipant` | `GET /api/enrollments/participants/:id` | Bearer |
| `updateParticipant` | `PATCH /api/enrollments/participants/:id` | Bearer |
| `deactivateParticipant` | `POST /api/enrollments/participants/:id/deactivate` | Bearer |

---

## 4. APIs not available

| Expected UX | Reality |
|-------------|---------|
| Hard DELETE | **Does not exist** — use deactivate |
| Reactivate | **Does not exist** |
| USER list inactive | Route does not expose `includeInactive` |
| Admin participant search | Exists but out of F4 |

---

## 5–7. Files

### Created
- `PHASE_F4_PARTICIPANT_CONTRACT_AUDIT.md`
- `PHASE_F4_PARTICIPANTS_REPORT.md`
- `frontend/src/features/participants/participantsApi.js`
- `frontend/src/features/participants/participantLabels.js`
- `frontend/src/features/participants/components/ParticipantCard.jsx`
- `frontend/src/features/participants/components/ParticipantFormFields.jsx`
- `frontend/src/pages/app/AppParticipantsPage.jsx`
- `frontend/src/pages/app/AppParticipantNewPage.jsx`
- `frontend/src/pages/app/AppParticipantDetailPage.jsx`
- `frontend/src/pages/app/AppParticipantEditPage.jsx`

### Modified
- `frontend/src/App.jsx`
- `frontend/src/layouts/ProductAppLayout.jsx`
- `frontend/src/pages/AppHomePage.jsx`
- `FRONTEND_IMPLEMENTATION_SPEC.md`

### Deleted
- none

---

## 8. Routes added

| Path | Page |
|------|------|
| `/app/participants` | list |
| `/app/participants/new` | create |
| `/app/participants/:participantId` | detail |
| `/app/participants/:participantId/edit` | edit |

All behind `RequireAuth`.

---

## 9. Create flow

Form fields from Zod contract → client mirror validation → `POST` → toast → redirect to detail. Double-submit guarded by `submitting`.

---

## 10. Edit flow

Load participant → PATCH → toast → detail. Forbidden/404 handled.

---

## 11. Delete flow

**Hard delete: N/A.** Soft deactivate with confirmation UI → `POST .../deactivate` → toast → list. Handles `PARTICIPANT_HAS_ACTIVE_ENROLLMENT`.

---

## 12. Ownership behavior

- List: owner active only  
- Other user’s id: backend `403 FORBIDDEN` → ForbiddenState  
- Inactive own: appears as `404` to USER → ErrorState  

---

## 13. Validation

Client mirrors min lengths, gender, relation, phone regex. Backend authoritative (`INVALID_BIRTH_DATE`, Zod strict).

---

## 14. Error handling

Mapped: `PARTICIPANT_NOT_FOUND`, `FORBIDDEN`, `PARTICIPANT_INACTIVE`, `PARTICIPANT_HAS_ACTIVE_ENROLLMENT`, `INVALID_BIRTH_DATE`, network/401/429.

---

## 15. Security / IDOR

Frontend does not trust client ownership. Backend `assertParticipantOwned` / `getParticipantAuthorized` enforced. Guard is UX-only.

---

## 16. Backend changes

**0** — `git diff -- backend/` empty.

---

## 17. Invented APIs

**0**

---

## 18. Dependencies

**0** added

---

## 19–20. Build / Lint

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **FAIL** (pre-existing ~16; **no F4 path errors**) |

---

## 21. Manual test matrix

| # | Case | Expected |
|---|------|----------|
| 1 | Open `/app/participants` | list or empty |
| 2 | Empty | EmptyState + CTA |
| 3 | Create valid | 201 → detail |
| 4 | Create invalid | field/server errors |
| 5 | Double submit | blocked while submitting |
| 6 | Detail | fields + age |
| 7 | Bad ObjectId | error message |
| 8 | Other user’s id | Forbidden |
| 9 | Edit | PATCH success |
| 10 | Deactivate | soft deactivate; 409 if enrollment |
| 11 | Refresh after mutation | list reflects server |
| 12–14 | Network / 401 | ApiError messaging |

(Requires backend running + auth session.)

---

## 22. Known limitations

- No hard delete / reactivate  
- Deactivated participants disappear from USER list  
- Documents/medical not on detail (F later)  
- `ownerUserId` not emphasized in UI (returned but not primary display)

---

## 23. F5 handoff

Likely next: **Eligibility + Reservation start** using selected participant + class from F3/F4.

Do not start F5 in this session.

---

# PHASE F4 COMPLETE

**FINAL VERDICT: READY FOR F5**
