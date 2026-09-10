# PHASE F19 — FULL PRODUCTION READINESS AUDIT & HARDENING

Date: 2026-09-10

## 1. Final verdict

**PRODUCTION READY WITH KNOWN LIMITATIONS**

Evidence-based: critical capacity/authz/config holes found in audit were fixed with regression tests. Remaining items are intentional product deferrals (Zarinpal refund wiring, SMS cleartext provider constraint, at-least-once notifications, no live PSP certification).

---

## 2. Baseline verification

| Check | Before F19 | After F19 |
|-------|------------|-----------|
| Backend tests | 19 suites / 165 PASS | **20 suites / 170 PASS** |
| Frontend build | PASS | **PASS** |
| Frontend lint | 12 problems (10 err / 2 warn) | **0 problems** |

---

## 3. Working tree inventory

| Classification | Examples |
|----------------|----------|
| Previous phases (B-T → F18) | Large uncommitted product surface: admin/teacher UI, payments, attendance, notifications, F18 payment hardening, phase reports |
| **F19 audit/fix** | cancel capacity leak, timing-safe callback secret, catalog visibility, instructor unique `userId`, Zarinpal sandbox prod guard, reconciliation metadata persist, reservation↔payment expiry coupling, OTP length sync, logging redaction, lint/auth split |
| Tests | `f19ProductionReadiness.test.js`; gender alignment leftovers from F18 |
| Documentation | This report; prior `PHASE_F*.md` unchanged in intent |
| Generated | `frontend/dist/**` (build artifact) |

F19 does **not** claim ownership of F10–F18 product work still sitting uncommitted on `main`.

---

## 4. Full findings table

| ID | Severity | Area | Root cause | Risk | Evidence | Decision | Status |
|----|----------|------|------------|------|----------|----------|--------|
| F19-C1 | CRITICAL | Enrollment/capacity | Cancel while reservation `CONFIRMED` + enrollment `PAYMENT_PENDING` did not free `confirmedCount` | Silent overbooking / capacity leak | `enrollment.service.js` cancel path | Release CONFIRMED + decrement | **Fixed** |
| F19-H1 | HIGH | Callback | `PAYMENT_CALLBACK_SECRET` compared with `===` | Timing side-channel | `checkout.service.js` | `crypto.timingSafeEqual` | **Fixed** |
| F19-H2 | HIGH | Catalog | Public `GET /classes`/`templates` exposed DRAFT/inactive | Info leak | `courses.routes.js` / service | optionalAuth + non-admin filter | **Fixed** |
| F19-H3 | HIGH | Config | `ZARINPAL_SANDBOX` default true allowed in production | Live traffic on sandbox | `env.js` | Prod refuse unless false | **Fixed** |
| F19-H4 | HIGH | Instructor | `userId` index non-unique (duplicate `index:true` blocked unique) | Dual instructor link | `instructor.model.js` | Partial unique index | **Fixed** |
| F19-H5 | HIGH | Payment ops | `ENROLLMENT_TERMINAL` / late callback logged but not flagged on payment | Ops blind spot | `checkout.service.js` | Persist `reconciliationRequired` | **Fixed** |
| F19-H6 | HIGH | Reservation/payment | Hold expiry left OPEN payments alive | Late SUCCESS race | `expireHeldReservations` | Expire open payments + pending enrollment | **Fixed** |
| F19-H7 | HIGH | Logging | Callback secret header not redacted | Secret in logs | `logging.js` | Redact paths | **Fixed** |
| F19-M1 | MEDIUM | Auth | OTP schema hard-coded 5 digits vs `OTP_CODE_LENGTH` | Broken OTP if env ≠ 5 | `auth.validation.js` | Sync to env | **Fixed** |
| F19-M2 | MEDIUM | Frontend | Stale “medical upload not implemented” copy | User confusion | `AppClassRegisterPage.jsx` | Correct copy | **Fixed** |
| F19-M3 | MEDIUM | Lint | `motion` false-positive unused; HMR co-exports | CI noise | eslint + auth files | Config + split modules | **Fixed** |
| F19-M4 | MEDIUM | SMS | ApiKey+OTP over HTTP GET (provider default) | MITM / proxy logs | `sms-webservice` + `.env.example` | **Accepted** — provider constraint; document HTTPS preference | Open |
| F19-L1 | LOW | Notifications | At-least-once SMS on lease expiry | Duplicate SMS | known F18 | **Accepted** | Open |
| F19-L2 | LOW | Refund | Zarinpal refund deferred forever | Ops stuck in REFUND_REQUESTED | `zarinpalProvider.js` | **Deferred** — needs PSP product decision | Open |
| F19-L3 | LOW | Auth | Phone enumeration on register/check | Privacy | intentional UX | **Accepted** | Open |
| F19-L4 | LOW | Perf | Export clamp vs `EXPORT_MAX_ROWS`; unbounded admin lists | Ops scale | reports/courses | **Accepted** until measured | Open |
| F19-I1 | INFO | Auth | `JWT_REFRESH_SECRET` unused (opaque refresh) | Misleading env | `env.js` | Document only | Open |
| F19-I2 | INFO | Sessions | generate-sessions TOCTOU with attendance mark | Rare orphan | courses.service | **Accepted** without Redis/lock infra | Open |

---

## 5. Fixed issues (summary)

| Fix | Before | After | Security impact | Regression |
|-----|--------|-------|-----------------|------------|
| Cancel capacity | CONFIRMED seat leaked | Released + `confirmedCount--` | Prevents overbooking | F19 test |
| Callback secret | `===` | timing-safe equal | Hardens S2S auth | F19 wrong-secret test |
| Catalog | DRAFT public | Hidden unless ADMIN token | Reduces info disclosure | F19 anon/admin test |
| Instructor link | Non-unique possible | DB unique partial | Race-safe uniqueness | F19 11000 test |
| Sandbox prod | Allowed by default | Boot fail unless false | Blocks sandbox money in prod | config guard |
| Reconcile flags | Log-only on some paths | Persisted metadata | Ops visibility | F19 late callback test |
| Hold expiry | Payments stayed OPEN | Coupled expire | Reduces late SUCCESS races | covered by expire paths |
| Lint | 12 problems | 0 | Quality/CI | build+lint |

---

## 6. Accepted limitations

1. **Zarinpal refund** remains deferred (`REFUND_REQUESTED` ≠ PSP-confirmed `REFUNDED`).
2. **SMS-webservice HTTP GET** with ApiKey in query — provider API shape; prefer private network / TLS wherever provider supports.
3. **Notification at-least-once** — duplicate SMS theoretically possible.
4. **No live PSP / Shaparak certification** in this phase.
5. **No automatic cancel→refund** product workflow (by design; F19 does not invent it).
6. **generate-sessions ∥ attendance** rare TOCTOU without distributed lock.
7. **Admin promotion** still requires DB role change.

---

## 7. Security matrix

| Domain | Status |
|--------|--------|
| Authentication | Sound (Argon2, JWT access, opaque refresh, OTP, prod SMS guard) |
| Authorization | OWNER / ADMIN / instructor-link / callback secret matrix verified |
| IDOR | Ownership checks present; null `userId` verify denied (F18+) |
| Secrets | Not in frontend; callback/merchant redacted in logs |
| Callbacks | JWT return path + S2S secret path; timing-safe compare |
| Payments | CAS SUCCESS; no SUCCESS→FAILED after capture |
| Notifications | Admin-only queue; public DTO strips body |
| Database | Partial uniques on payment providerRef, instructor userId, attendance |

---

## 8. Payment forensic matrix

| FROM → TO | Allowed | Notes |
|-----------|---------|-------|
| OPEN → SUCCESS | yes | Provider verify + CAS |
| OPEN → FAILED/CANCELLED/EXPIRED | yes | fail helper / expire / cancel |
| SUCCESS → REFUND_REQUESTED | yes | Admin refund claim |
| REFUND_REQUESTED → REFUNDED | yes | Provider ok (mock); zarinpal deferred stays requested |
| SUCCESS → FAILED | **no** | F18 preserved |
| Terminal → SUCCESS | **no** | `PAYMENT_TERMINAL` + reconcile flag |
| REFUNDED → SUCCESS | **no** | blocked |

---

## 9. PSP / Shaparak readiness

| Level | Status |
|-------|--------|
| ARCHITECTURE READY | **YES** |
| SANDBOX READY | Partial (config path exists; not live-tested here) |
| ADAPTER READY | Mock + Zarinpal exist; new PSP = new adapter |
| LIVE VERIFIED | **NO** |

---

## 10. Database audit

Models reviewed: User, Instructor, CourseTemplate, CourseClass, ClassSession, Participant, Enrollment, Reservation, AttendanceRecord, Payment, Notification, SchedulerLock.

Indexes: payment providerRef partial unique; attendance (sessionId, participantId) unique; notification idempotency unique; **F19** instructor userId partial unique.

---

## 11. Concurrency matrix

| Operation | Race | Protection | Test | Result |
|-----------|------|------------|------|--------|
| Last seat | dual reserve | `$expr` CAS | concurrency.test | PASS |
| Callbacks | dual verify | SUCCESS claim | payment/concurrency | PASS |
| Refunds | dual admin | REFUND_REQUESTED claim | paymentHardening | PASS |
| Notifications | dual worker | claim/lease | notifications.test | PASS |
| Cancel mid-finalize | CONFIRMED seat | F19 cancel release | f19ProductionReadiness | PASS |
| Instructor link | dual userId | unique index | f19ProductionReadiness | PASS |

---

## 12. Authorization matrix (condensed)

| Resource | Anon | USER | Linked instructor | ADMIN | Callback secret |
|----------|------|------|-------------------|-------|-----------------|
| Catalog (non-draft) | yes | yes | yes | yes | — |
| DRAFT class/template | no | no | no | yes | — |
| Own enrollments/payments/participants | — | own | — | any | — |
| Attendance/roster | — | — | own class | any | — |
| Notifications/reports/refunds | — | — | — | yes | — |
| Payment verify S2S | — | — | — | — | yes |

Roles remain **USER | ADMIN** only. Instructor = `Instructor.userId` link.

---

## 13. Environment readiness

Production refuses: `COOKIE_SECURE≠true`, SMS development, `PAYMENT_PROVIDER=mock`, zarinpal without merchant/callback/(prod)secret, **F19** zarinpal with sandbox≠false.

No real secrets printed in this report.

---

## 14. Logging audit

Redacts passwords, OTPs, tokens, SMS keys, JWT secrets, **F19** payment callback secret + merchant id paths. Stack traces stripped from client/prod error logs.

---

## 15. Frontend contract audit

Invented APIs: **0**  
Fake data: **0**  
Expire job UI: still hidden  
Optimistic money/attendance success: not found  

---

## 16. Lint classification (resolved)

| Was | Classification | F19 action |
|-----|----------------|------------|
| 9× `motion` unused | False positive (JSX member) | `varsIgnorePattern: motion` |
| `leaders.length` deps | Noise | `[]` deps |
| `elements` deps | Safe fix | Hoist `HERO_ELEMENTS` |
| `react-refresh` auth | HMR hygiene | Split context / provider / hook |

Remaining lint: **0**.

---

## 17. Performance findings

Evidence-based only: export row clamp inconsistency; unbounded instructor/class admin lists — accepted at current scale. No caching added.

---

## 18. Test reliability

MongoMemoryServer / Jest `--forceExit` still used. Full suite: **20 / 170 PASS**. Environmental download flakes not observed in F19 runs.

---

## 19. Files changed (F19)

**Created:** `f19ProductionReadiness.test.js`, `useAuth.js`, `authContextInstance.js`, this report  

**Modified (primary):** `enrollment.service.js`, `checkout.service.js`, `env.js`, `instructor.model.js`, `logging.js`, `authenticate.js`, `courses.*`, `auth.validation.js`, `coursesApi.js`, `AppClassRegisterPage.jsx`, `eslint.config.js`, `AboutFeatures.jsx`, `HomeHero.jsx`, `authContext.jsx`, `.env.example`

**Deleted:** none

---

## 20. Explicit regression confirmation

| Area | Result |
|------|--------|
| Payments | PASS |
| Enrollment | PASS |
| Attendance | PASS (suite) |
| Sessions | PASS (suite) |
| Instructor ownership | PASS |
| Admin | PASS |
| Teacher | PASS (suite) |
| Notifications | PASS (suite) |
| Frontend | PASS (build + lint 0) |

---

## 21. Production deployment blockers

| Blocker | Severity |
|---------|----------|
| Must set real SMS provider + credentials | Required for prod boot |
| Must set `PAYMENT_PROVIDER=zarinpal` + merchant + callback URL/secret + `ZARINPAL_SANDBOX=false` for live money | Required for live payments |
| Must provision durable `DOCUMENT_STORAGE_ROOT` | Ops |
| Must promote ADMIN in DB | Ops |
| Live PSP certification / refund wiring | Product — not a code blocker for staging |

None of the F19 **CRITICAL/HIGH code defects** remain open.

---

## FINAL SCORECARD

| Metric | Value |
|--------|-------|
| Backend tests | **170 / 170 PASS** (20 suites) |
| Frontend build | **PASS** |
| Frontend lint | **0 problems** |
| New dependencies | **0** |
| Invented APIs | **0** |
| Fake data | **0** |
| Security regressions | **0** |
| Payment / enrollment / attendance / session / instructor / notification regressions | **0** |
| Critical findings remaining | **0** |
| High findings remaining | **0** (code); ops/PSP product items deferred |
| Production blockers (code) | **0** |

---

## Explicit confirmations

- No TEACHER JWT role added  
- Instructor ownership model unchanged  
- SUCCESS never downgraded to FAILED after capture  
- Expire payment job still hidden from frontend  
- No PSP secrets in frontend  
- No invented Shaparak protocol  
- No live PSP claim  

**Do not begin F20 automatically.**
