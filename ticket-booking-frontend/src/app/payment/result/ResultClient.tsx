"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container } from "@/shared/components/Container";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cancelBooking } from "@/features/booking/api/bookingApi";
import { checkPaymentStatus } from "@/features/payment/api/paymentApi";

export default function ResultClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  
  const resultCode = searchParams.get("resultCode");
  const orderId = searchParams.get("orderId");
  const message = searchParams.get("message") || searchParams.get("localMessage");

  const bookingId = orderId ? orderId.split("_")[0] : null;

  useEffect(() => {
    const handleResult = async () => {
      // MoMo response code 0 means success
      if (resultCode === "0" && bookingId) {
        try {
          const statusResult = await checkPaymentStatus(bookingId, orderId || undefined);
          if (statusResult.paymentStatus === 'paid' || statusResult.bookingStatus === 'confirmed') {
            setStatus("success");
          } else {
            // It should be paid, but backend didn't confirm even after active query
            console.error("Backend did not confirm payment:", statusResult);
            setStatus("error");
          }
        } catch (err) {
          console.error("Failed to verify payment with backend:", err);
          setStatus("error");
        }
      } else if (resultCode) {
        setStatus("error");
        // Automatically release tickets if payment failed/cancelled
        if (bookingId) {
          try {
            await cancelBooking(bookingId);
          } catch (err) {
            console.error("Failed to cancel booking automatically:", err);
          }
        }
      }
    };
    handleResult();
  }, [resultCode, bookingId, orderId]);

  if (status === "loading") {
    return (
      <Container className="py-32 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-2xl font-bold">Verifying Payment...</h2>
        <p className="text-muted-foreground mt-2">Please wait while we confirm your transaction.</p>
      </Container>
    );
  }

  return (
    <Container className="py-20 flex justify-center min-h-[70vh] items-center">
      <div className="w-full max-w-lg bg-card p-10 rounded-2xl border border-border shadow-2xl text-center">
        {status === "success" ? (
          <>
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-extrabold mb-4">Payment Successful!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Thank you for your purchase. We have sent your e-ticket and receipt to your email address.
            </p>
            <div className="bg-secondary/50 p-4 rounded-lg mb-8 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono font-medium">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-500 font-bold">PAID</span>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={() => router.push("/my-tickets")}>
              View My Tickets
            </Button>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="text-3xl font-extrabold mb-4">Payment Failed</h1>
            <p className="text-lg text-muted-foreground mb-6">
              {message || "We could not process your payment. Your tickets have been automatically released."}
            </p>
            <div className="bg-secondary/50 p-4 rounded-lg mb-8 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono font-medium">{orderId || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Error Code</span>
                <span className="text-destructive font-bold">{resultCode}</span>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={() => router.push("/")}>
              Try Again
            </Button>
          </>
        )}
      </div>
    </Container>
  );
}
