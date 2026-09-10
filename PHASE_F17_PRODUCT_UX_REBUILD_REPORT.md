# PHASE F17 — Admin + Teacher Product UX Rebuild Report

## 1. Executive summary

F17 rebuilt Admin and Teacher operational UX as a real swim-school operations product using **only existing backend contracts**. Admin home is action-oriented from real dashboard data; class detail is a tabbed command page with F16 lifecycle + session-safety messaging; Teacher shell is visually distinct (teal) with chip-based session-first attendance; instructor management surfaces deactivation consequences, link/unlink, and `INSTRUCTOR_USER_LINKED`.

**Notifications were not implemented.** No APIs invented. No fake KPIs. No backend changes in this phase.

**Verdict:** PHASE F17 COMPLETE WITH KNOWN LIMITATIONS

---

## 2. Full audit findings (pre-implementation)

| Area | Finding |
|------|---------|
| F10 Attendance | Admin report + `POST /enrollments/attendance` present; UX was form-heavy |
| F11 Course/Class | Full CRUD-ish templates/classes + lifecycle; class detail was flat CRUD |
| F13 Teacher | Real `me` / `me/classes` ownership; UI felt contract-demo |
| F14 Admin ops | Dashboard real; chrome inconsistent across pages |
| F15 Payments/Participants | Routes exist; preserved |
| F16 Hardening | `SESSIONS_HAVE_ATTENDANCE`, instructor PATCH, start/complete/archive — FE copy was partly stale |
| Notifications | Backend audited ready — **out of scope F17** |
| JWT | USER \| ADMIN only; instructor = `Instructor.userId` link |

Confirmed contracts remain authoritative (courses templates/classes/lifecycle/generate-sessions, instructors CRUD+me, enrollments roster/attendance, payments list/detail/refund/reconcile-detect, admin reports dashboard).

---

## 3. Admin UX before / after

| Before | After |
|--------|-------|
| Disconnected CRUD screens | Ops workspace framing: template vs class, nav groups |
| Home = metric dump | «الان چه کار کنم؟» priorities + real dashboard tiles |
| Class detail flat | Tabs: overview / sessions / participants / attendance / links |
| Stale “no path for IN_PROGRESS…” copy | Lifecycle ActionBar + `nextLifecycleHint`; backend authoritative |
| Instructor page basic | Deactivation consequences banner + unlink CTA |

---

## 4. Teacher UX before / after

| Before | After |
|--------|-------|
| Cyan shell similar to Admin | Teal identity + gradient ops chrome |
| Attendance = select + separate save | One-tap chips; row failure state; no optimistic success |
| Home basic | MetricTiles from **loaded** data (labeled as such) + EntityCards |
| Class detail custom tabs | `OpsTabs` + no-admin-action notice |

---

## 5. Course / Class hierarchy

- Courses list titled **قالب‌های دوره**; copy distinguishes reusable template vs operational class.
- Classes list titled **کلاس‌های عملیاتی**; detail is command center.
- Admin shell footnote: `دوره = قالب · کلاس = نمونه عملیاتی`.

---

## 6. Instructor management

- Create / edit / soft deactivate / reactivate / link (`userId`) / unlink (`userId: null`).
- Operational consequence copy for deactivation (workspace unavailable, ownership denied, classes remain).
- Persian mapping for `409 INSTRUCTOR_USER_LINKED`.
- No hard delete UI.

---

## 7. Attendance workflow

**Teacher:** Session select → roster → chip tap → per-row `POST` → success only after response; failed rows highlighted.

**Admin:** Existing report/export preserved; added roster quick-mark chips when class+session loaded (still one POST each). Deep links via `classId` / `sessionId` query params retained.

---

## 8. Session safety UX

- Generate-sessions confirm: sessions will be **replaced**; attendance blocks regeneration.
- Error map: `SESSIONS_HAVE_ATTENDANCE` → clear Persian that sessions were **not** replaced.
- No silent retry.

---

## 9. Lifecycle UX

Valid next actions only shown for current status (publish → open → close → start → complete → archive; cancel where allowed). Hint text for next step. Server remains source of truth for conflicts (`INVALID_CLASS_STATUS`, `CLASS_HAS_ACTIVE_ENROLLMENTS`).

---

## 10. Responsive improvements

- Tab chips wrap; attendance chips wrap for tablet.
- Admin tables keep horizontal scroll.
- Teacher attendance stacks name/chips on narrow screens.
- No live device lab claimed.

---

## 11. Empty / loading / error coverage

Touched operational pages retain Loading / Empty / Error / Forbidden (or InstructorNotLinked) patterns. Known codes mapped in `courseLabels` / instructor / attendance label helpers.

---

## 12. Exact backend contracts consumed

**Courses:** templates CRUD, classes CRUD, capacity/schedule/sessions, publish/open/close/start/complete/cancel/archive, generate-sessions.

**Instructors:** list (`activeOnly`), create, patch, `me`, `me/classes`.

**Enrollments:** roster, attendance GET/POST, admin participant search/detail/360/enrollment activate (prior routes preserved).

**Payments:** list, detail, refund, reconcile job (expire **not** exposed).

**Reports:** `GET /admin/reports/dashboard`, attendance report/export.

---

## 13. Backend changes

**F17: none.**

Working tree may still contain **uncommitted F16/B-T backend** from earlier phases — not part of F17 diff.

---

## 14. Frontend files changed (F17 focus)

- `frontend/src/features/ops/OpsUi.jsx` (new primitives)
- `frontend/src/features/ops/opsHelpers.js`
- `frontend/src/pages/AdminHomePage.jsx`
- `frontend/src/pages/admin/AdminClassDetailPage.jsx`
- `frontend/src/pages/admin/AdminInstructorsPage.jsx`
- `frontend/src/pages/admin/AdminAttendancePage.jsx`
- `frontend/src/pages/admin/AdminCoursesPage.jsx`
- `frontend/src/pages/admin/AdminClassesPage.jsx`
- `frontend/src/layouts/ProductAppLayout.jsx`
- `frontend/src/layouts/InstructorLayout.jsx`
- `frontend/src/pages/instructor/InstructorHomePage.jsx`
- `frontend/src/pages/instructor/InstructorClassesPage.jsx`
- `frontend/src/pages/instructor/InstructorClassPage.jsx`
- `frontend/src/pages/instructor/InstructorClassAttendancePage.jsx`
- `frontend/src/features/instructor/components/InstructorNotLinkedState.jsx`
- `frontend/src/features/courses/courseLabels.js` (session safety message)

---

## 15. New reusable components

| Component | Role |
|-----------|------|
| `OpsTabs` | Operational tab strip |
| `DetailSection` | Section chrome |
| `ActionBar` | Primary action cluster (admin / teacher tones) |
| `MetricTile` | Count tile (optional link) |
| `EntityCard` | Entity summary card |
| `AttendanceStatusChips` | One-tap attendance statuses |
| `nextLifecycleHint` | Display-only lifecycle hint |

No new npm dependencies.

---

## 16. Authorization verification

- Admin routes still behind `RequireAuth roles={["ADMIN"]}`.
- Teacher routes: authenticated user + server `instructors/me` ownership; 404 → not-linked state; 403 → Forbidden.
- No TEACHER JWT; no client filter of public catalog as My Classes.
- Attendance mark still server-authorized.

---

## 17. Known backend limitations (unchanged)

- No per-session CRUD / reschedule / cancel-one.
- No bulk attendance API.
- No course/class hard delete.
- Payment expire job must stay unexposed.
- No dedicated admin enrollments list endpoint beyond reports/search/detail flows.
- Notifications ready on backend but no FE.

---

## 18. Deferred work

- Notifications UI (F18+ when scheduled)
- Per-session management if backend adds contracts
- Bulk attendance if backend adds contract
- Dedicated `/admin/enrollments` list if backend list API added
- Live multi-role E2E with credentials in this environment

---

## 19. Test results

| Check | Result |
|-------|--------|
| `frontend` `npm run build` | **PASS** (exit 0) |
| `frontend` `npm run lint` | **12 problems** (10 errors, 2 warnings) — same baseline as F16 |
| Backend tests this phase | **Not run** (no F17 backend changes) |

Live authenticated API walkthrough was **not** claimed (credentials/environment not used for end-to-end marking in this session). Compile/route integrity verified via production build.

---

## 20. Lint classification

| Class | Count | Notes |
|-------|-------|-------|
| Pre-existing `motion` unused (marketing) | 9 errors | ESLint false-positive pattern on framer imports |
| Pre-existing `authContext` react-refresh | 1 error | Unchanged |
| Pre-existing hooks warnings | 2 warnings | Marketing pages |
| **New F17 lint** | **0** | OpsUi helpers split to `opsHelpers.js` to avoid refresh rule |

---

## 21. Regression verification

| Area | Status |
|------|--------|
| F10 Attendance routes/API | Preserved + UX improved |
| F11 Course/Class APIs | Unchanged clients |
| B-T / F13 Teacher ownership | `me` / `me/classes` only |
| F14 Dashboard | Still `GET /admin/reports/dashboard` |
| F15 Payments/Participants | Untouched contracts; expire still hidden |
| F16 Session safety / lifecycle / instructor PATCH | FE messaging aligned |
| Notifications | **Not started** |
| Public marketing pages | Not rewritten (pre-existing lint only) |

---

## 22. Exact scorecard

| Item | Value |
|------|-------|
| Frontend changes | Yes |
| Backend changes | **None (F17)** |
| New dependencies | **0** |
| Invented APIs | **0** |
| Fake data | **0** |
| Fake KPIs | **0** (derived teacher counts labeled as loaded data) |
| Teacher auth regression | **No** |
| Instructor ownership regression | **No** |
| Attendance regression | **No** |
| Payment regression | **No** |
| Enrollment regression | **No** |
| Session safety regression | **No** (improved messaging) |
| Lifecycle regression | **No** (stale copy fixed) |
| Notifications implementation | **None** |
| Build | **PASS** |
| Lint | **12** (0 new from F17) |
| Backend tests | N/A this phase |
| Known limitations | Per-session CRUD absent; no bulk attendance; no notifications FE; no live E2E this session |

---

## FINAL VERDICT

**PHASE F17 COMPLETE WITH KNOWN LIMITATIONS**

Do not start F18 or Notifications automatically.
