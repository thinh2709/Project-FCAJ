import apiClient from '@/api/client';

export interface ReserveRequest {
  matchId: string;
  tickets: { zone: string; seatNumber: string }[];
  queueToken: string;
  sessionId: string;
}

export interface ReserveResponse {
  bookingId: string;
  reservedUntil: string; // ISO string
  totalAmount: number;
}

export const reserveTickets = async (data: ReserveRequest): Promise<ReserveResponse> => {
  const response = await apiClient.post<{ data: ReserveResponse }>('/api/bookings/reserve', data);
  return response.data.data;
};

export interface Seat {
  id: string;
  seatNumber: string;
  price: string;
  status: 'available' | 'reserved' | 'sold';
}

export const getMatchSeats = async (matchId: string): Promise<Record<string, Seat[]>> => {
  const response = await apiClient.get<{ data: Record<string, Seat[]> }>(`/api/matches/${matchId}/seats`);
  return response.data.data;
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  await apiClient.delete(`/api/bookings/${bookingId}`);
};

export interface UserBooking {
  id: string;
  match_id: string;
  total_amount: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_method: string | null;
  payment_status: 'pending' | 'paid' | 'failed' | null;
  created_at: string;
  team_a: string;
  team_b: string | null;
  match_date: string;
  venue: string;
}

export interface PaginatedBookings {
  data: UserBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getUserBookings = async (page = 1, limit = 20): Promise<PaginatedBookings> => {
  const response = await apiClient.get<PaginatedBookings>(`/api/bookings?page=${page}&limit=${limit}`);
  return response.data;
};
