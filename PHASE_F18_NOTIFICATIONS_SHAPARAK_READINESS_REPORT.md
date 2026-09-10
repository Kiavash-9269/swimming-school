# PHASE F18 — Notifications Operations UI + Shaparak Payment Readiness

Date: 2026-09-10

## 1. FINAL VERDICT

**COMPLETE WITH KNOWN LIMITATIONS**

Architecture is ready to attach a real Shaparak-compatible PSP adapter without rewriting enrollment/payment core. Live PSP / Shaparak certification was **not** performed.

---

## 2. Notifications backend contract audit

| Method | Path | Auth | Role | Query / Body | Response | Side effects | Idempotency | Failure codes |
|--------|------|------|------|--------------|----------|--------------|-------------|---------------|
| GET | `/api/notifications` | JWT | ADMIN | `status?`, `type?`, `channel?`, `userId?`, `page` (1–10000), `limit` (1–100) | `{ page, limit, total, items[] }` public notification DTOs | none | n/a | 401, 403, 400 VALIDATION |
| GET | `/api/notifications/jobs` | JWT | ADMIN | — | `{ scheduler, jobs[] }` locks | none | n/a | 401, 403 |
| POST | `/api/notifications/jobs/run` | JWT | ADMIN | — | `{ results }` | runs all ops jobs | lock-based | 401, 403 |
| POST | `/api/notifications/jobs/expire-reservations` | JWT | ADMIN | — | job result | expire reservations | lock | 401, 403 |
| POST | `/api/notifications/jobs/expire-payments` | JWT | ADMIN | — | job result | expire payments | lock | 401, 403 |
| POST | `/api/notifications/jobs/process-notifications` | JWT | ADMIN | — | job result | deliver batch | claim CAS | 401, 403 |
| GET | `/api/notifications/:id` | JWT | ADMIN | `id` ObjectId | public notification | none | n/a | 400, 404 NOTIFICATION_NOT_FOUND |
| POST | `/api/notifications/:id/retry` | JWT | ADMIN | `id` ObjectId | `{ notification, alreadySent }` | FAILED/PENDING → PENDING; bumps maxAttempts | SENT → alreadySent | 400, 404, 409 INVALID_NOTIFICATION_STATUS |

Public DTO fields: `id`, `userId`, `type`, `channel`, `status`, `locale`, `attempts`, `maxAttempts`, timestamps, `errorCode`, `providerMessageId`, `refs` — **not** SMS body / full destination.

---

## 3. Notifications security audit

| # | Question | Evidence / result |
|---|----------|-------------------|
| 1 | USER access admin queue? | **Denied** 403 |
| 2 | Instructor (USER JWT) access? | **Denied** 403 (no TEACHER role) |
| 3 | ADMIN retry? | **Allowed** |
| 4 | Retry duplicate delivery incorrectly? | SENT → `alreadySent`; attempts not reset; maxAttempts raised by +1 for FAILED |
| 5 | Retry safe? | Yes for admin ops; delivery still via claim+lease |
| 6 | Failed vs pending distinguishable? | Yes (`FAILED` / `PENDING` / `PROCESSING` / `SENT`) |
| 7 | Provider errors leaked? | Only `errorCode` + truncated `lastError` server-side; public DTO omits `lastError` |
| 8 | Sensitive payload exposed? | Body not in public DTO |
| 9 | Pagination bounded? | limit ≤ 100 |
| 10 | Filters validated? | Zod enums + objectId |
| 11 | IDs validated? | **F18:** `idParams` ObjectId → 400 (was 500 risk) |
| 12 | GET mutate? | No |
| 13 | Jobs duplicate execution? | SchedulerLock lease |
| 14 | Idempotency? | Unique `idempotencyKey` on enqueue |
| 15 | Retry attempts bounded? | `maxAttempts` + backoff |
| 16 | Timestamps consistent? | created/updated/sent/failed/nextAttempt |
| 17 | Types validated? | Enum on list query; enqueue uses constants |

**Residual MEDIUM:** SMS at-least-once if lease expires after provider accept but before SENT mark.

---

## 4. Notifications frontend shipped

- Routes: `/admin/notifications`, `/admin/notifications/:notificationId`
- Nav + Admin home shortcut
- List: status/type filters, pagination, EntityCard, job status **read-only**
- Detail: delivery meta, refs, retry (disabled while pending; no optimistic SENT)
- States: loading / empty / error / forbidden / invalid id
- **Not exposed in UI:** expire-payments / mutate job runners (backend still exists)

---

## 5. Payment architecture before F18

- Create payment on confirm → INITIATED/PENDING → redirect
- Browser return: `POST /api/enrollments/payments/callback` (**JWT required**)
- Verify via provider then CAS SUCCESS → activate enrollment
- Mock blocked in production; Zarinpal adapter present
- Reconcile detect-only; expire job admin API (hidden from FE)
- **Issue:** capacity miss after SUCCESS could set payment **FAILED** (money captured)
- **Issue:** Zarinpal verify did not bind return authority to stored authority
- **Issue:** deferred Zarinpal refund threw 502 after claiming REFUND_REQUESTED
- **Issue:** anonymous verify with null `userId` could bypass ownership if secret path misused

---

## 6. Payment architecture after F18

- Capacity miss after SUCCESS → keep **SUCCESS** + `metadata.reconciliationRequired` + reconcile finding `RECONCILIATION_FLAGGED`
- Zarinpal authority mismatch → `INVALID_AUTHORITY` before provider HTTP
- Deferred refund → 200 with `deferred` + classification `INTERNAL_REFUND_REQUESTED_AWAITING_PROVIDER`
- Public payment exposes safe `reconciliationRequired` / `reconciliationReason` only
- **New:** `POST /api/payments/callback` — **no JWT**, requires `x-payment-callback-secret`
- Authz: ADMIN **or** owning USER JWT **or** valid callback secret (anonymous without secret → 403)
- Provider duck-typed contract documented (`PaymentProvider.contract.js`)
- Env.example documents Shaparak-compatible adapter pattern (not “Shaparak REST API”)

---

## 7. Existing provider audit

| Provider | initiate | verify | refund | Notes |
|----------|----------|--------|--------|-------|
| `mock` | yes | authority bind + amount checks | immediate ok | tests/dev only |
| `zarinpal` | Request → StartPay | server verify.json + **F18 authority bind** | deferred not wired | sandbox via env |

Registry: `createPaymentProvider(env)` — no `if provider` in checkout domain beyond factory.

---

## 8. Provider abstraction decision

**Existed / lightly improved.**

Reason: duck-typed `createPayment` / `verifyPayment` / `refund` already present. F18 added explicit contract JSDoc module + zarinpal authority bind + deferred refund semantics. No new dependency. No invented PSP protocol.

---

## 9. Payment state transition matrix

| FROM → TO | Allowed? | Trigger | Authority | Verify? | Idempotency |
|-----------|----------|---------|-----------|---------|-------------|
| CREATED/INITIATED/PENDING → SUCCESS | yes | verify+finalize CAS | owner/admin/secret | yes | claim SUCCESS once |
| OPEN → FAILED | yes | verify fail / fail helper | same | provider/local | CAS |
| OPEN → CANCELLED | yes | intentSuccess false | same | yes | CAS |
| OPEN → EXPIRED | yes | expire job | system | n/a | CAS |
| SUCCESS → REFUND_REQUESTED | yes | admin refund | ADMIN | provider refund call | CAS |
| REFUND_REQUESTED → REFUNDED | yes | provider refund ok | ADMIN path | provider | CAS |
| SUCCESS → FAILED | **no (F18)** | capacity miss | — | — | flag reconcile instead |
| EXPIRED/FAILED/CANCELLED/REFUNDED → SUCCESS | **no** | late callback | — | — | `PAYMENT_TERMINAL` |
| REFUNDED → SUCCESS | **no** | — | — | — | blocked |

---

## 10. Callback architecture

1. User browser return → JWT `POST /api/enrollments/payments/callback` (UX recovery)
2. Provider/server → **`POST /api/payments/callback`** + `x-payment-callback-secret` (no JWT)
3. Both call `verifyAndActivatePayment` → provider `verifyPayment` → CAS SUCCESS → enrollment side effects once

Callback arrival ≠ success. Frontend URL params only supply `paymentId` / authority / intent hint.

---

## 11. Verification architecture

- Server-to-server for Zarinpal (`/verify.json`)
- Mock verifies authority/amount/intent locally
- Amount server-authoritative; frontend amount fields rejected on callback controllers

---

## 12. Idempotency strategy

| Flow | Behavior |
|------|----------|
| Initiation | enrollment/payment idempotency keys |
| Callback / verify | SUCCESS claim-first; alreadyProcessed |
| Refund | SUCCESS→REFUND_REQUESTED claim; REFUNDED short-circuit |
| Reconcile | detect-only, no money mutation |
| Notifications | unique idempotencyKey; admin retry does not invent new key |

---

## 13. Concurrency strategy

- Payment SUCCESS via `findOneAndUpdate` status predicate (compare-and-set)
- Enrollment seat via `$expr` capacity conditional update
- Notification claim via status PENDING→PROCESSING + lease
- Job locks via `SchedulerLock`
- No Redis added

---

## 14. Refund classification

| Mode | When | Evidence |
|------|------|----------|
| **Provider-confirmed financial refund** | Mock `refund.ok=true` → REFUNDED | `mockProvider.refund` |
| **Internal refund workflow** | Zarinpal `deferred:true` → stays REFUND_REQUESTED | `zarinpalProvider.refund`; F18 returns deferred classification without 502 |

Do not label deferred Zarinpal path as PSP-confirmed refund.

---

## 15. Environment configuration changes

`backend/.env.example`:

- Clarified `PAYMENT_PROVIDER` / mock blocked in production
- Documented server callback path + secret header
- Placeholder comments for future `PROVIDER_X_*` (only when adapter exists)
- Existing: `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`, `PAYMENT_TIMEOUT_MS`, `PAYMENT_CALLBACK_URL`

---

## 16. Secret handling verification

- No merchant secrets in frontend or source
- `.env.example` placeholders only
- Public payment DTO does not include metadata secrets / raw provider payloads
- Logs use paymentId/status codes — not merchant keys

---

## 17. Shaparak readiness checklist

| Item | Status |
|------|--------|
| Core payment domain provider-agnostic enough | ✅ |
| No PSP secret in frontend | ✅ |
| No PSP secret committed | ✅ |
| Environment placeholders safe | ✅ |
| Startup configuration behavior defined | ✅ mock blocked in prod |
| Payment initiation server-authoritative | ✅ |
| Callback does not trust frontend | ✅ |
| Callback does not require user JWT | ✅ `/api/payments/callback` |
| Callback identity validated | ✅ secret + paymentId + authority |
| Verification server-to-server where required | ✅ zarinpal |
| Callback replay safe | ✅ |
| Verification replay safe | ✅ |
| Duplicate SUCCESS side effects prevented | ✅ CAS |
| Amount cannot be manipulated by frontend | ✅ |
| Provider reference handling safe | ✅ + zarinpal bind |
| State transitions controlled | ✅ |
| SUCCESS terminal unless supported otherwise | ✅ (refund path only) |
| REFUNDED cannot silently return to SUCCESS | ✅ |
| Concurrent verification safe | ✅ claim |
| Return page does not fake success | ✅ existing F15 UX |
| Browser interruption recoverable | ✅ JWT return + getPayment |
| Admin payment ops intact | ✅ |
| Reconcile detect-only | ✅ |
| Expire job still hidden from FE | ✅ |
| Logs contain no secrets | ✅ |
| Provider adapter boundary documented | ✅ |
| Real provider without rewriting core | ✅ |

---

## 18. Database / index audit

**Payments (existing, adequate):** userId, enrollmentId, classId, status+createdAt, unique partial `providerRef`, sparse `authority`, expiresAt+status.

**Notifications (existing):** status+nextAttemptAt, status+leaseUntil, type+createdAt, userId+createdAt, unique idempotencyKey.

**F18:** no new indexes (query patterns already covered).

---

## 19. Security findings

See issues table below. Critical capacity SUCCESS→FAILED and anonymous-null userId bypass fixed. Server callback without JWT added with secret.

---

## 20. All issues found

| ID | Severity | Area | Root cause | Risk | Decision | Status |
|----|----------|------|------------|------|----------|--------|
| F18-P1 | CRITICAL | Payment | SUCCESS downgraded to FAILED on capacity miss | Captured money marked failed | Keep SUCCESS + reconcile flag | **Fixed** |
| F18-P2 | HIGH | Payment | Authz: null userId bypassed ownership | Unauthorized verify if route open | Require admin \| owner \| secret | **Fixed** |
| F18-P3 | HIGH | Payment | Browser callback only (JWT) | PSP cannot call without user session | Add `/api/payments/callback` | **Fixed** |
| F18-P4 | HIGH | Zarinpal | Authority not bound to stored ref | Cross-payment verify attempt | Bind before HTTP | **Fixed** |
| F18-P5 | MEDIUM | Refund | Deferred refund threw 502 after claim | Ops stuck / unclear | Return deferred success | **Fixed** |
| F18-N1 | MEDIUM | Notifications | Invalid ObjectId → CastError 500 | Ops UX / noise | Validate idParams | **Fixed** |
| F18-N2 | MEDIUM | Notifications | At-least-once SMS on lease expiry | Duplicate SMS possible | Document; lease+claim retained | **Accepted** |
| F18-P6 | LOW | Zarinpal | Refund API not wired | No live PSP refund | Deferred until provider selection | **Deferred** |
| F18-P7 | LOW | Tests | Templates used gender ANY after MALE\|FEMALE | Suite red | Align tests to MALE | **Fixed** (compat) |

---

## 21. Backend changes

- `checkout.service.js` — capacity reconcile, authz, public flags, deferred refund, reconcile finding
- `zarinpalProvider.js` — authority bind
- `PaymentProvider.contract.js` — documentation module
- `createPaymentProvider.js` — contract pointer comment
- `billing.routes.js` / `billing.controller.js` — secret callback
- `notification.controller.js` / `routes.js` — ObjectId params
- `.env.example` — readiness docs
- Tests: `f18PaymentShaparakReadiness.test.js`, notifications id validation, gender test alignment

---

## 22. Frontend changes

- `features/notifications/*` API + labels
- `AdminNotificationsPage.jsx`, `AdminNotificationDetailPage.jsx`
- `App.jsx` routes; `ProductAppLayout` nav; `AdminHomePage` link
- `AdminPaymentDetailPage` — deferred refund toast + reconciliation flag display

---

## 23. Tests added

- F18 payment: capacity SUCCESS retention, zarinpal authority mismatch, deferred refund, public DTO leak check, reconcile flag, server callback without JWT, anonymous verify denied
- Notifications: invalid id → 400; missing id → 404

---

## 24. Focused test result

`f18PaymentShaparakReadiness` + `notifications.test`: **PASS** (7 + existing notification suite).

---

## 25. Full backend suite result

**19 suites / 165 tests PASS** (was 18/154 pre-F18; +F18 suite + notification/callback cases; gender test alignment).

---

## 26. Frontend build result

**PASS** (`vite build`)

---

## 27. Frontend lint result

**12 problems (10 errors, 2 warnings)** — same baseline; **0 new** from F18 files (pre-existing `motion` / hooks / refresh).

---

## 28. New dependencies

**0**

---

## 29. Git diff separation

| Bucket | Examples |
|--------|----------|
| **F18 notifications** | notification id validation; Admin notifications UI; API/labels; nav |
| **F18 payment readiness** | checkout reconcile/authz/refund; zarinpal bind; `/api/payments/callback`; contract module; f18 tests; env.example; payment detail UX |
| **Compat (not product rewrite)** | test templates/participants `ANY`/`FEMALE` → `MALE` after prior gender restriction |
| **Pre-existing / other phases** | large working tree (F10–F17, attendance, etc.) — **not claimed as F18** |

---

## 30. Known limitations

- Zarinpal refund not live-wired (internal REFUND_REQUESTED only)
- Browser JWT callback remains for UX; providers should prefer secret callback
- Notification SMS may duplicate on extreme lease races
- No live PSP sandbox credentials exercised in this phase
- Expire job API still exists for ADMIN but remains **hidden** from product UI

---

## 31. Deferred provider-specific work

- Select production PSP / aggregator
- Implement adapter + `PROVIDER_*` env names for that PSP
- Wire real refund API if offered
- Official sandbox certification with merchant credentials
- Map provider-specific callback query/body shapes in `parseCallback` if needed

---

## 32. Readiness classification

| Level | Proven? |
|-------|---------|
| **ARCHITECTURE READY** | **YES** |
| SANDBOX READY | Partial (Zarinpal sandbox config path exists; not live-tested here) |
| PROVIDER INTEGRATION READY | No — specific PSP not selected/certified |
| LIVE PSP VERIFIED | **NO** |

---

## 33. Explicit confirmation

- no fake payment success
- no fake notifications
- no invented domain APIs (only documented secret callback using existing verify service)
- no PSP secret in frontend
- no secrets committed
- callback does not trust frontend
- verification server-side where required
- duplicate callback protected
- duplicate side effects protected
- amount server-authoritative
- expire job still hidden in FE
- instructor ownership unchanged
- no TEACHER JWT
- no new lint issues vs baseline 12

---

**Phase F18 complete. Do not start another phase automatically.**
