"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { userPool } from "@/features/auth/api/cognito";
import { useEventById } from "@/features/events/api/getEventById";
import { reserveTickets, getMatchSeats, cancelBooking } from "@/features/booking/api/bookingApi";
import { enterBooking } from "@/features/queue/api/queueApi";
import { Container } from "@/shared/components/Container";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  AlertCircle, CheckCircle, Clock, ShieldCheck, Zap, Server, ShieldAlert,
  Info, Calendar, MapPin, Activity, Flame, ChevronRight, ChevronLeft, Lock, 
  Wifi, Shield, ArrowLeft
} from "lucide-react";import { getEventTitle } from "@/lib/utils";

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Advanced Seating Data with High-Concurrency Metadata
const ZONES = [
  { 
    id: "VIP", 
    name: "VIP Zone", 
    desc: "Best View • Priority Access",
    priceMultiplier: 2.0, 
    color: "bg-purple-500",
    border: "border-purple-500",
    text: "text-purple-400",
    status: "available", 
    remaining: 0, 
    demand: 95
  },
  { 
    id: "A", 
    name: "CAT A", 
    desc: "Balanced View • Lower Tier",
    priceMultiplier: 1.5, 
    color: "bg-blue-500",
    border: "border-blue-500",
    text: "text-blue-400",
    status: "available", 
    remaining: 0, 
    demand: 65 
  },
  { 
    id: "B", 
    name: "CAT B", 
    desc: "Budget Friendly • Upper Tier",
    priceMultiplier: 1.2, 
    color: "bg-green-500",
    border: "border-green-500",
    text: "text-green-400",
    status: "available", 
    remaining: 0, 
    demand: 100 
  },
  { 
    id: "C", 
    name: "CAT C", 
    desc: "Standard View • Corners",
    priceMultiplier: 1.0, 
    color: "bg-yellow-500",
    border: "border-yellow-500",
    text: "text-yellow-400",
    status: "available", 
    remaining: 0, 
    demand: 40 
  },
  { 
    id: "D", 
    name: "CAT D", 
    desc: "Value View • Behind Goals",
    priceMultiplier: 0.8, 
    color: "bg-red-500",
    border: "border-red-500",
    text: "text-red-400",
    status: "available", 
    remaining: 0, 
    demand: 30 
  },
];

export default function BookingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const queueToken = searchParams.get("token");
  const sessionId = searchParams.get("sessionId");

  const { isAuthenticated, isLoading: authLoading, email } = useAuth();
  const { data: eventData, isLoading: eventLoading } = useEventById(eventId as string);

  const [selectedZone, setSelectedZone] = useState<string>("A");
  const [ticketCount, setTicketCount] = useState<number>(1);
  
  // Real-time backend states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  
  // Timers
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes session
  const [syncTime, setSyncTime] = useState(0); // Seconds since last sync

  const [liveZones, setLiveZones] = useState(ZONES);
  const [isExpired, setIsExpired] = useState(false);
  const [bookingSessionError, setBookingSessionError] = useState("");
  const [bookingSessionLoading, setBookingSessionLoading] = useState(true);

  // Refs for unload listener
  const successDataRef = useRef<any>(null);
  const isProcessingPaymentRef = useRef(false);
  const authTokenRef = useRef<string>("");

  const event = eventData?.data;

  // Sync database multipliers and categories dynamically when event data is loaded
  useEffect(() => {
    if (!event) return;
    
    const multipliers = event.zone_multipliers || { VIP: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.8 };
    
    const zoneMetadata: Record<string, { name: string; desc: string; color: string; border: string; text: string }> = {
      VIP: { 
        name: "VIP Zone", 
        desc: "Best View • Priority Access",
        color: "bg-purple-500",
        border: "border-purple-500",
        text: "text-purple-400"
      },
      A: { 
        name: "CAT A", 
        desc: "Balanced View • Lower Tier",
        color: "bg-blue-500",
        border: "border-blue-500",
        text: "text-blue-400"
      },
      B: { 
        name: "CAT B", 
        desc: "Budget Friendly • Upper Tier",
        color: "bg-green-500",
        border: "border-green-500",
        text: "text-green-400"
      },
      C: { 
        name: "CAT C", 
        desc: "Standard View • Corners",
        color: "bg-yellow-500",
        border: "border-yellow-500",
        text: "text-yellow-400"
      },
      D: { 
        name: "CAT D", 
        desc: "Value View • Behind Goals",
        color: "bg-red-500",
        border: "border-red-500",
        text: "text-red-400"
      }
    };
    
    const dynamicZones = Object.entries(multipliers).map(([zoneId, multiplier]) => {
      const meta = zoneMetadata[zoneId] || {
        name: `Zone ${zoneId}`,
        desc: "Standard seating",
        color: "bg-gray-500",
        border: "border-gray-500",
        text: "text-gray-400"
      };
      
      return {
        id: zoneId,
        name: meta.name,
        desc: meta.desc,
        priceMultiplier: Number(multiplier),
        color: meta.color,
        border: meta.border,
        text: meta.text,
        status: "available",
        remaining: 0,
        demand: Math.floor(Math.random() * 40) + 50
      };
    });
    
    setLiveZones(dynamicZones);
    
    // Default selectedZone to first available zone in multipliers if A is not there
    if (!multipliers[selectedZone]) {
      const firstZone = Object.keys(multipliers)[0];
      if (firstZone) {
        setSelectedZone(firstZone);
      }
    }
  }, [event]);

  useEffect(() => {
    successDataRef.current = successData;
  }, [successData]);

  useEffect(() => {
    isProcessingPaymentRef.current = isProcessingPayment;
  }, [isProcessingPayment]);

  // Fetch token for keepalive fetch
  useEffect(() => {
    const user = userPool.getCurrentUser();
    if (user) {
      user.getSession((err: any, session: any) => {
        if (!err && session) {
          authTokenRef.current = session.getAccessToken().getJwtToken();
        }
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setError("");
  }, [selectedZone, ticketCount]);

  useEffect(() => {
    if (!eventId || !event) return;
    const fetchSeats = async () => {
      try {
        const seatMap = await getMatchSeats(eventId as string);
        setLiveZones(prev => prev.map(zone => {
          const zoneSeats = seatMap[zone.id] || [];
          const availableCount = zoneSeats.filter(s => s.status === 'available').length;
          
          let status = 'available';
          if (availableCount === 0) status = 'soldout';
          else if (availableCount < 20) status = 'limited';

          return {
            ...zone,
            remaining: availableCount,
            status
          };
        }));
      } catch (err) {
        console.error("Failed to fetch live seats:", err);
      }
    };
    fetchSeats();
    const interval = setInterval(fetchSeats, 10000);
    return () => clearInterval(interval);
  }, [eventId, event]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/booking?eventId=${eventId}&token=${queueToken}&sessionId=${sessionId}`);
    }
  }, [isAuthenticated, authLoading, router, eventId, queueToken, sessionId]);

  // Create Booking Session on mount (validates queueToken with backend)
  useEffect(() => {
    if (!eventId || !queueToken || !sessionId || authLoading || !isAuthenticated) {
      setBookingSessionLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        setBookingSessionLoading(true);
        const session = await enterBooking(eventId, sessionId, queueToken);
        
        // Use backend-provided expiry time for countdown
        const expiryMs = typeof session.expiredAt === 'string' 
          ? new Date(session.expiredAt).getTime() 
          : parseInt(session.expiredAt);
        
        // Store expiry for persistence across refreshes
        const storageKey = `booking_expiry_${queueToken}`;
        sessionStorage.setItem(storageKey, String(expiryMs));

        const remaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
        setTimeLeft(remaining);
        setBookingSessionError("");
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || 'Không thể xác thực quyền truy cập. Vui lòng quay lại hàng đợi.';
        setBookingSessionError(msg);
      } finally {
        setBookingSessionLoading(false);
      }
    };

    initSession();
  }, [eventId, queueToken, sessionId, authLoading, isAuthenticated]);

  // Main Session Timer (ticks every second using stored expiry)
  useEffect(() => {
    if (!queueToken || bookingSessionLoading) return;
    
    const storageKey = `booking_expiry_${queueToken}`;
    const expiryTime = sessionStorage.getItem(storageKey);
    if (!expiryTime) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((parseInt(expiryTime) - Date.now()) / 1000));
      setTimeLeft(remaining);
      setSyncTime(s => (s + 1) % 5);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timer);
  }, [queueToken, bookingSessionLoading]);

  // Handle Session Expiry
  useEffect(() => {
    if (timeLeft === 0 && !isExpired) {
      // We intentionally do NOT remove the expiry time from sessionStorage here.
      // If the user reloads the page with the same token, it will fetch the old expiry time
      // (which is now in the past), resulting in 0 timeLeft, keeping them expired.
      setIsExpired(true);
      
      // Attempt to immediately release the locked tickets upon expiry
      if (successData && !isProcessingPayment) {
        cancelBooking(successData.bookingId).catch(err => console.error("Failed to release tickets on expiry:", err));
      }
    }
  }, [timeLeft, queueToken, isExpired, successData, isProcessingPayment]);

  // Listen for back button to cancel reservation
  useEffect(() => {
    const handlePopState = async () => {
      if (successData && !isProcessingPayment) {
        try {
          await cancelBooking(successData.bookingId);
        } catch (err) {
          console.error("Failed to cancel on back button:", err);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [successData, isProcessingPayment]);

  // Listen for tab close/page reload to cancel reservation instantly
  useEffect(() => {
    const handleUnload = () => {
      if (successDataRef.current && !isProcessingPaymentRef.current && authTokenRef.current) {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${successDataRef.current.bookingId}`;
        fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authTokenRef.current}`
          },
          keepalive: true
        }).catch(() => {});
      }
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  // Bắt sự kiện người dùng dùng nút "Back" quay lại từ trang MoMo (khôi phục từ BFCache)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && isProcessingPaymentRef.current && successDataRef.current && authTokenRef.current) {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/${successDataRef.current.bookingId}`;
        fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authTokenRef.current}`
          },
          keepalive: true
        }).catch(() => {});
        
        // Reset state
        setSuccessData(null);
        setIsProcessingPayment(false);
        setError("Giao dịch bị hủy do bạn đã rời khỏi trang thanh toán.");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Listen for component unmount (client-side routing away / back button) to cancel reservation instantly
  useEffect(() => {
    return () => {
      if (successDataRef.current && !isProcessingPaymentRef.current && authTokenRef.current) {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'https://gdqwmt0jq2.execute-api.us-east-1.amazonaws.com'}/api/bookings/${successDataRef.current.bookingId}`;
        fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authTokenRef.current}`
          },
          keepalive: true
        }).catch(() => {});
      }
    };
  }, []);

  const handleCancelAndReturn = async () => {
    if (!successData) return;
    try {
      await cancelBooking(successData.bookingId);
      setSuccessData(null);
      setError("");
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    }
  };

  if (isExpired) {
    return (
      <Container className="py-32 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Clock className="w-16 h-16 text-destructive mb-6" />
        <h2 className="text-4xl font-bold mb-4">Session Expired</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          Your booking session has timed out due to inactivity. Please return to the event page and rejoin the queue to secure your tickets.
        </p>
        <Button size="lg" onClick={() => router.push(`/events?id=${eventId}`)} className="h-12 px-8 text-lg">
          Return to Event
        </Button>
      </Container>
    );
  }

  if (authLoading || eventLoading || bookingSessionLoading) {
    return (
      <Container className="py-32 flex flex-col items-center justify-center min-h-[60vh]">
        <Server className="w-12 h-12 text-primary animate-pulse mb-4" />
        <h2 className="text-2xl font-bold">Synchronizing Nodes...</h2>
        <p className="text-muted-foreground mt-2">Connecting to High-Concurrency Ticketing Platform.</p>
      </Container>
    );
  }

  if (!eventId || !queueToken || !sessionId || bookingSessionError) {
    return (
      <Container className="py-20 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Admission Denied</h2>
        <p className="text-muted-foreground mt-2">
          {bookingSessionError || 'Bạn cần tham gia hàng đợi trước khi đặt vé.'}
        </p>
        <Button className="mt-6" onClick={() => eventId ? router.push(`/events?id=${eventId}`) : router.push("/")}>Quay lại</Button>
      </Container>
    );
  }

  const basePrice = parseFloat(event?.ticket_price?.toString() || "0");
  const currentZone = liveZones.find(z => z.id === selectedZone);
  const unitPrice = basePrice * (currentZone?.priceMultiplier || 1);
  const subtotal = unitPrice * ticketCount;
  const serviceFee = subtotal * 0.05; // 5% fee
  const vat = subtotal * 0.10; // 10% VAT
  const totalPrice = subtotal + serviceFee + vat;

  // Handles moving to actual reservation
  const handleReserve = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      // Production Flow: Best Available Auto-Assign Algorithm
      // 1. Fetch real seat map from backend for this match
      const seatMap = await getMatchSeats(eventId as string);
      const zoneSeats = seatMap[selectedZone] || [];
      
      // 2. Filter available seats only
      const availableSeats = zoneSeats.filter(s => s.status === 'available');
      
      // 3. Check if we have enough seats
      if (availableSeats.length < ticketCount) {
        throw new Error(`Only ${availableSeats.length} seats remaining in ${selectedZone}. Please reduce quantity.`);
      }

      // 4. Assign the first N available seats (Best Available)
      const assignedSeats = availableSeats.slice(0, ticketCount).map(seat => ({
        zone: selectedZone,
        seatNumber: seat.seatNumber
      }));
      
      // 5. Submit real reservation to backend
      const result = await reserveTickets({
        matchId: eventId as string,
        tickets: assignedSeats,
        queueToken: queueToken as string,
        sessionId: sessionId as string,
      });
      setSuccessData(result);
      setTimeLeft(300); // Reset timer for payment (5 minutes)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || "Distributed lock acquisition failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles MoMo Payment
  const handlePayment = async (requestType: 'captureWallet' | 'payWithATM') => {
    setIsProcessingPayment(true);
    setError("");
    
    try {
      const { createMoMoPayment } = await import("@/features/payment/api/paymentApi");
      const result = await createMoMoPayment({ bookingId: successData.bookingId, requestType });
      
      if (result.payUrl) {
        window.location.href = result.payUrl;
      } else {
        throw new Error("No payment URL received from Payment Gateway.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || "Failed to initiate payment gateway.");
      setIsProcessingPayment(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // If already locked seats, show payment screen
  if (successData) {
    return (
      <div className="min-h-screen bg-background pb-20">
         {/* Top Navigation Bar */}
         <div className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <Container className="py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-green-500 w-6 h-6" />
              <div>
                <h1 className="font-bold leading-none">{getEventTitle(event?.team_a, event?.team_b)}</h1>
                <p className="text-xs text-muted-foreground mt-1">Payment Gateway Connection</p>
              </div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-full flex items-center gap-2 font-mono font-bold text-sm">
              <Clock className="w-4 h-4" />
              {timeString} Remaining
            </div>
          </Container>
        </div>
        
        <Container className="py-12 max-w-2xl mt-8">
          <div className="bg-card border border-border p-8 rounded-xl shadow-lg text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Seats Successfully Locked</h2>
            <p className="text-muted-foreground mb-4">
              Redis lock acquired. Please complete the payment within the TTL (Time-to-Live).
            </p>
            
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm mb-6 flex gap-2 items-center justify-center border border-destructive/20">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-left bg-secondary/30 p-6 rounded-lg mb-8 space-y-4 border border-border/50">
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Booking ID</span>
                <span className="font-mono text-primary font-bold">{successData.bookingId}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-muted-foreground text-sm uppercase tracking-wider">Category</span>
                <span className="font-medium">{ticketCount}x {currentZone?.name}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="font-bold text-2xl text-primary">{formatVND(successData.totalAmount || 0)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full text-lg h-14 bg-pink-500 hover:bg-pink-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]" 
                onClick={() => handlePayment('captureWallet')}
                disabled={isProcessingPayment || timeLeft <= 0}
              >
                {isProcessingPayment ? "Connecting..." : "Pay with MoMo Wallet"}
              </Button>
              <Button 
                size="lg" 
                className="w-full text-lg h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]" 
                onClick={() => handlePayment('payWithATM')}
                disabled={isProcessingPayment || timeLeft <= 0}
              >
                {isProcessingPayment ? "Connecting..." : "Pay with ATM Card"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-muted-foreground hover:text-foreground"
                onClick={handleCancelAndReturn}
                disabled={isProcessingPayment}
              >
                Cancel & Select Other Seats
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // --- Category Selection Screen ---
  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* 1. Top Navigation & System Status */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <Container className="py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => router.push(`/events?id=${eventId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Lock className="text-primary w-5 h-5 hidden md:block" />
            <div>
              <h1 className="font-bold text-lg leading-none">{getEventTitle(event?.team_a, event?.team_b)}</h1>
              <p className="text-xs text-muted-foreground mt-1">Select Seating Category</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
               <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                 <Wifi className="w-3 h-3" /> Connected (SSE)
               </div>
               <div className="text-[10px] text-muted-foreground mt-0.5">
                 Inventory synced {syncTime}s ago
               </div>
            </div>
            <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full flex items-center gap-2 font-mono font-bold text-sm shadow-[0_0_15px_rgba(var(--primary),0.1)]">
              <Clock className="w-4 h-4" />
              {timeString} Remaining
            </div>
          </div>
        </Container>
      </div>

      {/* 2. Progress Stepper */}
      <div className="border-b border-border/30 bg-muted/20">
        <Container className="py-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max text-sm font-medium">
             <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" /> Virtual Queue
             </div>
             <ChevronRight className="w-4 h-4 text-border" />
             <div className="flex items-center gap-2 text-primary">
                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</div>
                Category
             </div>
             <ChevronRight className="w-4 h-4 text-border" />
             <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-5 h-5 rounded-full border border-muted-foreground flex items-center justify-center text-xs">3</div>
                Seats
             </div>
             <ChevronRight className="w-4 h-4 text-border" />
             <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-5 h-5 rounded-full border border-muted-foreground flex items-center justify-center text-xs">4</div>
                Checkout
             </div>
          </div>
        </Container>
      </div>

      <Container className="py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL (70%) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Event Info Card */}
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start md:items-center shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
               <div className="w-24 h-24 bg-secondary rounded-xl flex-shrink-0 flex items-center justify-center border border-border/50">
                  <span className="font-black text-2xl text-muted-foreground/50">WC</span>
               </div>
               <div className="flex-1">
                 <div className="flex gap-2 items-center mb-1">
                   <span className="text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20">On Sale</span>
                   <span className="text-xs text-muted-foreground">World Cup Qualifiers</span>
                 </div>
                 <h2 className="text-2xl font-bold mb-3">{getEventTitle(event?.team_a, event?.team_b)}</h2>
                 <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                   <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> 12 Aug 2026</div>
                   <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 19:30 (Doors 17:00)</div>
                   <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> National Stadium</div>
                 </div>
               </div>
            </div>

            {/* Stadium Area */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Stadium Map</h3>
                 <div className="flex gap-4 text-xs font-medium bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
                   <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Available</div>
                   <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Limited</div>
                   <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Sold Out</div>
                 </div>
               </div>
               {/* Removed Stadium Map as per request */}
               
               <h3 className="font-bold text-lg mb-4">Select Category</h3>
               {/* Categories List */}
               <div className="space-y-3">
                 {liveZones.map(z => {
                   const isSelected = selectedZone === z.id;
                   const isSoldOut = z.status === 'soldout';
                   const isLimited = z.status === 'limited';
                   
                   return (
                     <div 
                       key={z.id}
                       onClick={() => !isSoldOut && setSelectedZone(z.id)}
                       className={`
                         flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border-2 transition-all
                         ${isSoldOut ? 'opacity-50 cursor-not-allowed bg-muted/20 border-border' : 'cursor-pointer'}
                         ${isSelected ? `border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.1)]` : (!isSoldOut ? 'border-border hover:border-border/80 hover:bg-secondary/30' : '')}
                       `}
                     >
                       <div className="flex items-center gap-4 mb-3 md:mb-0">
                         <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${z.color}/10 ${z.text} border border-${z.color}/30`}>
                           {z.id}
                         </div>
                         <div>
                           <h4 className="font-bold text-lg leading-none mb-1">{z.name}</h4>
                           <p className="text-xs text-muted-foreground">{z.desc}</p>
                         </div>
                       </div>
                       
                       <div className="flex flex-col md:items-end justify-center">
                         <div className="text-lg font-bold mb-1">{formatVND(basePrice * z.priceMultiplier)}</div>
                         {isSoldOut ? (
                           <div className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Sold Out</div>
                         ) : isLimited ? (
                           <div className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1">
                             <Flame className="w-3 h-3" /> Only {z.remaining} left
                           </div>
                         ) : (
                           <div className="text-xs font-medium text-green-500">{z.remaining} seats available</div>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
               
               <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground justify-center bg-secondary/30 p-2 rounded-lg">
                 <Activity className="w-4 h-4" /> 
                 Live Inventory: Availability is subject to change based on concurrent transactions.
               </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (30%) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              
              {/* Admission Status */}
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Admission Status</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" /> 
                    <span className="font-medium">Queue Successfully Passed</span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <Shield className="w-5 h-5 text-primary" /> 
                    <div>
                      <span className="font-medium block">Admission Token Verified</span>
                      <span className="text-xs text-muted-foreground font-mono mt-0.5 block">{queueToken?.substring(0,8)}••••••••</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Selection */}
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                <h3 className="font-bold text-lg mb-6">Your Selection</h3>
                
                {/* Quantity */}
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                     <Label className="text-muted-foreground">Number of Tickets</Label>
                     <span className="text-[10px] uppercase bg-secondary px-2 py-0.5 rounded text-muted-foreground">Max 4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <div 
                        key={num}
                        onClick={() => setTicketCount(num)}
                        className={`
                          h-12 rounded-lg flex items-center justify-center font-bold text-lg cursor-pointer transition-all border
                          ${ticketCount === num ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-secondary/50 border-border hover:border-primary/50 text-foreground'}
                        `}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 bg-secondary/30 p-4 rounded-xl border border-border/50 text-sm mb-6">
                  <div className="flex justify-between text-foreground font-medium">
                    <span>{currentZone?.name} × {ticketCount}</span>
                    <span>{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Fee (5%)</span>
                    <span>{formatVND(serviceFee)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-b border-border/50 pb-3">
                    <span>VAT (10%)</span>
                    <span>{formatVND(vat)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-1">
                    <span>Total</span>
                    <span className="text-primary">{formatVND(totalPrice)}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm mb-4 flex gap-2 items-start border border-destructive/20">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg font-bold group relative overflow-hidden" 
                  onClick={handleReserve}
                  disabled={isSubmitting || currentZone?.status === 'soldout'}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isSubmitting ? "Acquiring Lock..." : "Continue"} 
                    {!isSubmitting && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </span>
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Seats are reserved after seat selection
                </p>
              </div>

            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}
