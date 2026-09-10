import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReportsDashboard } from "../features/reports/reportsApi";
import { formatIrrAmount, userMessageFromReportError } from "../features/reports/reportLabels";
import { AdminPageHeader } from "../features/courses/components/AdminCourseUi";
import { MetricTile, DetailSection, ActionBar } from "../features/ops/OpsUi";
import { SectionLoader } from "../components/Ui/Loading";
import ErrorState from "../components/Ui/ErrorState";

/**
 * Admin operations home — real dashboard counts + prioritized next actions.
 * No invented KPIs.
 */
export default function AdminHomePage() {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const data = await getReportsDashboard({ signal });
      setDashboard(data);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(userMessageFromReportError(err, "بارگذاری خلاصه عملیاتی ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") return <SectionLoader label="در حال آماده‌سازی مرکز عملیات…" />;
  if (status === "error") {
    return <ErrorState title="خطا در بارگذاری" message={errorMessage} onRetry={() => load()} />;
  }

  const d = dashboard || {};
  const pendingDocs =
    Number(d.pendingInsuranceDocuments || 0) + Number(d.pendingMedicalDocuments || 0);
  const pendingCompliance = Number(d.pendingCompliance || 0);
  const waitlist = Number(d.waitlistCount || 0);

  const priorities = [];
  if (pendingDocs > 0) {
    priorities.push({
      to: "/admin/documents/pending",
      title: "بررسی مدارک در صف",
      hint: `${pendingDocs.toLocaleString("fa-IR")} مدرک بیمه/پزشکی`,
    });
  }
  if (pendingCompliance > 0) {
    priorities.push({
      to: "/admin/reports?tab=compliance",
      title: "ثبت‌نام در انتظار مدارک",
      hint: `${pendingCompliance.toLocaleString("fa-IR")} ثبت‌نام`,
    });
  }
  if (waitlist > 0) {
    priorities.push({
      to: "/admin/reports?tab=waitlist",
      title: "لیست انتظار",
      hint: `${waitlist.toLocaleString("fa-IR")} مورد`,
    });
  }
  priorities.push({
    to: "/admin/classes?status=REGISTRATION_OPEN",
    title: "کلاس‌های با ثبت‌نام باز",
    hint: "مدیریت ظرفیت و بستن ثبت‌نام",
  });
  priorities.push({
    to: "/admin/attendance",
    title: "حضور و غیاب جلسات",
    hint: "ثبت حاضر/غایب شاگردان توسط ادمین",
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="مرکز عملیات"
        description="اعداد از گزارش سرور است. تمرکز روی اقدام بعدی، نه داشبورد تزئینی."
      />

      <DetailSection title="الان چه کار کنم؟" hint="اولویت‌های پیشنهادی بر اساس اعداد واقعی داشبورد">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {priorities.map((p) => (
            <Link
              key={p.to + p.title}
              to={p.to}
              className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4 transition hover:border-cyan-400 hover:bg-cyan-50"
            >
              <p className="font-bold text-slate-900">{p.title}</p>
              <p className="mt-1 text-xs text-slate-600">{p.hint}</p>
            </Link>
          ))}
        </div>
      </DetailSection>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-700">وضعیت فعلی (واقعی)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="کلاس‌های فعال / کل"
            value={`${Number(d.activeClasses || 0).toLocaleString("fa-IR")} / ${Number(d.courses || 0).toLocaleString("fa-IR")}`}
            to="/admin/classes"
          />
          <MetricTile
            label="ثبت‌نام فعال / کل"
            value={`${Number(d.activeEnrollments || 0).toLocaleString("fa-IR")} / ${Number(d.enrollments || 0).toLocaleString("fa-IR")}`}
            to="/admin/reports?tab=enrollments"
          />
          <MetricTile
            label="مدارک در انتظار"
            value={pendingDocs.toLocaleString("fa-IR")}
            to="/admin/documents/pending"
          />
          <MetricTile
            label="درآمد موفق"
            value={formatIrrAmount(d.revenue)}
            hint={`موفق ${Number(d.successfulPayments || 0).toLocaleString("fa-IR")} از ${Number(d.payments || 0).toLocaleString("fa-IR")}`}
            to="/admin/payments"
          />
        </div>
      </section>

      <DetailSection title="میان‌برهای عملیاتی">
        <ActionBar tone="primary">
          <Link to="/admin/courses" className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-cyan-900 border border-cyan-200">
            قالب دوره‌ها
          </Link>
          <Link to="/admin/classes" className="rounded-xl bg-cyan-700 px-3 py-2 text-sm font-medium text-white">
            کلاس‌ها
          </Link>
          <Link to="/admin/instructors" className="rounded-xl bg-white px-3 py-2 text-sm border border-cyan-200 text-cyan-900">
            مربیان
          </Link>
          <Link to="/admin/participants" className="rounded-xl bg-white px-3 py-2 text-sm border border-cyan-200 text-cyan-900">
            شرکت‌کنندگان
          </Link>
          <Link to="/admin/payments" className="rounded-xl bg-white px-3 py-2 text-sm border border-cyan-200 text-cyan-900">
            پرداخت‌ها
          </Link>
          <Link to="/admin/notifications" className="rounded-xl bg-white px-3 py-2 text-sm border border-cyan-200 text-cyan-900">
            اعلان‌ها
          </Link>
          <Link to="/admin/reports" className="rounded-xl bg-white px-3 py-2 text-sm border border-cyan-200 text-cyan-900">
            گزارش‌ها
          </Link>
          <Link to="/instructor" className="rounded-xl bg-white px-3 py-2 text-sm border border-slate-200 text-slate-700">
            فضای مربی
          </Link>
        </ActionBar>
        <p className="mt-3 text-xs text-slate-500">
          دوره = قالب قابل استفاده مجدد · کلاس = نمونه عملیاتی · صف اعلان‌ها از قرارداد واقعی سرور.
        </p>
      </DetailSection>
    </div>
  );
}
