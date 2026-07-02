import { Suspense } from "react";
import EventDetailClient from "./EventDetailClient";
import { Container } from "@/shared/components/Container";

export default function EventDetailPage() {
  return (
    <Suspense fallback={<Container className="py-12"><div className="text-center">Loading event...</div></Container>}>
      <EventDetailClient />
    </Suspense>
  );
}
