# راهنمای کامل Frontend
## سامانه آنلاین مدیریت و ثبت‌نام مدرسه شنا

> **این سند نقشه راه محصول + UX + مهندسی Frontend است.**  
> مخاطب: توسعه‌دهنده Frontend که ممکن است Backend را باز نکرده باشد.  
> **منبع حقیقت = کد Backend واقعی** — نه حدس، نه گزارش قدیمی، نه API اختراعی.  
> تاریخ: ۱۴۰۴/۰۶/۱۸ — پس از Phase 9 (Production Ready with Known Limitations)

| وضعیت Backend | مقدار |
|---------------|--------|
| تست‌ها | 136 / 136 PASSED |
| Critical / High باز | 0 / 0 |
| Security / IDOR / Concurrency / Data Integrity | PASS |
| Verdict | PRODUCTION READY WITH KNOWN LIMITATIONS |
| تغییر سورس Frontend در فازهای Backend | **0** |

**استک واقعی فعلی (`frontend/package.json`):**  
React 19 · Vite 7 · React Router 7 · Redux Toolkit · Tailwind 4 · Framer Motion · lucide-react

**پاکت پاسخ API همیشه:**

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "error": { "code": "...", "message": "...", "details": null } }
```

**احراز هویت:** `Authorization: Bearer <accessToken>`  
برای login / refresh / logout: `credentials: "include"` (کوکی refresh روی path مربوط به auth)

**پول:** عدد صحیح **ریال (IRR)** — Frontend هرگز مبلغ نهایی را تعیین نمی‌کند.

---

# اگر امروز وارد پروژه شدی — ۱۵ دقیقه اول

```text
1. این بخش «قوانین بحرانی» را بخوان
2. Product Overview + Actors را بخوان
3. Mental Model (User → Enrollment) را بخوان
4. وضعیت فعلی Frontend را بخوان (بخش ۰)
5. Journey ثبت‌نام کلاس + Payment را بخوان
6. بخش «چه چیزی را نساز» را بخوان
7. Milestone 0 را شروع کن
```

### قوانین بحرانی (همیشه روی دیوار ذهنت)

```text
1. Backend = منبع حقیقت
2. Frontend هرگز موفقیت پرداخت را تصمیم نمی‌گیرد
3. Frontend هرگز قیمت authoritative را محاسبه نمی‌کند
4. Frontend هرگز ظرفیت authoritative را محاسبه نمی‌کند
5. نقش کلاینت امنیت نیست — Backend 403 می‌دهد
6. API اختراع نکن
7. storageKey و مسیر فایل را نشان نده / لاگ نکن
8. وضعیت‌های نهایی پرداخت را دوباره به «در حال پردازش» برنگردان
9. Retry باید با lifecycle سرور سازگار باشد
10. بعد از 409 / تداخل وضعیت، state سرور را دوباره بگیر
```

---

# ۰. وضعیت فعلی Frontend (واقعیت پروژه)

قبل از ساخت محصول ثبت‌نام، بدان الان چه چیزی داری:

| موجود | وضعیت |
|--------|--------|
| سایت بازاریابی (خانه، درباره، گالری، تماس، رکورد) | ✅ فعال |
| Auth (login / OTP signup / reset) + `apiClient` + `AuthProvider` | ✅ متصل به Backend |
| `RequireAuth` | ⚠️ نوشته شده ولی روی routeها mount نشده |
| Redux Toolkit | ⚠️ store تعریف شده اما Provider ندارد؛ `portfolioSlice` مفقود است |
| صفحه `/courses` | ⚠️ کاتالوگ استاتیک + CTA واتساپ — **نه API کلاس** |
| Participants / Eligibility / Reservation / Payment / Admin | ❌ هنوز نیست |

**نتیجه:** Frontend فعلی یک **Brochure + Auth Shell** است. محصول ثبت‌نام باید روی همین استک و هویت بصری (آبی/فیروزه‌ای، ایران‌یکان، RTL جزئی) ساخته شود — نه با عوض کردن کل کتابخانه.

### Routes فعلی

| Path | صفحه |
|------|------|
| `/` | HomePage |
| `/about` | AboutPage |
| `/courses` | CoursesPage (استاتیک) |
| `/contact` | ContactUsPage |
| `/record` | RecordPage |
| `/gallery` | GalleryPage |
| `/auth` | AuthPage (`?mode=login\|signup\|reset`) |

### API Client فعلی

- فایل: `frontend/src/services/apiClient.js`
- Base: `VITE_API_BASE_URL` یا `/api` (Vite proxy → backend `:4000`)
- فقط `authApi` پیاده شده است
- توکن در memory؛ refresh تک‌پروازی روی 401

---

# ۱. Product Overview — این محصول چیست؟

سامانه برای **ثبت‌نام آنلاین کلاس‌های شنا** است.

کاربر (معمولاً والد) می‌تواند:

1. حساب بسازد و وارد شود  
2. شرکت‌کننده تعریف کند (خودش یا فرزند)  
3. کلاس‌های باز را ببیند و ظرفیت/شرایط را چک کند  
4. در صورت نیاز بیمه/مدارک پزشکی آپلود کند  
5. صندلی موقت رزرو کند (یا وارد Waitlist شود)  
6. با قیمت سرور پرداخت کند  
7. وضعیت ثبت‌نام را ببیند و در صورت نیاز لغو کند  

ادمین مدیریت دوره، مدارک، پرداخت، گزارش و User 360 را انجام می‌دهد.

> Frontend فقط **نمایش و جمع‌آوری ورودی** است.  
> تصمیم مالی، ظرفیت، واجدشرایطی و تأیید مدرک با **Server** است.

---

## ۱.۱ Actors

| Actor | در JWT؟ | چه می‌بیند / چه می‌کند | چه چیزی ندارد |
|-------|---------|--------------------------|----------------|
| **Guest** | خیر | صفحات عمومی، login/register | هر API محافظت‌شده |
| **USER** | بله (`USER`) | شرکت‌کننده، کلاس، رزرو، پرداخت خود، مدارک خود، ثبت‌نام‌های خود | پنل ادمین، استرداد، گزارش، مدارک دیگران |
| **ADMIN** | بله (`ADMIN`) | همه عملیات مدیریتی | — |
| **Instructor** | **نقش JWT جدا نیست** | اگر حساب USER به رکورد `Instructor` لینک باشد، فقط **حضور و غیاب کلاس خودش** | مدارک پزشکی/بیمه، پرداخت، گزارش مالی، User 360 |

```text
⚠️ Instructor را به‌عنوان role در JWT اختراع نکن.
UI مربی = مسیر محدود attendance روی همان حساب USER لینک‌شده.
```

---

# ۲. Product Mental Model — سیستم را چطور تصور کنیم؟

```text
User (حساب)
  ↓ مالک
Participant (شناگر واقعی)
  ↓ انتخاب می‌کند
Course Class (کلاس زمان‌بندی‌شده با قیمت و ظرفیت)
  ↓
Eligibility (سن / جنسیت / پیش‌نیاز / بیمه / پزشکی)
  ↓
Reservation (نگه‌داشتن موقت صندلی = Hold)
  یا Waitlist
  ↓
Checkout Confirm → Quote سرور → Payment
  ↓
Gateway (در صورت نیاز)
  ↓
Verify / Callback
  ↓
Enrollment (ACTIVE یا PENDING_COMPLIANCE)
  ↓
Compliance Documents + Attendance + Reports (ادمین)
```

### واژه‌نامه کوتاه Entityها

| Entity | معنی ساده |
|--------|-----------|
| **User** | مالک حساب؛ لاگین می‌کند؛ پول می‌پردازد |
| **Participant** | کسی که در آب می‌رود — خود User یا فرزند او |
| **Course Template** | قالب دوره (محدوده سن، جنسیت، نیاز به بیمه/پزشکی) |
| **Course Class** | نمونه اجرایی کلاس با تاریخ، ظرفیت، قیمت |
| **Eligibility** | نتیجه بررسی شرایط — سرور می‌گوید eligible یا reasons |
| **Reservation / Hold** | رزرو موقت؛ `heldCount` را مصرف می‌کند؛ منقضی می‌شود |
| **Waitlist** | صف وقتی کلاس پر است؛ `position` فقط از سرور |
| **Quote** | قیمت محاسبه‌شده سرور در confirm (`basePrice` / `discountAmount` / `finalPrice`) |
| **Payment** | رکورد مالی با وضعیت lifecycle |
| **Enrollment** | ثبت‌نام؛ بعد از موفقیت پرداخت فعال می‌شود |
| **Compliance** | بیمه / مدرک پزشکی و پروفایل پزشکی |
| **User 360** | نمای ادمین از همه داده‌های یک کاربر |

### تفاوت حیاتی

| اشتباه رایج | واقعیت |
|-------------|--------|
| «قیمت کارت کلاس را برای پرداخت بفرست» | فقط Quote سرور بعد از `confirm` |
| «ظرفیت = capacity − confirmed» | سرور: `capacity − confirmed − held` |
| «URL درگاه یعنی موفق» | فقط وضعیت Payment از سرور |
| «فایل metadata یعنی مدرک تأییدشده» | فقط `persisted: true` بعد از multipart |

---

# ۳. Complete System Map

```text
PUBLIC
│
├── Home / About / Gallery / Contact / Record   ← الان موجود (بازاریابی)
├── Login / Register / Forgot Password          ← الان موجود روی /auth
│
USER APP (باید ساخته شود)
│
├── Home (ورود پس از login می‌تواند به داشبورد سبک برود)
├── Courses (از API)
├── Course Details /:classId
├── Participants
│   ├── Insurance (upload + list)
│   ├── Medical (upload + list)
│   └── Medical Profile
│
├── Enrollment Flow
│   ├── Select Participant
│   ├── Eligibility
│   ├── Reservation (+ تایمر)
│   ├── Waitlist (اگر full)
│   ├── Checkout Confirm
│   └── Payment Result
│
├── My Enrollments (+ Cancel)
└── Profile / me (اختیاری سبک)

ADMIN (باید ساخته شود)
│
├── Dashboard
├── Users → User 360
├── Courses / Classes / Sessions
├── Compliance (Pending Docs → Review)
├── Finance
│   ├── Payments
│   ├── Refunds
│   └── Reconciliation (detect-only)
├── Reports (+ Excel export)
├── Notifications (admin ops)
└── Attendance (یا Instructor-scoped)

INSTRUCTOR-SCOPED (بدون نقش JWT جدا)
└── Attendance برای کلاس‌های لینک‌شده
```

پیشنهاد Routeهای محصولی (جدید — هنوز در App.jsx نیستند):

| Route پیشنهادی | دسترسی | هدف |
|----------------|--------|------|
| `/auth` | Public | همان جریان فعلی |
| `/courses` | Public/User | لیست کلاس از API |
| `/courses/:classId` | Public/User | جزئیات + شروع ثبت‌نام |
| `/participants` | Auth | مدیریت شرکت‌کننده‌ها |
| `/participants/:id/documents` | Auth | بیمه/پزشکی |
| `/enroll/:classId` | Auth | wizard ثبت‌نام |
| `/payments/:paymentId/result` | Auth | نتیجه پرداخت |
| `/enrollments` | Auth | ثبت‌نام‌های من |
| `/admin/*` | Admin | پنل |

> Route Guard در Frontend فقط UX است. **Backend همیشه مرجع نهایی مجوز است.**

---

# ۴. Page Architecture

برای هر صفحه مهم: Purpose · Access · Route · UI · Actions · APIs · States · Nav

---

## ۴.۱ Auth (`/auth`)

| فیلد | مقدار |
|------|--------|
| Purpose | ورود، ثبت‌نام OTP، بازیابی رمز |
| Access | Guest (اگر authenticated → redirect) |
| Main UI | کارت چندمرحله‌ای (الان `AuthCard`) |
| Loading | دکمه disabled + اسپینر |
| Error | پیام زیر دکمه از `error.code` |
| Success | ذخیره session → `/` یا مقصد قبلی |

**APIها:**  
`POST /auth/check-phone` · `register/send-otp` · `register/verify-otp` · `register` · `login` · `password/*` · `refresh` · `logout` · `GET /auth/me`

---

## ۴.۲ Courses (`/courses`) — باید از استاتیک به API مهاجرت کند

| فیلد | مقدار |
|------|--------|
| Purpose | کشف کلاس‌های قابل ثبت‌نام |
| Access | Public (ثبت‌نام نیاز به Auth) |
| Main UI | فیلتر وضعیت، کارت کلاس، قیمت نمایشی، وضعیت ظرفیت، CTA |
| Actions | جزئیات · شروع ثبت‌نام · Waitlist (از جزئیات) |
| APIs | `GET /courses/templates` · `GET /courses/classes?status=REGISTRATION_OPEN` · در جزئیات: capacity/schedule/sessions |

**UX States**

| State | UI |
|-------|-----|
| Loading | Skeleton کارت‌ها |
| Empty | «در حال حاضر کلاسی برای ثبت‌نام نیست» |
| Error | «خطا در دریافت کلاس‌ها» + Retry |
| Available | CTA ثبت‌نام |
| Full | CTA لیست انتظار (بعد از eligibility) |
| Registration Closed | غیرفعال + توضیح |

```text
⚠️ CTA واتساپ فعلی را برای مسیر محصول نگه ندار؛
مسیر واقعی = Course Details → Enrollment Flow.
صفحات بازاریابی می‌توانند جدا بمانند.
```

---

## ۴.۳ Course Details (`/courses/:classId`)

| فیلد | مقدار |
|------|--------|
| Purpose | تصمیم شروع ثبت‌نام |
| APIs | `GET /courses/classes/:id` · `/capacity` · `/schedule` · `/sessions` |
| Capacity UI | فقط فیلدهای سرور: `available`, `isFull`, `held`, `confirmed`, `registrationOpen` |
| Nav From | Courses |
| Nav To | Select Participant / Login |

---

## ۴.۴ Participants (`/participants`)

| فیلد | مقدار |
|------|--------|
| Purpose | CRUD شرکت‌کننده برای ثبت‌نام |
| Access | Authenticated USER |
| APIs | `GET/POST /enrollments/participants` · `PATCH .../:id` · `POST .../deactivate` |
| Empty | «هنوز شرکت‌کننده‌ای ندارید» → دکمه افزودن |
| Danger | غیرفعال‌سازی → Confirm dialog |

---

## ۴.۵ Documents (تب شرکت‌کننده)

| فیلد | مقدار |
|------|--------|
| Purpose | آپلود بیمه/پزشکی واقعی |
| APIs Upload | `POST .../insurance/upload` · `POST .../medical/upload` (field=`file`) |
| APIs List | `GET .../insurance` · `GET .../medical` |
| Download | `GET /enrollments/documents/{insurance\|medical}/:id/content` |
| Review (Admin) | `POST .../admin/documents/.../review` |
| Profile | `GET/PUT .../medical-profile` |

**قانون UX:** مسیر اصلی = **multipart**.  
مسیر JSON metadata (`persisted: false`) را UX اصلی نکن. اگر `persisted: false` بود دکمه دانلود نشان نده و انتظار APPROVE نداشته باش.

---

## ۴.۶ Enrollment Wizard (`/enroll/:classId`)

مراحل پیشنهادی UI:

```text
1. Select Participant
2. Eligibility result
3. Reservation + countdown
4. Discount (optional) + Confirm
5. Redirect / Zero-amount success
```

APIs به ترتیب:  
`eligibility/check` → `reservations` → `confirm` → (gateway) → payment result

---

## ۴.۷ Payment Result (`/payments/:paymentId/result`)

| فیلد | مقدار |
|------|--------|
| Purpose | نمایش حقیقت سرور درباره پرداخت |
| APIs | `GET /payments/:id` · در صورت نیاز `POST /enrollments/payments/callback` |
| Polling | فقط برای وضعیت‌های غیرنهایی؛ bounded |
| Forbidden | Infer success از querystring درگاه |

---

## ۴.۸ My Enrollments (`/enrollments`)

| فیلد | مقدار |
|------|--------|
| APIs | `GET /enrollments/me` · `GET /enrollments/:id` · `POST /enrollments/:id/cancel` |
| Cancel | Confirm → refresh enrollment + payment + capacity |

---

## ۴.۹ Admin صفحات

| صفحه | Purpose | APIهای اصلی |
|------|---------|-------------|
| Dashboard | KPI | `GET /admin/reports/dashboard` |
| Users | جستجو | `GET /enrollments/admin/users/search` |
| User 360 | پرونده کامل | `GET /enrollments/users/:userId/360` |
| Courses/Classes | مدیریت دوره | `/api/courses/...` |
| Documents | تأیید/رد | pending + review |
| Payments | لیست/جزئیات | `GET /payments` · `GET /payments/:id` |
| Refund | استرداد | `POST /payments/:id/refund` |
| Reconcile | فقط تشخیص | `GET /payments/jobs/reconcile` |
| Reports | جدول + Excel | `/admin/reports/...` (+ `/export`) |
| Notifications | ops | `/api/notifications` (ADMIN) |
| Attendance | حضور | `POST/GET .../attendance` |

---

# ۵. Complete User Journeys

هر Journey: UI → Action → API → Success → Failure → Next

---

## Journey 1 — ثبت‌نام کاربر جدید

```text
باز کردن /auth?mode=signup
  → وارد کردن موبایل
  → POST /auth/check-phone
  → POST /auth/register/send-otp
  → وارد کردن کد
  → POST /auth/register/verify-otp  → registrationToken
  → نام + رمز
  → POST /auth/register
  → accessToken + user
  → /
```

| Failure | UI |
|---------|-----|
| OTP نامعتبر | پیام + تلاش مجدد |
| SMS fail | «ارسال نشد» + retry با محدودیت 429 |
| USER_EXISTS | هدایت به login |

---

## Journey 2 — افزودن فرزند (Participant)

```text
/participants → Add
  → فرم نام، تاریخ تولد، جنسیت، نسبت
  → POST /enrollments/participants
  → لیست به‌روز
```

Failure رایج: validation 400 روی تاریخ تولد/فیلدها.

---

## Journey 3 — ثبت‌نام کلاس (مسیر طلایی)

```text
Courses
  ↓
Course Details (capacity از سرور)
  ↓
Login اگر لازم
  ↓
Select Participant
  ↓
POST /eligibility/check
  ↓
┌─ eligible=false → نشان دادن reasons
│     INSURANCE_REQUIRED / MEDICAL_APPROVAL_REQUIRED / AGE_...
│     → Documents upload → دوباره check
│
└─ eligible=true
      ↓
    POST /reservations  (+ Idempotency-Key / idempotencyKey ≥ ۸ کاراکتر)
      ↓
    تایمر انقضای Hold
      ↓
    اختیاری discountCode
      ↓
    POST /confirm
      ↓
    نمایش quote سرور
      ↓
    gateway.requiresRedirect?
      ├─ yes → window به redirectUrl سرور
      └─ no (zeroAmount) → نتیجه موفقیت از پاسخ/GET payment
      ↓
    بازگشت → /payments/:id/result
      ↓
    callback در صورت نیاز + GET payment
      ↓
    SUCCESS + enrollment ACTIVE → موفقیت
    SUCCESS + PENDING_COMPLIANCE → «پرداخت شد؛ مدارک در انتظار تأیید»
    FAILED / CANCELLED / EXPIRED → retry از کلاس (رزرو جدید)
```

### Waitlist شاخه

```text
isFull=true و registrationOpen
  → eligibility
  → POST /waitlist
  → نمایش position از پاسخ سرور (محاسبه کلاینت ممنوع)
```

---

## Journey 4 — لغو ثبت‌نام (Phase 9)

```text
My Enrollments → Cancel (Confirm)
  → POST /enrollments/:id/cancel
  → Server:
       Enrollment → CANCELLED
       Open payments → CANCELLED
       Seat release در صورت نیاز
  → Frontend:
       Refresh enrollment
       Refresh payment (اگر paymentId دارد)
       Refresh capacity کلاس
```

```text
Frontend نباید خودش payment را «لغو» کند.
Cancel enrollment کافی است؛ نتیجه را از سرور بخوان.
```

---

## Journey 5 — ادمین تأیید مدرک

```text
Admin Pending Docs
  → باز کردن سند (content فقط اگر persisted)
  → APPROVED یا REJECTED (+ دلیل)
  → POST .../review
  → اگر DOCUMENT_NOT_PERSISTED → به کاربر بگو آپلود واقعی لازم است
```

---

## Journey 6 — ادمین استرداد

```text
Payment SUCCESS
  → Confirm Refund
  → POST /payments/:id/refund
  → UI بر اساس status نهایی:
       REFUNDED  یا  REFUND_REQUESTED (زرین‌پال ممکن است اینجا بماند)
```

---

# ۶. Payment Flow — واضح و بصری

## ۶.۱ Mental Model

```text
Frontend NEVER decides payment success.
```

Frontend فقط:

```text
1. Starts checkout (confirm)
2. Shows server quote
3. Redirects if gateway.requiresRedirect
4. Returns from gateway
5. Calls callback when needed (بدون amount)
6. Reads GET /payments/:id
7. Renders server truth
```

## ۶.۲ Diagram

```text
Reservation (HELD)
        ↓
POST /enrollments/confirm
        ↓
Server Quote + Payment Created
        ↓
requiresRedirect?
   ├─ NO (zeroAmount) → ممکن است سریع نهایی شود
   └─ YES → Gateway
              ↓
           Return to FE
              ↓
   POST /enrollments/payments/callback
   { paymentId, success, authority?, providerRef? }
   ⚠️ هرگز amount نفرست (سرور 400)
              ↓
   GET /payments/:id
              ↓
   Terminal? → Stop polling → Show result + enrollment status
```

## ۶.۳ پاسخ Confirm (واقعی)

```json
{
  "enrollment": { "id": "...", "status": "PAYMENT_PENDING", "..." : "..." },
  "payment": { "id": "...", "amount": 1500000, "status": "INITIATED", "provider": "mock", "providerRef": null, "authority": null },
  "quote": { "basePrice": 1500000, "finalPrice": 1500000, "discountAmount": 0 },
  "gateway": { "requiresRedirect": true, "redirectUrl": "https://...", "authority": "...", "zeroAmount": false },
  "alreadyExists": false
}
```

- `idempotencyKey` حداقل ۸ کاراکتر  
- همان کلید با payload متفاوت → **409 `IDEMPOTENCY_KEY_REUSE`**  
- همان کلید با همان payload → 200 و `alreadyExists: true`

## ۶.۴ جدول وضعیت‌های پرداخت

| status | معنی | UI | Polling؟ | Actions مجاز | ممنوع |
|--------|------|-----|----------|--------------|--------|
| `CREATED` | ساخته شده | Processing | بله (کوتاه) | Check again | فرض موفقیت |
| `INITIATED` | به درگاه رفته | Processing | بله | Check again | — |
| `PENDING` | در انتظار تأیید | Processing + Timeline | بله bounded | Check again / callback | Success از URL |
| `SUCCESS` | تأییدشده | Success | خیر | رفتن به enrollment | Retry همان payment |
| `FAILED` | ناموفق | Error | خیر | شروع جریان جدید از کلاس | زنده کردن همان payment |
| `CANCELLED` | انصراف/لغو مسیر | Info | خیر | جریان جدید | — |
| `EXPIRED` | منقضی + آزاد شدن hold | Warning | خیر | رزرو جدید | — |
| `REFUND_REQUESTED` | استرداد درخواست‌شده | Admin badge | اختیاری admin | صبر / refresh | ادعای تکمیل قطعی |
| `REFUNDED` | مسترد شده | Final | خیر | — | — |

### PENDING — جزئیات

```text
Meaning: هنوز نهایی نشده
UI: Processing Screen
Actions: «بررسی مجدد»
Polling: مثلاً هر 3–5s حداکثر N بار سپس دستی
Do Not: Assume success from gateway URL
```

### Terminal در callback

کد `PAYMENT_TERMINAL` / وضعیت نهایی → UI پردازش را متوقف کند و state را از GET بخواند.

---

# ۷. Cancel Flow (Phase 9)

```text
Cancel
  = تغییر lifecycle ثبت‌نام
  + terminal کردن پرداخت‌های باز روی سرور
  + آزادسازی احتمالی صندلی
```

Frontend:

```text
Request Cancel → Server Result → Refresh Enrollment → Refresh Payment → Refresh Capacity
```

ظرفیت را در کلاینت دستکاری نکن.

---

# ۸. Refund Flow

```text
Refund = فقط ADMIN
SUCCESS → REFUND_REQUESTED → REFUNDED
```

| واقعیت Backend | Implication Frontend |
|----------------|----------------------|
| مبلغ جزئی در body نیست | UI مبلغ دلخواه برای refund نفرست |
| Mock معمولاً تا REFUNDED می‌رود | در dev ممکن است سریع نهایی شود |
| Zarinpal refund **wired نیست** | ممکن است روی `REFUND_REQUESTED` بماند — «تکمیل‌شده» دروغ نگو |
| بعد از Cancel، seat دوباره کم نمی‌شود | ظرفیت را دستی عوض نکن |

Confirm dialog قبل از Refund الزامی است.

---

# ۹. Document Flow

```text
Participant
  → Documents tab
  → Insurance | Medical
  → Select file (client validate)
  → multipart upload field=file
  → persisted: true?
  → PENDING
  → Admin review
  → APPROVED | REJECTED
  → اگر REJECTED → آپلود سند جدید (overwrite تاریخچه تأییدشده نکن)
```

| قانون | مقدار |
|-------|--------|
| انواع | PDF, JPEG, PNG |
| حداکثر | 5 MB (`DOCUMENT_MAX_BYTES`) |
| Field | `file` |
| دانلود | فقط اگر `persisted: true` و endpoint `/content` |
| `storageKey` | هرگز در UI/لاگ |

### Metadata-only (legacy)

```text
POST .../insurance یا .../medical با originalFilename بدون فایل واقعی
→ persisted: false
→ Admin APPROVE → 409 DOCUMENT_NOT_PERSISTED
→ Eligibility با storageKey جعلی قبول نمی‌شود
```

**UX اصلی محصول = فقط Upload multipart.**

---

# ۱۰. Capacity UX

سرور برمی‌گرداند:

```text
capacity, confirmed, held, available, isFull, registrationOpen
```

فرمول سرور (برای فهم، نه محاسبه اجباری کلاینت):

```text
available = capacity - confirmedCount - heldCount
```

| UI State | شرط تقریبی از پاسخ |
|----------|---------------------|
| Available | `available > 0` و `registrationOpen` |
| Limited | `available` کم (آستانه UI) |
| Full | `isFull` |
| Registration Closed | `!registrationOpen` |
| Reservation Expired | خطای رزرو / وضعیت EXPIRED → شروع مجدد |

```text
Frontend NEVER recalculates authoritative capacity.
فقط نمایش و تصمیم UX بر اساس فیلدهای سرور.
```

---

# ۱۱. Waitlist UX

```text
Full class → Eligibility OK → POST /waitlist → { id, classId, position, status }
```

| نشان بده | از کجا |
|----------|--------|
| Position | پاسخ join (نه محاسبه محلی) |
| Status | WAITING / OFFERED / … |
| Offer expiry | اگر Backend در مدل/لیست بعدی داد |

خطاهای رایج: `COURSE_NOT_FULL` (هنوز جا هست → برو رزرو) · `WAITLIST_CONFLICT` · `ENROLLMENT_ALREADY_EXISTS`

---

# ۱۲. State Management Architecture

## ۱۲.۱ واقعیت فعلی

- Auth در **React Context** (`authContext.jsx`) — نگه دار یا به RTK منتقل کن؛ یکی را منبع کن
- Redux store الان ناقص/بدون Provider است — قبل از استفاده درستش کن یا عمداً به Context/Query بسنده کن
- **کتابخانه جدید تحمیل نکن** (axios/react-query اجباری نیست)

## ۱۲.۲ ساختار پیشنهادی سازگار با پروژه

```text
src/
  app/                 # bootstrap
  pages/               # route-level (موجود + صفحات محصول)
  layouts/             # Root / Auth / AdminShell
  features/
    auth/              # می‌تواند از services/ فعلی رشد کند
    courses/
    participants/
    enrollment/
    payments/
    admin/
  components/          # Ui + domain
  services/            # apiClient + domain API modules
  store/               # slices واقعی مورد نیاز
  hooks/
  utils/
  assets/
```

## ۱۲.۳ دسته‌های State

| دسته | مثال |
|------|------|
| Auth | accessToken (memory), user, status |
| Server | classes, participants, enrollments, payments, docs, reports |
| Form | OTP, participant form, discount code |
| Payment | paymentId, status, polling timer, terminal lock |
| UI | modal, toast, tabs, filters, sidebar |

پیشنهاد عملی: Auth Context فعلی را نگه دارید؛ برای server state از thunk/RTK slice یا ماژول‌های `services/*Api.js` + local component state شروع کنید. RTK Query اختیاری است نه اجباری.

---

# ۱۳. API Layer (پس از فهم UX)

Base prefixها (واقعی از `app.js`):

```text
/api/health
/api/auth
/api/courses
/api/enrollments
/api/payments
/api/notifications          ← همه ADMIN
/api/admin/reports         ← همه ADMIN
```

---

## ۱۳.۱ Auth

| Method | Endpoint | Auth | Used By |
|--------|----------|------|---------|
| POST | `/auth/check-phone` | Public | Auth |
| POST | `/auth/register/send-otp` | Public | Auth |
| POST | `/auth/register/verify-otp` | Public | Auth |
| POST | `/auth/register` | Public | Auth |
| POST | `/auth/login` | Public | Auth |
| POST | `/auth/password/send-otp` | Public | Auth |
| POST | `/auth/password/verify-otp` | Public | Auth |
| POST | `/auth/password/reset` | Public | Auth |
| POST | `/auth/refresh` | Cookie | Bootstrap |
| POST | `/auth/logout` | Cookie | Nav |
| GET | `/auth/me` | USER | Bootstrap |

---

## ۱۳.۲ Courses

| Method | Endpoint | Auth | Used By |
|--------|----------|------|---------|
| GET | `/courses/templates` | Public | Courses |
| GET | `/courses/templates/:id` | Public | Details |
| GET | `/courses/classes` | Public | Courses (`status`, `courseTemplateId`) |
| GET | `/courses/classes/:id` | Public | Details |
| GET | `/courses/classes/:id/capacity` | Public | Details / after cancel |
| GET | `/courses/classes/:id/schedule` | Public | Details |
| GET | `/courses/classes/:id/sessions` | Public | Details / attendance |
| POST/PATCH | templates/classes + publish/open/close/cancel/generate-sessions | ADMIN | Admin courses |

---

## ۱۳.۳ Participants & Compliance

| Method | Endpoint | Notes |
|--------|----------|-------|
| CRUD participants | `/enrollments/participants...` | Owner یا ADMIN |
| Upload | `.../insurance/upload` · `.../medical/upload` | multipart `file` |
| Legacy JSON | `.../insurance` · `.../medical` | نه برای UX اصلی |
| Content | `/enrollments/documents/.../:id/content` | binary |
| Review | `/enrollments/admin/documents/.../review` | ADMIN · `DOCUMENT_NOT_PERSISTED` |
| Pending | `/enrollments/admin/documents/pending` | ADMIN |
| Medical profile | `.../medical-profile` | GET/PUT |

---

## ۱۳.۴ Enrollment & Payment

| Method | Endpoint | Important Rules |
|--------|----------|-----------------|
| POST | `/enrollments/eligibility/check` | `{ classId, participantId }` |
| GET | `/enrollments/classes/:classId/availability` | snapshot ظرفیت |
| POST | `/enrollments/reservations` | idempotencyKey اختیاری ≥۸ |
| POST | `/enrollments/waitlist` | وقتی full |
| POST | `/enrollments/confirm` | **بدون amount** · idempotencyKey توصیه قوی |
| POST | `/enrollments/payments/callback` | بدون amount · `{ paymentId, success, authority?, providerRef? }` |
| GET | `/payments/:id` | owner یا ADMIN |
| POST | `/enrollments/:id/cancel` | owner یا ADMIN |
| GET | `/enrollments/me` · `/:id` | — |
| POST | `/payments/:id/refund` | ADMIN only |
| GET | `/payments/jobs/reconcile` | ADMIN · detect-only |
| POST | `/payments/jobs/expire` | ADMIN |

### Confirm — قوانین مهم

```text
Purpose: شروع checkout از روی reservation
Used By: Checkout step
Never send: amount / finalPrice از کلاینت به‌عنوان منبع حقیقت
idempotencyKey: همان کلید + payload متفاوت = 409 IDEMPOTENCY_KEY_REUSE
```

---

## ۱۳.۵ Admin Reports & Notifications

| Area | Endpoints |
|------|-----------|
| Dashboard | `GET /admin/reports/dashboard` |
| Tables | participants, enrollments, payments, classes, attendance, waitlist, discounts, compliance |
| Excel | همان‌ها با `/export` به‌جز discounts و compliance (Excel ندارند) |
| Notifications | `GET /notifications` · jobs · retry — **همه ADMIN** |
| User 360 | `GET /enrollments/users/:userId/360` · `GET /enrollments/users/me/360` |
| Search | `/enrollments/admin/users/search` · `.../participants/search` |
| Activate compliance | `POST /enrollments/admin/enrollments/:id/activate-compliance` |

---

## ۱۳.۶ Attendance

```text
POST /enrollments/attendance
GET  /enrollments/classes/:classId/attendance
```

مجاز: ADMIN یا USER لینک‌شده به Instructor آن کلاس.  
مربی به مدارک پزشکی دسترسی ندارد.

---

# ۱۴. API Response → UI Action

| Backend | Frontend Action |
|---------|-----------------|
| 401 | refresh؛ اگر شکست → login |
| 403 | Access denied / مخفی کردن UI |
| 404 | Empty / Not found |
| 409 | Refresh server state؛ پیام business |
| 413 | فایل/خروجی بزرگ — فیلتر یا فایل کوچک‌تر |
| 429 | صبر + disable موقت |
| 500/502/504 | پیام عمومی؛ retry محدود |
| `IDEMPOTENCY_KEY_REUSE` | کلید جدید نساز کور؛ state را بگیر |
| `PAYMENT_TERMINAL` | توقف processing |
| `DOCUMENT_NOT_PERSISTED` | آپلود multipart واقعی |
| `EXPORT_TOO_LARGE` | محدود کردن فیلتر تاریخ/صفحه |
| `ELIGIBILITY_FAILED` / `NOT_ELIGIBLE` | نشان reasons |
| `COURSE_FULL` | Waitlist یا پیام پر |
| `RESERVATION_EXPIRED` / مشابه | رزرو مجدد |
| `AMOUNT_MISMATCH` | هرگز amount نفرست؛ پشتیبانی |
| `REFUND_FAILED` | پیام ادمین؛ status را refresh کن |

---

# ۱۵. Error UX

| دسته | مثال | Message | Behavior |
|------|------|---------|----------|
| Recoverable | Network, 429, 502 | «موقتاً در دسترس نیست» | Retry |
| Business | FULL, NOT_ELIGIBLE, EXPIRED | پیام دقیق فارسی از `error.message` یا map کد | راهنمای قدم بعد |
| Permission | 401/403 | نشست/عدم دسترسی | Login یا hide |
| Validation | 400 | کنار فیلد | اصلاح فرم |

```text
همیشه code را برای منطق استفاده کن؛ message را برای انسان.
details را در UI خام لو نده مگر برای فرم (مثلاً reasons eligibility).
```

---

# ۱۶. Loading Design

| زمینه | الگو |
|-------|------|
| ورود به صفحه | Skeleton |
| کلیک دکمه | Inline loading + disable |
| پرداخت | Processing + status timeline |
| جدول ادمین | Row skeleton |
| آپلود مدرک | Progress → Uploading → Success/Fail |

Loading فقط اسپینر تمام‌صفحه برای bootstrap اولیه کافی است (الان در `App.jsx` هست).

---

# ۱۷. Empty States

| Empty | متن پیشنهادی | Action |
|-------|--------------|--------|
| No participants | هنوز شرکت‌کننده‌ای ثبت نکرده‌اید | افزودن |
| No courses | کلاسی برای ثبت‌نام نیست | بعداً سر بزنید |
| No enrollments | هنوز ثبت‌نامی ندارید | مشاهده کلاس‌ها |
| No pending docs | مدرک معلقی نیست | — |
| No report rows | با این فیلتر نتیجه‌ای نیست | تغییر فیلتر |

هدف: کاربر را به **قدم بعدی مفید** هل بدهد، نه بن‌بست.

---

# ۱۸. Design System Guidelines

با هویت فعلی پروژه هماهنگ بمان:

```text
Modern · Clean · Trustworthy · Calm
Swimming / sports context (آبی–فیروزه‌ای موجود)
Persian First · Responsive · Accessible
فونت: ایران یکان (موجود)
Motion: Framer Motion موجود — برای hierarchy نه شلوغی
```

```text
DO NOT:
- تم بنفش عمومی AI
- کارت‌های قهرمان شلوغ روی landing موجود را بی‌دلیل خرد کن
- کتابخانه UI جدید اجباری اضافه کن
```

Admin می‌تواند shell متراکم‌تری داشته باشد؛ User app باید حس آرامش و اعتماد بدهد.

---

# ۱۹. Responsive

| سطح | Courses | Admin tables | Checkout |
|-----|---------|--------------|----------|
| Mobile | تک‌ستونه | کارت/اسکرول افقی | تمام‌عرض، دکمه ثابت پایین |
| Tablet | ۲ ستون | جدول فشرده | دو ستون در صورت جا |
| Desktop | Grid | جدول کامل | پنل خلاصه quote |

---

# ۲۰. Accessibility

```text
- RTL First: dir="rtl" در shell اصلی؛ lang="fa" برای صفحات محصول
- Focus visible روی دکمه‌ها و فرم‌ها
- خطای فرم با متن نه فقط رنگ
- Upload: label واضح، نام فایل، وضعیت
- Loading: aria-busy / اعلام وضعیت پرداخت
- Keyboard: wizard و مودال‌ها قابل بستن با Esc
```

---

# ۲۱. Route Protection

| نوع | مثال | Guard Frontend | حقیقت |
|-----|------|----------------|--------|
| Public | home, courses list | — | — |
| Authenticated | participants, enroll | `RequireAuth` | 401 Backend |
| Admin | `/admin/*` | `RequireAuth roles={['ADMIN']}` | `authorize("ADMIN")` |
| Instructor-scoped | attendance | نمایش شرطی بعد از API | سرویس لینک Instructor |

`RequireAuth` الان وجود دارد — باید روی routeهای محصول mount شود.

---

# ۲۲. Admin Panel Map

```text
Admin Dashboard
│
├── Operational Overview          ← dashboard KPI
│
├── Users
│   └── User 360                  ← پرونده کامل؛ داده‌های حساس
│
├── Courses / Classes / Sessions
│
├── Compliance
│   ├── Pending Documents
│   └── Review (APPROVE/REJECT)
│
├── Finance
│   ├── Payments
│   ├── Refunds (Confirm!)
│   └── Reconciliation (read-only findings)
│
├── Reports (+ Excel)
│
└── Notifications / Jobs (ops)
```

| Section | Risky Actions | Confirmation؟ |
|---------|---------------|---------------|
| Refund | پول برگشت | ✅ الزامی |
| Reject document | تأثیر eligibility | ✅ + دلیل |
| Cancel class | اختلال ثبت‌نام | ✅ |
| Activate compliance | تغییر enrollment | ✅ |

Reconcile: فقط نمایش یافته‌ها — **دکمه «Auto-fix money» نساز**.

---

# ۲۳. Dangerous Actions (Confirm UI)

فقط اگر Backend واقعاً دارد:

| Action | Endpoint |
|--------|----------|
| Cancel Enrollment | `POST /enrollments/:id/cancel` |
| Refund | `POST /payments/:id/refund` |
| Reject Document | review با REJECTED |
| Deactivate Participant | `POST .../deactivate` |
| Cancel Class | `POST /courses/classes/:id/cancel` |

حذف سخت course عمومی در API به‌صورت delete ساده فرض نکن — از endpointهای واقعی status machine استفاده کن.

---

# ۲۴. Frontend Implementation Order

## Milestone 0 — Foundation
```text
[ ] فهم Product + این سند
[ ] درست کردن Redux Provider یا حذف import شکسته
[ ] گسترش apiClient برای multipart + blob download
[ ] Mount کردن RequireAuth
[ ] Toast / Error boundary / App shell محصول
[ ] RTL shell برای مسیرهای جدید
```

## Milestone 1 — Auth Polish
```text
[ ] جریان فعلی auth پایدار
[ ] Redirect پس از login به مقصد deep-link
```

## Milestone 2 — Course Discovery
```text
[ ] /courses از API
[ ] /courses/:classId + capacity/schedule/sessions
[ ] Empty/Loading/Error
```

## Milestone 3 — Participants & Documents
```text
[ ] CRUD participants
[ ] Multipart upload + download
[ ] Eligibility check UI
```

## Milestone 4 — Reservation → Payment
```text
[ ] Reserve + timer
[ ] Confirm + quote
[ ] Gateway redirect
[ ] Payment result + polling bounded
[ ] Waitlist
```

## Milestone 5 — My Enrollments
```text
[ ] List/detail
[ ] Cancel + refresh states
```

## Milestone 6 — Admin Core
```text
[ ] Shell + dashboard
[ ] Users + User 360
[ ] Courses admin
[ ] Document review
```

## Milestone 7 — Admin Finance & Reports
```text
[ ] Payments + refund UX صادقانه
[ ] Reconcile read-only
[ ] Reports + Excel
```

## Milestone 8 — Attendance + Polish
```text
[ ] Attendance instructor-scoped
[ ] Responsive + a11y
[ ] جایگزینی CTA واتساپ مسیر محصول
```

Dependency: Milestone 4 بدون 3 ناقص است (eligibility/docs). Admin بدون 2–5 ممکن است ولی توصیه می‌شود بعد از core user flow.

---

# ۲۵. Definition of Done

## Payment Done When
```text
[ ] Quote فقط از سرور
[ ] هیچ amount در callback/confirm به‌عنوان تصمیم کلاینت
[ ] Redirect فقط از gateway.redirectUrl
[ ] Success هرگز از URL درگاه
[ ] Terminal states polling را قطع می‌کنند
[ ] FAILED / CANCELLED / EXPIRED UI دارند
[ ] Retry = جریان رزرو/confirm جدید
```

## Documents Done When
```text
[ ] multipart field=file
[ ] type + size validation
[ ] persisted محترم شمرده می‌شود
[ ] storageKey در UI نیست
[ ] download فقط /content با Bearer
[ ] reject → آپلود جدید
```

## Courses Done When
```text
[ ] loading / empty / error
[ ] capacity از سرور
[ ] full / closed states
```

## Cancel Done When
```text
[ ] Confirm dialog
[ ] بعد از cancel، enrollment+payment+capacity refresh
[ ] UI پرداخت باز را SUCCESS نشان نمی‌دهد
```

## Admin Done When
```text
[ ] بدون توکن ادمین وارد نمی‌شود (و API 403 را هندل می‌کند)
[ ] Refund/Reject confirm دارند
[ ] Reconcile فقط نمایش است
```

---

# ۲۶. چه چیزی را نساز (Do Not Implement)

```text
❌ API اختراعی
❌ اعتماد به مبلغ کلاینت
❌ تصمیم موفقیت پرداخت در Frontend
❌ نمایش/ذخیره storageKey یا مسیر فایل
❌ نقش JWT به نام INSTRUCTOR
❌ Inbox اعلان کاربر (API ندارد — فقط admin notifications)
❌ ادعای تکمیل Refund زرین‌پال وقتی status هنوز REFUND_REQUESTED است
❌ دکمه Auto-fix برای Reconcile
❌ Metadata JSON به‌عنوان UX اصلی مدارک
❌ محاسبه position Waitlist در کلاینت
❌ محاسبه ظرفیت authoritative در کلاینت
❌ زنده کردن payment منقضی/ناموفق با همان id
```

---

# ۲۷. Known Backend Limitations → Frontend Implication

| محدودیت Backend | کار Frontend |
|-----------------|--------------|
| Zarinpal live E2E بدون merchant تأیید نشده | UI صادقانه؛ به sandbox/mock در dev وابسته باش |
| Zarinpal refund wired نیست | `REFUND_REQUESTED` را «انجام شد» نشان نده |
| Reconcile = detect-only | فقط لیست یافته‌ها |
| Document storage محلی + بدون آنتی‌ویروس | فقط `/content`؛ به کاربر مسیر سرور نده |
| User notification inbox نیست | Inbox جعلی نساز |
| `PAYMENT_PROVIDER=mock` در production ممنوع | موضوع DevOps؛ در UI «درگاه آزمایشی» فقط وقتی provider=mock از پاسخ |
| Excel discounts/compliance نیست | دکمه export برای آن‌ها نساز |
| Instructor JWT role نیست | UI مربی را با role جعلی قفل نکن |

---

# ۲۸. Environment Notes (Frontend)

```text
VITE_API_BASE_URL=/api          # یا URL مطلق API
Vite proxy → http://127.0.0.1:4000
credentials: include برای کوکی refresh
FRONTEND_URL در Backend باید origin فرانت را مجاز کند
```

عملیاتی Backend (برای آگاهی، نه کار Frontend):  
`DOCUMENT_STORAGE_ROOT` volume · `PAYMENT_PROVIDER=zarinpal` در production · secrets زرین‌پال · SMS واقعی

---

# ۲۹. Glossary

| واژه | تعریف |
|------|--------|
| **Participant** | شناگری که در کلاس شرکت می‌کند |
| **Course Template** | قالب دوره و قوانین واجدشرایطی |
| **Course Class** | کلاس زمان‌بندی‌شده با ظرفیت و قیمت |
| **Reservation / Hold** | رزرو موقت صندلی |
| **Enrollment** | ثبت‌نام پس از مسیر پرداخت/فعال‌سازی |
| **Eligibility** | نتیجه بررسی شرایط توسط سرور |
| **Compliance** | مدارک بیمه و پزشکی |
| **Payment** | رکورد مالی و وضعیت آن |
| **Quote** | قیمت نهایی محاسبه‌شده سرور در checkout |
| **Callback** | اطلاع/تأیید سمت اپ پس از درگاه؛ Verify نهایی با سرور |
| **Refund** | استرداد ادمین روی پرداخت SUCCESS |
| **Reconciliation** | تشخیص ناسازگاری مالی بدون اصلاح خودکار |
| **Waitlist** | صف انتظار هنگام پر بودن کلاس |
| **User 360** | نمای تجمیعی ادمین از یک کاربر |
| **persisted** | فایل واقعاً روی storage ذخیره شده |

---

# ۳۰. Enumهای مهم (دقیق)

**Payment:**  
`CREATED` · `INITIATED` · `PENDING` · `SUCCESS` · `FAILED` · `CANCELLED` · `EXPIRED` · `REFUND_REQUESTED` · `REFUNDED`

**Enrollment:**  
`PENDING` · `PAYMENT_PENDING` · `PAID` · `ACTIVE` · `PENDING_COMPLIANCE` · `COMPLETED` · `CANCELLED` · `PAYMENT_FAILED` · `EXPIRED` · `REFUNDED` · `WAITLISTED`

**Compliance document:**  
`PENDING` · `APPROVED` · `REJECTED` · `EXPIRED`

**Reservation:**  
`HELD` · `CONFIRMED` · `EXPIRED` · `RELEASED`

**Waitlist:**  
`WAITING` · `OFFERED` · `ACCEPTED` · `EXPIRED` · `CANCELLED`

اگر در Backend نیست، در Frontend اختراع نکن.

---

# ۳۱. نمونه Localization وضعیت‌ها (پیشنهادی UI)

| Enum | برچسب پیشنهادی |
|------|----------------|
| PAYMENT_PENDING | در انتظار پرداخت |
| ACTIVE | فعال |
| PENDING_COMPLIANCE | پرداخت شد؛ در انتظار مدارک |
| CANCELLED | لغو شده |
| SUCCESS | پرداخت موفق |
| EXPIRED | منقضی شده |
| REFUND_REQUESTED | در حال استرداد |
| REFUNDED | مسترد شده |

---

# جمع‌بندی برای توسعه‌دهنده

شما یک **محصول ثبت‌نام کامل** می‌سازید روی اسکلتی که امروز عمدتاً **بازاریابی + Auth** است.

ترتیب درست:

```text
Foundation → Courses API → Participants/Docs → Checkout/Payment → My Enrollments → Admin → Polish
```

هر وقت مردد شدی:

```text
Backend Source > این سند > سلیقه شخصی
```

و برای پول:

```text
Server Quote · Server Verify · Server Status · UI Mirror
```

---

*پایان راهنمای Frontend — نسخه Product + UX + Engineering Handoff پس از Phase 9.*
