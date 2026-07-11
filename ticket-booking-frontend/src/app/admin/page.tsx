"use client";

import { useAdminStats, useAdminBookings } from "@/features/admin/hooks/useAdmin";
import { LoadingState } from "@/shared/components/LoadingState";
import { ErrorState } from "@/shared/components/ErrorState";
import { EmptyState } from "@/shared/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, CreditCard, Ticket, Users, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

const formatVNDShort = (value: number) => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B đ`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M đ`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K đ`;
  }
  return `${value} đ`;
};

export default function AdminDashboard() {
  const { stats, loading, error, refetch } = useAdminStats();

  if (loading) return <LoadingState text="Loading dashboard..." />;
  if (error) return <ErrorState description={error} action={<Button onClick={refetch} variant="outline" className="border-[#2A2A2A] text-white hover:bg-white/5">Retry</Button>} />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dashboard</h2>
        <p className="text-[#A3A3A3] text-sm">Overview of your ticketing platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-[#6B6B6B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalMatches}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-[#6B6B6B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatVND(stats.revenue || 0)}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Tickets Today</CardTitle>
            <Ticket className="h-4 w-4 text-[#6B6B6B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.ticketsSoldToday}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Pending Orders</CardTitle>
            <Users className="h-4 w-4 text-[#6B6B6B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Online Users</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.onlineUsers}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Upcoming Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-[#6B6B6B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.upcomingMatches}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7 bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Revenue Overview (7 ngày gần nhất)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <RevenueChart data={stats.revenueHistory || []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7 bg-[#151515] border-[#2A2A2A] text-white rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Recent Bookings</CardTitle>
            <CardDescription className="text-[#A3A3A3]">
              The 5 most recent bookings on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentBookingsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface RevenueDataPoint {
  name: string;
  date: string;
  total: number;
}

function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-[#A3A3A3]">
        Không có dữ liệu doanh thu trong 7 ngày qua.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
        <XAxis dataKey="name" stroke="#6B6B6B" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B6B6B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatVNDShort} />
        <RechartsTooltip 
          contentStyle={{ backgroundColor: "#151515", borderColor: "#2A2A2A", color: "#FFF", borderRadius: "12px" }}
          formatter={(value) => [formatVND(Number(value)), 'Doanh thu']} 
        />
        <Line type="monotone" dataKey="total" stroke="#FFFFFF" strokeWidth={2.5} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RecentBookingsTable() {
  const { bookings, loading, error } = useAdminBookings(1, 5);

  if (loading) return <div className="py-10 text-center text-sm text-[#A3A3A3]">Loading recent bookings...</div>;
  if (error) return <div className="py-10 text-center text-sm text-red-400">{error}</div>;
  if (!bookings || bookings.length === 0) return <EmptyState title="No bookings found" description="There are no bookings yet." />;

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm text-white">
        <thead>
          <tr className="border-b border-[#2A2A2A] transition-colors">
            <th className="h-12 px-4 text-left align-middle font-medium text-[#6B6B6B]">Customer</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-[#6B6B6B]">Status</th>
            <th className="h-12 px-4 text-right align-middle font-medium text-[#6B6B6B]">Amount</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-[#2A2A2A] transition-colors hover:bg-white/5">
              <td className="p-4 align-middle font-medium text-white">{booking.customer_email}</td>
              <td className="p-4 align-middle">
                <Badge 
                  className={cn(
                    "rounded-full text-xs font-semibold px-2.5 py-0.5 border",
                    booking.status === 'confirmed' 
                      ? "bg-green-500/10 border-green-500/20 text-green-400" 
                      : booking.status === 'cancelled' 
                        ? "bg-red-500/10 border-red-500/20 text-red-400" 
                        : "bg-white/5 border-white/10 text-white"
                  )}
                >
                  {booking.status.toUpperCase()}
                </Badge>
              </td>
              <td className="p-4 align-middle text-right font-medium text-white">{formatVND(booking.amount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
