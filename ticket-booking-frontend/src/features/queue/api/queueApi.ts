import apiClient from '@/api/client';

export interface JoinQueueResponse {
  status: 'QUEUED' | 'GRANTED';
  position?: number;
  token?: string;
}

export interface QueueStatusResponse {
  status: 'NOT_IN_QUEUE' | 'QUEUED' | 'GRANTED';
  position?: number;
  token?: string;
  remainingTickets?: number;
}

export const joinQueue = async (eventId: string, sessionId: string): Promise<JoinQueueResponse> => {
  const response = await apiClient.post<{ data: JoinQueueResponse }>('/api/queue/join', { eventId, sessionId });
  return response.data.data;
};

export const getQueueStatus = async (eventId: string, sessionId: string): Promise<QueueStatusResponse> => {
  const response = await apiClient.get<{ data: QueueStatusResponse }>(`/api/queue/status?eventId=${eventId}&sessionId=${sessionId}`);
  return response.data.data;
};

export const leaveQueue = async (eventId: string, sessionId: string): Promise<void> => {
  await apiClient.post('/api/queue/leave', { eventId, sessionId });
};

export interface BookingSessionResponse {
  bookingSessionId: string;
  sessionId: string;
  status: string;
  createdAt: string;
  expiredAt: string;
  isExisting: boolean;
}

export const enterBooking = async (
  eventId: string, sessionId: string, queueToken: string
): Promise<BookingSessionResponse> => {
  const response = await apiClient.post<{ data: BookingSessionResponse }>(
    '/api/queue/enter-booking',
    { eventId, sessionId, queueToken }
  );
  return response.data.data;
};
