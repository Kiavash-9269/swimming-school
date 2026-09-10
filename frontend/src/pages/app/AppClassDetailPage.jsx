import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getCourseClassById,
  getClassCapacity,
  getClassSchedule,
  getClassSessions,
  getCourseTemplateById,
} from "../../features/courses/coursesApi";
import {
  CLASS_STATUS_LABELS,
  GENDER_RESTRICTION_LABELS,
  SESSION_STATUS_LABELS,
  formatDateFa,
  formatDaysOfWeek,
  formatIrr,
  resolveRegistrationUx,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const BADGE = {
  open: "bg-emerald-100 text-emerald-800 border-emerald-200",
  full: "bg-amber-100 text-amber-900 border-amber-200",
  closed: "bg-slate-200 text-slate-700 border-slate-300",
  unavailable: "bg-rose-100 text-rose-800 border-rose-200",
};

/**
 * Class detail — class required; capacity/schedule/sessions/template secondary.
 */
export default function AppClassDetailPage() {
  const { classId } = useParams();
  const validId = OBJECT_ID_RE.test(classId || "");

  const [courseClass, setCourseClass] = useState(null);
  const [template, setTemplate] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [pageStatus, setPageStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [secondaryError, setSecondaryError] = useState("");

  const load = useCallback(
    async (signal) => {
      if (!validId) {
        setPageStatus("error");
        setErrorMessage("شناسه کلاس نامعتبر است.");
        return;
      }

      setPageStatus("loading");
      setErrorMessage("");
      setSecondaryError("");
      setTemplate(null);
      setCapacity(null);
      setSchedule(null);
      setSessions([]);

      try {
        const cls = await getCourseClassById(classId, { signal });
        setCourseClass(cls);
        setPageStatus("ready");

        const secondary = await Promise.allSettled([
          getClassCapacity(classId, { signal }),
          getClassSchedule(classId, { signal }),
          getClassSessions(classId, { signal }),
          cls.courseTemplateId
            ? getCourseTemplateById(cls.courseTemplateId, { signal })
            : Promise.resolve(null),
        ]);

        if (signal?.aborted) return;

        const notes = [];
        if (secondary[0].status === "fulfilled") setCapacity(secondary[0].value);
        else notes.push("ظرفیت");
        if (secondary[1].status === "fulfilled") setSchedule(secondary[1].value);
        else notes.push("برنامه");
        if (secondary[2].status === "fulfilled") {
          setSessions(Array.isArray(secondary[2].value?.items) ? secondary[2].value.items : []);
        } else notes.push("جلسات");
        if (secondary[3].status === "fulfilled") setTemplate(secondary[3].value);
        else if (cls.courseTemplateId) notes.push("قالب دوره");

        if (notes.length) {
          setSecondaryError(`برخی اطلاعات تکمیلی بارگذاری نشد: ${notes.join("، ")}`);
        }
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setCourseClass(null);
        setErrorMessage(userMessageFromApiError(err, "بارگذاری کلاس ناموفق بود."));
        setPageStatus("error");
      }
    },
    [classId, validId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (pageStatus === "loading") {
    return <SectionLoader label="در حال دریافت جزئیات کلاس…" />;
  }

  if (pageStatus === "error") {
    return (
      <div className="space-y-4">
        <ErrorState title="کلاس در دسترس نیست" message={errorMessage} onRetry={() => load()} />
        <Link to="/app/courses" className="text-sm text-cyan-700 hover:underline">
          بازگشت به فهرست کلاس‌ها
        </Link>
      </div>
    );
  }

  const ux = resolveRegistrationUx(capacity, courseClass);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/app/courses" className="text-sm text-cyan-700 hover:underline">
          ← فهرست کلاس‌ها
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{courseClass.title}</h1>
            {template?.title ? (
              <p className="mt-1 text-sm text-slate-500">دوره: {template.title}</p>
            ) : null}
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm font-medium ${BADGE[ux.key]}`}>
            {ux.label}
          </span>
        </div>
      </div>

      {secondaryError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {secondaryError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">ثبت‌نام و ظرفیت</h2>
        <p className="mt-1 text-xs text-slate-400">
          منبع ترجیحی: گزارش ظرفیت سرور (شامل رزرو موقت)
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-400">وضعیت کلاس</dt>
            <dd>{CLASS_STATUS_LABELS[courseClass.status] || courseClass.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">ثبت‌نام باز؟</dt>
            <dd>{ux.registrationOpen ? "بله" : "خیر"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">ظرفیت کل</dt>
            <dd>{(capacity?.capacity ?? courseClass.capacity)?.toLocaleString("fa-IR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">صندلی آزاد</dt>
            <dd>{(capacity?.available ?? courseClass.availableSeats)?.toLocaleString("fa-IR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">تأییدشده</dt>
            <dd>{(capacity?.confirmed ?? courseClass.confirmedCount)?.toLocaleString("fa-IR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">رزرو موقت</dt>
            <dd>{(capacity?.held ?? courseClass.heldCount)?.toLocaleString("fa-IR") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">پر؟</dt>
            <dd>{ux.isFull ? "بله" : "خیر"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">قیمت نمایشی</dt>
            <dd className="font-medium">{formatIrr(courseClass.price)}</dd>
          </div>
        </dl>
      </section>

      {template ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">شرایط دوره</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400">سطح</dt>
              <dd>{template.level}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">محدوده سن</dt>
              <dd>
                {template.ageMin} – {template.ageMax}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">جنسیت</dt>
              <dd>{GENDER_RESTRICTION_LABELS[template.genderRestriction] || template.genderRestriction}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">بیمه / پزشکی</dt>
              <dd>
                {[
                  template.requiresInsurance ? "بیمه لازم" : null,
                  template.requiresMedicalApproval ? "تأیید پزشکی لازم" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "الزام خاصی اعلام نشده"}
              </dd>
            </div>
            {template.description ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-400">توضیح</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-700">{template.description}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">برنامه زمانی</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">بازه تاریخ</dt>
            <dd>
              {formatDateFa(schedule?.startDate || courseClass.startDate)} تا{" "}
              {formatDateFa(schedule?.endDate || courseClass.endDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">روزهای هفته</dt>
            <dd>{formatDaysOfWeek(schedule?.daysOfWeek || courseClass.daysOfWeek)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">ساعت</dt>
            <dd>
              {(schedule?.startTime || courseClass.startTime)} – {(schedule?.endTime || courseClass.endTime)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">تعداد جلسات برنامه‌ریزی‌شده</dt>
            <dd>
              {(schedule?.totalSessions ?? courseClass.totalSessions)?.toLocaleString("fa-IR") ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">جلسات</h2>
        {sessions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="جلسه‌ای ثبت نشده"
              description="هنوز جلسه‌ای برای این کلاس در سرور ایجاد نشده است."
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium text-slate-800">
                  جلسه {s.sessionNumber?.toLocaleString("fa-IR")}
                </span>
                <span className="text-slate-600">{formatDateFa(s.date)}</span>
                <span className="text-slate-500">
                  {s.startTime} – {s.endTime}
                </span>
                <span className="text-xs text-slate-500">
                  {SESSION_STATUS_LABELS[s.status] || s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h2 className="font-bold text-slate-900">ثبت‌نام در کلاس</h2>
        <p className="mt-2 text-sm text-slate-600">
          شرایط شرکت‌کننده، ظرفیت و رزرو موقت صندلی (یا لیست انتظار) را بررسی کنید. پرداخت و
          تکمیل ثبت‌نام هنوز فعال نیست.
        </p>
        <Link
          to={`/app/courses/${classId}/register`}
          className="mt-4 inline-flex rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
        >
          شروع ثبت‌نام
        </Link>
      </section>
    </div>
  );
}
