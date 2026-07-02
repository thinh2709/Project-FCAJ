"use client";

import { useEvents } from "@/features/events/api/getEvents";
import { EventCard } from "@/features/events/components/EventCard";
import { Container } from "@/shared/components/Container";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState } from "@/shared/components/LoadingState";
import { ErrorState } from "@/shared/components/ErrorState";
import { EmptyState } from "@/shared/components/EmptyState";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";
import { CalendarX2 } from "lucide-react";

export default function Home() {
  const { data, isLoading, isError, refetch } = useEvents({ page: 1, limit: 12 });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PageHeader 
          title="Upcoming Events" 
          description="Discover and book tickets for the best concerts, sports, and theater events around the world."
        />
        
        <Container className="py-12">
          {isLoading ? (
            <LoadingState text="Loading events..." />
          ) : isError ? (
            <ErrorState 
              action={
                <button 
                  onClick={() => refetch()} 
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                  Try Again
                </button>
              }
            />
          ) : !data || data.data.length === 0 ? (
            <EmptyState 
              icon={CalendarX2}
              title="No events found"
              description="There are currently no upcoming events. Please check back later."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.data.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
