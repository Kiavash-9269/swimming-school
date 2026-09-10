# PHASE F2 — FRONTEND FOUNDATION REPORT

**Date:** 2026-09-10  
**Scope:** API transport · auth failure wiring · route guards · product shell · UI primitives · toast · env  
**Next phase:** F3 (not started)

---

## 1. Phase objective

Build reusable frontend infrastructure for later product phases without implementing Courses, Participants, Reservation, Payment, Documents, Admin features, Reports, Notifications, or Attendance.

---

## 2. Files inspected

| Area | Paths |
|------|--------|
| Frontend entry | `main.jsx`, `App.jsx`, `package.json`, `vite.config.js` |
| Auth | `services/apiClient.js`, `services/authContext.jsx`, `components/auth/*`, `pages/AuthPage.jsx` |
| Layouts | `RootLayout`, `AuthLayout`, `MainNavigation` |
| Store | `store/store.js`, slices |
| Backend contracts | `backend/src/utils/apiResponse.js`, `auth.controller.js` (`/me` → `{ user }`), auth routes |
| F1 report | `PHASE_F1_FRONTEND_DISCOVERY_REPORT.md` |

---

## 3. Existing architecture found

- Marketing site + OTP auth already working
- JSON-only `apiRequest` with single-flight refresh
- Auth state in React Context (not Redux)
- Redux store present but unused (no Provider) — left as-is for F2
- `RequireAuth` existed but was unused
- No toast system
- No multipart/blob helpers

---

## 4. Changes made

### Created
- `frontend/src/config/env.js`
- `frontend/.env.example`
- `frontend/src/services/api/errors.js`
- `frontend/src/services/api/http.js`
- `frontend/src/services/api/index.js`
- `frontend/src/components/Ui/Loading.jsx`
- `frontend/src/components/Ui/ErrorState.jsx`
- `frontend/src/components/Ui/EmptyState.jsx`
- `frontend/src/components/Ui/ForbiddenState.jsx`
- `frontend/src/components/feedback/toastContext.js`
- `frontend/src/components/feedback/ToastProvider.jsx`
- `frontend/src/components/feedback/useToast.js`
- `frontend/src/components/auth/GuestOnly.jsx`
- `frontend/src/layouts/ProductAppLayout.jsx`
- `frontend/src/pages/AppHomePage.jsx`
- `frontend/src/pages/AdminHomePage.jsx`

### Modified
- `frontend/src/services/apiClient.js` → re-exports hardened HTTP layer
- `frontend/src/services/authContext.jsx` → `setUnauthorizedHandler` sync
- `frontend/src/components/auth/RequireAuth.jsx` → roles + Forbidden UX
- `frontend/src/App.jsx` → `/app`, `/admin`, GuestOnly, catch-all
- `frontend/src/main.jsx` → ToastProvider
- `frontend/src/pages/ErrorPage.jsx` → real not-found/error UI
- `frontend/src/layouts/MainNavigation.jsx` → link «حساب من» → `/app`

### Deleted
- none

---

## 5. API client

| Mode | Function | Behavior |
|------|----------|----------|
| **JSON** | `apiRequest` | Bearer when `auth`; `credentials: "include"`; parses `{ success, data }` / error envelope; optional `signal` |
| **Multipart** | `apiUpload` | FormData body; **no** manual Content-Type; same auth/refresh/errors |
| **Blob** | `apiDownloadBlob` | Returns `{ blob, filename?, contentType }`; JSON error bodies still parsed into `ApiError` |

Normalized errors: `ApiError` with `status`, `code`, `message`, `details` (+ network / abort).

---

## 6. Authentication handling

| Topic | Behavior |
|-------|----------|
| Access token | In-memory via `setAccessToken` / `getAccessToken` |
| Refresh cookie | `credentials: "include"` on all fetch calls |
| Single-flight refresh | Shared `refreshPromise` |
| No refresh on | `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Retry | At most one retry after successful refresh |
| Session clear | `setUnauthorizedHandler` clears AuthContext when refresh fails |
| Auth APIs used | Real `/api/auth/*` only (existing `authApi`) |

Auth UI flows were **not** rewritten.

---

## 7. Route protection

| Kind | Implementation |
|------|----------------|
| Public | Marketing routes under `/` unchanged |
| Guest-only | `/auth` wrapped in `GuestOnly` → redirect to `/app` if logged in |
| Authenticated | `/app/*` → `RequireAuth` |
| Role-aware | `/admin/*` → `RequireAuth roles={['ADMIN']}` + `ForbiddenState` if wrong role |

Frontend guards are UX-only; backend remains authoritative.

---

## 8. UI primitives

| Primitive | Location |
|-----------|----------|
| Page / section / button loading | `components/Ui/Loading.jsx` |
| Error + retry | `ErrorState.jsx` |
| Empty | `EmptyState.jsx` |
| Forbidden | `ForbiddenState.jsx` |
| Not found / route error | `pages/ErrorPage.jsx` |
| Toast success/error/warning/info | `ToastProvider` + `useToast` (no new library) |

Product shell: `ProductAppLayout` — header, outlet, logout; **no fake KPIs**.

Placeholder landings: `/app`, `/admin` state clearly that product modules are not built yet.

---

## 9. Environment configuration

- `appConfig.apiBaseUrl` from `VITE_API_BASE_URL` or `/api`
- `frontend/.env.example` documents override
- No secrets

---

## 10. Dependencies

| | |
|--|--|
| Added | **none** |
| Removed | **none** |

---

## 11. Backend verification

**Backend source changes: NO**

`git status` / `git diff -- backend/` → empty for this phase.

---

## 12. API verification

**Invented APIs: 0**

Only real auth endpoints are called at runtime in F2. Upload/download helpers are transport-only (no document/export UI).

---

## 13. Validation

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run lint` | **FAIL** |

### Lint breakdown

**Pre-existing (marketing / AuthCard unused imports, etc.):**  
~14 unused-var / hooks warnings in About, Gallery, Record, courses, AuthCard, …  
`authContext.jsx` react-refresh/only-export-components (same pattern existed before F2)

**Introduced by F2 then fixed:**  
unused params / regex escape in `http.js`; toast hook co-export — **resolved**

**Remaining F2-new lint:** none identified beyond pre-existing authContext pattern.

---

## 14. Scope verification — NOT implemented (later phases)

- Course product API UI  
- Participants  
- Eligibility / Reservation / Waitlist  
- Checkout / Payment / polling  
- Documents upload UI  
- Admin dashboards / reports / refunds  
- Notifications  
- Attendance  
- Redux Provider / product slices  
- New npm libraries  

---

## 15. Risks / limitations

| Risk | Notes |
|------|--------|
| Medium | Auth still redirects to `/` after login (AuthCard) — deep-link polish is F3 |
| Low | Redux still unwired — intentional until needed |
| Low | Legacy lint noise remains |
| Ops | Backend must run on `:4000` for proxy |

---

## 16. Final verdict

**READY FOR F3**

---

# PHASE F2 COMPLETE

Do not start F3 in this session.
