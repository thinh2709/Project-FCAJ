"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "./Container";
import { Button } from "@/components/ui/button";
import {
  Search,
  Menu,
  X,
  Ticket,
  LogOut,
  Bell,
  User,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function Navbar() {
  const { isAuthenticated, email, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? "bg-[#0A0A0A]/85 backdrop-blur-xl border-[#2A2A2A]"
          : "bg-transparent border-transparent"
      }`}
    >
      <Container>
        <div className="flex h-20 items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Ticket className="h-6 w-6 text-white" />
            <span
              className="font-bold tracking-tight text-xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              TK-AWS
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {["Football", "Concerts", "Sports", "Theatre"].map((item) => (
              <Link
                key={item}
                href="/"
                className="px-4 py-2 text-sm font-medium text-[#A3A3A3] hover:text-white hover:bg-white/4 rounded-lg transition-all"
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* Search */}
          {/* <div className="hidden md:flex flex-1 max-w-sm relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] pointer-events-none" />
            <input
              type="search"
              placeholder="Search events, venues, artists..."
              className="w-full h-11 pl-10 pr-4 bg-white/4 border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/5 transition-all"
            />
          </div> */}

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="relative flex items-center gap-2 px-3 py-2 text-sm text-[#A3A3A3] hover:text-white hover:bg-white/4 rounded-lg transition-all">
                  <Bell className="w-[18px] h-[18px]" />
                  <span className="absolute top-1.5 left-5 w-2 h-2 bg-white rounded-full" />
                </button>

                {isAdmin && (
                  <Link href="/admin">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:text-[#A3A3A3]"
                    >
                      Admin
                    </Button>
                  </Link>
                )}

                <Link href="/my-tickets">
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-[#A3A3A3] hover:text-white hover:bg-white/4 rounded-lg transition-all">
                    <Ticket className="w-[18px] h-[18px]" />
                    <span>My Tickets</span>
                  </button>
                </Link>

                {/* Profile avatar */}
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-white to-[#333333] flex items-center justify-center text-xs font-semibold cursor-pointer border-2 border-transparent hover:border-white transition-all ml-1 text-black">
                  {email ? email[0].toUpperCase() : "U"}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-[#A3A3A3] hover:text-white ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    className="text-[#A3A3A3] hover:text-white"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="bg-white hover:bg-[#E5E5E5] text-black rounded-xl px-6">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </Container>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden border-t border-[#2A2A2A] bg-[#0A0A0A]/95 backdrop-blur-xl px-5 py-5 space-y-4">
          {/* Mobile Search */}
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="search"
              placeholder="Search events..."
              className="w-full h-10 pl-10 pr-4 bg-white/4 border border-[#2A2A2A] rounded-xl text-sm text-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-blue-500"
            />
          </div> */}

          <nav className="flex flex-col gap-1 border-b border-[#2A2A2A] pb-4">
            {["Football", "Concerts", "Sports", "Theatre"].map((item) => (
              <Link
                key={item}
                href="/"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2.5 text-sm text-[#A3A3A3] hover:text-white hover:bg-white/4 rounded-lg transition-all"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 pt-1">
            {isAuthenticated ? (
              <>
                <div className="text-xs text-[#6B6B6B] px-3 pb-2">
                  Signed in as{" "}
                  <span className="text-white font-medium">{email}</span>
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setIsOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full text-blue-400 justify-start border-[#2A2A2A]"
                    >
                      Admin Portal
                    </Button>
                  </Link>
                )}
                <Link href="/my-tickets" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-[#2A2A2A]"
                  >
                    <Ticket className="w-4 h-4" />
                    My Tickets
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full border-[#2A2A2A]"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-500">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
