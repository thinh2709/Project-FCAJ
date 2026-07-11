"use client";

import { useEvents } from "@/features/events/api/getEvents";
import { Container } from "@/shared/components/Container";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";
import { LoadingState } from "@/shared/components/LoadingState";
import { cn, getEventTitle, resolveImageUrl } from "@/lib/utils";
import { ROUTES } from "@/shared/constants/routes";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  ChevronRight,
  Ticket,
  Clock,
} from "lucide-react";

/* ─────────────── helpers ─────────────── */

function formatPrice(price: string | number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(price));
}

function formatDate(dateStr: string, style: "short" | "full" = "short") {
  const d = new Date(dateStr);
  if (style === "short") {
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short" });
}
function formatDay(dateStr: string) {
  return new Date(dateStr).getDate().toString().padStart(2, "0");
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

/* Category detection from event data */
function getCategory(teamA: string, teamB: string | null): string {
  const nameLC = teamA.toLowerCase();
  if (teamB && teamB.trim() && teamB !== "-") return "Football";
  if (
    nameLC.includes("concert") ||
    nameLC.includes("festival") ||
    nameLC.includes("live") ||
    nameLC.includes("tour") ||
    nameLC.includes("k-pop") ||
    nameLC.includes("tâm") ||
    nameLC.includes("tùng")
  )
    return "Concert";
  if (
    nameLC.includes("vba") ||
    nameLC.includes("basketball") ||
    nameLC.includes("tennis")
  )
    return "Sports";
  if (
    nameLC.includes("swan") ||
    nameLC.includes("opera") ||
    nameLC.includes("theatre") ||
    nameLC.includes("ballet")
  )
    return "Theatre";
  if (nameLC.includes("comedy") || nameLC.includes("stand-up")) return "Comedy";
  return "Event";
}

const categoryEmojis: Record<string, string> = {
  Football: "⚽",
  Concert: "🎵",
  Sports: "🏀",
  Theatre: "🎭",
  Comedy: "😂",
  Event: "🎪",
};

/* ─────────────── Fade-in Observer Hook ─────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("animate-in", "fade-in");
            observer.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─────────────── Countdown Hook ─────────────── */
function useCountdown(targetDate: Date) {
  const [diff, setDiff] = useState(targetDate.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(
      () => setDiff(targetDate.getTime() - Date.now()),
      1000
    );
    return () => clearInterval(id);
  }, [targetDate]);
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

/* ─────────────── FadeSection component ─────────────── */
function FadeSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className={cn("opacity-0 translate-y-8 transition-all duration-700 ease-out", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ============================================================ */
/*                        MAIN PAGE                              */
/* ============================================================ */

export default function Home() {
  const { data, isLoading } = useEvents({ page: 1, limit: 12 });
  const events = data?.data ?? [];

  // Featured events for the carousel (first 5 closest upcoming)
  const featuredEvents = events.slice(0, 5);
  const featured = events[0];
  const trendingEvents = events.slice(0, 8);
  const upcomingEvents = events.slice(0, 4);

  // Categories from actual data
  const categories = ["Football", "Concert", "Sports", "Theatre", "Comedy"];
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredTrending = activeCategory
    ? trendingEvents.filter(
        (e) => getCategory(e.team_a, e.team_b) === activeCategory
      )
    : trendingEvents;

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[#0A0A0A]">
        {/* ═══════ HERO ═══════ */}
        <section className="relative min-h-[100vh] flex items-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            {featured?.image_url ? (
              <img
                src={resolveImageUrl(featured.image_url)}
                alt="Hero background"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0A0A0A] to-[#1a1a2e]" />
            )}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/95 via-[#0A0A0A]/70 to-[#0A0A0A]/40" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A0A0A] to-transparent" />

          {/* Content */}
          <Container className="relative z-10 pt-32 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left */}
              <div className="flex flex-col gap-7 max-w-xl">
                <span className="inline-flex items-center gap-2 w-fit px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  World Cup Qualifiers
                </span>
                <h1
                  className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Experience
                  <br />
                  <span className="bg-gradient-to-r from-white to-[#A3A3A3] bg-clip-text text-transparent">
                    Live Football
                  </span>
                </h1>
                <p className="text-lg text-[#A3A3A3] leading-relaxed max-w-md">
                  Discover and book tickets for football matches, concerts and
                  live entertainment around the world.
                </p>
                <div className="flex gap-4 pt-2 flex-wrap">
                  <Link
                    href={featured ? ROUTES.EVENTS.DETAIL(featured.id) : "#trending"}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-[#E5E5E5] transition-all shadow-lg shadow-white/10 hover:-translate-y-0.5"
                  >
                    <Ticket className="w-4 h-4" />
                    Book Tickets
                  </Link>
                  <Link
                    href="#categories"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5"
                  >
                    Explore Events
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Right - Featured card */}
              {featured && (
                <div className="hidden lg:flex justify-center relative">
                  <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src={resolveImageUrl(featured.image_url ?? undefined)}
                      alt={getEventTitle(featured.team_a, featured.team_b)}
                      className="w-full aspect-[3/4] object-cover"
                    />
                  </div>
                  {/* Floating glass card */}
                  <div className="absolute -bottom-6 -left-8 bg-[#151515]/75 backdrop-blur-xl border border-white/8 rounded-2xl p-6 min-w-[260px] shadow-xl">
                    <h3
                      className="text-lg font-semibold mb-4"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {getEventTitle(featured.team_a, featured.team_b)}
                    </h3>
                    <div className="flex flex-col gap-2.5 text-sm text-[#A3A3A3]">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-white" />
                        {formatDate(featured.match_date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-white" />
                        {featured.venue.split(",")[0]}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/6 flex items-center justify-between">
                      <span className="text-xs text-[#6B6B6B]">From</span>
                      <span
                        className="text-lg font-bold text-white"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {formatPrice(featured.ticket_price)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Container>
        </section>

        {/* ═══════ CATEGORIES ═══════ */}
        <section className="py-12" id="categories">
          <Container>
            <FadeSection>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setActiveCategory(activeCategory === cat ? null : cat)
                    }
                    className={cn(
                      "inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 border cursor-pointer",
                      activeCategory === cat
                        ? "bg-white border-white text-black shadow-lg shadow-white/10 -translate-y-0.5"
                        : "bg-[#151515] border-[#2A2A2A] text-white hover:bg-white hover:border-white hover:text-black hover:-translate-y-0.5"
                    )}
                  >
                    <span className="text-lg">
                      {categoryEmojis[cat] || "🎪"}
                    </span>
                    {cat}
                  </button>
                ))}
              </div>
            </FadeSection>
          </Container>
        </section>

        {/* ═══════ TRENDING EVENTS ═══════ */}
        <section className="py-20" id="trending">
          <Container>
            <FadeSection>
              <div className="flex items-end justify-between mb-12 gap-6">
                <div>
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#A3A3A3] mb-2 block">
                    Trending Now
                  </span>
                  <h2
                    className="text-3xl md:text-4xl font-bold tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Trending Events
                  </h2>
                </div>
                <Link
                  href="#"
                  className="text-sm text-[#A3A3A3] hover:text-white flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeSection>

            {isLoading ? (
              <LoadingState text="Loading events..." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTrending.map((event, i) => {
                  const cat = getCategory(event.team_a, event.team_b);
                  return (
                    <FadeSection key={event.id} delay={i * 80}>
                      <Link href={ROUTES.EVENTS.DETAIL(event.id)} className="block group">
                        <div className="bg-[#151515] border border-[#2A2A2A] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/40 hover:border-[#333]">
                          {/* Image */}
                          <div className="aspect-video overflow-hidden relative">
                            {event.image_url ? (
                              <img
                                src={resolveImageUrl(event.image_url)}
                                alt={getEventTitle(event.team_a, event.team_b)}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-white/10 to-transparent flex items-center justify-center">
                                <span className="text-4xl font-bold opacity-10">
                                  VS
                                </span>
                              </div>
                            )}
                            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-semibold tracking-wide uppercase">
                              {cat}
                            </span>
                          </div>
                          {/* Body */}
                          <div className="p-5">
                            <h3
                              className="font-semibold text-[15px] leading-snug mb-3 line-clamp-2"
                              style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              {getEventTitle(event.team_a, event.team_b)}
                            </h3>
                            <div className="flex flex-col gap-2 mb-4">
                              <span className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                                <CalendarDays className="w-3.5 h-3.5 text-[#6B6B6B]" />
                                {formatDate(event.match_date, "full")}
                              </span>
                              <span className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                                <MapPin className="w-3.5 h-3.5 text-[#6B6B6B]" />
                                <span className="truncate">
                                  {event.venue.split(",")[0]}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
                              <div>
                                <span className="text-[11px] text-[#6B6B6B] block">
                                  Starting from
                                </span>
                                <span
                                  className="font-semibold text-sm"
                                  style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                  }}
                                >
                                  {formatPrice(event.ticket_price)}
                                </span>
                              </div>
                              <span className="px-4 py-2 bg-white text-black rounded-lg text-xs font-semibold hover:bg-[#E5E5E5] transition-colors">
                                Book Now
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </FadeSection>
                  );
                })}
              </div>
            )}
          </Container>
        </section>

        {/* ═══════ FEATURED MATCHES ═══════ */}
        {featuredEvents.length > 0 && <FeaturedMatch events={featuredEvents} />}

        {/* ═══════ UPCOMING EVENTS ═══════ */}
        <section className="py-20" id="upcoming">
          <Container>
            <FadeSection>
              <div className="flex items-end justify-between mb-12 gap-6">
                <div>
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#A3A3A3] mb-2 block">
                    Don't Miss Out
                  </span>
                  <h2
                    className="text-3xl md:text-4xl font-bold tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Upcoming Events
                  </h2>
                </div>
              </div>
            </FadeSection>

            <div className="flex flex-col gap-4">
              {upcomingEvents.map((event, i) => (
                <FadeSection key={event.id} delay={i * 60}>
                  <Link
                    href={ROUTES.EVENTS.DETAIL(event.id)}
                    className="group grid grid-cols-[80px_1fr_auto] gap-6 items-center p-5 bg-[#151515] border border-[#2A2A2A] rounded-2xl transition-all duration-300 hover:border-[#333] hover:bg-[#1A1A1A] hover:translate-x-1"
                  >
                    {/* Date */}
                    <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3] block">
                        {formatMonth(event.match_date)}
                      </span>
                      <span
                        className="text-2xl font-bold leading-tight block text-white"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {formatDay(event.match_date)}
                      </span>
                    </div>
                    {/* Info */}
                    <div>
                      <h3
                        className="font-semibold text-base"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {getEventTitle(event.team_a, event.team_b)}
                      </h3>
                      <span className="text-xs text-[#A3A3A3] flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#6B6B6B]" />
                        {event.venue} · {formatTime(event.match_date)}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      <span
                        className="font-semibold text-white whitespace-nowrap"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {formatPrice(event.ticket_price)}
                      </span>
                      <span className="px-5 py-2.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-[#E5E5E5] transition-colors">
                        Book
                      </span>
                    </div>
                  </Link>
                </FadeSection>
              ))}
            </div>

            {events.length > 4 && (
              <div className="mt-10 text-center">
                <Link
                  href="#categories"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5"
                >
                  View All {events.length} Events
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </Container>
        </section>

        {/* ═══════ NEWSLETTER ═══════ */}
        <section className="py-24">
          <Container>
            <FadeSection>
              <div className="text-center max-w-lg mx-auto">
                <h2
                  className="text-3xl md:text-4xl font-bold mb-3"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Stay in the Loop
                </h2>
                <p className="text-[#A3A3A3] mb-9 leading-relaxed">
                  Get notified about the latest events, exclusive presales, and
                  special offers. No spam, only the good stuff.
                </p>
                <form
                  className="flex gap-3 max-w-md mx-auto flex-wrap sm:flex-nowrap"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex-1 h-[52px] px-5 bg-[#151515] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/5 transition-all placeholder:text-[#6B6B6B]"
                  />
                  <button
                    type="submit"
                    className="h-[52px] px-8 bg-white text-black rounded-xl font-semibold text-sm hover:bg-[#E5E5E5] transition-all shadow-lg shadow-white/5"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </FadeSection>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ═══════════════ Featured Match Component ═══════════════ */

function FeaturedMatch({ events }: { events: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!events || events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events]);

  const event = events[currentIndex];
  const countdown = useCountdown(event ? new Date(event.match_date) : new Date());

  if (!event) return null;

  return (
    <section className="py-20">
      <Container>
        <FadeSection>
          <div className="relative rounded-2xl overflow-hidden min-h-[400px] flex items-center transition-all duration-700">
            {/* BG */}
            <div className="absolute inset-0 transition-opacity duration-700">
              <img
                src={resolveImageUrl(event.image_url)}
                alt="Featured"
                className="w-full h-full object-cover animate-fade-in"
                key={event.id}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/95 via-[#0A0A0A]/70 to-[#0A0A0A]/40" />

            {/* Content */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between w-full gap-10 p-10 lg:p-16">
              <div key={`content-${event.id}`} className="text-center lg:text-left animate-fade-in">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold tracking-widest uppercase mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Featured Match
                </span>
                <h2
                  className="text-3xl lg:text-5xl font-bold my-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {event.team_a}{" "}
                  <span className="text-[#A3A3A3]">vs</span>{" "}
                  {event.team_b || "TBD"}
                </h2>
                <div className="flex gap-6 text-sm text-[#A3A3A3] mb-8 justify-center lg:justify-start flex-wrap">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-white" />
                    {formatDate(event.match_date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white" />
                    {formatTime(event.match_date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white" />
                    {event.venue.split(",")[0]}
                  </span>
                </div>
                <Link
                  href={ROUTES.EVENTS.DETAIL(event.id)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-[#E5E5E5] transition-all shadow-lg shadow-white/10"
                >
                  Buy Ticket
                  <ChevronRight className="w-4 h-4" />
                </Link>
                
                {/* Dots Indicator */}
                {events.length > 1 && (
                  <div className="flex gap-2 mt-8 justify-center lg:justify-start">
                    {events.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentIndex ? "bg-white w-6" : "bg-white/30 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Countdown */}
              <div className="flex flex-col items-center lg:items-end gap-2">
                <span className="text-xs font-semibold tracking-widest uppercase text-[#A3A3A3] mb-2">Event Starts In</span>
                <div className="flex gap-4 items-center">
                  {(
                    [
                      ["days", countdown.days],
                      ["hours", countdown.hours],
                      ["mins", countdown.mins],
                      ["secs", countdown.secs],
                    ] as const
                  ).map(([label, val], i) => (
                    <div key={label} className="flex items-center gap-4">
                      <div className="text-center min-w-[72px]">
                        <span
                          className="block text-4xl font-bold py-4 px-2 bg-white/4 border border-[#2A2A2A] rounded-xl text-white"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {String(val).padStart(2, "0")}
                        </span>
                        <span className="text-[11px] uppercase tracking-widest text-[#6B6B6B] mt-2 block">
                          {label}
                        </span>
                      </div>
                      {i < 3 && (
                        <span
                          className="text-2xl text-[#6B6B6B] pb-5"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          :
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeSection>
      </Container>
    </section>
  );
}
