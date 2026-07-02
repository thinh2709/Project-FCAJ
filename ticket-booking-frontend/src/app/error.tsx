"use client";

import { useEffect } from "react";
import { Container } from "@/shared/components/Container";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center py-20">
        <Container className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-destructive">500</h1>
          <h2 className="text-2xl font-semibold">Internal Server Error</h2>
          <p className="text-muted-foreground">
            Something went wrong on our end. Please try again later.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Button onClick={() => reset()} variant="default">
              Try Again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Return Home
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
