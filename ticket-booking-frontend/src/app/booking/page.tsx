import { Suspense } from "react";
import BookingClient from "./BookingClient";
import { Container } from "@/shared/components/Container";

export default function BookingPage() {
  return (
    <Suspense fallback={<Container className="py-20 text-center">Loading booking system...</Container>}>
      <BookingClient />
    </Suspense>
  );
}
