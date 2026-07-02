"use client";

import { useEventById } from "@/features/events/api/getEventById";
import { Container } from "@/shared/components/Container";
import { LoadingState } from "@/shared/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Ticket, AlertCircle, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getEventTitle, resolveImageUrl } from "@/lib/utils";

export default function EventDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useEventById(id as string);

  if (!id) {
    return (
      <Container className="py-12 flex flex-col items-center text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invalid Event ID</h2>
        <p className="text-muted-foreground mb-6">No event ID was provided in the URL.</p>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container className="py-12">
        <LoadingState text="Loading event details..." />
      </Container>
    );
  }

  if (isError || !data?.data) {
    return (
      <Container className="py-12 flex flex-col items-center text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
        <p className="text-muted-foreground mb-6">The event you are looking for does not exist or an error occurred.</p>
        <Button onClick={() => refetch()} variant="outline">Try Again</Button>
      </Container>
    );
  }

  const event = data.data;
  const date = new Date(event.match_date || Date.now());
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Container className="py-12">
      <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent flex items-center gap-2 text-muted-foreground hover:text-foreground" onClick={() => router.push("/")}>
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Button>
      <div className="flex flex-col md:flex-row gap-10">
        <div className="w-full md:w-1/2">
            <div className="w-full aspect-video bg-secondary rounded-xl flex flex-col items-center justify-center border border-border shadow-sm overflow-hidden relative">
              {event.image_url ? (
                <img src={resolveImageUrl(event.image_url)} alt={getEventTitle(event.team_a, event.team_b)} className="w-full h-full object-cover animate-fade-in" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <span className="text-muted-foreground font-bold text-6xl opacity-10 absolute">VS</span>
                  <h2 className="text-secondary-foreground font-bold text-3xl md:text-4xl text-center px-6 z-10">
                    {getEventTitle(event.team_a, event.team_b)}
                  </h2>
                </>
              )}
            </div>
        </div>
        
        <div className="w-full md:w-1/2 flex flex-col gap-5">
          <Badge className="w-fit text-sm px-3 py-1" variant={event.status === 'upcoming' ? "default" : "secondary"}>
            {event.status ? event.status.toUpperCase() : 'UPCOMING'}
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            {getEventTitle(event.team_a, event.team_b)}
          </h1>
          
          <p className="text-muted-foreground text-lg leading-relaxed">
            Join us for this exciting match! Book your tickets now before they sell out.
          </p>
          
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="bg-secondary p-2 rounded-md"><CalendarDays className="w-5 h-5 text-primary" /></div>
              <span className="text-lg font-medium">{formattedDate}</span>
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="bg-secondary p-2 rounded-md"><MapPin className="w-5 h-5 text-primary" /></div>
              <span className="text-lg font-medium">{event.venue || 'Stadium TBA'}</span>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="bg-secondary p-2 rounded-md"><Ticket className="w-5 h-5 text-primary" /></div>
              <span className="text-2xl font-bold text-primary">
                Từ {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(event.ticket_price?.toString() || '0'))}
              </span>
            </div>
          </div>
          
          <div className="mt-8">
            <Button 
              size="lg" 
              className="w-full md:w-auto text-lg h-14 px-8" 
              onClick={() => router.push(`/queue?eventId=${event.id}`)}
            >
              Join Waiting Room
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center md:text-left">
              You will be placed in a virtual queue before entering the booking page.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
