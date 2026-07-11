"use client";

import { useEventById } from "@/features/events/api/getEventById";
import { Container } from "@/shared/components/Container";
import { LoadingState } from "@/shared/components/LoadingState";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Ticket, AlertCircle, ArrowLeft } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getEventTitle, resolveImageUrl } from "@/lib/utils";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";

// Temporary setup for event dates (Display only)
// You can add specific event IDs here to override their sale date and event date
const EVENT_SCHEDULE_SETUP: Record<string, { saleDate: string, eventDate: string }> = {
  // Example: 
  // "event-id-here": { saleDate: "2026-07-01T08:00:00Z", eventDate: "2026-07-10T19:00:00Z" }
};

export default function EventDetailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const { data, isLoading, isError, refetch } = useEventById(id as string);

  let content;

  if (!id) {
    content = (
      <Container className="py-20 flex flex-col items-center text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invalid Event ID</h2>
        <p className="text-[#A3A3A3] mb-6">No event ID was provided in the URL.</p>
      </Container>
    );
  } else if (isLoading) {
    content = (
      <Container className="py-20 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingState text="Loading event details..." />
      </Container>
    );
  } else if (isError || !data?.data) {
    content = (
      <Container className="py-20 flex flex-col items-center text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
        <p className="text-[#A3A3A3] mb-6">The event you are looking for does not exist or an error occurred.</p>
        <Button onClick={() => refetch()} variant="outline" className="border-[#2A2A2A] text-white hover:bg-white/5">Try Again</Button>
      </Container>
    );
  } else {
    const event = data.data;
    
    // Apply custom schedule if available, otherwise fallback to default logic
    const customSchedule = EVENT_SCHEDULE_SETUP[event.id];
    
    // Event Date: Custom or match_date from DB
    const eventDate = customSchedule?.eventDate ? new Date(customSchedule.eventDate) : new Date(event.match_date || Date.now());
    
    // Sale Date: Custom or 7 days before eventDate
    const saleDate = customSchedule?.saleDate ? new Date(customSchedule.saleDate) : new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formattedEventDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const formattedSaleDate = saleDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    content = (
      <Container className="py-8">
        <Button 
          variant="ghost" 
          className="mb-8 pl-0 hover:bg-transparent flex items-center gap-2 text-[#A3A3A3] hover:text-white transition-colors" 
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Button>
        
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left Column - Image Card */}
          <div className="w-full lg:w-1/2">
            <div className="w-full aspect-video bg-[#151515] rounded-2xl flex flex-col items-center justify-center border border-[#2A2A2A] shadow-2xl overflow-hidden relative group">
              {event.image_url ? (
                <img 
                  src={resolveImageUrl(event.image_url)} 
                  alt={getEventTitle(event.team_a, event.team_b)} 
                  className="w-full h-full object-cover animate-fade-in group-hover:scale-105 transition-transform duration-500" 
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <span className="text-white font-bold text-7xl opacity-5 absolute select-none">VS</span>
                  <h2 className="text-white font-bold text-3xl md:text-4xl text-center px-6 z-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {getEventTitle(event.team_a, event.team_b)}
                  </h2>
                </>
              )}
            </div>
          </div>
          
          {/* Right Column - Event Info */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <Badge className="w-fit text-xs px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-semibold uppercase tracking-wider">
              {event.status ? event.status : 'UPCOMING'}
            </Badge>
            
            <h1 
              className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {getEventTitle(event.team_a, event.team_b)}
            </h1>
            
            <p className="text-[#A3A3A3] text-base md:text-lg leading-relaxed">
              Join us for this exciting match! Book your tickets now before they sell out. Experience the electrifying atmosphere live at the stadium.
            </p>
            
            {/* Info Cards */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-4 text-[#A3A3A3]">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <div>
                    <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold mr-2">Event Date</span>
                    <span className="text-base font-medium text-white">{formattedEventDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold mr-2">Ticket Sale Date</span>
                    <span className="text-sm font-medium text-white/80">{formattedSaleDate}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-[#A3A3A3]">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold">Venue</span>
                  <span className="text-base font-medium text-white">{event.venue || 'Stadium TBA'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[#A3A3A3]">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold">Starting Price</span>
                  <span className="text-2xl font-bold text-white">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(event.ticket_price?.toString() || '0'))}
                  </span>
                </div>
              </div>
            </div>
            
            {/* CTA Action */}
            <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
              <Button 
                size="lg" 
                className="w-full md:w-auto text-base h-12 px-10 bg-white hover:bg-[#E5E5E5] text-black font-semibold rounded-xl transition-all shadow-lg shadow-white/5 hover:-translate-y-0.5" 
                onClick={() => router.push(`/queue?eventId=${event.id}`)}
              >
                Join Waiting Room
              </Button>
              <p className="text-xs text-[#6B6B6B] mt-3">
                * You will be placed in a virtual queue before entering the booking page to ensure a fair experience.
              </p>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      <Navbar />
      <main className="flex-1 pt-20">
        {content}
      </main>
      <Footer />
    </div>
  );
}
