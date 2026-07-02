import { Suspense } from "react";
import QueueClient from "./QueueClient";
import { Container } from "@/shared/components/Container";

export default function QueuePage() {
  return (
    <Suspense fallback={<Container className="py-12"><div className="text-center">Loading queue...</div></Container>}>
      <QueueClient />
    </Suspense>
  );
}
