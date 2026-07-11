"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { joinQueue, getQueueStatus, leaveQueue } from "@/features/queue/api/queueApi";
import { useEventById } from "@/features/events/api/getEventById";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Container } from "@/shared/components/Container";
import { AlertCircle, Clock, Users, ShieldCheck, Ticket } from "lucide-react";
import { getEventTitle } from "@/lib/utils";
import { Navbar } from "@/shared/components/Navbar";
import { Footer } from "@/shared/components/Footer";

export default function QueueClient() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const router = useRouter();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tabBlocked, setTabBlocked] = useState(false);
  const { email, isAuthenticated, isLoading } = useAuth();
  
  // Manage queue session, auth, and tab locking
  useEffect(() => {
    if (isLoading) return; 

    if (!isAuthenticated || !email) {
      router.push(`/auth/login?redirect=/queue?eventId=${eventId}`);
      return;
    }

    const lockKey = `queue_active_${email}`;
    const lastActive = localStorage.getItem(lockKey);
    const now = Date.now();

    // Check if another tab is actively polling (lock updated within last 4 seconds)
    if (lastActive && (now - parseInt(lastActive)) < 4000) {
      setTabBlocked(true);
      return;
    }

    // Use user's email as the session ID directly to prevent multi-session abuse per account.
    const freshSessionId = email;
    setSessionId(freshSessionId);

    // Start heartbeat to keep the lock for this tab
    localStorage.setItem(lockKey, Date.now().toString());
    const interval = setInterval(() => {
      localStorage.setItem(lockKey, Date.now().toString());
    }, 2000);

    return () => {
      clearInterval(interval);
      localStorage.removeItem(lockKey); // Release lock when leaving
    };
  }, [isLoading, isAuthenticated, email, eventId, router]);

  // Clean up waitlist in Redis immediately on unmount, page refresh (F5), or tab close
  useEffect(() => {
    const handleLeave = () => {
      if (eventId && sessionId) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        fetch(`${apiBaseUrl}/api/queue/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ eventId, sessionId }),
          keepalive: true // ensures the request finishes even if tab/page is closed
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleLeave);
    return () => {
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave(); // Run on unmount (React Router navigation)
    };
  }, [eventId, sessionId]);

  // Fetch event details to show what they are waiting for
  const { data: eventData } = useEventById(eventId as string);
  const event = eventData?.data;

  // Mutation to join the queue initially
  const { mutate: doJoin, isPending: isJoining, error: joinError } = useMutation({
    mutationFn: () => joinQueue(eventId as string, sessionId as string),
    onSuccess: (data) => {
      if (data.status === 'GRANTED' && data.token) {
        // Automatically redirect to booking if already granted
        router.push(`/booking?eventId=${eventId}&token=${data.token}&sessionId=${sessionId}`);
      }
    },
  });

  // Query to poll queue status
  const { data: queueData, error: pollError } = useQuery({
    queryKey: ["queue_status", eventId, sessionId],
    queryFn: () => getQueueStatus(eventId as string, sessionId as string),
    enabled: !!eventId && !!sessionId,
    refetchInterval: (query) => {
      // Stop polling only if granted
      const status = query.state.data?.status;
      if (status === 'GRANTED') return false;
      return 5000; // Poll every 5 seconds
    },
  });

  // Join queue on mount if we have IDs and haven't joined yet
  const hasJoined = useRef(false);
  useEffect(() => {
    if (eventId && sessionId && !hasJoined.current) {
      hasJoined.current = true;
      doJoin();
    }
  }, [eventId, sessionId, doJoin]);

  // Handle redirect when granted
  useEffect(() => {
    if (queueData?.status === 'GRANTED' && queueData.token) {
      router.push(`/booking?eventId=${eventId}&token=${queueData.token}&sessionId=${sessionId}`);
    }
  }, [queueData, eventId, router]);

  let content;

  if (tabBlocked) {
    content = (
      <Container className="py-20 flex flex-col items-center text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Already in Queue</h2>
        <p className="text-[#A3A3A3] mb-6">You are already waiting in the queue in another tab or window. Please use that tab to continue.</p>
        <button 
          onClick={() => router.push('/')} 
          className="px-6 py-2.5 bg-white hover:bg-[#E5E5E5] text-black font-semibold rounded-xl transition-all"
        >
          Return to Home
        </button>
      </Container>
    );
  } else if (!eventId) {
    content = (
      <Container className="py-20 flex flex-col items-center text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Invalid Access</h2>
        <p className="text-[#A3A3A3]">No event specified for the waiting room.</p>
      </Container>
    );
  } else {
    const isGranted = queueData?.status === 'GRANTED';
    const position = queueData?.position || 0;
    
    // Calculate estimated time dynamically
    const estimatedWaitMinutes = position > 0 ? Math.max(1, Math.ceil(position / 15)) : 0;
    const remainingTickets = queueData?.remainingTickets;

    content = (
      <Container className="py-12 md:py-24 max-w-3xl">
        <div className="bg-[#151515] border border-[#2A2A2A] rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* Background animation elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
            <div className="h-full bg-white/40 animate-[pulse_2s_ease-in-out_infinite] w-1/3" />
          </div>

          {!isGranted ? (
            <>
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 relative border border-white/10">
                <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
                <Users className="w-10 h-10 text-white" />
              </div>

              <h1 
                className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                You are in line.
              </h1>
              
              {event && (
                <p className="text-base md:text-lg text-[#A3A3A3] mb-8">
                  Waiting for <strong className="text-white font-medium">{getEventTitle(event.team_a, event.team_b)}</strong>
                </p>
              )}

              {/* Status grid */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center">
                  <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold mb-2">Remaining Tickets</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Ticket className="w-5 h-5 text-white" />
                    <span className="text-3xl font-bold text-white">
                      {remainingTickets != null ? remainingTickets.toLocaleString() : "..."}
                    </span>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center">
                  <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold mb-2">Your Position</span>
                  <span className="text-5xl font-bold text-white">
                    {isJoining ? "..." : (position > 0 ? position.toLocaleString() : "---")}
                  </span>
                </div>
                
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center">
                  <span className="text-xs text-[#6B6B6B] uppercase tracking-wider font-semibold mb-2">Estimated Wait</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-5 h-5 text-white" />
                    <span className="text-3xl font-bold text-white">
                      {isJoining || position === 0 ? "..." : `${estimatedWaitMinutes} min`}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#6B6B6B] max-w-lg leading-relaxed">
                Please do not refresh this page or close your browser. You will automatically be redirected to the booking page when it is your turn.
              </p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 border border-green-500/20">
                <ShieldCheck className="w-12 h-12 text-green-500" />
              </div>
              <h1 
                className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                It's your turn!
              </h1>
              <p className="text-lg text-[#A3A3A3]">
                Redirecting you to the booking page...
              </p>
            </>
          )}

          {(joinError || pollError) && (
            <div className="mt-8 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl w-full flex items-center justify-center gap-2 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Connection lost. Reconnecting to the queue...</span>
            </div>
          )}
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      <Navbar />
      <main className="flex-1 pt-20 flex flex-col justify-center">
        {content}
      </main>
      <Footer />
    </div>
  );
}
