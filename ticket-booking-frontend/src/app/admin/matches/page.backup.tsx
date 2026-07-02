"use client";

import { useState, useMemo } from "react";
import { useAdminMatches } from "@/features/admin/hooks/useAdmin";
import { LoadingState } from "@/shared/components/LoadingState";
import { ErrorState } from "@/shared/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Event } from "@/features/events/types";
import {
  Plus,
  Edit2,
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Sparkles,
  Star,
  Crown,
  Building,
  Activity,
  Percent,
  Settings,
  Layers,
  Search,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getEventTitle } from "@/lib/utils";

const ZONE_CONFIG = [
  {
    id: "VIP",
    label: "VIP",
    icon: <Crown className="w-4 h-4" />,
    badge: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
    badgeDot: "bg-purple-500",
    progress: "bg-gradient-to-r from-purple-500 to-purple-400",
    cardBorder: "border-purple-200 hover:border-purple-400",
    cardBg: "hover:bg-purple-50/50",
    iconBg: "bg-purple-100 text-purple-600",
    selectedBorder: "border-purple-500 bg-purple-50",
    selectedText: "text-purple-700",
    previewText: "text-purple-600",
  },
  {
    id: "A",
    label: "Zone A",
    icon: <Star className="w-4 h-4" />,
    badge: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    badgeDot: "bg-blue-500",
    progress: "bg-gradient-to-r from-blue-500 to-blue-400",
    cardBorder: "border-blue-200 hover:border-blue-400",
    cardBg: "hover:bg-blue-50/50",
    iconBg: "bg-blue-100 text-blue-600",
    selectedBorder: "border-blue-500 bg-blue-50",
    selectedText: "text-blue-700",
    previewText: "text-blue-600",
  },
  {
    id: "B",
    label: "Zone B",
    icon: <Star className="w-4 h-4" />,
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    badgeDot: "bg-emerald-500",
    progress: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    cardBorder: "border-emerald-200 hover:border-emerald-400",
    cardBg: "hover:bg-emerald-50/50",
    iconBg: "bg-emerald-100 text-emerald-600",
    selectedBorder: "border-emerald-500 bg-emerald-50",
    selectedText: "text-emerald-700",
    previewText: "text-emerald-600",
  },
  {
    id: "C",
    label: "Zone C",
    icon: <Star className="w-4 h-4" />,
    badge: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
    badgeDot: "bg-orange-500",
    progress: "bg-gradient-to-r from-orange-500 to-orange-400",
    cardBorder: "border-orange-200 hover:border-orange-400",
    cardBg: "hover:bg-orange-50/50",
    iconBg: "bg-orange-100 text-orange-600",
    selectedBorder: "border-orange-500 bg-orange-50",
    selectedText: "text-orange-700",
    previewText: "text-orange-600",
  },
  {
    id: "D",
    label: "Zone D",
    icon: <Star className="w-4 h-4" />,
    badge: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
    badgeDot: "bg-slate-400",
    progress: "bg-gradient-to-r from-slate-400 to-slate-300",
    cardBorder: "border-slate-200 hover:border-slate-400",
    cardBg: "hover:bg-slate-50/50",
    iconBg: "bg-slate-100 text-slate-600",
    selectedBorder: "border-slate-500 bg-slate-50",
    selectedText: "text-slate-700",
    previewText: "text-slate-600",
  },
] as const;

// ── Reusable Zone Multiplier Grid ──────────────────────────────────────────────
interface ZoneMultiplierGridProps {
  basePrice: number;
  values: { VIP: number; A: number; B: number; C: number; D: number };
  setters: {
    VIP: (v: number) => void;
    A: (v: number) => void;
    B: (v: number) => void;
    C: (v: number) => void;
    D: (v: number) => void;
  };
  namePrefix: string;
  disabled: boolean;
}

function ZoneMultiplierGrid({ basePrice, values, setters, namePrefix, disabled }: ZoneMultiplierGridProps) {
  return (
    <div className="space-y-3">
      {/* Zone Rows — mobile-first, compact layout */}
      <div className="space-y-2">
        {ZONE_CONFIG.map((zone) => {
          const val = values[zone.id as keyof typeof values];
          const setter = setters[zone.id as keyof typeof setters];
          const price = basePrice * val;

          return (
            <div
              key={zone.id}
              className={`
                flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 bg-card
                transition-all duration-150
                ${zone.cardBorder}
              `}
            >
              {/* Zone badge — compact trên mobile */}
              <div className="shrink-0">
                <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-md sm:rounded-lg text-xs font-bold border ${zone.badge}`}>
                  <span className={zone.iconBg.split(" ")[1]}>{zone.icon}</span>
                  <span className="hidden xs:inline">{zone.label}</span>
                  <span className="inline xs:hidden">{zone.id}</span>
                </span>
              </div>

              {/* Multiplier input */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                <span className="text-xs text-muted-foreground shrink-0">×</span>
                <Input
                  name={`${namePrefix}_${zone.id.toLowerCase()}`}
                  type="number"
                  step="0.1"
                  min="0"
                  value={val}
                  onChange={(e) => setter(Number(e.target.value) || 0)}
                  disabled={disabled}
                  className="w-16 sm:w-20 h-8 sm:h-9 text-center font-mono font-bold text-sm rounded-lg border-border/60"
                />
              </div>

              {/* Price preview */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="text-muted-foreground text-xs sm:text-sm">=</span>
                <span className={`font-extrabold text-xs sm:text-sm font-mono min-w-[70px] sm:min-w-[90px] text-right ${zone.previewText}`}>
                  {price > 0 ? price.toLocaleString("vi-VN") + "đ" : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formula hint — ẩn trên mobile */}
      <p className="text-xs text-muted-foreground text-center hidden sm:block">
        <TrendingUp className="w-3 h-3 inline mr-1 opacity-60" />
        Final price = Base Price × Multiplier — preview cập nhật realtime
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminMatchesPage() {
  const { matches, loading, error, refetch, createMatch, updateMatch, generateTickets } = useAdminMatches();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [createBasePrice, setCreateBasePrice] = useState<number>(0);
  const [createVIP, setCreateVIP] = useState<number>(2.0);
  const [createA, setCreateA] = useState<number>(1.5);
  const [createB, setCreateB] = useState<number>(1.2);
  const [createC, setCreateC] = useState<number>(1.0);
  const [createD, setCreateD] = useState<number>(0.8);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const title = getEventTitle(match.team_a, match.team_b).toLowerCase();
      const venue = match.venue.toLowerCase();
      const query = searchTerm.toLowerCase();
      return title.includes(query) || venue.includes(query);
    });
  }, [matches, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingState text="Loading matches & configurations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          description={error}
          action={
            <Button onClick={refetch} className="shadow-sm rounded-xl">
              Retry Connection
            </Button>
          }
        />
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const zoneMultipliers = {
      VIP: Number(formData.get("multiplier_vip")),
      A: Number(formData.get("multiplier_a")),
      B: Number(formData.get("multiplier_b")),
      C: Number(formData.get("multiplier_c")),
      D: Number(formData.get("multiplier_d")),
    };

    const data = {
      teamA: formData.get("team_a") as string,
      teamB: formData.get("team_b") as string,
      matchDate: new Date(formData.get("match_date") as string).toISOString(),
      venue: formData.get("venue") as string,
      totalTickets: Number(formData.get("total_tickets")),
      ticketPrice: Number(formData.get("ticket_price")),
      zoneMultipliers,
    };

    try {
      await createMatch(data);
      setIsCreateOpen(false);
      setCreateBasePrice(0);
      setCreateVIP(2.0);
      setCreateA(1.5);
      setCreateB(1.2);
      setCreateC(1.0);
      setCreateD(0.8);
    } catch (err) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <TicketIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                  Events
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage matches, pricing strategies, and ticket inventory.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/40">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground">
                {matches.length} event{matches.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">

          {/* ── Toolbar ── */}
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search events or venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-border/70 shadow-sm focus-visible:ring-primary transition-all text-sm"
              />
            </div>

            {/* Create Button */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger render={
                <Button className="h-10 px-5 rounded-xl font-semibold shadow-sm transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md flex items-center gap-2 shrink-0" />
              }>
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </DialogTrigger>

              {/* ── CREATE DIALOG ── */}
              <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/50 shadow-2xl p-0 bg-background">
                {/* Dialog Header */}
                <div className="sticky top-0 z-20 px-6 py-5 border-b border-border/60 bg-card/95 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                        Create New Event
                      </DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                        Configure match details and define the base pricing matrix.
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-5">
                  {/* Card 1 – Event Info */}
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-muted/20">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Building className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Match Information</h3>
                        <p className="text-xs text-muted-foreground">Teams, schedule, venue, and capacity</p>
                      </div>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Host / Team A
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            name="team_a"
                            placeholder="e.g. Real Madrid"
                            required
                            disabled={submitting}
                            className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Guest / Team B
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            name="team_b"
                            placeholder="e.g. Barcelona"
                            required
                            disabled={submitting}
                            className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Date &amp; Time
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            name="match_date"
                            type="datetime-local"
                            required
                            disabled={submitting}
                            className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Venue
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            name="venue"
                            placeholder="e.g. Santiago Bernabeu"
                            required
                            disabled={submitting}
                            className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Total Capacity
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            name="total_tickets"
                            type="number"
                            min="1"
                            placeholder="e.g. 80,000"
                            required
                            disabled={submitting}
                            className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Base Price (VND)
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            name="ticket_price"
                            type="number"
                            min="0"
                            required
                            placeholder="e.g. 200,000"
                            disabled={submitting}
                            onChange={(e) => setCreateBasePrice(Number(e.target.value) || 0)}
                            className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 – Pricing */}
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-muted/20">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Percent className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Ticket Pricing Matrix</h3>
                        <p className="text-xs text-muted-foreground">Set multipliers per zone — prices update in real-time</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <ZoneMultiplierGrid
                        basePrice={createBasePrice}
                        values={{ VIP: createVIP, A: createA, B: createB, C: createC, D: createD }}
                        setters={{ VIP: setCreateVIP, A: setCreateA, B: setCreateB, C: setCreateC, D: setCreateD }}
                        namePrefix="multiplier"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 pt-1">
                    <DialogTrigger render={
                      <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl font-medium text-muted-foreground hover:text-foreground" />
                    }>
                      Cancel
                    </DialogTrigger>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-11 px-8 rounded-xl font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Create Event
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* ── Table / Empty State ── */}
          {filteredMatches.length === 0 ? (
            <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center mb-5 shadow-inner">
                <Calendar className="w-9 h-9 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {searchTerm ? "No results found" : "No events yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
                {searchTerm
                  ? `No events match "${searchTerm}". Try a different search term.`
                  : "Get started by creating your first event and configuring its ticket pricing."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="h-10 px-6 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add your first event
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Event
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Schedule
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      Venue &amp; Capacity
                    </th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                      Base Price
                    </th>
                    <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredMatches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      onUpdate={updateMatch}
                      onGenerateTickets={generateTickets}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer count */}
        {filteredMatches.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pb-2">
            Showing {filteredMatches.length} of {matches.length} event{matches.length !== 1 ? "s" : ""}
          </p>
        )}

      </div>
    </div>
  );
}

// ── Match Row ──────────────────────────────────────────────────────────────────
function MatchRow({
  match,
  onUpdate,
  onGenerateTickets,
}: {
  match: Event;
  onUpdate: any;
  onGenerateTickets: any;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultMultipliers = match.zone_multipliers || { VIP: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 };

  const [editBasePrice, setEditBasePrice] = useState<number>(Number(match.ticket_price) || 0);
  const [editVIP, setEditVIP] = useState<number>(defaultMultipliers.VIP ?? 2.0);
  const [editA, setEditA] = useState<number>(defaultMultipliers.A ?? 1.5);
  const [editB, setEditB] = useState<number>(defaultMultipliers.B ?? 1.2);
  const [editC, setEditC] = useState<number>(defaultMultipliers.C ?? 1.0);
  const [editD, setEditD] = useState<number>(defaultMultipliers.D ?? 0.8);

  const [selectedZone, setSelectedZone] = useState<string>("VIP");

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const zoneMultipliers = {
      VIP: Number(formData.get("edit_multiplier_vip")),
      A: Number(formData.get("edit_multiplier_a")),
      B: Number(formData.get("edit_multiplier_b")),
      C: Number(formData.get("edit_multiplier_c")),
      D: Number(formData.get("edit_multiplier_d")),
    };

    const data = {
      teamA: formData.get("team_a") as string,
      teamB: formData.get("team_b") as string,
      matchDate: new Date(formData.get("match_date") as string).toISOString(),
      venue: formData.get("venue") as string,
      ticketPrice: Number(formData.get("ticket_price")),
      zoneMultipliers,
    };

    try {
      await onUpdate(match.id, data);
      setIsEditOpen(false);
    } catch (err) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateTickets = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const zone = formData.get("zone") as string;
    const quantity = Number(formData.get("quantity"));

    const multipliers = match.zone_multipliers || { VIP: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 };
    const multiplier = multipliers[zone as keyof typeof multipliers] ?? 1.0;
    const price = Math.round(Number(match.ticket_price) * multiplier * 100) / 100;

    const currentCount = match.ticket_counts?.[zone] || 0;

    const tickets = [];
    for (let i = 1; i <= quantity; i++) {
      const seatSeq = currentCount + i;
      tickets.push({
        zone: zone,
        seatNumber: `${zone}-${seatSeq.toString().padStart(3, "0")}`,
        price: price,
      });
    }

    try {
      await onGenerateTickets(match.id, { tickets });
      setIsTicketOpen(false);
    } catch (err) {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const displayTitle = getEventTitle(match.team_a, match.team_b);
  const totalCreatedTickets = Object.values(match.ticket_counts || {}).reduce(
    (acc, curr) => acc + curr,
    0
  );

  const selectedZoneConfig = ZONE_CONFIG.find((z) => z.id === selectedZone) ?? ZONE_CONFIG[0];
  const selectedMultiplier = defaultMultipliers[selectedZone as keyof typeof defaultMultipliers] ?? 1.0;
  const previewTicketPrice = Number(match.ticket_price) * selectedMultiplier;

  return (
    <tr className="group hover:bg-muted/30 transition-colors duration-150 border-b border-border/40 last:border-0">
      {/* ── Event Column ── */}
      <td className="px-6 py-5 align-middle">
        <div className="space-y-2.5">
          <p className="font-bold text-base text-foreground leading-tight">{displayTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {ZONE_CONFIG.map((zone) => {
              const count = match.ticket_counts?.[zone.id] || 0;
              if (count === 0) return null;
              return (
                <span
                  key={zone.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${zone.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${zone.badgeDot}`} />
                  {zone.id}: {count.toLocaleString()}
                </span>
              );
            })}
            {totalCreatedTickets === 0 && (
              <span className="text-xs text-muted-foreground/60 italic">No tickets generated</span>
            )}
          </div>
        </div>
      </td>

      {/* ── Schedule Column ── */}
      <td className="px-6 py-5 align-middle hidden md:table-cell">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {new Date(match.match_date).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground pl-5">
            {new Date(match.match_date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </td>

      {/* ── Venue Column ── */}
      <td className="px-6 py-5 align-middle hidden lg:table-cell">
        <div className="space-y-1 max-w-[200px]">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
              {match.venue}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {match.total_tickets.toLocaleString()} seats
            </span>
          </div>
        </div>
      </td>

      {/* ── Pricing Column ── */}
      <td className="px-6 py-5 align-middle hidden sm:table-cell">
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-foreground tracking-tight font-mono">
              {Number(match.ticket_price).toLocaleString("vi-VN")}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">đ</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Base Price
          </span>
        </div>
      </td>

      {/* ── Actions Column ── */}
      <td className="px-6 py-5 align-middle text-right">
        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150">

          {/* ── EDIT DIALOG ── */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger render={
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 rounded-xl font-semibold border-border/60 shadow-sm hover:bg-muted/60 hover:border-border hover:shadow-md transition-all duration-150 flex items-center gap-1.5"
              />
            }>
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border/50 shadow-2xl p-0 bg-background">
              {/* Dialog Header */}
              <div className="sticky top-0 z-20 px-6 py-5 border-b border-border/60 bg-card/95 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Settings className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                      Edit Event
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                      Updating configuration for <span className="font-semibold text-foreground">{displayTitle}</span>
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <form
                key={`${match.team_a}-${match.team_b}-${match.match_date}-${match.venue}-${match.ticket_price}`}
                onSubmit={handleEdit}
                className="p-6 space-y-5"
              >
                {/* Card 1 – Match Info */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-muted/20">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Building className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Match Information</h3>
                      <p className="text-xs text-muted-foreground">Teams, schedule, venue</p>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Host / Team A</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id={`edit_team_a_${match.id}`}
                          name="team_a"
                          defaultValue={match.team_a}
                          required
                          disabled={submitting}
                          className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guest / Team B</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id={`edit_team_b_${match.id}`}
                          name="team_b"
                          defaultValue={match.team_b || ""}
                          required
                          disabled={submitting}
                          className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date &amp; Time</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id={`edit_match_date_${match.id}`}
                          name="match_date"
                          type="datetime-local"
                          defaultValue={new Date(match.match_date).toISOString().slice(0, 16)}
                          required
                          disabled={submitting}
                          className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Venue</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id={`edit_venue_${match.id}`}
                          name="venue"
                          defaultValue={match.venue}
                          required
                          disabled={submitting}
                          className="pl-9 h-11 rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2 – Pricing */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/40 bg-muted/20 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Percent className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Ticket Pricing Matrix</h3>
                        <p className="text-xs text-muted-foreground">Adjust base price and multipliers</p>
                      </div>
                    </div>
                    {/* Base Price Input — separate row trên mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Label
                        htmlFor={`edit_ticket_price_${match.id}`}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Base Price (đ)
                      </Label>
                      <div className="relative sm:ml-auto">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id={`edit_ticket_price_${match.id}`}
                          name="ticket_price"
                          type="number"
                          value={editBasePrice}
                          onChange={(e) => setEditBasePrice(Number(e.target.value) || 0)}
                          disabled={submitting}
                          className="pl-7 w-full sm:w-36 h-9 text-right font-mono text-sm rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <ZoneMultiplierGrid
                      basePrice={editBasePrice}
                      values={{ VIP: editVIP, A: editA, B: editB, C: editC, D: editD }}
                      setters={{ VIP: setEditVIP, A: setEditA, B: setEditB, C: setEditC, D: setEditD }}
                      namePrefix="edit_multiplier"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-1">
                  <DialogTrigger render={
                    <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl font-medium text-muted-foreground hover:text-foreground" />
                  }>
                    Cancel
                  </DialogTrigger>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-8 rounded-xl font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* ── GENERATE TICKETS DIALOG ── */}
          <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
            <DialogTrigger render={
              <Button
                size="sm"
                className="h-9 px-4 rounded-xl font-semibold shadow-sm bg-foreground text-background hover:bg-foreground/85 hover:shadow-md transition-all duration-150 flex items-center gap-1.5"
              />
            }>
              <TicketIcon className="w-3.5 h-3.5" />
              <span>Tickets</span>
            </DialogTrigger>

            <DialogContent className="max-w-lg rounded-2xl border border-border/50 shadow-2xl p-0 bg-background overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-border/60 bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                      Generate Tickets
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                      Mint new tickets for <span className="font-semibold text-foreground">{displayTitle}</span>. Pricing auto-calculated.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGenerateTickets} className="flex flex-col gap-4 p-5 max-h-[80vh] overflow-y-auto">

                {/* Card 1 – Ticket Inventory */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/40 bg-muted/20">
                    <Activity className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Current Ticket Inventory</h4>
                  </div>
                  <div className="p-4 space-y-3.5">
                    {ZONE_CONFIG.map((zone) => {
                      const count = match.ticket_counts?.[zone.id] || 0;
                      const maxCapacity = match.total_tickets || 1;
                      const percent = Math.min(100, Math.round((count / maxCapacity) * 100));

                      return (
                        <div key={zone.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${zone.badge}`}>
                                <span className={zone.iconBg.split(" ")[1]}>{zone.icon}</span>
                                {zone.label}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                {count.toLocaleString()} tickets
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-muted-foreground tabular-nums">
                              {percent}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${zone.progress}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card 2 – Select Zone */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/40 bg-muted/20">
                    <Layers className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Select Zone</h4>
                  </div>
                  <div className="p-4">
                    <input type="hidden" name="zone" value={selectedZone} />
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {ZONE_CONFIG.map((zone) => {
                        const isSelected = selectedZone === zone.id;
                        return (
                          <button
                            key={zone.id}
                            type="button"
                            onClick={() => setSelectedZone(zone.id)}
                            className={`
                              relative flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 px-1 sm:px-2 rounded-lg sm:rounded-xl border-2 text-center
                              transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                              ${isSelected
                                ? `${zone.selectedBorder} shadow-md`
                                : "border-border/40 bg-background hover:border-border hover:bg-muted/40 hover:shadow-sm"
                              }
                            `}
                          >
                            <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isSelected ? zone.selectedText : "text-muted-foreground"}`}>
                              {zone.icon}
                            </span>
                            <span className={`text-[10px] sm:text-xs font-bold transition-colors ${isSelected ? zone.selectedText : "text-foreground"}`}>
                              {zone.id}
                            </span>
                            {isSelected && (
                              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-background ${zone.badgeDot}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card 3 – Price Preview */}
                <div className={`rounded-2xl border-2 bg-card shadow-sm overflow-hidden transition-all duration-300 ${selectedZoneConfig.cardBorder}`}>
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-3.5 border-b border-border/40 bg-muted/20">
                    <DollarSign className="w-4 h-4 text-primary shrink-0" />
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">Price Preview</h4>
                    <span className={`ml-auto inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-xs font-bold border ${selectedZoneConfig.badge}`}>
                      <span className="w-3 h-3 sm:w-4 sm:h-4">{selectedZoneConfig.icon}</span>
                      <span className="hidden xs:inline">{selectedZoneConfig.label}</span>
                      <span className="inline xs:hidden">{selectedZoneConfig.id}</span>
                    </span>
                  </div>
                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    {/* Formula — responsive, stack trên mobile nếu cần */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                      <div className="text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Base</p>
                        <p className="font-mono font-bold text-foreground text-xs sm:text-sm">
                          {Number(match.ticket_price).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <span className="text-muted-foreground font-bold text-sm sm:text-base">×</span>
                      <div className="text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Multi</p>
                        <p className={`font-mono font-bold text-xs sm:text-sm ${selectedZoneConfig.selectedText}`}>
                          {selectedMultiplier}
                        </p>
                      </div>
                      <span className="text-muted-foreground font-bold text-sm sm:text-base">=</span>
                      <div className="text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 sm:mb-1">Final</p>
                        <p className={`font-mono font-extrabold text-base sm:text-lg ${selectedZoneConfig.previewText}`}>
                          {previewTicketPrice.toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4 – Quantity & Generate */}
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/40 bg-muted/20">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Generate</h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`quantity_${match.id}`}
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Quantity to Generate
                      </Label>
                      <Input
                        id={`quantity_${match.id}`}
                        name="quantity"
                        type="number"
                        min="1"
                        required
                        disabled={submitting}
                        placeholder="How many tickets?"
                        className="h-12 text-lg rounded-xl bg-muted/30 focus:bg-background transition-colors border-border/60 text-center font-mono font-bold"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-primary to-primary/80 text-primary-foreground flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Tickets
                        </>
                      )}
                    </Button>
                  </div>
                </div>

              </form>
            </DialogContent>
          </Dialog>

        </div>
      </td>
    </tr>
  );
}
