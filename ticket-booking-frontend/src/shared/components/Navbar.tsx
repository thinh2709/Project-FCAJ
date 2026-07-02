"use client";

import { useState } from "react"
import Link from "next/link"
import { Container } from "./Container"
import { Button } from "@/components/ui/button"
import { Search, Menu, X, Ticket, LogOut } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/useAuth"

export function Navbar() {
  const { isAuthenticated, email, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <Ticket className="h-6 w-6 text-primary" />
              <span className="font-bold tracking-tight text-xl">TIXR</span>
            </Link>
            
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Concerts</Link>
              <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Sports</Link>
              <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Arts & Theater</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative group">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="search" 
                placeholder="Search events..." 
                className="h-9 w-64 rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="hidden md:flex gap-2 items-center">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground mr-2">{email}</span>
                  {isAdmin && (
                    <Link href="/admin">
                      <Button variant="ghost" size="sm" className="flex gap-2 text-primary">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link href="/my-tickets">
                    <Button variant="ghost" size="sm" className="flex gap-2">
                      <Ticket className="w-4 h-4" />
                      Vé của tôi
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={logout} className="flex gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button>Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </div>
        </div>
      </Container>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-4 shadow-inner">
          <div className="relative group">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="search" 
              placeholder="Search events..." 
              className="h-9 w-full rounded-md border border-input bg-transparent px-9 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          
          <nav className="flex flex-col gap-3 text-sm font-medium border-b pb-4">
            <Link href="/" onClick={() => setIsOpen(false)} className="transition-colors hover:text-foreground text-muted-foreground">Concerts</Link>
            <Link href="/" onClick={() => setIsOpen(false)} className="transition-colors hover:text-foreground text-muted-foreground">Sports</Link>
            <Link href="/" onClick={() => setIsOpen(false)} className="transition-colors hover:text-foreground text-muted-foreground">Arts & Theater</Link>
          </nav>

          <div className="flex flex-col gap-2 pt-2">
            {isAuthenticated ? (
              <>
                <div className="text-xs text-muted-foreground px-2 pb-2 truncate">
                  Signed in as: <span className="text-foreground font-medium">{email}</span>
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full flex gap-2 text-primary justify-start">
                      Admin Portal
                    </Button>
                  </Link>
                )}
                <Link href="/my-tickets" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full flex gap-2 justify-start">
                    <Ticket className="w-4 h-4" />
                    Vé của tôi
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => { logout(); setIsOpen(false); }} className="w-full flex gap-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/auth/login" onClick={() => setIsOpen(false)} className="w-full">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/auth/register" onClick={() => setIsOpen(false)} className="w-full">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
