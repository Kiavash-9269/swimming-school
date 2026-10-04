import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReportsDashboard } from "../features/reports/reportsApi";
import { formatIrrAmount, userMessageFromReportError } from "../features/reports/reportLabels";
import { MetricTile, DetailSection } from "../features/ops/OpsUi";
import { SectionLoader } from "../components/Ui/Loading";
import ErrorState from "../components/Ui/ErrorState";

/**
 * Admin home — real dashboard counts and the next decisions worth a director's attention.
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
      setErrorMessage(userMessageFromReportError(err, "خلاصه امروز مدرسه بارگذاری نشد."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  if (status === "loading") return <SectionLoader label="در حال چیدن میز مدیریت…" />;
  if (status === "error") {
    return <ErrorState title="میز مدیریت باز نشد" message={errorMessage} onRetry={() => load()} />;
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
      title: "مدارک خانواده‌ها منتظر تأیید شماست",
      hint: `${pendingDocs.toLocaleString("fa-IR")} بیمه‌نامه و گواهی پزشکی در صف بررسی`,
    });
  }
  if (pendingCompliance > 0) {
    priorities.push({
      to: "/admin/reports?tab=compliance",
      title: "ثبت‌نام‌هایی که هنوز کامل نشده‌اند",
      hint: `${pendingCompliance.toLocaleString("fa-IR")} خانواده منتظر نتیجه مدارک است`,
    });
  }
  if (waitlist > 0) {
    priorities.push({
      to: "/admin/reports?tab=waitlist",
      title: "لیست انتظار ظرفیت می‌خواهد",
      hint: `${waitlist.toLocaleString("fa-IR")} نفر چشم‌به‌راه جا در کلاس هستند`,
    });
  }
  priorities.push({
    to: "/admin/classes?status=REGISTRATION_OPEN",
    title: "کلاس‌هایی که هنوز ثبت‌نام می‌پذیرند",
    hint: "ظرفیت را ببینید و در زمان مناسب درِ ثبت‌نام را ببندید",
  });
  priorities.push({
    to: "/admin/attendance",
    title: "حضور امروز را ثبت کنید",
    hint: "حاضر و غایب هر جلسه، با یک تأیید نهایی",
  });

  return (
    <div className="space-y-8">
      <section className="admin-hero">
        <p className="admin-eyebrow">دفتر مدیر</p>
        <h1>میز مدیریت</h1>
        <p>
          امروز مدرسه را از همین‌جا ببینید. عددها واقعی‌اند و هر کارت شما را به تصمیمی می‌برد که
          ارزش توجه دارد: ظرفیت، آرامش خانواده‌ها، و نظم آموزش.
        </p>
        <span className="admin-hero-orb" aria-hidden="true" />
      </section>

      <DetailSection
        title="اولویت‌های امروز"
        hint="از مهم‌ترین کار شروع کنید. بقیه می‌تواند تا بعد از ظهر بماند."
      >
        <div className="admin-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {priorities.map((item, index) => (
            <Link key={item.to + item.title} to={item.to} className="admin-priority">
              <p className="admin-priority-index">
                اولویت {(index + 1).toLocaleString("fa-IR")}
              </p>
              <strong>{item.title}</strong>
              <span>{item.hint}</span>
            </Link>
          ))}
        </div>
      </DetailSection>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-800">نبض مدرسه</h2>
        <div className="admin-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="کلاس‌های در جریان"
            value={`${Number(d.activeClasses || 0).toLocaleString("fa-IR")} از ${Number(d.courses || 0).toLocaleString("fa-IR")}`}
            hint="کلاس‌های منتشرشده، باز، بسته یا در حال برگزاری"
            to="/admin/classes"
          />
          <MetricTile
            label="ثبت‌نام‌های جاری"
            value={`${Number(d.activeEnrollments || 0).toLocaleString("fa-IR")} از ${Number(d.enrollments || 0).toLocaleString("fa-IR")}`}
            hint="شاگردانی که هنوز در مسیر کلاس هستند"
            to="/admin/reports?tab=enrollments"
          />
          <MetricTile
            label="مدارک در انتظار"
            value={pendingDocs.toLocaleString("fa-IR")}
            hint="هر تأیید، یک خانواده را از انتظار خارج می‌کند"
            to="/admin/documents/pending"
          />
          <MetricTile
            label="درآمد تأییدشده"
            value={formatIrrAmount(d.revenue)}
            hint={`${Number(d.successfulPayments || 0).toLocaleString("fa-IR")} پرداخت موفق از ${Number(d.payments || 0).toLocaleString("fa-IR")}`}
            to="/admin/payments"
          />
        </div>
      </section>

      <DetailSection title="سه نگاه مدیر" hint="اگر فقط یک مسیر را امروز باز می‌کنید، یکی از این سه باشد.">
        <div className="grid gap-3 md:grid-cols-3">
          <Link to="/admin/classes" className="admin-priority">
            <p className="admin-priority-index">آموزش</p>
            <strong>کلاس‌ها را زنده نگه دارید</strong>
            <span>دوره الگوست؛ کلاس جایی است که شاگرد واقعاً شنا می‌کند.</span>
          </Link>
          <Link to="/admin/documents/pending" className="admin-priority">
            <p className="admin-priority-index">اعتماد</p>
            <strong>به مدارک پاسخ بدهید</strong>
            <span>تأخیر در بررسی، خانواده را پشت درِ استخر نگه می‌دارد.</span>
          </Link>
          <Link to="/admin/reports" className="admin-priority">
            <p className="admin-priority-index">شفافیت</p>
            <strong>گزارش را مثل یک جلسه هیئت‌مدیره بخوانید</strong>
            <span>ثبت‌نام، درآمد و ظرفیت، بدون حدس و بدون عدد تزئینی.</span>
          </Link>
        </div>
      </DetailSection>
    </div>
  );
}
