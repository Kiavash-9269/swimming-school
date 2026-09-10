import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listInstructors,
  createInstructor,
  updateInstructor,
} from "../../features/courses/coursesApi";
import { inputClass, userMessageFromApiError } from "../../features/courses/courseLabels";
import { Field, StatusPill, AdminPageHeader } from "../../features/courses/components/AdminCourseUi";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

/**
 * ADMIN instructors — GET/POST/PATCH (no hard DELETE).
 * Product rule: deactivate = soft-delete (hidden from default list; restore via «نمایش حذف‌شده‌ها»).
 */
export default function AdminInstructorsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", bio: "", userId: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", bio: "", userId: "", isActive: true });

  const load = useCallback(
    async (signal) => {
      setStatus("loading");
      setForbidden(false);
      try {
        const data = await listInstructors({
          activeOnly: includeInactive ? false : true,
          signal,
        });
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromApiError(err, "بارگذاری مربیان ناموفق بود."));
        setStatus("error");
      }
    },
    [includeInactive],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2 || saving) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        isActive: true,
      };
      const manualUserId = form.userId.trim();
      if (manualUserId) {
        if (!/^[a-f\d]{24}$/i.test(manualUserId)) {
          toast.error("شناسه کاربر باید ۲۴ کاراکتر باشد. برای اتصال با شماره، فقط فیلد تلفن را پر کنید و شناسه را خالی بگذارید.");
          return;
        }
        body.userId = manualUserId;
      }
      await createInstructor(body);
      toast.success("مربی ایجاد شد.");
      setForm({ name: "", phone: "", bio: "", userId: "" });
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "ایجاد مربی ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      name: row.name || "",
      phone: row.phone || "",
      bio: row.bio || "",
      userId: row.userId || "",
      isActive: row.isActive !== false,
    });
  }

  async function onSaveEdit(e) {
    e.preventDefault();
    if (!editingId || saving) return;
    setSaving(true);
    try {
      const body = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        bio: editForm.bio.trim(),
        isActive: editForm.isActive,
      };
      const manualUserId = editForm.userId.trim();
      if (!manualUserId) {
        body.userId = null;
      } else if (!/^[a-f\d]{24}$/i.test(manualUserId)) {
        toast.error("شناسه کاربر نامعتبر است. برای اتصال با شماره فقط تلفن را ذخیره کنید و شناسه را خالی بگذارید.");
        setSaving(false);
        return;
      } else {
        body.userId = manualUserId;
      }
      await updateInstructor(editingId, body);
      toast.success("مربی به‌روزرسانی شد.");
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "به‌روزرسانی مربی ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  async function softDelete(row) {
    if (saving || !row.isActive) return;
    if (!window.confirm(`حذف مربی «${row.name}»؟ از فهرست اصلی حذف می‌شود و فضای مربی بسته می‌شود.`)) {
      return;
    }
    setSaving(true);
    try {
      await updateInstructor(row.id, { isActive: false });
      toast.success("مربی حذف شد.");
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "حذف مربی ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  async function restoreInstructor(row) {
    if (saving || row.isActive) return;
    setSaving(true);
    try {
      await updateInstructor(row.id, { isActive: true });
      toast.success("مربی بازیابی شد.");
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "بازیابی مربی ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  async function unlinkUser(row) {
    if (saving || !row.userId) return;
    setSaving(true);
    try {
      await updateInstructor(row.id, { userId: null });
      toast.success("لینک کاربر قطع شد.");
      await load();
    } catch (err) {
      toast.error(userMessageFromApiError(err, "قطع لینک ناموفق بود."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backTo="/admin"
        backLabel="← مرکز عملیات"
        title="مربیان"
        description={
          <>
            پروفایل مربی جدا از نقش ورود است. حذف مربی نرم است (از فهرست مخفی می‌شود).{" "}
            <Link to="/instructor" className="text-cyan-700 hover:underline">
              فضای مربی
            </Link>
          </>
        }
      />

      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 text-sm text-cyan-950">
        <p className="font-bold">چطور فضای مربی برای فرد باز می‌شود؟</p>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-relaxed">
          <li>
            شماره موبایل مربی را دقیقاً همان شماره‌ای بگذارید که با آن ثبت‌نام/ورود می‌کند (مثلاً
            ۰۹۱۲…).
          </li>
          <li>
            اگر آن شماره قبلاً حساب ساخته باشد، با ذخیره مربی اتصال خودکار انجام می‌شود و وضعیت
            «لینک‌شده» می‌شود.
          </li>
          <li>
            اگر هنوز ثبت‌نام نکرده، بعد از ثبت‌نام یا ورود بعدی با همان شماره، فضای مربی باز می‌شود.
          </li>
          <li>فقط وارد کردن شماره بدون ساخت حساب کاربری کافی نیست؛ باید یک بار وارد سیستم شود.</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
        <p className="font-bold">حذف مربی یعنی چه؟</p>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-relaxed">
          <li>مربی از فهرست اصلی حذف می‌شود (مثل حذف).</li>
          <li>فضای مربی برای کاربر لینک‌شده بسته می‌شود.</li>
          <li>دسترسی به کلاس‌هایش قطع می‌شود؛ خود کلاس‌ها می‌مانند و می‌توانید مربی دیگری بگذارید.</li>
          <li>از «نمایش حذف‌شده‌ها» می‌توانید بازیابی کنید — حذف دائمی از سرور وجود ندارد.</li>
        </ul>
      </div>

      <form onSubmit={onCreate} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">مربی جدید</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام">
            <input
              required
              minLength={2}
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field
            label="تلفن همراه (برای اتصال فضای مربی)"
            hint="همان شماره‌ای که مربی با آن وارد حساب می‌شود."
          >
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="0912xxxxxxx"
              inputMode="tel"
            />
          </Field>
        </div>
        <Field
          label="شناسه کاربر (اختیاری — معمولاً لازم نیست)"
          hint="اگر شماره را درست وارد کنید، اتصال خودکار انجام می‌شود. این فیلد فقط برای اتصال دستی است."
        >
          <input
            className={`${inputClass} font-mono text-xs`}
            value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value.trim() }))}
            placeholder="خالی بگذارید — اتصال با شماره تلفن خودکار است"
          />
        </Field>
        <Field label="بیو">
          <textarea
            className={inputClass}
            rows={2}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "در حال ایجاد…" : "ایجاد مربی"}
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
        />
        نمایش حذف‌شده‌ها
      </label>

      {forbidden ? <ForbiddenState title="دسترسی مجاز نیست" message="فقط ادمین." /> : null}
      {!forbidden && status === "loading" ? <SectionLoader label="در حال بارگذاری مربیان…" /> : null}
      {!forbidden && status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}
      {!forbidden && status === "ready" && items.length === 0 ? (
        <EmptyState title="مربی‌ای برای نمایش نیست." />
      ) : null}

      {!forbidden && status === "ready" && items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">تلفن</th>
                <th className="px-3 py-2">لینک ورود</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-medium" colSpan={editingId === i.id ? 5 : 1}>
                    {editingId === i.id ? (
                      <form onSubmit={onSaveEdit} className="space-y-2 py-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className={inputClass}
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            required
                            minLength={2}
                          />
                          <input
                            className={inputClass}
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                        <input
                          className={`${inputClass} font-mono text-xs`}
                          value={editForm.userId}
                          onChange={(e) => setEditForm((f) => ({ ...f, userId: e.target.value.trim() }))}
                          placeholder="شناسه کاربر یا خالی برای قطع لینک"
                        />
                        <textarea
                          className={inputClass}
                          rows={2}
                          value={editForm.bio}
                          onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                          >
                            ذخیره
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                          >
                            انصراف
                          </button>
                        </div>
                      </form>
                    ) : (
                      i.name
                    )}
                  </td>
                  {editingId === i.id ? null : (
                    <>
                      <td className="px-3 py-2">{i.phone || "—"}</td>
                      <td className="px-3 py-2">
                        {i.userId ? (
                          <span className="inline-flex flex-col gap-0.5">
                            <StatusPill tone="info">لینک‌شده</StatusPill>
                            <span className="font-mono text-[10px] text-slate-400">{i.userId}</span>
                          </span>
                        ) : (
                          <StatusPill tone="warn">بدون لینک</StatusPill>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill tone={i.isActive ? "success" : "neutral"}>
                          {i.isActive ? "فعال" : "حذف‌شده"}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {i.isActive ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(i)}
                                className="text-xs text-cyan-700 hover:underline"
                              >
                                ویرایش
                              </button>
                              {i.userId ? (
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => unlinkUser(i)}
                                  className="text-xs text-amber-800 hover:underline disabled:opacity-40"
                                >
                                  قطع لینک
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => softDelete(i)}
                                className="text-xs text-rose-700 hover:underline disabled:opacity-40"
                              >
                                حذف
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => restoreInstructor(i)}
                              className="text-xs text-emerald-700 hover:underline disabled:opacity-40"
                            >
                              بازیابی
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
