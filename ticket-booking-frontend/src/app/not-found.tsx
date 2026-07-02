import Link from "next/link";
import { Container } from "@/shared/components/Container";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center py-20">
        <Container className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <MapPinOff className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The event or page you are looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            Return Home
          </Link>
        </Container>
      </main>
      <Footer />
    </>
  );
}
