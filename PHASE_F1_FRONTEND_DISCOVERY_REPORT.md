# PHASE F1 — FRONTEND DISCOVERY, CONTRACT AUDIT & IMPLEMENTATION PLAN

**Date:** 2026-09-10  
**Scope:** Discovery · contract verification · architecture · specification · roadmap  
**Backend changes:** none  
**Frontend product implementation:** none (audit + one broken-import fix only)

---

## 1. Executive Summary

The backend (Phases 1–9) is production-ready with known limitations. The frontend is a **marketing brochure + working phone/OTP auth shell**. Almost none of the registration product (courses API, participants, reservation, payment, documents, admin) exists in UI.

Phase F1 verified contracts against real backend routes/controllers, confirmed the JSON envelope (with binary exceptions), audited auth/payment/documents/capacity, updated `FRONTEND_IMPLEMENTATION_SPEC.md`, and produced an ordered roadmap **F2→F13**.

**Build:** `npm run build` **PASS**  
**Lint:** `npm run lint` **FAIL** (pre-existing unused imports; not a product blocker)  
**Tests:** no frontend test script

### FINAL VERDICT

**READY FOR FRONTEND IMPLEMENTATION**

No architectural blocker prevents starting F2. Remaining issues are expected gaps (missing product pages) or pre-existing lint noise.

---

## 2. Current Frontend Status

| Area | Status | Evidence |
|------|--------|----------|
| Marketing site (Home/About/Gallery/Contact/Record) | COMPLETE | Pages + components render; static content |
| Auth (login/OTP register/password reset) | COMPLETE | `AuthCard` + `authApi` + `AuthProvider` against real `/api/auth` |
| Session bootstrap / refresh | COMPLETE | `refresh` + `me` on mount; memory access token; `credentials: "include"` |
| Route guards | PARTIAL | `RequireAuth` exists; **not mounted** on any route |
| Redux Toolkit | PARTIAL / BROKEN-wiring | Store existed with **missing `portfolioSlice`** (fixed F1); **no `<Provider>`** in `main.jsx`; unused by UI |
| Courses product | PLACEHOLDER | `/courses` = static tabs + WhatsApp CTA — not backend classes |
| Participants | MISSING | No pages/API client |
| Eligibility / Reservation / Waitlist | MISSING | — |
| Checkout / Payment result | MISSING | — |
| Documents | MISSING | — |
| My Enrollments / Cancel | MISSING | — |
| Admin / Reports / Notifications | MISSING | — |
| Attendance UI | MISSING | — |
| Error page | BROKEN (quality) | Renders `404` only; default export wrongly named `HomePage` |
| Sidebar layout | UNUSED | Empty stub |
| Contact form → backend | PLACEHOLDER | UI only; no API |
| apiClient multipart/blob | MISSING | JSON-only `apiRequest` |

---

## 3. Frontend File Architecture

```text
frontend/
  package.json          React 19, Vite 7, RR7, RTK, Tailwind 4, framer-motion, …
  vite.config.js        proxy /api → http://127.0.0.1:4000
  index.html            favicon /logo.png.webp (fixed earlier)
  public/               logo, gallery assets
  src/
    main.jsx            AuthProvider + App (no Redux Provider)
    App.jsx             createBrowserRouter — marketing + /auth only
    index.css           Tailwind 4 + Iran Yekan
    pages/              Home, About, Courses, Contact, Record, Gallery, Auth, Error
    layouts/            RootLayout, AuthLayout, Nav, Footer, Sidebar(stub)
    components/         marketing + auth + thin Ui/
    services/
      apiClient.js      fetch wrapper + authApi only
      authContext.jsx   session state
    store/              theme + sidebar slices (unused without Provider)
    hooks/useIsMobile.jsx
    utils/motionVariants.js
    assets/
```

**No** `features/` domain folders yet. Recommended growth path: extend `services/` + `pages/` + optional `features/*` without a big-bang restructure.

---

## 4. Existing Features Matrix

| Feature | Classification | Notes |
|---------|----------------|-------|
| Home / About / Gallery | COMPLETE | Brochure |
| Record (FINA calculator) | COMPLETE | Client-only; unrelated to enrollment API |
| Contact | PARTIAL | No backend wire |
| Auth flows | COMPLETE | Matches backend OTP/login/reset |
| RequireAuth | PARTIAL | Unused |
| Courses | PLACEHOLDER | Must replace data source with API in F5 |
| Redux store | PARTIAL | Import fixed; still unwired |
| portfolioSlice reference | FIXED (F1) | Was dead/broken import |
| Enrollment product | MISSING | — |
| Payment product | MISSING | — |
| Admin product | MISSING | — |

---

## 5. Backend Contract Verification

| Claim | Result |
|-------|--------|
| Mount prefixes `/api/auth|courses|enrollments|payments|notifications|admin/reports` | VERIFIED (`app.js`) |
| JSON `{ success, data }` / `{ success, error:{code,message,details?} }` | VERIFIED (`apiResponse.js`) |
| Document `/content` binary | VERIFIED (stream; not JSON) |
| Report `/export` xlsx binary | VERIFIED |
| JWT roles `USER` \| `ADMIN` only | VERIFIED |
| Instructor = linked USER, not JWT role | VERIFIED |
| Callback `POST /api/enrollments/payments/callback` | VERIFIED |
| Confirm creates payment + quote + gateway | VERIFIED |
| Cancel terminalizes open payments (Phase 9) | VERIFIED |
| `DOCUMENT_NOT_PERSISTED` on approve of metadata-only | VERIFIED |
| Capacity uses `confirmed + held` | VERIFIED |
| Reconcile detect-only | VERIFIED |
| User notification inbox | **DOES NOT EXIST** |
| Dedicated GET `/reservations/:id` | **DOES NOT EXIST** |

---

## 6. API Inventory (frontend-relevant, verified)

### Auth — `/api/auth`

| Method | Path | Auth |
|--------|------|------|
| POST | `/check-phone` | public |
| POST | `/register/send-otp` | public |
| POST | `/register/verify-otp` | public |
| POST | `/register` | public |
| POST | `/login` | public |
| POST | `/password/send-otp` | public |
| POST | `/password/verify-otp` | public |
| POST | `/password/reset` | public |
| POST | `/refresh` | cookie |
| POST | `/logout` | cookie |
| GET | `/me` | Bearer |

### Courses — `/api/courses`

| Method | Path | Auth |
|--------|------|------|
| GET | `/templates`, `/templates/:id` | public |
| GET | `/classes`, `/classes/:id` | public |
| GET | `/classes/:id/capacity\|schedule\|sessions` | public |
| POST/PATCH + lifecycle | templates/classes/instructors… | ADMIN |

### Enrollments — `/api/enrollments`

| Method | Path | Auth |
|--------|------|------|
| CRUD | `/participants…` | USER (+ADMIN read) |
| Upload | `…/insurance/upload`, `…/medical/upload` | USER multipart `file` |
| Legacy JSON | `…/insurance`, `…/medical` | not primary UX |
| Content | `/documents/…/:id/content` | owner/ADMIN binary |
| Review/pending | `/admin/documents/…` | ADMIN |
| POST | `/eligibility/check` | USER |
| GET | `/classes/:classId/availability` | USER |
| POST | `/reservations` | USER |
| POST | `/waitlist` | USER |
| POST | `/confirm` | USER |
| POST | `/payments/callback` | USER |
| GET | `/me`, `/:id` | USER |
| POST | `/:id/cancel` | USER/ADMIN |
| Attendance | `/attendance`, `/classes/:id/attendance` | ADMIN or instructor-link |
| 360 | `/users/me/360`, `/users/:userId/360` | USER / ADMIN |

### Payments — `/api/payments`

| Method | Path | Auth |
|--------|------|------|
| GET | `/:id` | owner/ADMIN |
| GET | `/` | ADMIN |
| POST | `/:id/refund` | ADMIN |
| GET | `/jobs/reconcile` | ADMIN detect-only |
| POST | `/jobs/expire` | ADMIN |

### Notifications — `/api/notifications/*` — **ADMIN only**

### Reports — `/api/admin/reports/*` — **ADMIN**; exports binary except discounts/compliance (no Excel)

---

## 7. Authentication Audit

| Topic | Finding |
|-------|---------|
| Access token | Returned in JSON; frontend keeps **in-memory** (`apiClient`) — correct |
| Refresh | httpOnly cookie; `POST /auth/refresh` with `credentials: "include"` — correct |
| 401 retry | Single-flight refresh then one retry — correct pattern |
| Logout | Clears cookie server-side + FE clears memory |
| Roles | `user.role` from `/me` for UX only; backend enforces |
| Guard | Must mount `RequireAuth` in F4; today all marketing routes public |

**Do not** store refresh token in localStorage.

---

## 8. Payment Contract Audit

Lifecycle (verified enums):  
`CREATED → INITIATED → PENDING → SUCCESS | FAILED | CANCELLED | EXPIRED`  
plus `REFUND_REQUESTED → REFUNDED`

| Step | Backend truth | Frontend rule |
|------|---------------|---------------|
| Checkout | `POST /enrollments/confirm` | Show `quote.*` only |
| Amount | Server-priced | Never send amount in callback |
| Gateway | `gateway.redirectUrl` | Redirect only if `requiresRedirect` |
| Callback | `POST /enrollments/payments/callback` `{ paymentId, success, authority?, providerRef? }` | No amount fields |
| Authoritative status | `GET /payments/:id` | Never trust gateway URL |
| Zero amount | `gateway.zeroAmount` | May skip redirect |
| Terminal | SUCCESS/FAILED/CANCELLED/EXPIRED/REFUNDED… | Stop polling; no local overwrite |
| Retry after fail/expire | New reservation → confirm | Do not revive dead payment |
| Cancel enrollment | Open payments → CANCELLED | Refresh payment+enrollment+capacity |
| Refund | ADMIN; Zarinpal may stay `REFUND_REQUESTED` | Honest UI |

---

## 9. Document Contract Audit

| Item | Verified |
|------|----------|
| Field name | `file` |
| MIME | pdf / jpeg / png (magic bytes) |
| Size | `DOCUMENT_MAX_BYTES` (default 5MB) → `DOCUMENT_TOO_LARGE` |
| Primary UX | multipart upload → `persisted: true` |
| Legacy JSON metadata | `persisted: false`; approve → `DOCUMENT_NOT_PERSISTED` |
| Download | authorized `/content`; no `storageKey` in public JSON |
| Replacement | new PENDING doc; do not overwrite approved history |

---

## 10. Capacity / Reservation Audit

| Field (capacity/availability) | Meaning |
|-------------------------------|---------|
| `capacity` | Max seats |
| `confirmed` | Confirmed enrollments |
| `held` | Active reservation holds |
| `available` | `capacity - confirmed - held` |
| `isFull` | `available <= 0` |
| `registrationOpen` | Class status gate |

Frontend displays server fields only. Race: user sees seat → submit → `COURSE_FULL` / eligibility / conflict → show error + refresh capacity. No local lock.

Waitlist: `POST /waitlist` returns `position` from server — never compute client-side.

No dedicated reservation GET; timer UX should use response `expiresAt` if present, then treat expiry as needing re-reserve after backend error/job.

---

## 11. FRONTEND_IMPLEMENTATION_SPEC Audit

| Section | Classification |
|---------|----------------|
| Product overview / actors / mental model | VERIFIED |
| Auth journeys | VERIFIED vs routes |
| Payment callback path | VERIFIED |
| Payment status table | VERIFIED |
| Cancel Phase 9 behavior | VERIFIED |
| Documents multipart + persisted rule | VERIFIED |
| heldCount capacity | VERIFIED |
| Admin + reports inventory | VERIFIED |
| Forbidden list | VERIFIED |
| “Envelope always JSON” | **INCOMPLETE** → corrected: binary exceptions |
| Implied reservation status polling endpoint | **INCORRECT if assumed** → clarified: no GET |
| Current `/courses` WhatsApp as product path | OUTDATED for product (kept as marketing until F5) |
| Implementation milestones | UPDATED → F2–F13 roadmap |

---

## 12. Specification Changes

**File:** `FRONTEND_IMPLEMENTATION_SPEC.md`

- F1 stamp + frontend build status table  
- Explicit binary contract exceptions  
- Section ۳۲ F1 findings (apiClient gaps, RequireAuth, Redux)  
- Section ۳۳ roadmap F2–F13  

No invented APIs. Persian product/UX handoff retained and tightened.

---

## 13. Recommended Frontend Architecture

```text
Auth state     → keep AuthContext (already works)
Server state   → services/*Api.js + page/feature hooks (start simple)
Form state     → local component state
Payment state  → dedicated hook (paymentId, status, polling, terminal lock)
UI state       → toast/modal; optional Redux theme/sidebar IF Provider added
```

**RTK Query:** not required for F2–F5; revisit only if caching complexity justifies it.  
**Do not** add axios/react-query unless a concrete gap appears.  
**apiClient F2 must add:** FormData upload + blob download helpers without breaking JSON envelope handling.

---

## 14. Dependency Audit

| Dependency | Use now | Verdict |
|------------|---------|---------|
| react / react-dom 19 | yes | keep |
| react-router-dom 7 | yes | keep |
| @reduxjs/toolkit | installed, barely used | keep; wire only when needed |
| tailwind 4 | yes | keep |
| framer-motion | marketing | keep |
| recharts | Record page | keep |
| swiper / react-swipeable | gallery | keep |
| lucide-react / react-icons | icons | keep (duplicate icon libs — LOW debt; don’t add a third) |

**No new dependencies in F1.** None recommended for F2 foundation.

---

## 15. Build / Test Status

| Command | Result | Notes |
|---------|--------|-------|
| `npm run build` | **PASS** (~18s) | Production bundle OK |
| `npm run lint` | **FAIL** | 14 errors / 2 warnings — mostly unused `motion` imports; **pre-existing** |
| `npm test` | **N/A** | No test script in `frontend/package.json` |

Lint failures do **not** block F2 product work; optionally clean unused imports in a small chore later.

---

## 16. Risks

### Critical
None for starting F2.

### High
1. **Payment UX mistakes** (URL success, client amount, no GET payment) — mitigate via F8 checklist + spec rules.  
2. **apiClient lacks multipart/blob** — must be F2 before documents/reports.

### Medium
3. RequireAuth unmounted → accidental public deep links until F4.  
4. Redux unwired + prior broken import — confusion if someone imports store early.  
5. Static Courses CTA trains users to WhatsApp — replace in F5.  
6. Backend must be running (`:4000`) or Vite proxy shows ECONNREFUSED (ops, not code).

### Low
7. Lint unused imports.  
8. ErrorPage stub quality.  
9. Dual icon libraries.  
10. `html lang="en"` while product is Persian — fix in shell F4.

---

## 17. Exact Frontend Implementation Roadmap

| Phase | Focus | Exit criteria |
|-------|--------|---------------|
| **F2 Foundation** | apiClient multipart/blob; toast; ErrorPage fix; decide Provider; mount RequireAuth skeleton | Build green; downloads/uploads helper tested manually |
| **F3 Auth polish** | Deep-link return; role-aware nav links | Auth DoD |
| **F4 App shell + routing** | User/Admin route trees; RTL shell | Guards work UX-side |
| **F5 Courses** | API list/detail/capacity/schedule/sessions | Replace WhatsApp product CTA |
| **F6 Participants** | CRUD + medical-profile | Empty/error states |
| **F7 Enrollment** | eligibility → reserve → waitlist → confirm quote | Race errors handled |
| **F8 Payment** | result page, callback, polling, cancel refresh | Payment DoD |
| **F9 Documents** | multipart UX + admin review | No storageKey; persisted respected |
| **F10 Admin core** | dashboard, users, 360, classes, payments/refund/reconcile | Confirm on destructive |
| **F11 Reports+** | Excel, notifications admin, attendance | Binary export works |
| **F12 Integration** | End-to-end mock payment path | Checklist signed |
| **F13 Production FE audit** | a11y, responsive, DoD, no invented APIs | Ready with known BE limits |

**Stop after each phase.** Do not merge F5–F10 into one Cursor session.

---

## 18. Files Changed

### Created
- `PHASE_F1_FRONTEND_DISCOVERY_REPORT.md` (this file)

### Modified
- `FRONTEND_IMPLEMENTATION_SPEC.md` — F1 verification, binary exceptions, findings, F2–F13 roadmap  
- `frontend/src/store/store.js` — removed broken `portfolioSlice` import (minimal safe fix)

### Deleted
- none

### Not changed
- Backend source  
- Product pages (intentionally)  
- package.json dependencies  

---

## 19. Final Verdict

**READY FOR FRONTEND IMPLEMENTATION**

Evidence:
- Backend contracts audited from source  
- Frontend build passes  
- Spec aligned with verified APIs and gaps  
- Clear F2 starting point (apiClient + shell) without rewrite of working auth/marketing  

Next allowed phase: **PHASE F2 — Foundation** only.

---

# PHASE F1 COMPLETE

**FINAL VERDICT: READY FOR FRONTEND IMPLEMENTATION**
