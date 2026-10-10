import { useCallback, useEffect, useState } from "react";
import { listAdmins, addAdmin, revokeAdmin } from "../../features/admins/adminsApi";
import { inputClass, userMessageFromApiError } from "../../features/courses/courseLabels";
import { Field, StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";
import { useAuth } from "../../services/useAuth";

/**
 * Super-admin only: list / add / revoke admins. The API enforces the same rule (403 for others).
 */
export default function AdminAdminsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(!user?.isSuperAdmin);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", firstName: "", lastName: "" });

  const load = useCallback(async (signal) => {
    setStatus("loading");
    try {
      const data = await listAdmins({ signal });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      if (err?.status === 403) {
        setForbidden(true);
        setStatus("error");
        return;
      }
      setErrorMessage(userMessageFromApiError(err, "بارگذاری مدیران ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!user?.isSuperAdmin) return undefined;
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load, user?.isSuperAdmin]);

  async function onAdd(e) {
    e.preventDefault();
    if (!form.phone.trim() || saving) return;
    setSaving(true);
    try {
      const data = await addAdmin({
        phone: form.phone.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      toast.success(
        data?.created
          ? "ادمین جدید ساخته شد. رمز ورودش همان شماره موبایل است."
          : "این کاربر ادمین شد و با رمز فعلی خودش وارد می‌شود.",
      );
      setForm({ phone: "", firstName: "", lastName: "" });
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "افزودن ادمین ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(row) {
    if (saving || row.isSuperAdmin) return;
    if (!window.confirm(`دسترسی ادمین «${row.firstName} ${row.lastName}» (${row.phone}) برداشته شود؟`)) {
      return;
    }
    setSaving(true);
    try {
      await revokeAdmin(row.id);
      toast.success("دسترسی ادمین برداشته شد.");
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "حذف دسترسی ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return <ForbiddenState title="دسترسی مجاز نیست" message="این بخش فقط برای ادمین اصلی است." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="میز مدیریت"
        title="مدیران"
        description="افزودن یا برداشتن دسترسی ادمین. این بخش فقط برای ادمین اصلی نمایش داده می‌شود."
      />

      <form onSubmit={onAdd} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">افزودن ادمین</h2>
        <ul className="list-disc space-y-1 pr-5 text-xs leading-relaxed text-slate-600">
          <li>اگر این شماره قبلاً در سایت حساب دارد، همان حساب ادمین می‌شود و رمزش تغییر نمی‌کند.</li>
          <li>اگر حساب ندارد، نام و نام خانوادگی را وارد کنید؛ رمز ورود همان شماره موبایل خواهد بود.</li>
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="شماره موبایل">
            <input
              required
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="0912xxxxxxx"
              inputMode="tel"
              dir="ltr"
            />
          </Field>
          <Field label="نام (برای حساب جدید)">
            <input
              className={inputClass}
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </Field>
          <Field label="نام خانوادگی (برای حساب جدید)">
            <input
              className={inputClass}
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "در حال ذخیره…" : "افزودن ادمین"}
        </button>
      </form>

      {status === "loading" ? <SectionLoader label="در حال بارگذاری مدیران…" /> : null}
      {status === "error" ? <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} /> : null}
      {status === "ready" && items.length === 0 ? <EmptyState title="ادمینی برای نمایش نیست." /> : null}

      {status === "ready" && items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">موبایل</th>
                <th className="px-3 py-2">نقش</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{`${a.firstName} ${a.lastName}`}</td>
                  <td className="px-3 py-2" dir="ltr">
                    {a.phone}
                  </td>
                  <td className="px-3 py-2">
                    {a.isSuperAdmin ? (
                      <StatusPill tone="info">ادمین اصلی</StatusPill>
                    ) : (
                      <StatusPill tone="success">ادمین</StatusPill>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.isSuperAdmin ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onRevoke(a)}
                        className="text-xs text-rose-700 hover:underline disabled:opacity-40"
                      >
                        برداشتن دسترسی
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
