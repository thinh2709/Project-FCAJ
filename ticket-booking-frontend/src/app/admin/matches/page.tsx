"use client";

import { useState, useMemo, useEffect, memo } from "react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Event } from "@/features/events/types";
import {
  Plus, Edit2, Ticket as TicketIcon, Calendar, MapPin, Users,
  DollarSign, Sparkles, Star, Crown, Building, Activity, Percent,
  Settings, Layers, Search, Calculator, TrendingUp, ImagePlus, X, Upload, Trash2
} from "lucide-react";
import { getEventTitle, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";

const ZONE_CONFIG = [
  {
    id: "VIP",
    label: "VIP",
    icon: <Crown className="w-5 h-5" />,
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    badgeDot: "bg-purple-500",
    progress: "bg-gradient-to-r from-purple-500 to-purple-400",
    cardBorder: "border-purple-200 hover:border-purple-400 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/20",
    cardBg: "hover:bg-purple-50/50",
    iconBg: "bg-purple-100 text-purple-600",
    selectedBorder: "border-purple-500 bg-purple-50 ring-4 ring-purple-500/20",
    selectedText: "text-purple-700",
    previewText: "text-purple-600",
  },
  {
    id: "A",
    label: "Zone A",
    icon: <Star className="w-5 h-5" />,
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    badgeDot: "bg-blue-500",
    progress: "bg-gradient-to-r from-blue-500 to-blue-400",
    cardBorder: "border-blue-200 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20",
    cardBg: "hover:bg-blue-50/50",
    iconBg: "bg-blue-100 text-blue-600",
    selectedBorder: "border-blue-500 bg-blue-50 ring-4 ring-blue-500/20",
    selectedText: "text-blue-700",
    previewText: "text-blue-600",
  },
  {
    id: "B",
    label: "Zone B",
    icon: <Star className="w-5 h-5" />,
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    badgeDot: "bg-emerald-500",
    progress: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    cardBorder: "border-emerald-200 hover:border-emerald-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20",
    cardBg: "hover:bg-emerald-50/50",
    iconBg: "bg-emerald-100 text-emerald-600",
    selectedBorder: "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/20",
    selectedText: "text-emerald-700",
    previewText: "text-emerald-600",
  },
  {
    id: "C",
    label: "Zone C",
    icon: <Star className="w-5 h-5" />,
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    badgeDot: "bg-orange-500",
    progress: "bg-gradient-to-r from-orange-500 to-orange-400",
    cardBorder: "border-orange-200 hover:border-orange-400 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/20",
    cardBg: "hover:bg-orange-50/50",
    iconBg: "bg-orange-100 text-orange-600",
    selectedBorder: "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/20",
    selectedText: "text-orange-700",
    previewText: "text-orange-600",
  },
  {
    id: "D",
    label: "Zone D",
    icon: <Star className="w-5 h-5" />,
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    badgeDot: "bg-slate-500",
    progress: "bg-gradient-to-r from-slate-400 to-slate-300",
    cardBorder: "border-slate-200 hover:border-slate-400 focus-within:border-slate-500 focus-within:ring-4 focus-within:ring-slate-500/20",
    cardBg: "hover:bg-slate-50/50",
    iconBg: "bg-slate-100 text-slate-600",
    selectedBorder: "border-slate-500 bg-slate-50 ring-4 ring-slate-500/20",
    selectedText: "text-slate-700",
    previewText: "text-slate-600",
  },
] as const;

const DEFAULT_MULTIPLIERS = { VIP: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 };

const MOCK_MATCHES: Event[] = [
  {
    id: "1",
    team_a: "Vietnam",
    team_b: "Thailand",
    match_date: "2026-12-15T19:00:00Z",
    venue: "My Dinh National Stadium",
    total_tickets: 40000,
    ticket_price: "500000",
    status: "upcoming",
    zone_multipliers: { VIP: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 },
    ticket_counts: { VIP: 120, A: 850, B: 1200, C: 2000, D: 1500 },
  },
  {
    id: "2",
    team_a: "Real Madrid",
    team_b: "Barcelona",
    match_date: "2026-11-20T21:00:00Z",
    venue: "Santiago Bernabeu",
    total_tickets: 81000,
    ticket_price: "1200000",
    status: "upcoming",
    zone_multipliers: { VIP: 3.0, A: 2.0, B: 1.5, C: 1.2, D: 1.0 },
    ticket_counts: { VIP: 500, A: 2000, B: 3500, C: 5000, D: 6000 },
  },
  {
    id: "3",
    team_a: "Manchester United",
    team_b: "Liverpool",
    match_date: "2027-01-10T16:00:00Z",
    venue: "Old Trafford",
    total_tickets: 75000,
    ticket_price: "800000",
    status: "upcoming",
    zone_multipliers: { VIP: 2.5, A: 1.8, B: 1.4, C: 1.1, D: 0.9 },
    ticket_counts: { VIP: 0, A: 0, B: 0, C: 0, D: 0 },
  },
];

/* ── COMPONENTS ── */

const ZoneMultiplierGrid = memo(({ basePrice, values, setters, namePrefix, disabled }: any) => {
  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
      <table className="w-full border-collapse text-sm text-left">
        <thead className="bg-muted/40 border-b border-border/60">
          <tr>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Zone</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Multiplier</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Price Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {ZONE_CONFIG.map((zone) => {
            const val = values[zone.id];
            const setter = setters[zone.id];
            const price = Math.round(Number(basePrice) * Number(val));

            return (
              <tr key={zone.id} className="hover:bg-muted/10 transition-colors">
                {/* Zone Badge */}
                <td className="px-4 py-2.5 align-middle">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border whitespace-nowrap ${zone.badge}`}>
                    <span className={zone.iconBg.split(" ")[1]}>{zone.icon}</span>
                    {zone.label}
                  </span>
                </td>

                {/* Multiplier Input */}
                <td className="px-4 py-2.5 align-middle">
                  <div className="flex items-center justify-center gap-1.5 mx-auto max-w-[120px]">
                    <span className="text-muted-foreground font-semibold text-xs">×</span>
                    <Input
                      name={`${namePrefix}_${zone.id.toLowerCase()}`}
                      type="number"
                      step="0.1"
                      min="0"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      disabled={disabled}
                      className="w-16 h-8 text-center font-mono font-bold text-xs rounded-lg border-border focus-visible:ring-primary py-0"
                    />
                  </div>
                </td>

                {/* Price Preview */}
                <td className="px-4 py-2.5 align-middle text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-muted-foreground text-xs">=</span>
                    <div className="inline-flex items-center justify-end px-3 rounded-lg border border-border bg-muted/40 font-mono text-xs sm:text-sm font-bold min-w-[115px] shadow-sm h-8">
                      <span className={zone.previewText}>
                        {price > 0 ? price.toLocaleString() + "đ" : "—"}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

const FormulaSummary = memo(({ basePrice, values }: any) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Formula Summary</h3>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {ZONE_CONFIG.map(zone => {
          const val = values[zone.id];
          const price = Math.round(Number(basePrice) * Number(val));
          return (
            <div key={zone.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl border border-border/40 bg-muted/10">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${zone.badgeDot}`} />
                <span className="font-bold text-foreground w-10">{zone.id}</span>
                <span className="font-mono text-muted-foreground">{Number(basePrice).toLocaleString()}đ</span>
                <span className="text-muted-foreground">×</span>
                <span className="font-mono font-bold text-foreground">{val}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">=</span>
                <span className={`font-mono font-extrabold ${zone.previewText}`}>
                  {price > 0 ? price.toLocaleString() + "đ" : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const InventoryCard = memo(({ match }: { match: Event }) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Current Inventory</h3>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {ZONE_CONFIG.map((zone) => {
          const count = match.ticket_counts?.[zone.id] || 0;
          const maxCapacity = match.total_tickets || 1;
          const percent = Math.min(100, Math.round((count / maxCapacity) * 100));

          return (
            <div key={zone.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold border ${zone.badge}`}>
                  <span className={zone.iconBg.split(" ")[1]}>{zone.icon}</span>
                  {zone.label}
                </span>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-foreground">
                    {count.toLocaleString()} <span className="text-muted-foreground font-medium">/ {maxCapacity.toLocaleString()}</span>
                  </span>
                  <span className="font-mono text-muted-foreground w-8 text-right">
                    {percent}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
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
  );
});

const PricePreview = memo(({ basePrice, multiplier, zoneConfig }: any) => {
  const finalPrice = Math.round(basePrice * multiplier);
  
  return (
    <div className={`flex flex-col h-full rounded-2xl border-2 bg-card shadow-sm transition-all duration-300 ${zoneConfig.cardBorder}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className={`p-1.5 rounded-lg ${zoneConfig.iconBg}`}>
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Price Preview</h3>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">Base Price</span>
            <span className="font-mono font-bold text-foreground text-sm">{basePrice.toLocaleString()}đ</span>
          </div>
          
          <div className="flex justify-center -my-2.5 relative z-10">
            <div className="bg-card border border-border/50 p-1.5 rounded-full shadow-sm text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">Multiplier</span>
            <span className={`font-mono font-bold text-sm ${zoneConfig.selectedText}`}>× {multiplier}</span>
          </div>

          <div className="flex justify-center -my-2.5 relative z-10">
            <div className="bg-card border border-border/50 p-1.5 rounded-full shadow-sm text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 ${zoneConfig.selectedBorder} bg-background`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${zoneConfig.selectedText}`}>Final Price</span>
            <span className={`font-mono font-extrabold text-2xl sm:text-3xl tracking-tight ${zoneConfig.previewText}`}>
              {finalPrice.toLocaleString()}đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

const ZoneToggle = memo(({ selectedZone, onSelect }: any) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Select Zone</h3>
        </div>
      </div>
      <div className="p-4">
        <input type="hidden" name="zone" value={selectedZone} />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {ZONE_CONFIG.map((zone) => {
            const isSelected = selectedZone === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => onSelect(zone.id)}
                aria-label={`Select ${zone.label}`}
                className={`
                  relative flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl border-2 text-center
                  transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-primary/30
                  ${isSelected
                    ? `${zone.selectedBorder} shadow-sm scale-[1.02]`
                    : "border-border/60 bg-background hover:border-border hover:bg-muted/50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                  }
                `}
              >
                <span className={`w-5 h-5 transition-colors ${isSelected ? zone.selectedText : "text-muted-foreground"}`}>
                  {zone.icon}
                </span>
                <span className={`text-sm font-bold transition-colors ${isSelected ? zone.selectedText : "text-foreground"}`}>
                  {zone.id}
                </span>
                {isSelected && (
                  <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-background shadow-sm ${zone.badgeDot}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const EventInfoCard = memo(({ match, submitting, mode, capValues, capSetters }: any) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Building className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Event Details</h3>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Host / Team A</Label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input name="team_a" defaultValue={match?.team_a} required disabled={submitting} className="pl-10 h-10 text-sm font-medium rounded-xl border-border/60 focus-visible:ring-primary" placeholder="e.g. Real Madrid" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Guest / Team B (Optional)</Label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input name="team_b" defaultValue={match?.team_b || ""} disabled={submitting} className="pl-10 h-10 text-sm font-medium rounded-xl border-border/60 focus-visible:ring-primary" placeholder="e.g. Barcelona (Optional)" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date & Time</Label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input name="match_date" type="datetime-local" defaultValue={match ? new Date(match.match_date).toISOString().slice(0, 16) : undefined} required disabled={submitting} className="pl-10 h-10 text-sm font-medium rounded-xl border-border/60 focus-visible:ring-primary" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venue</Label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input name="venue" defaultValue={match?.venue} required disabled={submitting} className="pl-10 h-10 text-sm font-medium rounded-xl border-border/60 focus-visible:ring-primary" placeholder="e.g. Santiago Bernabeu" />
          </div>
        </div>
        {mode === "create" ? (
          <div className="sm:col-span-2 border-t border-border/50 pt-4 mt-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Zone Capacities (Seats)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ZONE_CONFIG.map(zone => (
                <div key={zone.id} className="space-y-1">
                  <Label htmlFor={`cap_${zone.id}`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${zone.badgeDot}`} />
                    {zone.id}
                  </Label>
                  <Input
                    id={`cap_${zone.id}`}
                    name={`cap_${zone.id.toLowerCase()}`}
                    type="number"
                    min="0"
                    required
                    disabled={submitting}
                    value={capValues[zone.id]}
                    onChange={e => capSetters[zone.id](e.target.value)}
                    onWheel={e => e.currentTarget.blur()}
                    className="h-10 text-sm font-semibold rounded-xl border-border/60 focus-visible:ring-primary"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Calculated Capacity</Label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  name="total_tickets"
                  type="number"
                  readOnly
                  disabled
                  value={Number(capValues.VIP || 0) + Number(capValues.A || 0) + Number(capValues.B || 0) + Number(capValues.C || 0) + Number(capValues.D || 0)}
                  className="pl-10 h-10 text-sm font-bold rounded-xl border-border/60 bg-muted/30 text-muted-foreground select-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="sm:col-span-2 border-t border-border/50 pt-4 mt-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Zone Capacities</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ZONE_CONFIG.map(zone => {
                const cap = match?.zone_capacities?.[zone.id] ?? 0;
                return (
                  <div key={zone.id} className="p-2.5 rounded-xl border border-border bg-muted/10 text-center">
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">{zone.id}</span>
                    <span className="font-mono text-sm font-extrabold text-foreground">{cap.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const BasePriceCard = memo(({ basePrice, setBasePrice, submitting }: any) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <DollarSign className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Base Ticket Price</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            name="ticket_price" 
            type="number" 
            min="0" 
            required 
            disabled={submitting} 
            value={basePrice} 
            onChange={(e) => setBasePrice(e.target.value)} 
            onWheel={(e) => e.currentTarget.blur()}
            className="pl-10 h-12 text-xl font-mono font-extrabold rounded-xl border-border/60 focus-visible:ring-primary shadow-sm" 
            placeholder="e.g. 200000" 
          />
        </div>
      </div>
    </div>
  );
});

const ZonePricingCard = memo(({ basePrice, values, setters, namePrefix, disabled }: any) => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Percent className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Zone Multipliers</h3>
        </div>
      </div>
      <div className="p-4">
        <ZoneMultiplierGrid basePrice={basePrice} values={values} setters={setters} namePrefix={namePrefix} disabled={disabled} />
      </div>
    </div>
  );
});

const GenerateDialog = memo(({ match, onGenerate, open, onOpenChange }: any) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedZone, setSelectedZone] = useState("VIP");
  
  useEffect(() => {
    if (open) {
      setSelectedZone("VIP");
    }
  }, [open]);

  const handleGenerateTickets = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    const formData = new FormData(form);

    const zone = formData.get("zone") as string;
    const quantity = Number(formData.get("quantity"));
    
    const multipliers = match.zone_multipliers || DEFAULT_MULTIPLIERS;
    const multiplier = multipliers[zone as keyof typeof multipliers] ?? 1.0;
    const price = Math.round(Number(match.ticket_price) * multiplier);

    if (price < 10000) {
      toast.error(`Giá vé của Zone này (${price.toLocaleString()}đ) nhỏ hơn mức tối thiểu 10.000 VNĐ cho phép của MoMo. Vui lòng cập nhật lại giá vé cơ bản của trận đấu.`);
      setSubmitting(false);
      return;
    }

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
      await onGenerate(match.id, { tickets });
      form.reset();
      onOpenChange(false);
    } catch (err) {
    } finally {
      setSubmitting(false);
    }
  };

  const selectedZoneConfig = ZONE_CONFIG.find((z) => z.id === selectedZone) ?? ZONE_CONFIG[0];
  const selectedMultiplier = (match.zone_multipliers || DEFAULT_MULTIPLIERS)[selectedZone as keyof typeof DEFAULT_MULTIPLIERS] ?? 1.0;

  const maxCapacity = match.zone_capacities?.[selectedZone] ?? 0;
  const currentCount = match.ticket_counts?.[selectedZone] || 0;
  const remainingZoneCapacity = Math.max(0, maxCapacity - currentCount);

  const matchMaxCapacity = match.total_tickets || 0;
  const currentTotalTickets = (Object.values(match.ticket_counts || {}) as number[]).reduce((a, b) => a + b, 0);
  const remainingMatchCapacity = Math.max(0, matchMaxCapacity - currentTotalTickets);

  const maxToGenerate = Math.min(remainingZoneCapacity, remainingMatchCapacity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={
        <Button size="sm" className="h-10 px-5 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 shadow-sm flex items-center gap-2" />
      }>
        <TicketIcon className="w-4 h-4" />
        <span className="hidden xl:inline">Tickets</span>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="w-full max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-border/50 bg-background shadow-2xl">
        <div className="sticky top-0 z-20 px-8 py-6 border-b border-border/50 bg-card/95 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <TicketIcon className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">Generate Tickets</DialogTitle>
              <DialogDescription className="text-sm mt-1 text-muted-foreground">Mint new tickets for <span className="font-semibold text-foreground">{getEventTitle(match.team_a, match.team_b)}</span></DialogDescription>
            </div>
          </div>
          <DialogClose render={
             <Button type="button" variant="ghost" className="h-10 px-4 rounded-xl font-bold" />
          }>
             Close
          </DialogClose>
        </div>
        
        <form onSubmit={handleGenerateTickets} className="p-8 space-y-8">
          <InventoryCard match={match} />
          
          <ZoneToggle selectedZone={selectedZone} onSelect={setSelectedZone} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            <PricePreview basePrice={Number(match.ticket_price)} multiplier={selectedMultiplier} zoneConfig={selectedZoneConfig} />
            
            <div className="flex flex-col h-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-muted/30">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Quantity</h3>
                  <p className="text-sm text-muted-foreground">Number of tickets to mint</p>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`quantity_${match.id}`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tickets to Generate</Label>
                  <Input 
                    id={`quantity_${match.id}`} 
                    name="quantity" 
                    type="number" 
                    min="1" 
                    max={maxToGenerate}
                    required 
                    disabled={submitting || maxToGenerate <= 0} 
                    placeholder={maxToGenerate > 0 ? `Max ${maxToGenerate} tickets` : "Limit reached"} 
                    onWheel={(e) => e.currentTarget.blur()}
                    className="h-12 text-xl font-mono font-extrabold text-center rounded-xl bg-muted/30 focus-visible:ring-primary shadow-inner border-border/60"
                  />
                  <p className="text-xs text-muted-foreground">
                    {maxToGenerate > 0 ? (
                      <span>
                        Available: <strong className="text-foreground">{maxToGenerate}</strong> seats (Zone Max: {maxCapacity}, generated: {currentCount})
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold">
                        Exceeded maximum capacity for this zone!
                      </span>
                    )}
                  </p>
                </div>
                <Button type="submit" disabled={submitting || maxToGenerate <= 0} className="w-full h-12 rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" /> Generating...</>
                  ) : maxToGenerate <= 0 ? (
                    "Capacity Limit Reached"
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Tickets</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

const ImageUploadCard = memo(({ imagePreview, onFileSelect, onRemove, submitting, existingUrl }: any) => {
  const displayUrl = imagePreview || existingUrl;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <ImagePlus className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Event Banner</h3>
          <p className="text-[10px] text-muted-foreground">Upload an image for this event (optional)</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {displayUrl ? (
          <div className="relative group">
            <img src={displayUrl} alt="Event banner" className="w-full h-40 object-cover rounded-xl border border-border/50" />
            {!submitting && (
              <button
                type="button"
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Upload className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <span className="text-sm font-medium text-muted-foreground">Click to upload image</span>
            <span className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG, WebP up to 5MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={submitting}
              onChange={onFileSelect}
            />
          </label>
        )}
      </div>
    </div>
  );
});

const EditDialog = memo(({ match, onUpdate, onUploadImage, open, onOpenChange }: any) => {
  const [submitting, setSubmitting] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageRemoved, setEditImageRemoved] = useState(false);
  const defaultMultipliers = match.zone_multipliers || DEFAULT_MULTIPLIERS;
  
  const [editBasePrice, setEditBasePrice] = useState<string>(String(match.ticket_price || ""));
  const [editVIP, setEditVIP] = useState<string>(String(defaultMultipliers.VIP ?? 2.0));
  const [editA, setEditA] = useState<string>(String(defaultMultipliers.A ?? 1.5));
  const [editB, setEditB] = useState<string>(String(defaultMultipliers.B ?? 1.2));
  const [editC, setEditC] = useState<string>(String(defaultMultipliers.C ?? 1.0));
  const [editD, setEditD] = useState<string>(String(defaultMultipliers.D ?? 0.8));

  useEffect(() => {
    if (open) {
      setEditBasePrice(String(match.ticket_price || ""));
      setEditVIP(String(match.zone_multipliers?.VIP ?? 2.0));
      setEditA(String(match.zone_multipliers?.A ?? 1.5));
      setEditB(String(match.zone_multipliers?.B ?? 1.2));
      setEditC(String(match.zone_multipliers?.C ?? 1.0));
      setEditD(String(match.zone_multipliers?.D ?? 0.8));
      setEditImagePreview(null);
      setEditImageFile(null);
      setEditImageRemoved(false);
    }
  }, [open, match]);

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    const formData = new FormData(form);

    const zoneMultipliers = {
      VIP: Number(formData.get("edit_multiplier_vip")),
      A: Number(formData.get("edit_multiplier_a")),
      B: Number(formData.get("edit_multiplier_b")),
      C: Number(formData.get("edit_multiplier_c")),
      D: Number(formData.get("edit_multiplier_d")),
    };

    let imageUrl: string | undefined | null = undefined;
    if (editImageFile && onUploadImage) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(editImageFile);
        });
        imageUrl = await onUploadImage(base64, editImageFile.name, editImageFile.type);
      } catch {
        setSubmitting(false);
        return;
      }
    } else if (editImageRemoved) {
      imageUrl = null;
    }

    const ticketPrice = Number(formData.get("ticket_price"));
    if (ticketPrice < 10000) {
      toast.error("Giá vé cơ bản tối thiểu phải là 10.000 VNĐ (Theo giới hạn giao dịch tối thiểu của MoMo).");
      setSubmitting(false);
      return;
    }

    const data: any = {
      teamA: formData.get("team_a") as string,
      teamB: (formData.get("team_b") as string) || undefined,
      matchDate: new Date(formData.get("match_date") as string).toISOString(),
      venue: formData.get("venue") as string,
      ticketPrice,
      zoneMultipliers,
    };
    if (imageUrl !== undefined) {
      data.imageUrl = imageUrl;
    }

    try {
      await onUpdate(match.id, data);
      form.reset();
      onOpenChange(false);
    } catch (err) {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="h-10 px-5 rounded-xl font-bold border-border/80 shadow-sm hover:bg-muted/60 hover:border-border flex items-center gap-2" />
      }>
        <Edit2 className="w-4 h-4" />
        <span className="hidden xl:inline">Edit</span>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="w-full max-w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-border/50 bg-background shadow-2xl">
         <div className="sticky top-0 z-20 px-8 py-6 border-b border-border/50 bg-card/95 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
               <Settings className="w-6 h-6" />
             </div>
             <div>
               <DialogTitle className="text-2xl font-bold text-foreground">Edit Event</DialogTitle>
               <DialogDescription className="text-sm mt-1 text-muted-foreground">Updating <span className="font-semibold text-foreground">{getEventTitle(match.team_a, match.team_b)}</span></DialogDescription>
             </div>
           </div>
           <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto">
             <DialogClose render={
               <Button type="button" variant="ghost" className="h-12 px-6 flex-1 sm:flex-none rounded-xl font-bold" />
             }>
               Cancel
             </DialogClose>
             <Button type="submit" form={`edit-form-${match.id}`} disabled={submitting} className="h-12 px-8 flex-1 sm:flex-none rounded-xl font-bold shadow-md bg-primary hover:bg-primary/90">
               {submitting ? "Saving..." : "Save Changes"}
             </Button>
           </div>
         </div>
         
         <form id={`edit-form-${match.id}`} onSubmit={handleEdit} className="p-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-8">
               <EventInfoCard match={match} submitting={submitting} mode="edit" />
               <ImageUploadCard
                  imagePreview={editImagePreview}
                  existingUrl={!editImageRemoved ? match.image_url : null}
                  submitting={submitting}
                  onFileSelect={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditImageFile(file);
                      setEditImagePreview(URL.createObjectURL(file));
                      setEditImageRemoved(false);
                    }
                  }}
                  onRemove={() => {
                    setEditImagePreview(null);
                    setEditImageFile(null);
                    setEditImageRemoved(true);
                  }}
                />
               <BasePriceCard basePrice={editBasePrice} setBasePrice={setEditBasePrice} submitting={submitting} />
             </div>
             <div className="space-y-8">
               <ZonePricingCard 
                 basePrice={editBasePrice} 
                 values={{VIP: editVIP, A: editA, B: editB, C: editC, D: editD}} 
                 setters={{VIP: setEditVIP, A: setEditA, B: setEditB, C: setEditC, D: setEditD}} 
                 namePrefix="edit_multiplier" 
                 disabled={submitting} 
               />
               <FormulaSummary basePrice={editBasePrice} values={{VIP: editVIP, A: editA, B: editB, C: editC, D: editD}} />
             </div>
           </div>
         </form>
      </DialogContent>
    </Dialog>
  );
});

const CreateDialog = memo(({ open, onOpenChange, onCreate, onUploadImage }: any) => {
  const [submitting, setSubmitting] = useState(false);
  const [createBasePrice, setCreateBasePrice] = useState<string>("");
  const [createVIP, setCreateVIP] = useState<string>("2.0");
  const [createA, setCreateA] = useState<string>("1.5");
  const [createB, setCreateB] = useState<string>("1.2");
  const [createC, setCreateC] = useState<string>("1.0");
  const [createD, setCreateD] = useState<string>("0.8");

  const [capVIP, setCapVIP] = useState<string>("");
  const [capA, setCapA] = useState<string>("");
  const [capB, setCapB] = useState<string>("");
  const [capC, setCapC] = useState<string>("");
  const [capD, setCapD] = useState<string>("");

  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setCreateBasePrice("");
      setCreateVIP("2.0");
      setCreateA("1.5");
      setCreateB("1.2");
      setCreateC("1.0");
      setCreateD("0.8");

      setCapVIP("");
      setCapA("");
      setCapB("");
      setCapC("");
      setCapD("");

      setCreateImagePreview(null);
      setCreateImageFile(null);
    }
  }, [open]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    const formData = new FormData(form);

    const zoneMultipliers = {
      VIP: Number(formData.get("multiplier_vip")),
      A: Number(formData.get("multiplier_a")),
      B: Number(formData.get("multiplier_b")),
      C: Number(formData.get("multiplier_c")),
      D: Number(formData.get("multiplier_d")),
    };

    const capVIPNum = Number(formData.get("cap_vip") || 0);
    const capANum = Number(formData.get("cap_a") || 0);
    const capBNum = Number(formData.get("cap_b") || 0);
    const capCNum = Number(formData.get("cap_c") || 0);
    const capDNum = Number(formData.get("cap_d") || 0);

    const zoneCapacities = {
      VIP: capVIPNum,
      A: capANum,
      B: capBNum,
      C: capCNum,
      D: capDNum
    };
    const totalTickets = capVIPNum + capANum + capBNum + capCNum + capDNum;

    let imageUrl: string | undefined;
    if (createImageFile && onUploadImage) {
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(createImageFile);
        });
        imageUrl = await onUploadImage(base64, createImageFile.name, createImageFile.type);
      } catch {
        setSubmitting(false);
        return;
      }
    }

    const ticketPrice = Number(formData.get("ticket_price"));
    if (ticketPrice < 10000) {
      toast.error("Giá vé cơ bản tối thiểu phải là 10.000 VNĐ (Theo giới hạn giao dịch tối thiểu của MoMo).");
      setSubmitting(false);
      return;
    }

    const data = {
      teamA: formData.get("team_a") as string,
      teamB: (formData.get("team_b") as string) || undefined,
      matchDate: new Date(formData.get("match_date") as string).toISOString(),
      venue: formData.get("venue") as string,
      totalTickets,
      ticketPrice,
      zoneMultipliers,
      zoneCapacities,
      imageUrl,
    };

    try {
      await onCreate(data);
      form.reset();
      onOpenChange(false);
      setCreateBasePrice("");
      setCreateVIP("2.0");
      setCreateA("1.5");
      setCreateB("1.2");
      setCreateC("1.0");
      setCreateD("0.8");
      setCapVIP("");
      setCapA("");
      setCapB("");
      setCapC("");
      setCapD("");
      setCreateImagePreview(null);
      setCreateImageFile(null);
    } catch (err) {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={
        <Button className="h-12 w-full sm:w-auto px-8 rounded-xl font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2" />
      }>
        <Plus className="w-5 h-5" />
        <span>Create Event</span>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="w-full max-w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-border/50 bg-background shadow-2xl">
         <div className="sticky top-0 z-20 px-8 py-6 border-b border-border/50 bg-card/95 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-primary/10 text-primary">
               <Sparkles className="w-6 h-6" />
             </div>
             <div>
               <DialogTitle className="text-2xl font-bold text-foreground">Create New Event</DialogTitle>
               <DialogDescription className="text-sm mt-1 text-muted-foreground">Set up match details and pricing strategy</DialogDescription>
             </div>
           </div>
           <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto">
             <DialogClose render={
               <Button type="button" variant="ghost" className="h-12 px-6 flex-1 sm:flex-none rounded-xl font-bold" />
             }>
               Cancel
             </DialogClose>
             <Button type="submit" form="create-form" disabled={submitting} className="h-12 px-8 flex-1 sm:flex-none rounded-xl font-bold shadow-md bg-primary hover:bg-primary/90">
               {submitting ? "Creating..." : "Create Event"}
             </Button>
           </div>
         </div>
         
         <form id="create-form" onSubmit={handleCreate} className="p-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-8">
               <EventInfoCard 
                  submitting={submitting} 
                  mode="create" 
                  capValues={{ VIP: capVIP, A: capA, B: capB, C: capC, D: capD }}
                  capSetters={{ VIP: setCapVIP, A: setCapA, B: setCapB, C: setCapC, D: setCapD }}
                />
               <ImageUploadCard
                  imagePreview={createImagePreview}
                  submitting={submitting}
                  onFileSelect={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCreateImageFile(file);
                      setCreateImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  onRemove={() => {
                    setCreateImagePreview(null);
                    setCreateImageFile(null);
                  }}
                />
               <BasePriceCard basePrice={createBasePrice} setBasePrice={setCreateBasePrice} submitting={submitting} />
             </div>
             <div className="space-y-8">
               <ZonePricingCard 
                 basePrice={createBasePrice} 
                 values={{VIP: createVIP, A: createA, B: createB, C: createC, D: createD}} 
                 setters={{VIP: setCreateVIP, A: setCreateA, B: setCreateB, C: setCreateC, D: setCreateD}} 
                 namePrefix="multiplier" 
                 disabled={submitting} 
               />
               <FormulaSummary basePrice={createBasePrice} values={{VIP: createVIP, A: createA, B: createB, C: createC, D: createD}} />
             </div>
           </div>
         </form>
      </DialogContent>
    </Dialog>
  );
});

const MatchCard = memo(({ match, onUpdate, onGenerateTickets, onDelete, onUploadImage }: any) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa trận đấu "${getEventTitle(match.team_a, match.team_b)}" và toàn bộ vé liên quan? Hành động này không thể hoàn tác.`)) {
      try {
        setDeleting(true);
        await onDelete(match.id);
      } catch (err) {
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm hover:shadow-md transition-all duration-200">
      {match.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/40">
          <img src={resolveImageUrl(match.image_url)} alt="Match banner" className="w-full h-full object-cover" />
        </div>
      )}
      {/* Title & Zones */}
      <div className="space-y-3">
        <h4 className="font-bold text-lg text-foreground leading-tight">{getEventTitle(match.team_a, match.team_b)}</h4>
        <div className="flex flex-wrap gap-2">
          {ZONE_CONFIG.map(zone => {
            const count = match.ticket_counts?.[zone.id] || 0;
            if (count === 0) return null;
            return (
              <span key={zone.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${zone.badge}`}>
                <span className={`w-2 h-2 rounded-full ${zone.badgeDot}`} />
                {zone.id}: {count.toLocaleString()}
              </span>
            );
          })}
          {Object.values(match.ticket_counts || {}).every(v => v === 0) && (
            <span className="text-sm font-medium text-muted-foreground/80 italic">No tickets generated</span>
          )}
        </div>
      </div>

      <hr className="border-border/50" />

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date & Time */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="p-2 rounded-xl bg-muted border border-border/50 shrink-0">
            <Calendar className="w-5 h-5 text-foreground/70" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Schedule</p>
            <p className="text-sm font-bold text-foreground">
              {new Date(match.match_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <p className="text-xs font-mono font-medium">{new Date(match.match_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>

        {/* Venue */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="p-2 rounded-xl bg-muted border border-border/50 shrink-0">
            <MapPin className="w-5 h-5 text-foreground/70" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Venue</p>
            <p className="text-sm font-bold text-foreground line-clamp-1 leading-tight">{match.venue}</p>
            <p className="text-xs font-medium">{match.total_tickets.toLocaleString()} seats</p>
          </div>
        </div>
      </div>

      <hr className="border-border/50" />

      {/* Pricing & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Base Price</p>
          <div className="flex items-baseline gap-1 text-foreground">
            <span className="text-xl font-mono font-extrabold">{Number(match.ticket_price).toLocaleString()}</span>
            <span className="text-sm font-bold text-muted-foreground">đ</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EditDialog match={match} onUpdate={onUpdate} onUploadImage={onUploadImage} open={isEditOpen} onOpenChange={setIsEditOpen} />
          <GenerateDialog match={match} onGenerate={onGenerateTickets} open={isTicketOpen} onOpenChange={setIsTicketOpen} />
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0 transition-colors"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

const MatchRow = memo(({ match, onUpdate, onGenerateTickets, onDelete, onUploadImage }: any) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa trận đấu "${getEventTitle(match.team_a, match.team_b)}" và toàn bộ vé liên quan? Hành động này không thể hoàn tác.`)) {
      try {
        setDeleting(true);
        await onDelete(match.id);
      } catch (err) {
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <tr className="group hover:bg-muted/40 transition-colors duration-200">
      <td className="px-6 py-5 align-middle">
        <div className="flex items-center gap-4">
          {match.image_url ? (
            <img src={resolveImageUrl(match.image_url)} alt="Thumbnail" className="w-14 h-14 object-cover rounded-xl border border-border/50 shrink-0" />
          ) : (
            <div className="w-14 h-14 bg-muted border border-border/40 rounded-xl flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 select-none">
              VS
            </div>
          )}
          <div className="space-y-2">
            <p className="font-bold text-lg text-foreground leading-snug">{getEventTitle(match.team_a, match.team_b)}</p>
            <div className="flex flex-wrap gap-2">
              {ZONE_CONFIG.map(zone => {
                const count = match.ticket_counts?.[zone.id] || 0;
                if (count === 0) return null;
                return (
                  <span key={zone.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${zone.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${zone.badgeDot}`} />
                    {zone.id}: {count.toLocaleString()}
                  </span>
                );
              })}
              {Object.values(match.ticket_counts || {}).every(v => v === 0) && (
                <span className="text-sm font-medium text-muted-foreground/80 italic">No tickets generated</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 align-middle hidden md:table-cell">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="p-2 rounded-lg bg-muted/60 border border-border/50">
            <Calendar className="w-5 h-5 text-foreground/70" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-foreground">
              {new Date(match.match_date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
            </p>
            <p className="text-sm font-mono font-medium">{new Date(match.match_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 align-middle hidden lg:table-cell">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="p-2 rounded-lg bg-muted/60 border border-border/50 shrink-0">
              <MapPin className="w-5 h-5 text-foreground/70" />
            </div>
            <span className="text-sm font-bold text-foreground leading-tight line-clamp-2">{match.venue}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="p-2 rounded-lg bg-transparent shrink-0">
              <Users className="w-5 h-5 text-transparent" />
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-bold">{match.total_tickets.toLocaleString()} seats</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 align-middle hidden sm:table-cell">
        <div className="flex items-baseline gap-1 text-foreground">
          <span className="text-2xl font-mono font-extrabold">{Number(match.ticket_price).toLocaleString()}</span>
          <span className="text-base font-bold text-muted-foreground">đ</span>
        </div>
      </td>
      <td className="px-6 py-5 align-middle text-right">
        <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
           <EditDialog match={match} onUpdate={onUpdate} onUploadImage={onUploadImage} open={isEditOpen} onOpenChange={setIsEditOpen} />
           <GenerateDialog match={match} onGenerate={onGenerateTickets} open={isTicketOpen} onOpenChange={setIsTicketOpen} />
           <Button
             variant="outline"
             size="icon"
             className="h-10 w-10 rounded-xl border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0 transition-colors"
             onClick={handleDelete}
             disabled={deleting}
           >
             <Trash2 className="w-4 h-4" />
           </Button>
        </div>
      </td>
    </tr>
  );
});

const EventList = memo(({ matches, onUpdate, onGenerateTickets, onDelete, onUploadImage }: any) => {
  return (
    <>
      {/* Mobile/Tablet Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6 p-6">
        {matches.map((match: any) => (
          <MatchCard key={match.id} match={match} onUpdate={onUpdate} onGenerateTickets={onGenerateTickets} onDelete={onDelete} onUploadImage={onUploadImage} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/40 border-b border-border/60 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Event</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Schedule</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Venue & Capacity</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Price</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {matches.map((match: any) => (
              <MatchRow key={match.id} match={match} onUpdate={onUpdate} onGenerateTickets={onGenerateTickets} onDelete={onDelete} onUploadImage={onUploadImage} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
});

const EmptyState = memo(({ isSearching, onCreate }: { isSearching: boolean, onCreate: () => void }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 py-24">
      <div className="w-28 h-28 rounded-full bg-primary/5 flex items-center justify-center mb-8 shadow-inner border border-primary/10">
        {isSearching ? (
          <Search className="w-12 h-12 text-primary/40" />
        ) : (
          <Calendar className="w-12 h-12 text-primary/40" />
        )}
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-3">
        {isSearching ? "No matching events found" : "No events created yet"}
      </h3>
      <p className="text-base text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
        {isSearching 
          ? "Try adjusting your search terms or filters to find what you're looking for."
          : "Get started by creating your first event to start selling tickets and managing your robust inventory seamlessly."}
      </p>
      {!isSearching && (
        <Button onClick={onCreate} className="h-14 px-8 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
          <Plus className="w-6 h-6 mr-3" />
          Create Your First Event
        </Button>
      )}
    </div>
  );
});

export default function AdminMatchesPage() {
  const { matches, loading, error, refetch, createMatch, updateMatch, deleteMatch, generateTickets, uploadImage } = useAdminMatches();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
      <div className="max-w-3xl mx-auto py-16 px-6">
        <ErrorState description={error} action={<Button onClick={refetch} className="h-12 px-8 rounded-xl font-bold">Retry Connection</Button>} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <TicketIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Events</h1>
              <p className="text-base sm:text-lg text-muted-foreground mt-2 font-medium">Manage matches, pricing strategies, and ticket inventory.</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-muted/60 border border-border/50 shadow-sm">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-foreground">{matches.length} Total Event{matches.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="rounded-[2rem] border border-border bg-card shadow-sm flex flex-col min-h-[60vh]">
          {/* Toolbar */}
          <div className="px-6 py-5 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 rounded-t-[2rem]">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search events or venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-12 rounded-xl bg-background border-border/60 text-base font-medium shadow-sm focus-visible:ring-primary transition-all"
              />
            </div>
            <CreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={createMatch} onUploadImage={uploadImage} />
          </div>

          {/* Table or Empty State */}
          {filteredMatches.length === 0 ? (
            <EmptyState isSearching={searchTerm.length > 0} onCreate={() => setIsCreateOpen(true)} />
          ) : (
            <EventList matches={filteredMatches} onUpdate={updateMatch} onGenerateTickets={generateTickets} onDelete={deleteMatch} onUploadImage={uploadImage} />
          )}
        </div>

        {filteredMatches.length > 0 && (
          <p className="text-sm font-bold text-muted-foreground text-center pt-2">
            Showing {filteredMatches.length} of {matches.length} event{matches.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
