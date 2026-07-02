import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn, getEventTitle, resolveImageUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Event } from "../types";
import { ROUTES } from "@/shared/constants/routes";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const date = new Date(event.match_date);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="aspect-video w-full bg-muted flex items-center justify-center relative overflow-hidden">
        {event.image_url ? (
          <img src={resolveImageUrl(event.image_url)} alt={getEventTitle(event.team_a, event.team_b)} className="w-full h-full object-cover animate-fade-in" />
        ) : (
          <>
            {/* Placeholder for event image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
            <span className="text-4xl font-bold opacity-10">VS</span>
          </>
        )}
      </div>
      
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <Badge variant={event.status === 'upcoming' ? "default" : "secondary"} className="mb-2">
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
          <span className="text-sm font-medium text-primary">
            Từ {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(event.ticket_price?.toString() || '0'))}
          </span>
        </div>
        <h3 className="font-semibold text-xl leading-tight line-clamp-2">
          {getEventTitle(event.team_a, event.team_b)}
        </h3>
      </CardHeader>
      
      <CardContent className="space-y-3 flex-1 pb-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{event.venue}</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Link 
          href={ROUTES.EVENTS.DETAIL(event.id)}
          className={cn(buttonVariants({ variant: "default" }), "w-full")}
          prefetch={false}
        >
          View Event
        </Link>
      </CardFooter>
    </Card>
  );
}
