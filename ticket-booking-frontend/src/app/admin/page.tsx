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
  if (error) return <ErrorState description={error} action={<Button onClick={refetch} variant="outline">Retry</Button>} />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your ticketing platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(stats.revenue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets Today</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ticketsSoldToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online Users</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onlineUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingMatches}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Revenue Overview (7 ngày gần nhất)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <RevenueChart data={stats.revenueHistory || []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
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
      <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
        Không có dữ liệu doanh thu trong 7 ngày qua.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatVNDShort} />
        <RechartsTooltip formatter={(value) => [formatVND(Number(value)), 'Doanh thu']} />
        <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}



function RecentBookingsTable() {
  const { bookings, loading, error, refetch } = useAdminBookings(1, 5);

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">Loading recent bookings...</div>;
  if (error) return <div className="py-10 text-center text-sm text-destructive">{error}</div>;
  if (!bookings || bookings.length === 0) return <EmptyState title="No bookings found" description="There are no bookings yet." />;

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Customer</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <td className="p-4 align-middle font-medium">{booking.customer_email}</td>
              <td className="p-4 align-middle">
                <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'cancelled' ? 'destructive' : 'secondary'}>
                  {booking.status}
                </Badge>
              </td>
              <td className="p-4 align-middle text-right">{formatVND(booking.amount || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
