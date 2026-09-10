# PHASE F4 — Participant Contract Audit

**Source of truth:**  
`backend/src/modules/enrollments/participant.model.js`  
`participant.service.js`  
`enrollment.routes.js`  
`enrollment.controller.js`  
`enrollment.validation.js`  
`domain.constants.js` (`GENDERS`, `PARTICIPANT_RELATIONS`)

**Date:** 2026-09-10

---

## A. API Mount

| Item | Value |
|------|--------|
| Prefix | `/api/enrollments` |
| Envelope | `{ success, data }` / `{ success: false, error: { code, message, details? } }` |
| Auth | Bearer JWT (`authenticate`) on all USER participant routes |

---

## B. USER Participant APIs (verified)

### 1. List

| | |
|--|--|
| Method | `GET` |
| Path | `/api/enrollments/participants` |
| Auth | USER (authenticated) |
| Query | none (service defaults `includeInactive: false`) |
| Response `data` | `{ items: ParticipantPublic[] }` |
| Ownership | Only `ownerUserId === req.user._id` and `isActive: true` |
| Errors | 401 |

### 2. Create

| | |
|--|--|
| Method | `POST` |
| Path | `/api/enrollments/participants` |
| Auth | USER |
| Body | see fields (strict Zod) |
| Response | `ParticipantPublic` (201) with emergency + age |
| Errors | 400 validation / `INVALID_BIRTH_DATE`, 401 |

### 3. Get one

| | |
|--|--|
| Method | `GET` |
| Path | `/api/enrollments/participants/:participantId` |
| Auth | USER or ADMIN |
| Response | `ParticipantPublic` (+ emergency + age) |
| Ownership | USER: must own **and** active; else `403 FORBIDDEN` or `404 PARTICIPANT_NOT_FOUND` |
| ADMIN | can read any (incl. inactive) |
| Errors | `PARTICIPANT_NOT_FOUND` 404, `FORBIDDEN` 403 |

### 4. Update

| | |
|--|--|
| Method | `PATCH` |
| Path | `/api/enrollments/participants/:participantId` |
| Auth | USER or ADMIN |
| Body | partial fields (strict) |
| Response | updated `ParticipantPublic` |
| Errors | 404/403, `PARTICIPANT_INACTIVE` 409 (non-admin on inactive), `INVALID_BIRTH_DATE` 400 |

### 5. Deactivate (soft delete — **not** HTTP DELETE)

| | |
|--|--|
| Method | `POST` |
| Path | `/api/enrollments/participants/:participantId/deactivate` |
| Auth | USER or ADMIN |
| Body | none |
| Response | deactivated `ParticipantPublic` |
| Errors | 404/403, `PARTICIPANT_HAS_ACTIVE_ENROLLMENT` 409 (USER if active enrollment/waitlist) |

### NOT AVAILABLE for USER product UI (F4)

| Operation | Status |
|-----------|--------|
| Hard `DELETE /participants/:id` | **DOES NOT EXIST** |
| Reactivate endpoint | **DOES NOT EXIST** |
| List inactive (USER) | **Not exposed** (service supports flag; route does not pass it) |
| Admin search | `GET /admin/participants/search` — ADMIN only → out of F4 |

Insurance / medical / medical-profile routes exist but are **out of F4 scope**.

---

## C. Participant fields

### Request (create) — `participantBody` `.strict()`

| Field | Required | Type / rules |
|-------|----------|--------------|
| `firstName` | yes | string trim min 2 max 80 |
| `lastName` | yes | string trim min 2 max 80 |
| `birthDate` | yes | coerce date; server `assertValidBirthDate` |
| `gender` | yes | `MALE` \| `FEMALE` (not `ANY`) |
| `relation` | no | enum `PARTICIPANT_RELATIONS`, default `SELF` |
| `phone` | no | `""` or `09xxxxxxxxx` (11 digits) |
| `emergencyContact` | no | object strict |
| `emergencyContact.name` | no | max 120 |
| `emergencyContact.phone` | no | `""` or `09xxxxxxxxx` |
| `emergencyContact.relationship` | no | max 60 |

### Update — `participantUpdateBody` `.strict()`

Same fields optional (partial). Unknown keys rejected.

### Response (`toPublicParticipant` with emergency+age)

| Field | Notes |
|-------|--------|
| `id` | string |
| `ownerUserId` | string |
| `firstName`, `lastName` | |
| `birthDate` | Date/ISO |
| `gender` | MALE/FEMALE |
| `relation` | |
| `phone` | |
| `isActive` | boolean |
| `deactivatedAt` | date \| null |
| `createdAt`, `updatedAt` | |
| `age` | computed number \| null |
| `emergencyContact` | `{ name, phone, relationship }` |

Server-generated / not client-writable on create: `id`, `ownerUserId`, `isActive`, `deactivatedAt`, timestamps, `age`.

---

## D. Validation rules (conceptual)

- Names length 2–80  
- Gender only MALE/FEMALE  
- Relation: see constants  
- Iranian mobile optional  
- Birth date validated server-side (`INVALID_BIRTH_DATE`)  
- Strict bodies — no extra fields  

### `PARTICIPANT_RELATIONS` (from domain.constants)

`SELF` · `CHILD` · `OTHER` (no `SPOUSE`)

---

## E. Ownership rules

| Actor | List | Get | Update | Deactivate |
|-------|------|-----|--------|------------|
| USER owner, active | yes | yes | yes | yes (unless active enrollment) |
| USER non-owner | — | 403 FORBIDDEN | 403 | 403 |
| USER owner, inactive | hidden from list | 404 PARTICIPANT_NOT_FOUND | 409 inactive / 404 | noop if already inactive |
| ADMIN | admin search | yes any | yes | yes (can bypass enrollment block) |

---

## F. Error codes

| Code | HTTP | When |
|------|------|------|
| `PARTICIPANT_NOT_FOUND` | 404 | Missing or inactive-as-not-found for USER |
| `FORBIDDEN` | 403 | Wrong owner |
| `VALIDATION_ERROR` / Zod | 400 | Bad body |
| `INVALID_BIRTH_DATE` | 400 | Birth date rules |
| `PARTICIPANT_INACTIVE` | 409 | Update inactive (non-admin) |
| `PARTICIPANT_HAS_ACTIVE_ENROLLMENT` | 409 | Deactivate blocked |

---

## G. Missing APIs (frontend must not invent)

- Hard delete  
- Reactivate  
- USER list of inactive participants  
- Participant photo upload  
- Nested enrollments on participant resource  

---

## F4 frontend mapping

| UX | Backend |
|----|---------|
| List | GET `/participants` |
| Create | POST `/participants` |
| Detail | GET `/participants/:id` |
| Edit | PATCH `/participants/:id` |
| Soft-remove | POST `/participants/:id/deactivate` |
| Delete button | **Do not label as hard delete** — «غیرفعال‌سازی» |
