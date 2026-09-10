# PHASE F5 CHECKOUT START COMPLETE

**Date:** 2026-09-10  
**Scope:** HELD reservation → `POST /confirm` → payment callback → authoritative result UI  
**Prior:** F5 Core (eligibility / availability / reservation / waitlist)

---

## 1. Final verdict

**READY FOR NEXT PHASE**

---

## 2. Exact confirm API contract discovered

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/enrollments/confirm` |
| Auth | Bearer (`authenticate`) |
| Body | `{ reservationId, discountCode?, idempotencyKey? }` (strict Zod; **no amount**) |
| Idempotency | Optional body key (≥8); also accepted via prior pattern; reuse with different payload → `IDEMPOTENCY_KEY_REUSE` |
| Behavior | Expires stale holds → load reservation → must be owned `HELD` and not past `expiresAt` → re-check eligibility → create `Enrollment` `PAYMENT_PENDING` + `Payment` → provider `createPayment` |
| Zero amount | Finalize immediately; `gateway.requiresRedirect: false`, `zeroAmount: true` |
| Paid amount | `gateway.requiresRedirect: true`, `redirectUrl`, `authority` |
| Success data | `{ enrollment, payment, quote, gateway, alreadyExists }` |
| Status | 201 new / 200 idempotent hit |
| Key errors | `RESERVATION_NOT_FOUND`, `RESERVATION_EXPIRED`, `FORBIDDEN`, `NOT_ELIGIBLE`, `ENROLLMENT_ALREADY_EXISTS`, `CLASS_NOT_FOUND`, `PARTICIPANT_NOT_FOUND`, `IDEMPOTENCY_KEY_REUSE`, gateway init failures |

Source: `enrollment.controller.js` → `checkout.service.js` `initiateCheckout`.

---

## 3. Exact payment callback contract discovered

| Item | Value |
|------|--------|
| Method | `POST` |
| Path | `/api/enrollments/payments/callback` |
| Auth | Bearer (owner) **or** `x-payment-callback-secret` for server-to-server |
| Body | `{ paymentId, success, providerRef?, authority? }` **strict** — amount fields rejected |
| Behavior | Provider `verifyPayment` with `intentSuccess`; never trusts client alone; finalize → enrollment `ACTIVE` or `PENDING_COMPLIANCE` |
| Response | `{ alreadyProcessed, payment, enrollment }` |
| Key errors | `PAYMENT_REQUIRED`, `FORBIDDEN`, `PAYMENT_FAILED` (402), `PAYMENT_TERMINAL` (409), `ENROLLMENT_NOT_FOUND` |

**Related authoritative read (real):** `GET /api/payments/:id` (owner/ADMIN) → public payment fields.  
**Related:** `GET /api/enrollments/:id` for enrollment status after success.

Gateway redirect URL comes **only** from confirm `gateway.redirectUrl` (mock/zarinpal). Frontend does not invent gateway URLs.

---

## 4. Implemented frontend flow

```
HELD reservation (in-memory from createReservation)
  → «ادامه پرداخت»
  → POST /enrollments/confirm (+ idempotencyKey)
  → if zeroAmount / no redirect: show server enrollment success on register page
  → if requiresRedirect: stash paymentId in sessionStorage → window.location = gateway.redirectUrl
  → return to /app/enrollments/payment/callback?Authority|authority&Status…
  → POST /enrollments/payments/callback (authoritative)
  → navigate /app/payments/:paymentId/result
  → GET /payments/:id (+ GET /enrollments/:id)
  → show success only if payment SUCCESS and enrollment ACTIVE|PENDING_COMPLIANCE
```

---

## 5. Routes added

| Path | Auth |
|------|------|
| `/app/enrollments/payment/callback` | RequireAuth (`/app`) |
| `/app/payments/:paymentId/result` | RequireAuth (`/app`) |

Existing: `/app/courses/:classId/register` (extended).

**Ops note:** `PAYMENT_CALLBACK_URL` should point at the frontend callback route (e.g. `https://app…/app/enrollments/payment/callback`) for mock/zarinpal returns.

---

## 6. Files created

- `frontend/src/pages/app/AppPaymentCallbackPage.jsx`
- `frontend/src/pages/app/AppPaymentResultPage.jsx`
- `PHASE_F5_CHECKOUT_START_REPORT.md` (this file)

---

## 7. Files modified

- `frontend/src/features/enrollments/enrollmentsApi.js` — confirm, callback, getPayment, getEnrollment, checkout stash
- `frontend/src/features/enrollments/enrollmentLabels.js` — payment/enrollment labels + error codes + query parse
- `frontend/src/pages/app/AppClassRegisterPage.jsx` — checkout CTA + zero-amount success
- `frontend/src/App.jsx` — routes
- `FRONTEND_IMPLEMENTATION_SPEC.md` — status line

---

## 8–10. Constraints

| Item | Result |
|------|--------|
| Backend changes | **0** |
| Invented APIs | **0** |
| Dependencies | **0** |

---

## 11. Payment behavior

- Confirm creates server quote/payment; client never sends amount.
- Redirect uses `gateway.redirectUrl` only.
- `paymentId` preserved via `sessionStorage` across redirect (gateway may return only `authority`).
- Verification always via `POST …/payments/callback`.
- Result page re-reads `GET /payments/:id`.

---

## 12. Success / failure / cancel

| Case | UI |
|------|-----|
| SUCCESS + ACTIVE/PENDING_COMPLIANCE | «ثبت‌نام با موفقیت انجام شد» |
| FAILED / CANCELLED / EXPIRED | Failure copy; no auto re-reserve |
| INITIATED / PENDING | Pending + retry GET |
| Callback `success: false` (Status=NOK etc.) | Sent as `intentSuccess: false` → server may `PAYMENT_CANCELLED` |
| Malformed return (no paymentId) | Error on callback page |

---

## 13. Expiry handling

- Client disables checkout when local countdown hits 0 (UX only).
- Server `RESERVATION_EXPIRED` clears hold UI and refreshes availability.
- No reservation GET/refresh invented.

---

## 14. Refresh / back

- Register page reservation is in React state only — refresh loses HELD UI (documented limitation).
- After redirect, paymentId recovered from sessionStorage or query.
- Result page recoverable via paymentId in URL + GET payment.
- No fabricated enrollment without server confirmation.

---

## 15–17. Verification

| Check | Result |
|-------|--------|
| Frontend unit tests | None (no framework) — manual matrix documented |
| `npm run build` | **PASS** |
| `npm run lint` | **FAIL** pre-existing 16; **0** new on F5 checkout files |
| `git diff -- backend/` | **empty** |

Manual matrix (needs running backend + configured `PAYMENT_CALLBACK_URL`):

1. HELD → checkout button  
2. Double-click blocked while confirming  
3. Confirm body uses `reservationId` + idempotencyKey  
4. Client-expired hold blocks button  
5. Server `RESERVATION_EXPIRED` handled  
6. Redirect follows `gateway.redirectUrl`  
7. Success not claimed from query alone  
8. Failure / cancel paths  
9. Network / 401–429 messages  
10. Refresh register does not invent enrollment  

---

## 18. Known limitations

- No reservation GET → lost hold after full page refresh before confirm  
- sessionStorage required to map authority → paymentId after gateway return  
- Discount code UI not added (API supports optional `discountCode`)  
- `PENDING_COMPLIANCE` noted but no compliance upload  
- Callback route is authenticated; provider must return user to a session they can complete while logged in  

---

## 19. Explicit confirmation

| Item | |
|------|--|
| backend unchanged | ✅ |
| no reservation GET invented | ✅ |
| no reservation DELETE invented | ✅ |
| no direct enrollment-create invented | ✅ |
| no compliance implemented | ✅ |
| no new payment gateway implemented | ✅ |

---

## 20. Recommended next phase

**Compliance (insurance/medical upload + pending-compliance UX)** and/or **my enrollments list** (`GET /enrollments/me`) + cancel flow — not auto-started here.
