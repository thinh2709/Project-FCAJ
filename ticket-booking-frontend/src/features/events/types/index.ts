export interface Event {
  id: string;
  team_a: string;
  team_b: string | null;
  match_date: string;
  venue: string;
  total_tickets: number;
  ticket_price: string | number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  zone_multipliers?: Record<string, number>;
  zone_capacities?: Record<string, number>;
  image_url?: string | null;
  ticket_counts?: Record<string, number>;
}

export interface EventDetail extends Event {
  availability?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}
