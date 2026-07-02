import apiClient from '@/api/client';
import { Event, PaginatedResponse, SingleResponse } from '@/features/events/types';

export interface AdminStats {
  totalMatches: number;
  revenue: number;
  ticketsSoldToday: number;
  pendingOrders: number;
  upcomingMatches: number;
  onlineUsers: number;
  revenueHistory: Array<{ name: string; date: string; total: number }>;
}

export interface AdminBooking {
  id: string;
  order_id?: string;
  customer_email: string;
  match_id: string;
  amount: number;
  payment_method: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  match?: Event;
}

export interface CreateMatchData {
  teamA: string;
  teamB?: string;
  matchDate: string;
  venue: string;
  totalTickets: number;
  ticketPrice: number;
  zoneMultipliers?: Record<string, number>;
  zoneCapacities?: Record<string, number>;
  imageUrl?: string;
}

export interface TicketGenerationData {
  tickets: Array<{
    zone: string;
    seatNumber: string;
    price: number;
  }>;
}

export interface QueueData {
  waitingUsers: number;
  currentAllowedUsers: number;
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get<SingleResponse<any>>('/api/admin/stats');
    const raw = response.data.data;
    return {
      totalMatches: raw.totalMatches || 0,
      revenue: raw.totalRevenue || 0,
      ticketsSoldToday: raw.soldToday || 0,
      pendingOrders: raw.activeReservations || 0,
      upcomingMatches: raw.upcomingMatches || 0,
      onlineUsers: raw.onlineUsers || 0,
      revenueHistory: raw.revenueHistory || [],
    };
  },

  getBookings: async (filters?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<AdminBooking>> => {
    const response = await apiClient.get<any>('/api/admin/bookings', { params: filters });
    const rawBookings = response.data.data || [];
    
    const mappedBookings = rawBookings.map((b: any) => ({
      id: b.id,
      order_id: b.order_id,
      customer_email: b.email || b.customer_email || "", 
      match_id: b.match_id,
      amount: parseFloat(b.total_amount) || b.amount || 0, 
      payment_method: b.payment_method,
      status: b.status,
      created_at: b.created_at,
    }));

    return {
      success: true,
      data: mappedBookings,
      pagination: response.data.pagination,
    };
  },

  getMatches: async (): Promise<{ success: boolean; data: Event[] }> => {
    const response = await apiClient.get<{ success: boolean; data: Event[] }>('/api/admin/matches');
    return response.data;
  },

  createMatch: async (data: CreateMatchData): Promise<Event> => {
    const response = await apiClient.post<SingleResponse<Event>>('/api/admin/matches', data);
    return response.data.data;
  },

  updateMatch: async (id: string, data: Partial<CreateMatchData>): Promise<Event> => {
    const response = await apiClient.put<SingleResponse<Event>>(`/api/admin/matches/${id}`, data);
    return response.data.data;
  },

  createTickets: async (matchId: string, tickets: TicketGenerationData): Promise<any> => {
    const response = await apiClient.post(`/api/admin/matches/${matchId}/tickets`, tickets);
    return response.data;
  },

  getQueueStats: async (eventId: string): Promise<QueueData> => {
    const response = await apiClient.get<SingleResponse<QueueData>>(`/api/admin/queue/${eventId}`);
    return response.data.data;
  },

  allowQueueUsers: async (eventId: string, count: number): Promise<any> => {
    const response = await apiClient.post(`/api/admin/queue/${eventId}/allow`, { count });
    return response.data;
  },

  resetQueue: async (eventId: string): Promise<any> => {
    const response = await apiClient.post(`/api/admin/queue/${eventId}/reset`);
    return response.data;
  },

  deleteMatch: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/api/admin/matches/${id}`);
    return response.data;
  },

  uploadImage: async (fileBase64: string, fileName: string, fileType: string): Promise<string> => {
    const response = await apiClient.post<SingleResponse<{ imageUrl: string }>>('/api/admin/upload', {
      file: fileBase64,
      fileName,
      fileType,
    });
    return response.data.data.imageUrl;
  }
};
