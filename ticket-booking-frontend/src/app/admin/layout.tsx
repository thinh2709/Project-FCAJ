"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/shared/components/LoadingState";
import Link from "next/link";
import { LayoutDashboard, Calendar, Ticket, Users, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return <LoadingState text="Checking admin permissions..." />;
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Events", href: "/admin/matches", icon: Calendar },
    { name: "Bookings", href: "/admin/bookings", icon: Ticket },
    { name: "Queue", href: "/admin/queue", icon: Users },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#0A0A0A] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#2A2A2A] bg-[#0D0D0D] hidden md:block">
        <nav className="flex flex-col gap-2 p-4">
          <div className="mb-4 px-4 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
            Admin Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white text-black shadow-lg shadow-white/5 font-semibold"
                    : "hover:bg-white/5 text-[#A3A3A3] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
          
          <div className="h-px bg-[#2A2A2A] my-4" />

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 text-[#A3A3A3] hover:text-white hover:bg-white/5"
          >
            <Home className="h-4 w-4" />
            Về Trang Chủ
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 bg-[#0A0A0A]">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation (Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#2A2A2A] bg-[#0D0D0D]/95 backdrop-blur-lg z-50">
        <ul className="flex items-center justify-around h-16 px-2">
          <li className="flex-1">
            <Link
              href="/"
              className="flex flex-col items-center justify-center h-full w-full space-y-1 text-[#6B6B6B] hover:text-[#A3A3A3] rounded-md transition-all duration-200"
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </Link>
          </li>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center h-full w-full space-y-1 rounded-md transition-all duration-200",
                    isActive ? "text-white" : "text-[#6B6B6B] hover:text-[#A3A3A3]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-none">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
