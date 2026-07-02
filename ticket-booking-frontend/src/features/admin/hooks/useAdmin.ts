import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminStats, AdminBooking, CreateMatchData, TicketGenerationData, QueueData } from '../api/adminApi';
import { Event } from '@/features/events/types';
import { toast } from 'sonner';

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

export const useAdminBookings = (page = 1, limit = 10, search = '') => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getBookings({ page, limit, search });
      setBookings(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, total, totalPages, loading, error, refetch: fetchBookings };
};

export const useAdminMatches = () => {
  const [matches, setMatches] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getMatches();
      setMatches(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const createMatch = async (data: CreateMatchData) => {
    try {
      await adminApi.createMatch(data);
      toast.success("Match created successfully");
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to create match");
      throw err;
    }
  };

  const updateMatch = async (id: string, data: Partial<CreateMatchData>) => {
    try {
      await adminApi.updateMatch(id, data);
      toast.success("Match updated successfully");
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to update match");
      throw err;
    }
  };

  const deleteMatch = async (id: string) => {
    try {
      await adminApi.deleteMatch(id);
      toast.success("Match deleted successfully");
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete match");
      throw err;
    }
  };

  const generateTickets = async (matchId: string, data: TicketGenerationData) => {
    try {
      await adminApi.createTickets(matchId, data);
      toast.success("Tickets generated successfully");
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate tickets");
      throw err;
    }
  };

  const uploadImage = async (fileBase64: string, fileName: string, fileType: string): Promise<string> => {
    try {
      return await adminApi.uploadImage(fileBase64, fileName, fileType);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
      throw err;
    }
  };

  return { matches, loading, error, refetch: fetchMatches, createMatch, updateMatch, deleteMatch, generateTickets, uploadImage };
};

export const useAdminQueue = (eventId: string | null) => {
  const [queueStats, setQueueStats] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await adminApi.getQueueStats(eventId);
      setQueueStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load queue stats");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const allowUsers = async (count: number) => {
    if (!eventId) return;
    try {
      await adminApi.allowQueueUsers(eventId, count);
      toast.success(`${count} users allowed into the queue`);
      fetchQueue();
    } catch (err: any) {
      toast.error(err.message || "Failed to allow queue users");
      throw err;
    }
  };

  const resetQueue = async () => {
    if (!eventId) return;
    try {
      await adminApi.resetQueue(eventId);
      toast.success("Queue reset successfully");
      fetchQueue();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset queue");
      throw err;
    }
  };

  return { queueStats, loading, error, refetch: fetchQueue, allowUsers, resetQueue };
};
