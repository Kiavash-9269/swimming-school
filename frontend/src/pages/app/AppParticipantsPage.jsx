import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listParticipants } from "../../features/participants/participantsApi";
import ParticipantCard from "../../features/participants/components/ParticipantCard";
import { userMessageFromParticipantError } from "../../features/participants/participantLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";
import EmptyState from "../../components/Ui/EmptyState";

export default function AppParticipantsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const data = await listParticipants({ signal });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setStatus("ready");
    } catch (err) {
      if (err?.code === "ABORTED") return;
      setErrorMessage(userMessageFromParticipantError(err, "بارگذاری شرکت‌کنندگان ناموفق بود."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">افراد ثبت‌شده</h1>
          <p className="mt-2 text-sm text-slate-600">
            افرادی که با این حساب ثبت‌نام شده‌اند: خود شما، فرزندان یا سایر افراد.
          </p>
        </div>
        <Link
          to="/app/participants/new"
          className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
        >
          افزودن شرکت‌کننده
        </Link>
      </header>

      {status === "loading" ? <SectionLoader label="در حال دریافت…" /> : null}

      {status === "error" ? (
        <ErrorState title="خطا" message={errorMessage} onRetry={() => load()} />
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <EmptyState
          title="هنوز فردی ثبت نکرده‌اید"
          description="برای ثبت‌نام در کلاس می‌توانید اطلاعات فرد را همان لحظه در صفحه ثبت‌نام وارد کنید؛ اینجا برای ویرایش سریع‌تر فهرست شده است."
          actionLabel="افزودن شرکت‌کننده"
          onAction={() => navigate("/app/participants/new")}
        />
      ) : null}

      {status === "ready" && items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ParticipantCard key={p.id} participant={p} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
