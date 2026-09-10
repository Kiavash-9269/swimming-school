import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  submitPaymentCallback,
  getPayment,
  readCheckoutContext,
  clearCheckoutContext,
} from "../../features/enrollments/enrollmentsApi";
import {
  parsePaymentReturnQuery,
  userMessageFromEnrollmentError,
} from "../../features/enrollments/enrollmentLabels";
import { SectionLoader } from "../../components/Ui/Loading";
import ErrorState from "../../components/Ui/ErrorState";

/**
 * Gateway return landing — never treats query params as payment success alone.
 * Calls POST /enrollments/payments/callback then navigates to payment result.
 */
export default function AppPaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("در حال تأیید پرداخت از سرور…");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const ac = new AbortController();

    (async () => {
      const parsed = parsePaymentReturnQuery(searchParams);
      const stored = readCheckoutContext();

      const paymentId = parsed.paymentId || stored?.paymentId || null;
      const authority = parsed.authority || stored?.authority || null;

      if (!paymentId || !/^[a-f\d]{24}$/i.test(paymentId)) {
        setStatus("error");
        setMessage(
          "شناسه پرداخت یافت نشد. پس از بازگشت از درگاه، اگر صفحه را تازه کرده‌اید ممکن است زمینه محلی از بین رفته باشد.",
        );
        return;
      }

      try {
        const result = await submitPaymentCallback(
          {
            paymentId,
            success: parsed.intentSuccess,
            authority: authority || undefined,
            providerRef: authority || undefined,
          },
          { signal: ac.signal },
        );

        clearCheckoutContext();
        const enrollmentStatus = result?.enrollment?.status;
        const paymentStatus = result?.payment?.status;

        navigate(`/app/payments/${paymentId}/result`, {
          replace: true,
          state: {
            fromCallback: true,
            alreadyProcessed: Boolean(result?.alreadyProcessed),
            enrollmentStatus,
            paymentStatus,
            enrollmentId: result?.enrollment?.id || null,
          },
        });
      } catch (err) {
        if (err?.code === "ABORTED") return;

        // Still try to show authoritative payment status when possible
        try {
          const payment = await getPayment(paymentId, { signal: ac.signal });
          clearCheckoutContext();
          navigate(`/app/payments/${paymentId}/result`, {
            replace: true,
            state: {
              fromCallback: true,
              callbackError: userMessageFromEnrollmentError(err),
              paymentStatus: payment?.status,
              enrollmentId: payment?.enrollmentId || null,
            },
          });
          return;
        } catch {
          // fall through
        }

        setStatus("error");
        setMessage(userMessageFromEnrollmentError(err, "تأیید پرداخت ناموفق بود."));
      }
    })();

    return () => ac.abort();
  }, [navigate, searchParams]);

  if (status === "processing") {
    return <SectionLoader label={message} />;
  }

  return (
    <div className="space-y-4">
      <ErrorState title="نتیجه پرداخت نامشخص" message={message} />
      <Link to="/app/courses" className="text-sm text-cyan-700 hover:underline">
        بازگشت به کلاس‌ها
      </Link>
    </div>
  );
}
