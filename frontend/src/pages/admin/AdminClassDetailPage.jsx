import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getCourseClassById,
  getClassCapacity,
  getClassSessions,
  getClassSchedule,
  listInstructors,
  publishCourseClass,
  openClassRegistration,
  closeClassRegistration,
  cancelCourseClass,
  startCourseClass,
  completeCourseClass,
  archiveCourseClass,
  generateClassSessions,
} from "../../features/courses/coursesApi";
import { getClassRoster } from "../../features/enrollments/enrollmentsApi";
import {
  CLASS_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  formatDateFa,
  formatDaysOfWeek,
  formatIrr,
  classStatusTone,
  userMessageFromApiError,
} from "../../features/courses/courseLabels";
import { ENROLLMENT_STATUS_LABELS } from "../../features/enrollments/enrollmentLabels";
import {
  StatusPill,
  ConfirmBanner,
  AdminPageHeader,
} from "../../features/courses/components/AdminCourseUi";
import {
  OpsTabs,
  DetailSection,
  ActionBar,
} from "../../features/ops/OpsUi.jsx";
import { nextLifecycleHint } from "../../features/ops/opsHelpers.js";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import { useToast } from "../../components/feedback/useToast";

const TAB_IDS = ["overview", "sessions", "participants", "attendance", "links"];

export default function AdminClassDetailPage() {
  const { classId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const rawTab = searchParams.get("tab") || "overview";
  const tab = TAB_IDS.includes(rawTab) ? rawTab : "overview";

  const [courseClass, setCourseClass] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [rosterError, setRosterError] = useState("");
  const [rosterQ, setRosterQ] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next);
  };

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setErrorMessage("");
      setRosterError("");
      try {
        const [cls, cap, sess, sched, instructors] = await Promise.all([
          getCourseClassById(classId, { signal }),
          getClassCapacity(classId, { signal }).catch(() => null),
          getClassSessions(classId, { signal }),
          getClassSchedule(classId, { signal }).catch(() => null),
          listInstructors({ signal }).catch(() => ({ items: [] })),
        ]);
        setCourseClass(cls);
        setCapacity(cap);
        setSchedule(sched);
        setSessions(Array.isArray(sess?.items) ? sess.items : Array.isArray(sess) ? sess : []);
        const list = Array.isArray(instructors?.items) ? instructors.items : [];
        const match = list.find((i) => i.id === cls.instructorId);
        setInstructorName(match?.name || "");

        try {
          const ros = await getClassRoster(classId, { signal });
          setRoster(Array.isArray(ros?.items) ? ros.items : []);
        } catch (err) {
          if (err?.code === "ABORTED") return;
          setRoster([]);
          setRosterError(userMessageFromApiError(err, "بارگذاری فهرست شرکت‌کنندگان ناموفق بود."));
        }

        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setErrorMessage(userMessageFromApiError(err, "بارگذاری کلاس ناموفق بود."));
        setStatus("error");
      }
    },
    [classId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const filteredRoster = useMemo(() => {
    const needle = rosterQ.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((r) =>
      `${r.firstName || ""} ${r.lastName || ""} ${r.participantId || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [roster, rosterQ]);

  async function runAction(fn, okMessage) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(okMessage);
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "عملیات ناموفق بود."));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <SectionLoader label="در حال بارگذاری کلاس…" />;
  if (status === "error") return <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />;
  if (!courseClass) return null;

  const st = courseClass.status;
  const lifecycleHint = nextLifecycleHint(st);

  const tabs = [
    { id: "overview", label: "نمای کلی" },
    { id: "sessions", label: "جلسات", count: sessions.length },
    { id: "participants", label: "شرکت‌کنندگان", count: roster.length },
    { id: "attendance", label: "حضور و غیاب" },
    { id: "links", label: "پیوندها" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        backTo="/admin/classes"
        backLabel="← کلاس‌ها"
        title={courseClass.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill tone={classStatusTone(st)}>{CLASS_STATUS_LABELS[st] || st}</StatusPill>
            {lifecycleHint ? <span className="text-sm text-slate-600">{lifecycleHint}</span> : null}
            <Link to={`/admin/courses/${courseClass.courseTemplateId}`} className="text-cyan-700 hover:underline">
              دوره مرتبط
            </Link>
          </span>
        }
        actions={
          <>
            <Link
              to={`/admin/classes/${classId}/edit`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              ویرایش
            </Link>
            <Link
              to={`/admin/attendance?classId=${classId}`}
              className="rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50"
            >
              حضور و غیاب
            </Link>
          </>
        }
      />

      <DetailSection
        title="عملیات وضعیت"
        hint="فقط اقدام‌های مجاز بعدی نمایش داده می‌شوند؛ سرور مرجع نهایی اعتبار انتقال است. حذف سخت کلاس وجود ندارد — لغو کلاس فیزیکی نیست."
      >
        <ActionBar tone="primary">
          {st === "DRAFT" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm("publish")}
                className="rounded-xl bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                انتشار
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm("publishOpen")}
                className="rounded-xl bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                انتشار و باز کردن ثبت‌نام
              </button>
            </>
          ) : null}
          {st === "PUBLISHED" || st === "REGISTRATION_CLOSED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => openClassRegistration(classId), "ثبت‌نام باز شد.")}
              className="rounded-xl bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              باز کردن ثبت‌نام
            </button>
          ) : null}
          {st === "REGISTRATION_OPEN" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => closeClassRegistration(classId), "ثبت‌نام بسته شد.")}
              className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              بستن ثبت‌نام
            </button>
          ) : null}
          {st === "REGISTRATION_CLOSED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => startCourseClass(classId), "کلاس شروع شد.")}
              className="rounded-xl bg-indigo-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              شروع کلاس
            </button>
          ) : null}
          {st === "IN_PROGRESS" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => completeCourseClass(classId), "کلاس تکمیل شد.")}
              className="rounded-xl bg-emerald-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              تکمیل کلاس
            </button>
          ) : null}
          {st === "COMPLETED" || st === "CANCELLED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => archiveCourseClass(classId), "کلاس بایگانی شد.")}
              className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              بایگانی
            </button>
          ) : null}
          {!["CANCELLED", "COMPLETED", "ARCHIVED"].includes(st) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm("cancel")}
              className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm text-rose-800"
            >
              لغو کلاس
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm("sessions")}
            className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900"
          >
            تولید مجدد جلسات
          </button>
        </ActionBar>
        {confirm === "publish" ? (
          <div className="mt-4">
            <ConfirmBanner
              title="انتشار کلاس؟"
              message="کلاس از پیش‌نویس به منتشرشده منتقل می‌شود. برای دیده شدن در ثبت‌نام کاربران، بعداً «باز کردن ثبت‌نام» را بزنید."
              confirmLabel="تأیید انتشار"
              busy={busy}
              onCancel={() => setConfirm(null)}
              onConfirm={() => runAction(() => publishCourseClass(classId), "کلاس منتشر شد.")}
            />
          </div>
        ) : null}
        {confirm === "publishOpen" ? (
          <div className="mt-4">
            <ConfirmBanner
              title="انتشار و باز کردن ثبت‌نام؟"
              message="کلاس منتشر می‌شود و بلافاصله در «کلاس‌های مجموعه» برای ثبت‌نام کاربران دیده می‌شود."
              confirmLabel="تأیید"
              busy={busy}
              onCancel={() => setConfirm(null)}
              onConfirm={() =>
                runAction(async () => {
                  await publishCourseClass(classId);
                  await openClassRegistration(classId);
                }, "ثبت‌نام کلاس باز شد و در مجموعه نمایش داده می‌شود.")
              }
            />
          </div>
        ) : null}
        {confirm === "cancel" ? (
          <div className="mt-4">
            <ConfirmBanner
              title="لغو کلاس؟"
              message="اگر ثبت‌نام فعال/در جریان وجود داشته باشد سرور لغو را رد می‌کند. حذف فیزیکی نیست."
              confirmLabel="تأیید لغو"
              busy={busy}
              onCancel={() => setConfirm(null)}
              onConfirm={() => runAction(() => cancelCourseClass(classId), "کلاس لغو شد.")}
            />
          </div>
        ) : null}
        {confirm === "sessions" ? (
          <div className="mt-4">
            <ConfirmBanner
              title="تولید مجدد جلسات — مخرب"
              message="جلسات فعلی جایگزین می‌شوند. اگر برای جلسات فعلی حضور ثبت شده باشد، سرور جلوی کار را می‌گیرد و هیچ جایگزینی انجام نمی‌شود. تا پاسخ موفق سرور، موفق فرض نکنید."
              confirmLabel="جایگزینی جلسات"
              busy={busy}
              onCancel={() => setConfirm(null)}
              onConfirm={() =>
                runAction(() => generateClassSessions(classId), "جلسات تولید شدند.")
              }
            />
          </div>
        ) : null}
      </DetailSection>

      <OpsTabs tabs={tabs} activeId={tab} onChange={setTab} />

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <DetailSection title="اطلاعات کلاس">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">مربی</dt>
                  <dd>
                    {instructorName || (
                      <span className="font-mono text-xs">{courseClass.instructorId}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">قیمت</dt>
                  <dd>{formatIrr(courseClass.price)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">بازه</dt>
                  <dd>
                    {formatDateFa(courseClass.startDate)} – {formatDateFa(courseClass.endDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">روزها / ساعت</dt>
                  <dd>
                    {formatDaysOfWeek(courseClass.daysOfWeek)} · {courseClass.startTime}–
                    {courseClass.endTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">منطقه زمانی</dt>
                  <dd>{courseClass.timezone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">تعداد جلسات برنامه‌ریزی‌شده</dt>
                  <dd>{Number(courseClass.totalSessions || 0).toLocaleString("fa-IR")}</dd>
                </div>
              </dl>
            </DetailSection>

            <DetailSection title="ظرفیت">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">ظرفیت کل</dt>
                  <dd className="text-lg font-bold">
                    {Number(capacity?.capacity ?? courseClass.capacity ?? 0).toLocaleString("fa-IR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">تأییدشده</dt>
                  <dd className="text-lg font-bold">
                    {Number(capacity?.confirmed ?? courseClass.confirmedCount ?? 0).toLocaleString(
                      "fa-IR",
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">رزرو موقت</dt>
                  <dd>
                    {Number(capacity?.held ?? courseClass.heldCount ?? 0).toLocaleString("fa-IR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">آزاد</dt>
                  <dd>
                    {Number(capacity?.available ?? courseClass.availableSeats ?? 0).toLocaleString(
                      "fa-IR",
                    )}
                  </dd>
                </div>
              </dl>
            </DetailSection>
          </div>

          {schedule ? (
            <DetailSection title="برنامه">
              <p className="text-sm text-slate-600">
                {formatDaysOfWeek(schedule.daysOfWeek)} · {schedule.startTime}–{schedule.endTime} ·{" "}
                {schedule.timezone}
              </p>
            </DetailSection>
          ) : null}
        </div>
      ) : null}

      {tab === "sessions" ? (
        <DetailSection
          title="جلسات"
          hint={`${Number(sessions.length).toLocaleString("fa-IR")} جلسه · ویرایش تک‌جلسه در سرور پشتیبانی نمی‌شود`}
        >
          {sessions.length === 0 ? (
            <EmptyState
              title="جلسه‌ای ثبت نشده."
              description="با «تولید مجدد جلسات» بر اساس برنامه کلاس ساخته می‌شوند (عملیات مخرب)."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">تاریخ</th>
                    <th className="px-3 py-2">ساعت</th>
                    <th className="px-3 py-2">وضعیت</th>
                    <th className="px-3 py-2">حضور</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{Number(s.sessionNumber).toLocaleString("fa-IR")}</td>
                      <td className="px-3 py-2">{formatDateFa(s.date)}</td>
                      <td className="px-3 py-2">
                        {s.startTime}–{s.endTime}
                      </td>
                      <td className="px-3 py-2">{SESSION_STATUS_LABELS[s.status] || s.status}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/admin/attendance?classId=${classId}&sessionId=${s.id}`}
                          className="text-xs text-cyan-700 hover:underline"
                        >
                          ثبت
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSection>
      ) : null}

      {tab === "participants" ? (
        <DetailSection
          title="فهرست شرکت‌کنندگان"
          hint={`${Number(roster.length).toLocaleString("fa-IR")} نفر · جستجوی محلی`}
        >
          {rosterError ? <p className="mb-3 text-sm text-amber-800">{rosterError}</p> : null}
          {!rosterError && roster.length === 0 ? (
            <EmptyState title="فهرست شرکت‌کنندگان خالی است." />
          ) : null}
          {roster.length > 0 ? (
            <>
              <input
                value={rosterQ}
                onChange={(e) => setRosterQ(e.target.value)}
                placeholder="جستجو در نتایج بارگذاری‌شده…"
                className="mb-3 w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2">نام</th>
                      <th className="px-3 py-2">وضعیت ثبت‌نام</th>
                      <th className="px-3 py-2">پیوندها</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((r) => (
                      <tr key={r.participantId || r.enrollmentId} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">
                          {r.participantId ? (
                            <Link
                              to={`/admin/participants/${r.participantId}`}
                              className="text-cyan-800 hover:underline"
                            >
                              {`${r.firstName || ""} ${r.lastName || ""}`.trim() || r.participantId}
                            </Link>
                          ) : (
                            `${r.firstName || ""} ${r.lastName || ""}`.trim() || "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.enrollmentId ? (
                            <Link
                              to={`/admin/enrollments/${r.enrollmentId}`}
                              className="text-cyan-700 hover:underline"
                            >
                              {ENROLLMENT_STATUS_LABELS[r.enrollmentStatus] ||
                                r.enrollmentStatus ||
                                "—"}
                            </Link>
                          ) : (
                            ENROLLMENT_STATUS_LABELS[r.enrollmentStatus] ||
                            r.enrollmentStatus ||
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.participantId ? (
                            <Link
                              to={`/admin/attendance?classId=${classId}&participantId=${r.participantId}`}
                              className="text-cyan-700 hover:underline"
                            >
                              حضور
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </DetailSection>
      ) : null}

      {tab === "attendance" ? (
        <div className="space-y-4">
          <DetailSection
            title="حضور و غیاب"
            hint="ثبت و ویرایش حضور در صفحهٔ اختصاصی ادمین انجام می‌شود."
            actions={
              <Link
                to={`/admin/attendance?classId=${classId}`}
                className="rounded-xl bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600"
              >
                باز کردن حضور و غیاب این کلاس
              </Link>
            }
          >
            <p className="text-sm text-slate-600">
              برای ثبت وضعیت هر جلسه، از پیوندهای زیر استفاده کنید یا صفحهٔ حضور و غیاب را با فیلتر این
              کلاس باز کنید.
            </p>
          </DetailSection>

          <DetailSection
            title="جلسات → حضور"
            hint={
              sessions.length === 0
                ? "جلسه‌ای برای پیوند عمیق وجود ندارد."
                : `${Number(sessions.length).toLocaleString("fa-IR")} جلسه`
            }
          >
            {sessions.length === 0 ? (
              <EmptyState title="جلسه‌ای ثبت نشده." />
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span>
                      جلسه {Number(s.sessionNumber).toLocaleString("fa-IR")} · {formatDateFa(s.date)} ·{" "}
                      {s.startTime}–{s.endTime}
                      <span className="mr-2 text-xs text-slate-400">
                        {SESSION_STATUS_LABELS[s.status] || s.status}
                      </span>
                    </span>
                    <Link
                      to={`/admin/attendance?classId=${classId}&sessionId=${s.id}`}
                      className="text-cyan-700 hover:underline"
                    >
                      ثبت حضور
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DetailSection>
        </div>
      ) : null}

      {tab === "links" ? (
        <DetailSection title="پیوندهای مرتبط" hint="میان‌بر به صفحات عملیاتی فیلترشده با این کلاس">
          <ActionBar>
            <Link
              to={`/admin/payments?classId=${classId}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-cyan-900 hover:bg-cyan-50"
            >
              پرداخت‌های این کلاس
            </Link>
            <Link
              to="/admin/reports?tab=enrollments"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-cyan-900 hover:bg-cyan-50"
            >
              گزارش ثبت‌نام‌ها
            </Link>
            <Link
              to={`/admin/courses/${courseClass.courseTemplateId}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-cyan-900 hover:bg-cyan-50"
            >
              قالب دوره
            </Link>
            <Link
              to={`/admin/classes/${classId}/edit`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-cyan-900 hover:bg-cyan-50"
            >
              ویرایش کلاس
            </Link>
            <Link
              to={`/admin/attendance?classId=${classId}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-cyan-900 hover:bg-cyan-50"
            >
              حضور و غیاب
            </Link>
          </ActionBar>
        </DetailSection>
      ) : null}
    </div>
  );
}
