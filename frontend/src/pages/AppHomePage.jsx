import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../services/useAuth";

const TILES = [
  {
    to: "/app/courses",
    title: "دوره‌ها و کلاس‌ها",
    description: "فهرست کلاس‌های باز، ظرفیت باقی‌مانده و جزئیات برنامه زمانی.",
    primary: true,
  },
  {
    to: "/app/enrollments",
    title: "ثبت‌نام‌های من",
    description: "وضعیت ثبت‌نام‌ها، نتیجه پرداخت‌ها و فاکتورهای صادرشده.",
  },
  {
    to: "/app/participants",
    title: "افراد ثبت‌شده",
    description: "مشخصات خود، فرزندان و افرادی که از طرف شما ثبت‌نام می‌شوند.",
  },
  {
    to: "/instructor",
    title: "بخش مربیان",
    description: "فقط برای مربیان؛ حضور و غیاب و برنامه کلاس‌ها.",
  },
];

/**
 * Authenticated home — plain-language entry points for a regular member.
 * Admins are sent to the ops panel (they should not land on the member shell).
 */
export default function AppHomePage() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          سلام{user?.firstName ? `، ${user.firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          از بخش‌های زیر می‌توانید ثبت‌نام، افراد خانواده و پرداخت‌های خود را مدیریت کنید.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className={`group rounded-2xl border p-5 shadow-sm transition ${
              tile.primary
                ? "border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-600 sm:col-span-2"
                : "border-slate-200 bg-white hover:border-cyan-300"
            }`}
          >
            <h2
              className={`font-bold ${tile.primary ? "text-white" : "text-slate-900"}`}
            >
              {tile.title}
            </h2>
            <p
              className={`mt-1.5 text-sm ${
                tile.primary ? "text-cyan-50" : "text-slate-600"
              }`}
            >
              {tile.description}
            </p>
            <span
              className={`mt-3 inline-block text-sm ${
                tile.primary ? "text-white group-hover:underline" : "text-cyan-700 group-hover:underline"
              }`}
            >
              رفتن به {tile.title} ←
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/" className="text-cyan-700 hover:underline">
          بازگشت به صفحه اصلی سایت
        </Link>
      </div>
    </div>
  );
}
