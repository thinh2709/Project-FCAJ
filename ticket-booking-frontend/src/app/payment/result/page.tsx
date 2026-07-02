import { Suspense } from "react";
import ResultClient from "./ResultClient";
import { Container } from "@/shared/components/Container";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<Container className="py-20 text-center">Loading payment result...</Container>}>
      <ResultClient />
    </Suspense>
  );
}
