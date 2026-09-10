import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deactivateParticipant,
  getParticipant,
} from "../../features/participants/participantsApi";
import {
  GENDER_LABELS,
  RELATION_LABELS,
  formatDateFa,
  userMessageFromParticipantError,
} from "../../features/participants/participantLabels";
import { SectionLoader, ButtonSpinner } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import ForbiddenState from "../../components/Ui/ForbiddenState";
import { useToast } from "../../components/feedback/useToast";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export default function AppParticipantDetailPage() {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const validId = OBJECT_ID_RE.test(participantId || "");

  const [participant, setParticipant] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(
    async (signal) => {
      if (!validId) {
        setStatus("error");
        setErrorMessage("شناسه شرکت‌کننده نامعتبر است.");
        return;
      }
      setStatus("loading");
      setForbidden(false);
      setErrorMessage("");
      try {
        const data = await getParticipant(participantId, { signal });
        setParticipant(data);
        setStatus("ready");
      } catch (err) {
        if (err?.code === "ABORTED") return;
        setParticipant(null);
        if (err?.status === 403 || err?.code === "FORBIDDEN") {
          setForbidden(true);
          setStatus("error");
          return;
        }
        setErrorMessage(userMessageFromParticipantError(err));
        setStatus("error");
      }
    },
    [participantId, validId],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function onDeactivate() {
    if (deactivating) return;
    setDeactivating(true);
    try {
      await deactivateParticipant(participantId);
      toast.success("شرکت‌کننده غیرفعال شد.");
      navigate("/app/participants", { replace: true });
    } catch (err) {
      toast.error(userMessageFromParticipantError(err, "غیرفعال‌سازی ناموفق بود."));
      setConfirmDeactivate(false);
    } finally {
      setDeactivating(false);
    }
  }

  if (status === "loading") {
    return <SectionLoader label="در حال دریافت شرکت‌کننده…" />;
  }

  if (forbidden) {
    return (
      <div className="space-y-4">
        <ForbiddenState homeTo="/app/participants" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <ErrorState title="شرکت‌کننده در دسترس نیست" message={errorMessage} onRetry={() => load()} />
        <Link to="/app/participants" className="text-sm text-cyan-700 hover:underline">
          بازگشت به فهرست
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/app/participants" className="text-sm text-cyan-700 hover:underline">
          ← فهرست شرکت‌کنندگان
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {participant.firstName} {participant.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {RELATION_LABELS[participant.relation] || participant.relation}
            </p>
          </div>
          <Link
            to={`/app/participants/${participant.id}/edit`}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            ویرایش
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">اطلاعات</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">جنسیت</dt>
            <dd>{GENDER_LABELS[participant.gender] || participant.gender}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">تاریخ تولد</dt>
            <dd>{formatDateFa(participant.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">سن</dt>
            <dd>{participant.age != null ? participant.age.toLocaleString("fa-IR") : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">موبایل</dt>
            <dd>{participant.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">وضعیت</dt>
            <dd>{participant.isActive ? "فعال" : "غیرفعال"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">تماس اضطراری</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400">نام</dt>
            <dd>{participant.emergencyContact?.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">موبایل</dt>
            <dd>{participant.emergencyContact?.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">نسبت</dt>
            <dd>{participant.emergencyContact?.relationship || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h2 className="font-bold text-slate-900">ماژول‌های بعدی</h2>
        <p className="mt-2 text-sm text-slate-600">
          واجدشرایطی، رزرو، مدارک بیمه/پزشکی و ثبت‌نام‌ها در فازهای بعدی به این صفحه وصل می‌شوند.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <h2 className="font-bold text-rose-900">غیرفعال‌سازی</h2>
        <p className="mt-2 text-sm text-rose-800">
          حذف سخت در سرور وجود ندارد. غیرفعال‌سازی شرکت‌کننده را از فهرست فعال‌ها خارج می‌کند.
          اگر ثبت‌نام فعال داشته باشد سرور آن را رد می‌کند.
        </p>
        {!confirmDeactivate ? (
          <button
            type="button"
            onClick={() => setConfirmDeactivate(true)}
            className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm text-rose-800 hover:bg-rose-100"
          >
            غیرفعال کردن
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-rose-900">
              آیا از غیرفعال‌سازی «{participant.firstName} {participant.lastName}» مطمئن هستید؟
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deactivating}
                onClick={onDeactivate}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm text-white hover:bg-rose-600 disabled:bg-slate-400"
              >
                {deactivating ? <ButtonSpinner /> : null}
                تأیید غیرفعال‌سازی
              </button>
              <button
                type="button"
                disabled={deactivating}
                onClick={() => setConfirmDeactivate(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
